import { gql } from '@apollo/client';

export const GET_PODCAST_PROGRAM = gql`
  query GetPodcastProgram($contentId: String!) {
    podcastProgram(contentId: $contentId) {
      id
      contentId
      title
      posterUrl
      publicationStatus
      languageCode
      releaseFrequency
      releaseInterval
      releaseWeekdays
      credits
      episodes {
        id
        programId
        seasonNumber
        episodeNumber
        title
        description
        publishedAt
        durationSeconds
        audioUrl
        isExplicit
        listenCount
        myListenCount
        credits
        recentListens
      }
    }
  }
`;

export const SAVE_PODCAST_PROGRAM = gql`
  mutation SavePodcastProgram(
    $contentId: String!
    $publicationStatus: String!
    $languageCode: String
    $releaseFrequency: String
    $releaseInterval: Int
    $releaseWeekdays: [Int!]
    $hostPersonIds: [String!]
  ) {
    savePodcastProgram(
      contentId: $contentId
      publicationStatus: $publicationStatus
      languageCode: $languageCode
      releaseFrequency: $releaseFrequency
      releaseInterval: $releaseInterval
      releaseWeekdays: $releaseWeekdays
      hostPersonIds: $hostPersonIds
    ) {
      id
      contentId
      title
      publicationStatus
      languageCode
      releaseFrequency
      releaseInterval
      releaseWeekdays
      credits
      episodes {
        id
        programId
        seasonNumber
        episodeNumber
        title
        description
        publishedAt
        durationSeconds
        audioUrl
        isExplicit
        listenCount
        myListenCount
        credits
        recentListens
      }
    }
  }
`;

export const SAVE_PODCAST_EPISODE = gql`
  mutation SavePodcastEpisode(
    $programId: String!
    $title: String!
    $seasonNumber: Int!
    $episodeNumber: Int!
    $description: String
    $publishedAt: DateTimeISO
    $durationSeconds: Int
    $audioUrl: String
    $externalGuid: String
    $isExplicit: Boolean
    $guestPersonIds: [String!]
    $episodeId: String
  ) {
    savePodcastEpisode(
      programId: $programId
      title: $title
      seasonNumber: $seasonNumber
      episodeNumber: $episodeNumber
      description: $description
      publishedAt: $publishedAt
      durationSeconds: $durationSeconds
      audioUrl: $audioUrl
      externalGuid: $externalGuid
      isExplicit: $isExplicit
      guestPersonIds: $guestPersonIds
      episodeId: $episodeId
    ) {
      id
      programId
      seasonNumber
      episodeNumber
      title
      description
      publishedAt
      durationSeconds
      audioUrl
      isExplicit
      listenCount
      myListenCount
      credits
      recentListens
    }
  }
`;

export const RECORD_PODCAST_LISTEN = gql`
  mutation RecordPodcastListen(
    $episodeId: String!
    $listenedAt: DateTimeISO
    $secondsListened: Int
    $completed: Boolean!
  ) {
    recordPodcastListen(
      episodeId: $episodeId
      listenedAt: $listenedAt
      secondsListened: $secondsListened
      completed: $completed
    ) {
      id
      episodeId
      listenedAt
      secondsListened
      completed
    }
  }
`;

export const GET_MEDIA_EVENTS = gql`
  query GetMediaEvents(
    $eventType: String
    $city: String
    $from: DateTimeISO
    $to: DateTimeISO
    $theaterProductionId: String
    $limit: Int
    $offset: Int
  ) {
    mediaEvents(
      eventType: $eventType
      city: $city
      from: $from
      to: $to
      theaterProductionId: $theaterProductionId
      limit: $limit
      offset: $offset
    ) {
      id
      eventType
      theaterProductionId
      title
      startsAt
      timeZone
      venueName
      city
      address
      status
      rescheduledFromId
      theaterProduction
      credits
      attendanceCount
      attendedByMe
    }
  }
`;

export const GET_MEDIA_EVENT = gql`
  query GetMediaEvent($id: String!) {
    mediaEvent(id: $id) {
      id
      eventType
      theaterProductionId
      title
      startsAt
      timeZone
      venueName
      city
      address
      status
      rescheduledFromId
      theaterProduction
      credits
      attendanceCount
      attendedByMe
    }
  }
`;

export const CREATE_MEDIA_EVENT = gql`
  mutation CreateMediaEvent(
    $eventType: String!
    $startsAt: DateTimeISO!
    $timeZone: String!
    $venueName: String!
    $city: String!
    $title: String
    $theaterProductionId: String
    $address: String
    $credits: [JSON!]
  ) {
    createMediaEvent(
      eventType: $eventType
      startsAt: $startsAt
      timeZone: $timeZone
      venueName: $venueName
      city: $city
      title: $title
      theaterProductionId: $theaterProductionId
      address: $address
      credits: $credits
    ) {
      id
      eventType
      theaterProductionId
      title
      startsAt
      timeZone
      venueName
      city
      address
      status
      rescheduledFromId
      theaterProduction
      credits
      attendanceCount
      attendedByMe
    }
  }
`;

export const RESCHEDULE_MEDIA_EVENT = gql`
  mutation RescheduleMediaEvent(
    $eventId: String!
    $startsAt: DateTimeISO!
    $venueName: String
    $city: String
  ) {
    rescheduleMediaEvent(
      eventId: $eventId
      startsAt: $startsAt
      venueName: $venueName
      city: $city
    ) {
      id
      eventType
      theaterProductionId
      title
      startsAt
      timeZone
      venueName
      city
      address
      status
      rescheduledFromId
      theaterProduction
      credits
      attendanceCount
      attendedByMe
    }
  }
`;

export const RECORD_EVENT_ATTENDANCE = gql`
  mutation RecordEventAttendance($eventId: String!, $attendedAt: DateTimeISO, $note: String) {
    recordEventAttendance(eventId: $eventId, attendedAt: $attendedAt, note: $note)
  }
`;

export const REMOVE_EVENT_ATTENDANCE = gql`
  mutation RemoveEventAttendance($eventId: String!) {
    removeEventAttendance(eventId: $eventId)
  }
`;

export const GET_MUSIC_RELEASE_DETAILS = gql`
  query GetMusicReleaseDetails($contentId: String!) {
    musicReleaseDetails(contentId: $contentId) {
      contentId
      releaseType
      tracks {
        trackContentId
        title
        discNumber
        trackNumber
        spotifyUrl
        durationMinutes
      }
    }
  }
`;

export const SAVE_MUSIC_RELEASE_DETAILS = gql`
  mutation SaveMusicReleaseDetails(
    $contentId: String!
    $releaseType: MusicReleaseType!
    $tracks: [MusicTrackInput!]
  ) {
    saveMusicReleaseDetails(contentId: $contentId, releaseType: $releaseType, tracks: $tracks) {
      contentId
      releaseType
      tracks {
        trackContentId
        title
        discNumber
        trackNumber
        spotifyUrl
        durationMinutes
      }
    }
  }
`;
