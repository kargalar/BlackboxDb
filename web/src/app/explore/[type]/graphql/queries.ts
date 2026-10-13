import { gql } from '@apollo/client';

/**
 * GraphQL query for searching and filtering content
 */
export const SEARCH_CONTENT = gql`
  query SearchContent($searchQuery: String, $contentTypeId: Int, $limit: Int, $offset: Int) {
    searchContent(
      searchQuery: $searchQuery
      contentTypeId: $contentTypeId
      limit: $limit
      offset: $offset
    ) {
      items {
        id
        title
        contentTypeId
        releaseDate
        description
        posterUrl
        backdropUrl
        popularity
        runtime
        status
        genres {
          id
          name
        }
        themes {
          id
          name
        }
        moods {
          id
          name
        }
        ageRating {
          id
          name
        }
      }
      total
      page
      totalPages
    }
  }
`;

/**
 * GraphQL query for popular content (fallback when no search)
 */
export const GET_POPULAR_CONTENT = gql`
  query GetPopularContent($type: String, $limit: Int) {
    popularContent(type: $type, limit: $limit) {
      id
      title
      contentTypeId
      releaseDate
      description
      posterUrl
      backdropUrl
      popularity
      runtime
      status
      genres {
        id
        name
      }
      themes {
        id
        name
      }
      moods {
        id
        name
      }
      ageRating {
        id
        name
      }
    }
  }
`;
