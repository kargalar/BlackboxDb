import { ObjectType, Field, ID, Int, Float } from "type-graphql";

@ObjectType("ExpansionType")
export class Expansion {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  contentId: string;

  @Field(() => String, { nullable: true })
  contentTitle?: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => Date, { nullable: true })
  releaseDate?: Date;

  @Field(() => String)
  type: string; // "expansion" veya "remake"

  @Field(() => Int)
  consumeCount: number;

  @Field(() => [Int])
  ratingDistribution: number[];

  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}

@ObjectType("UserExpansionLogType")
export class UserExpansionLog {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  userId: string;

  @Field(() => Int)
  expansionId: number;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Boolean)
  isConsumed: boolean;

  @Field(() => Date)
  date: Date;

  @Field(() => Date)
  updatedAt: Date;
}


