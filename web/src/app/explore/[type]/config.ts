export interface ContentTypeConfig {
  title: string;
  subtitle: string;
  contentTypeId?: number;
  defaultQuery: string;
  itemsPerPage: number;
  icon: string;
}

export const CONTENT_CONFIG: Record<string, ContentTypeConfig> = {
  movie: {
    title: 'Filmler',
    subtitle: 'En popüler filmleri keşfedin',
    contentTypeId: 1,
    defaultQuery: 'popular movies',
    itemsPerPage: 24,
    icon: '🎬',
  },
  tv: {
    title: 'TV Dizileri',
    subtitle: 'En popüler dizileri keşfedin',
    contentTypeId: 2,
    defaultQuery: 'popular tv shows',
    itemsPerPage: 24,
    icon: '📺',
  },
  book: {
    title: 'Kitaplar',
    subtitle: 'En popüler kitapları keşfedin',
    contentTypeId: 4,
    defaultQuery: 'bestseller',
    itemsPerPage: 24,
    icon: '📚',
  },
  game: {
    title: 'Oyunlar',
    subtitle: 'En popüler oyunları keşfedin',
    contentTypeId: 3,
    defaultQuery: 'trending games',
    itemsPerPage: 48,
    icon: '🎮',
  },
  music: {
    title: 'Müzik',
    subtitle: 'Müzik albümlerini ve parçalarını keşfedin',
    contentTypeId: 5,
    defaultQuery: 'popular music',
    itemsPerPage: 24,
    icon: '🎵',
  },
  podcast: {
    title: 'Podcast Programs',
    subtitle: 'Browse podcast programs and episodes',
    defaultQuery: 'podcast',
    itemsPerPage: 24,
    icon: '🎙️',
  },
  theater: {
    title: 'Theater Productions',
    subtitle: 'Browse theater productions and performances',
    defaultQuery: 'theater',
    itemsPerPage: 24,
    icon: '🎭',
  },
};
