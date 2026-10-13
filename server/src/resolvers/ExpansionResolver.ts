import { Resolver, Query, Mutation, Arg, Int, Ctx, Float } from 'type-graphql';
import { Prisma } from '@prisma/client';
import { Expansion, UserExpansionLog } from '../types/Expansion';
import { GraphQLContext } from '../context';

// Helper function to calculate average rating from distribution
function calculateAverageRating(distribution: number[]): number | null {
  const total = distribution.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const weightedSum = distribution.reduce((sum, count, index) => {
    return sum + count * (index + 1);
  }, 0);

  return weightedSum / total;
}

// Helper function to convert Decimal to number
function decimalToNumber(decimal: Prisma.Decimal | null): number | undefined {
  if (decimal === null) return undefined;
  return Number(decimal);
}

@Resolver()
export class ExpansionResolver {
  // Get expansions for a content
  @Query(() => [Expansion])
  async getExpansionsByContent(
    @Arg('contentId', () => String) contentId: string,
    @Arg('type', () => String, { nullable: true }) type: string | null,
    @Ctx() ctx: GraphQLContext
  ): Promise<Expansion[]> {


    const whereClause: any = { contentId };
    if (type) {
      whereClause.type = type;
    }

    const expansions = await ctx.prisma.expansion.findMany({
      where: whereClause,
      orderBy: { releaseDate: 'asc' },
    });

    return expansions.map(exp => ({
      ...exp,
      type: exp.type,
      consumeCount: exp.consumeCount,
      ratingDistribution: exp.ratingDistribution,
      averageRating: calculateAverageRating(exp.ratingDistribution) ?? undefined,
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
    }));
  }

  // Get single expansion by ID
  @Query(() => Expansion, { nullable: true })
  async getExpansion(
    @Arg('id', () => Int) id: number,
    @Ctx() ctx: GraphQLContext
  ): Promise<Expansion | null> {
    const expansion = await ctx.prisma.expansion.findUnique({
      where: { id },
    });

    if (!expansion) return null;

    return {
      ...expansion,
      type: expansion.type,
      consumeCount: expansion.consumeCount,
      ratingDistribution: expansion.ratingDistribution,
      averageRating: calculateAverageRating(expansion.ratingDistribution) ?? undefined,
      createdAt: expansion.createdAt.toISOString(),
      updatedAt: expansion.updatedAt.toISOString(),
    };
  }

  // Get user's expansion log
  @Query(() => UserExpansionLog, { nullable: true })
  async getUserExpansionLog(
    @Arg('expansionId', () => Int) expansionId: number,
    @Ctx() ctx: GraphQLContext
  ): Promise<UserExpansionLog | null> {
    if (!ctx.user?.id) {

      return null;
    }

    const log = await ctx.prisma.userExpansionLog.findUnique({
      where: {
        userId_expansionId: {
          userId: ctx.user?.id,
          expansionId,
        },
      },
    });

    if (!log) return null;

    return {
      ...log,
      rating: decimalToNumber(log.rating),
    };
  }

  // Get all user expansion logs for a content
  @Query(() => [UserExpansionLog])
  async getUserExpansionLogs(
    @Arg('contentId', () => String) contentId: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<UserExpansionLog[]> {
    if (!ctx.user?.id) {

      return [];
    }

    const expansions = await ctx.prisma.expansion.findMany({
      where: { contentId },
      select: { id: true },
    });

    const expansionIds = expansions.map(e => e.id);

    const logs = await ctx.prisma.userExpansionLog.findMany({
      where: {
        userId: ctx.user?.id,
        expansionId: { in: expansionIds },
      },
    });

    return logs.map(log => ({
      ...log,
      rating: decimalToNumber(log.rating),
    }));
  }

  // Toggle expansion consumed status
  @Mutation(() => UserExpansionLog)
  async toggleExpansionConsumed(
    @Arg('expansionId', () => Int) expansionId: number,
    @Ctx() ctx: GraphQLContext
  ): Promise<UserExpansionLog> {
    if (!ctx.user?.id) {
      throw new Error('Giriş yapmanız gerekiyor');
    }



    // Check if expansion exists
    const expansion = await ctx.prisma.expansion.findUnique({
      where: { id: expansionId },
    });

    if (!expansion) {
      throw new Error('Expansion bulunamadı');
    }

    // Check if user has a log
    const existingLog = await ctx.prisma.userExpansionLog.findUnique({
      where: {
        userId_expansionId: {
          userId: ctx.user?.id,
          expansionId,
        },
      },
    });

    let log;

    if (existingLog) {
      // Toggle isConsumed
      const newIsConsumed = !existingLog.isConsumed;

      log = await ctx.prisma.userExpansionLog.update({
        where: { id: existingLog.id },
        data: { isConsumed: newIsConsumed },
      });

      // Update consume count
      await ctx.prisma.expansion.update({
        where: { id: expansionId },
        data: {
          consumeCount: {
            [newIsConsumed ? 'increment' : 'decrement']: 1,
          },
        },
      });


    } else {
      // Create new log with isConsumed = true
      log = await ctx.prisma.userExpansionLog.create({
        data: {
          userId: ctx.user?.id,
          expansionId,
          isConsumed: true,
        },
      });

      // Increment consume count
      await ctx.prisma.expansion.update({
        where: { id: expansionId },
        data: {
          consumeCount: { increment: 1 },
        },
      });


    }

    return {
      ...log,
      rating: decimalToNumber(log.rating),
    };
  }

  // Rate an expansion
  @Mutation(() => UserExpansionLog)
  async rateExpansion(
    @Arg('expansionId', () => Int) expansionId: number,
    @Arg('rating', () => Float) rating: number,
    @Ctx() ctx: GraphQLContext
  ): Promise<UserExpansionLog> {
    if (!ctx.user?.id) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    if (rating < 1 || rating > 10) {
      throw new Error('Puan 1 ile 10 arasında olmalı');
    }



    // Check if expansion exists
    const expansion = await ctx.prisma.expansion.findUnique({
      where: { id: expansionId },
    });

    if (!expansion) {
      throw new Error('Expansion bulunamadı');
    }

    // Check if user has a log
    const existingLog = await ctx.prisma.userExpansionLog.findUnique({
      where: {
        userId_expansionId: {
          userId: ctx.user?.id,
          expansionId,
        },
      },
    });

    const newRatingIndex = Math.round(rating) - 1;
    const newDistribution = [...expansion.ratingDistribution];

    let log;

    if (existingLog) {
      // If user had a previous rating, decrement that count
      if (existingLog.rating !== null) {
        const oldRatingIndex = Math.round(Number(existingLog.rating)) - 1;
        if (oldRatingIndex >= 0 && oldRatingIndex < 10) {
          newDistribution[oldRatingIndex] = Math.max(0, newDistribution[oldRatingIndex] - 1);
        }
      }

      // Increment new rating count
      if (newRatingIndex >= 0 && newRatingIndex < 5) {
        newDistribution[newRatingIndex]++;
      }

      log = await ctx.prisma.userExpansionLog.update({
        where: { id: existingLog.id },
        data: { rating },
      });


    } else {
      // Create new log with rating
      // Increment new rating count
      if (newRatingIndex >= 0 && newRatingIndex < 10) {
        newDistribution[newRatingIndex]++;
      }

      log = await ctx.prisma.userExpansionLog.create({
        data: {
          userId: ctx.user?.id,
          expansionId,
          rating,
          isConsumed: true, // Auto mark as consumed when rating
        },
      });

      // Also increment consume count if this is new
      await ctx.prisma.expansion.update({
        where: { id: expansionId },
        data: {
          consumeCount: { increment: 1 },
          ratingDistribution: newDistribution,
        },
      });


      return {
        ...log,
        rating: decimalToNumber(log.rating),
      };
    }

    // Update rating distribution
    await ctx.prisma.expansion.update({
      where: { id: expansionId },
      data: { ratingDistribution: newDistribution },
    });

    return {
      ...log,
      rating: decimalToNumber(log.rating),
    };
  }

  // Remove expansion rating
  @Mutation(() => UserExpansionLog, { nullable: true })
  async removeExpansionRating(
    @Arg('expansionId', () => Int) expansionId: number,
    @Ctx() ctx: GraphQLContext
  ): Promise<UserExpansionLog | null> {
    if (!ctx.user?.id) {
      throw new Error('Giriş yapmanız gerekiyor');
    }



    const existingLog = await ctx.prisma.userExpansionLog.findUnique({
      where: {
        userId_expansionId: {
          userId: ctx.user?.id,
          expansionId,
        },
      },
    });

    if (!existingLog || existingLog.rating === null) {
      return existingLog ? {
        ...existingLog,
        rating: undefined,
      } : null;
    }

    // Update rating distribution
    const expansion = await ctx.prisma.expansion.findUnique({
      where: { id: expansionId },
    });

    if (expansion) {
      const oldRatingIndex = Math.round(Number(existingLog.rating)) - 1;
      const newDistribution = [...expansion.ratingDistribution];

      if (oldRatingIndex >= 0 && oldRatingIndex < 10) {
        newDistribution[oldRatingIndex] = Math.max(0, newDistribution[oldRatingIndex] - 1);
      }

      await ctx.prisma.expansion.update({
        where: { id: expansionId },
        data: { ratingDistribution: newDistribution },
      });
    }

    const log = await ctx.prisma.userExpansionLog.update({
      where: { id: existingLog.id },
      data: { rating: null },
    });



    return {
      ...log,
      rating: undefined,
    };
  }
}
