import { supabase } from '@/lib/supabase'
import type { TMDBMovieDetail, TMDBTvDetail } from '@/types/tmdb'
import type { IgdbGame } from '@/types/igdb'
import { igdbImageUrl } from '@/services/api/igdb'

// Helper function to validate authentication and check if user exists
async function validateAuth(): Promise<{ uid: string | null; error?: string }> {
  try {
    const { data: userRes, error: authError } = await supabase.auth.getUser()
    
    if (authError || !userRes.user?.id) {
      return { uid: null, error: 'not_authenticated' }
    }

    // Check if user still exists in app_user table (prevents deleted users from making actions)
    const { data: appUser, error: userError } = await supabase
      .from('app_user')
      .select('auth_user_id')
      .eq('auth_user_id', userRes.user.id)
      .maybeSingle()

    if (userError || !appUser) {
      // User has been deleted but session still exists - sign them out
      await supabase.auth.signOut()
      return { uid: null, error: 'user_not_found' }
    }

    return { uid: userRes.user.id }
  } catch (error) {
    return { uid: null, error: 'auth_validation_failed' }
  }
}

export interface Content {
  id: number
  poster_path: string | null
  title: string
  fav_count: number
  user_rating?: number // Kullanıcının verdiği puan
  is_favorite?: boolean // Favori durumu
  is_consume_later?: boolean // Watchlist durumu
  date?: string // Log tarihi
  // Supabase istatistikleri
  consume_count?: number // İzlenme sayısı
  favorite_count?: number // Favori sayısı  
  review_count?: number // Yorum sayısı
  average_rating?: number // Ortalama puan
  rating_count?: number // Puan veren kişi sayısı
  rating_distribution?: number[] // Rating dağılımı [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
}

export interface Review {
  id: number
  user_id: string
  content_id: number
  text: string
  created_at: string
  rating?: number | null
  like_count?: number
  reply_count?: number
  is_liked_by_current_user?: boolean
  content?: {
    id: number
    title: string
    poster_path: string | null
  }
}

export interface ReviewReply {
  id: number
  review_id: number
  user_id: string
  user_name: string
  text: string
  created_at: string
  parent_reply_id?: number | null
  like_count?: number
  is_liked_by_current_user?: boolean
}

// Fetch current user's watched movies using direct table query (fallback for missing RPC)
export async function getUserWatchedMovies(userId?: string): Promise<{ data: Content[] }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userId || userRes.user?.id
  if (!uid) return { data: [] }

  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_contents', {
      user_id_param: uid,
      log_user_id_param: uid,
      content_type_param: 1, // 1 = MOVIE
      page_param: 1,
      limit_param: 40
    })

    if (!rpcError && rpcData) {
      const contents = (rpcData.contents as any[] | undefined) ?? []
      // Map raw items
      const raw: Content[] = contents.map((item: any) => ({
        id: Number(item.content_id),
        poster_path: item.poster_path ?? null,
        title: item.title ?? '',
        fav_count: item.is_favorite ? 1 : 0,
        user_rating: item.rating ? Number(item.rating) : 0,
        is_favorite: item.is_favorite ?? false,
        is_consume_later: item.is_consume_later ?? false,
        date: item.date
      }))
      // Dedupe by content id keeping the most recent date
      const byId = new Map<number, Content>()
      for (const m of raw) {
        const prev = byId.get(m.id)
        if (!prev) {
          byId.set(m.id, m)
        } else {
          const prevTime = prev.date ? new Date(prev.date).getTime() : 0
          const currTime = m.date ? new Date(m.date).getTime() : 0
          if (currTime > prevTime) byId.set(m.id, m)
        }
      }
      const deduped = Array.from(byId.values()).sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0
        const tb = b.date ? new Date(b.date).getTime() : 0
        return tb - ta
      })
      return { data: deduped }
    }
  } catch (error) {
    console.log('RPC failed, falling back to direct query:', error)
  }

  // Fallback: Direct table query using latest_user_content_log view
  try {
    const { data: logData, error: logError } = await supabase
      .from('latest_user_content_log')
      .select(`
        content_id,
        rating,
        is_favorite,
        is_consume_later,
        date,
        content:content_id (
          id,
          title,
          poster_path,
          favorite_count
        )
      `)
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(40)

    if (logError) {
      console.error('Latest log query failed:', logError)
      return { data: [] }
    }

    const mapped: Content[] = (logData || [])
      .filter(item => item.content)
      .map((item: any) => ({
        id: item.content.id,
        poster_path: item.content.poster_path ?? null,
        title: item.content.title ?? '',
        fav_count: item.content.favorite_count ?? 0,
        user_rating: item.rating ? Number(item.rating) : 0,
        is_favorite: item.is_favorite ?? false,
        is_consume_later: item.is_consume_later ?? false,
        date: item.date
      }))
    // latest_user_content_log is already latest per user+content, but guard-dedupe and sort anyway
    const byId = new Map<number, Content>()
    for (const m of mapped) {
      const prev = byId.get(m.id)
      if (!prev) byId.set(m.id, m)
      else {
        const prevTime = prev.date ? new Date(prev.date).getTime() : 0
        const currTime = m.date ? new Date(m.date).getTime() : 0
        if (currTime > prevTime) byId.set(m.id, m)
      }
    }
    const deduped = Array.from(byId.values()).sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0
      const tb = b.date ? new Date(b.date).getTime() : 0
      return tb - ta
    })

    return { data: deduped }
  } catch (error) {
    console.error('Fallback query failed:', error)
    return { data: [] }
  }
}

// Fetch user's watched TV shows (content_type 3 assumed)
export async function getUserWatchedTV(userId?: string): Promise<{ data: Content[] }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userId || userRes.user?.id
  if (!uid) return { data: [] }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_contents', {
      user_id_param: uid,
      log_user_id_param: uid,
      content_type_param: 3, // 3 = TV
      page_param: 1,
      limit_param: 40,
    })

    if (!rpcError && rpcData) {
      const contents = (rpcData.contents as any[] | undefined) ?? []
      const raw: Content[] = contents.map((item: any) => ({
        id: Number(item.content_id),
        poster_path: item.poster_path ?? null,
        title: item.title ?? '',
        fav_count: item.is_favorite ? 1 : 0,
        user_rating: item.rating ? Number(item.rating) : 0,
        is_favorite: item.is_favorite ?? false,
        is_consume_later: item.is_consume_later ?? false,
        date: item.date,
      }))

      const byId = new Map<number, Content>()
      for (const m of raw) {
        const prev = byId.get(m.id)
        if (!prev) byId.set(m.id, m)
        else {
          const prevTime = prev.date ? new Date(prev.date).getTime() : 0
          const currTime = m.date ? new Date(m.date).getTime() : 0
          if (currTime > prevTime) byId.set(m.id, m)
        }
      }
      const deduped = Array.from(byId.values()).sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0
        const tb = b.date ? new Date(b.date).getTime() : 0
        return tb - ta
      })
      return { data: deduped }
    }
  } catch (error) {
    console.log('RPC failed, falling back to direct query (TV):', error)
  }

  try {
    const { data: logData, error: logError } = await supabase
      .from('latest_user_content_log')
      .select(`
        content_id,
        rating,
        is_favorite,
        is_consume_later,
        date,
        content:content_id (
          id,
          title,
          poster_path,
          favorite_count,
          content_type_id
        )
      `)
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(60)

    if (logError) {
      console.error('Latest log query failed (TV):', logError)
      return { data: [] }
    }

    const mapped: Content[] = (logData || [])
      .filter((item: any) => item.content && (item as any).content.content_type_id === 3)
      .map((item: any) => ({
        id: item.content.id,
        poster_path: item.content.poster_path ?? null,
        title: item.content.title ?? '',
        fav_count: item.content.favorite_count ?? 0,
        user_rating: item.rating ? Number(item.rating) : 0,
        is_favorite: item.is_favorite ?? false,
        is_consume_later: item.is_consume_later ?? false,
        date: item.date,
      }))

    const byId = new Map<number, Content>()
    for (const m of mapped) {
      const prev = byId.get(m.id)
      if (!prev) byId.set(m.id, m)
      else {
        const prevTime = prev.date ? new Date(prev.date).getTime() : 0
        const currTime = m.date ? new Date(m.date).getTime() : 0
        if (currTime > prevTime) byId.set(m.id, m)
      }
    }
    const deduped = Array.from(byId.values()).sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0
      const tb = b.date ? new Date(b.date).getTime() : 0
      return tb - ta
    })

    return { data: deduped }
  } catch (error) {
    console.error('Fallback query failed (TV):', error)
    return { data: [] }
  }
}

// Get reviews by user ID
export async function getReviewsByUserId(userId: string): Promise<{ data: Review[] }> {
  try {
    const { data, error } = await supabase
      .from('review')
      .select(`
        *,
        content:content_id (
          id,
          title,
          poster_path
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews by user id:', error);
      return { data: [] };
    }

    return { data: data as any[] };
  } catch (error) {
    console.error('Error in getReviewsByUserId:', error);
    return { data: [] };
  }
}

// Update a review
export async function updateReview(reviewId: number, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user?.id) {
      return { success: false, error: 'not_authenticated' };
    }

    const { error } = await supabase
      .from('review')
      .update({ text })
      .eq('id', reviewId)
      .eq('user_id', userRes.user.id);

    if (error) {
      console.error('Error updating review:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateReview:', error);
    return { success: false, error: 'update_failed' };
  }
}

// Basic stats using get_user_info_with_stats; map to UI shape
export async function getUserStats(userId?: string): Promise<{ totalMovies: number; thisYearMovies: number; averageRating: number; reviewCount: number }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userId || userRes.user?.id
  if (!uid) return { totalMovies: 0, thisYearMovies: 0, averageRating: 0, reviewCount: 0 }

  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('get_user_info_with_stats', {
      user_uuid: uid,
      profile_user_uuid: uid,
    })

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const row = data[0]
      return {
        totalMovies: Number(row.total_watched_movies ?? 0),
        thisYearMovies: 0, // TODO: add RPC or filter logs for current year
        averageRating: 0, // TODO: compute from logs or add RPC
        reviewCount: 0, // TODO: add RPC for review count per user
      }
    }
  } catch (error) {
    console.log('RPC stats failed, using fallback:', error)
  }

  // Fallback: Calculate from available data
  try {
    // Get unique movies from latest_user_content_log
    const { data: uniqueMovies, error: moviesError } = await supabase
      .from('latest_user_content_log')
      .select('content_id, rating, date')
      .eq('user_id', uid)

    if (moviesError) {
      console.error('Error getting unique movies:', moviesError)
      return { totalMovies: 0, thisYearMovies: 0, averageRating: 0, reviewCount: 0 }
    }

    // Calculate stats from unique movies
    const totalMovies = uniqueMovies?.length || 0
    
    // Calculate this year's movies
    const currentYear = new Date().getFullYear()
    const thisYearMovies = uniqueMovies?.filter(movie => {
      if (!movie.date) return false
      const movieYear = new Date(movie.date).getFullYear()
      return movieYear === currentYear
    }).length || 0

    // Calculate average rating (only from rated movies)
    const ratedMovies = uniqueMovies?.filter(movie => movie.rating && movie.rating > 0) || []
    const averageRating = ratedMovies.length > 0 
      ? Math.round((ratedMovies.reduce((sum, movie) => sum + Number(movie.rating), 0) / ratedMovies.length) * 10) / 10
      : 0

    // Count reviews
    const { count: reviewCount } = await supabase
      .from('review')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)

    return {
      totalMovies,
      thisYearMovies,
      averageRating,
      reviewCount: reviewCount || 0,
    }
  } catch (error) {
    console.error('Fallback stats failed:', error)
    return { totalMovies: 0, thisYearMovies: 0, averageRating: 0, reviewCount: 0 }
  }
}

// --- Movie detail helpers used by movie page ---

export async function getContentById(id: number): Promise<{ data: Content | null }> {
  try {
    // Get content basic info
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .select(`
        id, 
        title, 
        poster_path, 
        consume_count,
        favorite_count,
        review_count,
        rating_distribution
      `)
      .eq('id', id)
      .maybeSingle()

    if (contentError || !contentData) {
      return { data: null }
    }

    // Get real-time stats
    const stats = await getContentStats(id)

    return { 
      data: { 
        id: contentData.id, 
        title: contentData.title, 
        poster_path: contentData.poster_path, 
        fav_count: stats.favorite_count,
        consume_count: stats.consume_count,
        favorite_count: stats.favorite_count,
        review_count: stats.review_count,
        average_rating: stats.average_rating,
        rating_count: stats.rating_count
      } 
    }
  } catch (error) {
    console.error('Error in getContentById:', error)
    return { data: null }
  }
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

export async function saveContentFromTMDBTv(tv: TMDBTvDetail): Promise<{ data: Content | null; error?: any }> {
  const payload = {
    id: tv.id,
    title: tv.name,
    content_type_id: 3, // TV
    release_date: tv.first_air_date ? new Date(tv.first_air_date) : null,
    description: tv.overview,
    length: Array.isArray(tv.episode_run_time) && tv.episode_run_time.length > 0 ? tv.episode_run_time[0] : null,
    poster_path: tv.poster_path ?? null,
  }

  const { data, error } = await supabase
    .from('content')
    .upsert(payload, { onConflict: 'id' })
    .select('id, title, poster_path, favorite_count')
    .maybeSingle()

  if (error) return { data: null, error }
  if (!data) return { data: null }
  return { data: { id: data.id, title: data.title, poster_path: data.poster_path, fav_count: (data as any).favorite_count ?? 0 } }
}

export async function saveContentFromIGDB(game: IgdbGame): Promise<{ data: Content | null; error?: any }> {
  // Insert or update content row using IGDB id as primary key
  const payload = {
    id: game.id,
    title: game.name,
    content_type_id: 2, // GAME
    release_date: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
    description: game.summary ?? null,
    length: null as number | null, // could be filled later from HLTB
    poster_path: game.cover?.image_id ? igdbImageUrl(game.cover.image_id, 'cover_big') : null,
  }

  const { data, error } = await supabase
    .from('content')
    .upsert(payload, { onConflict: 'id' })
    .select('id, title, poster_path, favorite_count')
    .maybeSingle()

  if (error) return { data: null, error }
  if (!data) return { data: null }
  return { data: { id: data.id, title: data.title, poster_path: data.poster_path, fav_count: (data as any).favorite_count ?? 0 } }
}

export async function isMovieWatched(contentId: number): Promise<{ isWatched: boolean }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { isWatched: false }
  // Use latest log to determine watched status
  const { data } = await supabase
    .from('latest_user_content_log')
    .select('content_status_id')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .maybeSingle()

  return { isWatched: !!data && (data as any).content_status_id === 1 }
}

export async function logMovieWatch(contentId: number): Promise<{ data: boolean; error?: any }> {
  const { uid, error: authError } = await validateAuth()
  if (authError || !uid) return { data: false, error: authError || 'not_authenticated' }

  // Ensure content exists minimally
  const { data: contentRow } = await supabase.from('content').select('id').eq('id', contentId).maybeSingle()
  if (!contentRow) {
    return { data: false, error: 'content_not_found' }
  }

  try {
    // Create a new log entry for each watch (allows multiple views)
    const result = await createUserContentLog(contentId, {
      content_status_id: 1, // CONSUMED
      is_consume_later: false, // marking watched clears watchlist
      date: new Date().toISOString(),
    })

    if (!result.data) return { data: false, error: result.error }
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Rate a movie (1-5 stars)
export async function rateMovie(contentId: number, rating: number): Promise<{ data: boolean; error?: any }> {
  const { uid, error: authError } = await validateAuth()
  if (authError || !uid) return { data: false, error: authError || 'not_authenticated' }

  // Validate rating
  if (rating < 1 || rating > 5) {
    return { data: false, error: 'invalid_rating' }
  }

  // Ensure content exists
  const { data: contentRow } = await supabase.from('content').select('id').eq('id', contentId).maybeSingle()
  if (!contentRow) {
    return { data: false, error: 'content_not_found' }
  }

  try {
    // Create a new log for rating (each rating is a separate viewing experience)
    const result = await createUserContentLog(contentId, {
      content_status_id: 1, // rating implies watched
      rating: rating,
      is_consume_later: false, // marking watched clears watchlist
      date: new Date().toISOString(),
    })

    if (!result.data) return { data: false, error: result.error }
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Get user's rating for a specific movie
export async function getUserRating(contentId: number): Promise<{ rating: number }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { rating: 0 }
  // Use latest user log snapshot
  const { data } = await supabase
    .from('latest_user_content_log')
    .select('rating')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .maybeSingle()

  return { rating: data && (data as any).rating ? Number((data as any).rating) : 0 }
}

// Get user's favorite status for a specific movie
export async function getUserFavoriteStatus(contentId: number): Promise<{ isFavorite: boolean }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { isFavorite: false }
  const { data } = await supabase
    .from('latest_user_content_log')
    .select('is_favorite')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .maybeSingle()

  return { isFavorite: !!data && !!(data as any).is_favorite }
}

// Get content statistics from database
export async function getContentStats(contentId: number): Promise<{
  consume_count: number;
  favorite_count: number;
  review_count: number;
  average_rating: number;
  rating_count: number;
}> {
  try {
    // Fetch in parallel using latest_user_content_log to avoid double-counting
    const [consumeRes, favRes, reviewRes, ratingRes] = await Promise.all([
      supabase
        .from('latest_user_content_log')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', contentId)
        .eq('content_status_id', 1),
      supabase
        .from('latest_user_content_log')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', contentId)
        .eq('is_favorite', true),
      supabase
        .from('review')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', contentId),
      supabase
        .from('latest_user_content_log')
        .select('rating')
        .eq('content_id', contentId)
        .not('rating', 'is', null),
    ])

    let averageRating = 0
    const ratingData = (ratingRes.data || []) as any[]
    const ratingCount = ratingData.length
    if (ratingData.length > 0) {
      const ratings = ratingData.map(r => Number(r.rating)).filter(r => r > 0)
      if (ratings.length > 0) {
        averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      }
    }

    return {
      consume_count: consumeRes.count || 0,
      favorite_count: favRes.count || 0,
      review_count: reviewRes.count || 0,
      average_rating: Math.round(averageRating * 10) / 10, // 1 decimal place
      rating_count: ratingCount
    }
  } catch (error) {
    console.error('Error fetching content stats:', error)
    return {
      consume_count: 0,
      favorite_count: 0,
      review_count: 0,
      average_rating: 0,
      rating_count: 0
    }
  }
}

// Update content statistics in content table
export async function updateContentStats(contentId: number): Promise<{ success: boolean }> {
  try {
    const stats = await getContentStats(contentId)
    
    const { error } = await supabase
      .from('content')
      .update({
        consume_count: stats.consume_count,
        favorite_count: stats.favorite_count,
        review_count: stats.review_count,
        // Store rating as 0-10 scale for compatibility with TMDB
        rating_distribution: [0, 0, 0, 0, 0] // Could be expanded later for rating distribution
      })
      .eq('id', contentId)

    if (error) {
      console.error('Error updating content stats:', error)
      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateContentStats:', error)
    return { success: false }
  }
}

// Toggle favorite status for a movie
export async function toggleFavorite(contentId: number): Promise<{ data: boolean; isFavorite: boolean; error?: any }> {
  const { uid, error: authError } = await validateAuth()
  if (authError || !uid) return { data: false, isFavorite: false, error: authError || 'not_authenticated' }

  // Ensure content exists
  const { data: contentRow } = await supabase.from('content').select('id').eq('id', contentId).maybeSingle()
  if (!contentRow) {
    return { data: false, isFavorite: false, error: 'content_not_found' }
  }

  try {
    // Read latest favorite state
    const { data: latest } = await supabase
      .from('latest_user_content_log')
      .select('is_favorite, content_status_id, rating')
      .eq('user_id', uid)
      .eq('content_id', contentId)
      .maybeSingle()

    const prevFav = latest ? !!(latest as any).is_favorite : false
    const prevStatus = latest ? Number((latest as any).content_status_id) : 1
    const prevRating = latest ? ((latest as any).rating ?? null) : null
    const newFavoriteStatus = !prevFav

    // Use updateUserContentLog to prevent duplicates
    const result = await updateUserContentLog(contentId, {
      content_status_id: prevStatus || 1,
      rating: prevRating,
      is_favorite: newFavoriteStatus,
      // Keep watchlist status unchanged
      date: new Date().toISOString(),
    })

    if (!result.data) return { data: false, isFavorite: false, error: result.error }
    return { data: true, isFavorite: newFavoriteStatus }
  } catch (error) {
    return { data: false, isFavorite: false, error }
  }
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

// Get reviews for a specific content
export async function getContentReviews(contentId: number): Promise<{
  data: Array<{
    id: number;
    user_name: string;
    rating: number | null;
    review_text: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    is_liked_by_current_user: boolean;
  }>;
  error?: any;
}> {
  try {
    // Get reviews with user info
    const { data: reviewsData, error: reviewError } = await supabase
      .from('review')
      .select(`
        id,
        text,
        created_at,
        user_id,
        app_user!inner (
          username
        )
      `)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })

    if (reviewError) {
      console.error('Error fetching reviews:', reviewError)
      return { data: [], error: reviewError }
    }

    const reviewIds = (reviewsData || []).map(r => r.id)
    const userIds = Array.from(new Set((reviewsData || []).map(r => r.user_id)))

    // Batch: latest ratings per review's author for this content + likes + replies
    const [{ data: ratingsData }, { data: likesData }, { data: repliesData }] = await Promise.all([
      supabase
        .from('latest_user_content_log')
        .select('user_id, rating')
        .eq('content_id', contentId)
        .in('user_id', userIds),
      supabase
        .from('review_likes')
        .select('review_id, user_id')
        .in('review_id', reviewIds),
      supabase
        .from('review_replies')
        .select('review_id')
        .in('review_id', reviewIds),
    ])

    // Build maps
    const ratingMap = new Map<string, number | null>()
    ;(ratingsData || []).forEach((r: any) => {
      ratingMap.set(r.user_id, r.rating ?? null)
    })

    const likeCountMap = new Map<number, number>()
    const replyCountMap = new Map<number, number>()

    ;(likesData || []).forEach((l: any) => {
      likeCountMap.set(l.review_id, (likeCountMap.get(l.review_id) || 0) + 1)
    })
    ;(repliesData || []).forEach((rp: any) => {
      replyCountMap.set(rp.review_id, (replyCountMap.get(rp.review_id) || 0) + 1)
    })

    // Current user's liked set
    let likedSet = new Set<number>()
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (uid) {
      (likesData || []).forEach((l: any) => {
        if (l.user_id === uid) likedSet.add(l.review_id)
      })
    }

    const enhanced = (reviewsData || []).map((review) => ({
      id: review.id,
      user_name: (review.app_user as any)?.username || 'Anonymous',
      rating: ratingMap.get(review.user_id) ?? null,
      review_text: review.text,
      created_at: review.created_at,
      like_count: likeCountMap.get(review.id) || 0,
      reply_count: replyCountMap.get(review.id) || 0,
      is_liked_by_current_user: likedSet.has(review.id)
    }))

    return { data: enhanced }
  } catch (error) {
    console.error('Error in getContentReviews:', error)
    return { data: [], error }
  }
}

// Add a review for content
export async function addReview(contentId: number, reviewText: string): Promise<{ data: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, error: 'not_authenticated' }

  try {
    // Ensure content exists
    const { data: contentRow } = await supabase.from('content').select('id').eq('id', contentId).maybeSingle()
    if (!contentRow) {
      return { data: false, error: 'content_not_found' }
    }

    // Insert review
    const { data: reviewData, error: reviewError } = await supabase
      .from('review')
      .insert({
        user_id: uid,
        content_id: contentId,
        text: reviewText,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (reviewError) return { data: false, error: reviewError }

    // Always create a new log that references this review
    await supabase
      .from('user_content_log')
      .insert({
        user_id: uid,
        content_id: contentId,
        content_status_id: 1, // treat review as after watch
        review_id: reviewData.id,
        date: new Date().toISOString(),
      })

    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// ============= REVIEW LIKES =============

// Toggle like on a review
export async function toggleReviewLike(reviewId: number): Promise<{ data: boolean; isLiked: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, isLiked: false, error: 'not_authenticated' }

  try {
    // Check if user already liked this review
    const { data: existingLike } = await supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', uid)
      .maybeSingle()

    if (existingLike) {
      // Unlike: Remove the like
      const { error } = await supabase
        .from('review_likes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', uid)

      if (error) return { data: false, isLiked: false, error }
      return { data: true, isLiked: false }
    } else {
      // Like: Add the like
      const { error } = await supabase
        .from('review_likes')
        .insert({
          review_id: reviewId,
          user_id: uid,
          created_at: new Date().toISOString()
        })

      if (error) return { data: false, isLiked: false, error }
      return { data: true, isLiked: true }
    }
  } catch (error) {
    return { data: false, isLiked: false, error }
  }
}

// ============= REVIEW REPLIES =============

// Add a reply to a review
export async function addReviewReply(reviewId: number, text: string, parentReplyId?: number): Promise<{ data: ReviewReply | null; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: null, error: 'not_authenticated' }

  try {
    // Insert the reply
    const { data: replyData, error } = await supabase
      .from('review_replies')
      .insert({
        review_id: reviewId,
        user_id: uid,
        text: text.trim(),
        parent_reply_id: parentReplyId || null,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        review_id,
        user_id,
        text,
        created_at,
        parent_reply_id,
        app_user!inner (
          username
        )
      `)
      .single()

    if (error) return { data: null, error }

    const reply: ReviewReply = {
      id: replyData.id,
      review_id: replyData.review_id,
      user_id: replyData.user_id,
      user_name: (replyData.app_user as any)?.username || 'Anonymous',
      text: replyData.text,
      created_at: replyData.created_at,
      parent_reply_id: replyData.parent_reply_id,
      like_count: 0,
      is_liked_by_current_user: false
    }

    return { data: reply }
  } catch (error) {
    return { data: null, error }
  }
}

// Get reply count for a review
export async function getReviewReplyCount(reviewId: number): Promise<{ count: number }> {
  try {
    const { count } = await supabase
      .from('review_replies')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    return { count: count || 0 }
  } catch (error) {
    console.error('Error getting review reply count:', error)
    return { count: 0 }
  }
}

// ============= REVIEW REPLY LIKES =============

// Toggle like on a review reply
export async function toggleReviewReplyLike(replyId: number): Promise<{ data: boolean; isLiked: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, isLiked: false, error: 'not_authenticated' }

  try {
    // Check if user already liked this reply
    const { data: existingLike } = await supabase
      .from('review_reply_likes')
      .select('id')
      .eq('reply_id', replyId)
      .eq('user_id', uid)
      .maybeSingle()

    if (existingLike) {
      // Unlike: Remove the like
      const { error } = await supabase
        .from('review_reply_likes')
        .delete()
        .eq('reply_id', replyId)
        .eq('user_id', uid)

      if (error) return { data: false, isLiked: false, error }
      return { data: true, isLiked: false }
    } else {
      // Like: Add the like
      const { error } = await supabase
        .from('review_reply_likes')
        .insert({
          reply_id: replyId,
          user_id: uid,
          created_at: new Date().toISOString()
        })

      if (error) return { data: false, isLiked: false, error }
      return { data: true, isLiked: true }
    }
  } catch (error) {
    return { data: false, isLiked: false, error }
  }
}

// Get like count for a review reply
export async function getReviewReplyLikeCount(replyId: number): Promise<{ count: number }> {
  try {
    const { count } = await supabase
      .from('review_reply_likes')
      .select('*', { count: 'exact', head: true })
      .eq('reply_id', replyId)

    return { count: count || 0 }
  } catch (error) {
    console.error('Error getting review reply like count:', error)
    return { count: 0 }
  }
}

// Check if user liked a review reply
export async function isReviewReplyLikedByUser(replyId: number): Promise<{ isLiked: boolean }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { isLiked: false }

  try {
    const { data } = await supabase
      .from('review_reply_likes')
      .select('id')
      .eq('reply_id', replyId)
      .eq('user_id', uid)
      .maybeSingle()

    return { isLiked: data !== null }
  } catch (error) {
    console.error('Error checking if review reply is liked:', error)
    return { isLiked: false }
  }
}

// ============= USER CONTENT LOG MANAGEMENT =============

export interface UserContentLog {
  id: number
  user_id: string
  content_id: number
  content_status_id: number
  rating: number | null
  is_favorite: boolean
  is_consume_later: boolean
  review_id: number | null
  date: string
  updated_at: string
}

// Get user's log for specific content
export async function getUserContentLog(contentId: number): Promise<{ data: UserContentLog | null; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: null, error: 'not_authenticated' }

  try {
    const { data, error } = await supabase
      .from('user_content_log')
      .select('*')
      .eq('user_id', uid)
      .eq('content_id', contentId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return { data: null, error }
    return { data: data as UserContentLog | null }
  } catch (error) {
    return { data: null, error }
  }
}

// Get all user's logs for specific content
export async function getUserContentLogs(contentId: number): Promise<{ data: UserContentLog[]; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: [], error: 'not_authenticated' }

  try {
    const { data, error } = await supabase
      .from('user_content_log')
      .select('*')
      .eq('user_id', uid)
      .eq('content_id', contentId)
      .order('date', { ascending: false })

    if (error) return { data: [], error }
    return { data: (data as UserContentLog[]) || [] }
  } catch (error) {
    return { data: [], error }
  }
}

// Create a new user content log (allows multiple logs per content)
export async function createUserContentLog(
  contentId: number,
  logData: {
    rating?: number | null
    is_favorite?: boolean
    is_consume_later?: boolean
    content_status_id?: number
    date?: string
  }
): Promise<{ data: boolean; error?: any }> {
  const { uid, error: authError } = await validateAuth()
  if (authError || !uid) return { data: false, error: authError || 'not_authenticated' }

  try {
    // Always create a new log entry (allows multiple views/logs per content)
    const { error } = await supabase
      .from('user_content_log')
      .insert({
        user_id: uid,
        content_id: contentId,
        content_status_id: logData.content_status_id || 1,
        rating: logData.rating ?? null,
        is_favorite: logData.is_favorite ?? false,
        is_consume_later: logData.is_consume_later ?? false,
        date: logData.date || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (error) return { data: false, error }

    // Update content stats
    await updateContentStats(contentId)
    
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Update user's content log (updates latest log or creates new one)
export async function updateUserContentLog(
  contentId: number,
  updates: {
    rating?: number | null
    is_favorite?: boolean
    is_consume_later?: boolean
    content_status_id?: number
    date?: string
  }
): Promise<{ data: boolean; error?: any }> {
  const { uid, error: authError } = await validateAuth()
  if (authError || !uid) return { data: false, error: authError || 'not_authenticated' }

  try {
    // Get the latest log for this content
    const { data: existingLog } = await supabase
      .from('user_content_log')
      .select('*')
      .eq('user_id', uid)
      .eq('content_id', contentId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Check if this is a significant change that warrants a new log
    const isSignificantChange = existingLog && (
      // Rating changed significantly
      (updates.rating !== undefined && updates.rating !== existingLog.rating) ||
      // Status changed (watched vs not watched)
      (updates.content_status_id !== undefined && updates.content_status_id !== existingLog.content_status_id) ||
      // More than 1 hour since last log
      (existingLog.date && new Date().getTime() - new Date(existingLog.date).getTime() > 60 * 60 * 1000)
    )

    if (existingLog && !isSignificantChange) {
      // Update existing log for minor changes
      const { error } = await supabase
        .from('user_content_log')
        .update({
          content_status_id: updates.content_status_id ?? existingLog.content_status_id,
          rating: updates.rating !== undefined ? updates.rating : existingLog.rating,
          is_favorite: updates.is_favorite !== undefined ? updates.is_favorite : existingLog.is_favorite,
          is_consume_later: updates.is_consume_later !== undefined ? updates.is_consume_later : existingLog.is_consume_later,
          date: updates.date || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id)
        .eq('user_id', uid)
      
      if (error) return { data: false, error }
    } else {
      // Create new log for significant changes or if no log exists
      const { error } = await supabase
        .from('user_content_log')
        .insert({
          user_id: uid,
          content_id: contentId,
          content_status_id: updates.content_status_id || (existingLog?.content_status_id ?? 1),
          rating: updates.rating !== undefined ? updates.rating : (existingLog?.rating ?? null),
          is_favorite: updates.is_favorite !== undefined ? updates.is_favorite : (existingLog?.is_favorite ?? false),
          is_consume_later: updates.is_consume_later !== undefined ? updates.is_consume_later : (existingLog?.is_consume_later ?? false),
          date: updates.date || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (error) return { data: false, error }
    }

    // Update content stats
    await updateContentStats(contentId)
    
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Update specific user content log by ID
export async function updateUserContentLogById(
  logId: number,
  updates: {
    rating?: number | null
    is_favorite?: boolean
    is_consume_later?: boolean
    content_status_id?: number
    date?: string
  }
): Promise<{ data: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, error: 'not_authenticated' }

  try {
    // Update specific log by ID, ensuring it belongs to the current user
    const { error } = await supabase
      .from('user_content_log')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .eq('user_id', uid) // Security: ensure user owns this log

    if (error) return { data: false, error }

    // Get content_id to update stats
    const { data: logData } = await supabase
      .from('user_content_log')
      .select('content_id')
      .eq('id', logId)
      .single()

    if (logData) {
      await updateContentStats(logData.content_id)
    }
    
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Delete user's content log
export async function deleteUserContentLog(contentId: number): Promise<{ data: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, error: 'not_authenticated' }

  try {
    const { error } = await supabase
      .from('user_content_log')
      .delete()
      .eq('user_id', uid)
      .eq('content_id', contentId)

    if (error) return { data: false, error }

    // Update content stats
    await updateContentStats(contentId)
    
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Delete specific user content log by ID
export async function deleteUserContentLogById(logId: number): Promise<{ data: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, error: 'not_authenticated' }

  try {
    // Get content_id before deleting for stats update
    const { data: logData } = await supabase
      .from('user_content_log')
      .select('content_id')
      .eq('id', logId)
      .eq('user_id', uid) // Security check
      .single()

    if (!logData) return { data: false, error: 'log_not_found_or_not_owned' }

    const { error } = await supabase
      .from('user_content_log')
      .delete()
      .eq('id', logId)
      .eq('user_id', uid) // Security: ensure user owns this log

    if (error) return { data: false, error }

    // Update content stats
    await updateContentStats(logData.content_id)
    
    return { data: true }
  } catch (error) {
    return { data: false, error }
  }
}

// Get user activity feed
export async function getActivityFeed(userId: string): Promise<{ data: any[] }> {
    try {
      const { data, error } = await supabase
        .from('latest_user_content_log')
        .select(`
          *,
          content:content_id (
            id,
            title,
            poster_path
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(50);
  
      if (error) {
        console.error('Error fetching activity feed:', error);
        return { data: [] };
      }
  
      return { data: data || [] };
    } catch (error) {
      console.error('Error in getActivityFeed:', error);
      return { data: [] };
    }
  }

// Get all user logs with pagination
export async function getUserLogs(page: number = 1, limit: number = 20): Promise<{
  data: Array<UserContentLog & { content: { id: number; title: string; poster_path: string | null } }>;
  error?: any;
}> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: [], error: 'not_authenticated' }

  try {
    const { data, error } = await supabase
      .from('user_content_log')
      .select(`
        *,
        content:content_id (
          id,
          title,
          poster_path
        )
      `)
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (error) return { data: [], error }
    return { data: (data || []) as any }
  } catch (error) {
    return { data: [], error }
  }
}

// Get user's watched percentage for a person's movies
export async function getUserPersonWatchedPercentage(personId: number): Promise<{
  watchedCount: number;
  totalCount: number;
  percentage: number;
}> {
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes.user?.id) return { watchedCount: 0, totalCount: 0, percentage: 0 }

  try {
    // Get all movies for this person from TMDB
    const person = await fetch(`https://api.themoviedb.org/3/person/${personId}?append_to_response=movie_credits&api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`)
      .then(res => res.json())
    
    const movieIds = person.movie_credits?.cast?.map((movie: any) => movie.id) || []
    
    if (movieIds.length === 0) {
      return { watchedCount: 0, totalCount: 0, percentage: 0 }
    }

    // Check how many of these movies the user has watched
    const { data: watchedMovies } = await supabase
      .from('user_content_log')
      .select('content_id')
      .eq('user_id', userRes.user.id)
      .eq('content_status_id', 1) // Watched status
      .in('content_id', movieIds)

    const watchedCount = watchedMovies?.length || 0
    const totalCount = movieIds.length
    const percentage = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0

    return { watchedCount, totalCount, percentage }
  } catch (error) {
    console.error('Error getting person watched percentage:', error)
    return { watchedCount: 0, totalCount: 0, percentage: 0 }
  }
}

// Get user's watch status for person's movies
export async function getUserPersonMoviesWatchStatus(personId: number, movieIds: number[]): Promise<{
  [movieId: number]: {
    watched: boolean;
    rating?: number;
    favorite: boolean;
  }
}> {
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes.user?.id) return {}

  try {
    const { data: logs } = await supabase
      .from('user_content_log')
      .select('content_id, content_status_id, rating, is_favorite')
      .eq('user_id', userRes.user.id)
      .in('content_id', movieIds)

    const statusMap: { [movieId: number]: { watched: boolean; rating?: number; favorite: boolean } } = {}
    
    logs?.forEach(log => {
      statusMap[parseInt(log.content_id)] = {
        watched: log.content_status_id === 1,
        rating: log.rating || undefined,
        favorite: log.is_favorite || false
      }
    })

    return statusMap
  } catch (error) {
    console.error('Error getting person movies watch status:', error)
    return {}
  }
}

export async function getTrendingReviews(limit: number = 10): Promise<{ data: Review[] }> {
  try {
    const { data, error } = await supabase
      .from('review')
      .select(`
        *,
        content:content_id (
          id,
          title,
          poster_path
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching trending reviews:', error);
      return { data: [] };
    }

    return { data: data as any[] };
  } catch (error) {
    console.error('Error in getTrendingReviews:', error);
    return { data: [] };
  }
}
