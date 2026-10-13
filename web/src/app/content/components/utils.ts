// Content page utility functions

export const formatRuntime = (minutes: number | null, locale = 'en') => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (locale === 'tr') {
    return hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`;
  }

  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const formatCurrency = (amount: number, locale = 'en') => {
  if (!amount) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string, locale = 'en') => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(locale);
};

export const getLanguageName = (code: string, t?: any) => {
  if (t) {
    try {
      return t(`languages.${code}`) || code.toUpperCase();
    } catch (e) {
      // translation missing fallback
    }
  }

  const languages: Record<string, string> = {
    en: 'English',
    tr: 'Turkish',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    hi: 'Hindi',
  };
  return languages[code] || code.toUpperCase();
};

export const getPlatformIcon = (platformName: string) => {
  const icons: Record<string, string> = {
    // PC & Computer
    'PC (Microsoft Windows)': '🖥️',
    PC: '🖥️',
    Mac: '🍎',
    macOS: '🍎',
    Linux: '🐧',

    // PlayStation
    'PlayStation 5': '🔵',
    'PlayStation 4': '🎮',
    'PlayStation 3': '🎮',
    'PlayStation 2': '🎮',
    PlayStation: '🎮',
    PS5: '🔵',
    PS4: '🎮',
    PS3: '🎮',
    PS2: '🎮',
    'PS Vita': '📱',
    PSP: '🎯',

    // Xbox
    'Xbox Series X|S': '🟢',
    'Xbox Series X': '🟢',
    'Xbox Series S': '🟢',
    'Xbox One': '❎',
    'Xbox 360': '⭕',
    Xbox: '❌',

    // Nintendo
    'Nintendo Switch': '🔴',
    Switch: '🔴',
    'Wii U': '🎯',
    Wii: '🎯',
    'Nintendo 3DS': '🎮',
    'Nintendo DS': '🎮',
    'Game Boy Advance': '🎮',
    'Game Boy Color': '🎮',
    'Game Boy': '🎮',
    GameCube: '🟣',
    N64: '🎮',
    SNES: '🎮',
    NES: '🎮',

    // Mobile
    Android: '🤖',
    iOS: '🍏',
    Mobile: '📱',

    // Retro & Others
    'Sega Genesis': '🎮',
    Dreamcast: '🎮',
    Atari: '🕹️',
    Arcade: '🕹️',
    Web: '🌐',
    Browser: '🌐',
  };
  return icons[platformName] || '🎮';
};
