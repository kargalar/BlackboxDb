// Quiz admin page types and constants

export const CONTENT_TYPES = [
  { id: 1, name: 'Film', emoji: '🎬' },
  { id: 2, name: 'Dizi', emoji: '📺' },
  { id: 3, name: 'Oyun', emoji: '🎮' },
  { id: 4, name: 'Kitap', emoji: '📚' },
  { id: 5, name: 'Müzik', emoji: '🎵' },
];

export const DIFFICULTY_LABELS = ['Çok Kolay', 'Kolay', 'Orta', 'Zor', 'Çok Zor'];
export const DIFFICULTY_COLORS = [
  'bg-green-500',
  'bg-lime-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-red-500',
];

export const ITEMS_PER_PAGE = 20;

export interface QuizSettings {
  id?: number;
  contentTypeId: number;
  isActive: boolean;
  timePerQuestion: number;
  questionsCount: number;
  pointsLevel1: number;
  pointsLevel2: number;
  pointsLevel3: number;
  pointsLevel4: number;
  pointsLevel5: number;
}

export interface ContentItem {
  id: string;
  title: string;
  posterUrl?: string;
  contentTypeId: number;
  isEnabledForQuiz: boolean;
}

export interface Screenshot {
  id: number;
  contentId: string;
  imageUrl: string;
  difficulty: number;
  order: number;
  description?: string;
  isEnabledForQuiz: boolean;
}
