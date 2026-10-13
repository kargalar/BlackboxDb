'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  fetchPerson,
  fetchPersonCastContent,
  fetchPersonCrewContent,
  PersonData,
  PersonContentData,
  toggleFavoritePerson,
} from '@/services/graphql/person';
import { useAuth } from '@/contexts/AuthContext';
import {
  NewPersonDialog,
  PersonData as PersonEditData,
} from '@/components/molecules/NewPersonDialog';
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
import { SearchBar } from '@/app/explore/[type]/components/SearchBar';

type ContentType = 'movie' | 'tv' | 'game' | 'book' | 'music';

type ItemState = {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
  rating?: number | null;
};

export type GroupedContent = PersonContentData & {
  roles: string[];
  characters: string[];
};

/**
 * Groups content by contentId to consolidate duplicate entries.
 * When a person has multiple roles in the same content, this function
 * aggregates all roles and characters into a single entry.
 */
export function groupContentByContentId(content: PersonContentData[]): GroupedContent[] {
  const grouped = new Map<string, GroupedContent>();

  for (const item of content) {
    if (!grouped.has(item.contentId)) {
      // First occurrence - create new entry
      grouped.set(item.contentId, {
        ...item,
        roles: [item.role],
        characters: item.character ? [item.character] : [],
      });
    } else {
      // Duplicate contentId - aggregate roles and characters
      const existing = grouped.get(item.contentId)!;

      // Add role if not already present (deduplicate)
      if (item.role && !existing.roles.includes(item.role)) {
        existing.roles.push(item.role);
      }

      // Add character if not already present (deduplicate)
      if (item.character && !existing.characters.includes(item.character)) {
        existing.characters.push(item.character);
      }
    }
  }

  return Array.from(grouped.values());
}

/**
 * Translates role names to Turkish and categorizes them.
 * Returns a formatted string with all roles.
 */
export function formatRoles(roles: string[]): string {
  const translations: Record<string, string> = {
    actor: 'Oyuncu',
    voice_actor: 'Seslendirme',
    voice: 'Seslendirme',
    director: 'Yönetmen',
    writer: 'Senarist',
    cinematographer: 'Görüntü Yönetmeni',
    composer: 'Müzik',
    producer: 'Yapımcı',
    editor: 'Kurgucu',
    crew: 'Ekip',
  };

  const translatedRoles = roles.map((role) => {
    const roleLower = role.toLowerCase();
    return translations[roleLower] || role;
  });

  return translatedRoles.join(', ');
}

export function getTabCategory(role: string): string {
  const r = role.toLowerCase().trim();

  if (r === 'actor' || r.includes('voice') || r === 'voice actor' || r === 'voice_actor')
    return 'Oyuncu';
  if (r === 'director') return 'Yönetmen';
  if (r.includes('producer')) return 'Yapımcı';
  if (r.includes('editor')) return 'Kurgucu';
  if (
    r.includes('writer') ||
    r.includes('screenplay') ||
    r.includes('author') ||
    r.includes('story') ||
    r === 'novel'
  )
    return 'Senarist';
  if (r.includes('camera') || r.includes('cinematographer') || r.includes('photography'))
    return 'Kamera Ekibi';
  if (r.includes('composer') || r.includes('music')) return 'Müzik';

  return 'Ekip';
}

function normalizeContentType(input: string): ContentType {
  const v = input.trim().toLowerCase();
  if (v === 'movie' || v === 'film') return 'movie';
  if (v === 'tv' || v === 'series' || v === 'tv_show' || v === 'tvshow' || v === 'dizi')
    return 'tv';
  if (v === 'game' || v === 'oyun') return 'game';
  if (v === 'book' || v === 'kitap') return 'book';
  if (v === 'music' || v === 'müzik') return 'music';
  console.warn(`⚠️ [PersonPage] Unknown contentType "${input}", defaulting to movie`);
  return 'movie';
}

function getInitialStateFromUserStatus(userStatus?: PersonContentData['userStatus']): ItemState {
  return {
    isConsumed: Boolean(userStatus?.isConsumed),
    isFavorite: Boolean(userStatus?.isFavorite),
    isConsumeLater: Boolean(userStatus?.isConsumeLater),
    isContinuing: Boolean(userStatus?.isContinuing),
    rating: userStatus?.rating ?? null,
  };
}

export default function PersonPage() {
  const params = useParams();
  const id = params?.id as string;
  const personId = id;

  const [person, setPerson] = useState<PersonData | null>(null);
  const [castContent, setCastContent] = useState<PersonContentData[]>([]);
  const [crewContent, setCrewContent] = useState<PersonContentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  usePageTitle(person?.name || null);

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

  // Explore ile aynı: kart state'lerini map olarak tut
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

  // Admin edit functionality
  const { user, isPrivileged } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFavoritePersonPending, setIsFavoritePersonPending] = useState(false);

  const tabsData = useMemo(() => {
    const combined = [...castContent, ...crewContent];
    const grouped = groupContentByContentId(combined);

    // 1. FILTERING
    const filteredGroup = grouped.filter((item) => {
      // Apply filtersing(item.contentId);
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

    const categoryMap = new Map<string, GroupedContent[]>();

    filteredGroup.forEach((item) => {
      const categories = new Set(item.roles.map((r) => getTabCategory(r)));
      categories.forEach((cat) => {
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(item);
      });
    });

    // Sort contents within each category
    for (const contents of Array.from(categoryMap.values())) {
      contents.sort((a, b) => {
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
          case 'rating': // system average rating? The interface does not include this right now, so we fall back to user rating
            valA = itemStates[String(a.contentId)]?.rating ?? (a.userStatus?.rating || 0);
            valB = itemStates[String(b.contentId)]?.rating ?? (b.userStatus?.rating || 0);
            break;
          case 'title':
            valA = a.contentTitle?.toLowerCase() || '';
            valB = b.contentTitle?.toLowerCase() || '';
            // For strings, reverse logic because string compare is different
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
  }, [castContent, crewContent, sortBy, sortOrder, hideOptions, itemStates]);

  const availableTabs = useMemo(() => {
    return Array.from(tabsData.keys()).sort((a, b) => {
      const TAB_ORDER = [
        'Oyuncu',
        'Yönetmen',
        'Senarist',
        'Yapımcı',
        'Kurgucu',
        'Kamera Ekibi',
        'Müzik',
        'Ekip',
      ];
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
    async function loadPersonData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch person details
        const personData = await fetchPerson(personId);
        if (!personData) {
          setError('Kişi bulunamadı');
          console.error(`❌ [PersonPage] Person not found: ${personId}`);
          return;
        }

        setPerson(personData);
        console.log(`✅ [PersonPage] Person loaded: ${personData.name}`);

        let cast: PersonContentData[] = [];
        let crew: PersonContentData[] = [];

        // Fetch cast content
        if (personData.roles?.some((r) => r.toLowerCase() === 'actor')) {
          cast = await fetchPersonCastContent(personId);
          setCastContent(cast);
          console.log(`✅ [PersonPage] Cast content loaded: ${cast.length} items`);
        }

        // Fetch crew content
        const hasCrewRole = personData.roles?.some((r) => r.toLowerCase() !== 'actor');
        if (hasCrewRole) {
          crew = await fetchPersonCrewContent(personId);
          setCrewContent(crew);
          console.log(`✅ [PersonPage] Crew content loaded: ${crew.length} items`);
        }

        // Kart state'lerini initialize et (Explore ile aynı davranış)
        const nextStates: Record<string, ItemState> = {};
        for (const item of [...cast, ...crew]) {
          nextStates[String(item.contentId)] = getInitialStateFromUserStatus(item.userStatus);
        }
        setItemStates(nextStates);
        console.log(`✅ [PersonPage] Item states initialized: ${Object.keys(nextStates).length}`);
      } catch (err) {
        setError('Veri yüklenirken hata oluştu');
        console.error(`❌ [PersonPage] Error loading person data:`, err);
      } finally {
        setLoading(false);
      }
    }

    if (personId) {
      loadPersonData();
    }
  }, [personId]);

  const handleWatch = async (contentId: string, title: string) => {
    console.log(`👁️ [PersonPage] Toggle watch for ${title} (${contentId})`);
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
      console.log(`✅ [PersonPage] Watch toggled: ${title}`);
    } catch (err) {
      console.error('❌ [PersonPage] Error toggling watch:', err);
    }
  };

  const handleToggleFavorite = async (contentId: string, title: string) => {
    console.log(`❤️ [PersonPage] Toggle favorite for ${title} (${contentId})`);
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
      console.log(`✅ [PersonPage] Favorite toggled: ${title}`);
    } catch (err) {
      console.error('❌ [PersonPage] Error toggling favorite:', err);
    }
  };

  const handleToggleWatchlist = async (contentId: string, title: string) => {
    console.log(`🔖 [PersonPage] Toggle watchlist for ${title} (${contentId})`);
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
      console.log(`✅ [PersonPage] Watchlist toggled: ${title}`);
    } catch (err) {
      console.error('❌ [PersonPage] Error toggling watchlist:', err);
    }
  };

  const handleToggleContinuing = async (contentId: string, title: string) => {
    console.log(`▶️ [PersonPage] Toggle continuing for ${title} (${contentId})`);
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
      console.log(`✅ [PersonPage] Continuing toggled: ${title}`);
    } catch (err) {
      console.error('❌ [PersonPage] Error toggling continuing:', err);
    }
  };

  // Open edit modal
  const openEditModal = () => {
    if (!person) return;
    setShowEditModal(true);
  };

  // Handle save from edit dialog
  const handleSaveEdit = (updatedPerson: PersonEditData) => {
    setPerson((prev) =>
      prev
        ? {
            ...prev,
            name: updatedPerson.name,
            biography: updatedPerson.biography || prev.biography,
            birthDate: updatedPerson.birthDate || prev.birthDate,
            deathDate: updatedPerson.deathDate || prev.deathDate,
            gender: updatedPerson.gender || prev.gender,
            placeOfBirth: updatedPerson.placeOfBirth || prev.placeOfBirth,
            profileUrl: updatedPerson.profileUrl || prev.profileUrl,
          }
        : prev
    );
    setShowEditModal(false);
  };

  const handleToggleFavoritePerson = async () => {
    if (!person || !user || isFavoritePersonPending) return;

    try {
      setIsFavoritePersonPending(true);
      const nextState = await toggleFavoritePerson(person.id);
      setPerson((prev) => (prev ? { ...prev, isFavorite: nextState } : prev));
    } catch (error) {
      console.error('❌ [PersonPage] Error toggling favorite person:', error);
    } finally {
      setIsFavoritePersonPending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Kişi bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8 flex justify-center">
              <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Kişi Bulunamadı</h1>
            <p className="text-xl text-white/50 mb-8">{error || 'Beklenmedik bir hata oluştu'}</p>
            <Link href="/" className="btn-gradient inline-block">
              Ana Sayfaya Dön
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
              {/* Profile Image */}
              <div className="flex-shrink-0">
                <div className="relative w-48 h-64 bg-gray-700 rounded-lg overflow-hidden">
                  {person.profileUrl ? (
                    <div
                      className="w-full h-full cursor-pointer group"
                      onClick={() => setIsPosterModalOpen(true)}
                    >
                      <Image
                        src={person.profileUrl}
                        alt={person.name}
                        fill
                        sizes="192px"
                        unoptimized
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-24 h-24 text-gray-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Person Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-5xl font-bold">{person.name}</h1>
                  {/* Admin Edit Button */}
                  {isPrivileged && (
                    <button
                      onClick={openEditModal}
                      className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 hover: transition-all text-sm font-medium flex items-center gap-2"
                      title="Kişi bilgilerini düzenle"
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
                      Düzenle
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={handleToggleFavoritePerson}
                      disabled={isFavoritePersonPending}
                      className={`px-4 py-2 rounded-xl transition-all text-sm font-medium flex items-center gap-2 ${
                        person.isFavorite
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      }`}
                      title="Favori oyunculara ekle"
                    >
                      <span>{person.isFavorite ? '★' : '☆'}</span>
                      {person.isFavorite ? 'Favorilerde' : 'Favori Oyuncu'}
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-red-400 border border-white/10 rounded-xl transition-all text-sm font-medium flex items-center gap-2"
                      title="Bu kişiyi raporla"
                    >
                      <Flag className="w-4 h-4" />
                      Raporla
                    </button>
                  )}
                </div>

                {/* Biography - moved to top */}
                {person.biography && (
                  <p className="text-gray-300 leading-relaxed mb-4 text-sm line-clamp-4">
                    {person.biography}
                  </p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 mb-6 text-gray-300">
                  {person.birthDate && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Doğum Tarihi</p>
                      <p className="text-lg">
                        {new Date(person.birthDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  )}
                  {person.placeOfBirth && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Doğum Yeri</p>
                      <p className="text-lg">{person.placeOfBirth}</p>
                    </div>
                  )}
                  {person.gender && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Cinsiyet</p>
                      <p className="text-lg capitalize">{person.gender}</p>
                    </div>
                  )}
                </div>

                {/* Roles */}
                {person.roles && person.roles.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 uppercase mb-2">Roller</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(person.roles.map((r) => formatRoles([r])))).map(
                        (role) => (
                          <span
                            key={role}
                            className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 text-violet-300 rounded-full text-sm"
                          >
                            {role}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {person.roleCount && (
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
                        <strong className="text-white text-base">{person.roleCount}</strong> projede
                        yer almıştır
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
                              <strong className="text-white text-base">
                                {
                                  Object.values(itemStates).filter((state) => state.isConsumed)
                                    .length
                                }
                              </strong>
                              <span className="mx-1">/</span>
                              {Object.keys(itemStates).length} tüketildi
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
                                %
                                {Math.round(
                                  (Object.values(itemStates).filter((state) => state.isConsumed)
                                    .length /
                                    Object.keys(itemStates).length) *
                                    100
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
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
          {availableTabs.map((tab) => {
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
                {tab} ({items.length})
              </button>
            );
          })}
        </div>

        {/* Content Grid - Sadece activeTab seçiliyse göster */}
        {activeTab && tabsData.has(activeTab) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tabsData.get(activeTab)!.map((content) => {
              // Format roles for display
              const roleLabel = formatRoles(content.roles);

              return (
                <div key={content.contentId} className="flex flex-col">
                  {(() => {
                    const id = String(content.contentId);
                    const title = content.contentTitle;
                    const state =
                      itemStates[id] ?? getInitialStateFromUserStatus(content.userStatus);
                    const contentType = normalizeContentType(content.contentType);

                    return (
                      <InteractivePoster
                        content={{
                          id: content.contentId,
                          title: content.contentTitle,
                          posterUrl: content.posterUrl,
                          releaseDate: content.releaseDate,
                        }}
                        contentType={contentType}
                        isConsumed={state.isConsumed}
                        isFavorite={state.isFavorite}
                        isConsumeLater={state.isConsumeLater}
                        isContinuing={state.isContinuing}
                        rating={state.rating}
                        onWatch={() => handleWatch(id, title)}
                        onToggleFavorite={() => handleToggleFavorite(id, title)}
                        onToggleWatchlist={() => handleToggleWatchlist(id, title)}
                        onToggleContinuing={() => handleToggleContinuing(id, title)}
                        showActions={true}
                        context="explore"
                        useNextImage={false}
                      />
                    );
                  })()}
                  {/* Rol ve karakter bilgisi */}
                  <div className="mt-1">
                    {content.characters.length > 0 && (
                      <p className="text-xs text-white/70 truncate">
                        &quot;{content.characters.join('", "')}&quot;
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{roleLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {availableTabs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">Bu kişinin herhangi bir rolü bulunamadı</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && person && (
        <NewPersonDialog
          person={{
            id: person.id,
            name: person.name,
            biography: person.biography,
            birthDate: person.birthDate,
            deathDate: person.deathDate,
            placeOfBirth: person.placeOfBirth,
            profileUrl: person.profileUrl,
          }}
          mode="edit"
          showCharacterField={false}
          apiMode="api"
          onClose={() => setShowEditModal(false)}
          onSave={(updatedPerson) => handleSaveEdit(updatedPerson)}
        />
      )}

      {/* Report Modal */}
      {person && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          targetId={person.id}
          targetType="PERSON"
          targetTitle={person.name}
        />
      )}

      {/* Poster Modal */}
      {isPosterModalOpen && person.profileUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setIsPosterModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <Image
              src={person.profileUrl}
              alt={person.name}
              width={1200}
              height={1800}
              unoptimized
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
