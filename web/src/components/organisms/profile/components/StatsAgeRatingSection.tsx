/**
 * StatsAgeRatingSection — Yaş sınıflandırması dağılımı
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
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TagStat } from '../StatsTabTypes';
import { filterToExploreSlug } from '../statsTabUtils';

interface Props {
  ageRatingDistribution: TagStat[];
  contentTypeFilter: string;
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

const AXIS_TICK = { fill: 'rgba(255,255,255,0.6)', fontSize: 11 } as const;

function ageRatingColor(ratingName: string): string {
  const name = ratingName.toUpperCase();
  if (name.includes('G') || name.includes('E') || name.includes('ALL') || name.includes('TP'))
    return '#22C55E';
  if (name.includes('PG') || name.includes('10') || name.includes('7')) return '#84CC16';
  if (name.includes('12') || name.includes('T') || name.includes('PG-13')) return '#EAB308';
  if (name.includes('16') || name.includes('M') || name.includes('15')) return '#F97316';
  if (
    name.includes('18') ||
    name.includes('R') ||
    name.includes('NC-17') ||
    name.includes('AO') ||
    name.includes('21')
  )
    return '#EF4444';
  return '#6366F1';
}

export function StatsAgeRatingSection({ ageRatingDistribution, contentTypeFilter }: Props) {
  if (!ageRatingDistribution || ageRatingDistribution.length === 0) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">🔞 Yaş Sınıflandırması</h3>
        <p className="text-sm text-white/40">Veri yok — yaş sınıfı bilgisi bulunamadı.</p>
      </div>
    );
  }

  console.log('🎨 [StatsAgeRatingSection] Render');

  const data = ageRatingDistribution
    .sort((a, b) => b.count - a.count)
    .map((r) => ({
      name: r.name,
      value: r.count,
      color: ageRatingColor(r.name),
    }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">🔞 Yaş Sınıflandırması</h3>
        <p className="text-sm text-white/50">İçeriklerin yaş sınıflarına göre dağılımı</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v} içerik`, 'Adet']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rating badges */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {data.map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <Link
                  key={d.name}
                  href={`/explore/${filterToExploreSlug(contentTypeFilter)}?ageRating=${encodeURIComponent(d.name)}`}
                  className="flex items-center gap-3 p-3 rounded-xl transition-opacity hover:opacity-80 cursor-pointer"
                  style={{ background: `${d.color}15`, border: `1px solid ${d.color}30` }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: d.color, color: '#fff' }}
                  >
                    {d.name.slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{d.value} içerik</div>
                    <div className="text-xs text-white/40">%{pct}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
