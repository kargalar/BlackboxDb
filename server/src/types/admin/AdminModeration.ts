import { ObjectType, Field, ID, Int } from "type-graphql";

@ObjectType()
export class ModerationReport {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  reporterId: string;

  @Field(() => String)
  reporterUsername: string;

  @Field(() => String)
  reason: string;

  @Field(() => String)
  status: string;

  @Field(() => Date)
  createdAt: Date;
}

@ObjectType()
export class ModerationComment {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  type: string; // "comment" | "discussionComment"

  @Field(() => String)
  text: string;

  @Field(() => String)
  authorId: string;

  @Field(() => String)
  authorUsername: string;

  @Field(() => String, { nullable: true })
  authorPicturePath?: string | null;

  @Field(() => String, { nullable: true })
  contentId?: string | null;

  @Field(() => String, { nullable: true })
  contentTitle?: string | null;

  @Field(() => Int, { nullable: true })
  discussionId?: number | null;

  @Field(() => String, { nullable: true })
  discussionTitle?: string | null;

  @Field(() => Int, { nullable: true })
  parentId?: number | null;

  @Field(() => Int)
  upvoteCount: number;

  @Field(() => Int)
  downvoteCount: number;

  @Field(() => Int)
  score: number;

  @Field(() => Boolean)
  isReported: boolean;

  @Field(() => Int)
  reportCount: number;

  @Field(() => [ModerationReport])
  reports: ModerationReport[];

  @Field(() => [ModerationComment], { nullable: true })
  replies?: ModerationComment[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}


