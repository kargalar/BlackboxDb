import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "./logger";
import { convertContentForGraphQL } from "../resolvers/content/ContentUtils";

/**
 * Standard Prisma include block for UserList queries.
 * Includes owner, contentType, items (with content+contentType, addedBy, ordered by addedAt desc),
 * and collaborators (with user).
 */
export const LIST_FULL_INCLUDE = {
  owner: true,
  contentType: true,
  items: {
    include: {
      content: {
        include: {
          contentType: true,
          images: {
            where: { type: { in: ["poster", "backdrop"] } },
            select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
          },
          userContentPreferences: true,
        },
      },
      addedBy: true,
    },
    orderBy: [{ displayOrder: "asc" as const }, { addedAt: "desc" as const }],
  },
  collaborators: {
    include: { user: true },
  },
} satisfies Prisma.UserListInclude;

/**
 * Lighter include for list cards.
 * Includes only the first few items needed for poster previews plus counts.
 */
export const LIST_CARD_INCLUDE = {
  owner: true,
  contentType: true,
  items: {
    include: {
      content: {
        include: {
          contentType: true,
          images: {
            where: { type: { in: ["poster", "backdrop"] } },
            select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
          },
          userContentPreferences: true,
        },
      },
      addedBy: true,
    },
    orderBy: [{ displayOrder: "asc" as const }, { addedAt: "desc" as const }],
    take: 5,
  },
  _count: { select: { items: true } },
  collaborators: {
    include: { user: true },
  },
} satisfies Prisma.UserListInclude;

/**
 * Maps a list (with items relation loaded) to include a computed itemCount field.
 * Used across all list queries/mutations that return UserList.
 */
export function toListWithCount(list: any): any {
  const count = list._count?.items ?? list.items?.length ?? 0;
  logger.debug(
    `[toListWithCount] listId=${list.id}, name="${list.name}", itemCount=${count}`,
  );
  // Transform items content to resolve computed GraphQL fields like posterUrl
  const items =
    list.items?.map((item: any) => {
      let pref = null;
      if (list.owner?.id && item.content?.userContentPreferences) {
        pref = item.content.userContentPreferences.find((p: any) => p.userId === list.owner.id);
      }
      return {
        ...item,
        content: item.content ? convertContentForGraphQL(item.content, pref?.posterImageId, pref?.backdropImageId) : null,
      };
    }) || [];

  return {
    ...list,
    items,
    itemCount: count,
    // Default vote extras (overridden by addListVoteExtras)
    score: (list.upvoteCount ?? 0) - (list.downvoteCount ?? 0),
    userVote: list.userVote ?? null,
  };
}

/**
 * Adds userVote and score fields to an array of lists.
 * Uses batch query for efficiency when userId is provided.
 */
export async function addListVoteExtras<
  T extends { id: number; upvoteCount: number; downvoteCount: number },
>(
  prisma: PrismaClient,
  lists: T[],
  userId?: string | null,
): Promise<(T & { score: number; userVote: number | null })[]> {
  logger.debug(
    `[addListVoteExtras] Processing ${lists.length} lists, userId=${userId ?? "anonymous"}`,
  );

  if (lists.length === 0) return [];

  const votedMap = new Map<number, number>();
  if (userId && lists.length > 0) {
    const votes = await prisma.userListVote.findMany({
      where: {
        userId,
        listId: { in: lists.map((l) => l.id) },
      },
      select: { listId: true, voteType: true },
    });
    for (const v of votes) votedMap.set(v.listId, v.voteType);
    logger.debug(`[addListVoteExtras] Found ${votes.length} user votes`);
  }

  return lists.map((l) => ({
    ...l,
    score: l.upvoteCount - l.downvoteCount,
    userVote: votedMap.get(l.id) ?? null,
  }));
}

/**
 * Adds userVote and score fields to a single list.
 */
export async function addSingleListVoteExtras<
  T extends { id: number; upvoteCount: number; downvoteCount: number },
>(
  prisma: PrismaClient,
  list: T,
  userId?: string | null,
): Promise<T & { score: number; userVote: number | null }> {
  let userVote: number | null = null;
  if (userId) {
    const vote = await prisma.userListVote.findFirst({
      where: { listId: list.id, userId },
    });
    userVote = vote?.voteType ?? null;
    logger.debug(
      `[addSingleListVoteExtras] listId=${list.id}, userVote=${userVote}`,
    );
  }

  return {
    ...list,
    score: list.upvoteCount - list.downvoteCount,
    userVote,
  };
}
