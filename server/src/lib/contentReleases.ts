import type { ContentRelease } from "../types/ContentRelease";

type ReleaseRow = { date: string; regionCode: string | null };

const releaseDatePattern = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?|-Q([1-4]))?$/;
const regionPattern = /^(?:[A-Z]{2}|\d{3})$/;

function releaseSortDate(date: string) {
  return date.replace(/-Q([1-4])$/, (_, quarter: string) =>
    `-${String((Number(quarter) - 1) * 3 + 1).padStart(2, "0")}`,
  );
}

export function readContentReleases(value: unknown): ReleaseRow[] | null {
  if (!Array.isArray(value)) return null;
  return normalizeContentReleases(value.flatMap((row: unknown) => {
    if (!row || typeof row !== "object" || !("date" in row) || typeof row.date !== "string") return [];
    const regionCode = "regionCode" in row && typeof row.regionCode === "string" ? row.regionCode : null;
    return [{ date: row.date, regionCode }];
  }));
}

export function normalizeReleaseDate(value: string): string | undefined {
  const date = value.trim();
  const match = releaseDatePattern.exec(date);
  if (!match) return;
  const [, year, month, day, quarter] = match;
  if (year === "0000") return;
  if (quarter) return date;
  const calendarDate = `${year}-${month ?? "01"}-${day ?? "01"}`;
  const timestamp = new Date(`${calendarDate}T00:00:00Z`);
  if (Number.isFinite(+timestamp) && timestamp.toISOString().slice(0, 10) === calendarDate) {
    return date;
  }
}

export function normalizeContentReleases(
  rows: readonly ContentRelease[],
  strict = false,
): ReleaseRow[] {
  const releases = new Map<string, ReleaseRow>();
  for (const row of rows) {
    const date = normalizeReleaseDate(row.date);
    const regionCode = row.regionCode?.trim().toUpperCase() || null;
    if (!date || (regionCode && !regionPattern.test(regionCode))) {
      if (strict) throw new Error("Invalid release date or region code");
      continue;
    }
    releases.set(`${date}:${regionCode ?? ""}`, { date, regionCode });
  }
  return [...releases.values()].sort(
    (a, b) => releaseSortDate(a.date).localeCompare(releaseSortDate(b.date))
      || a.date.localeCompare(b.date)
      || (a.regionCode ?? "").localeCompare(b.regionCode ?? ""),
  );
}

export function bookReleaseDates(values: Array<string | null | undefined>): ReleaseRow[] {
  return normalizeContentReleases(values.flatMap((value) => {
    if (!value) return [];
    const date = value.trim();
    if (normalizeReleaseDate(date)) return [{ date }];

    // Open Library also uses dates such as "March 1997" and "1 March 1997".
    const month = "[A-Za-z]{3,9}";
    const fullDate = new RegExp(`^(?:${month} \\d{1,2},? \\d{4}|\\d{1,2} ${month} \\d{4})$`);
    const monthAndYear = new RegExp(`^${month} \\d{4}$`);
    if (!fullDate.test(date) && !monthAndYear.test(date)) return [];

    const parsed = new Date(`${date} UTC`);
    if (!Number.isFinite(+parsed)) return [];
    const iso = parsed.toISOString().slice(0, 10);
    if (fullDate.test(date) && !iso.endsWith(`-${date.match(/\b\d{1,2}\b/)?.[0].padStart(2, "0")}`)) {
      return [];
    }
    return [{ date: iso.slice(0, monthAndYear.test(date) ? 7 : 10) }];
  }));
}
