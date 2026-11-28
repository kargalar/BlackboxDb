import { Prisma } from "@prisma/client";

export interface LocalizedContentText {
  language: string;
  title?: string | null;
  description?: string | null;
}

const languageCode = /^[a-z]{2,3}(?:-[a-z]{2})?$/i;

function translatedTitle(value?: string | null) {
  const title = value?.trim().normalize("NFC") || null;
  if (title && [...title].length > 500) throw new Error("Translated title exceeds 500 characters");
  return title;
}

export async function fillContentTranslations(
  prisma: Pick<Prisma.TransactionClient, "$executeRaw">,
  contentId: string,
  translations: readonly LocalizedContentText[] | undefined,
) {
  const rows = new Map<string, LocalizedContentText>();
  for (const row of translations ?? []) {
    if (!languageCode.test(row.language) || row.language.length > 5)
      throw new Error("Invalid translation language");
    const previous = rows.get(row.language);
    const title = previous?.title || translatedTitle(row.title);
    const description = previous?.description || row.description?.trim() || null;
    if (title || description) rows.set(row.language, { language: row.language, title, description });
  }
  if (!rows.size) return 0;
  return prisma.$executeRaw`
    INSERT INTO content_translation (content_id, language, title, description, updated_at)
    SELECT ${contentId}, translated.language, translated.title, translated.description, NOW()
    FROM json_to_recordset(${JSON.stringify([...rows.values()])}::json)
      AS translated(language text, title text, description text)
    ON CONFLICT (content_id, language) DO UPDATE SET
      title = COALESCE(NULLIF(content_translation.title, ''), EXCLUDED.title),
      description = COALESCE(NULLIF(content_translation.description, ''), EXCLUDED.description),
      updated_at = NOW()
    WHERE (NULLIF(content_translation.title, '') IS NULL AND EXCLUDED.title IS NOT NULL)
       OR (NULLIF(content_translation.description, '') IS NULL AND EXCLUDED.description IS NOT NULL)
  `;
}

export async function saveContentTranslations(
  prisma: Prisma.TransactionClient,
  contentId: string,
  translations: readonly LocalizedContentText[] | undefined,
) {
  if (!translations?.length) return;
  if (translations.length > 200) throw new Error("Too many translations");
  const seen = new Set<string>();
  for (const row of translations) {
    const language = row.language;
    if (!languageCode.test(language) || language.length > 5 || seen.has(language))
      throw new Error("Invalid or duplicate translation language");
    seen.add(language);
    const title = row.title === undefined ? undefined : translatedTitle(row.title);
    const description = row.description === undefined ? undefined : row.description?.trim() || null;
    if (title === undefined && description === undefined) continue;
    const where = { contentId_language: { contentId, language } };
    if (title || description) {
      await prisma.contentTranslation.upsert({
        where,
        create: { contentId, language, title, description },
        update: { title, description },
      });
    } else {
      await prisma.contentTranslation.updateMany({
        where: { contentId, language },
        data: { title, description },
      });
    }
  }
}
