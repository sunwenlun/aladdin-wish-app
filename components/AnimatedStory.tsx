'use client';

import { useEffect, useState } from 'react';
import { Heart, Sparkles, MapPin } from 'lucide-react';

interface AnimatedStoryProps {
  type: string;
  typeIcon: string;
  title: string;
  content: string;
  authorName: string;
  authorCountry: string;
  implementerName?: string;
  implementerMessage?: string;
  driftPath: number;
  fulfilledAt?: string;
  isAi?: boolean;
  lang: 'zh' | 'en';
  imageUrl?: string;
}

export function AnimatedStory({
  typeIcon,
  title,
  content,
  authorName,
  authorCountry,
  implementerName,
  implementerMessage,
  driftPath,
  fulfilledAt,
  isAi,
  lang,
  imageUrl,
}: AnimatedStoryProps) {
  const isZh = lang === 'zh';
  const [step, setStep] = useState(0);

  // Auto-play animation steps
  useEffect(() => {
    const timers: number[] = [];
    const delays = [500, 1200, 2000, 3000, 4200];
    delays.forEach((delay, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), delay));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0a1a] via-[#12102a] to-[#0a0a1a] border border-amber-400/15">
      {/* Animated starfield background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-amber-200/20"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Floating lamp icon */}
      <div className="relative pt-12 pb-8 px-6 text-center">
        <div
          className="text-6xl mb-6 transition-all duration-1000"
          style={{
            opacity: step >= 0 ? 1 : 0,
            transform: step >= 0 ? 'scale(1)' : 'scale(0.5)',
          }}
        >
          <span className="inline-block animate-float">{typeIcon}</span>
        </div>

        {/* Type badge */}
        <div
          className="inline-block px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs text-amber-300 mb-4 transition-all duration-700"
          style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'translateY(0)' : 'translateY(10px)' }}
        >
          {isAi ? (isZh ? '🧞 灯神守护' : '🧞 Genie Granted') : (isZh ? '✨ 愿望成真' : '✨ Wish Fulfilled')}
        </div>

        {/* Title */}
        <h2
          className="text-xl font-bold text-white mb-3 transition-all duration-700"
          style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'translateY(0)' : 'translateY(15px)' }}
        >
          {title}
        </h2>

        {/* Image for D (drawing) / F (photo) types */}
        {imageUrl && (
          <div
            className="max-w-sm mx-auto mb-6 rounded-2xl overflow-hidden transition-all duration-1000"
            style={{
              opacity: step >= 2 ? 1 : 0,
              transform: step >= 2 ? 'translateY(0)' : 'translateY(20px) scale(0.95)',
            }}
          >
            <img src={imageUrl} alt={title} className="w-full h-64 object-cover" />
          </div>
        )}

        {/* Author */}
        <div
          className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-6 transition-all duration-700"
          style={{ opacity: step >= 2 ? 1 : 0 }}
        >
          <MapPin className="w-3 h-3" />
          <span>{authorName}</span>
          <span>·</span>
          <span>{authorCountry}</span>
          {fulfilledAt && (
            <>
              <span>·</span>
              <span className="text-amber-500/60">{fulfilledAt}</span>
            </>
          )}
        </div>

        {/* Wish content — typewriter feel */}
        <div
          className="max-w-sm mx-auto mb-6 transition-all duration-1000"
          style={{ opacity: step >= 2 ? 1 : 0, transform: step >= 2 ? 'translateY(0)' : 'translateY(20px)' }}
        >
          <div className="relative pl-4 border-l-2 border-amber-400/40 text-left">
            <p className="text-sm text-gray-200 leading-relaxed italic">
              &ldquo;{content}&rdquo;
            </p>
          </div>
        </div>

        {/* Drift path visualization */}
        <div
          className="flex items-center justify-center gap-1.5 mb-6 transition-all duration-700"
          style={{ opacity: step >= 3 ? 1 : 0 }}
        >
          <Sparkles className="w-3 h-3 text-cyan-400/60" />
          <span className="text-xs text-gray-500">
            {isZh ? `漂流了 ${driftPath} 位旅人` : `Drifted through ${driftPath} travelers`}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {[...Array(Math.min(driftPath, 8))].map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-amber-400/30"
                style={{
                  width: '12px',
                  animation: `fadeIn 0.3s ease ${i * 0.1}s both`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Implementer message — the heart of the story */}
        {implementerName && implementerMessage && (
          <div
            className="max-w-sm mx-auto rounded-2xl bg-gradient-to-r from-amber-400/10 to-orange-400/5 border border-amber-400/20 p-5 transition-all duration-1000"
            style={{
              opacity: step >= 4 ? 1 : 0,
              transform: step >= 4 ? 'translateY(0)' : 'translateY(25px)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/15 flex items-center justify-center">
                {isAi ? '🧞' : '❤️'}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-amber-300">
                  {isAi ? (isZh ? '灯神' : 'Genie') : implementerName}
                </div>
                <div className="text-[10px] text-gray-500">
                  {isAi
                    ? (isZh ? '亲自实现' : 'Granted the wish')
                    : (isZh ? '帮TA实现了愿望' : 'Fulfilled this wish')}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-100 leading-relaxed italic text-left">
              &ldquo;{implementerMessage}&rdquo;
            </p>
          </div>
        )}

        {/* Bottom decorative line */}
        <div
          className="flex items-center justify-center gap-2 mt-8 transition-all duration-700"
          style={{ opacity: step >= 4 ? 1 : 0 }}
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400/30" />
          <Heart className="w-3 h-3 text-rose-400/50" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400/30" />
        </div>

        <p
          className="text-[10px] text-gray-600 mt-3 transition-all duration-700"
          style={{ opacity: step >= 4 ? 1 : 0 }}
        >
          {isZh ? '阿拉丁许愿灯 · 让每个愿望被听见' : "Aladdin's Wish Lamp · Every wish deserves to be heard"}
        </p>
      </div>
    </div>
  );
}
