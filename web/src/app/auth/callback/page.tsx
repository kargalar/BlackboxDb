'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallback() {
  const translateUi = useUiTranslations('Ui');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // If user is already authenticated (Google flow completed in popup), redirect home
    if (user) {
      console.log('✅ [AuthCallback] User authenticated, redirecting to home');
      router.push('/');
      return;
    }

    // Fallback: if user isn't set yet, wait briefly then redirect to login
    const timeout = setTimeout(() => {
      console.log('⚠️ [AuthCallback] No user found, redirecting to login');
      router.push('/auth/login');
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router, user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{translateUi("giris_yapiliyor_bbe364f")}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{translateUi("lutfen_bekleyin_24d78d1")}</p>
      </div>
    </div>
  );
}
