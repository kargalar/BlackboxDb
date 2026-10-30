import {
  Arg,
  Ctx,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
  Mutation,
} from "type-graphql";
import { Content } from "../types/Content";
import { GraphQLContext } from "../context";
import { convertContentForGraphQL } from "./content/ContentUtils";

const CONTENT_EMOTIONS = [
  "funny",
  "scary",
  "emotional",
  "exciting",
  "relaxing",
  "thoughtful",
] as const;

type ContentEmotion = (typeof CONTENT_EMOTIONS)[number];

@ObjectType()
class EmotionCount {
  @Field(() => String)
  emotion: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
class ContentEmotionSummary {
  @Field(() => String, { nullable: true })
  myEmotion?: string | null;

  @Field(() => [EmotionCount])
  counts: EmotionCount[];
}

@ObjectType()
class EmotionContent {
  @Field(() => Content)
  content: Content;

  @Field(() => Int)
  reactionCount: number;
}

@Resolver()
export class EmotionReactionResolver {
  @Query(() => ContentEmotionSummary)
  async contentEmotionSummary(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<ContentEmotionSummary> {
    const [counts, myReaction] = await Promise.all([
      prisma.$queryRaw<EmotionCount[]>`
        SELECT emotion, COUNT(*)::int AS count
        FROM content_emotion_reaction
        WHERE content_id = ${contentId}
        GROUP BY emotion
      `,
      user
        ? prisma.$queryRaw<Array<{ emotion: string }>>`
            SELECT emotion
            FROM content_emotion_reaction
            WHERE user_id = ${user.id}::uuid AND content_id = ${contentId}
            LIMIT 1
          `.then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ]);

    return {
      myEmotion: myReaction?.emotion ?? null,
      counts,
    };
  }

  @Query(() => [EmotionContent])
  async emotionContents(
    @Arg("emotion", () => String) emotion: string,
    @Arg("contentType", () => String, { nullable: true }) contentType: string | undefined,
    @Arg("limit", () => Int, { defaultValue: 24 }) limit: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<EmotionContent[]> {
    if (!CONTENT_EMOTIONS.includes(emotion as ContentEmotion)) {
      throw new Error("Unsupported emotion");
    }

    const take = Math.min(Math.max(limit, 1), 100);
    const typeSlug = contentType?.toLowerCase() ?? null;
    const groupedReactions = await prisma.$queryRaw<Array<{ contentId: string; reactionCount: number }>>`
      SELECT r.content_id AS "contentId", COUNT(*)::int AS "reactionCount"
      FROM content_emotion_reaction r
      JOIN content c ON c.id = r.content_id
      JOIN content_type_lookup t ON t.id = c.content_type_id
      WHERE r.emotion = ${emotion}
        AND c.is_deleted = FALSE
        AND (${typeSlug}::text IS NULL OR t.slug = ${typeSlug})
      GROUP BY r.content_id
      ORDER BY "reactionCount" DESC, r.content_id ASC
      LIMIT ${take}
    `;
    if (groupedReactions.length === 0) return [];

    const contents = await prisma.content.findMany({
      where: { id: { in: groupedReactions.map(({ contentId }) => contentId) } },
      include: {
        contentType: true,
        images: true,
        bookPublications: true,
        translations: true,
      },
    });
    const contentById = new Map(contents.map((content) => [content.id, content]));

    return groupedReactions.flatMap(({ contentId, reactionCount }) => {
      const content = contentById.get(contentId);
      return content
        ? [{ content: convertContentForGraphQL(content), reactionCount }]
        : [];
    });
  }

  @Mutation(() => ContentEmotionSummary)
  async setContentEmotion(
    @Arg("contentId", () => String) contentId: string,
    @Arg("emotion", () => String, { nullable: true }) emotion: string | null,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<ContentEmotionSummary> {
    if (!user) throw new Error("Not authenticated");
    if (emotion !== null && !CONTENT_EMOTIONS.includes(emotion as ContentEmotion)) {
      throw new Error("Unsupported emotion");
    }

    if (emotion === null) {
      await prisma.$executeRaw`
        DELETE FROM content_emotion_reaction
        WHERE user_id = ${user.id}::uuid AND content_id = ${contentId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO content_emotion_reaction (user_id, content_id, emotion)
        VALUES (${user.id}::uuid, ${contentId}, ${emotion})
        ON CONFLICT (user_id, content_id)
        DO UPDATE SET emotion = EXCLUDED.emotion, updated_at = CURRENT_TIMESTAMP
      `;
    }

    return this.contentEmotionSummary(contentId, { prisma, user } as GraphQLContext);
  }
}
