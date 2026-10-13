'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  fetchCompany,
  fetchCompanyContents,
  CompanyData,
  CompanyContentData,
} from '@/services/graphql/company';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { CompanyEditDialog, CompanyEditData } from '@/components/molecules/CompanyEditDialog';
import ReportModal from '@/components/organisms/ReportModal';
import { Flag } from 'lucide-react';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import {
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleConsumeLater,
  toggleContinuing,
} from '@/services/userContentService';
import { SortingBar, SortOption, HideOptions } from '@/app/explore/[type]/components/SortingBar';
import { FilterMode } from '@/app/explore/[type]/components/FilterSidebar';

type ItemState = {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
  rating?: number | null;
};

function getInitialStateFromUserStatus(userStatus?: CompanyContentData['userStatus']): ItemState {
  return {
    isConsumed: Boolean(userStatus?.isConsumed),
    isFavorite: Boolean(userStatus?.isFavorite),
    isConsumeLater: Boolean(userStatus?.isConsumeLater),
    isContinuing: Boolean(userStatus?.isContinuing),
    rating: userStatus?.rating ?? null,
  };
}

export type GroupedContent = CompanyContentData;

export function getTabCategory(roleId: number): string {
  if (roleId === 5) return 'developer';
  if (roleId === 3 || roleId === 4) return 'publisher';
  if (roleId === 6) return 'studio';
  return 'other';
}

export default function CompanyPage() {
  const t = useTranslations('CompanyPage');
  const params = useParams();
  const id = params?.id as string;
  const companyId = id;
  const { gridClassName } = useUserPreferences();

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [contents, setContents] = useState<CompanyContentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  usePageTitle(company?.name || null);

  // Sorting, filtering and searching state
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('desc');
  const [hideOptions, setHideOptions] = useState<HideOptions>({
    hideWatched: 'passive',
    hideWatchlist: 'passive',
    hideContinuing: 'passive',
    hideFavorites: 'passive',
    hideAbandoned: 'passive',
    hideInAnyList: 'passive',
  });

  const handleHideChange = (key: keyof HideOptions, value: FilterMode) => {
    setHideOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (newSortBy: SortOption, newOrder: 'asc' | 'desc' | 'none') => {
    setSortBy(newSortBy);
    setSortOrder(newOrder);
  };

  // Card states as map
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

  const { isPrivileged, user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const tabsData = useMemo(() => {
    const categoryMap = new Map<string, GroupedContent[]>();

    const filteredGroup = contents.filter((item) => {
      // Apply filters
      const id = String(item.contentId);
      const state = itemStates[id] || getInitialStateFromUserStatus(item.userStatus);

      // 1.2 Hide Toggles
      if (hideOptions.hideWatched === 'show' && !state.isConsumed) return false;
      if (hideOptions.hideWatched === 'hide' && state.isConsumed) return false;

      if (hideOptions.hideWatchlist === 'show' && !state.isConsumeLater) return false;
      if (hideOptions.hideWatchlist === 'hide' && state.isConsumeLater) return false;

      if (hideOptions.hideContinuing === 'show' && !state.isContinuing) return false;
      if (hideOptions.hideContinuing === 'hide' && state.isContinuing) return false;

      if (hideOptions.hideFavorites === 'show' && !state.isFavorite) return false;
      if (hideOptions.hideFavorites === 'hide' && state.isFavorite) return false;

      return true;
    });

    filteredGroup.forEach((item) => {
      const cat = getTabCategory(item.companyRoleId || 0);
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(item);
    });

    for (const catContents of Array.from(categoryMap.values())) {
      catContents.sort((a, b) => {
        if (sortOrder === 'none') return 0;

        let valA: any = 0;
        let valB: any = 0;

        switch (sortBy) {
          case 'releaseDate':
            valA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            valB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            break;
          case 'popularity':
            valA = a.popularity || 0;
            valB = b.popularity || 0;
            break;
          case 'rating':
            valA = itemStates[String(a.contentId)]?.rating ?? (a.userStatus?.rating || 0);
            valB = itemStates[String(b.contentId)]?.rating ?? (b.userStatus?.rating || 0);
            break;
          case 'title':
            valA = a.contentTitle?.toLowerCase() || '';
            valB = b.contentTitle?.toLowerCase() || '';
            if (sortOrder === 'asc') return valA.localeCompare(valB, 'tr');
            if (sortOrder === 'desc') return valB.localeCompare(valA, 'tr');
            break;
        }

        if (valA > valB) return sortOrder === 'desc' ? -1 : 1;
        if (valA < valB) return sortOrder === 'desc' ? 1 : -1;
        return 0;
      });
    }

    return categoryMap;
  }, [contents, sortBy, sortOrder, hideOptions, itemStates]);

  const availableTabs = useMemo(() => {
    return Array.from(tabsData.keys()).sort((a: string, b: string) => {
      const countA = tabsData.get(a)?.length || 0;
      const countB = tabsData.get(b)?.length || 0;

      if (countA !== countB) {
        return countB - countA;
      }

      const TAB_ORDER = ['developer', 'publisher', 'studio', 'other'];
      const indexA = TAB_ORDER.indexOf(a);
      const indexB = TAB_ORDER.indexOf(b);
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;
      if (orderA === orderB) return a.localeCompare(b);
      return orderA - orderB;
    });
  }, [tabsData]);

  useEffect(() => {
    if (availableTabs.length > 0 && (!activeTab || !availableTabs.includes(activeTab))) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  useEffect(() => {
    async function loadCompanyData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch company details
        const companyData = await fetchCompany(companyId);
        if (!companyData) {
          setError('Company not found');
          console.error(`❌ [CompanyPage] Company not found: ${companyId}`);
          return;
        }

        setCompany(companyData);
        console.log(`✅ [CompanyPage] Company loaded: ${companyData.name}`);

        // Fetch company contents (all roles)
        const contentsData = await fetchCompanyContents(companyId);
        setContents(contentsData);
        console.log(`✅ [CompanyPage] Contents loaded: ${contentsData.length} items`);

        // Initialize card states
        const nextStates: Record<string, ItemState> = {};
        for (const item of contentsData) {
          nextStates[String(item.contentId)] = getInitialStateFromUserStatus(item.userStatus);
        }
        setItemStates(nextStates);
        console.log(`✅ [CompanyPage] Item states initialized: ${Object.keys(nextStates).length}`);
      } catch (err) {
        setError('Error loading data');
        console.error(`❌ [CompanyPage] Error loading company data:`, err);
      } finally {
        setLoading(false);
      }
    }

    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  const handleWatch = async (contentId: string, title: string) => {
    console.log(`👁️ [CompanyPage] Toggle watch for ${title} (${contentId})`);
    try {
      const current = itemStates[contentId];
      if (current?.isConsumed) {
        await unlogContentWatch(contentId);
      } else {
        await logContentWatch(contentId);
      }
      setItemStates((prev) => ({
        ...prev,
        [contentId]: {
          ...(prev[contentId] ?? {
            isConsumed: false,
            isFavorite: false,
            isConsumeLater: false,
            isContinuing: false,
            rating: null,
          }),
          isConsumed: !Boolean(prev[contentId]?.isConsumed),
        },
      }));
      console.log(`✅ [CompanyPage] Watch toggled: ${title}`);
    } catch (err) {
      console.error('❌ [CompanyPage] Error toggling watch:', err);
    }
  };

  const handleToggleFavorite = async (contentId: string, title: string) => {
    console.log(`❤️ [CompanyPage] Toggle favorite for ${title} (${contentId})`);
    try {
      await toggleContentFavorite(contentId);
      setItemStates((prev) => ({
        ...prev,
        [contentId]: {
          ...(prev[contentId] ?? {
            isConsumed: false,
            isFavorite: false,
            isConsumeLater: false,
            isContinuing: false,
            rating: null,
          }),
          isFavorite: !Boolean(prev[contentId]?.isFavorite),
        },
      }));
      console.log(`✅ [CompanyPage] Favorite toggled: ${title}`);
    } catch (err) {
      console.error('❌ [CompanyPage] Error toggling favorite:', err);
    }
  };

  const handleToggleWatchlist = async (contentId: string, title: string) => {
    console.log(`🔖 [CompanyPage] Toggle watchlist for ${title} (${contentId})`);
    try {
      await toggleConsumeLater(contentId);
      setItemStates((prev) => ({
        ...prev,
        [contentId]: {
          ...(prev[contentId] ?? {
            isConsumed: false,
            isFavorite: false,
            isConsumeLater: false,
            isContinuing: false,
            rating: null,
          }),
          isConsumeLater: !Boolean(prev[contentId]?.isConsumeLater),
        },
      }));
      console.log(`✅ [CompanyPage] Watchlist toggled: ${title}`);
    } catch (err) {
      console.error('❌ [CompanyPage] Error toggling watchlist:', err);
    }
  };

  const handleToggleContinuing = async (contentId: string, title: string) => {
    console.log(`▶️ [CompanyPage] Toggle continuing for ${title} (${contentId})`);
    try {
      await toggleContinuing(contentId);
      setItemStates((prev) => ({
        ...prev,
        [contentId]: {
          ...(prev[contentId] ?? {
            isConsumed: false,
            isFavorite: false,
            isConsumeLater: false,
            isContinuing: false,
            rating: null,
          }),
          isContinuing: !Boolean(prev[contentId]?.isContinuing),
        },
      }));
      console.log(`✅ [CompanyPage] Continuing toggled: ${title}`);
    } catch (err) {
      console.error('❌ [CompanyPage] Error toggling continuing:', err);
    }
  };

  const openEditModal = () => {
    if (!company) return;
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedCompany: CompanyEditData) => {
    setCompany((prev) =>
      prev
        ? {
            ...prev,
            name: updatedCompany.name,
            description: updatedCompany.description,
            headquarters: updatedCompany.headquarters,
            logoUrl: updatedCompany.logoUrl,
            website: updatedCompany.website,
            foundingYear: updatedCompany.foundingYear,
          }
        : prev
    );
    setShowEditModal(false);
  };

  // Group contents by companyRoleId
  // Developer: 5 (gamedeveloper)
  // Publisher: 3 (bookpublisher), 4 (gamepublisher)
  // Studio: 6 (moviestudio)
  const developerContents = contents.filter((c) => c.companyRoleId === 5);
  const publisherContents = contents.filter((c) => c.companyRoleId === 3 || c.companyRoleId === 4);
  const studioContents = contents.filter((c) => c.companyRoleId === 6);

  const getContentTypeStr = (
    content: CompanyContentData
  ): 'movie' | 'tv' | 'game' | 'book' | 'music' => {
    if (content.contentType) {
      const v = content.contentType.toLowerCase();
      if (v === 'movie' || v === 'film') return 'movie';
      if (v === 'tv' || v === 'series' || v === 'tv_show' || v === 'tvshow' || v === 'dizi')
        return 'tv';
      if (v === 'game' || v === 'oyun') return 'game';
      if (v === 'book' || v === 'kitap') return 'book';
      if (v === 'music' || v === 'müzik') return 'music';
    }
    // Fallback based on role if contentType is missing
    if (content.companyRoleId === 5) return 'game';
    if (content.companyRoleId === 6) return 'movie';
    return 'movie';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-6xl">🏢</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">{t('notFound')}</h1>
            <p className="text-xl text-white/50 mb-8">{error || t('notFoundDesc')}</p>
            <Link href="/" className="btn-gradient inline-block">
              {t('returnHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header/Hero Section */}
      <div className="bg-zinc-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg bg-[#ffffff] shadow-lg">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt={company.name}
                      fill
                      sizes="192px"
                      unoptimized
                      className="object-contain p-4"
                    />
                  ) : (
                    <span className="text-6xl">🏢</span>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-5xl font-bold">{company.name}</h1>
                  {isPrivileged && (
                    <button
                      onClick={openEditModal}
                      className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 hover: transition-all text-sm font-medium flex items-center gap-2"
                      title={t('editTooltip')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      {t('edit')}
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-red-400 border border-white/10 rounded-xl transition-all text-sm font-medium flex items-center gap-2"
                      title="Bu şirketi raporla"
                    >
                      <Flag className="w-4 h-4" />
                      Raporla
                    </button>
                  )}
                </div>

                {/* Description - moved to top */}
                {company.description && (
                  <p className="text-gray-300 leading-relaxed mb-4 text-sm line-clamp-4">
                    {company.description}
                  </p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 mb-6 text-gray-300">
                  {company.foundingYear && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">{t('founded')}</p>
                      <p className="text-lg">{company.foundingYear}</p>
                    </div>
                  )}
                  {company.headquarters && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">{t('headquarters')}</p>
                      <p className="text-lg">{company.headquarters}</p>
                    </div>
                  )}
                </div>

                {/* Website */}
                {company.website && (
                  <div className="mb-4">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      {t('website')}
                    </a>
                  </div>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-800/50 flex items-center justify-center">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <p className="text-sm">
                      {t('projectCount', {
                        count:
                          Object.keys(itemStates).length > 0
                            ? Object.keys(itemStates).length
                            : company.contentCount,
                      })}
                    </p>
                  </div>

                  {Object.keys(itemStates).length > 0 && (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm">
                            {t('consumedStats', {
                              consumed: Object.values(itemStates).filter(
                                (state) => state.isConsumed
                              ).length,
                              total: Object.keys(itemStates).length,
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 w-24 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.round((Object.values(itemStates).filter((state) => state.isConsumed).length / Object.keys(itemStates).length) * 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-violet-400">
                              {Math.round(
                                (Object.values(itemStates).filter((state) => state.isConsumed)
                                  .length /
                                  Object.keys(itemStates).length) *
                                  100
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row gap-4 w-full md:items-center justify-center">
          <div className="flex-shrink-0">
            <SortingBar
              onSortChange={handleSortChange}
              currentSort={sortBy}
              currentOrder={sortOrder}
              hideOptions={hideOptions}
              onHideChange={handleHideChange}
            />
          </div>
        </div>

        <div className="flex border-b border-white/10 mb-8 pt-4 overflow-x-auto scroller-hide gap-2 sm:gap-4 pb-2">
          {availableTabs.map((tab: string) => {
            const items = tabsData.get(tab) || [];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-6 py-2 sm:py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                {t(`roles.${tab}`)} ({items.length})
              </button>
            );
          })}
        </div>

        {/* Content Grid - Sadece activeTab seçiliyse göster */}
        {activeTab && tabsData.has(activeTab) && (
          <div className={`grid ${gridClassName} gap-4`}>
            {tabsData.get(activeTab)!.map((content: GroupedContent) => {
              const cid = String(content.contentId);
              const title = content.contentTitle;
              const state = itemStates[cid] ?? getInitialStateFromUserStatus(content.userStatus);

              return (
                <div key={content.contentId} className="flex flex-col">
                  <InteractivePoster
                    content={{
                      id: content.contentId,
                      title: content.contentTitle,
                      posterUrl: content.posterUrl,
                      releaseDate: content.releaseDate,
                    }}
                    contentType={getContentTypeStr(content)}
                    isConsumed={state.isConsumed}
                    isFavorite={state.isFavorite}
                    isConsumeLater={state.isConsumeLater}
                    isContinuing={state.isContinuing}
                    rating={state.rating}
                    onWatch={() => handleWatch(cid, title)}
                    onToggleFavorite={() => handleToggleFavorite(cid, title)}
                    onToggleWatchlist={() => handleToggleWatchlist(cid, title)}
                    onToggleContinuing={() => handleToggleContinuing(cid, title)}
                    showActions={true}
                    context="explore"
                    useNextImage={false}
                  />
                </div>
              );
            })}
          </div>
        )}

        {availableTabs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">{t('noContent')}</p>
          </div>
        )}
      </div>

      {showEditModal && company && (
        <CompanyEditDialog
          company={company}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      )}

      {company && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetId={company.id}
          targetType="COMPANY"
          targetTitle={company.name}
        />
      )}
    </div>
  );
}
