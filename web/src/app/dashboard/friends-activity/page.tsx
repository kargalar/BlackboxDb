'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import Link from 'next/link';
import FriendsActivitySection from '@/components/organisms/dashboard/FriendsActivitySection';
import AddToListModal from '@/components/organisms/AddToListModal';
import { useFriendsActivityFeed } from '@/hooks/useFriendsActivityFeed';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useDashboardData } from '../hooks/useDashboardData';

export default function FriendsActivityPage() {
  const translateUi = useUiTranslations('Ui');
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

  const { activities, itemStates, loading, error, refresh } = useFriendsActivityFeed({
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
            {translateUi("dashboard_apos_a_don_f0706e5")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{translateUi("arkadas_aktiviteleri_7f45243")}</h1>
          <p className="text-white/50">
            {translateUi("takip_ettigin_kisilerin_tum_son_aktiviteleri_761c3c5")}
          </p>
        </div>
      </div>

      <FriendsActivitySection
        activities={activities}
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
