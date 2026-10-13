import type { PrismaClient } from '@prisma/client';
import { createNotification } from './notifications';
import { NOTIFICATION_TYPE_ID } from './notificationTypes';

/**
 * Notify users when a new season is added to a TV series they have consumed
 */
export async function notifyUsersOfNewSeason(
  prisma: PrismaClient,
  tvShowId: string,
  seasonNumber: number,
): Promise<void> {
  const label = `${seasonNumber}. sezon eklendi`;
  await notifyUsersOfSeriesUpdate(prisma, tvShowId, label);
}

/**
 * Notify users when new episodes are added to an existing season they follow.
 */
export async function notifyUsersOfNewEpisodes(
  prisma: PrismaClient,
  tvShowId: string,
  seasonNumber: number,
  episodeNumbers: number[],
): Promise<void> {
  if (episodeNumbers.length === 0) return;

  const sortedEpisodeNumbers = [...new Set(episodeNumbers)].sort((a, b) => a - b);
  const count = sortedEpisodeNumbers.length;
  const label =
    count === 1
      ? `${seasonNumber}. sezona ${sortedEpisodeNumbers[0]}. bolum eklendi`
      : `${seasonNumber}. sezona ${count} yeni bolum eklendi`;

  await notifyUsersOfSeriesUpdate(prisma, tvShowId, label);
}

async function notifyUsersOfSeriesUpdate(
  prisma: PrismaClient,
  tvShowId: string,
  message: string,
): Promise<void> {
  try {
    console.log(`🔔 Checking for users to notify about series update "${message}" of ${tvShowId}`);

    const consumedUsers = await prisma.userContentLog.findMany({
      where: {
        contentId: tvShowId,
        OR: [{ isConsumed: true }, { isContinuing: true }],
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });

    console.log(`   Found ${consumedUsers.length} users who follow this series`);

    for (const userLog of consumedUsers) {
      await createNotification(prisma, {
        recipientUserId: userLog.userId,
        typeId: NOTIFICATION_TYPE_ID.NEW_SEASON_ADDED,
        contentId: tvShowId,
        message,
      });
    }

    console.log(`✅ Created ${consumedUsers.length} notifications for "${message}"`);
  } catch (error) {
    console.error('❌ Failed to notify users of series update:', error);
  }
}
