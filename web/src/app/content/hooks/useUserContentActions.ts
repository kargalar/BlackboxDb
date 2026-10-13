import { useState, useEffect } from 'react';

export interface UseUserContentActionsProps {
  id: string;
  type: string;
  user: any;
  t: any;
  requireAuth: (action: string) => void;
  isConsumed: boolean;
  setIsConsumed: (v: boolean) => void;
  isFavorite: boolean;
  setIsFavorite: (v: boolean) => void;
  isLater: boolean;
  setIsLater: (v: boolean) => void;
  isContinuing: boolean;
  setIsContinuing: (v: boolean) => void;
  isAbandoned: boolean;
  setIsAbandoned: (v: boolean) => void;
  userRating: number | null;
  setUserRating: (v: number | null) => void;
  userRatingDetails?: Record<string, number> | null;
  setUserRatingDetails?: (v: Record<string, number> | null) => void;
  playtimeMinutes: number;
  bookFormat?: string | null;
  defaultBookPublicationId?: number | null;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  setActionErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearError: (k: string) => void;
  updateUserContentLog: (id: string, data: any) => Promise<{ data: boolean; error?: any }>;
  refreshStats: () => Promise<void>;
  refreshUserLog: () => Promise<void>;
  rateMovie: (id: string, rating: number | null) => Promise<void>;
  refreshEpisodes?: () => Promise<void>;
}

export const useUserContentActions = ({
  id,
  type,
  user,
  t,
  requireAuth,
  isConsumed,
  setIsConsumed,
  isFavorite,
  setIsFavorite,
  isLater,
  setIsLater,
  isContinuing,
  setIsContinuing,
  isAbandoned,
  setIsAbandoned,
  userRating,
  setUserRating,
  userRatingDetails,
  setUserRatingDetails,
  playtimeMinutes,
  bookFormat,
  defaultBookPublicationId,
  setStats,
  setActionErrors,
  clearError,
  updateUserContentLog,
  refreshStats,
  refreshUserLog,
  rateMovie,
  refreshEpisodes,
}: UseUserContentActionsProps) => {
  const [localPlaytime, setLocalPlaytime] = useState(playtimeMinutes);

  useEffect(() => {
    setLocalPlaytime(playtimeMinutes);
  }, [playtimeMinutes]);

  const handlePlaytimeChange = (newVal: number) => {
    setLocalPlaytime(newVal);
    if (newVal !== playtimeMinutes) {
      updateUserContentLog(id, { playtime_minutes: newVal })
        .then(() => refreshUserLog())
        .catch((err) => {
          console.error('Playtime update failed', err);
          setLocalPlaytime(playtimeMinutes);
          setActionErrors((p: any) => ({ ...p, playtime: t('errors.playtime') }));
          clearError('playtime');
        });
    }
  };

  const handleConsumeToggle = () => {
    if (!user) {
      requireAuth(t('actions.mark'));
      return;
    }
    const newState = !isConsumed;
    console.log('🧪 [useUserContentActions] Consume toggle', {
      id,
      currentState: isConsumed,
      newState,
    });

    const prevRating = userRating || 0;
    const prevFavorite = isFavorite;

    // Optimistic update
    setIsConsumed(newState);
    if (newState) {
      setIsContinuing(false);
      setIsAbandoned(false);
      setIsLater(false);
    } else {
      if (!isAbandoned && !isContinuing) {
        if (prevRating > 0) setUserRating(0);
        if (prevFavorite) setIsFavorite(false);
        if (type === 'game' && localPlaytime > 0) setLocalPlaytime(0);
      }
    }

    setStats((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        consume_count: newState
          ? (prev.consume_count || 0) + 1
          : Math.max(0, (prev.consume_count || 0) - 1),
        favorite_count:
          !newState && prevFavorite
            ? Math.max(0, (prev.favorite_count || 0) - 1)
            : prev.favorite_count,
        rating_count:
          !newState && prevRating > 0 && !isAbandoned && !isContinuing
            ? Math.max(0, (prev.rating_count || 0) - 1)
            : prev.rating_count,
      };
    });

    (async () => {
      try {
        const updateData: any = {
          is_consumed: newState,
          date: new Date().toISOString(),
        };
        if (type === 'book') {
          updateData.bookPublicationId = defaultBookPublicationId ?? undefined;
          updateData.bookFormat = bookFormat ?? undefined;
        }
        if (newState) {
          updateData.is_continuing = false;
          updateData.is_abandoned = false;
          updateData.is_consume_later = false;
        } else {
          if (!isAbandoned && !isContinuing) {
            if (prevRating > 0) updateData.rating = 0;
            if (prevFavorite) updateData.is_favorite = false;
            if (type === 'game') updateData.playtime_minutes = 0;
          }
        }

        const { data, error } = await updateUserContentLog(id, updateData);

        if (error || !data) {
          throw new Error(error?.message || 'Unknown error');
        }
        await refreshStats();
        if (refreshEpisodes) await refreshEpisodes();
      } catch (e: any) {
        console.error('❌ [useUserContentActions] Consume toggle error:', e);
        setIsConsumed(!newState);
        if (!newState) {
          if (prevRating > 0) setUserRating(prevRating);
          if (prevFavorite) setIsFavorite(prevFavorite);
        }

        setStats((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            consume_count: !newState
              ? (prev.consume_count || 0) + 1
              : Math.max(0, (prev.consume_count || 0) - 1),
            favorite_count:
              !newState && prevFavorite ? (prev.favorite_count || 0) + 1 : prev.favorite_count,
            rating_count:
              !newState && prevRating > 0 ? (prev.rating_count || 0) + 1 : prev.rating_count,
          };
        });
        setActionErrors((p: any) => ({ ...p, consume: t('errors.action') }));
        clearError('consume');
      }
    })();
  };

  const handleFavoriteToggle = () => {
    if (!user) {
      requireAuth(t('actions.favorite'));
      return;
    }
    const newState = !isFavorite;
    console.log('❤️[useUserContentActions] Favori toggle', {
      id,
      currentState: isFavorite,
      newState,
    });

    const prevConsumed = isConsumed;
    const willConsume = newState && !prevConsumed;

    // Optimistic update
    setIsFavorite(newState);
    if (willConsume) {
      setIsConsumed(true);
      setIsLater(false);
    } else if (newState) {
      setIsLater(false);
    }

    setStats((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        favorite_count: newState
          ? (prev.favorite_count || 0) + 1
          : Math.max(0, (prev.favorite_count || 0) - 1),
        consume_count: willConsume ? (prev.consume_count || 0) + 1 : prev.consume_count,
      };
    });

    (async () => {
      try {
        const updateData: any = {
          is_favorite: newState,
          date: new Date().toISOString(),
        };
        if (type === 'book' && (newState || willConsume)) {
          updateData.bookPublicationId = defaultBookPublicationId ?? undefined;
          updateData.bookFormat = bookFormat ?? undefined;
        }
        if (newState) updateData.is_consume_later = false;
        if (willConsume) {
          updateData.is_consumed = true;
        }

        await updateUserContentLog(id, updateData);
        await refreshStats();
      } catch (e) {
        console.error('❌[useUserContentActions] Favori toggle hata:', e);
        setIsFavorite(!newState);
        if (willConsume) setIsConsumed(prevConsumed);

        setStats((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            favorite_count: !newState
              ? (prev.favorite_count || 0) + 1
              : Math.max(0, (prev.favorite_count || 0) - 1),
            consume_count: willConsume
              ? Math.max(0, (prev.consume_count || 0) - 1)
              : prev.consume_count,
          };
        });
        setActionErrors((p: any) => ({ ...p, favorite: t('errors.favorite') }));
        clearError('favorite');
      }
    })();
  };

  const handleLaterToggle = () => {
    if (!user) {
      requireAuth(t('actions.list'));
      return;
    }
    const newState = !isLater;
    setIsLater(newState);
    updateUserContentLog(id, { is_consume_later: newState }).catch((e) => {
      console.error('❌ Later toggle hata', e);
      setIsLater(!newState);
      setActionErrors((p: any) => ({ ...p, later: t('errors.watchLater') }));
      clearError('later');
    });
  };

  const handleContinuingToggle = () => {
    if (!user) {
      requireAuth(t('actions.continuing'));
      return;
    }
    const newState = !isContinuing;
    const prevRating = userRating || 0;

    setIsContinuing(newState);
    if (newState) {
      setIsAbandoned(false);
      setIsConsumed(false);
      setIsLater(false);
    }

    const willClearAll = !newState && !isConsumed && !isAbandoned;
    const willClearRating = willClearAll && prevRating > 0;

    if (willClearRating) {
      setUserRating(0);
    }
    if (willClearAll && type === 'game' && localPlaytime > 0) {
      setLocalPlaytime(0);
    }

    const updateData: any = {
      is_continuing: newState,
      ...(newState ? { is_abandoned: false, is_consumed: false, is_consume_later: false } : {}),
      date: newState ? new Date().toISOString() : undefined,
    };

    if (willClearRating) updateData.rating = 0;
    if (willClearAll && type === 'game') updateData.playtime_minutes = 0;

    updateUserContentLog(id, updateData)
      .then(async (result) => {
        if (result.error) throw new Error(result.error.message || 'Toggle continuing failed');
        await refreshStats();
        if (refreshEpisodes) await refreshEpisodes();
      })
      .catch((e) => {
        setIsContinuing(!newState);
        if (willClearRating) setUserRating(prevRating);
        if (willClearAll && type === 'game' && playtimeMinutes > 0)
          setLocalPlaytime(playtimeMinutes);
        if (newState && isAbandoned) setIsAbandoned(true);

        setActionErrors((p: any) => ({
          ...p,
          continuing: t('errors.continuing', { error: e?.message || 'Unknown error' }),
        }));
        clearError('continuing');
      });
  };

  const handleAbandonedToggle = () => {
    if (!user) {
      requireAuth(t('actions.abandoned'));
      return;
    }
    const newState = !isAbandoned;
    const prevRating = userRating || 0;

    setIsAbandoned(newState);
    if (newState) {
      setIsContinuing(false);
      setIsConsumed(false);
      setIsLater(false);
    }

    const willClearAll = !newState && !isConsumed && !isContinuing;
    const willClearRating = willClearAll && prevRating > 0;

    if (willClearRating) {
      setUserRating(0);
    }
    if (willClearAll && type === 'game' && localPlaytime > 0) {
      setLocalPlaytime(0);
    }

    const updateData: any = {
      is_abandoned: newState,
      ...(newState ? { is_continuing: false, is_consumed: false, is_consume_later: false } : {}),
      date: newState ? new Date().toISOString() : undefined,
    };

    if (willClearRating) updateData.rating = 0;
    if (willClearAll && type === 'game') updateData.playtime_minutes = 0;

    updateUserContentLog(id, updateData)
      .then(async (result) => {
        if (result.error) throw new Error(result.error.message || 'Toggle abandoned failed');
        await refreshStats();
        if (refreshEpisodes) await refreshEpisodes();
      })
      .catch((e) => {
        setIsAbandoned(!newState);
        if (willClearRating) setUserRating(prevRating);
        if (willClearAll && type === 'game' && playtimeMinutes > 0)
          setLocalPlaytime(playtimeMinutes);
        if (newState && isContinuing) setIsContinuing(true);

        setActionErrors((p: any) => ({
          ...p,
          abandoned: t('errors.abandoned', { error: e?.message || 'Unknown error' }),
        }));
        clearError('abandoned');
      });
  };

  const handleRatingChange = (rating: number | null) => {
    if (!user) {
      requireAuth(t('actions.rate'));
      return;
    }
    const prevRating = userRating;
    const wasConsumed = isConsumed;
    const willConsume =
      rating !== null && rating > 0 && !wasConsumed && !isAbandoned && !isContinuing;

    setUserRating(rating);
    if (willConsume) setIsConsumed(true);

    setStats((prev: any) => {
      if (!prev) return prev;
      const oldRating = prevRating || 0;
      const currentRating = rating || 0;
      const newCount =
        currentRating > 0
          ? (prev.rating_count || 0) + (oldRating === 0 ? 1 : 0)
          : Math.max(0, (prev.rating_count || 0) - (oldRating > 0 ? 1 : 0));
      const newAvg =
        newCount > 0
          ? ((prev.average_rating || 0) * (prev.rating_count || 0) - oldRating + currentRating) /
            newCount
          : 0;
      return {
        ...prev,
        rating_count: newCount,
        average_rating: newAvg,
        consume_count: willConsume ? (prev.consume_count || 0) + 1 : prev.consume_count,
      };
    });

    if (rating === null || rating === 0) {
      rateMovie(id, null)
        .then(() => refreshStats())
        .catch((e) => {
          setUserRating(prevRating);
          setActionErrors((p: any) => ({ ...p, rating: t('errors.clearRating') }));
          clearError('rating');
        });
    } else {
      const updatePromise = willConsume
        ? updateUserContentLog(id, {
            rating,
            is_consumed: true,
            is_consume_later: false,
            date: new Date().toISOString(),
            ...(type === 'book'
              ? {
                  bookPublicationId: defaultBookPublicationId ?? undefined,
                  bookFormat: bookFormat ?? undefined,
                }
              : {}),
          })
        : rateMovie(id, rating);

      updatePromise
        .then(async () => {
          await refreshStats();
          if (refreshEpisodes) await refreshEpisodes();
        })
        .catch((e: any) => {
          setUserRating(prevRating);
          if (willConsume) setIsConsumed(wasConsumed);
          setActionErrors((p: any) => ({ ...p, rating: t('errors.rate') }));
          clearError('rating');
        });
    }
  };

  return {
    localPlaytime,
    setLocalPlaytime,
    handlePlaytimeChange,
    handleConsumeToggle,
    handleFavoriteToggle,
    handleLaterToggle,
    handleContinuingToggle,
    handleAbandonedToggle,
    handleRatingChange,
  };
};
