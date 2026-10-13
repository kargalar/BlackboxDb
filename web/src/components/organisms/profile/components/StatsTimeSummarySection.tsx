/**
 * StatsTimeSummarySection — Toplam süre tüketim kartları
 * Gösterir: film süresi, oyun süresi, okunan sayfa, toplam içerik
 */

'use client';

import React from 'react';
import type { RuntimeSummary } from '../StatsTabTypes';
import { formatMinutes, formatAsDays } from '../statsTabUtils';

interface Props {
  runtimeSummary: RuntimeSummary;
  totalWatched: number;
  totalMovies: number;
  totalGames: number;
  totalBooks: number;
}

function BigStatCard({
  icon,
  label,
  main,
  sub,
  color,
}: {
  icon: string;
  label: string;
  main: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`glass-card p-5 border border-white/5 relative overflow-hidden`}>
      <div className={`absolute inset-0 opacity-5 ${color}`} />
      <div className="relative z-10">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-2xl font-bold text-white">{main}</div>
        {sub && <div className="text-sm text-white/50 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export function StatsTimeSummarySection({
  runtimeSummary,
  totalWatched,
  totalMovies,
  totalGames,
  totalBooks,
}: Props) {
  console.log('🎨 [StatsTimeSummarySection] Render', runtimeSummary);

  const totalAllMinutes = runtimeSummary.totalRuntimeMinutes + runtimeSummary.totalPlaytimeMinutes;

  const totalDaysEquivalent = totalAllMinutes + runtimeSummary.estimatedReadHours * 60;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">⏱ Toplam Süre</h3>
        <p className="text-sm text-white/50">Tüm içerik türleri toplam tüketim süresi</p>
      </div>

      {/* Main summary banner */}
      <div className="glass-card p-5 bg-violet-900/20 border border-violet-500/20">
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {formatAsDays(Math.round(totalDaysEquivalent))}
          </div>
          <div className="text-sm text-white/60 mt-1">hayatından içeriğe ayırdın</div>
        </div>
      </div>

      {/* 4 breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BigStatCard
          icon="🎬"
          label="Film & Dizi"
          main={formatMinutes(runtimeSummary.totalRuntimeMinutes)}
          sub={`${totalMovies + 0} içerik`}
          color="bg-violet-500"
        />
        <BigStatCard
          icon="🎮"
          label="Oyun Süresi"
          main={formatMinutes(runtimeSummary.totalPlaytimeMinutes)}
          sub={`${totalGames} oyun`}
          color="bg-blue-500"
        />
        <BigStatCard
          icon="📚"
          label="Kitap"
          main={`${runtimeSummary.totalPagesRead.toLocaleString()} sayfa`}
          sub={`≈ ${runtimeSummary.estimatedReadHours.toFixed(0)} saat okuma`}
          color="bg-amber-500"
        />
        <BigStatCard
          icon="🔢"
          label="Toplam İçerik"
          main={`${totalWatched}`}
          sub="tüm türler"
          color="bg-green-500"
        />
      </div>
    </div>
  );
}
