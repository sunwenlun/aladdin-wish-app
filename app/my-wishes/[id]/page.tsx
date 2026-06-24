'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWishDetail } from '@/lib/db';
import { getWishType } from '@/lib/mockData';
import { useUser } from '@/lib/useUser';
import { ShareButton } from '@/components/ShareButton';

type DriftStatus = 'pending' | 'accepted' | 'implemented' | 'forwarded' | 'drifted' | 'peace' | 'expired';

type DriftRecord = {
  id: string;
  batch_num: number;
  status: DriftStatus;
  created_at: string;
  responded_at: string | null;
  forward_to: string | null;
  receiver: { nickname: string | null; avatar: string | null };
};

type WishDetail = {
  id: string;
  type: string;
  content: string;
  status: string;
  drift_batch: number;
  drift_count: number;
  max_batches: number;
  created_at: string;
  fulfilled_at: string | null;
  fulfilled_message: string | null;
  fulfilled_image_url: string | null;
  fulfilled_voice_url: string | null;
  fulfilled_by: string | null;
  trail: DriftRecord[];
  implementer: { id: string; nickname: string | null; avatar: string | null } | null;
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

// 漂流状态配置
const driftStatusConfig: Record<DriftStatus, { label: string; labelEn: string; icon: string; color: string }> = {
  pending: { label: '等待回应', labelEn: 'Awaiting', icon: '⏳', color: 'text-amber-400' },
  accepted: { label: '已接收', labelEn: 'Accepted', icon: '📬', color: 'text-blue-400' },
  implemented: { label: '已实现', labelEn: 'Fulfilled', icon: '✅', color: 'text-emerald-400' },
  forwarded: { label: '已转发', labelEn: 'Forwarded', icon: '📨', color: 'text-violet-400' },
  drifted: { label: '继续漂流', labelEn: 'Drifted On', icon: '🌊', color: 'text-cyan-400' },
  peace: { label: '世界和平', labelEn: 'World Peace', icon: '🌍', color: 'text-gray-400' },
  expired: { label: '已超时', labelEn: 'Expired', icon: '⏰', color: 'text-gray-600' },
};

export default function WishDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const [wish, setWish] = useState<WishDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageOverlay, setShowImageOverlay] = useState(false);
  const [showOilModal, setShowOilModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const wishId = params.id as string;
  const isZh = i18n.language === 'zh';

  const loadWish = useCallback(async () => {
    if (!wishId) return;
    setLoading(true);
    const data = await getWishDetail(wishId);
    setWish(data as WishDetail | null);
    setLoading(false);
  }, [wishId]);

  useEffect(() => {
    loadWish();
  }, [loadWish]);

  // 灯油套餐（USD）
  const oilPackages = [
    { id: 'small', amount: 1, priceUsd: 0.99, popular: false, icon: '🫗' },
    { id: 'medium', amount: 3, priceUsd: 2.99, popular: true, icon: '🪔' },
    { id: 'large', amount: 10, priceUsd: 6.99, popular: false, icon: '🏮' },
  ];

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
          window.location.href = result.checkoutUrl;
        } else {
          // 开发模式
          await refreshUser();
          setShowOilModal(false);
          router.push('/wish');
        }
      }
    } catch (err) {
      console.error('Purchase error:', err);
    }
    setPurchasing(false);
  };

  // ===== 加载中 =====
  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="h-48 rounded-2xl bg-white/5 border border-white/10 animate-pulse mb-4" />
        <div className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  // ===== 未找到 =====
  if (!wish) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-sm text-gray-400">{isZh ? '愿望未找到' : 'Wish not found'}</p>
        <button
          onClick={() => router.push('/my-wishes')}
          className="mt-6 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const wt = getWishType(wish.type as any);
  const isFulfilled = wish.status === 'fulfilled' || wish.status === 'aiFulfilled';
  const isAiFulfilled = wish.status === 'aiFulfilled';
  const genieMsg = isFulfilled && wish.fulfilled_message ? parseGenieMessage(wish.fulfilled_message) : null;

  // 状态配置
  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    drifting: { label: t('mine.status.drifting'), color: 'text-cyan-400 bg-cyan-400/10', icon: '🌊' },
    received: { label: t('mine.status.received'), color: 'text-amber-400 bg-amber-400/10', icon: '📬' },
    implementing: { label: t('mine.status.implementing'), color: 'text-violet-400 bg-violet-400/10', icon: '⏳' },
    fulfilled: { label: t('mine.status.fulfilled'), color: 'text-emerald-400 bg-emerald-400/10', icon: '✅' },
    aiFulfilled: { label: t('mine.status.aiFulfilled'), color: 'text-violet-400 bg-violet-400/10', icon: '🤖' },
  };
  const status = statusConfig[wish.status] || statusConfig.drifting;

  // 按批次分组漂流记录
  const batchedTrail: Record<number, DriftRecord[]> = {};
  wish.trail.forEach(d => {
    if (!batchedTrail[d.batch_num]) batchedTrail[d.batch_num] = [];
    batchedTrail[d.batch_num].push(d);
  });
  const batchNums = Object.keys(batchedTrail).map(Number).sort((a, b) => a - b);

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 返回按钮 */}
      <button
        onClick={() => router.push('/my-wishes')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
      >
        ← {t('common.back')}
      </button>

      {/* 愿望卡片 */}
      <div className={`rounded-2xl bg-white/5 border p-5 mb-4 ${
        isFulfilled ? 'border-emerald-400/20' : 'border-white/10'
      }`}>
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wt?.color} flex items-center justify-center text-xl`}>
              {wt?.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{t(`type.${wish.type}.name`)}</div>
              <div className="text-xs text-gray-500">{new Date(wish.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.color}`}>
            {status.icon} {status.label}
          </span>
        </div>

        {/* 愿望内容 */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 mb-3">
          <p className="text-base text-gray-100 leading-relaxed">
            &ldquo;{wish.content}&rdquo;
          </p>
        </div>

        {/* 漂流统计 */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{isZh ? '🌊' : '🌊'} {isZh ? `${wish.drift_count} 位旅人` : `${wish.drift_count} travelers`}</span>
          <span>·</span>
          <span>{isZh ? `${wish.drift_batch}/${wish.max_batches} ${isZh ? '批' : 'batches'}` : `${wish.drift_batch}/${wish.max_batches} batches`}</span>
        </div>
      </div>

      {/* 实现者留言 */}
      {genieMsg && (
        <div className="rounded-2xl bg-emerald-400/5 border border-emerald-400/15 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/20 flex items-center justify-center text-lg">
              {isAiFulfilled ? '🤖' : '❤️'}
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-400">
                {isAiFulfilled ? t('case.aiFulfilled') : t('case.fulfilled')}
              </div>
              <div className="text-xs text-gray-500">
                {wish.implementer?.nickname || (isAiFulfilled ? '灯神' : '旅人')}
                {wish.fulfilled_at && ` · ${new Date(wish.fulfilled_at).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-200 italic leading-relaxed">
            &ldquo;{genieMsg.text}&rdquo;
          </p>
          {genieMsg.imageUrl && (
            <div
              className="mt-3 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageOverlay(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={genieMsg.imageUrl}
                alt="Fulfilled"
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="px-3 py-2 bg-black/30 text-xs text-gray-400 text-center">
                {isZh ? '🔍 点击查看大图' : '🔍 Tap to view full size'}
              </div>
            </div>
          )}
          {/* 用户上传的图片 */}
          {wish.fulfilled_image_url && !genieMsg.imageUrl && (
            <div
              className="mt-3 rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageOverlay(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wish.fulfilled_image_url}
                alt="Fulfilled"
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="px-3 py-2 bg-black/30 text-xs text-gray-400 text-center">
                {isZh ? '🔍 点击查看大图' : '🔍 Tap to view full size'}
              </div>
            </div>
          )}
          {/* 用户上传的语音 */}
          {wish.fulfilled_voice_url && (
            <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🎤</span>
                <span className="text-xs text-gray-400">{isZh ? '语音留言' : 'Voice Message'}</span>
              </div>
              <audio src={wish.fulfilled_voice_url} controls className="w-full h-9" />
            </div>
          )}
        </div>
      )}

      {/* 漂流轨迹 */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <span>🌊</span> {isZh ? '漂流轨迹' : 'Drift Journey'}
        </h3>

        {batchNums.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">
            {isZh ? '暂无漂流记录' : 'No drift records yet'}
          </p>
        ) : (
          <div className="space-y-4">
            {batchNums.map((batchNum) => {
              const records = batchedTrail[batchNum];
              return (
                <div key={batchNum}>
                  {/* 批次标题 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-amber-400/10 flex items-center justify-center text-[10px] font-bold text-amber-400">
                      {batchNum}
                    </div>
                    <span className="text-xs text-gray-400">
                      {isZh ? `第 ${batchNum} 批漂流` : `Batch ${batchNum}`}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {/* 每个接收者 */}
                  <div className="ml-4 space-y-2 border-l border-white/10 pl-4">
                    {records.map((d) => {
                      const cfg = driftStatusConfig[d.status] || driftStatusConfig.pending;
                      const name = d.receiver.nickname || (isZh ? '匿名旅人' : 'Anonymous');
                      const avatar = d.receiver.avatar || '🪔';
                      return (
                        <div key={d.id} className="flex items-start gap-3 py-1.5">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm shrink-0">
                            {avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-300 truncate">{name}</span>
                              <span className={`text-[10px] ${cfg.color}`}>
                                {cfg.icon} {isZh ? cfg.label : cfg.labelEn}
                              </span>
                            </div>
                            {d.responded_at && (
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                {new Date(d.responded_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* AI灯神保底标记 */}
            {isAiFulfilled && (
              <div className="ml-4 border-l border-violet-400/20 pl-4 mt-2">
                <div className="flex items-start gap-3 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-violet-400/10 flex items-center justify-center text-sm shrink-0">
                    🤖
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-violet-400">
                        {isZh ? '灯神' : 'Genie'}
                      </span>
                      <span className="text-[10px] text-violet-400">
                        ✨ {isZh ? '亲自实现' : 'Granted the wish'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {isZh ? '5批漂流无人认领，灯神保底介入' : '5 batches with no response, genie intervened'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 分享区域 — 已实现的愿望可分享 */}
      {isFulfilled && genieMsg && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-r from-amber-400/5 to-orange-400/5 border border-amber-400/10 p-5 text-center w-full">
            <p className="text-sm text-amber-300/80 font-medium mb-1">
              {isZh ? '✨ 分享你的愿望故事' : '✨ Share Your Wish Story'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isZh ? '让更多人看到这个温暖的故事，也许他们也想许愿' : 'Let more people see this heartwarming story, maybe they want to make a wish too'}
            </p>
            <ShareButton
              title={isZh ? '我的阿拉丁愿望' : 'My Aladdin Wish'}
              text={isZh
                ? `我在阿拉丁许愿灯许了一个愿望："${wish.content.slice(0, 50)}..."，${isAiFulfilled ? '灯神' : '一位旅人'}帮TA实现了！来许下你的愿望吧！`
                : `I made a wish on Aladdin's Wish Lamp: "${wish.content.slice(0, 50)}...", and ${isAiFulfilled ? 'the Genie' : 'a traveler'} fulfilled it! Come make your wish!`
              }
              url={typeof window !== 'undefined' ? `${window.location.origin}/my-wishes/${wish.id}` : ''}
              lang={isZh ? 'zh' : 'en'}
            />
          </div>
        </div>
      )}

      {/* 图片大图弹窗 */}
      {showImageOverlay && (genieMsg?.imageUrl || wish?.fulfilled_image_url) && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImageOverlay(false)}
        >
          <button className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white">
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={genieMsg?.imageUrl || wish?.fulfilled_image_url || undefined}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 加灯油弹窗 */}
      {showOilModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowOilModal(false)}
        >
          <div
            className="bg-slate-900 border border-amber-400/20 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🪔</div>
              <h3 className="text-base font-bold text-white">
                {isZh ? '给灯神加灯油' : 'Refill the Lamp'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {isZh ? '灯油用尽，添加灯油继续许愿' : 'Out of oil. Refill to keep wishing'}
              </p>
            </div>

            <div className="space-y-2.5 mb-5">
              {oilPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuyOil(pkg.id)}
                  disabled={purchasing}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all disabled:opacity-50 ${
                    pkg.popular
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{pkg.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">
                        {pkg.amount} {isZh ? '灯油' : 'Oil'}
                      </div>
                      {pkg.popular && (
                        <div className="text-[10px] text-amber-400">
                          ⭐ {isZh ? '最受欢迎' : 'Most Popular'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-amber-400">
                      ${pkg.priceUsd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      ${(pkg.priceUsd / pkg.amount).toFixed(2)}/ea
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowOilModal(false)}
              className="w-full py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
