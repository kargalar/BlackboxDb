/**
 * Tab configuration for the add-content form.
 * Each content type has its own set of tabs displayed in the sidebar.
 */

export interface TabDefinition {
  id: string;
  messageKey: string;
  icon: string;
}

const RELEASES_TAB: TabDefinition = { id: 'releases', messageKey: 'releases', icon: 'Calendar' };

const MOVIE_TABS: TabDefinition[] = [
  { id: 'basic', messageKey: 'basic', icon: 'Info' },
  { id: 'movie-info', messageKey: 'movieInfo', icon: 'Film' },
  RELEASES_TAB,
  { id: 'cast-crew', messageKey: 'castCrew', icon: 'Users' },
  { id: 'media', messageKey: 'media', icon: 'Image' },
  { id: 'videos', messageKey: 'videos', icon: 'Video' },
  { id: 'screenshots', messageKey: 'screenshots', icon: 'Images' },
  { id: 'soundtrack', messageKey: 'soundtrack', icon: 'Music' },
  { id: 'similar-contents', messageKey: 'similarContents', icon: 'Link' },
  { id: 'citations', messageKey: 'citations', icon: 'Quote' },
];

const TV_TABS: TabDefinition[] = [
  { id: 'basic', messageKey: 'basic', icon: 'Info' },
  { id: 'tv-info', messageKey: 'tvInfo', icon: 'Tv' },
  RELEASES_TAB,
  { id: 'tv-seasons', messageKey: 'tvSeasons', icon: 'Calendar' },
  { id: 'cast-crew', messageKey: 'castCrew', icon: 'Users' },
  { id: 'media', messageKey: 'media', icon: 'Image' },
  { id: 'videos', messageKey: 'videos', icon: 'Video' },
  { id: 'screenshots', messageKey: 'screenshots', icon: 'Images' },
  { id: 'soundtrack', messageKey: 'soundtrack', icon: 'Music' },
  { id: 'similar-contents', messageKey: 'similarContents', icon: 'Link' },
  { id: 'citations', messageKey: 'citations', icon: 'Quote' },
];

const GAME_TABS: TabDefinition[] = [
  { id: 'basic', messageKey: 'basic', icon: 'Info' },
  { id: 'game-info', messageKey: 'gameInfo', icon: 'Gamepad2' },
  RELEASES_TAB,
  { id: 'game-expansions', messageKey: 'gameExpansions', icon: 'Puzzle' },
  { id: 'media', messageKey: 'media', icon: 'Image' },
  { id: 'videos', messageKey: 'videos', icon: 'Video' },
  { id: 'screenshots', messageKey: 'screenshots', icon: 'Images' },
  { id: 'soundtrack', messageKey: 'soundtrack', icon: 'Music' },
  { id: 'similar-contents', messageKey: 'similarContents', icon: 'Link' },
  { id: 'citations', messageKey: 'citations', icon: 'Quote' },
];

const BOOK_TABS: TabDefinition[] = [
  { id: 'basic', messageKey: 'basic', icon: 'Info' },
  { id: 'book-info', messageKey: 'bookInfo', icon: 'BookOpen' },
  { id: 'book-publications', messageKey: 'bookPublications', icon: 'Library' },
  RELEASES_TAB,
  { id: 'similar-contents', messageKey: 'similarContents', icon: 'Link' },
];

const TAB_CONFIG: Record<string, TabDefinition[]> = {
  '1': MOVIE_TABS,
  '2': TV_TABS,
  '3': GAME_TABS,
  '4': BOOK_TABS,
};

const BOARD_GAME_TABS: TabDefinition[] = [
  { id: 'basic', messageKey: 'basic', icon: 'Info' },
  RELEASES_TAB,
  { id: 'game-expansions', messageKey: 'gameExpansions', icon: 'Puzzle' },
  { id: 'media', messageKey: 'media', icon: 'Image' },
  { id: 'similar-contents', messageKey: 'similarContents', icon: 'Link' },
];

export function getTabsForContentType(
  contentTypeId: string,
  contentTypeSlug?: string
): TabDefinition[] {
  if (contentTypeSlug === 'board-game') return BOARD_GAME_TABS;
  return TAB_CONFIG[contentTypeId] ?? [];
}
