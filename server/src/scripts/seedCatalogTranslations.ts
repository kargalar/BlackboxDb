import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import translations from "../data/catalogTranslations.json";

const prisma = new PrismaClient();

async function main() {
  const rows = Object.entries(translations).flatMap(([catalog, entries]) =>
    Object.entries(entries).flatMap(([source, localized]) =>
      Object.entries(localized).map(([language, name]) => ({ catalog, source, language, name })),
    ),
  );
  const updated = await prisma.$executeRaw`
    WITH entries(catalog, id, name) AS (
      SELECT 'genre', id, name FROM genre
      UNION ALL SELECT 'theme', id, name FROM theme
      UNION ALL SELECT 'mood', id, name FROM mood
      UNION ALL SELECT 'game_mode', id, name FROM game_mode
      UNION ALL SELECT 'perspective', id, name FROM perspective
      UNION ALL SELECT 'content_type_lookup', id, name FROM content_type_lookup
      UNION ALL SELECT 'person_role', id, label FROM person_role
      UNION ALL SELECT 'company_role', id, name FROM company_role
      UNION ALL SELECT 'language', id, name FROM language
    )
    INSERT INTO catalog_translation (catalog, entry_id, language, name)
    SELECT entries.catalog, entries.id, dictionary.language, dictionary.name
    FROM json_to_recordset(${JSON.stringify(rows)}::json)
      AS dictionary(catalog text, source text, language text, name text)
    JOIN entries ON entries.catalog = dictionary.catalog AND entries.name = dictionary.source
    ON CONFLICT (catalog, entry_id, language) DO NOTHING
  `;
  console.log(JSON.stringify({ inserted: updated, total: await prisma.catalogTranslation.count() }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
