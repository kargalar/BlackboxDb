import { Prisma, PrismaClient } from "@prisma/client";
import { Content } from "../types/Content";
import { SaveContentInput } from "../types/SaveContentInput";
import { inferNormalizedContentStatus } from "../lib/contentStatus";
import { generateContentSlug, slugify } from "../lib/slugUtils";
import { convertContentForGraphQL } from "../resolvers/content/ContentUtils";
import { localizeContentImage, type ContentImageKind } from "../lib/localContentImage";

const CONTENT_TYPE_MOVIE = 1;
const CONTENT_TYPE_TV = 2;
const CONTENT_TYPE_GAME = 3;
const CONTENT_TYPE_BOOK = 4;
const MAX_RAW_DATA_LENGTH = 1_000_000;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
type RawContent = Record<string, any>;

const contentInclude = {
  contentType: true,
  franchise: { select: { id: true, name: true } },
  images: {
    where: { type: { in: ["poster", "backdrop"] } },
    select: {
      id: true,
      type: true,
      version: true,
      filePath: true,
      upvoteCount: true,
      downvoteCount: true,
    },
  },
  bookPublications: { include: { publisher: true } },
} satisfies Prisma.ContentInclude;

function parseRawData(rawData?: string): RawContent {
  if (!rawData) return {};
  if (rawData.length > MAX_RAW_DATA_LENGTH) {
    throw new Error("External content payload is too large");
  }

  try {
    const parsed = JSON.parse(rawData);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    throw new Error("External content payload is invalid JSON");
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPositiveInt(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function firstValue(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function readBookValue(raw: RawContent, key: string): unknown {
  return firstValue(raw[key], raw.volumeInfo?.[key]);
}

function normalizeImageUrl(value: unknown, provider: "tmdb" | "igdb" | "book"): string | null {
  const rawValue = asString(value);
  if (!rawValue) return null;
  if (/^https?:\/\//i.test(rawValue)) return rawValue.replace(/^http:\/\//i, "https://");

  if (provider === "tmdb" && rawValue.startsWith("/")) {
    return `https://image.tmdb.org/t/p/original${rawValue}`;
  }
  if (provider === "igdb" && rawValue) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${rawValue}.jpg`;
  }
  if (provider === "book" && rawValue) {
    return `https://${rawValue.replace(/^https?:\/\//i, "")}`;
  }

  return rawValue;
}

function getExternalId(input: SaveContentInput): number | null {
  if (![CONTENT_TYPE_MOVIE, CONTENT_TYPE_TV, CONTENT_TYPE_GAME].includes(input.contentTypeId)) {
    return null;
  }

  const externalId = Number(input.id);
  if (!Number.isSafeInteger(externalId) || externalId <= 0) {
    throw new Error("External content id must be a positive integer");
  }
  return externalId;
}

async function findExistingContent(
  prisma: DatabaseClient,
  input: SaveContentInput,
): Promise<any | null> {
  const externalId = getExternalId(input);
  const where: Prisma.ContentWhereInput = {
    contentTypeId: input.contentTypeId,
    isDeleted: false,
  };

  if (input.contentTypeId === CONTENT_TYPE_MOVIE || input.contentTypeId === CONTENT_TYPE_TV) {
    where.tmdbId = externalId;
  } else if (input.contentTypeId === CONTENT_TYPE_GAME) {
    where.igdbId = externalId;
  } else {
    const directMatch = await prisma.content.findFirst({
      where: { id: input.id.trim(), ...where },
      include: contentInclude,
    });
    if (directMatch) return directMatch;

    where.id = `book-${slugify(input.id)}`;
  }

  return prisma.content.findFirst({ where, include: contentInclude });
}

async function generateStableId(
  prisma: PrismaClient,
  input: SaveContentInput,
): Promise<string> {
  if (input.contentTypeId === CONTENT_TYPE_BOOK) {
    const stableId = `book-${slugify(input.id)}`;
    const existing = await prisma.content.findUnique({
      where: { id: stableId },
      select: { id: true, contentTypeId: true },
    });
    if (!existing || existing.contentTypeId === input.contentTypeId) return stableId;
  }

  return generateContentSlug(prisma, input.title, input.releaseDate);
}

function normalizeExternalData(input: SaveContentInput, raw: RawContent) {
  const isTv = input.contentTypeId === CONTENT_TYPE_TV;
  const isBook = input.contentTypeId === CONTENT_TYPE_BOOK;
  const releaseDate = asDate(
    firstValue(
      input.releaseDate,
      isTv ? raw.first_air_date : isBook ? readBookValue(raw, "publishedDate") : raw.release_date,
    ),
  );
  const firstAirDate = asDate(firstValue(raw.first_air_date, input.releaseDate));
  const lastAirDate = asDate(raw.last_air_date);
  const inProduction = typeof raw.in_production === "boolean" ? raw.in_production : null;
  const status = inferNormalizedContentStatus({
    contentTypeId: input.contentTypeId,
    releaseDate,
    firstAirDate,
    lastAirDate,
    inProduction,
  });

  const isbn = asString(
    firstValue(
      input.isbn,
      isBook ? readBookValue(raw, "isbn") : undefined,
      raw.volumeInfo?.industryIdentifiers?.find((item: any) => item?.type === "ISBN_13")?.identifier,
      raw.volumeInfo?.industryIdentifiers?.[0]?.identifier,
    ),
  );
  const rawAuthors = isBook ? firstValue(readBookValue(raw, "authors"), raw.authors) : undefined;
  const authors = asStringArray(rawAuthors);
  const languages = Array.from(
    new Set(
      [
        raw.original_language,
        ...(Array.isArray(raw.spoken_languages)
          ? raw.spoken_languages.map((item: any) => item?.iso_639_1 || item?.language)
          : []),
        isBook ? readBookValue(raw, "language") : undefined,
      ].filter((value): value is string => typeof value === "string" && Boolean(value.trim())),
    ),
  );

  return {
    releaseDate,
    firstAirDate: isTv ? firstAirDate : null,
    lastAirDate: isTv ? lastAirDate : null,
    inProduction: isTv ? inProduction : null,
    status,
    isbn,
    authors,
    languages,
    pageCount: isBook ? asPositiveInt(readBookValue(raw, "pageCount")) : null,
    previewLink: isBook ? asString(readBookValue(raw, "previewLink")) : null,
    infoLink: isBook ? asString(readBookValue(raw, "infoLink")) : null,
    canonicalVolumeLink: isBook ? asString(readBookValue(raw, "canonicalVolumeLink")) : null,
    numberOfEpisodes: isTv ? asPositiveInt(raw.number_of_episodes) : null,
    numberOfSeasons: isTv ? asPositiveInt(raw.number_of_seasons) : null,
    tvType: isTv ? asString(raw.type) : null,
    seasonsData: isTv && Array.isArray(raw.seasons) ? JSON.stringify(raw.seasons) : null,
    spotifyPlaylistUrl: asString(input.spotifyPlaylistUrl || raw.spotifyPlaylistUrl),
  };
}

function getImageRecords(input: SaveContentInput, raw: RawContent) {
  const records: Array<{ type: string; filePath: string }> = [];
  const add = (type: string, filePath: string | null) => {
    if (filePath && !records.some((record) => record.type === type && record.filePath === filePath)) {
      records.push({ type, filePath });
    }
  };

  if (input.contentTypeId === CONTENT_TYPE_MOVIE || input.contentTypeId === CONTENT_TYPE_TV) {
    add("poster", normalizeImageUrl(firstValue(raw.poster_path, raw.posterUrl), "tmdb"));
    add("backdrop", normalizeImageUrl(firstValue(raw.backdrop_path, raw.backdropUrl), "tmdb"));
  } else if (input.contentTypeId === CONTENT_TYPE_GAME) {
    add("poster", normalizeImageUrl(raw.cover?.image_id || raw.cover?.url, "igdb"));
    add("backdrop", normalizeImageUrl(raw.screenshots?.[0]?.image_id, "igdb"));
  } else if (input.contentTypeId === CONTENT_TYPE_BOOK) {
    add("poster", normalizeImageUrl(readBookValue(raw, "thumbnail"), "book"));
  }

  return records;
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function saveExternalContent(
  prisma: PrismaClient,
  input: SaveContentInput,
): Promise<Content> {
  const normalizedTitle = input.title.trim();
  if (!normalizedTitle) throw new Error("Content title is required");
  if (![CONTENT_TYPE_MOVIE, CONTENT_TYPE_TV, CONTENT_TYPE_GAME, CONTENT_TYPE_BOOK].includes(input.contentTypeId)) {
    throw new Error("Unsupported content type");
  }

  const existing = await findExistingContent(prisma, input);
  if (existing) return convertContentForGraphQL(existing) as Content;

  const raw = parseRawData(input.rawData);
  const normalized = normalizeExternalData(input, raw);
  const id = await generateStableId(prisma, input);
  const externalId = getExternalId(input);
  const imageRecords = await Promise.all(
    getImageRecords(input, raw).map(async (record) => ({
      ...record,
      filePath:
        record.type === "poster" || record.type === "backdrop"
          ? await localizeContentImage(
              record.filePath,
              id,
              record.type as ContentImageKind,
            )
          : record.filePath,
    })),
  );
  const bookTitle = input.contentTypeId === CONTENT_TYPE_BOOK ? normalizedTitle : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const content = await tx.content.create({
        data: {
          id,
          title: normalizedTitle,
          originalTitle: asString(firstValue(input.originalTitle, raw.original_title, raw.original_name)),
          tmdbId:
            input.contentTypeId === CONTENT_TYPE_MOVIE || input.contentTypeId === CONTENT_TYPE_TV
              ? externalId
              : null,
          igdbId: input.contentTypeId === CONTENT_TYPE_GAME ? externalId : null,
          contentType: { connect: { id: input.contentTypeId } },
          releaseDate: normalized.releaseDate,
          description: asString(firstValue(input.description, raw.overview, raw.description)),
          status: normalized.status,
          runtime: asPositiveInt(firstValue(input.runtime, raw.runtime)),
          isbn: normalized.isbn,
          pageCount: normalized.pageCount,
          isContinuing: false,
          languages: normalized.languages,
          authors: normalized.authors,
          previewLink: normalized.previewLink,
          infoLink: normalized.infoLink,
          canonicalVolumeLink: normalized.canonicalVolumeLink,
          firstAirDate: normalized.firstAirDate,
          lastAirDate: normalized.lastAirDate,
          inProduction: normalized.inProduction,
          numberOfEpisodes: normalized.numberOfEpisodes,
          numberOfSeasons: normalized.numberOfSeasons,
          tvType: normalized.tvType,
          seasonsData: normalized.seasonsData,
          spotifyPlaylistUrl: normalized.spotifyPlaylistUrl,
          images: imageRecords.length ? { create: imageRecords } : undefined,
          bookPublications: bookTitle
            ? {
                create: {
                  title: bookTitle,
                  isbn: normalized.isbn,
                  pageCount: normalized.pageCount,
                  publishedDate: normalized.releaseDate
                    ? normalized.releaseDate.toISOString().slice(0, 10)
                    : null,
                  coverUrl: imageRecords.find((record) => record.type === "poster")?.filePath || null,
                  isOriginal: true,
                },
              }
            : undefined,
        },
        include: contentInclude,
      });

      return content;
    });

    return convertContentForGraphQL(created) as Content;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const concurrentContent = await findExistingContent(prisma, input);
      if (concurrentContent) return convertContentForGraphQL(concurrentContent) as Content;
    }
    throw error;
  }
}
