/**
 * Tab configuration for the add-content form.
 * Each content type has its own set of tabs displayed in the sidebar.
 */

export interface TabDefinition {
  id: string;
  label: string;
  icon: string;
}

const MOVIE_TABS: TabDefinition[] = [
  { id: 'basic', label: 'Temel Bilgiler', icon: 'Info' },
  { id: 'movie-info', label: 'Film Bilgileri', icon: 'Film' },
  { id: 'cast-crew', label: 'Oyuncular & Ekip', icon: 'Users' },
  { id: 'media', label: 'Kapak & Poster', icon: 'Image' },
  { id: 'videos', label: 'Videolar', icon: 'Video' },
  { id: 'screenshots', label: 'Ekran Goruntuleri', icon: 'Images' },
  { id: 'soundtrack', label: 'Soundtrack', icon: 'Music' },
  { id: 'similar-contents', label: 'Benzer Icerikler', icon: 'Link' },
  { id: 'citations', label: 'Atıf Yapan İçerikler', icon: 'Quote' },
];

const TV_TABS: TabDefinition[] = [
  { id: 'basic', label: 'Temel Bilgiler', icon: 'Info' },
  { id: 'tv-info', label: 'Dizi Bilgileri', icon: 'Tv' },
  { id: 'tv-seasons', label: 'Sezonlar', icon: 'Calendar' },
  { id: 'cast-crew', label: 'Oyuncular & Ekip', icon: 'Users' },
  { id: 'media', label: 'Kapak & Poster', icon: 'Image' },
  { id: 'videos', label: 'Videolar', icon: 'Video' },
  { id: 'screenshots', label: 'Ekran Goruntuleri', icon: 'Images' },
  { id: 'soundtrack', label: 'Soundtrack', icon: 'Music' },
  { id: 'similar-contents', label: 'Benzer Icerikler', icon: 'Link' },
  { id: 'citations', label: 'Atıf Yapan İçerikler', icon: 'Quote' },
];

const GAME_TABS: TabDefinition[] = [
  { id: 'basic', label: 'Temel Bilgiler', icon: 'Info' },
  { id: 'game-info', label: 'Oyun Bilgileri', icon: 'Gamepad2' },
  { id: 'game-expansions', label: "Eklentiler & Remake'ler", icon: 'Puzzle' },
  { id: 'media', label: 'Kapak & Poster', icon: 'Image' },
  { id: 'videos', label: 'Videolar', icon: 'Video' },
  { id: 'screenshots', label: 'Ekran Goruntuleri', icon: 'Images' },
  { id: 'soundtrack', label: 'Soundtrack', icon: 'Music' },
  { id: 'similar-contents', label: 'Benzer Icerikler', icon: 'Link' },
  { id: 'citations', label: 'Atıf Yapan İçerikler', icon: 'Quote' },
];

const BOOK_TABS: TabDefinition[] = [
  { id: 'basic', label: 'Temel Bilgiler', icon: 'Info' },
  { id: 'book-info', label: 'Kitap Bilgileri', icon: 'BookOpen' },
  { id: 'book-publications', label: 'Yayinlar', icon: 'Library' },
  { id: 'similar-contents', label: 'Benzer Icerikler', icon: 'Link' },
];

const TAB_CONFIG: Record<string, TabDefinition[]> = {
  '1': MOVIE_TABS,
  '2': TV_TABS,
  '3': GAME_TABS,
  '4': BOOK_TABS,
};

export function getTabsForContentType(
  contentTypeId: string
): TabDefinition[] {
  return TAB_CONFIG[contentTypeId] ?? [];
}
