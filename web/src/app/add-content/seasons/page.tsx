'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAddContentStore } from '@/store/useAddContentStore';
import { getContentById } from '@/services/adminService';
import ImageUploadField from '@/components/molecules/ImageUploadField';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Link as LinkIcon,
  Film,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface TvSeasonEpisode {
  episodeNumber: number;
  name: string;
  overview?: string;
  runtime?: number;
  stillUrl?: string;
  airDate?: string;
}

interface TvSeason {
  seasonNumber: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  episodes: TvSeasonEpisode[];
  airDate?: string;
}

export default function SeasonsBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f9fa] dark:bg-surface-panel flex justify-center items-center">
          <Loader2 size={36} className="animate-spin text-violet-500" />
        </div>
      }
    >
      <SeasonsBuilderContent />
    </Suspense>
  );
}

function SeasonsBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formData, setFormData, contentId, setContentId } = useAddContentStore();
  const [selectedSeasonIndexState, setSelectedSeasonIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastRequestedContentIdRef = useRef<string | null>(null);

  const urlId = searchParams.get('id');

  // If store is empty but we have an id in the URL, fetch content from API
  useEffect(() => {
    let active = true;
    const hasCurrentContent =
      contentId === urlId && (formData.title !== '' || formData.seasons.length > 0);

    if (!urlId || hasCurrentContent || lastRequestedContentIdRef.current === urlId) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    lastRequestedContentIdRef.current = urlId;
    setIsLoading(true);

    const loadContent = async () => {
      try {
        const { data, error } = await getContentById(urlId);
        if (!active) return;
        if (error || !data) throw error || new Error('İçerik bulunamadı');

        const parsedSeasons = data.seasons ? JSON.parse(data.seasons) : [];
        if (!Array.isArray(parsedSeasons)) {
          throw new Error('Sezon verisi beklenen biçimde değil');
        }

        setContentId(urlId);
        setFormData((previous) => ({
          ...previous,
          title: data.title || previous.title,
          seasons: parsedSeasons,
        }));
      } catch (error) {
        if (active) {
          lastRequestedContentIdRef.current = null;
          console.error('[Seasons] Content load failed:', error);
          toast.error('İçerik sezonları yüklenemedi');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadContent();

    return () => {
      active = false;
    };
  }, [contentId, formData.seasons.length, formData.title, setContentId, setFormData, urlId]);

  // If page is refreshed and store is lost or accessed directly, we might not have a form data ready.
  // But since it's an internal route, we just let them use it. If there's no title, we show a small warning.
  const hasFormData = formData.title !== '' || formData.seasons?.length > 0;

  const seasons = (formData.seasons || []) as any as TvSeason[];

  // Clamp the selected index after a season is removed without storing derived state.
  const selectedSeasonIndex = Math.min(selectedSeasonIndexState, Math.max(0, seasons.length - 1));

  const addSeason = () => {
    const newSeason: TvSeason = {
      seasonNumber: seasons.length + 1,
      name: `Sezon ${seasons.length + 1}`,
      episodes: [],
    };
    setFormData((prev) => ({
      ...prev,
      seasons: [...(prev.seasons as any[]), newSeason],
    }));
    setSelectedSeasonIndex(seasons.length);
  };

  const removeSeason = (index: number) => {
    console.log(`🗑️ [Seasons] Removing season at index ${index}, total seasons: ${seasons.length}`);
    const confirmed = confirm(
      'Bu sezonu ve içindeki tüm bölümleri silmek istediğinize emin misiniz?'
    );
    if (!confirmed) {
      console.log('⚠️ [Seasons] Season removal cancelled by user');
      return;
    }
    setFormData((prev) => {
      const prevSeasons = prev.seasons as any[];
      const newSeasons = prevSeasons.filter((_, i) => i !== index);
      console.log(`✅ [Seasons] Season removed: ${prevSeasons.length} → ${newSeasons.length}`);
      return { ...prev, seasons: newSeasons };
    });
  };

  const updateSeason = (index: number, field: keyof TvSeason, value: any) => {
    const newSeasons = [...seasons];
    newSeasons[index] = { ...newSeasons[index], [field]: value };
    setFormData((prev) => ({ ...prev, seasons: newSeasons as any }));
  };

  const addEpisodeToSeason = (seasonIndex: number) => {
    const newSeasons = [...seasons];
    const season = newSeasons[seasonIndex];
    const newEpisode: TvSeasonEpisode = {
      episodeNumber: season.episodes.length + 1,
      name: `Bölüm ${season.episodes.length + 1}`,
    };
    season.episodes.push(newEpisode);
    setFormData((prev) => ({ ...prev, seasons: newSeasons as any }));
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    console.log(`🗑️ [Seasons] Removing episode ${episodeIndex} from season ${seasonIndex}`);
    if (confirm('Bu bölümü silmek istediğinize emin misiniz?')) {
      const newSeasons = [...seasons];
      newSeasons[seasonIndex].episodes.splice(episodeIndex, 1);
      setFormData((prev) => ({ ...prev, seasons: newSeasons as any }));
      console.log(
        `✅ [Seasons] Episode removed, remaining: ${newSeasons[seasonIndex].episodes.length}`
      );
    }
  };

  const updateEpisode = (
    seasonIndex: number,
    episodeIndex: number,
    field: keyof TvSeasonEpisode,
    value: any
  ) => {
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].episodes[episodeIndex] = {
      ...newSeasons[seasonIndex].episodes[episodeIndex],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, seasons: newSeasons as any }));
  };

  const selectedSeason = seasons[selectedSeasonIndex];

  const goBackToForm = () => {
    const backUrl = urlId ? `/add-content?id=${urlId}` : '/add-content';
    router.push(backUrl as any);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-surface-panel text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-raised/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={goBackToForm}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900/50 dark:hover:text-violet-400 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-violet-600 dark:bg-violet-400 dark:">
              Sezon ve Bölüm Yöneticisi
            </h1>
            {formData.title && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {formData.title} dizisi için düzenleniyor
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Warning banner if accessed directly without form data */}
      {!hasFormData && !isLoading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-900/50 px-6 py-3 flex items-center gap-3 text-yellow-800 dark:text-yellow-500 text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p>
            Şu anda form dışında çalışıyorsunuz. Değişiklikleriniz tarayıcı hafızasında saklanacak
            ancak içerik kaydetmek için <strong>İçerik Ekle</strong> formuna geri dönmelisiniz.
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
            <Loader2 size={36} className="animate-spin text-violet-500" />
            <p className="font-medium">Sezon verileri yükleniyor...</p>
          </div>
        </div>
      )}

      {/* Builder Workspace */}
      {!isLoading && (
        <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">
          {/* Left Sidebar - Seasons Navigator */}
          <aside className="w-full md:w-80 border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-panel/50 backdrop-blur-sm flex flex-col flex-shrink-0 md:h-full overflow-y-auto">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-surface-panel/95 z-10 backdrop-blur">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Kayıtlı Sezonlar</h2>
              <button
                onClick={addSeason}
                className="p-2 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-800/60 transition-colors focus:ring-2 focus:ring-violet-500/50"
                title="Yeni sezon ekle"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {seasons.map((season, index) => {
                const isActive = selectedSeasonIndex === index;
                return (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSeasonIndex(index)}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all border outline-none ${
                      isActive
                        ? 'bg-white dark:bg-surface-raised border-violet-200 dark:border-violet-900/50 shadow-md shadow-violet-500/5 ring-1 ring-violet-500/20'
                        : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div
                      className={`font-semibold text-sm ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-200'}`}
                    >
                      {season.name || `Sezon ${season.seasonNumber}`}
                    </div>
                    <div
                      className={`text-xs mt-1.5 flex items-center gap-1.5 ${isActive ? 'text-violet-600/70 dark:text-violet-400/70' : 'text-gray-500'}`}
                    >
                      <Film size={12} />
                      <span>{season.episodes?.length || 0} Bölüm</span>
                    </div>
                  </div>
                );
              })}

              {seasons.length === 0 && (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                    <Film size={24} />
                  </div>
                  <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-1">
                    Sezon Bulunamadı
                  </h3>
                  <p className="text-sm text-gray-500">
                    Henüz bir sezon eklemediniz. Sağ üstteki artı butonundan başlayın.
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Right Main Area - Season Settings & Episodes */}
          <div className="flex-1 h-full overflow-y-auto bg-transparent scrollbar-hide perspective-1000 relative">
            {selectedSeason ? (
              <div className="max-w-4xl mx-auto p-4 md:p-8 lg:p-12 pb-32">
                {/* Season Details Container */}
                <div className="space-y-8 animate-in fade-in slide-in-bg-bottom-4 duration-500">
                  {/* Header Action Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold text-sm">
                        {selectedSeason.seasonNumber}
                      </span>
                      <h2 className="text-2xl font-bold tracking-tight">Sezon Ayarları</h2>
                    </div>
                    <button
                      onClick={() => removeSeason(selectedSeasonIndex)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
                    >
                      <Trash2 size={16} />
                      Sezonu Sil
                    </button>
                  </div>

                  {/* Season Settings Card */}
                  <div className="bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Left: Fields */}
                      <div className="flex-1 space-y-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
                            Sezon Adı
                          </label>
                          <input
                            type="text"
                            value={selectedSeason.name}
                            onChange={(e) =>
                              updateSeason(selectedSeasonIndex, 'name', e.target.value)
                            }
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-white font-medium text-base transition-all"
                            placeholder="Örn: 1. Sezon"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
                              Yayın Tarihi
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={selectedSeason.airDate || ''}
                                onChange={(e) =>
                                  updateSeason(selectedSeasonIndex, 'airDate', e.target.value)
                                }
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 dark:text-white transition-all"
                              />
                              <Calendar
                                size={16}
                                className="absolute left-4 top-3.5 text-gray-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">
                            Açıklama (Özet)
                          </label>
                          <textarea
                            rows={5}
                            value={selectedSeason.overview || ''}
                            onChange={(e) =>
                              updateSeason(selectedSeasonIndex, 'overview', e.target.value)
                            }
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 dark:text-white transition-all resize-y"
                            placeholder="Bu sezon ne hakkında?..."
                          />
                        </div>
                      </div>

                      {/* Right: Poster Selection */}
                      <div className="w-full md:w-56 shrink-0">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1 text-center md:text-left">
                          Kapak Görseli
                        </label>
                        <ImageUploadField
                          name={`season-poster-${selectedSeasonIndex}`}
                          value={selectedSeason.posterUrl || ''}
                          onChange={(url) => updateSeason(selectedSeasonIndex, 'posterUrl', url)}
                          label={selectedSeason.posterUrl ? 'Görseli Değiştir' : 'Görsel Yükle'}
                          imageType="poster"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Episodes Section */}
                  <div className="pt-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                          Bölümler
                          <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                            ({selectedSeason.episodes.length})
                          </span>
                        </h3>
                      </div>
                      <button
                        onClick={() => addEpisodeToSeason(selectedSeasonIndex)}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Yenİ Bölüm
                      </button>
                    </div>

                    {selectedSeason.episodes.length === 0 ? (
                      <div className="bg-white/50 dark:bg-surface-raised/50 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-500">
                          <Plus size={24} />
                        </div>
                        <h4 className="text-lg font-bold mb-2">Henüz Bölüm Eklenmedi</h4>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                          Bu sezona ait bölümleri detaylarıyla eklemeye hemen başlayın.
                        </p>
                        <button
                          onClick={() => addEpisodeToSeason(selectedSeasonIndex)}
                          className="px-6 py-2 bg-white dark:bg-surface-hover border border-gray-200 dark:border-gray-700 hover:border-violet-500 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-all"
                        >
                          İlk Bölümü Ekle
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedSeason.episodes.map((episode, episodeIndex) => (
                          <div
                            key={episodeIndex}
                            className="bg-white dark:bg-surface-raised border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm group"
                          >
                            <div className="flex flex-col md:flex-row gap-6">
                              {/* Left: Thumbnail (optional) */}
                              <div className="w-full md:w-48 shrink-0">
                                <ImageUploadField
                                  name={`episode-still-${selectedSeasonIndex}-${episodeIndex}`}
                                  value={episode.stillUrl || ''}
                                  onChange={(url) =>
                                    updateEpisode(
                                      selectedSeasonIndex,
                                      episodeIndex,
                                      'stillUrl',
                                      url
                                    )
                                  }
                                  label={episode.stillUrl ? 'Görseli Değiştir' : 'Bölüm Görseli'}
                                  imageType="backdrop"
                                />
                              </div>

                              {/* Right: Info Fields */}
                              <div className="flex-1 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 grid grid-cols-12 gap-3 items-start">
                                    <div className="col-span-12 md:col-span-2">
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                        No
                                      </label>
                                      <input
                                        type="number"
                                        value={episode.episodeNumber}
                                        onChange={(e) =>
                                          updateEpisode(
                                            selectedSeasonIndex,
                                            episodeIndex,
                                            'episodeNumber',
                                            parseInt(e.target.value)
                                          )
                                        }
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm text-center font-bold"
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-10">
                                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                        Bölüm Adı
                                      </label>
                                      <input
                                        type="text"
                                        value={episode.name}
                                        onChange={(e) =>
                                          updateEpisode(
                                            selectedSeasonIndex,
                                            episodeIndex,
                                            'name',
                                            e.target.value
                                          )
                                        }
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-violet-500 font-medium"
                                        placeholder="Örn: Pilot"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => removeEpisode(selectedSeasonIndex, episodeIndex)}
                                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-5 md:mt-0"
                                    title="Bölümü Sil"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="relative">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                      Tarih
                                    </label>
                                    <input
                                      type="date"
                                      value={episode.airDate || ''}
                                      onChange={(e) =>
                                        updateEpisode(
                                          selectedSeasonIndex,
                                          episodeIndex,
                                          'airDate',
                                          e.target.value
                                        )
                                      }
                                      className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                                    />
                                    <Calendar
                                      size={14}
                                      className="absolute left-3 top-7 text-gray-400"
                                    />
                                  </div>
                                  <div className="relative">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                      Süre (Dk)
                                    </label>
                                    <input
                                      type="number"
                                      value={episode.runtime || ''}
                                      onChange={(e) =>
                                        updateEpisode(
                                          selectedSeasonIndex,
                                          episodeIndex,
                                          'runtime',
                                          e.target.value ? parseInt(e.target.value) : undefined
                                        )
                                      }
                                      className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg text-sm"
                                      placeholder="45"
                                    />
                                    <Clock
                                      size={14}
                                      className="absolute left-3 top-7 text-gray-400"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                    Özet / Açıklama
                                  </label>
                                  <textarea
                                    rows={4}
                                    value={episode.overview || ''}
                                    onChange={(e) =>
                                      updateEpisode(
                                        selectedSeasonIndex,
                                        episodeIndex,
                                        'overview',
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg text-sm resize-y focus:ring-2 focus:ring-violet-500 leading-relaxed text-gray-700 dark:text-gray-300"
                                    placeholder="Bu bölümde ne oldu?..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedSeason.episodes.length > 5 && (
                      <div className="mt-6 flex justify-center">
                        <button
                          onClick={() => addEpisodeToSeason(selectedSeasonIndex)}
                          className="px-5 py-2.5 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 hover:border-violet-500 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Bölüm Ekle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Film size={36} className="opacity-50" />
                </div>
                <p className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Seçili Sezon Yok
                </p>
                <p className="max-w-md">
                  Lütfen sol menüden bir sezon seçin veya yeni bir tane oluşturun.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Save Button */}
      <button
        onClick={goBackToForm}
        className="fixed bottom-6 right-6 z-50 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full shadow-lg flex items-center gap-2 transition-all"
      >
        <CheckCircle2 size={18} />
        <span>Kaydet ve Kapat</span>
      </button>
    </div>
  );
}
