import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchTmdbProductionCompanies } from "../lib/tmdbFetcher";
import { linkCompanies } from "../resolvers/admin/AdminContentHelpers";

/**
 * Veritabanındaki tüm film ve diziler için TMDB'den stüdyo (production company) bilgilerini çeker
 * ve ContentCompany tablosuna kaydeder.
 *
 * Kullanım:
 *   npx tsx src/scripts/backfillMovieTvStudios.ts
 *   npx tsx src/scripts/backfillMovieTvStudios.ts --dry-run
 *   npx tsx src/scripts/backfillMovieTvStudios.ts --movies          # sadece filmler
 *   npx tsx src/scripts/backfillMovieTvStudios.ts --tv              # sadece diziler
 *   npx tsx src/scripts/backfillMovieTvStudios.ts --limit=50
 *   npx tsx src/scripts/backfillMovieTvStudios.ts --preserve-existing
 */

const prisma = new PrismaClient();

const STUDIO_ROLE_ID = 6; // "moviestudio" company role

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getNumericArg(prefix: string): number | null {
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) return null;
  const parsed = Number(value.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : null;
}

async function delay(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type ContentTarget = {
  id: string;
  title: string;
  tmdbId: number | null;
  contentTypeId: number;
  hasCompanies: boolean;
};

async function backfillStudios(
  contents: ContentTarget[],
  type: "movie" | "tv",
  options: { dryRun: boolean; preserveExisting: boolean; limit: number | null },
) {
  const targets = options.limit ? contents.slice(0, options.limit) : contents;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const label = type === "movie" ? "Film" : "Dizi";
  console.log(`\nFound ${targets.length} ${label.toLowerCase()}s to process for studio backfill.`);

  for (let i = 0; i < targets.length; i++) {
    const content = targets[i];
    console.log(
      `\n[${label} ${i + 1}/${targets.length}] ${content.title} (id=${content.id}, tmdbId=${content.tmdbId})`,
    );

    try {
      if (!content.tmdbId) {
        skipped++;
        console.log("  Skipped: no tmdbId");
        continue;
      }

      if (options.preserveExisting && content.hasCompanies) {
        skipped++;
        console.log("  Skipped: preserve-existing enabled and content already has companies");
        continue;
      }

      const companies = await fetchTmdbProductionCompanies(content.tmdbId, type);

      if (!companies || companies.length === 0) {
        skipped++;
        console.log("  Skipped: no production companies found on TMDB");
        continue;
      }

      if (!options.dryRun) {
        // Mevcut stüdyo ilişkilerini temizle (sadece moviestudio rolü olanları)
        await prisma.contentCompany.deleteMany({
          where: {
            contentId: content.id,
            companyRoleId: STUDIO_ROLE_ID,
          },
        });

        await linkCompanies(
          prisma,
          content.id,
          companies.map((company) => ({
            name: company.name,
            logoUrl: company.logoPath,
            companyRoleId: STUDIO_ROLE_ID,
          })),
        );
      }

      updated++;
      console.log(
        `  Updated studios -> ${companies.map((c) => c.name).join(", ")}`,
      );
    } catch (error: any) {
      failed++;
      console.error(`  Failed: ${error?.message || error}`);
    }

    // TMDB rate limit: ~40 req/sec, be conservative
    await delay(120);
  }

  return { updated, skipped, failed, processed: targets.length };
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const preserveExisting = hasFlag("--preserve-existing");
  const moviesOnly = hasFlag("--movies");
  const tvOnly = hasFlag("--tv");
  const limit = getNumericArg("--limit=");

  const includeMovies = moviesOnly || !tvOnly;
  const includeTv = tvOnly || !moviesOnly;

  console.log("Starting movie/TV studio backfill...");
  console.log(
    `Options: dryRun=${dryRun}, preserveExisting=${preserveExisting}, includeMovies=${includeMovies}, includeTv=${includeTv}, limit=${limit ?? "none"}`,
  );

  const summary = {
    movies: { processed: 0, updated: 0, skipped: 0, failed: 0 },
    tv: { processed: 0, updated: 0, skipped: 0, failed: 0 },
  };

  if (includeMovies) {
    const movies = await prisma.content.findMany({
      where: {
        contentTypeId: 1,
        tmdbId: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        contentTypeId: true,
        companies: {
          where: { companyRoleId: STUDIO_ROLE_ID },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const targets: ContentTarget[] = movies.map((m) => ({
      id: m.id,
      title: m.title,
      tmdbId: m.tmdbId,
      contentTypeId: m.contentTypeId,
      hasCompanies: m.companies.length > 0,
    }));

    summary.movies = await backfillStudios(targets, "movie", {
      dryRun,
      preserveExisting,
      limit,
    });
  }

  if (includeTv) {
    const tvShows = await prisma.content.findMany({
      where: {
        contentTypeId: 2,
        tmdbId: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        contentTypeId: true,
        companies: {
          where: { companyRoleId: STUDIO_ROLE_ID },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const targets: ContentTarget[] = tvShows.map((t) => ({
      id: t.id,
      title: t.title,
      tmdbId: t.tmdbId,
      contentTypeId: t.contentTypeId,
      hasCompanies: t.companies.length > 0,
    }));

    summary.tv = await backfillStudios(targets, "tv", {
      dryRun,
      preserveExisting,
      limit,
    });
  }

  console.log("\n========================================");
  console.log("Studio backfill completed.");
  console.log(
    `Movies -> processed=${summary.movies.processed}, updated=${summary.movies.updated}, skipped=${summary.movies.skipped}, failed=${summary.movies.failed}`,
  );
  console.log(
    `TV     -> processed=${summary.tv.processed}, updated=${summary.tv.updated}, skipped=${summary.tv.skipped}, failed=${summary.tv.failed}`,
  );
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
