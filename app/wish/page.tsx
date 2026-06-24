'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { wishTypes } from '@/lib/mockData';
import type { WishTypeId } from '@/lib/types';
import { useUser } from '@/lib/useUser';
import { useAuth } from '@/lib/useAuth';
import { createWish } from '@/lib/db';

const MAX_CHARS = 200;

// 灯油套餐（USD）
const oilPackages = [
  { id: 'small', amount: 1, priceUsd: 0.99, popular: false, icon: '🫗' },
  { id: 'medium', amount: 3, priceUsd: 2.99, popular: true, icon: '🪔' },
  { id: 'large', amount: 10, priceUsd: 6.99, popular: false, icon: '🏮' },
];

export default function WishPageWrapper() {
  return (
    <Suspense fallback={<div className="px-6 pt-20 text-center text-sm text-gray-500">Loading...</div>}>
      <WishPage />
    </Suspense>
  );
}

function WishPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: userLoading, refreshUser } = useUser();
  const { isAuthenticated, showLogin } = useAuth();
  const searchParams = useSearchParams();
  const [selectedType, setSelectedType] = useState<WishTypeId | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [showOilModal, setShowOilModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const remaining = user?.wish_chances ?? 3;
  const isZh = i18n.language === 'zh';

  // 处理 Stripe 支付回调
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      refreshUser();
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 3000);
      // 清除 URL 参数
      window.history.replaceState({}, '', '/wish');
    } else if (paymentStatus === 'cancelled') {
      // 支付取消，什么都不做
      window.history.replaceState({}, '', '/wish');
    }
  }, [searchParams, refreshUser]);

  const handleSubmit = async () => {
    if (!selectedType || content.length === 0 || content.length > MAX_CHARS || !user) return;
    setSubmitting(true);

    // AI审核愿望
    try {
      const reviewResp = await fetch('/api/review-wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const reviewResult = await reviewResp.json();

      if (!reviewResult.approved) {
        // 审核不通过 → 世界和平
        setRejected(true);
        setSubmitting(false);
        return;
      }
    } catch {
      // 审核API出错，不阻塞用户
    }

    const result = await createWish(user.id, selectedType, content);
    if (result) {
      setSubmitted(true);
      await refreshUser();
    } else {
      alert(t('wish.error') || 'Failed to submit wish');
    }
    setSubmitting(false);
  };

  const handleBuyOil = async (packageId: string) => {
    if (!user) return;
    setPurchasing(true);
    try {
      const resp = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, userId: user.id }),
      });
      const result = await resp.json();

      if (result.success) {
        if (result.mode === 'stripe' && result.checkoutUrl) {
          // 正式 Stripe 支付：跳转到 Stripe Checkout 页面
          window.location.href = result.checkoutUrl;
        } else {
          // 开发模式：直接增加次数
          await refreshUser();
          setPurchaseSuccess(true);
          setTimeout(() => {
            setShowOilModal(false);
            setPurchaseSuccess(false);
          }, 1500);
        }
      } else {
        alert(isZh ? '购买失败，请重试' : 'Purchase failed, please try again');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert(isZh ? '购买失败' : 'Purchase failed');
    }
    setPurchasing(false);
  };

  // ===== 加载中 =====
  if (userLoading) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-6xl mb-4 animate-bounce-slow">🪔</div>
        <p className="text-sm text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  // ===== 未登录 → 提示注册 =====
  if (!isAuthenticated) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-7xl mb-6 animate-float">🪔</div>
        <h2 className="text-xl font-bold text-white mb-3">
          {isZh ? '唤醒神灯，许下愿望' : 'Awaken the Lamp, Make a Wish'}
        </h2>
        <p className="text-sm text-gray-400 max-w-sm mb-2">
          {isZh
            ? '神灯需要认识你，才能把愿望送到对的人手中'
            : 'The lamp needs to know you, to send wishes to the right person'}
        </p>
        <p className="text-sm text-amber-400/80 max-w-sm mb-8">
          {isZh
            ? '✨ 注册只需10秒，开启你的许愿之旅'
            : '✨ Registration takes 10 seconds, start your wish journey'}
        </p>

        <button
          onClick={showLogin}
          className="w-full max-w-xs py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-sm hover:scale-[1.02] transition-all mb-3"
        >
          {isZh ? '🪔 登录 / 注册' : '🪔 Sign In / Sign Up'}
        </button>

        <Link
          href="/"
          className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm"
        >
          {isZh ? '先去看看别人的愿望' : 'Browse others\' wishes first'}
        </Link>
      </div>
    );
  }

  // ===== 愿望被拒绝 → 世界和平动画 =====
  if (rejected) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0a0a1a] starry-bg flex flex-col items-center justify-center px-6">
        <div className="text-7xl mb-8 animate-float">🌍</div>
        <div className="text-center max-w-sm">
          <p className="text-lg text-amber-100 leading-relaxed animate-fade-in-up mb-2">
            {isZh ? '这个愿望…' : 'This wish...'}
          </p>
          <p className="text-xl text-amber-200 font-bold leading-relaxed animate-fade-in-up mt-4">
            {isZh ? '你还是许愿世界永远和平吧 🌍' : 'How about you wish for world peace instead? 🌍'}
          </p>
          <p className="text-sm text-gray-400 mt-4 animate-fade-in-up">
            {isZh ? '灯神微微一笑，将你的愿望化作了和平的星光' : 'The Genie smiles gently, turning your wish into a star of peace'}
          </p>
        </div>
        <button
          onClick={() => {
            setRejected(false);
            setContent('');
            setSelectedType(null);
          }}
          className="mt-10 px-8 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold shadow-lg shadow-amber-500/30 hover:scale-105 transition-all animate-fade-in-up"
        >
          {isZh ? '重新许愿' : 'Make a New Wish'}
        </button>
        <div className="absolute top-[15%] left-[20%] text-2xl animate-twinkle">✨</div>
        <div className="absolute top-[25%] right-[20%] text-xl animate-twinkle-delayed">⭐</div>
        <div className="absolute bottom-[30%] left-[25%] text-lg animate-twinkle">✨</div>
        <div className="absolute bottom-[20%] right-[25%] text-2xl animate-twinkle-delayed">⭐</div>
      </div>
    );
  }

  // ===== 许愿成功页 =====
  if (submitted) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-7xl mb-6 animate-bounce-slow">🪔</div>
        <h2 className="text-xl font-bold text-white mb-2">{t('wish.success')}</h2>
        <p className="text-sm text-gray-400 mb-8 max-w-xs">{t('wish.successDesc')}</p>
        <div className="space-y-3 w-full max-w-xs">
          <Link
            href="/my-wishes"
            className="block w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-center"
          >
            {t('wish.successTrack')}
          </Link>
          <Link
            href="/"
            className="block w-full py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium text-center"
          >
            {t('wish.successHome')}
          </Link>
        </div>
      </div>
    );
  }

  // ===== 机会用完 → 显示加灯油界面 =====
  if (remaining <= 0) {
    return (
      <div className="px-6 pt-16 flex flex-col items-center text-center">
        <div className="text-7xl mb-6 animate-float">🪔</div>
        <h2 className="text-lg font-bold text-white mb-3">
          {isZh ? '愿望已许完' : 'Wishes All Used'}
        </h2>
        <p className="text-sm text-gray-400 max-w-xs mb-2">
          {isZh
            ? '你的3个愿望已全部放入灯中，正在漂流途中...'
            : 'Your 3 wishes are all in the lamp, drifting to travelers...'}
        </p>
        <p className="text-sm text-amber-400/80 max-w-xs mb-8">
          {isZh
            ? '✨ 给灯神加灯油，继续许下新的愿望'
            : '✨ Refill the lamp with oil to make more wishes'}
        </p>

        {/* 灯油套餐 */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          {oilPackages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => handleBuyOil(pkg.id)}
              disabled={purchasing}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all disabled:opacity-50 ${
                pkg.popular
                  ? 'border-amber-400 bg-amber-400/10 hover:bg-amber-400/15'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{pkg.icon}</span>
                <div className="text-left">
                  <div className="text-base font-bold text-white">
                    {pkg.amount} {isZh ? '份灯油' : 'Oil Refills'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {pkg.amount} {isZh ? '个许愿机会' : 'wish chances'}
                  </div>
                  {pkg.popular && (
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      ⭐ {isZh ? '最受欢迎 · 省17%' : 'Most Popular · Save 17%'}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-amber-400">
                  ${pkg.priceUsd.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-500">
                  ${(pkg.priceUsd / pkg.amount).toFixed(2)}/ea
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 支付方式提示 */}
        <p className="text-[10px] text-gray-600 mb-6 text-center max-w-xs">
          {isZh
            ? '💳 支持信用卡/借记卡（Stripe安全支付）'
            : '💳 Secure payment via Stripe (Credit/Debit Card)'}
        </p>

        {/* 购买成功提示 */}
        {purchaseSuccess && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-8 py-4 text-center">
            <div className="text-3xl mb-1">✨</div>
            <p className="text-sm font-semibold text-emerald-400">
              {isZh ? '灯油已加入！' : 'Oil refilled!'}
            </p>
          </div>
        )}

        {/* 返回首页 */}
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm"
        >
          {t('wish.successHome')}
        </Link>
      </div>
    );
  }

  // ===== 许愿表单 =====
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-white mb-1">{t('wish.title')}</h1>
      <p className="text-xs text-amber-400 mb-6">
        ✨ {remaining} {t('wish.remaining')}
      </p>

      {/* 类型选择 */}
      <h2 className="text-sm font-semibold text-gray-300 mb-3">{t('wish.chooseType')}</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {wishTypes.map((wt) => {
          const isLocked = wt.locked;
          return (
            <button
              key={wt.id}
              onClick={() => !isLocked && setSelectedType(wt.id)}
              disabled={isLocked}
              className={`p-4 rounded-2xl border-2 transition-all text-left relative ${
                isLocked
                  ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                  : selectedType === wt.id
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wt.color} flex items-center justify-center text-xl mb-2 ${
                isLocked && 'grayscale-[0.5]'
              }`}>
                {wt.icon}
              </div>
              <div className={`text-sm font-semibold ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                {t(`type.${wt.id}.name`)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {t(`type.${wt.id}.desc`)}
              </div>
              {isLocked && (
                <div className="absolute top-2 right-2 text-sm">🔒</div>
              )}
            </button>
          );
        })}
      </div>

      {/* 愿望输入 */}
      <h2 className="text-sm font-semibold text-gray-300 mb-3">{t('wish.writeContent')}</h2>
      <div className="relative mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder={t('wish.placeholder')}
          rows={5}
          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-amber-400/50 transition-all"
        />
        <div className="absolute bottom-3 right-4 text-xs text-gray-600">
          {content.length}/{MAX_CHARS}
        </div>
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={!selectedType || content.length === 0 || submitting}
        className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
      >
        {submitting ? '...' : `🪔 ${t('wish.submit')}`}
      </button>
    </div>
  );
}
