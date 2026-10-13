import type { Discussion, PrismaClient } from "@prisma/client";
import type { GraphQLContext } from "../context";
import { RequestBatchLoader } from "./requestBatchLoader";
import { pairReviewsToLogs } from "./userContentReviewMatching";
import { buildUserCommentsWhere } from "./discussionVisibility";
import { isMissingBookPublicationTableError } from "../resolvers/content/ContentQueryHelpers";

export const userContentKey = (userId: string, contentId: string) =>
  JSON.stringify([userId, contentId]);
const parseUserContentKey = (
  key: string,
): { userId: string; contentId: string } => {
  const [userId, contentId] = JSON.parse(key) as [string, string];
  return { userId, contentId };
};

export function createRequestLoaders(
  prisma: PrismaClient,
  viewer: GraphQLContext["user"],
) {
  const reviews = new RequestBatchLoader<
    string,
    ReadonlyMap<string, Discussion>
  >(
    async (keys) => {
      const pairs = keys.map(parseUserContentKey);
      const [logs, discussions] = await Promise.all([
        prisma.userContentLog.findMany({
          where: { OR: pairs },
          select: { id: true, userId: true, contentId: true, date: true },
        }),
        prisma.discussion.findMany({
          where: {
            type: "comment",
            isDeleted: false,
            OR: pairs.map(({ userId, contentId }) => ({
              authorId: userId,
              contentId,
              ...buildUserCommentsWhere(userId, viewer),
            })),
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        }),
      ]);
      const matched = pairReviewsToLogs(logs, discussions);
      return new Map(keys.map((key) => [key, matched]));
    },
    () => new Map<string, Discussion>(),
  );

  const consumeCounts = new RequestBatchLoader<string, number>(
    async (keys) => {
      const rows = await prisma.userContentLog.groupBy({
        by: ["userId", "contentId"],
        where: { OR: keys.map(parseUserContentKey), isConsumed: true },
        _count: { id: true },
      });
      return new Map(
        rows.map((row) => [
          userContentKey(row.userId, row.contentId),
          row._count.id,
        ]),
      );
    },
    () => 0,
  );

  const bookPublications = new RequestBatchLoader<
    string,
    Awaited<ReturnType<typeof fetchPublications>>
  >(
    async (keys) => {
      const rows = await fetchPublications(keys);
      return new Map(
        keys.map((key) => [key, rows.filter((row) => row.contentId === key)]),
      );
    },
    () => [],
  );

  async function fetchPublications(contentIds: readonly string[]) {
    try {
      return await prisma.bookPublication.findMany({
        where: { contentId: { in: [...contentIds] } },
        include: { publisher: true },
        orderBy: [
          { consumeCount: "desc" },
          { totalRatingVotes: "desc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
      });
    } catch (error) {
      if (isMissingBookPublicationTableError(error)) return [];
      throw error;
    }
  }

  const primaryBookPublications = new RequestBatchLoader<
    string,
    Awaited<ReturnType<typeof fetchPublications>>[number] | null
  >(
    async (keys) => {
      const publications = await Promise.all(
        keys.map((key) => bookPublications.load(key)),
      );
      const preferences = viewer?.id
        ? await prisma.userContentLog.findMany({
            where: {
              userId: viewer.id,
              contentId: { in: [...keys] },
              bookPublicationId: { not: null },
            },
            select: { contentId: true, bookPublicationId: true },
            orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          })
        : [];
      const preferredIds = new Map<string, number>();
      for (const log of preferences)
        if (!preferredIds.has(log.contentId))
          preferredIds.set(log.contentId, log.bookPublicationId!);
      return new Map(
        keys.map((key, index) => {
          const rows = publications[index];
          return [
            key,
            rows.find((row) => row.id === preferredIds.get(key)) ??
              rows.find((row) => row.isOriginal) ??
              rows[0] ??
              null,
          ];
        }),
      );
    },
    () => null,
  );

  return { reviews, consumeCounts, bookPublications, primaryBookPublications };
}

export type RequestLoaders = ReturnType<typeof createRequestLoaders>;

export function getRequestLoaders(context: GraphQLContext): RequestLoaders {
  return (context.loaders ??= createRequestLoaders(
    context.prisma,
    context.user,
  ));
}
