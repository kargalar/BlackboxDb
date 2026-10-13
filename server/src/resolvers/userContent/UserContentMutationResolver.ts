import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
  Float,
} from "type-graphql";
import { Prisma } from "@prisma/client";
import { GraphQLContext } from "../../context";
import { UserContentLog } from "../../types/UserContentLog";
import { Content } from "../../types/Content";
import { SaveContentInput } from "../../types/SaveContentInput";
import {
  resolveBookPublicationIdForLog,
  syncBookPublicationConsumeCount,
  syncEpisodesOnTvShowConsumed,
  unsyncEpisodesOnTvShowUnmarked,
  syncBookPublicationRatingStats,
  adjustContentRatingStats,
  cleanupReviewOnContentRemoval,
  shouldEnableNotifyOnRelease,
  updateGameMedianPlaytime,
  calculateContentRatingStats,
  recalculateBookPublicationAggregates,
  UserContentLogInput,
  convertLog,
  hasMeaningfulUserContentState,
} from "../../services/UserContentService";
import { logger } from "../../lib/logger";
import { saveExternalContent } from "../../services/ExternalContentSaveService";

@Resolver()
export class UserContentMutationResolver {
  /**
   * Materialize an external catalog item before a user logs or saves it.
   * This is intentionally authenticated because the payload is client supplied.
   */
  @Authorized()
  @Mutation(() => Content)
  async saveContent(
    @Arg("input", () => SaveContentInput) input: SaveContentInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Content> {
    if (!user) throw new Error("Not authenticated");

    try {
      const content = await saveExternalContent(prisma, input);
      logger.success(
        `[saveContent] Saved ${content.id} (${content.contentTypeId})`,
      );
      return content;
    } catch (error) {
      logger.error("[saveContent] Error:", error);
      throw new Error("Failed to save content");
    }
  }

  /**
   * Log content as watched/consumed (creates a new log entry)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async logContentWatch(
    @Arg("contentId", () => String) contentId: string,
    @Arg("bookPublicationId", () => Int, { nullable: true })
    bookPublicationId: number | null | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[logContentWatch] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      const nextBookPublicationId =
        bookPublicationId !== undefined
          ? await resolveBookPublicationIdForLog(
              prisma,
              contentId,
              bookPublicationId,
            )
          : (existing?.bookPublicationId ??
            (await resolveBookPublicationIdForLog(prisma, contentId)));

      if (existing && existing.isConsumed) {
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            bookPublicationId: nextBookPublicationId,
            isConsumed: true,
            date: new Date(),
          },
        });
        await syncBookPublicationConsumeCount(
          prisma,
          null,
          nextBookPublicationId,
          false,
          true,
        );
      } else if (existing) {
        await prisma.userContentLog.update({
          where: { id: existing.id },
          data: {
            isConsumed: true,
            bookPublicationId: nextBookPublicationId,
            date: new Date(),
          },
        });
        await syncBookPublicationConsumeCount(
          prisma,
          existing.bookPublicationId ?? null,
          nextBookPublicationId,
          existing.isConsumed,
          true,
        );
      } else {
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            bookPublicationId: nextBookPublicationId,
            isConsumed: true,
            date: new Date(),
          },
        });
        await syncBookPublicationConsumeCount(
          prisma,
          null,
          nextBookPublicationId,
          false,
          true,
        );
      }

      await prisma.content.update({
        where: { id: contentId },
        data: { consumeCount: { increment: 1 } },
      });

      await syncEpisodesOnTvShowConsumed(prisma, user.id, contentId);

      logger.success(`[logContentWatch] Success`);
      return true;
    } catch (error) {
      logger.error(`[logContentWatch] Error: `, error);
      throw new Error("Failed to log content watch");
    }
  }

  /**
   * Unlog content watch (remove consumed status from latest log)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async unlogContentWatch(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[unlogContentWatch] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      if (!existing) {
        logger.warn(`[unlogContentWatch] No log found`);
        return false;
      }

      const oldRating = existing.rating ? Number(existing.rating) : null;
      const wasFavorite = existing.isFavorite;

      if (
        !existing.isConsumeLater &&
        !existing.notifyOnRelease &&
        !existing.isContinuing &&
        !existing.isAbandoned
      ) {
        await prisma.userContentLog.delete({ where: { id: existing.id } });
      } else {
        await prisma.userContentLog.update({
          where: { id: existing.id },
          data: {
            isConsumed: false,
            ...(existing.isAbandoned || existing.isContinuing
              ? {}
              : { rating: null }),
            isFavorite: false,
            date: new Date(),
          },
        });
      }

      await syncBookPublicationConsumeCount(
        prisma,
        existing.bookPublicationId ?? null,
        existing.bookPublicationId ?? null,
        existing.isConsumed,
        false,
      );

      if (oldRating && !existing.isAbandoned && !existing.isContinuing) {
        await syncBookPublicationRatingStats(
          prisma,
          existing.bookPublicationId ?? null,
          existing.bookPublicationId ?? null,
          oldRating,
          null,
        );

        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: {
            ratingDistribution: true,
            totalRatingScore: true,
            totalRatingVotes: true,
          },
        });

        if (content) {
          const dist = [
            ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
          ];
          while (dist.length < 10) dist.push(0);

          const oldIndex = Math.round(oldRating) - 1;
          if (oldIndex >= 0 && oldIndex < 10) {
            dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);
          }

          const newScore = Math.max(
            0,
            (content.totalRatingScore ? Number(content.totalRatingScore) : 0) -
              oldRating,
          );
          const newVotes = Math.max(0, (content.totalRatingVotes ?? 0) - 1);

          await prisma.content.update({
            where: { id: contentId },
            data: {
              ratingDistribution: dist,
              totalRatingScore: newScore,
              totalRatingVotes: newVotes,
            },
          });
        }
      }

      await prisma.content.update({
        where: { id: contentId },
        data: {
          consumeCount: { decrement: 1 },
          ...(wasFavorite ? { favoriteCount: { decrement: 1 } } : {}),
        },
      });

      await prisma.content.updateMany({
        where: { id: contentId, consumeCount: { lt: 0 } },
        data: { consumeCount: 0 },
      });

      await cleanupReviewOnContentRemoval(prisma, user.id, contentId);

      const resultingLog = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });
      if (
        !resultingLog ||
        (!resultingLog.isConsumed &&
          !resultingLog.isContinuing &&
          !resultingLog.isAbandoned)
      ) {
        await unsyncEpisodesOnTvShowUnmarked(prisma, user.id, contentId);
      }

      logger.success(`[unlogContentWatch] Success`);
      return true;
    } catch (error) {
      logger.error(`[unlogContentWatch] Error: `, error);
      throw new Error("Failed to unlog content watch");
    }
  }

  /**
   * Toggle content favorite status
   */
  @Authorized()
  @Mutation(() => Boolean)
  async toggleContentFavorite(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[toggleContentFavorite] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      let newFavoriteState: boolean;
      let wasConsumed = false;
      let oldBookPublicationId: number | null = null;
      let nextBookPublicationId: number | null = null;

      if (existing) {
        newFavoriteState = !existing.isFavorite;
        wasConsumed = existing.isConsumed;
        oldBookPublicationId = existing.bookPublicationId ?? null;
        nextBookPublicationId =
          existing.bookPublicationId ??
          (newFavoriteState
            ? await resolveBookPublicationIdForLog(prisma, contentId)
            : null);
        await prisma.userContentLog.update({
          where: { id: existing.id },
          data: {
            isFavorite: newFavoriteState,
            isConsumed: newFavoriteState ? true : existing.isConsumed,
            bookPublicationId: nextBookPublicationId,
            date: new Date(),
          },
        });
      } else {
        newFavoriteState = true;
        nextBookPublicationId = await resolveBookPublicationIdForLog(
          prisma,
          contentId,
        );
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            bookPublicationId: nextBookPublicationId,
            isFavorite: true,
            isConsumed: true,
            date: new Date(),
          },
        });
      }

      await syncBookPublicationConsumeCount(
        prisma,
        oldBookPublicationId,
        nextBookPublicationId,
        wasConsumed,
        newFavoriteState ? true : wasConsumed,
      );

      await prisma.content.update({
        where: { id: contentId },
        data: {
          favoriteCount: newFavoriteState ? { increment: 1 } : { decrement: 1 },
          ...(newFavoriteState && !wasConsumed
            ? { consumeCount: { increment: 1 } }
            : {}),
        },
      });

      await prisma.content.updateMany({
        where: { id: contentId, favoriteCount: { lt: 0 } },
        data: { favoriteCount: 0 },
      });

      if (newFavoriteState) {
        await syncEpisodesOnTvShowConsumed(prisma, user.id, contentId);
      }

      logger.success(`[toggleContentFavorite] Favorite = ${newFavoriteState}`);
      return newFavoriteState;
    } catch (error) {
      logger.error(`[toggleContentFavorite] Error: `, error);
      throw new Error("Failed to toggle content favorite");
    }
  }

  /**
   * Rate content (1 to 10) or clear rating (null)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async rateContent(
    @Arg("contentId", () => String) contentId: string,
    @Arg("rating", () => Float, { nullable: true }) rating: number | null,
    @Arg("bookPublicationId", () => Int, { nullable: true })
    bookPublicationId: number | null | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[rateContent] userId = ${user.id}, contentId = ${contentId}, rating = ${rating}`,
      );

      if (rating !== null && (rating < 1 || rating > 10)) {
        throw new Error("Rating must be between 1 and 10");
      }

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      const oldRating = existing?.rating ? Number(existing.rating) : null;
      const wasConsumed = existing?.isConsumed || false;
      const oldBookPublicationId = existing?.bookPublicationId ?? null;
      const nextBookPublicationId =
        bookPublicationId !== undefined
          ? await resolveBookPublicationIdForLog(
              prisma,
              contentId,
              bookPublicationId,
            )
          : (oldBookPublicationId ??
            (rating !== null
              ? await resolveBookPublicationIdForLog(prisma, contentId)
              : null));
      const isAbandoned = existing?.isAbandoned || false;
      const isContinuing = existing?.isContinuing || false;
      const willConsume =
        isAbandoned || isContinuing
          ? wasConsumed
          : rating !== null
            ? true
            : wasConsumed;
      const newlyConsumed = willConsume && !wasConsumed;

      if (existing) {
        await prisma.userContentLog.update({
          where: { id: existing.id },
          data: {
            rating,
            isConsumed: willConsume,
            bookPublicationId: nextBookPublicationId,
            ...(newlyConsumed ? { date: new Date() } : {}),
          },
        });
      } else {
        if (rating === null) {
          return true;
        }
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            rating,
            isConsumed: true,
            bookPublicationId: nextBookPublicationId,
            date: new Date(),
          },
        });
      }

      await syncBookPublicationConsumeCount(
        prisma,
        oldBookPublicationId,
        nextBookPublicationId,
        wasConsumed,
        willConsume,
      );
      await syncBookPublicationRatingStats(
        prisma,
        oldBookPublicationId,
        nextBookPublicationId,
        oldRating,
        rating,
      );

      const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: {
          ratingDistribution: true,
          totalRatingScore: true,
          totalRatingVotes: true,
        },
      });

      if (content) {
        const dist = [
          ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        ];
        while (dist.length < 10) dist.push(0);

        if (oldRating) {
          const oldIndex = Math.round(oldRating) - 1;
          if (oldIndex >= 0 && oldIndex < 10) {
            dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);
          }
        }
        if (rating !== null) {
          const newIndex = Math.round(rating) - 1;
          if (newIndex >= 0 && newIndex < 10) {
            dist[newIndex] += 1;
          }
        }

        let newScore = content.totalRatingScore
          ? Number(content.totalRatingScore)
          : 0;
        let newVotes = content.totalRatingVotes ?? 0;

        if (oldRating && rating !== null) {
          newScore = Math.max(0, newScore + rating - oldRating);
        } else if (oldRating && rating === null) {
          newScore = Math.max(0, newScore - oldRating);
          newVotes = Math.max(0, newVotes - 1);
        } else if (!oldRating && rating !== null) {
          newScore += rating;
          newVotes += 1;
        }

        await prisma.content.update({
          where: { id: contentId },
          data: {
            ratingDistribution: dist,
            totalRatingScore: newScore,
            totalRatingVotes: newVotes,
            ...(newlyConsumed ? { consumeCount: { increment: 1 } } : {}),
          },
        });
      } else if (newlyConsumed) {
        await prisma.content.updateMany({
          where: { id: contentId },
          data: { consumeCount: { increment: 1 } },
        });
      }

      if (willConsume) {
        await syncEpisodesOnTvShowConsumed(prisma, user.id, contentId);
      }

      logger.success(`[rateContent] Success`);
      return true;
    } catch (error) {
      logger.error(`[rateContent] Error: `, error);
      throw new Error("Failed to rate content");
    }
  }

  /**
   * Toggle consume later (watchlist)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async toggleConsumeLater(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[toggleConsumeLater] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      let newState: boolean;

      if (existing) {
        newState = !existing.isConsumeLater;
        const notifyOnRelease = newState
          ? await shouldEnableNotifyOnRelease(prisma, contentId)
          : false;

        const updatedLog = {
          ...existing,
          isConsumeLater: newState,
          notifyOnRelease,
        };

        const isLogEmpty =
          !updatedLog.isConsumed &&
          !updatedLog.isFavorite &&
          !updatedLog.isConsumeLater &&
          !updatedLog.notifyOnRelease &&
          !updatedLog.isContinuing &&
          !updatedLog.isAbandoned &&
          !updatedLog.rating &&
          !updatedLog.playtimeMinutes &&
          !updatedLog.platformId &&
          !updatedLog.bookPublicationId &&
          !updatedLog.bookFormat;

        if (isLogEmpty) {
          await prisma.userContentLog.delete({
            where: { id: existing.id },
          });
        } else {
          await prisma.userContentLog.update({
            where: { id: existing.id },
            data: {
              isConsumeLater: newState,
              notifyOnRelease,
              date: new Date(),
            },
          });
        }
      } else {
        newState = true;
        const notifyOnRelease = await shouldEnableNotifyOnRelease(
          prisma,
          contentId,
        );
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            isConsumeLater: true,
            notifyOnRelease,
            date: new Date(),
          },
        });
      }

      await cleanupReviewOnContentRemoval(prisma, user.id, contentId);

      logger.success(`[toggleConsumeLater] ConsumeLater = ${newState}`);
      return newState;
    } catch (error) {
      logger.error(`[toggleConsumeLater] Error: `, error);
      throw new Error("Failed to toggle consume later");
    }
  }

  /**
   * Toggle content watchlist (alias for toggleConsumeLater)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async toggleContentWatchlist(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    return this.toggleConsumeLater(contentId, {
      user,
      prisma,
    } as GraphQLContext);
  }

  /**
   * Toggle continuing (in progress) status
   */
  @Authorized()
  @Mutation(() => Boolean)
  async toggleContentContinuing(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[toggleContentContinuing] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      let newState: boolean;

      if (existing) {
        newState = !existing.isContinuing;

        const willClearRating =
          !newState &&
          !existing.isConsumed &&
          !existing.isAbandoned &&
          existing.rating !== null;

        const updateData: any = {
          isContinuing: newState,
          ...(newState ? { isAbandoned: false } : {}),
          ...(willClearRating ? { rating: null } : {}),
          date: new Date(),
        };

        const isLogEmpty =
          !updateData.isContinuing &&
          !existing.isConsumed &&
          !existing.isFavorite &&
          !existing.isConsumeLater &&
          !existing.notifyOnRelease &&
          !(updateData.isAbandoned ?? existing.isAbandoned) &&
          !existing.playtimeMinutes &&
          !existing.platformId &&
          !updateData.rating;

        if (isLogEmpty) {
          await prisma.userContentLog.delete({
            where: { id: existing.id },
          });
        } else {
          await prisma.userContentLog.update({
            where: { id: existing.id },
            data: updateData,
          });
        }

        if (willClearRating && existing.rating) {
          const oldRating = Number(existing.rating);
          const content = await prisma.content.findUnique({
            where: { id: contentId },
            select: {
              ratingDistribution: true,
              totalRatingScore: true,
              totalRatingVotes: true,
            },
          });
          if (content) {
            const dist = [
              ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            ];
            while (dist.length < 10) dist.push(0);
            const oldIndex = Math.round(oldRating) - 1;
            if (oldIndex >= 0 && oldIndex < 10)
              dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);

            await prisma.content.update({
              where: { id: contentId },
              data: {
                ratingDistribution: dist,
                totalRatingScore: Math.max(
                  0,
                  (content.totalRatingScore
                    ? Number(content.totalRatingScore)
                    : 0) - oldRating,
                ),
                totalRatingVotes: Math.max(
                  0,
                  (content.totalRatingVotes ?? 0) - 1,
                ),
              },
            });
          }
        }
      } else {
        newState = true;
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            isContinuing: true,
            isAbandoned: false,
            date: new Date(),
          },
        });
      }

      await cleanupReviewOnContentRemoval(prisma, user.id, contentId);

      const resultingLog = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });
      if (
        !resultingLog ||
        (!resultingLog.isConsumed &&
          !resultingLog.isContinuing &&
          !resultingLog.isAbandoned)
      ) {
        await unsyncEpisodesOnTvShowUnmarked(prisma, user.id, contentId);
      }

      logger.success(`[toggleContentContinuing] Continuing = ${newState}`);
      return newState;
    } catch (error) {
      logger.error(`[toggleContentContinuing] Error: `, error);
      throw new Error("Failed to toggle continuing");
    }
  }

  /**
   * Toggle abandoned (dropped) status
   */
  @Authorized()
  @Mutation(() => Boolean)
  async toggleContentAbandoned(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[toggleContentAbandoned] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      let newState: boolean;

      if (existing) {
        newState = !existing.isAbandoned;

        const willClearRating =
          !newState &&
          !existing.isConsumed &&
          !existing.isContinuing &&
          existing.rating !== null;

        const updateData: any = {
          isAbandoned: newState,
          ...(newState ? { isContinuing: false } : {}),
          ...(willClearRating ? { rating: null } : {}),
          date: new Date(),
        };

        const isLogEmpty =
          !updateData.isAbandoned &&
          !existing.isConsumed &&
          !existing.isFavorite &&
          !existing.isConsumeLater &&
          !existing.notifyOnRelease &&
          !(updateData.isContinuing ?? existing.isContinuing) &&
          !existing.playtimeMinutes &&
          !existing.platformId &&
          !updateData.rating;

        if (isLogEmpty) {
          await prisma.userContentLog.delete({
            where: { id: existing.id },
          });
        } else {
          await prisma.userContentLog.update({
            where: { id: existing.id },
            data: updateData,
          });
        }

        if (willClearRating && existing.rating) {
          const oldRating = Number(existing.rating);
          const content = await prisma.content.findUnique({
            where: { id: contentId },
            select: {
              ratingDistribution: true,
              totalRatingScore: true,
              totalRatingVotes: true,
            },
          });
          if (content) {
            const dist = [
              ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            ];
            while (dist.length < 10) dist.push(0);
            const oldIndex = Math.round(oldRating) - 1;
            if (oldIndex >= 0 && oldIndex < 10)
              dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);

            await prisma.content.update({
              where: { id: contentId },
              data: {
                ratingDistribution: dist,
                totalRatingScore: Math.max(
                  0,
                  (content.totalRatingScore
                    ? Number(content.totalRatingScore)
                    : 0) - oldRating,
                ),
                totalRatingVotes: Math.max(
                  0,
                  (content.totalRatingVotes ?? 0) - 1,
                ),
              },
            });
          }
        }
      } else {
        newState = true;
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            isAbandoned: true,
            isContinuing: false,
            date: new Date(),
          },
        });
      }

      await cleanupReviewOnContentRemoval(prisma, user.id, contentId);

      const resultingLog = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });
      if (
        !resultingLog ||
        (!resultingLog.isConsumed &&
          !resultingLog.isContinuing &&
          !resultingLog.isAbandoned)
      ) {
        await unsyncEpisodesOnTvShowUnmarked(prisma, user.id, contentId);
      }

      logger.success(`[toggleContentAbandoned] Abandoned = ${newState}`);
      return newState;
    } catch (error) {
      logger.error(`[toggleContentAbandoned] Error: `, error);
      throw new Error("Failed to toggle abandoned");
    }
  }

  /**
   * Toggle featured content for user
   */
  @Authorized()
  @Mutation(() => Boolean)
  async toggleContentFeatured(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[toggleContentFeatured] userId = ${user.id}, contentId = ${contentId}`,
      );

      const existing = await prisma.userFeaturedContent.findFirst({
        where: { userId: user.id, contentId },
      });

      if (existing) {
        await prisma.userFeaturedContent.delete({ where: { id: existing.id } });
        logger.success(`[toggleContentFeatured] Removed from featured`);
        return false;
      } else {
        await prisma.userFeaturedContent.create({
          data: {
            userId: user.id,
            contentId,
          },
        });
        logger.success(`[toggleContentFeatured] Added to featured`);
        return true;
      }
    } catch (error) {
      logger.error(`[toggleContentFeatured] Error: `, error);
      throw new Error("Failed to toggle featured content");
    }
  }

  /**
   * Set featured content (replace all featured for a content type)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async setFeaturedContent(
    @Arg("contentIds", () => [String]) contentIds: string[],
    @Arg("contentType", () => String) contentType: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[setFeaturedContent] userId = ${user.id}, type = ${contentType}, count = ${contentIds.length}`,
      );

      const existingFeatured = await prisma.userFeaturedContent.findMany({
        where: {
          userId: user.id,
          content: { contentType: { name: contentType.toUpperCase() } },
        },
        include: { content: { select: { id: true } } },
      });

      if (existingFeatured.length > 0) {
        await prisma.userFeaturedContent.deleteMany({
          where: {
            id: { in: existingFeatured.map((f) => f.id) },
          },
        });
      }

      for (let i = 0; i < contentIds.length; i++) {
        await prisma.userFeaturedContent.create({
          data: {
            userId: user.id,
            contentId: contentIds[i],
            displayOrder: i,
          },
        });
      }

      logger.success(
        `[setFeaturedContent] Set ${contentIds.length} featured contents`,
      );
      return true;
    } catch (error) {
      logger.error(`[setFeaturedContent] Error: `, error);
      throw new Error("Failed to set featured content");
    }
  }

  /**
   * Delete specific content watch log by ID
   */
  @Authorized()
  @Mutation(() => Boolean)
  async deleteContentWatch(
    @Arg("logId", () => Int) logId: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[deleteContentWatch] userId = ${user.id}, logId = ${logId}`,
      );

      const log = await prisma.userContentLog.findUnique({
        where: { id: logId },
      });

      if (!log || log.userId !== user.id) {
        logger.warn(`[deleteContentWatch] Log not found or unauthorized`);
        return false;
      }

      await cleanupReviewOnContentRemoval(
        prisma,
        user.id,
        log.contentId,
        logId,
      );

      await prisma.userContentLog.delete({ where: { id: logId } });

      if (log.isConsumed) {
        await prisma.content.update({
          where: { id: log.contentId },
          data: { consumeCount: { decrement: 1 } },
        });
        await prisma.content.updateMany({
          where: { id: log.contentId, consumeCount: { lt: 0 } },
          data: { consumeCount: 0 },
        });
      }

      if (log.rating) {
        const content = await prisma.content.findUnique({
          where: { id: log.contentId },
          select: {
            ratingDistribution: true,
            totalRatingScore: true,
            totalRatingVotes: true,
          },
        });

        if (content) {
          const dist = [
            ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
          ];
          while (dist.length < 10) dist.push(0);
          const oldIndex = Math.round(Number(log.rating)) - 1;
          if (oldIndex >= 0 && oldIndex < 10) {
            dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);
          }

          let newScore = content.totalRatingScore
            ? Number(content.totalRatingScore) - Number(log.rating)
            : 0;
          let newVotes = (content.totalRatingVotes ?? 0) - 1;

          await prisma.content.update({
            where: { id: log.contentId },
            data: {
              ratingDistribution: dist,
              totalRatingScore: Math.max(0, newScore),
              totalRatingVotes: Math.max(0, newVotes),
            },
          });
        }
      }

      await syncBookPublicationConsumeCount(
        prisma,
        log.bookPublicationId ?? null,
        null,
        log.isConsumed,
        false,
      );
      await syncBookPublicationRatingStats(
        prisma,
        log.bookPublicationId ?? null,
        null,
        log.rating ? Number(log.rating) : null,
        null,
      );

      if (log.playtimeMinutes) {
        await prisma.content.update({
          where: { id: log.contentId },
          data: {
            totalPlaytimeMinutes: { decrement: log.playtimeMinutes },
            totalPlaytimeLogs: { decrement: 1 },
          },
        });
      }

      if (log.isFavorite) {
        await prisma.content.update({
          where: { id: log.contentId },
          data: { favoriteCount: { decrement: 1 } },
        });
        await prisma.content.updateMany({
          where: { id: log.contentId, favoriteCount: { lt: 0 } },
          data: { favoriteCount: 0 },
        });
      }

      await updateGameMedianPlaytime(prisma, log.contentId);

      logger.success(`[deleteContentWatch] Deleted log ${logId}`);
      return true;
    } catch (error) {
      logger.error(`[deleteContentWatch] Error: `, error);
      throw new Error("Failed to delete content watch");
    }
  }

  /**
   * Update existing content watch log (date, rating)
   */
  @Authorized()
  @Mutation(() => UserContentLog, { nullable: true })
  async updateContentWatch(
    @Arg("logId", () => Int) logId: number,
    @Arg("date", () => Date, { nullable: true }) date: Date | undefined,
    @Arg("rating", () => Float, { nullable: true }) rating: number | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<UserContentLog | null> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[updateContentWatch] userId = ${user.id}, logId = ${logId}, date = ${date}, rating = ${rating}`,
      );

      const log = await prisma.userContentLog.findUnique({
        where: { id: logId },
      });

      if (!log || log.userId !== user.id) {
        logger.warn(`[updateContentWatch] Log not found or unauthorized`);
        return null;
      }

      const updateData: any = {};
      if (date !== undefined) updateData.date = date;
      if (rating !== undefined) {
        if (rating !== null && (rating < 1 || rating > 10)) {
          throw new Error("Rating must be between 1 and 10");
        }
        updateData.rating = rating;
      }

      const updated = await prisma.userContentLog.update({
        where: { id: logId },
        data: updateData,
        include: {
          taggedUsers: true,
          bookPublication: { include: { publisher: true } },
        },
      });

      if (rating !== undefined) {
        const oldRating =
          log.rating !== null && log.rating !== undefined
            ? Number(log.rating)
            : null;
        const nextRating = rating ?? null;
        await adjustContentRatingStats(
          prisma,
          log.contentId,
          oldRating,
          nextRating,
        );
        await syncBookPublicationRatingStats(
          prisma,
          log.bookPublicationId ?? null,
          log.bookPublicationId ?? null,
          oldRating,
          nextRating,
        );
      }

      logger.success(`[updateContentWatch] Updated log ${logId}`);
      return convertLog(updated);
    } catch (error) {
      logger.error(`[updateContentWatch] Error: `, error);
      throw new Error("Failed to update content watch");
    }
  }

  /**
   * Atomically delete a user's tracking logs and content reviews, then rebuild affected aggregates.
   */
  @Authorized()
  @Mutation(() => Boolean)
  async deleteAllUserContentLogs(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(`[deleteAllUserContentLogs] userId = ${user.id}`);

      const resetCounts = await prisma.$transaction(
        async (transaction) => {
          const logs = await transaction.userContentLog.findMany({
            where: { userId: user.id },
            select: {
              contentId: true,
              isConsumed: true,
              isFavorite: true,
              rating: true,
              bookPublicationId: true,
            },
          });
          const uniqueContentIds = [
            ...new Set(logs.map((log) => log.contentId)),
          ];
          const affectedBookPublicationIds = logs
            .map((log: any) => log.bookPublicationId)
            .filter(Boolean);

          const reviews = await transaction.discussion.findMany({
            where: {
              authorId: user.id,
              type: "comment",
              isDeleted: false,
              contentId: { not: null },
            },
            select: {
              id: true,
              contentId: true,
            },
          });

          await transaction.userContentLog.deleteMany({
            where: { userId: user.id },
          });

          if (reviews.length > 0) {
            await transaction.discussion.updateMany({
              where: {
                id: { in: reviews.map((review) => review.id) },
              },
              data: {
                isDeleted: true,
                deletedAt: new Date(),
              },
            });
          }

          const consumeMap = new Map<string, number>();
          const favoriteMap = new Map<string, number>();
          const discussionMap = new Map<string, number>();

          for (const log of logs) {
            if (log.isConsumed) {
              consumeMap.set(
                log.contentId,
                (consumeMap.get(log.contentId) || 0) + 1,
              );
            }
            if (log.isFavorite) {
              favoriteMap.set(
                log.contentId,
                (favoriteMap.get(log.contentId) || 0) + 1,
              );
            }
          }

          for (const review of reviews) {
            if (!review.contentId) continue;
            discussionMap.set(
              review.contentId,
              (discussionMap.get(review.contentId) || 0) + 1,
            );
          }

          for (const [contentId, count] of consumeMap) {
            await transaction.content.update({
              where: { id: contentId },
              data: { consumeCount: { decrement: count } },
            });
          }
          for (const [contentId, count] of favoriteMap) {
            await transaction.content.update({
              where: { id: contentId },
              data: { favoriteCount: { decrement: count } },
            });
          }
          for (const [contentId, count] of discussionMap) {
            await transaction.content.update({
              where: { id: contentId },
              data: { discussionCount: { decrement: count } },
            });
          }

          for (const cid of uniqueContentIds) {
            const ratingStats = await calculateContentRatingStats(
              transaction,
              cid as string,
            );
            await transaction.content.update({
              where: { id: cid as string },
              data: {
                totalRatingVotes: ratingStats.ratingCount,
                totalRatingScore: ratingStats.totalRatingScore,
                ratingDistribution: ratingStats.ratingDistribution,
              },
            });
          }

          await recalculateBookPublicationAggregates(
            transaction,
            affectedBookPublicationIds,
          );

          for (const cid of uniqueContentIds) {
            await updateGameMedianPlaytime(transaction, cid, true);
          }

          await transaction.content.updateMany({
            where: { consumeCount: { lt: 0 } },
            data: { consumeCount: 0 },
          });
          await transaction.content.updateMany({
            where: { favoriteCount: { lt: 0 } },
            data: { favoriteCount: 0 },
          });
          await transaction.content.updateMany({
            where: { discussionCount: { lt: 0 } },
            data: { discussionCount: 0 },
          });

          return { logCount: logs.length, reviewCount: reviews.length };
        },
        {
          maxWait: 10_000,
          timeout: 60_000,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      logger.success(
        `[deleteAllUserContentLogs] Deleted ${resetCounts.logCount} logs and ${resetCounts.reviewCount} reviews`,
      );
      return true;
    } catch (error) {
      logger.error(`[deleteAllUserContentLogs] Error: `, error);
      throw new Error("Failed to delete all user content logs");
    }
  }

  /**
   * Create a new user content log entry
   */
  @Authorized()
  @Mutation(() => Boolean)
  async createUserContentLog(
    @Arg("contentId", () => String) contentId: string,
    @Arg("logData", () => UserContentLogInput) logData: UserContentLogInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[createUserContentLog] userId = ${user.id}, contentId = ${contentId}`,
        logData,
      );

      const normalizedLogData = {
        rating:
          logData.rating && logData.rating > 0 ? logData.rating : undefined,
        isFavorite: logData.isFavorite ?? false,
        isConsumeLater: logData.isConsumeLater ?? false,
        notifyOnRelease: logData.notifyOnRelease ?? false,
        isConsumed: logData.isConsumed ?? false,
        isContinuing: logData.isContinuing ?? false,
        isAbandoned: logData.isAbandoned ?? false,
        playtimeMinutes: logData.playtimeMinutes ?? undefined,
        platformId: logData.platformId ?? undefined,
        bookFormat: logData.bookFormat?.trim() || undefined,
        ratingDetails: logData.ratingDetails ?? undefined,
      };

      if (normalizedLogData.isConsumeLater) {
        normalizedLogData.notifyOnRelease = await shouldEnableNotifyOnRelease(
          prisma,
          contentId,
        );
      } else if (logData.notifyOnRelease === undefined) {
        normalizedLogData.notifyOnRelease = false;
      }

      if (
        normalizedLogData.isConsumed ||
        normalizedLogData.isFavorite ||
        normalizedLogData.isContinuing ||
        normalizedLogData.isAbandoned
      ) {
        normalizedLogData.isConsumeLater = false;
        normalizedLogData.notifyOnRelease = false;
      }

      const hasPublicationSelection = logData.bookPublicationId !== undefined;
      const targetBookPublicationId =
        hasPublicationSelection ||
        hasMeaningfulUserContentState(normalizedLogData)
          ? await resolveBookPublicationIdForLog(
              prisma,
              contentId,
              logData.bookPublicationId,
            )
          : null;
      const shouldCreateLog = hasMeaningfulUserContentState({
        ...normalizedLogData,
        bookPublicationId: targetBookPublicationId,
      });

      if (shouldCreateLog) {
        await prisma.userContentLog.create({
          data: {
            userId: user.id,
            contentId,
            bookPublicationId: targetBookPublicationId,
            ...normalizedLogData,
            date: logData.date ? new Date(logData.date) : new Date(),
          },
        });
        await syncBookPublicationConsumeCount(
          prisma,
          null,
          targetBookPublicationId,
          false,
          normalizedLogData.isConsumed,
        );
        await syncBookPublicationRatingStats(
          prisma,
          null,
          targetBookPublicationId,
          null,
          normalizedLogData.rating ?? null,
        );
      }

      if (shouldCreateLog && normalizedLogData.isConsumed) {
        await prisma.content.update({
          where: { id: contentId },
          data: { consumeCount: { increment: 1 } },
        });
        await syncEpisodesOnTvShowConsumed(prisma, user.id, contentId);
      }

      if (shouldCreateLog && normalizedLogData.rating) {
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: {
            ratingDistribution: true,
            totalRatingScore: true,
            totalRatingVotes: true,
          },
        });
        if (content) {
          const dist = [
            ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
          ];
          while (dist.length < 10) dist.push(0);
          const newIndex = Math.round(normalizedLogData.rating) - 1;
          if (newIndex >= 0 && newIndex < 10) dist[newIndex] += 1;

          let newScore =
            (content.totalRatingScore ? Number(content.totalRatingScore) : 0) +
            normalizedLogData.rating;
          let newVotes = (content.totalRatingVotes ?? 0) + 1;

          await prisma.content.update({
            where: { id: contentId },
            data: {
              ratingDistribution: dist,
              totalRatingScore: newScore,
              totalRatingVotes: newVotes,
            },
          });
        }
      }

      if (shouldCreateLog && normalizedLogData.playtimeMinutes) {
        await prisma.content.update({
          where: { id: contentId },
          data: {
            totalPlaytimeMinutes: {
              increment: normalizedLogData.playtimeMinutes,
            },
            totalPlaytimeLogs: { increment: 1 },
          },
        });
      }
      if (shouldCreateLog && normalizedLogData.isFavorite) {
        await prisma.content.update({
          where: { id: contentId },
          data: { favoriteCount: { increment: 1 } },
        });
      }

      if (logData.review && logData.review.trim().length > 0) {
        await prisma.discussion.create({
          data: {
            contentId: contentId,
            authorId: user.id,
            type: "comment",
            description: logData.review.trim(),
          },
        });
        await prisma.content.update({
          where: { id: contentId },
          data: { discussionCount: { increment: 1 } },
        });
      }

      if (shouldCreateLog) {
        await updateGameMedianPlaytime(prisma, contentId);
      }

      logger.success(
        `[createUserContentLog] ${shouldCreateLog ? "Created log" : "Created standalone review"}`,
      );
      return true;
    } catch (error) {
      logger.error(`[createUserContentLog] Error: `, error);
      throw new Error("Failed to create user content log");
    }
  }

  /**
   * Update user's content log (updates latest log or creates new one)
   */
  @Authorized()
  @Mutation(() => Boolean)
  async updateUserContentLog(
    @Arg("contentId", () => String) contentId: string,
    @Arg("updates", () => UserContentLogInput) updates: UserContentLogInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");
    try {
      logger.debug(
        `[updateUserContentLog] userId = ${user.id}, contentId = ${contentId}`,
        updates,
      );

      const existing = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });

      const updateData: any = {};
      if (updates.rating !== undefined) updateData.rating = updates.rating;
      if (updates.isConsumed !== undefined)
        updateData.isConsumed = updates.isConsumed;
      if (updates.isFavorite !== undefined)
        updateData.isFavorite = updates.isFavorite;
      if (updates.isConsumeLater !== undefined)
        updateData.isConsumeLater = updates.isConsumeLater;
      if (updates.notifyOnRelease !== undefined)
        updateData.notifyOnRelease = updates.notifyOnRelease;
      if (updates.isContinuing !== undefined)
        updateData.isContinuing = updates.isContinuing;
      if (updates.isAbandoned !== undefined)
        updateData.isAbandoned = updates.isAbandoned;

      if (
        updates.isConsumed === true ||
        updates.isFavorite === true ||
        updates.isContinuing === true ||
        updates.isAbandoned === true
      ) {
        updateData.isConsumeLater = false;
        updateData.notifyOnRelease = false;
      }

      if (updates.isConsumeLater === true) {
        updateData.notifyOnRelease = await shouldEnableNotifyOnRelease(
          prisma,
          contentId,
        );
      }

      if (updates.isConsumeLater === false) {
        updateData.notifyOnRelease = false;
      }

      if (updates.playtimeMinutes !== undefined)
        updateData.playtimeMinutes = updates.playtimeMinutes;
      if (updates.platformId !== undefined)
        updateData.platformId = updates.platformId;
      if (updates.bookFormat !== undefined)
        updateData.bookFormat = updates.bookFormat?.trim() || null;
      if (updates.date) updateData.date = new Date(updates.date);

      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.taggedUserIds !== undefined) {
        updateData.taggedUsers = {
          set: updates.taggedUserIds.map((id) => ({ id })),
        };
      }
      if (updates.ratingDetails !== undefined) {
        updateData.ratingDetails = updates.ratingDetails;
      }

      const shouldCreateLog = hasMeaningfulUserContentState({
        ...updateData,
        review: updates.review,
        bookPublicationId:
          updates.bookPublicationId !== undefined
            ? updates.bookPublicationId
            : existing?.bookPublicationId,
        bookFormat:
          updates.bookFormat !== undefined
            ? updates.bookFormat
            : existing?.bookFormat,
      });
      const oldBookPublicationId = existing?.bookPublicationId ?? null;
      const oldRating =
        existing?.rating !== null && existing?.rating !== undefined
          ? Number(existing.rating)
          : null;
      let nextBookPublicationId = oldBookPublicationId;

      if (shouldCreateLog) {
        if (updates.bookPublicationId !== undefined) {
          nextBookPublicationId = await resolveBookPublicationIdForLog(
            prisma,
            contentId,
            updates.bookPublicationId,
          );
        } else if (!oldBookPublicationId) {
          nextBookPublicationId = await resolveBookPublicationIdForLog(
            prisma,
            contentId,
          );
        }

        if (
          !existing ||
          updates.bookPublicationId !== undefined ||
          nextBookPublicationId !== oldBookPublicationId
        ) {
          updateData.bookPublicationId = nextBookPublicationId;
        }
      }

      if (existing) {
        const wasConsumed = existing.isConsumed;
        const wasFavorite = existing.isFavorite;

        const resultingLog = {
          ...existing,
          ...updateData,
          review: updates.review,
        };
        const isLogEmpty = !hasMeaningfulUserContentState(resultingLog);

        if (isLogEmpty) {
          await prisma.userContentLog.delete({
            where: { id: existing.id },
          });
        } else {
          await prisma.userContentLog.update({
            where: { id: existing.id },
            data: updateData,
          });
        }

        if (
          updates.isConsumed !== undefined &&
          updates.isConsumed !== wasConsumed
        ) {
          await prisma.content.update({
            where: { id: contentId },
            data: {
              consumeCount: updates.isConsumed
                ? { increment: 1 }
                : { decrement: 1 },
            },
          });

          if (updates.isConsumed) {
            await syncEpisodesOnTvShowConsumed(prisma, user.id, contentId);
          }
        }
        if (
          updates.isFavorite !== undefined &&
          updates.isFavorite !== wasFavorite
        ) {
          await prisma.content.update({
            where: { id: contentId },
            data: {
              favoriteCount: updates.isFavorite
                ? { increment: 1 }
                : { decrement: 1 },
            },
          });
        }

        await syncBookPublicationConsumeCount(
          prisma,
          oldBookPublicationId,
          isLogEmpty ? null : nextBookPublicationId,
          wasConsumed,
          isLogEmpty ? false : Boolean(resultingLog.isConsumed),
        );
        await syncBookPublicationRatingStats(
          prisma,
          oldBookPublicationId,
          isLogEmpty ? null : nextBookPublicationId,
          oldRating,
          isLogEmpty
            ? null
            : updates.rating !== undefined
              ? (updates.rating ?? null)
              : oldRating,
        );
      } else {
        if (shouldCreateLog) {
          const createData = { ...updateData };
          if (createData.taggedUsers && createData.taggedUsers.set) {
            createData.taggedUsers = { connect: createData.taggedUsers.set };
          }

          await prisma.userContentLog.create({
            data: {
              userId: user.id,
              contentId,
              bookPublicationId: nextBookPublicationId,
              ...createData,
              date: createData.date || new Date(),
            },
          });
          await syncBookPublicationConsumeCount(
            prisma,
            null,
            nextBookPublicationId,
            false,
            createData.isConsumed ?? false,
          );
          await syncBookPublicationRatingStats(
            prisma,
            null,
            nextBookPublicationId,
            null,
            createData.rating ?? null,
          );

          if (updates.isConsumed) {
            await prisma.content.update({
              where: { id: contentId },
              data: { consumeCount: { increment: 1 } },
            });
          }
          if (updates.isFavorite) {
            await prisma.content.update({
              where: { id: contentId },
              data: { favoriteCount: { increment: 1 } },
            });
          }

          if (updates.rating) {
            const content = await prisma.content.findUnique({
              where: { id: contentId },
              select: {
                ratingDistribution: true,
                totalRatingScore: true,
                totalRatingVotes: true,
              },
            });
            if (content) {
              const dist = [
                ...(content.ratingDistribution ?? [
                  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                ]),
              ];
              while (dist.length < 10) dist.push(0);
              const newIndex = Math.round(updates.rating) - 1;
              if (newIndex >= 0 && newIndex < 10) dist[newIndex] += 1;

              let newScore =
                (content.totalRatingScore
                  ? Number(content.totalRatingScore)
                  : 0) + updates.rating;
              let newVotes = (content.totalRatingVotes ?? 0) + 1;

              await prisma.content.update({
                where: { id: contentId },
                data: {
                  ratingDistribution: dist,
                  totalRatingScore: newScore,
                  totalRatingVotes: newVotes,
                },
              });
            }
          }

          if (updates.playtimeMinutes) {
            await prisma.content.update({
              where: { id: contentId },
              data: {
                totalPlaytimeMinutes: { increment: updates.playtimeMinutes },
                totalPlaytimeLogs: { increment: 1 },
              },
            });
          }
        }
      }

      if (
        existing &&
        updates.rating !== undefined &&
        updates.rating !== Number(existing.rating)
      ) {
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: {
            ratingDistribution: true,
            totalRatingScore: true,
            totalRatingVotes: true,
          },
        });

        if (content) {
          const dist = [
            ...(content.ratingDistribution ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
          ];
          while (dist.length < 10) dist.push(0);

          if (existing.rating !== null) {
            const oldIndex = Math.round(Number(existing.rating)) - 1;
            if (oldIndex >= 0 && oldIndex < 10)
              dist[oldIndex] = Math.max(0, dist[oldIndex] - 1);
          }

          if (updates.rating !== null) {
            const newIndex = Math.round(updates.rating) - 1;
            if (newIndex >= 0 && newIndex < 10) dist[newIndex] += 1;
          }

          let newScore = content.totalRatingScore
            ? Number(content.totalRatingScore)
            : 0;
          let newVotes = content.totalRatingVotes ?? 0;

          if (existing.rating !== null) {
            newScore -= Number(existing.rating);
            if (updates.rating === null) newVotes -= 1;
          }

          if (updates.rating !== null) {
            newScore += updates.rating;
            if (existing.rating === null) newVotes += 1;
          }

          await prisma.content.update({
            where: { id: contentId },
            data: {
              ratingDistribution: dist,
              totalRatingScore: Math.max(0, newScore),
              totalRatingVotes: Math.max(0, newVotes),
            },
          });
        }
      }

      if (
        existing &&
        updates.playtimeMinutes !== undefined &&
        updates.playtimeMinutes !== existing.playtimeMinutes
      ) {
        const oldPlaytime = existing.playtimeMinutes ?? 0;
        const newPlaytime = updates.playtimeMinutes ?? 0;
        const scoreDiff = newPlaytime - oldPlaytime;

        let voteDiff = 0;
        if (
          existing.playtimeMinutes === null &&
          updates.playtimeMinutes !== null
        )
          voteDiff = 1;
        else if (
          existing.playtimeMinutes !== null &&
          updates.playtimeMinutes === null
        )
          voteDiff = -1;

        await prisma.content.update({
          where: { id: contentId },
          data: {
            totalPlaytimeMinutes: { increment: scoreDiff },
            totalPlaytimeLogs: { increment: voteDiff },
          },
        });
      }

      await prisma.content.updateMany({
        where: { id: contentId, consumeCount: { lt: 0 } },
        data: { consumeCount: 0 },
      });
      await prisma.content.updateMany({
        where: { id: contentId, favoriteCount: { lt: 0 } },
        data: { favoriteCount: 0 },
      });
      await prisma.content.updateMany({
        where: { id: contentId, discussionCount: { lt: 0 } },
        data: { discussionCount: 0 },
      });

      if (updates.review !== undefined) {
        const reviewText = updates.review.trim();
        const existingReview = await prisma.discussion.findFirst({
          where: {
            contentId,
            authorId: user.id,
            type: "comment",
            isDeleted: false,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingReview) {
          if (reviewText.length > 0) {
            await prisma.discussion.update({
              where: { id: existingReview.id },
              data: { description: reviewText },
            });
          } else {
            await prisma.discussion.update({
              where: { id: existingReview.id },
              data: { isDeleted: true, deletedAt: new Date() },
            });
            await prisma.content.update({
              where: { id: contentId },
              data: { discussionCount: { decrement: 1 } },
            });
          }
        } else if (reviewText.length > 0) {
          await prisma.discussion.create({
            data: {
              contentId,
              authorId: user.id,
              type: "comment",
              description: reviewText,
            },
          });
          await prisma.content.update({
            where: { id: contentId },
            data: { discussionCount: { increment: 1 } },
          });
        }
      }

      await updateGameMedianPlaytime(prisma, contentId);

      await cleanupReviewOnContentRemoval(prisma, user.id, contentId);

      const resultingLog = await prisma.userContentLog.findFirst({
        where: { userId: user.id, contentId },
        orderBy: { date: "desc" },
      });
      if (
        !resultingLog ||
        (!resultingLog.isConsumed &&
          !resultingLog.isContinuing &&
          !resultingLog.isAbandoned)
      ) {
        await unsyncEpisodesOnTvShowUnmarked(prisma, user.id, contentId);
      }

      logger.success(
        `[updateUserContentLog] Updated log for content ${contentId}`,
      );
      return true;
    } catch (error) {
      logger.error(`[updateUserContentLog] Error: `, error);
      throw new Error("Failed to update user content log");
    }
  }

  /**
   * Completely remove a tag or a tagged user from all logs of the logged-in user
   */
  @Authorized()
  @Mutation(() => Boolean)
  async removeTagFromAllLogs(
    @Arg("tag", () => String, { nullable: true }) tag: string | null,
    @Arg("taggedUserId", () => String, { nullable: true })
    taggedUserId: string | null,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    try {
      if (tag) {
        logger.debug(
          `[removeTagFromAllLogs] Removing string tag '${tag}' for user ${user.id}`,
        );
        const logs = await prisma.userContentLog.findMany({
          where: { userId: user.id, tags: { has: tag } },
        });
        for (const log of logs) {
          await prisma.userContentLog.update({
            where: { id: log.id },
            data: { tags: log.tags.filter((t) => t !== tag) },
          });
        }
      }

      if (taggedUserId) {
        logger.debug(
          `[removeTagFromAllLogs] Removing taggedUser '${taggedUserId}' for user ${user.id}`,
        );
        const logs = await prisma.userContentLog.findMany({
          where: {
            userId: user.id,
            taggedUsers: { some: { id: taggedUserId } },
          },
        });
        for (const log of logs) {
          await prisma.userContentLog.update({
            where: { id: log.id },
            data: { taggedUsers: { disconnect: { id: taggedUserId } } },
          });
        }
      }
      return true;
    } catch (error) {
      logger.error(`[removeTagFromAllLogs] Error:`, error);
      throw new Error("Failed to remove tag from all logs");
    }
  }
}
