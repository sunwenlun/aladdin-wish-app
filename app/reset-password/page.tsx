'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/lib/supabaseAuth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const isZh = typeof navigator !== 'undefined' && navigator.language.startsWith('zh');

  useEffect(() => {
    // Supabase 通过 URL hash 传递 access_token，detectSessionInUrl: true 会自动处理
    // 等待 session 恢复
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        // 如果没有 session，可能是链接已过期或无效
        setSessionReady(true);
      }
    });
  }, []);

  const handleResetPassword = async () => {
    setError('');

    if (!password) {
      setError(isZh ? '请输入新密码' : 'Please enter a new password');
      return;
    }
    if (password.length < 6) {
      setError(isZh ? '密码至少6位' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError(isZh ? '两次输入的密码不一致' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabaseAuth.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(isZh ? '重置失败：' + updateError.message : 'Reset failed: ' + updateError.message);
      } else {
        setSuccess(true);
        // 3秒后跳转首页
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (e: any) {
      setError(isZh ? '操作失败，请重试' : 'Something went wrong, please try again');
    }
    setLoading(false);
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] starry-bg">
        <div className="text-amber-400 text-4xl animate-pulse">🪔</div>
      </div>
    );
  }

  // 成功页面
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#0a0a1a] starry-bg">
        <div className="text-5xl mb-6">✨</div>
        <h1 className="text-xl font-bold text-white mb-2">
          {isZh ? '密码重置成功！' : 'Password Reset Successfully!'}
        </h1>
        <p className="text-sm text-gray-400 text-center max-w-xs mb-8">
          {isZh
            ? '正在跳转首页，请使用新密码登录...'
            : 'Redirecting to home, please sign in with your new password...'}
        </p>
        <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  // 重置密码表单
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#0a0a1a] starry-bg">
      <img
        src="/genie-lamp-icon.png"
        alt="Aladdin"
        className="w-20 h-20 mb-6 animate-bounce-slow animate-glow object-contain"
      />

      <h1 className="text-xl font-bold text-white mb-1">
        {isZh ? '设置新密码' : 'Set New Password'}
      </h1>
      <p className="text-xs text-gray-500 mb-8 text-center max-w-xs">
        {isZh ? '输入你的新密码，重置后请使用新密码登录' : 'Enter your new password below'}
      </p>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {isZh ? '新密码（至少6位）' : 'New Password (min 6 chars)'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            {isZh ? '确认新密码' : 'Confirm New Password'}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all"
          />
        </div>

        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleResetPassword}
          disabled={loading || !password || !confirmPassword}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold disabled:opacity-30 hover:scale-[1.02] transition-all"
        >
          {loading ? '...' : (isZh ? '🔑 重置密码' : '🔑 Reset Password')}
        </button>
      </div>

      <button
        onClick={() => router.push('/')}
        className="mt-6 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        {isZh ? '← 返回首页' : '← Back to Home'}
      </button>
    </div>
  );
}
