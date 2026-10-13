import {
  TmdbRawSearchResult,
  TmdbRawMovieDetail,
  TmdbRawCollectionDetail,
  TmdbRawTvDetail,
  TmdbRawAggregateCredits,
  TmdbRawSeasonDetail,
  TmdbSearchItem,
  TmdbGenreItem,
  TmdbCastItem,
  TmdbCrewItem,
  TmdbLanguageItem,
  TmdbVideoItem,
  TmdbEpisodeItem,
  TmdbSeasonItem,
  TmdbKeywordItem,
  TmdbCompanyItem,
  TmdbFranchiseItem,
  TmdbCollectionPartItem,
  TmdbCollectionDetailData,
  TmdbPersonDetail,
  TmdbDetailData,
} from "./types";
import { logger } from "../logger";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const TMDB_HEADERS = {
  Authorization: `Bearer ${TMDB_API_KEY}`,
  "Content-Type": "application/json",
};

// ─── Fetch helpers ───

/**
 * Aynı kişinin birden fazla crew kaydını tek bir kayıtta birleştirir.
 * Örn: Christopher Nolan (Director) + Christopher Nolan (Producer) → Christopher Nolan (Director, Producer)
 */
export function mergeCrewByPerson(
  rawCrew: Array<{
    id: number;
    name: string;
    job?: string;
    department?: string;
    profile_path?: string;
    gender?: number;
    popularity?: number;
  }>,
): TmdbCrewItem[] {
  const personMap = new Map<
    number,
    {
      id: number;
      name: string;
      jobs: string[];
      department?: string;
      profilePath?: string;
      gender?: number;
      popularity?: number;
    }
  >();

  for (const c of rawCrew) {
    const existing = personMap.get(c.id);
    if (existing) {
      // Aynı kişi → rolünü ekle (tekrar etmiyorsa)
      if (c.job && !existing.jobs.includes(c.job)) {
        existing.jobs.push(c.job);
      }
      // Daha yüksek popularity varsa güncelle
      if (
        c.popularity &&
        (!existing.popularity || c.popularity > existing.popularity)
      ) {
        existing.popularity = c.popularity;
      }
    } else {
      personMap.set(c.id, {
        id: c.id,
        name: c.name,
        jobs: c.job ? [c.job] : [],
        department: c.department,
        profilePath: c.profile_path
          ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
          : undefined,
        gender: c.gender,
        popularity: c.popularity,
      });
    }
  }

  return Array.from(personMap.values()).map((p) => ({
    id: p.id,
    name: p.name,
    job: p.jobs.join(", "),
    department: p.department,
    profilePath: p.profilePath,
    gender: p.gender,
    popularity: p.popularity,
  }));
}

export function mapProductionCompanies(
  companies?: Array<{
    id: number;
    name: string;
    logo_path?: string | null;
    origin_country?: string;
  }>,
): TmdbCompanyItem[] | undefined {
  if (!companies?.length) return undefined;

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    logoPath: company.logo_path
      ? `https://image.tmdb.org/t/p/w185${company.logo_path}`
      : undefined,
    originCountry: company.origin_country,
  }));
}

export function normalizeAgeRating(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function pickPreferredMovieCertification(
  releaseDates?: TmdbRawMovieDetail["release_dates"],
): string | undefined {
  const results = releaseDates?.results || [];
  const preferred = [
    ...results.filter((item) => item.iso_3166_1 === "US"),
    ...results.filter((item) => item.iso_3166_1 !== "US"),
  ];

  for (const item of preferred) {
    for (const release of item.release_dates || []) {
      const certification = normalizeAgeRating(release.certification);
      if (certification) {
        return certification;
      }
    }
  }

  return undefined;
}

export function pickPreferredTvCertification(
  contentRatings?: TmdbRawTvDetail["content_ratings"],
): string | undefined {
  const results = contentRatings?.results || [];
  const preferred = [
    ...results.filter((item) => item.iso_3166_1 === "US"),
    ...results.filter((item) => item.iso_3166_1 !== "US"),
  ];

  for (const item of preferred) {
    const rating = normalizeAgeRating(item.rating);
    if (rating) {
      return rating;
    }
  }

  return undefined;
}

export async function tmdbFetch<T>(path: string): Promise<T> {
  const url = `${TMDB_BASE_URL}${path}`;
  logger.debug(`[TmdbFetcher] Fetching: ${url}`);

  const response = await fetch(url, { headers: TMDB_HEADERS });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    logger.error(`[TmdbFetcher] API error ${response.status}: ${errorText}`);
    throw new Error(
      `TMDB API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}
