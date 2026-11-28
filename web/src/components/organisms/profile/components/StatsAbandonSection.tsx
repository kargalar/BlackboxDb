/**
 * StatsAbandonSection — Yarıda bırakılan içerik istatistikleri
 */

'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import React from 'react';
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
import type { TypeCountStat } from '../StatsTabTypes';

interface Props {
  abandonedCount: number;
  abandonedByType: TypeCountStat[];
  totalConsumed: number;
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

const TYPE_COLORS: Record<string, string> = {
  MOVIE: '#3B82F6',
  TV: '#8B5CF6',
  GAME: '#22C55E',
  BOOK: '#F59E0B',
};

function typeColor(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('FILM') || upper.includes('MOVIE')) return '#3B82F6';
  if (upper.includes('DIZI') || upper.includes('TV') || upper.includes('SERIE')) return '#8B5CF6';
  if (upper.includes('OYUN') || upper.includes('GAME')) return '#22C55E';
  if (upper.includes('KITAP') || upper.includes('BOOK')) return '#F59E0B';
  return '#6366F1';
}

export function StatsAbandonSection({ abandonedCount, abandonedByType, totalConsumed }: Props) {
  const translateUi = useUiTranslations('Ui');
  if (abandonedCount === 0) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">{translateUi("yarida_birakilanlar_f049355")}</h3>
        <p className="text-sm text-white/40">{translateUi("veri_yok_yarida_birakilan_icerik_bulunmuyor_6ae3dda")}</p>
      </div>
    );
  }

  console.log('🎨 [StatsAbandonSection] Render');

  const abandonRate =
    totalConsumed > 0 ? Math.round((abandonedCount / (totalConsumed + abandonedCount)) * 100) : 0;

  const barData = abandonedByType
    .filter((t) => t.count > 0)
    .map((t) => ({
      name: t.name,
      value: t.count,
      color: typeColor(t.name),
    }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{translateUi("yarida_birakilanlar_f049355")}</h3>
        <p className="text-sm text-white/50">{translateUi("tamamlamadigin_icerikler_f4e4141")}</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        {/* Summary banner */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col items-center justify-center bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 min-w-[120px]">
            <span className="text-3xl font-bold text-red-400">{abandonedCount}</span>
            <span className="text-xs text-white/50 mt-1">{translateUi("birakilan_f0bb33a")}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-orange-500/10 border border-orange-500/20 rounded-2xl px-6 py-4 min-w-[120px]">
            <span className="text-3xl font-bold text-orange-400">%{abandonRate}</span>
            <span className="text-xs text-white/50 mt-1">{translateUi("birakma_orani_971e6f0")}</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl px-6 py-4 min-w-[120px]">
            <span className="text-3xl font-bold text-white">{totalConsumed}</span>
            <span className="text-xs text-white/50 mt-1">{translateUi("tamamlanan_90c01c9")}</span>
          </div>
        </div>

        {/* Bar chart by type */}
        {barData.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v} içerik`, 'Bırakılan']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {barData.length === 1 && (
          <div className="text-sm text-white/50 pt-1">
            {translateUi("tum_birakilan_icerikler_2766834")}{' '}
            <span className="text-white font-medium">{barData[0].name}</span> {" " + translateUi("turunde_e5b8351")}
          </div>
        )}
      </div>
    </div>
  );
}
