/**
 * StatsTab — Chart & section components
 * Presentational components that receive data via props.
 */

'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComputedStats, ComparisonStats } from '../StatsTabTypes';
import { formatPct, compareLabel, formatRatingValue } from '../statsTabUtils';

// ── Reusable atoms ────────────────────────────────────────

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle ? <p className="text-sm text-white/50">{subtitle}</p> : null}
      </div>
    </div>
  );
}

// ── Shared tooltip style ──────────────────────────────────

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

// ── Monthly Activity Chart ────────────────────────────────

export function MonthlyActivityChart({ data }: { data: ComputedStats['monthSeries'] }) {
  console.log('🎨 [StatsTab] Rendering MonthlyActivityChart, months:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle
        title="Aktivite Serisi"
        subtitle="Seçilen aralığa göre tüketim ve puanlanan içerikler"
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="countFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend />
            <Area
              type="monotone"
              dataKey="count"
              name="Tüketim"
              stroke="#8B5CF6"
              fill="url(#countFill)"
            />
            <Area
              type="monotone"
              dataKey="ratedCount"
              name="Puanlanan"
              stroke="#3B82F6"
              fill="rgba(59,130,246,0.15)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Rating Histogram Chart ────────────────────────────────

export function RatingHistogramChart({ data }: { data: ComputedStats['ratingHistogram'] }) {
  console.log('🎨 [StatsTab] Rendering RatingHistogramChart');
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title="Puan Dağılımı" subtitle="0.5–5 arası yarım puan dağılımı" />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="rating"
              tickFormatter={(value) => formatRatingValue(Number(value))}
              tick={AXIS_TICK}
            />
            <YAxis tick={AXIS_TICK} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Adet" fill="#22C55E" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Type Distribution Pie ─────────────────────────────────

export function TypePieChart({
  data,
  colors,
}: {
  data: ComputedStats['typePie'];
  colors: string[];
}) {
  console.log('🎨 [StatsTab] Rendering TypePieChart, slices:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title="Tür Dağılımı" subtitle="Tüketilen içerik türleri" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...TOOLTIP_STYLE} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={colors[idx]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Favorite Distribution Pie ─────────────────────────────

export function FavoritePieChart({
  data,
  colors,
}: {
  data: ComputedStats['favoritePie'];
  colors: string[];
}) {
  console.log('🎨 [StatsTab] Rendering FavoritePieChart, slices:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title="Favori Dağılımı" subtitle="Favorilerin tür kırılımı" />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...TOOLTIP_STYLE} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={colors[idx]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Top Genres Bar Chart ──────────────────────────────────

export function TopGenresChart({ data }: { data: ComputedStats['topGenres'] }) {
  console.log('🎨 [StatsTab] Rendering TopGenresChart, genres:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title="Top Türler" subtitle="İçerik türü değil, genre kırılımı (ilk 12)" />
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 30, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis type="number" tick={AXIS_TICK} />
            <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={120} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="value" name="Adet" fill="#F97316" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Years Area Chart ──────────────────────────────────────

export function YearsChart({ data }: { data: ComputedStats['yearsConsumed'] }) {
  console.log('🎨 [StatsTab] Rendering YearsChart, dataPoints:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title="Yıllara Göre" subtitle="Yıla göre tüketim sayısı, üstte ortalama puan" />
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="year" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} allowDecimals={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: any, key: string | undefined, payload: any) => {
                if (key === 'value') return [`${value} içerik`, 'Tüketim'];
                return [
                  payload.payload?.avgRating ? `⭐ ${payload.payload.avgRating.toFixed(1)}` : '—',
                  'Ort. puan',
                ];
              }}
            />
            <Bar dataKey="value" name="Tüketim" fill="#06B6D4" radius={[8, 8, 0, 0]}>
              <LabelList
                dataKey="avgRating"
                position="top"
                formatter={(value: any) =>
                  value == null || Number.isNaN(Number(value))
                    ? ''
                    : `⭐ ${Number(value).toFixed(1)}`
                }
                fill="rgba(255,255,255,0.75)"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Comparison Section ────────────────────────────────────

export function ComparisonSection({ comparison }: { comparison: ComparisonStats }) {
  console.log('🎨 [StatsTab] Rendering ComparisonSection');
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle
        title="Diğer kullanıcılara göre (tahmini)"
        subtitle="Bu bölüm yaklaşık bir kıyas sunar. Gerçek sıralama/percentile için backend global stats endpoint'i eklenebilir."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam tüketim"
          value={`%${Math.round(comparison.watchedP)}`}
          hint={compareLabel(comparison.watchedP)}
        />
        <StatCard
          label="Favori sayısı"
          value={`%${Math.round(comparison.favP)}`}
          hint={compareLabel(comparison.favP)}
        />
        <StatCard
          label="En iyi seri"
          value={`%${Math.round(comparison.streakP)}`}
          hint={compareLabel(comparison.streakP)}
        />
        <StatCard
          label="Ortalama puan"
          value={comparison.ratingP === null ? '—' : `%${Math.round(comparison.ratingP)}`}
          hint={
            comparison.ratingP === null
              ? 'Puan verince hesaplanır'
              : compareLabel(comparison.ratingP)
          }
        />
      </div>
      <div className="text-xs text-white/40">
        Bu değerler uygulamanın genel kullanımına dair varsayımsal eşiklere dayanır (p50/p90/p99).
        İstersen gerçek veriye göre hesaplayan bir GraphQL query ekleyip burayı birebir sıralamaya
        çevirebilirim.
      </div>
    </div>
  );
}

// ── Behavior Summary ──────────────────────────────────────

export function BehaviorSummarySection({ computed }: { computed: ComputedStats }) {
  console.log('🎨 [StatsTab] Rendering BehaviorSummarySection');
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title="Davranış Özeti" subtitle="Durumlara göre özet" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Devam ediyor" value={computed.continuingCount} />
        <StatCard label="Planlandı" value={computed.consumeLaterCount} />
        <StatCard
          label="İzlenenlerde favori"
          value={formatPct(computed.favoriteFromWatchedPct)}
          hint={`${computed.favoritesInWatchedCount} / ${computed.totalWatched}`}
        />
        <StatCard
          label="Puanlama oranı"
          value={formatPct(computed.completionPct)}
          hint={`${computed.ratedCount} / ${computed.totalWatched}`}
        />
      </div>
    </div>
  );
}

// ── Basic Summary ─────────────────────────────────────────

interface BasicSummaryProps {
  basicStats: {
    totalMovies: number;
    thisYearMovies: number;
    averageRating: number;
    discussionCount: number;
  };
}

export function BasicSummarySection({ basicStats }: BasicSummaryProps) {
  console.log('🎨 [StatsTab] Rendering BasicSummarySection');
  return (
    <div className="glass-card p-5 space-y-3">
      <SectionTitle title="Temel Özet" subtitle="Home sekmesindeki temel istatistikler" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Toplam Film" value={basicStats.totalMovies} />
        <StatCard label="Bu yıl film" value={basicStats.thisYearMovies} />
        <StatCard label="Home ort. puan" value={basicStats.averageRating.toFixed(1)} />
        <StatCard label="Tartışma sayısı" value={basicStats.discussionCount} />
      </div>
    </div>
  );
}
