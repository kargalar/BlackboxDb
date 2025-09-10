'use client';

import React, { useState, useEffect } from 'react';
import { getWindowRequestCounts, getLogs, formatLogForClipboard, formatAllLogsForClipboard, formatLogsAsJSON } from '@/lib/requestLogger';

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
  const [counts, setCounts] = useState(() => getWindowRequestCounts());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
      try {
        sessionStorage.removeItem('blackbox_window_api_requests');
        sessionStorage.removeItem('blackbox_window_supabase_requests');
        setCounts({ apiRequests: 0, supabaseRequests: 0 });
        setLogs([]);
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
    }
  };

  const copyLogToClipboard = (log: LogEntry) => {
    const logText = formatLogForClipboard(log);
    navigator.clipboard.writeText(logText).catch(err => {
      console.warn('Failed to copy log to clipboard:', err);
    });
  };

  const copyAllLogsToClipboard = () => {
    const allLogsText = formatAllLogsForClipboard(logs);
    navigator.clipboard.writeText(allLogsText).catch(err => {
      console.warn('Failed to copy all logs to clipboard:', err);
    });
  };

  const copyLogsAsJSON = () => {
    const jsonText = formatLogsAsJSON(logs);
    navigator.clipboard.writeText(jsonText).catch(err => {
      console.warn('Failed to copy logs as JSON:', err);
    });
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
        <p>API İstekleri: {isClient ? counts.apiRequests : 0}</p>
        <p>Supabase İstekleri: {isClient ? counts.supabaseRequests : 0}</p>
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
        {showLogs && logs.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={copyAllLogsToClipboard}
              className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors"
            >
              Metin Olarak Kopyala
            </button>
            <button
              onClick={copyLogsAsJSON}
              className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs font-medium transition-colors"
            >
              JSON Olarak Kopyala
            </button>
          </div>
        )}
      </div>

      {showLogs && isClient && (
        <div className="mt-3 max-h-48 overflow-y-auto border-t border-gray-600 pt-2">
          {logs.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-2">Henüz log yok</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`text-xs p-2 mb-1 rounded relative ${
                  log.success
                    ? 'bg-green-900/30'
                    : 'bg-red-900/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                  <button
                    onClick={() => copyLogToClipboard(log)}
                    className="ml-2 px-1 py-0.5 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
                    title="Bu logu kopyala"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
