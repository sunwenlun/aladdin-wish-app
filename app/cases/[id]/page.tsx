'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCaseById } from '@/lib/db';
import { getWishType } from '@/lib/mockData';
import { AnimatedStory } from '@/components/AnimatedStory';
import { ShareButton } from '@/components/ShareButton';

// 根据类型和标题生成图片路径（D=画图, F=拍照）
function getCaseImage(type: string, title: string): string | undefined {
  if (type !== 'D' && type !== 'F') return undefined;
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  const index = (Math.abs(hash) % 3) + 1;
  if (type === 'D') return `/case-images/drawing-${index}.png`;
  return `/case-images/photo-${index}.png`;
}

type CaseData = {
  id: string;
  type: string;
  title: string;
  content: string;
  author_name: string;
  author_country: string;
  status: string;
  implementer_name: string | null;
  implementer_message: string | null;
  drift_path: number;
  fulfilled_at: string | null;
};

export default function CaseDetailPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);

  const caseId = params.id as string;
  const isZh = i18n.language === 'zh';

  const loadCase = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    const data = await getCaseById(caseId);
    setCaseData(data as CaseData | null);
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  if (loading) {
    return (
      <div className="px-4 pt-6">
        <div className="h-7 w-32 bg-white/5 rounded-lg animate-pulse mb-6" />
        <div className="h-80 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="px-6 pt-20 flex flex-col items-center text-center">
        <div className="text-6xl mb-4">🔍</div>
        <p className="text-sm text-gray-400">{isZh ? '故事未找到' : 'Story not found'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const wt = getWishType(caseData.type as any);
  const isAi = caseData.status === 'aiFulfilled';
  const caseImage = getCaseImage(caseData.type, caseData.title);

  const shareText = isZh
    ? `🪔 在阿拉丁许愿灯，有人许了一个愿望："${caseData.title}"，${caseData.implementer_name || '灯神'}帮TA实现了。\n\n来看看这个温暖的故事吧！\n📱 下载阿拉丁许愿灯，灯神满足你三个愿望 → ${typeof window !== 'undefined' ? window.location.origin : ''}`
    : `🪔 On Aladdin's Wish Lamp, someone made a wish: "${caseData.title}", and ${caseData.implementer_name || 'the Genie'} fulfilled it.\n\nCheck out this heartwarming story!\n📱 Download Aladdin's Wish Lamp — the genie grants you 3 wishes → ${typeof window !== 'undefined' ? window.location.origin : ''}`;

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4"
      >
        ← {isZh ? '返回首页' : 'Back to Home'}
      </button>

      {/* Animated story */}
      <AnimatedStory
        type={caseData.type}
        typeIcon={wt?.icon || '🪔'}
        title={caseData.title}
        content={caseData.content}
        authorName={caseData.author_name}
        authorCountry={caseData.author_country}
        implementerName={caseData.implementer_name || undefined}
        implementerMessage={caseData.implementer_message || undefined}
        driftPath={caseData.drift_path}
        fulfilledAt={caseData.fulfilled_at || undefined}
        isAi={isAi}
        lang={isZh ? 'zh' : 'en'}
        imageUrl={caseImage}
      />

      {/* Share section */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <ShareButton
          title={caseData.title}
          text={shareText}
          url={typeof window !== 'undefined' ? `${window.location.origin}/cases/${caseId}` : ''}
          lang={isZh ? 'zh' : 'en'}
        />
      </div>

      {/* Download prompt */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-400/5 to-orange-400/5 border border-amber-400/10 p-5 text-center">
        <p className="text-sm text-amber-300/80 font-medium mb-1">
          {isZh ? '🪔 你也想许愿吗？' : '🪔 Want to make a wish too?'}
        </p>
        <p className="text-xs text-gray-500">
          {isZh ? '下载阿拉丁许愿灯，灯神满足你三个愿望' : "Download Aladdin's Wish Lamp, the genie grants you 3 wishes"}
        </p>
      </div>
    </div>
  );
}
