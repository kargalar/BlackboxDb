import type { LocalizedContentText } from "../contentTranslations";
import { normalizeLanguage } from "../requestLanguage";
import { tmdbFetch } from "./helpers";

export interface TmdbTranslationsResponse {
  translations?: Array<{
    iso_639_1: string;
    iso_3166_1: string;
    data?: { title?: string; name?: string; overview?: string };
  }>;
}

const preferredRegion: Record<string, string> = {
  en: "US", zh: "CN", hi: "IN", es: "ES", ar: "SA", fr: "FR", bn: "BD",
  pt: "BR", id: "ID", ur: "PK", ru: "RU", de: "DE", ja: "JP", pcm: "NG",
  arz: "EG", tr: "TR",
};

function tmdbLanguage(value?: string) {
  const code = value?.toLowerCase();
  return code && /^[a-z]{2,3}$/.test(code) && code !== "xx" ? normalizeLanguage(code) ?? code : undefined;
}

export function mapTmdbTranslations(
  response?: TmdbTranslationsResponse,
  original?: { language?: string; title?: string },
): LocalizedContentText[] {
  const translations = new Map<string, LocalizedContentText>();
  const entries = [...(response?.translations ?? [])].sort((a, b) => {
    const rank = (entry: typeof a) => Number(entry.iso_3166_1 !== preferredRegion[entry.iso_639_1]);
    return rank(a) - rank(b) || a.iso_3166_1.localeCompare(b.iso_3166_1);
  });
  for (const entry of entries) {
    const language = tmdbLanguage(entry.iso_639_1);
    if (!language) continue;
    const title = (entry.data?.title || entry.data?.name)?.trim();
    const description = entry.data?.overview?.trim();
    if (!title && !description) continue;
    const row = translations.get(language) ?? { language };
    if (!row.title && title && [...title].length <= 500) row.title = title;
    if (!row.description && description) row.description = description;
    if (row.title || row.description) translations.set(language, row);
  }
  const originalLanguage = tmdbLanguage(original?.language);
  const originalTitle = original?.title?.trim();
  if (originalLanguage && originalTitle && [...originalTitle].length <= 500) {
    const row = translations.get(originalLanguage) ?? { language: originalLanguage };
    if (!row.title) row.title = originalTitle;
    translations.set(originalLanguage, row);
  }
  return [...translations.values()];
}

export async function fetchTmdbTranslations(id: number, media: "movie" | "tv") {
  const response = await tmdbFetch<{
    translations?: TmdbTranslationsResponse;
    original_language?: string;
    original_title?: string;
    original_name?: string;
  }>(
    `/${media}/${id}?append_to_response=translations&language=en-US`, AbortSignal.timeout(12_000),
  );
  return mapTmdbTranslations(response.translations, {
    language: response.original_language,
    title: response.original_title ?? response.original_name,
  });
}
