'use client';

/**
 * useExpansionsData — all state and logic for the expansion admin page.
 * SRP: data fetching, form state, CRUD actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUserProfile } from '@/services/database/userService';
import {
  listExpansions,
  getExpansionById,
  createExpansion,
  updateExpansion,
  deleteExpansion,
} from '@/services/admin/expansionService';
import { listContent } from '@/services/admin/contentService';
import { uploadContentImage } from '@/services/admin/uploadService';
import type { AdminExpansion } from '@/services/graphql/admin';
import type { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { useTranslations } from 'next-intl';

export interface ExpansionFormData {
  contentId: string;
  contentTitle: string;
  name: string;
  description: string;
  posterUrl: string;
  releaseDate: string;
  type: string;
}

const EMPTY_FORM: ExpansionFormData = {
  contentId: '',
  contentTitle: '',
  name: '',
  description: '',
  posterUrl: '',
  releaseDate: '',
  type: 'expansion',
};

interface Message {
  type: 'success' | 'error';
  text: string;
}

export function useExpansionsData() {
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<AdminExpansion[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpansionFormData>(EMPTY_FORM);
  const [message, setMessage] = useState<Message | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const t = useTranslations('AdminExpansionsPage');

  // Content search for the form
  const [contentSearch, setContentSearch] = useState('');
  const [contentResults, setContentResults] = useState<{ id: string; title: string }[]>([]);
  const [searchingContent, setSearchingContent] = useState(false);

  // Pending poster upload ref
  const pendingPosterRef = useRef<PendingImageUpload | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // Auth check + initial load
  useEffect(() => {
    (async () => {
      const prof = await getCurrentUserProfile();
      const can = !!prof.data?.isAdmin || !!prof.data?.isModerator;
      setAllowed(can);
      console.log(`🎮 [Expansions] Auth check: allowed=${can}`);
      if (can) handleLoad();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Content search debounce
  useEffect(() => {
    if (!contentSearch || contentSearch.length < 2) {
      setContentResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchingContent(true);
      console.log(`🔍 [Expansions] Searching content: "${contentSearch}"`);
      const { data } = await listContent({ search: contentSearch, limit: 10 });
      setContentResults((data || []).map((c: any) => ({ id: c.id, title: c.title })));
      setSearchingContent(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [contentSearch]);

  const handleLoad = async () => {
    setLoading(true);
    console.log(`📋 [Expansions] Loading list — search="${search}", type="${typeFilter}"`);
    const params: any = {};
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;

    const result = await listExpansions(params);
    if (result.error) {
      console.error('❌ [Expansions] Load failed:', result.error);
      showMessage('error', t('messages.loadFailed'));
    } else {
      setItems(result.data || []);
      console.log(`✅ [Expansions] Loaded ${(result.data || []).length} items`);
    }
    setLoading(false);
  };

  const handleSelectContent = (id: string, title: string) => {
    setFormData((prev) => ({ ...prev, contentId: id, contentTitle: title }));
    setContentSearch('');
    setContentResults([]);
    console.log(`🎯 [Expansions] Selected content: ${title} (${id})`);
  };

  const handleCreate = async () => {
    if (!formData.contentId || !formData.name) {
      showMessage('error', t('messages.validation'));
      return;
    }

    setLoading(true);
    console.log(`➕ [Expansions] Creating: ${formData.name}`);

    // Upload poster image if pending
    let posterUrl = formData.posterUrl;
    if (posterUrl?.startsWith('data:') && pendingPosterRef.current) {
      try {
        console.log('📤 [Expansions] Uploading poster image...');
        posterUrl = await uploadContentImage(
          pendingPosterRef.current.base64,
          pendingPosterRef.current.fileName,
          'poster'
        );
        console.log('✅ [Expansions] Poster uploaded:', posterUrl);
      } catch (err: any) {
        console.error('❌ [Expansions] Poster upload failed:', err);
        showMessage('error', t('messages.posterFailed', { error: err.message }));
        setLoading(false);
        return;
      }
    }

    const { error } = await createExpansion({
      contentId: formData.contentId,
      name: formData.name,
      description: formData.description || undefined,
      posterUrl: posterUrl?.startsWith('data:') ? undefined : posterUrl || undefined,
      releaseDate: formData.releaseDate || undefined,
      type: formData.type || 'expansion',
    });

    if (error) {
      console.error('❌ [Expansions] Create failed:', error);
      showMessage('error', t('messages.createFailed'));
    } else {
      showMessage('success', t('messages.createSuccess'));
      setFormData(EMPTY_FORM);
      pendingPosterRef.current = null;
      await handleLoad();
    }
    setLoading(false);
  };

  const handleStartEdit = async (id: number) => {
    setLoading(true);
    console.log(`✏️ [Expansions] Loading expansion for edit: ${id}`);
    const { data } = await getExpansionById(id);
    if (data) {
      setEditing(id);
      setFormData({
        contentId: data.contentId,
        contentTitle: data.contentTitle || '',
        name: data.name,
        description: data.description || '',
        posterUrl: data.posterUrl || '',
        releaseDate: data.releaseDate ? data.releaseDate.split('T')[0] : '',
        type: data.type || 'expansion',
      });
      console.log(`✅ [Expansions] Edit form populated for: ${data.name}`);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setLoading(true);
    console.log(`💾 [Expansions] Saving changes for: ${editing}`);

    // Upload poster image if pending
    let posterUrl = formData.posterUrl;
    if (posterUrl?.startsWith('data:') && pendingPosterRef.current) {
      try {
        console.log('📤 [Expansions] Uploading poster image...');
        posterUrl = await uploadContentImage(
          pendingPosterRef.current.base64,
          pendingPosterRef.current.fileName,
          'poster'
        );
        console.log('✅ [Expansions] Poster uploaded:', posterUrl);
      } catch (err: any) {
        console.error('❌ [Expansions] Poster upload failed:', err);
        showMessage('error', t('messages.posterFailed', { error: err.message }));
        setLoading(false);
        return;
      }
    }

    const { error } = await updateExpansion(editing, {
      name: formData.name || undefined,
      description: formData.description || undefined,
      posterUrl: posterUrl?.startsWith('data:') ? undefined : posterUrl || undefined,
      releaseDate: formData.releaseDate || undefined,
      type: formData.type || undefined,
    });

    if (error) {
      console.error('❌ [Expansions] Update failed:', error);
      showMessage('error', t('messages.updateFailed'));
    } else {
      showMessage('success', t('messages.updateSuccess'));
      setEditing(null);
      setFormData(EMPTY_FORM);
      pendingPosterRef.current = null;
      await handleLoad();
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('messages.deleteConfirm'))) return;
    setLoading(true);
    console.log(`🗑️ [Expansions] Deleting: ${id}`);

    const { error } = await deleteExpansion(id);
    if (error) {
      console.error('❌ [Expansions] Delete failed:', error);
      showMessage('error', t('messages.deleteFailed'));
    } else {
      showMessage('success', t('messages.deleteSuccess'));
      await handleLoad();
    }
    setLoading(false);
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    pendingPosterRef.current = null;
    console.log('🚫 [Expansions] Edit cancelled');
  };

  return {
    allowed,
    items,
    loading,
    editing,
    formData,
    message,
    search,
    typeFilter,
    contentSearch,
    contentResults,
    searchingContent,
    setSearch,
    setTypeFilter,
    setFormData,
    setContentSearch,
    handleLoad,
    handleCreate,
    handleStartEdit,
    handleSave,
    handleDelete,
    handleCancelEdit,
    handleSelectContent,
    pendingPosterRef,
  };
}
