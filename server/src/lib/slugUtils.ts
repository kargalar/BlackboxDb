import { PrismaClient } from "@prisma/client";

/**
 * Converts a title string to a URL-friendly slug.
 * Handles Turkish characters, special characters, and whitespace.
 *
 * Examples:
 *   "The Matrix"        → "the-matrix"
 *   "Yüzüklerin Efendisi" → "yuzuklerin-efendisi"
 *   "Grand Theft Auto V" → "grand-theft-auto-v"
 *   "Wall·E"             → "wall-e"
 */
export function slugify(title: string): string {
  // Turkish character map
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  let slug = title.toLowerCase();

  // Replace Turkish characters
  for (const [from, to] of Object.entries(trMap)) {
    slug = slug.replace(new RegExp(from, "g"), to);
  }

  // Normalize unicode (e.g., accented chars like é → e)
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace non-alphanumeric characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, "-");

  // Remove leading/trailing hyphens & collapse multiple hyphens
  slug = slug.replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");

  // Limit length to prevent overly long slugs
  if (slug.length > 100) {
    slug = slug.substring(0, 100).replace(/-+$/, "");
  }

  return slug || "content";
}

/**
 * Generates a unique content slug/ID based on the title.
 *
 * Strategy:
 *  1. Try just the slugified title: "the-matrix"
 *  2. If taken, try title + release year: "the-matrix-1999"
 *  3. If still taken, append a random suffix: "the-matrix-1999-a7x3"
 */
export async function generateContentSlug(
  prisma: PrismaClient,
  title: string,
  releaseDate?: string | null,
): Promise<string> {
  const baseSlug = slugify(title);

  // 1. Try base slug
  const exists1 = await prisma.content.findUnique({
    where: { id: baseSlug },
    select: { id: true },
  });
  if (!exists1) return baseSlug;

  // 2. Try slug + year
  if (releaseDate) {
    const year = new Date(releaseDate).getFullYear();
    if (!isNaN(year)) {
      const slugWithYear = `${baseSlug}-${year}`;
      const exists2 = await prisma.content.findUnique({
        where: { id: slugWithYear },
        select: { id: true },
      });
      if (!exists2) return slugWithYear;
    }
  }

  // 3. Append random suffix (retry until unique)
  for (let i = 0; i < 10; i++) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slugWithRandom = `${baseSlug}-${randomSuffix}`;
    const exists3 = await prisma.content.findUnique({
      where: { id: slugWithRandom },
      select: { id: true },
    });
    if (!exists3) return slugWithRandom;
  }

  // Extremely unlikely fallback
  return `${baseSlug}-${Date.now()}`;
}

/**
 * Generates a unique person slug/ID based on the name.
 *
 * Strategy:
 *  1. Try just the slugified name: "keanu-reeves"
 *  2. If taken, append a random suffix: "keanu-reeves-a7x3"
 */
export async function generatePersonSlug(
  prisma: PrismaClient,
  name: string,
): Promise<string> {
  const baseSlug = slugify(name);

  // 1. Try base slug
  const exists1 = await prisma.person.findUnique({
    where: { id: baseSlug },
    select: { id: true },
  });
  if (!exists1) return baseSlug;

  // 2. Append random suffix (retry until unique)
  for (let i = 0; i < 10; i++) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slugWithRandom = `${baseSlug}-${randomSuffix}`;
    const exists2 = await prisma.person.findUnique({
      where: { id: slugWithRandom },
      select: { id: true },
    });
    if (!exists2) return slugWithRandom;
  }

  return `${baseSlug}-${Date.now()}`;
}

/**
 * Generates a unique company slug/ID based on the name.
 *
 * Strategy:
 *  1. Try just the slugified name: "naughty-dog"
 *  2. If taken, append a random suffix: "naughty-dog-a7x3"
 */
export async function generateCompanySlug(
  prisma: PrismaClient,
  name: string,
): Promise<string> {
  const baseSlug = slugify(name);

  // 1. Try base slug
  const exists1 = await prisma.company.findUnique({
    where: { id: baseSlug },
    select: { id: true },
  });
  if (!exists1) return baseSlug;

  // 2. Append random suffix (retry until unique)
  for (let i = 0; i < 10; i++) {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slugWithRandom = `${baseSlug}-${randomSuffix}`;
    const exists2 = await prisma.company.findUnique({
      where: { id: slugWithRandom },
      select: { id: true },
    });
    if (!exists2) return slugWithRandom;
  }

  return `${baseSlug}-${Date.now()}`;
}
