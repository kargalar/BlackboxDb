import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Models that support soft delete.
 * These models have `isDeleted` and `deletedAt` columns.
 */
const SOFT_DELETE_MODELS: Prisma.ModelName[] = [
  "Content",
  "AppUser",
  "Discussion",
  "DiscussionComment",
  "UserList",
];

export function addActiveFilter(args: any) {
  const nextArgs = { ...(args || {}) };
  nextArgs.where = { ...nextArgs.where };
  if (nextArgs.where.isDeleted === undefined) {
    const hasOrIsDeleted =
      Array.isArray(nextArgs.where.OR) &&
      nextArgs.where.OR.some(
        (condition: any) => condition && condition.isDeleted !== undefined,
      );
    if (!hasOrIsDeleted) nextArgs.where.isDeleted = false;
  }
  return nextArgs;
}

/**
 * Applies soft-delete filtering via Prisma Client Extension.
 * Returns a new extended PrismaClient that automatically injects
 * `isDeleted: false` on read operations for soft-deletable models.
 */
export function withSoftDelete(prisma: PrismaClient) {
  return prisma.$extends({
    name: "softDelete",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as Prisma.ModelName)) {
            args = addActiveFilter(args);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as Prisma.ModelName)) {
            args = addActiveFilter(args);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as Prisma.ModelName)) {
            args = addActiveFilter(args);
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as Prisma.ModelName)) {
            args = addActiveFilter(args);
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as Prisma.ModelName)) {
            args = addActiveFilter(args);
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model as Prisma.ModelName)) {
            // Filtering after fetching fails when select omits isDeleted.
            return query(addActiveFilter(args));
          }
          return query(args);
        },
      },
    },
  });
}
