import { Field, InputType, Int } from "type-graphql";

/**
 * Minimal, authenticated input used when a user action needs to materialize
 * an item returned by an external catalog provider in the local database.
 */
@InputType()
export class SaveContentInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Boolean, { nullable: true })
  adult?: boolean;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => String, { nullable: true })
  rawData?: string;

  @Field(() => String, { nullable: true })
  spotifyUrl?: string;

  @Field(() => String, { nullable: true })
  spotifyPlaylistUrl?: string;

  @Field(() => Boolean, { nullable: true })
  explicit?: boolean;

  @Field(() => String, { nullable: true })
  label?: string;

  @Field(() => Int, { nullable: true })
  totalTracks?: number;
}
