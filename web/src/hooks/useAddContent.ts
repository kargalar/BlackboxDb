import { useState } from 'react';
import { createContent } from '@/services/adminService';
import type { CreateContentInput } from '@/services/graphql/admin';

interface UseAddContentReturn {
  loading: boolean;
  error: string | null;
  addContent: (input: CreateContentInput) => Promise<{ success: boolean; id?: string }>;
}

export function useAddContent(): UseAddContentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addContent = async (input: CreateContentInput) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 [useAddContent] Adding content:', input);

      const { data, error: apiError } = await createContent(input);

      if (apiError) {
        const errorMsg = apiError.message || 'İçerik oluşturma başarısız oldu';
        console.error('❌ [useAddContent] Error:', errorMsg);
        setError(errorMsg);
        return { success: false };
      }

      console.log('✅ [useAddContent] Content added successfully:', data?.id);
      return { success: true, id: data?.id };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('❌ [useAddContent] Exception:', errorMsg);
      setError(errorMsg);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, addContent };
}
