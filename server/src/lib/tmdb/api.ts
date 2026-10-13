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
  TmdbDetailData
} from './types';
import { logger } from '../logger';
import { normalizeThemeName } from '../themeNormalizer';
import {
  tmdbFetch,
  mergeCrewByPerson,
  mapProductionCompanies,
  pickPreferredMovieCertification,
  pickPreferredTvCertification
} from './helpers';

// ─── Public API ───

/**
 * TMDB'de film veya dizi arar
 */
export async function searchTmdb(
  query: string,
  type: string,
  year?: number,
  page = 1,
): Promise<TmdbSearchItem[]> {
  logger.info(
    `[TmdbFetcher] Searching TMDB: query="${query}", type="${type}", page=${page}${year ? `, year=${year}` : ""}`,
  );

  const endpoint = type === "tv" ? "/search/tv" : "/search/movie";
  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-US",
    page: String(Math.max(1, page)),
  });

  // Add year parameter for better matching
  if (year) {
    params.set(type === "tv" ? "first_air_date_year" : "year", String(year));
  }

  try {
    const data = await tmdbFetch<{ results: TmdbRawSearchResult[] }>(
      `${endpoint}?${params}`,
    );

    const results: TmdbSearchItem[] = (data.results || [])
      .map((item) => ({
        tmdbId: item.id,
        title: item.title || item.name || "Unknown",
        originalTitle: item.original_title || item.original_name,
        overview: item.overview,
        posterPath: item.poster_path
          ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
          : undefined,
        releaseDate: item.release_date || item.first_air_date,
        voteAverage: item.vote_average,
        mediaType: type === "tv" ? "tv" : "movie",
      }));

    logger.success(
      `[TmdbFetcher] Search returned ${results.length} results for "${query}"`,
    );
    return results;
  } catch (error) {
    logger.error(`[TmdbFetcher] Search failed for "${query}"`, error);
    throw error;
  }
}

/**
 * TMDB'den kişi detaylarını getirir (biography, birthday vs.)
 */
export async function fetchTmdbPersonDetails(
  personId: number,
): Promise<TmdbPersonDetail> {
  logger.info(`[TmdbFetcher] Fetching person details for personId=${personId}`);
  try {
    const data = await tmdbFetch<any>(`/person/${personId}?language=en-US`);
    return {
      id: data.id,
      name: data.name,
      biography: data.biography,
      birthday: data.birthday,
      deathday: data.deathday,
      gender: data.gender,
      placeOfBirth: data.place_of_birth,
      profilePath: data.profile_path
        ? `https://image.tmdb.org/t/p/w185${data.profile_path}`
        : undefined,
    };
  } catch (error) {
    logger.error(
      `[TmdbFetcher] Person detail fetch failed for personId=${personId}`,
      error,
    );
    throw error;
  }
}

/**
 * TMDB'den kişi arar ve ilk sonucun ID'sini döner
 */
export async function searchTmdbPerson(query: string): Promise<number | null> {
  logger.info(`[TmdbFetcher] Searching person for query="${query}"`);
  try {
    const data = await tmdbFetch<any>(
      `/search/person?query=${encodeURIComponent(query)}&language=en-US&page=1`,
    );
    if (data.results && data.results.length > 0) {
      // Return the ID of the most popular matching person
      return data.results[0].id;
    }
    return null;
  } catch (error) {
    logger.error(`[TmdbFetcher] Person search failed for "${query}"`, error);
    return null;
  }
}

/**
 * TMDB'den birden fazla kişinin detayını paralel olarak getirir.
 * TMDB rate limitlerine takılmamak için concurrency limitli çalışır.
 */
export async function fetchTmdbPersonDetailsBatch(
  personIds: number[],
  concurrencyLimit = 5,
): Promise<Map<number, TmdbPersonDetail>> {
  const results = new Map<number, TmdbPersonDetail>();
  if (!personIds || personIds.length === 0) return results;

  // Deduplicate IDs
  const uniqueIds = Array.from(new Set(personIds));
  logger.info(
    `[TmdbFetcher] Fetching person details batch for ${uniqueIds.length} unique persons`,
  );

  // Simple concurrency control
  for (let i = 0; i < uniqueIds.length; i += concurrencyLimit) {
    const chunk = uniqueIds.slice(i, i + concurrencyLimit);

    await Promise.allSettled(
      chunk.map(async (id) => {
        try {
          const detail = await fetchTmdbPersonDetails(id);
          results.set(id, detail);
          // Slight delay between requests to be safe with TMDB limits
          await new Promise((res) => setTimeout(res, 40));
        } catch (error) {
          logger.warn(
            `[TmdbFetcher] Failed to fetch batch detail for personId=${id}`,
          );
        }
      }),
    );
  }

  return results;
}

/**
 * TMDB'den film detaylarını getirir (credits, videos dahil)
 */
export async function fetchTmdbMovieDetails(
  tmdbId: number,
): Promise<TmdbDetailData> {
  logger.info(`[TmdbFetcher] Fetching movie details for tmdbId=${tmdbId}`);

  try {
    const data = await tmdbFetch<TmdbRawMovieDetail>(
      `/movie/${tmdbId}?append_to_response=credits,videos,keywords,release_dates&language=en-US`,
    );

    const topCast = (data.credits?.cast || []);
    const mergedCrew = mergeCrewByPerson(data.credits?.crew || []);
    const topCrew = mergedCrew;

    // Fetch full person details for top cast and crew to enhance frontend autofill
    const personIdsToFetch = [
      ...topCast.map((c) => c.id),
      ...topCrew.map((c) => c.id),
    ];

    // Batch fetch details
    const personDetailsMap =
      await fetchTmdbPersonDetailsBatch(personIdsToFetch);

    const detail: TmdbDetailData = {
      tmdbId: data.id,
      title: data.title,
      originalTitle: data.original_title,
      overview: data.overview,
      releaseDate: data.release_date,
      runtime: data.runtime,
      posterPath: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : undefined,
      backdropPath: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : undefined,
      status: data.status,
      voteAverage: data.vote_average,
      budget: data.budget,
      revenue: data.revenue,
      mediaType: "movie",
      genres: data.genres,
      spokenLanguages: data.spoken_languages?.map((l) => ({
        iso6391: l.iso_639_1,
        englishName: l.english_name,
        name: l.name,
      })),
      cast: data.credits?.cast?.map((c) => {
        const fullDetails = personDetailsMap.get(c.id);
        return {
          id: c.id,
          name: fullDetails?.name || c.name,
          character: c.character,
          profilePath:
            fullDetails?.profilePath ||
            (c.profile_path
              ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
              : undefined),
          order: c.order,
          gender: fullDetails?.gender || c.gender,
          popularity: c.popularity,
          biography: fullDetails?.biography,
          birthday: fullDetails?.birthday,
          deathday: fullDetails?.deathday,
          placeOfBirth: fullDetails?.placeOfBirth,
        };
      }),
      crew: mergedCrew.map((c) => {
        const fullDetails = personDetailsMap.get(c.id);
        return {
          ...c,
          name: fullDetails?.name || c.name,
          profilePath: fullDetails?.profilePath || c.profilePath,
          gender: fullDetails?.gender || c.gender,
          biography: fullDetails?.biography,
          birthday: fullDetails?.birthday,
          deathday: fullDetails?.deathday,
          placeOfBirth: fullDetails?.placeOfBirth,
        };
      }),
      videos: data.videos?.results
        ?.filter((v) => v.site === "YouTube")
        .map((v) => ({
          key: v.key,
          name: v.name,
          site: v.site,
          type: v.type,
          official: v.official,
        })),
      keywords: ((data.keywords as any)?.results || (data.keywords as any)?.keywords || []).map(
        (k: any) => ({ id: k.id, name: normalizeThemeName(k.name) }),
      ),
      productionCompanies: mapProductionCompanies(data.production_companies),
      franchise: data.belongs_to_collection
        ? {
            tmdbCollectionId: data.belongs_to_collection.id,
            name: data.belongs_to_collection.name,
            posterPath: data.belongs_to_collection.poster_path
              ? `https://image.tmdb.org/t/p/w500${data.belongs_to_collection.poster_path}`
              : undefined,
            backdropPath: data.belongs_to_collection.backdrop_path
              ? `https://image.tmdb.org/t/p/w1280${data.belongs_to_collection.backdrop_path}`
              : undefined,
          }
        : undefined,
      ageRating: pickPreferredMovieCertification(data.release_dates),
    };

    logger.success(
      `[TmdbFetcher] Movie details fetched: "${detail.title}" (genres: ${detail.genres?.length || 0}, cast: ${detail.cast?.length || 0}, crew: ${detail.crew?.length || 0}, keywords: ${detail.keywords?.length || 0})`,
    );
    return detail;
  } catch (error) {
    logger.error(
      `[TmdbFetcher] Movie detail fetch failed for tmdbId=${tmdbId}`,
      error,
    );
    throw error;
  }
}

/**
 * TMDB'den bir movie collection detayını getirir.
 */
export async function fetchTmdbCollectionDetails(
  collectionId: number,
): Promise<TmdbCollectionDetailData> {
  logger.info(
    `[TmdbFetcher] Fetching collection details for collectionId=${collectionId}`,
  );

  try {
    const data = await tmdbFetch<TmdbRawCollectionDetail>(
      `/collection/${collectionId}?language=en-US`,
    );

    const detail: TmdbCollectionDetailData = {
      tmdbCollectionId: data.id,
      name: data.name,
      posterPath: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : undefined,
      backdropPath: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : undefined,
      parts: (data.parts || []).map((part) => ({
        tmdbId: part.id,
        title: part.title,
        originalTitle: part.original_title,
        releaseDate: part.release_date,
        posterPath: part.poster_path
          ? `https://image.tmdb.org/t/p/w500${part.poster_path}`
          : undefined,
        backdropPath: part.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${part.backdrop_path}`
          : undefined,
      })),
    };

    logger.success(
      `[TmdbFetcher] Collection details fetched: "${detail.name}" (${detail.parts.length} parts)`,
    );
    return detail;
  } catch (error) {
    logger.error(
      `[TmdbFetcher] Collection detail fetch failed for collectionId=${collectionId}`,
      error,
    );
    throw error;
  }
}

/**
 * TMDB'den sadece filmin franchise/collection bilgisini getirir.
 * Backfill scriptleri gibi hafif kullanım senaryoları için uygundur.
 */
export async function fetchTmdbMovieFranchise(
  tmdbId: number,
): Promise<TmdbFranchiseItem | undefined> {
  logger.info(`[TmdbFetcher] Fetching movie franchise for tmdbId=${tmdbId}`);

  try {
    const data = await tmdbFetch<TmdbRawMovieDetail>(
      `/movie/${tmdbId}?language=en-US`,
    );

    if (!data.belongs_to_collection) {
      return undefined;
    }

    return {
      tmdbCollectionId: data.belongs_to_collection.id,
      name: data.belongs_to_collection.name,
      posterPath: data.belongs_to_collection.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.belongs_to_collection.poster_path}`
        : undefined,
      backdropPath: data.belongs_to_collection.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.belongs_to_collection.backdrop_path}`
        : undefined,
    };
  } catch (error) {
    logger.error(
      `[TmdbFetcher] Movie franchise fetch failed for tmdbId=${tmdbId}`,
      error,
    );
    throw error;
  }
}

/**
 * TMDB'den dizi detaylarını getirir (credits, videos, seasons dahil)
 */
export async function fetchTmdbTvDetails(
  tmdbId: number,
): Promise<TmdbDetailData> {
  logger.info(`[TmdbFetcher] Fetching TV details for tmdbId=${tmdbId}`);

  try {
    const data = await tmdbFetch<TmdbRawTvDetail>(
      `/tv/${tmdbId}?append_to_response=videos,keywords,content_ratings&language=en-US`,
    );

    // Aggregate credits endpoint returns complete cast/crew across all episodes
    const aggregateCredits = await tmdbFetch<TmdbRawAggregateCredits>(
      `/tv/${tmdbId}/aggregate_credits?language=en-US`,
    );

    // Her sezon için bölüm detaylarını çek
    const seasonsWithEpisodes: TmdbSeasonItem[] = [];
    if (data.seasons && data.seasons.length > 0) {
      // Tüm sezonları dahil et (Season 0 dahil)
      const allSeasons = data.seasons;

      logger.debug(
        `[TmdbFetcher] Fetching episode details for ${allSeasons.length} seasons`,
      );

      for (const season of allSeasons) {
        try {
          const seasonDetail = await tmdbFetch<TmdbRawSeasonDetail>(
            `/tv/${tmdbId}/season/${season.season_number}?language=en-US`,
          );

          seasonsWithEpisodes.push({
            seasonNumber: season.season_number,
            name: season.name,
            airDate: season.air_date,
            episodeCount: season.episode_count,
            overview: season.overview,
            posterPath: season.poster_path
              ? `https://image.tmdb.org/t/p/w300${season.poster_path}`
              : undefined,
            episodes: seasonDetail.episodes?.map((ep) => ({
              episodeNumber: ep.episode_number,
              name: ep.name,
              airDate: ep.air_date,
              overview: ep.overview,
              runtime: ep.runtime,
              stillPath: ep.still_path
                ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                : undefined,
            })),
          });
        } catch (err) {
          logger.warn(
            `[TmdbFetcher] Failed to fetch season ${season.season_number} episodes`,
            err,
          );
          // Sezon bilgisi yine de ekle, bölüm detayları olmadan
          seasonsWithEpisodes.push({
            seasonNumber: season.season_number,
            name: season.name,
            airDate: season.air_date,
            episodeCount: season.episode_count,
            overview: season.overview,
            posterPath: season.poster_path
              ? `https://image.tmdb.org/t/p/w300${season.poster_path}`
              : undefined,
          });
        }
      }
    }

    const avgRuntime =
      data.episode_run_time && data.episode_run_time.length > 0
        ? Math.round(
            data.episode_run_time.reduce((a, b) => a + b, 0) /
              data.episode_run_time.length,
          )
        : undefined;

    const topCast = (aggregateCredits.cast || []);
    const mergedCrew = mergeCrewByPerson(
      (aggregateCredits.crew || []).flatMap((c) =>
        (c.jobs || [{ job: undefined }]).map((j) => ({
          id: c.id,
          name: c.name,
          job: j.job,
          department: c.department,
          profile_path: c.profile_path,
          gender: c.gender,
          popularity: c.popularity,
        })),
      ),
    );
    const topCrew = mergedCrew;

    // Fetch full person details for top cast and crew to enhance frontend autofill
    const personIdsToFetch = [
      ...topCast.map((c) => c.id),
      ...topCrew.map((c) => c.id),
    ];

    // Batch fetch details
    const personDetailsMap =
      await fetchTmdbPersonDetailsBatch(personIdsToFetch);

    const detail: TmdbDetailData = {
      tmdbId: data.id,
      title: data.name,
      originalTitle: data.original_name,
      overview: data.overview,
      releaseDate: data.first_air_date,
      runtime: avgRuntime,
      posterPath: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : undefined,
      backdropPath: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : undefined,
      status: data.status,
      voteAverage: data.vote_average,
      mediaType: "tv",
      genres: data.genres,
      spokenLanguages: data.spoken_languages?.map((l) => ({
        iso6391: l.iso_639_1,
        englishName: l.english_name,
        name: l.name,
      })),
      cast: aggregateCredits.cast?.map((c) => {
        const fullDetails = personDetailsMap.get(c.id);
        return {
          id: c.id,
          name: fullDetails?.name || c.name,
          character:
            c.roles
              ?.map((r) => r.character)
              .filter(Boolean)
              .join(", ") || undefined,
          profilePath:
            fullDetails?.profilePath ||
            (c.profile_path
              ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
              : undefined),
          order: c.order,
          gender: fullDetails?.gender || c.gender,
          popularity: c.popularity,
          biography: fullDetails?.biography,
          birthday: fullDetails?.birthday,
          deathday: fullDetails?.deathday,
          placeOfBirth: fullDetails?.placeOfBirth,
        };
      }),
      crew: mergedCrew.map((c) => {
        const fullDetails = personDetailsMap.get(c.id);
        return {
          ...c,
          name: fullDetails?.name || c.name,
          profilePath: fullDetails?.profilePath || c.profilePath,
          gender: fullDetails?.gender || c.gender,
          biography: fullDetails?.biography,
          birthday: fullDetails?.birthday,
          deathday: fullDetails?.deathday,
          placeOfBirth: fullDetails?.placeOfBirth,
        };
      }),
      videos: data.videos?.results
        ?.filter((v) => v.site === "YouTube")
        .map((v) => ({
          key: v.key,
          name: v.name,
          site: v.site,
          type: v.type,
          official: v.official,
        })),
      keywords: ((data.keywords as any)?.results || (data.keywords as any)?.keywords || []).map(
        (k: any) => ({ id: k.id, name: normalizeThemeName(k.name) }),
      ),
      productionCompanies: mapProductionCompanies(data.production_companies),
      ageRating: pickPreferredTvCertification(data.content_ratings),
      // TV-specific
      firstAirDate: data.first_air_date,
      lastAirDate: data.last_air_date,
      inProduction: data.in_production,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      seasons: seasonsWithEpisodes,
    };

    logger.success(
      `[TmdbFetcher] TV details fetched: "${detail.title}" (seasons: ${seasonsWithEpisodes.length}, cast: ${detail.cast?.length || 0}, crew: ${detail.crew?.length || 0}, keywords: ${detail.keywords?.length || 0})`,
    );
    return detail;
  } catch (error) {
    logger.error(
      `[TmdbFetcher] TV detail fetch failed for tmdbId=${tmdbId}`,
      error,
    );
    throw error;
  }
}

// ─── Lightweight studio fetcher ───

/**
 * TMDB'den sadece filmin/dizinin production_companies bilgisini getirir.
 * Backfill scriptleri gibi hafif kullanım senaryoları için uygundur.
 * Credits, videos, keywords gibi ağır verileri çekmez.
 */
export async function fetchTmdbProductionCompanies(
  tmdbId: number,
  type: "movie" | "tv",
): Promise<TmdbCompanyItem[]> {
  const endpoint = type === "tv" ? "tv" : "movie";
  logger.info(
    `[TmdbFetcher] Fetching production companies for ${endpoint} tmdbId=${tmdbId}`,
  );

  try {
    const data = await tmdbFetch<{ production_companies?: Array<{ id: number; name: string; logo_path?: string | null; origin_country?: string }> }>(
      `/${endpoint}/${tmdbId}?language=en-US`,
    );

    return mapProductionCompanies(data.production_companies) || [];
  } catch (error) {
    logger.error(
      `[TmdbFetcher] Production companies fetch failed for ${endpoint} tmdbId=${tmdbId}`,
      error,
    );
    throw error;
  }
}

// ─── Image browsing ───

interface TmdbRawImagesResponse {
  id: number;
  posters?: Array<{
    file_path: string;
    width: number;
    height: number;
    vote_average: number;
    iso_639_1?: string;
  }>;
  backdrops?: Array<{
    file_path: string;
    width: number;
    height: number;
    vote_average: number;
    iso_639_1?: string;
  }>;
}

export interface ContentImageItem {
  url: string;
  width: number;
  height: number;
  voteAverage?: number;
  language?: string;
}

export interface ContentImagesResult {
  posters: ContentImageItem[];
  backdrops: ContentImageItem[];
}

/**
 * TMDB'den film veya dizi için tüm poster ve backdrop görselleri çeker
 */
export async function fetchTmdbImages(
  tmdbId: number,
  type: "movie" | "tv",
): Promise<ContentImagesResult> {
  const endpoint = type === "tv" ? "tv" : "movie";
  logger.info(`[TmdbFetcher] Fetching images for ${endpoint} tmdbId=${tmdbId}`);

  try {
    const data = await tmdbFetch<TmdbRawImagesResponse>(
      `/${endpoint}/${tmdbId}/images`,
    );

    const posters = (data.posters || [])
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 20)
      .map((p) => ({
        url: `https://image.tmdb.org/t/p/w500${p.file_path}`,
        width: p.width,
        height: p.height,
        voteAverage: p.vote_average,
        language: p.iso_639_1 || undefined,
      }));

    const backdrops = (data.backdrops || [])
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 20)
      .map((b) => ({
        url: `https://image.tmdb.org/t/p/w1280${b.file_path}`,
        width: b.width,
        height: b.height,
        voteAverage: b.vote_average,
        language: b.iso_639_1 || undefined,
      }));

    logger.success(
      `[TmdbFetcher] Images fetched: ${posters.length} posters, ${backdrops.length} backdrops`,
    );
    return { posters, backdrops };
  } catch (error) {
    logger.error(
      `[TmdbFetcher] Image fetch failed for ${endpoint}/${tmdbId}`,
      error,
    );
    throw error;
  }
}
