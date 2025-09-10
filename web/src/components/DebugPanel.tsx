'use client';

import React, { useState, useEffect } from 'react';
import { getWindowRequestCounts, getLogs } from '@/lib/requestLogger';

interface LogEntry {
  id: number;
  type: 'api' | 'supabase';
  endpoint: string;
  operation: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

const DebugPanel: React.FC = () => {
  const [counts, setCounts] = useState(getWindowRequestCounts());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    // Clear window-specific counters on page refresh (only once on mount)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('blackbox_window_api_requests');
      sessionStorage.removeItem('blackbox_window_supabase_requests');
    }
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    const interval = setInterval(() => {
      setCounts(getWindowRequestCounts());
      if (showLogs) {
        setLogs(getLogs().slice(-10)); // Last 10 logs
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [showLogs]);

  const resetWindowCounters = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('blackbox_window_api_requests');
      sessionStorage.removeItem('blackbox_window_supabase_requests');
    }
    setCounts({ apiRequests: 0, supabaseRequests: 0 });
    setLogs([]);
  };

  const toggleLogs = () => {
    setShowLogs(!showLogs);
    if (!showLogs) {
      setLogs(getLogs().slice(-10));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded shadow-lg z-50 max-w-sm">
      <h3 className="text-lg font-bold mb-2">Debug Info (Bu Pencere)</h3>
      <div className="space-y-2">
        <p>API İstekleri: {counts.apiRequests}</p>
        <p>Supabase İstekleri: {counts.supabaseRequests}</p>
        <div className="flex gap-2">
          <button
            onClick={toggleLogs}
            className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
          >
            {showLogs ? 'Logları Gizle' : 'Son Logları Göster'}
          </button>
          <button
            onClick={resetWindowCounters}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
          >
            Sıfırla
          </button>
        </div>
      </div>

      {showLogs && (
        <div className="mt-3 max-h-48 overflow-y-auto border-t border-gray-600 pt-2">
          {logs.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-2">Henüz log yok</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`text-xs p-2 mb-1 rounded ${
                  log.success
                    ? 'bg-green-900/30'
                    : 'bg-red-900/30'
                }`}
              >
                <div className="font-medium truncate">
                  {log.type === 'api' ? 'API' : 'DB'} - {log.operation} {log.endpoint}
                </div>
                <div className="text-gray-400 text-xs">
                  {log.timestamp.toLocaleTimeString()}
                </div>
                {log.error && (
                  <div className="text-red-300 text-xs mt-1 truncate">
                    {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
