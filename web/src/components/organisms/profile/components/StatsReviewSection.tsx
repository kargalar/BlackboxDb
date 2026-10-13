/**
 * StatsReviewSection — İnceleme & yorum istatistikleri
 */

'use client';

import React from 'react';

interface Props {
  reviewCount: number;
  avgReviewLength: number;
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl py-5 px-4 gap-2">
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-white/50 text-center leading-tight">{label}</span>
    </div>
  );
}

function reviewerTitle(count: number): string {
  if (count === 0) return 'Sessiz İzleyici';
  if (count < 5) return 'Kalem Tutan';
  if (count < 15) return 'Yorum Meraklısı';
  if (count < 40) return 'Eleştirmen';
  if (count < 100) return 'Profesyonel Eleştirmen';
  return 'Usta Eleştirmen';
}

function avgLengthBadge(avg: number): { label: string; color: string } {
  if (avg < 100) return { label: 'Kısa & Öz', color: '#6366F1' };
  if (avg < 300) return { label: 'Dengeli', color: '#22C55E' };
  if (avg < 700) return { label: 'Detaylı', color: '#F59E0B' };
  return { label: 'Ansiklopedik', color: '#EF4444' };
}

export function StatsReviewSection({ reviewCount, avgReviewLength }: Props) {
  if (reviewCount === 0) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">✍️ İncelemeler</h3>
        <p className="text-sm text-white/40">Veri yok — henüz inceleme yazılmamış.</p>
      </div>
    );
  }

  console.log('🎨 [StatsReviewSection] Render');

  const title = reviewerTitle(reviewCount);
  const badge = avgLengthBadge(avgReviewLength);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">✍️ İncelemeler</h3>
        <p className="text-sm text-white/50">Yorum alışkanlıklarına dair istatistikler</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        {/* Title badge */}
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          <span className="text-2xl">🖊️</span>
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-white/40">{reviewCount} inceleme yazdın</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard value={String(reviewCount)} label="Toplam İnceleme" icon="📝" />
          <StatCard value={`~${avgReviewLength}`} label="Ort. Karakter" icon="🔤" />
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-5 px-4 gap-2"
            style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}30` }}
          >
            <span className="text-2xl">📏</span>
            <span className="text-2xl font-bold" style={{ color: badge.color }}>
              {badge.label}
            </span>
            <span className="text-xs text-white/50 text-center">Yazı Tarzı</span>
          </div>
        </div>
      </div>
    </div>
  );
}
