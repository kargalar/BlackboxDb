import { InputType, Field, Int } from "type-graphql";
import {
  ContentGenreInput,
  GameEngineInput,
  GameModeInput,
  PerspectiveInput,
  PlatformInput,
  ContentCompanyInput,
  ThemeInput,
  MoodInput,
  ScreenshotInput,
  ExpansionInput,
  ContentLanguageInput,
  BookPublicationInput,
  ImageInput,
  ContentCitationInput,
} from "./AdminInputTypes";

@InputType()
export class CreateContentInput {
  @Field(() => String)
  title: string;

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

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => [String], { nullable: true })
  additionalRatingCategories?: string[];

  // Common fields
  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => [String], { nullable: true })
  alternativeTitles?: string[];

  @Field(() => [String], { nullable: true })
  awards?: string[];

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  backdropUrl?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Boolean, { nullable: true })
  adult?: boolean;

  @Field(() => Boolean, { nullable: true })
  isContinuing?: boolean;

  @Field(() => String, { nullable: true })
  collectionName?: string;

  @Field(() => [ContentGenreInput], { nullable: true })
  genres?: ContentGenreInput[];

  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => String, { nullable: true })
  revenue?: string;

  // TV/Game
  @Field(() => Int, { nullable: true })
  averageDuration?: number;

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
// Book-specific
  @Field(() => String, { nullable: true })
  subtitle?: string;

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

  @Field(() => String, { nullable: true })
  categories?: string;

  @Field(() => String, { nullable: true })
  maturityRating?: string;

  @Field(() => String, { nullable: true })
  bookSeries?: string;

  @Field(() => Int, { nullable: true })
  bookSeriesNumber?: number;

  @Field(() => [BookPublicationInput], { nullable: true })
  bookPublications?: BookPublicationInput[];

  @Field(() => String, { nullable: true })
  previewLink?: string;

  @Field(() => String, { nullable: true })
  infoLink?: string;

  // Game-specific
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

  // General - all content types
  @Field(() => [ThemeInput], { nullable: true })
  themes?: ThemeInput[];

  @Field(() => [MoodInput], { nullable: true })
  moods?: MoodInput[];

  @Field(() => Int, { nullable: true })
  ageRatingId?: number;

  @Field(() => String, { nullable: true })
  ageRatingName?: string;

  // Film-specific (JSON strings)
  @Field(() => String, { nullable: true })
  cast?: string;

  @Field(() => String, { nullable: true })
  crew?: string;

  // TV-specific (JSON strings)
  @Field(() => String, { nullable: true })
  seasons?: string;

  // Screenshots
  @Field(() => [ScreenshotInput], { nullable: true })
  screenshots?: ScreenshotInput[];

  @Field(() => [ImageInput], { nullable: true })
  images?: ImageInput[];

  // Expansions (DLC) for games
  @Field(() => [ExpansionInput], { nullable: true })
  expansions?: ExpansionInput[];

  // Trailer URL
  @Field(() => String, { nullable: true })
  trailerUrl?: string;

  @Field(() => String, { nullable: true })
  reviewVideoUrl?: string;

  @Field(() => String, { nullable: true })
  gameplayVideoUrl?: string;

  // Soundtrack
  @Field(() => String, { nullable: true })
  spotifyPlaylistUrl?: string;

  @Field(() => [String], { nullable: true })
  lockedFields?: string[];

  @Field(() => [String], { nullable: true })
  similarContentIds?: string[];

  @Field(() => Boolean, { nullable: true })
  autoSelectHighestVotedMedia?: boolean;

  @Field(() => [ContentCitationInput], { nullable: true })
  citationsReceived?: ContentCitationInput[];

  @Field(() => [ContentCitationInput], { nullable: true })
  citationsMade?: ContentCitationInput[];
}


