import { supabase } from '@/lib/supabase';
import { ReviewReply } from './movieLogs';

export async function getReviewReplies(reviewId: number): Promise<{ data: ReviewReply[] }> {
  try {
    console.log('Fetching replies for review ID:', reviewId);
    const { data, error } = await supabase
      .from('review_reply')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    console.log('Supabase response:', { data, error });

    if (error) {
      console.error('Error fetching review replies:', error);
      return { data: [] };
    }
    return { data: data as ReviewReply[] };
  } catch (error) {
    console.error('Error in getReviewReplies:', error);
    return { data: [] };
  }
}

export async function testReviewReplyTable(): Promise<{ exists: boolean; count: number }> {
  try {
    const { data, error, count } = await supabase
      .from('review_reply')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('review_reply table error:', error);
      return { exists: false, count: 0 };
    }

    console.log('review_reply table exists, count:', count);
    return { exists: true, count: count || 0 };
  } catch (error) {
    console.error('Error testing review_reply table:', error);
    return { exists: false, count: 0 };
  }
}
