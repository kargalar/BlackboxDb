import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { TvEpisode } from './Episode';

@ObjectType()
export class TvSeason {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  tvShowId: string;

  @Field(() => Int)
  seasonNumber: number;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => Date, { nullable: true })
  airDate?: Date;

  @Field(() => Int)
  episodeCount: number;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => [TvEpisode], { nullable: true })
  episodes?: TvEpisode[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Float, { nullable: true })
  userRating?: number;

  @Field(() => Int, { defaultValue: 0 })
  viewerCount: number;
}


