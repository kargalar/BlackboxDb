import { ObjectType, InputType, Field, Int, Float } from "type-graphql";
import GraphQLJSON from "graphql-type-json";
import { UserContentLog } from "../types/UserContentLog";
import { Content } from "../types/Content";
import { AppUser } from "../types/User";
import { Person } from "../types/Person";
import {
  convertBookPublicationForGraphQL,
  convertContentForGraphQL,
} from "../resolvers/content/ContentUtils";
import { isUpcomingRelease } from "../lib/releaseNotificationHelper";
import { logger } from "../lib/logger";

export async function updateGameMedianPlaytime(
  prisma: any,
  contentId: string,
  rethrowOnError = false,
) {
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { contentType: true },
    });

    if (content?.contentType?.name === "GAME") {
      const result = await prisma.$queryRaw<Array<{ median: number }>>`
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY playtime_minutes) as median
        FROM "user_content_log"
        WHERE content_id = ${contentId} AND playtime_minutes IS NOT NULL AND is_consumed = true
      `;

      const medianVal = result[0]?.median;
      const median = medianVal ? Math.round(Number(medianVal)) : null;

      await prisma.content.update({
        where: { id: contentId },
        data: { runtime: median, averageDuration: median },
      });
    }
  } catch (error) {
    logger.error(
      "[updateGameMedianPlaytime] Error dynamically calculating game runtime:",
      error,
    );
    if (rethrowOnError) throw error;
  }
}

export async function shouldEnableNotifyOnRelease(
  prisma: any,
  contentId: string,
) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { releaseDate: true, status: true },
  });

  return isUpcomingRelease(content);
}

export async function cleanupReviewOnContentRemoval(
  prisma: any,
  userId: string,
  contentId: string,
  logIdToBeExcluded?: number,
) {
  try {
    // Check if the user has any remaining logs for this content where isConsumed is true
    const remainingLogsCount = await prisma.userContentLog.count({
      where: {
        userId,
        contentId,
        isConsumed: true,
        ...(logIdToBeExcluded ? { id: { not: logIdToBeExcluded } } : {}),
      },
    });

    // If there are no consumed logs left, we should soft-delete the review/comment
    if (remainingLogsCount === 0) {
      const existingReview = await prisma.discussion.findFirst({
        where: {
          contentId,
          authorId: userId,
          type: "comment",
          isDeleted: false,
        },
      });

      if (existingReview) {
        await prisma.discussion.update({
          where: { id: existingReview.id },
          data: { isDeleted: true, deletedAt: new Date() },
        });

        await prisma.content.update({
          where: { id: contentId },
          data: { discussionCount: { decrement: 1 } },
        });

        await prisma.content.updateMany({
          where: { id: contentId, discussionCount: { lt: 0 } },
          data: { discussionCount: 0 },
        });

        logger.info(
          `[cleanupReviewOnContentRemoval] Soft-deleted review ${existingReview.id} for user ${userId} and content ${contentId} because the content was unlogged/removed.`,
        );
      }
    }
  } catch (error) {
    logger.error(
      "[cleanupReviewOnContentRemoval] Error during review cleanup:",
      error,
    );
  }
}

export async function syncTvShowWatchState(
  prisma: any,
  userId: string,
  tvShowId: string,
) {
  const now = new Date();
  const episodes = await prisma.tvEpisode.findMany({
    where: {
      tvShowId,
      seasonNumber: { gt: 0 },
    },
    select: {
      id: true,
      seasonNumber: true,
      airDate: true,
      season: { select: { airDate: true } },
    },
  });

  const airedEpisodes = episodes.filter((episode: any) => {
    const releaseDate = episode.airDate ?? episode.season?.airDate;
    return !releaseDate || releaseDate <= now;
  });
  const totalEpisodes = airedEpisodes.length;
  if (totalEpisodes === 0) return;

  const watchedLogs = await prisma.userEpisodeLog.findMany({
    where: {
      userId,
      watched: true,
      episodeId: { in: airedEpisodes.map((episode: any) => episode.id) },
    },
    select: { episodeId: true },
  });
  const watchedEpisodes = watchedLogs.length;

  const existingLog = await prisma.userContentLog.findFirst({
    where: { userId, contentId: tvShowId },
    orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
  });

  // If the user already marked this TV show as consumed (watched),
  // do not downgrade it or force it to continuing just because some episodes are unwatched.
  // The user explicitly controls the overall series watch state.
  if (existingLog?.isConsumed) {
    if (existingLog.isContinuing) {
      await prisma.userContentLog.update({
        where: { id: existingLog.id },
        data: { isContinuing: false },
      });
    }
    return;
  }

  const airedSeasonNumbers = new Set(
    airedEpisodes.map((episode: any) => episode.seasonNumber),
  );
  const hasAiringSeason = episodes.some((episode: any) => {
    const releaseDate = episode.airDate ?? episode.season?.airDate;
    return (
      airedSeasonNumbers.has(episode.seasonNumber) &&
      releaseDate &&
      releaseDate > now
    );
  });

  const isConsumed = watchedEpisodes >= totalEpisodes && !hasAiringSeason;
  const isContinuing =
    watchedEpisodes > 0 && !isConsumed && !existingLog?.isAbandoned;

  if (!existingLog && watchedEpisodes === 0) return;

  const logData = {
    isConsumed,
    isContinuing,
    ...(isConsumed ? { isConsumeLater: false, date: new Date() } : {}),
  };

  if (existingLog) {
    await prisma.userContentLog.update({
      where: { id: existingLog.id },
      data: logData,
    });
  } else {
    await prisma.userContentLog.create({
      data: {
        userId,
        contentId: tvShowId,
        ...logData,
      },
    });
  }

  if (!existingLog?.isConsumed && isConsumed) {
    await prisma.content.update({
      where: { id: tvShowId },
      data: { consumeCount: { increment: 1 } },
    });
  } else if (existingLog?.isConsumed && !isConsumed) {
    await prisma.content.update({
      where: { id: tvShowId },
      data: { consumeCount: { decrement: 1 } },
    });
    await prisma.content.updateMany({
      where: { id: tvShowId, consumeCount: { lt: 0 } },
      data: { consumeCount: 0 },
    });
  }
}

export async function syncEpisodesOnTvShowConsumed(
  _prisma: any,
  _userId: string,
  _contentId: string,
) {
  // Deliberate no-op: Marking a TV series as consumed should not automatically mark
  // all seasons/episodes as watched. Users track individual seasons/episodes explicitly.
}

export async function syncConsumedTvShowEpisodes(
  _prisma: any,
  _contentId: string,
) {
  // Deliberate no-op: New episodes/seasons added should not automatically mark as watched for consumed users.
}

export async function unsyncEpisodesOnTvShowUnmarked(
  _prisma: any,
  _userId: string,
  _contentId: string,
) {
  // Deliberate no-op: Unmarking a TV series should not erase the user's individually logged episode watch progress.
}

// ==========================================
// Types
// ==========================================

@ObjectType()
export class ContentStats {
  @Field(() => Int)
  consumeCount: number;

  @Field(() => Int)
  favoriteCount: number;

  @Field(() => Int)
  consumeLaterCount: number;

  @Field(() => Int)
  discussionCount: number;

  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => Int)
  ratingCount: number;

  @Field(() => [Int])
  ratingDistribution: number[];

  @Field(() => Float, { nullable: true })
  averagePlaytimeMinutes?: number;
}

@ObjectType()
export class UserStats {
  @Field(() => Int)
  totalMovies: number;

  @Field(() => Int)
  thisYearMovies: number;

  @Field(() => Float)
  averageRating: number;

  @Field(() => Int)
  discussionCount: number;
}

@ObjectType()
export class RatingUser {
  @Field(() => String)
  userId: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  displayName?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => Float)
  rating: number;

  @Field(() => Date)
  createdAt: Date;
}

@InputType()
export class UserContentLogInput {
  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Boolean, { nullable: true })
  isFavorite?: boolean;

  @Field(() => Boolean, { nullable: true })
  isConsumeLater?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnRelease?: boolean;

  @Field(() => Boolean, { nullable: true })
  isConsumed?: boolean;

  @Field(() => String, { nullable: true })
  date?: string;

  @Field(() => Int, { nullable: true })
  playtimeMinutes?: number;

  @Field(() => Int, { nullable: true })
  platformId?: number;

  @Field(() => String, { nullable: true })
  review?: string;

  @Field(() => Int, { nullable: true })
  bookPublicationId?: number | null;

  @Field(() => String, { nullable: true })
  bookFormat?: string | null;

  @Field(() => Boolean, { nullable: true })
  isContinuing?: boolean;

  @Field(() => Boolean, { nullable: true })
  isAbandoned?: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  taggedUserIds?: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  ratingDetails?: any;
}

export function convertLog(log: any): UserContentLog {
  const pref = log.content?.userContentPreferences?.find(
    (p: any) => p.userId === log.userId,
  );
  return {
    id: String(log.id),
    userId: log.userId,
    contentId: log.contentId,
    bookPublicationId: log.bookPublicationId ?? undefined,
    date: log.date,
    isFavorite: log.isFavorite ?? false,
    rating: log.rating ? Number(log.rating) : undefined,
    isConsumeLater: log.isConsumeLater ?? false,
    notifyOnRelease: log.notifyOnRelease ?? false,
    isContinuing: log.isContinuing ?? false,
    isConsumed: log.isConsumed ?? false,
    isAbandoned: log.isAbandoned ?? false,
    playtimeMinutes: log.playtimeMinutes ?? undefined,
    platformId: log.platformId ?? undefined,
    bookFormat: log.bookFormat ?? undefined,
    createdAt: log.date,
    updatedAt: log.updatedAt,
    content: log.content
      ? convertContentForGraphQL(
          log.content,
          pref?.posterImageId,
          pref?.backdropImageId,
        )
      : undefined,
    bookPublication: log.bookPublication
      ? convertBookPublicationForGraphQL(log.bookPublication)
      : undefined,
    isStandaloneReview: log.isStandaloneReview ?? false,
    review: log.review ?? undefined,
    tags: log.tags ?? [],
    taggedUsers: log.taggedUsers ?? [],
    ratingDetails: log.ratingDetails ?? undefined,
  } as any;
}

export function convertPersonForActivity(person: any): Person {
  const roles = Array.from(
    new Set(
      person.contentRoles?.map((cp: any) => cp.role).filter(Boolean) || [],
    ),
  ) as string[];

  return {
    id: person.id,
    name: person.name,
    biography: person.biography || undefined,
    birthDate: person.birthDate
      ? person.birthDate.toISOString().split("T")[0]
      : undefined,
    deathDate: person.deathDate
      ? person.deathDate.toISOString().split("T")[0]
      : undefined,
    gender: person.gender || undefined,
    profileUrl: person.profileUrl || undefined,
    placeOfBirth: person.placeOfBirth || undefined,
    roles,
    roleCount: person.contentRoles?.length || 0,
  };
}

export function buildMeaningfulUserContentLogWhere(
  baseWhere: Record<string, any> = {},
): any {
  const meaningfulClauses: any[] = [
    { isConsumed: true },
    { isFavorite: true },
    { isConsumeLater: true },
    { notifyOnRelease: true },
    { isContinuing: true },
    { isAbandoned: true },
    { rating: { not: null } },
    { playtimeMinutes: { gt: 0 } },
    { bookFormat: { not: null } },
    { bookPublicationId: { not: null } },
    { tags: { isEmpty: false } },
    { taggedUsers: { some: {} } },
  ];

  return {
    ...baseWhere,
    OR: meaningfulClauses,
  };
}

export function hasMeaningfulUserContentState(logData: {
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  notifyOnRelease?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  rating?: number | null;
  playtimeMinutes?: number | null;
  review?: string | null;
  tags?: string[] | null;
  taggedUsers?: any | null;
  platformId?: number | null;
  bookPublicationId?: number | null;
  bookFormat?: string | null;
  ratingDetails?: any | null;
}) {
  return Boolean(
    logData.isConsumed ||
    logData.isFavorite ||
    logData.isConsumeLater ||
    logData.notifyOnRelease ||
    logData.isContinuing ||
    logData.isAbandoned ||
    (logData.rating !== undefined &&
      logData.rating !== null &&
      Number(logData.rating) > 0) ||
    (logData.playtimeMinutes !== undefined &&
      logData.playtimeMinutes !== null &&
      Number(logData.playtimeMinutes) > 0) ||
    (logData.review && logData.review.length > 0) ||
    (logData.tags && logData.tags.length > 0) ||
    (logData.taggedUsers?.set && logData.taggedUsers.set.length > 0) ||
    (Array.isArray(logData.taggedUsers) && logData.taggedUsers.length > 0) ||
    (logData.platformId !== undefined && logData.platformId !== null) ||
    (logData.bookPublicationId !== undefined &&
      logData.bookPublicationId !== null) ||
    (logData.ratingDetails !== undefined &&
      logData.ratingDetails !== null &&
      Object.keys(logData.ratingDetails).length > 0) ||
    (logData.bookFormat !== undefined &&
      logData.bookFormat !== null &&
      logData.bookFormat.trim().length > 0),
  );
}

export function dedupeLatestLogsByContent<
  T extends { contentId: string; content?: any },
>(logs: T[]): T[] {
  const contentMap = new Map<string, T>();

  for (const log of logs) {
    if (!log.contentId || !log.content) continue;
    if (!contentMap.has(log.contentId)) {
      contentMap.set(log.contentId, log);
    }
  }

  return Array.from(contentMap.values());
}

export function dedupeLatestLogsByUserAndContent<
  T extends { userId: string; contentId: string },
>(logs: T[]): T[] {
  const logMap = new Map<string, T>();

  for (const log of logs) {
    if (!log.userId || !log.contentId) continue;
    const key = `${log.userId}:${log.contentId}`;
    if (!logMap.has(key)) {
      logMap.set(key, log);
    }
  }

  return Array.from(logMap.values());
}

type PersonRoleBucket =
  "director" | "actor" | "writer" | "author" | "crew" | null;

export function classifyPersonRole(
  roleLabelRaw: string,
  contentTypeName?: string | null,
): PersonRoleBucket {
  const roleLabel = roleLabelRaw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!roleLabel) return null;

  const actorKeywords = [
    "actor",
    "oyuncu",
    "cast",
    "voice",
    "seslendirme",
    "performer",
  ];

  const isBook = contentTypeName === "BOOK";

  const authorKeywords = [
    "author",
    "novelist",
    "book author",
    "book writer",
    "yazar",
  ];
  const writerKeywords = [
    "writer",
    "screenplay",
    "screenwriter",
    "senaryo",
    "senarist",
    "script",
    "story",
  ];
  if (!isBook) {
    writerKeywords.push("yazar");
  }

  const directorKeywords = ["director", "yönetmen"];
  const directorExclusions = [
    "assistant",
    "art",
    "casting",
    "creative",
    "technical",
    "music",
    "sound",
    "photo",
    "photography",
    "production",
    "associate",
    "animation",
    "voice",
    "combat",
    "level",
    "game",
    "cinematography",
    "cinematographer",
  ];

  if (actorKeywords.some((keyword) => roleLabel.includes(keyword))) {
    return "actor";
  }

  if (isBook && authorKeywords.some((keyword) => roleLabel.includes(keyword))) {
    return "author";
  }
  if (
    !isBook &&
    authorKeywords.some(
      (keyword) => keyword !== "yazar" && roleLabel.includes(keyword),
    )
  ) {
    return "author";
  }

  if (writerKeywords.some((keyword) => roleLabel.includes(keyword))) {
    return "writer";
  }

  const isDirector =
    directorKeywords.some(
      (keyword) =>
        roleLabel === keyword ||
        roleLabel.startsWith(`${keyword} `) ||
        roleLabel.endsWith(` ${keyword}`) ||
        roleLabel.includes(` ${keyword} `),
    ) && !directorExclusions.some((keyword) => roleLabel.includes(keyword));

  if (isDirector) {
    return "director";
  }

  return "crew";
}

export async function calculateContentRatingStats(
  prisma: any,
  contentId: string,
): Promise<{
  averageRating: number | null;
  ratingCount: number;
  ratingDistribution: number[];
  totalRatingScore: number;
}> {
  const ratedLogs = await prisma.$queryRaw<
    Array<{ rating: number | string | null }>
  >`
    SELECT DISTINCT ON (user_id) rating
    FROM "user_content_log"
    WHERE content_id = ${contentId}
      AND rating IS NOT NULL
    ORDER BY user_id, date DESC
  `;

  const ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let totalRatingScore = 0;
  let ratingCount = 0;

  for (const log of ratedLogs) {
    const rating = Number(log.rating);
    if (!Number.isFinite(rating) || rating <= 0 || rating > 10) {
      continue;
    }

    const ratingIndex = Math.round(rating) - 1;
    if (ratingIndex >= 0 && ratingIndex < ratingDistribution.length) {
      ratingDistribution[ratingIndex] += 1;
    }

    totalRatingScore += rating;
    ratingCount += 1;
  }

  return {
    averageRating: ratingCount > 0 ? totalRatingScore / ratingCount : null,
    ratingCount,
    ratingDistribution,
    totalRatingScore,
  };
}

export async function adjustContentRatingStats(
  prisma: any,
  contentId: string,
  oldRating: number | null | undefined,
  newRating: number | null | undefined,
) {
  if (oldRating === newRating) return;

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      ratingDistribution: true,
      totalRatingScore: true,
      totalRatingVotes: true,
    },
  });

  if (!content) return;

  const dist = [
    ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  ];
  while (dist.length < 10) dist.push(0);

  let score = content.totalRatingScore ? Number(content.totalRatingScore) : 0;
  let votes = content.totalRatingVotes ?? 0;

  if (oldRating !== null && oldRating !== undefined) {
    const oldIndex = Math.round(oldRating) - 1;
    if (oldIndex >= 0 && oldIndex < 10) {
      dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);
    }
    score = Math.max(0, score - oldRating);
    votes = Math.max(0, votes - 1);
  }

  if (newRating !== null && newRating !== undefined) {
    const newIndex = Math.round(newRating) - 1;
    if (newIndex >= 0 && newIndex < 10) {
      dist[newIndex] += 1;
    }
    score += newRating;
    votes += 1;
  }

  await prisma.content.update({
    where: { id: contentId },
    data: {
      ratingDistribution: dist,
      totalRatingScore: score,
      totalRatingVotes: votes,
    },
  });
}

export async function getPrimaryBookPublicationId(
  prisma: any,
  contentId: string,
): Promise<number | null> {
  const publication = await prisma.bookPublication.findFirst({
    where: { contentId },
    orderBy: [
      { isOriginal: "desc" },
      { consumeCount: "desc" },
      { totalRatingVotes: "desc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: { id: true },
  });

  return publication?.id ?? null;
}

export async function resolveBookPublicationIdForLog(
  prisma: any,
  contentId: string,
  requestedBookPublicationId?: number | null,
): Promise<number | null> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { contentTypeId: true },
  });

  if (content?.contentTypeId !== 4) {
    return null;
  }

  if (requestedBookPublicationId === null) {
    return null;
  }

  if (requestedBookPublicationId !== undefined) {
    const publication = await prisma.bookPublication.findFirst({
      where: { id: requestedBookPublicationId, contentId },
      select: { id: true },
    });

    if (!publication) {
      throw new Error("Book publication does not belong to this content");
    }

    return publication.id;
  }

  return getPrimaryBookPublicationId(prisma, contentId);
}

export async function adjustBookPublicationRatingStats(
  prisma: any,
  publicationId: number | null | undefined,
  oldRating: number | null | undefined,
  newRating: number | null | undefined,
) {
  if (!publicationId || oldRating === newRating) return;

  const publication = await prisma.bookPublication.findUnique({
    where: { id: publicationId },
    select: {
      ratingDistribution: true,
      totalRatingScore: true,
      totalRatingVotes: true,
    },
  });

  if (!publication) return;

  const dist = [
    ...(publication.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  ];
  while (dist.length < 10) dist.push(0);

  let score = publication.totalRatingScore
    ? Number(publication.totalRatingScore)
    : 0;
  let votes = publication.totalRatingVotes ?? 0;

  if (oldRating !== null && oldRating !== undefined) {
    const oldIndex = Math.round(oldRating) - 1;
    if (oldIndex >= 0 && oldIndex < 10) {
      dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);
    }
    score = Math.max(0, score - oldRating);
    votes = Math.max(0, votes - 1);
  }

  if (newRating !== null && newRating !== undefined) {
    const newIndex = Math.round(newRating) - 1;
    if (newIndex >= 0 && newIndex < 10) {
      dist[newIndex] += 1;
    }
    score += newRating;
    votes += 1;
  }

  await prisma.bookPublication.update({
    where: { id: publicationId },
    data: {
      ratingDistribution: dist,
      totalRatingScore: score,
      totalRatingVotes: votes,
    },
  });
}

export async function syncBookPublicationRatingStats(
  prisma: any,
  oldPublicationId: number | null | undefined,
  newPublicationId: number | null | undefined,
  oldRating: number | null | undefined,
  newRating: number | null | undefined,
) {
  if (oldPublicationId === newPublicationId) {
    await adjustBookPublicationRatingStats(
      prisma,
      oldPublicationId,
      oldRating,
      newRating,
    );
    return;
  }

  await adjustBookPublicationRatingStats(
    prisma,
    oldPublicationId,
    oldRating,
    null,
  );
  await adjustBookPublicationRatingStats(
    prisma,
    newPublicationId,
    null,
    newRating,
  );
}

export async function syncBookPublicationConsumeCount(
  prisma: any,
  oldPublicationId: number | null | undefined,
  newPublicationId: number | null | undefined,
  oldConsumed: boolean,
  newConsumed: boolean,
) {
  if (oldPublicationId === newPublicationId) {
    if (newPublicationId && oldConsumed !== newConsumed) {
      await prisma.bookPublication.update({
        where: { id: newPublicationId },
        data: {
          consumeCount: newConsumed ? { increment: 1 } : { decrement: 1 },
        },
      });
    }
  } else {
    if (oldPublicationId && oldConsumed) {
      await prisma.bookPublication.update({
        where: { id: oldPublicationId },
        data: { consumeCount: { decrement: 1 } },
      });
    }

    if (newPublicationId && newConsumed) {
      await prisma.bookPublication.update({
        where: { id: newPublicationId },
        data: { consumeCount: { increment: 1 } },
      });
    }
  }

  await prisma.bookPublication.updateMany({
    where: { consumeCount: { lt: 0 } },
    data: { consumeCount: 0 },
  });
}

export async function recalculateBookPublicationAggregates(
  prisma: any,
  publicationIds: Array<number | null | undefined>,
) {
  const ids = [...new Set(publicationIds.filter(Boolean) as number[])];
  for (const publicationId of ids) {
    const consumeCount = await prisma.userContentLog.count({
      where: { bookPublicationId: publicationId, isConsumed: true },
    });

    const ratedLogs = await prisma.$queryRaw<
      Array<{ rating: number | string | null }>
    >`
      SELECT DISTINCT ON (user_id) rating
      FROM "user_content_log"
      WHERE book_publication_id = ${publicationId}
        AND rating IS NOT NULL
      ORDER BY user_id, date DESC
    `;

    const ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let totalRatingScore = 0;
    let totalRatingVotes = 0;

    for (const log of ratedLogs) {
      const rating = Number(log.rating);
      if (!Number.isFinite(rating) || rating <= 0 || rating > 10) {
        continue;
      }

      const ratingIndex = Math.round(rating) - 1;
      if (ratingIndex >= 0 && ratingIndex < ratingDistribution.length) {
        ratingDistribution[ratingIndex] += 1;
      }

      totalRatingScore += rating;
      totalRatingVotes += 1;
    }

    await prisma.bookPublication.update({
      where: { id: publicationId },
      data: {
        consumeCount,
        ratingDistribution,
        totalRatingScore,
        totalRatingVotes,
      },
    });
  }
}
