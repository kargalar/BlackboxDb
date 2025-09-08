import { supabase } from '@/lib/supabase'

export type NotificationType = 'REVIEW_LIKED' | 'FOLLOWED_YOU'

export interface Notification {
  id: number
  recipient_user_id: string
  actor_user_id: string
  type_id: number
  review_id: number | null
  reply_id: number | null
  created_at: string
  read_at: string | null
  actor?: { username: string; picture_path: string | null }
}

const TYPE_MAP: Record<number, NotificationType> = {
  1: 'REVIEW_LIKED',
  2: 'FOLLOWED_YOU'
}

export async function fetchNotifications(limit = 20): Promise<{ data: Notification[]; error?: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [] }

    const { data, error } = await supabase
      .from('notification')
      .select(`
        id, recipient_user_id, actor_user_id, type_id, review_id, reply_id, created_at, read_at,
        actor:app_user!notification_actor_user_id_fkey (username, picture_path)
      ` as any)
      .eq('recipient_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { data: [], error }

    const withActor = (data || []).map((n: any) => ({
      ...n,
      actor: n.actor?.[0] ?? n.actor // depending on join shape
    }))

    return { data: withActor }
  } catch (e) {
    return { data: [], error: e }
  }
}

export async function markAllAsRead(): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'not_authenticated' }

    const { error } = await supabase
      .from('notification')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
      .eq('recipient_user_id', user.id)

    if (error) return { success: false, error }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

export function renderNotificationText(n: Notification): string {
  const type = TYPE_MAP[n.type_id]
  const actorName = n.actor?.username || 'Bir kullanıcı'
  switch (type) {
    case 'REVIEW_LIKED':
      return `${actorName} yorumunu beğendi`
    case 'FOLLOWED_YOU':
      return `${actorName} seni takip etti`
    default:
      return 'Yeni bildirimin var'
  }
}
