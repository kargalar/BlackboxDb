export const CONTENT_EMOTIONS = [
  "funny",
  "scary",
  "emotional",
  "exciting",
  "relaxing",
  "thoughtful",
  "romantic",
  "inspiring",
] as const;

export type ContentEmotion = (typeof CONTENT_EMOTIONS)[number];

const CONTENT_EMOTION_SET: ReadonlySet<string> = new Set(CONTENT_EMOTIONS);

/** Checks whether a string is a supported content emotion key. */
export function isContentEmotion(value: string): value is ContentEmotion {
  return CONTENT_EMOTION_SET.has(value);
}

/** Filters an input list down to supported content emotion keys. */
export function filterValidEmotions(
  emotions: string[] | undefined,
): ContentEmotion[] {
  if (!emotions?.length) return [];
  return emotions.filter(isContentEmotion);
}
