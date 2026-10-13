import { parse } from "csv-parse/sync";
import { logger } from "./logger";

export interface CsvGameEntry {
    name: string;
    date: string | null;
    dateEnd: string | null;
    point: number | null;
    status: string;
    type: string[];
    playTime: number | null;
    reaction: string[];
    recommender: string | null;
    original: boolean;
}

export interface CsvSeriesEntry {
    name: string;
    date: string | null;
    dateEnd: string | null;
    point: number | null;
    status: string;
    type: string[];
    seasons: string[];
    reaction: string[];
    recommender: string | null;
}

export type MappedStatus = {
    isConsumed: boolean;
    isConsumeLater: boolean;
    isContinuing: boolean;
    isAbandoned: boolean;
};

export function mapCsvStatus(status: string): MappedStatus {
    const s = status.toLowerCase().trim();

    switch (s) {
        case "played":
        case "watched":
        case "enough":
        case "unfinished":
        case "not like":
        case "fucking idiot":
            return {
                isConsumed: true,
                isConsumeLater: false,
                isContinuing: false,
                isAbandoned: false,
            };

        case "to be played":
        case "watch later":
            return {
                isConsumed: false,
                isConsumeLater: true,
                isContinuing: false,
                isAbandoned: false,
            };

        case "watching":
        case "contiune":
            return {
                isConsumed: false,
                isConsumeLater: false,
                isContinuing: true,
                isAbandoned: false,
            };

        default:
            return {
                isConsumed: true,
                isConsumeLater: false,
                isContinuing: false,
                isAbandoned: false,
            };
    }
}

function parseNotionDate(dateStr: string): {
    start: string | null;
    end: string | null;
} {
    if (!dateStr || dateStr.trim() === "") return { start: null, end: null };

    if (dateStr.includes("→")) {
        const parts = dateStr.split("→").map((d) => d.trim());
        return {
            start: parseSimpleDate(parts[0]),
            end: parts[1] ? parseSimpleDate(parts[1]) : null,
        };
    }

    return { start: parseSimpleDate(dateStr), end: null };
}

function parseSimpleDate(dateStr: string): string | null {
    if (!dateStr || dateStr.trim() === "") return null;
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch {
        return null;
    }
}

function parsePoint(pointStr: string): number | null {
    if (!pointStr || pointStr.trim() === "") return null;
    const val = parseFloat(pointStr);
    if (isNaN(val)) return null;
    return Math.round(val);
}

function parsePlayTime(playTimeStr: string): number | null {
    if (!playTimeStr || playTimeStr.trim() === "") return null;
    const val = parseFloat(playTimeStr);
    return isNaN(val) ? null : val;
}

function parseTypes(typeStr: string): string[] {
    if (!typeStr || typeStr.trim() === "") return [];
    return typeStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}

function parseReactions(reactionStr: string): string[] {
    if (!reactionStr || reactionStr.trim() === "") return [];
    return reactionStr
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
}

function parseSeasons(seasonStr: string): string[] {
    if (!seasonStr || seasonStr.trim() === "") return [];
    return seasonStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

export function parseGamesCsv(csvContent: string): CsvGameEntry[] {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            relax_quotes: true,
        });

        return records
            .map((row: any) => {
                const name = (row["name"] || "").trim();
                if (!name) return null;

                const dates = parseNotionDate(row["date"] || "");

                return {
                    name,
                    date: dates.start,
                    dateEnd: dates.end,
                    point: parsePoint(row["point"] || ""),
                    status: (row["status"] || "").trim(),
                    type: parseTypes(row["type"] || ""),
                    playTime: parsePlayTime(row["play time"] || ""),
                    reaction: parseReactions(row["reaction"] || ""),
                    recommender: (row["recommender"] || "").trim() || null,
                    original: (row["original"] || "").toLowerCase() === "yes",
                } as CsvGameEntry;
            })
            .filter(Boolean) as CsvGameEntry[];
    } catch (error) {
        logger.error("[CsvParser] Error parsing games.csv:", error);
        return [];
    }
}

export function parseSeriesCsv(csvContent: string): CsvSeriesEntry[] {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            relax_quotes: true,
        });

        return records
            .map((row: any) => {
                const name = (row["name"] || "").trim();
                if (!name) return null;

                const dates = parseNotionDate(row["date"] || "");

                return {
                    name,
                    date: dates.start,
                    dateEnd: dates.end,
                    point: parsePoint(row["point"] || ""),
                    status: (row["status"] || "").trim(),
                    type: parseTypes(row["type"] || ""),
                    seasons: parseSeasons(row["season"] || ""),
                    reaction: parseReactions(row["rection"] || row["reaction"] || ""),
                    recommender: (row["recommender"] || "").trim() || null,
                } as CsvSeriesEntry;
            })
            .filter(Boolean) as CsvSeriesEntry[];
    } catch (error) {
        logger.error("[CsvParser] Error parsing series.csv:", error);
        return [];
    }
}
