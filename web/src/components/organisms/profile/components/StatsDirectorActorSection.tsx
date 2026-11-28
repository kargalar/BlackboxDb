/**
 * StatsDirectorActorSection — Yönetmen, oyuncu ve yazar istatistikleri
 * Film ve TV için yönetmenler/oyuncular, kitaplar için yazarlar.
 */

'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PersonStat } from '../StatsTabTypes';

interface Props {
  topDirectors: PersonStat[];
  bestRatedDirectors: PersonStat[];
  worstRatedDirectors: PersonStat[];
  topActors: PersonStat[];
  topWriters: PersonStat[];
  topAuthors: PersonStat[];
  topCrew: PersonStat[];
  contentTypeFilter: string;
}

type PersonView = 'directors' | 'actors' | 'writers' | 'authors' | 'crew';
const PAGE_SIZE = 8;

function PersonAvatar({ profileUrl, name }: { profileUrl?: string | null; name: string }) {
  if (profileUrl) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        <Image
          src={profileUrl}
          alt={name}
          width={32}
          height={32}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-violet-700/40 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white/60">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PersonStatRow({ stat, rank }: { stat: PersonStat; rank: number }) {
  const translateUi = useUiTranslations('Ui');
  return (
    <Link
      href={`/person/${stat.personId}`}
      className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
    >
      <span className="text-xs text-white/30 w-5 text-right">{rank}</span>
      <PersonAvatar profileUrl={stat.profileUrl} name={stat.personName} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{stat.personName}</div>
        <div className="text-xs text-white/40">
          {stat.count} {" " + translateUi("icerik_cc7ccd1")}{stat.favoriteCount > 0 && ` · ${stat.favoriteCount} favori`}
        </div>
      </div>
      {stat.avgRating != null && (
        <div className="text-sm font-semibold text-yellow-400">⭐ {stat.avgRating.toFixed(1)}</div>
      )}
    </Link>
  );
}

function PersonListCard(props: { title: string; data: PersonStat[]; emptyText: string }) {
  const dataKey = props.data.map((item) => item.personId).join(',');

  return <PersonListCardContent key={dataKey} {...props} />;
}

function PersonListCardContent({
  title,
  data,
  emptyText,
}: {
  title: string;
  data: PersonStat[];
  emptyText: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = sentinelRef.current?.parentElement;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || visibleCount >= data.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, data.length));
        }
      },
      { root, threshold: 0.8 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [data.length, visibleCount]);

  const visibleItems = data.slice(0, visibleCount);

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="text-sm font-semibold text-white/80">{title}</div>
      <div className="max-h-[28rem] overflow-y-auto pr-1 space-y-1">
        {visibleItems.length > 0 ? (
          <>
            {visibleItems.map((item, index) => (
              <PersonStatRow key={item.personId} stat={item} rank={index + 1} />
            ))}
            <div ref={sentinelRef} className="h-4" />
          </>
        ) : (
          <div className="text-xs text-white/40 py-4 text-center">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

export function StatsDirectorActorSection({
  topDirectors,
  bestRatedDirectors,
  worstRatedDirectors,
  topActors,
  topWriters,
  topAuthors,
  topCrew,
  contentTypeFilter,
}: Props) {
  const translateUi = useUiTranslations('Ui');
  const [view, setView] = useState<PersonView>('directors');

  console.log('🎨 [StatsDirectorActorSection] Render, view:', view);

  const showDirectors = contentTypeFilter !== 'books' && contentTypeFilter !== 'games';
  const showCrew =
    contentTypeFilter !== 'books' && contentTypeFilter !== 'games' && topCrew.length > 0;

  const tabs: { key: PersonView; label: string; show: boolean }[] = [
    { key: 'directors' as PersonView, label: '🎬 Yönetmenler', show: showDirectors },
    {
      key: 'actors' as PersonView,
      label: '🎭 Oyuncular',
      show: contentTypeFilter !== 'books' && contentTypeFilter !== 'games',
    },
    {
      key: 'writers' as PersonView,
      label: '✍️ Senaristler',
      show:
        (contentTypeFilter !== 'books' && contentTypeFilter !== 'games') || topWriters.length > 0,
    },
    {
      key: 'authors' as PersonView,
      label: '📚 Kitap Yazarları',
      show: contentTypeFilter === 'books' || topAuthors.length > 0,
    },
    { key: 'crew' as PersonView, label: '🛠️ Crew', show: showCrew },
  ].filter((t) => t.show);

  const activeView = tabs.some((tab) => tab.key === view) ? view : (tabs[0]?.key ?? 'directors');

  const currentList = useMemo(() => {
    if (activeView === 'directors') return topDirectors;
    if (activeView === 'actors') return topActors;
    if (activeView === 'crew') return topCrew;
    if (activeView === 'authors') return topAuthors;
    return topWriters;
  }, [topActors, topCrew, topDirectors, topWriters, topAuthors, activeView]);

  const bestRatedList = useMemo(() => {
    if (activeView === 'directors' && bestRatedDirectors.length > 0) {
      return bestRatedDirectors;
    }

    return [...currentList]
      .filter((p) => p.count >= 2 && p.avgRating != null)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  }, [activeView, bestRatedDirectors, currentList]);

  const worstRatedList = useMemo(() => {
    if (activeView === 'directors' && worstRatedDirectors.length > 0) {
      return worstRatedDirectors;
    }

    return [...currentList]
      .filter((p) => p.count >= 2 && p.avgRating != null)
      .sort((a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0));
  }, [activeView, currentList, worstRatedDirectors]);

  const allEmpty =
    topDirectors.length === 0 &&
    topActors.length === 0 &&
    topWriters.length === 0 &&
    topAuthors.length === 0 &&
    topCrew.length === 0;

  if (allEmpty) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="text-lg font-semibold text-white">{translateUi("kisi_istatistikleri_7423bd5")}</h3>
        <p className="text-sm text-white/40">
          {translateUi("veri_yok_henuz_yonetmen_oyuncu_bilgisi_710bbc8")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{translateUi("kisi_istatistikleri_7423bd5")}</h3>
          <p className="text-sm text-white/50">{translateUi("yonetmen_oyuncu_ve_yazar_bazli_analizler_9ddf03d")}</p>
        </div>
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeView === tab.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PersonListCard title={translateUi("en_cok_gorulenler_d460a08")} data={currentList} emptyText={translateUi("veri_yok_84eb31e")} />
        <PersonListCard
          title={translateUi("en_begenilenler_ee552c4")}
          data={bestRatedList}
          emptyText={translateUi("min_2_icerik_gerekiyor_abf171f")}
        />
        <PersonListCard
          title={translateUi("en_az_begenilenler_90032b5")}
          data={worstRatedList}
          emptyText={translateUi("min_2_icerik_gerekiyor_abf171f")}
        />
      </div>
    </div>
  );
}
