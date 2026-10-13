import { Resolver, Mutation, Arg, Ctx, Authorized, Int } from 'type-graphql';
import { GraphQLContext } from '../context';
import { requireAdminOrModerator } from '../lib/authGuard';

@Resolver()
export class UserContentPreferenceResolver {
  @Authorized()
  @Mutation(() => Boolean, {
    description: 'Set custom poster or backdrop preference for a content. Only for admins/moderators.',
  })
  async setUserContentPreference(
    @Arg('contentId', () => String) contentId: string,
    @Arg('posterImageId', () => Int, { nullable: true }) posterImageId: number | null,
    @Arg('backdropImageId', () => Int, { nullable: true }) backdropImageId: number | null,
    @Ctx() { prisma, user }: GraphQLContext
  ): Promise<boolean> {
    requireAdminOrModerator(user);

    try {
      if (posterImageId === null && backdropImageId === null) {
        // If both are null, delete the preference
        await prisma.userContentPreference.deleteMany({
          where: { userId: user.id, contentId },
        });
        return true;
      }

      await prisma.userContentPreference.upsert({
        where: {
          userId_contentId: {
            userId: user.id,
            contentId: contentId,
          },
        },
        create: {
          userId: user.id,
          contentId,
          posterImageId,
          backdropImageId,
        },
        update: {
          posterImageId,
          backdropImageId,
        },
      });

      return true;
    } catch (error) {
      console.error('❌ [UserContentPreference] Failed to set preference:', error);
      throw error instanceof Error ? error : new Error('Failed to set user content preference');
    }
  }
}
