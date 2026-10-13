import { useEffect, useMemo } from 'react';
import AddToListModal from '@/components/organisms/AddToListModal';
import type { HomeTabProps } from './HomeTabTypes';
import { useHomeTabState } from './hooks/useHomeTabState';
import ActivitySection from './components/ActivitySection';
import ContinuingContentSection from './components/ContinuingContentSection';
import FeaturedContentSection from './components/FeaturedContentSection';
import FeaturedContentDialog from './components/FeaturedContentDialog';
import RecentReviewsSection from './components/RecentReviewsSection';
import { StatsHeatmapSection } from './components/StatsHeatmapSection';
import { RecentActivityList } from './components/RecentActivityList';
import { FavoritePeopleSection } from './components/FavoritePeopleSection';
import ProfileProgressSection from './components/ProfileProgressSection';
import { useTranslations } from 'next-intl';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';

type ProfileContentType = 'movie' | 'tv' | 'game' | 'book' | 'music';

type ContinuingHomeItem = {
  content: any;
  contentType: ProfileContentType;
  tabName: 'Movies' | 'TV' | 'Games' | 'Books' | 'Music';
};

const CONTENT_TYPE_CONFIG: Record<
  number,
  {
    contentType: ProfileContentType;
    tabName: 'Movies' | 'TV' | 'Games' | 'Books' | 'Music';
  }
> = {
  1: { contentType: 'movie', tabName: 'Movies' },
  2: { contentType: 'tv', tabName: 'TV' },
  3: { contentType: 'game', tabName: 'Games' },
  4: { contentType: 'book', tabName: 'Books' },
  5: { contentType: 'music', tabName: 'Music' },
};

const getContinuingFlag = (item: any) => Boolean(item?.isContinuing ?? item?.is_continuing);

const getItemSortTimestamp = (item: any) => {
  const rawDate =
    item?.userDate ?? item?.user_date ?? item?.updatedAt ?? item?.releaseDate ?? item?.release_date;
  if (!rawDate) {
    return 0;
  }

  const parsedDate = new Date(rawDate).getTime();
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
};

export default function HomeTab({
  username,
  recentMovies,
  recentTv = [],
  recentGames = [],
  recentBooks = [],
  recentMusic = [],
  featuredMovies,
  featuredTv = [],
  featuredGames = [],
  featuredBooks = [],
  featuredMusic = [],
  favoritePeople = [],
  allConsumedMovies = [],
  allConsumedTv = [],
  allConsumedGames = [],
  allConsumedBooks = [],
  allConsumedMusic = [],
  activityFeed = [],
  stats,
  isOwnProfile = false,
  onFeaturedUpdate,
  onShowAll,
}: HomeTabProps) {
  const { settings } = useGlobalSettings();

  const allHomeItems = useMemo<ContinuingHomeItem[]>(
    () =>
      (
        [
          { items: allConsumedMovies, contentType: 'movie', tabName: 'Movies' },
          { items: allConsumedTv, contentType: 'tv', tabName: 'TV' },
          { items: allConsumedGames, contentType: 'game', tabName: 'Games' },
          { items: allConsumedBooks, contentType: 'book', tabName: 'Books' },
          { items: allConsumedMusic, contentType: 'music', tabName: 'Music' },
        ] as const
      ).flatMap(({ items, contentType, tabName }) =>
        items.map((content) => ({ content, contentType, tabName }))
      ),
    [allConsumedMovies, allConsumedTv, allConsumedGames, allConsumedBooks, allConsumedMusic]
  );

  const continuingSourceItems = useMemo(
    () =>
      allHomeItems
        .filter(({ content }) => getContinuingFlag(content))
        .map(({ content }) => content),
    [allHomeItems]
  );

  const t = useTranslations('ProfileHomeTab');

  const continuingItemsFromActivity = useMemo<ContinuingHomeItem[]>(() => {
    const uniqueItems = new Map<string, ContinuingHomeItem>();

    activityFeed.forEach((activity) => {
      if (!activity?.isContinuing || !activity?.content) {
        return;
      }

      const typeConfig = CONTENT_TYPE_CONFIG[activity.content.contentTypeId];
      if (!typeConfig) {
        return;
      }

      const normalizedContent = {
        ...activity.content,
        isConsumed: activity.isConsumed,
        isFavorite: activity.isFavorite,
        isConsumeLater: activity.isConsumeLater,
        isContinuing: activity.isContinuing,
        user_rating: activity.rating,
        userDate: activity.date ?? activity.updatedAt,
        hasReview: !!(
          activity.review &&
          typeof activity.review === 'string' &&
          activity.review.trim()
        ),
      };

      const uniqueKey = `${typeConfig.contentType}-${normalizedContent.id}`;
      if (!uniqueItems.has(uniqueKey)) {
        uniqueItems.set(uniqueKey, {
          content: normalizedContent,
          contentType: typeConfig.contentType,
          tabName: typeConfig.tabName,
        });
      }
    });

    return Array.from(uniqueItems.values());
  }, [activityFeed]);

  console.log(`🏠 [HomeTab] Rendering with data:`, {
    recentMovies: recentMovies.length,
    recentTv: recentTv.length,
    recentGames: recentGames.length,
    recentBooks: recentBooks.length,
    recentMusic: recentMusic.length,
    featuredMovies: featuredMovies.length,
    featuredTv: featuredTv.length,
    featuredGames: featuredGames.length,
    featuredBooks: featuredBooks.length,
    featuredMusic: featuredMusic.length,
    stats,
    isOwnProfile,
  });

  const state = useHomeTabState({
    recentMovies,
    recentTv,
    recentGames,
    recentBooks,
    recentMusic,
    continuingItems: [
      ...continuingSourceItems,
      ...continuingItemsFromActivity.map(({ content }) => content),
    ],
    featuredMovies,
    featuredTv,
    featuredGames,
    featuredBooks,
    featuredMusic,
    allConsumedMovies,
    allConsumedTv,
    allConsumedGames,
    allConsumedBooks,
    allConsumedMusic,
    isOwnProfile,
    onFeaturedUpdate,
  });

  const continuingItems = useMemo(() => {
    const mergedItems = new Map<string, ContinuingHomeItem>();

    allHomeItems.forEach((item) => {
      if (getContinuingFlag(item.content)) {
        mergedItems.set(`${item.contentType}-${item.content.id}`, item);
      }
    });

    continuingItemsFromActivity.forEach((item) => {
      mergedItems.set(`${item.contentType}-${item.content.id}`, item);
    });

    return Array.from(mergedItems.values())
      .filter(({ content }) => {
        const persistedContinuing = getContinuingFlag(content);
        const localContinuingState = state.itemStates[content.id]?.isContinuing;

        return isOwnProfile ? (localContinuingState ?? persistedContinuing) : persistedContinuing;
      })
      .sort(
        (left, right) => getItemSortTimestamp(right.content) - getItemSortTimestamp(left.content)
      )
      .slice(0, 20);
  }, [allHomeItems, continuingItemsFromActivity, isOwnProfile, state.itemStates]);

  console.log('▶️ [HomeTab] Continuing section prepared:', {
    sourceCount: continuingSourceItems.length,
    activityCount: continuingItemsFromActivity.length,
    visibleCount: continuingItems.length,
  });

  const recentReviewItems = useMemo(() => {
    const reviewEntries = activityFeed.filter((activity) => {
      if (!activity?.review) {
        return false;
      }

      if (isOwnProfile) {
        return true;
      }

      return activity?.reviewDiscussion?.isPublic === true;
    });

    return reviewEntries.slice(0, 5);
  }, [activityFeed, isOwnProfile]);

  useEffect(() => {
    const handleOpenFeaturedDialog = () => {
      state.setShowFeaturedDialog(true);
      state.setSearchQuery('');
    };

    document.addEventListener('openFeaturedDialog', handleOpenFeaturedDialog);
    return () => {
      document.removeEventListener('openFeaturedDialog', handleOpenFeaturedDialog);
    };
  }, [state]);

  return (
    <div className="profile-home-page space-y-8">
      <div className="profile-home-block profile-continuing-block">
        <ContinuingContentSection
          items={continuingItems}
          itemStates={state.itemStates}
          isOwnProfile={isOwnProfile}
          handlers={state.handlers}
          onShowAll={onShowAll}
        />
      </div>

      <ProfileProgressSection
        movies={allConsumedMovies}
        tv={allConsumedTv}
        games={allConsumedGames}
        books={allConsumedBooks}
        music={allConsumedMusic}
        onViewStats={() => onShowAll?.('Stats')}
      />

      {/* Three-column layout: Featured | Calendar | Recent Activity */}
      <div className="profile-home-block profile-insights-grid flex flex-col 2xl:flex-row gap-6 items-stretch">
        {/* Left: Featured Content */}
        <div className="profile-featured-panel flex-1 min-w-0 w-full">
          <FeaturedContentSection
            featuredMovies={featuredMovies}
            featuredTv={featuredTv}
            featuredGames={featuredGames}
            featuredBooks={featuredBooks}
            featuredMusic={featuredMusic}
            featuredType={state.featuredType}
            setFeaturedType={state.setFeaturedType}
            itemStates={state.itemStates}
            isOwnProfile={isOwnProfile}
            handlers={state.handlers}
            onOpenDialog={() => {
              state.setShowFeaturedDialog(true);
              state.setSearchQuery('');
            }}
          />
        </div>

        {/* Center: Calendar Heatmap */}
        <div className="profile-heatmap-panel flex-shrink-0 w-full 2xl:w-auto">
          <StatsHeatmapSection
            watched={{
              movies: allConsumedMovies,
              tv: allConsumedTv,
              games: allConsumedGames,
              books: allConsumedBooks,
              music: allConsumedMusic,
            }}
            selectedDay={state.heatmapSelectedDay}
            onSelectDay={state.setHeatmapSelectedDay}
          />
        </div>

        {/* Right: Recent Activity List */}
        <div className="profile-activity-panel flex-shrink-0 w-full 2xl:w-[300px] self-stretch max-h-[500px]">
          <RecentActivityList
            watched={{
              movies: allConsumedMovies,
              tv: allConsumedTv,
              games: allConsumedGames,
              books: allConsumedBooks,
              music: allConsumedMusic,
            }}
            selectedDay={state.heatmapSelectedDay}
            onClearDay={() => state.setHeatmapSelectedDay(undefined)}
          />
        </div>
      </div>

      <div className="profile-home-block profile-content-activity-grid grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Film Aktiviteleri */}
        {recentMovies.length > 0 && (
          <ActivitySection
            title={t('movie.title')}
            items={recentMovies}
            contentType="movie"
            maxItems={6}
            emptyMessage={t('movie.empty')}
            exploreLink="/explore"
            exploreLinkText={t('movie.explore')}
            showAllTabName="Movies"
            itemStates={state.itemStates}
            isOwnProfile={isOwnProfile}
            handlers={state.handlers}
            onShowAll={onShowAll}
          />
        )}

        {/* TV/Dizi Aktiviteleri */}
        {recentTv.length > 0 && (
          <ActivitySection
            title={t('tv.title')}
            items={recentTv}
            contentType="tv"
            maxItems={6}
            emptyMessage={t('tv.empty')}
            exploreLink="/explore/tv"
            exploreLinkText={t('tv.explore')}
            showAllTabName="TV"
            itemStates={state.itemStates}
            isOwnProfile={isOwnProfile}
            handlers={state.handlers}
            onShowAll={onShowAll}
          />
        )}

        {/* Kitap Aktiviteleri */}
        {settings?.isBookEnabled !== false && recentBooks.length > 0 && (
          <ActivitySection
            title={t('book.title')}
            items={recentBooks}
            contentType="book"
            maxItems={6}
            emptyMessage={t('book.empty')}
            exploreLink="/explore/book"
            exploreLinkText={t('book.explore')}
            showAllTabName="Books"
            itemStates={state.itemStates}
            isOwnProfile={isOwnProfile}
            handlers={state.handlers}
            onShowAll={onShowAll}
          />
        )}

        {/* Oyun Aktiviteleri */}
        {recentGames.length > 0 && (
          <ActivitySection
            title={t('game.title')}
            items={recentGames}
            contentType="game"
            maxItems={6}
            emptyMessage={t('game.empty')}
            exploreLink="/explore/game"
            exploreLinkText={t('game.explore')}
            showAllTabName="Games"
            itemStates={state.itemStates}
            isOwnProfile={isOwnProfile}
            handlers={state.handlers}
            onShowAll={onShowAll}
          />
        )}

        {recentMusic.length > 0 && (
          <ActivitySection
            title={t('music.title')}
            items={recentMusic}
            contentType="music"
            maxItems={6}
            emptyMessage={t('music.empty')}
            exploreLink="/explore/music"
            exploreLinkText={t('music.explore')}
            showAllTabName="Music"
            itemStates={state.itemStates}
            isOwnProfile={isOwnProfile}
            handlers={state.handlers}
            onShowAll={onShowAll}
          />
        )}
      </div>

      {/* Son İncelemeler */}
      {recentReviewItems.length > 0 && (
        <div className="profile-home-block profile-reviews-block">
          <RecentReviewsSection
            username={username}
            reviews={recentReviewItems}
            showPrivate={isOwnProfile}
          />
        </div>
      )}

      {(favoritePeople.length > 0 || isOwnProfile) && (
        <div className="profile-home-block profile-favorites-block">
          <FavoritePeopleSection people={favoritePeople} isOwnProfile={isOwnProfile} />
        </div>
      )}

      {/* Featured Content Edit Dialog */}
      {state.showFeaturedDialog && (
        <FeaturedContentDialog
          featuredType={state.featuredType}
          setFeaturedType={state.setFeaturedType}
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          selectedContentIds={state.selectedContentIds}
          toggleContentSelection={state.toggleContentSelection}
          filteredContent={state.filteredContent}
          isSaving={state.isSaving}
          onSave={state.handleSaveFeatured}
          onClose={() => state.setShowFeaturedDialog(false)}
          getSelectedContentItems={state.getSelectedContentItems}
          draggedId={state.draggedId}
          dragOverId={state.dragOverId}
          handleDragStart={state.handleDragStart}
          handleDragOver={state.handleDragOver}
          handleDragEnd={state.handleDragEnd}
          handleDrop={state.handleDrop}
        />
      )}

      {/* Add to List Modal */}
      {state.selectedContentForList && (
        <AddToListModal
          isOpen={state.showAddToListModal}
          onClose={() => {
            state.setShowAddToListModal(false);
            state.setSelectedContentForList(null);
          }}
          contentId={state.selectedContentForList.id.toString()}
          contentType={state.selectedContentType}
          contentTitle={state.selectedContentForList.title || ''}
        />
      )}
    </div>
  );
}
