import { ObjectType, Field, Int, Float } from "type-graphql";

/**
 * Auto-Fill Search Result — tüm content type'lar için ortak arama sonucu
 * Film/Dizi: TMDB, Kitap: Google Books, Oyun: IGDB
 */
@ObjectType()
export class AutoFillSearchResult {
  @Field(() => String, {
    description: "Kaynak ID (TMDB ID, Google Books ID, IGDB ID)",
  })
  sourceId!: string;

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

  @Field(() => String, { description: "movie | tv | book | game" })
  mediaType!: string;

  @Field(() => [String], {
    nullable: true,
    description: "Yazar (kitap) veya platform (oyun) bilgisi",
  })
  extraInfo?: string[];
}

/**
 * Auto-Fill Simple Item — genre, tag, platform gibi basit id+name çiftleri
 */
@ObjectType()
export class AutoFillSimpleItem {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;
}

/**
 * Auto-Fill Person Detail — Yazar / Yönetmen vb. için detaylı bilgiler
 */
@ObjectType()
export class AutoFillPersonDetail {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  biography?: string;

  @Field(() => String, { nullable: true })
  profileUrl?: string;

  @Field(() => String, { nullable: true })
  birthDate?: string;

  @Field(() => String, { nullable: true })
  deathDate?: string;
}

/**
 * Auto-Fill Book Edition — Farklı baskılar için detaylar
 */
@ObjectType()
export class AutoFillBookEdition {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => String, { nullable: true })
  publisher?: string;

  @Field(() => String, { nullable: true })
  publishedDate?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => String, { nullable: true })
  language?: string;

  @Field(() => String, { nullable: true })
  coverUrl?: string;

  @Field(() => Boolean, { defaultValue: false })
  isOriginal!: boolean;
}

/**
 * Auto-Fill Book Detail — Google Books'tan gelen kitap detayı
 */
@ObjectType()
export class AutoFillBookDetail {
  @Field(() => String)
  sourceId!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => String, { nullable: true })
  posterPath?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => Float, { nullable: true })
  voteAverage?: number;

  @Field(() => [String], { nullable: true })
  authors?: string[];

  @Field(() => String, { nullable: true })
  publisher?: string;

  @Field(() => String, { nullable: true })
  isbn?: string;

  @Field(() => String, { nullable: true })
  isbn13?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => [String], { nullable: true })
  categories?: string[];

  @Field(() => String, { nullable: true })
  language?: string;

  @Field(() => [AutoFillPersonDetail], { nullable: true })
  authorDetails?: AutoFillPersonDetail[];

  @Field(() => [AutoFillBookEdition], { nullable: true })
  editions?: AutoFillBookEdition[];

  @Field(() => String, { nullable: true })
  previewLink?: string;

  @Field(() => String, { nullable: true })
  infoLink?: string;
}

/**
 * Auto-Fill Game Detail — IGDB'den gelen oyun detayı
 */
@ObjectType()
export class AutoFillGameDetail {
  @Field(() => Int)
  sourceId!: number;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  originalTitle?: string;

  @Field(() => String, { nullable: true })
  overview?: string;

  @Field(() => String, { nullable: true })
  posterPath?: string;

  @Field(() => String, { nullable: true })
  backdropPath?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => Float, { nullable: true })
  voteAverage?: number;

  @Field(() => Int, { nullable: true })
  metacritic?: number;

  @Field(() => [AutoFillSimpleItem], { nullable: true })
  genres?: AutoFillSimpleItem[];

  @Field(() => [AutoFillSimpleItem], { nullable: true })
  tags?: AutoFillSimpleItem[];

  @Field(() => [AutoFillSimpleItem], { nullable: true })
  platforms?: AutoFillSimpleItem[];

  @Field(() => [AutoFillSimpleItem], { nullable: true })
  gameEngines?: AutoFillSimpleItem[];

  @Field(() => [AutoFillSimpleItem], { nullable: true })
  developers?: AutoFillSimpleItem[];

  @Field(() => [AutoFillSimpleItem], { nullable: true })
  publishers?: AutoFillSimpleItem[];

  @Field(() => String, { nullable: true })
  esrbRating?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => String, { nullable: true })
  trailerUrl?: string;

  @Field(() => String, { nullable: true })
  reviewVideoUrl?: string;

  @Field(() => String, { nullable: true })
  gameplayVideoUrl?: string;

  @Field(() => [String], { nullable: true })
  screenshots?: string[];

  @Field(() => [AutoFillSimpleItem], {
    nullable: true,
    description: "Player perspectives (First Person, Third Person, etc.)",
  })
  playerPerspectives?: AutoFillSimpleItem[];

  @Field(() => [AutoFillSimpleItem], {
    nullable: true,
    description: "Game modes (Singleplayer, Multiplayer, Co-op, etc.)",
  })
  gameModes?: AutoFillSimpleItem[];

  @Field(() => String, {
    nullable: true,
    description: "Franchise / collection name",
  })
  franchise?: string;

  @Field(() => [AutoFillExpansionItem], {
    nullable: true,
    description: "Expansions and remakes",
  })
  expansions?: AutoFillExpansionItem[];
}

/**
 * Auto-Fill Expansion Item — Expansion / Remake bilgisi
 */
@ObjectType()
export class AutoFillExpansionItem {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  posterUrl?: string;

  @Field(() => String, { nullable: true })
  releaseDate?: string;

  @Field(() => String, { description: "expansion | remake" })
  type!: string;
}

// ─── Content Image Types ───

/**
 * Tek bir görsel seçeneği (poster veya backdrop)
 */
@ObjectType()
export class ContentImageOption {
  @Field(() => String)
  url!: string;

  @Field(() => Int)
  width!: number;

  @Field(() => Int)
  height!: number;

  @Field(() => Float, { nullable: true })
  voteAverage?: number;

  @Field(() => String, { nullable: true })
  language?: string;
}

/**
 * İçerik görselleri — poster ve backdrop seçenekleri
 */
@ObjectType()
export class ContentImagesResponse {
  @Field(() => [ContentImageOption], { description: "Poster seçenekleri" })
  posters!: ContentImageOption[];

  @Field(() => [ContentImageOption], { description: "Backdrop seçenekleri" })
  backdrops!: ContentImageOption[];
}


