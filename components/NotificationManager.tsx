'use client';

import { useEffect, useState } from 'react';
import { getCurrentUserId } from '@/lib/db';
import { supabase } from '@/lib/supabase';

// ============================================
// 推送通知管理器
// - 注册 Service Worker
// - 请求通知权限
// - 监听信箱新愿望 + 愿望被实现
// ============================================

export function NotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [lastMailboxCount, setLastMailboxCount] = useState<number | null>(null);

  // ===== 注册 Service Worker =====
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('SW registration failed:', err);
      });
    }
  }, []);

  // ===== 检查权限状态 =====
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      const saved = localStorage.getItem('aladdin_notifications');
      setEnabled(saved === 'true');
    }
  }, []);

  // ===== 请求通知权限 =====
  const requestPermission = async () => {
    if (!('Notification' in window)) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      localStorage.setItem('aladdin_notifications', 'true');
      setEnabled(true);

      // 发送欢迎通知
      showNotification('🪔 灯神已就位', '有新愿望到达时，我会第一时间告诉你！', '/mailbox');
    }
  };

  // ===== 显示通知 =====
  const showNotification = (title: string, body: string, url: string = '/') => {
    if (permission !== 'granted') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/genie-lamp-icon.png',
          badge: '/genie-lamp-icon.png',
          data: { url },
          tag: 'aladdin-notification',
          actions: [
            { action: 'open', title: '查看' },
            { action: 'close', title: '忽略' },
          ],
        } as any);
      });
    } else if ('Notification' in window) {
      new Notification(title, {
        body,
        icon: '/genie-lamp-icon.png',
        data: { url },
      });
    }
  };

  // ===== 轮询：检查信箱新愿望 =====
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const userId = getCurrentUserId();
    if (!userId) return;

    const checkMailbox = async () => {
      try {
        const { count } = await supabase
          .from('wish_drifts')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .eq('status', 'pending');

        const currentCount = count || 0;

        if (lastMailboxCount !== null && currentCount > lastMailboxCount) {
          const diff = currentCount - lastMailboxCount;
          showNotification(
            '📬 信箱有新愿望',
            `${diff > 1 ? `${diff}个愿望` : '一个愿望'}漂到了你的信箱，去看看吧！`,
            '/mailbox'
          );
        }

        setLastMailboxCount(currentCount);
      } catch (e) {
        // 静默失败
      }
    };

    // 立即检查一次（建立基线）
    checkMailbox();

    // 每60秒轮询一次
    const interval = setInterval(checkMailbox, 60000);

    return () => clearInterval(interval);
  }, [enabled, permission, lastMailboxCount]);

  // ===== 轮询：检查自己的愿望是否被实现 =====
  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const userId = getCurrentUserId();
    if (!userId) return;

    const checkFulfilled = async () => {
      try {
        // 记录已通知的愿望ID，避免重复通知
        const notifiedKey = 'aladdin_notified_wishes';
        const notified: string[] = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

        const { data: myWishes } = await supabase
          .from('wishes')
          .select('id, status, type, content')
          .eq('user_id', userId)
          .in('status', ['fulfilled', 'aiFulfilled']);

        if (myWishes && myWishes.length > 0) {
          for (const w of myWishes) {
            if (!notified.includes(w.id)) {
              const isAI = w.status === 'aiFulfilled';
              showNotification(
                isAI ? '🤖 灯神实现了你的愿望！' : '✨ 你的愿望被实现了！',
                isAI
                  ? '灯神亲自出手，快去看看吧！'
                  : '有人帮你的愿望实现了，快去看看吧！',
                `/my-wishes`
              );
              notified.push(w.id);
            }
          }

          // 只保留最近50个
          const trimmed = notified.slice(-50);
          localStorage.setItem(notifiedKey, JSON.stringify(trimmed));
        }
      } catch (e) {
        // 静默失败
      }
    };

    // 初始延迟5秒，避免与信箱检查冲突
    const timer = setTimeout(checkFulfilled, 5000);
    const interval = setInterval(checkFulfilled, 120000); // 2分钟

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [enabled, permission]);

  // ===== 不渲染任何UI（静默运行） =====
  // 如果用户还没开启通知，显示一个浮动提示
  if (permission === 'default' && !enabled) {
    return (
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={requestPermission}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/80 to-indigo-500/80 text-white text-xs font-medium shadow-lg backdrop-blur-sm hover:scale-105 transition-all border border-white/10"
        >
          <span>🔔</span>
          <span>开启通知</span>
        </button>
      </div>
    );
  }

  return null;
}
