import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType('AgeRatingType')
export class AgeRating {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;

  @Field(() => Int, { nullable: true })
  contentCount?: number;
}


