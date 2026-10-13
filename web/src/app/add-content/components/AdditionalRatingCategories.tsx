'use client';

import { useTranslations } from 'next-intl';
import { ADDITIONAL_RATING_CATEGORIES } from '@/lib/detailedRatingConfig';

interface AdditionalRatingCategoriesProps {
  categories: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
}

export function AdditionalRatingCategories({
  categories,
  onChange,
  disabled = false,
}: AdditionalRatingCategoriesProps) {
  const t = useTranslations('DetailedRating');
  const selectedCategories = new Set(categories);

  const toggleCategory = (category: string) => {
    onChange(
      selectedCategories.has(category)
        ? categories.filter((item) => item !== category)
        : [...categories, category]
    );
  };

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-white">{t('configurationTitle')}</h4>
        <p className="mt-1 text-xs text-neutral-400">{t('configurationDescription')}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ADDITIONAL_RATING_CATEGORIES.map((category) => (
          <label key={category} className="flex items-center gap-2 text-sm text-neutral-200">
            <input
              type="checkbox"
              checked={selectedCategories.has(category)}
              disabled={disabled}
              onChange={() => toggleCategory(category)}
              className="accent-purple-500"
            />
            {t(`categories.${category}`)}
          </label>
        ))}
      </div>
    </section>
  );
}
