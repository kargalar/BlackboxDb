import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Int,
  Float,
  Authorized,
  ObjectType,
  Field,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { UserContentLog } from "../../types/UserContentLog";
import { Content } from "../../types/Content";
import {
  RatingUser,
  UserStats,
  ContentStats,
} from "../../services/UserContentService";
import { buildUserCommentsWhere } from "../../lib/discussionVisibility";
import {
  convertLog,
  convertPersonForActivity,
  buildMeaningfulUserContentLogWhere,
  dedupeLatestLogsByContent,
  dedupeLatestLogsByUserAndContent,
  calculateContentRatingStats,
} from "../../services/UserContentService";
import { convertContentForGraphQL } from "../content/ContentUtils";
import { pairReviewsToLogs } from "../../lib/userContentReviewMatching";
import { resolveAndCacheTmdbRating } from "../../lib/tmdbFetcher";
import { logger } from "../../lib/logger";

@Resolver()
export class UserContentQueryResolver {
  /**
   * Public query: search content by exact title and optional contentTypeId
   */
  @Query(() => Content, { nullable: true })
  async searchContentByTitle(
    @Arg("title", () => String) title: string,
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Content | null> {
    try {
      const where: any = {
        title,
        isDeleted: false,
      };
      if (contentTypeId) where.contentTypeId = contentTypeId;

      const content = await prisma.content.findFirst({
        where,
        include: { contentType: true, images: true },
      });
      if (!content) return null;
      return convertContentForGraphQL(content) as any;
    } catch (error) {
      logger.error(`[searchContentByTitle] Error:`, error);
      return null;
    }
  }

  /**
   * Get community playtime leaderboard for a specific content
   */
  @Query(() => [PlaytimeLeaderboardEntry])
  async contentPlaytimeLeaderboard(
    @Arg("contentId", () => String) contentId: string,
    @Arg("orderBy", () => String, { defaultValue: "playtime_desc" })
    orderBy: string,
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PlaytimeLeaderboardEntry[]> {
    try {
      logger.debug(
        `[contentPlaytimeLeaderboard] contentId = ${contentId}, orderBy = ${orderBy}`,
      );

      const logs = await prisma.userContentLog.findMany({
        where: {
          contentId,
          playtimeMinutes: { not: null, gt: 0 },
        },
        include: {
          user: true,
        },
      });

      const userPlaytimeMap = new Map<
        string,
        { total: number; user: any; latestDate: Date }
      >();

      for (const log of logs) {
        if (!log.user) continue;
        const entry = userPlaytimeMap.get(log.userId);
        if (entry) {
          entry.total += Number(log.playtimeMinutes);
          if (log.updatedAt > entry.latestDate)
            entry.latestDate = log.updatedAt;
        } else {
          userPlaytimeMap.set(log.userId, {
            total: Number(log.playtimeMinutes),
            user: log.user,
            latestDate: log.updatedAt,
          });
        }
      }

      let result: PlaytimeLeaderboardEntry[] = Array.from(
        userPlaytimeMap.entries(),
      ).map(([userId, entry]) => ({
        userId,
        username: entry.user.username,
        avatarUrl: entry.user.picturePath || undefined,
        playtimeMinutes: entry.total,
        updatedAt: entry.latestDate,
      }));

      if (orderBy === "date_desc") {
        result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      } else if (orderBy === "date_asc") {
        result.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
      } else if (orderBy === "playtime_asc") {
        result.sort((a, b) => a.playtimeMinutes - b.playtimeMinutes);
      } else {
        result.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);
      }

      return result.slice(0, limit);
    } catch (error) {
      logger.error(`[contentPlaytimeLeaderboard] Error: `, error);
      throw new Error("Failed to fetch playtime leaderboard");
    }
  }

  /**
   * Get user's total playtime for a specific content (sum of all logs)
   */
  @Authorized()
  @Query(() => Int)
  async userTotalPlaytimeForContent(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<number> {
    if (!user) return 0;
    try {
      const result = await prisma.userContentLog.aggregate({
        where: {
          userId: user.id,
          contentId,
          playtimeMinutes: { not: null },
        },
        _sum: { playtimeMinutes: true },
      });
      return result._sum.playtimeMinutes ?? 0;
    } catch (error) {
      logger.error(`[userTotalPlaytimeForContent] Error: `, error);
      return 0;
    }
  }

  /**
   * Get user's content log for a specific content (latest log)
   */
  @Authorized()
  @Query(() => UserContentLog, { nullable: true })
  async userContentLog(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog | null> {
    if (!user) return null;
    try {
      logger.debug(
        `[userContentLog] userId = ${user.id}, contentId = ${contentId}`,
      );
      const log = await prisma.userContentLog.findFirst({
        where: buildMeaningfulUserContentLogWhere({
          userId: user.id,
          contentId,
        }),
        orderBy: { date: "desc" },
        include: {
          taggedUsers: true,
          bookPublication: { include: { publisher: true } },
        },
      });
      if (!log) {
        logger.debug(`[userContentLog] No log found`);
        return null;
      }
      logger.debug(`[userContentLog] Found log id = ${log.id}`);
      return convertLog(log);
    } catch (error) {
      logger.error(`[userContentLog] Error: `, error);
      throw new Error("Failed to fetch user content log");
    }
  }

  /**
   * Get user's content logs for multiple content IDs (bulk)
   */
  @Authorized()
  @Query(() => [UserContentLog])
  async userContentLogs(
    @Arg("contentIds", () => [String]) contentIds: string[],
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog[]> {
    if (!user) return [];
    try {
      logger.debug(
        `[userContentLogs] userId = ${user.id}, contentIds count = ${contentIds.length}`,
      );
      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId: user.id,
          contentId: { in: contentIds },
        }),
        orderBy: { date: "desc" },
        include: {
          taggedUsers: true,
          bookPublication: { include: { publisher: true } },
        },
      });
      const latestMap = new Map<string, any>();
      for (const log of logs) {
        if (!latestMap.has(log.contentId)) {
          latestMap.set(log.contentId, log);
        }
      }
      logger.debug(`[userContentLogs] Found ${latestMap.size} logs`);

      const contentIdsWithLogs = Array.from(latestMap.keys());
      const reviews = contentIdsWithLogs.length
        ? await prisma.discussion.findMany({
            where: {
              authorId: user.id,
              contentId: { in: contentIdsWithLogs },
              type: "comment",
              isDeleted: false,
            },
            select: { contentId: true },
            distinct: ["contentId"],
          })
        : [];
      const contentIdsWithReviews = new Set(
        reviews.map((review) => review.contentId),
      );

      return Array.from(latestMap.values()).map((log) => ({
        ...convertLog(log),
        hasReview: contentIdsWithReviews.has(log.contentId),
      }));
    } catch (error) {
      logger.error(`[userContentLogs] Error: `, error);
      throw new Error("Failed to fetch user content logs");
    }
  }

  /**
   * Get content log history (all logs for a specific content)
   */
  @Authorized()
  @Query(() => [UserContentLog])
  async contentLogHistory(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog[]> {
    if (!user) return [];
    try {
      logger.debug(
        `[contentLogHistory] userId = ${user.id}, contentId = ${contentId}`,
      );
      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId: user.id,
          contentId,
        }),
        orderBy: { date: "desc" },
        include: {
          taggedUsers: true,
          bookPublication: { include: { publisher: true } },
        },
      });
      const reviews = await prisma.discussion.findMany({
        where: {
          authorId: user.id,
          contentId,
          type: "comment",
          isDeleted: false,
          ...buildUserCommentsWhere(user.id, user),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      const reviewByLogId = pairReviewsToLogs<any, any>(logs, reviews);
      logger.debug(`[contentLogHistory] Found ${logs.length} logs`);
      return logs.map((log) => {
        const converted = convertLog(log);
        const review = reviewByLogId.get(String(log.id));
        (converted as any).review = review?.description ?? null;
        (converted as any).reviewDiscussion = review ?? null;
        return converted;
      });
    } catch (error) {
      logger.error(`[contentLogHistory] Error: `, error);
      throw new Error("Failed to fetch content log history");
    }
  }

  /**
   * Get all user content logs
   */
  @Authorized()
  @Query(() => [UserContentLog])
  async allUserContentLogs(
    @Arg("userId", () => String, { nullable: true }) userId: string | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog[]> {
    if (!user) return [];
    try {
      const targetUserId = userId || user.id;
      if (targetUserId !== user.id && !user.isAdmin) {
        throw new Error("You can only export your own content logs");
      }
      logger.debug(
        `[allUserContentLogs] targetUserId = ${targetUserId}, limit = ${limit}`,
      );
      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId: targetUserId,
          content: { isDeleted: false },
        }),
        orderBy: { date: "desc" },
        ...(limit !== undefined ? { take: limit } : {}),
        include: {
          taggedUsers: true,
          bookPublication: { include: { publisher: true } },
          content: {
            include: {
              people: {
                include: { person: true, personRole: true },
              },
            },
          },
        },
      });
      logger.debug(`[allUserContentLogs] Found ${logs.length} logs`);
      return logs.map(convertLog);
    } catch (error) {
      logger.error(`[allUserContentLogs] Error: `, error);
      throw new Error("Failed to fetch all user content logs");
    }
  }

  private async getMergedActivityFeed(
    prisma: any,
    userIds: string | string[],
    limit: number = 20,
    viewer?: { id: string; isAdmin?: boolean },
  ): Promise<UserContentLog[]> {
    const whereUserId = Array.isArray(userIds) ? { in: userIds } : userIds;
    const reviewVisibilityWhere = Array.isArray(userIds)
      ? { isPublic: true }
      : buildUserCommentsWhere(userIds, viewer);

    const logs = await prisma.userContentLog.findMany({
      where: buildMeaningfulUserContentLogWhere({
        userId: whereUserId,
        content: { isDeleted: false },
      }),
      orderBy: { date: "desc" },
      take: limit,
      include: {
        taggedUsers: true,
        content: {
          include: {
            contentType: true,
            userContentPreferences: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: {
                id: true,
                type: true,
                version: true,
                filePath: true,
                upvoteCount: true,
                downvoteCount: true,
              },
            },
          },
        },
      },
    });

    const reviews = await prisma.discussion.findMany({
      where: {
        authorId: whereUserId,
        type: "comment",
        isDeleted: false,
        ...reviewVisibilityWhere,
        content: { is: { isDeleted: false } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: {
                id: true,
                type: true,
                version: true,
                filePath: true,
                upvoteCount: true,
                downvoteCount: true,
              },
            },
          },
        },
      },
    });

    const favoritePeople = await prisma.userFavoritePerson.findMany({
      where: { userId: whereUserId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        person: {
          include: {
            contentRoles: {
              select: { role: true },
            },
          },
        },
        user: true,
      },
    });

    const mergedItems: Array<
      UserContentLog & { rawDate: number; isStandaloneReview: boolean }
    > = [];

    const reviewByLogId = pairReviewsToLogs<any, any>(logs, reviews);
    const pairedReviewIds = new Set(
      Array.from(reviewByLogId.values()).map((review) => String(review.id)),
    );

    for (const log of logs) {
      const review = reviewByLogId.get(String(log.id));
      mergedItems.push({
        ...convertLog(log),
        review: review?.description ?? null,
        reviewDiscussion: review ?? null,
        rawDate: log.date.getTime(),
        isStandaloneReview: false,
      });
    }

    for (const rev of reviews) {
      if (!rev.content) continue;
      if (pairedReviewIds.has(String(rev.id))) continue;

      mergedItems.push({
        id: `standalone - review - ${rev.id}`,
        userId: rev.authorId,
        contentId: rev.contentId!,
        date: rev.createdAt,
        isFavorite: false,
        rating: undefined,
        isConsumeLater: false,
        isContinuing: false,
        isConsumed: false,
        isAbandoned: false,
        playtimeMinutes: undefined,
        tags: [],
        taggedUsers: [],
        createdAt: rev.createdAt,
        updatedAt: rev.updatedAt,
        content: convertContentForGraphQL(rev.content),
        review: rev.description,
        reviewDiscussion: rev,
        isStandaloneReview: true,
        rawDate: rev.createdAt.getTime(),
      } as any);
    }

    for (const favorite of favoritePeople) {
      if (!favorite.person) continue;

      mergedItems.push({
        id: `person-favorite-${favorite.id}`,
        userId: favorite.userId,
        contentId: favorite.personId,
        date: favorite.createdAt,
        isFavorite: true,
        rating: undefined,
        isConsumeLater: false,
        isContinuing: false,
        isConsumed: false,
        isAbandoned: false,
        playtimeMinutes: undefined,
        tags: [],
        taggedUsers: [],
        createdAt: favorite.createdAt,
        updatedAt: favorite.createdAt,
        review: undefined,
        isStandaloneReview: false,
        activityType: "PERSON_FAVORITE",
        favoritePerson: convertPersonForActivity(favorite.person),
        user: favorite.user,
        rawDate: favorite.createdAt.getTime(),
      } as any);
    }

    mergedItems.sort((a, b) => b.rawDate - a.rawDate);
    return mergedItems.slice(0, limit) as UserContentLog[];
  }

  /**
   * Activity feed with content details
   */
  @Authorized()
  @Query(() => [UserContentLog])
  async activityFeed(
    @Arg("userId", () => String, { nullable: true }) userId: string | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog[]> {
    if (!user) return [];
    try {
      const targetUserId = userId || user.id;
      logger.debug(
        `[activityFeed] targetUserId = ${targetUserId}, limit = ${limit}`,
      );
      const feed = await this.getMergedActivityFeed(
        prisma,
        targetUserId,
        limit || 20,
        user,
      );
      logger.debug(`[activityFeed] Found ${feed.length} activities`);
      return feed;
    } catch (error) {
      logger.error(`[activityFeed] Error: `, error);
      throw new Error("Failed to fetch activity feed");
    }
  }

  /**
   * Friends activity feed (users that the current user follows)
   */
  @Authorized()
  @Query(() => [UserContentLog])
  async friendsActivityFeed(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog[]> {
    if (!user) return [];
    try {
      logger.debug(
        `[friendsActivityFeed] userId = ${user.id}, limit = ${limit}`,
      );
      const follows = await prisma.userFollow.findMany({
        where: { userId: user.id },
        select: { followingUserId: true },
      });
      const followingIds = follows.map((f) => f.followingUserId);

      if (followingIds.length === 0) {
        logger.debug(`[friendsActivityFeed] No followed users`);
        return [];
      }

      const feed = await this.getMergedActivityFeed(
        prisma,
        followingIds,
        limit || 20,
        user,
      );
      logger.debug(`[friendsActivityFeed] Found ${feed.length} activities`);
      return feed;
    } catch (error) {
      logger.error(`[friendsActivityFeed] Error: `, error);
      throw new Error("Failed to fetch friends activity feed");
    }
  }

  /**
   * Friends activity for a specific content
   */
  @Authorized()
  @Query(() => [UserContentLog])
  async friendsActivityForContent(
    @Arg("contentId", () => String) contentId: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog[]> {
    if (!user) return [];
    try {
      logger.debug(
        `[friendsActivityForContent] userId = ${user.id}, contentId = ${contentId}`,
      );

      const follows = await prisma.userFollow.findMany({
        where: { userId: user.id },
        select: { followingUserId: true },
      });
      const followingIds = follows.map((f) => f.followingUserId);

      if (followingIds.length === 0) return [];

      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId: { in: followingIds },
          contentId,
        }),
        orderBy: { date: "desc" },
        take: limit || 20,
        include: {
          taggedUsers: true,
          user: true,
          content: { include: { contentType: true, images: true } },
        },
      });

      logger.debug(
        `[friendsActivityForContent] Found ${logs.length} friend logs`,
      );
      return logs as any;
    } catch (error) {
      logger.error(`[friendsActivityForContent] Error: `, error);
      throw new Error("Failed to fetch friends activity for content");
    }
  }

  /**
   * Get user's watched/consumed content by type
   */
  @Query(() => [Content])
  async userWatchedContent(
    @Arg("userId", () => String) userId: string,
    @Arg("contentType", () => String) contentType: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Content[]> {
    try {
      logger.debug(
        `[userWatchedContent] userId = ${userId}, type = ${contentType}`,
      );
      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId,
          content: {
            isDeleted: false,
            contentType: { name: contentType.toUpperCase() },
          },
        }),
        orderBy: { date: "desc" },
        include: {
          content: {
            include: {
              contentType: true,
              images: true,
              genres: { include: { genre: true } },
              userContentPreferences: true,
            },
          },
        },
      });

      const contentMap = new Map<string, any>();
      for (const log of logs) {
        if (!contentMap.has(log.contentId) && log.content) {
          const pref = log.content?.userContentPreferences?.find(
            (p: any) => p.userId === log.userId,
          );
          const c = convertContentForGraphQL(
            log.content,
            pref?.posterImageId,
            pref?.backdropImageId,
          );
          (c as any).isConsumed = log.isConsumed ?? false;
          (c as any).isFavorite = log.isFavorite ?? false;
          (c as any).isConsumeLater = log.isConsumeLater ?? false;
          (c as any).userIsContinuing = log.isContinuing ?? false;
          (c as any).userRating =
            log.rating !== null && log.rating !== undefined
              ? Number(log.rating)
              : undefined;
          (c as any).userDate = log.date;
          contentMap.set(log.contentId, c);
        }
      }

      if (contentMap.size > 0) {
        const reviews = await prisma.discussion.findMany({
          where: {
            authorId: userId,
            contentId: { in: Array.from(contentMap.keys()) },
            type: "comment",
            isDeleted: false,
          },
          select: { contentId: true },
          distinct: ["contentId"],
        });
        const reviewContentIds = new Set(reviews.map((r) => r.contentId));
        for (const [contentId, content] of contentMap) {
          (content as any).hasReview = reviewContentIds.has(contentId);
        }
      }

      logger.debug(
        `[userWatchedContent] Found ${contentMap.size} unique contents`,
      );
      return Array.from(contentMap.values());
    } catch (error) {
      logger.error(`[userWatchedContent] Error: `, error);
      throw new Error("Failed to fetch user watched content");
    }
  }

  /**
   * Get user's favorite content by type
   */
  @Query(() => [Content])
  async userFavoriteContent(
    @Arg("userId", () => String) userId: string,
    @Arg("contentType", () => String) contentType: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Content[]> {
    try {
      logger.debug(
        `[userFavoriteContent] userId = ${userId}, type = ${contentType}`,
      );
      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId,
          content: {
            isDeleted: false,
            contentType: { name: contentType.toUpperCase() },
          },
        }),
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        include: {
          content: {
            include: {
              contentType: true,
              images: true,
              genres: { include: { genre: true } },
              userContentPreferences: true,
            },
          },
        },
      });

      const latestLogs = dedupeLatestLogsByContent(logs);

      const contentMap = new Map<string, any>();
      for (const log of latestLogs) {
        if (log.isFavorite && !contentMap.has(log.contentId) && log.content) {
          const pref = log.content?.userContentPreferences?.find(
            (p: any) => p.userId === log.userId,
          );
          const c = convertContentForGraphQL(
            log.content,
            pref?.posterImageId,
            pref?.backdropImageId,
          );
          (c as any).isConsumed = log.isConsumed ?? false;
          (c as any).isFavorite = log.isFavorite ?? false;
          (c as any).isConsumeLater = log.isConsumeLater ?? false;
          (c as any).userIsContinuing = log.isContinuing ?? false;
          (c as any).userRating =
            log.rating !== null && log.rating !== undefined
              ? Number(log.rating)
              : undefined;
          (c as any).userDate = log.date;
          contentMap.set(log.contentId, c);
        }
      }

      if (contentMap.size > 0) {
        const reviews = await prisma.discussion.findMany({
          where: {
            authorId: userId,
            contentId: { in: Array.from(contentMap.keys()) },
            type: "comment",
            isDeleted: false,
          },
          select: { contentId: true },
          distinct: ["contentId"],
        });
        const reviewContentIds = new Set(reviews.map((r) => r.contentId));
        for (const [contentId, content] of contentMap) {
          (content as any).hasReview = reviewContentIds.has(contentId);
        }
      }

      logger.debug(`[userFavoriteContent] Found ${contentMap.size} favorites`);
      return Array.from(contentMap.values());
    } catch (error) {
      logger.error(`[userFavoriteContent] Error: `, error);
      throw new Error("Failed to fetch user favorite content");
    }
  }

  /**
   * Get user's featured content by type
   */
  @Query(() => [Content])
  async userFeaturedContent(
    @Arg("userId", () => String) userId: string,
    @Arg("contentType", () => String) contentType: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Content[]> {
    try {
      logger.debug(
        `[userFeaturedContent] userId = ${userId}, type = ${contentType}`,
      );
      const featured = await prisma.userFeaturedContent.findMany({
        where: {
          userId,
          content: {
            isDeleted: false,
            contentType: { name: contentType.toUpperCase() },
          },
        },
        orderBy: { displayOrder: "asc" },
        include: {
          content: {
            include: {
              contentType: true,
              images: true,
              userContentPreferences: true,
            },
          },
        },
      });

      logger.debug(
        `[userFeaturedContent] Found ${featured.length} featured contents`,
      );
      const contents = featured
        .filter((f) => f.content)
        .map((f) => {
          const pref = f.content?.userContentPreferences?.find(
            (p: any) => p.userId === f.userId,
          );
          return convertContentForGraphQL(
            f.content,
            pref?.posterImageId,
            pref?.backdropImageId,
          ) as any;
        });

      if (contents.length > 0) {
        const contentIds = contents.map((c: any) => c.id);
        const reviews = await prisma.discussion.findMany({
          where: {
            authorId: userId,
            contentId: { in: contentIds },
            type: "comment",
            isDeleted: false,
          },
          select: { contentId: true },
          distinct: ["contentId"],
        });
        const reviewContentIds = new Set(reviews.map((r) => r.contentId));
        for (const c of contents) {
          c.hasReview = reviewContentIds.has(c.id);
        }
      }

      return contents;
    } catch (error) {
      logger.error(`[userFeaturedContent] Error: `, error);
      throw new Error("Failed to fetch user featured content");
    }
  }

  /**
   * Get user stats (total movies, this year, average rating)
   */
  @Query(() => UserStats)
  async userStats(
    @Arg("userId", () => String) userId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<UserStats> {
    try {
      logger.debug(`[userStats] userId = ${userId}`);
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);

      const logs = await prisma.userContentLog.findMany({
        where: buildMeaningfulUserContentLogWhere({
          userId,
          content: { isDeleted: false },
        }),
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        select: {
          contentId: true,
          date: true,
          updatedAt: true,
          rating: true,
          isConsumed: true,
          content: { select: { contentType: { select: { name: true } } } },
        },
      });

      const latestLogs = dedupeLatestLogsByContent(logs);

      const totalMovies = latestLogs.filter(
        (log: any) =>
          log.isConsumed && log.content?.contentType?.name === "MOVIE",
      ).length;

      const thisYearMovies = latestLogs.filter((log: any) => {
        if (!log.isConsumed || log.content?.contentType?.name !== "MOVIE") {
          return false;
        }

        if (!log.date) return false;
        return new Date(log.date) >= yearStart;
      }).length;

      const ratedLogs = latestLogs.filter(
        (log: any) => log.rating !== null && log.rating !== undefined,
      );
      const averageRating =
        ratedLogs.length > 0
          ? ratedLogs.reduce(
              (sum: number, log: any) => sum + Number(log.rating),
              0,
            ) / ratedLogs.length
          : 0;

      // Discussion count
      const discussionCount = await prisma.discussion.count({
        where: { authorId: userId, isDeleted: false },
      });

      const result: UserStats = {
        totalMovies,
        thisYearMovies,
        averageRating,
        discussionCount,
      };

      logger.debug(`[userStats] Result: `, result);
      return result;
    } catch (error) {
      logger.error(`[userStats] Error: `, error);
      throw new Error("Failed to fetch user stats");
    }
  }

  /**
   * Get content stats (consume count, favorite count, rating distribution, etc.)
   */
  @Query(() => ContentStats)
  async contentStats(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentStats> {
    try {
      logger.debug(`[contentStats] contentId = ${contentId}`);

      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          contentTypeId: true,
          tmdbId: true,
          tmdbRating: true,
          title: true,
          originalTitle: true,
          releaseDate: true,
          firstAirDate: true,
          consumeCount: true,
          favoriteCount: true,
          discussionCount: true,
          ratingDistribution: true,
          totalRatingScore: true,
          totalRatingVotes: true,
          totalPlaytimeMinutes: true,
          totalPlaytimeLogs: true,
        },
      });

      // Count consume later
      const consumeLaterCount = await prisma.userContentLog.count({
        where: { contentId, isConsumeLater: true },
      });

      const ratingStats = await calculateContentRatingStats(prisma, contentId);

      const storedDistribution = content?.ratingDistribution ?? [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ];
      const storedScore = content?.totalRatingScore
        ? Number(content.totalRatingScore)
        : 0;
      const storedVotes = content?.totalRatingVotes ?? 0;

      const hasStaleRatingStats =
        storedVotes !== ratingStats.ratingCount ||
        storedScore !== ratingStats.totalRatingScore ||
        JSON.stringify(storedDistribution) !==
          JSON.stringify(ratingStats.ratingDistribution);

      if (content && hasStaleRatingStats) {
        await prisma.content.update({
          where: { id: contentId },
          data: {
            totalRatingVotes: ratingStats.ratingCount,
            totalRatingScore: ratingStats.totalRatingScore,
            ratingDistribution: ratingStats.ratingDistribution,
          },
        });

        logger.debug(
          `[contentStats] Self-healed stale rating stats for content ${contentId}`,
        );
      }

      const tmdbRating = content
        ? await resolveAndCacheTmdbRating(prisma, content)
        : null;

      const result: ContentStats = {
        consumeCount: content?.consumeCount ?? 0,
        favoriteCount: content?.favoriteCount ?? 0,
        consumeLaterCount,
        discussionCount: content?.discussionCount ?? 0,
        averageRating: ratingStats.averageRating ?? undefined,
        ratingCount: ratingStats.ratingCount,
        ratingDistribution: ratingStats.ratingDistribution,
        averagePlaytimeMinutes:
          content?.totalPlaytimeLogs &&
          content.totalPlaytimeLogs > 0 &&
          content.totalPlaytimeMinutes
            ? Math.round(
                content.totalPlaytimeMinutes / content.totalPlaytimeLogs,
              )
            : undefined,
        tmdbRating: tmdbRating ?? undefined,
      };

      logger.debug(`[contentStats] Result: `, result);
      return result;
    } catch (error) {
      logger.error(`[contentStats] Error: `, error);
      throw new Error("Failed to fetch content stats");
    }
  }

  /**
   * Get users who rated a specific content with a specific rating
   */
  @Query(() => [RatingUser])
  async getUsersByRating(
    @Arg("contentId", () => String) contentId: string,
    @Arg("rating", () => Float) rating: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<RatingUser[]> {
    try {
      logger.debug(
        `[getUsersByRating] contentId = ${contentId}, rating = ${rating}`,
      );

      // We use raw query similarly to calculateContentRatingStats to get the latest rating per user
      const ratedLogs = await prisma.$queryRaw<
        Array<{
          user_id: string;
          username: string;
          picture_url: string | null;
          rating: number | string;
          date: Date;
        }>
      >`
        SELECT DISTINCT ON (l.user_id) 
          l.user_id,
          u.username,
          u.picture_url,
          l.rating,
          l.date
        FROM "user_content_log" l
        JOIN "app_user" u ON u.auth_user_id = l.user_id
        WHERE l.content_id = ${contentId}
          AND l.rating IS NOT NULL
        ORDER BY l.user_id, l.date DESC
      `;

      // Filter by the requested rating and map to RatingUser
      const result = ratedLogs
        .filter((log) => Number(log.rating) === rating)
        .map((log) => {
          const ratingUser: RatingUser = {
            userId: log.user_id,
            username: log.username,
            displayName: undefined,
            avatarUrl: log.picture_url || undefined,
            rating: Number(log.rating),
            createdAt: log.date,
          };
          return ratingUser;
        });

      return result;
    } catch (error) {
      logger.error(`[getUsersByRating] Error: `, error);
      throw new Error("Failed to fetch users by rating");
    }
  }
}

@ObjectType()
export class PlaytimeLeaderboardEntry {
  @Field(() => String)
  userId: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => Int)
  playtimeMinutes: number;

  @Field(() => Date)
  updatedAt: Date;
}
