import { Resolver, FieldResolver, Root, Ctx, Int } from "type-graphql";
import { UserContentLog } from "../../types/UserContentLog";
import { Discussion } from "../../types/Discussion";
import { AppUser } from "../../types/User";
import { GraphQLContext } from "../../context";
import { getRequestLoaders, userContentKey } from "../../lib/requestLoaders";
import { logger } from "../../lib/logger";

@Resolver(() => UserContentLog)
export class UserContentLogFieldsResolver {
  @FieldResolver(() => String, { nullable: true })
  async review(
    @Root() log: UserContentLog,
    @Ctx() context: GraphQLContext,
  ): Promise<string | null> {
    if (log.review !== undefined) return log.review;
    const discussion = await this.reviewDiscussion(log, context);
    return discussion?.description || null;
  }

  @FieldResolver(() => Int, { defaultValue: 1 })
  async userConsumeCount(
    @Root() log: UserContentLog,
    @Ctx() context: GraphQLContext,
  ): Promise<number> {
    if (
      (log as UserContentLog & { userConsumeCount?: number })
        .userConsumeCount !== undefined
    )
      return (log as UserContentLog & { userConsumeCount: number })
        .userConsumeCount;
    if (!log.userId || !log.contentId) return 1;
    try {
      return (
        (await getRequestLoaders(context).consumeCounts.load(
          userContentKey(log.userId, log.contentId),
        )) || 1
      );
    } catch (error) {
      logger.error("[userConsumeCount field resolver] Error", error);
      return 1;
    }
  }

  @FieldResolver(() => AppUser, { nullable: true })
  async user(@Root() log: UserContentLog, @Ctx() { prisma }: GraphQLContext) {
    const loadedUser = (
      log as UserContentLog & { user?: AppUser & { isDeleted?: boolean } }
    ).user;
    if (loadedUser !== undefined)
      return loadedUser?.isDeleted ? null : loadedUser;
    if (!log.userId) return null;
    return prisma.appUser.findUnique({ where: { id: log.userId } });
  }

  @FieldResolver(() => Discussion, { nullable: true })
  async reviewDiscussion(
    @Root() log: UserContentLog,
    @Ctx() context: GraphQLContext,
  ): Promise<Discussion | null> {
    if (log.reviewDiscussion !== undefined) return log.reviewDiscussion;
    if (!log.userId || !log.contentId) return null;
    try {
      const matched = await getRequestLoaders(context).reviews.load(
        userContentKey(log.userId, log.contentId),
      );
      const discussion = matched.get(String(log.id));
      return discussion
        ? {
            ...discussion,
            score: discussion.upvoteCount - discussion.downvoteCount,
          }
        : null;
    } catch (error) {
      logger.error("[reviewDiscussion field resolver] Error", error);
      return null;
    }
  }
}
