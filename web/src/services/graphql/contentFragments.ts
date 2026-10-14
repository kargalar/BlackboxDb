import { gql } from '@apollo/client';

// ==========================================
// CONTENT FRAGMENTS
// ==========================================

export const CONTENT_BASIC_FIELDS = gql`
  fragment ContentBasicFields on Content {
    id
    title
    originalTitle
    alternativeTitles
    description
    releaseDate
    posterUrl
    backdropUrl
    discussionCount
    favoriteCount
    consumeCount
    additionalRatingCategories
    musicReleaseType
    contentType {
      id
      name
      slug
    }
  }
`;

export const CONTENT_DETAIL_FIELDS = gql`
  fragment ContentDetailFields on Content {
    ...ContentBasicFields
    awards
    status
    isbn
    pageCount
    isContinuing
    runtime
    ratingDistribution
    posterUrl
    backdropUrl
    franchiseId
    franchiseName
    languages
    budget
    revenue
    averageDuration
    numberOfEpisodes
    numberOfSeasons
    tvType
    inProduction
    firstAirDate
    lastAirDate
    cast
    crew
    seasons
    subtitle
    authors
    publisher
    publishedDate
    categories
    maturityRating
    language
    bookSeries
    bookSeriesNumber
    previewLink
    infoLink
    canonicalVolumeLink
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
        description
        headquarters
        logoUrl
        website
        foundingYear
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
        description
        headquarters
        logoUrl
        website
        foundingYear
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
    versionTitle
    versionParent
    collection
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
    trailerUrl
    reviewVideoUrl
    gameplayVideoUrl
    spotifyPlaylistUrl

    spotifyUrl
    explicit
    label
    totalTracks
    createdAt
    updatedAt
    people {
      id
      personId
      person {
        id
        name
        profileUrl
      }
      role
      character
      department
      job
    }
    genres {
      id
      name
    }
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
    images {
      id
      type
      version
      filePath
      upvoteCount
      downvoteCount
      userVote
    }
    expansions {
      id
      contentId
      name
      description
      posterUrl
      releaseDate
    }
    similarContents {
      ...ContentBasicFields
      similarDisplayTitle
      similarDisplaySubtitle
      similarIsFranchise
      similarGroupCount
    }
  }
  ${CONTENT_BASIC_FIELDS}
`;
