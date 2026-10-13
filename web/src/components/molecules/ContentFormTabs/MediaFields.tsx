'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import ImageUploadField, { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import ApiImageSelectDialog from '@/components/molecules/ApiImageSelectDialog';
import ScreenshotSelectDialog from '@/components/molecules/ScreenshotSelectDialog';
import ImageCropModal from '@/components/molecules/ImageCropModal';
import { getImageSource, getImageObjectPosition } from '@/lib/image-focus';
import { apolloClient } from '@/lib/apollo-client';
import toast from 'react-hot-toast';
import { SEARCH_TMDB, SEARCH_IGDB_GAMES } from '@/services/graphql/admin';

interface MediaFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
  contentTypeId: number;
  onPendingPosterChange?: (pending: PendingImageUpload | null) => void;
  onPendingBackdropChange?: (pending: PendingImageUpload | null) => void;
}

// ─── Helpers ───
function getApiSourceLabel(source?: string): string {
  if (!source) return '';
  if (source.startsWith('tmdb')) return 'TMDB';
  if (source === 'igdb') return 'IGDB';
  if (source === 'googlebooks') return 'Google Books';
  return source.toUpperCase();
}

function getCurrentImageSource(formData: any, contentTypeId?: number) {
  if (contentTypeId === 1 || contentTypeId === 2) {
    const source = contentTypeId === 2 ? 'tmdb_tv' : 'tmdb_movie';
    const sourceId = formData.tmdbId
      ? String(formData.tmdbId)
      : formData.autoFillSource?.startsWith('tmdb')
        ? formData.autoFillSourceId || ''
        : '';

    return {
      source,
      sourceId,
    };
  }

  if (contentTypeId === 3) {
    const source = 'igdb';
    const sourceId = formData.igdbId
      ? String(formData.igdbId)
      : formData.autoFillSource === 'igdb'
        ? formData.autoFillSourceId || ''
        : '';

    return {
      source,
      sourceId,
    };
  }

  return {
    source: formData.autoFillSource || '',
    sourceId: formData.autoFillSourceId || '',
  };
}

export function MediaFields({
  formData,
  setFormData,
  contentTypeId,
  onPendingPosterChange,
  onPendingBackdropChange,
}: MediaFieldsProps) {
  // ─── API Image Select Dialog state ───
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogCategory, setImageDialogCategory] = useState<'posters' | 'backdrops'>(
    'posters'
  );
  const [imageDialogSource, setImageDialogSource] = useState<string>('');
  const [imageDialogSourceId, setImageDialogSourceId] = useState<string>('');
  const [isResolvingImageSource, setIsResolvingImageSource] = useState(false);

  // ─── API Image Crop state ───
  const [apiCropFile, setApiCropFile] = useState<File | null>(null);

  // ─── Screenshot Select Dialog state ───
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);

  // ─── Local Files Queue for Cropping ───
  const [pendingLocalFiles, setPendingLocalFiles] = useState<
    { file: File; type: 'posters' | 'backdrops' }[]
  >([]);

  const isTmdbContentType = contentTypeId === 1 || contentTypeId === 2;
  const isIgdbContentType = contentTypeId === 3;
  const currentImageSource = getCurrentImageSource(formData, contentTypeId);
  const hasImageSource = !!currentImageSource.source && !!currentImageSource.sourceId;
  const apiSourceLabel = getApiSourceLabel(currentImageSource.source);

  // Screenshots from formData (for "select from screenshots" feature)
  const screenshotOptions = (formData.screenshots || [])
    .filter((s: any) => s.imageUrl && !s.imageUrl.startsWith('blob:'))
    .map((s: any) => ({
      imageUrl: s.imageUrl,
      id: s.id,
      seasonNumber: s.seasonNumber,
    }));
  const hasScreenshots = screenshotOptions.length > 0;

  // ─── Highest Voted Media Logic ───
  const posterScores = formData.images
    ? formData.images
        .filter((img: any) => img.type === 'poster')
        .map((img: any) => img.upvoteCount - img.downvoteCount)
    : [];
  const highestPosterScore = posterScores.length > 0 ? Math.max(...posterScores) : 0;

  const backdropScores = formData.images
    ? formData.images
        .filter((img: any) => img.type === 'backdrop')
        .map((img: any) => img.upvoteCount - img.downvoteCount)
    : [];
  const highestBackdropScore = backdropScores.length > 0 ? Math.max(...backdropScores) : 0;

  const bestPoster = formData.images?.find(
    (img: any) =>
      img.type === 'poster' &&
      img.upvoteCount - img.downvoteCount === highestPosterScore &&
      highestPosterScore > 0
  );
  const bestBackdrop = formData.images?.find(
    (img: any) =>
      img.type === 'backdrop' &&
      img.upvoteCount - img.downvoteCount === highestBackdropScore &&
      highestBackdropScore > 0
  );
  const bestPosterFilePath = bestPoster?.filePath;
  const bestBackdropFilePath = bestBackdrop?.filePath;

  // Auto-select highest voted if enabled
  useEffect(() => {
    if (contentTypeId === 4 || !formData.autoSelectHighestVotedMedia) return;

    setFormData((prev: any) => {
      let changed = false;
      const next = { ...prev };
      if (bestPosterFilePath && prev.posterUrl !== bestPosterFilePath) {
        next.posterUrl = bestPosterFilePath;
        changed = true;
      }
      if (bestBackdropFilePath && prev.backdropUrl !== bestBackdropFilePath) {
        next.backdropUrl = bestBackdropFilePath;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [
    formData.autoSelectHighestVotedMedia,
    bestPosterFilePath,
    bestBackdropFilePath,
    setFormData,
    contentTypeId,
  ]);

  // Books do not support media fields.
  if (contentTypeId === 4) return null;

  const resolveTmdbSource = async () => {
    const source = contentTypeId === 2 ? 'tmdb_tv' : 'tmdb_movie';
    const existingSourceId =
      formData.tmdbId || formData.autoFillSource?.startsWith('tmdb')
        ? String(formData.tmdbId || formData.autoFillSourceId || '')
        : '';

    if (existingSourceId) {
      return { source, sourceId: existingSourceId };
    }

    const title = formData.title?.trim();
    if (!title) {
      throw new Error('Önce başlık girin.');
    }

    const mediaType = contentTypeId === 2 ? 'tv' : 'movie';
    const { data } = await apolloClient.query<{
      searchTmdb: Array<{ tmdbId: number }>;
    }>({
      query: SEARCH_TMDB,
      variables: { query: title, type: mediaType },
      fetchPolicy: 'network-only',
    });

    const firstMatch = data?.searchTmdb?.[0];
    if (!firstMatch?.tmdbId) {
      throw new Error('TMDB üzerinde eşleşen içerik bulunamadı.');
    }

    const resolvedSourceId = String(firstMatch.tmdbId);
    setFormData((prev: any) => ({
      ...prev,
      tmdbId: firstMatch.tmdbId,
      autoFillSource: source,
      autoFillSourceId: resolvedSourceId,
    }));

    return { source, sourceId: resolvedSourceId };
  };

  const resolveIgdbSource = async () => {
    const source = 'igdb';
    const existingSourceId =
      formData.igdbId || formData.autoFillSource === 'igdb'
        ? String(formData.igdbId || formData.autoFillSourceId || '')
        : '';

    if (existingSourceId) {
      return { source, sourceId: existingSourceId };
    }

    const title = formData.title?.trim();
    if (!title) {
      throw new Error('Önce başlık girin.');
    }

    const { data } = await apolloClient.query<{
      searchIgdbGames: Array<{ sourceId: string }>;
    }>({
      query: SEARCH_IGDB_GAMES,
      variables: { query: title },
      fetchPolicy: 'network-only',
    });

    const firstMatch = data?.searchIgdbGames?.[0];
    if (!firstMatch?.sourceId) {
      throw new Error('IGDB üzerinde eşleşen oyun bulunamadı.');
    }

    const resolvedSourceId = String(firstMatch.sourceId);
    setFormData((prev: any) => ({
      ...prev,
      igdbId: Number(firstMatch.sourceId),
      autoFillSource: source,
      autoFillSourceId: resolvedSourceId,
    }));

    return { source, sourceId: resolvedSourceId };
  };

  const openImageDialog = async (category: 'posters' | 'backdrops') => {
    try {
      setIsResolvingImageSource(true);

      const resolvedSource = isTmdbContentType
        ? await resolveTmdbSource()
        : isIgdbContentType
          ? await resolveIgdbSource()
          : currentImageSource;

      if (!resolvedSource.source || !resolvedSource.sourceId) {
        throw new Error('Görsel kaynağı bulunamadı.');
      }

      setImageDialogCategory(category);
      setImageDialogSource(resolvedSource.source);
      setImageDialogSourceId(resolvedSource.sourceId);
      setImageDialogOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Görseller alınamadı.';
      toast.error(message);
    } finally {
      setIsResolvingImageSource(false);
    }
  };

  const handleImageSelect = async (url: string) => {
    try {
      // Fetch via our Next.js API proxy to bypass CORS restrictions
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        throw new Error(`Proxy fetch failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const fileName = url.split('/').pop() || 'api-image.jpg';
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      setApiCropFile(file);
    } catch (e) {
      console.error('Failed to fetch API image for cropping:', e);
      // Fallback: just use URL if fetch fails
      if (imageDialogCategory === 'posters') {
        setFormData((prev: any) => ({ ...prev, posterUrl: url }));
        onPendingPosterChange?.(null);
      } else {
        setFormData((prev: any) => ({ ...prev, backdropUrl: url }));
        onPendingBackdropChange?.(null);
      }
    }
  };

  const handleApiCropComplete = (croppedBase64: string) => {
    if (imageDialogCategory === 'posters') {
      setFormData((prev: any) => ({ ...prev, posterUrl: croppedBase64 }));
      onPendingPosterChange?.({
        base64: croppedBase64,
        fileName: apiCropFile?.name || 'api-poster.jpg',
        imageType: 'poster',
      });
    } else {
      setFormData((prev: any) => ({ ...prev, backdropUrl: croppedBase64 }));
      onPendingBackdropChange?.({
        base64: croppedBase64,
        fileName: apiCropFile?.name || 'api-backdrop.jpg',
        imageType: 'backdrop',
      });
    }
    setApiCropFile(null);
  };

  // ─── Screenshot → Backdrop selection ───
  const handleScreenshotSelect = async (imageUrl: string) => {
    try {
      // If it's a base64 or data URL, convert directly to File for cropping
      if (imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], 'screenshot-backdrop.jpg', {
          type: blob.type || 'image/jpeg',
        });
        setImageDialogCategory('backdrops');
        setApiCropFile(file);
        return;
      }

      // For remote URLs, fetch via proxy to bypass CORS
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        throw new Error(`Proxy fetch failed: ${res.statusText}`);
      }

      const blob = await res.blob();
      const fileName = imageUrl.split('/').pop() || 'screenshot-backdrop.jpg';
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      setImageDialogCategory('backdrops');
      setApiCropFile(file);
    } catch (e) {
      console.error('Failed to fetch screenshot for backdrop cropping:', e);
      // Fallback: directly use URL as backdrop
      setFormData((prev: any) => ({ ...prev, backdropUrl: imageUrl }));
      onPendingBackdropChange?.(null);
      toast.success('Ekran görüntüsü arkaplan olarak ayarlandı');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">🖼️ Görseller</h4>

          <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <span className="text-xs text-white/70 font-medium">
              En Yüksek Oylu Görseli Otomatik Seç
            </span>
            <div className="relative inline-block w-8 h-4">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={formData.autoSelectHighestVotedMedia}
                onChange={(e) =>
                  setFormData((prev: any) => ({
                    ...prev,
                    autoSelectHighestVotedMedia: e.target.checked,
                  }))
                }
              />
              <div className="w-8 h-4 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-500/50 peer-checked:bg-emerald-500 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Poster */}
          <div className="space-y-2">
            <ImageUploadField
              label="📌 Poster Resmi (2:3)"
              name="posterUrl"
              value={formData.posterUrl}
              onChange={(url) =>
                setFormData((prev: any) => ({
                  ...prev,
                  posterUrl: url,
                  autoSelectHighestVotedMedia: false,
                }))
              }
              onPendingUpload={onPendingPosterChange}
              imageType="poster"
            />
            {(isTmdbContentType || isIgdbContentType || hasImageSource) && (
              <button
                type="button"
                onClick={() => void openImageDialog('posters')}
                disabled={isResolvingImageSource}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-blue-400/50 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <span>🔍</span>
                <span>
                  {isResolvingImageSource && imageDialogCategory === 'posters'
                    ? `${isIgdbContentType ? 'IGDB' : 'TMDB'} aranıyor...`
                    : `${apiSourceLabel || (isIgdbContentType ? 'IGDB' : 'TMDB')} Poster Seç`}
                </span>
              </button>
            )}
          </div>

          {/* Backdrop */}
          <div className="space-y-2">
            <ImageUploadField
              label="🖼️ Arka Plan Resmi"
              name="backdropUrl"
              value={formData.backdropUrl}
              onChange={(url) =>
                setFormData((prev: any) => ({
                  ...prev,
                  backdropUrl: url,
                  images: prev.images?.map((image: any) =>
                    url &&
                    getImageSource(url) === getImageSource(prev.backdropUrl || '') &&
                    image.type === 'backdrop' &&
                    getImageSource(image.filePath) === getImageSource(prev.backdropUrl || '')
                      ? { ...image, filePath: url }
                      : image
                  ),
                  autoSelectHighestVotedMedia: false,
                }))
              }
              onPendingUpload={onPendingBackdropChange}
              imageType="backdrop"
            />
            {(isTmdbContentType || isIgdbContentType || hasImageSource) &&
              currentImageSource.source !== 'googlebooks' && (
                <button
                  type="button"
                  onClick={() => void openImageDialog('backdrops')}
                  disabled={isResolvingImageSource}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-purple-400/50 text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                >
                  <span>🔍</span>
                  <span>
                    {isResolvingImageSource && imageDialogCategory === 'backdrops'
                      ? `${isIgdbContentType ? 'IGDB' : 'TMDB'} aranıyor...`
                      : `${apiSourceLabel || (isIgdbContentType ? 'IGDB' : 'TMDB')} Backdrop Seç`}
                  </span>
                </button>
              )}
            {hasScreenshots && (
              <button
                type="button"
                onClick={() => setScreenshotDialogOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-dashed border-emerald-400/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              >
                <span>📸</span>
                <span>Ekran Görüntülerinden Seç ({screenshotOptions.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Görseller Listesi (Aktif ve Pasifler) */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Tüm Görseller</h4>
            <div className="flex gap-2">
              <label className="cursor-pointer flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                <span>+ Poster Ekle</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files?.length) return;
                    const newFiles = Array.from(e.target.files).map((file) => ({
                      file,
                      type: 'posters' as const,
                    }));
                    setPendingLocalFiles((prev) => [...prev, ...newFiles]);
                    e.target.value = '';
                  }}
                />
              </label>
              <label className="cursor-pointer flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded border border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors">
                <span>+ Backdrop Ekle</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files?.length) return;
                    const newFiles = Array.from(e.target.files).map((file) => ({
                      file,
                      type: 'backdrops' as const,
                    }));
                    setPendingLocalFiles((prev) => [...prev, ...newFiles]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {/* Posterler Listesi */}
          {formData.images &&
            formData.images.filter((img: any) => img.type === 'poster').length > 0 && (
              <div className="mb-6">
                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                  Posterler
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {formData.images
                    .filter((img: any) => img.type === 'poster')
                    .map((img: any, idx: number) => {
                      const isSelected = formData.posterUrl === img.filePath;
                      const score = img.upvoteCount - img.downvoteCount;
                      const isHighestVoted = score === highestPosterScore && highestPosterScore > 0;

                      return (
                        <div
                          key={img.id || idx}
                          className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-transparent hover:border-white/20'}`}
                          onClick={() =>
                            setFormData((prev: any) => ({
                              ...prev,
                              posterUrl: img.filePath,
                              autoSelectHighestVotedMedia: false,
                            }))
                          }
                        >
                          <div className="aspect-[2/3]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.filePath}
                              alt="Poster"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white flex items-center gap-1">
                            {isSelected ? 'Aktif' : 'Pasif'} {img.isNew && '(Yeni)'}
                            {isHighestVoted && (
                              <span title="En Yüksek Oy" className="text-yellow-400 text-xs">
                                ⭐
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs shadow-md">
                              ✓
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData((prev: any) => {
                                const nextImages = prev.images.filter((i: any) => i !== img);
                                return {
                                  ...prev,
                                  images: nextImages,
                                  ...(prev.posterUrl === img.filePath ? { posterUrl: '' } : {}),
                                };
                              });
                              if (
                                img.filePath.startsWith('blob:') ||
                                img.filePath.startsWith('data:')
                              ) {
                                // ObjectURL varsa temizlenebilir. Data URI silinmez.
                              }
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            ✕
                          </button>

                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] flex gap-2 font-medium">
                            <span className="text-emerald-400" title="Beğeni">
                              👍 {img.upvoteCount}
                            </span>
                            <span className="text-red-400" title="Beğenmeme">
                              👎 {img.downvoteCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          {/* Backdroplar Listesi */}
          {formData.images &&
            formData.images.filter((img: any) => img.type === 'backdrop').length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                  Arka Planlar (Backdrops)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images
                    .filter((img: any) => img.type === 'backdrop')
                    .map((img: any, idx: number) => {
                      const isSelected = formData.backdropUrl === img.filePath;
                      const score = img.upvoteCount - img.downvoteCount;
                      const isHighestVoted =
                        score === highestBackdropScore && highestBackdropScore > 0;

                      return (
                        <div
                          key={img.id || idx}
                          className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-transparent hover:border-white/20'}`}
                          onClick={() =>
                            setFormData((prev: any) => ({
                              ...prev,
                              backdropUrl: img.filePath,
                              autoSelectHighestVotedMedia: false,
                            }))
                          }
                        >
                          <div className="aspect-video">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getImageSource(img.filePath)}
                              alt="Backdrop"
                              className="w-full h-full object-cover"
                              style={{ objectPosition: getImageObjectPosition(img.filePath) }}
                            />
                          </div>
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white flex items-center gap-1">
                            {isSelected ? 'Aktif' : 'Pasif'} {img.isNew && '(Yeni)'}
                            {isHighestVoted && (
                              <span title="En Yüksek Oy" className="text-yellow-400 text-xs">
                                ⭐
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs shadow-md">
                              ✓
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData((prev: any) => {
                                const nextImages = prev.images.filter((i: any) => i !== img);
                                return {
                                  ...prev,
                                  images: nextImages,
                                  ...(prev.backdropUrl === img.filePath ? { backdropUrl: '' } : {}),
                                };
                              });
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            ✕
                          </button>

                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] flex gap-2 font-medium">
                            <span className="text-emerald-400" title="Beğeni">
                              👍 {img.upvoteCount}
                            </span>
                            <span className="text-red-400" title="Beğenmeme">
                              👎 {img.downvoteCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          {(!formData.images || formData.images.length === 0) && (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Henüz görsel yok.</p>
            </div>
          )}
        </div>

        {/* API Image Select Dialog */}
        {!!imageDialogSource && !!imageDialogSourceId && (
          <ApiImageSelectDialog
            isOpen={imageDialogOpen}
            onClose={() => {
              setImageDialogOpen(false);
              setImageDialogSource('');
              setImageDialogSourceId('');
            }}
            onSelect={handleImageSelect}
            category={imageDialogCategory}
            source={imageDialogSource}
            sourceId={imageDialogSourceId}
          />
        )}

        {/* API Image Crop Modal */}
        {apiCropFile && (
          <ImageCropModal
            isOpen={true}
            onClose={() => setApiCropFile(null)}
            onCropComplete={handleApiCropComplete}
            imageFile={apiCropFile}
            imageType={imageDialogCategory === 'posters' ? 'poster' : 'backdrop'}
          />
        )}

        {/* Screenshot Select Dialog */}
        <ScreenshotSelectDialog
          isOpen={screenshotDialogOpen}
          onClose={() => setScreenshotDialogOpen(false)}
          onSelect={handleScreenshotSelect}
          screenshots={screenshotOptions}
        />

        {/* Local Files Crop Modal Queue */}
        {pendingLocalFiles.length > 0 && (
          <ImageCropModal
            isOpen={true}
            onClose={() => {
              // Skip current file
              setPendingLocalFiles((prev) => prev.slice(1));
            }}
            onCancelAll={() => {
              // Clear queue
              setPendingLocalFiles([]);
            }}
            onCropComplete={async (croppedBase64) => {
              const current = pendingLocalFiles[0];
              const fileType = current.type === 'posters' ? 'poster' : 'backdrop';

              let newFile = current.file;
              if (fileType !== 'backdrop') {
                const blob = await fetch(croppedBase64).then((response) => response.blob());
                newFile = new File([blob], current.file.name || 'cropped.jpg', {
                  type: blob.type || 'image/jpeg',
                });
              }

              const newImg = {
                id: Math.floor(Math.random() * -1000000),
                type: fileType,
                filePath: croppedBase64,
                file: newFile,
                isNew: true,
                upvoteCount: 0,
                downvoteCount: 0,
              };

              setFormData((prev: any) => ({ ...prev, images: [...(prev.images || []), newImg] }));

              // Note: We do NOT call setPendingLocalFiles here because ImageCropModal
              // automatically calls onClose() right after onCropComplete(),
              // which already handles advancing the queue.
            }}
            imageFile={pendingLocalFiles[0].file}
            imageType={pendingLocalFiles[0].type === 'posters' ? 'poster' : 'backdrop'}
            pendingCount={pendingLocalFiles.length}
            currentFileIndex={0}
          />
        )}
      </div>
    </div>
  );
}
