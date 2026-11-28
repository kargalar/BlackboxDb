'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

/**
 * SeasonsBuilder - Inline season & episode builder for the TV content form.
 * Extracted from the standalone /add-content/seasons page to be used as a tab.
 */

import { useState } from 'react';
import ImageUploadField from '@/components/molecules/ImageUploadField';
import { Plus, Trash2, Calendar, Clock, Film } from 'lucide-react';

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

interface SeasonsBuilderProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function SeasonsBuilder({ formData, setFormData }: SeasonsBuilderProps) {
  const translateUi = useUiTranslations('Ui');
  const [requestedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);
  const seasons = (formData.seasons || []) as TvSeason[];
  const activeSeasonIndex = Math.min(requestedSeasonIndex, Math.max(0, seasons.length - 1));

  const addSeason = () => {
    const newSeason: TvSeason = {
      seasonNumber: seasons.length + 1,
      name: `Sezon ${seasons.length + 1}`,
      episodes: [],
    };
    const newSeasons = [...seasons, newSeason];
    setFormData({ ...formData, seasons: newSeasons });
    setSelectedSeasonIndex(seasons.length);
    console.log('➕ [SeasonsBuilder] Season added, total:', newSeasons.length);
  };

  const removeSeason = (index: number) => {
    const confirmed = confirm(
      translateUi("bu_sezonu_ve_icindeki_tum_bolumleri_5f26fb1")
    );
    if (!confirmed) return;

    const newSeasons = seasons.filter((_, i) => i !== index);
    setFormData({ ...formData, seasons: newSeasons });
    console.log(`🗑️ [SeasonsBuilder] Season ${index} removed, remaining: ${newSeasons.length}`);
  };

  const updateSeason = (index: number, field: keyof TvSeason, value: any) => {
    const newSeasons = [...seasons];
    newSeasons[index] = { ...newSeasons[index], [field]: value };
    setFormData({ ...formData, seasons: newSeasons });
  };

  const addEpisodeToSeason = (seasonIndex: number) => {
    const newSeasons = [...seasons];
    const season = newSeasons[seasonIndex];
    const newEpisode: TvSeasonEpisode = {
      episodeNumber: season.episodes.length + 1,
      name: `Bölüm ${season.episodes.length + 1}`,
    };
    season.episodes = [...season.episodes, newEpisode];
    setFormData({ ...formData, seasons: newSeasons });
    console.log(`➕ [SeasonsBuilder] Episode added to season ${seasonIndex}`);
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    if (!confirm(translateUi("bu_bolumu_silmek_istediginize_emin_misiniz_a686937"))) return;

    const newSeasons = [...seasons];
    newSeasons[seasonIndex].episodes = newSeasons[seasonIndex].episodes.filter(
      (_, i) => i !== episodeIndex
    );
    setFormData({ ...formData, seasons: newSeasons });
    console.log(`🗑️ [SeasonsBuilder] Episode ${episodeIndex} removed from season ${seasonIndex}`);
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
    setFormData({ ...formData, seasons: newSeasons });
  };

  const selectedSeason = seasons[activeSeasonIndex];

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
      {/* Left: Season Navigator */}
      <aside className="w-full md:w-64 border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-panel/50 rounded-2xl flex flex-col flex-shrink-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{translateUi("sezonlar_5f8f662")}</h3>
          <button
            type="button"
            onClick={addSeason}
            className="p-1.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-800/60 transition-colors"
            title={translateUi("yeni_sezon_ekle_c33202d")}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[400px]">
          {seasons.map((season, index) => {
            const isActive = activeSeasonIndex === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedSeasonIndex(index)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border text-sm ${
                  isActive
                    ? 'bg-white dark:bg-surface-raised border-violet-200 dark:border-violet-900/50 shadow-sm ring-1 ring-violet-500/20'
                    : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                }`}
              >
                <div
                  className={`font-semibold ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-gray-200'}`}
                >
                  {season.name || translateUi("sezon_value1_eb6e0b8", { value1: String(season.seasonNumber) })}
                </div>
                <div
                  className={`text-xs mt-1 flex items-center gap-1.5 ${isActive ? 'text-violet-600/70 dark:text-violet-400/70' : 'text-gray-500'}`}
                >
                  <Film size={11} />
                  <span>{season.episodes?.length || 0} {" " + translateUi("bolum_015dec5")}</span>
                </div>
              </button>
            );
          })}

          {seasons.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400">
                <Film size={20} />
              </div>
              <p className="text-xs text-gray-500">{translateUi("henuz_sezon_eklenmedi_cb0947c")}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Right: Season Details & Episodes */}
      <div className="flex-1 min-w-0">
        {selectedSeason ? (
          <div className="space-y-6">
            {/* Season Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-bold text-xs">
                  {selectedSeason.seasonNumber}
                </span>
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {translateUi("sezon_ayarlari_102040e")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => removeSeason(activeSeasonIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
              >
                <Trash2 size={14} />
                {translateUi("sezonu_sil_0cc670b")}
              </button>
            </div>

            {/* Season Settings Card */}
            <div className="bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Fields */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                      {translateUi("sezon_adi_79391a6")}
                    </label>
                    <input
                      type="text"
                      value={selectedSeason.name}
                      onChange={(e) => updateSeason(activeSeasonIndex, 'name', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900 dark:text-white font-medium text-sm transition-all"
                      placeholder={translateUi("orn_1_sezon_c9b8f3a")}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                        {translateUi("yayin_tarihi_600b05a")}
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={selectedSeason.airDate || ''}
                          onChange={(e) =>
                            updateSeason(activeSeasonIndex, 'airDate', e.target.value)
                          }
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 dark:text-white transition-all"
                        />
                        <Calendar size={14} className="absolute left-3 top-3 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                      {translateUi("aciklama_ozet_2170f00")}
                    </label>
                    <textarea
                      rows={4}
                      value={selectedSeason.overview || ''}
                      onChange={(e) => updateSeason(activeSeasonIndex, 'overview', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm text-gray-900 dark:text-white transition-all resize-y"
                      placeholder={translateUi("bu_sezon_ne_hakkinda_f5a79e7")}
                    />
                  </div>
                </div>

                {/* Right: Poster */}
                <div className="w-full md:w-48 shrink-0">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1 text-center md:text-left">
                    {translateUi("kapak_gorseli_032958c")}
                  </label>
                  <ImageUploadField
                    name={`season-poster-${activeSeasonIndex}`}
                    value={selectedSeason.posterUrl || ''}
                    onChange={(url) => updateSeason(activeSeasonIndex, 'posterUrl', url)}
                    label={selectedSeason.posterUrl ? translateUi("gorseli_degistir_2d3ec19") : translateUi("gorsel_yukle_da34d9b")}
                    imageType="poster"
                  />
                </div>
              </div>
            </div>

            {/* Episodes Section */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
                  {translateUi("bolumler_8a55c43")}
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    ({selectedSeason.episodes.length})
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => addEpisodeToSeason(activeSeasonIndex)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  {translateUi("yeni_bolum_daafd4f")}
                </button>
              </div>

              {selectedSeason.episodes.length === 0 ? (
                <div className="bg-white/50 dark:bg-surface-raised/50 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-500">
                    <Plus size={20} />
                  </div>
                  <h4 className="text-sm font-bold mb-1 text-gray-900 dark:text-white">
                    {translateUi("henuz_bolum_eklenmedi_7750c0d")}
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                    {translateUi("bu_sezona_ait_bolumleri_detaylariyla_eklemeye_4f2c8ce")}
                  </p>
                  <button
                    type="button"
                    onClick={() => addEpisodeToSeason(activeSeasonIndex)}
                    className="px-5 py-2 bg-white dark:bg-surface-hover border border-gray-200 dark:border-gray-700 hover:border-violet-500 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-all text-sm"
                  >
                    {translateUi("ilk_bolumu_ekle_3bd8f7f")}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedSeason.episodes.map((episode, episodeIndex) => (
                    <div
                      key={episodeIndex}
                      className="bg-white dark:bg-surface-raised border border-gray-100 dark:border-gray-800 rounded-xl p-4 group"
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Episode Thumbnail */}
                        <div className="w-full md:w-40 shrink-0">
                          <ImageUploadField
                            name={`episode-still-${activeSeasonIndex}-${episodeIndex}`}
                            value={episode.stillUrl || ''}
                            onChange={(url) =>
                              updateEpisode(activeSeasonIndex, episodeIndex, 'stillUrl', url)
                            }
                            label={episode.stillUrl ? translateUi("gorseli_degistir_2d3ec19") : translateUi("bolum_gorseli_14200b2")}
                            imageType="backdrop"
                          />
                        </div>

                        {/* Episode Fields */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 grid grid-cols-12 gap-2 items-start">
                              <div className="col-span-12 md:col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                  {translateUi("no_816c52f")}
                                </label>
                                <input
                                  type="number"
                                  value={episode.episodeNumber}
                                  onChange={(e) =>
                                    updateEpisode(
                                      activeSeasonIndex,
                                      episodeIndex,
                                      'episodeNumber',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-violet-500 text-xs text-center font-bold"
                                />
                              </div>
                              <div className="col-span-12 md:col-span-10">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                  {translateUi("bolum_adi_9bfbaa3")}
                                </label>
                                <input
                                  type="text"
                                  value={episode.name}
                                  onChange={(e) =>
                                    updateEpisode(
                                      activeSeasonIndex,
                                      episodeIndex,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-violet-500 font-medium text-sm"
                                  placeholder={translateUi("orn_pilot_5085734")}
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEpisode(activeSeasonIndex, episodeIndex)}
                              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-4 md:mt-0"
                              title={translateUi("bolumu_sil_5f14c7c")}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                {translateUi("tarih_6ddab1b")}
                              </label>
                              <input
                                type="date"
                                value={episode.airDate || ''}
                                onChange={(e) =>
                                  updateEpisode(
                                    activeSeasonIndex,
                                    episodeIndex,
                                    'airDate',
                                    e.target.value
                                  )
                                }
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg text-xs"
                              />
                              <Calendar
                                size={12}
                                className="absolute left-2.5 top-6.5 text-gray-400"
                              />
                            </div>
                            <div className="relative">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                                {translateUi("sure_dk_3d04d2c")}
                              </label>
                              <input
                                type="number"
                                value={episode.runtime || ''}
                                onChange={(e) =>
                                  updateEpisode(
                                    activeSeasonIndex,
                                    episodeIndex,
                                    'runtime',
                                    e.target.value ? parseInt(e.target.value) : undefined
                                  )
                                }
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg text-xs"
                                placeholder="45"
                              />
                              <Clock
                                size={12}
                                className="absolute left-2.5 top-6.5 text-gray-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                              {translateUi("ozet_aciklama_cc91de4")}
                            </label>
                            <textarea
                              rows={3}
                              value={episode.overview || ''}
                              onChange={(e) =>
                                updateEpisode(
                                  activeSeasonIndex,
                                  episodeIndex,
                                  'overview',
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-lg text-xs resize-y focus:ring-2 focus:ring-violet-500 leading-relaxed text-gray-700 dark:text-gray-300"
                              placeholder={translateUi("bu_bolumde_ne_oldu_4904517")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedSeason.episodes.length > 5 && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => addEpisodeToSeason(activeSeasonIndex)}
                    className="px-4 py-2 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 hover:border-violet-500 text-gray-800 dark:text-gray-200 font-medium rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} />
                    {translateUi("bolum_ekle_3e0745a")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400 min-h-[300px]">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Film size={28} className="opacity-50" />
            </div>
            <p className="text-base font-medium text-gray-800 dark:text-gray-200 mb-1">
              {translateUi("secili_sezon_yok_f5a3762")}
            </p>
            <p className="text-sm max-w-md">
              {translateUi("sol_menuden_bir_sezon_secin_veya_33ef14a")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
