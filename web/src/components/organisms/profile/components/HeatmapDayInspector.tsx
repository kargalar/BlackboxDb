'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { SnakeCasedContentItem } from '../StatsTabTypes';
import { normalizeTitle, getContentTypeName } from '../statsTabUtils';
import { getPosterUrl } from '@/lib/image-utils';
import { Calendar, X, Star, Info } from 'lucide-react';

interface DayActivityInspectorProps {
  selectedDay?: string | null;
  formattedDate: string;
  items: SnakeCasedContentItem[];
  onClearDay: () => void;
  t: any;
}

export function DayActivityInspector({
  selectedDay,
  formattedDate,
  items,
  onClearDay,
  t,
}: DayActivityInspectorProps) {
  if (!selectedDay) {
    return (
      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-white/40 text-xs">
        <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
        <span>{t('clickDayHint')}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-400" />
          <h4 className="text-sm font-semibold text-white">
            {t('selectedDayActivities', { date: formattedDate })}
          </h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium">
            {t('itemsCount', { count: items.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={onClearDay}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>{t('clearSelection')}</span>
        </button>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((item, index) => {
            const rawType = getContentTypeName(item);
            const typeSlug = rawType.toLowerCase();
            const href = item.id ? `/content/${typeSlug}/${item.id}` : '#';
            const poster = item.posterUrl ? getPosterUrl.card(item.posterUrl) : null;
            const title = normalizeTitle(item);

            return (
              <Link
                key={`${item.id ?? title}-${index}`}
                href={href as any}
                className="flex items-center gap-3 p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-violet-500/30 transition-all group"
              >
                <div className="w-10 h-14 rounded bg-white/5 flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={title}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-white/30 text-xs">🎬</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
                    {title}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                    {contentTypeLabel(rawType, t)}
                  </div>
                </div>

                {item.user_rating && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20 flex-shrink-0">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>{item.user_rating}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-white/40">
          {t('noContentThisDay')}
        </div>
      )}
    </div>
  );
}

function contentTypeLabel(type: string, t: any): string {
  if (type === 'MOVIE') return t('contentTypes.MOVIE');
  if (type === 'TV') return t('contentTypes.TV');
  if (type === 'GAME') return t('contentTypes.GAME');
  if (type === 'BOOK') return t('contentTypes.BOOK');
  if (type === 'MUSIC') return t('contentTypes.MUSIC');
  return t('contentTypes.DEFAULT');
}

