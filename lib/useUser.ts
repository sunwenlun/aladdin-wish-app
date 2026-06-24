'use client';

import { useEffect, useState, useCallback } from 'react';
import { getOrCreateUser, getDeviceId, getCurrentUserId, setCurrentUserId, getUser } from '@/lib/db';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { supabase } from '@/lib/supabase';

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initUser() {
      // 1. 先检查是否有认证 session
      const { data: { session } } = await supabaseAuth.auth.getSession();

      if (session?.user) {
        // 已登录用户：通过 auth_uid 或 email 查找数据库用户
        const { data: dbUserByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (dbUserByEmail) {
          // 更新 auth_uid（首次登录）
          if (!dbUserByEmail.auth_uid) {
            await supabase
              .from('users')
              .update({ auth_uid: session.user.id })
              .eq('id', dbUserByEmail.id);
          }
          setCurrentUserId(dbUserByEmail.id);
          setUser(dbUserByEmail);
          setUserId(dbUserByEmail.id);
          setLoading(false);
          return;
        }

        // 通过 auth_uid 查找
        const { data: dbUserByAuth } = await supabase
          .from('users')
          .select('*')
          .eq('auth_uid', session.user.id)
          .single();

        if (dbUserByAuth) {
          setCurrentUserId(dbUserByAuth.id);
          setUser(dbUserByAuth);
          setUserId(dbUserByAuth.id);
          setLoading(false);
          return;
        }

        // 都没有 → 尝试升级匿名用户
        const deviceId = getDeviceId();
        const { data: anonUser } = await supabase
          .from('users')
          .select('*')
          .eq('device_id', deviceId)
          .single();

        if (anonUser) {
          const { data: updated } = await supabase
            .from('users')
            .update({ email: session.user.email, auth_uid: session.user.id })
            .eq('id', anonUser.id)
            .select()
            .single();
          if (updated) {
            setCurrentUserId(updated.id);
            setUser(updated);
            setUserId(updated.id);
            setLoading(false);
            return;
          }
        }

        // 创建全新用户
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            device_id: deviceId,
            email: session.user.email,
            auth_uid: session.user.id,
            wish_chances: 3,
          })
          .select()
          .single();
        if (newUser) {
          setCurrentUserId(newUser.id);
          setUser(newUser);
          setUserId(newUser.id);
        }
        setLoading(false);
        return;
      }

      // 2. 未登录 → 使用匿名设备ID用户
      const deviceId = getDeviceId();
      if (!deviceId) {
        setLoading(false);
        return;
      }

      let storedId = getCurrentUserId();

      if (!storedId) {
        const newUser = await getOrCreateUser(deviceId);
        if (newUser) {
          storedId = newUser.id;
          setCurrentUserId(newUser.id);
          setUser(newUser);
          setUserId(newUser.id);
        }
      } else {
        const existingUser = await getUser(storedId);
        if (existingUser) {
          setUser(existingUser);
          setUserId(existingUser.id);
        } else {
          const newUser = await getOrCreateUser(deviceId);
          if (newUser) {
            setCurrentUserId(newUser.id);
            setUser(newUser);
            setUserId(newUser.id);
          }
        }
      }
      setLoading(false);
    }

    initUser();
  }, []);

  const refreshUser = async () => {
    if (!userId) return;
    const freshUser = await getUser(userId);
    if (freshUser) setUser(freshUser);
  };

  return { userId, user, loading, refreshUser };
}
