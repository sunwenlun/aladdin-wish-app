'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { getMailboxWishes, respondToDrift } from '@/lib/db';
import { useUser } from '@/lib/useUser';
import { getWishType } from '@/lib/mockData';
import MediaUploader from '@/components/MediaUploader';

type MailboxWish = {
  id: string;
  type: string;
  content: string;
  user_id: string;
  status: string;
  drift_id: string;
  drift_status: string;
  batch_num: number;
  received_at: string;
};

export default function MailboxPage() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { userId, loading: userLoading } = useUser();
  const [wishes, setWishes] = useState<MailboxWish[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionWish, setActionWish] = useState<MailboxWish | null>(null);
  const [actionType, setActionType] = useState<'implement' | 'forward' | null>(null);
  const [message, setMessage] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [sharedPlatform, setSharedPlatform] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [moderating, setModerating] = useState(false);

  const loadMailbox = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getMailboxWishes(userId);
    setWishes(data as MailboxWish[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) loadMailbox();
  }, [userId, loadMailbox]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = async (
    wish: MailboxWish,
    action: 'implemented' | 'forwarded' | 'drifted' | 'peace'
  ) => {
    if (action === 'implemented') {
      setActionWish(wish);
      setActionType('implement');
      setMessage('');
      setImageUrl(null);
      setVoiceUrl(null);
      return;
    }
    if (action === 'forwarded') {
      setActionWish(wish);
      setActionType('forward');
      // Auto-generate share message with app branding + deep link
      const isZh = i18n.language === 'zh';
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aladdin-wish.app';
      const wishDeepLink = `${baseUrl}/wish/${wish.id}`;
      const shareText = isZh
        ? `🧞‍♂️ 一位旅人在阿拉丁许愿灯许了一个愿望：\n\n"${wish.content}"\n\n你能帮TA实现吗？点击链接查看详情并加入我们！ ✨\n\n🪔 阿拉丁许愿灯 — 灯神满足你三个愿望\n📱 查看愿望：${wishDeepLink}\n📥 下载APP：${baseUrl}`
        : `🧞‍♂️ A traveler made a wish on Aladdin's Wish Lamp:\n\n"${wish.content}"\n\nCan you help make it come true? Click to see details and join us! ✨\n\n🪔 Aladdin's Wish Lamp — The genie grants you 3 wishes\n📱 See wish: ${wishDeepLink}\n📥 Download: ${baseUrl}`;
      setForwardMessage(shareText);
      setSharedPlatform('');
      return;
    }

    setSubmitting(true);
    const ok = await respondToDrift(
      wish.drift_id,
      wish.id,
      userId!,
      action
    );
    setSubmitting(false);

    if (ok) {
      if (action === 'drifted') {
        showToast(t('mailbox.driftDone'));
      } else if (action === 'peace') {
        showToast(t('mailbox.peaceDone'));
      }
      loadMailbox();
    } else {
      showToast(t('mailbox.error'));
    }
  };

  const handleSubmitImplement = async () => {
    if (!actionWish || !message.trim() || !userId) return;
    setModerating(true);

    // AI审核实现内容（文字+图片+语音）
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
    const ok = await respondToDrift(
      actionWish.drift_id,
      actionWish.id,
      userId,
      'implemented',
      message.trim(),
      undefined,
      imageUrl || undefined,
      voiceUrl || undefined
    );
    setSubmitting(false);
    if (ok) {
      setActionWish(null);
      setActionType(null);
      setMessage('');
      setImageUrl(null);
      setVoiceUrl(null);
      showToast(t('mailbox.implementDone'));
      loadMailbox();
    } else {
      showToast(t('mailbox.error'));
    }
  };

  const handleSubmitForward = async () => {
    if (!actionWish || !userId) return;
    setSubmitting(true);
    const ok = await respondToDrift(
      actionWish.drift_id,
      actionWish.id,
      userId,
      'forwarded',
      undefined,
      sharedPlatform || 'social'
    );
    setSubmitting(false);
    if (ok) {
      setActionWish(null);
      setActionType(null);
      setForwardMessage('');
      showToast(t('mailbox.forwardDone'));
      loadMailbox();
    } else {
      showToast(t('mailbox.error'));
    }
  };

  const shareToSocial = async (platform: string) => {
    if (!actionWish) return;
    const isZh = i18n.language === 'zh';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aladdin-wish.app';
    // 深链接：包含具体愿望ID，让网友下载后能找到这个愿望
    const shareUrl = `${baseUrl}/wish/${actionWish.id}`;
    // Append app download link to shared URL content
    const fullShareText = forwardMessage;
    const encodedText = encodeURIComponent(fullShareText);
    const encodedUrl = encodeURIComponent(shareUrl);

    let shareLink = '';
    switch (platform) {
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedText}%0A${encodedUrl}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'weibo':
        shareLink = `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`;
        break;
      // ===== 新增渠道 =====
      case 'tiktok': {
        // TikTok 无直接分享URL，复制文案 + 打开TikTok
        try { await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`); } catch {}
        window.open('https://www.tiktok.com', '_blank', 'width=600,height=500');
        setSharedPlatform('tiktok');
        showToast(isZh ? '已复制文案，请在TikTok中粘贴发布！' : 'Copied! Paste in TikTok to post.');
        return;
      }
      case 'youtube': {
        // YouTube 无直接分享URL（需要视频），复制文案 + 打开YouTube Studio
        try { await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`); } catch {}
        window.open('https://studio.youtube.com/', '_blank');
        setSharedPlatform('youtube');
        showToast(isZh ? '已复制文案，可在YouTube社区/短视频中引用！' : 'Copied! Use in YouTube Community/Shorts.');
        return;
      }
      case 'reddit':
        shareLink = `https://www.reddit.com/submit?title=${encodedText}&url=${encodedUrl}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'pinterest':
        shareLink = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`;
        break;
      case 'line':
        window.open(`https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`, '_blank', 'width=600,height=500');
        setSharedPlatform('line');
        return;
      case 'vk':
        shareLink = `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`;
        break;
      case 'email':
        const emailSubject = isZh ? '🪔 来自阿拉丁许愿灯的一个愿望' : "🪔 A wish from Aladdin's Wish Lamp";
        const emailBody = `${fullShareText}\n\n${shareUrl}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        setSharedPlatform('email');
        return;
      // ===== 新增主流平台 =====
      case 'instagram': {
        // Instagram 无直接分享URL，复制文案 + 打开Instagram
        try { await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`); } catch {}
        window.open('https://www.instagram.com', '_blank', 'width=600,height=500');
        setSharedPlatform('instagram');
        showToast(isZh ? '已复制文案，请在Instagram中粘贴发布！' : 'Copied! Paste in Instagram to post.');
        return;
      }
      case 'snapchat': {
        try { await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`); } catch {}
        window.open('https://www.snapchat.com', '_blank', 'width=600,height=500');
        setSharedPlatform('snapchat');
        showToast(isZh ? '已复制文案，请在Snapchat中粘贴！' : 'Copied! Paste in Snapchat.');
        return;
      }
      case 'discord': {
        try { await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`); } catch {}
        window.open('https://discord.com/channels/@me', '_blank', 'width=600,height=500');
        setSharedPlatform('discord');
        showToast(isZh ? '已复制文案，请在Discord中粘贴！' : 'Copied! Paste in Discord.');
        return;
      }
      case 'threads': {
        shareLink = `https://www.threads.net/intent/post?text=${encodedText}%0A${encodedUrl}`;
        break;
      }
      case 'kakao': {
        window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodedUrl}&text=${encodedText}`, '_blank', 'width=600,height=500');
        setSharedPlatform('kakao');
        return;
      }
      case 'tumblr': {
        shareLink = `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodedUrl}&title=${encodedText}`;
        break;
      }
      case 'whisper': {
        try { await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`); } catch {}
        setSharedPlatform('whisper');
        showToast(isZh ? '已复制文案，可粘贴到任意平台！' : 'Copied! Paste anywhere.');
        return;
      }
      // ===== 原有渠道 =====
      case 'copy':
        try {
          await navigator.clipboard.writeText(`${fullShareText}\n${shareUrl}`);
          setSharedPlatform('copy');
          showToast(isZh ? '链接已复制！' : 'Link Copied!');
        } catch {
          const textarea = document.createElement('textarea');
          textarea.value = `${fullShareText}\n${shareUrl}`;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setSharedPlatform('copy');
          showToast(isZh ? '链接已复制！' : 'Link Copied!');
        }
        return;
      case 'native':
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({
              title: `${isZh ? '阿拉丁许愿灯' : "Aladdin's Wish Lamp"} 🪔`,
              text: fullShareText,
              url: shareUrl,
            });
            setSharedPlatform('native');
          } catch {
            // User cancelled
          }
          return;
        }
        return;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=500');
      setSharedPlatform(platform);
    }
  };

  // ===== 加载中 =====
  if (userLoading || loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ===== 空状态 =====
  if (wishes.length === 0) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-base text-gray-300">{t('mailbox.empty')}</p>
        <p className="text-sm text-gray-600 mt-1">{t('mailbox.emptyDesc')}</p>
        <div className="mt-6 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-500">
          {t('mailbox.hint')}
        </div>
      </div>
    );
  }

  // ===== 信箱列表 =====
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-white mb-1">{t('mailbox.title')}</h1>
      <p className="text-xs text-gray-500 mb-6">{t('mailbox.subtitle')}</p>

      <div className="space-y-4">
        {wishes.map((w) => {
          const wt = getWishType(w.type as any);
          return (
            <div
              key={w.id}
              className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
            >
              {/* 类型标签 + 批次 */}
              <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${wt?.color} flex items-center justify-center text-base`}>
                    {wt?.icon}
                  </div>
                  <span className="text-sm text-gray-400">{t(`type.${w.type}.name`)}</span>
                </div>
                <span className="text-xs text-gray-600">
                  {t('mailbox.batch', { num: w.batch_num })}
                </span>
              </div>

              {/* 愿望内容 */}
              <div className="px-4 pt-3">
                <p className="text-sm text-gray-200 leading-relaxed">
                  &ldquo;{w.content}&rdquo;
                </p>
              </div>

              {/* 漂流信息 */}
              <div className="px-4 pt-2 pb-3 text-xs text-gray-600">
                {t('mailbox.driftedToYou', { batch: w.batch_num })}
              </div>

              {/* 四选一操作 */}
              <div className="grid grid-cols-2 gap-px bg-white/5">
                <button
                  onClick={() => handleAction(w, 'implemented')}
                  className="py-3 text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-all"
                >
                  {t('mailbox.implement')}
                </button>
                <button
                  onClick={() => handleAction(w, 'forwarded')}
                  className="py-3 text-xs font-medium text-violet-400 hover:bg-violet-400/10 transition-all"
                >
                  {t('mailbox.forward')}
                </button>
                <button
                  onClick={() => handleAction(w, 'drifted')}
                  disabled={submitting}
                  className="py-3 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10 transition-all disabled:opacity-50"
                >
                  {t('mailbox.drift')}
                </button>
                <button
                  onClick={() => handleAction(w, 'peace')}
                  disabled={submitting}
                  className="py-3 text-xs font-medium text-gray-400 hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  {t('mailbox.peace')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== 实现愿望弹窗 ===== */}
      {actionWish && actionType === 'implement' && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a2e] border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h3 className="text-base font-bold text-white">{t('mailbox.implementTitle')}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">{t('mailbox.implementDesc')}</p>

            {/* 原愿望引用 */}
            <div className="rounded-xl bg-white/5 border-l-2 border-amber-400/50 px-3 py-2 mb-4">
              <p className="text-xs text-gray-400 italic">&ldquo;{actionWish.content}&rdquo;</p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              placeholder={t('mailbox.messagePlaceholder')}
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
                onClick={() => { setActionWish(null); setActionType(null); setImageUrl(null); setVoiceUrl(null); }}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmitImplement}
                disabled={!message.trim() || submitting || moderating}
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 text-sm font-bold disabled:opacity-30"
              >
                {moderating ? (isZh ? '🔍 AI审核中...' : '🔍 AI reviewing...') : submitting ? '...' : t('mailbox.confirmImplement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 转发到社交媒体弹窗 ===== */}
      {actionWish && actionType === 'forward' && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📨</span>
              <h3 className="text-base font-bold text-white">{t('mailbox.forwardTitle')}</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">{t('mailbox.forwardDesc')}</p>

            {/* 原愿望引用 */}
            <div className="rounded-xl bg-white/5 border-l-2 border-violet-400/50 px-3 py-2 mb-4">
              <p className="text-xs text-gray-400 italic">&ldquo;{actionWish.content}&rdquo;</p>
            </div>

            {/* 可编辑分享文案 */}
            <label className="text-xs text-gray-500 mb-2 block">{t('mailbox.shareMessageLabel')}</label>
            <textarea
              value={forwardMessage}
              onChange={(e) => setForwardMessage(e.target.value.slice(0, 500))}
              rows={5}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-violet-400/50 transition-all"
            />
            <div className="text-right text-xs text-gray-600 mt-1">{forwardMessage.length}/500</div>

            {/* 社交媒体按钮 */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-3">{t('mailbox.choosePlatform')}</p>
              {/* 第一排：主流平台 */}
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                <button
                  onClick={() => shareToSocial('whatsapp')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-[9px] text-gray-400">WhatsApp</span>
                </button>
                <button
                  onClick={() => shareToSocial('twitter')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <span className="text-lg">🐦</span>
                  <span className="text-[9px] text-gray-400">X / Twitter</span>
                </button>
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2]/20 transition-all"
                >
                  <span className="text-lg">📘</span>
                  <span className="text-[9px] text-gray-400">Facebook</span>
                </button>
                <button
                  onClick={() => shareToSocial('telegram')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition-all"
                >
                  <span className="text-lg">✈️</span>
                  <span className="text-[9px] text-gray-400">Telegram</span>
                </button>
              </div>
              {/* 第二排：新增平台 */}
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                <button
                  onClick={() => shareToSocial('tiktok')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-black/40 border border-white/15 hover:bg-black/60 transition-all"
                >
                  <span className="text-lg" style={{ filter: 'none' }}>🎵</span>
                  <span className="text-[9px] text-gray-400">TikTok</span>
                </button>
                <button
                  onClick={() => shareToSocial('youtube')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#FF0000]/10 border border-[#FF0000]/20 hover:bg-[#FF0000]/20 transition-all"
                >
                  <span className="text-lg">▶️</span>
                  <span className="text-[9px] text-gray-400">YouTube</span>
                </button>
                <button
                  onClick={() => shareToSocial('reddit')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/20 hover:bg-[#FF4500]/20 transition-all"
                >
                  <span className="text-lg">🔴</span>
                  <span className="text-[9px] text-gray-400">Reddit</span>
                </button>
                <button
                  onClick={() => shareToSocial('linkedin')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#0A66C2]/10 border border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 transition-all"
                >
                  <span className="text-lg">💼</span>
                  <span className="text-[9px] text-gray-400">LinkedIn</span>
                </button>
              </div>
              {/* 第三排：区域+工具 */}
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                <button
                  onClick={() => shareToSocial('line')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#06C755]/10 border border-[#06C755]/20 hover:bg-[#06C755]/20 transition-all"
                >
                  <span className="text-lg">💚</span>
                  <span className="text-[9px] text-gray-400">LINE</span>
                </button>
                <button
                  onClick={() => shareToSocial('pinterest')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#BD081C]/10 border border-[#BD081C]/20 hover:bg-[#BD081C]/20 transition-all"
                >
                  <span className="text-lg">📌</span>
                  <span className="text-[9px] text-gray-400">Pinterest</span>
                </button>
                <button
                  onClick={() => shareToSocial('vk')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#4A76A8]/10 border border-[#4A76A8]/20 hover:bg-[#4A76A8]/20 transition-all"
                >
                  <span className="text-lg">💠</span>
                  <span className="text-[9px] text-gray-400">VK</span>
                </button>
                <button
                  onClick={() => shareToSocial('email')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-500/10 border border-gray-500/20 hover:bg-gray-500/20 transition-all"
                >
                  <span className="text-lg">✉️</span>
                  <span className="text-[9px] text-gray-400">{isZh ? '邮件' : 'Email'}</span>
                </button>
              </div>
              {/* 第四排：微博 + Instagram + Snapchat + Discord */}
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                <button
                  onClick={() => shareToSocial('weibo')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#E6162D]/10 border border-[#E6162D]/20 hover:bg-[#E6162D]/20 transition-all"
                >
                  <span className="text-lg">📢</span>
                  <span className="text-[9px] text-gray-400">{i18n.language === 'zh' ? '微博' : 'Weibo'}</span>
                </button>
                <button
                  onClick={() => shareToSocial('instagram')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#FCB045]/10 border border-[#C13584]/20 hover:from-[#833AB4]/20 hover:to-[#FCB045]/20 transition-all"
                >
                  <span className="text-lg">📷</span>
                  <span className="text-[9px] text-gray-400">Instagram</span>
                </button>
                <button
                  onClick={() => shareToSocial('snapchat')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#FFFC00]/10 border border-[#FFFC00]/20 hover:bg-[#FFFC00]/20 transition-all"
                >
                  <span className="text-lg">👻</span>
                  <span className="text-[9px] text-gray-400">Snapchat</span>
                </button>
                <button
                  onClick={() => shareToSocial('discord')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 hover:bg-[#5865F2]/20 transition-all"
                >
                  <span className="text-lg">🎮</span>
                  <span className="text-[9px] text-gray-400">Discord</span>
                </button>
              </div>
              {/* 第五排：Threads + KakaoTalk + Tumblr + 复制 */}
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                <button
                  onClick={() => shareToSocial('threads')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <span className="text-lg">🧵</span>
                  <span className="text-[9px] text-gray-400">Threads</span>
                </button>
                <button
                  onClick={() => shareToSocial('kakao')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#FEE500]/10 border border-[#FEE500]/20 hover:bg-[#FEE500]/20 transition-all"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-[9px] text-gray-400">KakaoTalk</span>
                </button>
                <button
                  onClick={() => shareToSocial('tumblr')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#001935]/40 border border-[#36465D]/30 hover:bg-[#36465D]/40 transition-all"
                >
                  <span className="text-lg">📝</span>
                  <span className="text-[9px] text-gray-400">Tumblr</span>
                </button>
                <button
                  onClick={() => shareToSocial('copy')}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <span className="text-lg">🔗</span>
                  <span className="text-[9px] text-gray-400">{i18n.language === 'zh' ? '复制链接' : 'Copy Link'}</span>
                </button>
              </div>
              {/* 第六排：原生分享 */}
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => shareToSocial('native')}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-400/20 to-purple-600/20 border border-violet-400/30 text-violet-300 text-xs font-medium hover:from-violet-400/30 hover:to-purple-600/30 transition-all"
                  >
                    <span>📱</span>
                    {i18n.language === 'zh' ? '更多分享方式' : 'More Share Options'}
                  </button>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setActionWish(null); setActionType(null); setForwardMessage(''); }}
                className="flex-1 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmitForward}
                disabled={submitting || !sharedPlatform}
                className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-violet-400 to-purple-600 text-white text-sm font-bold disabled:opacity-30"
              >
                {submitting ? '...' : (sharedPlatform ? t('mailbox.confirmForward') : t('mailbox.shareFirst'))}
              </button>
            </div>

            {!sharedPlatform && (
              <p className="text-center text-[10px] text-gray-600 mt-2">{t('mailbox.shareHint')}</p>
            )}
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
