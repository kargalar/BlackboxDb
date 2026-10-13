import { PrismaClient } from "@prisma/client";

/**
 * Applies game platform filters to a Prisma 'where' clause for the Content model.
 * If the user has preferred game platforms, it filters out games (contentTypeId: 3)
 * that do not belong to the user's preferred platforms.
 */
export async function applyGamePlatformFilter(
  prisma: PrismaClient,
  userId: string | undefined,
  where: any
): Promise<any> {
  if (!userId) return where;

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { preferredGamePlatformIds: true },
  });

  if (
    user?.preferredGamePlatformIds &&
    user.preferredGamePlatformIds.length > 0
  ) {
    where = where || {};
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { contentTypeId: { not: 3 } }, // not a game
        {
          contentTypeId: 3,
          contentPlatforms: {
            some: { platformId: { in: user.preferredGamePlatformIds } },
          },
        },
      ],
    });
  }

  return where;
}

/**
 * Applies game platform filters to a Prisma 'where' clause for the UserContentLog model.
 * If the user has preferred game platforms, it filters out UserContentLogs for games
 * that do not belong to the user's preferred platforms.
 */
export async function applyGamePlatformFilterToLog(
  prisma: PrismaClient,
  userId: string | undefined,
  where: any
): Promise<any> {
  if (!userId) return where;

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { preferredGamePlatformIds: true },
  });

  if (
    user?.preferredGamePlatformIds &&
    user.preferredGamePlatformIds.length > 0
  ) {
    where = where || {};
    where.AND = where.AND || [];
    where.AND.push({
      content: {
        OR: [
          { contentTypeId: { not: 3 } }, // not a game
          {
            contentTypeId: 3,
            contentPlatforms: {
              some: { platformId: { in: user.preferredGamePlatformIds } },
            },
          },
        ],
      },
    });
  }

  return where;
}
