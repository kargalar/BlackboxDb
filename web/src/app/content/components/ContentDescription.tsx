'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';

const COLLAPSE_THRESHOLD = 200;

export default function ContentDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const descriptionId = useId();
  const t = useTranslations('ContentHeader');
  const canExpand = description.length > COLLAPSE_THRESHOLD;

  return (
    <div className="mb-4">
      <p
        id={descriptionId}
        className={`content-detail-description text-sm text-white/70 leading-7 break-words whitespace-pre-line ${canExpand && !expanded ? 'line-clamp-3' : ''}`}
      >
        {description}
      </p>
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={descriptionId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 rounded-lg text-sm font-medium text-white/60 hover:text-white"
        >
          {t(expanded ? 'readLess' : 'readMore')}
        </button>
      )}
    </div>
  );
}
