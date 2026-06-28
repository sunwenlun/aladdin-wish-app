'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { supabaseAuth } from './supabaseAuth';
import { supabase } from './supabase';
import { getDeviceId, getCurrentUserId, setCurrentUserId } from './db';
import LoginModal from '@/components/LoginModal';

// Auth 上下文类型
type AuthContextType = {
  authUser: any | null;
  dbUser: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  showLogin: () => void;
  hideLogin: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nickname?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const showLogin = () => setShowLoginModal(true);
  const hideLogin = () => setShowLoginModal(false);

  const isAuthenticated = !!authUser;

  // 通过 email / auth_uid 查找或创建数据库用户
  const findOrCreateDbUser = useCallback(async (email: string, authUid: string, nickname?: string) => {
    if (!supabase) return null;
    try {
      // 1. 先查 email
      const { data: existingByEmail, error: emailErr } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingByEmail) {
        // 同步 auth_uid，并在需要时更新 nickname
        const updates: Record<string, unknown> = { auth_uid: authUid };
        if (nickname && !existingByEmail.nickname) updates.nickname = nickname;
        const { data: updated } = await supabase
          .from('users')
          .update(updates)
          .eq('id', existingByEmail.id)
          .select()
          .single();
        const finalUser = updated || existingByEmail;
        setCurrentUserId(finalUser.id);
        setDbUser(finalUser);
        return finalUser;
      }

      // 如果 email 查询报非"无行"错误，记录日志
      if (emailErr && emailErr.code !== 'PGRST116') {
        console.error('[Auth] email lookup error:', emailErr.message);
      }

      // 2. 查 auth_uid
      const { data: existingByAuth } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', authUid)
        .single();

      if (existingByAuth) {
        if (nickname && !existingByAuth.nickname) {
          await supabase.from('users').update({ nickname }).eq('id', existingByAuth.id);
        }
        setCurrentUserId(existingByAuth.id);
        setDbUser(existingByAuth);
        return existingByAuth;
      }

      // 3. 尝试升级匿名用户（同 device_id）
      const deviceId = getDeviceId();
      const { data: anonUser } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (anonUser) {
        const { data: upgraded, error: upgradeErr } = await supabase
          .from('users')
          .update({
            email,
            auth_uid: authUid,
            nickname: nickname || anonUser.nickname,
          })
          .eq('id', anonUser.id)
          .select()
          .single();

        if (!upgradeErr && upgraded) {
          setCurrentUserId(upgraded.id);
          setDbUser(upgraded);
          return upgraded;
        }
        if (upgradeErr) {
          console.error('[Auth] upgrade anon user error:', upgradeErr.message);
        }
      }

      // 4. 全新用户 — 用 upsert 避免并发竞态导致的唯一键冲突
      const { data: newUser, error: insertErr } = await supabase
        .from('users')
        .upsert(
          {
            device_id: deviceId,
            email,
            auth_uid: authUid,
            nickname: nickname || null,
            wish_chances: 3,
            total_wishes: 0,
            total_fulfilled: 0,
          },
          { onConflict: 'device_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (!insertErr && newUser) {
        setCurrentUserId(newUser.id);
        setDbUser(newUser);
        return newUser;
      }
      if (insertErr) {
        console.error('[Auth] create user error:', insertErr.message);
      }
    } catch (e) {
      console.error('[Auth] findOrCreateDbUser exception:', e);
    }

    return null;
  }, []);

  // 监听认证状态变化
  useEffect(() => {
    // Supabase 未配置时跳过（避免崩溃）
    if (!supabase || !supabaseAuth) {
      setLoading(false);
      return;
    }

    // 获取当前 session
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        findOrCreateDbUser(session.user.email!, session.user.id);
      } else {
        // 未登录，不创建匿名用户
        setAuthUser(null);
        setDbUser(null);
      }
      setLoading(false);
    }).catch((err) => {
      // 网络错误或 Supabase 故障时，优雅降级
      console.error('[Auth] getSession error:', err);
      setLoading(false);
    });

    // 监听后续变化
    const { data: listener } = supabaseAuth.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        await findOrCreateDbUser(session.user.email!, session.user.id);
      } else {
        setAuthUser(null);
        setDbUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [findOrCreateDbUser]);

  // 注册 → 直接使用 signUp 返回的 session，不再多余调用 signInWithPassword
  const signUp = useCallback(async (email: string, password: string, nickname?: string) => {
    if (!supabase || !supabaseAuth) return { error: 'Supabase not configured' };
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // Case 1：Supabase 关闭了 Email Confirmation → 立刻有 session，直接登录
    if (data.session && data.user) {
      // onAuthStateChange 会自动 setAuthUser
      // 这里额外调用一次以传入 nickname（onAuthStateChange 不带 nickname）
      await findOrCreateDbUser(email, data.user.id, nickname);
      return { error: null, autoLoginFailed: false };
    }

    // Case 2：Supabase 开启了 Email Confirmation → 无 session，需要邮箱验证
    if (data.user && !data.session) {
      return { error: null, autoLoginFailed: true, needsEmailVerification: true };
    }

    return { error: null, autoLoginFailed: false };
  }, [findOrCreateDbUser]);

  // 登录
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase || !supabaseAuth) return { error: 'Supabase not configured' };
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      setAuthUser(data.user);
      await findOrCreateDbUser(email, data.user.id);
    }

    return { error: null };
  }, [findOrCreateDbUser]);

  // 退出
  const signOut = useCallback(async () => {
    if (supabaseAuth) await supabaseAuth.auth.signOut();
    setAuthUser(null);
    setDbUser(null);
    // 清除 localStorage 中的 user_id
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aladdin_user_id');
    }
  }, []);

  // 刷新数据库用户
  const refreshDbUser = useCallback(async () => {
    if (!supabase) return;
    const storedId = getCurrentUserId();
    if (!storedId) return;
    const { data } = await supabase.from('users').select('*').eq('id', storedId).single();
    if (data) setDbUser(data);
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, dbUser, loading, isAuthenticated, showLogin, hideLogin, signIn, signUp, signOut, refreshDbUser }}>
      {children}
      <LoginModal isOpen={showLoginModal} onClose={hideLogin} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
