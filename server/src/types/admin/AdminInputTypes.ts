import { InputType, Field, Int } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";

@InputType()
export class ContentCitationInput {
  @Field(() => String)
  citingContentId!: string;

  @Field(() => String, { nullable: true })
  note?: string;

  @Field(() => String, { nullable: true })
  imageUrl?: string;
}

@InputType()
export class UpdateUserRolesInput {
  @Field(() => Boolean, { nullable: true })
  isAdmin?: boolean;

  @Field(() => Boolean, { nullable: true })
  isModerator?: boolean;
}

@InputType()
export class CreateContentRequestInput {
  @Field(() => String)
  title: string;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  reason?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  payload?: Record<string, unknown>;
}

@InputType()
export class ContentGenreInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class GenreInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;
}

@InputType()
export class GameModeInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class GameEngineInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class PersonRoleInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  label: string;

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;
}

@InputType()
export class CompanyRoleInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;
}

@InputType()
export class PerspectiveInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class PlatformInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class ContentCompanyInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  companyRoleId: number; // 1=developer, 2=publisher

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  headquarters?: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => Int, { nullable: true })
  foundingYear?: number;
}

@InputType()
export class BookPublicationInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  subtitle?: string;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => ContentCompanyInput, { nullable: true })
  publisher?: ContentCompanyInput;

  @Field(() => String, { nullable: true })
  translators?: string;

  @Field(() => String, { nullable: true })
  language?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => String, { nullable: true })
  coverUrl?: string;

  @Field(() => String, { nullable: true })
  publishedDate?: string;

  @Field(() => String, { nullable: true })
  editionType?: string;

  @Field(() => String, { nullable: true })
  format?: string;

  @Field(() => Boolean, { nullable: true })
  isOriginal?: boolean;

  @Field(() => Boolean, { nullable: true })
  isAbridged?: boolean;
}

@InputType()
export class ThemeInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class MoodInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class AgeRatingInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class ExpansionInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => String, { nullable: true, defaultValue: "expansion" })
  type?: string; // "expansion" or "remake"
}

@InputType()
export class ScreenshotInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  imageUrl: string;

  @Field(() => Int, { nullable: true })
  difficulty?: number;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  seasonNumber?: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  isEnabledForQuiz?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSpoiler?: boolean;

  @Field(() => Boolean, { nullable: true })
  isSensitive?: boolean;
}

@InputType()
export class ImageInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  filePath: string;

  @Field(() => String)
  type: string;
}

@InputType()
export class ContentLanguageInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class UpdateContentInput {
  @Field(() => [String], { nullable: true })
  additionalRatingCategories?: string[];

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => Int, { nullable: true })
  tmdbId?: number;

  @Field(() => Int, { nullable: true })
  igdbId?: number;

  @Field(() => String, { nullable: true })
  franchiseId?: string;

  @Field(() => String, { nullable: true })
  franchiseName?: string;

  @Field(() => [ContentLanguageInput], { nullable: true })
  languages?: ContentLanguageInput[];

  @Field(() => Int, { nullable: true })
  contentTypeId?: number;

  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => [String], { nullable: true })
  alternativeTitles?: string[];

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Boolean, { nullable: true })
  autoSelectHighestVotedMedia?: boolean;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  backdropUrl?: string;

  @Field(() => String, { nullable: true })
  cast?: string;

  @Field(() => String, { nullable: true })
  crew?: string;

  @Field(() => String, { nullable: true })
  seasons?: string;

  @Field(() => Int, { nullable: true })
  averageDuration?: number;

  @Field(() => Boolean, { nullable: true })
  isContinuing?: boolean;

  @Field(() => [ContentGenreInput], { nullable: true })
  genres?: ContentGenreInput[];

  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => String, { nullable: true })
  revenue?: string;

  @Field(() => Int, { nullable: true })
  numberOfEpisodes?: number;

  @Field(() => Int, { nullable: true })
  numberOfSeasons?: number;

  @Field(() => String, { nullable: true })
  tvType?: string;

  @Field(() => Boolean, { nullable: true })
  inProduction?: boolean;

  @Field(() => String, { nullable: true })
  firstAirDate?: string;

  @Field(() => String, { nullable: true })
  lastAirDate?: string;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => String, { nullable: true })
  translators?: string;

  @Field(() => String, { nullable: true })
  authors?: string;

  @Field(() => String, { nullable: true })
  publisher?: string;

  @Field(() => String, { nullable: true })
  publishedDate?: string;

  @Field(() => [BookPublicationInput], { nullable: true })
  bookPublications?: BookPublicationInput[];

  @Field(() => String, { nullable: true })
  previewLink?: string;

  @Field(() => String, { nullable: true })
  infoLink?: string;

  @Field(() => [GameModeInput], { nullable: true })
  gameModes?: GameModeInput[];

  @Field(() => [GameEngineInput], { nullable: true })
  gameEngines?: GameEngineInput[];

  @Field(() => [PerspectiveInput], { nullable: true })
  perspectives?: PerspectiveInput[];

  @Field(() => [PlatformInput], { nullable: true })
  platforms?: PlatformInput[];

  @Field(() => [ContentCompanyInput], { nullable: true })
  companies?: ContentCompanyInput[];

  @Field(() => [ThemeInput], { nullable: true })
  themes?: ThemeInput[];

  @Field(() => [MoodInput], { nullable: true })
  moods?: MoodInput[];

  @Field(() => Int, { nullable: true })
  ageRatingId?: number;

  @Field(() => String, { nullable: true })
  ageRatingName?: string;

  @Field(() => [String], { nullable: true })
  awards?: string[];

  @Field(() => [ScreenshotInput], { nullable: true })
  screenshots?: ScreenshotInput[];

  @Field(() => [ImageInput], { nullable: true })
  images?: ImageInput[];

  @Field(() => [ExpansionInput], { nullable: true })
  expansions?: ExpansionInput[];

  @Field(() => String, { nullable: true })
  trailerUrl?: string;

  @Field(() => String, { nullable: true })
  reviewVideoUrl?: string;

  @Field(() => String, { nullable: true })
  gameplayVideoUrl?: string;

  @Field(() => String, { nullable: true })
  spotifyPlaylistUrl?: string;

  @Field(() => [String], { nullable: true })
  lockedFields?: string[];

  @Field(() => [String], { nullable: true })
  similarContentIds?: string[];

  // Music-specific
  @Field(() => Boolean, { nullable: true })
  explicit?: boolean;

  @Field(() => String, { nullable: true })
  label?: string;

  @Field(() => Int, { nullable: true })
  totalTracks?: number;

  @Field(() => String, { nullable: true })
  spotifyUrl?: string;

  @Field(() => String, { nullable: true })
  musicReleaseType?: string;

  @Field(() => [ContentCitationInput], { nullable: true })
  citationsReceived?: ContentCitationInput[];

  @Field(() => [ContentCitationInput], { nullable: true })
  citationsMade?: ContentCitationInput[];

}

@InputType()
export class LanguageInput {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field(() => String)
  name: string;
}

@InputType()
export class SeriesInput {
  @Field(() => String, { nullable: true })
  id?: string;

  @Field(() => String)
  name: string;
}

@InputType()
export class PersonInput {
  @Field(() => Int, { nullable: true })
  id?: number;

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
}


