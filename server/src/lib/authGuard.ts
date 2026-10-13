import { GraphQLContext } from '../context';

/**
 * Auth guard helpers for resolver methods.
 * Centralizes permission checks to avoid repetition across resolvers.
 */

type ContextUser = GraphQLContext['user'];

/**
 * Throws if the user is not authenticated or lacks admin role.
 */
export function requireAdmin(user: ContextUser): asserts user is NonNullable<ContextUser> {
    if (!user || !user.isAdmin) {
        throw new Error('Access denied: Admin role required');
    }
}

/**
 * Throws if the user is not authenticated or lacks admin/moderator role.
 */
export function requireAdminOrModerator(user: ContextUser): asserts user is NonNullable<ContextUser> {
    if (!user || (!user.isAdmin && !user.isModerator)) {
        throw new Error('Access denied: Admin or moderator role required');
    }
}

/**
 * Throws if the user is not authenticated.
 */
export function requireAuth(user: ContextUser): asserts user is NonNullable<ContextUser> {
    if (!user) {
        throw new Error('Unauthorized: User must be logged in');
    }
}
