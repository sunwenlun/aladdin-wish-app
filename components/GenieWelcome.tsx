'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function GenieWelcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowText(true), 600);
    const t2 = setTimeout(() => setShowButton(true), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center px-6">
      {/* 神灯 */}
      <img 
        src="/genie-lamp-icon.png" 
        alt="Aladdin Lamp" 
        className="w-48 h-48 mb-8 animate-bounce-slow animate-glow object-contain rounded-xl"
      />

      {/* 灯神问候 - 打字机效果 */}
      <div className="text-center max-w-md min-h-[80px]">
        {showText && (
          <p className="text-lg text-amber-100 leading-relaxed animate-fade-in-up">
            {t('genie.greeting')}
          </p>
        )}
      </div>

      {/* 提示 */}
      <div className="text-center mt-6">
        {showButton && (
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-base shadow-lg shadow-amber-500/30 hover:scale-105 transition-all animate-fade-in-up"
          >
            {t('genie.tapToStart')}
          </button>
        )}
      </div>

      {/* 装饰星星 */}
      <div className="absolute top-1/4 left-1/4 text-2xl animate-twinkle">✨</div>
      <div className="absolute top-1/3 right-1/4 text-xl animate-twinkle-delayed">⭐</div>
      <div className="absolute bottom-1/3 left-1/3 text-lg animate-twinkle">✨</div>
      <div className="absolute bottom-1/4 right-1/3 text-2xl animate-twinkle-delayed">⭐</div>
    </div>
  );
}
