import { gql } from '@apollo/client';

// ==========================================
// USER MANAGEMENT
// ==========================================

export const LIST_USERS = gql`
  query ListUsers($search: String, $limit: Int) {
    listUsers(search: $search, limit: $limit) {
      authUserId
      username
      email
      isAdmin
      isModerator
      createdAt
    }
  }
`;

export const UPDATE_USER_ROLES = gql`
  mutation UpdateUserRoles($userId: String!, $roles: UpdateUserRolesInput!) {
    updateUserRoles(userId: $userId, roles: $roles)
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($userId: String!) {
    deleteUser(userId: $userId)
  }
`;

// ==========================================
// DATA RESET OPERATIONS
// ==========================================

export const RESET_ALL_DATA = gql`
  mutation ResetAllData {
    resetAllData
  }
`;

export const DELETE_ALL_USERS = gql`
  mutation DeleteAllUsers {
    deleteAllUsers
  }
`;

export const DELETE_ALL_CONTENT_BY_TYPE = gql`
  mutation DeleteAllContentByType($typeSlug: String!) {
    deleteAllContentByType(typeSlug: $typeSlug)
  }
`;

export const BACKUP_DATABASE = gql`
  mutation BackupDatabase {
    backupDatabase
  }
`;

export const RESTORE_DATABASE = gql`
  mutation RestoreDatabase($backupJson: String!) {
    restoreDatabase(backupJson: $backupJson)
  }
`;

// ==========================================
// MODERATION OPERATIONS
// ==========================================

const MODERATION_COMMENT_FIELDS = `
  id
  type
  text
  authorId
  authorUsername
  authorPicturePath
  contentId
  contentTitle
  discussionId
  discussionTitle
  parentId
  upvoteCount
  downvoteCount
  score
  isReported
  reportCount
  reports {
    id
    reporterId
    reporterUsername
    reason
    status
    createdAt
  }
  createdAt
  updatedAt
`;

export const LIST_MODERATION_COMMENTS = gql`
  query ListModerationComments($limit: Int) {
    listModerationComments(limit: $limit) {
      ${MODERATION_COMMENT_FIELDS}
      replies {
        ${MODERATION_COMMENT_FIELDS}
        replies {
          ${MODERATION_COMMENT_FIELDS}
          replies {
            ${MODERATION_COMMENT_FIELDS}
          }
        }
      }
    }
  }
`;

export const DELETE_MODERATION_COMMENT = gql`
  mutation DeleteModerationComment($id: Int!, $type: String!) {
    deleteModerationComment(id: $id, type: $type)
  }
`;

export const DISMISS_REPORTS = gql`
  mutation DismissReports($targetId: Int!, $targetType: String!) {
    dismissReports(targetId: $targetId, targetType: $targetType)
  }
`;

// Legacy - kept for backward compatibility
export const LIST_RECENT_REPLIES = LIST_MODERATION_COMMENTS;

export const DELETE_REVIEW_REPLY = gql`
  mutation DeleteReviewReply($id: Int!) {
    deleteReviewReply(id: $id)
  }
`;

// ==========================================
// USER TYPESCRIPT TYPES
// ==========================================

export interface AdminUser {
  authUserId: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isModerator: boolean;
  createdAt: string;
}

export interface UpdateUserRolesInput {
  isAdmin?: boolean;
  isModerator?: boolean;
}

export interface ReviewReply {
  id: number;
  reviewId: number;
  userId: string;
  text: string;
  createdAt: string;
}

export interface ModerationReport {
  id: number;
  reporterId: string;
  reporterUsername: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface ModerationComment {
  id: number;
  type: string; // "comment" | "discussionComment"
  text: string;
  authorId: string;
  authorUsername: string;
  authorPicturePath?: string | null;
  contentId?: string | null;
  contentTitle?: string | null;
  discussionId?: number | null;
  discussionTitle?: string | null;
  parentId?: number | null;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  isReported: boolean;
  reportCount: number;
  reports: ModerationReport[];
  replies?: ModerationComment[];
  createdAt: string;
  updatedAt: string;
}
