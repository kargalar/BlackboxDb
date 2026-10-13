import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Int,
  FieldResolver,
  Root,
  ObjectType,
  Field,
  Authorized,
  Mutation,
} from "type-graphql";
import { Person } from "../types/Person";
import { ContentPerson } from "../types/ContentPerson";
import { GraphQLContext } from "../context";
import { logger } from "../lib/logger";

// ==========================================
// Result Types
// ==========================================

@ObjectType()
export class PersonContentUserStatus {
  @Field(() => Boolean)
  isConsumed: boolean;

  @Field(() => Boolean)
  isFavorite: boolean;

  @Field(() => Boolean)
  isConsumeLater: boolean;

  @Field(() => Boolean)
  isContinuing: boolean;

  @Field(() => Number, { nullable: true })
  rating: number | null;

  @Field(() => String, { nullable: true })
  consumedDate?: string | null;

  @Field(() => String, { nullable: true })
  consumeLaterDate?: string | null;
}

@ObjectType()
export class PersonContentResult {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  contentTitle: string;

  @Field(() => String)
  contentType: string;

  @Field(() => String, { nullable: true })
  role: string;

  @Field(() => String, { nullable: true })
  character: string;

  @Field(() => String, { nullable: true })
  releaseDate: string;

  @Field(() => String, { nullable: true })
  posterUrl: string;

  @Field(() => Number, { nullable: true })
  popularity?: number;

  @Field(() => PersonContentUserStatus, { nullable: true })
  userStatus: PersonContentUserStatus | null;
}

// ==========================================
// Resolver
// ==========================================

@Resolver(Person)
export class PersonResolver {
  // ==========================================
  // FIELD RESOLVERS
  // ==========================================

  @FieldResolver(() => [ContentPerson], { nullable: true })
  async contentRoles(
    @Root() person: any,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentPerson[] | null> {
    const roles = await prisma.contentPerson.findMany({
      where: { personId: person.id },
      include: {
        person: true,
        content: true,
      },
      orderBy: {
        creditOrder: "asc",
      },
    });

    return roles.map((role: any) => ({
      id: role.id,
      personId: role.personId,
      person: {
        id: role.person.id,
        name: role.person.name,
        biography: role.person.biography,
        birthDate: role.person.birthDate?.toISOString().split("T")[0] || null,
        deathDate: role.person.deathDate?.toISOString().split("T")[0] || null,
        gender: role.person.gender,
        profileUrl: role.person.profileUrl,
        placeOfBirth: role.person.placeOfBirth,
      },
      role: role.role,
      character: role.character,
      department: role.department,
      job: role.job,
      creditOrder: role.creditOrder,
    })) as ContentPerson[];
  }

  @FieldResolver(() => [String], { nullable: true })
  async roles(
    @Root() person: any,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<string[] | null> {
    const roles = await prisma.contentPerson.findMany({
      where: { personId: person.id },
      distinct: ["role"],
      select: { role: true },
    });

    return roles.map((r) => r.role);
  }

  @FieldResolver(() => Int, { nullable: true })
  async roleCount(
    @Root() person: any,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number | null> {
    return await prisma.contentPerson.count({
      where: { personId: person.id },
    });
  }

  @FieldResolver(() => Boolean)
  async isFavorite(
    @Root() person: any,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) return false;

    const existing = await prisma.userFavoritePerson.findUnique({
      where: {
        userId_personId: {
          userId: user.id,
          personId: person.id,
        },
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  // ==========================================
  // QUERIES
  // ==========================================

  @Query(() => Person, { nullable: true })
  async person(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person | null> {
    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        contentRoles: {
          include: {
            person: true,
          },
          orderBy: {
            creditOrder: "asc",
          },
        },
      },
    });

    if (!person) {
      return null;
    }

    return this.convertPersonForGraphQL(person);
  }

  @Query(() => [Person])
  async personsByName(
    @Arg("name", () => String) name: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    const persons = await prisma.person.findMany({
      where: {
        name: {
          contains: name,
          mode: "insensitive",
        },
        isPending: false,
      },
      take: limit || 20,
      orderBy: { name: "asc" },
      include: {
        contentRoles: {
          include: {
            person: true,
          },
        },
      },
    });

    return persons.map((p) => this.convertPersonForGraphQL(p));
  }

  @Query(() => [Person])
  async personsByRole(
    @Arg("role", () => String) role: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    const contentPersons = await prisma.contentPerson.findMany({
      where: {
        role: {
          contains: role,
          mode: "insensitive",
        },
      },
      distinct: ["personId"],
      take: limit || 50,
      include: {
        person: {
          include: {
            contentRoles: {
              include: {
                person: true,
              },
            },
          },
        },
      },
    });

    return contentPersons.map((cp) => this.convertPersonForGraphQL(cp.person));
  }

  @Query(() => [Person])
  async userFavoritePeople(
    @Arg("userId", () => String) userId: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<Person[]> {
    const favorites = await prisma.userFavoritePerson.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit ?? 12, 1), 50),
      include: {
        person: {
          include: {
            contentRoles: {
              include: { person: true },
            },
          },
        },
      },
    });

    return favorites.map((favorite) => this.convertPersonForGraphQL(favorite.person));
  }

  @Authorized()
  @Mutation(() => Boolean)
  async toggleFavoritePerson(
    @Arg("personId", () => String) personId: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true },
    });
    if (!person) {
      throw new Error("Person not found");
    }

    const existing = await prisma.userFavoritePerson.findUnique({
      where: {
        userId_personId: {
          userId: user.id,
          personId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.userFavoritePerson.delete({ where: { id: existing.id } });
      logger.success(`[toggleFavoritePerson] Removed favorite person user=${user.id} person=${personId}`);
      return false;
    }

    await prisma.userFavoritePerson.create({
      data: {
        userId: user.id,
        personId,
      },
    });
    logger.success(`[toggleFavoritePerson] Added favorite person user=${user.id} person=${personId}`);
    return true;
  }

  @Query(() => [PersonContentResult])
  async personContents(
    @Arg("personId", () => String) personId: string,
    @Arg("role", () => String, { nullable: true }) role: string | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<PersonContentResult[]> {
    const where: any = { personId };
    if (role) {
      where.role = {
        contains: role,
        mode: "insensitive",
      };
    }

    const contentPersons = await prisma.contentPerson.findMany({
      where,
      include: {
        content: {
          include: {
            images: {
              where: { type: "poster" },
              select: { filePath: true },
              take: 1,
            },
          },
        },
      },
      take: limit || 100,
      orderBy: [{ creditOrder: "asc" }, { content: { releaseDate: "desc" } }],
    });

    return contentPersons.map((cp) => ({
      contentId: cp.content.id,
      contentTitle: cp.content.title,
      contentType: cp.content.contentTypeId.toString(),
      role: cp.role,
      character: cp.character || null,
      releaseDate: cp.content.releaseDate?.toISOString().split("T")[0] || null,
      posterUrl: (cp.content as any).images?.[0]?.filePath || null,
    })) as PersonContentResult[];
  }

  @Query(() => [PersonContentResult])
  async personCastContent(
    @Arg("personId", () => String) personId: string,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<PersonContentResult[]> {
    const contentPersons = await prisma.contentPerson.findMany({
      where: {
        personId,
        role: {
          in: ["actor", "Actor", "voice_actor", "Voice_actor"],
        },
        content: { isDeleted: false },
      },
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: "poster" },
              select: { filePath: true },
              take: 1,
            },
          },
        },
      },
      take: limit || 100,
      orderBy: { content: { releaseDate: "desc" } },
    });

    // Get user's content logs for status (including rating) — en yeni log'u al
    const contentIds = contentPersons.map((cp) => cp.content.id);
    const userLogs = user
      ? await prisma.userContentLog.findMany({
          where: {
            userId: user.id,
            contentId: { in: contentIds },
          },
          orderBy: { updatedAt: "desc" },
          select: {
            contentId: true,
            isConsumed: true,
            isFavorite: true,
            isConsumeLater: true,
            isContinuing: true,
            rating: true,
            updatedAt: true,
            isAbandoned: true,
          },
        })
      : [];

    // Deduplicate: only keep the latest (first in desc order) log per content
    const userLogMap = new Map<string, (typeof userLogs)[0]>();
    for (const log of userLogs) {
      if (!userLogMap.has(log.contentId)) {
        userLogMap.set(log.contentId, log);
      }
    }

    return contentPersons.map((cp) => {
      const log = userLogMap.get(cp.content.id);
      return {
        contentId: cp.content.id,
        contentTitle: cp.content.title,
        contentType:
          (cp.content as any).contentType?.name?.toLowerCase() || "movie",
        role: cp.role,
        character: cp.character || null,
        releaseDate:
          cp.content.releaseDate?.toISOString().split("T")[0] || null,
        popularity: 0,
        posterUrl: (cp.content as any).images?.[0]?.filePath || null,
        userStatus: log
          ? {
              isConsumed: log.isConsumed,
              isFavorite: log.isFavorite,
              isConsumeLater: log.isConsumeLater,
              isContinuing: log.isContinuing,
              rating:
                log.rating === null || log.rating === undefined
                  ? null
                  : Number(log.rating),
              consumedDate: log.isConsumed && log.updatedAt ? log.updatedAt.toISOString() : null,
              consumeLaterDate: log.isConsumeLater && log.updatedAt ? log.updatedAt.toISOString() : null,
            }
          : null,
      };
    }) as PersonContentResult[];
  }

  @Query(() => [PersonContentResult])
  async personCrewContent(
    @Arg("personId", () => String) personId: string,
    @Arg("department", () => String, { nullable: true })
    department: string | undefined,
    @Arg("limit", () => Int, { nullable: true }) limit: number | undefined,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<PersonContentResult[]> {
    const where: any = {
      personId,
      role: {
        notIn: ["actor", "Actor", "voice_actor", "Voice_actor"],
      },
      content: { isDeleted: false },
    };

    if (department) {
      where.department = {
        contains: department,
        mode: "insensitive",
      };
    }

    const contentPersons = await prisma.contentPerson.findMany({
      where,
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: "poster" },
              select: { filePath: true },
              take: 1,
            },
          },
        },
      },
      take: limit || 100,
      orderBy: { content: { releaseDate: "desc" } },
    });

    // Get user's content logs for status — en yeni log'u al
    const contentIds = contentPersons.map((cp) => cp.content.id);
    const userLogs = user
      ? await prisma.userContentLog.findMany({
          where: {
            userId: user.id,
            contentId: { in: contentIds },
          },
          orderBy: { updatedAt: "desc" },
          select: {
            contentId: true,
            isConsumed: true,
            isFavorite: true,
            isConsumeLater: true,
            isContinuing: true,
            rating: true,
            updatedAt: true,
            isAbandoned: true,
          },
        })
      : [];

    // Deduplicate: only keep the latest (first in desc order) log per content
    const userLogMap = new Map<string, (typeof userLogs)[0]>();
    for (const log of userLogs) {
      if (!userLogMap.has(log.contentId)) {
        userLogMap.set(log.contentId, log);
      }
    }

    return contentPersons.map((cp) => {
      const log = userLogMap.get(cp.content.id);
      return {
        contentId: cp.content.id,
        contentTitle: cp.content.title,
        contentType:
          (cp.content as any).contentType?.name?.toLowerCase() || "movie",
        role: cp.role,
        character: cp.character || null,
        releaseDate:
          cp.content.releaseDate?.toISOString().split("T")[0] || null,
        popularity: 0,
        posterUrl: (cp.content as any).images?.[0]?.filePath || null,
        userStatus: log
          ? {
              isConsumed: log.isConsumed,
              isFavorite: log.isFavorite,
              isConsumeLater: log.isConsumeLater,
              isContinuing: log.isContinuing,
              rating:
                log.rating === null || log.rating === undefined
                  ? null
                  : Number(log.rating),
              consumedDate: log.isConsumed && log.updatedAt ? log.updatedAt.toISOString() : null,
              consumeLaterDate: log.isConsumeLater && log.updatedAt ? log.updatedAt.toISOString() : null,
            }
          : null,
      };
    }) as PersonContentResult[];
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private convertPersonForGraphQL(person: any): Person {
    const rolesSet = new Set(
      person.contentRoles?.map((cp: any) => cp.role) || [],
    );
    const roles: string[] = Array.from(rolesSet) as string[];

    return {
      id: person.id,
      name: person.name,
      biography: person.biography || undefined,
      birthDate: person.birthDate
        ? person.birthDate.toISOString().split("T")[0]
        : undefined,
      deathDate: person.deathDate
        ? person.deathDate.toISOString().split("T")[0]
        : undefined,
      gender: person.gender || undefined,
      profileUrl: person.profileUrl || undefined,
      placeOfBirth: person.placeOfBirth || undefined,
      contentRoles: person.contentRoles?.map((cp: any) => ({
        id: cp.id,
        personId: cp.personId,
        person: {
          id: cp.person.id,
          name: cp.person.name,
          biography: cp.person.biography,
          birthDate: cp.person.birthDate?.toISOString().split("T")[0],
          deathDate: cp.person.deathDate?.toISOString().split("T")[0],
          gender: cp.person.gender,
          profileUrl: cp.person.profileUrl,
          placeOfBirth: cp.person.placeOfBirth,
        },
        role: cp.role,
        character: cp.character,
        department: cp.department,
        job: cp.job,
        creditOrder: cp.creditOrder,
      })),
      roles,
      roleCount: person.contentRoles?.length || 0,
    };
  }
}
