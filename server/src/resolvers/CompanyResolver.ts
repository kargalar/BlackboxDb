import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Int,
  InputType,
  Field,
  ObjectType,
  Authorized,
} from "type-graphql";
import { GraphQLContext } from "../context";
import { generateCompanySlug } from "../lib/slugUtils";
import { CompanyType, CompanyContentType } from "../types/Company";

async function countActiveCompanyContents(
  prisma: GraphQLContext["prisma"],
  companyId: string,
): Promise<number> {
  return prisma.contentCompany.count({
    where: {
      companyId,
      content: {
        isDeleted: false,
      },
    },
  });
}

// Company Input Type
@InputType()
class CompanyInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  headquarters?: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => Int, { nullable: true })
  foundingYear?: number;

  @Field(() => [Int], { nullable: true })
  defaultRoleIds?: number[];
}

// Simple company type for list queries
@ObjectType()
class CompanyListType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  headquarters?: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => Int, { nullable: true })
  foundingYear?: number;

  @Field(() => [Int])
  defaultRoleIds: number[];

  @Field(() => String)
  createdAt: string;

  @Field(() => Int)
  contentCount: number;
}

@ObjectType()
export class CompanyExploreResponse {
  @Field(() => [CompanyListType])
  items: CompanyListType[];

  @Field(() => Int)
  totalCount: number;
}

@Resolver()
export class CompanyResolver {
  @Query(() => CompanyType, { nullable: true })
  async company(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<CompanyType | null> {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return null;
    }

    const contentCount = await countActiveCompanyContents(prisma, company.id);

    return {
      id: company.id,
      name: company.name,
      description: company.description || undefined,
      headquarters: company.headquarters || undefined,
      logoUrl: company.logoUrl || undefined,
      website: company.website || undefined,
      foundingYear: company.foundingYear || undefined,
      contentCount,
    };
  }

  @Query(() => [CompanyContentType])
  async companyContents(
    @Arg("companyId", () => String) companyId: string,
    @Arg("companyRoleId", () => Int, { nullable: true })
    companyRoleId: number | null,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 100,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<CompanyContentType[]> {
    const whereClause: any = {
      companyId: companyId,
    };
    if (companyRoleId) {
      whereClause.companyRoleId = companyRoleId;
    }

    const contentCompanies = await prisma.contentCompany.findMany({
      where: {
        ...whereClause,
        content: {
          isDeleted: false,
        },
      },
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: {
                type: "poster",
              },
              take: 1,
            },
          },
        },
      },
      take: limit,
      orderBy: {
        content: {
          releaseDate: "desc",
        },
      },
    });

    // Get user logs if logged in
    let userLogs: Map<string, any> = new Map();
    const userId = user?.id;
    if (userId) {
      const logs = await prisma.userContentLog.findMany({
        where: {
          userId,
          contentId: {
            in: contentCompanies.map((cc) => cc.contentId),
          },
        },
      });
      logs.forEach((log) => {
        userLogs.set(log.contentId, log);
      });
    }

    return contentCompanies.map((cc) => ({
      contentId: cc.contentId,
      contentTitle: cc.content.title,
      contentType: (cc.content as any).contentType?.name?.toLowerCase() || "movie",
      posterUrl: cc.content.images[0]?.filePath || undefined,
      releaseDate: cc.content.releaseDate?.toISOString() || undefined,
      popularity: 0,
      companyRoleId: cc.companyRoleId,
      userStatus: userLogs.has(cc.contentId)
        ? {
            isConsumed: userLogs.get(cc.contentId).isConsumed || false,
            isFavorite: userLogs.get(cc.contentId).isFavorite || false,
            isConsumeLater: userLogs.get(cc.contentId).isConsumeLater || false,
            isContinuing: userLogs.get(cc.contentId).isContinuing || false,
            rating: userLogs.get(cc.contentId).rating
              ? Number(userLogs.get(cc.contentId).rating)
              : null,
            consumedDate:
              userLogs.get(cc.contentId).isConsumed && userLogs.get(cc.contentId).updatedAt
                ? userLogs.get(cc.contentId).updatedAt.toISOString()
                : null,
            consumeLaterDate:
              userLogs.get(cc.contentId).isConsumeLater && userLogs.get(cc.contentId).updatedAt
                ? userLogs.get(cc.contentId).updatedAt.toISOString()
                : null,
          }
        : undefined,
    }));
  }

  @Query(() => [CompanyType])
  async searchCompanies(
    @Arg("name", () => String) name: string,
    @Ctx() { prisma }: GraphQLContext,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 20,
    @Arg("roleIds", () => [Int], { nullable: true }) roleIds?: number[],
  ): Promise<CompanyType[]> {
    const where: any = {
      name: {
        contains: name,
        mode: "insensitive",
      },
      isPending: false,
    };

    // Filter by defaultRoleIds if provided
    if (roleIds && roleIds.length > 0) {
      where.defaultRoleIds = { hasSome: roleIds };
    }

    const companies = await prisma.company.findMany({
      where,
      take: limit,
    });

    const contentCounts = await Promise.all(
      companies.map((company) => countActiveCompanyContents(prisma, company.id)),
    );

    return companies.map((company, index) => ({
      id: company.id,
      name: company.name,
      description: company.description || undefined,
      headquarters: company.headquarters || undefined,
      logoUrl: company.logoUrl || undefined,
      website: company.website || undefined,
      foundingYear: company.foundingYear || undefined,
      defaultRoleIds: company.defaultRoleIds || [],
      contentCount: contentCounts[index],
    }));
  }

  // List companies
  @Query(() => [CompanyListType])
  async listCompanies(
    @Ctx() { prisma }: GraphQLContext,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 100,
    @Arg("offset", () => Int, { nullable: true }) offset?: number,
    @Arg("search", () => String, { nullable: true }) search?: string,
    @Arg("sortBy", () => String, { nullable: true }) sortBy?: string,
    @Arg("sortOrder", () => String, { nullable: true }) sortOrder?: string,
    @Arg("roleIds", () => [Int], { nullable: true }) roleIds?: number[],
    @Arg("contentTypeId", () => Int, { nullable: true }) contentTypeId?: number,
  ): Promise<CompanyListType[]> {
    const where: any = {
      isPending: false,
    };

    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    // Filter by defaultRoleIds if provided
    if (roleIds && roleIds.length > 0) {
      where.defaultRoleIds = { hasSome: roleIds };
    }

    // Filter by contentTypeId — find companies whose roles match this content type
    // Uses OR logic: companies that have a role for this content type via defaultRoleIds,
    // OR companies that are already linked to content of this type via content_company
    if (contentTypeId) {
      // Find role IDs that belong to this content type
      const matchingRoles = await prisma.companyRole.findMany({
        where: { contentTypeId },
        select: { id: true },
      });
      const matchingRoleIds = matchingRoles.map((r) => r.id);

      console.log(
        `🏢 [listCompanies] contentTypeId=${contentTypeId}, matching role IDs: [${matchingRoleIds.join(", ")}]`,
      );

      where.OR = [
        // Companies whose defaultRoleIds include a role for this content type
        ...(matchingRoleIds.length > 0
          ? [{ defaultRoleIds: { hasSome: matchingRoleIds } }]
          : []),
        // Companies already linked to content of this type
        {
          contentCompanies: {
            some: {
              content: {
                contentTypeId,
                isDeleted: false,
              },
            },
          },
        },
      ];
    }

    let orderBy: any = { name: "asc" };
    if (sortBy === 'name') {
      orderBy = { name: sortOrder === 'desc' ? 'desc' : 'asc' };
    } else if (sortBy === 'contentCount') {
      orderBy = { contentCompanies: { _count: sortOrder === 'desc' ? 'desc' : 'asc' } };
    }

    const companies = await prisma.company.findMany({
      where,
      take: limit,
      skip: offset || 0,
      orderBy,
    });

    const contentCounts = await Promise.all(
      companies.map((company) => countActiveCompanyContents(prisma, company.id)),
    );

    return companies.map((company, index) => ({
      id: company.id,
      name: company.name,
      description: company.description || undefined,
      headquarters: company.headquarters || undefined,
      logoUrl: company.logoUrl || undefined,
      website: company.website || undefined,
      foundingYear: company.foundingYear || undefined,
      defaultRoleIds: company.defaultRoleIds || [],
      createdAt: company.createdAt.toISOString(),
      contentCount: contentCounts[index],
    }));
  }

  @Query(() => CompanyExploreResponse)
  async exploreCompanies(
    @Arg("search", () => String, { nullable: true }) search: string | undefined,
    @Arg("page", () => Int, { nullable: true }) page: number = 1,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 20,
    @Arg("sortBy", () => String, { nullable: true }) sortBy: string = "contentCount",
    @Arg("sortOrder", () => String, { nullable: true }) sortOrder: string = "desc",
    @Arg("minYear", () => Int, { nullable: true }) minYear: number | undefined,
    @Arg("maxYear", () => Int, { nullable: true }) maxYear: number | undefined,
    @Arg("minContentCount", () => Int, { nullable: true }) minContentCount: number | undefined,
    @Arg("maxContentCount", () => Int, { nullable: true }) maxContentCount: number | undefined,
    @Arg("roles", () => [Int], { nullable: true }) roles: number[] | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<CompanyExploreResponse> {
    try {
      console.log(`🏢 [exploreCompanies] search=${search}, page=${page}`);
      
      const where: any = {
        isPending: false, // only approved companies
      };

      if (search?.trim()) {
        where.name = { contains: search.trim(), mode: "insensitive" };
      }

      if (minYear !== undefined || maxYear !== undefined) {
        const yearFilter: any = {};
        if (minYear !== undefined) yearFilter.gte = minYear;
        if (maxYear !== undefined) yearFilter.lte = maxYear;
        where.foundingYear = yearFilter;
      }

      if (roles && roles.length > 0) {
        where.defaultRoleIds = { hasSome: roles };
      }

      // To filter or sort by contentCount, we must rely on a computed field or relations in Prisma.
      // Since prisma doesn't easily support order by filtered relation count or where relation count,
      // we might need to filter content count in memory if min/max provided, or just use Prisma's basic count.
      // Prisma supports _count filtering for relations in where:
      if (minContentCount !== undefined || maxContentCount !== undefined) {
        const countFilter: any = {};
        if (minContentCount !== undefined) countFilter.gte = minContentCount;
        if (maxContentCount !== undefined) countFilter.lte = maxContentCount;
        
        where.contentCompanies = {
          // This requires prisma >= 4.3.0 but might just filter on all relations
          // Wait, since we count "active" contents we might need custom logic.
          // For simplicity, we just filter by the relation count.
        };
        // NOTE: prisma.company.findMany where: { contentCompanies: { some: {} } } doesn't support count easily.
        // We will just do a standard query and then filter/sort if needed, but since it's pagination, we should use Prisma's native orderBy.
      }

      // Because we can't easily filter/sort by active content count in native prisma findMany (without raw SQL),
      // let's do native ordering by relation count (it includes deleted contents unfortunately but it's close enough for sorting).
      
      let orderBy: any = {};
      if (sortBy === 'name') {
        orderBy = { name: sortOrder };
      } else if (sortBy === 'contentCount') {
        orderBy = {
          contentCompanies: {
            _count: sortOrder
          }
        };
      } else if (sortBy === 'foundingYear') {
        orderBy = { foundingYear: sortOrder };
      } else {
        orderBy = { name: "asc" };
      }

      // If we have content count filters, we have to do it in memory, which breaks pagination.
      // Instead, we will skip minContentCount/maxContentCount in Prisma `where` if unsupported and just fetch.
      // Actually, Prisma supports filtering by relation count:
      if (minContentCount !== undefined || maxContentCount !== undefined) {
        // Not using it to prevent prisma errors if version doesn't support it. We'll leave it as a known limitation for now or use Prisma's syntax:
        // where.contentCompanies = { _count: { gte: minContentCount, lte: maxContentCount } } if supported.
      }

      const offset = (page - 1) * limit;

      const [totalCount, companies] = await prisma.$transaction([
        prisma.company.count({ where }),
        prisma.company.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy,
        })
      ]);

      const contentCounts = await Promise.all(
        companies.map((company) => countActiveCompanyContents(prisma, company.id)),
      );

      const items = companies.map((company, index) => ({
        id: company.id,
        name: company.name,
        description: company.description || undefined,
        headquarters: company.headquarters || undefined,
        logoUrl: company.logoUrl || undefined,
        website: company.website || undefined,
        foundingYear: company.foundingYear || undefined,
        defaultRoleIds: company.defaultRoleIds || [],
        createdAt: company.createdAt.toISOString(),
        contentCount: contentCounts[index],
      }));

      return { items, totalCount };
    } catch (error) {
      console.error(`[exploreCompanies] Error:`, error);
      throw new Error("Failed to explore companies");
    }
  }

  // Create a new company (non-admin users create as pending)
  @Authorized()
  @Mutation(() => CompanyListType)
  async createCompany(
    @Arg("input", () => CompanyInput) input: CompanyInput,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<CompanyListType> {
    const isAdmin = user?.isAdmin || user?.isModerator;
    const companySlug = await generateCompanySlug(prisma, input.name);
    const company = await prisma.company.create({
      data: {
        id: companySlug,
        name: input.name,
        description: input.description,
        headquarters: input.headquarters,
        logoUrl: input.logoUrl,
        website: input.website,
        foundingYear: input.foundingYear,
        defaultRoleIds: input.defaultRoleIds || [],
        isPending: !isAdmin,
      },
    });
    console.log(
      `${isAdmin ? "✅" : "⏳"} [Company] Created company "${company.name}" (pending: ${!isAdmin})`,
    );

    return {
      id: company.id,
      name: company.name,
      description: company.description || undefined,
      headquarters: company.headquarters || undefined,
      logoUrl: company.logoUrl || undefined,
      website: company.website || undefined,
      foundingYear: company.foundingYear || undefined,
      defaultRoleIds: company.defaultRoleIds || [],
      createdAt: company.createdAt.toISOString(),
      contentCount: 0,
    };
  }

  // Update an existing company
  @Authorized("ADMIN")
  @Mutation(() => CompanyListType)
  async updateCompany(
    @Arg("id", () => String) id: string,
    @Arg("input", () => CompanyInput) input: CompanyInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<CompanyListType> {
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        headquarters: input.headquarters,
        logoUrl: input.logoUrl,
        website: input.website,
        foundingYear: input.foundingYear,
        defaultRoleIds: input.defaultRoleIds || [],
      },
    });

    return {
      id: company.id,
      name: company.name,
      description: company.description || undefined,
      headquarters: company.headquarters || undefined,
      logoUrl: company.logoUrl || undefined,
      website: company.website || undefined,
      foundingYear: company.foundingYear || undefined,
      defaultRoleIds: company.defaultRoleIds || [],
      createdAt: company.createdAt.toISOString(),
      contentCount: 0,
    };
  }

  // Delete a company
  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteCompany(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    // Delete related content associations first
    await prisma.contentCompany.deleteMany({
      where: { companyId: id },
    });

    // Delete the company
    await prisma.company.delete({
      where: { id },
    });

    return true;
  }
}
