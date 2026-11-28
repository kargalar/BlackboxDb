import { FieldResolver, Ctx, Resolver, Root } from "type-graphql";
import type { GraphQLContext } from "../../context";
import { getRequestLoaders } from "../../lib/requestLoaders";
import { Expansion } from "../../types/Expansion";
import { QuizAnswerResult, QuizContentItem, QuizOption, QuizSession, QuizSessionV2 } from "../../types/Quiz";
import { ContentRatingComp } from "../userContent/UserContentStatsResolver";
import { resolveContentDescription, resolveContentTitle } from "./ContentFieldResolver";

async function titleFor(id: string, fallback: string, ctx: GraphQLContext) {
  const content = await getRequestLoaders(ctx).contentText.load(id);
  return content ? resolveContentTitle(content, ctx) : fallback;
}

async function descriptionFor(id: string, fallback: string | undefined, ctx: GraphQLContext) {
  const content = await getRequestLoaders(ctx).contentText.load(id);
  return (content && await resolveContentDescription(content, ctx)) || fallback || null;
}

async function contentTypeNameFor(id: number, fallback: string, ctx: GraphQLContext) {
  return await getRequestLoaders(ctx).catalogTranslations.load(JSON.stringify(["content_type_lookup", id])) ?? fallback;
}

@Resolver(() => Expansion)
export class ExpansionTextResolver {
  @FieldResolver(() => String)
  name(@Root() item: Expansion, @Ctx() ctx: GraphQLContext) {
    return item.detailContentId ? titleFor(item.detailContentId, item.name, ctx) : item.name;
  }

  @FieldResolver(() => String, { nullable: true })
  description(@Root() item: Expansion, @Ctx() ctx: GraphQLContext) {
    return item.detailContentId ? descriptionFor(item.detailContentId, item.description, ctx) : item.description;
  }

  @FieldResolver(() => String, { nullable: true })
  contentTitle(@Root() item: Expansion, @Ctx() ctx: GraphQLContext) {
    return titleFor(item.contentId, item.contentTitle, ctx);
  }
}

@Resolver(() => QuizOption)
export class QuizOptionTextResolver {
  @FieldResolver(() => String)
  title(@Root() item: QuizOption, @Ctx() ctx: GraphQLContext) {
    return titleFor(item.contentId, item.title, ctx);
  }
}

@Resolver(() => QuizContentItem)
export class QuizContentTextResolver {
  @FieldResolver(() => String)
  title(@Root() item: QuizContentItem, @Ctx() ctx: GraphQLContext) {
    return titleFor(item.contentId, item.title, ctx);
  }

  @FieldResolver(() => String, { nullable: true })
  description(@Root() item: QuizContentItem, @Ctx() ctx: GraphQLContext) {
    return descriptionFor(item.contentId, item.description, ctx);
  }
}

@Resolver(() => QuizAnswerResult)
export class QuizAnswerTextResolver {
  @FieldResolver(() => String)
  correctTitle(@Root() item: QuizAnswerResult, @Ctx() ctx: GraphQLContext) {
    return titleFor(item.correctContentId, item.correctTitle, ctx);
  }
}

@Resolver(() => QuizSession)
export class QuizSessionTextResolver {
  @FieldResolver(() => String)
  contentTypeName(@Root() item: QuizSession, @Ctx() ctx: GraphQLContext) {
    return contentTypeNameFor(item.contentTypeId, item.contentTypeName, ctx);
  }
}

@Resolver(() => QuizSessionV2)
export class QuizSessionV2TextResolver {
  @FieldResolver(() => String)
  contentTypeName(@Root() item: QuizSessionV2, @Ctx() ctx: GraphQLContext) {
    return contentTypeNameFor(item.contentTypeId, item.contentTypeName, ctx);
  }
}

@Resolver(() => ContentRatingComp)
export class ContentRatingTitleResolver {
  @FieldResolver(() => String)
  title(@Root() item: ContentRatingComp, @Ctx() ctx: GraphQLContext) {
    return titleFor(item.contentId, item.title, ctx);
  }
}
