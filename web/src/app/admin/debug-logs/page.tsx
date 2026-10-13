'use client';

import { useEffect, useState } from 'react';
import { getCurrentUserProfile } from '@/services/database/userService';
import { getLogs, getRequestCounts } from '@/lib/requestLogger';
import type { Route } from 'next';
import { useTranslations, useLocale } from 'next-intl';

interface LogEntry {
  id: number;
  type: 'api' | 'graphql' | 'ui';
  endpoint: string;
  operation: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export default function DebugLogsPage() {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ apiRequests: 0 });
  const t = useTranslations('AdminDebugLogsPage');
  const locale = useLocale();

  useEffect(() => {
    let isCurrent = true;

    getCurrentUserProfile()
      .then((r) => {
        if (!isCurrent) return;

        const hasAccess = !!r.data?.isAdmin || !!r.data?.isModerator;
        setAllowed(hasAccess);

        if (hasAccess) {
          setLogs(getLogs());
          setCounts(getRequestCounts());
        }
      })
      .catch((error) => {
        console.error('Failed to load debug log permissions:', error);
        if (isCurrent) setAllowed(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (!allowed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">{t('title')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('accessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
          <div className="text-lg font-medium text-blue-800 dark:text-blue-200">
            {t('apiRequests')}
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {counts.apiRequests}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-medium">{t('recentLogs')}</h2>
        <div className="max-h-96 overflow-y-auto border rounded">
          {logs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">{t('noLogs')}</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 border-b last:border-b-0 ${
                  log.success ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">
                      {log.type.toUpperCase()} - {log.operation} {log.endpoint}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      }).format(log.timestamp)}
                    </div>
                    {log.error && (
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {t('error', { message: log.error })}
                      </div>
                    )}
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      log.success
                        ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                        : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                    }`}
                  >
                    {log.success ? t('success') : t('failed')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
