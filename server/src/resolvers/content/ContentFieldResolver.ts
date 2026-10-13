import { Resolver, FieldResolver, Root, Ctx } from "type-graphql";
import { Content } from "../../types/Content";
import { Person } from "../../types/Person";
import { CompanyType as Company } from "../../types/Company";
import { GraphQLContext } from "../../context";
import { getRequestLoaders } from "../../lib/requestLoaders";
import { CONTENT_TYPE_IDS } from "./ContentQueryHelpers";

@Resolver(() => Content)
export class ContentFieldResolver {
  @FieldResolver(() => String)
  async title(
    @Root() content: any,
    @Ctx() ctx: GraphQLContext,
  ): Promise<string> {
    if (content.contentTypeId === CONTENT_TYPE_IDS.book) {
      const publication = await getRequestLoaders(
        ctx,
      ).primaryBookPublications.load(content.id);
      if (publication?.title) return publication.title;
    }
    if (
      ctx.language &&
      content.translations &&
      Array.isArray(content.translations)
    ) {
      const translation = content.translations.find(
        (t: any) => t.language === ctx.language,
      );
      if (translation && translation.title) {
        return translation.title;
      }
    }
    return content.title;
  }

  @FieldResolver(() => String, { nullable: true })
  description(@Root() content: any, @Ctx() ctx: GraphQLContext): string | null {
    if (
      ctx.language &&
      content.translations &&
      Array.isArray(content.translations)
    ) {
      const translation = content.translations.find(
        (t: any) => t.language === ctx.language,
      );
      if (translation && translation.description) {
        return translation.description;
      }
    }
    return content.description || null;
  }

  @FieldResolver(() => String, { nullable: true })
  trailerUrl(@Root() content: any, @Ctx() ctx: GraphQLContext): string | null {
    if (
      ctx.language &&
      content.translations &&
      Array.isArray(content.translations)
    ) {
      const translation = content.translations.find(
        (t: any) => t.language === ctx.language,
      );
      if (translation && translation.trailerUrl) {
        return translation.trailerUrl;
      }
    }
    return content.trailerUrl || null;
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
