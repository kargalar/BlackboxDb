export interface ContentTranslation {
  language: string;
  title?: string | null;
  description?: string | null;
}

export function changedContentTranslations(
  before: ContentTranslation[] = [],
  after: ContentTranslation[] = [],
): ContentTranslation[] {
  const previous = new Map(before.map((row) => [row.language, row]));
  const current = new Map(after.map((row) => [row.language, row]));
  return [...new Set([...previous.keys(), ...current.keys()])].flatMap((language) => {
    const patch: ContentTranslation = { language };
    for (const field of ['title', 'description'] as const) {
      const oldValue = previous.get(language)?.[field]?.trim() || null;
      const nextValue = current.get(language)?.[field]?.trim() || null;
      if (oldValue !== nextValue) patch[field] = nextValue;
    }
    return patch.title !== undefined || patch.description !== undefined ? [patch] : [];
  });
}

export function mergeContentTranslations(
  current: ContentTranslation[],
  imported: ContentTranslation[] | undefined,
) {
  const rows = new Map(current.map((row) => [row.language, row]));
  for (const row of imported ?? []) {
    const previous = rows.get(row.language);
    rows.set(row.language, {
      language: row.language,
      title: previous?.title?.trim() ? previous.title : row.title,
      description: previous?.description?.trim() ? previous.description : row.description,
    });
  }
  return [...rows.values()].sort((a, b) => a.language.localeCompare(b.language));
}
