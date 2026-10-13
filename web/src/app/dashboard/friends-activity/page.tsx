'use client';

import Link from 'next/link';
import FriendsActivitySection from '@/components/organisms/dashboard/FriendsActivitySection';
import AddToListModal from '@/components/organisms/AddToListModal';
import { useFriendsActivityFeed } from '@/hooks/useFriendsActivityFeed';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDashboardData } from '../hooks/useDashboardData';

export default function FriendsActivityPage() {
  const { preferredContentTypes } = useUserPreferences();
  const {
    handleWatchToggle,
    handleFavoriteToggle,
    handleWatchlistToggle,
    handleAddToList,
    showAddToListModal,
    setShowAddToListModal,
    selectedContentForList,
    setSelectedContentForList,
    selectedContentType,
  } = useDashboardData();

  const { statusActivities, itemStates, loading, error, refresh } = useFriendsActivityFeed({
    limit: 100,
    enabled: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Dashboard&apos;a dön
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Arkadaş Aktiviteleri</h1>
          <p className="text-white/50">
            Takip ettiğin kişilerin tüm son durum güncellemeleri tek sayfada.
          </p>
        </div>
      </div>

      <FriendsActivitySection
        activities={statusActivities}
        itemStates={itemStates}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onWatchToggle={handleWatchToggle}
        onFavoriteToggle={handleFavoriteToggle}
        onWatchlistToggle={handleWatchlistToggle}
        onAddToList={handleAddToList}
        preferredContentTypes={preferredContentTypes}
        layout="grid"
        showViewAll={false}
      />

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
