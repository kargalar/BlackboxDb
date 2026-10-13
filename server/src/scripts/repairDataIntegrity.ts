import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  calculateContentRatingStats,
  recalculateBookPublicationAggregates,
} from "../services/UserContentService";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");
const mergeDuplicates = process.argv.includes("--merge-duplicates");
const BOOK_CONTENT_TYPE_ID = 4;

async function recalculateContentRating(
  client: PrismaClient | Prisma.TransactionClient,
  contentId: string,
): Promise<void> {
  const ratedLogs = await client.$queryRaw<Array<{ rating: number }>>`
    SELECT DISTINCT ON (user_id) rating
    FROM user_content_log
    WHERE content_id = ${contentId} AND rating IS NOT NULL
    ORDER BY user_id, date DESC
  `;

  const distribution = Array.from({ length: 10 }, () => 0);
  let totalScore = 0;
  let totalVotes = 0;

  for (const log of ratedLogs) {
    const rating = Number(log.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) continue;
    distribution[Math.round(rating) - 1] += 1;
    totalScore += rating;
    totalVotes += 1;
  }

  await client.content.update({
    where: { id: contentId },
    data: {
      ratingDistribution: distribution,
      totalRatingScore: totalVotes > 0 ? totalScore : null,
      totalRatingVotes: totalVotes,
    },
  });
}

async function executeUnsafe(
  client: Prisma.TransactionClient,
  sql: string,
  ...values: unknown[]
): Promise<void> {
  await client.$executeRawUnsafe(sql, ...values);
}

async function mergeDuplicateContent(
  client: Prisma.TransactionClient,
  canonicalId: string,
  duplicateId: string,
): Promise<void> {
  const [canonical, duplicate] = await Promise.all([
    client.content.findUnique({
      where: { id: canonicalId },
      select: { contentTypeId: true },
    }),
    client.content.findUnique({
      where: { id: duplicateId },
      select: {
        contentTypeId: true,
        title: true,
        isbn: true,
        pageCount: true,
        releaseDate: true,
        languages: true,
      },
    }),
  ]);

  let migratedPublicationId: number | null = null;
  if (
    canonical?.contentTypeId === BOOK_CONTENT_TYPE_ID &&
    duplicate?.contentTypeId === BOOK_CONTENT_TYPE_ID
  ) {
    const [duplicatePublications, canonicalPublications] = await Promise.all([
      client.bookPublication.findMany({
        where: { contentId: duplicateId },
        select: { id: true, isOriginal: true, createdAt: true },
        orderBy: [{ isOriginal: "desc" }, { createdAt: "asc" }],
      }),
      client.bookPublication.findMany({
        where: { contentId: canonicalId },
        select: { id: true, isbn: true },
      }),
    ]);

    if (duplicatePublications.length > 0) {
      migratedPublicationId = duplicatePublications[0].id;
    } else {
      const matchingPublication = duplicate.isbn
        ? canonicalPublications.find((publication) => publication.isbn === duplicate.isbn)
        : undefined;
      const publication = matchingPublication
        ? matchingPublication
        : await client.bookPublication.create({
            data: {
              contentId: canonicalId,
              title: duplicate.title,
              isbn: duplicate.isbn,
              pageCount: duplicate.pageCount,
              publishedDate: duplicate.releaseDate?.toISOString().slice(0, 10) ?? null,
              language: duplicate.languages[0] ?? null,
              isOriginal: canonicalPublications.length === 0,
            },
            select: { id: true },
          });
      migratedPublicationId = publication.id;
    }
  }

  const conflictTables: Array<{ table: string; columns: string[] }> = [
    { table: "content_genre", columns: ["genre_id"] },
    {
      table: "content_person",
      columns: ["person_id", "person_role_id", "character"],
    },
    { table: "content_company", columns: ["company_id", "company_role_id"] },
    { table: "content_theme", columns: ["theme_id"] },
    { table: "content_mood", columns: ["mood_id"] },
    { table: "content_game_mode", columns: ["game_mode_id"] },
    { table: "content_game_engine", columns: ["game_engine_id"] },
    { table: "content_perspective", columns: ["perspective_id"] },
    { table: "content_platform", columns: ["platform_id"] },
    { table: "content_translation", columns: ["language"] },
    { table: "user_content_preference", columns: ["user_id"] },
    { table: "user_featured_content", columns: ["user_id"] },
    { table: "user_list_item", columns: ["list_id"] },
    {
      table: "content_recommendation",
      columns: ["recipient_user_id", "recommender_user_id"],
    },
  ];

  for (const { table, columns } of conflictTables) {
    const sameRelation = columns
      .map((column) => `duplicate.${column} IS NOT DISTINCT FROM canonical.${column}`)
      .join(" AND ");
    await executeUnsafe(
      client,
      `DELETE FROM ${table} AS duplicate
       USING ${table} AS canonical
       WHERE duplicate.content_id = $2
         AND canonical.content_id = $1
         AND ${sameRelation}`,
      canonicalId,
      duplicateId,
    );
    await executeUnsafe(
      client,
      `UPDATE ${table} SET content_id = $1 WHERE content_id = $2`,
      canonicalId,
      duplicateId,
    );
  }

  if (migratedPublicationId !== null) {
    await client.userContentLog.updateMany({
      where: { contentId: duplicateId, bookPublicationId: null },
      data: { bookPublicationId: migratedPublicationId },
    });
  }

  for (const table of [
    "book_publication",
    "content_image",
    "content_screenshot",
    "discussion",
    "notification",
    "user_content_log",
    "contribution",
    "content_edit_history",
    "expansion",
  ]) {
    await executeUnsafe(
      client,
      `UPDATE ${table} SET content_id = $1 WHERE content_id = $2`,
      canonicalId,
      duplicateId,
    );
  }

  for (const table of ["content_similarity", "content_citation"]) {
    const firstColumn = table === "content_similarity" ? "content1_id" : "citing_content_id";
    const secondColumn = table === "content_similarity" ? "content2_id" : "cited_content_id";
    await executeUnsafe(
      client,
      `DELETE FROM ${table} AS duplicate
       USING ${table} AS canonical
       WHERE (CASE WHEN duplicate.${firstColumn} = $2 THEN $1 ELSE duplicate.${firstColumn} END) = canonical.${firstColumn}
         AND (CASE WHEN duplicate.${secondColumn} = $2 THEN $1 ELSE duplicate.${secondColumn} END) = canonical.${secondColumn}
         AND (duplicate.${firstColumn} = $2 OR duplicate.${secondColumn} = $2)`,
      canonicalId,
      duplicateId,
    );
    await executeUnsafe(
      client,
      `UPDATE ${table}
       SET ${firstColumn} = CASE WHEN ${firstColumn} = $2 THEN $1 ELSE ${firstColumn} END,
           ${secondColumn} = CASE WHEN ${secondColumn} = $2 THEN $1 ELSE ${secondColumn} END
       WHERE ${firstColumn} = $2 OR ${secondColumn} = $2`,
      canonicalId,
      duplicateId,
    );
    await executeUnsafe(
      client,
      `DELETE FROM ${table} WHERE ${firstColumn} = ${secondColumn}`,
    );
  }

  const duplicateSeasons = await client.tvSeason.findMany({
    where: { tvShowId: duplicateId },
    select: { id: true, seasonNumber: true },
  });
  const canonicalSeasons = await client.tvSeason.findMany({
    where: { tvShowId: canonicalId },
    select: { id: true, seasonNumber: true },
  });
  const canonicalSeasonByNumber = new Map(
    canonicalSeasons.map((season) => [season.seasonNumber, season.id]),
  );

  for (const duplicateSeason of duplicateSeasons) {
    const canonicalSeasonId = canonicalSeasonByNumber.get(duplicateSeason.seasonNumber);
    if (canonicalSeasonId) {
      await executeUnsafe(
        client,
        `DELETE FROM tv_episode AS duplicate
         USING tv_episode AS canonical
         WHERE duplicate.id <> canonical.id
           AND duplicate.season_id = $1
           AND canonical.season_id = $2
           AND duplicate.season_number = canonical.season_number
           AND duplicate.episode_number = canonical.episode_number`,
        duplicateSeason.id,
        canonicalSeasonId,
      );
      await client.tvEpisode.updateMany({
        where: { seasonId: duplicateSeason.id },
        data: { tvShowId: canonicalId, seasonId: canonicalSeasonId },
      });
      await client.tvSeason.delete({ where: { id: duplicateSeason.id } });
    } else {
      await client.tvSeason.update({
        where: { id: duplicateSeason.id },
        data: { tvShowId: canonicalId },
      });
    }
  }

  await client.tvEpisode.updateMany({
    where: { tvShowId: duplicateId },
    data: { tvShowId: canonicalId },
  });

  await executeUnsafe(
    client,
    // Retired columns are preserved here only when merging historical records.
    `UPDATE content AS canonical
     SET original_title = COALESCE(canonical.original_title, duplicate.original_title),
         description = COALESCE(canonical.description, duplicate.description),
         tagline = COALESCE(canonical.tagline, duplicate.tagline),
         poster_image_id = COALESCE(canonical.poster_image_id, duplicate.poster_image_id),
         backdrop_image_id = COALESCE(canonical.backdrop_image_id, duplicate.backdrop_image_id),
         spotify_url = COALESCE(canonical.spotify_url, duplicate.spotify_url),
         explicit = COALESCE(canonical.explicit, duplicate.explicit),
         label = COALESCE(canonical.label, duplicate.label),
         total_tracks = COALESCE(canonical.total_tracks, duplicate.total_tracks)
     FROM content AS duplicate
     WHERE canonical.id = $1 AND duplicate.id = $2`,
    canonicalId,
    duplicateId,
  );

  await executeUnsafe(
    client,
    `UPDATE content SET is_deleted = true, deleted_at = COALESCE(deleted_at, NOW()) WHERE id = $1`,
    duplicateId,
  );
}

async function recalculateMergedContent(client: Prisma.TransactionClient, contentId: string) {
  const stats = await calculateContentRatingStats(client, contentId);
  const [consumeCount, favoriteCount, discussionCount, publications] = await Promise.all([
    client.userContentLog.count({ where: { contentId, isConsumed: true } }),
    client.userContentLog.count({ where: { contentId, isFavorite: true } }),
    client.discussion.count({ where: { contentId } }),
    client.bookPublication.findMany({ where: { contentId }, select: { id: true } }),
  ]);

  await client.content.update({
    where: { id: contentId },
    data: {
      consumeCount,
      favoriteCount,
      discussionCount,
      ratingDistribution: stats.ratingDistribution,
      totalRatingScore: stats.ratingCount > 0 ? stats.totalRatingScore : null,
      totalRatingVotes: stats.ratingCount,
    },
  });
  await recalculateBookPublicationAggregates(
    client,
    publications.map((publication) => publication.id),
  );
}

async function main(): Promise<void> {
  const staleBefore = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const invalidLogs = await prisma.userContentLog.findMany({
    where: { rating: 0 },
    select: { id: true, contentId: true },
  });
  const staleJobs = await prisma.importJob.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
      updatedAt: { lt: staleBefore },
    },
    select: { id: true, status: true, updatedAt: true },
  });
  const duplicateTmdbIds = await prisma.$queryRaw<
    Array<{ tmdb_id: number; content_type_id: number; count: bigint }>
  >`
    SELECT tmdb_id, content_type_id, COUNT(*)::bigint AS count
    FROM content
    WHERE tmdb_id IS NOT NULL AND is_deleted = false
    GROUP BY tmdb_id, content_type_id
    HAVING COUNT(*) > 1
  `;
  const duplicateIgdbIds = await prisma.$queryRaw<
    Array<{ igdb_id: number; content_type_id: number; count: bigint }>
  >`
    SELECT igdb_id, content_type_id, COUNT(*)::bigint AS count
    FROM content
    WHERE igdb_id IS NOT NULL AND is_deleted = false
    GROUP BY igdb_id, content_type_id
    HAVING COUNT(*) > 1
  `;
  const duplicateBookIsbns = await prisma.$queryRaw<
    Array<{ isbn: string; count: bigint }>
  >`
    SELECT isbn, COUNT(*)::bigint AS count
    FROM content
    WHERE isbn IS NOT NULL AND content_type_id = ${BOOK_CONTENT_TYPE_ID} AND is_deleted = false
    GROUP BY isbn
    HAVING COUNT(*) > 1
  `;

  console.log(
    `Mode: ${applyChanges ? "APPLY" : "REPORT ONLY"}${mergeDuplicates ? " + MERGE DUPLICATES" : ""}`,
  );
  console.log(`Invalid zero ratings: ${invalidLogs.length}`);
  console.log(`Stale import jobs: ${staleJobs.length}`);
  console.log(`Duplicate TMDB/type groups: ${duplicateTmdbIds.length}`);
  console.log(`Duplicate IGDB/type groups: ${duplicateIgdbIds.length}`);
  console.log(`Duplicate book ISBN groups: ${duplicateBookIsbns.length}`);

  if (duplicateTmdbIds.length > 0) {
    const duplicateRows = await prisma.content.findMany({
      where: {
        isDeleted: false,
        tmdbId: { in: duplicateTmdbIds.map((group) => group.tmdb_id) },
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        contentTypeId: true,
        createdAt: true,
        _count: {
          select: {
            userContentLogs: true,
            userContentPreferences: true,
            userListItems: true,
            featuredBy: true,
            discussions: true,
            images: true,
            people: true,
            genres: true,
            seasons: true,
            episodes: true,
            translations: true,
            editHistory: true,
          },
        },
      },
      orderBy: [{ tmdbId: "asc" }, { createdAt: "asc" }],
    });
    for (const row of duplicateRows) {
      console.log(
        `  ${row.tmdbId}/${row.contentTypeId}: ${row.id} | ${row.title} | ${row.createdAt.toISOString()} | ${JSON.stringify(row._count)}`,
      );
    }
  }

  if (!applyChanges) return;

  await prisma.$transaction(async (tx) => {
    if (invalidLogs.length > 0) {
      await tx.userContentLog.updateMany({
        where: { id: { in: invalidLogs.map((log) => log.id) } },
        data: { rating: null },
      });

      for (const contentId of new Set(invalidLogs.map((log) => log.contentId))) {
        await recalculateContentRating(tx, contentId);
      }
    }

    if (staleJobs.length > 0) {
      await tx.importJob.updateMany({
        where: { id: { in: staleJobs.map((job) => job.id) } },
        data: {
          status: "FAILED",
          errors: { push: "İçe aktarma işlemi zaman aşımı nedeniyle sonlandırıldı." },
        },
      });
    }

    if (mergeDuplicates && duplicateTmdbIds.length > 0) {
      const groups = await tx.content.findMany({
        where: {
          isDeleted: false,
          tmdbId: { in: duplicateTmdbIds.map((group) => group.tmdb_id) },
        },
        select: { id: true, tmdbId: true, contentTypeId: true, createdAt: true },
        orderBy: [{ tmdbId: "asc" }, { contentTypeId: "asc" }, { createdAt: "asc" }],
      });

      for (const group of duplicateTmdbIds) {
        const rows = groups.filter(
          (row) => row.tmdbId === group.tmdb_id && row.contentTypeId === group.content_type_id,
        );
        const [canonical, ...duplicates] = rows;
        if (!canonical) continue;
        for (const duplicate of duplicates) {
          await mergeDuplicateContent(tx, canonical.id, duplicate.id);
        }
        if (duplicates.length > 0) {
          await recalculateMergedContent(tx, canonical.id);
        }
      }
    }

    if (mergeDuplicates && duplicateBookIsbns.length > 0) {
      const groups = await tx.content.findMany({
        where: {
          contentTypeId: BOOK_CONTENT_TYPE_ID,
          isDeleted: false,
          isbn: { in: duplicateBookIsbns.map((group) => group.isbn) },
        },
        select: { id: true, isbn: true, createdAt: true },
        orderBy: [{ isbn: "asc" }, { createdAt: "asc" }],
      });

      for (const group of duplicateBookIsbns) {
        const rows = groups.filter((row) => row.isbn === group.isbn);
        const [canonical, ...duplicates] = rows;
        if (!canonical) continue;
        for (const duplicate of duplicates) {
          await mergeDuplicateContent(tx, canonical.id, duplicate.id);
        }
        if (duplicates.length > 0) {
          await recalculateMergedContent(tx, canonical.id);
        }
      }
    }
  });

  console.log("Applied rating normalization and stale-job recovery.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
