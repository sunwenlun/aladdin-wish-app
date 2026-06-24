'use client';

import { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  lang?: 'zh' | 'en';
}

export function ShareButton({ title, text, url, lang = 'en' }: ShareButtonProps) {
  const [showGrid, setShowGrid] = useState(false);
  const [copied, setCopied] = useState(false);
  const isZh = lang === 'zh';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aladdin-wish.app';
  const shareUrl = url || baseUrl;

  const brandedText = `${text}\n\n🪔 ${isZh ? '阿拉丁许愿灯' : "Aladdin's Wish Lamp"} — ${isZh ? '灯神满足你三个愿望' : 'The genie grants you 3 wishes'}\n📱 ${isZh ? '查看详情/下载' : 'View / Download'}: ${shareUrl}`;

  const handleShareToPlatform = async (platform: string) => {
    const fullText = brandedText;
    const encodedText = encodeURIComponent(fullText);
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
        return;
      case 'vk':
        shareLink = `https://vk.com/share.php?url=${encodedUrl}&title=${encodedText}`;
        break;
      case 'threads':
        shareLink = `https://www.threads.net/intent/post?text=${encodedText}%0A${encodedUrl}`;
        break;
      case 'tumblr':
        shareLink = `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodedUrl}&title=${encodedText}`;
        break;
      case 'email': {
        const emailSubject = isZh ? '🪔 来自阿拉丁许愿灯' : "🪔 From Aladdin's Wish Lamp";
        const emailBody = `${fullText}\n\n${shareUrl}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        return;
      }
      case 'instagram': {
        try { await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`); } catch {}
        window.open('https://www.instagram.com', '_blank', 'width=600,height=500');
        return;
      }
      case 'snapchat': {
        try { await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`); } catch {}
        window.open('https://www.snapchat.com', '_blank', 'width=600,height=500');
        return;
      }
      case 'discord': {
        try { await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`); } catch {}
        window.open('https://discord.com/channels/@me', '_blank', 'width=600,height=500');
        return;
      }
      case 'tiktok': {
        try { await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`); } catch {}
        window.open('https://www.tiktok.com', '_blank', 'width=600,height=500');
        return;
      }
      case 'youtube': {
        try { await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`); } catch {}
        window.open('https://studio.youtube.com/', '_blank');
        return;
      }
      case 'kakao': {
        window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodedUrl}&text=${encodedText}`, '_blank', 'width=600,height=500');
        return;
      }
      case 'copy': {
        try {
          await navigator.clipboard.writeText(`${fullText}\n${shareUrl}`);
        } catch {
          const textarea = document.createElement('textarea');
          textarea.value = `${fullText}\n${shareUrl}`;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      case 'native': {
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({
              title: `${isZh ? '阿拉丁许愿灯' : "Aladdin's Wish Lamp"} 🪔`,
              text: fullText,
              url: shareUrl,
            });
          } catch {}
        }
        return;
      }
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=500');
    }
  };

  // 分享平台列表
  const platforms = [
    { id: 'whatsapp', icon: '💬', label: 'WhatsApp', bg: 'bg-[#25D366]/10 border-[#25D366]/20 hover:bg-[#25D366]/20' },
    { id: 'twitter', icon: '🐦', label: 'X / Twitter', bg: 'bg-white/5 border-white/10 hover:bg-white/10' },
    { id: 'facebook', icon: '📘', label: 'Facebook', bg: 'bg-[#1877F2]/10 border-[#1877F2]/20 hover:bg-[#1877F2]/20' },
    { id: 'telegram', icon: '✈️', label: 'Telegram', bg: 'bg-[#0088cc]/10 border-[#0088cc]/20 hover:bg-[#0088cc]/20' },
    { id: 'tiktok', icon: '🎵', label: 'TikTok', bg: 'bg-black/40 border-white/15 hover:bg-black/60' },
    { id: 'youtube', icon: '▶️', label: 'YouTube', bg: 'bg-[#FF0000]/10 border-[#FF0000]/20 hover:bg-[#FF0000]/20' },
    { id: 'reddit', icon: '🔴', label: 'Reddit', bg: 'bg-[#FF4500]/10 border-[#FF4500]/20 hover:bg-[#FF4500]/20' },
    { id: 'linkedin', icon: '💼', label: 'LinkedIn', bg: 'bg-[#0A66C2]/10 border-[#0A66C2]/20 hover:bg-[#0A66C2]/20' },
    { id: 'instagram', icon: '📷', label: 'Instagram', bg: 'bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#FCB045]/10 border-[#C13584]/20' },
    { id: 'snapchat', icon: '👻', label: 'Snapchat', bg: 'bg-[#FFFC00]/10 border-[#FFFC00]/20 hover:bg-[#FFFC00]/20' },
    { id: 'discord', icon: '🎮', label: 'Discord', bg: 'bg-[#5865F2]/10 border-[#5865F2]/20 hover:bg-[#5865F2]/20' },
    { id: 'threads', icon: '🧵', label: 'Threads', bg: 'bg-white/5 border-white/10 hover:bg-white/10' },
    { id: 'line', icon: '💚', label: 'LINE', bg: 'bg-[#06C755]/10 border-[#06C755]/20 hover:bg-[#06C755]/20' },
    { id: 'kakao', icon: '💬', label: 'KakaoTalk', bg: 'bg-[#FEE500]/10 border-[#FEE500]/20 hover:bg-[#FEE500]/20' },
    { id: 'pinterest', icon: '📌', label: 'Pinterest', bg: 'bg-[#BD081C]/10 border-[#BD081C]/20 hover:bg-[#BD081C]/20' },
    { id: 'tumblr', icon: '📝', label: 'Tumblr', bg: 'bg-[#001935]/40 border-[#36465D]/30 hover:bg-[#36465D]/40' },
    { id: 'vk', icon: '💠', label: 'VK', bg: 'bg-[#4A76A8]/10 border-[#4A76A8]/20 hover:bg-[#4A76A8]/20' },
    { id: 'weibo', icon: '📢', label: isZh ? '微博' : 'Weibo', bg: 'bg-[#E6162D]/10 border-[#E6162D]/20 hover:bg-[#E6162D]/20' },
    { id: 'email', icon: '✉️', label: isZh ? '邮件' : 'Email', bg: 'bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/20' },
    { id: 'copy', icon: '🔗', label: isZh ? '复制链接' : 'Copy Link', bg: 'bg-white/5 border-white/10 hover:bg-white/10' },
  ];

  return (
    <>
      <button
        onClick={() => setShowGrid(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/15 border border-amber-400/30 text-amber-300 text-sm font-medium hover:from-amber-400/30 hover:to-orange-400/20 transition-all"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            {isZh ? '链接已复制！' : 'Link Copied!'}
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            {isZh ? '分享故事' : 'Share Story'}
          </>
        )}
      </button>

      {/* 多平台分享弹窗 */}
      {showGrid && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6" onClick={() => setShowGrid(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📤</span>
                <h3 className="text-base font-bold text-white">
                  {isZh ? '分享到' : 'Share to'}
                </h3>
              </div>
              <button onClick={() => setShowGrid(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              {isZh ? '选择平台分享这个故事，让更多人看到 ✨' : 'Choose a platform to share this story ✨'}
            </p>

            {/* 平台网格 */}
            <div className="grid grid-cols-4 gap-1.5">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleShareToPlatform(p.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${p.bg}`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-[9px] text-gray-400">{p.label}</span>
                </button>
              ))}
            </div>

            {/* 原生分享按钮 */}
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={() => handleShareToPlatform('native')}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-400/20 to-purple-600/20 border border-violet-400/30 text-violet-300 text-xs font-medium hover:from-violet-400/30 hover:to-purple-600/30 transition-all"
              >
                <span>📱</span>
                {isZh ? '更多分享方式' : 'More Share Options'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
