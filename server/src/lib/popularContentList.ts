import fs from "fs";
import path from "path";

export type PopularContentSource = "letterboxd" | "tmdb" | "imdb" | "igdb";
export type PopularContentMediaType = "movie" | "tv" | "game";

export interface PopularContentListItem {
  rank: number;
  source: PopularContentSource;
  mediaType: PopularContentMediaType;
  title: string;
  year?: number | null;
  sourceId?: string | null;
  sourceUrl?: string | null;
  score?: number | null;
}

export const POPULAR_CONTENT_LIST_HEADER = [
  "rank",
  "source",
  "mediaType",
  "title",
  "year",
  "sourceId",
  "sourceUrl",
  "score",
] as const;

function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\t\r\n]+/g, " ").trim();
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDefaultPopularListDir(): string {
  return path.resolve(__dirname, "../../../admin import/popular");
}

export function popularListFileName(source: PopularContentSource): string {
  return `${source}-popular.txt`;
}

export function writePopularList(filePath: string, items: PopularContentListItem[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const lines = [
    POPULAR_CONTENT_LIST_HEADER.join("\t"),
    ...items.map((item, index) =>
      [
        item.rank || index + 1,
        item.source,
        item.mediaType,
        item.title,
        item.year ?? "",
        item.sourceId ?? "",
        item.sourceUrl ?? "",
        item.score ?? "",
      ]
        .map(cleanCell)
        .join("\t"),
    ),
  ];

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

export function readPopularList(filePath: string): PopularContentListItem[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) return [];

  const header = lines[0].split("\t").map((h) => h.trim());
  const hasHeader = POPULAR_CONTENT_LIST_HEADER.every((name) => header.includes(name));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  if (!hasHeader) {
    return dataLines.map((line, index) => ({
      rank: index + 1,
      source: "tmdb",
      mediaType: "movie",
      title: line.trim(),
    }));
  }

  const indexOf = (name: string) => header.indexOf(name);

  return dataLines
    .map((line, index) => {
      const columns = line.split("\t").map((c) => c.trim());
      const source = columns[indexOf("source")] as PopularContentSource;
      const mediaType = columns[indexOf("mediaType")] as PopularContentMediaType;
      const title = columns[indexOf("title")] || "";

      if (!title || !source || !mediaType) return null;

      return {
        rank: parseOptionalNumber(columns[indexOf("rank")] || "") || index + 1,
        source,
        mediaType,
        title,
        year: parseOptionalNumber(columns[indexOf("year")] || ""),
        sourceId: columns[indexOf("sourceId")] || null,
        sourceUrl: columns[indexOf("sourceUrl")] || null,
        score: parseOptionalNumber(columns[indexOf("score")] || ""),
      };
    })
    .filter(Boolean) as PopularContentListItem[];
}

export function dedupePopularListItems(
  items: PopularContentListItem[],
): PopularContentListItem[] {
  const seen = new Set<string>();
  const deduped: PopularContentListItem[] = [];

  for (const item of items) {
    const key = item.sourceId
      ? `${item.source}:${item.mediaType}:${item.sourceId}`
      : `${item.source}:${item.mediaType}:${item.title.toLowerCase()}:${item.year || ""}`;

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...item, rank: deduped.length + 1 });
  }

  return deduped;
}
