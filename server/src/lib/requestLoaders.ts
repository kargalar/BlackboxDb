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
  language = "en",
) {
  const fallbackLanguages = [...new Set([language, "en"])];
  const contentTextSelect = {
    id: true, title: true, originalTitle: true, description: true, contentTypeId: true,
  } as const;
  const contentText = new RequestBatchLoader<
    string,
    Awaited<ReturnType<typeof readContentText>>[number] | null
  >(async (keys) => {
    const rows = await readContentText(keys);
    return new Map(rows.map((row) => [row.id, row]));
  }, () => null);
  function readContentText(keys: readonly string[]) {
    return prisma.content.findMany({
      where: { id: { in: [...keys] }, isDeleted: false },
      select: contentTextSelect,
    });
  }

  const contentTranslations = new RequestBatchLoader<
    string,
    Awaited<ReturnType<typeof prisma.contentTranslation.findMany>>
  >(async (keys) => {
    const rows = await prisma.contentTranslation.findMany({
      where: {
        contentId: { in: [...keys] },
        OR: fallbackLanguages.flatMap((language) => [
          { language: { equals: language, mode: "insensitive" as const } },
          { language: { startsWith: `${language}-`, mode: "insensitive" as const } },
        ]),
      },
      orderBy: { language: "asc" },
    });
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const translations = grouped.get(row.contentId) ?? [];
      translations.push(row);
      grouped.set(row.contentId, translations);
    }
    return grouped;
  }, () => []);

  const catalogTranslations = new RequestBatchLoader<string, string | null>(
    async (keys) => {
      const entries = keys.map((key) => {
        const [catalog, entryId] = JSON.parse(key) as [string, number];
        return { catalog, entryId };
      });
      const rows = await prisma.catalogTranslation.findMany({
        where: { OR: entries, language: { in: fallbackLanguages } },
      });
      const names = new Map(
        rows.map((row) => [JSON.stringify([row.catalog, row.entryId, row.language]), row.name]),
      );
      return new Map(entries.map(({ catalog, entryId }, index) => [
        keys[index],
        names.get(JSON.stringify([catalog, entryId, language])) ??
          names.get(JSON.stringify([catalog, entryId, "en"])) ??
          null,
      ]));
    },
    () => null,
  );
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

  return { reviews, consumeCounts, bookPublications, primaryBookPublications, contentText, contentTranslations, catalogTranslations };
}

export type RequestLoaders = ReturnType<typeof createRequestLoaders>;

export function getRequestLoaders(context: GraphQLContext): RequestLoaders {
  return (context.loaders ??= createRequestLoaders(
    context.prisma,
    context.user,
    context.language,
  ));
}
