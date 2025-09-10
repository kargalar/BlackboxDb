"use client"

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/services/database/userService'
import { getLogs, getRequestCounts } from '@/lib/requestLogger'
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

export default function DebugLogsPage() {
  const [allowed, setAllowed] = useState<boolean>(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [counts, setCounts] = useState({ apiRequests: 0, supabaseRequests: 0 })

  useEffect(() => {
    getCurrentUserProfile().then(r => {
      setAllowed(!!r.data?.is_admin || !!r.data?.is_moderator)
    })
  }, [])

  useEffect(() => {
    if (allowed) {
      setLogs(getLogs())
      setCounts(getRequestCounts())
    }
  }, [allowed])

  if (!allowed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Debug Logları</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Debug Logları</h1>
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

      <div className="space-y-2">
        <h2 className="text-xl font-medium">Son Loglar</h2>
        <div className="max-h-96 overflow-y-auto border rounded">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Henüz log yok</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 border-b last:border-b-0 ${
                  log.success
                    ? 'bg-green-50 dark:bg-green-900/10'
                    : 'bg-red-50 dark:bg-red-900/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {log.type === 'api' ? 'API' : 'Supabase'} - {log.operation} {log.endpoint}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {log.timestamp.toLocaleString()}
                    </div>
                    {log.error && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Hata: {log.error}
                      </div>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    log.success
                      ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                      : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                  }`}>
                    {log.success ? 'Başarılı' : 'Başarısız'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
