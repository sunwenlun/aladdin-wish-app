'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, Mailbox, Heart, User } from 'lucide-react';
import { supabaseAuth } from '@/lib/supabaseAuth';

export function Navigation() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isZh = i18n.language === 'zh';

  // admin 页面不显示底部导航
  if (pathname?.startsWith('/admin')) return null;

  useEffect(() => {
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    const { data: listener } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const items = [
    { href: '/', label: t('nav.home'), icon: Home },
    { href: '/wish', label: t('nav.wish'), icon: Sparkles },
    { href: '/mailbox', label: t('nav.mailbox'), icon: Mailbox },
    { href: '/my-wishes', label: t('nav.mine'), icon: Heart },
    { href: '/auth', label: isLoggedIn ? (isZh ? '我的' : 'Me') : (isZh ? '登录' : 'Login'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a1a]/90 backdrop-blur-lg border-t border-white/10">
      <div className="max-w-md mx-auto flex items-center justify-around px-1 py-2 pb-safe">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
