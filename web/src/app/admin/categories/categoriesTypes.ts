/**
 * Types and configuration for the Categories admin page.
 * Single Responsibility: type definitions and static config only.
 */

export type TabType =
  | 'genres'
  | 'persons'
  | 'languages'
  | 'gameModes'
  | 'gameEngines'
  | 'perspectives'
  | 'platforms'
  | 'themes'
  | 'moods'
  | 'ageRatings'
  | 'personRoles'
  | 'companyRoles'
  | 'series'
  | 'companies';

export interface EditingItem {
  id?: number | string;
  name?: string;
  label?: string;
  contentTypeId?: number | null;
  [key: string]: any;
}

export interface CategoryItem {
  id: number | string;
  name?: string;
  label?: string;
  contentTypeId?: number | null;
  createdAt?: string;
  [key: string]: any;
}

export interface CategoryMessage {
  type: 'success' | 'error';
  text: string;
}

/** Tab configuration for cleaner code */
export const TAB_CONFIG: Record<TabType, { icon: string; nameField: string }> = {
  genres: { icon: '📚', nameField: 'name' },
  persons: { icon: '👤', nameField: 'name' },
  languages: { icon: '🗣️', nameField: 'name' },
  gameModes: { icon: '🎮', nameField: 'name' },
  gameEngines: { icon: 'GE', nameField: 'name' },
  perspectives: { icon: '👁️', nameField: 'name' },
  platforms: { icon: '🖥️', nameField: 'name' },
  themes: { icon: '🎨', nameField: 'name' },
  moods: { icon: '😊', nameField: 'name' },
  ageRatings: { icon: '🔞', nameField: 'name' },
  personRoles: { icon: '🎭', nameField: 'label' },
  companyRoles: { icon: '🏷️', nameField: 'name' },
  series: { icon: '📺', nameField: 'name' },
  companies: { icon: '🏢', nameField: 'name' },
};

/** Content type options used in person roles and genre filter */
export const CONTENT_TYPE_OPTIONS = [
  { value: 1, matchValues: [1, 2] },
  { value: 3, matchValues: [3] },
  { value: 4, matchValues: [4] },
  { value: 5, matchValues: [5] },
] as const;
