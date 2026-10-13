'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import type { AdminContent } from '@/services/graphql/admin';
import ContentEditForm from './ContentEditForm';
import { getProfileUrl } from '@/lib/image-utils';
import { useTranslations, useLocale } from 'next-intl';

const TYPE_META: Record<number, { icon: string; slug: string }> = {
  1: { icon: '🎬', slug: 'movie' },
  2: { icon: '📺', slug: 'tv' },
  3: { icon: '🎮', slug: 'game' },
  4: { icon: '📚', slug: 'book' },
  5: { icon: '🎵', slug: 'music' },
};

interface ContentListItemProps {
  content: AdminContent;
  isEditing: boolean;
  editData: Partial<AdminContent>;
  onEditDataChange: (data: Partial<AdminContent>) => void;
  onStartEdit: (id: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onShowHistory: () => void;
  saving?: boolean;
}

export default function ContentListItem({
  content,
  isEditing,
  editData,
  onEditDataChange,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onShowHistory,
  saving,
}: ContentListItemProps) {
  const t = useTranslations('AdminContentPage');
  const locale = useLocale();

  const typeId = Number(content.contentTypeId);
  const meta = TYPE_META[typeId] || { icon: '📄', slug: content.contentTypeSlug || 'movie' };
  const contentHref = `/content/${content.contentTypeSlug || meta.slug}/${content.id}` as Route;
  const labelKey =
    typeId === 1
      ? 'types.movie'
      : typeId === 2
        ? 'types.tv'
        : typeId === 3
          ? 'types.game'
          : typeId === 4
            ? 'types.book'
            : typeId === 5
              ? 'types.music'
              : 'types.unknown';
  const label = t(labelKey);

  // Parse specific fields for richer UI
  let castArr: any[] = [];
  if (content.cast) {
    try {
      castArr = typeof content.cast === 'string' ? JSON.parse(content.cast) : [];
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative group overflow-hidden bg-surface-panel border border-white/5 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      {isEditing ? (
        <div className="p-6">
          <ContentEditForm
            editData={editData}
            onEditDataChange={onEditDataChange}
            onSave={onSave}
            onCancel={onCancelEdit}
            saving={saving}
          />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 p-5">
          {/* Poster */}
          <Link
            href={contentHref}
            className="w-full sm:w-48 h-72 sm:h-72 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative shadow-[0_8px_30px_rgb(0,0,0,0.5)] group-hover:shadow-[0_8px_30px_rgb(139,92,246,0.3)] transition-shadow"
          >
            {content.posterUrl ? (
              <Image
                src={content.posterUrl}
                alt={content.title}
                width={192}
                height={288}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl bg-white/10">
                {meta.icon}
              </div>
            )}
            <div className="absolute top-2 left-2 px-2.5 py-1 text-xs font-bold rounded-md bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-sm flex items-center gap-1.5">
              <span>{meta.icon}</span> {label}
            </div>
          </Link>

          {/* Content body */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <Link href={contentHref} className="block mb-4">
                {/* Title row */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white group-hover:text-violet-400 transition-colors line-clamp-2">
                      {content.title}
                      {content.releaseDate && (
                        <span className="text-white/40 font-medium text-lg ml-2 border-l border-white/20 pl-2">
                          {new Date(content.releaseDate).getFullYear()}
                        </span>
                      )}
                    </h3>
                    {content.originalTitle && content.originalTitle !== content.title && (
                      <p className="text-sm text-white/50 italic mt-0.5">{content.originalTitle}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono text-white/30 bg-white/5 px-2 py-1 rounded-md">
                      {content.id}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {content.description && (
                  <p className="text-[15px] leading-relaxed text-white/60 line-clamp-3 mb-4">
                    {content.description}
                  </p>
                )}
              </Link>

              {/* Cast Preview */}
              {castArr.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
                    {t('labels.cast')}
                  </h4>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {castArr.slice(0, 6).map((actor, idx) => (
                      <div
                        key={actor.id || idx}
                        className="group/actor flex items-center bg-white/5 rounded-full pr-3 pl-1 py-1 border border-white/5 hover:bg-white/10 transition-colors cursor-default"
                        title={actor.character ? `${actor.name} as ${actor.character}` : actor.name}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 mr-2 border border-white/10 shadow-sm">
                          {actor.profileUrl ? (
                            <Image
                              src={getProfileUrl.avatar(actor.profileUrl)}
                              alt={actor.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover group-hover/actor:scale-110 transition-transform duration-300"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px]">
                              👤
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col justify-center max-w-[100px]">
                          <span className="text-xs font-medium text-white/90 truncate">
                            {actor.name}
                          </span>
                          {actor.character && (
                            <span className="text-[10px] text-white/40 truncate">
                              {actor.character}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {castArr.length > 6 && (
                      <div className="w-8 h-8 rounded-full bg-white/5 text-white/50 flex items-center justify-center text-xs font-medium border border-white/10">
                        +{castArr.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Details tags */}
              <ContentDetails content={content} t={t} locale={locale} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => onStartEdit(content.id)}
                className="px-5 py-2 rounded-xl bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white font-medium text-sm transition-all border border-violet-500/30 shadow-[0_0_15px_rgb(139,92,246,0.1)]"
              >
                {t('actions.edit')}
              </button>
              <button
                onClick={onShowHistory}
                className="px-5 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-white font-medium text-sm transition-all border border-cyan-500/20"
              >
                {t('actions.history')}
              </button>
              <button
                onClick={() => onDelete(content.id)}
                className="px-5 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white font-medium text-sm transition-all border border-rose-500/20"
              >
                {t('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Color map for detail label categories ─── */

const LABEL_COLORS: Record<string, string> = {
  // Dates — cyan
  'Yayın Tarihi': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'İlk Yayın': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Son Yayın': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Eklenme: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  // Duration / Size — blue
  Süre: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Ort. Süre': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Sayfa: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  // Genres / Tags — violet
  Türler: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Temalar: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Mood: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  // People — amber
  Yönetmen: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Ekip: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Yazar: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  // Money — emerald
  Bütçe: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Hasılat: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  // Status — rose
  Durum: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Yapımda: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Yaş Sınırı': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  // Series — teal
  Sezon: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Bölüm: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Dizi Türü': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  // Game — orange
  Platformlar: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Oyun Modları': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Perspektif: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  // Companies — indigo
  Şirketler: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Franchise: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  // Misc — pink
  Fragman: 'bg-green-500/10 text-green-400 border-green-500/20',
  İnceleme: 'bg-green-500/10 text-green-400 border-green-500/20',
  Oynayış: 'bg-green-500/10 text-green-400 border-green-500/20',
  Diller: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  ISBN: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const DEFAULT_LABEL_COLOR = 'bg-white/5 text-white/60 border-white/10';

/* ─── Detail rows shown below the description ─── */

function ContentDetails({ content, t, locale }: { content: AdminContent; t: any; locale: string }) {
  const details: { labelKey: string; labelRaw: string; value: string }[] = [];

  // Common
  if (content.runtime)
    details.push({ labelKey: 'labels.runtime', labelRaw: 'Süre', value: `${content.runtime} min` });
  if (content.genres?.length)
    details.push({
      labelKey: 'labels.genres',
      labelRaw: 'Türler',
      value: content.genres.map((g) => g.name).join(', '),
    });
  if (content.ageRating)
    details.push({
      labelKey: 'labels.ageRating',
      labelRaw: 'Yaş Sınırı',
      value: content.ageRating.name,
    });

  // Film / Dizi
  if (content.status)
    details.push({ labelKey: 'labels.status', labelRaw: 'Durum', value: content.status });
  if (content.budget)
    details.push({
      labelKey: 'labels.budget',
      labelRaw: 'Bütçe',
      value: `$${Number(content.budget).toLocaleString()}`,
    });
  if (content.revenue)
    details.push({
      labelKey: 'labels.revenue',
      labelRaw: 'Hasılat',
      value: `$${Number(content.revenue).toLocaleString()}`,
    });

  // Dizi
  if (content.numberOfSeasons)
    details.push({
      labelKey: 'labels.seasons',
      labelRaw: 'Sezon',
      value: String(content.numberOfSeasons),
    });
  if (content.numberOfEpisodes)
    details.push({
      labelKey: 'labels.episodes',
      labelRaw: 'Bölüm',
      value: String(content.numberOfEpisodes),
    });
  if (content.averageDuration)
    details.push({
      labelKey: 'labels.avgRuntime',
      labelRaw: 'Ort. Süre',
      value: `${content.averageDuration} min`,
    });
  if (content.tvType)
    details.push({ labelKey: 'labels.tvType', labelRaw: 'Dizi Türü', value: content.tvType });
  if (content.firstAirDate)
    details.push({
      labelKey: 'labels.firstAir',
      labelRaw: 'İlk Yayın',
      value: content.firstAirDate,
    });
  if (content.inProduction !== undefined && content.inProduction !== null)
    details.push({
      labelKey: 'labels.inProduction',
      labelRaw: 'Yapımda',
      value: content.inProduction ? t('yes') : t('no'),
    });

  // Kitap
  if (content.authors) {
    try {
      const parsed = JSON.parse(content.authors);
      if (Array.isArray(parsed)) {
        details.push({ labelKey: 'labels.writer', labelRaw: 'Yazar', value: parsed.join(', ') });
      } else {
        details.push({ labelKey: 'labels.writer', labelRaw: 'Yazar', value: content.authors });
      }
    } catch {
      details.push({ labelKey: 'labels.writer', labelRaw: 'Yazar', value: content.authors });
    }
  }
  if (content.isbn)
    details.push({ labelKey: 'labels.isbn', labelRaw: 'ISBN', value: content.isbn });
  if (content.pageCount)
    details.push({ labelKey: 'labels.pages', labelRaw: 'Sayfa', value: String(content.pageCount) });

  // Oyun
  if (content.gameModes?.length)
    details.push({
      labelKey: 'labels.gameModes',
      labelRaw: 'Oyun Modları',
      value: content.gameModes.map((m) => m.name).join(', '),
    });
  if (content.gameEngines?.length)
    details.push({
      labelKey: 'labels.gameEngines',
      labelRaw: 'Oyun Motorları',
      value: content.gameEngines.map((m) => m.name).join(', '),
    });
  if (content.platforms?.length)
    details.push({
      labelKey: 'labels.platforms',
      labelRaw: 'Platformlar',
      value: content.platforms.map((p) => p.name).join(', '),
    });
  if (content.perspectives?.length)
    details.push({
      labelKey: 'labels.perspective',
      labelRaw: 'Perspektif',
      value: content.perspectives.map((p) => p.name).join(', '),
    });
  if (content.themes?.length)
    details.push({
      labelKey: 'labels.themes',
      labelRaw: 'Temalar',
      value: content.themes.map((t) => t.name).join(', '),
    });
  if (content.moods?.length)
    details.push({
      labelKey: 'labels.mood',
      labelRaw: 'Mood',
      value: content.moods.map((m) => m.name).join(', '),
    });

  // Şirketler
  if (content.companies?.length) {
    const companyNames = content.companies
      .map((c) => c.company?.name)
      .filter(Boolean)
      .join(', ');
    if (companyNames)
      details.push({ labelKey: 'labels.companies', labelRaw: 'Şirketler', value: companyNames });
  }

  // Crew (Ekip — Yönetmen vb.)
  if (content.crew) {
    try {
      const crewArr = typeof content.crew === 'string' ? JSON.parse(content.crew) : [];
      const directors = crewArr.filter((c: any) => c.job === 'Director' || c.role === 'Director');
      if (directors.length > 0) {
        details.push({
          labelKey: 'labels.director',
          labelRaw: 'Yönetmen',
          value: directors.map((d: any) => d.name).join(', '),
        });
      }
      const otherCrew = crewArr.filter((c: any) => c.job !== 'Director' && c.role !== 'Director');
      if (otherCrew.length > 0) {
        const names = otherCrew
          .slice(0, 5)
          .map((c: any) => `${c.name} (${c.job || c.role})`)
          .join(', ');
        details.push({
          labelKey: 'labels.crew',
          labelRaw: 'Ekip',
          value: otherCrew.length > 5 ? `${names} +${otherCrew.length - 5}` : names,
        });
      }
    } catch {
      /* ignore */
    }
  }

  // Diller
  if (content.languages?.length)
    details.push({
      labelKey: 'labels.languages',
      labelRaw: 'Diller',
      value: content.languages.join(', '),
    });

  // Franchise
  if (content.franchiseName)
    details.push({
      labelKey: 'labels.franchise',
      labelRaw: 'Franchise',
      value: content.franchiseName,
    });

  // Trailer
  if (content.trailerUrl)
    details.push({ labelKey: 'labels.trailer', labelRaw: 'Fragman', value: '✓' });
  if (content.reviewVideoUrl)
    details.push({ labelKey: 'labels.review', labelRaw: 'İnceleme', value: '✓' });
  if (content.gameplayVideoUrl)
    details.push({ labelKey: 'labels.gameplay', labelRaw: 'Oynayış', value: '✓' });

  // Oluşturulma
  if (content.createdAt) {
    details.push({
      labelKey: 'labels.added',
      labelRaw: 'Eklenme',
      value: new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(content.createdAt)),
    });
  }

  if (details.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {details.map((d) => {
        const color = LABEL_COLORS[d.labelRaw] || DEFAULT_LABEL_COLOR;
        return (
          <span
            key={d.labelRaw}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border ${color}`}
          >
            <span className="font-semibold opacity-70">{t(d.labelKey)}:</span>
            <span className="opacity-100">{d.value}</span>
          </span>
        );
      })}
    </div>
  );
}
