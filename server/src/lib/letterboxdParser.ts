import { parse } from "csv-parse/sync";
import { logger } from "./logger";

/**
 * Letterboxd CSV Parser
 * Letterboxd export ZIP'inden çıkarılmış CSV dosyalarını parse eder.
 */

// ─── Parsed types ───

export interface LetterboxdDiaryEntry {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
  rating: number | null;
  rewatch: boolean;
  tags: string[];
  watchedDate: string;
}

export interface LetterboxdRating {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
  rating: number;
}

export interface LetterboxdReview {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
  rating: number | null;
  rewatch: boolean;
  review: string;
  tags: string[];
  watchedDate: string;
}

export interface LetterboxdWatchedItem {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
}

export interface LetterboxdWatchlistItem {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
}

export interface LetterboxdLikedItem {
  date: string;
  name: string;
  year: number | null;
  letterboxdUri: string;
}

export interface LetterboxdListItem {
  position: number;
  name: string;
  year: number | null;
  url: string;
  description: string;
}

export interface LetterboxdList {
  name: string;
  description: string;
  items: LetterboxdListItem[];
}

export interface LetterboxdImportData {
  diary: LetterboxdDiaryEntry[];
  ratings: LetterboxdRating[];
  reviews: LetterboxdReview[];
  watched: LetterboxdWatchedItem[];
  watchlist: LetterboxdWatchlistItem[];
  liked: LetterboxdLikedItem[];
  lists: LetterboxdList[];
}

// ─── Parse helpers ───

function parseYear(yearStr: string): number | null {
  const year = parseInt(yearStr, 10);
  return isNaN(year) ? null : year;
}

function parseRating(ratingStr: string): number | null {
  if (!ratingStr || ratingStr.trim() === "") return null;
  const rating = parseFloat(ratingStr);
  return isNaN(rating) ? null : Math.round(rating * 2);
}

function parseTags(tagsStr: string): string[] {
  if (!tagsStr || tagsStr.trim() === "") return [];
  return tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ─── CSV Parsers ───

export function parseDiaryCsv(csvContent: string): LetterboxdDiaryEntry[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    return records.map((row: any) => ({
      date: row["Date"] || "",
      name: row["Name"] || "",
      year: parseYear(row["Year"]),
      letterboxdUri: row["Letterboxd URI"] || "",
      rating: parseRating(row["Rating"]),
      rewatch: (row["Rewatch"] || "").toLowerCase() === "yes",
      tags: parseTags(row["Tags"]),
      watchedDate: row["Watched Date"] || "",
    }));
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing diary.csv:", error);
    return [];
  }
}

export function parseRatingsCsv(csvContent: string): LetterboxdRating[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    return records
      .map((row: any) => ({
        date: row["Date"] || "",
        name: row["Name"] || "",
        year: parseYear(row["Year"]),
        letterboxdUri: row["Letterboxd URI"] || "",
        rating: parseRating(row["Rating"]),
      }))
      .filter((r: any) => r.rating !== null) as LetterboxdRating[];
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing ratings.csv:", error);
    return [];
  }
}

export function parseReviewsCsv(csvContent: string): LetterboxdReview[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    return records
      .map((row: any) => ({
        date: row["Date"] || "",
        name: row["Name"] || "",
        year: parseYear(row["Year"]),
        letterboxdUri: row["Letterboxd URI"] || "",
        rating: parseRating(row["Rating"]),
        rewatch: (row["Rewatch"] || "").toLowerCase() === "yes",
        review: row["Review"] || "",
        tags: parseTags(row["Tags"]),
        watchedDate: row["Watched Date"] || "",
      }))
      .filter(
        (r: any) => r.review && r.review.trim().length > 0,
      ) as LetterboxdReview[];
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing reviews.csv:", error);
    return [];
  }
}

export function parseWatchedCsv(csvContent: string): LetterboxdWatchedItem[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    return records.map((row: any) => ({
      date: row["Date"] || "",
      name: row["Name"] || "",
      year: parseYear(row["Year"]),
      letterboxdUri: row["Letterboxd URI"] || "",
    }));
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing watched.csv:", error);
    return [];
  }
}

export function parseLikedCsv(csvContent: string): LetterboxdLikedItem[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    return records.map((row: any) => ({
      date: row["Date"] || "",
      name: row["Name"] || "",
      year: parseYear(row["Year"]),
      letterboxdUri: row["Letterboxd URI"] || "",
    }));
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing liked.csv:", error);
    return [];
  }
}

export function parseWatchlistCsv(
  csvContent: string,
): LetterboxdWatchlistItem[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    return records.map((row: any) => ({
      date: row["Date"] || "",
      name: row["Name"] || "",
      year: parseYear(row["Year"]),
      letterboxdUri: row["Letterboxd URI"] || "",
    }));
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing watchlist.csv:", error);
    return [];
  }
}

export function parseListCsv(csvContent: string): LetterboxdListItem[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    return records.map((row: any) => ({
      position: parseInt(row["Position"] || "0", 10) || 0,
      name: row["Name"] || "",
      year: parseYear(row["Year"]),
      url: row["URL"] || "",
      description: row["Description"] || "",
    }));
  } catch (error) {
    logger.error("[LetterboxdParser] Error parsing list CSV:", error);
    return [];
  }
}

/**
 * Tüm CSV string'lerini alır ve birleştirilmiş import data döner
 */
export function parseAllLetterboxdData(csvData: {
  diary?: string;
  ratings?: string;
  reviews?: string;
  watched?: string;
  watchlist?: string;
  liked?: string;
  lists?: { name: string; csv: string }[];
}): LetterboxdImportData {
  logger.info("[LetterboxdParser] Parsing all Letterboxd CSV data...");

  // Parse lists from individual CSV files
  const lists: LetterboxdList[] = [];
  if (csvData.lists && csvData.lists.length > 0) {
    for (const listData of csvData.lists) {
      const items = parseListCsv(listData.csv);
      if (items.length > 0) {
        lists.push({
          name: listData.name,
          description: "",
          items,
        });
      }
    }
  }

  const data: LetterboxdImportData = {
    diary: csvData.diary ? parseDiaryCsv(csvData.diary) : [],
    ratings: csvData.ratings ? parseRatingsCsv(csvData.ratings) : [],
    reviews: csvData.reviews ? parseReviewsCsv(csvData.reviews) : [],
    watched: csvData.watched ? parseWatchedCsv(csvData.watched) : [],
    watchlist: csvData.watchlist ? parseWatchlistCsv(csvData.watchlist) : [],
    liked: csvData.liked ? parseLikedCsv(csvData.liked) : [],
    lists,
  };

  logger.info(
    `[LetterboxdParser] Parsed: ${data.diary.length} diary, ${data.ratings.length} ratings, ` +
      `${data.reviews.length} reviews, ${data.watched.length} watched, ${data.watchlist.length} watchlist, ` +
      `${data.liked.length} liked, ${data.lists.length} lists`,
  );

  return data;
}
