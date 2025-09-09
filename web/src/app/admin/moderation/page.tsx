"use client"

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/services/database/userService'
import { deleteReviewReply, listRecentReplies } from '@/services/database/admin'

interface CommentRow { id: number; user_id: string; review_id: number; text: string; created_at: string }

export default function ModerationPage() {
  const [allowed, setAllowed] = useState(false)
  const [replies, setReplies] = useState<CommentRow[]>([])

  const load = async () => {
    const prof = await getCurrentUserProfile()
    const can = !!prof.data?.is_admin || !!prof.data?.is_moderator
    setAllowed(can)
    if (can) {
  const r = await listRecentReplies()
  setReplies(r.data as CommentRow[])
    }
  }

  useEffect(() => { load() // eslint-disable-next-line
  }, [])

  if (!allowed) return <div className="max-w-5xl mx-auto p-6">Yetkin yok.</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Moderasyon</h1>
      <div>
        <h2 className="font-medium mb-2">Son Cevaplar</h2>
        <div className="space-y-2">
          {replies.map(r => (
            <div key={`r-${r.id}`} className="border rounded p-3 flex items-center justify-between">
              <div className="text-sm">{r.text}</div>
              <button onClick={async()=>{ await deleteReviewReply(r.id); load() }} className="px-3 py-1 rounded bg-red-600 text-white">Sil</button>
            </div>
          ))}
          {replies.length === 0 && <div className="text-sm text-gray-600 dark:text-gray-400">Cevap yok.</div>}
        </div>
      </div>
    </div>
  )
}
