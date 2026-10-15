import { ObjectType, Field, Int } from "type-graphql";
import { BookPublication, Content } from "../Content";
import { ContentCitation } from "../ContentCitation";
import { AdminScreenshot } from "./AdminScreenshot";
import { ContentImage } from "../ContentImage";
import { AdminCompany } from "./AdminCompany";
import {
  AdminGenre,
  AdminGameEngine,
  AdminGameMode,
  AdminPerspective,
  AdminPlatform,
  AdminTheme,
  AdminMood,
  AdminAgeRating,
} from "./AdminSimpleTypes";
import { Expansion } from "../Expansion";

@ObjectType()
export class AdminContent {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => Int, { nullable: true })
  tmdbId?: number;

  @Field(() => Int, { nullable: true })
  igdbId?: number;

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => String, { nullable: true })
  contentTypeSlug?: string;

  @Field(() => [String], { nullable: true })
  additionalRatingCategories?: string[];

  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => [String], { nullable: true })
  alternativeTitles?: string[];

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => String, { nullable: true })
  description?: string;

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
  isDeleted?: boolean;

  @Field(() => Boolean, { nullable: true })
  isContinuing?: boolean;

  @Field(() => String, { nullable: true })
  collectionName?: string;

  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => String, { nullable: true })
  revenue?: string;

  @Field(() => String, { nullable: true })
  franchiseId?: string;

  @Field(() => String, { nullable: true })
  franchiseName?: string;

  // Film & TV-specific
  @Field(() => String, { nullable: true })
  cast?: string; // JSON array

  @Field(() => String, { nullable: true })
  crew?: string; // JSON array

  // TV/Game - average duration
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

  @Field(() => String, { nullable: true })
  seasons?: string; // JSON array

  // Book-specific
  @Field(() => String, { nullable: true })
  subtitle?: string;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => String, { nullable: true })
  authors?: string;

  @Field(() => BookPublication, { nullable: true })
  primaryBookPublication?: BookPublication | null;

  @Field(() => [BookPublication], { nullable: true })
  bookPublications?: BookPublication[];

  @Field(() => String, { nullable: true })
  publisher?: string;

  @Field(() => String, { nullable: true })
  publishedDate?: string;

  @Field(() => String, { nullable: true })
  categories?: string;

  @Field(() => String, { nullable: true })
  maturityRating?: string;

  @Field(() => [String], { nullable: true })
  languages?: string[];

  @Field(() => String, { nullable: true })
  previewLink?: string;

  @Field(() => String, { nullable: true })
  infoLink?: string;

  // Game-specific
  @Field(() => [AdminGameMode], { nullable: true })
  gameModes?: AdminGameMode[];

  @Field(() => [AdminGameEngine], { nullable: true })
  gameEngines?: AdminGameEngine[];

  @Field(() => [AdminPerspective], { nullable: true })
  perspectives?: AdminPerspective[];

  @Field(() => [AdminPlatform], { nullable: true })
  platforms?: AdminPlatform[];

  @Field(() => String, { nullable: true })
  fileSize?: string;

  @Field(() => [AdminTheme], { nullable: true })
  themes?: AdminTheme[];

  @Field(() => [AdminMood], { nullable: true })
  moods?: AdminMood[];

  @Field(() => AdminAgeRating, { nullable: true })
  ageRating?: AdminAgeRating;

  @Field(() => [String], { nullable: true })
  awards?: string[];

  @Field(() => [AdminGenre], { nullable: true })
  genres?: AdminGenre[];

  @Field(() => [AdminScreenshot], { nullable: true })
  screenshots?: AdminScreenshot[];

  @Field(() => [AdminCompany], { nullable: true })
  companies?: AdminCompany[];

  @Field(() => [Expansion], { nullable: true })
  expansions?: Expansion[];

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

  @Field(() => [Content], { nullable: true })
  similarContents?: Content[];

  @Field(() => [ContentCitation], { nullable: true })
  citationsReceived?: ContentCitation[];

  @Field(() => [ContentCitation], { nullable: true })
  citationsMade?: ContentCitation[];


  @Field(() => Boolean, { nullable: true })
  autoSelectHighestVotedMedia?: boolean;

  @Field(() => [ContentImage], { nullable: true })
  images?: ContentImage[];

  @Field(() => Date)
  createdAt: Date;
}


