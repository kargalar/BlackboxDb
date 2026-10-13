import { ObjectType, Field, Int } from "type-graphql";
import { ContentPerson } from "./ContentPerson";

@ObjectType()
export class Person {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  biography?: string;

  @Field(() => String, { nullable: true })
  birthDate?: string;

  @Field(() => String, { nullable: true })
  deathDate?: string;

  @Field(() => String, { nullable: true })
  gender?: string;

  @Field(() => String, { nullable: true })
  profileUrl?: string;

  @Field(() => String, { nullable: true })
  placeOfBirth?: string;

  @Field(() => [ContentPerson], { nullable: true })
  contentRoles?: ContentPerson[];

  @Field(() => [String], { nullable: true })
  roles?: string[];

  @Field(() => Int, { nullable: true })
  roleCount?: number;

  @Field(() => String, { nullable: true })
  createdAt?: string;

  @Field(() => Int, { nullable: true })
  contentCount?: number;

  @Field(() => Boolean, { nullable: true })
  isFavorite?: boolean;
}

@ObjectType()
export class PersonExploreResponse {
  @Field(() => [Person])
  items: Person[];

  @Field(() => Int)
  totalCount: number;
}


