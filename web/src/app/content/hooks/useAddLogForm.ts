import { useState, useEffect, useMemo } from 'react';
import {
  getRecentTags,
  getRecentTaggedUsers,
  rememberTags,
  toSuggestedTag,
  rememberTaggedUsers,
  type TaggedUserSuggestion,
} from '@/lib/log-suggestions';

const EMPTY_SUPPORTED_PLATFORMS: Array<{ id: number; name: string }> = [];

export function useAddLogForm({
  isOpen,
  initialData,
  contentType,
  contentId,
  supportedPlatforms,
  onSave,
  onClose,
  t,
}: any) {
  const [formData, setFormData] = useState({
    rating: initialData?.rating ?? null,
    ratingDetails: initialData?.ratingDetails || null,
    is_favorite: initialData?.is_favorite || false,
    is_consume_later: initialData?.is_consume_later || false,
    is_consumed: initialData?.is_consumed ?? false,
    is_continuing: initialData?.is_continuing ?? false,
    is_abandoned: initialData?.is_abandoned ?? false,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    playtime_minutes: initialData?.playtime_minutes || '',
    platformId: initialData?.platformId ?? null,
    bookFormat: initialData?.bookFormat ?? null,
    review: initialData?.review || '',
    tags: initialData?.tags?.join(', ') || '',
    taggedUsersObj: initialData?.taggedUsers || [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>(getRecentTags);
  const [previousTaggedUsers, setPreviousTaggedUsers] =
    useState<TaggedUserSuggestion[]>(getRecentTaggedUsers);
  const platforms = useMemo<Array<{ id: number; name: string }>>(
    () => supportedPlatforms ?? EMPTY_SUPPORTED_PLATFORMS,
    [supportedPlatforms]
  );

  const [platformSearch, setPlatformSearch] = useState('');
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  useEffect(() => {
    if (contentType !== 'game') return;
    setFormData((prev: any) => {
      if (prev.platformId == null) return prev;
      const hasSelectedPlatform = platforms.some((p) => p.id === prev.platformId);
      return hasSelectedPlatform ? prev : { ...prev, platformId: null };
    });
  }, [contentType, platforms]);

  const addPlaytime = (mins: number) => {
    setFormData((prev: any) => {
      const current = Number(prev.playtime_minutes) || 0;
      const total = current + mins;
      return { ...prev, playtime_minutes: total > 0 ? total : '' };
    });
  };

  const resetPlaytime = () => setFormData((prev: any) => ({ ...prev, playtime_minutes: '' }));

  const handleToggleConsumed = () => {
    setFormData((prev: any) => {
      const newState = !prev.is_consumed;
      if (!newState) {
        return { ...prev, is_consumed: false, is_favorite: false, rating: null };
      }
      return { ...prev, is_consumed: true, is_continuing: false, is_abandoned: false };
    });
  };

  const handleToggleContinuing = () => {
    setFormData((prev: any) => {
      const newState = !prev.is_continuing;
      return {
        ...prev,
        is_continuing: newState,
        is_consumed: newState ? false : prev.is_consumed,
        is_abandoned: newState ? false : prev.is_abandoned,
      };
    });
  };

  const handleToggleAbandoned = () => {
    setFormData((prev: any) => {
      const newState = !prev.is_abandoned;
      return {
        ...prev,
        is_abandoned: newState,
        is_consumed: newState ? false : prev.is_consumed,
        is_continuing: newState ? false : prev.is_continuing,
      };
    });
  };

  const handleToggleFavorite = () => {
    setFormData((prev: any) => {
      const newState = !prev.is_favorite;
      if (newState) {
        return { ...prev, is_favorite: true, is_consumed: true };
      }
      return { ...prev, is_favorite: false };
    });
  };

  const handleRatingChange = (rating: number | null) => {
    setFormData((prev: any) => {
      if (rating !== null && rating > 0) {
        if (prev.is_continuing || prev.is_abandoned) {
          return { ...prev, rating };
        }
        return { ...prev, rating, is_consumed: true };
      }
      return { ...prev, rating };
    });
  };

  const loadAvailableTags = async () => {
    try {
      const { getAllUserContentLogs } = await import('@/services/userContentService');
      const { data } = await getAllUserContentLogs(undefined, 1000);
      const tags = new Set<string>(getRecentTags());
      if (data) {
        data.forEach((log: any) => {
          if (log.tags && Array.isArray(log.tags)) {
            log.tags.forEach((tag: string) => {
              const suggestedTag = toSuggestedTag(tag);
              if (suggestedTag && !suggestedTag.startsWith('with:')) tags.add(suggestedTag);
            });
          }
        });
      }
      const sortedTags = Array.from(tags).filter(Boolean).sort();
      setAvailableTags(rememberTags(sortedTags));
    } catch (err) {}
  };

  const loadPreviousTaggedUsers = async () => {
    try {
      const { getAllUserContentLogs } = await import('@/services/userContentService');
      const { data } = await getAllUserContentLogs(undefined, 1000);
      const usersMap = new Map<string, any>();
      getRecentTaggedUsers().forEach((u: any) => {
        if (u.id || u.username) usersMap.set(u.id || u.username, u);
      });
      if (data) {
        data.forEach((log: any) => {
          if (log.taggedUsers && Array.isArray(log.taggedUsers)) {
            log.taggedUsers.forEach((user: any) => {
              if (user.id && user.username) {
                usersMap.set(user.id, {
                  id: user.id,
                  username: user.username,
                  picturePath: user.picturePath,
                });
              }
            });
          }
          if (log.tags && Array.isArray(log.tags)) {
            log.tags.forEach((tag: string) => {
              if (tag.startsWith('with:')) {
                const username = tag.substring(5);
                usersMap.set(`custom-${username}`, {
                  id: `custom-${username}`,
                  username,
                  isCustom: true,
                });
              }
            });
          }
        });
      }
      const userList = Array.from(usersMap.values());
      setPreviousTaggedUsers(rememberTaggedUsers(userList));
    } catch (err) {}
  };

  const initialDataKey = JSON.stringify({
    rating: initialData?.rating ?? null,
    ratingDetails: initialData?.ratingDetails ?? null,
    is_favorite: initialData?.is_favorite ?? false,
    is_consume_later: initialData?.is_consume_later ?? false,
    is_consumed: initialData?.is_consumed ?? false,
    is_continuing: initialData?.is_continuing ?? false,
    is_abandoned: initialData?.is_abandoned ?? false,
    date: initialData?.date ?? null,
    playtime_minutes: initialData?.playtime_minutes ?? '',
    platformId: initialData?.platformId ?? null,
    bookFormat: initialData?.bookFormat ?? null,
    review: initialData?.review ?? '',
    tags: initialData?.tags ?? [],
    taggedUsers: initialData?.taggedUsers ?? [],
  });

  useEffect(() => {
    if (!isOpen) return;

    const data = JSON.parse(initialDataKey);
    let initialTagsStr = '';
    const initialCustomUsers: any[] = [];
    if (data.tags) {
      const tagsArr = Array.isArray(data.tags)
        ? data.tags
        : typeof data.tags === 'string'
          ? data.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [];
      const normalTags = tagsArr.filter((tag: string) => !tag.startsWith('with:'));
      initialTagsStr = normalTags.join(', ');
      tagsArr
        .filter((tag: string) => tag.startsWith('with:'))
        .forEach((tag: string) => {
          const username = tag.substring(5);
          initialCustomUsers.push({
            id: `custom-${username}-${Date.now()}`,
            username,
            isCustom: true,
          });
        });
    }

    setFormData({
      rating: data.rating,
      ratingDetails: data.ratingDetails,
      is_favorite: data.is_favorite,
      is_consume_later: data.is_consume_later,
      is_consumed: data.is_consumed,
      is_continuing: data.is_continuing,
      is_abandoned: data.is_abandoned,
      date: data.date || new Date().toISOString().split('T')[0],
      playtime_minutes: data.playtime_minutes,
      platformId: data.platformId,
      bookFormat: data.bookFormat,
      review: data.review,
      tags: initialTagsStr,
      taggedUsersObj: [...data.taggedUsers, ...initialCustomUsers],
    });
    setError(null);
    if (isOpen) {
      loadAvailableTags();
      loadPreviousTaggedUsers();
    }
  }, [contentId, initialDataKey, isOpen]);

  const handleTagsChange = (tags: string) => {
    setFormData((previous) => ({ ...previous, tags }));
    setAvailableTags(rememberTags(tags.split(',')));
  };

  const handleTaggedUserAdd = (user: TaggedUserSuggestion) => {
    setFormData((previous) => ({
      ...previous,
      taggedUsersObj: [...previous.taggedUsersObj, user],
    }));
    setPreviousTaggedUsers(rememberTaggedUsers([user]));
  };

  const handleSave = async () => {
    const hasStatus =
      formData.is_consumed ||
      formData.is_favorite ||
      formData.is_consume_later ||
      formData.is_continuing ||
      formData.is_abandoned;
    const hasReview = formData.review.trim().length > 0;
    const hasPlaytime =
      contentType === 'game' &&
      formData.playtime_minutes !== '' &&
      Number(formData.playtime_minutes) > 0;
    const hasBookFormat = contentType === 'book' && !!formData.bookFormat;
    const hasTagsOrUsers = formData.tags.trim().length > 0 || formData.taggedUsersObj.length > 0;
    const ratingIsSet = formData.rating !== null && formData.rating > 0;
    const ratingIsCleared = initialData?.rating > 0 && formData.rating === null;
    const ratingDetailsChanged =
      JSON.stringify(formData.ratingDetails || null) !==
      JSON.stringify(initialData?.ratingDetails || null);

    const hasChanges =
      ratingIsSet ||
      ratingIsCleared ||
      hasStatus ||
      hasReview ||
      hasPlaytime ||
      hasBookFormat ||
      hasTagsOrUsers ||
      ratingDetailsChanged;

    if (!hasChanges) {
      setError(t('errors.noChanges'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const existingTags = formData.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
      const customWithTags = formData.taggedUsersObj
        .filter((u: any) => u.isCustom)
        .map((u: any) => `with:${u.username.trim()}`);
      const combinedTags = Array.from(new Set([...existingTags, ...customWithTags]));

      const finalData = {
        ...formData,
        tags: combinedTags,
        taggedUserIds: formData.taggedUsersObj
          .filter((u: any) => !u.isCustom)
          .map((u: any) => u.id),
      };

      setAvailableTags(rememberTags(existingTags));
      setPreviousTaggedUsers(rememberTaggedUsers(formData.taggedUsersObj));

      await onSave(finalData);
      onClose();
      setFormData({
        rating: null,
        ratingDetails: null,
        is_favorite: false,
        is_consume_later: false,
        is_consumed: false,
        is_continuing: false,
        is_abandoned: false,
        date: new Date().toISOString().split('T')[0],
        playtime_minutes: '',
        platformId: null,
        bookFormat: null,
        review: '',
        tags: '',
        taggedUsersObj: [],
      });
    } catch (e) {
      setError(t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    setFormData,
    isSaving,
    error,
    availableTags,
    previousTaggedUsers,
    platforms,
    platformSearch,
    setPlatformSearch,
    showPlatformDropdown,
    setShowPlatformDropdown,
    addPlaytime,
    resetPlaytime,
    handleToggleConsumed,
    handleToggleContinuing,
    handleToggleAbandoned,
    handleToggleFavorite,
    handleRatingChange,
    handleSave,
    handleTagsChange,
    handleTaggedUserAdd,
  };
}
