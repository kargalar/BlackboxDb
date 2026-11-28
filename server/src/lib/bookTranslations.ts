import { normalizeLanguage } from "./requestLanguage";
import type { LocalizedContentText } from "./contentTranslations";

export function bookTitleTranslations(
  editions: readonly { title?: string | null; language?: string | null; description?: string | null }[],
): LocalizedContentText[] {
  const byLanguage = new Map<string, LocalizedContentText>();
  for (const edition of editions) {
    const language = normalizeLanguage(edition.language ?? undefined);
    if (!language) continue;
    const title = edition.title?.trim();
    const description = edition.description?.trim();
    const row = byLanguage.get(language) ?? { language };
    if (!row.title && title && [...title].length <= 500) row.title = title;
    if (!row.description && description) row.description = description;
    if (row.title || row.description) byLanguage.set(language, row);
  }
  return [...byLanguage.values()];
}
