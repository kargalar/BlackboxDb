import { ObjectType, Field, ID, Int, InputType, Float } from "type-graphql";
import { AppUser } from "./User";
import { Content } from "./Content";

@ObjectType()
export class Discussion {
  @Field(() => ID)
  id: number;

  @Field(() => String, { nullable: true })
  contentId?: string | null;

  @Field(() => String)
  authorId: string;

  @Field(() => String)
  type: string; // 'discussion' | 'comment'

  @Field(() => Boolean)
  isPublic: boolean;

  @Field(() => Boolean)
  isSpoiler: boolean;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String)
  description: string;

  @Field(() => Int)
  upvoteCount: number;

  @Field(() => Int)
  downvoteCount: number;

  @Field(() => Int)
  commentCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  // Computed fields
  @Field(() => Int)
  score: number; // upvoteCount - downvoteCount

  @Field(() => Int, { nullable: true })
  userVote?: number; // 1, -1, or null

  @Field(() => Float, { nullable: true })
  authorPlaytimeMinutes?: number | null; // Author's playtime for this content (games)

  @Field(() => Float, { nullable: true })
  authorRating?: number | null; // Author's rating for this content

  @Field(() => Boolean, { nullable: true })
  authorIsFavorite?: boolean | null; // Whether the author has favorited this content

  @Field(() => Boolean, { nullable: true })
  authorIsAbandoned?: boolean | null; // Whether the author has abandoned this content

  // Relations
  @Field(() => AppUser, { nullable: true })
  author?: AppUser;

  @Field(() => Content, { nullable: true })
  content?: Content;
}

@ObjectType()
export class DiscussionComment {
  @Field(() => ID)
  id: number;

  @Field(() => Int)
  discussionId: number;

  @Field(() => String)
  authorId: string;

  @Field(() => String)
  text: string;

  @Field(() => Int, { nullable: true })
  parentId?: number;

  @Field(() => Int)
  upvoteCount: number;

  @Field(() => Int)
  downvoteCount: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  // Computed fields
  @Field(() => Int)
  score: number; // upvoteCount - downvoteCount

  @Field(() => Int, { nullable: true })
  userVote?: number; // 1, -1, or null

  // Relations
  @Field(() => AppUser, { nullable: true })
  author?: AppUser;

  @Field(() => [AppUser], { nullable: true })
  mentions?: AppUser[];

  @Field(() => [DiscussionComment], { nullable: true })
  replies?: DiscussionComment[];
}

@InputType()
export class CreateDiscussionInput {
  @Field(() => String, { nullable: true })
  contentId?: string | null;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;
}

@InputType()
export class CreateCommentInput {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  text: string; // maps to description

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  isPublic?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isSpoiler?: boolean;

  @Field(() => [String], { nullable: true })
  mentionedUserIds?: string[];
}

@InputType()
export class CreateDiscussionCommentInput {
  @Field(() => Int)
  discussionId: number;

  @Field(() => String)
  text: string;

  @Field(() => Int, { nullable: true })
  parentId?: number;

  @Field(() => [String], { nullable: true })
  mentionedUserIds?: string[];
}

@InputType()
export class UpdateDiscussionCommentInput {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  text: string;

  @Field(() => [String], { nullable: true })
  mentionedUserIds?: string[];
}

@ObjectType()
export class DiscussionVoter {
  @Field(() => String)
  id: string;

  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  picturePath?: string | null;

  @Field(() => Int)
  voteType: number;
}

@InputType()
export class UpdateDiscussionInput {
  @Field(() => Int)
  id: number;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  isPublic?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSpoiler?: boolean;
}

@ObjectType()
export class Report {
  @Field(() => ID)
  id: number;

  @Field(() => String)
  reporterId: string;

  @Field(() => String)
  targetType: string;

  @Field(() => String)
  targetId: string;

  @Field(() => String)
  reason: string;

  @Field(() => String)
  status: string;

  @Field(() => Date)
  createdAt: Date;
}


