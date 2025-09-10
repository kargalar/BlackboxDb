import { supabase } from '@/lib/supabase'

// Content management
export async function listContent(params?: { search?: string; limit?: number }) {
  const limit = params?.limit ?? 50
  let q = supabase
    .from('content')
    .select('id, title, content_type_id, release_date, description, length, poster_path, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (params?.search && params.search.trim()) {
    q = q.ilike('title', `%${params.search.trim()}%`)
  }
  const { data, error } = await q
  return { data: data || [], error }
}

export async function getContentById(id: string) {
  const { data, error } = await supabase
    .from('content')
    .select('id, title, content_type_id, release_date, description, length, poster_path')
    .eq('id', id)
    .maybeSingle()
  return { data, error }
}

export async function updateContent(id: string, updates: Partial<{ title: string; description: string | null; release_date: string | null; length: number | null; poster_path: string | null }>) {
  const { data, error } = await supabase
    .from('content')
    .update(updates)
    .eq('id', id)
    .select('id')
    .maybeSingle()
  return { data, error }
}

export async function deleteContent(id: string) {
  const { error } = await supabase.from('content').delete().eq('id', id)
  return { error }
}

// User management
export async function listUsers(params?: { search?: string; limit?: number }) {
  const limit = params?.limit ?? 100
  let q = supabase
    .from('app_user')
    .select('auth_user_id, username, email, is_admin, is_moderator, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (params?.search && params.search.trim()) {
    const s = params.search.trim()
    q = q.or(`username.ilike.%${s}%,email.ilike.%${s}%`)
  }
  const { data, error } = await q
  return { data: data || [], error }
}

export async function updateUserRoles(userId: string, roles: { is_admin?: boolean; is_moderator?: boolean }) {
  const { error } = await supabase
    .from('app_user')
    .update({
      ...(roles.is_admin !== undefined ? { is_admin: roles.is_admin } : {}),
      ...(roles.is_moderator !== undefined ? { is_moderator: roles.is_moderator } : {}),
    })
    .eq('auth_user_id', userId)
  return { error }
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.from('app_user').delete().eq('auth_user_id', userId)
  return { error }
}

// Moderation (comments/replies)
export async function deleteReviewReply(replyId: number) {
  const { error } = await supabase.from('review_replies').delete().eq('id', replyId)
  return { error }
}

export async function listRecentComments(limit = 50) {
  // If comments are not used in this schema, return empty list
  return { data: [], error: null as any }
}

export async function listRecentReplies(limit = 50) {
  const { data, error } = await supabase
    .from('review_replies')
    .select('id, user_id, review_id, text, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data: data || [], error }
}
