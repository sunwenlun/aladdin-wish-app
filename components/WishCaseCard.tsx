'use client';

import { useTranslation } from 'react-i18next';
import { MapPin, Navigation2, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { WishCase } from '@/lib/types';
import { getWishType } from '@/lib/mockData';

// 根据类型和标题生成图片路径（D=画图, F=拍照）
function getCaseImage(type: string, title: string): string | null {
  if (type !== 'D' && type !== 'F') return null;
  // Simple hash from title to pick image index (deterministic)
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  const index = (Math.abs(hash) % 3) + 1; // 1, 2, or 3
  if (type === 'D') return `/case-images/drawing-${index}.png`;
  return `/case-images/photo-${index}.png`;
}

export function WishCaseCard({ caseData }: { caseData: WishCase }) {
  const { t } = useTranslation();
  const wishType = getWishType(caseData.type);
  const caseImage = getCaseImage(caseData.type, caseData.title);

  const statusConfig = {
    fulfilled: { label: t('case.fulfilled'), color: 'bg-emerald-500/20 text-emerald-400', icon: '✅' },
    aiFulfilled: { label: t('case.aiFulfilled'), color: 'bg-violet-500/20 text-violet-400', icon: '🧞' },
    comingSoon: { label: t('case.comingSoon'), color: 'bg-gray-500/20 text-gray-400', icon: '🔒' },
  };

  const status = statusConfig[caseData.status];
  const isClickable = caseData.status === 'fulfilled' || caseData.status === 'aiFulfilled';

  // 温情标签映射
  const warmthTag = caseData.status === 'fulfilled' 
    ? ['❤️ 人间温暖', '🌟 善意接力', '💫 跨越山海', '🌙 愿望成真'][Math.floor(Math.random() * 4)] 
    : caseData.status === 'aiFulfilled'
    ? '🧞 灯神守护'
    : null;

  const cardContent = (
    <div className={`rounded-2xl overflow-hidden border transition-all ${
      caseData.status === 'comingSoon' 
        ? 'border-white/5 opacity-60' 
        : 'border-white/10 hover:border-amber-400/30 hover:shadow-lg hover:shadow-amber-500/5'
    } ${
      caseData.status === 'fulfilled' || caseData.status === 'aiFulfilled'
        ? 'bg-gradient-to-br from-white/[0.07] via-amber-400/[0.02] to-white/[0.03]'
        : 'bg-gradient-to-br from-white/5 to-white/[0.02]'
    }`}>
      {/* 顶部：类型 + 状态 + 温情标签 */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{wishType?.icon}</span>
          <span className="text-sm text-gray-400">{t(`type.${caseData.type}.name`)}</span>
          {warmthTag && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-medium">
              {warmthTag}
            </span>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
          {status.icon} {status.label}
        </span>
      </div>

      {/* 标题 */}
      <div className="px-4 pt-2.5">
        <h3 className="text-base font-bold text-white leading-snug">{caseData.title}</h3>
      </div>

      {/* 图片展示（D画图 / F拍照 类型） */}
      {caseImage && (
        <div className="px-4 pt-3">
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={caseImage}
              alt={caseData.title}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        </div>
      )}

      {/* 愿望内容 —— 温情引用样式 */}
      <div className="px-4 pt-3">
        <div className="relative pl-4 border-l-2 border-amber-400/30">
          <p className="text-sm text-gray-300 leading-relaxed italic line-clamp-3">
            &ldquo;{caseData.content}&rdquo;
          </p>
        </div>
      </div>

      {/* 许愿人 + 时间（已实现时显示） */}
      <div className="px-4 pt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin className="w-3 h-3" />
        <span>{caseData.authorName}</span>
        <span>·</span>
        <span>{caseData.authorCountry}</span>
        {caseData.fulfilledAt && (
          <>
            <span>·</span>
            <span className="text-amber-500/60">{caseData.fulfilledAt}</span>
          </>
        )}
      </div>

      {/* 实现者留言 —— 温情卡片升级 */}
      {caseData.status !== 'comingSoon' && caseData.implementerName && (
        <div className="mx-4 mt-3 mb-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-400/8 to-orange-400/5 border border-amber-400/15 relative overflow-hidden">
          {/* 装饰性光点 */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/5 rounded-full blur-2xl" />
          
          <div className="relative flex items-start gap-2">
            <Heart className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-amber-400">
                  {t('case.implementer')}: {caseData.implementerName}
                </span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">
                {caseData.implementerMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 漂流轨迹 —— 更有故事感 */}
      {caseData.status !== 'comingSoon' && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Navigation2 className="w-3 h-3 text-cyan-400/50" />
            <span>{t('case.driftPath', { count: caseData.driftPath })}</span>
            <Sparkles className="w-3 h-3 text-amber-400/40 ml-auto" />
          </div>
          {/* 漂流轨迹小点点 */}
          <div className="flex items-center gap-1 mt-2">
            {[...Array(Math.min(caseData.driftPath, 6))].map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full flex-1 ${i % 2 === 0 ? 'bg-amber-400/20' : 'bg-amber-400/10'}`}
              />
            ))}
          </div>
          {/* 可点击提示 */}
          {isClickable && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-400/50">
              <span>{t('case.viewStory')}</span>
              <span>→</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 已实现的案例可点击打开详情页
  if (isClickable) {
    return (
      <Link href={`/cases/${caseData.id}`} className="block cursor-pointer">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
