import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getRatingCategories } from '@/lib/detailedRatingConfig';

interface DetailedRatingDropdownProps {
  type: string;
  ratingDetails?: Record<string, number> | null;
  additionalCategories?: string[];
  onChange: (details: Record<string, number>) => void;
  disabled?: boolean;
}

export const DetailedRatingDropdown: React.FC<DetailedRatingDropdownProps> = ({
  type,
  ratingDetails,
  additionalCategories = [],
  onChange,
  disabled = false,
}) => {
  const t = useTranslations('DetailedRating');
  const [isOpen, setIsOpen] = useState(false);

  const categories = getRatingCategories(type, additionalCategories);

  if (categories.length === 0) {
    return null;
  }

  const handleScoreChange = (category: string, score: number) => {
    const currentDetails = ratingDetails || {};
    const newDetails = { ...currentDetails };

    if (newDetails[category] === score) {
      delete newDetails[category];
    } else {
      newDetails[category] = score;
    }

    onChange(newDetails);
  };

  const calculateAverage = () => {
    if (!ratingDetails) return null;
    let sum = 0;
    let count = 0;
    for (const cat of categories) {
      if (ratingDetails[cat] !== undefined && ratingDetails[cat] > 0) {
        sum += ratingDetails[cat];
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : null;
  };

  const avg = calculateAverage();

  return (
    <div className="w-full mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span className="sr-only">{t('title')}</span>
        {avg && <span className="ml-auto mr-2 text-purple-400">{avg}</span>}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-3 p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-3">
          {categories.map((cat) => {
            const val = ratingDetails?.[cat] || 0;
            return (
              <div key={cat} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-300 font-medium capitalize">
                    {t(`categories.${cat}`)}
                  </span>
                  {val > 0 && <span className="text-purple-400 font-semibold">{val}/10</span>}
                </div>
                <div className="flex items-center justify-between gap-1">
                  {[...Array(10)].map((_, i) => {
                    const score = i + 1;
                    return (
                      <button
                        key={score}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleScoreChange(cat, score)}
                        className={`h-6 flex-1 rounded-sm transition-all ${
                          val >= score
                            ? 'bg-purple-600 hover:bg-purple-500'
                            : 'bg-neutral-800 hover:bg-neutral-700'
                        }`}
                        title={`${score}/10`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
