import { Resolver, Query, Arg, Ctx, Authorized, Int } from "type-graphql";
import { GraphQLContext } from "../../context";
import { requireAdminOrModerator } from "../../lib/authGuard";
import { logger } from "../../lib/logger";
import {
  AutoFillSearchResult,
  AutoFillBookDetail,
  AutoFillPersonDetail,
  AutoFillBookEdition,
  AutoFillGameDetail,
  AutoFillSimpleItem,
  AutoFillExpansionItem,
  ContentImagesResponse,
  ContentImageOption,
} from "../../types/admin/AutoFillTypes";
import {
  searchBooks,
  fetchBookDetails,
  fetchBookImages,
} from "../../lib/googleBooksFetcher";
import {
  searchOpenLibrary,
  fetchOpenLibraryDetails,
  fetchOpenLibraryImages,
} from "../../lib/openLibraryFetcher";
import {
  searchIgdbGames,
  fetchIgdbGameDetails,
  fetchIgdbImages,
} from "../../lib/igdbFetcher";
import { fetchTmdbImages } from "../../lib/tmdbFetcher";

/**
 * Auto-Fill Resolver — Kitap (Google Books) ve Oyun (IGDB) için
 * arama ve detay çekme sorguları sağlar.
 *
 * Sadece admin/moderator erişimine açıktır.
 */
@Resolver()
export class AdminAutoFillResolver {
  // ─── BOOK SEARCH ───

  @Authorized()
  @Query(() => [AutoFillSearchResult], {
    description: "Google Books'ta kitap arar",
  })
  async searchBooks(
    @Arg("query", () => String) query: string,
    @Arg("startIndex", () => Int, { nullable: true, defaultValue: 0 })
    startIndex: number,
    @Arg("maxResults", () => Int, { nullable: true, defaultValue: 20 })
    maxResults: number,
    @Ctx() { user }: GraphQLContext,
  ): Promise<AutoFillSearchResult[]> {
    requireAdminOrModerator(user);

    if (!query || query.trim().length < 1) {
      logger.warn("[AdminAutoFillResolver] Empty book search query");
      return [];
    }

    logger.info(
      `[AdminAutoFillResolver] searchBooks called: query="${query}", startIndex=${startIndex}, maxResults=${maxResults}, user=${user?.id}`,
    );

    try {
      const results = await searchBooks(query.trim(), startIndex, maxResults);
      return results.map((r) => {
        const result = new AutoFillSearchResult();
        result.sourceId = r.sourceId;
        result.title = r.title;
        result.overview = r.overview;
        result.posterPath = r.posterPath;
        result.releaseDate = r.releaseDate;
        result.voteAverage = r.voteAverage;
        result.mediaType = "book";
        result.extraInfo = r.authors;
        return result;
      });
    } catch (error) {
      logger.error("[AdminAutoFillResolver] searchBooks failed", error);
      throw new Error("Kitap arama başarısız oldu. Lütfen tekrar deneyin.");
    }
  }

  // ─── BOOK DETAILS ───

  @Authorized()
  @Query(() => AutoFillBookDetail, {
    description: "Google Books'tan kitap detaylarını getirir",
  })
  async fetchBookDetails(
    @Arg("volumeId", () => String) volumeId: string,
    @Ctx() { user }: GraphQLContext,
  ): Promise<AutoFillBookDetail> {
    requireAdminOrModerator(user);

    logger.info(
      `[AdminAutoFillResolver] fetchBookDetails called: volumeId="${volumeId}", user=${user?.id}`,
    );

    try {
      const data = await fetchBookDetails(volumeId);

      const detail = new AutoFillBookDetail();
      detail.sourceId = data.sourceId;
      detail.title = data.title;
      detail.overview = data.overview;
      detail.posterPath = data.posterPath;
      detail.releaseDate = data.releaseDate;
      detail.voteAverage = data.voteAverage;
      detail.authors = data.authors;
      detail.publisher = data.publisher;
      detail.isbn = data.isbn;
      detail.isbn13 = data.isbn13;
      detail.pageCount = data.pageCount;
      detail.categories = data.categories;
      detail.language = data.language;
      detail.previewLink = data.previewLink;
      detail.infoLink = data.infoLink;

      if (data.authorDetails) {
        detail.authorDetails = data.authorDetails.map((a) => {
          const author = new AutoFillPersonDetail();
          author.name = a.name;
          author.biography = a.biography;
          author.birthDate = a.birthDate;
          author.deathDate = a.deathDate;
          author.profileUrl = a.profileUrl;
          return author;
        });
      }

      if (data.editions) {
        detail.editions = data.editions.map((e) => {
          const edition = new AutoFillBookEdition();
          edition.title = e.title;
          edition.isbn = e.isbn;
          edition.publisher = e.publisher;
          edition.publishedDate = e.publishedDate;
          edition.pageCount = e.pageCount;
          edition.language = e.language;
          edition.coverUrl = e.coverUrl;
          edition.isOriginal = e.isOriginal;
          return edition;
        });
      }

      logger.success(
        `[AdminAutoFillResolver] Book details fetched: "${detail.title}"`,
      );
      return detail;
    } catch (error) {
      logger.error("[AdminAutoFillResolver] fetchBookDetails failed", error);
      throw new Error(
        "Kitap detay bilgileri alınamadı. Lütfen tekrar deneyin.",
      );
    }
  }

  // ─── OPEN LIBRARY BOOK SEARCH ───

  @Authorized()
  @Query(() => [AutoFillSearchResult], {
    description: "Open Library'de kitap arar",
  })
  async searchOpenLibrary(
    @Arg("query", () => String) query: string,
    @Arg("offset", () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Ctx() { user }: GraphQLContext,
  ): Promise<AutoFillSearchResult[]> {
    requireAdminOrModerator(user);

    if (!query || query.trim().length < 1) {
      logger.warn("[AdminAutoFillResolver] Empty Open Library search query");
      return [];
    }

    logger.info(
      `[AdminAutoFillResolver] searchOpenLibrary called: query="${query}", offset=${offset}, limit=${limit}, user=${user?.id}`,
    );

    try {
      const results = await searchOpenLibrary(query.trim(), offset, limit);
      return results.map((r) => {
        const result = new AutoFillSearchResult();
        result.sourceId = r.sourceId;
        result.title = r.title;
        result.overview = r.overview;
        result.posterPath = r.posterPath;
        result.releaseDate = r.releaseDate;
        result.voteAverage = r.voteAverage;
        result.mediaType = "book";
        result.extraInfo = r.authors;
        return result;
      });
    } catch (error) {
      logger.error("[AdminAutoFillResolver] searchOpenLibrary failed", error);
      throw new Error(
        "Open Library kitap arama başarısız oldu. Lütfen tekrar deneyin.",
      );
    }
  }

  // ─── OPEN LIBRARY BOOK DETAILS ───

  @Authorized()
  @Query(() => AutoFillBookDetail, {
    description: "Open Library'den kitap detaylarını getirir",
  })
  async fetchOpenLibraryDetails(
    @Arg("workKey", () => String) workKey: string,
    @Ctx() { user }: GraphQLContext,
  ): Promise<AutoFillBookDetail> {
    requireAdminOrModerator(user);

    logger.info(
      `[AdminAutoFillResolver] fetchOpenLibraryDetails called: workKey="${workKey}", user=${user?.id}`,
    );

    try {
      const data = await fetchOpenLibraryDetails(workKey);

      const detail = new AutoFillBookDetail();
      detail.sourceId = data.sourceId;
      detail.title = data.title;
      detail.overview = data.overview;
      detail.posterPath = data.posterPath;
      detail.releaseDate = data.releaseDate;
      detail.voteAverage = data.voteAverage;
      detail.authors = data.authors;
      detail.publisher = data.publisher;
      detail.isbn = data.isbn;
      detail.isbn13 = data.isbn13;
      detail.pageCount = data.pageCount;
      detail.categories = data.categories;
      detail.language = data.language;
      detail.previewLink = data.previewLink;
      detail.infoLink = data.infoLink;

      if (data.authorDetails) {
        detail.authorDetails = data.authorDetails.map((a) => {
          const author = new AutoFillPersonDetail();
          author.name = a.name;
          author.biography = a.biography;
          author.birthDate = a.birthDate;
          author.deathDate = a.deathDate;
          author.profileUrl = a.profileUrl;
          return author;
        });
      }

      if (data.editions) {
        detail.editions = data.editions.map((e) => {
          const edition = new AutoFillBookEdition();
          edition.title = e.title;
          edition.isbn = e.isbn;
          edition.publisher = e.publisher;
          edition.publishedDate = e.publishedDate;
          edition.pageCount = e.pageCount;
          edition.language = e.language;
          edition.coverUrl = e.coverUrl;
          edition.isOriginal = e.isOriginal;
          return edition;
        });
      }

      logger.success(
        `[AdminAutoFillResolver] Open Library details fetched: "${detail.title}"`,
      );
      return detail;
    } catch (error) {
      logger.error(
        "[AdminAutoFillResolver] fetchOpenLibraryDetails failed",
        error,
      );
      throw new Error(
        "Open Library kitap detay bilgileri alınamadı. Lütfen tekrar deneyin.",
      );
    }
  }

  // ─── IGDB GAME SEARCH ───

  @Authorized()
  @Query(() => [AutoFillSearchResult], {
    description: "IGDB'de oyun arar",
  })
  async searchIgdbGames(
    @Arg("query", () => String) query: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg("offset", () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Ctx() { user }: GraphQLContext,
  ): Promise<AutoFillSearchResult[]> {
    requireAdminOrModerator(user);

    if (!query || query.trim().length < 1) {
      logger.warn("[AdminAutoFillResolver] Empty IGDB game search query");
      return [];
    }

    logger.info(
      `[AdminAutoFillResolver] searchIgdbGames called: query="${query}", limit=${limit}, offset=${offset}, user=${user?.id}`,
    );

    try {
      const results = await searchIgdbGames(query.trim(), limit, offset);
      return results.map((r) => {
        const result = new AutoFillSearchResult();
        result.sourceId = String(r.sourceId);
        result.title = r.title;
        result.overview = r.overview;
        result.posterPath = r.posterPath;
        result.releaseDate = r.releaseDate;
        result.voteAverage = r.voteAverage;
        result.mediaType = "game";
        result.extraInfo = r.platforms;
        return result;
      });
    } catch (error) {
      logger.error("[AdminAutoFillResolver] searchIgdbGames failed", error);
      throw new Error("IGDB oyun arama başarısız oldu. Lütfen tekrar deneyin.");
    }
  }

  // ─── IGDB GAME DETAILS ───

  @Authorized()
  @Query(() => AutoFillGameDetail, {
    description: "IGDB'den oyun detaylarını getirir",
  })
  async fetchIgdbGameDetails(
    @Arg("gameId", () => Int) gameId: number,
    @Ctx() { user }: GraphQLContext,
  ): Promise<AutoFillGameDetail> {
    requireAdminOrModerator(user);

    logger.info(
      `[AdminAutoFillResolver] fetchIgdbGameDetails called: gameId=${gameId}, user=${user?.id}`,
    );

    try {
      const data = await fetchIgdbGameDetails(gameId);

      const detail = new AutoFillGameDetail();
      detail.sourceId = data.sourceId;
      detail.title = data.title;
      detail.originalTitle = data.originalTitle;
      detail.overview = data.overview;
      detail.posterPath = data.posterPath;
      detail.backdropPath = data.backdropPath;
      detail.releaseDate = data.releaseDate;
      detail.voteAverage = data.voteAverage;
      detail.esrbRating = data.esrbRating;
      detail.website = data.website;
      detail.trailerUrl = data.trailerUrl;
      detail.fileSize = data.fileSize;
      detail.screenshots = data.screenshots;

      if (data.genres) {
        detail.genres = data.genres.map((g) => {
          const item = new AutoFillSimpleItem();
          item.id = g.id;
          item.name = g.name;
          return item;
        });
      }

      if (data.tags) {
        detail.tags = data.tags.map((t) => {
          const item = new AutoFillSimpleItem();
          item.id = t.id;
          item.name = t.name;
          return item;
        });
      }

      if (data.platforms) {
        detail.platforms = data.platforms.map((p) => {
          const item = new AutoFillSimpleItem();
          item.id = p.id;
          item.name = p.name;
          return item;
        });
      }

      if (data.gameEngines) {
        detail.gameEngines = data.gameEngines.map((engine) => {
          const item = new AutoFillSimpleItem();
          item.id = engine.id;
          item.name = engine.name;
          return item;
        });
      }

      if (data.developers) {
        detail.developers = data.developers.map((d) => {
          const item = new AutoFillSimpleItem();
          item.id = d.id;
          item.name = d.name;
          return item;
        });
      }

      if (data.publishers) {
        detail.publishers = data.publishers.map((p) => {
          const item = new AutoFillSimpleItem();
          item.id = p.id;
          item.name = p.name;
          return item;
        });
      }

      if (data.playerPerspectives) {
        detail.playerPerspectives = data.playerPerspectives.map((pp) => {
          const item = new AutoFillSimpleItem();
          item.id = pp.id;
          item.name = pp.name;
          return item;
        });
      }

      if (data.gameModes) {
        detail.gameModes = data.gameModes.map((gm) => {
          const item = new AutoFillSimpleItem();
          item.id = gm.id;
          item.name = gm.name;
          return item;
        });
      }

      detail.franchise = data.franchise?.name;

      if (data.expansions) {
        detail.expansions = data.expansions.map((exp) => {
          const item = new AutoFillExpansionItem();
          item.name = exp.name;
          item.description = exp.description;
          item.posterUrl = exp.posterUrl;
          item.releaseDate = exp.releaseDate;
          item.type = exp.type;
          return item;
        });
      }

      logger.success(
        `[AdminAutoFillResolver] IGDB game details fetched: "${detail.title}"`,
      );
      return detail;
    } catch (error) {
      logger.error(
        "[AdminAutoFillResolver] fetchIgdbGameDetails failed",
        error,
      );
      throw new Error(
        "IGDB oyun detay bilgileri alınamadı. Lütfen tekrar deneyin.",
      );
    }
  }

  // ─── CONTENT IMAGES ───

  @Authorized()
  @Query(() => ContentImagesResponse, {
    description:
      "İçerik için poster ve backdrop görsel seçeneklerini API'dan çeker",
  })
  async fetchContentImages(
    @Arg("sourceId", () => String) sourceId: string,
    @Arg("source", () => String, {
      description: "tmdb_movie | tmdb_tv | igdb | googlebooks | openlibrary",
    })
    source: string,
    @Ctx() { user }: GraphQLContext,
  ): Promise<ContentImagesResponse> {
    requireAdminOrModerator(user);
    logger.info(
      `[AdminAutoFillResolver] fetchContentImages: source=${source}, sourceId=${sourceId}`,
    );

    try {
      let rawPosters: Array<{
        url: string;
        width: number;
        height: number;
        voteAverage?: number;
        language?: string;
      }> = [];
      let rawBackdrops: Array<{
        url: string;
        width: number;
        height: number;
        voteAverage?: number;
        language?: string;
      }> = [];

      if (source === "tmdb_movie" || source === "tmdb_tv") {
        const tmdbId = parseInt(sourceId, 10);
        const type = source === "tmdb_tv" ? "tv" : "movie";
        const data = await fetchTmdbImages(tmdbId, type);
        rawPosters = data.posters;
        rawBackdrops = data.backdrops;
      } else if (source === "igdb") {
        const gameId = parseInt(sourceId, 10);
        const data = await fetchIgdbImages(gameId);
        rawPosters = data.posters;
        rawBackdrops = data.backdrops;
      } else if (source === "googlebooks") {
        const data = await fetchBookImages(sourceId);
        rawPosters = data.posters;
        rawBackdrops = data.backdrops;
      } else if (source === "openlibrary") {
        const data = await fetchOpenLibraryImages(sourceId);
        rawPosters = data.posters;
        rawBackdrops = data.backdrops;
      } else {
        throw new Error(`Unknown source: ${source}`);
      }

      const response = new ContentImagesResponse();
      response.posters = rawPosters.map((p) => {
        const item = new ContentImageOption();
        item.url = p.url;
        item.width = p.width;
        item.height = p.height;
        item.voteAverage = p.voteAverage;
        item.language = p.language;
        return item;
      });
      response.backdrops = rawBackdrops.map((b) => {
        const item = new ContentImageOption();
        item.url = b.url;
        item.width = b.width;
        item.height = b.height;
        item.voteAverage = b.voteAverage;
        item.language = b.language;
        return item;
      });

      logger.success(
        `[AdminAutoFillResolver] Content images fetched: ${response.posters.length} posters, ${response.backdrops.length} backdrops`,
      );
      return response;
    } catch (error) {
      logger.error("[AdminAutoFillResolver] fetchContentImages failed", error);
      throw new Error("Görseller yüklenemedi. Lütfen tekrar deneyin.");
    }
  }
}
