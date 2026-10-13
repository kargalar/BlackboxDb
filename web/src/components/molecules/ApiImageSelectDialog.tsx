'use client';

/**
 * ApiImageSelectDialog
 *
 * API kaynaklarından (TMDB, IGDB, Google Books) poster ve backdrop
 * görselleri çekip grid olarak gösteren diyalog.
 * Kullanıcı bir görsele tıklayarak seçim yapar.
 */

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Loader2, ImageIcon } from 'lucide-react';
import { apolloClient } from '@/lib/apollo-client';
import {
  FETCH_CONTENT_IMAGES,
  type ContentImagesData,
  type ContentImageOption,
} from '@/services/graphql/admin/adminAutoFill';

type ImageCategory = 'posters' | 'backdrops';

interface ApiImageSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  /** Hangi tür görsel seçilecek: poster veya backdrop */
  category: ImageCategory;
  /** API kaynağı: tmdb_movie | tmdb_tv | igdb | googlebooks */
  source: string;
  /** Kaynak ID (TMDB ID, IGDB ID, Google Books volumeId) */
  sourceId: string;
  /** Dialog başlığı */
  title?: string;
}

export default function ApiImageSelectDialog({
  isOpen,
  onClose,
  onSelect,
  category,
  source,
  sourceId,
  title,
}: ApiImageSelectDialogProps) {
  const [images, setImages] = useState<ContentImageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceLabel = getSourceLabel(source);
  const categoryLabel = category === 'posters' ? 'Poster' : 'Backdrop';
  const dialogTitle = title || `${sourceLabel} — ${categoryLabel} Seç`;

  const fetchImages = useCallback(async () => {
    if (!sourceId || !source) return;

    setLoading(true);
    setError(null);
    console.log(`🖼️ [ApiImageSelect] Fetching ${category} from ${source}: ${sourceId}`);

    try {
      const { data } = await apolloClient.query<ContentImagesData>({
        query: FETCH_CONTENT_IMAGES,
        variables: { sourceId, source },
        fetchPolicy: 'network-only',
      });

      const items = data?.fetchContentImages?.[category] || [];
      setImages(items);
      console.log(`✅ [ApiImageSelect] Loaded ${items.length} ${category}`);

      if (items.length === 0) {
        setError(`Bu içerik için ${categoryLabel.toLowerCase()} bulunamadı.`);
      }
    } catch (err: any) {
      console.error('❌ [ApiImageSelect] Fetch failed:', err);
      setError('Görseller yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [sourceId, source, category, categoryLabel]);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    } else {
      setImages([]);
      setError(null);
    }
  }, [isOpen, fetchImages]);

  const handleSelect = (url: string) => {
    console.log(`🎯 [ApiImageSelect] Selected: ${url.substring(0, 60)}...`);
    onSelect(url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-surface-raised rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${getSourceColor(source)}`}
            >
              {getSourceIcon(source)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dialogTitle}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bir görsel seçmek için tıklayın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sourceLabel} görselleri yükleniyor...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ImageIcon size={32} className="text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            </div>
          )}

          {!loading && !error && images.length > 0 && (
            <div
              className={`grid gap-4 ${
                category === 'posters'
                  ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              }`}
            >
              {images.map((img, index) => (
                <button
                  key={`${img.url}-${index}`}
                  onClick={() => handleSelect(img.url)}
                  className="group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  <div
                    className={`relative ${
                      category === 'posters' ? 'aspect-[2/3]' : 'aspect-video'
                    } bg-gray-100 dark:bg-gray-800`}
                  >
                    <Image
                      src={img.url}
                      alt={`${categoryLabel} ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes={
                        category === 'posters'
                          ? '(max-width: 640px) 33vw, 20vw'
                          : '(max-width: 640px) 100vw, 33vw'
                      }
                      unoptimized
                    />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                      Seç
                    </div>
                  </div>

                  {/* Info badge */}
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                    <span className="text-[10px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded">
                      {img.width}×{img.height}
                    </span>
                    {img.language && (
                      <span className="text-[10px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded uppercase">
                        {img.language}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {images.length > 0 ? `${images.length} görsel bulundu` : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function getSourceLabel(source: string): string {
  if (source.startsWith('tmdb')) return 'TMDB';
  if (source === 'igdb') return 'IGDB';
  if (source === 'googlebooks') return 'Google Books';
  return source.toUpperCase();
}

function getSourceColor(source: string): string {
  if (source.startsWith('tmdb')) return 'bg-emerald-600';
  if (source === 'igdb') return 'bg-purple-600';
  if (source === 'googlebooks') return 'bg-blue-600';
  return 'bg-gray-600';
}

function getSourceIcon(source: string): string {
  if (source.startsWith('tmdb')) return '🎬';
  if (source === 'igdb') return '🎮';
  if (source === 'googlebooks') return '📚';
  return '🖼️';
}
