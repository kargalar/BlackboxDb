/**
 * StatsTab — Chart & section components
 * Presentational components that receive data via props.
 */

'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering MonthlyActivityChart, months:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle
        title={translateUi("aktivite_serisi_aef2cc3")}
        subtitle={translateUi("secilen_araliga_gore_tuketim_ve_puanlanan_56c7756")}
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering RatingHistogramChart');
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title={translateUi("puan_dagilimi_173b7b1")} subtitle={translateUi("0_5_5_arasi_yarim_puan_24b5985")} />
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering TypePieChart, slices:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title={translateUi("tur_dagilimi_16606ae")} subtitle={translateUi("tuketilen_icerik_turleri_dc038f3")} />
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering FavoritePieChart, slices:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title={translateUi("favori_dagilimi_95b2ded")} subtitle={translateUi("favorilerin_tur_kirilimi_2bec6f7")} />
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering TopGenresChart, genres:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title={translateUi("top_turler_61ced0e")} subtitle={translateUi("icerik_turu_degil_genre_kirilimi_ilk_c5e0cf8")} />
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering YearsChart, dataPoints:', data.length);
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title={translateUi("yillara_gore_c85e0cf")} subtitle={translateUi("yila_gore_tuketim_sayisi_ustte_ortalama_08cafd5")} />
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering ComparisonSection');
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle
        title={translateUi("diger_kullanicilara_gore_tahmini_5749b3c")}
        subtitle={translateUi("bu_bolum_yaklasik_bir_kiyas_sunar_55cc08e")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={translateUi("toplam_tuketim_0bdad7c")}
          value={`%${Math.round(comparison.watchedP)}`}
          hint={compareLabel(comparison.watchedP)}
        />
        <StatCard
          label={translateUi("favori_sayisi_dbbb4dd")}
          value={`%${Math.round(comparison.favP)}`}
          hint={compareLabel(comparison.favP)}
        />
        <StatCard
          label={translateUi("en_iyi_seri_9284eb7")}
          value={`%${Math.round(comparison.streakP)}`}
          hint={compareLabel(comparison.streakP)}
        />
        <StatCard
          label={translateUi("ortalama_puan_0ee0d19")}
          value={comparison.ratingP === null ? '—' : `%${Math.round(comparison.ratingP)}`}
          hint={
            comparison.ratingP === null
              ? 'Puan verince hesaplanır'
              : compareLabel(comparison.ratingP)
          }
        />
      </div>
      <div className="text-xs text-white/40">
        {translateUi("bu_degerler_uygulamanin_genel_kullanimina_dair_abe3c08")}
      </div>
    </div>
  );
}

// ── Behavior Summary ──────────────────────────────────────

export function BehaviorSummarySection({ computed }: { computed: ComputedStats }) {
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering BehaviorSummarySection');
  return (
    <div className="glass-card p-5 space-y-4">
      <SectionTitle title={translateUi("davranis_ozeti_5014b1e")} subtitle={translateUi("durumlara_gore_ozet_0c4b0a7")} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={translateUi("devam_ediyor_341dfbb")} value={computed.continuingCount} />
        <StatCard label={translateUi("planlandi_25d3fe4")} value={computed.consumeLaterCount} />
        <StatCard
          label={translateUi("izlenenlerde_favori_62a3840")}
          value={formatPct(computed.favoriteFromWatchedPct)}
          hint={`${computed.favoritesInWatchedCount} / ${computed.totalWatched}`}
        />
        <StatCard
          label={translateUi("puanlama_orani_c071694")}
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
  const translateUi = useUiTranslations('Ui');
  console.log('🎨 [StatsTab] Rendering BasicSummarySection');
  return (
    <div className="glass-card p-5 space-y-3">
      <SectionTitle title={translateUi("temel_ozet_64d906f")} subtitle={translateUi("home_sekmesindeki_temel_istatistikler_240cfcd")} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={translateUi("toplam_film_848b88b")} value={basicStats.totalMovies} />
        <StatCard label={translateUi("bu_yil_film_7cb799e")} value={basicStats.thisYearMovies} />
        <StatCard label={translateUi("home_ort_puan_af300f6")} value={basicStats.averageRating.toFixed(1)} />
        <StatCard label={translateUi("tartisma_sayisi_50fc4df")} value={basicStats.discussionCount} />
      </div>
    </div>
  );
}
