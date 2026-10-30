export interface TaggedUserSuggestion {
  id: string;
  username: string;
  picturePath?: string;
  isCustom?: boolean;
}

const STORAGE_KEYS = { tags: 'bb_recent_tags', users: 'bb_recent_with_who' } as const;

function readArray(key: string): unknown[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray(key: string, values: unknown[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Suggestions still work in memory when browser storage is unavailable.
  }
}

const LEGACY_PREFIX = 'legacy:';
const LEGACY_RECOMMENDER_PREFIX = 'legacy:recommender:';

export function toSuggestedTag(tag: string): string | null {
  const value = tag.trim();
  if (value.startsWith(LEGACY_RECOMMENDER_PREFIX)) {
    return value.substring(LEGACY_RECOMMENDER_PREFIX.length).trim() || null;
  }
  return value.startsWith(LEGACY_PREFIX) ? null : value;
}

export function getRecentTags(): string[] {
  return readArray(STORAGE_KEYS.tags)
    .filter((tag): tag is string => typeof tag === 'string')
    .map(toSuggestedTag)
    .filter((tag): tag is string => tag !== null);
}

export function getRecentTaggedUsers(): TaggedUserSuggestion[] {
  return readArray(STORAGE_KEYS.users).filter((user): user is TaggedUserSuggestion => {
    if (!user || typeof user !== 'object') return false;
    return (
      'id' in user &&
      typeof user.id === 'string' &&
      'username' in user &&
      typeof user.username === 'string' &&
      Boolean(user.username.trim())
    );
  });
}

export function rememberTags(tags: string[]): string[] {
  const unique = new Map<string, string>();
  for (const tag of [...tags, ...getRecentTags()]) {
    const value = toSuggestedTag(tag) ?? '';
    if (value && !value.startsWith('with:') && !unique.has(value.toLowerCase())) {
      unique.set(value.toLowerCase(), value);
    }
  }
  const merged = [...unique.values()];
  writeArray(STORAGE_KEYS.tags, merged);
  return merged;
}

export function rememberTaggedUsers(users: TaggedUserSuggestion[]): TaggedUserSuggestion[] {
  const unique = new Map<string, TaggedUserSuggestion>();
  for (const user of [...users, ...getRecentTaggedUsers()]) {
    const username = user.username.trim();
    const key = user.isCustom ? `custom:${username.toLowerCase()}` : user.id;
    if (username && !unique.has(key)) unique.set(key, { ...user, username });
  }
  const merged = [...unique.values()];
  writeArray(STORAGE_KEYS.users, merged);
  return merged;
}
