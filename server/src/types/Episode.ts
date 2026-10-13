import { ObjectType, Field, Int, Float } from 'type-graphql';

// ======================================
// Updated Episode Type - Phase 2
// Removed: tmdbId, voteAverage
// ======================================

@ObjectType()
export class TvEpisode {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  tvShowId: string;

  @Field(() => Int)
  seasonNumber: number;

  @Field(() => Int)
  episodeNumber: number;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => Date, { nullable: true })
  airDate?: Date;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  stillUrl?: string; // Full CDN URL (renamed from stillPath)

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  // User-specific field
  @Field(() => Boolean, { nullable: true })
  watched?: boolean;

  @Field(() => Date, { nullable: true })
  watchedAt?: Date;

  @Field(() => Float, { nullable: true })
  userRating?: number;
}

@ObjectType()
export class UserEpisodeLog {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  userId: string;

  @Field(() => Int)
  episodeId: number;

  @Field(() => Boolean)
  watched: boolean;

  @Field(() => Float, { nullable: true })
  rating?: number;

  @Field(() => Date, { nullable: true })
  watchedAt?: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class ContinuingTvTrackerItem {
  @Field(() => String)
  tvShowId: string;

  @Field(() => String)
  tvShowTitle: string;

  @Field(() => String, { nullable: true })
  tvShowPosterUrl?: string;

  @Field(() => Int)
  seasonNumber: number;

  @Field(() => Int)
  episodeNumber: number;

  @Field(() => String)
  episodeTitle: string;

  @Field(() => Date)
  episodeAirDate: Date;

  @Field(() => String, { nullable: true })
  episodeStillUrl?: string;

  @Field(() => Int)
  backlogCount: number;

  @Field(() => String)
  contentRouteType: string;
}

@ObjectType()
export class ContinuingTvTrackerSummary {
  @Field(() => Int)
  continuingSeriesCount: number;

  @Field(() => Int)
  pastDueCount: number;

  @Field(() => Int)
  thisWeekCount: number;

  @Field(() => Int)
  nextWeekCount: number;
}

@ObjectType()
export class ContinuingSeriesItem {
  @Field(() => String)
  tvShowId: string;

  @Field(() => String)
  tvShowTitle: string;

  @Field(() => String, { nullable: true })
  tvShowPosterUrl?: string;

  @Field(() => Int)
  expectedEpisodeCount: number;

  @Field(() => Int)
  airedUnwatchedCount: number;

  @Field(() => Int)
  unairedCount: number;

  @Field(() => String)
  contentRouteType: string;
}

@ObjectType()
export class ContinuingTvTrackerPayload {
  @Field(() => [ContinuingTvTrackerItem])
  pastDue: ContinuingTvTrackerItem[];

  @Field(() => [ContinuingTvTrackerItem])
  thisWeek: ContinuingTvTrackerItem[];

  @Field(() => [ContinuingTvTrackerItem])
  nextWeek: ContinuingTvTrackerItem[];

  @Field(() => [ContinuingSeriesItem])
  allContinuingSeries: ContinuingSeriesItem[];

  @Field(() => ContinuingTvTrackerSummary)
  summary: ContinuingTvTrackerSummary;
}


