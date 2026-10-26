/**
 * List TypeScript Interfaces
 * Type definitions for list-related GraphQL responses
 */

export interface UserListOwner {
  id: string;
  username: string;
  picturePath?: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  picturePath?: string;
}

export interface UserListContentType {
  id: number;
  name: string;
}

export interface UserListItem {
  id: number;
  listId: number;
  contentId: string;
  addedById: string;
  displayOrder: number;
  addedAt: string;
  addedBy: UserListOwner;
  content: {
    id: string;
    title: string;
    posterUrl?: string;
    releaseDate?: string;
    consumeCount: number;
    favoriteCount: number;
    ratingDistribution?: number[];
    tmdbRating?: number | null;
    contentType: UserListContentType;
  };
}

export interface UserListCollaborator {
  id: number;
  listId: number;
  userId: string;
  role: 'editor' | 'viewer';
  addedAt: string;
  user: UserListOwner;
}

export interface UserList {
  id: number;
  name: string;
  description?: string;
  contentTypeId: number;
  ownerId: string;
  isPublic: boolean;
  isOrdered: boolean;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  userVote: number | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  owner: UserListOwner;
  contentType: UserListContentType;
  items?: UserListItem[];
  collaborators?: UserListCollaborator[];
}
