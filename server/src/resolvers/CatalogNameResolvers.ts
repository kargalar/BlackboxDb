import { Arg, Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import type { GraphQLContext } from "../context";
import { getRequestLoaders } from "../lib/requestLoaders";
import { Genre } from "../types/Genre";
import { Theme } from "../types/Theme";
import { Mood } from "../types/Mood";
import { GameMode } from "../types/GameMode";
import { Perspective } from "../types/Perspective";
import { ContentType } from "../types/ContentType";
import { PersonRoleType } from "../types/PersonRole";
import { CompanyRoleType } from "../types/CompanyRole";

async function localizedName(catalog: string, entry: { id: number; name: string }, ctx: GraphQLContext, localized?: boolean) {
  if (localized === false) return entry.name;
  const name = await getRequestLoaders(ctx).catalogTranslations.load(JSON.stringify([catalog, entry.id]));
  return name ?? entry.name;
}
@Resolver(() => Genre)
export class GenreNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: Genre, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("genre", entry, ctx, localized);
  }
}

@Resolver(() => Theme)
export class ThemeNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: Theme, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("theme", entry, ctx, localized);
  }
}

@Resolver(() => Mood)
export class MoodNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: Mood, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("mood", entry, ctx, localized);
  }
}

@Resolver(() => GameMode)
export class GameModeNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: GameMode, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("game_mode", entry, ctx, localized);
  }
}

@Resolver(() => Perspective)
export class PerspectiveNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: Perspective, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("perspective", entry, ctx, localized);
  }
}

@Resolver(() => ContentType)
export class ContentTypeNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: ContentType, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("content_type_lookup", entry, ctx, localized);
  }
}

@Resolver(() => PersonRoleType)
export class PersonRoleNameResolver {
  @FieldResolver(() => String)
  label(@Root() entry: PersonRoleType, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("person_role", { id: entry.id, name: entry.label }, ctx, localized);
  }
}

@Resolver(() => CompanyRoleType)
export class CompanyRoleNameResolver {
  @FieldResolver(() => String)
  name(@Root() entry: CompanyRoleType, @Ctx() ctx: GraphQLContext, @Arg("localized", () => Boolean, { nullable: true }) localized?: boolean) {
    return localizedName("company_role", entry, ctx, localized);
  }
}

