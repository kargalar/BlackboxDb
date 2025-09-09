import { supabase } from '@/lib/supabase'

export interface ContentRequest {
  id: number
  requester_user_id: string
  title: string
  content_type_id: number
  release_date?: string | null
  description?: string | null
  poster_path?: string | null
  external_ids?: any | null
  status_id: number // 1=PENDING, 2=APPROVED, 3=REJECTED
  admin_user_id?: string | null
  rejection_reason?: string | null
  decided_at?: string | null
  created_at: string
  updated_at: string
}

export const ContentRequestStatus = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const

// Create a new content request for current user
export async function createContentRequest(payload: {
  title: string
  content_type_id: number
  description?: string | null
  release_date?: string | null
  year?: number | null
  duration_minutes?: number | null
  poster_path?: string | null
  external_ids?: any | null
  details?: any | null
}) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: authError || 'Not authenticated' }

  const { data, error } = await supabase
    .from('content_request')
    .insert({
      requester_user_id: user.id,
      title: payload.title,
      content_type_id: payload.content_type_id,
      release_date: payload.release_date ?? null,
      year: payload.year ?? null,
      duration_minutes: payload.duration_minutes ?? null,
      description: payload.description ?? null,
      poster_path: payload.poster_path ?? null,
      external_ids: payload.external_ids ?? null,
      details: payload.details ?? null,
      status_id: ContentRequestStatus.PENDING,
    })
    .select('*')
    .single()

  return { data, error }
}

// List current user's requests
export async function listMyContentRequests() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] as ContentRequest[], error: 'Not authenticated' }
  const { data, error } = await supabase
    .from('content_request')
    .select('*')
    .eq('requester_user_id', user.id)
    .order('created_at', { ascending: false })
  return { data: (data || []) as ContentRequest[], error }
}

// Admin/Moderator: list pending requests
export async function listPendingContentRequests() {
  const { data, error } = await supabase
    .from('content_request')
    .select('*, requester:app_user!content_request_requester_user_id_fkey (username, picture_path)')
    .eq('status_id', ContentRequestStatus.PENDING)
    .order('created_at', { ascending: true })
  return { data: (data || []) as any[], error }
}

// Admin/Moderator: approve a request (returns new content id)
export async function approveContentRequest(id: number) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { data: null, error: authError || 'Not authenticated' }
  const { data, error } = await supabase
    .rpc('approve_content_request', { p_request_id: id, p_admin_id: user.id })
  return { data: (data as number | null), error }
}

// Admin/Moderator: reject a request with reason
export async function rejectContentRequest(id: number, reason?: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: authError || 'Not authenticated' }
  const { error } = await supabase
    .rpc('reject_content_request', { p_request_id: id, p_admin_id: user.id, p_reason: reason ?? null })
  return { error }
}

export async function deleteReviewReply(replyId: number) {
  const { error } = await supabase.from('review_replies').delete().eq('id', replyId)
  return { error }
}
