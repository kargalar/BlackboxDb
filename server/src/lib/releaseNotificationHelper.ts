import type { PrismaClient } from '@prisma/client';
import { createNotification } from './notifications';
import { NOTIFICATION_TYPE_ID } from './notificationTypes';
import { isFutureDate, isUpcomingStatus } from './contentStatus';

type ReleaseStateSnapshot = {
  releaseDate?: Date | null;
  firstAirDate?: Date | null;
  status?: string | null;
};

const inFlightReleaseNotificationEnsures = new Map<string, Promise<void>>();

function getPrimaryReleaseDate(snapshot?: ReleaseStateSnapshot | null): Date | null {
  if (!snapshot) return null;
  return snapshot.releaseDate ?? snapshot.firstAirDate ?? null;
}

export function isUpcomingRelease(snapshot?: ReleaseStateSnapshot | null): boolean {
  if (!snapshot) return false;
  return isUpcomingStatus(snapshot.status) || isFutureDate(getPrimaryReleaseDate(snapshot));
}

export function isReleasedNow(snapshot?: ReleaseStateSnapshot | null): boolean {
  const releaseDate = getPrimaryReleaseDate(snapshot);
  if (!releaseDate) return false;
  return releaseDate.getTime() <= Date.now();
}

export function didContentBecomeReleased(
  previous: ReleaseStateSnapshot | null | undefined,
  next: ReleaseStateSnapshot | null | undefined,
): boolean {
  return isUpcomingRelease(previous) && isReleasedNow(next);
}

async function createMissingReleaseNotifications(
  prisma: PrismaClient,
  contentId: string,
  recipientUserIds: string[],
): Promise<void> {
  if (recipientUserIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${contentId}, 0))::text`;

    const existingNotifications = await transaction.notification.findMany({
      where: {
        recipientUserId: { in: recipientUserIds },
        typeId: NOTIFICATION_TYPE_ID.CONTENT_RELEASED,
        contentId,
      },
      select: {
        recipientUserId: true,
      },
    });

    const alreadyNotifiedUserIds = new Set(
      existingNotifications.map((notification) => notification.recipientUserId),
    );

    for (const recipientUserId of recipientUserIds) {
      if (alreadyNotifiedUserIds.has(recipientUserId)) {
        continue;
      }

      await createNotification(transaction, {
        recipientUserId,
        typeId: NOTIFICATION_TYPE_ID.CONTENT_RELEASED,
        contentId,
      });
    }
  });
}

export async function notifyUsersOfReleasedContent(
  prisma: PrismaClient,
  contentId: string,
): Promise<void> {
  try {
    const subscribedLogs = await prisma.userContentLog.findMany({
      where: {
        contentId,
        notifyOnRelease: true,
        isConsumeLater: true,
      },
      select: {
        userId: true,
      },
    });

    const recipientUserIds = [...new Set(subscribedLogs.map((log) => log.userId))];

    if (recipientUserIds.length === 0) {
      return;
    }

    await createMissingReleaseNotifications(prisma, contentId, recipientUserIds);

    await prisma.userContentLog.updateMany({
      where: {
        contentId,
        notifyOnRelease: true,
      },
      data: {
        notifyOnRelease: false,
      },
    });
  } catch (error) {
    console.error('Failed to notify users of released content:', {
      contentId,
      error,
    });
  }
}

async function ensureReleasedContentNotificationsForUserInternal(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  try {
    const releasableLogs = await prisma.userContentLog.findMany({
      where: {
        userId,
        notifyOnRelease: true,
        isConsumeLater: true,
        content: {
          OR: [
            {
              releaseDate: {
                lte: new Date(),
              },
            },
            {
              firstAirDate: {
                lte: new Date(),
              },
            },
          ],
        },
      },
      select: {
        contentId: true,
      },
      distinct: ['contentId'],
    });

    if (releasableLogs.length === 0) {
      return;
    }

    const contentIds = releasableLogs.map((log) => log.contentId);

    for (const contentId of contentIds) {
      await createMissingReleaseNotifications(prisma, contentId, [userId]);
    }

    await prisma.userContentLog.updateMany({
      where: {
        userId,
        contentId: { in: contentIds },
        notifyOnRelease: true,
      },
      data: {
        notifyOnRelease: false,
      },
    });
  } catch (error) {
    console.error('Failed to ensure released content notifications for user:', {
      userId,
      error,
    });
  }
}

export function ensureReleasedContentNotificationsForUser(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const inFlightEnsure = inFlightReleaseNotificationEnsures.get(userId);
  if (inFlightEnsure) return inFlightEnsure;

  const ensurePromise = ensureReleasedContentNotificationsForUserInternal(
    prisma,
    userId,
  ).finally(() => {
    if (inFlightReleaseNotificationEnsures.get(userId) === ensurePromise) {
      inFlightReleaseNotificationEnsures.delete(userId);
    }
  });
  inFlightReleaseNotificationEnsures.set(userId, ensurePromise);
  return ensurePromise;
}
