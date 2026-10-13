import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { DiffResult, getDiffDetailLines } from '@/utils/diffUtils';

interface DiffAlertProps {
  diffs: DiffResult[];
  onRevert?: (key: string) => void;
  title?: string;
}

export function DiffAlert({ diffs, onRevert, title }: DiffAlertProps) {
  const t = useTranslations('AddContent.diffAlert');

  if (!diffs || diffs.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">✨</span>
        <h4 className="font-semibold text-violet-300">{title || t('title')}</h4>
      </div>
      <div className="space-y-3">
        {diffs.map((diff) => {
          const detailLines = getDiffDetailLines(diff, t as any);

          let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
          let changeText = t('changed');
          let icon = '🔄';

          if (diff.changeType === 'added') {
            badgeColor = 'bg-green-500/20 text-green-300 border-green-500/30';
            changeText = t('added');
            icon = '➕';
          } else if (diff.changeType === 'removed') {
            badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30';
            changeText = t('removed');
            icon = '➖';
          }

          const isImageKey = diff.key === 'posterUrl' || diff.key === 'backdropUrl';
          const isScreenshotsKey = diff.key === 'screenshots';

          const renderImageVal = (val: any) => {
            if (!val) return null;
            if (
              typeof val === 'string' &&
              (val.startsWith('http') || val.startsWith('data:image/'))
            ) {
              return (
                <Image
                  src={val}
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-32 max-w-full rounded object-contain bg-black/40 ring-1 ring-white/10"
                  alt="Image"
                />
              );
            }
            return null;
          };

          return (
            <div
              key={diff.key}
              className="flex flex-col gap-2 text-sm bg-black/20 p-3 rounded-lg border border-white/5"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs border ${badgeColor} flex items-center gap-1 shrink-0`}
                  >
                    <span>{icon}</span> {changeText}
                  </span>
                  <span className="font-medium text-white/80 truncate text-xs sm:text-sm">
                    {diff.label}
                  </span>
                </div>
                {onRevert && (
                  <button
                    type="button"
                    onClick={() => onRevert(diff.key)}
                    className="text-xs px-2 py-0.5 rounded bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-violet-200 border border-violet-500/25 transition-all duration-200 active:scale-95 shrink-0"
                  >
                    {t('revert')}
                  </button>
                )}
              </div>

              {isImageKey && (
                <div className="mt-2 flex flex-col sm:flex-row gap-4 items-center pl-2 ml-2 border-l-2 border-white/10">
                  {diff.oldValue && renderImageVal(diff.oldValue) && (
                    <div className="opacity-50">{renderImageVal(diff.oldValue)}</div>
                  )}
                  {diff.oldValue &&
                    diff.newValue &&
                    renderImageVal(diff.oldValue) &&
                    renderImageVal(diff.newValue) && <span className="text-white/30">➔</span>}
                  {diff.newValue && renderImageVal(diff.newValue) && (
                    <div>{renderImageVal(diff.newValue)}</div>
                  )}
                </div>
              )}

              {isScreenshotsKey && (
                <div className="mt-2 flex flex-wrap gap-2 pl-2 ml-2 border-l-2 border-white/10">
                  {Array.isArray(diff.newValue)
                    ? diff.newValue.map((v, i) => {
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
                              width={320}
                              height={180}
                              unoptimized
                              className="max-h-24 rounded object-cover ring-1 ring-white/10 bg-black/40"
                              style={{ width: 'auto' }}
                              alt="Screenshot"
                            />
                          );
                        }
                        return null;
                      })
                    : null}
                </div>
              )}

              {/* Detay Satırları */}
              {!isImageKey && !isScreenshotsKey && detailLines.length > 0 && (
                <div className="pl-2 mt-1 space-y-1 border-l-2 border-white/10 ml-2">
                  {detailLines.map((line, idx) => {
                    let lineIcon = '•';
                    let lineClass = 'text-white/60';
                    if (line.type === 'added') {
                      lineIcon = '+';
                      lineClass = 'text-green-400';
                    }
                    if (line.type === 'removed') {
                      lineIcon = '-';
                      lineClass = 'text-red-400';
                    }
                    if (line.type === 'changed') {
                      lineIcon = '~';
                      lineClass = 'text-blue-400';
                    }

                    return (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className={`${lineClass} font-mono mt-px`}>{lineIcon}</span>
                        <span className="text-white/70 break-all">{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
