import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  ObjectType,
  InputType,
  Field,
  Int,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { logger } from "../../lib/logger";
import {
  parseAllLetterboxdData,
  LetterboxdImportData,
} from "../../lib/letterboxdParser";
import {
  linkCompanies,
  saveScreenshots,
  saveExpansions,
} from "../admin/AdminContentHelpers";
import { importQueue } from "../../lib/ImportQueueManager";
import {
  parseGamesCsv,
  parseSeriesCsv,
  mapCsvStatus,
} from "../../lib/csvParser";
import {
  fetchLetterboxdWeeklyPopular,
  fetchImdbWeeklyPopular,
  fetchTmdbWeeklyPopular,
} from "../../lib/popularScraper";
import { dedupePopularListItems, PopularContentListItem } from "../../lib/popularContentList";
import {
  findOrCreateContentFromTmdb,
  findOrCreateGameContent,
  findOrCreateSeriesContent,
  delay,
} from "../../services/ImportService";
import { searchIgdbGames, fetchIgdbGameDetails } from "../../lib/igdbFetcher";

// ─── Input & Output Types ───

@InputType()
export class LetterboxdCsvInput {
  @Field(() => String, { nullable: true })
  diary?: string;

  @Field(() => String, { nullable: true })
  ratings?: string;

  @Field(() => String, { nullable: true })
  reviews?: string;

  @Field(() => String, { nullable: true })
  watched?: string;

  @Field(() => String, { nullable: true })
  watchlist?: string;

  @Field(() => String, { nullable: true })
  liked?: string;

  @Field(() => String, { nullable: true })
  lists?: string;
}

@ObjectType()
export class ImportResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  jobId?: string;

  @Field(() => Int)
  totalMovies: number;

  @Field(() => Int)
  matchedMovies: number;

  @Field(() => Int)
  ratingsImported: number;

  @Field(() => Int)
  watchedImported: number;

  @Field(() => Int)
  watchlistImported: number;

  @Field(() => Int)
  reviewsImported: number;

  @Field(() => Int)
  listsImported: number;

  @Field(() => [String])
  unmatchedMovies: string[];

  @Field(() => [String])
  errors: string[];

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
export class CsvImportResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  jobId?: string;

  @Field(() => Int)
  totalItems: number;

  @Field(() => Int)
  matchedItems: number;

  @Field(() => Int)
  logsCreated: number;

  @Field(() => Int)
  ratingsImported: number;

  @Field(() => [String])
  unmatchedItems: string[];

  @Field(() => [String])
  errors: string[];

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
export class PopularImportResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  jobId?: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@Resolver()
export class ImportMutationResolver {
  @Authorized()
  @Mutation(() => Boolean)
  async cancelImportJob(
    @Arg("jobId", () => String) jobId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== user.id) {
      return false;
    }

    if (job.status === "PENDING" || job.status === "PROCESSING") {
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errors: ["İşlem kullanıcı tarafından iptal edildi."],
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Letterboxd export CSV verilerini import eder.
   */
  @Authorized()
  @Mutation(() => ImportResult)
  async importLetterboxdData(
    @Arg("csvData", () => LetterboxdCsvInput) csvData: LetterboxdCsvInput,
    @Arg("testLimit", () => Int, { nullable: true }) testLimit: number | null,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ImportResult> {
    if (!user) throw new Error("Not authenticated");

    logger.info(
      `[ImportResolver] Starting Letterboxd import for user ${user.username} (${user.id})`,
    );

    const result: ImportResult = {
      success: false,
      totalMovies: 0,
      matchedMovies: 0,
      ratingsImported: 0,
      watchedImported: 0,
      watchlistImported: 0,
      reviewsImported: 0,
      listsImported: 0,
      unmatchedMovies: [],
      errors: [],
    };

    try {
      // 1. Parse all CSV data
      const importData: LetterboxdImportData = parseAllLetterboxdData({
        diary: csvData.diary || undefined,
        ratings: csvData.ratings || undefined,
        reviews: csvData.reviews || undefined,
        watched: csvData.watched || undefined,
        watchlist: csvData.watchlist || undefined,
        liked: csvData.liked || undefined,
        lists: csvData.lists ? JSON.parse(csvData.lists) : undefined,
      });

      // 2. Collect all unique movies (by name + year)
      const uniqueMovies = new Map<
        string,
        { name: string; year: number | null }
      >();

      for (const item of importData.watched) {
        const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, { name: item.name, year: item.year });
        }
      }
      for (const item of importData.ratings) {
        const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, { name: item.name, year: item.year });
        }
      }
      for (const item of importData.diary) {
        const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, { name: item.name, year: item.year });
        }
      }
      for (const item of importData.reviews) {
        const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, { name: item.name, year: item.year });
        }
      }
      for (const item of importData.watchlist) {
        const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, { name: item.name, year: item.year });
        }
      }
      for (const item of importData.liked) {
        const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
        if (!uniqueMovies.has(key)) {
          uniqueMovies.set(key, { name: item.name, year: item.year });
        }
      }
      for (const list of importData.lists) {
        for (const item of list.items) {
          const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
          if (!uniqueMovies.has(key)) {
            uniqueMovies.set(key, { name: item.name, year: item.year });
          }
        }
      }

      result.totalMovies = uniqueMovies.size;

      // Test mode: limit the number of movies to process
      if (testLimit && testLimit > 0) {
        const allKeys = Array.from(uniqueMovies.keys());
        const keysToRemove = allKeys.slice(testLimit);
        for (const key of keysToRemove) {
          uniqueMovies.delete(key);
        }
        logger.info(
          `[ImportResolver] TEST MODE: Limited to ${uniqueMovies.size} of ${result.totalMovies} movies`,
        );
      }

      logger.info(
        `[ImportResolver] Found ${uniqueMovies.size} unique movies to process`,
      );

      const job = await prisma.importJob.create({
        data: {
          userId: user.id,
          type: "letterboxd",
          fileName: "Letterboxd Import",
          totalItems: uniqueMovies.size,
          status: "PENDING",
        },
      });

      result.jobId = job.id;
      result.success = true;
      result.message = "İçe aktarma işlemi arka planda başlatıldı! Kısa süre içinde içerikleriniz eklenecektir.";

      importQueue.addJob(async () => {
        try {
          await prisma.importJob.update({
            where: { id: job.id },
            data: { status: "PROCESSING" },
          });

          // 3. Find or create content for each movie
          const contentCache = new Map<string, string>(); // cacheKey → contentId
          const movieToContentId = new Map<string, string>(); // cacheKey → contentId
          const processedCollectionIds = new Set<number>();
          let processedCount = 0;

          for (const [key, movie] of uniqueMovies.entries()) {
            const currentJobState = await prisma.importJob.findUnique({
              where: { id: job.id },
              select: { status: true }
            });
            
            if (currentJobState?.status === "FAILED" || currentJobState?.status === "CANCELLED") {
              logger.info(`[ImportResolver] Job ${job.id} cancelled or failed. Stopping loop.`);
              return;
            }

            processedCount++;
            logger.info(`[ImportResolver] Progress: ${processedCount}/${uniqueMovies.size} - Processing: ${movie.name}`);
            await prisma.importJob.update({
              where: { id: job.id },
              data: { 
                processedItems: processedCount,
                currentItem: movie.name 
              },
            });

            const contentId = await findOrCreateContentFromTmdb(
              prisma,
              movie.name,
              movie.year,
              contentCache,
              processedCollectionIds,
            );

            if (contentId) {
              movieToContentId.set(key, contentId);
              result.matchedMovies++;
            } else {
              result.unmatchedMovies.push(`${movie.name} (${movie.year || "?"})`);
            }

            if (!contentCache.has(key)) {
              await delay(100);
            }
          }

          logger.info(
            `[ImportResolver] Matched ${result.matchedMovies}/${result.totalMovies} movies. ` +
              `Unmatched: ${result.unmatchedMovies.length}`,
          );

          // 4. Import watched films
          const ratingsMap = new Map<string, number>();
          for (const rating of importData.ratings) {
            const key = `${rating.name.toLowerCase().trim()}|${rating.year || ""}`;
            ratingsMap.set(key, rating.rating);
          }

          const reviewsMap = new Map<string, { review: string; date: string }[]>();
          for (const review of importData.reviews) {
            const key = `${review.name.toLowerCase().trim()}|${review.year || ""}`;
            const existing = reviewsMap.get(key) || [];
            existing.push({ review: review.review, date: review.date });
            reviewsMap.set(key, existing);
          }

          const diaryDatesMap = new Map<string, string[]>();
          for (const entry of importData.diary) {
            const key = `${entry.name.toLowerCase().trim()}|${entry.year || ""}`;
            const dateStr = entry.watchedDate || entry.date;
            if (dateStr) {
              const existing = diaryDatesMap.get(key) || [];
              existing.push(dateStr);
              diaryDatesMap.set(key, existing);
            }
          }

          const likedSet = new Set<string>();
          for (const item of importData.liked) {
            const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
            likedSet.add(key);
          }
          if (likedSet.size > 0) {
            logger.info(
              `[ImportResolver] Found ${likedSet.size} liked/favorite movies`,
            );
          }

          const processedContentIds = new Set<string>();

          function isSameDay(d1: Date, d2: Date): boolean {
            return (
              d1.getFullYear() === d2.getFullYear() &&
              d1.getMonth() === d2.getMonth() &&
              d1.getDate() === d2.getDate()
            );
          }

          async function getNewDatesForContent(
            contentId: string,
            dates: string[],
          ): Promise<string[]> {
            const existingLogs = await prisma.userContentLog.findMany({
              where: { userId: user.id, contentId },
              select: { date: true },
            });
            const existingDates = existingLogs.map((l: any) => new Date(l.date));

            return dates.filter((dateStr) => {
              const newDate = new Date(dateStr);
              return !existingDates.some((ed: Date) => isSameDay(ed, newDate));
            });
          }

          for (const item of importData.watched) {
            const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
            const contentId = movieToContentId.get(key);
            if (!contentId) continue;

            processedContentIds.add(contentId);

            try {
              const diaryDates = diaryDatesMap.get(key) || [];
              const allDates =
                diaryDates.length > 0 ? diaryDates : [item.date].filter(Boolean);

              const contentData = await prisma.content.findUnique({
                where: { id: contentId },
                select: { releaseDate: true },
              });

              const isFutureRelease = contentData?.releaseDate
                ? new Date(contentData.releaseDate) > new Date()
                : false;

              const newDates = await getNewDatesForContent(contentId, allDates);

              const rating = ratingsMap.get(key);
              const reviews = reviewsMap.get(key) || [];
              const isLiked = likedSet.has(key);

              if (isLiked) {
                const unfavoritedLogs = await prisma.userContentLog.findMany({
                  where: { userId: user.id, contentId, isFavorite: false },
                  select: { id: true },
                });
                for (const log of unfavoritedLogs) {
                  await prisma.userContentLog.update({
                    where: { id: log.id },
                    data: { isFavorite: true },
                  });
                }
              }

              const firstExisting = await prisma.userContentLog.findFirst({
                where: { userId: user.id, contentId },
                orderBy: { date: "asc" },
              });
              if (firstExisting && rating && !firstExisting.rating) {
                await prisma.userContentLog.update({
                  where: { id: firstExisting.id },
                  data: { rating },
                });

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
                  const idx = Math.round(rating) - 1;
                  if (idx >= 0 && idx < 10) dist[idx] += 1;
                  await prisma.content.update({
                    where: { id: contentId },
                    data: {
                      ratingDistribution: dist,
                      totalRatingScore:
                        (content.totalRatingScore
                          ? Number(content.totalRatingScore)
                          : 0) + rating,
                      totalRatingVotes: (content.totalRatingVotes ?? 0) + 1,
                    },
                  });
                }
                result.ratingsImported++;
              }

              for (const reviewEntry of reviews) {
                if (!reviewEntry.review || reviewEntry.review.trim().length === 0)
                  continue;
                const reviewDate = reviewEntry.date
                  ? new Date(reviewEntry.date)
                  : new Date();
                const existingReview = await prisma.discussion.findFirst({
                  where: {
                    contentId,
                    authorId: user.id,
                    type: "comment",
                    description: reviewEntry.review.trim(),
                  },
                });
                if (!existingReview) {
                  await prisma.discussion.create({
                    data: {
                      contentId,
                      authorId: user.id,
                      type: "comment",
                      description: reviewEntry.review.trim(),
                      createdAt: reviewDate,
                    },
                  });
                  await prisma.content.update({
                    where: { id: contentId },
                    data: { discussionCount: { increment: 1 } },
                  });
                  result.reviewsImported++;
                }
              }

              if (newDates.length === 0) {
                if (!firstExisting && rating) {
                  result.ratingsImported++;
                }
                continue;
              }

              for (const dateStr of newDates) {
                await prisma.userContentLog.create({
                  data: {
                    userId: user.id,
                    contentId,
                    isConsumed: !isFutureRelease,
                    isConsumeLater: isFutureRelease,
                    isFavorite: isLiked || undefined,
                    rating: rating || undefined,
                    date: new Date(dateStr),
                  },
                });

                if (!isFutureRelease) {
                  await prisma.content.update({
                    where: { id: contentId },
                    data: { consumeCount: { increment: 1 } },
                  });
                }
                result.watchedImported++;
              }

              if (rating && firstExisting && !firstExisting.rating) {
                // Handled
              } else if (rating && !firstExisting) {
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
                  const idx = Math.round(rating) - 1;
                  if (idx >= 0 && idx < 10) dist[idx] += 1;
                  await prisma.content.update({
                    where: { id: contentId },
                    data: {
                      ratingDistribution: dist,
                      totalRatingScore:
                        (content.totalRatingScore
                          ? Number(content.totalRatingScore)
                          : 0) + rating,
                      totalRatingVotes: (content.totalRatingVotes ?? 0) + 1,
                    },
                  });
                }
                result.ratingsImported++;
              }
            } catch (error: any) {
              const errorMsg = `Error importing "${item.name}": ${error.message || error}`;
              result.errors.push(errorMsg);
              logger.error(`[ImportMutationResolver] ${errorMsg}`);
            }
          }

          // 5. Process ratings-only
          for (const rating of importData.ratings) {
            const key = `${rating.name.toLowerCase().trim()}|${rating.year || ""}`;
            const contentId = movieToContentId.get(key);
            if (!contentId || processedContentIds.has(contentId)) continue;
            processedContentIds.add(contentId);

            try {
              const contentData = await prisma.content.findUnique({
                where: { id: contentId },
                select: { releaseDate: true },
              });
              const isFutureRelease = contentData?.releaseDate
                ? new Date(contentData.releaseDate) > new Date()
                : false;

              const existingLog = await prisma.userContentLog.findFirst({
                where: { userId: user.id, contentId },
              });
              const isLiked = likedSet.has(key);

              if (!existingLog) {
                await prisma.userContentLog.create({
                  data: {
                    userId: user.id,
                    contentId,
                    isConsumed: !isFutureRelease,
                    isConsumeLater: isFutureRelease,
                    isFavorite: isLiked || undefined,
                    rating: rating.rating,
                    date: rating.date ? new Date(rating.date) : new Date(),
                  },
                });
                if (!isFutureRelease) {
                  await prisma.content.update({
                    where: { id: contentId },
                    data: { consumeCount: { increment: 1 } },
                  });
                }

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
                  const idx = Math.round(rating.rating) - 1;
                  if (idx >= 0 && idx < 10) dist[idx] += 1;
                  await prisma.content.update({
                    where: { id: contentId },
                    data: {
                      ratingDistribution: dist,
                      totalRatingScore:
                        (content.totalRatingScore
                          ? Number(content.totalRatingScore)
                          : 0) + rating.rating,
                      totalRatingVotes: (content.totalRatingVotes ?? 0) + 1,
                    },
                  });
                }

                result.watchedImported++;
                result.ratingsImported++;
              } else if (!existingLog.rating) {
                await prisma.userContentLog.update({
                  where: { id: existingLog.id },
                  data: { rating: rating.rating },
                });

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
                  const idx = Math.round(rating.rating) - 1;
                  if (idx >= 0 && idx < 10) dist[idx] += 1;
                  await prisma.content.update({
                    where: { id: contentId },
                    data: {
                      ratingDistribution: dist,
                      totalRatingScore:
                        (content.totalRatingScore
                          ? Number(content.totalRatingScore)
                          : 0) + rating.rating,
                      totalRatingVotes: (content.totalRatingVotes ?? 0) + 1,
                    },
                  });
                }
                result.ratingsImported++;
              }
            } catch (error: any) {
              const errorMsg = `Error importing rating for "${rating.name}": ${error.message || error}`;
              result.errors.push(errorMsg);
              logger.error(`[ImportMutationResolver] ${errorMsg}`);
            }
          }

          // 6. Process watchlist items
          for (const item of importData.watchlist) {
            const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
            const contentId = movieToContentId.get(key);
            if (!contentId) continue;
            if (processedContentIds.has(contentId)) continue;

            try {
              const existingLog = await prisma.userContentLog.findFirst({
                where: { userId: user.id, contentId },
              });

              if (!existingLog) {
                await prisma.userContentLog.create({
                  data: {
                    userId: user.id,
                    contentId,
                    isConsumeLater: true,
                    date: item.date ? new Date(item.date) : new Date(),
                  },
                });
                result.watchlistImported++;
              } else if (!existingLog.isConsumeLater && !existingLog.isConsumed) {
                await prisma.userContentLog.update({
                  where: { id: existingLog.id },
                  data: { isConsumeLater: true },
                });
                result.watchlistImported++;
              }
            } catch (error: any) {
              const errorMsg = `Error importing watchlist "${item.name}": ${error.message || error}`;
              result.errors.push(errorMsg);
              logger.error(`[ImportMutationResolver] ${errorMsg}`);
            }
          }

          // 7. Process liked-only items
          for (const item of importData.liked) {
            const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
            const contentId = movieToContentId.get(key);
            if (!contentId) continue;

            try {
              const contentData = await prisma.content.findUnique({
                where: { id: contentId },
                select: { releaseDate: true },
              });
              const isFutureRelease = contentData?.releaseDate
                ? new Date(contentData.releaseDate) > new Date()
                : false;

              const existingLog = await prisma.userContentLog.findFirst({
                where: { userId: user.id, contentId },
              });

              if (existingLog && !existingLog.isFavorite) {
                await prisma.userContentLog.update({
                  where: { id: existingLog.id },
                  data: { isFavorite: true },
                });
              } else if (!existingLog) {
                await prisma.userContentLog.create({
                  data: {
                    userId: user.id,
                    contentId,
                    isFavorite: true,
                    isConsumed: !isFutureRelease,
                    isConsumeLater: isFutureRelease,
                    date: item.date ? new Date(item.date) : new Date(),
                  },
                });

                if (!isFutureRelease) {
                  await prisma.content.update({
                    where: { id: contentId },
                    data: { consumeCount: { increment: 1 } },
                  });
                }
                result.watchedImported++;
              }
            } catch (error: any) {
              const errorMsg = `Error importing liked "${item.name}": ${error.message || error}`;
              result.errors.push(errorMsg);
              logger.error(`[ImportMutationResolver] ${errorMsg}`);
            }
          }

          // 8. Process Letterboxd lists
          if (importData.lists.length > 0) {
            logger.info(
              `[ImportResolver] Processing ${importData.lists.length} Letterboxd lists...`,
            );

            for (const list of importData.lists) {
              try {
                const existingList = await prisma.userList.findFirst({
                  where: {
                    ownerId: user.id,
                    name: list.name,
                    isDeleted: false,
                  },
                });

                if (existingList) {
                  logger.info(
                    `[ImportResolver] List "${list.name}" already exists, skipping`,
                  );
                  continue;
                }

                const listItems: { contentId: string; position: number }[] = [];
                for (const item of list.items) {
                  const key = `${item.name.toLowerCase().trim()}|${item.year || ""}`;
                  const contentId = movieToContentId.get(key);
                  if (contentId) {
                    listItems.push({ contentId, position: item.position });
                  }
                }

                if (listItems.length === 0) {
                  logger.warn(
                    `[ImportResolver] List "${list.name}" has no matched items, skipping`,
                  );
                  continue;
                }

                const userList = await prisma.userList.create({
                  data: {
                    name: list.name,
                    description: list.description || null,
                    contentTypeId: 1, // movie
                    ownerId: user.id,
                    isPublic: true,
                  },
                });

                for (const item of listItems) {
                  await prisma.userListItem
                    .create({
                      data: {
                        listId: userList.id,
                        contentId: item.contentId,
                        addedById: user.id,
                      },
                    })
                    .catch(() => {});
                }

                result.listsImported++;
                logger.success(
                  `[ImportResolver] Created list "${list.name}" with ${listItems.length} items`,
                );
              } catch (error: any) {
                const errorMsg = `Error importing list "${list.name}": ${error.message || error}`;
                result.errors.push(errorMsg);
                logger.error(`[ImportMutationResolver] ${errorMsg}`);
              }
            }
          }

          await prisma.importJob.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              processedItems: result.matchedMovies,
            }
          });
          logger.success(`[ImportResolver] Letterboxd import completed for job ${job.id}`);
          
        } catch (error: any) {
          logger.error(`[ImportResolver] Import job failed:`, error);
          await prisma.importJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              errors: { push: `Import failed: ${error.message || error}` }
            }
          });
        }
      });

      return result;
    } catch (error: any) {
      logger.error(`[ImportResolver] Import failed:`, error);
      result.errors.push(`Import failed: ${error.message || error}`);
      result.message = "Import sırasında bir hata oluştu.";
      return result;
    }
  }

  // ─── CSV IMPORT (Games & Series) ───

  @Authorized()
  @Mutation(() => CsvImportResult)
  async importCsvData(
    @Arg("csvContent", () => String) csvContent: string,
    @Arg("contentType", () => String, {
      description: "'game' veya 'series'",
    })
    contentType: string,
    @Arg("testLimit", () => Int, { nullable: true }) testLimit: number | null,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<CsvImportResult> {
    if (!user) throw new Error("Not authenticated");

    logger.info(
      `[ImportResolver] Starting CSV import for user ${user.username} (${user.id}), type=${contentType}`,
    );

    const csvResult: CsvImportResult = {
      success: false,
      totalItems: 0,
      matchedItems: 0,
      logsCreated: 0,
      ratingsImported: 0,
      unmatchedItems: [],
      errors: [],
    };

    try {
      const isGame = contentType === "game";
      const contentTypeId = isGame ? 3 : 2;

      const parsedItems: Array<{
        name: string;
        date: string | null;
        point: number | null;
        status: string;
      }> = [];

      if (isGame) {
        const games = parseGamesCsv(csvContent);
        for (const g of games) {
          if (!g.name || g.name === "Puanlar") continue;
          parsedItems.push({
            name: g.name,
            date: g.date,
            point: g.point,
            status: g.status,
          });
        }
      } else {
        const series = parseSeriesCsv(csvContent);
        for (const s of series) {
          if (!s.name || s.name === "Puanlar") continue;
          parsedItems.push({
            name: s.name,
            date: s.date,
            point: s.point,
            status: s.status,
          });
        }
      }

      csvResult.totalItems = parsedItems.length;

      if (testLimit && testLimit > 0 && parsedItems.length > testLimit) {
        parsedItems.splice(testLimit);
        logger.info(
          `[ImportResolver] TEST MODE: Limited to ${parsedItems.length} of ${csvResult.totalItems} items`,
        );
      }

      logger.info(
        `[ImportResolver] Parsed ${parsedItems.length} ${contentType} items from CSV`,
      );

      const job = await prisma.importJob.create({
        data: {
          userId: user.id,
          type: isGame ? "notion_games" : "notion_series",
          fileName: "Notion CSV Import",
          totalItems: parsedItems.length,
          status: "PENDING",
        },
      });

      csvResult.jobId = job.id;
      csvResult.success = true;
      csvResult.message = "İçe aktarma işlemi arka planda başlatıldı! Kısa süre içinde içerikleriniz eklenecektir.";

      importQueue.addJob(async () => {
        try {
          await prisma.importJob.update({
            where: { id: job.id },
            data: { status: "PROCESSING" },
          });

          const contentCache = new Map<string, string>();
          let processedCount = 0;

          for (const item of parsedItems) {
            const currentJobState = await prisma.importJob.findUnique({
              where: { id: job.id },
              select: { status: true }
            });
            
            if (currentJobState?.status === "FAILED" || currentJobState?.status === "CANCELLED") {
              logger.info(`[ImportResolver] Job ${job.id} cancelled or failed. Stopping loop.`);
              return;
            }

            processedCount++;
            logger.info(`[ImportResolver] CSV Progress: ${processedCount}/${parsedItems.length} - Processing: ${item.name}`);
            await prisma.importJob.update({
              where: { id: job.id },
              data: { 
                processedItems: processedCount,
                currentItem: item.name 
              },
            });

            const cacheKey = item.name.toLowerCase().trim();

            try {
              let contentId = contentCache.get(cacheKey);

              if (!contentId) {
                const existing = await prisma.content.findFirst({
                  where: {
                    contentTypeId,
                    isDeleted: false,
                    OR: [
                      { title: { equals: item.name, mode: "insensitive" } },
                      { originalTitle: { equals: item.name, mode: "insensitive" } },
                    ],
                  },
                  select: { id: true },
                });

                if (existing) {
                  contentId = existing.id;
                  contentCache.set(cacheKey, contentId);

                  if (isGame) {
                    const hasGameCompanies = await prisma.contentCompany.count({
                      where: {
                        contentId,
                        companyRoleId: { in: [4, 5] },
                      },
                    });
                    const hasScreenshots = await prisma.contentScreenshot.count({
                      where: { contentId },
                    });
                    if (hasGameCompanies === 0 || hasScreenshots === 0) {
                      try {
                        const igdbResults = await searchIgdbGames(item.name);
                        if (igdbResults && igdbResults.length > 0) {
                          const details = await fetchIgdbGameDetails(
                            igdbResults[0].sourceId,
                          );

                          if (hasGameCompanies === 0) {
                            const companies: Array<{
                              name: string;
                              companyRoleId: number;
                            }> = [];
                            if (details.developers) {
                              for (const dev of details.developers) {
                                companies.push({
                                  name: dev.name,
                                  companyRoleId: 5,
                                });
                              }
                            }
                            if (details.publishers) {
                              for (const pub of details.publishers) {
                                companies.push({
                                  name: pub.name,
                                  companyRoleId: 4,
                                });
                              }
                            }
                            if (companies.length > 0) {
                              await linkCompanies(prisma, contentId, companies);
                            }
                          }

                          if (
                            hasScreenshots === 0 &&
                            details.screenshots &&
                            details.screenshots.length > 0
                          ) {
                            await saveScreenshots(
                              prisma,
                              contentId,
                              details.screenshots.map((url: string, i: number) => ({
                                imageUrl: url,
                                order: i,
                                isEnabledForQuiz: false,
                                isSpoiler: false,
                              })),
                              false,
                            );
                          }

                          const hasExpansions = await prisma.expansion.count({
                            where: { contentId },
                          });
                          if (
                            hasExpansions === 0 &&
                            details.expansions &&
                            details.expansions.length > 0
                          ) {
                            await saveExpansions(
                              prisma,
                              contentId,
                              details.expansions,
                              false,
                            );
                          }

                          logger.info(
                            `[ImportResolver] Enriched existing game "${item.name}" with missing data`,
                          );
                          await delay(150);
                        }
                      } catch (enrichErr: any) {
                        logger.warn(
                          `[ImportResolver] Failed to enrich "${item.name}": ${enrichErr.message}`,
                        );
                      }
                    }
                  }
                }
              }

              if (!contentId) {
                if (isGame) {
                  contentId = await findOrCreateGameContent(
                    prisma,
                    item.name,
                    contentCache,
                  );
                } else {
                  contentId = await findOrCreateSeriesContent(
                    prisma,
                    item.name,
                    contentCache,
                  );
                }
              }

              if (!contentId) {
                csvResult.unmatchedItems.push(item.name);
                continue;
              }

              csvResult.matchedItems++;
              contentCache.set(cacheKey, contentId);

              const statusFlags = mapCsvStatus(item.status);

              const existingLog = await prisma.userContentLog.findFirst({
                where: { userId: user.id, contentId },
              });

              if (!existingLog) {
                const contentData = await prisma.content.findUnique({
                  where: { id: contentId },
                  select: { releaseDate: true },
                });
                const isFutureRelease = contentData?.releaseDate
                  ? new Date(contentData.releaseDate) > new Date()
                  : false;

                const isConsumed = statusFlags.isConsumed && !isFutureRelease;
                const isConsumeLater =
                  statusFlags.isConsumeLater || isFutureRelease;

                await prisma.userContentLog.create({
                  data: {
                    userId: user.id,
                    contentId,
                    isConsumed,
                    isConsumeLater: isConsumeLater || undefined,
                    isContinuing: statusFlags.isContinuing || undefined,
                    isAbandoned: statusFlags.isAbandoned || undefined,
                    rating: item.point || undefined,
                    date: item.date ? new Date(item.date) : new Date(),
                  },
                });

                if (isConsumed) {
                  await prisma.content.update({
                    where: { id: contentId },
                    data: { consumeCount: { increment: 1 } },
                  });
                }

                csvResult.logsCreated++;

                if (item.point) {
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
                    const idx = Math.round(item.point) - 1;
                    if (idx >= 0 && idx < 10) dist[idx] += 1;
                    await prisma.content.update({
                      where: { id: contentId },
                      data: {
                        ratingDistribution: dist,
                        totalRatingScore:
                          (content.totalRatingScore
                            ? Number(content.totalRatingScore)
                            : 0) + item.point,
                        totalRatingVotes: (content.totalRatingVotes ?? 0) + 1,
                      },
                    });
                  }
                  csvResult.ratingsImported++;
                }
              } else {
                if (item.point && !existingLog.rating) {
                  await prisma.userContentLog.update({
                    where: { id: existingLog.id },
                    data: { rating: item.point },
                  });

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
                    const idx = Math.round(item.point) - 1;
                    if (idx >= 0 && idx < 10) dist[idx] += 1;
                    await prisma.content.update({
                      where: { id: contentId },
                      data: {
                        ratingDistribution: dist,
                        totalRatingScore:
                          (content.totalRatingScore
                            ? Number(content.totalRatingScore)
                            : 0) + item.point,
                        totalRatingVotes: (content.totalRatingVotes ?? 0) + 1,
                      },
                    });
                  }

                  csvResult.ratingsImported++;
                }
              }

              await delay(150);
            } catch (error: any) {
              const errorMsg = `Error importing "${item.name}": ${error.message || error}`;
              csvResult.errors.push(errorMsg);
              logger.error(`[ImportMutationResolver] ${errorMsg}`);
            }
          }

          await prisma.importJob.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              processedItems: csvResult.matchedItems,
            }
          });
          logger.success(`[ImportResolver] CSV import completed for job ${job.id}`);
          
        } catch (error: any) {
          logger.error(`[ImportResolver] CSV Import job failed:`, error);
          await prisma.importJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              errors: { push: `Import failed: ${error.message || error}` }
            }
          });
        }
      });

      return csvResult;
    } catch (error: any) {
      logger.error(`[ImportResolver] CSV import failed:`, error);
      csvResult.errors.push(`Import failed: ${error.message || error}`);
      csvResult.message = "Import sırasında bir hata oluştu.";
      return csvResult;
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => PopularImportResult)
  async importWeeklyPopularMovies(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<PopularImportResult> {
    if (!user) throw new Error("Not authenticated");

    logger.info(
      `[ImportResolver] Starting weekly popular movie import for user ${user.username} (${user.id})`,
    );

    const job = await prisma.importJob.create({
      data: {
        userId: user.id,
        type: "weekly_popular_import",
        fileName: "Haftalık Popüler Filmler (IMDb & Letterboxd)",
        totalItems: 0,
        status: "PENDING",
      },
    });

    importQueue.addJob(async () => {
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      try {
        await prisma.importJob.update({
          where: { id: job.id },
          data: { status: "PROCESSING", currentItem: "Filmler kazınıyor..." },
        });

        logger.info("[ImportResolver] Fetching weekly popular movies from Letterboxd and IMDb...");
        let letterboxdMovies: PopularContentListItem[] = [];
        let imdbMovies: PopularContentListItem[] = [];

        try {
          letterboxdMovies = await fetchLetterboxdWeeklyPopular(50);
        } catch (err) {
          logger.error("[ImportResolver] Failed to fetch Letterboxd popular:", err);
        }

        try {
          imdbMovies = await fetchImdbWeeklyPopular(50);
        } catch (err) {
          logger.error("[ImportResolver] Failed to fetch IMDb popular:", err);
        }

        let allMovies = [...letterboxdMovies, ...imdbMovies];

        if (allMovies.length === 0) {
          logger.info("[ImportResolver] Both primary sources failed or returned empty. Fetching from TMDB Weekly Trending...");
          try {
            allMovies = await fetchTmdbWeeklyPopular(50);
          } catch (err) {
            logger.error("[ImportResolver] Failed to fetch TMDB weekly popular:", err);
          }
        }

        const uniqueMovies = dedupePopularListItems(allMovies);

        logger.info(`[ImportResolver] Found ${uniqueMovies.length} unique popular movies to process.`);
        
        await prisma.importJob.update({
          where: { id: job.id },
          data: { totalItems: uniqueMovies.length },
        });

        const contentCache = new Map<string, string>();
        const processedCollectionIds = new Set<number>();
        let processedCount = 0;

        for (const movie of uniqueMovies) {
          const currentJobState = await prisma.importJob.findUnique({
            where: { id: job.id },
            select: { status: true }
          });
          
          if (currentJobState?.status === "FAILED" || currentJobState?.status === "CANCELLED") {
            logger.info(`[ImportResolver] Weekly popular import job ${job.id} stopped/cancelled.`);
            return;
          }

          let isExisting = false;
          try {
            const existing = await prisma.content.findFirst({
              where: {
                contentTypeId: 1,
                isDeleted: false,
                OR: [
                  { title: { equals: movie.title, mode: "insensitive" } },
                  { originalTitle: { equals: movie.title, mode: "insensitive" } },
                ],
              },
              select: { id: true }
            });
            if (existing) {
              isExisting = true;
            }
          } catch (e) {
            // ignore
          }

          processedCount++;
          const progressPayload = {
            title: movie.title,
            year: (movie.year || null) as number | null,
            imported,
            skipped: isExisting ? skipped + 1 : skipped,
            failed
          };

          await prisma.importJob.update({
            where: { id: job.id },
            data: {
              processedItems: processedCount,
              currentItem: JSON.stringify(progressPayload)
            }
          });

          if (isExisting) {
            skipped++;
            await delay(100);
            continue;
          }

          try {
            const result = await findOrCreateContentFromTmdb(
              prisma,
              movie.title,
              movie.year || null,
              contentCache,
              processedCollectionIds
            );
            if (result) {
              imported++;
            } else {
              failed++;
            }
          } catch (err: any) {
            failed++;
            const errorMsg = `Error importing popular movie "${movie.title}": ${err.message || err}`;
            logger.error(`[ImportResolver] ${errorMsg}`);
            await prisma.importJob.update({
              where: { id: job.id },
              data: {
                errors: { push: errorMsg }
              }
            });
          }

          await delay(500);
        }

        const finalProgress = {
          title: "Tamamlandı",
          year: null as number | null,
          imported,
          skipped,
          failed
        };

        await prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            currentItem: JSON.stringify(finalProgress)
          }
        });
        logger.success(`[ImportResolver] Weekly popular import completed for job ${job.id}`);
      } catch (error: any) {
        logger.error(`[ImportResolver] Weekly popular import job failed:`, error);
        const finalProgress = {
          title: "Hata Oluştu",
          year: null as number | null,
          imported,
          skipped,
          failed
        };
        await prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            currentItem: JSON.stringify(finalProgress),
            errors: { push: `Import failed: ${error.message || error}` }
          }
        });
      }
    });

    return {
      success: true,
      jobId: job.id,
      message: "Popüler filmleri içe aktarma işlemi arka planda başlatıldı! Kısa süre içinde içerikleriniz eklenecektir.",
    };
  }
}
