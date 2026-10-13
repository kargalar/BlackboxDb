import "dotenv/config";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { uploadToBunny, type UploadPreset } from "../lib/bunny";

const prisma = new PrismaClient();
const APPLY_CHANGES = process.argv.includes("--apply");
const CLOUDINARY_HOST = "res.cloudinary.com";
const MAX_CONCURRENT_MIGRATIONS = 5;

type ImageRecord = {
  id: string | number;
  url: string | null;
  preset: UploadPreset;
  update: (url: string) => Promise<unknown>;
};

function isCloudinaryUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === CLOUDINARY_HOST;
  } catch {
    return false;
  }
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cloudinary download failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim();
  if (!contentType?.startsWith("image/")) {
    throw new Error(`Unexpected image content type: ${contentType || "missing"}`);
  }

  return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
}

async function verifyBunnyCopy(url: string, sourceHash: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Bunny verification failed (${response.status})`);
  }

  const bunnyHash = sha256(Buffer.from(await response.arrayBuffer()));
  if (bunnyHash !== sourceHash) {
    throw new Error("Bunny copy does not match the Cloudinary source; database was not updated");
  }
}

async function collectRecords(): Promise<ImageRecord[]> {
  const records: ImageRecord[] = [];

  const users = await prisma.appUser.findMany({
    where: { OR: [{ picturePath: { contains: CLOUDINARY_HOST } }, { coverPhotoUrl: { contains: CLOUDINARY_HOST } }] },
    select: { id: true, picturePath: true, coverPhotoUrl: true },
  });
  for (const row of users) {
    if (isCloudinaryUrl(row.picturePath)) records.push({ id: `${row.id}:picture`, url: row.picturePath, preset: "profile", update: (url) => prisma.appUser.update({ where: { id: row.id }, data: { picturePath: url } }) });
    if (isCloudinaryUrl(row.coverPhotoUrl)) records.push({ id: `${row.id}:cover`, url: row.coverPhotoUrl, preset: "covers", update: (url) => prisma.appUser.update({ where: { id: row.id }, data: { coverPhotoUrl: url } }) });
  }

  const people = await prisma.person.findMany({ where: { profileUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, profileUrl: true } });
  for (const row of people) if (isCloudinaryUrl(row.profileUrl)) records.push({ id: row.id, url: row.profileUrl, preset: "person", update: (url) => prisma.person.update({ where: { id: row.id }, data: { profileUrl: url } }) });

  const companies = await prisma.company.findMany({ where: { logoUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, logoUrl: true } });
  for (const row of companies) if (isCloudinaryUrl(row.logoUrl)) records.push({ id: row.id, url: row.logoUrl, preset: "company", update: (url) => prisma.company.update({ where: { id: row.id }, data: { logoUrl: url } }) });

  const citations = await prisma.contentCitation.findMany({ where: { imageUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, imageUrl: true } });
  for (const row of citations) if (isCloudinaryUrl(row.imageUrl)) records.push({ id: row.id, url: row.imageUrl, preset: "screenshot", update: (url) => prisma.contentCitation.update({ where: { id: row.id }, data: { imageUrl: url } }) });

  const images = await prisma.contentImage.findMany({ where: { filePath: { contains: CLOUDINARY_HOST } }, select: { id: true, contentId: true, type: true, filePath: true } });
  for (const row of images) if (isCloudinaryUrl(row.filePath)) records.push({ id: row.id, url: row.filePath, preset: row.type === "poster" || row.type === "backdrop" || row.type === "screenshot" ? row.type : "screenshot", update: (url) => prisma.contentImage.update({ where: { id: row.id }, data: { filePath: url } }) });

  const screenshots = await prisma.contentScreenshot.findMany({ where: { imageUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, imageUrl: true } });
  for (const row of screenshots) if (isCloudinaryUrl(row.imageUrl)) records.push({ id: row.id, url: row.imageUrl, preset: "screenshot", update: (url) => prisma.contentScreenshot.update({ where: { id: row.id }, data: { imageUrl: url } }) });

  const seasons = await prisma.tvSeason.findMany({ where: { posterUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, posterUrl: true } });
  for (const row of seasons) if (isCloudinaryUrl(row.posterUrl)) records.push({ id: row.id, url: row.posterUrl, preset: "seasonPoster", update: (url) => prisma.tvSeason.update({ where: { id: row.id }, data: { posterUrl: url } }) });

  const episodes = await prisma.tvEpisode.findMany({ where: { stillUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, stillUrl: true } });
  for (const row of episodes) if (isCloudinaryUrl(row.stillUrl)) records.push({ id: row.id, url: row.stillUrl, preset: "episodeStill", update: (url) => prisma.tvEpisode.update({ where: { id: row.id }, data: { stillUrl: url } }) });

  const expansions = await prisma.expansion.findMany({ where: { posterUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, posterUrl: true } });
  for (const row of expansions) if (isCloudinaryUrl(row.posterUrl)) records.push({ id: row.id, url: row.posterUrl, preset: "expansion", update: (url) => prisma.expansion.update({ where: { id: row.id }, data: { posterUrl: url } }) });

  const publications = await prisma.bookPublication.findMany({ where: { coverUrl: { contains: CLOUDINARY_HOST } }, select: { id: true, coverUrl: true } });
  for (const row of publications) if (isCloudinaryUrl(row.coverUrl)) records.push({ id: row.id, url: row.coverUrl, preset: "covers", update: (url) => prisma.bookPublication.update({ where: { id: row.id }, data: { coverUrl: url } }) });

  return records;
}

async function main(): Promise<void> {
  const records = await collectRecords();
  const migratedUrls = new Map<string, Promise<string>>();
  let migrated = 0;
  let failed = 0;

  console.log(`Found ${records.length} Cloudinary image references.`);
  console.log(APPLY_CHANGES ? "Apply mode: uploads and database updates enabled." : "Dry run: no uploads or database updates. Pass --apply to migrate.");

  if (!APPLY_CHANGES) {
    const countsByPreset = new Map<UploadPreset, number>();
    for (const record of records) {
      countsByPreset.set(record.preset, (countsByPreset.get(record.preset) || 0) + 1);
    }
    for (const [preset, count] of countsByPreset) console.log(`  ${preset}: ${count}`);
    for (const record of records.slice(0, 10)) console.log(`Sample ${record.id}: ${record.url}`);
    if (records.length > 10) console.log(`...and ${records.length - 10} more references.`);
    return;
  }

  async function getBunnyUrl(record: ImageRecord): Promise<string> {
    if (!record.url) throw new Error("Missing Cloudinary URL");

    let migration = migratedUrls.get(record.url);
    if (!migration) {
      migration = (async () => {
        const { buffer } = await fetchImage(record.url!);
        const sourceHash = sha256(buffer);
        const upload = await uploadToBunny(buffer, record.preset);
        await verifyBunnyCopy(upload.url, sourceHash);

        // Keep Cloudinary transformations and focus metadata intact where present.
        const original = new URL(record.url!);
        const uploaded = new URL(upload.url);
        if (original.hash) uploaded.hash = original.hash;
        return uploaded.toString();
      })();
      migratedUrls.set(record.url, migration);
    }

    return migration;
  }

  let nextRecordIndex = 0;
  async function migrateNextRecord(): Promise<void> {
    while (nextRecordIndex < records.length) {
      const record = records[nextRecordIndex++];

      try {
        await record.update(await getBunnyUrl(record));
        migrated += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed ${record.id}: ${error instanceof Error ? error.message : error}`);
      }

      const completed = migrated + failed;
      if (completed % 100 === 0 || completed === records.length) {
        console.log(`Progress: ${completed}/${records.length} references processed (${migrated} migrated, ${failed} failed).`);
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_MIGRATIONS, records.length);
  await Promise.all(Array.from({ length: workerCount }, () => migrateNextRecord()));

  console.log(`Finished: ${migrated} references updated, ${failed} failed, ${records.length - migrated - failed} remaining.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Cloudinary to Bunny migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
