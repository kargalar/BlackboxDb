'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Route } from 'next';
import { useTranslations } from 'next-intl';
import {
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Music,
  LayoutGrid,
  Clock,
  TrendingUp,
  HeartCrack,
  Flame,
  Gamepad,
} from 'lucide-react';

import {
  getMostAbandonedContent,
  getLongestPlaytimeContent,
  getMostConsumedContent,
} from '@/services/graphql/dynamicLists';
import type { UnifiedContent } from '@/types/unified-content';
import { PosterCard } from '@/components/atoms/PosterCard';

type ContentTypeFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type ListType = 'abandoned' | 'playtime' | 'consumed';

const CONTENT_FILTERS = [
  {
    key: 'all' as const,
    icon: <LayoutGrid size={16} />,
    label: 'Tümü',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
  },
  {
    key: 1 as const,
    icon: <Film size={16} />,
    label: 'Film',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  {
    key: 2 as const,
    icon: <Tv size={16} />,
    label: 'Dizi',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    key: 3 as const,
    icon: <Gamepad2 size={16} />,
    label: 'Oyun',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    key: 4 as const,
    icon: <BookOpen size={16} />,
    label: 'Kitap',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  {
    key: 5 as const,
    icon: <Music size={16} />,
    label: 'Müzik',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
];

const LIST_TYPES = [
  {
    key: 'consumed' as const,
    icon: <Flame size={16} />,
    label: 'En Çok Tüketilenler',
    desc: 'Topluluk tarafından en çok bitirilen içerikler',
  },
  {
    key: 'playtime' as const,
    icon: <Clock size={16} />,
    label: 'En Çok Vakit Harcananlar',
    desc: 'Toplamda en uzun süre geçirilen içerikler',
  },
  {
    key: 'abandoned' as const,
    icon: <HeartCrack size={16} />,
    label: 'En Çok Yarıda Bırakılanlar',
    desc: 'Başlanıp en çok yarım bırakılan içerikler',
  },
];

export default function DynamicListsPage() {
  const [contentFilter, setContentFilter] = useState<ContentTypeFilter>('all');
  const [listType, setListType] = useState<ListType>('consumed');
  const [contents, setContents] = useState<UnifiedContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const contentTypeId = contentFilter === 'all' ? undefined : contentFilter;

      let res;
      if (listType === 'abandoned') {
        res = await getMostAbandonedContent(contentTypeId, 30);
      } else if (listType === 'playtime') {
        res = await getLongestPlaytimeContent(contentTypeId, 30);
      } else if (listType === 'consumed') {
        res = await getMostConsumedContent(contentTypeId, 30);
      }

      if (res?.data) {
        setContents(res.data);
      } else {
        setContents([]);
      }
      setLoading(false);
    }

    loadData();
  }, [contentFilter, listType]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <TrendingUp size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Dinamik Listeler</h1>
          <p className="text-white/50 mt-1">
            Platform genelindeki topluluk istatistiklerine dayalı otomatik listeler
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Content Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {CONTENT_FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setContentFilter(filter.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl transition-all duration-200 font-medium ${
                contentFilter === filter.key
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* List Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {LIST_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => setListType(type.key)}
            className={`flex flex-col items-start p-5 rounded-2xl transition-all duration-200 border text-left ${
              listType === type.key
                ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/10'
                : 'bg-surface-page border-gray-800/60 hover:border-gray-700 hover:bg-gray-900/50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                listType === type.key ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {type.icon}
            </div>
            <h3
              className={`font-semibold mb-1 ${listType === type.key ? 'text-white' : 'text-gray-300'}`}
            >
              {type.label}
            </h3>
            <p className="text-sm text-gray-500">{type.desc}</p>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <Gamepad size={48} className="text-white/20 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Gösterilecek içerik yok</h2>
          <p className="text-white/40">Bu kriterlere uygun bir içerik henüz bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {contents.map((content) => {
            const typeSlug =
              content.contentTypeId === 1
                ? 'movie'
                : content.contentTypeId === 2
                  ? 'tv'
                  : content.contentTypeId === 3
                    ? 'game'
                    : 'book';
            return (
              <Link
                key={content.id}
                href={`/content/${typeSlug}/${content.id}` as Route}
                className="block group"
              >
                <PosterCard
                  src={content.posterUrl}
                  alt={content.title || 'Unknown'}
                  hoverZoom
                  useNextImage={false}
                />
                <div className="mt-2 text-sm font-medium text-white truncate group-hover:text-violet-400 transition-colors">
                  {content.title}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
