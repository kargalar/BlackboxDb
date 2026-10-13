import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

/**
 * Generic vote processing for both discussions and discussion comments.
 * Handles find/create/update/delete vote logic and returns upvote/downvote changes.
 */
export async function processVote(
  prisma: PrismaClient,
  model: "discussionVote" | "discussionCommentVote" | "userListVote",
  entityIdField: "discussionId" | "commentId" | "listId",
  entityId: number,
  userId: string,
  voteType: number,
): Promise<{ upvoteChange: number; downvoteChange: number }> {
  logger.debug(
    `[processVote] model=${model}, ${entityIdField}=${entityId}, userId=${userId}, voteType=${voteType}`,
  );

  const voteModel = prisma[model] as any;

  const existingVote = await voteModel.findFirst({
    where: { [entityIdField]: entityId, userId },
  });

  let upvoteChange = 0;
  let downvoteChange = 0;

  if (voteType === 0) {
    // Remove vote
    if (existingVote) {
      if (existingVote.voteType === 1) upvoteChange = -1;
      else if (existingVote.voteType === -1) downvoteChange = -1;
      await voteModel.delete({ where: { id: existingVote.id } });
      logger.debug(`[processVote] Deleted existing vote id=${existingVote.id}`);
    }
  } else if (existingVote) {
    // Update existing vote
    if (existingVote.voteType !== voteType) {
      if (existingVote.voteType === 1) upvoteChange = -1;
      else if (existingVote.voteType === -1) downvoteChange = -1;

      if (voteType === 1) upvoteChange += 1;
      else if (voteType === -1) downvoteChange += 1;

      await voteModel.update({
        where: { id: existingVote.id },
        data: { voteType },
      });
      logger.debug(
        `[processVote] Updated vote id=${existingVote.id} to voteType=${voteType}`,
      );
    } else {
      logger.debug(`[processVote] Vote unchanged, skipping update`);
    }
  } else {
    // Create new vote
    if (voteType === 1) upvoteChange = 1;
    else if (voteType === -1) downvoteChange = 1;

    await voteModel.create({
      data: { [entityIdField]: entityId, userId, voteType },
    });
    logger.debug(`[processVote] Created new vote voteType=${voteType}`);
  }

  logger.debug(
    `[processVote] Result: upvoteChange=${upvoteChange}, downvoteChange=${downvoteChange}`,
  );
  return { upvoteChange, downvoteChange };
}

/**
 * Adds userVote and score fields to an array of discussions.
 * Uses batch query for efficiency when userId is provided.
 */
export async function addDiscussionVoteExtras<
  T extends { id: number; upvoteCount: number; downvoteCount: number },
>(
  prisma: PrismaClient,
  discussions: T[],
  userId?: string | null,
): Promise<(T & { score: number; userVote: number | null })[]> {
  logger.debug(
    `[addDiscussionVoteExtras] Processing ${discussions.length} discussions, userId=${userId ?? "anonymous"}`,
  );

  if (discussions.length === 0) return [];

  const votedMap = new Map<number, number>();
  if (userId && discussions.length > 0) {
    const votes = await prisma.discussionVote.findMany({
      where: {
        userId,
        discussionId: { in: discussions.map((d) => d.id) },
      },
      select: { discussionId: true, voteType: true },
    });
    for (const v of votes) votedMap.set(v.discussionId, v.voteType);
    logger.debug(`[addDiscussionVoteExtras] Found ${votes.length} user votes`);
  }

  return discussions.map((d) => ({
    ...d,
    score: d.upvoteCount - d.downvoteCount,
    userVote: votedMap.get(d.id) ?? null,
  }));
}

/**
 * Adds userVote and score fields to a single discussion.
 */
export async function addSingleDiscussionVoteExtras<
  T extends { id: number; upvoteCount: number; downvoteCount: number },
>(
  prisma: PrismaClient,
  discussion: T,
  userId?: string | null,
): Promise<T & { score: number; userVote: number | null }> {
  let userVote: number | null = null;
  if (userId) {
    const vote = await prisma.discussionVote.findFirst({
      where: { discussionId: discussion.id, userId },
    });
    userVote = vote?.voteType ?? null;
    logger.debug(
      `[addSingleDiscussionVoteExtras] discussionId=${discussion.id}, userVote=${userVote}`,
    );
  }

  return {
    ...discussion,
    score: discussion.upvoteCount - discussion.downvoteCount,
    userVote,
  };
}
