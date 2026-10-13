import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Clock, Edit, FilePlus, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchContentEditHistory } from '@/services/graphql/content';

interface ContentHistoryTabProps {
  contentId: string;
}

export default function ContentHistoryTab({ contentId }: ContentHistoryTabProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('ContentDetail'); // Using existing translations if possible, fallback to English text if needed
  const locale = useLocale();

  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await fetchContentEditHistory(contentId);
        if (!isMounted) return;
        if (error) throw error;
        setHistory(data || []);
      } catch (err: any) {
        console.error('Failed to load history:', err);
        if (isMounted) setError(err.message || 'Failed to load history');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [contentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-400 font-medium">History could not be loaded</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
        <p className="text-white/60">No edit history available for this content.</p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return <FilePlus className="w-4 h-4 text-emerald-400" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-400" />;
      case 'SYNC':
        return <RefreshCw className="w-4 h-4 text-violet-400" />;
      default:
        return <Clock className="w-4 h-4 text-white/60" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'UPDATE':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'SYNC':
        return 'bg-violet-500/10 border-violet-500/20 text-violet-400';
      default:
        return 'bg-white/5 border-white/10 text-white/60';
    }
  };

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <div key={item.id} className="glass-card p-4 flex gap-4 items-start">
          <div className="mt-1 flex-shrink-0">
            {item.actor ? (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 relative">
                {item.actor.picturePath ? (
                  <Image
                    src={item.actor.picturePath}
                    alt={item.actor.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60 text-sm font-medium">
                    {item.actor.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white/40" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white/90">
                  {item.actor ? item.actor.username : 'System'}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded border uppercase flex items-center gap-1 font-medium ${getActionColor(item.action)}`}
                >
                  {getActionIcon(item.action)}
                  {item.action}
                </span>
              </div>
              <span className="text-xs text-white/40">
                {new Intl.DateTimeFormat(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(item.createdAt))}
              </span>
            </div>

            {item.summary && <p className="text-sm text-white/70 mb-2">{item.summary}</p>}

            {item.changedFields && item.changedFields.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.changedFields.map((field: string) => (
                  <span
                    key={field}
                    className="px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white/60"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
