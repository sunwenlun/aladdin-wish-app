'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/useAuth';
import { supabaseAuth } from '@/lib/supabaseAuth';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { signIn, signUp } = useAuth();
  const isZh = i18n.language === 'zh';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  if (!isOpen) return null;

  // 将 Supabase 英文错误翻译成用户友好的文字
  const translateError = (msg: string): string => {
    if (!msg) return '';
    const m = msg.toLowerCase();
    if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) {
      return isZh
        ? '邮箱尚未验证。请查收注册邮件，点击确认链接后再登录（没收到？检查垃圾邮件）'
        : 'Email not confirmed. Please click the link in your registration email (check spam too)';
    }
    if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
      return isZh ? '邮箱或密码错误，请检查后重试' : 'Wrong email or password, please try again';
    }
    if (m.includes('user already registered') || m.includes('already registered')) {
      return isZh ? '该邮箱已注册，请直接登录' : 'Email already registered, please sign in';
    }
    if (m.includes('password should be at least') || m.includes('password_too_short')) {
      return isZh ? '密码至少需要6位字符' : 'Password must be at least 6 characters';
    }
    if (m.includes('rate limit') || m.includes('too many requests')) {
      return isZh ? '请求过于频繁，请稍后再试' : 'Too many requests, please wait a moment';
    }
    return msg;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setNeedsEmailVerification(false);
    if (!email || !password) {
      setError(isZh ? '请填写邮箱和密码' : 'Please enter email and password');
      return;
    }
    if (password.length < 6) {
      setError(isZh ? '密码至少6位' : 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(translateError(err));
        } else {
          setSuccess(isZh ? '登录成功！' : 'Logged in!');
          setTimeout(onClose, 800);
        }
      } else {
        if (!nickname) {
          setError(isZh ? '请输入昵称' : 'Please enter a nickname');
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, nickname) as any;
        if (result.error) {
          setError(translateError(result.error));
        } else if (result.autoLoginFailed) {
          // 需要邮箱验证
          setNeedsEmailVerification(true);
          setSuccess(isZh ? '注册成功！' : 'Registered!');
        } else {
          // 注册+自动登录都成功
          setSuccess(isZh ? '🎉 注册成功，已自动登录！' : '🎉 Registered & signed in!');
          setTimeout(onClose, 800);
        }
      }
    } catch (e: any) {
      setError(translateError(e.message || 'Error'));
    }
    setLoading(false);
  };

  // 忘记密码：发送重置邮件
  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    if (!email) {
      setError(isZh ? '请输入注册邮箱' : 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabaseAuth.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (err) {
        setError(translateError(err.message));
      } else {
        setSuccess(isZh
          ? '🔑 重置链接已发送！请查收邮件，点击链接设置新密码。'
          : '🔑 Reset link sent! Check your email and click the link to set a new password.'
        );
      }
    } catch (e: any) {
      setError(translateError(e.message || 'Error'));
    }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative w-[92%] max-w-sm bg-[#111128] border border-white/10 rounded-3xl p-6 shadow-2xl">
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg">✕</button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🪔</div>
          <h2 className="text-lg font-bold text-white">
            {mode === 'login'
              ? (isZh ? '登录神灯' : 'Enter the Lamp')
              : mode === 'register'
                ? (isZh ? '唤醒神灯' : 'Awaken the Lamp')
                : (isZh ? '找回密码' : 'Reset Password')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login'
              ? (isZh ? '登录后继续你的许愿之旅' : 'Sign in to continue your wish journey')
              : mode === 'register'
                ? (isZh ? '创建账号，开启许愿之旅' : 'Create an account to start wishing')
                : (isZh ? '输入注册邮箱，我们将发送重置链接' : 'Enter your email and we\'ll send a reset link')}
          </p>
        </div>

        {/* 表单 */}
        <div className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder={isZh ? '昵称' : 'Nickname'}
              className={inputClass}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className={inputClass}
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isZh ? '密码（至少6位）' : 'Password (min 6 chars)'}
              className={inputClass}
            />
          )}
        </div>

        {/* 邮箱验证提示卡片 */}
        {needsEmailVerification && (
          <div className="mt-4 p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 space-y-1">
            <p className="font-semibold">📬 {isZh ? '请验证邮箱' : 'Please verify your email'}</p>
            <p>{isZh
              ? `已发送确认邮件到 ${email}，点击邮件中的链接后即可登录。`
              : `We sent a confirmation email to ${email}. Click the link to activate your account.`
            }</p>
            <p className="text-amber-400/60">{isZh
              ? '没收到？检查垃圾邮件文件夹。'
              : "Didn't receive it? Check your spam folder."
            }</p>
          </div>
        )}

        {/* 错误/成功提示 */}
        {error && (
          <p className="text-xs text-red-400 mt-3 text-center">{error}</p>
        )}
        {success && !needsEmailVerification && (
          <p className="text-xs text-emerald-400 mt-3 text-center">{success}</p>
        )}

        {/* 提交按钮 */}
        {!needsEmailVerification && (
          <button
            onClick={mode === 'forgot' ? handleForgotPassword : handleSubmit}
            disabled={loading}
            className="w-full mt-5 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-sm disabled:opacity-50 hover:scale-[1.02] transition-all"
          >
            {loading ? '...' : (
              mode === 'forgot'
                ? (isZh ? '发送重置链接' : 'Send Reset Link')
                : mode === 'login'
                  ? (isZh ? '登录' : 'Sign In')
                  : (isZh ? '注册' : 'Sign Up')
            )}
          </button>
        )}

        {/* 需要邮箱验证时的操作按钮 */}
        {needsEmailVerification && (
          <button
            onClick={() => { setNeedsEmailVerification(false); setMode('login'); setSuccess(''); }}
            className="w-full mt-4 py-3 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/15 transition-all"
          >
            {isZh ? '已验证，去登录 →' : 'Already verified, Sign In →'}
          </button>
        )}

        {/* 切换模式 */}
        {!needsEmailVerification && mode !== 'forgot' && (
          <p className="text-center text-xs text-gray-500 mt-4">
            {mode === 'login'
              ? (isZh ? '还没有账号？' : "Don't have an account?")
              : (isZh ? '已有账号？' : 'Already have an account?')}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); setNeedsEmailVerification(false); }}
              className="text-amber-400 ml-1 font-medium"
            >
              {mode === 'login' ? (isZh ? '立即注册' : 'Sign Up') : (isZh ? '去登录' : 'Sign In')}
            </button>
          </p>
        )}

        {/* 忘记密码链接 */}
        {!needsEmailVerification && mode === 'login' && (
          <p className="text-center text-xs mt-2">
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); setPassword(''); }}
              className="text-gray-500 hover:text-amber-400 transition-colors"
            >
              {isZh ? '忘记密码？' : 'Forgot password?'}
            </button>
          </p>
        )}

        {/* forgot 模式：返回登录 */}
        {!needsEmailVerification && mode === 'forgot' && (
          <p className="text-center text-xs text-gray-500 mt-4">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-amber-400 font-medium"
            >
              {isZh ? '← 返回登录' : '← Back to Sign In'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
