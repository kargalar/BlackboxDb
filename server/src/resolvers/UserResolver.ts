import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
  FieldResolver,
  Root,
} from "type-graphql";
import { AppUser } from "../types/User";
import { GraphQLContext } from "../context";
import { createNotification } from "../lib/notifications";
import { NOTIFICATION_TYPE_ID } from "../lib/notificationTypes";
import { ContributorLeaderboardEntry } from "../types/User";

@Resolver(AppUser)
export class UserResolver {
  @Query(() => AppUser, { nullable: true })
  async me(@Ctx() { user, prisma }: GraphQLContext): Promise<AppUser | null> {
    if (!user) return null;

    const dbUser = await prisma.appUser.findUnique({
      where: { id: user.id },
    });

    return dbUser;
  }

  @FieldResolver(() => Boolean)
  isSpotifyConnected(@Root() user: any): boolean {
    return !!user.spotifyAccessToken;
  }

  @Query(() => AppUser, { nullable: true })
  async user(
    @Arg("username", () => String) username: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AppUser | null> {
    const user = await prisma.appUser.findUnique({
      where: { username },
    });

    return user;
  }

  @Query(() => [AppUser])
  async users(@Ctx() { prisma }: GraphQLContext): Promise<AppUser[]> {
    const users = await prisma.appUser.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return users;
  }

  @Authorized()
  @Query(() => [AppUser])
  async searchUsers(
    @Arg("query", () => String) query: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AppUser[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const take = Math.min(Math.max(limit ?? 10, 1), 20);

    // Username öncelikli arama (contains, insensitive)
    const users = await prisma.appUser.findMany({
      where: {
        username: {
          contains: q,
          mode: "insensitive",
        },
      },
      take,
      orderBy: { username: "asc" },
      select: {
        id: true,
        username: true,
        picturePath: true,
        email: true,
        bio: true,
        personalityAnalyze: true,
        isAdmin: true,
        isModerator: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  @Authorized()
  @Mutation(() => AppUser)
  async updateProfile(
    @Arg("username", () => String, { nullable: true }) username: string | undefined,
    @Arg("bio", () => String, { nullable: true }) bio: string | undefined,
    @Arg("picturePath", () => String, { nullable: true })
    picturePath: string | undefined,
    @Arg("location", () => String, { nullable: true })
    location: string | undefined,
    @Arg("website", () => String, { nullable: true })
    website: string | undefined,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<AppUser> {
    if (!user) throw new Error("Not authenticated");

    if (username !== undefined && username !== user.username) {
      const existingUser = await prisma.appUser.findUnique({ where: { username } });
      if (existingUser) {
        throw new Error("Bu kullanıcı adı zaten kullanımda");
      }
    }

    const updatedUser = await prisma.appUser.update({
      where: { id: user.id },
      data: {
        username: username !== undefined ? username : undefined,
        bio: bio !== undefined ? bio : undefined,
        picturePath: picturePath !== undefined ? picturePath : undefined,
        location: location !== undefined ? location : undefined,
        website: website !== undefined ? website : undefined,
      },
    });

    return updatedUser;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async followUser(
    @Arg("username", () => String) username: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const targetUser = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!targetUser) throw new Error("User not found");
    if (targetUser.id === user.id) throw new Error("Cannot follow yourself");

    // Check if already following
    const existing = await prisma.userFollow.findFirst({
      where: {
        userId: user.id,
        followingUserId: targetUser.id,
      },
    });

    if (existing) {
      return true;
    }

    await prisma.userFollow.create({
      data: {
        userId: user.id,
        followingUserId: targetUser.id,
      },
    });

    await createNotification(prisma, {
      recipientUserId: targetUser.id,
      actorUserId: user.id,
      typeId: NOTIFICATION_TYPE_ID.FOLLOWED_YOU,
    });

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async unfollowUser(
    @Arg("username", () => String) username: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const targetUser = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!targetUser) throw new Error("User not found");
    if (targetUser.id === user.id) throw new Error("Cannot unfollow yourself");

    await prisma.userFollow.deleteMany({
      where: {
        userId: user.id,
        followingUserId: targetUser.id,
      },
    });

    return true;
  }

  @Query(() => [AppUser])
  async followers(
    @Arg("username", () => String) username: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AppUser[]> {
    const user = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const follows = await prisma.userFollow.findMany({
      where: { followingUserId: user.id },
      include: { user: true },
    });

    return follows.map((f) => f.user);
  }

  @Query(() => [AppUser])
  async following(
    @Arg("username", () => String) username: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AppUser[]> {
    const user = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const follows = await prisma.userFollow.findMany({
      where: { userId: user.id },
      include: { followingUser: true },
    });

    return follows.map((f) => f.followingUser);
  }

  @Authorized()
  @Query(() => Boolean)
  async isFollowing(
    @Arg("username", () => String) username: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) return false;

    const targetUser = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return false;
    }

    const existing = await prisma.userFollow.findFirst({
      where: {
        userId: user.id,
        followingUserId: targetUser.id,
      },
    });

    return !!existing;
  }

  @Authorized()
  @Mutation(() => AppUser)
  async updatePreferences(
    @Ctx() { user, prisma }: GraphQLContext,
    @Arg("preferredContentTypes", () => [Int], { nullable: true })
    preferredContentTypes?: number[],
    @Arg("gridColumns", () => Int, { nullable: true }) gridColumns?: number,
    @Arg("gridRows", () => Int, { nullable: true }) gridRows?: number,
    @Arg("posterZoomEnabled", () => Boolean, { nullable: true })
    posterZoomEnabled?: boolean,
    @Arg("posterIconsBelow", () => Boolean, { nullable: true })
    posterIconsBelow?: boolean,
    @Arg("posterRatingEnabled", () => Boolean, { nullable: true })
    posterRatingEnabled?: boolean,
    @Arg("showSensitiveContent", () => Boolean, { nullable: true })
    showSensitiveContent?: boolean,
    @Arg("preferredGamePlatformId", () => Int, { nullable: true })
    preferredGamePlatformId?: number | null,
    @Arg("preferredGamePlatformIds", () => [Int], { nullable: true })
    preferredGamePlatformIds?: number[],
    @Arg("splitHomePopularSections", () => Boolean, { nullable: true })
    splitHomePopularSections?: boolean,
    @Arg("notifyOnFollows", () => Boolean, { nullable: true })
    notifyOnFollows?: boolean,
    @Arg("notifyOnContentRequestUpdates", () => Boolean, { nullable: true })
    notifyOnContentRequestUpdates?: boolean,
    @Arg("notifyOnCommentVotes", () => Boolean, { nullable: true })
    notifyOnCommentVotes?: boolean,
    @Arg("notifyOnCommentReplies", () => Boolean, { nullable: true })
    notifyOnCommentReplies?: boolean,
    @Arg("notifyOnMentions", () => Boolean, { nullable: true })
    notifyOnMentions?: boolean,
    @Arg("notifyOnRecommendations", () => Boolean, { nullable: true })
    notifyOnRecommendations?: boolean,
    @Arg("notifyOnNewSeasons", () => Boolean, { nullable: true })
    notifyOnNewSeasons?: boolean,
    @Arg("notifyOnContentReleased", () => Boolean, { nullable: true })
    notifyOnContentReleased?: boolean,
    @Arg("notifyOnRoleUpdates", () => Boolean, { nullable: true })
    notifyOnRoleUpdates?: boolean,
  ): Promise<AppUser> {
    if (!user) throw new Error("Not authenticated");

    const data: any = {};
    if (preferredContentTypes !== undefined)
      data.preferredContentTypes = preferredContentTypes;
    if (gridColumns !== undefined) {
      // Validate grid columns (3-10)
      if (gridColumns < 3 || gridColumns > 10)
        throw new Error("Grid sütun sayısı 3-10 arasında olmalı");
      data.gridColumns = gridColumns;
    }
    if (gridRows !== undefined) {
      if (gridRows < 2 || gridRows > 20)
        throw new Error("Grid satır sayısı 2-20 arasında olmalı");
      data.gridRows = gridRows;
    }
    if (posterZoomEnabled !== undefined)
      data.posterZoomEnabled = posterZoomEnabled;
    if (posterIconsBelow !== undefined)
      data.posterIconsBelow = posterIconsBelow;
    if (posterRatingEnabled !== undefined)
      data.posterRatingEnabled = posterRatingEnabled;
    if (showSensitiveContent !== undefined)
      data.showSensitiveContent = showSensitiveContent;
    if (preferredGamePlatformId !== undefined)
      data.preferredGamePlatformId = preferredGamePlatformId;
    if (preferredGamePlatformIds !== undefined)
      data.preferredGamePlatformIds = preferredGamePlatformIds;
    if (splitHomePopularSections !== undefined)
      data.splitHomePopularSections = splitHomePopularSections;
    if (notifyOnFollows !== undefined)
      data.notifyOnFollows = notifyOnFollows;
    if (notifyOnContentRequestUpdates !== undefined)
      data.notifyOnContentRequestUpdates = notifyOnContentRequestUpdates;
    if (notifyOnCommentVotes !== undefined)
      data.notifyOnCommentVotes = notifyOnCommentVotes;
    if (notifyOnCommentReplies !== undefined)
      data.notifyOnCommentReplies = notifyOnCommentReplies;
    if (notifyOnMentions !== undefined)
      data.notifyOnMentions = notifyOnMentions;
    if (notifyOnRecommendations !== undefined)
      data.notifyOnRecommendations = notifyOnRecommendations;
    if (notifyOnNewSeasons !== undefined)
      data.notifyOnNewSeasons = notifyOnNewSeasons;
    if (notifyOnContentReleased !== undefined)
      data.notifyOnContentReleased = notifyOnContentReleased;
    if (notifyOnRoleUpdates !== undefined)
      data.notifyOnRoleUpdates = notifyOnRoleUpdates;

    const updatedUser = await prisma.appUser.update({
      where: { id: user.id },
      data,
    });

    console.log(`✅ [User] Preferences updated for ${user.username}:`, data);
    return updatedUser;
  }

  @Query(() => [ContributorLeaderboardEntry])
  async getTopContributors(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContributorLeaderboardEntry[]> {
    const take = Math.min(Math.max(limit ?? 100, 1), 500);

    const users = await prisma.appUser.findMany({
      where: {
        contributionScore: { gt: 0 }
      },
      orderBy: [
        { contributionScore: "desc" },
        { createdAt: "asc" }
      ],
      take,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      user,
      contributionScore: user.contributionScore || 0,
    }));
  }

  @Authorized()
  @Query(() => ContributorLeaderboardEntry, { nullable: true })
  async getMyContributionRank(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ContributorLeaderboardEntry | null> {
    if (!user) return null;

    const dbUser = await prisma.appUser.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) return null;

    const score = dbUser.contributionScore || 0;

    if (score === 0) {
      return {
        rank: 0,
        user: dbUser,
        contributionScore: 0,
      };
    }

    const higherScores = await prisma.appUser.count({
      where: {
        contributionScore: { gt: score }
      }
    });

    // Also count users with same score but older account
    const sameScoreOlder = await prisma.appUser.count({
      where: {
        contributionScore: score,
        createdAt: { lt: dbUser.createdAt }
      }
    });

    return {
      rank: higherScores + sameScoreOlder + 1,
      user: dbUser,
      contributionScore: score,
    };
  }
}
