/**
 * StatsPublisherDeveloperSection — Oyun yayıncısı, geliştiricisi, modu, perspektifi ve platformu
 */

'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import Image from 'next/image';
import Link from 'next/link';
import type { CompanyStat, TagStat } from '../StatsTabTypes';
import { formatMinutes } from '../statsTabUtils';

interface Props {
  topPublishers: CompanyStat[];
  topDevelopers: CompanyStat[];
  topGameModes: TagStat[];
  topPlatforms: TagStat[];
  topPerspectives: TagStat[];
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

const PIE_COLORS = [
  '#8B5CF6',
  '#3B82F6',
  '#22C55E',
  '#F97316',
  '#EF4444',
  '#06B6D4',
  '#F59E0B',
  '#EC4899',
];

type CompanyView = 'publishers' | 'developers';

function CompanyRow({ stat, rank }: { stat: CompanyStat; rank: number }) {
  return (
    <Link
      href={`/company/${stat.companyId}`}
      className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
    >
      <span className="text-xs text-white/30 w-5 text-right">{rank}</span>
      {stat.logoUrl ? (
        <div className="w-8 h-8 rounded overflow-hidden bg-white/5 flex-shrink-0">
          <Image
            src={stat.logoUrl}
            alt={stat.companyName}
            width={32}
            height={32}
            className="object-contain w-full h-full"
          />
        </div>
      ) : (
        <div className="w-8 h-8 rounded bg-blue-700/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white/60">
          {stat.companyName.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{stat.companyName}</div>
        <div className="text-xs text-white/40">
          {stat.count} oyun
          {stat.totalPlaytimeMinutes > 0 && ` · ${formatMinutes(stat.totalPlaytimeMinutes)}`}
        </div>
      </div>
      {stat.avgRating != null && (
        <div className="text-sm font-semibold text-yellow-400">⭐ {stat.avgRating.toFixed(1)}</div>
      )}
    </Link>
  );
}

export function StatsPublisherDeveloperSection({
  topPublishers,
  topDevelopers,
  topGameModes,
  topPlatforms,
  topPerspectives,
}: Props) {
  const [companyView, setCompanyView] = useState<CompanyView>('publishers');

  const hasGameData =
    topPublishers.length > 0 ||
    topDevelopers.length > 0 ||
    topGameModes.length > 0 ||
    topPlatforms.length > 0;

  if (!hasGameData) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">🎮 Oyun İstatistikleri</h3>
        <p className="text-sm text-white/40">Veri yok — henüz oyun eklenmemiş.</p>
      </div>
    );
  }

  console.log('🎨 [StatsPublisherDeveloperSection] Render');

  const companyList = companyView === 'publishers' ? topPublishers : topDevelopers;

  // Platform pie data
  const platformPieData = topPlatforms.slice(0, 8).map((p, i) => ({
    name: p.name,
    value: p.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Game mode radar data
  const radarData = topGameModes.slice(0, 6).map((gm) => ({
    subject: gm.name,
    count: gm.count,
  }));

  // Perspective bar data
  const perspData = topPerspectives.map((p) => ({ name: p.name, value: p.count }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">🎮 Oyun İstatistikleri</h3>
        <p className="text-sm text-white/50">Yayıncı, geliştirici, platform ve oyun modu analizi</p>
      </div>

      {/* Company section */}
      {(topPublishers.length > 0 || topDevelopers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-5 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-2">
                {(['publishers', 'developers'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setCompanyView(k)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      companyView === k
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {k === 'publishers' ? '🏢 Yayıncılar' : '🔧 Geliştiriciler'}
                  </button>
                ))}
              </div>
            </div>
            {companyList.length > 0 ? (
              companyList
                .slice(0, 8)
                .map((s, i) => <CompanyRow key={s.companyId} stat={s} rank={i + 1} />)
            ) : (
              <div className="text-xs text-white/40 py-4 text-center">Veri yok</div>
            )}
          </div>

          {/* Platform Pie */}
          {platformPieData.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="text-sm font-semibold text-white/80">🕹️ Platform Dağılımı</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Pie
                      data={platformPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {platformPieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Mode Radar + Perspective */}
      {(radarData.length > 0 || perspData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {radarData.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="text-sm font-semibold text-white/80">🎯 Oyun Modu Dağılımı</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                    />
                    <Radar dataKey="count" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                    <Tooltip {...TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {perspData.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="text-sm font-semibold text-white/80">👁️ Kamera Perspektifi</div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={perspData}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" tick={AXIS_TICK} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={90} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v} oyun`, 'Adet']} />
                    <Bar dataKey="value" fill="#06B6D4" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
