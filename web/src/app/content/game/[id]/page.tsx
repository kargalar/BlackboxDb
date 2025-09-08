'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { igdbGetGame, igdbImageUrl } from '@/services/api/igdb';
import { 
  getContentById,
  getUserContentLog,
  updateUserContentLog,
  logMovieWatch,
  toggleFavorite,
  rateMovie,
  saveContentFromIGDB,
} from '@/services/database/movieLogs';

// Minimal star component (0-5)
const Stars = ({ value = 0, onChange }: { value?: number; onChange?: (v: number) => void }) => {
  const items = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {items.map((i) => (
        <button
          key={i}
          className={`w-6 h-6 ${i <= value ? 'text-yellow-400' : 'text-gray-400'} hover:scale-110 transition`}
          onClick={() => onChange?.(i)}
          title={`${i}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>
        </button>
      ))}
    </div>
  );
};

export default function GameContentPage() {
  const params = useParams();
  const id = Number(params.id as string);
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DB-driven states
  const [stats, setStats] = useState<{ consume_count: number; favorite_count: number; review_count: number; average_rating?: number; rating_count?: number }>({ consume_count: 0, favorite_count: 0, review_count: 0 });
  const [userRating, setUserRating] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPlayed, setIsPlayed] = useState(false);
  const [isLater, setIsLater] = useState(false);

  const year = useMemo(() => (game?.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined), [game]);
  const companies = useMemo(() => {
    const ic = game?.involved_companies || [];
    const devs = ic.filter((c: any) => c.developer && c.company?.name).map((c: any) => c.company.name);
    const pubs = ic.filter((c: any) => c.publisher && c.company?.name).map((c: any) => c.company.name);
    return { devs, pubs };
  }, [game]);

  const refreshStats = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const { data } = await getContentById(id);
    if (data) setStats({
      consume_count: data.consume_count ?? 0,
      favorite_count: data.favorite_count ?? 0,
      review_count: data.review_count ?? 0,
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
      setIsPlayed(Number(data.content_status_id) === 1 || (data.rating ?? 0) > 0);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const g = await igdbGetGame(id);
        if (!g) throw new Error('Oyun bulunamadı');
        if (!cancelled) setGame(g);

        // Ensure content exists in DB for logging/stats
        await saveContentFromIGDB(g);
        await Promise.all([refreshStats(), refreshUserLog()]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Oyun bulunamadı');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (Number.isFinite(id)) run();
    return () => { cancelled = true; };
  }, [id, refreshStats, refreshUserLog]);

  const handlePlayed = async () => {
    await logMovieWatch(id);
    setIsPlayed(true);
    setIsLater(false);
    await refreshStats();
    await refreshUserLog();
  };

  const handleLater = async () => {
    const { data } = await getUserContentLog(id);
    const next = !data?.is_consume_later;
    await updateUserContentLog(id, {
      content_status_id: data?.content_status_id || (isPlayed ? 1 : 2),
      rating: data?.rating ?? null,
      is_favorite: data?.is_favorite ?? false,
      is_consume_later: next,
      date: new Date().toISOString(),
    });
    setIsLater(next);
    await refreshStats();
    await refreshUserLog();
  };

  const handleFavorite = async () => {
    const res = await toggleFavorite(id);
    if (res.data) setIsFavorite(res.isFavorite);
    await refreshStats();
  };

  const handleRate = async (val: number) => {
    setUserRating(val);
    await rateMovie(id, val);
    await refreshStats();
    await refreshUserLog();
  };

  if (loading) return <div className="p-6">Yükleniyor…</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!game) return <div className="p-6">Bulunamadı.</div>;

  const similar: any[] = Array.isArray(game.similar_games) ? game.similar_games : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
            {game.cover?.image_id ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={game.name} src={igdbImageUrl(game.cover.image_id, 'cover_big')} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-gray-400">Kapak yok</div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={handlePlayed} className={`px-3 py-2 text-sm rounded ${isPlayed ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>Oynandı</button>
            <button onClick={handleLater} className={`px-3 py-2 text-sm rounded ${isLater ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>Oynanacak</button>
            <button onClick={handleFavorite} className={`px-3 py-2 text-sm rounded ${isFavorite ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>Favori</button>
          </div>
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-1">Puanın</div>
            <Stars value={userRating} onChange={handleRate} />
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{game.name}{year ? ` (${year})` : ''}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            {companies.devs.length > 0 && <div>Firma (Geliştirici): <span className="text-gray-300">{companies.devs.join(', ')}</span></div>}
            {companies.pubs.length > 0 && <div>Yayımcı: <span className="text-gray-300">{companies.pubs.join(', ')}</span></div>}
            {game.platforms?.length ? (
              <div>Platformlar: <span className="text-gray-300">{game.platforms.map((p: any) => p.name).join(', ')}</span></div>
            ) : null}
            {game.genres?.length ? (
              <div>Türler: <span className="text-gray-300">{game.genres.map((g: any) => g.name).join(', ')}</span></div>
            ) : null}
            <div>Ortalama Süre: <span className="text-gray-300">{game.time_to_beat?.normally ? `${Math.round((game.time_to_beat.normally as number) / 3600)} saat` : '-'}</span></div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div>Toplam Oynayan: <span className="text-gray-200 font-medium">{stats.consume_count}</span></div>
            <div>Favoriler: <span className="text-gray-200 font-medium">{stats.favorite_count}</span></div>
            {typeof stats.average_rating === 'number' && (
              <div>Ortalama Puan: <span className="text-gray-200 font-medium">{stats.average_rating.toFixed(1)}</span></div>
            )}
          </div>

          {game.summary ? (
            <p className="text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-line">{game.summary}</p>
          ) : null}
        </div>
      </div>

      {similar.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Benzer Oyunlar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {similar.slice(0, 12).map((s: any) => (
              <Link key={s.id} href={`/content/game/${s.id}`} className="block group">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                  {s.cover?.image_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={s.name} src={igdbImageUrl(s.cover.image_id, 'cover_big')} className="h-full w-full object-cover group-hover:opacity-90 transition" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-500 text-xs">Kapak yok</div>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-200 line-clamp-2">{s.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
