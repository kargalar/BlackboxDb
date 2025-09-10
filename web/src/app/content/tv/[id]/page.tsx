"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTvDetails, getTvSeasonDetails, tmdbImage } from '@/services/api/tmdb';
import type { TMDBTvDetail, TMDBCastMember, TMDBTvSeason, TMDBTvEpisode } from '@/types/tmdb';
import { getContentById, getUserContentLog, updateUserContentLog, logMovieWatch, toggleFavorite, rateMovie, getContentReviews, addReview, saveContentFromTMDBTv } from '@/services/database/movieLogs';

export default function TvShowPage() {
  const params = useParams();
  const id = params.id as string;
  const [tv, setTv] = useState<TMDBTvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<Record<number, TMDBTvSeason & { episodes?: TMDBTvEpisode[] }>>({});
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set()); // "season-episode" format
  // DB-driven
  const [stats, setStats] = useState<{ consume_count?: number; favorite_count?: number; review_count?: number; average_rating?: number; rating_count?: number }>({});
  const [userRating, setUserRating] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isLater, setIsLater] = useState(false);
  const [reviews, setReviews] = useState<Array<{ id: number; user_name: string; rating: number | null; review_text: string; created_at: string; like_count: number; reply_count: number; is_liked_by_current_user: boolean }>>([]);
  const [reviewText, setReviewText] = useState('');

  const refreshStats = useCallback(async () => {
    if (!id) return;
    try {
      console.log('📊 İstatistikler yenileniyor...');
      const { data } = await getContentById(id);
      if (data) {
        setStats({
          consume_count: data.consume_count,
          favorite_count: data.favorite_count,
          review_count: data.review_count,
          average_rating: data.average_rating,
          rating_count: data.rating_count,
        });
        console.log('✅ İstatistikler güncellendi:', data);
      }
    } catch (e) {
      console.error('❌ İstatistikler yüklenirken hata:', e);
    }
  }, [id]);

  const refreshUserLog = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      console.log('👤 Kullanıcı logları yükleniyor...');
      const { data } = await getUserContentLog(id);
      if (data) {
        setIsFavorite(!!data.is_favorite);
        setIsLater(!!data.is_consume_later);
        setUserRating(data.rating ? Number(data.rating) : 0);
        setIsWatched(Number(data.content_status_id) === 1 || (data.rating ?? 0) > 0);
        console.log('✅ Kullanıcı logları güncellendi:', data);
      }
    } catch (e) {
      console.error('❌ Kullanıcı logları yüklenirken hata:', e);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    try {
      console.log('💬 Yorumlar yükleniyor...');
      const res = await getContentReviews(id);
      setReviews(res.data ?? []);
      console.log('✅ Yorumlar yüklendi:', res.data?.length, 'yorum');
    } catch (e) {
      console.error('❌ Yorumlar yüklenirken hata:', e);
    }
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        console.log('🔍 TV sayfası yükleniyor, ID:', id);
        setLoading(true);
        
        console.log('📺 TMDB TV detayları alınıyor...');
        const data = await getTvDetails(String(id));
        console.log('✅ TMDB TV detayları alındı:', data?.name);
        setTv(data);
        
        console.log('💾 Content veritabanına kaydediliyor...');
        await saveContentFromTMDBTv(data);
        console.log('✅ Content kaydedildi');
        
        console.log('📊 İstatistikler yükleniyor...');
        await Promise.all([refreshStats(), refreshUserLog(), loadReviews()]);
        console.log('✅ Tüm veriler yüklendi');
      } catch (e: any) {
        console.error('❌ TV sayfası yükleme hatası:', e);
        setError(e?.message || 'Bilinmeyen hata');
      } finally {
        console.log('🏁 Loading tamamlandı');
        setLoading(false);
      }
    }
    
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      console.log('▶️ Load fonksiyonu çağrılıyor, numeric ID:', numericId);
      load();
    } else {
      console.error('❌ Geçersiz ID:', id, 'Loading durduruluyor');
      setLoading(false);
      setError('Geçersiz dizi ID');
    }
  }, [id, refreshStats, refreshUserLog, loadReviews]);

  const handleWatched = async () => {
    await logMovieWatch(id);
    setIsWatched(true);
    setIsLater(false);
    await Promise.all([refreshStats(), refreshUserLog()]);
  };

  const handleLater = async () => {
    const { data } = await getUserContentLog(id);
    const next = !data?.is_consume_later;
    await updateUserContentLog(id, {
      content_status_id: data?.content_status_id || (isWatched ? 1 : 2),
      rating: data?.rating ?? null,
      is_favorite: data?.is_favorite ?? false,
      is_consume_later: next,
      date: new Date().toISOString(),
    });
    setIsLater(next);
    await Promise.all([refreshStats(), refreshUserLog()]);
  };

  const handleFavorite = async () => {
    const res = await toggleFavorite(id);
    if (res.data) setIsFavorite(res.isFavorite);
    await refreshStats();
  };

  const handleRate = async (val: number) => {
    setUserRating(val);
    await rateMovie(id, val);
    await Promise.all([refreshStats(), refreshUserLog()]);
  };

  const loadSeasonDetails = useCallback(async (seasonNumber: number) => {
    if (!id || seasonDetails[seasonNumber]) return;
    
    try {
      console.log(`🎬 Sezon ${seasonNumber} detayları yükleniyor...`);
      const seasonData = await getTvSeasonDetails(id, seasonNumber);
      setSeasonDetails(prev => ({
        ...prev,
        [seasonNumber]: seasonData
      }));
      console.log(`✅ Sezon ${seasonNumber} detayları yüklendi:`, seasonData.episodes?.length, 'bölüm');
    } catch (e) {
      console.error(`❌ Sezon ${seasonNumber} detayları yüklenirken hata:`, e);
    }
  }, [id, seasonDetails]);

  const toggleSeasonExpansion = (seasonNumber: number) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(seasonNumber)) {
      newExpanded.delete(seasonNumber);
    } else {
      newExpanded.add(seasonNumber);
      loadSeasonDetails(seasonNumber);
    }
    setExpandedSeasons(newExpanded);
  };

  const handleAddReview = async () => {
    const text = reviewText.trim();
    if (!text) return;
    const ok = await addReview(id, text);
    if (ok.data) {
      setReviewText('');
      await loadReviews();
      await refreshStats();
    }
  };

  const toggleEpisodeWatched = (seasonNumber: number, episodeNumber: number) => {
    const episodeKey = `${seasonNumber}-${episodeNumber}`;
    const newWatched = new Set(watchedEpisodes);
    if (newWatched.has(episodeKey)) {
      newWatched.delete(episodeKey);
      console.log(`✅ Bölüm ${seasonNumber}x${episodeNumber} izlenmemiş olarak işaretlendi`);
    } else {
      newWatched.add(episodeKey);
      console.log(`✅ Bölüm ${seasonNumber}x${episodeNumber} izlendi olarak işaretlendi`);
    }
    setWatchedEpisodes(newWatched);
  };

  const toggleSeasonWatched = (seasonNumber: number) => {
    const seasonEpisodes = seasonDetails[seasonNumber]?.episodes || [];
    const newWatched = new Set(watchedEpisodes);
    const allWatched = seasonEpisodes.every(episode => 
      newWatched.has(`${seasonNumber}-${episode.episode_number}`)
    );

    if (allWatched) {
      // Tüm bölümleri izlenmemiş yap
      seasonEpisodes.forEach(episode => {
        newWatched.delete(`${seasonNumber}-${episode.episode_number}`);
      });
      console.log(`✅ Sezon ${seasonNumber} tüm bölümleri izlenmemiş olarak işaretlendi`);
    } else {
      // Tüm bölümleri izlenmiş yap
      seasonEpisodes.forEach(episode => {
        newWatched.add(`${seasonNumber}-${episode.episode_number}`);
      });
      console.log(`✅ Sezon ${seasonNumber} tüm bölümleri izlendi olarak işaretlendi`);
    }
    setWatchedEpisodes(newWatched);
  };

  const isEpisodeWatched = (seasonNumber: number, episodeNumber: number) => {
    return watchedEpisodes.has(`${seasonNumber}-${episodeNumber}`);
  };

  const isSeasonWatched = (seasonNumber: number) => {
    const seasonEpisodes = seasonDetails[seasonNumber]?.episodes || [];
    return seasonEpisodes.length > 0 && seasonEpisodes.every(episode => 
      watchedEpisodes.has(`${seasonNumber}-${episode.episode_number}`)
    );
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-6">Yükleniyor…</div>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-red-500">{error}</div>
    );
  }
  if (!tv) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <header className="relative rounded-2xl overflow-hidden">
        {tv.backdrop_path && (
          <div className="relative h-80">
            <Image src={tmdbImage(tv.backdrop_path, 'original')} alt={tv.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex gap-6 items-end">
            <div className="relative w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
              {tv.poster_path && (
                <Image src={tmdbImage(tv.poster_path, 'w342')} alt={tv.name} fill className="object-cover" />
              )}
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold">{tv.name}</h1>
              <p className="opacity-80 mt-2 text-sm max-w-3xl">{tv.overview}</p>
              <div className="mt-3 text-sm opacity-75">
                <span>Sezon: {tv.number_of_seasons ?? '-'} • Bölüm: {tv.number_of_episodes ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Actions & Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleWatched} className={`px-3 py-2 text-sm rounded ${isWatched ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>İzlendi</button>
            <button onClick={handleLater} className={`px-3 py-2 text-sm rounded ${isLater ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>İzleme Listesi</button>
            <button onClick={handleFavorite} className={`px-3 py-2 text-sm rounded ${isFavorite ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}>Favori</button>
          </div>
          <div className="text-sm text-gray-400 flex gap-4">
            <span>İzleyen: <b className="text-gray-200">{stats.consume_count ?? 0}</b></span>
            <span>Favori: <b className="text-gray-200">{stats.favorite_count ?? 0}</b></span>
            {typeof stats.average_rating === 'number' && (
              <span>Ortalama: <b className="text-gray-200">{(stats.average_rating as number).toFixed(1)}</b></span>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Puanın</div>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((i) => (
                <button key={i} className={`w-6 h-6 ${i <= (userRating||0) ? 'text-yellow-400' : 'text-gray-400'} hover:scale-110 transition`} onClick={() => handleRate(i)} title={`${i}`}>
                  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="md:col-span-2">
          {tv.overview ? (
            <p className="text-gray-300 leading-relaxed">{tv.overview}</p>
          ) : null}
        </div>
      </section>

      {/* Cast */}
      {tv.credits?.cast?.length ? (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-2xl font-bold mb-6">Oyuncular</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tv.credits.cast.slice(0, 10).map((m: TMDBCastMember) => (
              <Link key={m.id} href={`/person/${m.id}`} className="text-center">
                <div className="relative aspect-[2/3] mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {m.profile_path && (
                    <Image src={tmdbImage(m.profile_path, 'w185')} alt={m.name} fill className="object-cover" />
                  )}
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-white">{m.name}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">{m.character}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Seasons & Episodes */}
      {tv.seasons && tv.seasons.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-2xl font-bold mb-6">Sezonlar ve Bölümler</h2>
          <div className="space-y-4">
            {tv.seasons.map((season) => (
              <div key={season.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSeasonExpansion(season.season_number)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {season.poster_path && (
                      <Image
                        src={tmdbImage(season.poster_path, 'w185')}
                        alt={season.name}
                        width={60}
                        height={90}
                        className="rounded object-cover"
                      />
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{season.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {season.episode_count} bölüm • {season.air_date ? new Date(season.air_date).getFullYear() : 'Tarih yok'}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${expandedSeasons.has(season.season_number) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedSeasons.has(season.season_number) && (
                  <div className="p-4 bg-white dark:bg-gray-900">
                    {season.overview && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{season.overview}</p>
                    )}
                    
                    {/* Season Watch Button */}
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        onClick={() => toggleSeasonWatched(season.season_number)}
                        className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 ${
                          isSeasonWatched(season.season_number)
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isSeasonWatched(season.season_number) ? 'Sezonu İzlenmemiş Yap' : 'Tüm Sezonu İzle'}
                      </button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {seasonDetails[season.season_number]?.episodes?.filter(episode => 
                          isEpisodeWatched(season.season_number, episode.episode_number)
                        ).length || 0} / {season.episode_count} bölüm izlendi
                      </span>
                    </div>
                    
                    {seasonDetails[season.season_number]?.episodes ? (
                      <div className="space-y-3">
                        {seasonDetails[season.season_number].episodes!.map((episode) => (
                          <div key={episode.id} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            {episode.still_path && (
                              <Image
                                src={tmdbImage(episode.still_path, 'w342')}
                                alt={episode.name}
                                width={120}
                                height={68}
                                className="rounded object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{episode.episode_number}. {episode.name}</span>
                                  {episode.runtime && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      ({episode.runtime} dk)
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => toggleEpisodeWatched(season.season_number, episode.episode_number)}
                                  className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                                    isEpisodeWatched(season.season_number, episode.episode_number)
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-gray-600 text-white hover:bg-gray-700'
                                  }`}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {isEpisodeWatched(season.season_number, episode.episode_number) ? 'İzlendi' : 'İzle'}
                                </button>
                              </div>
                              {episode.air_date && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {new Date(episode.air_date).toLocaleDateString('tr-TR')}
                                </p>
                              )}
                              {episode.overview && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {episode.overview}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1">
                                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {episode.vote_average.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500 dark:text-gray-400">Bölümler yükleniyor...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h2 className="text-2xl font-bold">Yorumlar ({stats.review_count ?? 0})</h2>
        <div className="flex gap-2">
          <input value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Yorum yaz..." className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
          <button onClick={handleAddReview} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Paylaş</button>
        </div>
        <div className="divide-y divide-gray-800">
          {reviews.map((r) => (
            <div key={r.id} className="py-3">
              <div className="text-sm text-gray-400">@{r.user_name} • {new Date(r.created_at).toLocaleDateString()}</div>
              {r.rating ? (
                <div className="mt-1 text-yellow-400 text-sm">Puan: {r.rating.toFixed(1)}</div>
              ) : null}
              <div className="mt-1 text-gray-200 text-sm whitespace-pre-line">{r.review_text}</div>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="text-sm text-gray-400">Henüz yorum yok.</div>
          )}
        </div>
      </section>
    </div>
  );
}
