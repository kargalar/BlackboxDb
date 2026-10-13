import { ObjectType, Field, ID, Int } from "type-graphql";
import { AppUser } from "./User";
import { Content } from "./Content";
import { ContentType } from "./ContentType";

// ======================================
// User Lists Types
// ======================================

@ObjectType()
export class UserList {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => String)
  ownerId: string;

  @Field(() => Boolean)
  isPublic: boolean;

  @Field(() => Boolean)
  isOrdered: boolean;

  @Field(() => Int)
  upvoteCount: number;

  @Field(() => Int)
  downvoteCount: number;

  @Field(() => Int)
  score: number;

  @Field(() => Int, { nullable: true })
  userVote?: number | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => AppUser)
  owner: AppUser;

  @Field(() => ContentType)
  contentType: ContentType;

  @Field(() => [UserListItem])
  items: UserListItem[];

  @Field(() => [UserListCollaborator])
  collaborators: UserListCollaborator[];

  @Field(() => Int)
  itemCount: number;
}

@ObjectType()
export class UserListItem {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  listId: number;

  @Field(() => String)
  contentId: string;

  @Field(() => String)
  addedById: string;

  @Field(() => Int)
  displayOrder: number;

  @Field(() => Date)
  addedAt: Date;

  @Field(() => Content)
  content: Content;

  @Field(() => AppUser)
  addedBy: AppUser;
}

@ObjectType()
export class UserListCollaborator {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  listId: number;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  role: string; // 'editor' | 'viewer'

  @Field(() => Date)
  addedAt: Date;

  @Field(() => AppUser)
  user: AppUser;
}

@ObjectType()
export class UserSavedList {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  userId: string;

  @Field(() => Int)
  listId: number;

  @Field(() => Date)
  savedAt: Date;

  @Field(() => UserList)
  list: UserList;
}


