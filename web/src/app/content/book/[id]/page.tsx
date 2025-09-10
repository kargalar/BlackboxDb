'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getBookById } from '@/services/api/books';
import { 
  getContentById,
  getUserContentLog,
  updateUserContentLog,
  logBookRead,
  toggleFavorite,
  rateMovie,
  getContentReviews,
  addReview,
  saveContentFromBook,
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

export default function BookContentPage() {
  const params = useParams();
  const id = params.id as string;
  console.log('Book page loaded with id:', id);
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DB-driven states
  const [stats, setStats] = useState<{ consume_count: number; favorite_count: number; review_count: number; average_rating?: number; rating_count?: number }>({ consume_count: 0, favorite_count: 0, review_count: 0 });
  const [userRating, setUserRating] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [isLater, setIsLater] = useState(false);
  const [reviews, setReviews] = useState<Array<{ id: number; user_name: string; rating: number | null; review_text: string; created_at: string; like_count: number; reply_count: number; is_liked_by_current_user: boolean }>>([]);
  const [reviewText, setReviewText] = useState('');

  const year = useMemo(() => (book?.publishedDate ? (book.publishedDate.match(/\d{4}/)?.[0] ?? undefined) : undefined), [book]);

  const refreshStats = useCallback(async () => {
    if (!id) return;
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
    if (!id) return;
    const { data } = await getUserContentLog(id);
    if (data) {
      setIsFavorite(!!data.is_favorite);
      setIsLater(!!data.is_consume_later);
      setUserRating(data.rating ? Number(data.rating) : 0);
      setIsRead(Number(data.content_status_id) === 1 || (data.rating ?? 0) > 0);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const b = await getBookById(id);
        if (!cancelled) setBook(b);

        // Ensure content exists in DB for logging/stats
        console.log('Kitap verisi content tablosuna kaydediliyor:', { 
          id, 
          bookTitle: b.title, 
          hasDescription: !!b.description,
          publishedDate: b.publishedDate,
          pageCount: b.pageCount,
          thumbnail: b.thumbnail?.substring(0, 50) + '...'
        });
        const saveResult = await saveContentFromBook(id, {
          title: b.title,
          description: b.description,
          publishedDate: b.publishedDate || undefined,
          pageCount: b.pageCount || undefined,
          thumbnail: b.thumbnail || undefined,
        });
        console.log('Kitap kaydetme sonucu:', saveResult);
        if (saveResult.error) {
          console.error('Kitap content tablosuna kaydedilirken hata:', saveResult.error);
          // Hata mesajını kullanıcıya göster - error objesinin detaylarını göster
          const errorMessage = typeof saveResult.error === 'object' 
            ? (saveResult.error.message || JSON.stringify(saveResult.error))
            : String(saveResult.error);
          if (!cancelled) setError('Kitap bilgileri kaydedilirken hata oluştu: ' + errorMessage);
        } else {
          console.log('Kitap başarıyla content tablosuna kaydedildi, ID:', saveResult.data?.id);
        }
        await Promise.all([refreshStats(), refreshUserLog()]);
        const res = await getContentReviews(id);
        if (!cancelled) setReviews(res.data ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Kitap bulunamadı');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) run();
    return () => { cancelled = true; };
  }, [id, refreshStats, refreshUserLog]);

  const handleRead = async () => {
    console.log('Kitap okuma işlemi başlatılıyor, contentId:', id);
    const result = await logBookRead(id);
    if (result.error) {
      console.error('Kitap okuma loglama hatası:', result.error);
      // Hata mesajını kullanıcıya göster - error objesinin detaylarını göster
      const errorMessage = typeof result.error === 'object' 
        ? (result.error.message || JSON.stringify(result.error))
        : String(result.error);
      alert('Kitap okuma işlemi kaydedilirken hata oluştu: ' + errorMessage);
      return;
    }
    console.log('Kitap okuma işlemi başarıyla tamamlandı');
    setIsRead(true);
    setIsLater(false);
    await refreshStats();
    await refreshUserLog();
  };

  const handleLater = async () => {
    const { data } = await getUserContentLog(id);
    const next = !data?.is_consume_later;
    await updateUserContentLog(id, {
      content_status_id: data?.content_status_id || (isRead ? 1 : 2),
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

  const handleAddReview = async () => {
    const text = reviewText.trim();
    if (!text) return;
    console.log('Adding review:', text, 'for content:', id);
    const ok = await addReview(id, text);
    console.log('Add review result:', ok);
    if (ok.error) {
      console.error('Error adding review:', ok.error);
    }
    if (ok.data) {
      setReviewText('');
      const res = await getContentReviews(id);
      setReviews(res.data ?? []);
      await refreshStats();
    }
  };

  if (loading) return <div className="p-6">Yükleniyor…</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!book) return <div className="p-6">Bulunamadı.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
            {book.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={book.title} src={book.thumbnail} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-gray-400">Kapak yok</div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={handleRead} className={`px-3 py-2 text-sm rounded ${isRead ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>Okundu</button>
            <button onClick={handleLater} className={`px-3 py-2 text-sm rounded ${isLater ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>Sonra</button>
            <button onClick={handleFavorite} className={`px-3 py-2 text-sm rounded ${isFavorite ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}>Favori</button>
          </div>
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-1">Puanın</div>
            <Stars value={userRating} onChange={handleRate} />
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{book.title}{year ? ` (${year})` : ''}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            {book.authors?.length ? (
              <div>Yazarlar: <span className="text-gray-300">{book.authors.join(', ')}</span></div>
            ) : null}
            {book.publisher ? (
              <div>Yayınevi: <span className="text-gray-300">{book.publisher}</span></div>
            ) : null}
            {book.categories?.length ? (
              <div>Türler: <span className="text-gray-300">{book.categories.join(', ')}</span></div>
            ) : null}
            {book.pageCount ? (
              <div>Sayfa: <span className="text-gray-300">{book.pageCount}</span></div>
            ) : null}
            {book.language ? (
              <div>Dil: <span className="text-gray-300">{book.language.toUpperCase()}</span></div>
            ) : null}
          </div>

          {book.description ? (
            <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: book.description }} />
          ) : null}

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div>İzlenme/Okunma: <span className="text-gray-200">{stats.consume_count}</span></div>
            <div>Favori: <span className="text-gray-200">{stats.favorite_count}</span></div>
            <div>Yorum: <span className="text-gray-200">{stats.review_count}</span></div>
            {typeof stats.average_rating === 'number' && (
              <div>Ortalama Puan: <span className="text-gray-200">{stats.average_rating?.toFixed(1)} ({stats.rating_count ?? 0})</span></div>
            )}
          </div>

          <div className="space-y-2 pt-4">
            <div className="text-lg font-semibold">Yorumlar</div>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-gray-800 pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <Link href={`/profile/${r.user_name}`} className="font-medium hover:text-blue-400">{r.user_name}</Link>
                    <span className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {typeof r.rating === 'number' && (
                    <div className="text-xs text-gray-400">Puan: {r.rating.toFixed(1)}</div>
                  )}
                  <div className="text-sm text-gray-300 mt-1">{r.review_text}</div>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Yorum yaz..."
                className="w-full p-2 bg-gray-800 text-white rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex justify-end mt-2">
                <button onClick={handleAddReview} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Gönder</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
