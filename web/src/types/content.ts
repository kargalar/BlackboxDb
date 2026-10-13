/**
 * Central type definitions for content-related entities
 * Migrated from movieLogs.ts to centralize type management
 */

// Re-export types from GraphQL services
export type { Content, UserStats, ContentStats } from '@/services/graphql/content';
export type { UserContentLog } from '@/services/graphql/userContent';
