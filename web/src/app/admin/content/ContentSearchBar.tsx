'use client';

import { useTranslations } from 'next-intl';

interface ContentSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

export default function ContentSearchBar({
  search,
  onSearchChange,
  onSearch,
  loading,
}: ContentSearchBarProps) {
  const t = useTranslations('AdminContentPage');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">🔍</span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('searchPh')}
          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-colors"
        />
      </div>
      <button
        onClick={onSearch}
        disabled={loading}
        className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium border border-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          t('searchBtn')
        )}
      </button>
    </div>
  );
}
