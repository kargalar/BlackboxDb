import { Authorized, Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { GraphQLContext } from "../context";
import { requireAdmin } from "../lib/authGuard";
import { ContentType } from "../types/ContentType";

@Resolver(ContentType)
export class ContentTypeResolver {
  @Query(() => [ContentType])
  async contentTypes(@Ctx() { prisma }: GraphQLContext): Promise<ContentType[]> {
    return prisma.contentTypeLookup.findMany({ orderBy: [{ id: "asc" }] }) as any;
  }

  @Query(() => ContentType, { nullable: true })
  async contentTypeBySlug(
    @Arg("slug", () => String) slug: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentType | null> {
    return prisma.contentTypeLookup.findUnique({ where: { slug: normalizeSlug(slug) } }) as any;
  }

  @Authorized()
  @Mutation(() => ContentType)
  async createContentType(
    @Arg("name", () => String) name: string,
    @Arg("slug", () => String) slug: string,
    @Ctx() context: GraphQLContext,
  ): Promise<ContentType> {
    requireAdmin(context.user);
    const normalizedName = name.trim().replace(/\s+/g, " ").toUpperCase();
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedName || normalizedName.length > 50) {
      throw new Error("Content type name must be between 1 and 50 characters");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug) || normalizedSlug.length > 50) {
      throw new Error("Content type slug must contain lowercase letters, numbers, and single hyphens");
    }
    return context.prisma.contentTypeLookup.create({
      data: { name: normalizedName, slug: normalizedSlug },
    }) as any;
  }
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
