'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicLists, voteList, createList } from '@/services/graphql/list';
import type { UserList } from '@/services/graphql/listTypes';
import { PublicListCard } from '@/components/organisms/lists/PublicListCard';
import { PosterCard } from '@/components/atoms/PosterCard';
import {
  CollaboratorAvatarGroup,
  getContentTypeInfo,
} from '@/components/organisms/profile/ProfileListCard';
import { getContentImageUrl, getPersonImageUrl } from '@/lib/image-utils';
import {
  ChevronUp,
  ChevronDown,
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Music,
  LayoutGrid,
  Users,
  Clock,
  ListIcon,
  TrendingUp,
  Sparkles,
  Plus,
  Globe2,
  List,
  ListOrdered,
  Lock,
  FolderOpen,
  X,
} from 'lucide-react';

import { useTranslations } from 'next-intl';

// ==========================================
// TYPES
// ==========================================

type ContentTypeFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type SortOption = 'newest' | 'top' | 'popular';

interface ContentFilterConfig {
  key: ContentTypeFilter;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const CONTENT_FILTERS: ContentFilterConfig[] = [
  {
    key: 'all',
    icon: <LayoutGrid size={16} />,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
  },
  {
    key: 1,
    icon: <Film size={16} />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  {
    key: 2,
    icon: <Tv size={16} />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    key: 3,
    icon: <Gamepad2 size={16} />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    key: 4,
    icon: <BookOpen size={16} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
];

const SORT_OPTIONS: { key: SortOption; icon: React.ReactNode }[] = [
  { key: 'newest', icon: <Clock size={14} /> },
  { key: 'top', icon: <TrendingUp size={14} /> },
  { key: 'popular', icon: <Sparkles size={14} /> },
];

const PAGE_SIZE = 20;

// ==========================================
// CREATE LIST MODAL
// ==========================================

function CreateListModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (list: UserList) => void;
}) {
  const t = useTranslations('ListsPage.createModal');
  const tFilters = useTranslations('ListsPage.filters');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentTypeId, setContentTypeId] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('nameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    const { data, error: apiError } = await createList(
      name.trim(),
      contentTypeId,
      description.trim() || undefined,
      isPublic
    );

    if (data) {
      console.log('✅ [CreateListModal] Liste oluşturuldu:', data.name);
      onCreated(data);
      setName('');
      setDescription('');
      setContentTypeId(1);
      setIsPublic(true);
      onClose();
    } else {
      console.error('❌ [CreateListModal] Hata:', apiError?.message);
      setError(apiError?.message || t('createError'));
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const contentTypes = [
    {
      id: 1,
      icon: <Film size={16} />,
      label: tFilters('movie'),
      color: 'text-red-400',
      bg: 'bg-red-500/15',
    },
    {
      id: 2,
      icon: <Tv size={16} />,
      label: tFilters('tv'),
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
    },
    {
      id: 3,
      icon: <Gamepad2 size={16} />,
      label: tFilters('game'),
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
    },
    {
      id: 4,
      icon: <BookOpen size={16} />,
      label: tFilters('book'),
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
    },
    {
      id: 5,
      icon: <Music size={16} />,
      label: 'Music',
      color: 'text-pink-400',
      bg: 'bg-pink-500/15',
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-page border border-gray-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{t('title')}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder-gray-600"
              placeholder={t('namePlaceholder')}
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('descLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none placeholder-gray-600"
              placeholder={t('descPlaceholder')}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('typeLabel')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {contentTypes.map((ct) => {
                const isActive = contentTypeId === ct.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setContentTypeId(ct.id)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      isActive
                        ? `${ct.bg} ${ct.color} border-current/30 ring-1 ring-current/20`
                        : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-900/30 rounded-xl px-4 py-3 border border-gray-800/40">
            <div className="flex items-center gap-2">
              {!isPublic && <Lock size={14} className="text-gray-500" />}
              <span className="text-sm text-gray-300">{t('publicLabel')}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                isPublic ? 'bg-violet-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? t('creating') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export default function PublicListsPage() {
  const t = useTranslations('ListsPage');
  const { user } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [contentFilter, setContentFilter] = useState<ContentTypeFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load lists
  const loadLists = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = reset ? 0 : lists.length;
        const contentTypeId = contentFilter === 'all' ? null : contentFilter;

        console.log('📋 [ListsPage] Loading public lists:', { sortBy, contentTypeId, offset });

        const { data, error } = await getPublicLists(sortBy, contentTypeId, PAGE_SIZE, offset);

        if (error) {
          console.error('❌ [ListsPage] Error loading lists:', error);
          return;
        }

        const newLists = data || [];
        console.log('✅ [ListsPage] Loaded', newLists.length, 'lists');

        if (reset) {
          setLists(newLists);
        } else {
          setLists((prev) => [...prev, ...newLists]);
        }

        setHasMore(newLists.length >= PAGE_SIZE);
      } catch (e) {
        console.error('❌ [ListsPage] Unexpected error:', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sortBy, contentFilter, lists.length]
  );

  // Reload on filter/sort change
  useEffect(() => {
    loadLists(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, contentFilter]);

  // Vote handler
  const handleVote = async (listId: number, voteType: number) => {
    if (!user) return;

    try {
      console.log('🗳️ [ListsPage] Voting:', listId, voteType);
      const { data, error } = await voteList(listId, voteType);

      if (error) {
        console.error('❌ [ListsPage] Vote error:', error);
        return;
      }

      if (data) {
        setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...data } : l)));
      }
    } catch (e) {
      console.error('❌ [ListsPage] Unexpected vote error:', e);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
            <ListIcon size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-sm text-white/40">{t('subtitle')}</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white/70 text-sm font-medium rounded-xl hover:bg-white/10 hover:text-white transition-all"
            >
              <Plus size={16} />
              {t('newList')}
            </button>
            <button
              onClick={() => router.push(`/lists/${user.username}` as any)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20"
            >
              <Users size={16} />
              {t('myLists')}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Content Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {CONTENT_FILTERS.map((filter) => (
            <button
              key={String(filter.key)}
              onClick={() => setContentFilter(filter.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl transition-all duration-200 font-medium ${
                contentFilter === filter.key
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {filter.icon}
              {t(`filters.${filter.key}`)}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 sm:ml-auto">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl transition-all duration-200 font-medium ${
                sortBy === option.key
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {option.icon}
              {t(option.key === 'top' ? 'topRated' : option.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white/40 text-sm">{t('loading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && lists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-surface-page border border-gray-800/60 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-4">
            <ListIcon size={28} className="text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">{t('emptyState.title')}</h2>
          <p className="text-white/40 text-sm text-center max-w-sm">
            {contentFilter === 'all' ? t('emptyState.all') : t('emptyState.filtered')}
          </p>
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              {t('emptyState.createFirst')}
            </button>
          )}
        </div>
      )}

      {/* List Cards */}
      {!loading && lists.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {lists.map((list) => (
            <PublicListCard
              key={list.id}
              list={list}
              onVote={handleVote}
              voteDisabled={!user}
              isOwner={user?.id === list.ownerId}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && lists.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => loadLists(false)}
            disabled={loadingMore}
            className="px-6 py-3 bg-white/5 text-white/60 text-sm font-medium rounded-xl hover:bg-white/10 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                {t('loadingMore')}
              </span>
            ) : (
              t('showMore')
            )}
          </button>
        </div>
      )}

      {/* Create List Modal */}
      <CreateListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(newList) => {
          if (newList.isPublic) {
            setLists((prev) => [newList, ...prev]);
          }
          router.push(`/lists/${user?.username}/${newList.id}` as any);
        }}
      />
    </div>
  );
}
