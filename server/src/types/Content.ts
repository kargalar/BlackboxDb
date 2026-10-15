import { ObjectType, Field, ID, Int, Float } from "type-graphql";
import { ContentType } from "./ContentType";
import { ContentPerson } from "./ContentPerson";
import { Genre } from "./Genre";
import { ContentScreenshot } from "./Quiz";
import { Expansion } from "./Expansion";
import { ContentImage } from "./ContentImage";
import { ContentCitation } from "./ContentCitation";

// ======================================
// Updated Content Type - Phase 2
// No API Dependencies (tmdbId, igdbId, googleBooksId removed)
// Path fields renamed to URL fields
// ======================================

// Age Rating type for Content
@ObjectType()
export class ContentAgeRating {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

// Metadata item types for different categories to fix Apollo cache collisions
@ObjectType()
export class ContentGameMode {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class ContentGameEngine {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class ContentPerspective {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class ContentPlatform {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class ContentTheme {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class ContentMood {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;
}

@ObjectType()
export class ContentCompanyDetails {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

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

// Company type for ContentCompany relationship
@ObjectType()
export class ContentCompany {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  contentId: string;

  @Field(() => String)
  companyId: string;

  @Field(() => Int)
  companyRoleId: number;

  @Field(() => ContentCompanyDetails, { nullable: true })
  company?: ContentCompanyDetails;
}

@ObjectType()
export class BookPublication {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  contentId: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  subtitle?: string;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => String, { nullable: true })
  publisherId?: string;

  @Field(() => ContentCompanyDetails, { nullable: true })
  publisher?: ContentCompanyDetails;

  @Field(() => [String])
  translators: string[];

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

  @Field(() => Boolean)
  isOriginal: boolean;

  @Field(() => Boolean)
  isAbridged: boolean;

  @Field(() => Int)
  consumeCount: number;

  @Field(() => [Int])
  ratingDistribution: number[];

  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => Int)
  ratingCount: number;
}

@ObjectType()
export class ContentDeveloperDetails {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

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

// Legacy Developer type - kept for backward compatibility
@ObjectType()
export class ContentDeveloper {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  contentId: string;

  @Field(() => String)
  developerId: string;

  @Field(() => ContentDeveloperDetails, { nullable: true })
  developer?: ContentDeveloperDetails;
}

@ObjectType()
export class Content {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => [String], { nullable: true })
  alternativeTitles?: string[];

  @Field(() => [String], { nullable: true })
  awards?: string[];

  @Field(() => String, { nullable: true })
  originalTitle?: string; // Orijinal dildeki başlık (ör: Japonca, Arapça)

  @Field(() => Int)
  contentTypeId: number;

  @Field(() => [String])
  additionalRatingCategories: string[];

  @Field(() => ContentType, { nullable: true })
  contentType?: ContentType;

  @Field(() => Date, { nullable: true })
  releaseDate?: Date;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  status?: string; // released, upcoming, in_production, cancelled

  @Field(() => Int, { nullable: true })
  runtime?: number; // Duration in minutes

  // External references (optional)
  @Field(() => String, { nullable: true })
  isbn?: string; // For books

  // Content-specific fields
  @Field(() => Int, { nullable: true })
  pageCount?: number; // For books

  @Field(() => Boolean)
  isContinuing: boolean; // For ongoing series/games (content property)

  // Statistics
  @Field(() => Int)
  consumeCount: number;

  @Field(() => Int)
  favoriteCount: number;

  @Field(() => Int)
  discussionCount: number;

  @Field(() => [Int], { nullable: true })
  ratingDistribution?: number[]; // [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

  // Images - posterUrl and backdropUrl are computed from ContentImage via FieldResolver
  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  backdropUrl?: string;

  @Field(() => Int, { nullable: true })
  posterImageId?: number;

  @Field(() => Int, { nullable: true })
  backdropImageId?: number;

  @Field(() => [ContentImage], { nullable: true })
  images?: ContentImage[];

  @Field(() => [Int], { nullable: true })
  screenshotImageIds?: number[]; // Array of ContentImage IDs for screenshots

  // Franchise reference (renamed from seriesId)
  @Field(() => String, { nullable: true })
  franchiseId?: string;

  @Field(() => String, { nullable: true })
  franchiseName?: string;

  // Languages array (ISO codes)
  @Field(() => [String], { nullable: true })
  languages?: string[];

  // Movie/TV common
  @Field(() => String, { nullable: true })
  budget?: string;

  @Field(() => String, { nullable: true })
  revenue?: string;

  // TV-specific
  @Field(() => Int, { nullable: true })
  averageDuration?: number; // Average duration in minutes (calculated from episodes for TV, from user play logs for games)

  @Field(() => Int, { nullable: true })
  numberOfEpisodes?: number;

  @Field(() => Int, { nullable: true })
  numberOfSeasons?: number;

  @Field(() => String, { nullable: true })
  tvType?: string;

  @Field(() => Boolean, { nullable: true })
  inProduction?: boolean;

  @Field(() => Date, { nullable: true })
  firstAirDate?: Date;

  @Field(() => Date, { nullable: true })
  lastAirDate?: Date;

  // Book-specific
  @Field(() => String, { nullable: true })
  subtitle?: string;

  @Field(() => [String], { nullable: true })
  authors?: string[];

  @Field(() => String, { nullable: true })
  publisher?: string;

  @Field(() => String, { nullable: true })
  publishedDate?: string;

  @Field(() => [String], { nullable: true })
  categories?: string[];

  @Field(() => String, { nullable: true })
  maturityRating?: string;

  @Field(() => String, { nullable: true })
  language?: string;

  @Field(() => String, { nullable: true })
  bookSeries?: string;

  @Field(() => Int, { nullable: true })
  bookSeriesNumber?: number;

  @Field(() => String, { nullable: true })
  previewLink?: string;

  @Field(() => String, { nullable: true })
  infoLink?: string;

  @Field(() => String, { nullable: true })
  canonicalVolumeLink?: string;

  // Game-specific
  @Field(() => String, { nullable: true })
  versionTitle?: string;

  @Field(() => Int, { nullable: true })
  versionParent?: number;

  @Field(() => Int, { nullable: true })
  collection?: number;

  @Field(() => [ContentGameMode], { nullable: true })
  gameModes?: { id: number; name: string }[];

  @Field(() => [ContentGameEngine], { nullable: true })
  gameEngines?: { id: number; name: string }[];

  @Field(() => [ContentPerspective], { nullable: true })
  perspectives?: { id: number; name: string }[];

  @Field(() => [ContentPlatform], { nullable: true })
  platforms?: { id: number; name: string }[];

  @Field(() => String, { nullable: true })
  fileSize?: string;

  @Field(() => [ContentTheme], { nullable: true })
  themes?: { id: number; name: string }[];

  @Field(() => [ContentMood], { nullable: true })
  moods?: { id: number; name: string }[];

  // Age Rating object structure
  @Field(() => ContentAgeRating, { nullable: true })
  ageRating?: { id: number; name: string } | null;

  @Field(() => Boolean)
  isEnabledForQuiz: boolean;

  @Field(() => Boolean, { defaultValue: true })
  autoSelectHighestVotedMedia: boolean;

  @Field(() => Int, { nullable: true })
  enabledScreenshotCount?: number;

  @Field(() => Int, { nullable: true })
  screenshotCount?: number;

  @Field(() => Int, { nullable: true })
  consumeLaterCount?: number;

  // Cast, Crew, Seasons (JSON strings from database)
  @Field(() => String, { nullable: true })
  cast?: string; // JSON array

  @Field(() => String, { nullable: true })
  crew?: string; // JSON array

  @Field(() => String, { nullable: true })
  seasons?: string; // JSON array

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

  // Timestamps
  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  // Relationships
  @Field(() => [ContentPerson], { nullable: true })
  people?: ContentPerson[];

  @Field(() => [Genre], { nullable: true })
  genres?: Genre[];

  @Field(() => [ContentScreenshot], { nullable: true })
  screenshots?: ContentScreenshot[];

  @Field(() => [ContentCompany], { nullable: true })
  companies?: ContentCompany[];

  @Field(() => BookPublication, { nullable: true })
  primaryBookPublication?: BookPublication | null;

  @Field(() => [BookPublication], { nullable: true })
  bookPublications?: BookPublication[];

  @Field(() => [ContentDeveloper], { nullable: true })
  developers?: ContentDeveloper[];

  @Field(() => [Expansion], { nullable: true })
  expansions?: Expansion[];

  // User-specific fields (populated when queried with user context)
  @Field(() => Float, { nullable: true })
  userRating?: number;

  @Field(() => Boolean, { nullable: true })
  isFavorite?: boolean;

  @Field(() => Boolean, { nullable: true })
  isConsumeLater?: boolean;

  @Field(() => Boolean, { nullable: true })
  userIsContinuing?: boolean; // User's tracking status (different from content.isContinuing)

  @Field(() => Boolean, { nullable: true })
  isConsumed?: boolean;

  @Field(() => Boolean, { nullable: true })
  isFeatured?: boolean;

  @Field(() => Boolean, { nullable: true })
  hasReview?: boolean;

  @Field(() => Date, { nullable: true })
  userDate?: Date;

  @Field(() => [Content], { nullable: true })
  similarContents?: Content[];

  @Field(() => [ContentCitation], { nullable: true })
  citationsMade?: ContentCitation[];

  @Field(() => [ContentCitation], { nullable: true })
  citationsReceived?: ContentCitation[];


  @Field(() => String, { nullable: true })
  similarDisplayTitle?: string;

  @Field(() => String, { nullable: true })
  similarDisplaySubtitle?: string;

  @Field(() => Boolean, { nullable: true })
  similarIsFranchise?: boolean;

  @Field(() => Int, { nullable: true })
  similarGroupCount?: number;
}


