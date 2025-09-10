"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/services/database/userService'
import { getLogs, getRequestCounts, resetRequestCounts } from '@/lib/requestLogger'
import type { Route } from 'next'

interface LogEntry {
  id: number;
  type: 'api' | 'supabase';
  endpoint: string;
  operation: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export default function AdminHome() {
  const [allowed, setAllowed] = useState<boolean>(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [counts, setCounts] = useState({ apiRequests: 0, supabaseRequests: 0 })
  const handleReset = () => {
    resetRequestCounts()
    setLogs([])
    setCounts({ apiRequests: 0, supabaseRequests: 0 })
  }

  useEffect(() => {
    getCurrentUserProfile().then(r => {
      setAllowed(!!r.data?.is_admin || !!r.data?.is_moderator)
    })
  }, [])

  useEffect(() => {
    if (allowed) {
      setLogs(getLogs().slice(-5)) // Last 5 logs
      setCounts(getRequestCounts())
      
      // Update stats every 1 second
      const interval = setInterval(() => {
        setLogs(getLogs().slice(-5))
        setCounts(getRequestCounts())
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [allowed])

  if (!allowed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Yönetici</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Yönetim Paneli</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href={"/admin/content-requests" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">İçerik İstekleri</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Bekleyen istekleri onayla veya reddet</div>
        </Link>
        <Link href={"/admin/content" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">İçerik Yönetimi</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">İçerik bilgilerini düzenle veya sil</div>
        </Link>
        <Link href={"/admin/users" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">Kullanıcılar</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Rolleri güncelle veya kullanıcıyı sil</div>
        </Link>
        <Link href={"/admin/moderation" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">İçerik Moderasyonu</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Yorum ve cevapları yönet</div>
        </Link>
        <Link href={"/admin/debug-logs" as Route} className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="font-medium">Debug Logları</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">API ve veritabanı istek loglarını görüntüle</div>
        </Link>
      </div>

      {/* Quick Debug Stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-medium">Genel İstatistikler (Tüm Pencereler)</h2>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
          >
            Tüm İstatistikleri Sıfırla
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
            <div className="text-lg font-medium text-blue-800 dark:text-blue-200">API İstekleri</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{counts.apiRequests}</div>
          </div>
          <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/20">
            <div className="text-lg font-medium text-green-800 dark:text-green-200">Supabase İstekleri</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.supabaseRequests}</div>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Son Loglar</h3>
            <div className="max-h-48 overflow-y-auto border rounded">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 border-b last:border-b-0 text-sm ${
                    log.success
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : 'bg-red-50 dark:bg-red-900/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-medium">
                        {log.type === 'api' ? 'API' : 'Supabase'} - {log.operation} {log.endpoint}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {log.timestamp.toLocaleString()}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      log.success
                        ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                        : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                    }`}>
                      {log.success ? '✓' : '✗'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
