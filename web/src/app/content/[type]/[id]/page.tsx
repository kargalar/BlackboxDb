'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { UnifiedContent } from '@/types/unified-content';
import ContentHeader from '@/app/content/components/ContentHeader';
import ContentCast from '@/app/content/components/ContentCast';
import ContentTvSeasons from '@/app/content/components/ContentTvSeasons';
import ContentFriendsActivity from '@/app/content/components/ContentFriendsActivity';
import ContentMedia from '@/app/content/components/ContentMedia';

import ContentFranchise from '@/app/content/components/ContentFranchise';
import ContentExpansions from '@/app/content/components/ContentExpansions';
import ContentBookPublications from '@/app/content/components/ContentBookPublications';
import { ContentSoundtrack } from '@/app/content/components/ContentSoundtrack';
import { PodcastProgramSection } from '@/app/content/components/PodcastProgramSection';
import { MediaEventList } from '@/app/content/components/MediaEventList';
import { MusicReleaseSection } from '@/app/content/components/MusicReleaseSection';

import ContentDiscussions from '@/app/content/components/ContentDiscussions';
import ContentComments from '@/app/content/components/ContentComments';
import ContentSimilar from '@/app/content/components/ContentSimilar';
import ContentLists from '@/app/content/components/ContentLists';
import { getContentById, getUserTotalPlaytime } from '@/services/graphql/content';
import { getContentStats, getUserContentLog } from '@/services/userContentService';
import {
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleConsumeLater,
  toggleContinuing,
  toggleAbandoned,
} from '@/services/userContentService';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import {
  GET_EPISODES_BY_TV_SHOW,
  GET_SEASONS_BY_TV_SHOW,
  MARK_EPISODE_WATCHED,
  MARK_SEASON_WATCHED,
  RATE_EPISODE,
} from '@/services/graphql/episode';

// GraphQL queries for comment/discussion counts
const GET_COMMENTS_COUNT = gql`
  query GetCommentsCount($contentId: String!) {
    commentsCountByContent(contentId: $contentId)
  }
`;

const GET_DISCUSSIONS_COUNT = gql`
  query GetDiscussionsCount($contentId: String!) {
    discussionsCountByContent(contentId: $contentId)
  }
`;

type ContentType = 'movie' | 'tv' | 'game' | 'book' | 'music' | 'podcast' | 'theater';

interface ContentStats {
  consume_count?: number;
  favorite_count?: number;
  consume_later_count?: number;
  discussion_count?: number;
  average_rating?: number;
  rating_count?: number;
  rating_distribution?: number[];
}

export default function ContentDetailPage() {
  const params = useParams();
  const type = params.type as ContentType;
  const id = params.id as string;
  const { user } = useAuth();
  const t = useTranslations('ContentDetail');
  const locale = useLocale();

  // Content state
  const [content, setContent] = useState<UnifiedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePageTitle(content?.title || null);

  // TV specific states - use any for now until we properly type seasons
  const [seasons, setSeasons] = useState<any[]>([]);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [watchedSeasons, setWatchedSeasons] = useState<Set<number>>(new Set());

  // User interaction states
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [userRating, setUserRating] = useState<number | null>(0);
  const [userRatingDetails, setUserRatingDetails] = useState<Record<string, number> | null>(null);
  const [userBookPublicationId, setUserBookPublicationId] = useState<number | null>(null);
  const [bookFormat, setBookFormat] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isConsumed, setIsConsumed] = useState(false);
  const [userConsumeCount, setUserConsumeCount] = useState<number>(0);
  const [isLater, setIsLater] = useState(false);
  const [isReleaseNotificationEnabled, setIsReleaseNotificationEnabled] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isAbandoned, setIsAbandoned] = useState(false);
  const [playtimeMinutes, setPlaytimeMinutes] = useState<number>(0);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [userTaggedUsers, setUserTaggedUsers] = useState<any[]>([]);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  // Comments/Discussions tab state
  const [activeCommentsTab, setActiveCommentsTab] = useState<'comments' | 'discussions'>(
    'comments'
  );
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [discussionsCount, setDiscussionsCount] = useState<number>(0);

  // Clear error after 5 seconds
  const clearError = useCallback((actionKey: string) => {
    setTimeout(() => {
      setActionErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[actionKey];
        return newErrors;
      });
    }, 5000);
  }, []);

  // Refresh stats from database
  const refreshStats = useCallback(async () => {
    if (!id) return;

    try {
      console.log('📊 [ContentDetail] Refreshing stats for:', id);
      const { data } = await getContentStats(id);
      if (data) {
        setStats({
          consume_count: data.consumeCount,
          favorite_count: data.favoriteCount,
          consume_later_count: data.consumeLaterCount,
          discussion_count: data.discussionCount,
          average_rating: data.averageRating || undefined,
          rating_count: data.ratingCount,
          rating_distribution: data.ratingDistribution,
        });
        console.log('✅ [ContentDetail] Stats updated:', data);
      }
    } catch (e) {
      console.error('❌ [ContentDetail] Error refreshing stats:', e);
    }
  }, [id]);

  // Refresh comments and discussions counts
  const refreshCommentsCounts = useCallback(async () => {
    if (!id) return;

    try {
      console.log('💬 [ContentDetail] Refreshing comments/discussions counts for:', id);

      const [commentsResult, discussionsResult] = await Promise.all([
        apolloClient.query<{ commentsCountByContent: number }>({
          query: GET_COMMENTS_COUNT,
          variables: { contentId: id },
          fetchPolicy: 'network-only',
        }),
        apolloClient.query<{ discussionsCountByContent: number }>({
          query: GET_DISCUSSIONS_COUNT,
          variables: { contentId: id },
          fetchPolicy: 'network-only',
        }),
      ]);

      setCommentsCount(commentsResult.data?.commentsCountByContent || 0);
      setDiscussionsCount(discussionsResult.data?.discussionsCountByContent || 0);

      console.log(
        '✅ [ContentDetail] Counts updated - Comments:',
        commentsResult.data?.commentsCountByContent,
        'Discussions:',
        discussionsResult.data?.discussionsCountByContent
      );
    } catch (e) {
      console.error('❌ [ContentDetail] Error refreshing counts:', e);
    }
  }, [id]);

  // Refresh total playtime (sum of all logs)
  const refreshTotalPlaytime = useCallback(async () => {
    if (!id || !user) {
      setPlaytimeMinutes(0);
      return;
    }
    try {
      const { data: total } = await getUserTotalPlaytime(id);
      setPlaytimeMinutes(total);
    } catch (e) {
      console.error('❌ [ContentDetail] Error loading total playtime:', e);
    }
  }, [id, user]);

  // Refresh user log
  const refreshUserLog = useCallback(async () => {
    if (!id || !user) {
      console.log('⚠️ [ContentDetail] No user or id, clearing states');
      setIsConsumed(false);
      setIsFavorite(false);
      setIsLater(false);
      setIsReleaseNotificationEnabled(false);
      setIsContinuing(false);
      setIsAbandoned(false);
      setUserRating(0);
      setUserRatingDetails(null);
      setUserBookPublicationId(null);
      setBookFormat(null);
      setPlaytimeMinutes(0);
      setUserTags([]);
      setUserTaggedUsers([]);
      setUserConsumeCount(0);
      return;
    }

    try {
      console.log('👤 [ContentDetail] Loading user log for:', id);
      const { data } = await getUserContentLog(id);
      if (data) {
        setIsFavorite(!!data.isFavorite);
        setIsLater(!!data.isConsumeLater);
        setIsReleaseNotificationEnabled(!!data.notifyOnRelease);
        setIsContinuing(!!data.isContinuing);
        setIsAbandoned(!!data.isAbandoned);
        setUserRating(data.rating ? Number(data.rating) : 0);
        setUserRatingDetails(data.ratingDetails || null);
        setUserBookPublicationId(data.bookPublicationId ?? null);
        setBookFormat(data.bookFormat ?? null);
        setUserTags(data.tags || []);
        setUserTaggedUsers(data.taggedUsers || []);
        setUserConsumeCount(data.userConsumeCount || 0);
        const consumed = data.isConsumed ?? !!data.date;
        setIsConsumed(!!consumed);
        console.log('✅ [ContentDetail] User log loaded');
      } else {
        setIsConsumed(false);
        setIsFavorite(false);
        setIsLater(false);
        setIsReleaseNotificationEnabled(false);
        setIsContinuing(false);
        setIsAbandoned(false);
        setUserRating(0);
        setUserRatingDetails(null);
        setUserBookPublicationId(null);
        setBookFormat(null);
        setUserTags([]);
        setUserTaggedUsers([]);
        setUserConsumeCount(0);
      }
      // Also refresh total playtime
      await refreshTotalPlaytime();
    } catch (e) {
      console.error('❌ [ContentDetail] Error loading user log:', e);
    }
  }, [id, user, refreshTotalPlaytime]);

  // Load TV episode data
  const loadEpisodeData = useCallback(async () => {
    if (type !== 'tv' || !id || !user) return;

    try {
      console.log('📺 [ContentDetail] Loading episode data for:', id);

      const response = await apolloClient.query({
        query: GET_EPISODES_BY_TV_SHOW,
        variables: { tvShowId: id },
        fetchPolicy: 'network-only',
      });

      const episodes = (response.data as any)?.getEpisodesByTvShow || [];
      console.log(`✅ [ContentDetail] Loaded ${episodes.length} episodes`);

      const watchedSet = new Set<string>();
      const seasonWatchCount: Record<number, { watched: number; total: number }> = {};

      episodes.forEach((episode: any) => {
        const episodeKey = `${episode.seasonNumber}x${episode.episodeNumber}`;

        if (!seasonWatchCount[episode.seasonNumber]) {
          seasonWatchCount[episode.seasonNumber] = { watched: 0, total: 0 };
        }
        seasonWatchCount[episode.seasonNumber].total++;

        if (episode.watched) {
          watchedSet.add(episodeKey);
          seasonWatchCount[episode.seasonNumber].watched++;
        }
      });

      setWatchedEpisodes(watchedSet);

      const fullyWatchedSeasons = new Set<number>();
      Object.entries(seasonWatchCount).forEach(([seasonNum, counts]) => {
        if (counts.watched === counts.total && counts.total > 0) {
          fullyWatchedSeasons.add(Number(seasonNum));
        }
      });
      setWatchedSeasons(fullyWatchedSeasons);

      setSeasons((prevSeasons) =>
        prevSeasons.map((season: any) => {
          const updatedEpisodes = (season.episodes || []).map((episode: any) => {
            const serverEpisode = episodes.find(
              (e: any) =>
                e.seasonNumber === season.seasonNumber && e.episodeNumber === episode.episodeNumber
            );
            return {
              ...episode,
              watched: serverEpisode ? serverEpisode.watched : episode.watched,
              userRating: serverEpisode ? serverEpisode.userRating : episode.userRating,
            };
          });

          return {
            ...season,
            episodes: updatedEpisodes,
          };
        })
      );

      console.log('✅ [ContentDetail] Episode watch states loaded');
    } catch (e) {
      console.error('❌ [ContentDetail] Error loading episode data:', e);
    }
  }, [type, id, user]);

  // Toggle season watch
  const toggleSeasonWatch = useCallback(
    async (seasonNum: number) => {
      if (!id) return;

      const targetSeason = seasons.find((season: any) => season.seasonNumber === seasonNum);
      const seasonEpisodes = targetSeason?.episodes || [];
      const episodeKeys = seasonEpisodes.map(
        (episode: any) => `${seasonNum}x${episode.episodeNumber}`
      );
      const allEpisodesWatched =
        episodeKeys.length > 0 &&
        episodeKeys.every((episodeKey: string) => watchedEpisodes.has(episodeKey));

      const isCurrentlyWatched = watchedSeasons.has(seasonNum) || allEpisodesWatched;
      const newWatchedState = !isCurrentlyWatched;

      console.log(`📺 [ContentDetail] Toggle season ${seasonNum} to ${newWatchedState}`);

      // Optimistic update
      setWatchedSeasons((prev) => {
        const newSet = new Set(prev);
        if (newWatchedState) {
          newSet.add(seasonNum);
        } else {
          newSet.delete(seasonNum);
        }
        return newSet;
      });

      setWatchedEpisodes((prev) => {
        const newSet = new Set(prev);
        episodeKeys.forEach((episodeKey: string) => {
          if (newWatchedState) {
            newSet.add(episodeKey);
          } else {
            newSet.delete(episodeKey);
          }
        });
        return newSet;
      });

      setSeasons((prevSeasons) =>
        prevSeasons.map((season: any) => {
          if (season.seasonNumber !== seasonNum) {
            return season;
          }

          return {
            ...season,
            userRating: newWatchedState ? season.userRating : null,
            episodes: (season.episodes || []).map((episode: any) => ({
              ...episode,
              watched: newWatchedState,
              ...(newWatchedState ? {} : { userRating: null }),
            })),
          };
        })
      );

      setActionErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`season-${seasonNum}`];
        return newErrors;
      });

      try {
        const response = await apolloClient.mutate({
          mutation: MARK_SEASON_WATCHED,
          variables: {
            tvShowId: id,
            seasonNumber: seasonNum,
            watched: newWatchedState,
          },
        });

        if ((response.data as any)?.markSeasonWatched) {
          console.log(`✅ [ContentDetail] Season ${seasonNum} watch state updated`);
          await loadEpisodeData();
          await refreshUserLog();
        } else {
          throw new Error('Failed to mark season as watched');
        }
      } catch (e) {
        console.error(`❌ [ContentDetail] Error toggling season ${seasonNum}:`, e);
        // Revert optimistic update
        setWatchedSeasons((prev) => {
          const newSet = new Set(prev);
          if (!newWatchedState) {
            newSet.add(seasonNum);
          } else {
            newSet.delete(seasonNum);
          }
          return newSet;
        });

        setWatchedEpisodes((prev) => {
          const newSet = new Set(prev);
          episodeKeys.forEach((episodeKey: string) => {
            if (isCurrentlyWatched) {
              newSet.add(episodeKey);
            } else {
              newSet.delete(episodeKey);
            }
          });
          return newSet;
        });

        setSeasons((prevSeasons) =>
          prevSeasons.map((season: any) => {
            if (season.seasonNumber !== seasonNum) {
              return season;
            }

            return {
              ...season,
              userRating: targetSeason?.userRating ?? season.userRating,
              episodes: (season.episodes || []).map((episode: any, index: number) => ({
                ...episode,
                watched: targetSeason?.episodes?.[index]?.watched ?? episode.watched,
                userRating: targetSeason?.episodes?.[index]?.userRating ?? episode.userRating,
              })),
            };
          })
        );

        setActionErrors((prev) => ({
          ...prev,
          [`season-${seasonNum}`]: t('errors.seasonWatchFailed', { season: seasonNum }),
        }));
        clearError(`season-${seasonNum}`);
      }
    },
    [id, watchedEpisodes, watchedSeasons, seasons, loadEpisodeData, clearError, refreshUserLog, t]
  );

  // Toggle episode watch
  const toggleEpisodeWatch = useCallback(
    async (seasonNum: number, episodeNum: number) => {
      if (!id) return;

      const episodeKey = `${seasonNum}x${episodeNum}`;
      const isCurrentlyWatched = watchedEpisodes.has(episodeKey);
      const newWatchedState = !isCurrentlyWatched;

      console.log(`📺 [ContentDetail] Toggle episode ${episodeKey} to ${newWatchedState}`);

      // Optimistic update
      setWatchedEpisodes((prev) => {
        const newSet = new Set(prev);
        if (newWatchedState) {
          newSet.add(episodeKey);
        } else {
          newSet.delete(episodeKey);
        }
        return newSet;
      });

      const targetSeason = seasons.find((season: any) => season.seasonNumber === seasonNum);
      const targetSeasonEpisodes = targetSeason?.episodes || [];
      const isSeasonWatchedAfterToggle =
        targetSeasonEpisodes.length > 0 &&
        targetSeasonEpisodes.every((episode: any) =>
          episode.episodeNumber === episodeNum
            ? newWatchedState
            : watchedEpisodes.has(`${seasonNum}x${episode.episodeNumber}`)
        );
      const wasSeasonWatched = watchedSeasons.has(seasonNum);

      setWatchedSeasons((prev) => {
        const newSet = new Set(prev);
        if (isSeasonWatchedAfterToggle) {
          newSet.add(seasonNum);
        } else {
          newSet.delete(seasonNum);
        }
        return newSet;
      });

      setSeasons((prevSeasons) =>
        prevSeasons.map((season: any) => {
          if (season.seasonNumber !== seasonNum) {
            return season;
          }

          const updatedSeason = {
            ...season,
            episodes: (season.episodes || []).map((episode: any) => {
              if (episode.episodeNumber !== episodeNum) {
                return episode;
              }

              return {
                ...episode,
                watched: newWatchedState,
                ...(newWatchedState ? {} : { userRating: null }),
              };
            }),
          };

          const ratedEpisodes = updatedSeason.episodes.filter((ep: any) => ep.userRating !== null);
          updatedSeason.userRating =
            ratedEpisodes.length > 0
              ? ratedEpisodes.reduce((acc: number, ep: any) => acc + ep.userRating, 0) /
                ratedEpisodes.length
              : null;

          return updatedSeason;
        })
      );

      setActionErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`episode-${episodeKey}`];
        return newErrors;
      });

      try {
        const response = await apolloClient.mutate({
          mutation: MARK_EPISODE_WATCHED,
          variables: {
            tvShowId: id,
            seasonNumber: seasonNum,
            episodeNumber: episodeNum,
            watched: newWatchedState,
          },
        });

        if ((response.data as any)?.markEpisodeWatched) {
          console.log(`✅ [ContentDetail] Episode ${episodeKey} watch state updated`);
          await refreshUserLog();
        } else {
          throw new Error('Failed to mark episode as watched');
        }
      } catch (e) {
        console.error(`❌ [ContentDetail] Error toggling episode ${episodeKey}:`, e);
        // Revert optimistic update
        setWatchedEpisodes((prev) => {
          const newSet = new Set(prev);
          if (!newWatchedState) {
            newSet.add(episodeKey);
          } else {
            newSet.delete(episodeKey);
          }
          return newSet;
        });

        setWatchedSeasons((prev) => {
          const newSet = new Set(prev);
          if (wasSeasonWatched) {
            newSet.add(seasonNum);
          } else {
            newSet.delete(seasonNum);
          }
          return newSet;
        });

        setSeasons((prevSeasons) =>
          prevSeasons.map((season: any) => {
            if (season.seasonNumber !== seasonNum) {
              return season;
            }

            return {
              ...season,
              episodes: (season.episodes || []).map((episode: any) => {
                if (episode.episodeNumber !== episodeNum) {
                  return episode;
                }

                return {
                  ...episode,
                  watched: isCurrentlyWatched,
                };
              }),
            };
          })
        );

        setActionErrors((prev) => ({
          ...prev,
          [`episode-${episodeKey}`]: t('errors.episodeWatchFailed', { episode: episodeNum }),
        }));
        clearError(`episode-${episodeKey}`);
      }
    },
    [clearError, id, seasons, watchedEpisodes, watchedSeasons, refreshUserLog, t]
  );

  // Rate episode
  const handleRateEpisode = useCallback(
    async (seasonNum: number, episodeNum: number, rating: number | null) => {
      if (!id || !user) return;

      console.log(
        `📺 [ContentDetail] Rating episode S${seasonNum}E${episodeNum} with ${rating} stars`
      );

      // Optimistic update
      if (rating !== null) {
        setWatchedEpisodes((prev) => {
          const newSet = new Set(prev);
          newSet.add(`${seasonNum}x${episodeNum}`);
          return newSet;
        });

        const targetSeasonEpisodes =
          seasons.find((season: any) => season.seasonNumber === seasonNum)?.episodes || [];
        const isSeasonWatchedAfterRating =
          targetSeasonEpisodes.length > 0 &&
          targetSeasonEpisodes.every(
            (episode: any) =>
              episode.episodeNumber === episodeNum ||
              watchedEpisodes.has(`${seasonNum}x${episode.episodeNumber}`)
          );
        setWatchedSeasons((prev) => {
          const newSet = new Set(prev);
          if (isSeasonWatchedAfterRating) {
            newSet.add(seasonNum);
          } else {
            newSet.delete(seasonNum);
          }
          return newSet;
        });
      }

      setSeasons((prevSeasons) =>
        prevSeasons.map((s: any) => {
          if (s.seasonNumber === seasonNum) {
            const updatedSeason = {
              ...s,
              episodes: s.episodes.map((ep: any) => {
                if (ep.episodeNumber === episodeNum) {
                  return {
                    ...ep,
                    userRating: rating,
                    ...(rating !== null ? { watched: true } : {}),
                  };
                }
                return ep;
              }),
            };

            // Recalculate season userRating when an episode is rated
            const ratedEpisodes = updatedSeason.episodes.filter(
              (ep: any) => ep.userRating !== null
            );
            updatedSeason.userRating =
              ratedEpisodes.length > 0
                ? ratedEpisodes.reduce((acc: number, ep: any) => acc + ep.userRating, 0) /
                  ratedEpisodes.length
                : null;

            return updatedSeason;
          }
          return s;
        })
      );

      try {
        const response = await apolloClient.mutate({
          mutation: RATE_EPISODE,
          variables: {
            tvShowId: id,
            seasonNumber: seasonNum,
            episodeNumber: episodeNum,
            rating,
          },
        });

        if ((response.data as any)?.rateEpisode) {
          console.log(`✅ [ContentDetail] Episode S${seasonNum}E${episodeNum} rating saved`);
          // If it also marked the episode as watched on the backend, we should refresh the data
          // loadEpisodeData(); // Opting out for now to not disrupt user flow
          await refreshUserLog();
        } else {
          throw new Error('Failed to rate episode');
        }
      } catch (e) {
        console.error(`❌ [ContentDetail] Error rating episode S${seasonNum}E${episodeNum}:`, e);
        // Avoid reverting optimistic update immediately for better UX
      }
    },
    [id, user, seasons, watchedEpisodes, refreshUserLog]
  );

  // Load content from database
  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      if (!id || !type) return;

      try {
        setLoading(true);
        setError(null);
        console.log(`🔍 [ContentDetail] Loading ${type} content:`, id);

        const { data, error: contentError } = await getContentById(id);

        if (!isMounted) return; // Don't update state if unmounted

        if (contentError || !data) {
          throw new Error(contentError || 'Content not found');
        }

        console.log('✅ [ContentDetail] Content loaded:', data.title);
        console.log('🎬 [ContentDetail] Poster URL:', data.posterUrl);
        console.log('🎨 [ContentDetail] Backdrop URL:', data.backdropUrl);
        console.log('🎬 [ContentDetail] Franchise ID:', data.franchiseId);
        console.log('🎬 [ContentDetail] Franchise Name:', data.franchiseName);
        setContent(data);

        // Load TV show seasons if applicable
        if (type === 'tv' && id) {
          try {
            console.log('📺 [ContentDetail] Loading TV show seasons...');
            const response = await apolloClient.query({
              query: GET_SEASONS_BY_TV_SHOW,
              variables: { tvShowId: id },
              fetchPolicy: 'network-only',
            });

            if (!isMounted) return; // Don't update state if unmounted

            const loadedSeasons = (response.data as any)?.getSeasonsByTvShow || [];
            setSeasons(loadedSeasons);
            console.log('✅ [ContentDetail] TV show seasons loaded:', loadedSeasons.length);
          } catch (e) {
            if (!isMounted) return;
            console.error('❌ [ContentDetail] Error loading seasons:', e);
            setSeasons([]);
          }
        }

        // Load additional data
        if (!isMounted) return;

        // Refresh stats
        await refreshStats();

        // Refresh comments/discussions counts
        await refreshCommentsCounts();
      } catch (e: any) {
        if (!isMounted) return;
        console.error('❌ [ContentDetail] Error loading content:', e);
        setError(e.message || 'Failed to load content');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [id, type, refreshStats, refreshCommentsCounts]);

  // Load user log when user is available
  useEffect(() => {
    if (id && user) {
      refreshUserLog();
    }
  }, [id, user, refreshUserLog]);

  useEffect(() => {
    if (type === 'tv' && user && content && id) {
      loadEpisodeData();
    }
  }, [type, user, content, id, loadEpisodeData]);

  const clearOptimisticConsumed = useCallback(() => {
    setIsConsumed(false);
  }, []);

  useEffect(() => {
    window.addEventListener('clearOptimisticConsumed', clearOptimisticConsumed);
    return () => window.removeEventListener('clearOptimisticConsumed', clearOptimisticConsumed);
  }, [clearOptimisticConsumed]);

  const getOriginalBookPublicationId = () => {
    if (type !== 'book') return null;
    const publications = content?.bookPublications || [];
    return (
      publications.find((publication: any) => publication.isOriginal)?.id ??
      content?.primaryBookPublication?.id ??
      publications[0]?.id ??
      null
    );
  };

  const getUserBookPublicationId = () => {
    if (type !== 'book') return null;
    return userBookPublicationId ?? getOriginalBookPublicationId();
  };

  // Handler functions
  const handleToggleFavorite = async () => {
    if (!id) return;
    try {
      await toggleContentFavorite(id);
      await refreshUserLog();
      await refreshStats();
    } catch (e) {
      console.error('❌ Error toggling favorite:', e);
    }
  };

  const handleToggleConsumed = async () => {
    if (!id) return;
    try {
      if (isConsumed) {
        clearOptimisticConsumed();
        await unlogContentWatch(id);
      } else {
        setIsConsumed(true);
        await logContentWatch(id, getOriginalBookPublicationId());
      }
      await refreshUserLog();
      await refreshStats();
      if (type === 'tv') {
        await loadEpisodeData();
      }
    } catch (e) {
      console.error('❌ Error toggling consumed:', e);
    }
  };

  const handleToggleLater = async () => {
    if (!id) return;
    try {
      await toggleConsumeLater(id);
      await refreshUserLog();
    } catch (e) {
      console.error('❌ Error toggling watch later:', e);
    }
  };

  const handleToggleContinuing = async () => {
    if (!id) return;
    try {
      await toggleContinuing(id);
      await refreshUserLog();
    } catch (e) {
      console.error('❌ Error toggling continuing:', e);
    }
  };

  const handleRating = async (contentId: string, rating: number | null) => {
    if (!id) return;
    try {
      const { rateContent } = await import('@/services/userContentService');
      await rateContent(id, rating, getUserBookPublicationId());
      await refreshUserLog();
      await refreshStats();
    } catch (e) {
      console.error('❌ Error rating content:', e);
    }
  };

  const handleSelectBookPublication = async (publicationId: number) => {
    if (!id) return;
    try {
      const { updateUserContentLog } = await import('@/services/userContentService');
      setUserBookPublicationId(publicationId);
      await updateUserContentLog(id, { bookPublicationId: publicationId });
      await refreshUserLog();
      await refreshStats();
      const { data } = await getContentById(id);
      if (data) {
        setContent(data);
      }
    } catch (e) {
      console.error('Error selecting book publication:', e);
    }
  };

  const handleToggleContinuingWrapper = async (contentId: string) => {
    if (!id) return { isContinuing: false };
    try {
      const result = await toggleContinuing(id);
      await refreshUserLog();
      if (type === 'tv') {
        await loadEpisodeData();
      }
      return result;
    } catch (e) {
      console.error('❌ Error toggling continuing:', e);
      return { isContinuing: false };
    }
  };

  const handleToggleAbandonedWrapper = async (contentId: string) => {
    if (!id) return { isAbandoned: false };
    try {
      const result = await toggleAbandoned(id);
      await refreshUserLog();
      if (type === 'tv') {
        await loadEpisodeData();
      }
      return result;
    } catch (e) {
      console.error('❌ Error toggling abandoned:', e);
      return { isAbandoned: false };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-red-400 text-xl mb-4">{t('error', { error })}</p>
          <button onClick={() => window.location.reload()} className="btn-gradient">
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // No content state
  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-3xl">📽️</span>
          </div>
          <p className="text-xl text-white/60">{t('notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page content-redesign">
      <div className="content-hero-shell relative w-full">
        <ContentHeader
          content={content}
          type={type}
          title={content.title || ''}
          imageUrl={content.posterUrl || ''}
          backdropUrl={content.backdropUrl || ''}
          description={content.description || ''}
          year={(() => {
            if (type === 'tv') {
              const first = content.firstAirDate?.substring(0, 4);
              const last = content.lastAirDate?.substring(0, 4);
              if (first && last && first !== last) {
                return `${first} - ${last}`;
              }
              return first || '';
            }
            return content.releaseDate?.substring(0, 4) || '';
          })()}
          genres={content.genres || []}
          cast={
            content.people?.filter((p) =>
              ['actor', 'Actor', 'voice_actor', 'Voice_actor', 'Voice', 'voice'].includes(
                p.role || ''
              )
            ) || []
          }
          crew={
            content.people?.filter(
              (p) =>
                !['actor', 'Actor', 'voice_actor', 'Voice_actor', 'Voice', 'voice'].includes(
                  p.role || ''
                )
            ) || []
          }
          stats={stats}
          isFavorite={isFavorite}
          setIsFavorite={setIsFavorite}
          isConsumed={isConsumed}
          setIsConsumed={setIsConsumed}
          userConsumeCount={userConsumeCount}
          isLater={isLater}
          setIsLater={setIsLater}
          isReleaseNotificationEnabled={isReleaseNotificationEnabled}
          setIsReleaseNotificationEnabled={setIsReleaseNotificationEnabled}
          isContinuing={isContinuing}
          setIsContinuing={setIsContinuing}
          isAbandoned={isAbandoned}
          setIsAbandoned={setIsAbandoned}
          playtimeMinutes={playtimeMinutes}
          bookFormat={bookFormat}
          setBookFormat={setBookFormat}
          defaultBookPublicationId={getUserBookPublicationId()}
          userRating={userRating}
          setUserRating={setUserRating}
          userRatingDetails={userRatingDetails}
          setUserRatingDetails={setUserRatingDetails}
          userTags={userTags}
          userTaggedUsers={userTaggedUsers}
          setStats={setStats}
          actionErrors={actionErrors}
          setActionErrors={setActionErrors}
          clearError={clearError}
          toggleFavorite={handleToggleFavorite}
          refreshStats={refreshStats}
          logMovieWatch={handleToggleConsumed}
          unlogMovieWatch={handleToggleConsumed}
          logBookRead={handleToggleConsumed}
          unlogBookRead={handleToggleConsumed}
          refreshUserLog={refreshUserLog}
          refreshEpisodes={type === 'tv' ? loadEpisodeData : undefined}
          updateUserContentLog={async (contentId: string, updateData: any) => {
            try {
              console.log('🔄 [ContentDetail] Updating user content log:', contentId, updateData);

              if (updateData.isConsumed === false) {
                clearOptimisticConsumed();
              }

              const { updateUserContentLog } = await import('@/services/userContentService');
              const result = await updateUserContentLog(contentId, updateData);

              console.log('✅ [ContentDetail] User content log updated successfully');
              await refreshUserLog();
              await refreshStats();
              await refreshCommentsCounts();
              if (type === 'tv') {
                await loadEpisodeData();
              }

              // Trigger comments refetch in case a review was added/updated
              window.dispatchEvent(new Event('refetchComments'));

              return {
                data: true,
                error: undefined,
              };
            } catch (e: any) {
              console.error('❌ [ContentDetail] Error updating user content log:', e);
              setActionErrors((prev) => ({
                ...prev,
                updateLog: e?.message || t('errors.updateLogFailed'),
              }));
              clearError('updateLog');

              return {
                data: false,
                error: e?.message || t('errors.updateLogFailed'),
              };
            }
          }}
          rateMovie={handleRating}
          toggleContinuing={handleToggleContinuingWrapper}
          toggleAbandoned={handleToggleAbandonedWrapper}
          id={id}
          getTitle={() => content.title || ''}
          getImageUrl={() => content.posterUrl || ''}
          getBackdropUrl={() => content.backdropUrl || ''}
          getDescription={() => content.description || ''}
          getYear={() => {
            if (type === 'tv') {
              const first = content.firstAirDate?.substring(0, 4);
              const last = content.lastAirDate?.substring(0, 4);
              if (first && last && first !== last) {
                return `${first} - ${last}`;
              }
              return first || '';
            }
            return content.releaseDate?.substring(0, 4) || '';
          }}
          getGenres={() => content.genres || []}
          getDirector={() =>
            content.people
              ?.filter((p) => p.role === 'director' || p.role === 'Director')
              .map((p) => p.person.name) || []
          }
          getDirectorId={() =>
            content.people
              ?.filter((p) => p.role === 'director' || p.role === 'Director')
              .map((p) => p.personId.toString()) || []
          }
          getWriters={() =>
            content.people
              ?.filter((p) => p.role === 'writer' || p.role === 'Writer')
              .map((p) => p.person.name) || []
          }
          getCreators={() => []}
          getProductionCompanies={() =>
            content.companies
              ?.filter((d: any) => d.companyRoleId === 6)
              .map((d: any) => ({
                id: d.companyId.toString(),
                name: d.company.name,
                logoUrl: d.company.logoUrl,
              })) || []
          }
          getNetworks={() => []}
          getProductionCountries={() => []}
          getDevelopers={() =>
            content.companies
              ?.filter((d: any) => d.companyRoleId === 5)
              .map((d: any) => ({
                id: d.companyId.toString(),
                name: d.company.name,
                logoUrl: d.company.logoUrl,
              })) || []
          }
          getPublishers={() => {
            if (type === 'book') {
              const pubList: Array<{ id: string; name: string; logoUrl?: string | null }> = [];
              const seen = new Set<string>();

              // 1. Edisyonlardan yayınevlerini topla
              if (content.bookPublications && content.bookPublications.length > 0) {
                for (const pub of content.bookPublications) {
                  if (
                    pub.publisher &&
                    pub.publisher.name &&
                    !seen.has(pub.publisher.name.toLowerCase())
                  ) {
                    seen.add(pub.publisher.name.toLowerCase());
                    pubList.push({
                      id: pub.publisher.id.toString(),
                      name: pub.publisher.name,
                      logoUrl: pub.publisher.logoUrl,
                    });
                  }
                }
              }

              // 2. Primary yayından ekle (varsa)
              if (
                content.primaryBookPublication?.publisher?.name &&
                !seen.has(content.primaryBookPublication.publisher.name.toLowerCase())
              ) {
                const publisher = content.primaryBookPublication.publisher;
                seen.add(publisher.name.toLowerCase());
                pubList.push({
                  id: publisher.id.toString(),
                  name: publisher.name,
                  logoUrl: publisher.logoUrl,
                });
              }

              // 3. ContentCompany'den (roleId: 3) ekle
              const legacyPublishers =
                content.companies
                  ?.filter((d: any) => d.companyRoleId === 3)
                  .map((d: any) => ({
                    id: d.companyId.toString(),
                    name: d.company.name,
                    logoUrl: d.company.logoUrl,
                  })) || [];

              for (const lp of legacyPublishers) {
                if (lp.name && !seen.has(lp.name.toLowerCase())) {
                  seen.add(lp.name.toLowerCase());
                  pubList.push(lp);
                }
              }

              return pubList;
            }

            // Game publisher: 4
            const roleId = 4;
            const publishers =
              content.companies
                ?.filter((d: any) => d.companyRoleId === roleId)
                .map((d: any) => ({
                  id: d.companyId.toString(),
                  name: d.company.name,
                  logoUrl: d.company.logoUrl,
                })) || [];
            return publishers;
          }}
          formatRuntime={(minutes: number | null) => {
            if (!minutes) return '';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0
              ? t('runtime.hoursMins', { hours, mins })
              : t('runtime.mins', { mins });
          }}
          formatCurrency={(amount: number) => {
            if (!amount) return '';
            return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(amount);
          }}
          formatDate={(dateString: string) => {
            if (!dateString) return '';
            return new Intl.DateTimeFormat(locale).format(new Date(dateString));
          }}
          getLanguageName={(code: string) => {
            const languages: Record<string, string> = {
              en: t('languages.en'),
              tr: t('languages.tr'),
            };
            return languages[code] || code.toUpperCase();
          }}
          hideInlineVideos={true}
        />
      </div>

      <div className="mx-auto w-full max-w-[100rem]">
        <div className="content-detail-sections w-full py-4">
          {type === 'podcast' && <PodcastProgramSection key={id} contentId={id} />}
          {type === 'music' && <MusicReleaseSection contentId={id} />}
          {type === 'theater' && (
            <MediaEventList
              eventType="THEATER_PERFORMANCE"
              theaterProductionId={id}
              heading="Performances"
            />
          )}

          {/* Friends Activity */}
          <div className="content-detail-section content-social-section">
            <ContentFriendsActivity contentId={id} />
          </div>

          {/* TV Seasons */}
          {type === 'tv' && seasons.length > 0 && (
            <div className="content-detail-section content-seasons-section">
              <ContentTvSeasons
                seasons={seasons}
                expandedSeasons={expandedSeasons}
                setExpandedSeasons={setExpandedSeasons}
                watchedSeasons={watchedSeasons}
                watchedEpisodes={watchedEpisodes}
                actionErrors={actionErrors}
                canManage={!!user}
                onToggleSeasonWatch={toggleSeasonWatch}
                onToggleEpisodeWatch={toggleEpisodeWatch}
                onRateEpisode={handleRateEpisode}
              />
            </div>
          )}

          {/* Media (Screenshots & Videos) */}
          {type !== 'book' && content && (
            <div className="content-detail-section content-media-section">
              <ContentMedia content={content} isWatched={isConsumed} />
            </div>
          )}

          {/* Soundtrack */}
          {type !== 'book' && (content?.spotifyPlaylistUrl || content?.spotifyUrl) && (
            <div className="content-detail-section content-soundtrack-section">
              <ContentSoundtrack
                spotifyPlaylistUrl={content.spotifyPlaylistUrl || content.spotifyUrl!}
              />
            </div>
          )}

          {/* Expansions - Only for games */}
          {type === 'game' && (
            <div className="content-detail-section content-expansions-section">
              <ContentExpansions contentId={id} type="expansion" />
            </div>
          )}

          {/* Remakes - Only for games */}
          {type === 'game' && (
            <div className="content-detail-section content-remakes-section">
              <ContentExpansions contentId={id} type="remake" />
            </div>
          )}

          {/* Franchise Content */}
          {content?.franchiseId && (
            <div className="content-detail-section content-franchise-section">
              <ContentFranchise
                franchiseId={content.franchiseId}
                franchiseName={content.franchiseName || null}
                currentContentId={id}
                contentType={type}
              />
            </div>
          )}

          {type === 'book' && content.bookPublications && content.bookPublications.length > 0 && (
            <div className="content-detail-section content-publications-section">
              <ContentBookPublications
                publications={content.bookPublications}
                primaryPublicationId={content.primaryBookPublication?.id ?? null}
                userPublicationId={userBookPublicationId}
                canSelect={!!user}
                onSelectPublication={handleSelectBookPublication}
              />
            </div>
          )}

          {/* Lists Content */}
          <div className="content-detail-section content-lists-section">
            <ContentLists type={type} contentId={id} />
          </div>

          {/* Similar Content */}
          <div className="content-detail-section content-similar-section">
            <ContentSimilar
              type={type}
              id={id}
              content={content}
              similarContent={content?.similarContents}
            />
          </div>

          {/* Yorumlar ve Tartışmalar Section */}
          <div className="content-detail-section content-community-section mb-6">
            {activeCommentsTab === 'comments' ? (
              <ContentComments
                contentId={id}
                isConsumed={isConsumed}
                onSwitchTab={() => setActiveCommentsTab('discussions')}
                discussionsCount={discussionsCount}
              />
            ) : (
              <ContentDiscussions
                contentId={id}
                onSwitchTab={() => setActiveCommentsTab('comments')}
                commentsCount={commentsCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
