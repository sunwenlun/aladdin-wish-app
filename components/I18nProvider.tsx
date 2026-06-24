'use client';

import { I18nextProvider } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n, { changeLanguage } from '@/i18n/config';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 客户端挂载后，确保语言设置正确
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aladdin-lang') : null;
    if (saved && saved !== i18n.language) {
      changeLanguage(saved);
    }
    setMounted(true);
  }, []);

  // 避免水合不匹配：服务端渲染时不显示内容
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-amber-400 text-4xl animate-pulse">🪔</div>
      </div>
    );
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
