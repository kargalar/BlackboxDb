'use client';

import Link from 'next/link';
import FriendsReviewsSection from '@/components/organisms/dashboard/FriendsReviewsSection';
import { useFriendsActivityFeed } from '@/hooks/useFriendsActivityFeed';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function FriendsReviewsPage() {
  const { preferredContentTypes } = useUserPreferences();
  const { reviewActivities, loading, error, refresh } = useFriendsActivityFeed({
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
            Dashboard&apos;a don
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Arkadas Yorumlari</h1>
          <p className="text-white/50">
            Takip ettigin kisilerin tum son yorumlari ve incelemeleri tek sayfada.
          </p>
        </div>
      </div>

      <FriendsReviewsSection
        reviews={reviewActivities}
        loading={loading}
        error={error}
        onRefresh={refresh}
        preferredContentTypes={preferredContentTypes}
        layout="grid"
        showViewAll={false}
      />
    </div>
  );
}
