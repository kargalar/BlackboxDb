"use client"

import { useEffect, useState } from 'react'
import { fetchNotifications, markAllAsRead, renderNotificationText, type Notification } from '@/services/database/notifications'

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  const load = async () => {
    setLoading(true)
    const { data } = await fetchNotifications(20)
    setItems(data)
    setUnread(data.filter(d => !d.read_at).length)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleToggle = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      await markAllAsRead()
      setUnread(0)
      // Optimistic update
      setItems(prev => prev.map(p => ({ ...p, read_at: p.read_at ?? new Date().toISOString() })))
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        aria-label="Bildirimler"
      >
        <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">{unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold">Bildirimler</span>
            <button className="text-xs text-blue-600 hover:underline" onClick={load} disabled={loading}>
              Yenile
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.length === 0 && (
              <div className="p-3 text-sm text-gray-500">Henüz bildirimin yok</div>
            )}
            {items.map((n) => (
              <div key={n.id} className={`p-3 text-sm ${!n.read_at ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                    {(n.actor?.username || 'U').slice(0,1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-900 dark:text-gray-100">{renderNotificationText(n)}</div>
                    <div className="text-[11px] text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
