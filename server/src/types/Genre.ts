import { ObjectType, Field, Int } from "type-graphql";

@ObjectType("GenreType")
export class Genre {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => Int, { nullable: true })
  contentCount?: number;
}


