/**
 * Modern Admin Service using GraphQL
 * This replaces the legacy admin.ts Supabase implementation
 *
 * REFACTOR NOTICE:
 * This file is now a facade for the modular services located in ./admin/
 * Please add new features to the appropriate service file in ./admin/
 */

// Re-export types from the new location (which imports from graphql/admin)
export type {
  AdminUser,
  AdminContent,
  ContentEditHistory,
  ContentRequest,
  ReviewReply,
  ModerationComment,
  ModerationReport,
  AdminExpansion,
  UpdateUserRolesInput,
  UpdateContentInput,
  CreateContentRequestInput,
  CreateContentInput,
  Person,
  Language,
  PersonInput,
  LanguageInput,
} from './graphql/admin';

// Re-export all services
export * from './admin';
