const FOUR_DIGIT_YEAR_REGEX = /^\d{4}$/;
const DECADE_REGEX = /^(?:the\s+)?(\d{4})\s*'?s$/i;
const CENTURY_REGEX =
  /^(?:the\s+)?(\d{1,2})(st|nd|rd|th)\s+century(?:\s+(bc|bce|ad|ce))?$/i;

function sanitizeThemeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function toDecadeLabel(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

function toCenturyBucketLabel(century: number, era?: string): string {
  const centuryStartYear = Math.max(0, (century - 1) * 100);
  const paddedYear = String(centuryStartYear).padStart(4, "0");
  const normalizedEra = era?.toLowerCase();

  if (normalizedEra === "bc" || normalizedEra === "bce") {
    return `${paddedYear}s bc`;
  }

  return `${paddedYear}s`;
}

export function isDecadeThemeName(name: string): boolean {
  return /^\d{4}s(?:\s+bc)?$/i.test(sanitizeThemeName(name));
}

export function normalizeThemeName(name: string): string {
  const sanitizedName = sanitizeThemeName(name);

  if (!sanitizedName) {
    return sanitizedName;
  }

  if (FOUR_DIGIT_YEAR_REGEX.test(sanitizedName)) {
    return toDecadeLabel(Number(sanitizedName));
  }

  const decadeMatch = sanitizedName.match(DECADE_REGEX);
  if (decadeMatch) {
    return `${decadeMatch[1]}s`;
  }

  const centuryMatch = sanitizedName.match(CENTURY_REGEX);
  if (centuryMatch) {
    const century = Number(centuryMatch[1]);
    const era = centuryMatch[3];

    if (Number.isNaN(century) || century < 1) {
      return sanitizedName;
    }

    return toCenturyBucketLabel(century, era);
  }

  return sanitizedName.charAt(0).toUpperCase() + sanitizedName.slice(1);
}

export function shouldNormalizeToDecadeTheme(name: string): boolean {
  const sanitizedName = sanitizeThemeName(name);
  return normalizeThemeName(sanitizedName) !== sanitizedName;
}
