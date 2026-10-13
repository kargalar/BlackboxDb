import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Int,
  ObjectType,
  Field,
  Float,
  FieldResolver,
  Root,
  Info,
} from "type-graphql";
import type { Prisma } from "@prisma/client";
import {
  getContentSearchPage,
  standardContentSearchOrder,
} from "../../lib/contentSearchPage";
import type { GraphQLResolveInfo } from "graphql";
import {
  contentSelection,
  requestedContentFields,
} from "../../lib/contentSelection";
import { BookPublication, Content } from "../../types/Content";
import { ContentCitation } from "../../types/ContentCitation";
import { ContentEditHistory } from "../../types/admin";
import { GraphQLContext } from "../../context";
import {
  convertBookPublicationForGraphQL,
  convertContentForGraphQL,
} from "./ContentUtils";
import { getContentScreenshotCounts } from "../../lib/contentScreenshotCounts";
import { logger } from "../../lib/logger";
import { getRequestLoaders } from "../../lib/requestLoaders";
import {
  normalizePageSize,
  normalizePageOffset,
  DEFAULT_CONTENT_LIST_PAGE_SIZE,
} from "../../lib/pagination";
import { resolveSimilarContents } from "../../lib/similarContentHelper";
import { applyGamePlatformFilter } from "../../lib/gamePlatformFilter";

import { CONTENT_TYPE_IDS, buildLengthWhere } from "./ContentQueryHelpers";

@ObjectType()
export class SearchContentResult {
  @Field(() => [Content])
  items: Content[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}

@Resolver(Content)
export class ContentQueryResolver {
  @Query(() => Content, { nullable: true })
  async content(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
    @Info() info?: GraphQLResolveInfo,
  ): Promise<Content | null> {
    try {
      logger.info(`Fetching content with id: ${id}`);
      const content = await prisma.content.findUnique({
        where: { id },
        ...contentSelection(info),
      });

      if (!content) {
        logger.warn(`Content not found for id: ${id}`);
        return null;
      }

      logger.success(`Successfully fetched content: ${content.title}`);
      return convertContentForGraphQL(content);
    } catch (error) {
      logger.error(`Error fetching content with id ${id}:`, error);
      throw new Error("Failed to fetch content");
    }
  }

  @Query(() => [Content])
  async contents(
    @Arg("type", () => String, { nullable: true }) type: string | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Ctx() { prisma, user }: GraphQLContext,
    @Info() info?: GraphQLResolveInfo,
  ): Promise<Content[]> {
    limit = normalizePageSize(limit, DEFAULT_CONTENT_LIST_PAGE_SIZE);
    offset = normalizePageOffset(offset);
    try {
      logger.info(`Fetching contents list`, { type, limit });
      let where: any = type
        ? { contentType: { name: type.toUpperCase() } }
        : {};
      where = await applyGamePlatformFilter(prisma, user?.id, where);

      const contents = await prisma.content.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...contentSelection(info),
      });

      logger.success(`Successfully fetched ${contents.length} contents`);
      return contents.map((content) =>
        convertContentForGraphQL(content),
      ) as any;
    } catch (error) {
      logger.error(`Error fetching contents list:`, error);
      throw new Error("Failed to fetch contents");
    }
  }

  @Query(() => [Content])
  async popularContent(
    @Arg("type", () => String, { nullable: true }) type: string | undefined,
    @Arg("limit", () => Int, { defaultValue: 10 }) limit: number,
    @Arg("timeRange", () => String, { nullable: true, defaultValue: "all" })
    timeRange: string,
    @Arg("durationMin", () => Int, { nullable: true })
    durationMin: number | undefined,
    @Arg("durationMax", () => Int, { nullable: true })
    durationMax: number | undefined,
    @Ctx() { prisma, user }: GraphQLContext,
    @Info() info?: GraphQLResolveInfo,
  ): Promise<Content[]> {
    limit = normalizePageSize(limit);
    try {
      logger.info(`Fetching popular contents list`, { type, limit, timeRange });
      let where: any = type
        ? { contentType: { name: type.toUpperCase() } }
        : {};

      where = await applyGamePlatformFilter(prisma, user?.id, where);

      // Apply timeRange filter (filtering by content's created date or whatever makes sense for "popular in this time")
      // Since 'popular' usually relies on UserContentLog (consume/favorite), it might be hard to filter *when* it became popular perfectly.
      // But we can filter by 'createdAt' to show recently added popular content, OR we can filter user interactions.
      // Currently, it just sorts by global consumeCount/favoriteCount.
      // Ideally, a true time filter for popularity requires querying interactions within the time frame.
      // For simplicity, let's apply the time filter on the `createdAt` field of the Content, meaning "Popular among contents added recently".
      // Let's implement this on createdAt for now, similar to discussions/comments.
      if (timeRange && timeRange !== "all") {
        const date = new Date();
        if (timeRange === "daily") {
          date.setDate(date.getDate() - 1);
        } else if (timeRange === "weekly") {
          date.setDate(date.getDate() - 7);
        } else if (timeRange === "monthly") {
          date.setMonth(date.getMonth() - 1);
        } else if (timeRange === "yearly") {
          date.setFullYear(date.getFullYear() - 1);
        }
        where.createdAt = { gte: date };
      }

      if (durationMin !== undefined || durationMax !== undefined) {
        where.AND = where.AND || [];
        where.AND.push(
          buildLengthWhere(
            durationMin,
            durationMax,
            type
              ? CONTENT_TYPE_IDS[
                  type.toLowerCase() as keyof typeof CONTENT_TYPE_IDS
                ]
              : undefined,
          ),
        );
      }

      const contents = await prisma.content.findMany({
        where,
        take: limit,
        orderBy: [
          { consumeCount: "desc" },
          { favoriteCount: "desc" },
          { createdAt: "desc" },
        ],
        ...contentSelection(info),
      });

      logger.success(
        `Successfully fetched ${contents.length} popular contents`,
      );
      return contents.map((content) =>
        convertContentForGraphQL(content),
      ) as any;
    } catch (error) {
      logger.error(`Error fetching popular contents list:`, error);
      throw new Error("Failed to fetch popular contents");
    }
  }

  @Query(() => [Content])
  async mostAnticipatedUpcomingContent(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Arg("limit", () => Int, { defaultValue: 5 }) limit: number,
    @Ctx() { prisma, user }: GraphQLContext,
    @Info() info?: GraphQLResolveInfo,
  ): Promise<Content[]> {
    limit = normalizePageSize(limit);
    try {
      logger.info(`Fetching most anticipated upcoming content`, {
        contentTypeId,
        limit,
      });

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      let contentWhere: any = {
        contentTypeId: contentTypeId,
        isDeleted: false,
        releaseDate: { gte: twoDaysAgo },
      };

      contentWhere = await applyGamePlatformFilter(
        prisma,
        user?.id,
        contentWhere,
      );

      // 1. Group userContentLog by contentId to find counts for isConsumeLater
      const logsGrouped = await prisma.userContentLog.groupBy({
        by: ["contentId"],
        where: {
          isConsumeLater: true,
          content: contentWhere,
        },
        _count: {
          contentId: true,
        },
        orderBy: {
          _count: {
            contentId: "desc",
          },
        },
        take: limit,
      });

      const loggedContentIds = logsGrouped.map((log) => log.contentId);

      // 2. Fetch the full content objects
      let contents = await prisma.content.findMany({
        where: {
          id: { in: loggedContentIds },
        },
        ...contentSelection(info),
      });

      // Sort by the count descending (same order as loggedContentIds)
      contents.sort((a, b) => {
        return loggedContentIds.indexOf(a.id) - loggedContentIds.indexOf(b.id);
      });

      // 3. If we don't have enough, fill the rest with other upcoming contents sorted by release date / popularity
      if (contents.length < limit) {
        const remainingLimit = limit - contents.length;
        const additionalContents = await prisma.content.findMany({
          where: {
            ...contentWhere,
            id: { notIn: loggedContentIds },
          },
          orderBy: [
            { releaseDate: { sort: "asc", nulls: "last" } },
            { consumeCount: "desc" },
            { createdAt: "desc" },
          ],
          take: remainingLimit,
          ...contentSelection(info),
        });

        contents = [...contents, ...additionalContents];
      }

      // 4. Retrieve exact count of isConsumeLater for all these contents to assign to consumeLaterCount
      const finalContentIds = contents.map((c) => c.id);
      const counts = await prisma.userContentLog.groupBy({
        by: ["contentId"],
        where: {
          isConsumeLater: true,
          contentId: { in: finalContentIds },
        },
        _count: {
          id: true,
        },
      });

      const countMap = new Map<string, number>();
      for (const item of counts) {
        countMap.set(item.contentId, item._count.id);
      }

      logger.success(
        `Successfully fetched ${contents.length} most anticipated upcoming contents`,
      );
      return contents.map((content) => {
        const converted = convertContentForGraphQL(content);
        converted.consumeLaterCount = countMap.get(content.id) || 0;
        return converted;
      }) as any;
    } catch (error) {
      logger.error(`Error fetching most anticipated upcoming content:`, error);
      throw new Error("Failed to fetch most anticipated upcoming content");
    }
  }

  @Query(() => SearchContentResult)
  async searchContent(
    @Arg("searchQuery", () => String, { nullable: true })
    searchQuery: string | undefined,
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Arg("offset", () => Int, { defaultValue: 0 }) offset: number,
    @Arg("genreIds", () => [Int], { nullable: true })
    genreIds: number[] | undefined,
    @Arg("themeIds", () => [Int], { nullable: true })
    themeIds: number[] | undefined,
    @Arg("moodIds", () => [Int], { nullable: true })
    moodIds: number[] | undefined,
    @Arg("ageRatingIds", () => [Int], { nullable: true })
    ageRatingIds: number[] | undefined,
    @Arg("platformIds", () => [Int], { nullable: true })
    platformIds: number[] | undefined,
    @Arg("actorIds", () => [String], { nullable: true })
    actorIds: string[] | undefined,
    @Arg("directorIds", () => [String], { nullable: true })
    directorIds: string[] | undefined,
    @Arg("companyIds", () => [String], { nullable: true })
    companyIds: string[] | undefined,
    @Arg("languageCodes", () => [String], { nullable: true })
    languageCodes: string[] | undefined,
    @Arg("publicationLanguageCodes", () => [String], { nullable: true })
    publicationLanguageCodes: string[] | undefined,
    @Arg("yearMin", () => Int, { nullable: true }) yearMin: number | undefined,
    @Arg("yearMax", () => Int, { nullable: true }) yearMax: number | undefined,
    @Arg("ratingMin", () => Float, { nullable: true })
    ratingMin: number | undefined,
    @Arg("ratingMax", () => Float, { nullable: true })
    ratingMax: number | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Arg("hasScreenshot", () => Boolean, { nullable: true })
    hasScreenshot: boolean | undefined,
    @Arg("hasEnabledScreenshot", () => Boolean, { nullable: true })
    hasEnabledScreenshot: boolean | undefined,
    @Arg("hasAwards", () => Boolean, { nullable: true })
    hasAwards: boolean | undefined,
    @Arg("hideWatched", () => String, { nullable: true })
    hideWatched: string | undefined,
    @Arg("hideWatchlist", () => String, { nullable: true })
    hideWatchlist: string | undefined,
    @Arg("hideContinuing", () => String, { nullable: true })
    hideContinuing: string | undefined,
    @Arg("hideFavorites", () => String, { nullable: true })
    hideFavorites: string | undefined,
    @Arg("hideAbandoned", () => String, { nullable: true })
    hideAbandoned: string | undefined,
    @Arg("hideInAnyList", () => String, { nullable: true })
    hideInAnyList: string | undefined,
    @Arg("durationMin", () => Int, { nullable: true })
    durationMin: number | undefined,
    @Arg("durationMax", () => Int, { nullable: true })
    durationMax: number | undefined,
    @Arg("gameModeIds", () => [Int], { nullable: true })
    gameModeIds: number[] | undefined,
    @Arg("perspectiveIds", () => [Int], { nullable: true })
    perspectiveIds: number[] | undefined,
    @Arg("emptyFilters", () => [String], { nullable: true })
    emptyFilters: string[] | undefined,
    @Ctx() { prisma, user }: GraphQLContext,
    @Info() info?: GraphQLResolveInfo,
  ): Promise<SearchContentResult> {
    limit = normalizePageSize(limit);
    offset = normalizePageOffset(offset);
    try {
      logger.info(`Searching content`, {
        searchQuery,
        contentTypeId,
        limit,
        offset,
        genreIds,
        themeIds,
        moodIds,
        actorIds,
        directorIds,
        sortBy,
      });

      // Build Prisma where condition for filters
      const buildFilterWhere = (): any => {
        const where: any = { isDeleted: false };
        const emptyFilterSet = new Set(emptyFilters || []);
        const addFilterCondition = (condition: any) => {
          where.AND = [...(where.AND || []), condition];
        };
        const applyRelationFilter = (
          key: string,
          relation: string,
          idField: string,
          ids: Array<string | number> | undefined,
        ) => {
          const hasValues = !!ids?.length;
          const hasEmpty = emptyFilterSet.has(key);
          if (!hasValues && !hasEmpty) return;

          const selectedClause = hasValues
            ? { [relation]: { some: { [idField]: { in: ids } } } }
            : null;
          const emptyClause = { [relation]: { none: {} } };

          if (selectedClause && hasEmpty) {
            addFilterCondition({ OR: [selectedClause, emptyClause] });
          } else {
            Object.assign(where, selectedClause || emptyClause);
          }
        };
        const applyPeopleFilter = (
          key: string,
          ids: string[] | undefined,
          roles: string[],
        ) => {
          const hasValues = !!ids?.length;
          const hasEmpty = emptyFilterSet.has(key);
          if (!hasValues && !hasEmpty) return null;

          const selectedClause = hasValues
            ? {
                people: {
                  some: { personId: { in: ids }, role: { in: roles } },
                },
              }
            : null;
          const emptyClause = { people: { none: { role: { in: roles } } } };
          if (selectedClause && hasEmpty) {
            addFilterCondition({ OR: [selectedClause, emptyClause] });
            return null;
          }
          return selectedClause || emptyClause;
        };
        if (contentTypeId) where.contentTypeId = contentTypeId;

        // Genre filter
        applyRelationFilter("genre", "genres", "genreId", genreIds);

        // Screenshot filters (applied server-side so results reflect whole DB)
        // Note: hasEnabledScreenshot takes precedence when provided
        if (typeof hasEnabledScreenshot === "boolean") {
          where.screenshots = hasEnabledScreenshot
            ? { some: { isEnabledForQuiz: true } }
            : { none: { isEnabledForQuiz: true } };
        } else if (typeof hasScreenshot === "boolean") {
          // any screenshot vs none
          where.screenshots = hasScreenshot ? { some: {} } : { none: {} };
        }
        // Theme filter
        applyRelationFilter("theme", "contentThemes", "themeId", themeIds);
        // Mood filter
        applyRelationFilter("mood", "contentMoods", "moodId", moodIds);
        // Awards filter
        if (typeof hasAwards === "boolean") {
          where.awards = hasAwards ? { isEmpty: false } : { isEmpty: true };
        }
        // Age rating filter
        if (ageRatingIds?.length && emptyFilterSet.has("ageRating")) {
          addFilterCondition({
            OR: [{ ageRatingId: { in: ageRatingIds } }, { ageRatingId: null }],
          });
        } else if (ageRatingIds?.length) {
          where.ageRatingId = { in: ageRatingIds };
        } else if (emptyFilterSet.has("ageRating")) {
          where.ageRatingId = null;
        }
        // Platform filter
        applyRelationFilter(
          "platform",
          "contentPlatforms",
          "platformId",
          platformIds,
        );
        // Actor filter
        const actorCondition = applyPeopleFilter("actor", actorIds, [
          "actor",
          "Actor",
          "voice",
          "Voice",
          "voice_actor",
          "Voice_actor",
        ]);
        // Director filter
        const directorCondition = applyPeopleFilter("director", directorIds, [
          "director",
          "Director",
        ]);
        if (actorCondition) addFilterCondition(actorCondition);
        if (directorCondition) addFilterCondition(directorCondition);
        // Company filter
        applyRelationFilter("company", "companies", "companyId", companyIds);
        // Language filter
        if (languageCodes?.length && emptyFilterSet.has("language")) {
          addFilterCondition({
            OR: [
              { languages: { hasSome: languageCodes } },
              { languages: { isEmpty: true } },
            ],
          });
        } else if (languageCodes?.length) {
          where.languages = { hasSome: languageCodes };
        } else if (emptyFilterSet.has("language")) {
          where.languages = { isEmpty: true };
        }
        // Book publication language filter
        if (
          publicationLanguageCodes?.length &&
          emptyFilterSet.has("publicationLanguage")
        ) {
          addFilterCondition({
            OR: [
              {
                bookPublications: {
                  some: { language: { in: publicationLanguageCodes } },
                },
              },
              { bookPublications: { none: { language: { not: null } } } },
            ],
          });
        } else if (publicationLanguageCodes?.length) {
          where.bookPublications = {
            some: { language: { in: publicationLanguageCodes } },
          };
        } else if (emptyFilterSet.has("publicationLanguage")) {
          where.bookPublications = { none: { language: { not: null } } };
        }
        // Game mode filter
        applyRelationFilter(
          "gameMode",
          "contentGameModes",
          "gameModeId",
          gameModeIds,
        );
        // Perspective filter
        applyRelationFilter(
          "perspective",
          "contentPerspectives",
          "perspectiveId",
          perspectiveIds,
        );
        // Year filter
        if (yearMin || yearMax) {
          where.releaseDate = {};
          if (yearMin) where.releaseDate.gte = new Date(`${yearMin}-01-01`);
          if (yearMax) where.releaseDate.lte = new Date(`${yearMax}-12-31`);
        }

        // User state filters (hide/show watched, watchlist, continuing, favorites, abandoned)
        const userId = user?.id;
        if (userId) {
          const andConditions: any[] = [];

          const addUserStateFilter = (
            mode: string | undefined,
            field:
              | "isConsumed"
              | "isConsumeLater"
              | "isContinuing"
              | "isFavorite"
              | "isAbandoned",
          ) => {
            if (mode === "show") {
              andConditions.push({
                userContentLogs: { some: { userId, [field]: true } },
              });
            } else if (mode === "hide") {
              andConditions.push({
                NOT: { userContentLogs: { some: { userId, [field]: true } } },
              });
            }
          };

          addUserStateFilter(hideWatched, "isConsumed");
          addUserStateFilter(hideWatchlist, "isConsumeLater");
          addUserStateFilter(hideContinuing, "isContinuing");
          addUserStateFilter(hideFavorites, "isFavorite");
          addUserStateFilter(hideAbandoned, "isAbandoned");

          logger.info(
            `[searchContent] hideInAnyList parameter received: ${hideInAnyList}`,
          );

          if (hideInAnyList === "show") {
            logger.info(
              `[searchContent] Processing hideInAnyList === "show" for user: ${userId}`,
            );
            andConditions.push({
              userListItems: { some: { list: { ownerId: userId } } },
            });
          } else if (hideInAnyList === "hide") {
            logger.info(
              `[searchContent] Processing hideInAnyList === "hide" for user: ${userId}`,
            );
            andConditions.push({
              NOT: { userListItems: { some: { list: { ownerId: userId } } } },
            });
          }

          if (andConditions.length > 0) {
            where.AND = [...(where.AND || []), ...andConditions];
            logger.info(
              `[searchContent] Applied ${andConditions.length} user-state filter(s) for user ${userId}`,
            );
          }
        } else if (
          hideWatched === "show" ||
          hideWatched === "hide" ||
          hideWatchlist === "show" ||
          hideWatchlist === "hide" ||
          hideContinuing === "show" ||
          hideContinuing === "hide" ||
          hideFavorites === "show" ||
          hideFavorites === "hide" ||
          hideAbandoned === "show" ||
          hideAbandoned === "hide" ||
          hideInAnyList === "show" ||
          hideInAnyList === "hide"
        ) {
          logger.warn(
            "[searchContent] User-state filters requested but no authenticated user found",
          );
        }

        // Duration filter
        if (durationMin !== undefined || durationMax !== undefined) {
          where.AND = where.AND || [];
          where.AND.push(
            buildLengthWhere(durationMin, durationMax, contentTypeId),
          );
        }

        return where;
      };

      let filterWhere: Prisma.ContentWhereInput = buildFilterWhere();
      if (platformIds === undefined) {
        filterWhere = await applyGamePlatformFilter(
          prisma,
          user?.id,
          filterWhere,
        );
      }
      const options = {
        where: filterWhere,
        searchQuery,
        contentTypeId,
        ratingMin,
        ratingMax,
        sortBy,
        sortOrder,
        userId: user?.id,
        limit,
        offset,
      };
      let total: number;
      let items: any[];
      const needsComputedSearch =
        !!searchQuery?.trim() ||
        ratingMin !== undefined ||
        ratingMax !== undefined ||
        sortBy === "rating" ||
        (sortBy === "userDate" && !!user?.id);
      if (needsComputedSearch) {
        const result = await getContentSearchPage(prisma, options);
        total = result.total;
        const records = result.ids.length
          ? await prisma.content.findMany({
              where: { AND: [filterWhere, { id: { in: result.ids } }] },
              ...contentSelection(info),
            })
          : [];
        const byId = new Map(records.map((record) => [record.id, record]));
        items = result.ids.map((id) => byId.get(id)).filter(Boolean);
      } else {
        total = await prisma.content.count({ where: filterWhere });
        items = await prisma.content.findMany({
          where: filterWhere,
          take: limit,
          skip: offset,
          orderBy: standardContentSearchOrder(options),
          ...contentSelection(info),
        });
      }

      const page = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit) || 1;

      const { enabled: screenshotCountMap, total: totalScreenshotCountMap } =
        await getContentScreenshotCounts(
          prisma,
          items.map((content) => content.id),
          requestedContentFields(info),
        );

      logger.success(`Search completed. Found ${total} results.`);
      return {
        items: items.map((content: any) => {
          const converted = convertContentForGraphQL(content);
          (converted as any).enabledScreenshotCount =
            screenshotCountMap.get(content.id) || 0;
          (converted as any).screenshotCount =
            totalScreenshotCountMap.get(content.id) || 0;
          return converted;
        }) as any,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Error searching content:`, error);
      throw new Error("Failed to search content");
    }
  }

  @Query(() => [Content])
  async getFranchiseContent(
    @Arg("franchiseId", () => String) franchiseId: string,
    @Arg("excludeContentId", () => String, { nullable: true })
    excludeContentId: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
    @Info() info?: GraphQLResolveInfo,
  ): Promise<Content[]> {
    try {
      logger.info(`Fetching franchise content`, {
        franchiseId,
        excludeContentId,
      });

      const where: any = { franchiseId };
      if (excludeContentId) {
        where.id = { not: excludeContentId };
      }

      const contents = await prisma.content.findMany({
        where,
        take: 20,
        orderBy: { releaseDate: "asc" },
        ...contentSelection(info),
      });

      logger.success(
        `Successfully fetched ${contents.length} franchise contents`,
      );
      return contents.map((content) =>
        convertContentForGraphQL(content),
      ) as any;
    } catch (error) {
      logger.error(`Error fetching franchise content:`, error);
      throw new Error("Failed to fetch franchise content");
    }
  }

  @FieldResolver(() => String, { nullable: true })
  async posterUrl(
    @Root() content: any,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (content.contentTypeId === CONTENT_TYPE_IDS.book) {
      const publication = await getRequestLoaders(
        context,
      ).primaryBookPublications.load(content.id);
      if (publication?.coverUrl) return publication.coverUrl;
    }

    if (content.posterUrl) return content.posterUrl;

    if (content.images && Array.isArray(content.images)) {
      const posterImg = content.images.find(
        (img: any) => img.type === "poster" || img.type === "POSTER",
      );
      if (posterImg) return posterImg.filePath;
    }

    const posterImage = await context.prisma.contentImage.findFirst({
      where: {
        contentId: content.id,
        type: "poster",
      },
      select: { filePath: true },
    });

    return posterImage?.filePath || null;
  }

  @FieldResolver(() => Int, { nullable: true })
  async pageCount(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<number | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return content.pageCount ?? null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return publication?.pageCount ?? content.pageCount ?? null;
  }

  @FieldResolver(() => String, { nullable: true })
  async isbn(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return content.isbn ?? null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return publication?.isbn || content.isbn || null;
  }

  @FieldResolver(() => String, { nullable: true })
  async publisher(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return (content as any).publisher ?? null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return publication?.publisher?.name || (content as any).publisher || null;
  }

  @FieldResolver(() => String, { nullable: true })
  async publishedDate(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return (content as any).publishedDate ?? null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return publication?.publishedDate || (content as any).publishedDate || null;
  }

  @FieldResolver(() => String, { nullable: true })
  async language(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return (content as any).language ?? null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return publication?.language || (content as any).language || null;
  }

  @FieldResolver(() => BookPublication, { nullable: true })
  async primaryBookPublication(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<any | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return convertBookPublicationForGraphQL(publication);
  }

  @FieldResolver(() => [BookPublication], { nullable: true })
  async bookPublications(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<any[]> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return [];
    }

    const publications = await getRequestLoaders(context).bookPublications.load(
      content.id,
    );

    return publications.map(convertBookPublicationForGraphQL);
  }

  @FieldResolver(() => [Content], { nullable: true })
  async similarContents(
    @Root() content: Content,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      return await resolveSimilarContents(prisma, content);
    } catch (error) {
      logger.error(`Error resolving similarContents for ${content.id}:`, error);
      return [];
    }
  }

  @FieldResolver(() => [ContentCitation], { nullable: true })
  async citationsReceived(
    @Root() content: Content,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      return await prisma.contentCitation.findMany({
        where: { citedContentId: content.id },
        include: {
          citingContent: true,
        },
      });
    } catch (error) {
      logger.error(
        `Error resolving citationsReceived for ${content.id}:`,
        error,
      );
      return [];
    }
  }

  @FieldResolver(() => [ContentCitation], { nullable: true })
  async citationsMade(
    @Root() content: Content,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      return await prisma.contentCitation.findMany({
        where: { citingContentId: content.id },
        include: {
          citedContent: true,
        },
      });
    } catch (error) {
      logger.error(`Error resolving citationsMade for ${content.id}:`, error);
      return [];
    }
  }

  @FieldResolver(() => String, { nullable: true })
  async subtitle(
    @Root() content: Content,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (content.contentTypeId !== CONTENT_TYPE_IDS.book) {
      return content.subtitle ?? null;
    }

    const publication = await getRequestLoaders(
      context,
    ).primaryBookPublications.load(content.id);
    return publication?.subtitle || content.subtitle || null;
  }

  @Query(() => [ContentEditHistory])
  async publicContentEditHistory(
    @Arg("contentId", () => String) contentId: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 50 })
    limit: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentEditHistory[]> {
    return prisma.contentEditHistory.findMany({
      where: { contentId },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }) as Promise<ContentEditHistory[]>;
  }

  @Query(() => [ContentCitation])
  async citationNetwork(
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentCitation[]> {
    try {
      return (await prisma.contentCitation.findMany({
        include: {
          citingContent: true,
          citedContent: true,
        },
      })) as any[];
    } catch (error) {
      console.error("Error fetching citation network:", error);
      return [];
    }
  }
}
