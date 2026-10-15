import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { getPersonImageUrl, getPosterUrl } from '@/lib/image-utils';
import { useAuth } from '@/contexts/AuthContext';
import { MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import { deleteContentWatch, updateUserContentLog } from '@/services/userContentService';
import Stars from '@/app/content/components/Stars';
import LogHistoryModal from '@/app/content/components/LogHistoryModal';
import { formatRelativeTime } from '@/lib/date-utils';
import { useTranslations } from 'next-intl';

interface ActivityTabProps {
  activities: any[];
  onActivityUpdate: () => void; // Callback to refresh activities in parent
}

export default function ActivityTab({ activities, onActivityUpdate }: ActivityTabProps) {
  const [historyModalContent, setHistoryModalContent] = useState<{
    id: string;
    type: string;
  } | null>(null);
  const t = useTranslations('ProfileActivity');

  if (activities.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>{t('empty')}</p>
      </div>
    );
  }

  const handleDeleteLog = async (logId: string | number) => {
    if (!window.confirm(t('deleteConfirm'))) return;

    try {
      const numericId = Number(logId);
      const res = await deleteContentWatch(numericId);
      if (res.success) {
        onActivityUpdate(); // Notify parent of change
      } else {
        alert(t('deleteError', { error: res.error?.message || res.error }));
      }
    } catch (err) {
      console.error('Silme hatası:', err);
      alert(t('unexpectedError'));
    }
  };

  const handleModalClose = (updated?: boolean) => {
    setHistoryModalContent(null);
    if (updated) {
      onActivityUpdate(); // Re-fetch activities if modal resulted in an update
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          onDelete={() => handleDeleteLog(activity.id)}
          onEdit={(contentId, contentType) =>
            setHistoryModalContent({ id: contentId, type: contentType })
          }
        />
      ))}

      {historyModalContent && (
        <LogHistoryModal
          isOpen={true}
          onClose={handleModalClose}
          contentId={historyModalContent.id}
          contentType={historyModalContent.type}
          onLogUpdate={() => handleModalClose(true)} // Pass a function to trigger re-fetch
        />
      )}
    </div>
  );
}

const ActivityItem = ({
  activity,
  onDelete,
  onEdit,
}: {
  activity: any;
  onDelete: () => void;
  onEdit: (contentId: string, contentType: string) => void;
}) => {
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const t = useTranslations('ProfileActivity');

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  const isOwnActivity = user && activity.userId === user.id;
  const activityType = activity.activityType || 'LOG';

  const renderDropdown = () => {
    if (!isOwnActivity || activity.isStandaloneReview || activityType !== 'LOG') return null;
    return (
      <div className="absolute top-2 right-2 z-30" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            setActiveDropdown(!activeDropdown);
          }}
          className="text-white/40 hover:text-white p-1.5 rounded transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        {activeDropdown && (
          <div className="absolute right-0 mt-1 w-36 bg-surface-raised border border-white/10 rounded-lg shadow-xl overflow-hidden z-40">
            <button
              onClick={() => {
                if (activity.content)
                  onEdit(activity.content.id, activity.content.contentType.name);
                setActiveDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 flex items-center gap-2"
            >
              <Edit2 size={14} /> {t('edit')}
            </button>
            <button
              onClick={() => {
                onDelete();
                setActiveDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2"
            >
              <Trash2 size={14} /> {t('delete')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDateBadge = () => (
    <div className="absolute bottom-3 right-4 md:bottom-4 md:right-5">
      <span className="text-[10px] md:text-xs font-medium text-gray-500/50">
        {formatRelativeTime(activity.date || activity.createdAt)}
      </span>
    </div>
  );

  if (activityType === 'INCOMING_FOLLOW') {
    const targetUser = activity.targetUser;
    if (!targetUser) return null;
    return (
      <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-center gap-4 shadow-lg shadow-black/20">
        {renderDateBadge()}
        <Link
          href={`/profile/${targetUser.username}`}
          className="flex-shrink-0 relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-zinc-800/80 ring-1 ring-white/5 group-hover:ring-white/10 transition-all z-10"
        >
          {targetUser.picturePath ? (
            <Image
              src={targetUser.picturePath}
              alt={targetUser.username}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white font-bold text-lg">
              {targetUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-10">
          <p className="text-sm md:text-base text-gray-300">
            <Link
              href={`/profile/${targetUser.username}`}
              className="font-bold text-white hover:text-blue-400 transition-colors"
            >
              @{targetUser.username}
            </Link>
            <span className="font-semibold text-white"> started following you</span>
          </p>
        </div>
      </div>
    );
  }

  if (activityType === 'INCOMING_COMMENT') {
    const targetUser = activity.targetUser;
    const disc = activity.discussion;
    const comment = activity.incomingComment;
    if (!targetUser || !disc || !comment) return null;
    return (
      <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-start gap-4 shadow-lg shadow-black/20">
        {renderDateBadge()}
        <Link
          href={`/profile/${targetUser.username}`}
          className="flex-shrink-0 relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-zinc-800/80 ring-1 ring-white/5 group-hover:ring-white/10 transition-all z-10 mt-1"
        >
          {targetUser.picturePath ? (
            <Image
              src={targetUser.picturePath}
              alt={targetUser.username}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white font-bold text-lg">
              {targetUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-10">
          <p className="text-xs md:text-sm text-gray-400 font-medium mb-1">
            <Link
              href={`/profile/${targetUser.username}`}
              className="font-bold text-gray-100 hover:text-blue-400 transition-colors"
            >
              @{targetUser.username}
            </Link>{' '}
            commented on your discussion
          </p>
          <div className="bg-black/20 rounded-lg p-3 border border-white/5">
            <Link href={`/discussion/${disc.id}`} className="block">
              <h4 className="text-xs font-semibold text-gray-500 mb-1 line-clamp-1">
                {disc.title || disc.description}
              </h4>
              <p className="text-sm text-gray-300 line-clamp-2 italic">
                &quot;{comment.text}&quot;
              </p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (activityType === 'FOLLOW') {
    const targetUser = activity.targetUser;
    if (!targetUser) return null;
    return (
      <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-center gap-4 shadow-lg shadow-black/20">
        {renderDateBadge()}
        <Link
          href={`/profile/${targetUser.username}`}
          className="flex-shrink-0 relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden bg-zinc-800/80 ring-1 ring-white/5 group-hover:ring-white/10 transition-all z-10"
        >
          {targetUser.picturePath ? (
            <Image
              src={targetUser.picturePath}
              alt={targetUser.username}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white font-bold text-lg">
              {targetUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-10">
          <p className="text-sm md:text-base text-gray-300">
            <span className="font-semibold text-white">Started following </span>
            <Link
              href={`/profile/${targetUser.username}`}
              className="font-bold text-white hover:text-blue-400 transition-colors"
            >
              @{targetUser.username}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (activityType === 'PERSON_FAVORITE') {
    const person = activity.favoritePerson;
    if (!person) return null;
    const profileImageUrl = person.profileUrl ? getPersonImageUrl(person.profileUrl, 185) : null;
    return (
      <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-center gap-4 shadow-lg shadow-black/20">
        {renderDateBadge()}
        <Link
          href={`/person/${person.id}`}
          className="flex-shrink-0 relative w-12 h-16 md:w-16 md:h-20 rounded-xl overflow-hidden bg-zinc-800/80 ring-1 ring-white/5 group-hover:ring-white/10 transition-all z-10"
        >
          {profileImageUrl && !imageError ? (
            <Image
              src={profileImageUrl}
              alt={person.name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white font-bold text-lg">
              {person.name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-10">
          <p className="text-xs md:text-sm text-gray-400 font-medium mb-0.5">
            {t('personFavorite')}
          </p>
          <Link href={`/person/${person.id}`} className="block w-fit max-w-[85%]">
            <h3 className="text-sm md:text-base font-bold text-gray-100 truncate hover:text-pink-400 transition-colors">
              {person.name}
            </h3>
          </Link>
          {person.roles && person.roles.length > 0 && (
            <p className="text-xs md:text-sm text-gray-500 line-clamp-1 mt-1">
              {person.roles.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (activityType === 'LIST') {
    const list = activity.userList;
    if (!list) return null;
    return (
      <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-center gap-4 shadow-lg shadow-black/20">
        {renderDateBadge()}
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 z-10">
          <svg
            className="w-6 h-6 md:w-8 md:h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </div>
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-10">
          <p className="text-xs md:text-sm text-gray-400 font-medium mb-0.5">Created a list</p>
          <Link href={`/lists/${list.id}`} className="block w-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 truncate hover:text-blue-400 transition-colors">
              {list.name}
            </h3>
          </Link>
          {list.description && (
            <p className="text-xs md:text-sm text-gray-500 line-clamp-1 mt-1">{list.description}</p>
          )}
        </div>
      </div>
    );
  }

  if (activityType === 'DISCUSSION') {
    const disc = activity.discussion;
    if (!disc) return null;
    const content = activity.content;
    return (
      <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-start gap-4 shadow-lg shadow-black/20">
        {renderDateBadge()}
        {content ? (
          <Link
            href={`/content/${content.contentType.name.toLowerCase()}/${content.id}`}
            className="flex-shrink-0 relative overflow-hidden rounded-lg shadow-md w-12 md:w-16 aspect-[2/3] bg-zinc-800/80 ring-1 ring-white/5 z-10"
          >
            {getPosterUrl.original(content.posterUrl || content.posterPath) ? (
              <Image
                src={getPosterUrl.original(content.posterUrl || content.posterPath)!}
                alt={content.title}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-1">
                <span className="text-[0.5rem] md:text-[0.6rem] text-center text-gray-400">
                  {content.title}
                </span>
              </div>
            )}
          </Link>
        ) : (
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-lg bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20 z-10">
            <svg
              className="w-6 h-6 md:w-8 md:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
          </div>
        )}
        <div className="flex flex-col justify-center flex-grow min-w-0 pr-10">
          <p className="text-xs md:text-sm text-gray-400 font-medium mb-0.5">
            Started a discussion{content ? ` about ${content.title}` : ''}
          </p>
          <Link href={`/discussion/${disc.id}`} className="block w-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 line-clamp-2 hover:text-purple-400 transition-colors">
              {disc.title || disc.description}
            </h3>
          </Link>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>{' '}
              {disc.upvoteCount}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>{' '}
              {disc.commentCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to LOG / REVIEW
  const contentType = activity.content?.contentTypeId;
  if (!activity.content) return null;

  const getImageUrl = () => {
    const posterPath = (activity.content as any)?.posterUrl || activity.content?.posterPath;
    if (!posterPath) return null;
    return getPosterUrl.original(posterPath);
  };

  const getContentLink = () => {
    const contentId = activity.content.id;
    switch (contentType) {
      case 1:
        return `/content/movie/${contentId}`;
      case 2:
        return `/content/tv/${contentId}`;
      case 3:
        return `/content/game/${contentId}`;
      case 4:
        return `/content/book/${contentId}`;
      default:
        return `/content/movie/${contentId}`;
    }
  };

  const contentLink = getContentLink();
  const imageUrl = getImageUrl();

  let consumedLabel = t('badges.watched');
  if (contentType === 4) consumedLabel = t('badges.read');
  if (contentType === 3) consumedLabel = t('badges.played');

  const badges = [];
  if (activity.rating)
    badges.push({
      id: 'rating',
      label: `${activity.rating}/5`,
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      icon: (
        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
    });
  if (activity.isFavorite)
    badges.push({
      id: 'favorite',
      label: t('badges.favorited'),
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: (
        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      ),
    });
  if (activity.isConsumed)
    badges.push({
      id: 'consumed',
      label: consumedLabel,
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: (
        <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path
            fillRule="evenodd"
            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
    });
  if (activity.isContinuing)
    badges.push({
      id: 'continuing',
      label: t('badges.continuing'),
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: (
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    });
  if (activity.isConsumeLater)
    badges.push({
      id: 'watchlist',
      label: t('badges.watchlist'),
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: (
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      ),
    });

  return (
    <div className="group relative bg-surface-panel hover:bg-surface-raised border border-white/5 hover:border-white/10 rounded-xl p-3 md:p-4 transition-all duration-300 flex items-start gap-4 shadow-lg shadow-black/20">
      {renderDropdown()}
      {renderDateBadge()}
      <Link
        href={contentLink as any}
        className="flex-shrink-0 relative overflow-hidden rounded-lg shadow-md w-16 md:w-24 aspect-[2/3] bg-zinc-800/80 ring-1 ring-white/5 group-hover:ring-white/10 transition-all z-10"
      >
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={activity.content.title}
            fill
            sizes="(max-width: 768px) 64px, 96px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-2">
            <span className="text-[0.6rem] md:text-xs font-medium text-center text-gray-400 leading-tight line-clamp-3">
              {activity.content.title}
            </span>
          </div>
        )}
      </Link>
      <div className="flex flex-col justify-center flex-grow min-w-0 md:pt-1">
        <Link href={contentLink as any} className="block w-fit max-w-[85%] pr-10 md:pr-14">
          <h3 className="text-sm md:text-base font-bold text-gray-100 truncate hover:text-white transition-colors">
            {activity.content.title}
          </h3>
          {activity.content.releaseDate && (
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-0.5">
              {new Date(activity.content.releaseDate).getFullYear()}
            </p>
          )}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 md:mt-3 pr-6">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex items-center px-2 py-0.5 rounded-md text-[0.65rem] md:text-xs font-semibold border backdrop-blur-sm ${badge.color}`}
            >
              {badge.icon}
              {badge.label}
            </div>
          ))}
        </div>
        {activity.review && (
          <div className="mt-2.5 pl-3 relative pr-6">
            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-white/10 rounded-full" />
            <p className="text-xs md:text-sm text-gray-300 italic line-clamp-3 leading-relaxed">
              &quot;{activity.review}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
