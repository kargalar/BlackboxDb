import type { PrismaClient } from "@prisma/client";

export async function getContentScreenshotCounts(
  prisma: PrismaClient,
  contentIds: string[],
  requestedFields?: Set<string>,
) {
  const enabled = new Map<string, number>();
  const total = new Map<string, number>();
  const needsEnabled =
    !requestedFields || requestedFields.has("enabledScreenshotCount");
  const needsTotal = !requestedFields || requestedFields.has("screenshotCount");
  if (!contentIds.length || (!needsEnabled && !needsTotal))
    return { enabled, total };

  // One read serves both counters. At most two groups are returned per content.
  const groups = await prisma.contentScreenshot.groupBy({
    by: ["contentId", "isEnabledForQuiz"],
    where: {
      contentId: { in: contentIds },
      ...(needsTotal ? {} : { isEnabledForQuiz: true }),
    },
    _count: { id: true },
  });
  for (const group of groups) {
    if (group.isEnabledForQuiz) enabled.set(group.contentId, group._count.id);
    total.set(
      group.contentId,
      (total.get(group.contentId) ?? 0) + group._count.id,
    );
  }
  return { enabled, total };
}
