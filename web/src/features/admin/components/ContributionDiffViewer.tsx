import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { compareFormData, DiffResult } from '@/utils/diffUtils';

// Minimal GraphQL query to get the full original content to compare
// We reuse the exact logic from loadContent, but here we can just do a direct fetch or use adminService.
// Wait, adminService already has getContentById which works well and is a REST-like or direct GraphQL call.
import { getContentById } from '@/services/adminService';
import { mapContentToFormData } from '@/utils/mapContentToFormData';

interface ContributionDiffViewerProps {
  contentId: string;
  payload: any;
}

export function ContributionDiffViewer({ contentId, payload }: ContributionDiffViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diffs, setDiffs] = useState<DiffResult[]>([]);
  const [error, setError] = useState('');
  const t = useTranslations('DiffUtils');

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (diffs.length > 0 || error) return; // Zaten yüklendiyse tekrar çekme

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await getContentById(contentId);

      if (fetchError || !data) {
        setError('Orijinal içerik yüklenemedi.');
        return;
      }

      // Backend'den gelen datayı form datasına çevir
      const originalData = mapContentToFormData(data);

      // Payload ile karşılaştır
      const formPayload = Object.fromEntries(
        Object.entries(payload || {}).filter(([key]) => key !== '__updateInput')
      );
      const mergedData = { ...originalData, ...formPayload };
      const calculatedDiffs = compareFormData(originalData, mergedData, t as any);
      setDiffs(calculatedDiffs);
    } catch (err) {
      console.error(err);
      setError(t('fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border border-white/10 rounded-lg overflow-hidden bg-black/20">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-sm font-medium text-white/80"
      >
        <span className="flex items-center gap-2">
          <span>📝</span> {t('viewChanges')}{' '}
          {diffs.length > 0 && (
            <span className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full text-xs">
              {diffs.length} {t('changes')}
            </span>
          )}
        </span>
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-white/50" />
        ) : isOpen ? (
          <ChevronUp size={16} />
        ) : (
          <ChevronDown size={16} />
        )}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-white/10 bg-black/40">
          {isLoading ? (
            <div className="text-center text-sm text-white/50 py-4">{t('comparing')}</div>
          ) : error ? (
            <div className="text-red-400 text-sm text-center py-2">{error}</div>
          ) : diffs.length === 0 ? (
            <div className="text-white/50 text-sm text-center py-2">{t('noChanges')}</div>
          ) : (
            <div className="space-y-2">
              {diffs.map((diff) => {
                const renderValue = (val: any, diffKey: string) => {
                  if (val === null || val === undefined || val === '') return '-';

                  const isImage =
                    diffKey === 'posterUrl' ||
                    diffKey === 'backdropUrl' ||
                    (typeof val === 'string' &&
                      (val.startsWith('data:image/') || val.match(/\.(jpeg|jpg|gif|png|webp)$/i)));

                  if (isImage && typeof val === 'string') {
                    return (
                      <div className="mt-1 mb-1">
                        <Image
                          src={val}
                          alt="Image"
                          width={200}
                          height={128}
                          unoptimized
                          className="max-h-32 max-w-[200px] rounded object-contain bg-black/40 ring-1 ring-white/10"
                        />
                      </div>
                    );
                  }

                  if (diffKey === 'screenshots' && Array.isArray(val)) {
                    if (val.length === 0) return t('empty');
                    return (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {val.map((v: any, i: number) => {
                          const src = typeof v === 'string' ? v : v.imageUrl || v.url || v.base64;
                          if (
                            src &&
                            typeof src === 'string' &&
                            (src.startsWith('http') || src.startsWith('data:image/'))
                          ) {
                            return (
                              <Image
                                key={i}
                                src={src}
                                alt="Screenshot"
                                width={160}
                                height={96}
                                unoptimized
                                className="max-h-24 rounded object-cover ring-1 ring-white/10 bg-black/40"
                              />
                            );
                          }
                          return (
                            <span
                              key={i}
                              className="text-white/50 text-xs truncate max-w-[100px] inline-block"
                            >
                              {typeof v === 'string' ? v : JSON.stringify(v)}
                            </span>
                          );
                        })}
                      </div>
                    );
                  }

                  if (typeof val !== 'object') return String(val);
                  if (Array.isArray(val)) {
                    if (val.length === 0) return t('empty');
                    const items = val.map((v) => {
                      if (typeof v !== 'object') return String(v);
                      if (v.name) return v.name;
                      if (v.title) return v.title;
                      if (v.person?.name) return v.person.name + (v.role ? ` (${v.role})` : '');
                      if (v.company?.name) return v.company.name;
                      return JSON.stringify(v);
                    });
                    return items.join(', ');
                  }
                  return JSON.stringify(val);
                };

                return (
                  <div
                    key={diff.key}
                    className="flex flex-col gap-1 p-3 rounded bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          diff.changeType === 'added'
                            ? 'bg-green-500/20 text-green-400'
                            : diff.changeType === 'removed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {diff.changeType === 'added'
                          ? t('added')
                          : diff.changeType === 'removed'
                            ? t('removed')
                            : t('modified')}
                      </span>
                      <span className="font-semibold text-sm text-white/90">{diff.label}</span>
                    </div>

                    <div className="text-xs mt-1 pl-1 border-l-2 border-white/10 flex flex-col gap-1">
                      {diff.changeType === 'modified' && (
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="text-white/50 opacity-70 overflow-hidden w-full sm:w-[45%] break-all sm:break-normal">
                            {renderValue(diff.oldValue, diff.key)}
                          </div>
                          <div className="hidden sm:block text-white/30 pt-2">➔</div>
                          <div className="text-white/90 font-medium overflow-hidden w-full sm:w-[45%] break-all sm:break-normal">
                            {renderValue(diff.newValue, diff.key)}
                          </div>
                        </div>
                      )}
                      {diff.changeType === 'added' && (
                        <div className="text-green-300 font-medium overflow-hidden break-all sm:break-normal">
                          {renderValue(diff.newValue, diff.key)}
                        </div>
                      )}
                      {diff.changeType === 'removed' && (
                        <div className="text-red-300/70 line-through overflow-hidden break-all sm:break-normal">
                          {renderValue(diff.oldValue, diff.key)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
