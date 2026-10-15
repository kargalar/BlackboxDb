import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { requireAdminOrModerator } from "../../lib/authGuard";
import { logger } from "../../lib/logger";
import { Expansion } from "../../types/Expansion";
import { localizeContentImage } from "../../lib/localContentImage";

// Helper function to calculate average rating from distribution
function calculateAverageRating(distribution: number[]): number | null {
  const total = distribution.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const weightedSum = distribution.reduce(
    (sum, count, index) => sum + count * (index + 1),
    0,
  );
  return weightedSum / total;
}

@Resolver()
export class AdminExpansionResolver {
  // ==========================================
  // QUERIES
  // ==========================================

  /**
   * List all expansions, optionally filtered by content or search term.
   */
  @Authorized()
  @Query(() => [Expansion])
  async listExpansions(
    @Arg("contentId", () => String, { nullable: true })
    contentId: string | null,
    @Arg("search", () => String, { nullable: true }) search: string | null,
    @Arg("type", () => String, { nullable: true }) type: string | null,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 100 })
    limit: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Expansion[]> {
    requireAdminOrModerator(user);
    logger.info(
      `[Admin] Listing expansions - contentId: ${contentId}, search: ${search}, type: ${type}`,
    );

    const where: any = {};
    if (contentId) where.contentId = contentId;
    if (type) where.type = type;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const expansions = await prisma.expansion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        content: {
          select: { id: true, title: true },
        },
      },
    });

    return expansions.map((exp: any) => ({
      ...exp,
      contentTitle: exp.content?.title || null,
      averageRating:
        calculateAverageRating(exp.ratingDistribution) ?? undefined,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    }));
  }

  /**
   * Get a single expansion by ID for editing.
   */
  @Authorized()
  @Query(() => Expansion, { nullable: true })
  async getExpansionById(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Expansion | null> {
    requireAdminOrModerator(user);
    logger.info(`[Admin] Getting expansion: ${id}`);

    const expansion = await prisma.expansion.findUnique({
      where: { id },
      include: {
        content: { select: { id: true, title: true } },
      },
    });

    if (!expansion) return null;

    return {
      ...expansion,
      contentTitle: (expansion as any).content?.title || null,
      averageRating:
        calculateAverageRating(expansion.ratingDistribution) ?? undefined,
      createdAt: expansion.createdAt.toISOString(),
      updatedAt: expansion.updatedAt.toISOString(),
    };
  }

  // ==========================================
  // MUTATIONS
  // ==========================================

  /**
   * Create a new expansion/DLC for a content.
   */
  @Authorized()
  @Mutation(() => Expansion)
  async createExpansion(
    @Arg("contentId", () => String) contentId: string,
    @Arg("name", () => String) name: string,
    @Arg("description", () => String, { nullable: true })
    description: string | null,
    @Arg("posterUrl", () => String, { nullable: true })
    posterUrl: string | null,
    @Arg("releaseDate", () => String, { nullable: true })
    releaseDate: string | null,
    @Arg("type", () => String, { nullable: true, defaultValue: "expansion" })
    type: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Expansion> {
    requireAdminOrModerator(user);
    logger.info(
      `[Admin] Creating expansion: ${name} for content: ${contentId}`,
    );

    // Verify content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });
    if (!content) throw new Error("Content not found");

    const expansion = await prisma.expansion.create({
      data: {
        contentId,
        name,
        description: description || null,
        posterUrl: posterUrl || null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        type: type || "expansion",
      },
    });

    logger.info(
      `✅ [Admin] Expansion created: ${expansion.id} - ${expansion.name}`,
    );

    return {
      ...expansion,
      averageRating: undefined,
      createdAt: expansion.createdAt.toISOString(),
      updatedAt: expansion.updatedAt.toISOString(),
    };
  }

  /**
   * Update an existing expansion.
   */
  @Authorized()
  @Mutation(() => Expansion)
  async updateExpansion(
    @Arg("id", () => Int) id: number,
    @Arg("name", () => String, { nullable: true }) name: string | null,
    @Arg("description", () => String, { nullable: true })
    description: string | null,
    @Arg("posterUrl", () => String, { nullable: true })
    posterUrl: string | null,
    @Arg("releaseDate", () => String, { nullable: true })
    releaseDate: string | null,
    @Arg("type", () => String, { nullable: true }) type: string | null,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Expansion> {
    requireAdminOrModerator(user);
    logger.info(`[Admin] Updating expansion: ${id}`);

    const existing = await prisma.expansion.findUnique({ where: { id } });
    if (!existing) throw new Error("Expansion not found");

    const updateData: any = {};
    if (name !== null && name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (posterUrl !== undefined) {
      updateData.posterUrl = posterUrl
        ? await localizeContentImage(posterUrl, `expansion-${id}`, "expansion")
        : null;
    }
    if (releaseDate !== undefined) {
      updateData.releaseDate = releaseDate ? new Date(releaseDate) : null;
    }
    if (type !== null && type !== undefined) updateData.type = type;

    const updated = await prisma.expansion.update({
      where: { id },
      data: updateData,
    });

    logger.info(
      `✅ [Admin] Expansion updated: ${updated.id} - ${updated.name}`,
    );

    return {
      ...updated,
      averageRating:
        calculateAverageRating(updated.ratingDistribution) ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete an expansion permanently.
   */
  @Authorized()
  @Mutation(() => Boolean)
  async deleteExpansion(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdminOrModerator(user);
    logger.info(`[Admin] Deleting expansion: ${id}`);

    const expansion = await prisma.expansion.findUnique({ where: { id } });
    if (!expansion) throw new Error("Expansion not found");

    await prisma.expansion.delete({ where: { id } });

    logger.info(`✅ [Admin] Expansion deleted: ${id}`);
    return true;
  }
}
