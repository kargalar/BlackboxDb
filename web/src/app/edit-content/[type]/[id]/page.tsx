'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Route } from 'next';

export default function EditContentRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/add-content/?id=${encodeURIComponent(id)}` as Route);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pt-20 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );
}
