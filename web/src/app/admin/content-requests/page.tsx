"use client"

import { useEffect, useState } from 'react'
import { approveContentRequest, listPendingContentRequests, rejectContentRequest } from '@/services/database/contentRequests'
import { getCurrentUserProfile } from '@/services/database/userService'

interface PendingItem {
  id: number
  title: string
  description?: string | null
  created_at: string
  requester?: { username: string; picture_path: string | null }
}

export default function AdminContentRequestsPage() {
  const [items, setItems] = useState<PendingItem[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [isPrivileged, setIsPrivileged] = useState<boolean>(false)

  const load = async () => {
    const prof = await getCurrentUserProfile()
    const can = !!prof.data?.is_admin || !!prof.data?.is_moderator
    setIsPrivileged(can)
    if (can) {
      const { data, error } = await listPendingContentRequests()
      if (!error) setItems(data as PendingItem[])
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    setBusyId(id)
    const { error } = await approveContentRequest(id)
    setBusyId(null)
    if (!error) {
      setItems(prev => prev.filter(p => p.id !== id))
    } else {
      alert('Onaylanamadı')
    }
  }

  const reject = async (id: number) => {
    const reason = prompt('Reddetme nedeni (opsiyonel):') || undefined
    setBusyId(id)
    const { error } = await rejectContentRequest(id, reason)
    setBusyId(null)
    if (!error) {
      setItems(prev => prev.filter(p => p.id !== id))
    } else {
      alert('Reddedilemedi')
    }
  }

  if (!isPrivileged) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-xl font-semibold mb-2">Yönetici</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Bekleyen İçerik İstekleri</h1>
      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{it.title}</div>
                {!!it.requester && (
                  <div className="text-xs text-gray-500">Gönderen: {it.requester.username}</div>
                )}
                <div className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(it.id)} disabled={busyId===it.id} className="px-3 py-1 rounded bg-green-600 text-white">Onayla</button>
                <button onClick={() => reject(it.id)} disabled={busyId===it.id} className="px-3 py-1 rounded bg-red-600 text-white">Reddet</button>
              </div>
            </div>
            {it.description && (
              <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">{it.description}</p>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500">Bekleyen istek yok.</div>}
      </div>
    </div>
  )
}
