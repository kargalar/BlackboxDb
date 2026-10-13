import { Resolver, Query, Arg, Ctx, Int } from "type-graphql";
import { Content } from "../../types/Content";
import { GraphQLContext } from "../../context";
import { convertContentForGraphQL } from "./ContentUtils";
import { logger } from "../../lib/logger";

@Resolver()
export class DynamicListResolver {
  // En Çok Yarıda Bırakılanlar
  @Query(() => [Content])
  async getMostAbandonedContent(
    @Arg("contentTypeId", () => Int, { nullable: true }) contentTypeId: number | undefined,
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Ctx() { prisma }: GraphQLContext
  ): Promise<Content[]> {
    try {
      logger.info(`Fetching most abandoned contents`, { contentTypeId, limit });

      const logs = await prisma.userContentLog.groupBy({
        by: ["contentId"],
        where: {
          isAbandoned: true,
          ...(contentTypeId ? { content: { contentTypeId } } : {}),
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

      const contentIds = logs.map((log) => log.contentId);

      if (contentIds.length === 0) return [];

      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: {
          contentType: true,
          images: {
            where: { type: { in: ["poster", "backdrop"] } },
            select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
          },
        },
      });

      // Sort according to grouped count order
      const sortedContents = contentIds
        .map((id) => contents.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c !== undefined);

      return sortedContents.map((c) => convertContentForGraphQL(c)) as any;
    } catch (error) {
      logger.error("Error fetching most abandoned content:", error);
      throw new Error("Failed to fetch most abandoned content");
    }
  }

  // En Uzun Toplam Süre
  @Query(() => [Content])
  async getLongestPlaytimeContent(
    @Arg("contentTypeId", () => Int, { nullable: true }) contentTypeId: number | undefined,
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Ctx() { prisma }: GraphQLContext
  ): Promise<Content[]> {
    try {
      logger.info(`Fetching longest playtime contents`, { contentTypeId, limit });

      const logs = await prisma.userContentLog.groupBy({
        by: ["contentId"],
        where: {
          playtimeMinutes: { not: null, gt: 0 },
          ...(contentTypeId ? { content: { contentTypeId } } : {}),
        },
        _sum: {
          playtimeMinutes: true,
        },
        orderBy: {
          _sum: {
            playtimeMinutes: "desc",
          },
        },
        take: limit,
      });

      const contentIds = logs.map((log) => log.contentId);

      if (contentIds.length === 0) return [];

      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: {
          contentType: true,
          images: {
            where: { type: { in: ["poster", "backdrop"] } },
            select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
          },
        },
      });

      const sortedContents = contentIds
        .map((id) => contents.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c !== undefined);

      return sortedContents.map((c) => convertContentForGraphQL(c)) as any;
    } catch (error) {
      logger.error("Error fetching longest playtime content:", error);
      throw new Error("Failed to fetch longest playtime content");
    }
  }

  // En Çok Tüketilenler
  @Query(() => [Content])
  async getMostConsumedContent(
    @Arg("contentTypeId", () => Int, { nullable: true }) contentTypeId: number | undefined,
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Ctx() { prisma }: GraphQLContext
  ): Promise<Content[]> {
    try {
      logger.info(`Fetching most consumed contents`, { contentTypeId, limit });

      const logs = await prisma.userContentLog.groupBy({
        by: ["contentId"],
        where: {
          isConsumed: true,
          ...(contentTypeId ? { content: { contentTypeId } } : {}),
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

      const contentIds = logs.map((log) => log.contentId);

      if (contentIds.length === 0) return [];

      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: {
          contentType: true,
          images: {
            where: { type: { in: ["poster", "backdrop"] } },
            select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
          },
        },
      });

      const sortedContents = contentIds
        .map((id) => contents.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c !== undefined);

      return sortedContents.map((c) => convertContentForGraphQL(c)) as any;
    } catch (error) {
      logger.error("Error fetching most consumed content:", error);
      throw new Error("Failed to fetch most consumed content");
    }
  }
}
