'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyWishes } from '@/lib/db';
import { useUser } from '@/lib/useUser';
import { getWishType } from '@/lib/mockData';

type MyWish = {
  id: string;
  type: string;
  content: string;
  status: string;
  drift_batch: number;
  drift_count: number;
  created_at: string;
  fulfilled_message?: string;
  fulfilled_at?: string;
  fulfilled_image_url?: string | null;
  fulfilled_voice_url?: string | null;
};

// 解析灯神留言中的图片URL
function parseGenieMessage(msg: string): { text: string; imageUrl: string | null } {
  if (!msg) return { text: '', imageUrl: null };
  const match = msg.match(/\[GENIE_IMAGE:(.+?)\]\s*$/);
  if (match) {
    return {
      text: msg.replace(/\[GENIE_IMAGE:.+?\]\s*$/, '').trim(),
      imageUrl: match[1],
    };
  }
  return { text: msg, imageUrl: null };
}

export default function MyWishesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId, loading: userLoading } = useUser();
  const [wishes, setWishes] = useState<MyWish[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getMyWishes(userId);
    setWishes(data as MyWish[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadWishes();
  }, [userId, loadWishes]);

  // ===== 加载中 =====
  if (userLoading || loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ===== 空状态 =====
  if (wishes.length === 0) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-6xl mb-4">🪔</div>
        <p className="text-base text-gray-300">{t('mine.empty')}</p>
        <p className="text-sm text-gray-600 mt-1">{t('mine.emptyDesc')}</p>
        <Link
          href="/wish"
          className="mt-6 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-sm"
        >
          {t('home.makeWish')}
        </Link>
      </div>
    );
  }

  // ===== 状态配置 =====
  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    drifting: { label: t('mine.status.drifting'), color: 'text-cyan-400 bg-cyan-400/10', icon: '🌊' },
    received: { label: t('mine.status.received'), color: 'text-amber-400 bg-amber-400/10', icon: '📬' },
    implementing: { label: t('mine.status.implementing'), color: 'text-violet-400 bg-violet-400/10', icon: '⏳' },
    fulfilled: { label: t('mine.status.fulfilled'), color: 'text-emerald-400 bg-emerald-400/10', icon: '✅' },
    aiFulfilled: { label: t('mine.status.aiFulfilled'), color: 'text-violet-400 bg-violet-400/10', icon: '🤖' },
  };

  // ===== 愿望列表 =====
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-white mb-6">{t('mine.title')}</h1>
      <div className="space-y-3">
        {wishes.map((w) => {
          const wt = getWishType(w.type as any);
          const status = statusConfig[w.status] || statusConfig.drifting;
          const isFulfilled = w.status === 'fulfilled' || w.status === 'aiFulfilled';
          const genieMsg = isFulfilled && w.fulfilled_message ? parseGenieMessage(w.fulfilled_message) : null;

          return (
            <div
              key={w.id}
              onClick={() => router.push(`/my-wishes/${w.id}`)}
              className={`rounded-2xl bg-white/5 border p-4 transition-all cursor-pointer hover:border-amber-400/30 hover:bg-white/[0.07] ${
                isFulfilled ? 'border-emerald-400/20' : 'border-white/10'
              }`}
            >
              {/* 顶部：类型 + 状态 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${wt?.color} flex items-center justify-center text-base`}>
                    {wt?.icon}
                  </div>
                  <span className="text-sm text-gray-400">{t(`type.${w.type}.name`)}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                  {status.icon} {status.label}
                </span>
              </div>

              {/* 愿望内容 */}
              <p className="text-sm text-gray-200 leading-relaxed mb-2 line-clamp-2">
                &ldquo;{w.content}&rdquo;
              </p>

              {/* 已实现：显示实现者留言预览 */}
              {isFulfilled && genieMsg && (
                <div className="mt-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs">{w.status === 'aiFulfilled' ? '🤖' : '❤️'}</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {w.status === 'aiFulfilled' ? t('case.aiFulfilled') : t('case.fulfilled')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 italic leading-relaxed line-clamp-2">
                    &ldquo;{genieMsg.text}&rdquo;
                  </p>
                  {genieMsg.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 h-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={genieMsg.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {/* 用户上传的图片 */}
                  {w.fulfilled_image_url && !genieMsg?.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 h-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={w.fulfilled_image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {/* 用户上传的语音 */}
                  {w.fulfilled_voice_url && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                      <span>🎤</span>
                      <span>{t('mine.hasVoice') || 'Voice message'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 漂流信息 + 查看详情提示 */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{t('mine.driftCount', { count: w.drift_count })}</span>
                  <span>·</span>
                  <span>{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
                <span className="text-xs text-amber-400/60">
                  {t('detail.tapToView')} →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
