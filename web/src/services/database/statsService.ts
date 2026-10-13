/**
 * statsService — Fetches deep profile statistics from GraphQL backend.
 * SRP: only concerned with fetching; no UI logic.
 */

import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import type { ProfileDeepStats } from '@/components/organisms/profile/StatsTabTypes';
import { emptyDeepStats } from '@/components/organisms/profile/StatsTabTypes';
import { logGraphqlRequest } from '@/lib/requestLogger';

// ── GraphQL Query ─────────────────────────────────────────

export const GET_USER_DEEP_STATS = gql`
  query GetUserDeepStats($username: String!, $contentTypeId: Int, $startDate: DateTimeISO) {
    getUserDeepStats(username: $username, contentTypeId: $contentTypeId, startDate: $startDate) {
      runtimeSummary {
        totalRuntimeMinutes
        totalPlaytimeMinutes
        totalPagesRead
        estimatedReadHours
      }
      topDirectors {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      bestRatedDirectors {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      worstRatedDirectors {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      topActors {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      topWriters {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      topAuthors {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      topCrew {
        personId
        personName
        profileUrl
        count
        avgRating
        favoriteCount
      }
      topPublishers {
        companyId
        companyName
        logoUrl
        count
        avgRating
        totalPlaytimeMinutes
      }
      topDevelopers {
        companyId
        companyName
        logoUrl
        count
        avgRating
        totalPlaytimeMinutes
      }
      topThemes {
        name
        count
        avgRating
      }
      topMoods {
        name
        count
        avgRating
      }
      topGameModes {
        name
        count
        avgRating
      }
      topPlatforms {
        name
        count
        avgRating
      }
      topPerspectives {
        name
        count
        avgRating
      }
      topFranchises {
        franchiseName
        count
        avgRating
        totalRuntime
      }
      ageRatingDistribution {
        name
        count
        avgRating
      }
      mostOverrated {
        contentId
        title
        posterUrl
        contentTypeSlug
        userRating
        globalAvgRating
        globalRatingCount
        delta
      }
      mostUnderrated {
        contentId
        title
        posterUrl
        contentTypeSlug
        userRating
        globalAvgRating
        globalRatingCount
        delta
      }
      abandonedCount
      abandonedByType {
        name
        count
      }
      reviewCount
      avgReviewLength
      friendCompatibility {
        userId
        username
        picturePath
        score
        sharedRatingsCount
        avgRatingDiff
      }
      globalCompatibility {
        userId
        username
        picturePath
        score
        sharedRatingsCount
        avgRatingDiff
      }
    }
  }
`;

// ── Service Function ──────────────────────────────────────

export async function fetchDeepStats(
  username: string,
  contentTypeId?: number,
  startDate?: Date
): Promise<ProfileDeepStats> {
  console.log(
    '📡 [statsService] fetchDeepStats — user:',
    username,
    '| typeId:',
    contentTypeId ?? 'all'
  );

  try {
    logGraphqlRequest('getUserDeepStats', true);

    const { data } = await apolloClient.query<{ getUserDeepStats: ProfileDeepStats }>({
      query: GET_USER_DEEP_STATS,
      variables: {
        username,
        contentTypeId: contentTypeId ?? null,
        startDate: startDate?.toISOString() ?? null,
      },
      fetchPolicy: 'network-only',
    });

    if (!data?.getUserDeepStats) {
      console.warn('⚠️ [statsService] No deep stats returned for', username);
      return emptyDeepStats();
    }

    console.log('✅ [statsService] Deep stats loaded for', username, {
      topDirectors: data.getUserDeepStats.topDirectors.length,
      reviewCount: data.getUserDeepStats.reviewCount,
      abandondedCount: data.getUserDeepStats.abandonedCount,
    });

    return data.getUserDeepStats;
  } catch (err) {
    console.error('❌ [statsService] fetchDeepStats error:', err);
    logGraphqlRequest('getUserDeepStats', false, String(err));
    return emptyDeepStats();
  }
}
