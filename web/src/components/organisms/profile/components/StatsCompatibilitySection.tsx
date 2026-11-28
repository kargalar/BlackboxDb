'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import Image from 'next/image';
import Link from 'next/link';
import type { UserCompatibilityStat } from '../StatsTabTypes';

interface Props {
  friendCompatibility: UserCompatibilityStat[];
  globalCompatibility: UserCompatibilityStat[];
}

function CompatibilityAvatar({
  picturePath,
  username,
}: {
  picturePath?: string | null;
  username: string;
}) {
  if (picturePath) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white/5">
        <Image
          src={picturePath}
          alt={username}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-200 flex items-center justify-center flex-shrink-0 font-semibold">
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

function CompatibilityRow({ item, rank }: { item: UserCompatibilityStat; rank: number }) {
  const translateUi = useUiTranslations('Ui');
  return (
    <Link
      href={`/profile/${item.username}`}
      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3 hover:bg-white/[0.06] transition-colors"
    >
      <div className="w-6 text-xs text-white/35 text-right">{rank}</div>
      <CompatibilityAvatar picturePath={item.picturePath} username={item.username} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{item.username}</div>
        <div className="text-xs text-white/45">
          {item.sharedRatingsCount} {" " + translateUi("ortak_puan_ort_fark_23792e1") + " "} {item.avgRatingDiff.toFixed(2)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-emerald-300">%{item.score}</div>
        <div className="text-[11px] uppercase tracking-wide text-white/30">{translateUi("uyum_0e225e7")}</div>
      </div>
    </Link>
  );
}

function CompatibilityList({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: UserCompatibilityStat[];
  emptyText: string;
}) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-white/45">{subtitle}</p>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <CompatibilityRow key={item.userId} item={item} rank={index + 1} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/40">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsCompatibilitySection({ friendCompatibility, globalCompatibility }: Props) {
  const translateUi = useUiTranslations('Ui');
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{translateUi("uyumluluk_2ca3a98")}</h3>
        <p className="text-sm text-white/50">
          {translateUi("ortak_puan_verdiginiz_iceriklerdeki_yakinliga_gore_c36060d")}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CompatibilityList
          title={translateUi("karsilikli_takipte_en_uyumlu_68c108d")}
          subtitle={translateUi("karsilikli_takip_ettigin_kullanicilar_arasinda_f8a420d")}
          items={friendCompatibility}
          emptyText={translateUi("yeterli_ortak_puanli_karsilikli_takip_yok_7d37997")}
        />
        <CompatibilityList
          title={translateUi("globalde_en_uyumlu_a127591")}
          subtitle={translateUi("platform_genelindeki_en_yakin_puan_eslesmeleri_6da24e8")}
          items={globalCompatibility}
          emptyText={translateUi("yeterli_ortak_puanli_kullanici_yok_89ae82b")}
        />
      </div>
    </div>
  );
}
