/**
 * StatsThemeMoodSection — Tema ve ruh hali dağılımı grafikleri
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  topThemes: TagStat[];
  topMoods: TagStat[];
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

const THEME_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#A78BFA',
  '#C4B5FD',
  '#7C3AED',
  '#5B21B6',
  '#4C1D95',
  '#DDD6FE',
];
const MOOD_COLORS = [
  '#F59E0B',
  '#FBBF24',
  '#FCD34D',
  '#FDE68A',
  '#D97706',
  '#B45309',
  '#92400E',
  '#78350F',
];

type TabKey = 'themes' | 'moods';

export function StatsThemeMoodSection({ topThemes, topMoods, contentTypeFilter }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('themes');
  const router = useRouter();

  const hasData = topThemes.length > 0 || topMoods.length > 0;
  if (!hasData) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">🎭 Tema & Ruh Hali</h3>
        <p className="text-sm text-white/40">
          Veri yok — içeriklerde tema/ruh hali bilgisi bulunamadı.
        </p>
      </div>
    );
  }

  console.log('🎨 [StatsThemeMoodSection] Render');

  const data =
    activeTab === 'themes'
      ? topThemes.slice(0, 12).map((t, i) => ({
          name: t.name,
          value: t.count,
          color: THEME_COLORS[i % THEME_COLORS.length],
        }))
      : topMoods.slice(0, 12).map((m, i) => ({
          name: m.name,
          value: m.count,
          color: MOOD_COLORS[i % MOOD_COLORS.length],
        }));

  const tabs = [
    { key: 'themes' as const, label: '🎭 Temalar', available: topThemes.length > 0 },
    { key: 'moods' as const, label: '💫 Ruh Halleri', available: topMoods.length > 0 },
  ];

  const buildHref = (name: string) =>
    `/explore/${filterToExploreSlug(contentTypeFilter)}?${activeTab === 'themes' ? 'theme' : 'mood'}=${encodeURIComponent(name)}`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">🎭 Tema & Ruh Hali</h3>
        <p className="text-sm text-white/50">En çok tükettiğin içerik temaları ve duygu tonları</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs
            .filter((t) => t.available)
            .map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>

        {data.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={4}
                          fill="rgba(255,255,255,0.65)"
                          fontSize={11}
                          textAnchor="end"
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(buildHref(String(payload.value)) as any)}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v} içerik`, 'Adet']} />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    onClick={(payload: { name?: string } | undefined) => {
                      if (payload?.name) {
                        router.push(buildHref(payload.name) as any);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {data.slice(0, 8).map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tag cloud / list */}
            <div className="space-y-2">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Tam liste</div>
              <div className="flex flex-wrap gap-2">
                {data.map((d, i) => (
                  <Link
                    key={i}
                    href={buildHref(d.name) as any}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                    style={{
                      background: `${d.color}25`,
                      border: `1px solid ${d.color}50`,
                      color: d.color,
                    }}
                  >
                    <span>{d.name}</span>
                    <span className="opacity-60">{d.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-white/40 py-6 text-center">Bu kategori için veri yok</div>
        )}
      </div>
    </div>
  );
}
