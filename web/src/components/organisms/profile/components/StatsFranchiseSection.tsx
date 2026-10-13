/**
 * StatsFranchiseSection — Franchise bazlı istatistikler
 */

'use client';

import React from 'react';
import type { FranchiseStat } from '../StatsTabTypes';
import { formatMinutes } from '../statsTabUtils';

interface Props {
  topFranchises: FranchiseStat[];
}

function FranchiseRow({ stat, rank }: { stat: FranchiseStat; rank: number }) {
  const barWidth = Math.min(100, (stat.count / 30) * 100);

  return (
    <div className="space-y-1.5 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-white/30 w-5 text-right flex-shrink-0">{rank}</span>
          <span className="text-sm font-medium text-white truncate">🎬 {stat.franchiseName}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
          <span className="text-white/50">{stat.count} içerik</span>
          {stat.avgRating != null && (
            <span className="text-yellow-400 font-semibold">⭐ {stat.avgRating.toFixed(1)}</span>
          )}
          {stat.totalRuntime > 0 && (
            <span className="text-white/40">{formatMinutes(stat.totalRuntime)}</span>
          )}
        </div>
      </div>
      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden ml-7">
        <div
          className="absolute inset-y-0 left-0 bg-violet-500 rounded-full"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export function StatsFranchiseSection({ topFranchises }: Props) {
  if (!topFranchises || topFranchises.length === 0) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">🎬 Franchise&apos;lar</h3>
        <p className="text-sm text-white/40">Veri yok — franchise bilgisi bulunamadı.</p>
      </div>
    );
  }

  console.log('🎨 [StatsFranchiseSection] Render');

  const sorted = [...topFranchises].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">🎬 Franchise&apos;lar</h3>
        <p className="text-sm text-white/50">En çok içerik tükettiğin evrenler ve seriler</p>
      </div>

      <div className="glass-card p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
          {sorted.map((s, i) => (
            <FranchiseRow key={s.franchiseName || i} stat={s} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
