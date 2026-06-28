'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import { supabaseAuth } from '@/lib/supabaseAuth';

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authUser, dbUser, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isZh = i18n.language === 'zh';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    const result = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, nickname.trim() || undefined);

    setLoading(false);

    if (result.error) {
      const err = result.error;
      if (err.includes('Invalid login credentials')) {
        setError(isZh ? '邮箱或密码错误' : 'Invalid email or password');
      } else if (err.includes('already registered')) {
        setError(isZh ? '该邮箱已注册，请直接登录' : 'Email already registered, please sign in');
      } else if (err.includes('Password should be at least')) {
        setError(isZh ? '密码至少6位' : 'Password must be at least 6 characters');
      } else if (err.includes('Unable to validate email')) {
        setError(isZh ? '邮箱格式不正确' : 'Invalid email format');
      } else {
        setError(err);
      }
    } else {
      router.push('/');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // 忘记密码：发送重置邮件
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(isZh
        ? '✅ 重置链接已发送到您的邮箱，请查收邮件'
        : '✅ Reset link sent to your email, please check your inbox');
    }
  };

  // ===== 已登录 → 显示账户信息 =====
  if (authUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 starry-bg">
        <img
          src="/genie-lamp-icon.png"
          alt="Aladdin"
          className="w-20 h-20 mb-6 animate-bounce-slow animate-glow object-contain"
        />
        <h1 className="text-xl font-bold text-white mb-1">
          {isZh ? '我的账户' : 'My Account'}
        </h1>
        <p className="text-xs text-gray-500 mb-8">{authUser.email}</p>

        <div className="w-full max-w-sm space-y-3">
          {dbUser && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isZh ? '昵称' : 'Nickname'}</span>
                <span className="text-white">{dbUser.nickname || (isZh ? '未设置' : 'Not set')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isZh ? '剩余愿望' : 'Wish Chances'}</span>
                <span className="text-amber-400 font-bold">{dbUser.wish_chances}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isZh ? '已许愿望' : 'Total Wishes'}</span>
                <span className="text-white">{dbUser.total_wishes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isZh ? '帮TA实现' : 'Fulfilled'}</span>
                <span className="text-emerald-400">{dbUser.total_fulfilled}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/10 hover:text-white transition-all"
          >
            {isZh ? '🚪 退出登录' : '🚪 Sign Out'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-300"
          >
            ← {isZh ? '返回首页' : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  // ===== 未登录 → 显示登录/注册表单 =====
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 starry-bg">
      <img
        src="/genie-lamp-icon.png"
        alt="Aladdin"
        className="w-20 h-20 mb-6 animate-bounce-slow animate-glow object-contain"
      />

      <h1 className="text-xl font-bold text-white mb-1">
        {mode === 'login'
          ? (isZh ? '欢迎回来，旅人' : 'Welcome Back, Traveler')
          : (isZh ? '加入阿拉丁许愿灯' : 'Join Aladdin\'s Wish Lamp')}
      </h1>
      <p className="text-xs text-gray-500 mb-8 text-center max-w-xs">
        {mode === 'login'
          ? (isZh ? '登录后继续你的许愿之旅' : 'Sign in to continue your wish journey')
          : (isZh ? '注册后即可获得3个免费愿望' : 'Sign up to get 3 free wishes')}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {isZh ? '昵称（可选）' : 'Nickname (optional)'}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 20))}
              placeholder={isZh ? '给自己取个名字' : 'Give yourself a name'}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all"
            />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {isZh ? '邮箱' : 'Email'}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="traveler@example.com"
            required
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {isZh ? '密码（至少6位）' : 'Password (min 6 chars)'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all"
          />
        </div>

        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password.trim()}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold disabled:opacity-30 hover:scale-[1.02] transition-all"
        >
          {loading
            ? '...'
            : mode === 'login'
              ? (isZh ? '🪔 登录' : '🪔 Sign In')
              : (isZh ? '✨ 注册' : '✨ Sign Up')}
        </button>
        </form>

        {/* 忘记密码链接 - 仅登录模式 */}
        {mode === 'login' && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setPassword(''); }}
              className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
            >
              {isZh ? '忘记密码？' : 'Forgot password?'}
            </button>
          </div>
        )}

        {/* forgot 模式：输入邮箱发送重置链接 */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="w-full max-w-sm space-y-4 mt-4">
            <h2 className="text-lg font-bold text-white text-center mb-4">
              {isZh ? '🔑 重置密码' : '🔑 Reset Password'}
            </h2>
            <p className="text-xs text-gray-400 text-center mb-4">
              {isZh ? '输入注册邮箱，我们将发送重置链接到您的邮箱'
                : 'Enter your registered email, we will send you a reset link'}
            </p>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">{isZh ? '邮箱' : 'Email'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="traveler@example.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all"
              />
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 text-center">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold disabled:opacity-30 hover:scale-[1.02] transition-all"
            >
              {loading ? '...' : (isZh ? '📧 发送重置链接' : '📧 Send Reset Link')}
            </button>

            <p className="text-center text-xs text-gray-500 mt-4">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-amber-400 font-medium"
              >
                ← {isZh ? '返回登录' : 'Back to Sign In'}
              </button>
            </p>
          </form>
        )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          {mode === 'login'
            ? (isZh ? '还没有账号？' : "Don't have an account?")
            : (isZh ? '已有账号？' : 'Already have an account?')}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="ml-1 text-amber-400 hover:underline font-medium"
          >
            {mode === 'login'
              ? (isZh ? '注册' : 'Sign Up')
              : (isZh ? '登录' : 'Sign In')}
          </button>
        </p>
      </div>

      <button
        onClick={() => router.push('/')}
        className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        {isZh ? '继续以游客身份浏览 →' : 'Continue as guest →'}
      </button>
    </div>
  );
}
