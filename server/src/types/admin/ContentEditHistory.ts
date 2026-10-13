import { Field, Int, ObjectType } from "type-graphql";
import GraphQLJSON from "graphql-type-json";
import { AppUser } from "../User";
import { AdminContent } from "./AdminContent";

@ObjectType()
export class ContentEditHistory {
  @Field(() => Int)
  id: number;

  @Field(() => String, { nullable: true })
  contentId?: string | null;

  @Field(() => String, { nullable: true })
  actorUserId?: string | null;

  @Field(() => String)
  action: string;

  @Field(() => String, { nullable: true })
  summary?: string | null;

  @Field(() => [String])
  changedFields: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  before?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  after?: any;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => AppUser, { nullable: true })
  actor?: AppUser | null;

  @Field(() => AdminContent, { nullable: true })
  content?: AdminContent | null;
}

@ObjectType()
export class AdminContentEditHistoryResponse {
  @Field(() => [ContentEditHistory])
  items: ContentEditHistory[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}
