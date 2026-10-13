import React from 'react';
import { BookOpen, Headphones, Tablet } from 'lucide-react';

const getBookFormatOptions = (t: any) => [
  { value: 'physical', label: t('bookFormats.physical'), Icon: BookOpen },
  { value: 'ebook', label: t('bookFormats.ebook'), Icon: Tablet },
  { value: 'audiobook', label: t('bookFormats.audiobook'), Icon: Headphones },
];

interface ReadingFormatControlProps {
  t: any;
  user: any;
  requireAuth: (action: string) => void;
  id: string;
  bookFormat?: string | null;
  setBookFormat?: (format: string | null) => void;
  defaultBookPublicationId?: number | null;
  updateUserContentLog: (id: string, data: any) => Promise<{ data: boolean; error?: any }>;
  setActionErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearError: (k: string) => void;
}

const ReadingFormatControl: React.FC<ReadingFormatControlProps> = ({
  t,
  user,
  requireAuth,
  id,
  bookFormat,
  setBookFormat,
  defaultBookPublicationId,
  updateUserContentLog,
  setActionErrors,
  clearError,
}) => {
  const bookFormatOptions = getBookFormatOptions(t);

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        {t('titles.readingFormat')}
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {bookFormatOptions.map(({ value, label, Icon }) => {
          const active = bookFormat === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (!user) {
                  requireAuth(t('actions.readFormat'));
                  return;
                }

                const nextValue = active ? null : value;
                const previousValue = bookFormat ?? null;
                setBookFormat?.(nextValue);

                updateUserContentLog(id, {
                  bookFormat: nextValue,
                  bookPublicationId: defaultBookPublicationId ?? undefined,
                }).catch((e) => {
                  console.error('Book format update failed', e);
                  setBookFormat?.(previousValue);
                  setActionErrors((p: any) => ({
                    ...p,
                    bookFormat: t('errors.readFormat'),
                  }));
                  clearError('bookFormat');
                });
              }}
              className={`min-h-[58px] rounded-2xl border px-2 py-2 text-xs font-medium transition-colors flex flex-col items-center justify-center gap-1 ${
                active
                  ? 'border-violet-500/40 bg-violet-500/15 text-violet-100'
                  : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReadingFormatControl;
