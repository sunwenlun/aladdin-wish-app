'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authUser, dbUser, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
