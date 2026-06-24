'use client';

import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage } from '@/i18n/config';
import { Globe } from 'lucide-react';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const currentLang = getCurrentLanguage();

  if (compact) {
    // 设置页的紧凑模式：下拉切换
    return (
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-amber-400" />
        <div className="flex gap-2">
          {(['en', 'zh'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentLang === lang
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {lang === 'en' ? 'English' : '中文'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 开机语言选择页的完整模式
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center px-6">
      {/* 神灯动画 */}
      <img 
        src="/genie-lamp-icon.png" 
        alt="Aladdin Lamp" 
        className="w-44 h-44 mb-8 animate-bounce-slow animate-glow object-contain rounded-xl"
      />

      <h1 className="text-2xl font-bold text-white mb-2">{t('lang.title')}</h1>
      <p className="text-gray-400 text-sm mb-10">{t('lang.subtitle')}</p>

      <div className="w-full max-w-sm space-y-4">
        {(['en', 'zh'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => {
              changeLanguage(lang);
              window.location.href = '/';
            }}
            className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
              currentLang === lang
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-white/10 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang === 'en' ? '🌍' : '🇨🇳'}</span>
              <span className="text-lg font-semibold text-white">
                {lang === 'en' ? 'English' : '中文'}
              </span>
            </div>
            {currentLang === lang && (
              <span className="text-amber-400 text-xl">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
