import { gql } from '@apollo/client';

export const SEARCH_LOCAL_CONTENT = gql`
  query SearchLocalContent($searchQuery: String!, $contentTypeId: Int, $limit: Int) {
    searchContent(searchQuery: $searchQuery, contentTypeId: $contentTypeId, limit: $limit) {
      items {
        id
        title
        originalTitle
        description
        posterUrl
        releaseDate
        contentType {
          name
        }
      }
    }
  }
`;

/**
 * Auto-Fill GraphQL Operations — Kitap (Google Books) & Oyun (IGDB)
 * Add Content sayfasında otomatik bilgi doldurmak için kullanılan sorgular
 */

// ─── Fragments ───

const AUTO_FILL_SEARCH_RESULT_FRAGMENT = gql`
  fragment AutoFillSearchResultFields on AutoFillSearchResult {
    sourceId
    title
    originalTitle
    overview
    posterPath
    releaseDate
    voteAverage
    mediaType
    extraInfo
  }
`;

const AUTO_FILL_BOOK_DETAIL_FRAGMENT = gql`
  fragment AutoFillBookDetailFields on AutoFillBookDetail {
    sourceId
    title
    overview
    posterPath
    releaseDate
    voteAverage
    authors
    publisher
    isbn
    isbn13
    pageCount
    categories
    language
    previewLink
    infoLink
    authorDetails {
      name
      biography
      profileUrl
      birthDate
      deathDate
    }
    editions {
      title
      isbn
      publisher
      publishedDate
      pageCount
      language
      coverUrl
      isOriginal
    }
  }
`;

const AUTO_FILL_GAME_DETAIL_FRAGMENT = gql`
  fragment AutoFillGameDetailFields on AutoFillGameDetail {
    sourceId
    title
    originalTitle
    overview
    posterPath
    backdropPath
    releaseDate
    voteAverage
    metacritic
    genres {
      name
    }
    tags {
      name
    }
    platforms {
      name
    }
    gameEngines {
      id
      name
    }
    developers {
      name
    }
    publishers {
      name
    }
    esrbRating
    website
    trailerUrl
    reviewVideoUrl
    gameplayVideoUrl
    screenshots
    playerPerspectives {
      name
    }
    gameModes {
      name
    }
    franchise
    expansions {
      name
      description
      posterUrl
      releaseDate
      type
    }
  }
`;

// ─── Queries ───

export const SEARCH_BOOKS = gql`
  ${AUTO_FILL_SEARCH_RESULT_FRAGMENT}
  query SearchBooks($query: String!, $startIndex: Int, $maxResults: Int) {
    searchBooks(query: $query, startIndex: $startIndex, maxResults: $maxResults) {
      ...AutoFillSearchResultFields
    }
  }
`;

export const FETCH_BOOK_DETAILS = gql`
  ${AUTO_FILL_BOOK_DETAIL_FRAGMENT}
  query FetchBookDetails($volumeId: String!) {
    fetchBookDetails(volumeId: $volumeId) {
      ...AutoFillBookDetailFields
    }
  }
`;

// ─── Open Library Queries ───

export const SEARCH_OPEN_LIBRARY = gql`
  ${AUTO_FILL_SEARCH_RESULT_FRAGMENT}
  query SearchOpenLibrary($query: String!, $offset: Int, $limit: Int) {
    searchOpenLibrary(query: $query, offset: $offset, limit: $limit) {
      ...AutoFillSearchResultFields
    }
  }
`;

export const FETCH_OPEN_LIBRARY_DETAILS = gql`
  ${AUTO_FILL_BOOK_DETAIL_FRAGMENT}
  query FetchOpenLibraryDetails($workKey: String!) {
    fetchOpenLibraryDetails(workKey: $workKey) {
      ...AutoFillBookDetailFields
    }
  }
`;

// ─── IGDB Queries ───

export const SEARCH_IGDB_GAMES = gql`
  ${AUTO_FILL_SEARCH_RESULT_FRAGMENT}
  query SearchIgdbGames($query: String!, $limit: Int, $offset: Int) {
    searchIgdbGames(query: $query, limit: $limit, offset: $offset) {
      ...AutoFillSearchResultFields
    }
  }
`;

export const FETCH_IGDB_GAME_DETAILS = gql`
  ${AUTO_FILL_GAME_DETAIL_FRAGMENT}
  query FetchIgdbGameDetails($gameId: Int!) {
    fetchIgdbGameDetails(gameId: $gameId) {
      ...AutoFillGameDetailFields
    }
  }
`;

// ─── TypeScript Interfaces ───

export interface AutoFillSearchResultData {
  sourceId: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType: string;
  extraInfo?: string[];
}

export interface AutoFillPersonDetailData {
  name: string;
  biography?: string;
  profileUrl?: string;
  birthDate?: string;
  deathDate?: string;
}

export interface AutoFillBookEditionData {
  title?: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  language?: string;
  coverUrl?: string;
  isOriginal: boolean;
}

export interface AutoFillBookDetailData {
  sourceId: string;
  title: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  authors?: string[];
  publisher?: string;
  isbn?: string;
  isbn13?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  previewLink?: string;
  infoLink?: string;
  authorDetails?: AutoFillPersonDetailData[];
  editions?: AutoFillBookEditionData[];
}

export interface AutoFillSimpleItemData {
  id: number;
  name: string;
}

export interface AutoFillGameDetailData {
  sourceId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  metacritic?: number;
  genres?: AutoFillSimpleItemData[];
  tags?: AutoFillSimpleItemData[];
  platforms?: AutoFillSimpleItemData[];
  gameEngines?: AutoFillSimpleItemData[];
  developers?: AutoFillSimpleItemData[];
  publishers?: AutoFillSimpleItemData[];
  esrbRating?: string;
  website?: string;
  trailerUrl?: string;
  reviewVideoUrl?: string;
  gameplayVideoUrl?: string;
  screenshots?: string[];
  playerPerspectives?: AutoFillSimpleItemData[];
  gameModes?: AutoFillSimpleItemData[];
  franchise?: string;
  expansions?: AutoFillExpansionItemData[];
}

export interface AutoFillExpansionItemData {
  name: string;
  description?: string;
  posterUrl?: string;
  releaseDate?: string;
  type: 'expansion' | 'remake';
}

// ─── Content Images ───

export const FETCH_CONTENT_IMAGES = gql`
  query FetchContentImages($sourceId: String!, $source: String!) {
    fetchContentImages(sourceId: $sourceId, source: $source) {
      posters {
        url
        width
        height
        voteAverage
        language
      }
      backdrops {
        url
        width
        height
        voteAverage
        language
      }
    }
  }
`;

export interface ContentImageOption {
  url: string;
  width: number;
  height: number;
  voteAverage?: number;
  language?: string;
}

export interface ContentImagesData {
  fetchContentImages: {
    posters: ContentImageOption[];
    backdrops: ContentImageOption[];
  };
}
