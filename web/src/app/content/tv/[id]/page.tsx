"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTvDetails, tmdbImage } from '@/services/api/tmdb';
import type { TMDBTvDetail, TMDBCastMember } from '@/types/tmdb';
import { getContentById, getUserContentLog, updateUserContentLog, logMovieWatch, toggleFavorite, rateMovie, getContentReviews, addReview, saveContentFromTMDBTv } from '@/services/database/movieLogs';

export default function TvShowPage() {
  const params = useParams();
  const id = Number(params.id as string);
  const [tv, setTv] = useState<TMDBTvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // DB-driven
  const [stats, setStats] = useState<{ consume_count?: number; favorite_count?: number; review_count?: number; average_rating?: number; rating_count?: number }>({});
  const [userRating, setUserRating] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isLater, setIsLater] = useState(false);
  const [reviews, setReviews] = useState<Array<{ id: number; user_name: string; rating: number | null; review_text: string; created_at: string; like_count: number; reply_count: number; is_liked_by_current_user: boolean }>>([]);
  const [reviewText, setReviewText] = useState('');

  const refreshStats = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const { data } = await getContentById(id);
    if (data) setStats({
      consume_count: data.consume_count,
      favorite_count: data.favorite_count,
      review_count: data.review_count,
      average_rating: data.average_rating,
      rating_count: data.rating_count,
    });
  }, [id]);

  const refreshUserLog = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const { data } = await getUserContentLog(id);
    if (data) {
      setIsFavorite(!!data.is_favorite);
      setIsLater(!!data.is_consume_later);
      setUserRating(data.rating ? Number(data.rating) : 0);
      setIsWatched(Number(data.content_status_id) === 1 || (data.rating ?? 0) > 0);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const res = await getContentReviews(id);
    setReviews(res.data ?? []);
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getTvDetails(String(id));
        setTv(data);
        // Ensure content exists for logging/stats
        await saveContentFromTMDBTv(data);
        await Promise.all([refreshStats(), refreshUserLog(), loadReviews()]);
      } catch (e: any) {
        setError(e?.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    }
    if (Number.isFinite(id)) load();
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
