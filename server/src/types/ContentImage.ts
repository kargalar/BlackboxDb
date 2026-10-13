import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class ContentImage {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  contentId!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String)
  version!: string;

  @Field(() => String)
  filePath!: string;

  @Field(() => Int, { defaultValue: 0 })
  upvoteCount!: number;

  @Field(() => Int, { defaultValue: 0 })
  downvoteCount!: number;

  @Field(() => Int, { nullable: true })
  userVote?: number | null;
}


