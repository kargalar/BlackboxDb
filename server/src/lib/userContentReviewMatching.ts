export type ReviewMatchLog = {
  id: string | number;
  userId: string;
  contentId?: string | null;
  date: Date | string | number;
};

export type ReviewMatchDiscussion = {
  id: string | number;
  authorId: string;
  contentId?: string | null;
  createdAt: Date | string | number;
};

function toTime(value: Date | string | number | null | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return new Date(value).getTime();
  }

  return Number.NaN;
}

function entityId(value: string | number): string {
  return String(value);
}

function matchKey(userId: string, contentId?: string | null): string | null {
  if (!userId || !contentId) return null;
  return `${userId}:${contentId}`;
}

function compareEntityIds(a: string | number, b: string | number): number {
  const numberA = Number(a);
  const numberB = Number(b);

  if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
    return numberA - numberB;
  }

  return String(a).localeCompare(String(b));
}

function compareLogsAsc(a: ReviewMatchLog, b: ReviewMatchLog): number {
  const timeDiff = toTime(a.date) - toTime(b.date);
  if (timeDiff !== 0) return timeDiff;
  return compareEntityIds(a.id, b.id);
}

function compareReviewsAsc(
  a: ReviewMatchDiscussion,
  b: ReviewMatchDiscussion,
): number {
  const timeDiff = toTime(a.createdAt) - toTime(b.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return compareEntityIds(a.id, b.id);
}

function groupLogsByUserContent<TLog extends ReviewMatchLog>(
  logs: TLog[],
): Map<string, TLog[]> {
  const grouped = new Map<string, TLog[]>();

  for (const log of logs) {
    const key = matchKey(log.userId, log.contentId);
    const logTime = toTime(log.date);
    if (!key || !Number.isFinite(logTime)) continue;

    const list = grouped.get(key) ?? [];
    list.push(log);
    grouped.set(key, list);
  }

  for (const list of grouped.values()) {
    list.sort(compareLogsAsc);
  }

  return grouped;
}

function latestLogDateAtReviewTime<TLog extends ReviewMatchLog>(
  logs: TLog[],
  reviewTime: number,
): number | null {
  let latestDate: number | null = null;

  for (const log of logs) {
    const logTime = toTime(log.date);
    if (!Number.isFinite(logTime) || logTime > reviewTime) continue;

    if (latestDate === null || logTime > latestDate) {
      latestDate = logTime;
    }
  }

  return latestDate;
}

export function pairReviewsToLogs<
  TLog extends ReviewMatchLog,
  TReview extends ReviewMatchDiscussion,
>(logs: TLog[], reviews: TReview[]): Map<string, TReview> {
  const logsByKey = groupLogsByUserContent(logs);
  const pairedLogIds = new Set<string>();
  const pairedReviewIds = new Set<string>();
  const reviewByLogId = new Map<string, TReview>();

  const sortedReviews = reviews
    .filter(
      (review) =>
        Boolean(matchKey(review.authorId, review.contentId)) &&
        Number.isFinite(toTime(review.createdAt)),
    )
    .sort(compareReviewsAsc);

  for (const review of sortedReviews) {
    const reviewId = entityId(review.id);
    if (pairedReviewIds.has(reviewId)) continue;

    const key = matchKey(review.authorId, review.contentId);
    if (!key) continue;

    const candidateLogs = logsByKey.get(key);
    if (!candidateLogs?.length) continue;

    const reviewTime = toTime(review.createdAt);
    const latestDate = latestLogDateAtReviewTime(candidateLogs, reviewTime);
    if (latestDate === null) continue;

    const unpairedLatestLogs = candidateLogs
      .filter(
        (log) =>
          toTime(log.date) === latestDate && !pairedLogIds.has(entityId(log.id)),
      )
      .sort((a, b) => compareLogsAsc(b, a));

    const matchedLog = unpairedLatestLogs[0];
    if (!matchedLog) continue;

    const logId = entityId(matchedLog.id);
    pairedLogIds.add(logId);
    pairedReviewIds.add(reviewId);
    reviewByLogId.set(logId, review);
  }

  return reviewByLogId;
}

export function findReviewForLog<
  TLog extends ReviewMatchLog,
  TReview extends ReviewMatchDiscussion,
>(targetLog: TLog, logs: TLog[], reviews: TReview[]): TReview | null {
  return pairReviewsToLogs(logs, reviews).get(entityId(targetLog.id)) ?? null;
}

export function findLogForReview<
  TLog extends ReviewMatchLog,
  TReview extends ReviewMatchDiscussion,
>(review: TReview, logs: TLog[]): TLog | null {
  const key = matchKey(review.authorId, review.contentId);
  const reviewTime = toTime(review.createdAt);
  if (!key || !Number.isFinite(reviewTime)) return null;

  const candidateLogs = groupLogsByUserContent(logs).get(key);
  if (!candidateLogs?.length) return null;

  return (
    [...candidateLogs]
      .filter((log) => toTime(log.date) <= reviewTime)
      .sort((a, b) => compareLogsAsc(b, a))[0] ?? null
  );
}
