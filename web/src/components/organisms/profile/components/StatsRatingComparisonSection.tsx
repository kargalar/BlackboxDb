/**
 * StatsRatingComparisonSection — Puan dağılımı vs global platform karşılaştırması
 * + En çok ve en az beğenilen içerikler (delta bazlı)
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ContentRatingComp } from '../StatsTabTypes';
import type { ComputedStats } from '../StatsTabTypes';
import { formatDelta, formatRatingValue } from '../statsTabUtils';

interface Props {
  ratingHistogram: ComputedStats['ratingHistogram'];
  mostOverrated: ContentRatingComp[];
  mostUnderrated: ContentRatingComp[];
  avgRatingAll: number | null;
  ratedCount: number;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface-raised)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  labelStyle: { color: 'rgba(255,255,255,0.8)' },
  itemStyle: { color: 'rgba(255,255,255,0.8)' },
} as const;

const AXIS_TICK = { fill: 'rgba(255,255,255,0.6)', fontSize: 12 } as const;

function RatingDelta({ delta }: { delta: number }) {
  const positive = delta > 0;
  return (
    <span className={`text-sm font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {formatDelta(delta)}
    </span>
  );
}

function ContentCompRow({ item, rank }: { item: ContentRatingComp; rank: number }) {
  const href = `/content/${item.contentTypeSlug ?? 'movie'}/${item.contentId}`;
  return (
    <Link
      href={href as any}
      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
    >
      <span className="text-xs text-white/30 w-5 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.title}</div>
        <div className="text-xs text-white/40">
          Senin: <span className="text-yellow-400">⭐ {item.userRating.toFixed(1)}</span>
          {' · '}
          Platform: ⭐ {item.globalAvgRating.toFixed(1)}
          {' · '}
          {item.globalRatingCount} oy
        </div>
      </div>
      <RatingDelta delta={item.delta} />
    </Link>
  );
}

/** Derive a rater persona from histogram */
function getRaterPersona(
  histogram: ComputedStats['ratingHistogram'],
  avgRating: number | null
): string {
  if (!avgRating) return 'Henüz puanlama yok';
  const high = histogram.filter((bucket) => bucket.rating >= 4).reduce((a, b) => a + b.count, 0);
  const low = histogram.filter((bucket) => bucket.rating <= 2.5).reduce((a, b) => a + b.count, 0);
  const total = histogram.reduce((a, b) => a + b.count, 0);
  if (total === 0) return 'Henüz puanlama yok';
  if (high / total > 0.5) return '❤️ Mükemmel Puancı — yüksek puan vermeyi seviyorsun';
  if (low / total > 0.3) return '🔎 Eleştirel Puancı — standartların yüksek';
  if (avgRating >= 4) return '😊 İyimser Puancı — genelde memnun kalırsın';
  return '⚖️ Dengeli Puancı — platforma yakın puanlıyorsun';
}

export function StatsRatingComparisonSection({
  ratingHistogram,
  mostOverrated,
  mostUnderrated,
  avgRatingAll,
  ratedCount,
}: Props) {
  console.log('🎨 [StatsRatingComparisonSection] Render, rated:', ratedCount);

  const persona = getRaterPersona(ratingHistogram, avgRatingAll);

  // Build combined histogram data for the chart
  // We only have user distribution — show it with color coding
  const histChartData = ratingHistogram.map((d) => ({
    rating: formatRatingValue(d.rating),
    senin: d.count,
  }));

  if (ratedCount === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-white">⭐ Puan Karşılaştırması</h3>
        <p className="text-sm text-white/40 mt-2">
          Puan verdikten sonra karşılaştırma burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">⭐ Puan Analizi</h3>
        <p className="text-sm text-white/50">
          Puan dağılımın, platforma göre farkın ve puanlama tarzın
        </p>
      </div>

      {/* Persona badge */}
      <div className="glass-card p-4 bg-violet-900/10 border border-violet-500/20">
        <div className="text-sm text-white/80">{persona}</div>
        {avgRatingAll !== null && (
          <div className="text-xs text-white/40 mt-1">
            Ortalama puanın:{' '}
            <span className="text-yellow-400 font-semibold">⭐ {avgRatingAll.toFixed(1)}</span>
            {' · '}
            Toplam puanlanan: {ratedCount} içerik
          </div>
        )}
      </div>

      {/* Histogram */}
      <div className="glass-card p-5 space-y-3">
        <div className="text-sm font-semibold text-white/80">Puan Dağılımın (0.5–5)</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="rating" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(val: any) => [`${val} içerik`, 'Sen']} />
              <Bar dataKey="senin" name="Sen" radius={[6, 6, 0, 0]}>
                {histChartData.map((entry, idx) => {
                  const r = Number(entry.rating);
                  const color = r >= 4 ? '#22C55E' : r >= 3 ? '#8B5CF6' : '#EF4444';
                  return <Cell key={idx} fill={color} fillOpacity={0.8} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overrated / Underrated */}
      {(mostOverrated.length > 0 || mostUnderrated.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mostUnderrated.length > 0 && (
            <div className="glass-card p-5 space-y-2">
              <div className="text-sm font-semibold text-white/80">
                💚 Platformdan Fazla Sevdiklerin
              </div>
              <div className="text-xs text-white/40 mb-1">Senin puanın platform ort. üstünde</div>
              {mostUnderrated.slice(0, 6).map((item, i) => (
                <ContentCompRow key={item.contentId} item={item} rank={i + 1} />
              ))}
            </div>
          )}

          {mostOverrated.length > 0 && (
            <div className="glass-card p-5 space-y-2">
              <div className="text-sm font-semibold text-white/80">
                ❤️‍🔥 Platformdan Az Sevdiklerin
              </div>
              <div className="text-xs text-white/40 mb-1">Senin puanın platform ort. altında</div>
              {mostOverrated.slice(0, 6).map((item, i) => (
                <ContentCompRow key={item.contentId} item={item} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
