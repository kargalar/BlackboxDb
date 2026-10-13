import { Resolver, Query, Mutation, Arg, Ctx, Int, Float } from 'type-graphql';
import {
  TvEpisode,
  UserEpisodeLog,
  ContinuingTvTrackerPayload,
  ContinuingTvTrackerItem,
  ContinuingSeriesItem,
} from '../types/Episode';
import { TvSeason } from '../types/TvSeason';
import { GraphQLContext } from '../context';
import { syncTvShowWatchState } from '../services/UserContentService';

@Resolver(TvEpisode)
export class EpisodeResolver {
  @Query(() => ContinuingTvTrackerPayload)
  async continuingTvTracker(
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<ContinuingTvTrackerPayload> {
    if (!user) {
      throw new Error('Unauthorized: User must be logged in');
    }

    const turkeyTimeZone = 'Europe/Istanbul';
    const now = new Date();
    const turkeyDateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: turkeyTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const turkeyWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: turkeyTimeZone,
      weekday: 'short',
    });
    const weekdayIndexMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    const toDateKey = (value: Date) => turkeyDateFormatter.format(value);
    const addDaysToDateKey = (dateKey: string, dayCount: number) => {
      const [year, month, day] = dateKey.split('-').map(Number);
      const next = new Date(Date.UTC(year, month - 1, day + dayCount));
      return toDateKey(next);
    };

    const todayKey = toDateKey(now);
    const currentWeekDay = weekdayIndexMap[turkeyWeekdayFormatter.format(now)] ?? 0;
    const endOfCurrentWeekKey = addDaysToDateKey(todayKey, 6 - currentWeekDay);
    const startOfNextWeekKey = addDaysToDateKey(endOfCurrentWeekKey, 1);
    const endOfNextWeekKey = addDaysToDateKey(startOfNextWeekKey, 6);

    // A consumed series becomes continuing only when an episode's season is no
    // longer upcoming and it still has an unwatched episode.
    const staleConsumedShowsRaw = await prisma.$queryRaw`
      SELECT ucl.content_id as "contentId"
      FROM "user_content_log" ucl
      JOIN "content" c ON c.id = ucl.content_id
      WHERE ucl.user_id = ${user.id}::uuid 
        AND ucl.is_consumed = true 
        AND c.content_type_id = 2
        AND EXISTS (
          SELECT 1 FROM "tv_episode" te
          LEFT JOIN "tv_season" ts ON ts.id = te.season_id
          WHERE te.tv_show_id = ucl.content_id
            AND te.season_number > 0
            AND COALESCE(te.air_date, ts.air_date) <= ${now}
            AND NOT EXISTS (
              SELECT 1 FROM "user_episode_log" uel
              WHERE uel.user_id = ${user.id}::uuid
                AND uel.episode_id = te.id
                AND uel.watched = true
                AND uel.watched_at >= COALESCE(te.air_date, ts.air_date)
            )
        )
    `;
    const staleConsumedShows = staleConsumedShowsRaw as { contentId: string }[];

    if (staleConsumedShows.length > 0) {
      const staleIds = staleConsumedShows.map(s => s.contentId);
      await prisma.userContentLog.updateMany({
        where: { userId: user.id, contentId: { in: staleIds } },
        data: { isConsumed: false, isContinuing: true }
      });
      for (const contentId of staleIds) {
        await prisma.content.update({
          where: { id: contentId },
          data: { consumeCount: { decrement: 1 } }
        });
      }
      await prisma.content.updateMany({
        where: { id: { in: staleIds }, consumeCount: { lt: 0 } },
        data: { consumeCount: 0 }
      });
    }

    // Fetch consumed TV show IDs for this user so we can exclude them
    const consumedTvShows = await prisma.userContentLog.findMany({
      where: {
        userId: user.id,
        isConsumed: true,
        content: {
          contentTypeId: 2,
          isDeleted: false,
        },
      },
      select: { contentId: true },
      distinct: ['contentId'],
    });
    const consumedTvShowIds = new Set(consumedTvShows.map((entry) => entry.contentId));

    const continuingSeries = await prisma.userContentLog.findMany({
      where: {
        userId: user.id,
        isContinuing: true,
        content: {
          contentTypeId: 2,
          isDeleted: false,
        },
      },
      select: {
        contentId: true,
        content: {
          select: {
            id: true,
            title: true,
            images: {
              where: {
                type: 'poster',
              },
              orderBy: {
                id: 'asc',
              },
              take: 1,
              select: {
                filePath: true,
              },
            },
          },
        },
      },
      distinct: ['contentId'],
    });

    const continuingSeriesMap = new Map(
      continuingSeries
        .filter((entry) => entry.content && !consumedTvShowIds.has(entry.contentId))
        .map((entry) => [
          entry.contentId,
          {
            id: entry.content!.id,
            title: entry.content!.title,
            posterUrl: entry.content!.images[0]?.filePath ?? null,
          },
        ])
    );

    const tvShowIds = Array.from(continuingSeriesMap.keys());
    if (tvShowIds.length === 0) {
      return {
        pastDue: [],
        thisWeek: [],
        nextWeek: [],
        allContinuingSeries: [],
        summary: {
          continuingSeriesCount: 0,
          pastDueCount: 0,
          thisWeekCount: 0,
          nextWeekCount: 0,
        },
      };
    }

    const episodes = await prisma.tvEpisode.findMany({
      where: {
        tvShowId: { in: tvShowIds },
        airDate: { not: null },
        seasonNumber: { gt: 0 }, // Exclude Specials (season 0)
      },
      select: {
        id: true,
        tvShowId: true,
        seasonNumber: true,
        episodeNumber: true,
        name: true,
        airDate: true,
        stillUrl: true,
      },
      orderBy: [{ tvShowId: 'asc' }, { seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
    });

    const watchedLogs = await prisma.userEpisodeLog.findMany({
      where: {
        userId: user.id,
        watched: true,
        episode: {
          tvShowId: { in: tvShowIds },
        },
      },
      select: {
        episodeId: true,
      },
    });

    const watchedEpisodeIds = new Set(watchedLogs.map((log) => log.episodeId));
    const groupedEpisodes = new Map<string, typeof episodes>();

    episodes.forEach((episode) => {
      if (!episode.airDate) return;
      const list = groupedEpisodes.get(episode.tvShowId) ?? [];
      list.push(episode);
      groupedEpisodes.set(episode.tvShowId, list);
    });

    const pastDue: ContinuingTvTrackerItem[] = [];
    const thisWeek: ContinuingTvTrackerItem[] = [];
    const nextWeek: ContinuingTvTrackerItem[] = [];

    const buildItem = (
      tvShowId: string,
      episode: (typeof episodes)[number],
      backlogCount: number
    ): ContinuingTvTrackerItem => {
      const series = continuingSeriesMap.get(tvShowId)!;
      return {
        tvShowId,
        tvShowTitle: series.title,
        tvShowPosterUrl: series.posterUrl ?? undefined,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        episodeTitle: episode.name,
        episodeAirDate: episode.airDate!,
        episodeStillUrl: episode.stillUrl ?? undefined,
        backlogCount,
        contentRouteType: 'tv',
      };
    };

    groupedEpisodes.forEach((seriesEpisodes, tvShowId) => {
      const unwatched = seriesEpisodes.filter((episode) => !watchedEpisodeIds.has(episode.id));
      const missed = unwatched.filter((episode) => toDateKey(episode.airDate!) < todayKey);
      const currentWeek = unwatched.filter((episode) => {
        const episodeDateKey = toDateKey(episode.airDate!);
        return episodeDateKey >= todayKey && episodeDateKey <= endOfCurrentWeekKey;
      });
      const upcomingWeek = unwatched.filter((episode) => {
        const episodeDateKey = toDateKey(episode.airDate!);
        return episodeDateKey >= startOfNextWeekKey && episodeDateKey <= endOfNextWeekKey;
      });

      if (missed.length > 0) {
        pastDue.push(buildItem(tvShowId, missed[0], missed.length));
      }

      currentWeek.forEach((episode) => {
        thisWeek.push(buildItem(tvShowId, episode, 0));
      });

      upcomingWeek.forEach((episode) => {
        nextWeek.push(buildItem(tvShowId, episode, 0));
      });
    });

    const sortByAirDateAsc = (left: ContinuingTvTrackerItem, right: ContinuingTvTrackerItem) => {
      const leftTime = left.episodeAirDate.getTime();
      const rightTime = right.episodeAirDate.getTime();
      if (leftTime !== rightTime) return leftTime - rightTime;
      if (left.tvShowTitle !== right.tvShowTitle) return left.tvShowTitle.localeCompare(right.tvShowTitle);
      if (left.seasonNumber !== right.seasonNumber) return left.seasonNumber - right.seasonNumber;
      return left.episodeNumber - right.episodeNumber;
    };

    pastDue.sort(sortByAirDateAsc);
    thisWeek.sort(sortByAirDateAsc);
    nextWeek.sort(sortByAirDateAsc);

    const allContinuingSeries: ContinuingSeriesItem[] = [];
    for (const [tvShowId, series] of continuingSeriesMap.entries()) {
      const seriesEpisodes = groupedEpisodes.get(tvShowId) || [];
      const unwatched = seriesEpisodes.filter((episode) => !watchedEpisodeIds.has(episode.id));
      
      const airedUnwatched = unwatched.filter((episode) => toDateKey(episode.airDate!) <= todayKey);
      const unaired = unwatched.filter((episode) => toDateKey(episode.airDate!) > todayKey);

      allContinuingSeries.push({
        tvShowId,
        tvShowTitle: series.title,
        tvShowPosterUrl: series.posterUrl ?? undefined,
        expectedEpisodeCount: unwatched.length,
        airedUnwatchedCount: airedUnwatched.length,
        unairedCount: unaired.length,
        contentRouteType: 'tv',
      });
    }

    allContinuingSeries.sort((a, b) => {
      if (b.expectedEpisodeCount !== a.expectedEpisodeCount) {
        return b.expectedEpisodeCount - a.expectedEpisodeCount;
      }
      return a.tvShowTitle.localeCompare(b.tvShowTitle);
    });

    return {
      pastDue,
      thisWeek,
      nextWeek,
      allContinuingSeries,
      summary: {
        continuingSeriesCount: tvShowIds.length,
        pastDueCount: pastDue.length,
        thisWeekCount: thisWeek.length,
        nextWeekCount: nextWeek.length,
      },
    };
  }

  /**
   * Get all seasons for a TV show
   */
  @Query(() => [TvSeason])
  async getSeasonsByTvShow(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<TvSeason[]> {
    const seasons = await prisma.tvSeason.findMany({
      where: {
        tvShowId,
      },
      include: {
        episodes: {
          orderBy: {
            episodeNumber: 'asc',
          },
        },
      },
      orderBy: {
        seasonNumber: 'asc',
      },
    });

    // Fetch viewer counts for each season using a raw SQL query
    // A viewer is counted if they have watched at least one episode of that season
    const viewerCountsRaw = await prisma.$queryRaw<{ season_number: number; viewer_count: bigint }[]>`
      SELECT te.season_number, COUNT(DISTINCT uel.user_id) as viewer_count
      FROM user_episode_log uel
      JOIN tv_episode te ON uel.episode_id = te.id
      WHERE te.tv_show_id = ${tvShowId} AND uel.watched = true
      GROUP BY te.season_number
    `;

    const viewerCountMap = new Map<number, number>();
    for (const row of viewerCountsRaw) {
      viewerCountMap.set(row.season_number, Number(row.viewer_count));
    }

    // If user is logged in, attach their watch status to episodes
    if (user && seasons.length > 0) {
      const allEpisodeIds = seasons.flatMap(s => s.episodes.map(e => e.id));
      const userLogs = await prisma.userEpisodeLog.findMany({
        where: {
          userId: user.id,
          episodeId: { in: allEpisodeIds },
        },
      });

      const logMap = new Map(userLogs.map((log) => [log.episodeId, log]));

      return seasons.map(season => {
        let totalRating = 0;
        let ratedCount = 0;

        const episodes = season.episodes.map(episode => {
          const log = logMap.get(episode.id);
          if (episode.totalRatingVotes && episode.totalRatingVotes > 0) {
            totalRating += Number(episode.totalRatingScore ?? 0) / episode.totalRatingVotes;
            ratedCount++;
          }
          return {
            ...episode,
            watched: log?.watched ?? false,
            watchedAt: log?.watchedAt ?? null,
            userRating: log?.rating ? Number(log.rating) : null,
          };
        });

        const userRating = ratedCount > 0 ? Number((totalRating / ratedCount).toFixed(1)) : null;

        return {
          ...season,
          episodes,
          userRating, // keep userRating for season as average for now if it's used that way
          viewerCount: viewerCountMap.get(season.seasonNumber) || 0,
        };
      }) as any;
    }

    return seasons.map(season => ({
      ...season,
      episodes: season.episodes.map(episode => ({
        ...episode,
        watched: false,
        watchedAt: null as Date | null,
        userRating: null as number | null,
      })),
      userRating: season.episodes.filter(e => e.totalRatingVotes && e.totalRatingVotes > 0).length > 0
        ? Number((season.episodes.filter(e => e.totalRatingVotes && e.totalRatingVotes > 0)
          .reduce((acc, curr) => acc + (Number(curr.totalRatingScore ?? 0) / curr.totalRatingVotes!), 0)
          / season.episodes.filter(e => e.totalRatingVotes && e.totalRatingVotes > 0).length).toFixed(1))
        : null,
      viewerCount: viewerCountMap.get(season.seasonNumber) || 0,
    })) as any;
  }

  /**
   * Get episodes for a TV show by season
   */
  @Query(() => [TvEpisode])
  async getEpisodesBySeason(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Arg('seasonNumber', () => Int) seasonNumber: number,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<TvEpisode[]> {
    const episodes = await prisma.tvEpisode.findMany({
      where: {
        tvShowId,
        seasonNumber,
      },
      orderBy: {
        episodeNumber: 'asc',
      },
    });

    // If user is logged in, fetch their watch status
    if (user) {
      const episodeIds = episodes.map((ep) => ep.id);
      const userLogs = await prisma.userEpisodeLog.findMany({
        where: {
          userId: user.id,
          episodeId: { in: episodeIds },
        },
      });

      const logMap = new Map(userLogs.map((log) => [log.episodeId, log]));

      return episodes.map((episode) => {
        const log = logMap.get(episode.id);
        return {
          ...episode,
          watched: log?.watched ?? false,
          watchedAt: log?.watchedAt ?? null,
          userRating: log?.rating ? Number(log.rating) : null,
        };
      });
    }

    return episodes.map((episode) => ({
      ...episode,
      watched: false,
      watchedAt: null as Date | null,
      userRating: null as number | null,
    }));
  }

  /**
   * Get all episodes for a TV show
   */
  @Query(() => [TvEpisode])
  async getEpisodesByTvShow(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<TvEpisode[]> {
    const episodes = await prisma.tvEpisode.findMany({
      where: {
        tvShowId,
      },
      orderBy: [
        { seasonNumber: 'asc' },
        { episodeNumber: 'asc' },
      ],
    });

    // If user is logged in, fetch their watch status
    if (user) {
      const episodeIds = episodes.map((ep) => ep.id);
      const userLogs = await prisma.userEpisodeLog.findMany({
        where: {
          userId: user.id,
          episodeId: { in: episodeIds },
        },
      });

      const logMap = new Map(userLogs.map((log) => [log.episodeId, log]));

      return episodes.map((episode) => {
        const log = logMap.get(episode.id);
        return {
          ...episode,
          watched: log?.watched ?? false,
          watchedAt: log?.watchedAt ?? null,
          userRating: log?.rating ? Number(log.rating) : null,
        };
      });
    }

    return episodes.map((episode) => ({
      ...episode,
      watched: false,
      watchedAt: null as Date | null,
      userRating: null as number | null,
    }));
  }

  /**
   * Mark episode as watched/unwatched
   */
  @Mutation(() => Boolean)
  async markEpisodeWatched(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Arg('seasonNumber', () => Int) seasonNumber: number,
    @Arg('episodeNumber', () => Int) episodeNumber: number,
    @Arg('watched', () => Boolean) watched: boolean,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<boolean> {
    if (!user) {
      throw new Error('Unauthorized: User must be logged in');
    }

    try {
      // Find the episode
      const episode = await prisma.tvEpisode.findUnique({
        where: {
          tvShowId_seasonNumber_episodeNumber: {
            tvShowId,
            seasonNumber,
            episodeNumber,
          },
        },
        include: { season: true },
      });

      if (!episode) {
        throw new Error('Episode not found');
      }

      const releaseDate = episode.airDate ?? episode.season?.airDate;
      if (watched && releaseDate && releaseDate > new Date()) {
        throw new Error('Cannot mark an upcoming episode as watched');
      }

      // Upsert user episode log
      await prisma.userEpisodeLog.upsert({
        where: {
          userId_episodeId: {
            userId: user.id,
            episodeId: episode.id,
          },
        },
        create: {
          userId: user.id,
          episodeId: episode.id,
          watched,
          watchedAt: watched ? new Date() : null,
        },
        update: {
          watched,
          watchedAt: watched ? new Date() : null,
        },
      });

      // Handle removing rating if unmarked
      if (watched === false) {
        const existingLog = await prisma.userEpisodeLog.findUnique({
          where: { userId_episodeId: { userId: user.id, episodeId: episode.id } }
        });

        if (existingLog && existingLog.rating) {
          const ratingVal = Number(existingLog.rating);
          let newScore = (episode.totalRatingScore ? Number(episode.totalRatingScore) : 0) - ratingVal;
          let newVotes = (episode.totalRatingVotes ?? 0) - 1;

          await prisma.tvEpisode.update({
            where: { id: episode.id },
            data: {
              totalRatingScore: Math.max(0, newScore),
              totalRatingVotes: Math.max(0, newVotes)
            }
          });

          await prisma.userEpisodeLog.update({
            where: { userId_episodeId: { userId: user.id, episodeId: episode.id } },
            data: { rating: null }
          });
        }
      }

      await syncTvShowWatchState(prisma, user.id, tvShowId);

      return true;
    } catch (error) {
      console.error('Error marking episode as watched:', error);
      throw error;
    }
  }

  /**
   * Mark entire season as watched/unwatched
   */
  @Mutation(() => Boolean)
  async markSeasonWatched(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Arg('seasonNumber', () => Int) seasonNumber: number,
    @Arg('watched', () => Boolean) watched: boolean,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<boolean> {
    if (!user) {
      throw new Error('Unauthorized: User must be logged in');
    }

    try {
      // Find all episodes in the season
      const now = new Date();
      const seasonEpisodes = await prisma.tvEpisode.findMany({
        where: {
          tvShowId,
          seasonNumber,
        },
        include: { season: true },
      });
      const episodes = watched
        ? seasonEpisodes.filter((episode: any) => {
            const releaseDate = episode.airDate ?? episode.season?.airDate;
            return !releaseDate || releaseDate <= now;
          })
        : seasonEpisodes;

      if (episodes.length === 0) {
        if (watched) return true;
        throw new Error('Season not found');
      }

      // Upsert logs for all episodes
      const promises = episodes.map((episode) =>
        prisma.userEpisodeLog.upsert({
          where: {
            userId_episodeId: {
              userId: user.id,
              episodeId: episode.id,
            },
          },
          create: {
            userId: user.id,
            episodeId: episode.id,
            watched,
            watchedAt: watched ? new Date() : null,
            ...(watched === false ? { rating: null } : {})
          },
          update: {
            watched,
            watchedAt: watched ? new Date() : null,
            ...(watched === false ? { rating: null } : {})
          },
        })
      );

      await Promise.all(promises);

      // Handle removing ratings if unmarked
      if (watched === false) {
        const episodeIds = episodes.map(e => e.id);
        const existingLogs = await prisma.userEpisodeLog.findMany({
          where: {
            userId: user.id,
            episodeId: { in: episodeIds },
            rating: { not: null }
          }
        });

        const updatePromises = existingLogs.map(async (log) => {
          const episode = episodes.find(e => e.id === log.episodeId);
          if (!episode || !log.rating) return;

          const ratingVal = Number(log.rating);
          let newScore = (episode.totalRatingScore ? Number(episode.totalRatingScore) : 0) - ratingVal;
          let newVotes = (episode.totalRatingVotes ?? 0) - 1;

          await prisma.tvEpisode.update({
            where: { id: episode.id },
            data: {
              totalRatingScore: Math.max(0, newScore),
              totalRatingVotes: Math.max(0, newVotes)
            }
          });

          await prisma.userEpisodeLog.update({
            where: { userId_episodeId: { userId: user.id, episodeId: episode.id } },
            data: { rating: null }
          });
        });

        await Promise.all(updatePromises);
      }

      await syncTvShowWatchState(prisma, user.id, tvShowId);

      return true;
    } catch (error) {
      console.error('Error marking season as watched:', error);
      throw error;
    }
  }

  /**
   * Rate an episode
   */
  @Mutation(() => Boolean)
  async rateEpisode(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Arg('seasonNumber', () => Int) seasonNumber: number,
    @Arg('episodeNumber', () => Int) episodeNumber: number,
    @Arg('rating', () => Float, { nullable: true }) rating: number | null,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<boolean> {
    if (!user) {
      throw new Error('Unauthorized: User must be logged in');
    }

    try {
      // Find the episode
      const episode = await prisma.tvEpisode.findUnique({
        where: {
          tvShowId_seasonNumber_episodeNumber: {
            tvShowId,
            seasonNumber,
            episodeNumber,
          },
        },
        include: { season: true },
      });

      if (!episode) {
        throw new Error('Episode not found');
      }

      const releaseDate = episode.airDate ?? episode.season?.airDate;
      if (rating !== null && releaseDate && releaseDate > new Date()) {
        throw new Error('Cannot rate an upcoming episode');
      }

      // Fetch existing log to check if already watched
      const existingLog = await prisma.userEpisodeLog.findUnique({
        where: {
          userId_episodeId: {
            userId: user.id,
            episodeId: episode.id,
          },
        },
      });

      // Upsert user episode log
      await prisma.userEpisodeLog.upsert({
        where: {
          userId_episodeId: {
            userId: user.id,
            episodeId: episode.id,
          },
        },
        create: {
          userId: user.id,
          episodeId: episode.id,
          watched: rating !== null, // Only mark watched automatically if setting a concrete rating
          watchedAt: rating !== null ? new Date() : null,
          rating,
        },
        update: {
          rating,
          ...(rating !== null && !existingLog?.watched ? { watched: true, watchedAt: new Date() } : {})
        },
      });

      // Update totals on TvEpisode
      if (rating !== null && rating !== Number(existingLog?.rating)) {
        let newScore = episode.totalRatingScore ? Number(episode.totalRatingScore) : 0;
        let newVotes = episode.totalRatingVotes ?? 0;

        if (existingLog?.rating !== null && existingLog?.rating !== undefined) {
          newScore -= Number(existingLog.rating);
        } else {
          newVotes += 1;
        }

        newScore += rating;

        await prisma.tvEpisode.update({
          where: { id: episode.id },
          data: {
            totalRatingScore: Math.max(0, newScore),
            totalRatingVotes: Math.max(0, newVotes)
          }
        });
      } else if (rating === null && existingLog?.rating !== null && existingLog?.rating !== undefined) {
        let newScore = episode.totalRatingScore ? Number(episode.totalRatingScore) : 0;
        let newVotes = episode.totalRatingVotes ?? 0;

        newScore -= Number(existingLog.rating);
        newVotes -= 1;

        await prisma.tvEpisode.update({
          where: { id: episode.id },
          data: {
            totalRatingScore: Math.max(0, newScore),
            totalRatingVotes: Math.max(0, newVotes)
          }
        });
      }

      if (rating !== null || existingLog?.watched) {
        await syncTvShowWatchState(prisma, user.id, tvShowId);
      }

      return true;
    } catch (error) {
      console.error('Error rating episode:', error);
      throw error;
    }
  }

  /**
   * Get user's watch progress for a TV show
   */
  @Query(() => [UserEpisodeLog])
  async getUserEpisodeLogs(
    @Arg('tvShowId', () => String) tvShowId: string,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<UserEpisodeLog[]> {
    if (!user) {
      return [];
    }

    const logs = await prisma.userEpisodeLog.findMany({
      where: {
        userId: user.id,
        episode: {
          tvShowId,
        },
      },
      include: {
        episode: true,
      },
    });

    return logs.map((log) => ({
      ...log,
      rating: log.rating ? Number(log.rating) : undefined,
    })) as any;
  }
}
