import { Resolver, FieldResolver, Root, Ctx } from "type-graphql";
import { Content } from "../../types/Content";
import { Person } from "../../types/Person";
import { CompanyType as Company } from "../../types/Company";
import { GraphQLContext } from "../../context";
import { getRequestLoaders } from "../../lib/requestLoaders";
import { CONTENT_TYPE_IDS } from "./ContentQueryHelpers";
import { normalizeLanguage } from "../../lib/requestLanguage";

type ContentTextField = "title" | "description" | "trailerUrl";
type ContentText = Pick<Content, "id" | "title" | "contentTypeId"> &
  Partial<Pick<Content, "description" | "trailerUrl" | "originalTitle">> & {
  translations?: Array<Partial<Record<ContentTextField, string | null>> & { language: string }>;
};

async function localizedText(content: ContentText, ctx: GraphQLContext, field: ContentTextField, language = ctx.language) {
  const translations = content.translations ?? await getRequestLoaders(ctx).contentTranslations.load(content.id);
  return translations.find((row) => row.language === language)?.[field]?.trim() ||
    translations.find((row) => normalizeLanguage(row.language) === language && row[field]?.trim())?.[field]?.trim();
}

export async function resolveContentTitle(content: ContentText, ctx: GraphQLContext) {
  if (ctx.showOriginalTitles) {
    const originalTitle = content.originalTitle === undefined
      ? (await getRequestLoaders(ctx).contentText.load(content.id))?.originalTitle
      : content.originalTitle;
    if (originalTitle?.trim()) return originalTitle;
    if (content.contentTypeId === CONTENT_TYPE_IDS.book) return content.title;
  }
  const localTitle = await localizedText(content, ctx, "title");
  if (localTitle) return localTitle;
  if (content.contentTypeId === CONTENT_TYPE_IDS.book) {
    const loaders = getRequestLoaders(ctx);
    const [editions, preferred] = await Promise.all([
      loaders.bookPublications.load(content.id), loaders.primaryBookPublications.load(content.id),
    ]);
    const displayEditions = preferred ? [preferred, ...editions] : editions;
    const titleIn = (language: string) => displayEditions.find(
      (edition) => normalizeLanguage(edition.language ?? undefined) === language && edition.title?.trim(),
    )?.title;
    return titleIn(ctx.language) ||
      await localizedText(content, ctx, "title", "en") ||
      titleIn("en") ||
      content.title;
  }
  return await localizedText(content, ctx, "title", "en") || content.title;
}

export async function resolveContentDescription(content: ContentText, ctx: GraphQLContext) {
  return await localizedText(content, ctx, "description") ||
    await localizedText(content, ctx, "description", "en") || content.description || null;
}

@Resolver(() => Content)
export class ContentFieldResolver {
  @FieldResolver(() => String)
  async title(
    @Root() content: ContentText,
    @Ctx() ctx: GraphQLContext,
  ): Promise<string> {
    return resolveContentTitle(content, ctx);
  }

  @FieldResolver(() => String, { nullable: true })
  async description(@Root() content: ContentText, @Ctx() ctx: GraphQLContext): Promise<string | null> {
    return resolveContentDescription(content, ctx);
  }

  @FieldResolver(() => String, { nullable: true })
  async trailerUrl(@Root() content: ContentText, @Ctx() ctx: GraphQLContext): Promise<string | null> {
    return await localizedText(content, ctx, "trailerUrl") ||
      await localizedText(content, ctx, "trailerUrl", "en") || content.trailerUrl || null;
  }
}

@Resolver(() => Person)
export class PersonFieldResolver {
  @FieldResolver(() => String, { nullable: true })
  biography(@Root() person: any, @Ctx() ctx: GraphQLContext): string | null {
    if (
      ctx.language &&
      person.translations &&
      Array.isArray(person.translations)
    ) {
      const translation = person.translations.find(
        (t: any) => t.language === ctx.language,
      );
      if (translation && translation.biography) {
        return translation.biography;
      }
    }
    return person.biography || null;
  }
}

@Resolver(() => Company)
export class CompanyFieldResolver {
  @FieldResolver(() => String, { nullable: true })
  description(@Root() company: any, @Ctx() ctx: GraphQLContext): string | null {
    if (
      ctx.language &&
      company.translations &&
      Array.isArray(company.translations)
    ) {
      const translation = company.translations.find(
        (t: any) => t.language === ctx.language,
      );
      if (translation && translation.description) {
        return translation.description;
      }
    }
    return company.description || null;
  }
}
