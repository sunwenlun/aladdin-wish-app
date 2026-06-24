'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWishDetailPublic, directFulfillWish } from '@/lib/db';
import { useUser } from '@/lib/useUser';
import { getWishType } from '@/lib/mockData';
import MediaUploader from '@/components/MediaUploader';

type PublicWishData = {
  id: string;
  type: string;
  content: string;
  status: string;
  drift_count: number;
  drift_batch: number;
  max_batches: number;
  created_at: string;
  fulfilled_at: string | null;
  fulfilled_message: string | null;
  fulfilled_image_url: string | null;
  fulfilled_voice_url: string | null;
  fulfilled_by: string | null;
  implementer_name: string | null;
};

export default function WishPublicPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { userId } = useUser();
  const [wishData, setWishData] = useState<PublicWishData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImplement, setShowImplement] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [fulfilled, setFulfilled] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [moderating, setModerating] = useState(false);

  const wishId = params.id as string;
  const isZh = i18n.language === 'zh';

  const loadWish = useCallback(async () => {
    if (!wishId) return;
    setLoading(true);
    const data = await getWishDetailPublic(wishId);
    setWishData(data as PublicWishData | null);
    setLoading(false);
  }, [wishId]);

  useEffect(() => {
    loadWish();
  }, [loadWish]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDirectFulfill = async () => {
    if (!message.trim() || !userId) return;
    setModerating(true);

    // AI审核实现内容
    try {
      const modResp = await fetch('/api/moderate-fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          hasImage: !!imageUrl,
          hasVoice: !!voiceUrl,
        }),
      });
      const modResult = await modResp.json();

      if (!modResult.approved) {
        setModerating(false);
        showToast(isZh
          ? `⚠️ 内容审核未通过：${modResult.reason || '请修改后重试'}`
          : `⚠️ Content rejected: ${modResult.reason || 'Please modify and try again'}`
        );
        return;
      }
    } catch {
      // 审核API出错，不阻塞
    }
    setModerating(false);

    setSubmitting(true);
    const result = await directFulfillWish(wishId, userId, message.trim(), imageUrl || undefined, voiceUrl || undefined);
    setSubmitting(false);
    if (result.ok) {
      setShowImplement(false);
      setImageUrl(null);
      setVoiceUrl(null);
      setFulfilled(true);
      showToast(isZh ? '✨ 愿望已实现！感谢你的善意' : '✨ Wish fulfilled! Thank you for your kindness');
      // 刷新数据
      loadWish();
    } else {
      const errorMsg = result.error === 'Already fulfilled'
        ? (isZh ? '这个愿望已经被实现了' : 'This wish has already been fulfilled')
        : result.error === 'Cannot fulfill own wish'
        ? (isZh ? '不能实现自己的愿望哦' : "You can't fulfill your own wish")
        : (isZh ? '操作失败，请重试' : 'Something went wrong, please try again');
      showToast(errorMsg);
    }
  };

  // ===== 加载中 =====
  if (loading) {
    return (
      <div className="px-4 pt-8">
        <div className="h-7 w-40 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="h-60 rounded-2xl bg-white/5 border border-white/10 animate-pulse mb-4" />
        <div className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  // ===== 未找到 =====
  if (!wishData) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center min-h-screen">
        <div className="text-6xl mb-4">🪔</div>
        <p className="text-sm text-gray-400 mb-2">
          {isZh ? '这个愿望已漂流到远方...' : 'This wish has drifted away...'}
        </p>
        <p className="text-xs text-gray-600 mb-6">
          {isZh ? '它可能已经被实现了，或者正在前往下一位旅人的路上' : 'It may have been fulfilled or is on its way to another traveler'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 text-sm font-bold"
        >
          {isZh ? '🏠 去首页看看' : '🏠 Go to Homepage'}
        </button>
      </div>
    );
  }

  const wt = getWishType(wishData.type as any);
  const isFulfilled = wishData.status === 'fulfilled' || wishData.status === 'aiFulfilled' || fulfilled;
  const isAi = wishData.status === 'aiFulfilled';
  const isOwnWish = wishData.fulfilled_by === userId;

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-[#0a0a1a] starry-bg">
      {/* 顶部品牌条 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img
            src="/genie-lamp-icon.png"
            alt="Aladdin's Wish Lamp"
            className="w-10 h-10 rounded-lg object-contain"
          />
          <span className="text-sm font-bold text-white">{t('appName')}</span>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-all"
        >
          {isZh ? '🏠 打开APP' : '🏠 Open App'}
        </button>
      </div>

      {/* 愿望卡片 */}
      <div className={`rounded-2xl overflow-hidden border ${
        isFulfilled
          ? 'border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.05] via-white/[0.03] to-amber-400/[0.02]'
          : 'border-white/10 bg-gradient-to-br from-white/[0.07] via-violet-400/[0.02] to-white/[0.03]'
      }`}>
        {/* 类型 + 状态 */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wt?.color} flex items-center justify-center text-xl`}>
              {wt?.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{t(`type.${wishData.type}.name`)}</div>
              <div className="text-[10px] text-gray-500">
                {new Date(wishData.created_at).toLocaleDateString()}
                {' · '}
                {isZh
                  ? `${wishData.drift_count} 位旅人`
                  : `${wishData.drift_count} travelers`}
              </div>
            </div>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
            isFulfilled
              ? isAi
                ? 'bg-violet-500/20 text-violet-400'
                : 'bg-emerald-500/20 text-emerald-400'
              : 'bg-cyan-500/20 text-cyan-400'
          }`}>
            {isFulfilled
              ? (isAi ? '🤖 AI灯神实现' : '✅ 已实现')
              : '🌊 漂流中'}
          </span>
        </div>

        {/* 愿望内容 - 大字展示 */}
        <div className="px-4 pt-4 pb-3">
          <div className="relative pl-4 border-l-2 border-amber-400/40">
            <p className="text-base text-gray-100 leading-relaxed italic">
              &ldquo;{wishData.content}&rdquo;
            </p>
          </div>
        </div>

        {/* 漂流进度 */}
        {!isFulfilled && (
          <div className="px-4 pb-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>🌊 {isZh ? '漂流进度' : 'Drift Progress'}</span>
                <span>{wishData.drift_batch}/{wishData.max_batches} {isZh ? '批' : 'batches'}</span>
              </div>
              <div className="flex gap-1">
                {[...Array(Math.min(wishData.max_batches, 5))].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full flex-1 ${
                      i < wishData.drift_batch
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 已实现的愿望：显示实现者留言 */}
        {isFulfilled && wishData.fulfilled_message && (
          <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-r from-emerald-400/8 to-teal-500/5 border border-emerald-400/15">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{isAi ? '🤖' : '❤️'}</span>
              <span className="text-xs font-semibold text-emerald-400">
                {isAi
                  ? t('case.aiFulfilled')
                  : `${wishData.implementer_name || (isZh ? '一位旅人' : 'A traveler')}`}
              </span>
              {wishData.fulfilled_at && (
                <span className="text-[10px] text-gray-600 ml-auto">
                  {new Date(wishData.fulfilled_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-200 italic leading-relaxed">
              &ldquo;{wishData.fulfilled_message}&rdquo;
            </p>
            {/* 图片展示 */}
            {wishData.fulfilled_image_url && (
              <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                <img
                  src={wishData.fulfilled_image_url}
                  alt="fulfillment"
                  className="w-full max-h-64 object-cover"
                />
              </div>
            )}
            {/* 语音播放 */}
            {wishData.fulfilled_voice_url && (
              <div className="mt-3">
                <audio src={wishData.fulfilled_voice_url} controls className="w-full h-9" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== CTA 区域 ===== */}
      <div className="mt-6 space-y-4">
        {isFulfilled ? (
          /* 已实现 → 引导许愿 */
          <div className="rounded-2xl bg-gradient-to-r from-amber-400/10 to-orange-400/5 border border-amber-400/20 p-5 text-center">
            <div className="text-3xl mb-2">🪔</div>
            <p className="text-sm font-semibold text-amber-300 mb-1">
              {isZh ? '你也有愿望吗？' : 'Do you have a wish too?'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isZh
                ? '下载阿拉丁许愿灯，灯神满足你三个愿望'
                : "Download Aladdin's Wish Lamp — the genie grants you 3 wishes"}
            </p>
            <button
              onClick={() => window.location.href = '/wish'}
              className="w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all"
            >
              ✨ {isZh ? '我也要许愿' : "I Want to Make a Wish Too"}
            </button>
          </div>
        ) : (
          /* 未实现 → 我来帮TA实现！ */
          <div className="rounded-2xl bg-gradient-to-r from-violet-400/10 to-purple-600/5 border border-violet-400/20 p-5 text-center">
            <div className="text-3xl mb-2">💫</div>
            <p className="text-sm font-semibold text-violet-300 mb-1">
              {isZh ? '你能帮TA实现这个愿望吗？' : 'Can you help make this wish come true?'}
            </p>
            <p className="text-xs text-gray-500 mb-4">
              {isZh
                ? '点击下方按钮，写下你的暖心回复，成为TA的灯神'
                : 'Click below to write a warm reply and become their genie'}
            </p>
            <button
              onClick={() => setShowImplement(true)}
              className="w-full py-3 rounded-full bg-gradient-to-r from-violet-400 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:scale-[1.02] transition-all"
            >
              🧞‍♂️ {isZh ? '我来帮TA实现！' : "I'll Help Fulfill This!"}
            </button>
          </div>
        )}

        {/* APP信息卡片 */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/genie-lamp-icon.png"
              alt="App Icon"
              className="w-16 h-16 rounded-xl object-contain"
            />
            <div>
              <div className="text-sm font-bold text-white">{"Aladdin's Wish Lamp"} 🪔</div>
              <div className="text-[11px] text-gray-500">
                {isZh
                  ? '阿拉丁许愿灯 — 灯神满足你三个愿望'
                  : 'The genie grants you 3 wishes'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.03] p-2">
              <div className="text-lg">🪔</div>
              <div className="text-[9px] text-gray-500">{isZh ? '许愿' : 'Wish'}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2">
              <div className="text-lg">🌊</div>
              <div className="text-[9px] text-gray-500">{isZh ? '漂流' : 'Drift'}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-2">
              <div className="text-lg">✨</div>
              <div className="text-[9px] text-gray-500">{isZh ? '实现' : 'Fulfill'}</div>
            </div>
          </div>
        </div>

        {/* 返回首页链接 */}
        <button
          onClick={() => router.push('/')}
          className="w-full py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm hover:text-white hover:border-white/20 transition-all"
        >
          ← {isZh ? '返回首页探索更多故事' : 'Back to Explore More Stories'}
        </button>
      </div>

      {/* ===== 直接实现愿望弹窗 ===== */}
      {showImplement && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a2e] border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h3 className="text-base font-bold text-white">
                {isZh ? '帮TA实现愿望' : 'Fulfill This Wish'}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {isZh
                ? '写下你的暖心回复，TA收到后一定会很开心！'
                : 'Write a warm reply — they will be so happy to receive it!'}
            </p>

            {/* 原愿望引用 */}
            <div className="rounded-xl bg-white/5 border-l-2 border-amber-400/50 px-3 py-2 mb-4">
              <p className="text-xs text-gray-400 italic">&ldquo;{wishData.content}&rdquo;</p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              placeholder={isZh ? '写下你想对TA说的话...' : 'Write something to them...'}
              rows={4}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-amber-400/50 transition-all"
            />
            <div className="text-right text-xs text-gray-600 mt-1">{message.length}/300</div>

            {/* 图片+语音上传 */}
            <div className="mt-3">
              <MediaUploader
                imageUrl={imageUrl}
                voiceUrl={voiceUrl}
                onImageChange={setImageUrl}
                onVoiceChange={setVoiceUrl}
                isZh={isZh}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowImplement(false); setMessage(''); setImageUrl(null); setVoiceUrl(null); }}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDirectFulfill}
                disabled={!message.trim() || submitting || moderating}
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 text-sm font-bold disabled:opacity-30"
              >
                {moderating ? (isZh ? '🔍 AI审核中...' : '🔍 AI reviewing...') : submitting ? '...' : (isZh ? '✨ 实现愿望' : '✨ Fulfill Wish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast 提示 ===== */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm text-white animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}
