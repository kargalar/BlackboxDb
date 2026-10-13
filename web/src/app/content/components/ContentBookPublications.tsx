'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { BookPublication } from '@/types/unified-content';
import { BookOpen, Tablet, Headphones, Sparkles, Check, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContentBookPublicationsProps {
  publications: BookPublication[];
  primaryPublicationId?: number | null;
  userPublicationId?: number | null;
  canSelect: boolean;
  onSelectPublication: (publicationId: number) => Promise<void>;
}

function formatPublishedDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
}

function getFormatBadge(format?: string | null) {
  if (!format) return null;
  const lower = format.toLowerCase();
  if (lower.includes('audio') || lower.includes('sesli')) {
    return {
      label: 'Sesli Kitap',
      icon: Headphones,
      color: 'text-purple-300 bg-purple-500/20 border-purple-500/30',
    };
  }
  if (lower.includes('ebook') || lower.includes('e-kitap') || lower.includes('kindle')) {
    return {
      label: 'E-Kitap',
      icon: Tablet,
      color: 'text-sky-300 bg-sky-500/20 border-sky-500/30',
    };
  }
  if (lower.includes('hard') || lower.includes('ciltli')) {
    return {
      label: 'Ciltli',
      icon: Sparkles,
      color: 'text-amber-300 bg-amber-500/20 border-amber-500/30',
    };
  }
  if (lower.includes('pocket') || lower.includes('cep')) {
    return {
      label: 'Cep Boy',
      icon: BookOpen,
      color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30',
    };
  }
  return {
    label: 'Karton Kapak',
    icon: BookOpen,
    color: 'text-gray-300 bg-white/10 border-white/20',
  };
}

export default function ContentBookPublications({
  publications,
  primaryPublicationId,
  userPublicationId,
  canSelect,
  onSelectPublication,
}: ContentBookPublicationsProps) {
  const [pendingPublicationId, setPendingPublicationId] = useState<number | null>(null);
  const [localUserPublicationId, setLocalUserPublicationId] = useState<number | null>(
    userPublicationId ?? null
  );

  useEffect(() => {
    setLocalUserPublicationId(userPublicationId ?? null);
  }, [userPublicationId]);

  const sortedPublications = useMemo(
    () =>
      [...publications].sort((a, b) => {
        if (a.id === localUserPublicationId) return -1;
        if (b.id === localUserPublicationId) return 1;
        if (a.id === primaryPublicationId) return -1;
        if (b.id === primaryPublicationId) return 1;
        if (a.isOriginal && !b.isOriginal) return -1;
        if (!a.isOriginal && b.isOriginal) return 1;
        if ((b.consumeCount ?? 0) !== (a.consumeCount ?? 0)) {
          return (b.consumeCount ?? 0) - (a.consumeCount ?? 0);
        }
        return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      }),
    [localUserPublicationId, primaryPublicationId, publications]
  );

  const handleSelect = async (publicationId: number) => {
    if (!canSelect || pendingPublicationId || publicationId === localUserPublicationId) return;

    const previousPublicationId = localUserPublicationId;
    setLocalUserPublicationId(publicationId);
    setPendingPublicationId(publicationId);

    try {
      await onSelectPublication(publicationId);
      toast.success('Okuduğunuz baskı güncellendi');
    } catch (error) {
      setLocalUserPublicationId(previousPublicationId);
      toast.error('Baskı seçimi kaydedilemedi');
      throw error;
    } finally {
      setPendingPublicationId(null);
    }
  };

  if (!sortedPublications || sortedPublications.length === 0) {
    return null;
  }

  return (
    <section className="glass-card p-6 rounded-2xl mb-6 border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>Baskılar ve Edisyonlar</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium">
              {sortedPublications.length} Farklı Basım
            </span>
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Kitabın farklı yayınevleri, çevirmenler ve formatlardaki edisyonları.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedPublications.map((publication) => {
          const isPrimary = publication.id === primaryPublicationId;
          const isUserPublication = publication.id === localUserPublicationId;
          const formatBadge = getFormatBadge(publication.format);
          const publishedDateFormatted = formatPublishedDate(publication.publishedDate);

          return (
            <article
              key={publication.id}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                isUserPublication
                  ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40'
              }`}
            >
              <div className="p-4 flex gap-4">
                {/* Kapak Görseli */}
                <div className="w-24 aspect-[2/3] rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10 shadow-md relative group">
                  {publication.coverUrl ? (
                    <Image
                      src={publication.coverUrl}
                      alt={publication.title || 'Kitap kapağı'}
                      fill
                      sizes="96px"
                      unoptimized
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-xs text-white/30 p-2 text-center">
                      <BookOpen className="w-6 h-6 mb-1 opacity-40" />
                      <span>Kapak Yok</span>
                    </div>
                  )}
                </div>

                {/* Edisyon Detayları */}
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Rozetler */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {isUserPublication && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2 py-0.5">
                          <Check className="w-3 h-3" /> Okuduğun Baskı
                        </span>
                      )}
                      {isPrimary && !isUserPublication && (
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-violet-500/20 border border-violet-400/30 text-violet-300 px-2 py-0.5">
                          Popüler
                        </span>
                      )}
                      {publication.isOriginal && (
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 px-2 py-0.5">
                          Orijinal
                        </span>
                      )}
                      {formatBadge && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-md border px-2 py-0.5 ${formatBadge.color}`}
                        >
                          <formatBadge.icon className="w-3 h-3" />
                          {formatBadge.label}
                        </span>
                      )}
                      {publication.isAbridged && (
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300 px-2 py-0.5">
                          Kısaltılmış
                        </span>
                      )}
                      {publication.editionType && (
                        <span className="text-[10px] font-medium rounded-md bg-white/5 border border-white/10 text-white/70 px-2 py-0.5 truncate max-w-[130px]">
                          {publication.editionType}
                        </span>
                      )}
                    </div>

                    {/* Yayınevi */}
                    {publication.publisher?.name ? (
                      <p className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        <span className="truncate">{publication.publisher.name}</span>
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-white/90 truncate">
                        {publication.title || 'Baskı'}
                      </p>
                    )}

                    {/* Çevirmenler */}
                    {(publication.translators || []).length > 0 && (
                      <p className="mt-1 text-xs text-white/60 flex items-start gap-1">
                        <User className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">
                          <span className="text-white/40">Çeviri: </span>
                          {(publication.translators || []).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Alt Meta (Sayfa, Yıl, ISBN) */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
                    {publication.pageCount && <span>{publication.pageCount} sayfa</span>}
                    {publishedDateFormatted && <span>{publishedDateFormatted}</span>}
                    {publication.language && (
                      <span className="uppercase font-medium text-white/60">
                        {publication.language}
                      </span>
                    )}
                    {publication.isbn && (
                      <span className="truncate max-w-[110px]" title={`ISBN: ${publication.isbn}`}>
                        ISBN: {publication.isbn}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Alt Eylem Barı */}
              <div className="border-t border-white/5 px-4 py-2.5 bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="text-xs text-white/60 flex items-center gap-1">
                  {publication.averageRating ? (
                    <>
                      <span className="font-bold text-amber-400">
                        ★ {publication.averageRating.toFixed(1)}
                      </span>
                      <span className="text-white/30">({publication.ratingCount || 0})</span>
                    </>
                  ) : (
                    <span className="text-white/30">Puanlanmamış</span>
                  )}
                </div>

                {canSelect ? (
                  <button
                    type="button"
                    disabled={pendingPublicationId === publication.id || isUserPublication}
                    onClick={() => handleSelect(publication.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                      isUserPublication
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 cursor-default'
                        : 'bg-white/10 text-white/80 hover:bg-violet-600 hover:text-white border border-white/10 active:scale-95'
                    } disabled:opacity-70`}
                  >
                    {isUserPublication ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Seçili Baskı</span>
                      </>
                    ) : (
                      <span>Bu Baskıyı Okudum</span>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] text-white/40">Giriş yapın</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
