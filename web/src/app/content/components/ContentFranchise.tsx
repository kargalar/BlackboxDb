'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import AddToListModal from '@/components/organisms/AddToListModal';
import { apolloClient } from '@/lib/apollo-client';
import { GET_FRANCHISE_CONTENT } from '@/services/graphql/content';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserContentLogs,
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleContentWatchlist,
  toggleContinuing,
} from '@/services/database/contentService';
import { toast } from 'react-hot-toast';

interface FranchiseContent {
  id: string;
  title: string;
  releaseDate: string | null;
  posterUrl: string | null;
  runtime: number | null;
  contentTypeId: number;
  contentType?: {
    id: number;
    name: string;
  };
}

interface ItemState {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
}

interface ContentFranchiseProps {
  franchiseId: string;
  franchiseName: string | null;
  currentContentId: string;
  contentType: string;
}

// Content type display config
const CONTENT_TYPE_CONFIG: Record<number, { label: string; emoji: string; order: number }> = {
  1: { label: 'Filmler', emoji: '🎬', order: 1 },
  2: { label: 'Diziler', emoji: '📺', order: 2 },
  3: { label: 'Oyunlar', emoji: '🎮', order: 3 },
  4: { label: 'Kitaplar', emoji: '📚', order: 4 },
  5: { label: 'Müzikler', emoji: '🎵', order: 5 },
};

function getContentTypeConfig(typeId: number) {
  return CONTENT_TYPE_CONFIG[typeId] || { label: 'Diğer', emoji: '📦', order: 99 };
}

export default function ContentFranchise({
  franchiseId,
  franchiseName,
  currentContentId,
  contentType,
}: ContentFranchiseProps) {
  const { user } = useAuth();
  const t = useTranslations('ContentFranchise');
  const [franchiseContent, setFranchiseContent] = useState<FranchiseContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

  // Add to list modal state
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedItemForList, setSelectedItemForList] = useState<FranchiseContent | null>(null);
  const [selectedItemContentType, setSelectedItemContentType] = useState<
    'movie' | 'tv' | 'game' | 'book' | 'music'
  >('movie');

  // Map contentTypeId to contentType string
  const getContentType = (typeId: number): 'movie' | 'tv' | 'game' | 'book' | 'music' => {
    switch (typeId) {
      case 1:
        return 'movie';
      case 2:
        return 'tv';
      case 3:
        return 'game';
      case 4:
        return 'book';
      case 5:
        return 'music';
      default:
        return 'movie';
    }
  };

  // Handle add to list
  const handleAddToList = (
    item: FranchiseContent,
    itemContentType: 'movie' | 'tv' | 'game' | 'book' | 'music'
  ) => {
    setSelectedItemForList(item);
    setSelectedItemContentType(itemContentType);
    setShowAddToListModal(true);
  };

  // Action handlers
  const handleWatch = async (item: FranchiseContent) => {
    if (!user) return;

    const currentState = itemStates[item.id] || {
      isConsumed: false,
      isFavorite: false,
      isConsumeLater: false,
      isContinuing: false,
    };
    const newState = !currentState.isConsumed;

    setItemStates((prev) => ({ ...prev, [item.id]: { ...currentState, isConsumed: newState } }));

    try {
      if (newState) {
        await logContentWatch(item.id);
        toast.success(t('markedWatched'));
        window.dispatchEvent(new Event('refetchLists'));
      } else {
        await unlogContentWatch(item.id);
        toast.success(t('unmarkedWatched'));
      }
    } catch (err) {
      setItemStates((prev) => ({ ...prev, [item.id]: currentState }));
      toast.error('Bir hata oluştu');
    }
  };

  const handleToggleFavorite = async (item: FranchiseContent) => {
    if (!user) return;

    const currentState = itemStates[item.id] || {
      isConsumed: false,
      isFavorite: false,
      isConsumeLater: false,
      isContinuing: false,
    };
    const newState = !currentState.isFavorite;

    setItemStates((prev) => ({ ...prev, [item.id]: { ...currentState, isFavorite: newState } }));

    try {
      await toggleContentFavorite(item.id);
      toast.success(newState ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı');
    } catch (err) {
      setItemStates((prev) => ({ ...prev, [item.id]: currentState }));
      toast.error('Bir hata oluştu');
    }
  };

  const handleToggleWatchlist = async (item: FranchiseContent) => {
    if (!user) return;

    const currentState = itemStates[item.id] || {
      isConsumed: false,
      isFavorite: false,
      isConsumeLater: false,
      isContinuing: false,
    };
    const newState = !currentState.isConsumeLater;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...currentState, isConsumeLater: newState },
    }));

    try {
      await toggleContentWatchlist(item.id);
      toast.success(newState ? 'İzleme listesine eklendi' : 'İzleme listesinden çıkarıldı');
    } catch (err) {
      setItemStates((prev) => ({ ...prev, [item.id]: currentState }));
      toast.error('Bir hata oluştu');
    }
  };

  const handleToggleContinuing = async (item: FranchiseContent) => {
    if (!user) return;

    const currentState = itemStates[item.id] || {
      isConsumed: false,
      isFavorite: false,
      isConsumeLater: false,
      isContinuing: false,
    };
    const newState = !currentState.isContinuing;

    setItemStates((prev) => ({ ...prev, [item.id]: { ...currentState, isContinuing: newState } }));

    try {
      await toggleContinuing(item.id);
      toast.success(
        newState ? 'Devam ediyor olarak işaretlendi' : 'Devam ediyor işareti kaldırıldı'
      );
    } catch (err) {
      setItemStates((prev) => ({ ...prev, [item.id]: currentState }));
      toast.error('Bir hata oluştu');
    }
  };

  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  // Group content by type
  const groupedContent = franchiseContent.reduce<Record<number, FranchiseContent[]>>(
    (acc, item) => {
      const typeId = item.contentTypeId;
      if (!acc[typeId]) acc[typeId] = [];
      acc[typeId].push(item);
      return acc;
    },
    {}
  );

  // Sort groups by configured order
  const sortedGroups = Object.entries(groupedContent)
    .map(([typeId, items]) => ({
      typeId: Number(typeId),
      config: getContentTypeConfig(Number(typeId)),
      items,
    }))
    .sort((a, b) => a.config.order - b.config.order);

  useEffect(() => {
    if (sortedGroups.length > 0 && (activeTabId === null || !groupedContent[activeTabId])) {
      setActiveTabId(sortedGroups[0].typeId);
    }
  }, [sortedGroups, activeTabId, groupedContent]);

  // Fetch franchise content and user states
  useEffect(() => {
    if (!franchiseId) return;

    const fetchFranchiseContent = async () => {
      try {
        console.log('🎬 [ContentFranchise] Fetching franchise content:', franchiseId);
        const { data } = await apolloClient.query<{ getFranchiseContent: FranchiseContent[] }>({
          query: GET_FRANCHISE_CONTENT,
          variables: {
            franchiseId,
            excludeContentId: currentContentId,
          },
        });

        const content = data?.getFranchiseContent || [];
        setFranchiseContent(content);
        console.log('✅ [ContentFranchise] Found', content.length, 'items');

        // Load user states if logged in
        if (user && content.length > 0) {
          const contentIds = content.map((c) => c.id);
          const { data: logs } = await getUserContentLogs(contentIds);

          const states: Record<string, ItemState> = {};
          logs?.forEach((log: any) => {
            states[log.contentId] = {
              isConsumed: log.isConsumed || false,
              isFavorite: log.isFavorite || false,
              isConsumeLater: log.isConsumeLater || false,
              isContinuing: log.isContinuing || false,
            };
          });
          setItemStates(states);
        }
      } catch (err) {
        console.error('❌ [ContentFranchise] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load franchise content');
      } finally {
        setLoading(false);
      }
    };

    fetchFranchiseContent();
  }, [franchiseId, currentContentId, user]);

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-white/10 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || franchiseContent.length === 0) {
    return null;
  }

  const activeGroup = sortedGroups.find((g) => g.typeId === activeTabId) || sortedGroups[0];

  return (
    <div className="glass-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4 px-1">
        {franchiseName
          ? t('otherContentFranchise', { franchiseName, count: franchiseContent.length })
          : t('otherContent', { count: franchiseContent.length })}
      </h3>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {sortedGroups.map(({ typeId, config, items }) => (
          <button
            key={typeId}
            onClick={() => setActiveTabId(typeId)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeTabId === typeId
                ? 'bg-white/10 text-white'
                : 'bg-transparent text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <span>{config.emoji}</span>
            <span>{config.label}</span>
            <span className="opacity-50">({items.length})</span>
          </button>
        ))}
      </div>

      {activeGroup && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {activeGroup.items.map((item) => {
            const itemContentType = getContentType(item.contentTypeId);
            const state = itemStates[item.id] || {
              isConsumed: false,
              isFavorite: false,
              isConsumeLater: false,
              isContinuing: false,
            };

            return (
              <InteractivePoster
                key={item.id}
                content={{
                  id: item.id,
                  title: item.title,
                  posterUrl: item.posterUrl,
                  releaseDate: item.releaseDate ?? undefined,
                }}
                contentType={itemContentType}
                isConsumed={state.isConsumed}
                isFavorite={state.isFavorite}
                isConsumeLater={state.isConsumeLater}
                isContinuing={state.isContinuing}
                showActions={!!user}
                onWatch={() => handleWatch(item)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onToggleWatchlist={() => handleToggleWatchlist(item)}
                onToggleContinuing={() => handleToggleContinuing(item)}
                onAddToList={() => handleAddToList(item, itemContentType)}
                size="medium"
              />
            );
          })}
        </div>
      )}

      {franchiseContent.length >= 20 && (
        <p className="text-sm text-white/60 text-center mt-4">İlk 20 içerik gösteriliyor</p>
      )}

      {/* Add to List Modal */}
      {selectedItemForList && (
        <AddToListModal
          isOpen={showAddToListModal}
          onClose={() => {
            setShowAddToListModal(false);
            setSelectedItemForList(null);
          }}
          contentId={selectedItemForList.id.toString()}
          contentType={selectedItemContentType}
          contentTitle={selectedItemForList.title}
        />
      )}
    </div>
  );
}
