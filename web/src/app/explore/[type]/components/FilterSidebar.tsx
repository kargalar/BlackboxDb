'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { apolloClient } from '@/lib/apollo-client';
import {
  LIST_GENRES,
  LIST_ACTORS,
  LIST_DIRECTORS,
  LIST_THEMES,
  LIST_MOODS,
  LIST_AGE_RATINGS,
  LIST_LANGUAGES,
  LIST_PLATFORMS,
  LIST_COMPANIES,
  LIST_GAME_MODES,
  LIST_PERSPECTIVES,
} from '@/services/graphql/admin';
import { Filter, X, Pin, PinOff, ChevronLeft } from 'lucide-react';
import { GenreFilter } from './filters/GenreFilter';
import { ThemeFilter } from './filters/ThemeFilter';
import { MoodFilter } from './filters/MoodFilter';
import { AgeRatingFilter } from './filters/AgeRatingFilter';
import { PlatformFilter } from './filters/PlatformFilter';
import { RatingFilter } from './filters/RatingFilter';
import { YearFilter } from './filters/YearFilter';
import { DurationFilter } from './filters/DurationFilter';
import { GameModeFilter } from './filters/GameModeFilter';
import { PerspectiveFilter } from './filters/PerspectiveFilter';
import { LanguageFilter } from './filters/LanguageFilter';
import { PersonFilter } from './filters/PersonFilter';
import { CompanyFilter } from './filters/CompanyFilter';

interface PlatformData {
  id: number;
  name: string;
}

interface GenreData {
  id: number;
  name: string;
}

interface PersonData {
  id: number;
  name: string;
}

interface LanguageData {
  id: number;
  name: string;
}

// Filter counts for showing item counts next to each filter option
export interface FilterCounts {
  genres: Record<string, number>;
  themes: Record<string, number>;
  moods: Record<string, number>;
  ageRatings: Record<string, number>;
  languages: Record<string, number>;
  publicationLanguages: Record<string, number>;
  platforms: Record<string, number>;
  actors: Record<number | string, number>;
  directors: Record<number | string, number>;
  companies: Record<number | string, number>;
  gameModes: Record<string, number>;
  perspectives: Record<string, number>;
}

interface FilterSidebarProps {
  contentType: 'movie' | 'tv' | 'game' | 'book' | 'music' | 'podcast' | 'theater';
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  filterCounts?: FilterCounts;
}

export type FilterMode = 'passive' | 'show' | 'hide';

export interface FilterState {
  genres: string[];
  themes?: string[];
  moods?: string[];
  ageRatings?: string[];
  platforms?: string[];
  rating: { min: number | ''; max: number | '' };
  year: { min: number | ''; max: number | '' };
  duration: { min: number | ''; max: number | '' };
  actors?: (number | string)[];
  directors?: (number | string)[];
  companies?: (number | string)[];
  gameModes?: string[];
  perspectives?: string[];
  language?: string[];
  publicationLanguage?: string[];
  // Hide switches
  hideWatched?: FilterMode;
  hideWatchlist?: FilterMode;
  hideContinuing?: FilterMode;
  hideFavorites?: FilterMode;
  hideAbandoned?: FilterMode;
  hideInAnyList?: FilterMode;
  hasAwards?: boolean;
}

const FILTER_SIDEBAR_PINNED_STORAGE_KEY = 'explore-filter-sidebar-pinned';
const CONTENT_TYPE_IDS: Partial<Record<FilterSidebarProps['contentType'], number>> = {
  movie: 1,
  tv: 2,
  game: 3,
  book: 4,
};

export function FilterSidebar({
  contentType,
  filters,
  onFilterChange,
  filterCounts,
}: FilterSidebarProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasInitializedPinnedState, setHasInitializedPinnedState] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);
  const t = useTranslations('Explore.FilterSidebar');

  const [isExpanded, setIsExpanded] = useState({
    genre: true,
    themes: false,
    moods: false,
    ageRatings: false,
    platforms: false,
    rating: true,
    year: true,
    duration: true,
    gameModes: false,
    perspectives: false,
    actors: false,
    directors: false,
    companies: false,
    language: true,
    publicationLanguage: false,
  });

  // Database data
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [themes, setThemes] = useState<GenreData[]>([]);
  const [moods, setMoods] = useState<GenreData[]>([]);
  const [ageRatings, setAgeRatings] = useState<GenreData[]>([]);
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [actors, setActors] = useState<PersonData[]>([]);
  const [directors, setDirectors] = useState<PersonData[]>([]);
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [languages, setLanguages] = useState<LanguageData[]>([]);
  const [gameModesList, setGameModesList] = useState<GenreData[]>([]);
  const [perspectivesList, setPerspectivesList] = useState<GenreData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let frameId: number | null = null;

    try {
      const savedPinnedState = localStorage.getItem(FILTER_SIDEBAR_PINNED_STORAGE_KEY);
      if (savedPinnedState !== null) {
        setIsPinned(savedPinnedState === 'true');
      }
    } catch (error) {
      console.error('[FilterSidebar] Failed to restore pinned state:', error);
    } finally {
      setHasInitializedPinnedState(true);
      frameId = window.requestAnimationFrame(() => {
        setTransitionsEnabled(true);
      });
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasInitializedPinnedState) return;

    try {
      localStorage.setItem(FILTER_SIDEBAR_PINNED_STORAGE_KEY, String(isPinned));
    } catch (error) {
      console.error('[FilterSidebar] Failed to persist pinned state:', error);
    }
  }, [hasInitializedPinnedState, isPinned]);

  // Load filter data from database
  useEffect(() => {
    let cancelled = false;

    const fetchFilterData = async () => {
      try {
        setLoadingData(true);

        const contentTypeId = CONTENT_TYPE_IDS[contentType];

        const [
          genresData,
          themesData,
          moodsData,
          ageRatingsData,
          platformsData,
          actorsData,
          directorsData,
          languagesData,
          companiesData,
          gameModesData,
          perspectivesData,
        ] = await Promise.all([
          apolloClient.query<{ listGenres: GenreData[] }>({
            query: LIST_GENRES,
            variables: { contentTypeId, limit: 1000 },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query<{ listThemes: GenreData[] }>({
            query: LIST_THEMES,
            variables: { contentTypeId, limit: 1000 },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query<{ listMoods: GenreData[] }>({
            query: LIST_MOODS,
            variables: { contentTypeId, limit: 1000 },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query<{ listAgeRatings: GenreData[] }>({
            query: LIST_AGE_RATINGS,
            variables: { limit: 1000 },
          }),
          apolloClient.query<{ listPlatforms: PlatformData[] }>({
            query: LIST_PLATFORMS,
            variables: { limit: 1000 },
          }),
          apolloClient.query<{ listActors: PersonData[] }>({
            query: LIST_ACTORS,
            variables: { limit: 1000 },
          }),
          apolloClient.query<{ listDirectors: PersonData[] }>({
            query: LIST_DIRECTORS,
            variables: { limit: 1000 },
          }),
          apolloClient.query<{ listLanguages: LanguageData[] }>({
            query: LIST_LANGUAGES,
            variables: { limit: 1000 },
          }),
          apolloClient.query<{ listCompanies: { id: number; name: string }[] }>({
            query: LIST_COMPANIES,
            variables: { limit: 1000, contentTypeId },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query<{ listGameModes: GenreData[] }>({
            query: LIST_GAME_MODES,
            variables: { limit: 1000 },
          }),
          apolloClient.query<{ listPerspectives: GenreData[] }>({
            query: LIST_PERSPECTIVES,
            variables: { limit: 1000 },
          }),
        ]);

        if (cancelled) return;

        setGenres(genresData.data?.listGenres || []);
        setThemes(themesData.data?.listThemes || []);
        setMoods(moodsData.data?.listMoods || []);
        setAgeRatings(ageRatingsData.data?.listAgeRatings || []);
        setPlatforms(platformsData.data?.listPlatforms || []);
        setActors(actorsData.data?.listActors || []);
        setDirectors(directorsData.data?.listDirectors || []);
        setLanguages(languagesData.data?.listLanguages || []);
        setCompanies(companiesData.data?.listCompanies || []);
        setGameModesList(gameModesData.data?.listGameModes || []);
        setPerspectivesList(perspectivesData.data?.listPerspectives || []);
      } catch (error) {
        if (!cancelled) {
          console.error('[FilterSidebar] Error loading filter data:', error);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    fetchFilterData();
    return () => {
      cancelled = true;
    };
  }, [contentType]);

  const handleGenreToggle = (genreId: string) => {
    const newGenres = filters.genres.includes(genreId)
      ? filters.genres.filter((g) => g !== genreId)
      : [...filters.genres, genreId];

    const newFilters = { ...filters, genres: newGenres };
    onFilterChange(newFilters);
  };

  const handleRatingChange = useCallback(
    (min: number | '', max: number | '') => {
      onFilterChange({ ...filters, rating: { min, max } });
    },
    [filters, onFilterChange]
  );

  const handleYearChange = useCallback(
    (min: number | '', max: number | '') => {
      onFilterChange({ ...filters, year: { min, max } });
    },
    [filters, onFilterChange]
  );

  const handleActorToggle = (actorId: number | string) => {
    const currentActors = filters.actors || [];
    const newActors = currentActors.includes(actorId)
      ? currentActors.filter((a) => a !== actorId)
      : [...currentActors, actorId];

    const newFilters = { ...filters, actors: newActors };
    onFilterChange(newFilters);
  };

  const handleDirectorToggle = (directorId: number | string) => {
    const currentDirectors = filters.directors || [];
    const newDirectors = currentDirectors.includes(directorId)
      ? currentDirectors.filter((d) => d !== directorId)
      : [...currentDirectors, directorId];

    const newFilters = { ...filters, directors: newDirectors };
    onFilterChange(newFilters);
  };

  const handleCompanyToggle = (companyId: number | string) => {
    const currentCompanies = filters.companies || [];
    const newCompanies = currentCompanies.includes(companyId)
      ? currentCompanies.filter((c) => c !== companyId)
      : [...currentCompanies, companyId];

    const newFilters = { ...filters, companies: newCompanies };
    onFilterChange(newFilters);
  };

  const handleThemeToggle = (themeId: string) => {
    const currentThemes = filters.themes || [];
    const newThemes = currentThemes.includes(themeId)
      ? currentThemes.filter((t) => t !== themeId)
      : [...currentThemes, themeId];
    const newFilters = { ...filters, themes: newThemes };
    onFilterChange(newFilters);
  };

  const handleMoodToggle = (moodId: string) => {
    const currentMoods = filters.moods || [];
    const newMoods = currentMoods.includes(moodId)
      ? currentMoods.filter((m) => m !== moodId)
      : [...currentMoods, moodId];
    const newFilters = { ...filters, moods: newMoods };
    onFilterChange(newFilters);
  };

  const handleGameModeToggle = (gameModeId: string) => {
    const currentGameModes = filters.gameModes || [];
    const newGameModes = currentGameModes.includes(gameModeId)
      ? currentGameModes.filter((g) => g !== gameModeId)
      : [...currentGameModes, gameModeId];
    const newFilters = { ...filters, gameModes: newGameModes };
    onFilterChange(newFilters);
  };

  const handlePerspectiveToggle = (perspectiveId: string) => {
    const currentPerspectives = filters.perspectives || [];
    const newPerspectives = currentPerspectives.includes(perspectiveId)
      ? currentPerspectives.filter((p) => p !== perspectiveId)
      : [...currentPerspectives, perspectiveId];
    const newFilters = { ...filters, perspectives: newPerspectives };
    onFilterChange(newFilters);
  };

  const handleAgeRatingToggle = (ageRatingId: string) => {
    const currentAgeRatings = filters.ageRatings || [];
    const newAgeRatings = currentAgeRatings.includes(ageRatingId)
      ? currentAgeRatings.filter((a) => a !== ageRatingId)
      : [...currentAgeRatings, ageRatingId];
    const newFilters = { ...filters, ageRatings: newAgeRatings };
    onFilterChange(newFilters);
  };

  const handlePlatformToggle = (platformId: string) => {
    const currentPlatforms = filters.platforms || [];
    const newPlatforms = currentPlatforms.includes(platformId)
      ? currentPlatforms.filter((p) => p !== platformId)
      : [...currentPlatforms, platformId];
    const newFilters = { ...filters, platforms: newPlatforms };
    onFilterChange(newFilters);
  };

  const selectAllGenres = () => {
    const allGenreIds = genres.map((g) => g.id.toString());
    const newFilters = { ...filters, genres: allGenreIds };
    onFilterChange(newFilters);
  };

  // "Other" (null filter) - special ID for items with null values
  const OTHER_FILTER_ID = '__other__';
  const durationDefaultMax = contentType === 'game' ? 10000 : contentType === 'book' ? 1000 : 500;
  const durationStep = contentType === 'game' ? 60 : contentType === 'book' ? 25 : 10;
  const durationTitle =
    contentType === 'game'
      ? t('duration.avgGame')
      : contentType === 'book'
        ? t('duration.pages')
        : contentType === 'tv'
          ? t('duration.avgEpisode')
          : t('duration.runtime');
  const durationChipLabel =
    contentType === 'game'
      ? t('duration.avgGameChip')
      : contentType === 'book'
        ? t('duration.pagesChip')
        : contentType === 'tv'
          ? t('duration.avgEpisodeChip')
          : t('duration.runtimeChip');
  const durationUnit = contentType === 'book' ? t('duration.unitPage') : t('duration.unitMin');

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
      genres: [],
      themes: [],
      moods: [],
      ageRatings: [],
      platforms: [],
      rating: { min: 0, max: 10 },
      year: { min: 1900, max: new Date().getFullYear() },
      duration: { min: '' as number | '', max: '' as number | '' },
      gameModes: [],
      perspectives: [],
      actors: [],
      directors: [],
      companies: [],
      language: [],
      publicationLanguage: [],
      hasAwards: undefined,
      hideWatched: 'passive',
      hideWatchlist: 'passive',
      hideContinuing: 'passive',
      hideFavorites: 'passive',
      hideAbandoned: 'passive',
    };
    onFilterChange(clearedFilters);
  };

  const handleDurationChange = useCallback(
    (min: number | '', max: number | '') => {
      onFilterChange({ ...filters, duration: { min, max } });
    },
    [filters, onFilterChange]
  );

  // Scroll handler for rating inputs
  const handleRatingScroll = useCallback(
    (e: React.WheelEvent<HTMLInputElement>, isMin: boolean) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const currentValue = isMin
        ? filters.rating.min === ''
          ? 0
          : filters.rating.min
        : filters.rating.max === ''
          ? 10
          : filters.rating.max;
      const newValue = Math.max(0, Math.min(10, currentValue + delta));

      if (isMin) {
        handleRatingChange(newValue, filters.rating.max);
      } else {
        handleRatingChange(filters.rating.min, newValue);
      }
    },
    [filters.rating, handleRatingChange]
  );

  // Scroll handler for year inputs
  const handleYearScroll = useCallback(
    (e: React.WheelEvent<HTMLInputElement>, isMin: boolean) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const maxYear = new Date().getFullYear();
      const currentValue = isMin
        ? filters.year.min === ''
          ? 1900
          : filters.year.min
        : filters.year.max === ''
          ? maxYear
          : filters.year.max;
      const newValue = Math.max(1900, Math.min(maxYear, currentValue + delta));

      if (isMin) {
        handleYearChange(newValue, filters.year.max);
      } else {
        handleYearChange(filters.year.min, newValue);
      }
    },
    [filters.year, handleYearChange]
  );

  // Scroll handler for duration inputs
  const handleDurationScroll = useCallback(
    (e: React.WheelEvent<HTMLInputElement>, isMin: boolean) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? durationStep : -durationStep;
      const currentValue = isMin
        ? filters.duration.min === ''
          ? 0
          : filters.duration.min
        : filters.duration.max === ''
          ? durationDefaultMax
          : filters.duration.max;
      const newValue = Math.max(0, currentValue + delta);

      if (isMin) {
        handleDurationChange(newValue, filters.duration.max);
      } else {
        handleDurationChange(filters.duration.min, newValue);
      }
    },
    [filters.duration, durationDefaultMax, durationStep, handleDurationChange]
  );

  const clearDuration = () => {
    const newFilters = { ...filters, duration: { min: '' as number | '', max: '' as number | '' } };
    onFilterChange(newFilters);
  };

  const toggleSection = (section: keyof typeof isExpanded) => {
    setIsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const currentYear = new Date().getFullYear();
  const minRating = filters.rating.min === '' ? 0 : filters.rating.min;
  const maxRating = filters.rating.max === '' ? 10 : filters.rating.max;
  const minYear = filters.year.min === '' ? 1900 : filters.year.min;
  const maxYearFilter = filters.year.max === '' ? currentYear : filters.year.max;
  const minDuration = filters.duration?.min ?? '';
  const maxDuration = filters.duration?.max ?? '';
  const minDurationVal = minDuration === '' ? 0 : minDuration;
  const maxDurationVal = maxDuration === '' ? durationDefaultMax : maxDuration;

  const isRatingFiltered = minRating > 0 || maxRating < 10;
  const isYearFiltered = minYear > 1900 || maxYearFilter < currentYear;
  const isDurationFiltered = minDurationVal > 0 || maxDuration !== '';
  const isLanguageFiltered = (filters.language?.length || 0) > 0;
  const isPublicationLanguageFiltered = (filters.publicationLanguage?.length || 0) > 0;
  const isPlatformFiltered = (filters.platforms?.length || 0) > 0;

  const activeFiltersCount =
    (filters.genres.length || 0) +
    (filters.themes?.length || 0) +
    (filters.moods?.length || 0) +
    (filters.ageRatings?.length || 0) +
    (filters.platforms?.length || 0) +
    (filters.actors?.length || 0) +
    (filters.directors?.length || 0) +
    (filters.companies?.length || 0) +
    (isRatingFiltered ? 1 : 0) +
    (isYearFiltered ? 1 : 0) +
    (isDurationFiltered ? 1 : 0) +
    (filters.gameModes?.length || 0) +
    (filters.perspectives?.length || 0) +
    (isLanguageFiltered ? 1 : 0) +
    (isPublicationLanguageFiltered ? 1 : 0);

  // Clear individual filter functions
  const clearGenres = () => {
    const newFilters = { ...filters, genres: [] };
    onFilterChange(newFilters);
  };

  const clearThemes = () => {
    const newFilters = { ...filters, themes: [] };
    onFilterChange(newFilters);
  };

  const clearMoods = () => {
    const newFilters = { ...filters, moods: [] };
    onFilterChange(newFilters);
  };

  const clearAgeRatings = () => {
    const newFilters = { ...filters, ageRatings: [] };
    onFilterChange(newFilters);
  };

  const clearPlatforms = () => {
    const newFilters = { ...filters, platforms: [] };
    onFilterChange(newFilters);
  };

  const clearRating = () => {
    const newFilters = { ...filters, rating: { min: 0, max: 10 } };
    onFilterChange(newFilters);
  };

  const clearYear = () => {
    const newFilters = { ...filters, year: { min: 1900, max: new Date().getFullYear() } };
    onFilterChange(newFilters);
  };

  const clearActors = () => {
    const newFilters = { ...filters, actors: [] };
    onFilterChange(newFilters);
  };

  const clearDirectors = () => {
    const newFilters = { ...filters, directors: [] };
    onFilterChange(newFilters);
  };

  const clearCompanies = () => {
    const newFilters = { ...filters, companies: [] };
    onFilterChange(newFilters);
  };

  const clearLanguage = () => {
    const newFilters = { ...filters, language: [] };
    onFilterChange(newFilters);
  };

  const clearPublicationLanguage = () => {
    const newFilters = { ...filters, publicationLanguage: [] };
    onFilterChange(newFilters);
  };

  const clearGameModes = () => {
    const newFilters = { ...filters, gameModes: [] };
    onFilterChange(newFilters);
  };

  const clearPerspectives = () => {
    const newFilters = { ...filters, perspectives: [] };
    onFilterChange(newFilters);
  };

  const getNameById = (
    list: Array<{ id: number; name: string }>,
    id: string | number,
    otherLabel: string
  ) => {
    if (id === OTHER_FILTER_ID) return otherLabel;
    const found = list.find((item) => item.id === Number(id));
    return found?.name || String(id);
  };

  const activeFilterChips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  filters.genres.forEach((id) => {
    activeFilterChips.push({
      key: `genre-${id}`,
      label: `${t('labels.genre')}: ${getNameById(genres, id, t('other'))}`,
      onRemove: () => handleGenreToggle(id),
    });
  });

  (filters.themes || []).forEach((id) => {
    activeFilterChips.push({
      key: `theme-${id}`,
      label: `${t('labels.theme')}: ${getNameById(themes, id, t('other'))}`,
      onRemove: () => handleThemeToggle(id),
    });
  });

  (filters.moods || []).forEach((id) => {
    activeFilterChips.push({
      key: `mood-${id}`,
      label: `${t('labels.mood')}: ${getNameById(moods, id, t('other'))}`,
      onRemove: () => handleMoodToggle(id),
    });
  });

  (filters.ageRatings || []).forEach((id) => {
    activeFilterChips.push({
      key: `age-${id}`,
      label: `${t('labels.ageRating')}: ${getNameById(ageRatings, id, t('other'))}`,
      onRemove: () => handleAgeRatingToggle(id),
    });
  });

  (filters.platforms || []).forEach((id) => {
    activeFilterChips.push({
      key: `platform-${id}`,
      label: `${t('labels.platform')}: ${getNameById(platforms, id, t('other'))}`,
      onRemove: () => handlePlatformToggle(id),
    });
  });

  (filters.actors || []).forEach((id) => {
    activeFilterChips.push({
      key: `actor-${id}`,
      label: `${t('labels.actor')}: ${getNameById(actors, id, t('other'))}`,
      onRemove: () => handleActorToggle(id),
    });
  });

  (filters.directors || []).forEach((id) => {
    activeFilterChips.push({
      key: `director-${id}`,
      label: `${t('labels.director')}: ${getNameById(directors, id, t('other'))}`,
      onRemove: () => handleDirectorToggle(id),
    });
  });

  (filters.companies || []).forEach((id) => {
    activeFilterChips.push({
      key: `company-${id}`,
      label: `${t('labels.company')}: ${getNameById(companies, id, t('other'))}`,
      onRemove: () => handleCompanyToggle(id),
    });
  });

  (filters.gameModes || []).forEach((id) => {
    activeFilterChips.push({
      key: `gamemode-${id}`,
      label: `${t('labels.gameMode')}: ${id === OTHER_FILTER_ID ? t('other') : id}`,
      onRemove: () => handleGameModeToggle(id),
    });
  });

  (filters.perspectives || []).forEach((id) => {
    activeFilterChips.push({
      key: `perspective-${id}`,
      label: `${t('labels.perspective')}: ${id === OTHER_FILTER_ID ? t('other') : id}`,
      onRemove: () => handlePerspectiveToggle(id),
    });
  });

  (filters.language || []).forEach((lang) => {
    activeFilterChips.push({
      key: `original-lang-${lang}`,
      label: `${contentType === 'book' ? t('labels.originalLanguage') : t('labels.language')}: ${lang === OTHER_FILTER_ID ? t('other') : lang}`,
      onRemove: () => {
        const currentLanguages = filters.language || [];
        const newFilters = { ...filters, language: currentLanguages.filter((l) => l !== lang) };
        onFilterChange(newFilters);
      },
    });
  });

  (filters.publicationLanguage || []).forEach((lang) => {
    activeFilterChips.push({
      key: `publication-lang-${lang}`,
      label: `${t('labels.publicationLanguage')}: ${lang === OTHER_FILTER_ID ? t('other') : lang}`,
      onRemove: () => {
        const currentLanguages = filters.publicationLanguage || [];
        const newFilters = {
          ...filters,
          publicationLanguage: currentLanguages.filter((l) => l !== lang),
        };
        onFilterChange(newFilters);
      },
    });
  });

  if (filters.hasAwards) {
    activeFilterChips.push({
      key: 'has-awards',
      label: '🏆 Ödüllü İçerikler',
      onRemove: () => {
        const newFilters = { ...filters, hasAwards: undefined };
        onFilterChange(newFilters);
      },
    });
  }

  if (isRatingFiltered) {
    activeFilterChips.push({
      key: 'rating-range',
      label: `${t('labels.rating')}: ${minRating.toFixed(1)} - ${maxRating.toFixed(1)}`,
      onRemove: clearRating,
    });
  }

  if (isYearFiltered) {
    activeFilterChips.push({
      key: 'year-range',
      label: `${t('labels.year')}: ${minYear} - ${maxYearFilter}`,
      onRemove: clearYear,
    });
  }

  if (isDurationFiltered) {
    activeFilterChips.push({
      key: 'duration-range',
      label: `${durationChipLabel}: ${minDurationVal} - ${maxDuration === '' ? t('duration.noLimit') : `${maxDurationVal} ${durationUnit}`}`,
      onRemove: clearDuration,
    });
  }

  const isVisible = isPinned || isHovered;
  const transitionClass = transitionsEnabled ? 'transition-all duration-300' : 'transition-none';

  return (
    <div
      className={`relative ${transitionClass} z-20 ${isPinned ? 'w-80' : 'w-12'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute top-0 right-0 h-full ${transitionClass} bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 overflow-hidden flex flex-col ${
          isVisible
            ? 'w-80 opacity-100 shadow-2xl'
            : 'w-12 opacity-80 cursor-pointer hover:bg-zinc-900'
        }`}
      >
        {!isVisible ? (
          <div className="flex flex-col items-center py-6 gap-6 h-full text-white/50 hover:text-white/90">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
              <Filter className="w-4 h-4" />
            </div>
            {activeFiltersCount > 0 && (
              <span className="bg-violet-500 text-white text-xs font-bold px-2 py-0.5 rounded-full absolute top-3 right-1">
                {activeFiltersCount}
              </span>
            )}
            <div
              className="flex flex-col items-center gap-2 mt-4 opacity-50"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              <span className="tracking-widest uppercase text-xs font-semibold">{t('title')}</span>
            </div>
          </div>
        ) : (
          <div className="p-5 h-full overflow-y-auto w-80">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold gradient-text">{t('title')}</h2>
                {activeFiltersCount > 0 && (
                  <span className="bg-violet-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg"
                    title={t('clearAll')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    isPinned
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                  title={isPinned ? t('unpin') : t('pin')}
                >
                  {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Active Filters Badge */}
            {activeFilterChips.length > 0 && (
              <div className="mb-4 px-3 py-2 bg-violet-500/20 border border-violet-500/30 rounded-xl">
                <div className="text-sm text-white/80 mb-2">
                  <span className="font-bold text-violet-400">{activeFiltersCount}</span>{' '}
                  {t('activeFilters')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeFilterChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1 text-xs bg-white/10 text-white/90 px-2 py-1 rounded-md"
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="text-white/60 hover:text-white transition-colors"
                        title={t('removeFilter')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-white/40">{t('loading')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <GenreFilter
                  genres={genres}
                  selectedGenres={filters.genres}
                  isExpanded={isExpanded.genre}
                  onToggleSection={() => toggleSection('genre')}
                  onToggleGenre={handleGenreToggle}
                  onSelectAll={selectAllGenres}
                  onClear={clearGenres}
                  filterCounts={filterCounts?.genres}
                  otherFilterId={OTHER_FILTER_ID}
                  contentTypeId={CONTENT_TYPE_IDS[contentType]}
                />

                <ThemeFilter
                  themes={themes}
                  selectedThemes={filters.themes || []}
                  isExpanded={isExpanded.themes}
                  onToggleSection={() => toggleSection('themes')}
                  onToggleTheme={handleThemeToggle}
                  onClear={clearThemes}
                  filterCounts={filterCounts?.themes}
                  otherFilterId={OTHER_FILTER_ID}
                  contentTypeId={CONTENT_TYPE_IDS[contentType]}
                />

                <MoodFilter
                  moods={moods}
                  selectedMoods={filters.moods || []}
                  isExpanded={isExpanded.moods}
                  onToggleSection={() => toggleSection('moods')}
                  onToggleMood={handleMoodToggle}
                  onClear={clearMoods}
                  filterCounts={filterCounts?.moods}
                  otherFilterId={OTHER_FILTER_ID}
                  contentTypeId={CONTENT_TYPE_IDS[contentType]}
                />

                <AgeRatingFilter
                  ageRatings={ageRatings}
                  selectedAgeRatings={filters.ageRatings || []}
                  isExpanded={isExpanded.ageRatings}
                  onToggleSection={() => toggleSection('ageRatings')}
                  onToggleAgeRating={handleAgeRatingToggle}
                  onClear={clearAgeRatings}
                  filterCounts={filterCounts?.ageRatings}
                  otherFilterId={OTHER_FILTER_ID}
                />

                {contentType === 'game' && (
                  <PlatformFilter
                    platforms={platforms}
                    selectedPlatforms={filters.platforms || []}
                    isExpanded={isExpanded.platforms}
                    onToggleSection={() => toggleSection('platforms')}
                    onTogglePlatform={handlePlatformToggle}
                    onClear={clearPlatforms}
                    filterCounts={filterCounts?.platforms}
                  />
                )}

                <div className="px-1 py-2">
                  <label className="flex items-center justify-between cursor-pointer group p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🏆</span>
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Sadece Ödüllüler
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={filters.hasAwards === true}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            hasAwards: e.target.checked ? true : undefined,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
                    </div>
                  </label>
                </div>

                <RatingFilter
                  rating={filters.rating}
                  isExpanded={isExpanded.rating}
                  onToggleSection={() => toggleSection('rating')}
                  onChange={handleRatingChange}
                  onScroll={handleRatingScroll}
                  onClear={clearRating}
                />

                <YearFilter
                  year={filters.year}
                  isExpanded={isExpanded.year}
                  onToggleSection={() => toggleSection('year')}
                  onChange={handleYearChange}
                  onScroll={handleYearScroll}
                  onClear={clearYear}
                />

                <DurationFilter
                  duration={filters.duration}
                  isExpanded={isExpanded.duration}
                  title={durationTitle}
                  defaultMax={durationDefaultMax}
                  emptyMaxLabel="Sınır yok"
                  unitLabel={durationUnit}
                  onToggleSection={() => toggleSection('duration')}
                  onChange={handleDurationChange}
                  onScroll={handleDurationScroll}
                  onClear={clearDuration}
                />

                {contentType === 'game' && (
                  <GameModeFilter
                    gameModes={gameModesList}
                    selectedGameModes={filters.gameModes || []}
                    isExpanded={isExpanded.gameModes}
                    onToggleSection={() => toggleSection('gameModes')}
                    onToggleGameMode={handleGameModeToggle}
                    onClear={clearGameModes}
                    filterCounts={filterCounts?.gameModes}
                    otherFilterId={OTHER_FILTER_ID}
                  />
                )}

                {contentType === 'game' && (
                  <PerspectiveFilter
                    perspectives={perspectivesList}
                    selectedPerspectives={filters.perspectives || []}
                    isExpanded={isExpanded.perspectives}
                    onToggleSection={() => toggleSection('perspectives')}
                    onTogglePerspective={handlePerspectiveToggle}
                    onClear={clearPerspectives}
                    filterCounts={filterCounts?.perspectives}
                    otherFilterId={OTHER_FILTER_ID}
                  />
                )}

                {contentType !== 'game' && contentType !== 'book' && (
                  <PersonFilter
                    title={t('labels.actor')}
                    type="actor"
                    persons={actors}
                    selectedPersons={filters.actors || []}
                    isExpanded={isExpanded.actors}
                    onToggleSection={() => toggleSection('actors')}
                    onTogglePerson={handleActorToggle}
                    onClear={clearActors}
                    filterCounts={filterCounts?.actors}
                    otherFilterId={OTHER_FILTER_ID}
                  />
                )}

                {contentType !== 'game' && contentType !== 'book' && (
                  <PersonFilter
                    title={t('labels.director')}
                    type="director"
                    persons={directors}
                    selectedPersons={filters.directors || []}
                    isExpanded={isExpanded.directors}
                    onToggleSection={() => toggleSection('directors')}
                    onTogglePerson={handleDirectorToggle}
                    onClear={clearDirectors}
                    filterCounts={filterCounts?.directors}
                    otherFilterId={OTHER_FILTER_ID}
                  />
                )}

                <CompanyFilter
                  companies={companies}
                  selectedCompanies={filters.companies || []}
                  isExpanded={isExpanded.companies}
                  onToggleSection={() => toggleSection('companies')}
                  onToggleCompany={handleCompanyToggle}
                  onClear={clearCompanies}
                  filterCounts={filterCounts?.companies}
                  otherFilterId={OTHER_FILTER_ID}
                  contentTypeId={CONTENT_TYPE_IDS[contentType]}
                />

                <LanguageFilter
                  languages={languages}
                  selectedLanguages={filters.language || []}
                  isExpanded={isExpanded.language}
                  onToggleSection={() => toggleSection('language')}
                  onToggleLanguage={(langName) => {
                    const currentLanguages = filters.language || [];
                    const newLanguages = currentLanguages.includes(langName)
                      ? currentLanguages.filter((l) => l !== langName)
                      : [...currentLanguages, langName];
                    const newFilters = { ...filters, language: newLanguages };
                    onFilterChange(newFilters);
                  }}
                  onClear={clearLanguage}
                  filterCounts={filterCounts?.languages}
                  otherFilterId={OTHER_FILTER_ID}
                  title={
                    contentType === 'book' ? t('labels.originalLanguage') : t('labels.language')
                  }
                  placeholder={
                    contentType === 'book'
                      ? t('placeholders.originalLanguage')
                      : t('placeholders.language')
                  }
                  otherLabel={
                    contentType === 'book'
                      ? t('otherLabels.noOriginalLanguage')
                      : t('otherLabels.noLanguage')
                  }
                />

                {contentType === 'book' && (
                  <LanguageFilter
                    languages={languages}
                    selectedLanguages={filters.publicationLanguage || []}
                    isExpanded={isExpanded.publicationLanguage}
                    onToggleSection={() => toggleSection('publicationLanguage')}
                    onToggleLanguage={(langName) => {
                      const currentLanguages = filters.publicationLanguage || [];
                      const newLanguages = currentLanguages.includes(langName)
                        ? currentLanguages.filter((l) => l !== langName)
                        : [...currentLanguages, langName];
                      const newFilters = { ...filters, publicationLanguage: newLanguages };
                      onFilterChange(newFilters);
                    }}
                    onClear={clearPublicationLanguage}
                    filterCounts={filterCounts?.publicationLanguages}
                    otherFilterId={OTHER_FILTER_ID}
                    title={t('labels.publicationLanguage')}
                    placeholder={t('placeholders.publicationLanguage')}
                    otherLabel={t('otherLabels.noPublicationLanguage')}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
