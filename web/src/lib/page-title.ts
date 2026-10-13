const CONTENT_TYPE_TITLES: Record<string, string> = {
  movie: 'Film',
  tv: 'Dizi',
  game: 'Oyun',
  book: 'Kitap',
};

const STATIC_ROUTE_TITLES: Record<string, string> = {
  '': 'Ana Sayfa',
  'add-content': 'İçerik Ekle',
  admin: 'Admin',
  'auth/login': 'Giriş Yap',
  'auth/register': 'Kayıt Ol',
  company: 'Şirket',
  content: 'İçerik',
  'content-request': 'İçerik İsteği',
  dashboard: 'Panel',
  discussion: 'Tartışma',
  discussions: 'Tartışmalar',
  'edit-content': 'İçeriği Düzenle',
  explore: 'Keşfet',
  lists: 'Listeler',
  notifications: 'Bildirimler',
  person: 'Kişi',
  profile: 'Profil',
  quiz: 'Quiz',
  'quiz/play': 'Quiz Oyna',
  recommended: 'Önerilenler',
  settings: 'Ayarlar',
};

const ADMIN_ROUTE_TITLES: Record<string, string> = {
  categories: 'Kategoriler',
  content: 'İçerikler',
  'content-requests': 'İçerik İstekleri',
  'debug-logs': 'Debug Kayıtları',
  expansions: 'Genişlemeler',
  'game-import': 'Oyun İçe Aktarma',
  moderation: 'Moderasyon',
  person: 'Kişiler',
  quiz: 'Quiz',
  users: 'Kullanıcılar',
};

const PROFILE_TAB_TITLES: Record<string, string> = {
  home: 'Home',
  movies: 'Movies',
  tv: 'TV',
  games: 'Games',
  books: 'Books',
  stats: 'Stats',
  lists: 'Lists',
  reviews: 'Reviews',
  discussions: 'Discussions',
  network: 'Network',
  activity: 'Activity',
};

function normalizeSegment(value?: string): string {
  return decodeURIComponent(value || '')
    .trim()
    .toLowerCase();
}

function getExploreTitle(type?: string): string {
  const normalizedType = normalizeSegment(type);
  const typeTitle = CONTENT_TYPE_TITLES[normalizedType];

  if (!typeTitle) {
    return 'Keşfet';
  }

  return `${typeTitle} Keşfet`;
}

function getAdminTitle(section?: string): string {
  const normalizedSection = normalizeSegment(section);

  if (!normalizedSection) {
    return STATIC_ROUTE_TITLES.admin;
  }

  return `Admin / ${ADMIN_ROUTE_TITLES[normalizedSection] || 'Admin'}`;
}

function getProfileTabTitle(tab?: string | null): string {
  const normalizedTab = normalizeSegment(tab || 'home');
  return PROFILE_TAB_TITLES[normalizedTab] || PROFILE_TAB_TITLES.home;
}

export function buildPageTitle(title?: string | null): string {
  const normalizedTitle = title?.trim();
  return normalizedTitle || 'Blackbox';
}

export function buildProfilePageTitle(username: string, tab?: string | null): string {
  const normalizedUsername = decodeURIComponent(username || '').trim();

  if (!normalizedUsername) {
    return 'Profil';
  }

  return `${normalizedUsername}/${getProfileTabTitle(tab)}`;
}

export function getRouteTitle(pathname: string, searchParams?: URLSearchParams): string {
  const sanitizedPathname = pathname.split('?')[0] || '/';
  const segments = sanitizedPathname.split('/').filter(Boolean).map(normalizeSegment);

  if (segments.length === 0) {
    return STATIC_ROUTE_TITLES[''];
  }

  const joinedRoute = segments.slice(0, 2).join('/');
  if (STATIC_ROUTE_TITLES[joinedRoute]) {
    return STATIC_ROUTE_TITLES[joinedRoute];
  }

  const firstSegment = segments[0];

  if (firstSegment === 'explore') {
    return getExploreTitle(segments[1]);
  }

  if (firstSegment === 'content') {
    return CONTENT_TYPE_TITLES[segments[1]] || STATIC_ROUTE_TITLES.content;
  }

  if (firstSegment === 'admin') {
    return getAdminTitle(segments[1]);
  }

  if (firstSegment === 'profile') {
    return buildProfilePageTitle(segments[1] || 'Profil', searchParams?.get('tab'));
  }

  return STATIC_ROUTE_TITLES[firstSegment] || 'Blackbox';
}
