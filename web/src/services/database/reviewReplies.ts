import { supabase } from '@/lib/supabase';
import { ReviewReply } from './movieLogs';

export async function getReviewReplies(reviewId: number): Promise<{ data: ReviewReply[] }> {
  try {
    console.log('Fetching replies for review ID:', reviewId);
    
    // Get current user for like status
    const { data: userRes } = await supabase.auth.getUser();
    const currentUserId = userRes.user?.id;

    const { data, error } = await supabase
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
      .order('created_at', { ascending: true });

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Error fetching review replies:', error);
      return { data: [] };
    }

    // Transform data to match ReviewReply interface
    const transformedData: ReviewReply[] = (data || []).map((item: any) => ({
      id: item.id,
      review_id: item.review_id,
      user_id: item.user_id,
      user_name: item.app_user?.username || 'Unknown User',
      text: item.text,
      created_at: item.created_at,
      parent_reply_id: item.parent_reply_id,
      like_count: 0, // We'll implement like count later
      is_liked_by_current_user: false // We'll implement like status later
    }));

    return { data: transformedData };
  } catch (error) {
    console.error('Error in getReviewReplies:', error);
    return { data: [] };
  }
}

export async function testReviewReplyTable(): Promise<{ exists: boolean; count: number }> {
  try {
    const { data, error, count } = await supabase
      .from('review_replies')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('review_replies table error:', error);
      return { exists: false, count: 0 };
    }

    console.log('review_replies table exists, count:', count);
    return { exists: true, count: count || 0 };
  } catch (error) {
    console.error('Error testing review_replies table:', error);
    return { exists: false, count: 0 };
  }
}
