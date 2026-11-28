'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { getContentById, getContentRequestById } from '@/services/adminService';
import { apolloClient } from '@/lib/apollo-client';
import { GET_CONTRIBUTION, type Contribution } from '@/services/graphql/contribution';
import { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import toast from 'react-hot-toast';
import { emitDebugEvent } from '@/lib/debug-events';
import { useAddContentStore } from '@/store/useAddContentStore';
import { INITIAL_FORM_DATA } from '../types';
import { mapContentToFormData } from '@/utils/mapContentToFormData';

/**
 * Hook that manages the add-content form state, content loading, and validation.
 */
export function useAddContentForm() {
  const t = useTranslations('AddContent.feedback');
  const tBoardGames = useTranslations('BoardGames');
  const searchParams = useSearchParams();
  const { user, isPrivileged } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [contributionStatus, setContributionStatus] = useState<string | null>(null);

  const {
    formData,
    setFormData,
    pendingPoster,
    pendingBackdrop,
    setPendingPoster,
    setPendingBackdrop,
    resetForm,
    contentId,
    setContentId,
    requestId,
    setRequestId,
    contributionId,
    setContributionId,
  } = useAddContentStore();

  // Kullanıcının yetkili olup olmadığını belirle
  const canDirectCreate = isPrivileged || user?.isAdmin || user?.isModerator;

  // Debug: formData değişikliklerini izle
  useEffect(() => {
    console.log('📊 [AddContent] formData updated:', {
      themes: formData.themes,
      moods: formData.moods,
      genres: formData.genres,
    });
  }, [formData.themes, formData.moods, formData.genres]);

  // --- Load content request payload ---
  const loadContentRequest = useCallback(
    async (id: number) => {
      try {
        setLoading(true);
        console.log('🔄 [Content] Loading content request payload...');

        const { data, error } = await getContentRequestById(id);
        if (error || !data) {
          console.error('❌ [Content] Failed to load content request:', error);
          emitDebugEvent({
            level: 'error',
            scope: 'AddContent',
            message: 'Content request yüklenemedi',
            data: { id, error },
          });
          toast.error(t('requestLoadFailed'));
          return;
        }

        const payload = (data.payload || {}) as Record<string, any>;
        console.debug('✅ [Content] Content request payload keys:', Object.keys(payload));
        emitDebugEvent({
          level: 'success',
          scope: 'AddContent',
          message: 'Content request payload yüklendi',
          data: { id, keys: Object.keys(payload) },
        });

        setFormData((prev: any) => {
          const next: any = { ...prev };

          // Only assign defined/non-null values to avoid clobbering defaults
          for (const [key, value] of Object.entries(payload)) {
            if (value === undefined || value === null) continue;
            if (key === 'genres' && !Array.isArray(value)) continue;
            if (key === 'cast' && !Array.isArray(value)) continue;
            if (key === 'crew' && !Array.isArray(value)) continue;
            if (key === 'authors' && !Array.isArray(value)) continue;
            if (key === 'seasons' && !Array.isArray(value)) continue;
            if (key === 'screenshots' && !Array.isArray(value)) continue;
            next[key] = value;
          }

          // Normalize contentTypeId to string (form expects string)
          if (typeof next.contentTypeId === 'number') {
            next.contentTypeId = String(next.contentTypeId);
          }

          return next;
        });
      } catch (e) {
        console.error('❌ [Content] Exception while loading content request:', e);
        emitDebugEvent({
          level: 'error',
          scope: 'AddContent',
          message: 'Content request yüklerken exception',
          data: { id, error: e },
        });
        toast.error(t('requestLoadFailed'));
      } finally {
        setLoading(false);
      }
    },
    [setFormData, t]
  );

  // --- Load content data (edit mode) ---
  const loadContent = useCallback(
    async (id: string, contribId: number | null = null) => {
      try {
        setLoading(true);
        console.log('🔄 [Content] Loading content data...');

        const { data, error } = await getContentById(id);

        if (error || !data) {
          console.error('❌ [Content] Failed to load content:', error);
          toast.error(t('contentLoadFailed'));
          setIsEditMode(false);
          return;
        }

        console.log('✅ [Content] Content loaded successfully:', data);

        const nextFormData = mapContentToFormData(data);

        setFormData(nextFormData);
        setOriginalData(JSON.parse(JSON.stringify(nextFormData)));

        console.log(
          '📋 [Content] Form populated with content data, screenshots:',
          data.screenshots?.length || 0
        );

        if (contribId) {
          console.log(
            `🔄 [Content] Fetching contribution ${contribId} to merge over content ${id}...`
          );

          // --- DIFF DESTEĞİ: Orijinal veriyi sakla ---
          const { data: contribData } = await apolloClient.query<{
            getContribution: Contribution | null;
          }>({
            query: GET_CONTRIBUTION,
            variables: { id: contribId },
            fetchPolicy: 'network-only',
          });

          const contributionPayload = contribData?.getContribution?.payload;
          setContributionStatus(contribData?.getContribution?.status ?? null);
          if (contributionPayload) {
            console.log(`✅ [Content] Successfully fetched contribution, merging payload...`);
            setFormData((prev: any) => {
              const next: any = { ...prev };
              for (const [key, value] of Object.entries(contributionPayload)) {
                if (key === '__updateInput') continue;
                if (value === undefined || value === null) continue;
                if (key === 'genres' && !Array.isArray(value)) continue;
                if (key === 'cast' && !Array.isArray(value)) continue;
                if (key === 'crew' && !Array.isArray(value)) continue;
                if (key === 'authors' && !Array.isArray(value)) continue;
                if (key === 'seasons' && !Array.isArray(value)) continue;
                if (key === 'screenshots' && !Array.isArray(value)) continue;
                next[key] = value;
              }
              if (typeof next.contentTypeId === 'number') {
                next.contentTypeId = String(next.contentTypeId);
              }
              return next;
            });
            toast.success(t('editRequestLoaded'), { id: 'contrib-loaded' });
          }
        }
      } catch (error) {
        console.error('❌ [Content] Exception while loading:', error);
        toast.error(t('contentLoadFailed'), { id: 'content-load-error' });
        setIsEditMode(false);
      } finally {
        setLoading(false);
      }
    },
    [setFormData, t]
  );

  useEffect(() => {
    const id = searchParams.get('id');
    const reqId = searchParams.get('requestId');
    const contribId = searchParams.get('contributionId');

    if (!id && !reqId) {
      resetForm();
      setIsEditMode(false);
      setOriginalData(null);
      setContributionStatus(null);
      setContentId(null);
      return;
    }

    if (reqId && requestId !== Number(reqId)) {
      setRequestId(Number(reqId));
      loadContentRequest(Number(reqId));
    }

    if (contribId && contributionId !== Number(contribId)) {
      setContributionId(Number(contribId));
    }

    if (id) {
      setIsEditMode(true);
      if (contentId !== id) {
        setContentId(id);
        loadContent(id, contribId ? Number(contribId) : null);
      }
    } else {
      setIsEditMode(false);
      if (contentId !== null) {
        setContentId(null);
        resetForm();
      }
    }
  }, [
    searchParams,
    contentId,
    requestId,
    contributionId,
    resetForm,
    setContentId,
    setRequestId,
    setContributionId,
    loadContent,
    loadContentRequest,
  ]);

  // --- Form validation ---
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Ortak validation
    if (!formData.title.trim()) {
      newErrors.title = t('titleRequired');
    }

    if (!formData.contentTypeId) {
      newErrors.contentTypeId = t('typeRequired');
    }

    // İçerik türüne göre validation
    const contentType = parseInt(formData.contentTypeId);
    if (formData.contentTypeSlug === 'board-game') {
      const { minPlayers, maxPlayers } = formData;
      for (const field of ['minPlayers', 'maxPlayers', 'runtime'] as const) {
        const value = formData[field];
        if (value && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2_147_483_647)) {
          newErrors[field] = tBoardGames('positiveInteger');
        }
      }
      if (
        minPlayers &&
        maxPlayers &&
        !newErrors.minPlayers &&
        !newErrors.maxPlayers &&
        Number(minPlayers) > Number(maxPlayers)
      ) {
        newErrors.maxPlayers = tBoardGames('invalidPlayerRange');
      }
    }
    if (contentType === 4) {
      (formData.bookPublications || []).forEach((publication, index) => {
        if (publication.isbn && !/^\d{10}(\d{3})?$/.test(publication.isbn.replace(/-/g, ''))) {
          newErrors[`bookPublications.${index}.isbn`] =
            t('invalidIsbn');
        }
      });
    }

    setErrors(newErrors);
    console.log(
      '🔍 [AddContent] Validation result:',
      Object.keys(newErrors).length === 0
        ? '✅ passed'
        : `❌ ${Object.keys(newErrors).length} errors`
    );
    return Object.keys(newErrors).length === 0;
  };

  return {
    user,
    loading,
    setLoading,
    uploadProgress,
    setUploadProgress,
    errors,
    isEditMode,
    originalData,
    contentId,
    requestId,
    contributionId,
    contributionStatus,
    formData,
    setFormData,
    pendingPoster,
    pendingBackdrop,
    setPendingPoster,
    setPendingBackdrop,
    resetForm,
    canDirectCreate,
    validateForm,
    isBulkMode,
    setIsBulkMode,
  };
}
