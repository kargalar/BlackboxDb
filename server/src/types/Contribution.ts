import { ObjectType, Field, Int } from "type-graphql";
import { AppUser } from "./User";
import { Content } from "./Content";
import GraphQLJSON from "graphql-type-json";

@ObjectType()
export class Contribution {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  contentId?: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  status: string;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: any;

  @Field(() => Int)
  pointsEarned: number;

  @Field(() => String, { nullable: true })
  reviewedById?: string;

  @Field(() => Date, { nullable: true })
  reviewedAt?: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => AppUser)
  user: AppUser;

  @Field(() => AppUser, { nullable: true })
  reviewer?: AppUser;

  @Field(() => Content, { nullable: true })
  content?: Content;
}


