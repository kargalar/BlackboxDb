import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Models that support translations.
 */
const TRANSLATION_MODELS: Prisma.ModelName[] = ["Content", "Person", "Company"];

export function addTranslations(args: any, model: Prisma.ModelName) {
  const nextArgs = { ...(args || {}) };
  if (nextArgs.select) {
    const translatedFields =
      model === "Content"
        ? ["title", "description", "trailerUrl"]
        : model === "Person"
          ? ["biography"]
          : ["description"];
    if (
      !translatedFields.some((field) => nextArgs.select[field]) &&
      nextArgs.select.translations === undefined
    )
      return nextArgs;
    nextArgs.select = {
      ...nextArgs.select,
      translations: nextArgs.select.translations ?? true,
    };
  } else {
    nextArgs.include = { ...nextArgs.include, translations: true };
  }
  return nextArgs;
}

/**
 * Applies translation fetching via Prisma Client Extension.
 * Returns a new extended PrismaClient that automatically injects
 * `include: { translations: true }` on read operations.
 */
export function withTranslations(prisma: PrismaClient) {
  return prisma.$extends({
    name: "translations",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (TRANSLATION_MODELS.includes(model as Prisma.ModelName)) {
            return query(addTranslations(args, model as Prisma.ModelName));
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (TRANSLATION_MODELS.includes(model as Prisma.ModelName)) {
            return query(addTranslations(args, model as Prisma.ModelName));
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (TRANSLATION_MODELS.includes(model as Prisma.ModelName)) {
            return query(addTranslations(args, model as Prisma.ModelName));
          }
          return query(args);
        },
      },
    },
  });
}
