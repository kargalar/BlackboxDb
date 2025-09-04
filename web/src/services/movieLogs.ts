import { supabase } from '@/lib/supabase'
import type { TMDBMovieDetail } from '@/types/tmdb'

export interface Content {
  id: number
  poster_path: string | null
  title: string
  fav_count: number
}

export interface Review {
  id: number
  user_id: string
  content_id: number
  text: string
  created_at: string
  rating?: number | null
}

// Fetch current user's watched movies using existing RPC get_user_contents
export async function getUserWatchedMovies(): Promise<{ data: Content[] }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: [] }

  const { data, error } = await supabase.rpc('get_user_contents', {
    user_id_param: uid,
    log_user_id_param: uid,
    content_type_param: 1, // 1 = MOVIE
    page_param: 1,
    limit_param: 40
  })

  if (error || !data) return { data: [] }

  try {
    const contents = (data.contents as any[] | undefined) ?? []
    const mapped: Content[] = contents.map((item: any) => ({
      id: Number(item.content_id),
      poster_path: item.poster_path ?? null,
      title: item.title ?? '',
      fav_count: item.is_favorite ? 1 : 0,
    }))
    return { data: mapped }
  } catch {
    return { data: [] }
  }
}

// Basic stats using get_user_info_with_stats; map to UI shape
export async function getUserStats(): Promise<{ totalMovies: number; thisYearMovies: number; averageRating: number; reviewCount: number }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { totalMovies: 0, thisYearMovies: 0, averageRating: 0, reviewCount: 0 }

  const { data, error } = await supabase.rpc('get_user_info_with_stats', {
    user_uuid: uid,
    profile_user_uuid: uid,
  })

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { totalMovies: 0, thisYearMovies: 0, averageRating: 0, reviewCount: 0 }
  }

  const row = data[0]
  return {
    totalMovies: Number(row.total_watched_movies ?? 0),
    thisYearMovies: 0, // TODO: add RPC or filter logs for current year
    averageRating: 0, // TODO: compute from logs or add RPC
    reviewCount: 0, // TODO: add RPC for review count per user
  }
}

// --- Movie detail helpers used by movie page ---

export async function getContentById(id: number): Promise<{ data: Content | null }> {
  const { data, error } = await supabase
    .from('content')
    .select('id, title, poster_path, favorite_count')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return { data: null }
  return { data: { id: data.id, title: data.title, poster_path: data.poster_path, fav_count: data.favorite_count ?? 0 } }
}

export async function saveContentFromTMDB(movie: TMDBMovieDetail): Promise<{ data: Content | null; error?: any }> {
  // Insert or update content row using TMDB id as primary key
  const payload = {
    id: movie.id, // Use TMDB id to align with routing
    title: movie.title,
    content_type_id: 1,
    release_date: movie.release_date ? new Date(movie.release_date) : null,
    description: movie.overview,
    length: movie.runtime ?? null,
    poster_path: movie.poster_path ?? null,
  }

  const { data, error } = await supabase
    .from('content')
    .upsert(payload, { onConflict: 'id' })
    .select('id, title, poster_path, favorite_count')
    .maybeSingle()

  if (error) return { data: null, error }
  if (!data) return { data: null }
  return { data: { id: data.id, title: data.title, poster_path: data.poster_path, fav_count: data.favorite_count ?? 0 } }
}

export async function isMovieWatched(contentId: number): Promise<{ isWatched: boolean }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { isWatched: false }

  const { data, error } = await supabase
    .from('user_content_log')
    .select('id')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .limit(1)

  if (error) return { isWatched: false }
  return { isWatched: Array.isArray(data) && data.length > 0 }
}

export async function logMovieWatch(contentId: number): Promise<{ data: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, error: 'not_authenticated' }

  // Ensure content exists minimally
  const { data: contentRow } = await supabase.from('content').select('id').eq('id', contentId).maybeSingle()
  if (!contentRow) {
    return { data: false, error: 'content_not_found' }
  }

  const { error } = await supabase.from('user_content_log').insert({
    user_id: uid,
    content_id: contentId,
    content_status_id: 1, // CONSUMED
    date: new Date().toISOString(),
  })
  if (error) return { data: false, error }
  return { data: true }
}

export async function removeMovieWatch(contentId: number): Promise<{ success: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { success: false, error: 'not_authenticated' }

  // Get latest log id for this content/user
  const { data: logs, error: selErr } = await supabase
    .from('user_content_log')
    .select('id')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .order('date', { ascending: false })
    .limit(1)

  if (selErr) return { success: false, error: selErr }
  const logId = logs?.[0]?.id
  if (!logId) return { success: true }

  const { error } = await supabase.from('user_content_log').delete().eq('id', logId)
  if (error) return { success: false, error }
  return { success: true }
}

export async function addMovieReview(contentId: number, text: string, rating?: number): Promise<{ success: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { success: false, error: 'not_authenticated' }

  const { error } = await supabase.from('review').insert({
    user_id: uid,
    content_id: contentId,
    text,
    // rating field is in user_content_log; review table has only text; ignore rating for now
  })
  if (error) return { success: false, error }
  return { success: true }
}

export async function getMovieReviews(contentId: number): Promise<{ data: Review[] }> {
  const { data, error } = await supabase
    .from('review')
    .select('id, user_id, content_id, text, created_at')
    .eq('content_id', contentId)
    .order('created_at', { ascending: false })

  if (error || !data) return { data: [] }
  return { data: data as Review[] }
}

export async function getUserMovieReview(contentId: number): Promise<{ data: Review | null }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: null }

  const { data, error } = await supabase
    .from('review')
    .select('id, user_id, content_id, text, created_at')
    .eq('content_id', contentId)
    .eq('user_id', uid)
    .maybeSingle()

  if (error || !data) return { data: null }
  return { data: data as Review }
}
