import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Int,
  Float,
  ObjectType,
  Field,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { buildUserCommentsWhere } from "../../lib/discussionVisibility";
import {
  dedupeLatestLogsByContent,
  dedupeLatestLogsByUserAndContent,
  classifyPersonRole,
} from "../../services/UserContentService";
import { convertContentForGraphQL } from "../content/ContentUtils";
import { logger } from "../../lib/logger";

// ==========================================
// Deep Stats ObjectTypes
// ==========================================

@ObjectType()
export class PersonStat {
  @Field(() => String)
  personId: string;

  @Field(() => String)
  personName: string;

  @Field(() => String, { nullable: true })
  profileUrl?: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float, { nullable: true })
  avgRating?: number;

  @Field(() => Int)
  favoriteCount: number;
}

@ObjectType()
export class CompanyStat {
  @Field(() => String)
  companyId: string;

  @Field(() => String)
  companyName: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float, { nullable: true })
  avgRating?: number;

  @Field(() => Int)
  totalPlaytimeMinutes: number;
}

@ObjectType()
export class TagStat {
  @Field(() => String)
  name: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float, { nullable: true })
  avgRating?: number;
}

@ObjectType()
export class FranchiseStat {
  @Field(() => String)
  franchiseName: string;

  @Field(() => Int)
  count: number;

  @Field(() => Float, { nullable: true })
  avgRating?: number;

  @Field(() => Int)
  totalRuntime: number;
}

@ObjectType()
export class ContentRatingComp {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  contentTypeSlug?: string;

  @Field(() => Float)
  userRating: number;

  @Field(() => Float)
  globalAvgRating: number;

  @Field(() => Int)
  globalRatingCount: number;

  @Field(() => Float)
  delta: number;
}

@ObjectType()
export class RuntimeSummary {
  @Field(() => Int)
  totalRuntimeMinutes: number;

  @Field(() => Int)
  totalPlaytimeMinutes: number;

  @Field(() => Int)
  totalPagesRead: number;

  @Field(() => Float)
  estimatedReadHours: number;
}

@ObjectType()
export class TypeCountStat {
  @Field(() => String)
  name: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class UserCompatibilityStat {
  @Field(() => String)
  userId: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  picturePath?: string;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  sharedRatingsCount: number;

  @Field(() => Float)
  avgRatingDiff: number;
}

@ObjectType()
export class ProfileDeepStats {
  @Field(() => RuntimeSummary)
  runtimeSummary: RuntimeSummary;

  @Field(() => [PersonStat])
  topDirectors: PersonStat[];

  @Field(() => [PersonStat])
  bestRatedDirectors: PersonStat[];

  @Field(() => [PersonStat])
  worstRatedDirectors: PersonStat[];

  @Field(() => [PersonStat])
  topActors: PersonStat[];

  @Field(() => [PersonStat])
  topWriters: PersonStat[];

  @Field(() => [PersonStat])
  topAuthors: PersonStat[];

  @Field(() => [PersonStat])
  topCrew: PersonStat[];

  @Field(() => [CompanyStat])
  topPublishers: CompanyStat[];

  @Field(() => [CompanyStat])
  topDevelopers: CompanyStat[];

  @Field(() => [TagStat])
  topThemes: TagStat[];

  @Field(() => [TagStat])
  topMoods: TagStat[];

  @Field(() => [TagStat])
  topGameModes: TagStat[];

  @Field(() => [TagStat])
  topPlatforms: TagStat[];

  @Field(() => [TagStat])
  topPerspectives: TagStat[];

  @Field(() => [FranchiseStat])
  topFranchises: FranchiseStat[];

  @Field(() => [TagStat])
  ageRatingDistribution: TagStat[];

  @Field(() => [ContentRatingComp])
  mostOverrated: ContentRatingComp[];

  @Field(() => [ContentRatingComp])
  mostUnderrated: ContentRatingComp[];

  @Field(() => Int)
  abandonedCount: number;

  @Field(() => [TypeCountStat])
  abandonedByType: TypeCountStat[];

  @Field(() => Int)
  reviewCount: number;

  @Field(() => Float) // In the original file it was Field(() => Int) but average can be Float. Let's keep Int as original.
  avgReviewLength: number;

  @Field(() => [UserCompatibilityStat])
  friendCompatibility: UserCompatibilityStat[];

  @Field(() => [UserCompatibilityStat])
  globalCompatibility: UserCompatibilityStat[];
}

// ==========================================
// Helper functions
// ==========================================

function buildPersonStats(
  map: Map<
    string,
    {
      name: string;
      profileUrl?: string;
      count: number;
      ratings: number[];
      favoriteCount: number;
    }
  >,
): PersonStat[] {
  return Array.from(map.entries()).map(([personId, v]) => ({
    personId,
    personName: v.name,
    profileUrl: v.profileUrl,
    count: v.count,
    avgRating:
      v.ratings.length > 0
        ? v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length
        : undefined,
    favoriteCount: v.favoriteCount,
  }));
}

function buildCompanyStats(
  map: Map<
    string,
    {
      name: string;
      logoUrl?: string;
      count: number;
      ratings: number[];
      totalPlaytimeMinutes: number;
    }
  >,
): CompanyStat[] {
  return Array.from(map.entries()).map(([companyId, v]) => ({
    companyId,
    companyName: v.name,
    logoUrl: v.logoUrl,
    count: v.count,
    avgRating:
      v.ratings.length > 0
        ? v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length
        : undefined,
    totalPlaytimeMinutes: v.totalPlaytimeMinutes,
  }));
}

function buildTagStats(
  map: Map<string, { count: number; ratings: number[] }>,
): TagStat[] {
  return Array.from(map.entries()).map(([name, v]) => ({
    name,
    count: v.count,
    avgRating:
      v.ratings.length > 0
        ? v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length
        : undefined,
  }));
}

function emptyDeepStats(): ProfileDeepStats {
  return {
    runtimeSummary: {
      totalRuntimeMinutes: 0,
      totalPlaytimeMinutes: 0,
      totalPagesRead: 0,
      estimatedReadHours: 0,
    },
    topDirectors: [],
    bestRatedDirectors: [],
    worstRatedDirectors: [],
    topActors: [],
    topWriters: [],
    topAuthors: [],
    topCrew: [],
    topPublishers: [],
    topDevelopers: [],
    topThemes: [],
    topMoods: [],
    topGameModes: [],
    topPlatforms: [],
    topPerspectives: [],
    topFranchises: [],
    ageRatingDistribution: [],
    mostOverrated: [],
    mostUnderrated: [],
    abandonedCount: 0,
    abandonedByType: [],
    reviewCount: 0,
    avgReviewLength: 0,
    friendCompatibility: [],
    globalCompatibility: [],
  };
}

@Resolver()
export class UserContentStatsResolver {
  /**
   * Returns rich aggregated statistics for a user profile.
   * Optionally filtered by contentTypeId (1=MOVIE, 2=TV, 3=GAME, 4=BOOK).
   */
  @Query(() => ProfileDeepStats)
  async getUserDeepStats(
    @Arg("username", () => String) username: string,
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("startDate", () => Date, { nullable: true })
    startDate: Date | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ProfileDeepStats> {
    logger.debug(
      `[getUserDeepStats] username=${username}, contentTypeId=${contentTypeId}, startDate=${startDate?.toISOString?.() ?? "all"}`,
    );

    try {
      const appUser = await prisma.appUser.findFirst({ where: { username } });
      if (!appUser) {
        logger.warn(`[getUserDeepStats] User not found: ${username}`);
        return emptyDeepStats();
      }

      const whereContent: any = { isDeleted: false };
      if (contentTypeId) whereContent.contentTypeId = contentTypeId;

      const logs = await prisma.userContentLog.findMany({
        where: {
          userId: appUser.id,
          isConsumed: true,
          ...(startDate ? { date: { gte: startDate } } : {}),
          content: whereContent,
        },
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        include: {
          content: {
            include: {
              contentType: true,
              genres: { include: { genre: true } },
              contentThemes: { include: { theme: true } },
              contentMoods: { include: { mood: true } },
              contentGameModes: { include: { gameMode: true } },
              contentPerspectives: { include: { perspective: true } },
              contentPlatforms: { include: { platform: true } },
              ageRating: true,
              franchise: true,
              images: true,
              userContentPreferences: true,
              companies: {
                include: {
                  company: true,
                  companyRole: true,
                },
              },
              people: {
                include: {
                  person: true,
                  personRole: true,
                },
              },
            },
          },
        },
      });

      const abandonedLogs = await prisma.userContentLog.findMany({
        where: {
          userId: appUser.id,
          isAbandoned: true,
          ...(startDate ? { date: { gte: startDate } } : {}),
          content: whereContent,
        },
        orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
        include: {
          content: { include: { contentType: true } },
        },
      });

      const latestLogs = dedupeLatestLogsByContent(logs);
      const latestAbandonedLogs = dedupeLatestLogsByContent(
        abandonedLogs,
      ).filter((log) => log.isAbandoned);

      const baseRatedLogs = latestLogs.filter(
        (log) => log.rating !== null && log.rating !== undefined,
      );
      const baseRatingsByContent = new Map<string, number>(
        baseRatedLogs.map((log) => [log.contentId, Number(log.rating)]),
      );
      const overlappingContentIds = Array.from(baseRatingsByContent.keys());

      logger.debug(
        `[getUserDeepStats] Loaded ${logs.length} consumed logs, ${abandonedLogs.length} abandoned logs (${latestLogs.length} / ${latestAbandonedLogs.length} unique)`,
      );

      let totalRuntimeMinutes = 0;
      let totalPlaytimeMinutes = 0;
      let totalPagesRead = 0;
      let abandonedCount = 0;

      const abandonedByType = new Map<string, number>();

      const directorMap = new Map<
        string,
        {
          name: string;
          profileUrl?: string;
          count: number;
          ratings: number[];
          favoriteCount: number;
        }
      >();
      const actorMap = new Map<
        string,
        {
          name: string;
          profileUrl?: string;
          count: number;
          ratings: number[];
          favoriteCount: number;
        }
      >();
      const writerMap = new Map<
        string,
        {
          name: string;
          profileUrl?: string;
          count: number;
          ratings: number[];
          favoriteCount: number;
        }
      >();
      const authorMap = new Map<
        string,
        {
          name: string;
          profileUrl?: string;
          count: number;
          ratings: number[];
          favoriteCount: number;
        }
      >();
      const crewMap = new Map<
        string,
        {
          name: string;
          profileUrl?: string;
          count: number;
          ratings: number[];
          favoriteCount: number;
        }
      >();

      const publisherMap = new Map<
        string,
        {
          name: string;
          logoUrl?: string;
          count: number;
          ratings: number[];
          totalPlaytimeMinutes: number;
        }
      >();
      const developerMap = new Map<
        string,
        {
          name: string;
          logoUrl?: string;
          count: number;
          ratings: number[];
          totalPlaytimeMinutes: number;
        }
      >();

      const themeMap = new Map<string, { count: number; ratings: number[] }>();
      const moodMap = new Map<string, { count: number; ratings: number[] }>();
      const gameModeMap = new Map<
        string,
        { count: number; ratings: number[] }
      >();
      const platformMap = new Map<
        string,
        { count: number; ratings: number[] }
      >();
      const perspectiveMap = new Map<
        string,
        { count: number; ratings: number[] }
      >();
      const ageRatingMap = new Map<
        string,
        { count: number; ratings: number[] }
      >();
      const franchiseMap = new Map<
        string,
        { count: number; ratings: number[]; totalRuntime: number }
      >();

      const ratingCompMap = new Map<
        string,
        {
          title: string;
          posterUrl?: string;
          contentTypeSlug?: string;
          userRating: number;
          globalAvgRating: number;
          globalRatingCount: number;
        }
      >();

      for (const log of latestLogs) {
        const c = log.content;
        if (!c) continue;

        const typeName = c.contentType?.name ?? "UNKNOWN";
        const userRating =
          log.rating !== null && log.rating !== undefined
            ? Number(log.rating)
            : null;
        const isFav = log.isFavorite ?? false;
        const playtime = log.playtimeMinutes ?? 0;

        if (typeName === "GAME") {
          totalPlaytimeMinutes += playtime;
        } else if (typeName === "BOOK") {
          totalPagesRead += c.pageCount ?? 0;
        } else {
          totalRuntimeMinutes += c.runtime ?? c.averageDuration ?? 0;
        }

        for (const cp of c.people ?? []) {
          const person = cp.person;
          if (!person) continue;
          const roleLabel =
            cp.personRole?.label?.toLowerCase() ?? cp.role?.toLowerCase() ?? "";
          const roleBucket = classifyPersonRole(roleLabel, typeName);

          const updatePersonMap = (map: typeof directorMap) => {
            const existing = map.get(person.id) ?? {
              name: person.name,
              profileUrl: person.profileUrl ?? undefined,
              count: 0,
              ratings: [],
              favoriteCount: 0,
            };
            existing.count += 1;
            if (userRating !== null) existing.ratings.push(userRating);
            if (isFav) existing.favoriteCount += 1;
            map.set(person.id, existing);
          };

          if (roleBucket === "director") updatePersonMap(directorMap);
          else if (roleBucket === "actor") updatePersonMap(actorMap);
          else if (roleBucket === "writer") updatePersonMap(writerMap);
          else if (roleBucket === "author") updatePersonMap(authorMap);
          else if (roleBucket === "crew") updatePersonMap(crewMap);
        }

        for (const cc of c.companies ?? []) {
          const company = cc.company;
          if (!company) continue;
          const roleName = cc.companyRole?.name?.toLowerCase() ?? "";

          const isPublisher =
            roleName.includes("publisher") || roleName.includes("yayıncı");
          const isDeveloper =
            roleName.includes("developer") || roleName.includes("geliştirici");

          const updateCompanyMap = (map: typeof publisherMap) => {
            const existing = map.get(company.id) ?? {
              name: company.name,
              logoUrl: company.logoUrl ?? undefined,
              count: 0,
              ratings: [],
              totalPlaytimeMinutes: 0,
            };
            existing.count += 1;
            if (userRating !== null) existing.ratings.push(userRating);
            existing.totalPlaytimeMinutes += playtime;
            map.set(company.id, existing);
          };

          if (isPublisher) updateCompanyMap(publisherMap);
          if (isDeveloper) updateCompanyMap(developerMap);
        }

        for (const ct of c.contentThemes ?? []) {
          const name = ct.theme?.name;
          if (!name) continue;
          const e = themeMap.get(name) ?? { count: 0, ratings: [] };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          themeMap.set(name, e);
        }

        for (const cm of c.contentMoods ?? []) {
          const name = cm.mood?.name;
          if (!name) continue;
          const e = moodMap.get(name) ?? { count: 0, ratings: [] };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          moodMap.set(name, e);
        }

        for (const cgm of c.contentGameModes ?? []) {
          const name = cgm.gameMode?.name;
          if (!name) continue;
          const e = gameModeMap.get(name) ?? { count: 0, ratings: [] };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          gameModeMap.set(name, e);
        }

        for (const cp of c.contentPlatforms ?? []) {
          const name = cp.platform?.name;
          if (!name) continue;
          const e = platformMap.get(name) ?? { count: 0, ratings: [] };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          platformMap.set(name, e);
        }

        for (const cp of c.contentPerspectives ?? []) {
          const name = cp.perspective?.name;
          if (!name) continue;
          const e = perspectiveMap.get(name) ?? { count: 0, ratings: [] };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          perspectiveMap.set(name, e);
        }

        if (c.ageRating?.name) {
          const name = c.ageRating.name;
          const e = ageRatingMap.get(name) ?? { count: 0, ratings: [] };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          ageRatingMap.set(name, e);
        }

        if (c.franchise?.name) {
          const name = c.franchise.name;
          const e = franchiseMap.get(name) ?? {
            count: 0,
            ratings: [],
            totalRuntime: 0,
          };
          e.count += 1;
          if (userRating !== null) e.ratings.push(userRating);
          e.totalRuntime += c.runtime ?? 0;
          franchiseMap.set(name, e);
        }

        if (
          userRating !== null &&
          c.totalRatingVotes > 0 &&
          c.totalRatingScore
        ) {
          const globalAvg = Number(c.totalRatingScore) / c.totalRatingVotes;
          const pref = c.userContentPreferences?.find((p: any) => p.userId === log.userId);
          const converted = convertContentForGraphQL(c, pref?.posterImageId, pref?.backdropImageId);
          const _typeIdToSlug: Record<number, string> = {
            1: "movie",
            2: "tv",
            3: "game",
            4: "book",
            5: "music",
          };
          const _ctSlug = _typeIdToSlug[c.contentTypeId as number] ?? "movie";
          ratingCompMap.set(c.id, {
            title: c.title,
            posterUrl: converted.posterUrl ?? undefined,
            contentTypeSlug: _ctSlug,
            userRating,
            globalAvgRating: Math.round(globalAvg * 100) / 100,
            globalRatingCount: c.totalRatingVotes,
          });
        }
      }

      const sortByCount = (arr: PersonStat[]) =>
        [...arr].sort((a, b) => b.count - a.count);
      const sortByRatingDesc = (arr: PersonStat[], minCount = 2) =>
        [...arr]
          .filter((x) => x.count >= minCount && x.avgRating != null)
          .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
      const sortByRatingAsc = (arr: PersonStat[], minCount = 2) =>
        [...arr]
          .filter((x) => x.count >= minCount && x.avgRating != null)
          .sort((a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0));
      const sortTagByCount = (arr: TagStat[]) =>
        [...arr].sort((a, b) => b.count - a.count).slice(0, 15);
      const sortCompByCount = (arr: CompanyStat[]) =>
        [...arr].sort((a, b) => b.count - a.count).slice(0, 10);

      const allDirectors = buildPersonStats(directorMap);
      const allActors = buildPersonStats(actorMap);
      const allWriters = buildPersonStats(writerMap);
      const allAuthors = buildPersonStats(authorMap);
      const allCrew = buildPersonStats(crewMap);
      const allPublishers = buildCompanyStats(publisherMap);
      const allDevelopers = buildCompanyStats(developerMap);

      const ratingCompEntries = Array.from(ratingCompMap.entries()).map(
        ([contentId, v]) => ({
          contentId,
          ...v,
          delta: Math.round((v.userRating - v.globalAvgRating) * 100) / 100,
        }),
      );

      const mostOverrated = ratingCompEntries
        .filter((x) => x.delta <= -1.5)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 10);

      const mostUnderrated = ratingCompEntries
        .filter((x) => x.delta >= 1.5)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 10);

      let friendCompatibility: UserCompatibilityStat[] = [];
      let globalCompatibility: UserCompatibilityStat[] = [];

      if (overlappingContentIds.length > 0) {
        const followingRelations = await prisma.userFollow.findMany({
          where: { userId: appUser.id },
          select: { followingUserId: true },
        });
        const followingIds = followingRelations.map((relation: any) => relation.followingUserId);

        const mutualFollowRelations =
          followingIds.length > 0
            ? await prisma.userFollow.findMany({
                where: {
                  followingUserId: appUser.id,
                  userId: { in: followingIds },
                },
                select: { userId: true },
              })
            : [];
        const friendUserIdSet = new Set(
          mutualFollowRelations.map((relation: any) => relation.userId),
        );

        const candidateLogsRaw = await prisma.userContentLog.findMany({
          where: {
            userId: { not: appUser.id },
            isConsumed: true,
            rating: { not: null },
            contentId: { in: overlappingContentIds },
            ...(startDate ? { date: { gte: startDate } } : {}),
            content: whereContent,
          },
          orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
          select: {
            userId: true,
            contentId: true,
            rating: true,
          },
        });

        const candidateLogs = dedupeLatestLogsByUserAndContent(candidateLogsRaw);
        const candidateRatingsByUser = new Map<string, Map<string, number>>();

        for (const log of candidateLogs) {
          if (log.rating === null || log.rating === undefined) continue;
          const userRatings =
            candidateRatingsByUser.get(log.userId) ?? new Map<string, number>();
          userRatings.set(log.contentId, Number(log.rating));
          candidateRatingsByUser.set(log.userId, userRatings);
        }

        const candidateUsers = await prisma.appUser.findMany({
          where: { id: { in: Array.from(candidateRatingsByUser.keys()) } },
          select: {
            id: true,
            username: true,
            picturePath: true,
          },
        });
        const candidateUserMap = new Map(
          candidateUsers.map((candidate: any) => [candidate.id, candidate]),
        );

        const compatibilityEntries: Array<
          UserCompatibilityStat & { isFriend: boolean }
        > = [];

        for (const [candidateUserId, ratingsMap] of candidateRatingsByUser.entries()) {
          const candidateUser = candidateUserMap.get(candidateUserId);
          if (!candidateUser) continue;

          const diffs: number[] = [];
          for (const [contentId, baseRating] of baseRatingsByContent.entries()) {
            const candidateRating = ratingsMap.get(contentId);
            if (candidateRating === undefined) continue;
            diffs.push(Math.abs(baseRating - candidateRating));
          }

          if (diffs.length < 3) continue;

          const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
          const avgCloseness =
            diffs.reduce((sum, diff) => sum + (1 - diff / 10), 0) / diffs.length;

          compatibilityEntries.push({
            userId: candidateUser.id,
            username: candidateUser.username,
            picturePath: candidateUser.picturePath ?? undefined,
            score: Math.round(avgCloseness * 100),
            sharedRatingsCount: diffs.length,
            avgRatingDiff: Math.round(avgDiff * 100) / 100,
            isFriend: friendUserIdSet.has(candidateUser.id),
          });
        }

        compatibilityEntries.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.sharedRatingsCount - a.sharedRatingsCount;
        });

        friendCompatibility = compatibilityEntries
          .filter((entry) => entry.isFriend)
          .slice(0, 10)
          .map(({ isFriend: _isFriend, ...entry }) => entry);

        globalCompatibility = compatibilityEntries
          .slice(0, 10)
          .map(({ isFriend: _isFriend, ...entry }) => entry);
      }

      for (const aLog of latestAbandonedLogs) {
        const aTypeName = aLog.content?.contentType?.name ?? "UNKNOWN";
        abandonedCount += 1;
        abandonedByType.set(
          aTypeName,
          (abandonedByType.get(aTypeName) ?? 0) + 1,
        );
      }

      const result: ProfileDeepStats = {
        runtimeSummary: {
          totalRuntimeMinutes,
          totalPlaytimeMinutes,
          totalPagesRead,
          estimatedReadHours: Math.round((totalPagesRead / 250) * 10) / 10,
        },
        topDirectors: sortByCount(allDirectors),
        bestRatedDirectors: sortByRatingDesc(allDirectors),
        worstRatedDirectors: sortByRatingAsc(allDirectors),
        topActors: sortByCount(allActors),
        topWriters: sortByCount(allWriters),
        topAuthors: sortByCount(allAuthors),
        topCrew: sortByCount(allCrew),
        topPublishers: sortCompByCount(allPublishers),
        topDevelopers: sortCompByCount(allDevelopers),
        topThemes: sortTagByCount(buildTagStats(themeMap)),
        topMoods: sortTagByCount(buildTagStats(moodMap)),
        topGameModes: sortTagByCount(buildTagStats(gameModeMap)),
        topPlatforms: sortTagByCount(buildTagStats(platformMap)),
        topPerspectives: sortTagByCount(buildTagStats(perspectiveMap)),
        topFranchises: Array.from(franchiseMap.entries())
          .map(([franchiseName, v]) => ({
            franchiseName,
            count: v.count,
            avgRating:
              v.ratings.length > 0
                ? Math.round(
                    (v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length) *
                      100,
                  ) / 100
                : undefined,
            totalRuntime: v.totalRuntime,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        ageRatingDistribution: sortTagByCount(buildTagStats(ageRatingMap)),
        mostOverrated,
        mostUnderrated,
        abandonedCount,
        abandonedByType: Array.from(abandonedByType.entries()).map(
          ([name, count]) => ({ name, count }),
        ),
        reviewCount: 0,
        avgReviewLength: 0,
        friendCompatibility,
        globalCompatibility,
      };

      const discussionWhere: any = { authorId: appUser.id, isDeleted: false };
      if (contentTypeId) {
        discussionWhere.content = { contentTypeId };
      }
      if (startDate) {
        discussionWhere.createdAt = { gte: startDate };
      }
      const discussions = await prisma.discussion.findMany({
        where: discussionWhere,
        select: { description: true },
      });
      result.reviewCount = discussions.length;
      result.avgReviewLength =
        discussions.length > 0
          ? Math.round(
              discussions.reduce((s: number, d: any) => s + d.description.length, 0) /
                discussions.length,
            )
          : 0;

      logger.success(
        `[getUserDeepStats] Computed deep stats for ${username}: ${logs.length} logs`,
      );
      return result;
    } catch (error) {
      logger.error(`[getUserDeepStats] Error:`, error);
      throw new Error("Failed to compute deep stats");
    }
  }
}
