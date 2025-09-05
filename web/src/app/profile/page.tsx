'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/services/database/userService';

export default function ProfilePage() {
  const { user } = useAuth();
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profil sayfasını görüntülemek için giriş yapın</h2>
          <Link href="/auth/login" className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
    </div>
  );
}
