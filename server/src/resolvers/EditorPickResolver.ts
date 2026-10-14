import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Int,
  ObjectType,
  InputType,
  Field,
  Ctx,
  Authorized,
} from "type-graphql";
import { Content } from "../types/Content";
import { GraphQLContext } from "../context";
import { convertContentForGraphQL } from "./content/ContentUtils";

@ObjectType()
export class EditorPickType {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  contentId!: string;

  @Field(() => Int)
  contentTypeId!: number;

  @Field(() => String, { nullable: true })
  label?: string | null;

  @Field(() => Int)
  displayOrder!: number;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Content, { nullable: true })
  content?: Content | null;
}

@InputType()
export class EditorPickItemInput {
  @Field(() => String)
  contentId!: string;

  @Field(() => String, { nullable: true })
  label?: string;

  @Field(() => Int, { defaultValue: 0 })
  displayOrder!: number;
}

@Resolver(() => EditorPickType)
export class EditorPickResolver {
  @Query(() => [EditorPickType])
  async editorPicks(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Ctx() { prisma }: GraphQLContext
  ): Promise<EditorPickType[]> {
    const where: any = {};
    if (contentTypeId !== undefined && contentTypeId !== null) {
      where.contentTypeId = contentTypeId;
    }

    const picks = await prisma.editorPick.findMany({
      where,
      orderBy: [
        { contentTypeId: "asc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        content: true,
      },
    });

    return picks.map((p) => ({
      ...p,
      content: p.content ? (convertContentForGraphQL(p.content) as any) : null,
    }));
  }

  @Authorized(["ADMIN", "MODERATOR"])
  @Mutation(() => [EditorPickType])
  async setEditorPicks(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Arg("picks", () => [EditorPickItemInput]) picks: EditorPickItemInput[],
    @Ctx() { prisma }: GraphQLContext
  ): Promise<EditorPickType[]> {
    if (picks.length > 5) {
      throw new Error("Bir içerik türü için en fazla 5 editör seçimi eklenebilir.");
    }

    const contentIds = picks.map((p) => p.contentId);
    if (contentIds.length > 0) {
      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        select: { id: true, contentTypeId: true },
      });
      if (contents.length !== contentIds.length) {
        throw new Error("Seçilen içeriklerden bazıları veritabanında bulunamadı.");
      }
    }

    return await prisma.$transaction(async (tx) => {
      await tx.editorPick.deleteMany({
        where: { contentTypeId },
      });

      for (let i = 0; i < picks.length; i++) {
        const item = picks[i];
        await tx.editorPick.create({
          data: {
            contentId: item.contentId,
            contentTypeId,
            label: item.label?.trim() || null,
            displayOrder: item.displayOrder ?? i,
          },
        });
      }

      const updated = await tx.editorPick.findMany({
        where: { contentTypeId },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        include: {
          content: true,
        },
      });

      return updated.map((p) => ({
        ...p,
        content: p.content ? (convertContentForGraphQL(p.content) as any) : null,
      }));
    });
  }

  @Authorized(["ADMIN", "MODERATOR"])
  @Mutation(() => Boolean)
  async removeEditorPick(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext
  ): Promise<boolean> {
    await prisma.editorPick.delete({
      where: { id },
    });
    return true;
  }
}

