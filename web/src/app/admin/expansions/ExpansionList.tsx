'use client';

/**
 * ExpansionList — displays and filters expansion items.
 * SRP: list/filter UI only, all actions delegated to parent.
 */

import type { AdminExpansion } from '@/services/graphql/admin';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

interface Props {
  items: AdminExpansion[];
  loading: boolean;
  search: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onSearch: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  expansion: 'Expansion',
  remake: 'Remake',
  remaster: 'Remaster',
};

const TYPE_COLORS: Record<string, string> = {
  expansion: 'bg-green-500/20 text-green-400',
  remake: 'bg-purple-500/20 text-purple-400',
  remaster: 'bg-amber-500/20 text-amber-400',
};

export default function ExpansionList({
  items,
  loading,
  search,
  typeFilter,
  onSearchChange,
  onTypeFilterChange,
  onSearch,
  onEdit,
  onDelete,
}: Props) {
  const t = useTranslations('AdminExpansionsPage');
  const locale = useLocale();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('list.searchPh')}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none"
        >
          <option value="" className="bg-gray-900">
            {t('list.allTypes')}
          </option>
          <option value="expansion" className="bg-gray-900">
            Expansion
          </option>
          <option value="remake" className="bg-gray-900">
            Remake
          </option>
          <option value="remaster" className="bg-gray-900">
            Remaster
          </option>
        </select>
        <button
          onClick={onSearch}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? t('list.loading') : t('actions.search')}
        </button>
      </div>

      {/* Count */}
      <div className="text-sm text-white/40">{t('list.count', { count: items.length })}</div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40">{t('list.loading')}</div>
      ) : items.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40">{t('list.empty')}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-card p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
            >
              {/* Poster */}
              {item.posterUrl ? (
                <Image
                  src={item.posterUrl}
                  alt={item.name}
                  width={48}
                  height={64}
                  unoptimized
                  className="h-16 w-12 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-16 rounded bg-violet-500/30 flex items-center justify-center shrink-0">
                  <span className="text-lg">🎮</span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white/90 truncate">{item.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      TYPE_COLORS[item.type] || 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {TYPE_LABELS[item.type] || item.type}
                  </span>
                </div>
                <div className="text-sm text-white/50 truncate">
                  {item.contentTitle || item.contentId}
                </div>
                <div className="flex gap-4 text-xs text-white/40 mt-1">
                  {item.releaseDate && (
                    <span>
                      {new Intl.DateTimeFormat(locale).format(new Date(item.releaseDate))}
                    </span>
                  )}
                  {item.averageRating && <span>⭐ {item.averageRating.toFixed(1)}</span>}
                  <span>
                    {item.consumeCount} {t('list.users')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onEdit(item.id)}
                  className="px-3 py-1.5 text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                >
                  {t('actions.edit')}
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  {t('actions.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
