import { supabase } from '@/lib/supabase'
import type { TMDBMovieDetail } from '@/types/tmdb'

export interface Content {
  id: number
  poster_path: string | null
  title: string
  fav_count: number
  user_rating?: number // Kullanıcının verdiği puan
  is_favorite?: boolean // Favori durumu
  date?: string // Log tarihi
  // Supabase istatistikleri
  consume_count?: number // İzlenme sayısı
  favorite_count?: number // Favori sayısı  
  review_count?: number // Yorum sayısı
  average_rating?: number // Ortalama puan
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
export async function getUserWatchedMovies(): Promise<{ data: Content[] }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
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
      const mapped: Content[] = contents.map((item: any) => ({
        id: Number(item.content_id),
        poster_path: item.poster_path ?? null,
        title: item.title ?? '',
        fav_count: item.is_favorite ? 1 : 0,
        user_rating: item.rating ? Number(item.rating) : 0,
        is_favorite: item.is_favorite ?? false,
        date: item.date
      }))
      return { data: mapped }
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
        date: item.date
      }))

    return { data: mapped }
  } catch (error) {
    console.error('Fallback query failed:', error)
    return { data: [] }
  }
}

// Basic stats using get_user_info_with_stats; map to UI shape
export async function getUserStats(): Promise<{ totalMovies: number; thisYearMovies: number; averageRating: number; reviewCount: number }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
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
    // Count from latest_user_content_log view
    const { count: totalMovies } = await supabase
      .from('latest_user_content_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)

    // Count reviews
    const { count: reviewCount } = await supabase
      .from('review')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)

    return {
      totalMovies: totalMovies || 0,
      thisYearMovies: 0, // Would need date filtering
      averageRating: 0, // Would need rating calculation
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
        average_rating: stats.average_rating
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
  
  // Update content stats
  await updateContentStats(contentId)
  
  return { data: true }
}

// Rate a movie (1-5 stars)
export async function rateMovie(contentId: number, rating: number): Promise<{ data: boolean; error?: any }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, error: 'not_authenticated' }

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
    // Check if user already has a log for this content
    const { data: existingLog } = await supabase
      .from('user_content_log')
      .select('id')
      .eq('user_id', uid)
      .eq('content_id', contentId)
      .maybeSingle()

    if (existingLog) {
      // Update existing log with rating
      const { error } = await supabase
        .from('user_content_log')
        .update({ 
          rating: rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id)

      if (error) return { data: false, error }
    } else {
      // Create new log with rating
      const { error } = await supabase
        .from('user_content_log')
        .insert({
          user_id: uid,
          content_id: contentId,
          content_status_id: 1, // CONSUMED
          rating: rating,
          date: new Date().toISOString(),
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

// Get user's rating for a specific movie
export async function getUserRating(contentId: number): Promise<{ rating: number }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { rating: 0 }

  const { data, error } = await supabase
    .from('user_content_log')
    .select('rating')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .maybeSingle()

  if (error || !data) return { rating: 0 }
  return { rating: Number(data.rating) || 0 }
}

// Get user's favorite status for a specific movie
export async function getUserFavoriteStatus(contentId: number): Promise<{ isFavorite: boolean }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { isFavorite: false }

  const { data, error } = await supabase
    .from('user_content_log')
    .select('is_favorite')
    .eq('user_id', uid)
    .eq('content_id', contentId)
    .maybeSingle()

  if (error || !data) return { isFavorite: false }
  return { isFavorite: data.is_favorite ?? false }
}

// Get content statistics from database
export async function getContentStats(contentId: number): Promise<{
  consume_count: number;
  favorite_count: number;
  review_count: number;
  average_rating: number;
}> {
  try {
    // Get consume count (how many users watched)
    const { count: consumeCount } = await supabase
      .from('user_content_log')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId)
      .eq('content_status_id', 1) // CONSUMED

    // Get favorite count
    const { count: favoriteCount } = await supabase
      .from('user_content_log')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId)
      .eq('is_favorite', true)

    // Get review count
    const { count: reviewCount } = await supabase
      .from('review')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', contentId)

    // Get average rating
    const { data: ratingData } = await supabase
      .from('user_content_log')
      .select('rating')
      .eq('content_id', contentId)
      .not('rating', 'is', null)

    let averageRating = 0
    if (ratingData && ratingData.length > 0) {
      const ratings = ratingData.map(r => Number(r.rating)).filter(r => r > 0)
      if (ratings.length > 0) {
        averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      }
    }

    return {
      consume_count: consumeCount || 0,
      favorite_count: favoriteCount || 0,
      review_count: reviewCount || 0,
      average_rating: Math.round(averageRating * 10) / 10 // 1 decimal place
    }
  } catch (error) {
    console.error('Error fetching content stats:', error)
    return {
      consume_count: 0,
      favorite_count: 0,
      review_count: 0,
      average_rating: 0
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
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { data: false, isFavorite: false, error: 'not_authenticated' }

  // Ensure content exists
  const { data: contentRow } = await supabase.from('content').select('id').eq('id', contentId).maybeSingle()
  if (!contentRow) {
    return { data: false, isFavorite: false, error: 'content_not_found' }
  }

  try {
    // Check if user already has a log for this content
    const { data: existingLog } = await supabase
      .from('user_content_log')
      .select('id, is_favorite')
      .eq('user_id', uid)
      .eq('content_id', contentId)
      .maybeSingle()

    const newFavoriteStatus = existingLog ? !existingLog.is_favorite : true

    if (existingLog) {
      // Update existing log
      const { error } = await supabase
        .from('user_content_log')
        .update({ 
          is_favorite: newFavoriteStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLog.id)

      if (error) return { data: false, isFavorite: false, error }
    } else {
      // Create new log with favorite status
      const { error } = await supabase
        .from('user_content_log')
        .insert({
          user_id: uid,
          content_id: contentId,
          content_status_id: 1, // CONSUMED
          is_favorite: newFavoriteStatus,
          date: new Date().toISOString(),
        })

      if (error) return { data: false, isFavorite: false, error }
    }

    // Update content stats
    await updateContentStats(contentId)

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
    // First get reviews with user info
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

    // For each review, get the user's rating from user_content_log and like/reply info
    const reviewsWithEnhancements = await Promise.all(
      (reviewsData || []).map(async (review) => {
        // Get user's rating for this content
        const { data: ratingData } = await supabase
          .from('user_content_log')
          .select('rating')
          .eq('user_id', review.user_id)
          .eq('content_id', contentId)
          .maybeSingle()

        // Get like count and check if current user liked
        const { count: likeCount } = await getReviewLikeCount(review.id)
        const { isLiked } = await isReviewLikedByUser(review.id)
        
        // Get reply count
        const { count: replyCount } = await getReviewReplyCount(review.id)

        return {
          id: review.id,
          user_name: (review.app_user as any)?.username || 'Anonymous',
          rating: ratingData?.rating || null,
          review_text: review.text,
          created_at: review.created_at,
          like_count: likeCount,
          reply_count: replyCount,
          is_liked_by_current_user: isLiked
        }
      })
    )

    return { data: reviewsWithEnhancements }
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
    const { error } = await supabase
      .from('review')
      .insert({
        user_id: uid,
        content_id: contentId,
        text: reviewText,
        created_at: new Date().toISOString()
      })

    if (error) return { data: false, error }

    // Update content stats
    await updateContentStats(contentId)

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

// Get like count for a review
export async function getReviewLikeCount(reviewId: number): Promise<{ count: number }> {
  try {
    const { count } = await supabase
      .from('review_likes')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId)

    return { count: count || 0 }
  } catch (error) {
    console.error('Error getting review like count:', error)
    return { count: 0 }
  }
}

// Check if user liked a review
export async function isReviewLikedByUser(reviewId: number): Promise<{ isLiked: boolean }> {
  const { data: userRes } = await supabase.auth.getUser()
  const uid = userRes.user?.id
  if (!uid) return { isLiked: false }

  try {
    const { data } = await supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', uid)
      .maybeSingle()

    return { isLiked: data !== null }
  } catch (error) {
    console.error('Error checking if review is liked:', error)
    return { isLiked: false }
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

// Get replies for a review
export async function getReviewReplies(reviewId: number): Promise<{ data: ReviewReply[]; error?: any }> {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id

    const { data: repliesData, error } = await supabase
      .from('review_replies')
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
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true })

    if (error) return { data: [], error }

    // Enhance each reply with like info
    const replies: ReviewReply[] = await Promise.all(
      (repliesData || []).map(async (reply) => {
        // Get like count
        const { count } = await getReviewReplyLikeCount(reply.id)
        
        // Check if current user liked this reply
        let isLiked = false
        if (uid) {
          const { isLiked: liked } = await isReviewReplyLikedByUser(reply.id)
          isLiked = liked
        }

        return {
          id: reply.id,
          review_id: reply.review_id,
          user_id: reply.user_id,
          user_name: (reply.app_user as any)?.username || 'Anonymous',
          text: reply.text,
          created_at: reply.created_at,
          parent_reply_id: reply.parent_reply_id,
          like_count: count,
          is_liked_by_current_user: isLiked
        }
      })
    )

    return { data: replies }
  } catch (error) {
    return { data: [], error }
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
