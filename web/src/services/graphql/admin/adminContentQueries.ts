import { gql } from '@apollo/client';

// ==========================================
// CONTENT MANAGEMENT - QUERIES
// ==========================================

export const LIST_CONTENT = gql`
  query ListContent($search: String, $limit: Int) {
    listContent(search: $search, limit: $limit) {
      id
      title
      originalTitle
      alternativeTitles
      tmdbId
      igdbId
      contentTypeId
      contentTypeSlug
      releaseDate
      description
      status
      runtime
      isbn
      pageCount
      isContinuing
      posterUrl
      backdropUrl
      franchiseName
      genres {
        id
        name
      }
      budget
      revenue
      averageDuration
      numberOfEpisodes
      numberOfSeasons
      tvType
      inProduction
      firstAirDate
      lastAirDate
      authors
      languages
      gameModes {
        id
        name
      }
      gameEngines {
        id
        name
      }
      perspectives {
        id
        name
      }
      platforms {
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
      awards
      companies {
        id
        companyId
        companyRoleId
        company {
          id
          name
        }
      }
      cast
      crew
      trailerUrl
      reviewVideoUrl
      gameplayVideoUrl
      spotifyPlaylistUrl
      lockedFields
      createdAt
    }
  }
`;

export const GET_CONTENT_BY_ID = gql`
  query GetContentById($id: String!) {
    getContentById(id: $id) {
      id
      title
      originalTitle
      alternativeTitles
      tmdbId
      igdbId
      contentTypeId
      contentTypeSlug
      additionalRatingCategories
      releaseDate
      description
      status
      runtime
      isbn
      pageCount
      isContinuing
      posterUrl
      backdropUrl
      autoSelectHighestVotedMedia
      images {
        id
        contentId
        type
        version
        filePath
        upvoteCount
        downvoteCount
        userVote
      }
      franchiseId
      franchiseName
      genres {
        id
        name
      }
      budget
      revenue
      cast
      crew
      averageDuration
      numberOfEpisodes
      numberOfSeasons
      tvType
      inProduction
      firstAirDate
      lastAirDate
      subtitle
      authors
      previewLink
      infoLink
      primaryBookPublication {
        id
        contentId
        title
        subtitle
        isbn
        publisherId
        publisher {
          id
          name
          logoUrl
        }
        translators
        language
        pageCount
        coverUrl
        publishedDate
        editionType
        format
        isOriginal
        isAbridged
        consumeCount
        ratingDistribution
        averageRating
        ratingCount
      }
      bookPublications {
        id
        contentId
        title
        subtitle
        isbn
        publisherId
        publisher {
          id
          name
          logoUrl
        }
        translators
        language
        pageCount
        coverUrl
        publishedDate
        editionType
        format
        isOriginal
        isAbridged
        consumeCount
        ratingDistribution
        averageRating
        ratingCount
      }
      publisher
      publishedDate
      categories
      maturityRating
      languages
      gameModes {
        id
        name
      }
      gameEngines {
        id
        name
      }
      perspectives {
        id
        name
      }
      platforms {
        id
        name
      }
      fileSize
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
      awards
      seasons
      screenshots {
        id
        imageUrl
        difficulty
        order
        seasonNumber
        isEnabledForQuiz
        isSpoiler
        isSensitive
        upvoteCount
        downvoteCount
        userVote
      }
      companies {
        id
        contentId
        companyId
        companyRoleId
        company {
          id
          name
          description
          headquarters
          logoUrl
          website
          foundingYear
        }
      }
      expansions {
        id
        contentId
        name
        description
        posterUrl
        releaseDate
        type
      }
      trailerUrl
      reviewVideoUrl
      gameplayVideoUrl
      spotifyPlaylistUrl
      lockedFields
      images {
        id
        type
        version
        filePath
        upvoteCount
        downvoteCount
      }
      similarContents {
        id
        title
        releaseDate
        posterUrl
        contentType {
          id
          name
        }
      }
      citationsReceived {
        id
        citingContentId
        citedContentId
        note
        imageUrl
        citingContent {
          id
          title
          posterUrl
          releaseDate
          contentTypeId
        }
      }
      citationsMade {
        id
        citingContentId
        citedContentId
        note
        imageUrl
        citingContent {
          id
          title
          posterUrl
          releaseDate
          contentTypeId
        }
      }
      createdAt
    }
  }
`;

export const GET_CONTENT_EDIT_HISTORY = gql`
  query ContentEditHistory($contentId: String!, $limit: Int) {
    contentEditHistory(contentId: $contentId, limit: $limit) {
      id
      contentId
      actorUserId
      action
      summary
      changedFields
      before
      after
      createdAt
      actor {
        id
        username
        email
      }
    }
  }
`;

export const ROLLBACK_CONTENT_EDIT_HISTORY = gql`
  mutation RollbackContentEditHistory($historyId: Int!) {
    rollbackContentEditHistory(historyId: $historyId) {
      id
      title
      contentTypeId
      updatedAt
    }
  }
`;

export const GET_ADMIN_ACTIVITY_LOGS = gql`
  query AdminContentActivityLogs(
    $page: Int
    $limit: Int
    $search: String
    $action: String
    $actorUserId: String
  ) {
    adminContentActivityLogs(
      page: $page
      limit: $limit
      search: $search
      action: $action
      actorUserId: $actorUserId
    ) {
      items {
        id
        contentId
        actorUserId
        action
        summary
        changedFields
        before
        after
        createdAt
        actor {
          id
          username
          email
          picturePath
        }
        content {
          id
          title
          originalTitle
          contentTypeId
          posterUrl
          isDeleted
        }
      }
      total
      page
      totalPages
    }
  }
`;
