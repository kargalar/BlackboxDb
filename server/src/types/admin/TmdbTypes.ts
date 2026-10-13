import { ObjectType, Field, Int, Float } from "type-graphql";

/**
 * TMDB Search Result — arama sonuçlarında dönen özet bilgi
 */
@ObjectType()
export class TmdbSearchResult {
  @Field(() => Int)
  tmdbId!: number;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => String, { nullable: true })
  posterPath?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => Float, { nullable: true })
  voteAverage?: number;

  @Field(() => String, { nullable: true })
  mediaType?: string;
}

/**
 * TMDB Genre
 */
@ObjectType()
export class TmdbGenre {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;
}

/**
 * TMDB Cast member
 */
@ObjectType()
export class TmdbCastMember {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  character?: string;

  @Field(() => String, { nullable: true })
  profilePath?: string;

  @Field(() => Int, { nullable: true })
  order?: number;

  @Field(() => Int, { nullable: true })
  gender?: number;

  @Field(() => Float, { nullable: true })
  popularity?: number;

  // Added newly for extended autofill details
  @Field(() => String, { nullable: true })
  biography?: string;

  @Field(() => String, { nullable: true })
  birthday?: string;

  @Field(() => String, { nullable: true })
  deathday?: string;

  @Field(() => String, { nullable: true })
  placeOfBirth?: string;
}

/**
 * TMDB Crew member
 */
@ObjectType()
export class TmdbCrewMember {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  job?: string;

  @Field(() => String, { nullable: true })
  department?: string;

  @Field(() => String, { nullable: true })
  profilePath?: string;

  @Field(() => Int, { nullable: true })
  gender?: number;

  @Field(() => Float, { nullable: true })
  popularity?: number;

  // Added newly for extended autofill details
  @Field(() => String, { nullable: true })
  biography?: string;

  @Field(() => String, { nullable: true })
  birthday?: string;

  @Field(() => String, { nullable: true })
  deathday?: string;

  @Field(() => String, { nullable: true })
  placeOfBirth?: string;
}

/**
 * TMDB Spoken Language
 */
@ObjectType()
export class TmdbLanguage {
  @Field(() => String, { nullable: true })
  iso6391?: string;

  @Field(() => String, { nullable: true })
  englishName?: string;

  @Field(() => String, { nullable: true })
  name?: string;
}

/**
 * TMDB Keyword (tema bilgisi)
 */
@ObjectType()
export class TmdbKeyword {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;
}

/**
 * TMDB Production Company
 */
@ObjectType()
export class TmdbCompany {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  logoPath?: string;

  @Field(() => String, { nullable: true })
  originCountry?: string;
}

/**
 * TMDB Video (trailer vb.)
 */
@ObjectType()
export class TmdbVideo {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  site?: string;

  @Field(() => String, { nullable: true })
  type?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: "true ise resmi trailer",
  })
  official?: boolean;
}

/**
 * TMDB Episode (dizi bölüm bilgisi)
 */
@ObjectType()
export class TmdbEpisode {
  @Field(() => Int)
  episodeNumber!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  airDate?: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  stillPath?: string;
}

/**
 * TMDB Season (dizi sezon bilgisi)
 */
@ObjectType()
export class TmdbSeason {
  @Field(() => Int)
  seasonNumber!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  airDate?: string;

  @Field(() => Int, { nullable: true })
  episodeCount?: number;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => String, { nullable: true })
  posterPath?: string;

  @Field(() => [TmdbEpisode], { nullable: true })
  episodes?: TmdbEpisode[];
}

/**
 * TMDB Franchise (Collection)
 */
@ObjectType()
export class TmdbFranchise {
  @Field(() => Int)
  tmdbCollectionId!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  posterPath?: string;

  @Field(() => String, { nullable: true })
  backdropPath?: string;
}

/**
 * TMDB Detail Result — seçilen içeriğin tüm detayları
 */
@ObjectType()
export class TmdbDetailResult {
  @Field(() => Int)
  tmdbId!: number;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => Int, { nullable: true })
  runtime?: number;

  @Field(() => String, { nullable: true })
  posterPath?: string;

  @Field(() => String, { nullable: true })
  backdropPath?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  @Field(() => Float, { nullable: true })
  voteAverage?: number;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field(() => Float, { nullable: true })
  revenue?: number;

  @Field(() => String, { nullable: true })
  mediaType?: string;

  // Genres
  @Field(() => [TmdbGenre], { nullable: true })
  genres?: TmdbGenre[];

  // Languages
  @Field(() => [TmdbLanguage], { nullable: true })
  spokenLanguages?: TmdbLanguage[];

  // Cast & Crew
  @Field(() => [TmdbCastMember], { nullable: true })
  cast?: TmdbCastMember[];

  @Field(() => [TmdbCrewMember], { nullable: true })
  crew?: TmdbCrewMember[];

  // Videos (trailers)
  @Field(() => [TmdbVideo], { nullable: true })
  videos?: TmdbVideo[];

  // Keywords (themes)
  @Field(() => [TmdbKeyword], { nullable: true })
  keywords?: TmdbKeyword[];

  @Field(() => [TmdbCompany], { nullable: true })
  productionCompanies?: TmdbCompany[];

  @Field(() => TmdbFranchise, { nullable: true })
  franchise?: TmdbFranchise;

  @Field(() => String, { nullable: true })
  ageRating?: string;

  // TV-specific fields
  @Field(() => String, { nullable: true })
  firstAirDate?: string;

  @Field(() => String, { nullable: true })
  lastAirDate?: string;

  @Field(() => Boolean, { nullable: true })
  inProduction?: boolean;

  @Field(() => Int, { nullable: true })
  numberOfSeasons?: number;

  @Field(() => Int, { nullable: true })
  numberOfEpisodes?: number;

  @Field(() => [TmdbSeason], { nullable: true })
  seasons?: TmdbSeason[];
}

/**
 * TMDB Person Detail Result — Kişi detayları için dönen tip
 */
@ObjectType()
export class TmdbPersonDetailResult {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  biography?: string;

  @Field(() => String, { nullable: true })
  birthday?: string;

  @Field(() => String, { nullable: true })
  deathday?: string;

  @Field(() => Int, { nullable: true })
  gender?: number;

  @Field(() => String, { nullable: true })
  placeOfBirth?: string;

  @Field(() => String, { nullable: true })
  profilePath?: string;
}


