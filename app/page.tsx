'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { changeLanguage } from '@/i18n/config';
import { WishCaseCard } from '@/components/WishCaseCard';
import { getFulfilledCases, getComingSoonCases, getHomeStats, checkExpiredDrifts } from '@/lib/db';
import type { WishCase } from '@/lib/types';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [fulfilledCases, setFulfilledCases] = useState<WishCase[]>([]);
  const [comingSoonCases, setComingSoonCases] = useState<WishCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalWishes: 0, totalFulfilled: 0, totalTravelers: 0 });

  const currentLang = i18n.language || 'en';

  useEffect(() => {
    const welcomed = localStorage.getItem('aladdin-welcomed');
    if (!welcomed) {
      setShowWelcome(true);
      const t1 = setTimeout(() => setShowText(true), 600);
      const t2 = setTimeout(() => setShowButton(true), 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, []);

  useEffect(() => {
    async function loadCases() {
      // 先检查超时漂流（48h未响应的自动推进）
      checkExpiredDrifts().catch(() => {});

      const [fulfilled, comingSoon, homeStats] = await Promise.all([
        getFulfilledCases(),
        getComingSoonCases(),
        getHomeStats(),
      ]);
      setStats(homeStats);
      // 映射数据库字段到前端类型
      setFulfilledCases(
        (fulfilled || []).map((c: any) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          content: c.content,
          authorName: c.author_name,
          authorCountry: c.author_country,
          status: c.status,
          implementerName: c.implementer_name || undefined,
          implementerMessage: c.implementer_message || undefined,
          driftPath: c.drift_path || 0,
          fulfilledAt: c.fulfilled_at || undefined,
        }))
      );
      setComingSoonCases(
        (comingSoon || []).map((c: any) => ({
          id: c.id,
          type: c.type,
          title: c.title,
          content: c.content,
          authorName: c.author_name,
          authorCountry: c.author_country,
          status: c.status,
          implementerName: c.implementer_name || undefined,
          implementerMessage: c.implementer_message || undefined,
          driftPath: c.drift_path || 0,
          fulfilledAt: c.fulfilled_at || undefined,
        }))
      );
      setLoading(false);
    }
    loadCases();
  }, []);

  const handleStart = () => {
    localStorage.setItem('aladdin-welcomed', 'true');
    setShowWelcome(false);
  };

  const toggleLang = () => {
    const newLang = currentLang === 'en' ? 'zh' : 'en';
    changeLanguage(newLang);
  };

  // ===== 首次访问·神灯欢迎动画 =====
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[60] bg-[#0a0a1a] starry-bg flex flex-col items-center justify-center px-6">
        <img 
          src="/genie-lamp-icon.png" 
          alt="Aladdin Lamp" 
          className="w-48 h-48 mb-8 animate-bounce-slow animate-glow object-contain"
        />

        <div className="text-center max-w-md min-h-[80px]">
          {showText && (
            <p className="text-lg text-amber-100 leading-relaxed animate-fade-in-up">
              {t('genie.greeting')}
            </p>
          )}
        </div>

        <div className="text-center mt-8">
          {showButton && (
            <button
              onClick={handleStart}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-base shadow-lg shadow-amber-500/30 hover:scale-105 transition-all animate-fade-in-up"
            >
              {t('genie.tapToStart')}
            </button>
          )}
        </div>

        {/* 装饰星星 */}
        <div className="absolute top-[15%] left-[20%] text-2xl animate-twinkle">✨</div>
        <div className="absolute top-[25%] right-[20%] text-xl animate-twinkle-delayed">⭐</div>
        <div className="absolute bottom-[30%] left-[25%] text-lg animate-twinkle">✨</div>
        <div className="absolute bottom-[20%] right-[25%] text-2xl animate-twinkle-delayed">⭐</div>
      </div>
    );
  }

  // ===== 首页主体 =====
  return (
    <div className="px-4 pt-6">
      {/* 顶部 */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <img src="/genie-lamp-icon.png" alt="Lamp" className="w-10 h-10 rounded-lg animate-float object-contain" />
            <h1 className="text-xl font-bold text-white">{t('appName')}</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{t('tagline')}</p>
        </div>
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-all"
        >
          {currentLang === 'en' ? '🇬🇧 EN' : '🇨🇳 中文'}
        </button>
      </header>

      {/* 数据统计 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { num: stats.totalWishes.toLocaleString(), label: t('home.statWishes'), icon: '🪔' },
          { num: stats.totalFulfilled.toLocaleString(), label: t('home.statFulfilled'), icon: '✨' },
          { num: stats.totalTravelers.toLocaleString(), label: t('home.statTravelers'), icon: '🧭' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent tabular-nums">
              {s.num}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 已实现的愿望 */}
      <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
        <span>✅</span> {t('home.wishesGranted')}
      </h2>
      {loading ? (
        <div className="space-y-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {fulfilledCases.map((c) => (
            <WishCaseCard key={c.id} caseData={c} />
          ))}
        </div>
      )}

      {/* 即将上线 */}
      <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
        <span>🔒</span> {t('home.comingSoon')}
      </h2>
      <div className="space-y-3 mb-8">
        {comingSoonCases.map((c) => (
          <WishCaseCard key={c.id} caseData={c} />
        ))}
      </div>

      {/* 浮动许愿按钮 */}
      <Link
        href="/wish"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold shadow-lg shadow-amber-500/30 hover:scale-105 transition-all flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span>{t('home.makeWish')}</span>
        </div>
      </Link>
    </div>
  );
}
