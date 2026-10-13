import { Prisma, type PrismaClient } from "@prisma/client";
import { getLengthFieldForContentType } from "../resolvers/content/ContentQueryHelpers";
import { normalizePageOffset, normalizePageSize } from "./pagination";

interface SearchPageOptions {
  where: Prisma.ContentWhereInput;
  searchQuery?: string;
  contentTypeId?: number;
  ratingMin?: number;
  ratingMax?: number;
  sortBy?: string;
  sortOrder?: string;
  userId?: string;
  limit: number;
  offset: number;
}

export interface ContentSearchPage {
  ids: string[];
  total: number;
}

const SEARCH_RELEVANCE = {
  titleThreshold: 0.1,
  descriptionThreshold: 0.05,
  originalTitleWeight: 0.9,
  descriptionWeight: 0.5,
} as const;

const durationColumns = {
  runtime: Prisma.sql`c.runtime`,
  averageDuration: Prisma.sql`c.average_duration`,
  pageCount: Prisma.sql`c.page_count`,
};

export function standardContentSearchOrder(
  options: SearchPageOptions,
): Prisma.ContentOrderByWithRelationInput[] {
  const direction = options.sortOrder === "asc" ? "asc" : "desc";
  switch (options.sortBy) {
    case "popularity":
      return [
        { consumeCount: direction },
        { favoriteCount: "desc" },
        { createdAt: "desc" },
        { id: "asc" },
      ];
    case "title":
      return [{ title: direction }, { id: "asc" }];
    case "releaseDate":
      return [{ releaseDate: direction }, { id: "asc" }];
    case "duration":
      return [
        {
          [getLengthFieldForContentType(options.contentTypeId) ?? "runtime"]: {
            sort: direction,
            nulls: "last",
          },
        },
        { createdAt: "desc" },
        { id: "asc" },
      ];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

/** Returns only a page of identifiers; computed ratings and log dates stay in PostgreSQL. */
export async function getContentSearchPage(
  prisma: PrismaClient,
  options: SearchPageOptions,
): Promise<ContentSearchPage> {
  const limit = normalizePageSize(options.limit);
  const offset = normalizePageOffset(options.offset);
  const query = options.searchQuery?.trim();
  const hasRatingFilter =
    options.ratingMin !== undefined || options.ratingMax !== undefined;
  const needsUserDate = options.sortBy === "userDate" && !!options.userId;
  if (
    !query &&
    !hasRatingFilter &&
    !needsUserDate &&
    options.sortBy !== "rating"
  ) {
    const total = await prisma.content.count({ where: options.where });
    const page = await prisma.content.findMany({
      where: options.where,
      select: { id: true },
      orderBy: standardContentSearchOrder(options),
      take: limit,
      skip: offset,
    });
    return { total, ids: page.map((content) => content.id) };
  }

  const conditions: Prisma.Sql[] = [Prisma.sql`c.is_deleted = false`];
  // Common searches need no candidate list. Complex relation filters retain Prisma's semantics.
  const hasComplexFilters =
    (options.where.contentTypeId !== undefined &&
      typeof options.where.contentTypeId !== "number") ||
    Object.keys(options.where).some(
      (key) => !["isDeleted", "contentTypeId"].includes(key),
    );
  if (hasComplexFilters) {
    const candidates = await prisma.content.findMany({
      where: options.where,
      select: { id: true },
    });
    if (!candidates.length) return { total: 0, ids: [] };
    conditions.push(
      Prisma.sql`c.id = ANY(${candidates.map((content) => content.id)}::text[])`,
    );
  } else if (typeof options.where.contentTypeId === "number") {
    conditions.push(
      Prisma.sql`c.content_type_id = ${options.where.contentTypeId}`,
    );
  }

  const averageRating = Prisma.sql`CASE WHEN c.total_rating_votes > 0 THEN COALESCE(c.total_rating_score, 0) / c.total_rating_votes ELSE 0 END`;
  if (options.ratingMin !== undefined)
    conditions.push(Prisma.sql`${averageRating} >= ${options.ratingMin}`);
  if (options.ratingMax !== undefined)
    conditions.push(Prisma.sql`${averageRating} <= ${options.ratingMax}`);
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(
      SIMILARITY(c.title, ${query}) > ${SEARCH_RELEVANCE.titleThreshold}
      OR SIMILARITY(c.description, ${query}) > ${SEARCH_RELEVANCE.descriptionThreshold}
      OR c.title ILIKE ${pattern} OR c.original_title ILIKE ${pattern} OR c.isbn ILIKE ${pattern}
      OR EXISTS (SELECT 1 FROM book_publication bp WHERE bp.content_id = c.id AND bp.isbn ILIKE ${pattern})
    )`);
  }

  const direction =
    options.sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const ordering: Array<{
    expression: Prisma.Sql;
    direction: Prisma.Sql;
    nulls?: Prisma.Sql;
  }> = [];
  const add = (expression: Prisma.Sql, order = direction, nulls?: Prisma.Sql) =>
    ordering.push({ expression, direction: order, nulls });
  if (query && !options.sortBy) {
    add(
      Prisma.sql`GREATEST(SIMILARITY(c.title, ${query}), SIMILARITY(c.original_title, ${query}) * ${SEARCH_RELEVANCE.originalTitleWeight}, SIMILARITY(c.description, ${query}) * ${SEARCH_RELEVANCE.descriptionWeight})`,
      Prisma.sql`DESC`,
    );
  } else if (needsUserDate) {
    add(
      Prisma.sql`COALESCE((SELECT COALESCE(l.date, l.updated_at) FROM user_content_log l WHERE l.user_id = ${options.userId}::uuid AND l.content_id = c.id ORDER BY l.date DESC, l.updated_at DESC, l.id DESC LIMIT 1), TIMESTAMP '1970-01-01')`,
    );
    add(Prisma.sql`c.created_at`);
  } else {
    switch (options.sortBy) {
      case "rating":
        add(averageRating);
        add(Prisma.sql`c.total_rating_votes`);
        add(Prisma.sql`c.created_at`, Prisma.sql`DESC`);
        break;
      case "popularity":
        add(Prisma.sql`c.consume_count`);
        add(Prisma.sql`c.favorite_count`, Prisma.sql`DESC`);
        add(Prisma.sql`c.created_at`, Prisma.sql`DESC`);
        break;
      case "title":
        add(Prisma.sql`c.title`);
        break;
      case "releaseDate":
        add(Prisma.sql`c.release_date`);
        break;
      case "duration":
        add(
          durationColumns[
            getLengthFieldForContentType(options.contentTypeId) ?? "runtime"
          ],
          direction,
          Prisma.sql`NULLS LAST`,
        );
        add(Prisma.sql`c.created_at`, Prisma.sql`DESC`);
        break;
      default:
        add(Prisma.sql`c.created_at`, Prisma.sql`DESC`);
    }
  }
  add(Prisma.sql`c.id`, Prisma.sql`ASC`);
  // Identifiers here are generated locally, never derived from user input.
  const projections = ordering.map(
    (order, index) =>
      Prisma.sql`${order.expression} AS ${Prisma.raw(`order_${index}`)}`,
  );
  const orderBy = ordering.map(
    (order, index) =>
      Prisma.sql`${Prisma.raw(`order_${index}`)} ${order.direction} ${order.nulls ?? Prisma.empty}`,
  );
  const [result] = await prisma.$queryRaw<ContentSearchPage[]>(Prisma.sql`
    WITH matches AS MATERIALIZED (
      SELECT c.id, ${Prisma.join(projections)} FROM content c WHERE ${Prisma.join(conditions, " AND ")}
    )
    SELECT (SELECT COUNT(*)::int FROM matches) AS total,
      ARRAY(SELECT id FROM matches ORDER BY ${Prisma.join(orderBy)} LIMIT ${limit} OFFSET ${offset}) AS ids
  `);
  return result;
}
