'use client';

import AddToListModal from '@/components/organisms/AddToListModal';
import FriendsActivitySection from '@/components/organisms/dashboard/FriendsActivitySection';
import FriendsReviewsSection from '@/components/organisms/dashboard/FriendsReviewsSection';
import PopularReviewsSection from '@/components/organisms/dashboard/PopularReviewsSection';
import PopularDiscussionsSection from '@/components/organisms/dashboard/PopularDiscussionsSection';
import { SkeletonGrid } from './components/DashboardUI';
import ContentSection from './components/ContentSection';
import PopularContentSection from './components/PopularContentSection';
import UpcomingAnticipatedSection from './components/UpcomingAnticipatedSection';
import DashboardHero from './components/DashboardHero';
import LibrarySummary from './components/LibrarySummary';
import TopContributorsSection from '@/components/organisms/dashboard/TopContributorsSection';
import { useDashboardData } from './hooks/useDashboardData';
import { useFriendsActivityFeed } from '@/hooks/useFriendsActivityFeed';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const {
    user,
    trendingMovies,
    anticipatedMovies,
    trendingTv,
    anticipatedTv,
    popularBooks,
    popularMusic,
    trendingGames,
    anticipatedGames,
    anticipatedBooks,
    anticipatedMusic,
    personalStats,
    personalStatsLoading,
    loading,
    tvLoading,
    booksLoading,
    anticipatedLoading,
    error,
    itemStates,
    handleWatchToggle,
    handleFavoriteToggle,
    handleWatchlistToggle,
    handleAddToList,
    showAddToListModal,
    setShowAddToListModal,
    selectedContentForList,
    setSelectedContentForList,
    selectedContentType,
    contentTimeRanges,
    setContentTimeRange,
  } = useDashboardData();

  const { preferredContentTypes, splitHomePopularSections } = useUserPreferences();
  // Content type visibility helpers (1=movie, 2=tv, 3=game, 4=book, 5=music)
  const showMovies = preferredContentTypes.includes(1);
  const showTv = preferredContentTypes.includes(2);
  const showGames = preferredContentTypes.includes(3);
  const showBooks = preferredContentTypes.includes(4);
  const showMusic = preferredContentTypes.includes(5);

  const {
    statusActivities,
    reviewActivities,
    itemStates: friendsItemStates,
    loading: friendsLoading,
    error: friendsError,
    refresh: friendsRefresh,
  } = useFriendsActivityFeed({ limit: 20, enabled: true });

  // Shared handler props — avoids repeating them on every ContentSection
  const handlers = {
    onWatchToggle: handleWatchToggle,
    onFavoriteToggle: handleFavoriteToggle,
    onWatchlistToggle: handleWatchlistToggle,
    onAddToList: handleAddToList,
    itemStates,
  };

  return (
    <div className="dashboard-page dashboard-redesign">
      {/* Welcome Header */}
      <div className="dashboard-welcome">
        <h1 className="text-4xl font-bold mb-2">
          {t('header.welcome', { name: user?.username ? `, ${user.username}` : '' })}
        </h1>
        <p className="text-white/50 text-lg">{t('header.subtitle')}</p>
      </div>

      <DashboardHero
        fallbackContents={{
          1: trendingMovies[0],
          2: trendingTv[0],
          3: trendingGames[0],
          4: popularBooks[0],
          5: popularMusic[0],
        }}
        preferredContentTypes={preferredContentTypes}
        isLoading={loading}
        onAddToList={handleAddToList}
      />

      {user?.username && (
        <LibrarySummary
          stats={personalStats}
          loading={personalStatsLoading}
          username={user.username}
        />
      )}

      <div className="dashboard-section dashboard-contributors-section">
        <TopContributorsSection />
      </div>

      {loading ? (
        <div className="dashboard-loading-state space-y-12">
          <div>
            <div className="h-8 w-64 skeleton rounded mb-6" />
            <SkeletonGrid />
          </div>
          <div>
            <div className="h-8 w-48 skeleton rounded mb-6" />
            <SkeletonGrid />
          </div>
        </div>
      ) : error ? (
        <div className="dashboard-error-state glass-card p-8 border border-red-500/30">
          <p className="text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Popular Content */}
          {!splitHomePopularSections &&
            (showMovies || showTv || showGames || showBooks || showMusic) && (
              <div className="dashboard-section dashboard-popular-content-section">
                <PopularContentSection
                  preferredContentTypes={preferredContentTypes}
                  splitByContentType={false}
                  trendingMovies={trendingMovies}
                  trendingTv={trendingTv}
                  trendingGames={trendingGames}
                  popularBooks={popularBooks}
                  popularMusic={popularMusic}
                  loading={loading}
                  tvLoading={tvLoading}
                  booksLoading={booksLoading}
                  contentTimeRanges={contentTimeRanges}
                  onTimeRangeChange={setContentTimeRange}
                  {...handlers}
                />
              </div>
            )}

          {splitHomePopularSections && showGames && (
            <ContentSection
              title={t('sections.popularGames')}
              emoji="🎮"
              href="/explore/game"
              items={trendingGames}
              contentType="game"
              hideWhenEmpty
              useNextImage={false}
              timeRange={contentTimeRanges.game}
              onTimeRangeChange={(r) => setContentTimeRange('game', r)}
              {...handlers}
            />
          )}

          {splitHomePopularSections && showTv && (
            <ContentSection
              title={t('sections.popularTvShows')}
              emoji="📺"
              href="/explore/tv"
              items={trendingTv}
              contentType="tv"
              isLoading={tvLoading}
              emptyMessage={t('sections.noTvShows')}
              timeRange={contentTimeRanges.tv}
              onTimeRangeChange={(r) => setContentTimeRange('tv', r)}
              {...handlers}
            />
          )}

          {splitHomePopularSections && showMovies && (
            <ContentSection
              title={t('sections.popularMovies')}
              emoji="🎬"
              href="/explore/movie"
              items={trendingMovies}
              contentType="movie"
              timeRange={contentTimeRanges.movie}
              onTimeRangeChange={(r) => setContentTimeRange('movie', r)}
              {...handlers}
            />
          )}

          {splitHomePopularSections && showBooks && (
            <ContentSection
              title={t('sections.popularBooks')}
              emoji="📚"
              href="/explore/book"
              items={popularBooks}
              contentType="book"
              isLoading={booksLoading}
              emptyMessage={t('sections.noBooks')}
              useNextImage={false}
              timeRange={contentTimeRanges.book}
              onTimeRangeChange={(r) => setContentTimeRange('book', r)}
              {...handlers}
            />
          )}

          {splitHomePopularSections && showMusic && (
            <ContentSection
              title={t('sections.popularMusic')}
              emoji="🎵"
              href="/explore/music"
              items={popularMusic}
              contentType="music"
              hideWhenEmpty
              isLoading={loading}
              emptyMessage={t('sections.noMusic')}
              timeRange={contentTimeRanges.music}
              onTimeRangeChange={(r) => setContentTimeRange('music', r)}
              {...handlers}
            />
          )}

          {/* Most Anticipated Upcoming Content (Compact) */}
          <UpcomingAnticipatedSection
            preferredContentTypes={preferredContentTypes}
            anticipatedMovies={anticipatedMovies}
            anticipatedTv={anticipatedTv}
            anticipatedGames={anticipatedGames}
            anticipatedBooks={anticipatedBooks}
            anticipatedMusic={anticipatedMusic}
            isLoading={anticipatedLoading}
            splitByContentType={splitHomePopularSections}
            {...handlers}
          />

          <div className="dashboard-section dashboard-friends-activity-section">
            <FriendsActivitySection
              activities={statusActivities}
              loading={friendsLoading}
              error={friendsError}
              onRefresh={friendsRefresh}
              {...handlers}
              itemStates={friendsItemStates}
              preferredContentTypes={preferredContentTypes}
              splitByContentType={splitHomePopularSections}
            />
          </div>

          <div className="dashboard-section dashboard-friends-reviews-section">
            <FriendsReviewsSection
              reviews={reviewActivities}
              loading={friendsLoading}
              error={friendsError}
              onRefresh={friendsRefresh}
              preferredContentTypes={preferredContentTypes}
              splitByContentType={splitHomePopularSections}
            />
          </div>

          {/* Popular Reviews & Discussions - side by side */}
          <div className="dashboard-section dashboard-community-section grid grid-cols-1 gap-6">
            <PopularReviewsSection
              preferredContentTypes={preferredContentTypes}
              splitByContentType={splitHomePopularSections}
            />
            <PopularDiscussionsSection
              preferredContentTypes={preferredContentTypes}
              splitByContentType={splitHomePopularSections}
            />
          </div>
        </>
      )}

      {/* Add to List Modal */}
      {selectedContentForList && (
        <AddToListModal
          isOpen={showAddToListModal}
          onClose={() => {
            setShowAddToListModal(false);
            setSelectedContentForList(null);
          }}
          contentId={selectedContentForList.id.toString()}
          contentType={selectedContentType}
          contentTitle={selectedContentForList.title || ''}
        />
      )}
    </div>
  );
}
