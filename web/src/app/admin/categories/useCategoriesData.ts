'use client';

/**
 * Custom hook for categories page state & CRUD operations.
 * Single Responsibility: data fetching, mutations, and state management.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCurrentUserProfile } from '@/services/database/userService';
import { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { uploadContentImage } from '@/services/adminService';
import {
  // Genres
  listGenres,
  createGenre,
  updateGenre,
  deleteGenre,
  // Persons
  listPersons,
  createPerson,
  updatePerson,
  deletePerson,
  // Languages
  listLanguages,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  // Game Modes
  listGameModes,
  createGameMode,
  updateGameMode,
  deleteGameMode,
  listGameEngines,
  createGameEngine,
  updateGameEngine,
  deleteGameEngine,
  // Perspectives
  listPerspectives,
  createPerspective,
  updatePerspective,
  deletePerspective,
  // Platforms
  listPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  // Themes
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  // Moods
  listMoods,
  createMood,
  updateMood,
  deleteMood,
  // Age Ratings
  listAgeRatings,
  createAgeRating,
  updateAgeRating,
  deleteAgeRating,
  // Person Roles
  listPersonRoles,
  createPersonRole,
  updatePersonRole,
  deletePersonRole,
  // Series
  listSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  // Company Roles
  listCompanyRoles,
  createCompanyRole,
  updateCompanyRole,
  deleteCompanyRole,
  // Companies
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  // Category count
  getCategoryCount,
} from '@/services/adminService';

import {
  type TabType,
  type EditingItem,
  type CategoryItem,
  type CategoryMessage,
  TAB_CONFIG,
} from './categoriesTypes';

export function useCategoriesData() {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('genres');
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [formData, setFormData] = useState<EditingItem>({ name: '' });
  const [message, setMessage] = useState<CategoryMessage | null>(null);
  const [genreContentTypeFilter, setGenreContentTypeFilter] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const pendingProfileRef = useRef<PendingImageUpload | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedAccess = useRef(false);

  const ADMIN_PAGE_SIZE = 50;

  // ── Helpers ──────────────────────────────────────────────

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    console.log(`${type === 'success' ? '✅' : '❌'} [Categories] Message: ${text}`);
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // Helper: get list function for a tab
  const getListFn = useCallback((tab: TabType) => {
    switch (tab) {
      case 'genres':
        return listGenres;
      case 'persons':
        return listPersons;
      case 'languages':
        return listLanguages;
      case 'gameModes':
        return listGameModes;
      case 'gameEngines':
        return listGameEngines;
      case 'perspectives':
        return listPerspectives;
      case 'platforms':
        return listPlatforms;
      case 'themes':
        return listThemes;
      case 'moods':
        return listMoods;
      case 'ageRatings':
        return listAgeRatings;
      case 'personRoles':
        return listPersonRoles;
      case 'companyRoles':
        return listCompanyRoles;
      case 'series':
        return listSeries;
      case 'companies':
        return listCompanies;
      default:
        return null;
    }
  }, []);

  // ── Load items (initial + search) ────────────────────────

  const loadItems = useCallback(
    async (
      tab: TabType,
      options?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ) => {
      setLoading(true);
      try {
        const search = options?.search;
        const currentSortBy = options?.sortBy ?? sortBy;
        const currentSortOrder = options?.sortOrder ?? sortOrder;
        console.log(
          `📚 [Categories] Loading ${tab}... (search=${search || 'none'}, sort=${currentSortBy} ${currentSortOrder})`
        );
        const listFn = getListFn(tab);
        if (!listFn) {
          setItems([]);
          setHasMore(false);
          setTotalCount(0);
          return;
        }

        // Fetch items and total count in parallel
        const [result, countResult] = await Promise.all([
          listFn({
            limit: ADMIN_PAGE_SIZE,
            offset: 0,
            search,
            sortBy: currentSortBy,
            sortOrder: currentSortOrder,
          }),
          getCategoryCount(tab, search),
        ]);
        setItems(result.data || []);
        setHasMore((result.data || []).length >= ADMIN_PAGE_SIZE);
        setTotalCount(countResult.data || 0);
        console.log(
          `✅ [Categories] Loaded ${result.data?.length || 0} ${tab} items (total: ${countResult.data || 0})`
        );
      } catch (error) {
        console.error('❌ [Categories] Error loading:', error);
        showMessage('error', 'Yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    },
    [showMessage, getListFn, sortBy, sortOrder]
  );

  // ── Load more (infinite scroll) ──────────────────────────

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const listFn = getListFn(activeTab);
      if (!listFn) return;

      const result = await listFn({
        limit: ADMIN_PAGE_SIZE,
        offset: items.length,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
      });

      const newItems = result.data || [];
      if (newItems.length > 0) {
        const existingIds = new Set(items.map((i) => i.id));
        const uniqueNew = newItems.filter((i: CategoryItem) => !existingIds.has(i.id));
        setItems((prev) => [...prev, ...uniqueNew]);
        console.log(
          `📜 [Categories] Loaded ${uniqueNew.length} more (total: ${items.length + uniqueNew.length})`
        );
      }
      setHasMore(newItems.length >= ADMIN_PAGE_SIZE);
    } catch (error) {
      console.error('❌ [Categories] Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, activeTab, items, searchQuery, sortBy, sortOrder, getListFn]);

  // ── Search handler (debounced) ───────────────────────────

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

      if (!query.trim()) {
        loadItems(activeTab);
        return;
      }

      if (query.trim().length >= 2) {
        searchDebounceRef.current = setTimeout(() => {
          loadItems(activeTab, { search: query.trim() });
        }, 300);
      }
    },
    [activeTab, loadItems]
  );

  // ── Access check ─────────────────────────────────────────

  useEffect(() => {
    if (hasCheckedAccess.current) return;

    const checkAccess = async () => {
      hasCheckedAccess.current = true;
      try {
        console.log('🔐 [Categories] Checking admin access...');
        const result = await getCurrentUserProfile();
        if (result?.data?.isAdmin) {
          console.log('✅ [Categories] Admin access granted');
          setAllowed(true);
          loadItems('genres');
        } else {
          console.log('⛔ [Categories] Access denied — not admin');
          setAllowed(false);
        }
      } catch (error) {
        console.error('❌ [Categories] Access check error:', error);
        setAllowed(false);
      }
    };

    checkAccess();
  }, [loadItems]);

  // ── Tab change ───────────────────────────────────────────

  const handleTabChange = useCallback(
    (tab: TabType) => {
      console.log(`🔄 [Categories] Switching to tab: ${tab}`);
      setActiveTab(tab);
      setEditingId(null);
      setFormData({ name: '' });
      setSearchQuery('');
      setSortBy('name');
      setSortOrder('asc');
      if (tab === 'genres') {
        setGenreContentTypeFilter(null);
      }
      loadItems(tab, { sortBy: 'name', sortOrder: 'asc' });
    },
    [loadItems]
  );

  // ── Sort change ──────────────────────────────────────────

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      loadItems(activeTab, {
        search: searchQuery.trim() || undefined,
        sortBy: newSortBy,
        sortOrder: newSortOrder,
      });
    },
    [activeTab, loadItems, searchQuery]
  );

  // ── Add / Edit ───────────────────────────────────────────

  const handleAdd = useCallback(() => {
    console.log('➕ [Categories] Preparing new item form');
    setEditingId(null);
    setFormData(activeTab === 'personRoles' ? { label: '' } : { name: '' });
  }, [activeTab]);

  const handleEdit = useCallback((item: CategoryItem) => {
    console.log(`✏️ [Categories] Editing item id=${item.id}`);
    setEditingId(item.id);
    setFormData({ ...item });
  }, []);

  // ── Save ─────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const nameField = TAB_CONFIG[activeTab].nameField;
    const value = formData[nameField]?.toString().trim();

    if (!value) {
      showMessage('error', 'İsim alanı gerekli');
      return;
    }

    setLoading(true);
    try {
      let result: { data?: any; error?: any };

      // Handle profile image upload for persons
      let profileUrl = formData.profileUrl;
      if (activeTab === 'persons' && profileUrl?.startsWith('data:') && pendingProfileRef.current) {
        try {
          console.log('📤 [Categories] Uploading person profile image...');
          profileUrl = await uploadContentImage(
            pendingProfileRef.current.base64,
            pendingProfileRef.current.fileName,
            'profile'
          );
          console.log('✅ [Categories] Profile image uploaded:', profileUrl);
        } catch (err: any) {
          console.error('❌ [Categories] Profile upload failed:', err);
          showMessage('error', 'Profil resmi yüklenemedi: ' + err.message);
          setLoading(false);
          return;
        }
      }

      // Handle logo upload for companies
      let logoUrl = formData.logoUrl;
      if (activeTab === 'companies' && logoUrl?.startsWith('data:') && pendingProfileRef.current) {
        try {
          console.log('📤 [Categories] Uploading company logo image...');
          logoUrl = await uploadContentImage(
            pendingProfileRef.current.base64,
            pendingProfileRef.current.fileName,
            'company'
          );
          console.log('✅ [Categories] Company logo uploaded:', logoUrl);
        } catch (err: any) {
          console.error('❌ [Categories] Company logo upload failed:', err);
          showMessage('error', 'Şirket logosu yüklenemedi: ' + err.message);
          setLoading(false);
          return;
        }
      }

      const personPayload = {
        name: value,
        biography: formData.biography,
        birthDate: formData.birthDate,
        deathDate: formData.deathDate,
        gender: formData.gender,
        profileUrl: profileUrl?.startsWith('data:') ? undefined : profileUrl,
        placeOfBirth: formData.placeOfBirth,
      };

      const companyPayload = {
        name: value,
        description: formData.description,
        headquarters: formData.headquarters,
        website: formData.website,
        foundingYear: formData.foundingYear ? parseInt(formData.foundingYear) : undefined,
        logoUrl: logoUrl?.startsWith('data:') ? undefined : logoUrl,
        defaultRoleIds: formData.defaultRoleIds || [],
      };

      switch (activeTab) {
        case 'genres':
          result = editingId
            ? await updateGenre(editingId as number, {
                name: value,
                contentTypeId: formData.contentTypeId ?? undefined,
              })
            : await createGenre({
                name: value,
                contentTypeId: formData.contentTypeId ?? undefined,
              });
          break;
        case 'persons':
          result = editingId
            ? await updatePerson(editingId as string, personPayload)
            : await createPerson(personPayload);
          break;
        case 'languages':
          result = editingId
            ? await updateLanguage(editingId as number, { name: value })
            : await createLanguage({ name: value });
          break;
        case 'gameModes':
          result = editingId
            ? await updateGameMode(editingId as number, { name: value })
            : await createGameMode({ name: value });
          break;
        case 'gameEngines':
          result = editingId
            ? await updateGameEngine(editingId as number, { name: value })
            : await createGameEngine({ name: value });
          break;
        case 'perspectives':
          result = editingId
            ? await updatePerspective(editingId as number, { name: value })
            : await createPerspective({ name: value });
          break;
        case 'platforms':
          result = editingId
            ? await updatePlatform(editingId as number, { name: value })
            : await createPlatform({ name: value });
          break;
        case 'themes':
          result = editingId
            ? await updateTheme(editingId as number, { name: value })
            : await createTheme({ name: value });
          break;
        case 'moods':
          result = editingId
            ? await updateMood(editingId as number, { name: value })
            : await createMood({ name: value });
          break;
        case 'ageRatings':
          result = editingId
            ? await updateAgeRating(editingId as number, { name: value })
            : await createAgeRating({ name: value });
          break;
        case 'personRoles':
          result = editingId
            ? await updatePersonRole(editingId as number, {
                label: value,
                contentTypeId: formData.contentTypeId ?? undefined,
              })
            : await createPersonRole({
                label: value,
                contentTypeId: formData.contentTypeId ?? undefined,
              });
          break;
        case 'companyRoles':
          result = editingId
            ? await updateCompanyRole(editingId as number, {
                name: value,
                contentTypeId: formData.contentTypeId ?? undefined,
              })
            : await createCompanyRole({
                name: value,
                contentTypeId: formData.contentTypeId ?? undefined,
              });
          break;
        case 'series':
          result = editingId
            ? await updateSeries(editingId as string, { name: value })
            : await createSeries({ name: value });
          break;
        case 'companies':
          result = editingId
            ? await updateCompany(editingId as string, companyPayload)
            : await createCompany(companyPayload);
          break;
        default:
          result = { error: 'Unknown tab' };
      }

      if (!result.error) {
        console.log(`✅ [Categories] ${editingId ? 'Updated' : 'Created'} ${activeTab} item`);
        showMessage('success', editingId ? 'Güncellendi' : 'Eklendi');
        loadItems(activeTab);
        setEditingId(null);
        setFormData(activeTab === 'personRoles' ? { label: '' } : { name: '' });
        pendingProfileRef.current = null;
      } else {
        console.error('❌ [Categories] Save returned error:', result.error);
        showMessage('error', 'İşlem başarısız');
      }
    } catch (error) {
      console.error('❌ [Categories] Error saving:', error);
      showMessage('error', 'Kaydetme hatası');
    } finally {
      setLoading(false);
    }
  }, [activeTab, formData, editingId, showMessage, loadItems]);

  // ── Delete ───────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: number | string) => {
      if (!window.confirm('Silmek istediğinize emin misiniz?')) return;

      setLoading(true);
      try {
        console.log(`🗑️ [Categories] Deleting ${activeTab} item id=${id}`);
        let result: { error?: any };

        switch (activeTab) {
          case 'genres':
            result = await deleteGenre(id as number);
            break;
          case 'persons':
            result = await deletePerson(id as string);
            break;
          case 'languages':
            result = await deleteLanguage(id as number);
            break;
          case 'gameModes':
            result = await deleteGameMode(id as number);
            break;
          case 'gameEngines':
            result = await deleteGameEngine(id as number);
            break;
          case 'perspectives':
            result = await deletePerspective(id as number);
            break;
          case 'platforms':
            result = await deletePlatform(id as number);
            break;
          case 'themes':
            result = await deleteTheme(id as number);
            break;
          case 'moods':
            result = await deleteMood(id as number);
            break;
          case 'ageRatings':
            result = await deleteAgeRating(id as number);
            break;
          case 'personRoles':
            result = await deletePersonRole(id as number);
            break;
          case 'companyRoles':
            result = await deleteCompanyRole(id as number);
            break;
          case 'series':
            result = await deleteSeries(id as string);
            break;
          case 'companies':
            result = await deleteCompany(id as string);
            break;
          default:
            result = { error: 'Unknown tab' };
        }

        if (!result.error) {
          console.log(`✅ [Categories] Deleted ${activeTab} item id=${id}`);
          showMessage('success', 'Silindi');
          loadItems(activeTab);
        } else {
          console.error('❌ [Categories] Delete returned error:', result.error);
          showMessage('error', 'Silme başarısız');
        }
      } catch (error) {
        console.error('❌ [Categories] Error deleting:', error);
        showMessage('error', 'Silme hatası');
      } finally {
        setLoading(false);
      }
    },
    [activeTab, showMessage, loadItems]
  );

  // ── Cancel edit ──────────────────────────────────────────

  const handleCancelEdit = useCallback(() => {
    console.log('🔄 [Categories] Cancelling edit');
    setEditingId(null);
    setFormData(activeTab === 'personRoles' ? { label: '' } : { name: '' });
    pendingProfileRef.current = null;
  }, [activeTab]);

  // ── Item display name ────────────────────────────────────

  const getItemDisplayName = useCallback((item: CategoryItem): string => {
    return item.label || item.name || '';
  }, []);

  return {
    // State
    allowed,
    activeTab,
    items,
    loading,
    editingId,
    formData,
    message,
    genreContentTypeFilter,
    pendingProfileRef,
    hasMore,
    isLoadingMore,
    searchQuery,
    totalCount,
    sortBy,
    sortOrder,
    // Setters
    setFormData,
    setGenreContentTypeFilter,
    // Handlers
    handleTabChange,
    handleAdd,
    handleEdit,
    handleSave,
    handleDelete,
    handleCancelEdit,
    getItemDisplayName,
    loadMore,
    handleSearch,
    handleSortChange,
  };
}
