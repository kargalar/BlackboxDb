import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
} from "type-graphql";
import { GraphQLContext } from "../context";
import { normalizeThemeName } from "../lib/themeNormalizer";
import { generatePersonSlug } from "../lib/slugUtils";
import { Genre } from "../types/Genre";
import { Theme } from "../types/Theme";
import { Mood } from "../types/Mood";
import { Platform } from "../types/Platform";
import { AgeRating } from "../types/AgeRating";
import { GameMode } from "../types/GameMode";
import { GameEngine } from "../types/GameEngine";
import { Perspective } from "../types/Perspective";
import { Language } from "../types/Language";
import { Person, PersonExploreResponse } from "../types/Person";
import { PersonRoleType } from "../types/PersonRole";
import { CompanyRoleType } from "../types/CompanyRole";
import {
  GenreInput,
  LanguageInput,
  ThemeInput,
  MoodInput,
  PlatformInput,
  AgeRatingInput,
  GameModeInput,
  GameEngineInput,
  PerspectiveInput,
  SeriesInput,
  PersonRoleInput,
  CompanyRoleInput,
  PersonInput,
} from "../types/admin/AdminInputTypes";
import { Franchise } from "../types/Series";
import { logger } from "../lib/logger";

function normalizeFranchiseName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

const DEFAULT_LOOKUP_PAGE_SIZE = 500;
const MAX_LOOKUP_PAGE_SIZE = 500;
const MAX_LOOKUP_OFFSET = 100_000;
const MAX_SEARCH_PAGE_SIZE = 100;

function normalizeLookupLimit(
  limit: number | undefined,
  defaultLimit = DEFAULT_LOOKUP_PAGE_SIZE,
  maxLimit = MAX_LOOKUP_PAGE_SIZE,
): number {
  return Math.min(Math.max(limit || defaultLimit, 1), maxLimit);
}

function normalizeLookupOffset(offset: number | undefined): number {
  return Math.min(Math.max(offset || 0, 0), MAX_LOOKUP_OFFSET);
}

type SortDirection = "asc" | "desc";

function normalizeSortDirection(sortOrder?: string): SortDirection {
  return sortOrder === "desc" ? "desc" : "asc";
}

function buildLookupOrderBy(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  nameField = "name",
  countRelation?: string,
): any[] {
  const direction = normalizeSortDirection(sortOrder);

  if (sortBy === "contentCount" && countRelation) {
    return [
      { [countRelation]: { _count: direction } },
      { [nameField]: "asc" },
      { id: "asc" },
    ];
  }

  return [{ [nameField]: direction }, { id: "asc" }];
}

function sortLookupRows<
  T extends {
    id: number | string;
    contentCount?: number;
    name?: string;
    label?: string;
  },
>(
  rows: T[],
  sortBy: string | undefined,
  sortOrder: string | undefined,
  nameField: "name" | "label" = "name",
): T[] {
  const direction = normalizeSortDirection(sortOrder);
  const multiplier = direction === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    if (sortBy === "contentCount") {
      const countDiff =
        ((a.contentCount ?? 0) - (b.contentCount ?? 0)) * multiplier;
      if (countDiff !== 0) return countDiff;
    }

    const nameA = String(a[nameField] ?? "");
    const nameB = String(b[nameField] ?? "");
    const nameDiff =
      nameA.localeCompare(nameB) * (sortBy === "contentCount" ? 1 : multiplier);
    if (nameDiff !== 0) return nameDiff;

    return String(a.id).localeCompare(String(b.id));
  });
}

@Resolver()
export class LookupResolver {
  // ------------------------------------------
  // GENRES
  // ------------------------------------------

  @Query(() => [Genre])
  async listGenres(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Genre[]> {
    try {
      logger.debug(
        `[listGenres] contentTypeId=${contentTypeId}, limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      let where: any = {};
      if (contentTypeId) {
        if (contentTypeId === 1 || contentTypeId === 2) {
          where.OR = [
            { contentTypeId: 1 },
            { contentTypeId: 2 },
            { contentTypeId: null },
          ];
        } else {
          where.OR = [{ contentTypeId }, { contentTypeId: null }];
        }
      }
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const genres = await prisma.genre.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(sortBy, sortOrder, "name", "contentGenres"),
        include: { _count: { select: { contentGenres: true } } },
      });
      logger.debug(`[listGenres] Found ${genres.length} genres`);
      return genres.map((g) => ({
        ...g,
        contentTypeId: g.contentTypeId ?? undefined,
        createdAt: g.createdAt.toISOString(),
        contentCount: g._count.contentGenres,
      }));
    } catch (error) {
      logger.error(`[listGenres] Error:`, error);
      throw new Error("Failed to list genres");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Genre)
  async createGenre(
    @Arg("input", () => GenreInput) input: GenreInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Genre> {
    try {
      logger.debug(`[createGenre]`, input);
      const genre = await prisma.genre.create({
        data: {
          name: input.name,
          contentTypeId: input.contentTypeId,
        },
      });
      logger.success(`[createGenre] Created genre: ${genre.name}`);
      return {
        ...genre,
        contentTypeId: genre.contentTypeId ?? undefined,
        createdAt: genre.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[createGenre] Error:`, error);
      throw new Error("Failed to create genre");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Genre)
  async updateGenre(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => GenreInput) input: GenreInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Genre> {
    try {
      logger.debug(`[updateGenre] id=${id}`, input);
      const genre = await prisma.genre.update({
        where: { id },
        data: {
          name: input.name,
          contentTypeId: input.contentTypeId,
        },
      });
      logger.success(`[updateGenre] Updated genre: ${genre.name}`);
      return {
        ...genre,
        contentTypeId: genre.contentTypeId ?? undefined,
        createdAt: genre.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[updateGenre] Error:`, error);
      throw new Error("Failed to update genre");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteGenre(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteGenre] id=${id}`);
      await prisma.contentGenre.deleteMany({ where: { genreId: id } });
      await prisma.genre.delete({ where: { id } });
      logger.success(`[deleteGenre] Deleted genre ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteGenre] Error:`, error);
      throw new Error("Failed to delete genre");
    }
  }

  // ------------------------------------------
  // THEMES
  // ------------------------------------------

  @Query(() => [Theme])
  async listThemes(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Theme[]> {
    try {
      logger.debug(
        `[listThemes] contentTypeId=${contentTypeId}, limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      if (contentTypeId) {
        where.contentThemes = {
          some: { content: { contentTypeId } },
        };
      }
      const themes = await prisma.theme.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(sortBy, sortOrder, "name", "contentThemes"),
        include: { _count: { select: { contentThemes: true } } },
      });
      logger.debug(`[listThemes] Found ${themes.length} themes`);
      return themes.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        contentCount: t._count.contentThemes,
      }));
    } catch (error) {
      logger.error(`[listThemes] Error:`, error);
      throw new Error("Failed to list themes");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Theme)
  async createTheme(
    @Arg("input", () => ThemeInput) input: ThemeInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Theme> {
    try {
      logger.debug(`[createTheme]`, input);
      const theme = await prisma.theme.create({
        data: { name: normalizeThemeName(input.name) },
      });
      logger.success(`[createTheme] Created theme: ${theme.name}`);
      return { ...theme, createdAt: theme.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[createTheme] Error:`, error);
      throw new Error("Failed to create theme");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Theme)
  async updateTheme(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => ThemeInput) input: ThemeInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Theme> {
    try {
      logger.debug(`[updateTheme] id=${id}`, input);
      const theme = await prisma.theme.update({
        where: { id },
        data: { name: normalizeThemeName(input.name) },
      });
      logger.success(`[updateTheme] Updated theme: ${theme.name}`);
      return { ...theme, createdAt: theme.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[updateTheme] Error:`, error);
      throw new Error("Failed to update theme");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteTheme(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteTheme] id=${id}`);
      await prisma.contentTheme.deleteMany({ where: { themeId: id } });
      await prisma.theme.delete({ where: { id } });
      logger.success(`[deleteTheme] Deleted theme ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteTheme] Error:`, error);
      throw new Error("Failed to delete theme");
    }
  }

  // ------------------------------------------
  // MOODS
  // ------------------------------------------

  @Query(() => [Mood])
  async listMoods(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Mood[]> {
    try {
      logger.debug(
        `[listMoods] contentTypeId=${contentTypeId}, limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      if (contentTypeId) {
        where.contentMoods = {
          some: { content: { contentTypeId } },
        };
      }
      const moods = await prisma.mood.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(sortBy, sortOrder, "name", "contentMoods"),
        include: { _count: { select: { contentMoods: true } } },
      });
      logger.debug(`[listMoods] Found ${moods.length} moods`);
      return moods.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        contentCount: m._count.contentMoods,
      }));
    } catch (error) {
      logger.error(`[listMoods] Error:`, error);
      throw new Error("Failed to list moods");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Mood)
  async createMood(
    @Arg("input", () => MoodInput) input: MoodInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Mood> {
    try {
      logger.debug(`[createMood]`, input);
      const mood = await prisma.mood.create({ data: { name: input.name } });
      logger.success(`[createMood] Created mood: ${mood.name}`);
      return { ...mood, createdAt: mood.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[createMood] Error:`, error);
      throw new Error("Failed to create mood");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Mood)
  async updateMood(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => MoodInput) input: MoodInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Mood> {
    try {
      logger.debug(`[updateMood] id=${id}`, input);
      const mood = await prisma.mood.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updateMood] Updated mood: ${mood.name}`);
      return { ...mood, createdAt: mood.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[updateMood] Error:`, error);
      throw new Error("Failed to update mood");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteMood(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteMood] id=${id}`);
      await prisma.contentMood.deleteMany({ where: { moodId: id } });
      await prisma.mood.delete({ where: { id } });
      logger.success(`[deleteMood] Deleted mood ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteMood] Error:`, error);
      throw new Error("Failed to delete mood");
    }
  }

  // ------------------------------------------
  // PLATFORMS
  // ------------------------------------------

  @Query(() => [Platform])
  async listPlatforms(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Platform[]> {
    try {
      logger.debug(
        `[listPlatforms] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const platforms = await prisma.platform.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(
          sortBy,
          sortOrder,
          "name",
          "contentPlatforms",
        ),
        include: { _count: { select: { contentPlatforms: true } } },
      });
      logger.debug(`[listPlatforms] Found ${platforms.length} platforms`);
      return platforms.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        contentCount: p._count.contentPlatforms,
      }));
    } catch (error) {
      logger.error(`[listPlatforms] Error:`, error);
      throw new Error("Failed to list platforms");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Platform)
  async createPlatform(
    @Arg("input", () => PlatformInput) input: PlatformInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Platform> {
    try {
      logger.debug(`[createPlatform]`, input);
      const platform = await prisma.platform.create({
        data: { name: input.name },
      });
      logger.success(`[createPlatform] Created platform: ${platform.name}`);
      return { ...platform, createdAt: platform.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[createPlatform] Error:`, error);
      throw new Error("Failed to create platform");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Platform)
  async updatePlatform(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => PlatformInput) input: PlatformInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Platform> {
    try {
      logger.debug(`[updatePlatform] id=${id}`, input);
      const platform = await prisma.platform.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updatePlatform] Updated platform: ${platform.name}`);
      return { ...platform, createdAt: platform.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[updatePlatform] Error:`, error);
      throw new Error("Failed to update platform");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deletePlatform(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deletePlatform] id=${id}`);
      await prisma.contentPlatform.deleteMany({ where: { platformId: id } });
      await prisma.platform.delete({ where: { id } });
      logger.success(`[deletePlatform] Deleted platform ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deletePlatform] Error:`, error);
      throw new Error("Failed to delete platform");
    }
  }

  // ------------------------------------------
  // AGE RATINGS
  // ------------------------------------------

  @Query(() => [AgeRating])
  async listAgeRatings(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AgeRating[]> {
    try {
      logger.debug(
        `[listAgeRatings] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const ratings = await prisma.ageRating.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(sortBy, sortOrder, "name", "contents"),
        include: { _count: { select: { contents: true } } },
      });
      logger.debug(`[listAgeRatings] Found ${ratings.length} age ratings`);
      return ratings.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        contentCount: r._count.contents,
      }));
    } catch (error) {
      logger.error(`[listAgeRatings] Error:`, error);
      throw new Error("Failed to list age ratings");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => AgeRating)
  async createAgeRating(
    @Arg("input", () => AgeRatingInput) input: AgeRatingInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AgeRating> {
    try {
      logger.debug(`[createAgeRating]`, input);
      const rating = await prisma.ageRating.create({
        data: { name: input.name },
      });
      logger.success(`[createAgeRating] Created age rating: ${rating.name}`);
      return {
        ...rating,
        createdAt: rating.createdAt.toISOString(),
        updatedAt: rating.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[createAgeRating] Error:`, error);
      throw new Error("Failed to create age rating");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => AgeRating)
  async updateAgeRating(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => AgeRatingInput) input: AgeRatingInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AgeRating> {
    try {
      logger.debug(`[updateAgeRating] id=${id}`, input);
      const rating = await prisma.ageRating.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updateAgeRating] Updated age rating: ${rating.name}`);
      return {
        ...rating,
        createdAt: rating.createdAt.toISOString(),
        updatedAt: rating.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[updateAgeRating] Error:`, error);
      throw new Error("Failed to update age rating");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteAgeRating(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteAgeRating] id=${id}`);
      await prisma.ageRating.delete({ where: { id } });
      logger.success(`[deleteAgeRating] Deleted age rating ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteAgeRating] Error:`, error);
      throw new Error("Failed to delete age rating");
    }
  }

  // ------------------------------------------
  // GAME MODES
  // ------------------------------------------

  @Query(() => [GameMode])
  async listGameModes(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<GameMode[]> {
    try {
      logger.debug(
        `[listGameModes] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const modes = await prisma.gameMode.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(
          sortBy,
          sortOrder,
          "name",
          "contentGameModes",
        ),
        include: { _count: { select: { contentGameModes: true } } },
      });
      logger.debug(`[listGameModes] Found ${modes.length} game modes`);
      return modes.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        contentCount: m._count.contentGameModes,
      }));
    } catch (error) {
      logger.error(`[listGameModes] Error:`, error);
      throw new Error("Failed to list game modes");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => GameMode)
  async createGameMode(
    @Arg("input", () => GameModeInput) input: GameModeInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<GameMode> {
    try {
      logger.debug(`[createGameMode]`, input);
      const mode = await prisma.gameMode.create({
        data: { name: input.name },
      });
      logger.success(`[createGameMode] Created game mode: ${mode.name}`);
      return { ...mode, createdAt: mode.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[createGameMode] Error:`, error);
      throw new Error("Failed to create game mode");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => GameMode)
  async updateGameMode(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => GameModeInput) input: GameModeInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<GameMode> {
    try {
      logger.debug(`[updateGameMode] id=${id}`, input);
      const mode = await prisma.gameMode.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updateGameMode] Updated game mode: ${mode.name}`);
      return { ...mode, createdAt: mode.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[updateGameMode] Error:`, error);
      throw new Error("Failed to update game mode");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteGameMode(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteGameMode] id=${id}`);
      await prisma.contentGameMode.deleteMany({ where: { gameModeId: id } });
      await prisma.gameMode.delete({ where: { id } });
      logger.success(`[deleteGameMode] Deleted game mode ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteGameMode] Error:`, error);
      throw new Error("Failed to delete game mode");
    }
  }

  // ------------------------------------------
  // GAME ENGINES
  // ------------------------------------------

  @Query(() => [GameEngine])
  async listGameEngines(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<GameEngine[]> {
    try {
      logger.debug(
        `[listGameEngines] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const engines = await prisma.gameEngine.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(
          sortBy,
          sortOrder,
          "name",
          "contentGameEngines",
        ),
        include: { _count: { select: { contentGameEngines: true } } },
      });
      logger.debug(`[listGameEngines] Found ${engines.length} game engines`);
      return engines.map((engine) => ({
        ...engine,
        createdAt: engine.createdAt.toISOString(),
        contentCount: engine._count.contentGameEngines,
      }));
    } catch (error) {
      logger.error(`[listGameEngines] Error:`, error);
      throw new Error("Failed to list game engines");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => GameEngine)
  async createGameEngine(
    @Arg("input", () => GameEngineInput) input: GameEngineInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<GameEngine> {
    try {
      logger.debug(`[createGameEngine]`, input);
      const engine = await prisma.gameEngine.create({
        data: { name: input.name },
      });
      logger.success(`[createGameEngine] Created game engine: ${engine.name}`);
      return { ...engine, createdAt: engine.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[createGameEngine] Error:`, error);
      throw new Error("Failed to create game engine");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => GameEngine)
  async updateGameEngine(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => GameEngineInput) input: GameEngineInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<GameEngine> {
    try {
      logger.debug(`[updateGameEngine] id=${id}`, input);
      const engine = await prisma.gameEngine.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updateGameEngine] Updated game engine: ${engine.name}`);
      return { ...engine, createdAt: engine.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[updateGameEngine] Error:`, error);
      throw new Error("Failed to update game engine");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteGameEngine(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteGameEngine] id=${id}`);
      await prisma.contentGameEngine.deleteMany({
        where: { gameEngineId: id },
      });
      await prisma.gameEngine.delete({ where: { id } });
      logger.success(`[deleteGameEngine] Deleted game engine ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteGameEngine] Error:`, error);
      throw new Error("Failed to delete game engine");
    }
  }

  // ------------------------------------------
  // PERSPECTIVES
  // ------------------------------------------

  @Query(() => [Perspective])
  async listPerspectives(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Perspective[]> {
    try {
      logger.debug(
        `[listPerspectives] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const perspectives = await prisma.perspective.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(
          sortBy,
          sortOrder,
          "name",
          "contentPerspectives",
        ),
        include: { _count: { select: { contentPerspectives: true } } },
      });
      logger.debug(
        `[listPerspectives] Found ${perspectives.length} perspectives`,
      );
      return perspectives.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        contentCount: p._count.contentPerspectives,
      }));
    } catch (error) {
      logger.error(`[listPerspectives] Error:`, error);
      throw new Error("Failed to list perspectives");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Perspective)
  async createPerspective(
    @Arg("input", () => PerspectiveInput) input: PerspectiveInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Perspective> {
    try {
      logger.debug(`[createPerspective]`, input);
      const perspective = await prisma.perspective.create({
        data: { name: input.name },
      });
      logger.success(`[createPerspective] Created: ${perspective.name}`);
      return {
        ...perspective,
        createdAt: perspective.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[createPerspective] Error:`, error);
      throw new Error("Failed to create perspective");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Perspective)
  async updatePerspective(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => PerspectiveInput) input: PerspectiveInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Perspective> {
    try {
      logger.debug(`[updatePerspective] id=${id}`, input);
      const perspective = await prisma.perspective.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updatePerspective] Updated: ${perspective.name}`);
      return {
        ...perspective,
        createdAt: perspective.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[updatePerspective] Error:`, error);
      throw new Error("Failed to update perspective");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deletePerspective(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deletePerspective] id=${id}`);
      await prisma.contentPerspective.deleteMany({
        where: { perspectiveId: id },
      });
      await prisma.perspective.delete({ where: { id } });
      logger.success(`[deletePerspective] Deleted perspective ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deletePerspective] Error:`, error);
      throw new Error("Failed to delete perspective");
    }
  }

  // ------------------------------------------
  // LANGUAGES
  // ------------------------------------------

  @Query(() => [Language])
  async listLanguages(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Language[]> {
    try {
      logger.debug(
        `[listLanguages] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const take = limit || 500;
      const skip = offset || 0;
      const shouldSortByCount = sortBy === "contentCount";
      const rows = await prisma.language.findMany({
        where,
        ...(shouldSortByCount
          ? {}
          : {
              take,
              skip,
              orderBy: buildLookupOrderBy(sortBy, sortOrder),
            }),
      });
      const languagesWithCounts = shouldSortByCount
        ? await Promise.all(
            rows.map(async (language) => ({
              ...language,
              contentCount: await prisma.content.count({
                where: {
                  isDeleted: false,
                  languages: { has: language.name },
                },
              }),
            })),
          )
        : rows.map((language) => ({ ...language, contentCount: 0 }));
      const languages = shouldSortByCount
        ? sortLookupRows(languagesWithCounts, sortBy, sortOrder).slice(
            skip,
            skip + take,
          )
        : languagesWithCounts;
      logger.debug(`[listLanguages] Found ${languages.length} languages`);
      return languages.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        contentCount: l.contentCount,
      }));
    } catch (error) {
      logger.error(`[listLanguages] Error:`, error);
      throw new Error("Failed to list languages");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Language)
  async createLanguage(
    @Arg("input", () => LanguageInput) input: LanguageInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Language> {
    try {
      logger.debug(`[createLanguage]`, input);
      const lang = await prisma.language.create({
        data: { name: input.name },
      });
      logger.success(`[createLanguage] Created language: ${lang.name}`);
      return { ...lang, createdAt: lang.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[createLanguage] Error:`, error);
      throw new Error("Failed to create language");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Language)
  async updateLanguage(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => LanguageInput) input: LanguageInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Language> {
    try {
      logger.debug(`[updateLanguage] id=${id}`, input);
      const lang = await prisma.language.update({
        where: { id },
        data: { name: input.name },
      });
      logger.success(`[updateLanguage] Updated language: ${lang.name}`);
      return { ...lang, createdAt: lang.createdAt.toISOString() };
    } catch (error) {
      logger.error(`[updateLanguage] Error:`, error);
      throw new Error("Failed to update language");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteLanguage(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteLanguage] id=${id}`);
      await prisma.language.delete({ where: { id } });
      logger.success(`[deleteLanguage] Deleted language ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteLanguage] Error:`, error);
      throw new Error("Failed to delete language");
    }
  }

  // ------------------------------------------
  // SERIES (Franchises)
  // ------------------------------------------

  @Query(() => [Franchise])
  async listSeries(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      logger.debug(
        `[listSeries] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const franchises = await prisma.franchise.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(sortBy, sortOrder, "name", "contents"),
        include: {
          _count: { select: { contents: true } },
          contents: {
            where: { isDeleted: false },
            orderBy: { consumeCount: "desc" },
            take: 1,
            select: {
              images: {
                where: { type: "poster" },
                take: 1,
                select: { filePath: true },
              },
            },
          },
        },
      });
      logger.debug(`[listSeries] Found ${franchises.length} series`);
      return franchises.map((f) => {
        let posterUrl = null;
        if (
          f.contents &&
          f.contents.length > 0 &&
          f.contents[0].images &&
          f.contents[0].images.length > 0
        ) {
          posterUrl = f.contents[0].images[0].filePath;
        }
        return {
          id: f.id,
          name: f.name,
          createdAt: f.createdAt.toISOString(),
          contentCount: f._count.contents,
          posterUrl,
        };
      });
    } catch (error) {
      logger.error(`[listSeries] Error:`, error);
      throw new Error("Failed to list series");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Franchise)
  async createSeries(
    @Arg("input", () => SeriesInput) input: SeriesInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Franchise> {
    try {
      const normalizedName = normalizeFranchiseName(input.name);
      logger.debug(`[createSeries]`, { ...input, name: normalizedName });

      let franchise = await prisma.franchise.findFirst({
        where: {
          name: {
            equals: normalizedName,
            mode: "insensitive",
          },
        },
      });

      if (!franchise) {
        franchise = await prisma.franchise.create({
          data: { name: normalizedName },
        });
      }

      logger.success(`[createSeries] Created series: ${franchise.name}`);
      return {
        id: franchise.id,
        name: franchise.name,
        createdAt: franchise.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[createSeries] Error:`, error);
      throw new Error("Failed to create series");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Franchise)
  async updateSeries(
    @Arg("id", () => String) id: string,
    @Arg("input", () => SeriesInput) input: SeriesInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Franchise> {
    try {
      const normalizedName = normalizeFranchiseName(input.name);
      logger.debug(`[updateSeries] id=${id}`, {
        ...input,
        name: normalizedName,
      });
      const franchise = await prisma.franchise.update({
        where: { id },
        data: { name: normalizedName },
      });
      logger.success(`[updateSeries] Updated series: ${franchise.name}`);
      return {
        id: franchise.id,
        name: franchise.name,
        createdAt: franchise.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[updateSeries] Error:`, error);
      throw new Error("Failed to update series");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteSeries(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteSeries] id=${id}`);
      await prisma.franchise.delete({ where: { id } });
      logger.success(`[deleteSeries] Deleted series ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteSeries] Error:`, error);
      throw new Error("Failed to delete series");
    }
  }

  // ------------------------------------------
  // ACTORS & DIRECTORS (Person queries by role)
  // ------------------------------------------

  @Query(() => [Person])
  async listActors(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    try {
      logger.debug(
        `[listActors] limit=${limit}, offset=${offset}, search=${search}`,
      );
      const where: any = {
        contentRoles: {
          some: {
            OR: [
              { role: { equals: "actor", mode: "insensitive" } },
              { role: { equals: "voice", mode: "insensitive" } },
              { role: { equals: "voice_actor", mode: "insensitive" } },
              {
                personRole: {
                  label: { contains: "Oyuncu", mode: "insensitive" },
                },
              },
              {
                personRole: {
                  label: { equals: "Actor", mode: "insensitive" },
                },
              },
              {
                personRole: {
                  label: { contains: "Seslendirme", mode: "insensitive" },
                },
              },
              {
                personRole: {
                  label: { equals: "Voice Actor", mode: "insensitive" },
                },
              },
            ],
          },
        },
      };
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const persons = await prisma.person.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: { name: "asc" },
        include: { _count: { select: { contentRoles: true } } },
      });
      logger.debug(`[listActors] Found ${persons.length} actors`);
      return persons.map((p) => ({
        ...p,
        birthDate: p.birthDate?.toISOString() ?? undefined,
        deathDate: p.deathDate?.toISOString() ?? undefined,
        profileUrl: p.profileUrl ?? undefined,
        biography: p.biography ?? undefined,
        gender: p.gender ?? undefined,
        placeOfBirth: p.placeOfBirth ?? undefined,
        createdAt: p.createdAt.toISOString(),
        contentCount: p._count.contentRoles,
      }));
    } catch (error) {
      logger.error(`[listActors] Error:`, error);
      throw new Error("Failed to list actors");
    }
  }

  @Query(() => [Person])
  async listDirectors(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    try {
      logger.debug(
        `[listDirectors] limit=${limit}, offset=${offset}, search=${search}`,
      );
      const where: any = {
        contentRoles: {
          some: {
            OR: [
              { role: { equals: "director", mode: "insensitive" } },
              {
                personRole: {
                  label: { contains: "Yönetmen", mode: "insensitive" },
                },
              },
              {
                personRole: {
                  label: { equals: "Director", mode: "insensitive" },
                },
              },
            ],
          },
        },
      };
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const persons = await prisma.person.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: { name: "asc" },
        include: { _count: { select: { contentRoles: true } } },
      });
      logger.debug(`[listDirectors] Found ${persons.length} directors`);
      return persons.map((p) => ({
        ...p,
        birthDate: p.birthDate?.toISOString() ?? undefined,
        deathDate: p.deathDate?.toISOString() ?? undefined,
        profileUrl: p.profileUrl ?? undefined,
        biography: p.biography ?? undefined,
        gender: p.gender ?? undefined,
        placeOfBirth: p.placeOfBirth ?? undefined,
        createdAt: p.createdAt.toISOString(),
        contentCount: p._count.contentRoles,
      }));
    } catch (error) {
      logger.error(`[listDirectors] Error:`, error);
      throw new Error("Failed to list directors");
    }
  }

  // ------------------------------------------
  // PERSON ROLES
  // ------------------------------------------

  @Query(() => [PersonRoleType])
  async listPersonRoles(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PersonRoleType[]> {
    try {
      logger.debug(
        `[listPersonRoles] contentTypeId=${contentTypeId}, limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (contentTypeId) {
        if (contentTypeId === 1 || contentTypeId === 2) {
          where.OR = [
            { contentTypeId: 1 },
            { contentTypeId: 2 },
            { contentTypeId: null },
          ];
        } else {
          where.OR = [
            { contentTypeId },
            { contentTypeId: null }, // universal roles
          ];
        }
      }
      if (search?.trim()) {
        where.label = { contains: search.trim(), mode: "insensitive" };
      }
      const roles = await prisma.personRole.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(
          sortBy,
          sortOrder,
          "label",
          "contentPersons",
        ),
        include: { _count: { select: { contentPersons: true } } },
      });
      logger.debug(`[listPersonRoles] Found ${roles.length} roles`);
      return roles.map((r) => ({
        id: r.id,
        label: r.label,
        contentTypeId: r.contentTypeId ?? undefined,
        contentCount: r._count.contentPersons,
      }));
    } catch (error) {
      logger.error(`[listPersonRoles] Error:`, error);
      throw new Error("Failed to list person roles");
    }
  }

  @Authorized()
  @Mutation(() => PersonRoleType)
  async createPersonRole(
    @Arg("input", () => PersonRoleInput) input: PersonRoleInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PersonRoleType> {
    try {
      logger.debug(`[createPersonRole] label=${input.label}`);
      const role = await prisma.personRole.create({
        data: {
          label: input.label,
          contentTypeId: input.contentTypeId ?? null,
        },
      });
      logger.success(`[createPersonRole] Created role id=${role.id}`);
      return {
        id: role.id,
        label: role.label,
        contentTypeId: role.contentTypeId ?? undefined,
      };
    } catch (error) {
      logger.error(`[createPersonRole] Error:`, error);
      throw new Error("Failed to create person role");
    }
  }

  @Authorized()
  @Mutation(() => PersonRoleType)
  async updatePersonRole(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => PersonRoleInput) input: PersonRoleInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PersonRoleType> {
    try {
      logger.debug(`[updatePersonRole] id=${id}, label=${input.label}`);
      const role = await prisma.personRole.update({
        where: { id },
        data: {
          label: input.label,
          contentTypeId: input.contentTypeId ?? null,
        },
      });
      logger.success(`[updatePersonRole] Updated role id=${role.id}`);
      return {
        id: role.id,
        label: role.label,
        contentTypeId: role.contentTypeId ?? undefined,
      };
    } catch (error) {
      logger.error(`[updatePersonRole] Error:`, error);
      throw new Error("Failed to update person role");
    }
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deletePersonRole(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deletePersonRole] id=${id}`);
      await prisma.personRole.delete({ where: { id } });
      logger.success(`[deletePersonRole] Deleted role id=${id}`);
      return true;
    } catch (error) {
      logger.error(`[deletePersonRole] Error:`, error);
      throw new Error("Failed to delete person role");
    }
  }

  // ------------------------------------------
  // COMPANY ROLES
  // ------------------------------------------

  @Query(() => [CompanyRoleType])
  async listCompanyRoles(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<CompanyRoleType[]> {
    try {
      logger.debug(
        `[listCompanyRoles] contentTypeId=${contentTypeId}, limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (contentTypeId) {
        if (contentTypeId === 1 || contentTypeId === 2) {
          where.OR = [
            { contentTypeId: 1 },
            { contentTypeId: 2 },
            { contentTypeId: null },
          ];
        } else {
          where.OR = [{ contentTypeId }, { contentTypeId: null }];
        }
      }
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const roles = await prisma.companyRole.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(
          sortBy,
          sortOrder,
          "name",
          "contentCompanies",
        ),
        include: { _count: { select: { contentCompanies: true } } },
      });
      logger.debug(`[listCompanyRoles] Found ${roles.length} roles`);
      return roles.map((r) => ({
        id: r.id,
        name: r.name,
        contentTypeId: r.contentTypeId ?? undefined,
        contentCount: r._count.contentCompanies,
      }));
    } catch (error) {
      logger.error(`[listCompanyRoles] Error:`, error);
      throw new Error("Failed to list company roles");
    }
  }

  @Authorized()
  @Mutation(() => CompanyRoleType)
  async createCompanyRole(
    @Arg("input", () => CompanyRoleInput) input: CompanyRoleInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<CompanyRoleType> {
    try {
      logger.debug(`[createCompanyRole] name=${input.name}`);
      const role = await prisma.companyRole.create({
        data: {
          name: input.name,
          contentTypeId: input.contentTypeId ?? null,
        },
      });
      logger.success(`[createCompanyRole] Created role id=${role.id}`);
      return {
        id: role.id,
        name: role.name,
        contentTypeId: role.contentTypeId ?? undefined,
      };
    } catch (error) {
      logger.error(`[createCompanyRole] Error:`, error);
      throw new Error("Failed to create company role");
    }
  }

  @Authorized()
  @Mutation(() => CompanyRoleType)
  async updateCompanyRole(
    @Arg("id", () => Int) id: number,
    @Arg("input", () => CompanyRoleInput) input: CompanyRoleInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<CompanyRoleType> {
    try {
      logger.debug(`[updateCompanyRole] id=${id}, name=${input.name}`);
      const role = await prisma.companyRole.update({
        where: { id },
        data: {
          name: input.name,
          contentTypeId: input.contentTypeId ?? null,
        },
      });
      logger.success(`[updateCompanyRole] Updated role id=${role.id}`);
      return {
        id: role.id,
        name: role.name,
        contentTypeId: role.contentTypeId ?? undefined,
      };
    } catch (error) {
      logger.error(`[updateCompanyRole] Error:`, error);
      throw new Error("Failed to update company role");
    }
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteCompanyRole(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deleteCompanyRole] id=${id}`);
      // Clean up content associations first
      await prisma.contentCompany.deleteMany({ where: { companyRoleId: id } });
      await prisma.companyRole.delete({ where: { id } });
      logger.success(`[deleteCompanyRole] Deleted role id=${id}`);
      return true;
    } catch (error) {
      logger.error(`[deleteCompanyRole] Error:`, error);
      throw new Error("Failed to delete company role");
    }
  }

  // ------------------------------------------
  // PERSON SEARCH & LIST
  // ------------------------------------------

  @Query(() => [Person])
  async searchPersons(
    @Arg("search", () => String) search: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    try {
      logger.debug(`[searchPersons] search=${search}, limit=${limit}`);
      const persons = await prisma.person.findMany({
        where: {
          name: { contains: search, mode: "insensitive" },
        },
        take: normalizeLookupLimit(limit, 20, MAX_SEARCH_PAGE_SIZE),
        orderBy: { name: "asc" },
      });
      logger.debug(`[searchPersons] Found ${persons.length} persons`);
      return persons.map((p) => ({
        ...p,
        birthDate: p.birthDate?.toISOString() ?? undefined,
        deathDate: p.deathDate?.toISOString() ?? undefined,
        profileUrl: p.profileUrl ?? undefined,
        biography: p.biography ?? undefined,
        gender: p.gender ?? undefined,
        placeOfBirth: p.placeOfBirth ?? undefined,
        createdAt: p.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error(`[searchPersons] Error:`, error);
      throw new Error("Failed to search persons");
    }
  }

  @Query(() => [Person])
  async listPersons(
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Arg("offset", () => Int, { nullable: true }) offset: number | undefined,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string | undefined,
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    try {
      logger.debug(
        `[listPersons] limit=${limit}, offset=${offset}, search=${search}, sort=${sortBy} ${sortOrder}`,
      );
      const where: any = {};
      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }
      const persons = await prisma.person.findMany({
        where,
        take: normalizeLookupLimit(limit),
        skip: normalizeLookupOffset(offset),
        orderBy: buildLookupOrderBy(sortBy, sortOrder, "name", "contentRoles"),
        include: { _count: { select: { contentRoles: true } } },
      });
      logger.debug(`[listPersons] Found ${persons.length} persons`);
      return persons.map((p) => ({
        ...p,
        birthDate: p.birthDate?.toISOString() ?? undefined,
        deathDate: p.deathDate?.toISOString() ?? undefined,
        profileUrl: p.profileUrl ?? undefined,
        biography: p.biography ?? undefined,
        gender: p.gender ?? undefined,
        placeOfBirth: p.placeOfBirth ?? undefined,
        createdAt: p.createdAt.toISOString(),
        contentCount: p._count.contentRoles,
      }));
    } catch (error) {
      logger.error(`[listPersons] Error:`, error);
      throw new Error("Failed to list persons");
    }
  }

  @Query(() => PersonExploreResponse)
  async explorePersons(
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("page", () => Int, { nullable: true }) page: number = 1,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 20,
    @Arg("sortBy", () => String, { nullable: true })
    sortBy: string = "roleCount",
    @Arg("sortOrder", () => String, { nullable: true })
    sortOrder: string = "desc",
    @Arg("gender", () => String, { nullable: true }) gender: string | undefined,
    @Arg("status", () => String, { nullable: true }) status: string | undefined,
    @Arg("minYear", () => Int, { nullable: true }) minYear: number | undefined,
    @Arg("maxYear", () => Int, { nullable: true }) maxYear: number | undefined,
    @Arg("roles", () => [String], { nullable: true })
    roles: string[] | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PersonExploreResponse> {
    try {
      logger.debug(`[explorePersons] search=${search}, page=${page}`);
      const where: any = {
        isPending: false, // only show approved people in explore
      };

      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }

      if (gender) {
        if (gender === "Other") {
          where.OR = [
            { gender: null },
            {
              AND: [{ gender: { not: "Male" } }, { gender: { not: "Female" } }],
            },
          ];
        } else {
          where.gender = gender;
        }
      }

      if (status) {
        if (status === "alive") {
          where.deathDate = null;
        } else if (status === "deceased") {
          where.deathDate = { not: null };
        }
      }

      if (minYear !== undefined || maxYear !== undefined) {
        const dateFilter: any = {};
        if (minYear !== undefined) {
          dateFilter.gte = new Date(`${minYear}-01-01`);
        }
        if (maxYear !== undefined) {
          dateFilter.lte = new Date(`${maxYear}-12-31`);
        }
        where.birthDate = dateFilter;
      }

      if (roles && roles.length > 0) {
        where.contentRoles = {
          some: {
            role: {
              in: roles,
              mode: "insensitive",
            },
          },
        };
      }

      let orderBy: any = {};
      if (sortBy === "name") {
        orderBy = { name: sortOrder };
      } else if (sortBy === "roleCount") {
        orderBy = {
          contentRoles: {
            _count: sortOrder,
          },
        };
      } else {
        orderBy = { name: "asc" };
      }

      const take = normalizeLookupLimit(limit, 20, MAX_SEARCH_PAGE_SIZE);
      const offset = normalizeLookupOffset((Math.max(page, 1) - 1) * take);

      const [totalCount, persons] = await prisma.$transaction([
        prisma.person.count({ where }),
        prisma.person.findMany({
          where,
          take,
          skip: offset,
          orderBy,
          include: { _count: { select: { contentRoles: true } } },
        }),
      ]);

      const items = persons.map((p) => ({
        ...p,
        birthDate: p.birthDate?.toISOString() ?? undefined,
        deathDate: p.deathDate?.toISOString() ?? undefined,
        profileUrl: p.profileUrl ?? undefined,
        biography: p.biography ?? undefined,
        gender: p.gender ?? undefined,
        placeOfBirth: p.placeOfBirth ?? undefined,
        createdAt: p.createdAt.toISOString(),
        contentCount: p._count.contentRoles,
      }));

      return { items, totalCount };
    } catch (error) {
      logger.error(`[explorePersons] Error:`, error);
      throw new Error("Failed to explore persons");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Person)
  async createPerson(
    @Arg("input", () => PersonInput) input: PersonInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person> {
    try {
      logger.debug(`[createPerson]`, input);
      const personSlug = await generatePersonSlug(prisma, input.name);
      const person = await prisma.person.create({
        data: {
          id: personSlug,
          name: input.name,
          biography: input.biography,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          deathDate: input.deathDate ? new Date(input.deathDate) : null,
          gender: input.gender,
          profileUrl: input.profileUrl,
          placeOfBirth: input.placeOfBirth,
          isPending: false, // Admin-created persons are not pending
        },
      });
      logger.success(`[createPerson] Created person: ${person.name}`);
      return {
        ...person,
        birthDate: person.birthDate?.toISOString() ?? undefined,
        deathDate: person.deathDate?.toISOString() ?? undefined,
        profileUrl: person.profileUrl ?? undefined,
        biography: person.biography ?? undefined,
        gender: person.gender ?? undefined,
        placeOfBirth: person.placeOfBirth ?? undefined,
        createdAt: person.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[createPerson] Error:`, error);
      throw new Error("Failed to create person");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Person)
  async updatePerson(
    @Arg("id", () => String) id: string,
    @Arg("input", () => PersonInput) input: PersonInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person> {
    try {
      logger.debug(`[updatePerson] id=${id}`, input);
      const person = await prisma.person.update({
        where: { id },
        data: {
          name: input.name,
          biography: input.biography,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          deathDate: input.deathDate ? new Date(input.deathDate) : null,
          gender: input.gender,
          profileUrl: input.profileUrl,
          placeOfBirth: input.placeOfBirth,
        },
      });
      logger.success(`[updatePerson] Updated person: ${person.name}`);
      return {
        ...person,
        birthDate: person.birthDate?.toISOString() ?? undefined,
        deathDate: person.deathDate?.toISOString() ?? undefined,
        profileUrl: person.profileUrl ?? undefined,
        biography: person.biography ?? undefined,
        gender: person.gender ?? undefined,
        placeOfBirth: person.placeOfBirth ?? undefined,
        createdAt: person.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(`[updatePerson] Error:`, error);
      throw new Error("Failed to update person");
    }
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deletePerson(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    try {
      logger.debug(`[deletePerson] id=${id}`);
      await prisma.contentPerson.deleteMany({ where: { personId: id } });
      await prisma.person.delete({ where: { id } });
      logger.success(`[deletePerson] Deleted person ${id}`);
      return true;
    } catch (error) {
      logger.error(`[deletePerson] Error:`, error);
      throw new Error("Failed to delete person");
    }
  }

  // ------------------------------------------
  // SERIES SEARCH
  // ------------------------------------------

  @Query(() => [Franchise])
  async searchSeries(
    @Arg("search", () => String) search: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      logger.debug(`[searchSeries] search=${search}, limit=${limit}`);
      const franchises = await prisma.franchise.findMany({
        where: {
          name: { contains: search, mode: "insensitive" },
        },
        take: normalizeLookupLimit(limit, 20, MAX_SEARCH_PAGE_SIZE),
        orderBy: { name: "asc" },
      });
      logger.debug(`[searchSeries] Found ${franchises.length} series`);
      return franchises.map((f) => ({
        id: f.id,
        name: f.name,
        createdAt: f.createdAt.toISOString(),
      }));
    } catch (error) {
      logger.error(`[searchSeries] Error:`, error);
      throw new Error("Failed to search series");
    }
  }

  // ------------------------------------------
  // CATEGORY COUNT (generic total count for any entity)
  // ------------------------------------------

  @Query(() => Int)
  async categoryCount(
    @Arg("type", () => String) type: string,
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    try {
      logger.debug(`[categoryCount] type=${type}, search=${search}`);

      const nameWhere = search?.trim()
        ? { name: { contains: search.trim(), mode: "insensitive" as const } }
        : {};
      const labelWhere = search?.trim()
        ? { label: { contains: search.trim(), mode: "insensitive" as const } }
        : {};

      let count = 0;
      switch (type) {
        case "genres":
          count = await prisma.genre.count({ where: nameWhere });
          break;
        case "themes":
          count = await prisma.theme.count({ where: nameWhere });
          break;
        case "moods":
          count = await prisma.mood.count({ where: nameWhere });
          break;
        case "platforms":
          count = await prisma.platform.count({ where: nameWhere });
          break;
        case "ageRatings":
          count = await prisma.ageRating.count({ where: nameWhere });
          break;
        case "languages":
          count = await prisma.language.count({ where: nameWhere });
          break;
        case "gameModes":
          count = await prisma.gameMode.count({ where: nameWhere });
          break;
        case "gameEngines":
          count = await prisma.gameEngine.count({ where: nameWhere });
          break;
        case "perspectives":
          count = await prisma.perspective.count({ where: nameWhere });
          break;
        case "persons":
          count = await prisma.person.count({ where: nameWhere });
          break;
        case "personRoles":
          count = await prisma.personRole.count({ where: labelWhere });
          break;
        case "companyRoles":
          count = await prisma.companyRole.count({ where: nameWhere });
          break;
        case "series":
          count = await prisma.franchise.count({ where: nameWhere });
          break;
        case "companies":
          count = await prisma.company.count({ where: nameWhere });
          break;
        default:
          logger.warn(`[categoryCount] Unknown type: ${type}`);
          return 0;
      }

      logger.debug(`[categoryCount] ${type} count = ${count}`);
      return count;
    } catch (error) {
      logger.error(`[categoryCount] Error:`, error);
      throw new Error("Failed to get category count");
    }
  }
}
