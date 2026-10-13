import { Resolver, Query, Mutation, Arg, Ctx, Authorized } from "type-graphql";
import { PrismaClient } from "@prisma/client";
import { GraphQLContext } from "../../context";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
export class AppConfigType {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  theme!: string;

  @Field(() => Boolean)
  isBookEnabled!: boolean;

  @Field(() => Date)
  updatedAt!: Date;
}

const prisma = new PrismaClient();

@Resolver()
export class AppConfigResolver {
  @Query(() => AppConfigType)
  async getGlobalSettings(): Promise<AppConfigType> {
    let config = await prisma.appConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.appConfig.create({
        data: { id: 1, theme: "default", isBookEnabled: true },
      });
    }
    return config;
  }

  @Authorized(["ADMIN"])
  @Mutation(() => AppConfigType)
  async updateGlobalTheme(
    @Arg("theme", () => String) theme: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<AppConfigType> {
    if (!ctx.user?.isAdmin) {
      throw new Error("Yetkisiz işlem.");
    }

    const config = await prisma.appConfig.upsert({
      where: { id: 1 },
      update: { theme },
      create: { id: 1, theme },
    });

    return config;
  }

  @Authorized(["ADMIN"])
  @Mutation(() => AppConfigType)
  async updateBookModuleStatus(
    @Arg("isEnabled", () => Boolean) isEnabled: boolean,
    @Ctx() ctx: GraphQLContext
  ): Promise<AppConfigType> {
    if (!ctx.user?.isAdmin) {
      throw new Error("Yetkisiz işlem.");
    }

    const config = await prisma.appConfig.upsert({
      where: { id: 1 },
      update: { isBookEnabled: isEnabled },
      create: { id: 1, isBookEnabled: isEnabled, theme: "default" },
    });

    return config;
  }
}
