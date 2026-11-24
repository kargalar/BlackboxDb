import { tmdbFetch } from "./tmdb/helpers";
import { TmdbRawTvDetail, TmdbRawSeasonDetail } from "./tmdb/types";
import { GraphQLContext } from "../context";
import { inferNormalizedContentStatus } from "./contentStatus";

const date = (value?: string | null) => value ? new Date(value) : null;

export async function syncTvSeasons(prisma: GraphQLContext["prisma"], id: string, tmdbId: number) {
  const tv = await tmdbFetch<TmdbRawTvDetail>(`/tv/${tmdbId}?language=en-US`);
  if (!Array.isArray(tv.seasons)) throw new Error("TMDB sezon listesi alınamadı");
  // Fetch all seasons before changing anything; a partial response must not overwrite data.
  const seasons = await Promise.all(tv.seasons.map(async season => ({
    ...season,
    detail: await tmdbFetch<TmdbRawSeasonDetail>(`/tv/${tmdbId}/season/${season.season_number}?language=en-US`),
  })));
  if (seasons.some(s => !Array.isArray(s.detail.episodes))) throw new Error("TMDB bölüm listesi alınamadı");
  return prisma.$transaction(async tx => {
    let added = 0;
    for (const s of seasons) {
      const seasonNumber = s.season_number;
      const oldSeason = await tx.tvSeason.findUnique({ where: { tvShowId_seasonNumber: { tvShowId: id, seasonNumber } } });
      const seasonData = { name: s.name || `Season ${seasonNumber}`, overview: s.overview || null, airDate: date(s.air_date), episodeCount: s.episode_count ?? s.detail.episodes!.length, posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null };
      const saved = await tx.tvSeason.upsert({ where: { tvShowId_seasonNumber: { tvShowId: id, seasonNumber } }, create: { tvShowId: id, seasonNumber, ...seasonData }, update: seasonData });
      if (!oldSeason) added++;
      for (const ep of s.detail.episodes!) {
        const key = { tvShowId: id, seasonNumber, episodeNumber: ep.episode_number };
        const old = await tx.tvEpisode.findUnique({ where: { tvShowId_seasonNumber_episodeNumber: key }, select: { id: true } });
        const data = { name: ep.name || `Episode ${ep.episode_number}`, overview: ep.overview || null, airDate: date(ep.air_date), runtime: ep.runtime ?? null, stillUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null, seasonId: saved.id };
        await tx.tvEpisode.upsert({ where: { tvShowId_seasonNumber_episodeNumber: key }, create: { ...key, ...data }, update: data });
        if (!old) added++;
      }
    }
    await tx.content.update({ where: { id }, data: {
      numberOfSeasons: tv.number_of_seasons ?? undefined, numberOfEpisodes: tv.number_of_episodes ?? undefined,
      firstAirDate: tv.first_air_date ? date(tv.first_air_date) : undefined, lastAirDate: tv.last_air_date ? date(tv.last_air_date) : undefined,
      inProduction: tv.in_production ?? undefined,
      status: tv.first_air_date && tv.in_production != null ? inferNormalizedContentStatus({ contentTypeId: 2, firstAirDate: tv.first_air_date, lastAirDate: tv.last_air_date, inProduction: tv.in_production }) : undefined,
      seasonsData: JSON.stringify(seasons.map(s => ({ seasonNumber: s.season_number, name: s.name, airDate: s.air_date, episodeCount: s.episode_count, overview: s.overview, posterPath: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : undefined, episodes: s.detail.episodes!.map(ep => ({ episodeNumber: ep.episode_number, name: ep.name, airDate: ep.air_date, overview: ep.overview, runtime: ep.runtime, stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : undefined })) }))),
    } });
    return added;
  }, { timeout: 60000 });
}
