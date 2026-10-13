import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
} from "type-graphql";
import { Prisma } from "@prisma/client";
import { GraphQLContext } from "../../context";
import { requireAdmin, requireAdminOrModerator } from "../../lib/authGuard";
import { createNotification } from "../../lib/notifications";
import { NOTIFICATION_TYPE_ID } from "../../lib/notificationTypes";
import { AdminUser, UpdateUserRolesInput } from "../../types/admin";
import { logger } from "../../lib/logger";

/**
 * Deletion order respects foreign key constraints.
 * Junction / child tables are deleted first, then parent tables.
 */
const TABLE_DELETE_ORDER = [
  "report",
  "discussionCommentVote",
  "discussionVote",
  "discussionComment",
  "discussion",
  "userFeaturedContent",
  "userListVote",
  "userListCollaborator",
  "userSavedList",
  "userListItem",
  "userList",
  "quizLeaderboard",
  "quizResult",
  "quizSettings",
  "userExpansionLog",
  "expansion",
  "notification",
  "userFollow",
  "userContentLog",
  "userEpisodeLog",
  "contentRecommendation",
  "contentRequest",
  "contentPlatform",
  "contentPerspective",
  "contentGameMode",
  "contentGameEngine",
  "contentMood",
  "contentTheme",
  "contentScreenshot",
  "contentImage",
  "contentCompany",
  "contentPerson",
  "contentGenre",
  "tvEpisode",
  "tvSeason",
  "content",
  "franchise",
  "language",
  "ageRating",
  "mood",
  "theme",
  "platform",
  "perspective",
  "gameMode",
  "genre",
  "personRole",
  "companyRole",
  "company",
  "person",
] as const;

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

async function collectDiscussionCommentTreeIds(
  prisma: any,
  rootIds: number[],
): Promise<number[]> {
  if (rootIds.length === 0) return [];

  const allIds = new Set(rootIds);
  let frontier = [...rootIds];

  while (frontier.length > 0) {
    const replies = await prisma.discussionComment.findMany({
      where: {
        parentId: { in: frontier },
        OR: [{ isDeleted: true }, { isDeleted: false }],
      },
      select: { id: true },
    });

    const nextFrontier: number[] = [];
    for (const reply of replies) {
      if (allIds.has(reply.id)) continue;
      allIds.add(reply.id);
      nextFrontier.push(reply.id);
    }

    frontier = nextFrontier;
  }

  return [...allIds];
}

async function recalculateGameMedianPlaytime(prisma: any, contentId: string) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: { contentType: true },
  });

  if (content?.contentType?.name !== "GAME") {
    return;
  }

  const result = await prisma.$queryRaw<Array<{ median: number | null }>>`
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY playtime_minutes) AS median
    FROM "user_content_log"
    WHERE content_id = ${contentId}
      AND playtime_minutes IS NOT NULL
      AND is_consumed = true
  `;

  const medianVal = result[0]?.median;
  const median = medianVal ? Math.round(Number(medianVal)) : null;

  await prisma.content.update({
    where: { id: contentId },
    data: { runtime: median, averageDuration: median },
  });
}

async function recalculateContentAggregates(prisma: any, contentIds: string[]) {
  if (contentIds.length === 0) return;

  const uniqueContentIds = uniqueValues(contentIds);
  const latestLogs = await prisma.$queryRaw<
    Array<{
      contentId: string;
      rating: number | string | null;
      isConsumed: boolean;
      isFavorite: boolean;
    }>
  >`
    SELECT DISTINCT ON (user_id, content_id)
      content_id AS "contentId",
      rating,
      is_consumed AS "isConsumed",
      is_favorite AS "isFavorite"
    FROM "user_content_log"
    WHERE content_id IN (${Prisma.join(uniqueContentIds)})
    ORDER BY user_id, content_id, date DESC
  `;

  const playtimeRows = await prisma.$queryRaw<
    Array<{
      contentId: string;
      totalPlaytimeMinutes: number | string;
      totalPlaytimeLogs: number | string;
    }>
  >`
    SELECT
      content_id AS "contentId",
      COALESCE(SUM(playtime_minutes), 0)::int AS "totalPlaytimeMinutes",
      COUNT(*)::int AS "totalPlaytimeLogs"
    FROM "user_content_log"
    WHERE content_id IN (${Prisma.join(uniqueContentIds)})
      AND playtime_minutes IS NOT NULL
    GROUP BY content_id
  `;

  const discussionRows = await prisma.$queryRaw<
    Array<{ contentId: string; discussionCount: number | string }>
  >`
    SELECT
      content_id AS "contentId",
      COUNT(*)::int AS "discussionCount"
    FROM "discussion"
    WHERE content_id IN (${Prisma.join(uniqueContentIds)})
      AND type = 'comment'
      AND is_deleted = false
    GROUP BY content_id
  `;

  const aggregateMap = new Map<
    string,
    {
      consumeCount: number;
      favoriteCount: number;
      ratingDistribution: number[];
      totalRatingScore: number;
      totalRatingVotes: number;
      discussionCount: number;
      totalPlaytimeMinutes: number | null;
      totalPlaytimeLogs: number;
    }
  >();

  for (const contentId of uniqueContentIds) {
    aggregateMap.set(contentId, {
      consumeCount: 0,
      favoriteCount: 0,
      ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalRatingScore: 0,
      totalRatingVotes: 0,
      discussionCount: 0,
      totalPlaytimeMinutes: null,
      totalPlaytimeLogs: 0,
    });
  }

  for (const log of latestLogs) {
    const aggregate = aggregateMap.get(log.contentId);
    if (!aggregate) continue;

    if (log.isConsumed) aggregate.consumeCount += 1;
    if (log.isFavorite) aggregate.favoriteCount += 1;

    if (log.rating !== null) {
      const rating = Number(log.rating);
      if (Number.isFinite(rating) && rating > 0 && rating <= 10) {
        const ratingIndex = Math.round(rating) - 1;
        if (ratingIndex >= 0 && ratingIndex < aggregate.ratingDistribution.length) {
          aggregate.ratingDistribution[ratingIndex] += 1;
        }
        aggregate.totalRatingScore += rating;
        aggregate.totalRatingVotes += 1;
      }
    }
  }

  for (const row of playtimeRows) {
    const aggregate = aggregateMap.get(row.contentId);
    if (!aggregate) continue;
    aggregate.totalPlaytimeMinutes = Number(row.totalPlaytimeMinutes);
    aggregate.totalPlaytimeLogs = Number(row.totalPlaytimeLogs);
  }

  for (const row of discussionRows) {
    const aggregate = aggregateMap.get(row.contentId);
    if (!aggregate) continue;
    aggregate.discussionCount = Number(row.discussionCount);
  }

  for (const [contentId, aggregate] of aggregateMap) {
    await prisma.content.update({
      where: { id: contentId },
      data: {
        consumeCount: aggregate.consumeCount,
        favoriteCount: aggregate.favoriteCount,
        discussionCount: aggregate.discussionCount,
        ratingDistribution: aggregate.ratingDistribution,
        totalRatingVotes: aggregate.totalRatingVotes,
        totalRatingScore:
          aggregate.totalRatingVotes > 0 ? aggregate.totalRatingScore : null,
        totalPlaytimeMinutes:
          aggregate.totalPlaytimeLogs > 0 ? aggregate.totalPlaytimeMinutes : null,
        totalPlaytimeLogs: aggregate.totalPlaytimeLogs,
      },
    });

    await recalculateGameMedianPlaytime(prisma, contentId);
  }
}

async function recalculateExpansionAggregates(
  prisma: any,
  expansionIds: number[],
) {
  if (expansionIds.length === 0) return;

  const uniqueExpansionIds = uniqueValues(expansionIds);
  const logs = await prisma.userExpansionLog.findMany({
    where: { expansionId: { in: uniqueExpansionIds } },
    select: { expansionId: true, isConsumed: true, rating: true },
  });

  const aggregateMap = new Map<
    number,
    { consumeCount: number; ratingDistribution: number[] }
  >();

  for (const expansionId of uniqueExpansionIds) {
    aggregateMap.set(expansionId, {
      consumeCount: 0,
      ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
  }

  for (const log of logs) {
    const aggregate = aggregateMap.get(log.expansionId);
    if (!aggregate) continue;

    if (log.isConsumed) aggregate.consumeCount += 1;
    if (log.rating !== null) {
      const rating = Number(log.rating);
      if (Number.isFinite(rating) && rating > 0 && rating <= 10) {
        const ratingIndex = Math.round(rating) - 1;
        if (ratingIndex >= 0 && ratingIndex < aggregate.ratingDistribution.length) {
          aggregate.ratingDistribution[ratingIndex] += 1;
        }
      }
    }
  }

  for (const [expansionId, aggregate] of aggregateMap) {
    await prisma.expansion.update({
      where: { id: expansionId },
      data: {
        consumeCount: aggregate.consumeCount,
        ratingDistribution: aggregate.ratingDistribution,
      },
    });
  }
}

async function recalculateEpisodeAggregates(prisma: any, episodeIds: number[]) {
  if (episodeIds.length === 0) return;

  const uniqueEpisodeIds = uniqueValues(episodeIds);
  const rows = await prisma.$queryRaw<
    Array<{
      episodeId: number;
      totalRatingScore: number | string;
      totalRatingVotes: number | string;
    }>
  >`
    SELECT
      episode_id AS "episodeId",
      COALESCE(SUM(rating), 0) AS "totalRatingScore",
      COUNT(*)::int AS "totalRatingVotes"
    FROM "user_episode_log"
    WHERE episode_id IN (${Prisma.join(uniqueEpisodeIds)})
      AND rating IS NOT NULL
    GROUP BY episode_id
  `;

  const aggregateMap = new Map<number, { score: number; votes: number }>();
  for (const row of rows) {
    aggregateMap.set(row.episodeId, {
      score: Number(row.totalRatingScore),
      votes: Number(row.totalRatingVotes),
    });
  }

  for (const episodeId of uniqueEpisodeIds) {
    const aggregate = aggregateMap.get(episodeId);
    await prisma.tvEpisode.update({
      where: { id: episodeId },
      data: {
        totalRatingScore: aggregate && aggregate.votes > 0 ? aggregate.score : null,
        totalRatingVotes: aggregate?.votes ?? 0,
      },
    });
  }
}

async function recalculateDiscussionCommentCounts(
  prisma: any,
  discussionIds: number[],
) {
  if (discussionIds.length === 0) return;

  const uniqueDiscussionIds = uniqueValues(discussionIds);
  const rows = await prisma.$queryRaw<
    Array<{ discussionId: number; commentCount: number | string }>
  >`
    SELECT
      discussion_id AS "discussionId",
      COUNT(*)::int AS "commentCount"
    FROM "discussion_comment"
    WHERE discussion_id IN (${Prisma.join(uniqueDiscussionIds)})
      AND is_deleted = false
    GROUP BY discussion_id
  `;

  const countMap = new Map<number, number>();
  for (const row of rows) {
    countMap.set(row.discussionId, Number(row.commentCount));
  }

  for (const discussionId of uniqueDiscussionIds) {
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { commentCount: countMap.get(discussionId) ?? 0 },
    });
  }
}

export async function permanentlyDeleteUser(prisma: any, userId: string) {
  const targetUser = await prisma.appUser.findFirst({
    where: { 
      id: userId, 
      OR: [{ isDeleted: true }, { isDeleted: false }] 
    },
    select: { id: true, username: true },
  });

  if (!targetUser) {
    throw new Error("User not found");
  }

  await prisma.$transaction(async (tx: any) => {
    const userDiscussions = await tx.discussion.findMany({
      where: {
        authorId: userId,
        OR: [{ isDeleted: true }, { isDeleted: false }],
      },
      select: { id: true, contentId: true, type: true },
    });
    const userDiscussionIds = userDiscussions.map((discussion: any) => discussion.id);
    const reviewContentIds = userDiscussions
      .filter((discussion: any) => discussion.type === "comment" && discussion.contentId)
      .map((discussion: any) => discussion.contentId as string);

    const userLogs = await tx.userContentLog.findMany({
      where: { userId },
      select: { contentId: true },
    });
    const userEpisodeLogs = await tx.userEpisodeLog.findMany({
      where: { userId },
      select: { episodeId: true },
    });
    const userExpansionLogs = await tx.userExpansionLog.findMany({
      where: { userId },
      select: { expansionId: true },
    });

    const foreignDiscussionCommentRoots = await tx.discussionComment.findMany({
      where: {
        authorId: userId,
        OR: [{ isDeleted: true }, { isDeleted: false }],
        ...(userDiscussionIds.length > 0
          ? { discussionId: { notIn: userDiscussionIds } }
          : {}),
      },
      select: { id: true, discussionId: true },
    });
    const foreignDiscussionCommentIds = await collectDiscussionCommentTreeIds(
      tx,
      foreignDiscussionCommentRoots.map((comment: any) => comment.id),
    );
    const affectedForeignDiscussionIds: number[] = uniqueValues(
      foreignDiscussionCommentRoots.map((comment: any) => comment.discussionId),
    );

    const ownedDiscussionComments = userDiscussionIds.length
      ? await tx.discussionComment.findMany({
          where: {
            discussionId: { in: userDiscussionIds },
            OR: [{ isDeleted: true }, { isDeleted: false }],
          },
          select: { id: true },
        })
      : [];
    const ownedDiscussionCommentIds = ownedDiscussionComments.map(
      (comment: any) => comment.id,
    );

    const affectedContentIds: string[] = uniqueValues([
      ...userLogs.map((log: any) => log.contentId),
      ...reviewContentIds,
    ]);
    const affectedEpisodeIds: number[] = uniqueValues(
      userEpisodeLogs.map((log: any) => log.episodeId),
    );
    const affectedExpansionIds: number[] = uniqueValues(
      userExpansionLogs.map((log: any) => log.expansionId),
    );

    if (foreignDiscussionCommentIds.length > 0) {
      await tx.notification.deleteMany({
        where: { discussionCommentId: { in: foreignDiscussionCommentIds } },
      });
      await tx.report.deleteMany({
        where: {
          targetType: "discussionComment",
          targetId: { in: foreignDiscussionCommentIds.map(String) },
        },
      });
      await tx.discussionCommentVote.deleteMany({
        where: { commentId: { in: foreignDiscussionCommentIds } },
      });
      await tx.discussionCommentMention.deleteMany({
        where: { commentId: { in: foreignDiscussionCommentIds } },
      });
      await tx.discussionComment.deleteMany({
        where: { id: { in: foreignDiscussionCommentIds } },
      });
    }

    if (userDiscussionIds.length > 0) {
      await tx.notification.deleteMany({
        where: {
          OR: [
            { replyId: { in: userDiscussionIds } },
            ...(ownedDiscussionCommentIds.length > 0
              ? [{ discussionCommentId: { in: ownedDiscussionCommentIds } }]
              : []),
          ],
        },
      });
      await tx.report.deleteMany({
        where: {
          OR: [
            {
              targetType: { in: ["discussion", "comment"] },
              targetId: { in: userDiscussionIds.map(String) },
            },
            ...(ownedDiscussionCommentIds.length > 0
              ? [
                  {
                    targetType: "discussionComment",
                    targetId: { in: ownedDiscussionCommentIds.map(String) },
                  },
                ]
              : []),
          ],
        },
      });
      if (ownedDiscussionCommentIds.length > 0) {
        await tx.discussionCommentVote.deleteMany({
          where: { commentId: { in: ownedDiscussionCommentIds } },
        });
        await tx.discussionCommentMention.deleteMany({
          where: { commentId: { in: ownedDiscussionCommentIds } },
        });
      }
      await tx.discussionVote.deleteMany({
        where: { discussionId: { in: userDiscussionIds } },
      });
      await tx.discussionComment.deleteMany({
        where: { discussionId: { in: userDiscussionIds } },
      });
      await tx.discussion.deleteMany({
        where: { id: { in: userDiscussionIds } },
      });
    }

    await tx.contentRequest.updateMany({
      where: { reviewedBy: userId },
      data: { reviewedBy: null, reviewedAt: null },
    });
    await tx.contentRequest.deleteMany({
      where: { requesterUserId: userId },
    });
    await tx.importJob.deleteMany({ where: { userId } });
    await tx.userList.deleteMany({ where: { ownerId: userId } });
    await tx.appUser.delete({ where: { id: userId } });

    await recalculateDiscussionCommentCounts(tx, affectedForeignDiscussionIds);
    await recalculateContentAggregates(tx, affectedContentIds);
    await recalculateEpisodeAggregates(tx, affectedEpisodeIds);
    await recalculateExpansionAggregates(tx, affectedExpansionIds);
  });

  logger.success(`[Admin] Permanently deleted user ${targetUser.username} (${userId})`);
}

@Resolver()
export class AdminUserResolver {
  @Authorized()
  @Query(() => [AdminUser])
  async listUsers(
    @Arg("search", () => String, { nullable: true }) search: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 100 })
    limit: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<AdminUser[]> {
    requireAdminOrModerator(user);

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const users = await prisma.appUser.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isModerator: true,
        createdAt: true,
      },
    });

    return users.map((u) => ({
      authUserId: u.id,
      username: u.username,
      email: u.email,
      isAdmin: u.isAdmin,
      isModerator: u.isModerator,
      createdAt: u.createdAt,
    }));
  }

  @Authorized()
  @Mutation(() => Boolean)
  async updateUserRoles(
    @Arg("userId", () => String) userId: string,
    @Arg("roles", () => UpdateUserRolesInput) roles: UpdateUserRolesInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(user);

    const updateData: Record<string, boolean> = {};
    if (roles.isAdmin !== undefined) updateData.isAdmin = roles.isAdmin;
    if (roles.isModerator !== undefined) {
      updateData.isModerator = roles.isModerator;
    }

    const existingUser = await prisma.appUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isAdmin: true,
        isModerator: true,
      },
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    const grantedRoles: string[] = [];
    if (roles.isAdmin === true && !existingUser.isAdmin) {
      grantedRoles.push("admin");
    }
    if (roles.isModerator === true && !existingUser.isModerator) {
      grantedRoles.push("mod");
    }

    await prisma.appUser.update({
      where: { id: userId },
      data: updateData,
    });

    if (grantedRoles.length > 0) {
      const roleLabel =
        grantedRoles.length === 2 ? "admin ve mod" : grantedRoles[0];

      await createNotification(prisma, {
        recipientUserId: userId,
        actorUserId: user.id,
        typeId: NOTIFICATION_TYPE_ID.ROLE_GRANTED,
        message: `${roleLabel} yetkisi verildi.`,
      });
    }

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteUser(
    @Arg("userId", () => String) userId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(user);

    if (user.id === userId) {
      throw new Error("Cannot delete your own account");
    }

    logger.info(`[Admin] Permanently deleting user: ${userId}`);
    await permanentlyDeleteUser(prisma, userId);
    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteAllUsers(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(user);

    try {
      const usersToDelete = await prisma.appUser.findMany({
        where: {
          id: { not: user.id },
          OR: [{ isDeleted: false }, { isDeleted: true }],
        },
        select: { id: true },
      });

      for (const targetUser of usersToDelete) {
        await permanentlyDeleteUser(prisma, targetUser.id);
      }

      logger.success(
        `[Admin] Deleted ${usersToDelete.length} users (current admin preserved)`,
      );
      return true;
    } catch (error) {
      logger.error("[Admin] Error deleting users", error);
      throw new Error("Failed to delete users: " + (error as Error).message);
    }
  }

  @Authorized()
  @Mutation(() => Boolean)
  async resetAllData(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(user);

    logger.info(`[Admin] resetAllData triggered by ${user.id}`);

    try {
      for (const table of TABLE_DELETE_ORDER) {
        try {
          const count = await (prisma as any)[table].deleteMany({});
          logger.debug(`  Deleted ${count.count} rows from ${table}`);
        } catch (err) {
          logger.warn(`  Skipping ${table}: ${(err as Error).message}`);
        }
      }

      logger.success("[Admin] All data reset (users & content types preserved)");
      return true;
    } catch (error) {
      logger.error("[Admin] resetAllData failed", error);
      throw new Error("Failed to reset data: " + (error as Error).message);
    }
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteAllContentByType(
    @Arg("typeSlug", () => String) typeSlug: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(user);
    logger.info(`[Admin] deleteAllContentByType (${typeSlug}) triggered by ${user.id}`);

    try {
      const contentType = await prisma.contentTypeLookup.findFirst({
        where: { name: { equals: typeSlug, mode: "insensitive" } },
      });
      if (!contentType) throw new Error(`Content type ${typeSlug} not found`);

      const count = await prisma.content.deleteMany({
        where: { contentTypeId: contentType.id }
      });

      logger.success(`[Admin] Deleted ${count.count} contents of type ${typeSlug}`);
      return true;
    } catch (error) {
      logger.error(`[Admin] deleteAllContentByType (${typeSlug}) failed`, error);
      throw new Error("Failed to delete content by type: " + (error as Error).message);
    }
  }
}
