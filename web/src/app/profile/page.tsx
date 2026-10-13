'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/services/database/userService';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const redirectToUserProfile = async () => {
      if (user) {
        try {
          const userProfileResult = await getCurrentUserProfile();
          if (userProfileResult.data?.username) {
            router.replace(`/profile/${userProfileResult.data.username}`);
          } else {
            // If no username, fallback to a default or show error
            console.error('User profile has no username');
          }
        } catch (error) {
          console.error('Error getting user profile:', error);
        }
      }
    };

    redirectToUserProfile();
  }, [user, router]);

  const t = useTranslations('ProfilePage');

  if (loading) {
    return (
      <div className="profile-gate page-loading min-h-screen" role="status" aria-label="Loading">
        <div className="loading-spinner h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-gate min-h-screen px-4 py-12 text-white">
        <div className="profile-gate-card glass-card mx-auto max-w-lg p-8 text-center sm:p-12">
          <div className="profile-gate-icon mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
            <span className="text-2xl" aria-hidden="true">
              B
            </span>
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-violet-300/80">
            Blackbox
          </p>
          <h2 className="mb-4 text-2xl font-bold">{t('loginRequired')}</h2>
          <p className="mb-8 text-sm leading-6 text-white/55">{t('loginToViewProfiles')}</p>
          <Link href="/auth/login" className="btn-gradient inline-flex items-center justify-center">
            {t('login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-gate page-loading min-h-screen" role="status" aria-label="Loading">
      <div className="loading-spinner h-16 w-16 rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );
}
