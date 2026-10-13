import { ObjectType, Field, ID, Int, Float } from "type-graphql";
import GraphQLJSON from "graphql-type-json";
import { BookPublication, Content } from "./Content";
import { Discussion, DiscussionComment } from "./Discussion";
import { AppUser } from "./User";
import { UserList } from "./List";
import { Person } from "./Person";

@ObjectType()
export class UserContentLog {
  @Field(() => GraphQLJSON, { nullable: true })
  ratingDetails?: any;
  @Field(() => ID)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  contentId: string;

  @Field(() => Int, { nullable: true })
  bookPublicationId?: number;

  @Field(() => Date)
  date: Date;

  @Field(() => Boolean)
  isFavorite: boolean;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Boolean, { nullable: true })
  isConsumeLater?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnRelease?: boolean;

  @Field(() => Boolean, { nullable: true })
  isContinuing?: boolean;

  @Field(() => Boolean, { nullable: true })
  isConsumed?: boolean;

  @Field(() => Boolean, { nullable: true })
  isAbandoned?: boolean;

  @Field(() => Int, { defaultValue: 1 })
  userConsumeCount?: number;

  @Field(() => Int, { nullable: true })
  playtimeMinutes?: number;

  @Field(() => Int, { nullable: true })
  platformId?: number;

  @Field(() => String, { nullable: true })
  bookFormat?: string;

  @Field(() => [String], { defaultValue: [] })
  tags!: string[];

  @Field(() => [AppUser], { nullable: true })
  taggedUsers?: AppUser[];

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => Date)
  updatedAt: Date;

  // Content relation
  @Field(() => Content, { nullable: true })
  content?: Content;

  @Field(() => BookPublication, { nullable: true })
  bookPublication?: BookPublication;

  @Field(() => String, { nullable: true })
  review?: string;

  @Field(() => Boolean, { nullable: true })
  hasReview?: boolean;


  @Field(() => Discussion, { nullable: true })
  reviewDiscussion?: Discussion;

  @Field(() => AppUser, { nullable: true, name: "user" })
  user?: AppUser;

  @Field(() => Boolean, { defaultValue: false })
  isStandaloneReview?: boolean;

  @Field(() => String, { nullable: true, defaultValue: "LOG" })
  activityType?: string; // "LOG", "REVIEW", "FOLLOW", "LIST", "DISCUSSION", "RECOMMENDATION", "COMMENT"

  @Field(() => AppUser, { nullable: true })
  targetUser?: AppUser;

  @Field(() => Discussion, { nullable: true })
  discussion?: Discussion;

  @Field(() => UserList, { nullable: true })
  userList?: UserList;

  @Field(() => String, { nullable: true })
  listId?: string; // We can return just ID or full list if needed

  @Field(() => DiscussionComment, { nullable: true })
  incomingComment?: DiscussionComment;

  @Field(() => Person, { nullable: true })
  favoritePerson?: Person;
}


