/**
 * Shared types and config constants for game expansion sub-components.
 * Single Responsibility: Type definitions & expansion config.
 */

export interface ExpansionItem {
  name: string;
  description?: string;
  posterUrl?: string;
  releaseDate?: string;
  type?: 'expansion' | 'remake';
}

/** Configuration for an expansion section (Expansion or Remake) */
export interface ExpansionConfig {
  type: 'expansion' | 'remake';
  label: string;
  icon: string;
  newButtonLabel: string;
  editLabel: string;
  addNewLabel: string;
  addButtonLabel: string;
  namePlaceholder: string;
  emptyMessage: string;
}

export const EXPANSION_CONFIG: ExpansionConfig = {
  type: 'expansion',
  label: 'Expansions',
  icon: '🎁',
  newButtonLabel: '+ Yeni Expansion',
  editLabel: '✏️ Expansion Düzenle',
  addNewLabel: '➕ Yeni Expansion Ekle',
  addButtonLabel: '✓ Expansion Ekle',
  namePlaceholder: 'Expansion Adı *',
  emptyMessage: 'Henüz expansion eklenmedi',
};

export const REMAKE_CONFIG: ExpansionConfig = {
  type: 'remake',
  label: "Remake'ler",
  icon: '🔄',
  newButtonLabel: '+ Yeni Remake',
  editLabel: '✏️ Remake Düzenle',
  addNewLabel: '➕ Yeni Remake Ekle',
  addButtonLabel: '✓ Remake Ekle',
  namePlaceholder: 'Remake Adı *',
  emptyMessage: 'Henüz remake eklenmedi',
};
