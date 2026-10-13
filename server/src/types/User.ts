import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
export class AppUser {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  picturePath?: string;

  @Field(() => String, { nullable: true })
  coverPhotoUrl?: string;

  @Field(() => String)
  username: string;

  @Field(() => String)
  email: string;

  @Field(() => String, { nullable: true })
  bio?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => String, { nullable: true })
  personalityAnalyze?: string;

  @Field(() => Boolean)
  isAdmin: boolean;

  @Field(() => Boolean)
  isModerator: boolean;

  // User preferences
  @Field(() => [Int], { nullable: true })
  preferredContentTypes?: number[];

  @Field(() => Int, { nullable: true })
  preferredGamePlatformId?: number | null;

  @Field(() => [Int], { nullable: true })
  preferredGamePlatformIds?: number[];

  @Field(() => Boolean, { nullable: true })
  splitHomePopularSections?: boolean;

  @Field(() => Int, { nullable: true })
  gridColumns?: number;

  @Field(() => Int, { nullable: true })
  gridRows?: number;

  @Field(() => Boolean, { nullable: true })
  posterZoomEnabled?: boolean;

  @Field(() => Boolean, { nullable: true })
  posterIconsBelow?: boolean;

  @Field(() => Boolean, { nullable: true })
  showSensitiveContent?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnFollows?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnContentRequestUpdates?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnCommentVotes?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnCommentReplies?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnMentions?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnRecommendations?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnNewSeasons?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnContentReleased?: boolean;

  @Field(() => Boolean, { nullable: true })
  notifyOnRoleUpdates?: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Int, { nullable: true })
  contributionScore?: number;

  @Field(() => Boolean, { nullable: true })
  isSpotifyConnected?: boolean;
}

@ObjectType()
export class ContributorLeaderboardEntry {
  @Field(() => Int)
  rank: number;

  @Field(() => AppUser)
  user: AppUser;

  @Field(() => Int)
  contributionScore: number;
}



