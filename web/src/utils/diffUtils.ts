import { AddContentFormData } from '@/app/add-content/types';

export interface DiffResult {
  key: string;
  label: string;
  oldValue?: any;
  newValue?: any;
  changeType: 'added' | 'removed' | 'modified';
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Başlık',
  originalTitle: 'Orijinal Başlık',
  alternativeTitles: 'Alternatif İsimler',
  description: 'Açıklama',
  releaseDate: 'Çıkış Tarihi',
  runtime: 'Süre',
  posterUrl: 'Afiş',
  backdropUrl: 'Arka Plan',
  status: 'Durum',
  isContinuing: 'Devam Ediyor mu?',
  genres: 'Türler',
  franchise: 'Seri',
  languages: 'Diller',
  themes: 'Temalar',
  moods: 'Modlar',
  ageRating: 'Yaş Sınırı',
  awards: 'Ödüller',
  budget: 'Bütçe',
  revenue: 'Hasılat',
  cast: 'Oyuncular',
  crew: 'Ekip',
  tvType: 'Dizi Tipi',
  inProduction: 'Yapım Aşamasında',
  firstAirDate: 'İlk Yayın Tarihi',
  lastAirDate: 'Son Yayın Tarihi',
  seasons: 'Sezonlar',
  isbn: 'ISBN',
  pageCount: 'Sayfa Sayısı',
  translators: 'Cevirmenler',
  bookPublications: 'Yayınlar',
  authors: 'Yazarlar',
  publisher: 'Yayıncı',
  gameModes: 'Oyun Modları',
  gameEngines: 'Oyun Motorları',
  perspectives: 'Kamera Açıları',
  developerCompanies: 'Geliştiriciler',
  publisherCompanies: 'Yayıncılar',
  studios: 'Stüdyolar',
  platforms: 'Platformlar',
  expansions: 'Genişletmeler',
  screenshots: 'Ekran Görüntüleri',
  trailerUrl: 'Fragman',
  reviewVideoUrl: 'İnceleme Videosu',
  gameplayVideoUrl: 'Oynanış Videosu',
  spotifyPlaylistUrl: 'Spotify',
  additionalRatingCategories: 'Puanlama kategorileri',
  similarContents: 'Benzer İçerikler',
  numberOfSeasons: 'Sezon Sayısı',
  numberOfEpisodes: 'Bölüm Sayısı',
  averageDuration: 'Ortalama Süre',
};

// Derinlemesine obje temizliği ve normalizasyonu
function cleanObject(obj: any): any {
  if (obj === null || obj === undefined || obj === '') return undefined;

  if (Array.isArray(obj)) {
    return obj.map(cleanObject).filter((item) => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      // Bu alanları karşılaştırmada yoksayıyoruz
      if (['__typename', 'createdAt', 'updatedAt', 'order', 'creditOrder'].includes(key)) {
        continue;
      }

      const val = cleanObject(obj[key]);

      if (val !== undefined) {
        // Backend'den gelen verileri frontend'in gönderdiği formata (payload) benzetiyoruz
        if (key === 'personId' && !obj.id) {
          cleaned['id'] = val;
        } else if (key === 'companyId' && !obj.id) {
          cleaned['id'] = val;
        } else if (key === 'person' && val?.name) {
          cleaned['name'] = val.name;
        } else if (key === 'company' && val?.name) {
          cleaned['name'] = val.name;
        } else {
          cleaned[key] = val;
        }
      }
    }

    // Eğer obje tamamen boşsa undefined dön (böylece gereksiz boş objeler farklılığa yol açmaz)
    if (Object.keys(cleaned).length === 0) return undefined;

    // Anahtarları her ihtimale karşı tekrar sırala ki JSON.stringify hep aynı çıktıyı üretsin
    const sortedCleaned: any = {};
    Object.keys(cleaned)
      .sort()
      .forEach((k) => {
        sortedCleaned[k] = cleaned[k];
      });
    return sortedCleaned;
  }

  return obj;
}

// Gelişmiş derinlik kontrolü
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  // null, undefined, "" are treated as equal here
  if (!a && !b) return true;
  if (a?.length === 0 && !b) return true;
  if (b?.length === 0 && !a) return true;

  const cleanA = cleanObject(a);
  const cleanB = cleanObject(b);

  if (cleanA === cleanB) return true;
  if (!cleanA && !cleanB) return true;

  if (Array.isArray(cleanA) && Array.isArray(cleanB)) {
    if (cleanA.length !== cleanB.length) return false;
    return JSON.stringify(cleanA) === JSON.stringify(cleanB);
  }

  if (
    typeof cleanA === 'object' &&
    typeof cleanB === 'object' &&
    cleanA !== null &&
    cleanB !== null
  ) {
    return JSON.stringify(cleanA) === JSON.stringify(cleanB);
  }

  return false;
}

export function compareFormData(
  original: Partial<AddContentFormData>,
  modified: Partial<AddContentFormData>,
  t?: (key: string, values?: any) => string
): DiffResult[] {
  const diffs: DiffResult[] = [];

  const keys = new Set([...Object.keys(original), ...Object.keys(modified)]);

  keys.forEach((k) => {
    const key = k as keyof AddContentFormData;
    // Bu alanları yoksayalım
    if (key === 'autoFillSourceId' || key === 'autoFillSource' || key === 'contentTypeId') return;

    const oldVal = original[key];
    const newVal = modified[key];

    if (!isEqual(oldVal, newVal)) {
      let changeType: 'added' | 'removed' | 'modified' = 'modified';

      // Eğer eskiden yoksa veya boşsa
      if ((!oldVal || (Array.isArray(oldVal) && oldVal.length === 0)) && newVal) {
        changeType = 'added';
      }
      // Eğer yeni değer yoksa veya boşsa
      else if (oldVal && (!newVal || (Array.isArray(newVal) && newVal.length === 0))) {
        changeType = 'removed';
      }

      diffs.push({
        key,
        label: t ? t(key) : FIELD_LABELS[key] || key,
        oldValue: oldVal,
        newValue: newVal,
        changeType,
      });
    }
  });

  return diffs;
}

// Sekmelere göre değişen alanları filtrelemek için gruplandırmalar
export const TAB_GROUPS: Record<string, string[]> = {
  basic: [
    'title',
    'originalTitle',
    'alternativeTitles',
    'description',
    'releaseDate',
    'runtime',
    'status',
    'isContinuing',
    'tvType',
    'inProduction',
    'firstAirDate',
    'lastAirDate',
    'isbn',
    'pageCount',
    'numberOfSeasons',
    'numberOfEpisodes',
    'averageDuration',
    'additionalRatingCategories',
  ],
  // Legacy combined group (kept for backward compat)
  media: [
    'posterUrl',
    'backdropUrl',
    'screenshots',
    'trailerUrl',
    'reviewVideoUrl',
    'gameplayVideoUrl',
    'spotifyPlaylistUrl',
  ],
  // Granular media sub-groups for per-tab display
  media_images: ['posterUrl', 'backdropUrl'],
  videos: ['trailerUrl', 'reviewVideoUrl', 'gameplayVideoUrl'],
  screenshots_tab: ['screenshots'],
  soundtrack: ['spotifyPlaylistUrl'],
  taxonomy: [
    'genres',
    'themes',
    'moods',
    'languages',
    'ageRating',
    'awards',
    'gameModes',
    'gameEngines',
    'perspectives',
    'platforms',
  ],
  crew: ['cast', 'crew', 'authors', 'translators'],
  companies: ['developerCompanies', 'publisherCompanies', 'studios', 'publisher'],
  relations: ['franchise', 'expansions', 'similarContents'],
  financial: ['budget', 'revenue'],
  seasons: ['seasons'],
  publications: ['bookPublications'],
};

export function getDiffForTab(diffs: DiffResult[], tab: string): DiffResult[] {
  const groupKeys = TAB_GROUPS[tab] || [];
  return diffs.filter((d) => groupKeys.includes(d.key));
}

export interface DiffDetailLine {
  type: 'added' | 'removed' | 'changed';
  text: string;
}

/**
 * Extract a human-readable name from various item shapes.
 */
function getItemName(item: any): string {
  if (!item) return '?';
  if (typeof item === 'string') {
    if (item.startsWith('http')) return item.split('/').pop() || 'URL';
    return item;
  }
  // Person with character (cast)
  if (item.name && item.character) {
    return `${item.name} (${item.character.trim().toLowerCase()})`;
  }
  // Person with role (crew)
  if (item.name && item.role) {
    const normalizedRole = item.role
      .split(',')
      .map((r: string) => r.trim().toLowerCase())
      .sort()
      .join(', ');
    return `${item.name} (${normalizedRole})`;
  }
  if (item.name) return item.name;
  if (item.title) return item.title;
  if (item.label) return item.label;
  // Season
  if (item.seasonNumber !== undefined && Array.isArray(item.episodes))
    return `Sezon ${item.seasonNumber}`;
  // Episode
  if (item.episodeNumber !== undefined) return `Bölüm ${item.episodeNumber}`;
  // Image / Screenshot
  if (item.imageUrl) return item.fileName || item.imageUrl.split('/').pop() || 'Görsel';
  if (item.posterUrl) return item.posterUrl.split('/').pop() || 'Afiş';
  if (item.backdropUrl) return item.backdropUrl.split('/').pop() || 'Arka Plan';
  if (item.profileUrl) return item.profileUrl.split('/').pop() || 'Profil Resmi';
  if (item.logoUrl) return item.logoUrl.split('/').pop() || 'Logo';

  return JSON.stringify(item).slice(0, 40);
}

/**
 * Generates detailed, human-readable change description lines for a diff.
 */
export function getDiffDetailLines(
  diff: DiffResult,
  t?: (key: string, values?: any) => string
): DiffDetailLine[] {
  const lines: DiffDetailLine[] = [];
  const { oldValue, newValue, changeType } = diff;

  if (typeof newValue !== 'object' && typeof oldValue !== 'object') {
    const formatValue = (val: any) => {
      if (typeof val === 'string') {
        if (val.startsWith('http')) return val.split('/').pop() || 'URL';
        if (val.startsWith('data:image/')) return 'Görsel (Base64)';
      }
      return String(val ?? '');
    };

    if (changeType === 'added') {
      lines.push({ type: 'added', text: formatValue(newValue) });
    } else if (changeType === 'removed') {
      lines.push({ type: 'removed', text: formatValue(oldValue) });
    } else {
      if (typeof oldValue === 'boolean' || typeof newValue === 'boolean') {
        lines.push({
          type: 'changed',
          text: `${oldValue ? (t ? t('yes') : 'Evet') : t ? t('no') : 'Hayır'} → ${newValue ? (t ? t('yes') : 'Evet') : t ? t('no') : 'Hayır'}`,
        });
      } else {
        const oldStr = formatValue(oldValue);
        const newStr = formatValue(newValue);
        lines.push({
          type: 'changed',
          text: t
            ? t('yesToYes', { old: oldStr || '-', new: newStr || '-' })
            : `${oldStr || '-'} → ${newStr || '-'}`,
        });
      }
    }
    return lines;
  }

  // Single object (franchise, ageRating, publisher)
  if (!Array.isArray(oldValue) && !Array.isArray(newValue)) {
    if (changeType === 'added') {
      lines.push({ type: 'added', text: getItemName(newValue) });
    } else if (changeType === 'removed') {
      lines.push({ type: 'removed', text: getItemName(oldValue) });
    } else {
      const oldName = getItemName(oldValue);
      const newName = getItemName(newValue);
      if (oldName !== newName) {
        lines.push({
          type: 'changed',
          text: t ? t('yesToYes', { old: oldName, new: newName }) : `${oldName} → ${newName}`,
        });
      } else {
        lines.push({
          type: 'changed',
          text: t ? t('detailsChanged', { name: oldName }) : `${oldName} (detaylar değişti)`,
        });
      }
    }
    return lines;
  }

  // Özel durum: seasons (sezon ve bölümlerin detaylı farkı)
  if (diff.key === 'seasons') {
    const oldSeasons: any[] = Array.isArray(oldValue) ? oldValue : [];
    const newSeasons: any[] = Array.isArray(newValue) ? newValue : [];

    const oldSeasonsMap = new Map(oldSeasons.map((s) => [s.seasonNumber, s]));
    const newSeasonsMap = new Map(newSeasons.map((s) => [s.seasonNumber, s]));

    const allSeasonNumbers = Array.from(
      new Set([...oldSeasonsMap.keys(), ...newSeasonsMap.keys()])
    ).sort((a, b) => a - b);

    for (const seasonNumber of allSeasonNumbers) {
      const oldSeason = oldSeasonsMap.get(seasonNumber);
      const newSeason = newSeasonsMap.get(seasonNumber);
      const seasonName =
        newSeason?.name ||
        oldSeason?.name ||
        (t ? t('seasonName', { number: seasonNumber }) : `Sezon ${seasonNumber}`);

      if (!oldSeason && newSeason) {
        lines.push({
          type: 'added',
          text: t
            ? t('seasonAdded', { name: seasonName, count: newSeason.episodes?.length || 0 })
            : `${seasonName} eklendi (${newSeason.episodes?.length || 0} bölüm)`,
        });
      } else if (oldSeason && !newSeason) {
        lines.push({
          type: 'removed',
          text: t ? t('seasonRemoved', { name: seasonName }) : `${seasonName} silindi`,
        });
      } else if (oldSeason && newSeason) {
        // Sezon alanlarını karşılaştır (bölümler hariç)
        const { episodes: oldEpisodes, ...oldFields } = oldSeason;
        const { episodes: newEpisodes, ...newFields } = newSeason;

        if (!isEqual(oldFields, newFields)) {
          lines.push({
            type: 'changed',
            text: t
              ? t('seasonDetailsChanged', { name: seasonName })
              : `${seasonName} detayları değişti`,
          });
        }

        // Bölümleri karşılaştır
        const oldEps: any[] = Array.isArray(oldEpisodes) ? oldEpisodes : [];
        const newEps: any[] = Array.isArray(newEpisodes) ? newEpisodes : [];
        const oldEpsMap = new Map(oldEps.map((e) => [e.episodeNumber, e]));
        const newEpsMap = new Map(newEps.map((e) => [e.episodeNumber, e]));
        const allEpsNumbers = Array.from(new Set([...oldEpsMap.keys(), ...newEpsMap.keys()])).sort(
          (a, b) => a - b
        );

        const addedEpNames: string[] = [];
        const removedEpNames: string[] = [];
        const changedEpNames: string[] = [];

        for (const epNum of allEpsNumbers) {
          const oldEp = oldEpsMap.get(epNum);
          const newEp = newEpsMap.get(epNum);
          const epName = t ? t('episodeFormat', { number: epNum }) : `Bölüm ${epNum}`;
          if (!oldEp && newEp) addedEpNames.push(epName);
          else if (oldEp && !newEp) removedEpNames.push(epName);
          else if (!isEqual(oldEp, newEp)) changedEpNames.push(epName);
        }

        for (const name of addedEpNames.slice(0, 5)) {
          lines.push({
            type: 'added',
            text: t
              ? t('itemAdded', { name: `${seasonName} ${name}` })
              : `${seasonName} ${name} eklendi`,
          });
        }
        if (addedEpNames.length > 5) {
          lines.push({
            type: 'added',
            text: t
              ? t('moreAdded', { name: seasonName, count: addedEpNames.length - 5 })
              : `${seasonName}: +${addedEpNames.length - 5} bölüm daha eklendi`,
          });
        }

        for (const name of removedEpNames.slice(0, 5)) {
          lines.push({
            type: 'removed',
            text: t
              ? t('itemRemoved', { name: `${seasonName} ${name}` })
              : `${seasonName} ${name} silindi`,
          });
        }
        if (removedEpNames.length > 5) {
          lines.push({
            type: 'removed',
            text: t
              ? t('moreRemoved', { name: seasonName, count: removedEpNames.length - 5 })
              : `${seasonName}: -${removedEpNames.length - 5} bölüm daha silindi`,
          });
        }

        for (const name of changedEpNames.slice(0, 5)) {
          lines.push({
            type: 'changed',
            text: t
              ? t('itemChanged', { name: `${seasonName} ${name}` })
              : `${seasonName} ${name} değişti`,
          });
        }
        if (changedEpNames.length > 5) {
          lines.push({
            type: 'changed',
            text: t
              ? t('moreChanged', { name: seasonName, count: changedEpNames.length - 5 })
              : `${seasonName}: ${changedEpNames.length - 5} bölüm daha değişti`,
          });
        }
      }
    }
    return lines;
  }

  // Array comparison: find added and removed items
  const oldArr: any[] = Array.isArray(oldValue) ? oldValue : [];
  const newArr: any[] = Array.isArray(newValue) ? newValue : [];

  // For arrays of named items, compare by name
  const oldNames = oldArr.map(getItemName);
  const newNames = newArr.map(getItemName);

  const addedNames = newNames.filter((n) => !oldNames.includes(n));
  const removedNames = oldNames.filter((n) => !newNames.includes(n));

  // If there are named additions/removals, show them
  for (const name of addedNames.slice(0, 8)) {
    lines.push({ type: 'added', text: name });
  }
  if (addedNames.length > 8) {
    lines.push({
      type: 'added',
      text: t
        ? t('andMore', { count: addedNames.length - 8 })
        : `+${addedNames.length - 8} daha...`,
    });
  }

  for (const name of removedNames.slice(0, 8)) {
    lines.push({ type: 'removed', text: name });
  }
  if (removedNames.length > 8) {
    lines.push({
      type: 'removed',
      text: t
        ? t('andMore', { count: removedNames.length - 8 })
        : `+${removedNames.length - 8} daha...`,
    });
  }

  // If sizes changed but no name-level diffs detected (e.g. screenshots)
  if (lines.length === 0 && oldArr.length !== newArr.length) {
    lines.push({
      type: 'changed',
      text: t
        ? t('itemsCountChanged', { old: oldArr.length, new: newArr.length })
        : `${oldArr.length} → ${newArr.length} öğe`,
    });
  }

  // If same size, same names but content changed
  if (lines.length === 0 && oldArr.length === newArr.length) {
    lines.push({
      type: 'changed',
      text: t
        ? t('itemsDetailsChanged', { count: newArr.length })
        : `${newArr.length} öğe (detaylar değişti)`,
    });
  }

  return lines;
}
