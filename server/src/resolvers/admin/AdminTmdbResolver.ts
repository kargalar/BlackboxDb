import { Resolver, Query, Mutation, Arg, Ctx, Authorized, Int } from "type-graphql";
import { importQueue } from "../../lib/ImportQueueManager";
import { syncTvSeasons } from "../../lib/tmdbTvSync";
import { PopularImportResult } from "../import/ImportMutationResolver";
import { GraphQLContext } from "../../context";
import { requireAdminOrModerator } from "../../lib/authGuard";
import { logger } from "../../lib/logger";
import {
  TmdbSearchResult,
  TmdbDetailResult,
  TmdbGenre,
  TmdbCastMember,
  TmdbCrewMember,
  TmdbLanguage,
  TmdbVideo,
  TmdbSeason,
  TmdbEpisode,
  TmdbKeyword,
  TmdbCompany,
  TmdbPersonDetailResult,
  TmdbFranchise,
} from "../../types/admin/TmdbTypes";
import {
  searchTmdb,
  fetchTmdbMovieDetails,
  fetchTmdbTvDetails,
  searchTmdbPerson,
  fetchTmdbPersonDetails,
} from "../../lib/tmdbFetcher";

/**
 * TMDB Auto-Fill Resolver
 * Add Content sayfasında içerik eklerken TMDB'den otomatik bilgi doldurmak için
 * arama ve detay çekme sorguları sağlar.
 *
 * Sadece admin/moderator erişimine açıktır.
 */
@Resolver()
export class AdminTmdbResolver {
  @Authorized("ADMIN")
  @Mutation(() => PopularImportResult)
  async syncExistingTvShows(@Ctx() { user, prisma }: GraphQLContext): Promise<PopularImportResult> {
    if (!user) throw new Error("Not authenticated");
    const active = await prisma.importJob.findFirst({ where: { type: "tmdb_tv_sync", status: { in: ["PENDING", "PROCESSING"] } } });
    if (active) throw new Error("Dizi kontrolü zaten çalışıyor.");
    const job = await prisma.importJob.create({ data: { userId: user.id, type: "tmdb_tv_sync", fileName: "TMDB dizi kontrolü", totalItems: 0, status: "PENDING" } });
    importQueue.addJob(async () => {
      let imported = 0, skipped = 0, failed = 0, processed = 0;
      try {
        const shows = await prisma.content.findMany({ where: { contentTypeId: 2, isDeleted: false, tmdbId: { not: null } }, select: { id: true, title: true, tmdbId: true } });
        await prisma.importJob.update({ where: { id: job.id }, data: { status: "PROCESSING", totalItems: shows.length } });
        for (const show of shows) {
          try {
            const added = await syncTvSeasons(prisma, show.id, show.tmdbId!);
            if (added) imported++; else skipped++;
          } catch (error) {
            failed++;
            await prisma.importJob.update({ where: { id: job.id }, data: { errors: { push: `${show.title}: ${error instanceof Error ? error.message : String(error)}` } } });
          }
          processed++;
          await prisma.importJob.update({ where: { id: job.id }, data: { processedItems: processed, currentItem: JSON.stringify({ title: show.title, imported, skipped, failed }) } });
        }
        await prisma.importJob.update({ where: { id: job.id }, data: { status: "COMPLETED", currentItem: JSON.stringify({ title: "Kontrol tamamlandı", imported, skipped, failed }) } });
      } catch (error) {
        await prisma.importJob.update({ where: { id: job.id }, data: { status: "FAILED", errors: { push: String(error) } } });
      }
    });
    return { success: true, jobId: job.id, message: "Kontrol başlatıldı" };
  }

  // ─── SEARCH ───

  @Authorized()
  @Query(() => [TmdbSearchResult], {
    description: "TMDB'de film veya dizi arar",
  })
  async searchTmdb(
    @Arg("query", () => String) query: string,
    @Arg("type", () => String, { description: "'movie' veya 'tv'" })
    type: string,
    @Arg("page", () => Int, { nullable: true, defaultValue: 1 })
    page: number,
    @Ctx() { user, language }: GraphQLContext,
  ): Promise<TmdbSearchResult[]> {
    requireAdminOrModerator(user);

    if (!query || query.trim().length < 1) {
      logger.warn("[AdminTmdbResolver] Empty search query");
      return [];
    }

    if (!["movie", "tv"].includes(type)) {
      logger.warn(`[AdminTmdbResolver] Invalid type: ${type}`);
      throw new Error("Type must be 'movie' or 'tv'");
    }

    logger.info(
      `[AdminTmdbResolver] searchTmdb called: query="${query}", type="${type}", page=${page}, user=${user?.id}`,
    );

    try {
      const providerLanguage = { en: "en-US", zh: "zh-CN", pt: "pt-BR", arz: "ar-EG", pcm: "en-US" } as Record<string, string>;
      const results = await searchTmdb(query.trim(), type, undefined, page, providerLanguage[language] ?? language);

      // Map fetcher results → GraphQL TmdbSearchResult objects
      return results.map((r) => {
        const result = new TmdbSearchResult();
        result.tmdbId = r.tmdbId;
        result.title = r.title;
        result.originalTitle = r.originalTitle;
        result.overview = r.overview;
        result.posterPath = r.posterPath;
        result.releaseDate = r.releaseDate;
        result.voteAverage = r.voteAverage;
        result.mediaType = r.mediaType;
        return result;
      });
    } catch (error) {
      logger.error("[AdminTmdbResolver] searchTmdb failed", error);
      throw new Error("TMDB arama başarısız oldu. Lütfen tekrar deneyin.");
    }
  }

  // ─── FETCH DETAILS ───

  @Authorized()
  @Query(() => TmdbDetailResult, {
    description: "TMDB'den seçilen içeriğin tüm detaylarını getirir",
  })
  async fetchTmdbDetails(
    @Arg("tmdbId", () => Int) tmdbId: number,
    @Arg("type", () => String, { description: "'movie' veya 'tv'" })
    type: string,
    @Ctx() { user }: GraphQLContext,
  ): Promise<TmdbDetailResult> {
    requireAdminOrModerator(user);

    if (!["movie", "tv"].includes(type)) {
      throw new Error("Type must be 'movie' or 'tv'");
    }

    logger.info(
      `[AdminTmdbResolver] fetchTmdbDetails called: tmdbId=${tmdbId}, type="${type}", user=${user?.id}`,
    );

    try {
      const data =
        type === "tv"
          ? await fetchTmdbTvDetails(tmdbId)
          : await fetchTmdbMovieDetails(tmdbId);

      // Map fetcher data → GraphQL TmdbDetailResult
      const detail = new TmdbDetailResult();
      detail.tmdbId = data.tmdbId;
      detail.title = data.title;
      detail.originalTitle = data.originalTitle;
      detail.translations = data.translations;
      detail.overview = data.overview;
      detail.releaseDate = data.releaseDate;
      detail.releases = data.releases;
      detail.runtime = data.runtime;
      detail.posterPath = data.posterPath;
      detail.backdropPath = data.backdropPath;
      detail.status = data.status;
      detail.voteAverage = data.voteAverage;
      detail.budget = data.budget;
      detail.revenue = data.revenue;
      detail.mediaType = data.mediaType;
      detail.ageRating = data.ageRating;

      // Genres
      if (data.genres) {
        detail.genres = data.genres.map((g) => {
          const genre = new TmdbGenre();
          genre.id = g.id;
          genre.name = g.name;
          return genre;
        });
      }

      // Languages
      if (data.spokenLanguages) {
        detail.spokenLanguages = data.spokenLanguages.map((l) => {
          const lang = new TmdbLanguage();
          lang.iso6391 = l.iso6391;
          lang.englishName = l.englishName;
          lang.name = l.name;
          return lang;
        });
      }

      // Cast
      if (data.cast) {
        detail.cast = data.cast.map((c) => {
          const member = new TmdbCastMember();
          member.id = c.id;
          member.name = c.name;
          member.character = c.character;
          member.profilePath = c.profilePath;
          member.order = c.order;
          member.gender = c.gender;
          member.popularity = c.popularity;
          member.biography = c.biography;
          member.birthday = c.birthday;
          member.deathday = c.deathday;
          member.placeOfBirth = c.placeOfBirth;
          return member;
        });
      }

      // Crew
      if (data.crew) {
        detail.crew = data.crew.map((c) => {
          const member = new TmdbCrewMember();
          member.id = c.id;
          member.name = c.name;
          member.job = c.job;
          member.department = c.department;
          member.profilePath = c.profilePath;
          member.gender = c.gender;
          member.popularity = c.popularity;
          member.biography = c.biography;
          member.birthday = c.birthday;
          member.deathday = c.deathday;
          member.placeOfBirth = c.placeOfBirth;
          return member;
        });
      }

      // Videos
      if (data.videos) {
        detail.videos = data.videos.map((v) => {
          const video = new TmdbVideo();
          video.key = v.key;
          video.name = v.name;
          video.site = v.site;
          video.type = v.type;
          video.official = v.official;
          return video;
        });
      }

      // Keywords (themes)
      if (data.keywords) {
        detail.keywords = data.keywords.map((k) => {
          const keyword = new TmdbKeyword();
          keyword.id = k.id;
          keyword.name = k.name;
          return keyword;
        });
      }

      if (data.productionCompanies) {
        detail.productionCompanies = data.productionCompanies.map((c) => {
          const company = new TmdbCompany();
          company.id = c.id;
          company.name = c.name;
          company.logoPath = c.logoPath;
          company.originCountry = c.originCountry;
          return company;
        });
      }

      if (data.franchise) {
        const franchise = new TmdbFranchise();
        franchise.tmdbCollectionId = data.franchise.tmdbCollectionId;
        franchise.name = data.franchise.name;
        franchise.posterPath = data.franchise.posterPath;
        franchise.backdropPath = data.franchise.backdropPath;
        detail.franchise = franchise;
      }

      // TV-specific
      detail.firstAirDate = data.firstAirDate;
      detail.lastAirDate = data.lastAirDate;
      detail.inProduction = data.inProduction;
      detail.numberOfSeasons = data.numberOfSeasons;
      detail.numberOfEpisodes = data.numberOfEpisodes;

      // Seasons with episodes
      if (data.seasons) {
        detail.seasons = data.seasons.map((s) => {
          const season = new TmdbSeason();
          season.seasonNumber = s.seasonNumber;
          season.name = s.name;
          season.airDate = s.airDate;
          season.episodeCount = s.episodeCount;
          season.overview = s.overview;
          season.posterPath = s.posterPath;
          if (s.episodes) {
            season.episodes = s.episodes.map((ep) => {
              const episode = new TmdbEpisode();
              episode.episodeNumber = ep.episodeNumber;
              episode.name = ep.name;
              episode.airDate = ep.airDate;
              episode.overview = ep.overview;
              episode.runtime = ep.runtime;
              episode.stillPath = ep.stillPath;
              return episode;
            });
          }
          return season;
        });
      }

      logger.success(
        `[AdminTmdbResolver] Details fetched successfully: "${detail.title}"`,
      );
      return detail;
    } catch (error) {
      logger.error("[AdminTmdbResolver] fetchTmdbDetails failed", error);
      throw new Error("TMDB detay bilgileri alınamadı. Lütfen tekrar deneyin.");
    }
  }

  // ─── PERSON AUTOFILL ───

  @Authorized()
  @Query(() => Int, {
    nullable: true,
    description:
      "TMDB'de kişi araması yapar ve ilk eşleşen kişinin ID'sini döner",
  })
  async searchTmdbPersonQuery(
    @Arg("query", () => String) query: string,
    @Ctx() { user }: GraphQLContext,
  ): Promise<number | null> {
    requireAdminOrModerator(user);

    if (!query || query.trim().length < 1) {
      return null;
    }

    try {
      return await searchTmdbPerson(query.trim());
    } catch (error) {
      logger.error("[AdminTmdbResolver] searchTmdbPersonQuery failed", error);
      throw new Error("Kişi araması başarısız oldu.");
    }
  }

  @Authorized()
  @Query(() => TmdbPersonDetailResult, {
    description: "TMDB'den kişinin detaylı bilgilerini getirir",
  })
  async fetchTmdbPersonInfo(
    @Arg("tmdbPersonId", () => Int) tmdbPersonId: number,
    @Ctx() { user }: GraphQLContext,
  ): Promise<TmdbPersonDetailResult> {
    requireAdminOrModerator(user);

    try {
      const data = await fetchTmdbPersonDetails(tmdbPersonId);

      const result = new TmdbPersonDetailResult();
      result.id = data.id;
      result.name = data.name;
      result.biography = data.biography;
      result.birthday = data.birthday;
      result.deathday = data.deathday;
      result.gender = data.gender;
      result.placeOfBirth = data.placeOfBirth;
      result.profilePath = data.profilePath;

      logger.success(
        `[AdminTmdbResolver] Person details fetched successfully: "${result.name}"`,
      );
      return result;
    } catch (error) {
      logger.error("[AdminTmdbResolver] fetchTmdbPersonInfo failed", error);
      throw new Error("Kişi detay bilgileri alınamadı.");
    }
  }
}
