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

  // 始终渲染子组件（不再阻塞），避免 Supabase 等依赖崩溃时整个页面卡在 loading
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
