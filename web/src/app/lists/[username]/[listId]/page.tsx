'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { Content } from '@/services/graphql/content';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import ListItemAddedByMeta from './components/ListItemAddedByMeta';
import {
  SortingBar,
  type SortOption,
  type HideOptions,
} from '@/app/explore/[type]/components/SortingBar';
import { loadItemStates, updateItemState } from '@/app/explore/[type]/hooks/itemStates';
import {
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleConsumeLater,
  toggleContinuing,
} from '@/services/userContentService';
import {
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Music,
  FolderOpen,
  Lock,
  Users,
  UserPlus,
  Plus,
  X,
  Pencil,
  Bookmark,
  BookmarkCheck,
  Trash2,
  LogOut,
  ChevronRight,
  ListOrdered,
  GripVertical,
} from 'lucide-react';
import {
  getList,
  isListSaved,
  updateList,
  addToList,
  removeFromList,
  addCollaborator,
  removeCollaborator,
  leaveList,
  saveList,
  unsaveList,
  UserList,
  UserListItem,
  UserListCollaborator,
  searchUsers,
  UserSearchResult,
  reorderListItems,
} from '@/services/graphql/list';

// Content search query for adding content to list
const SEARCH_CONTENT_FOR_LIST = gql`
  query SearchContentForList($searchQuery: String, $contentTypeId: Int, $limit: Int) {
    searchContent(searchQuery: $searchQuery, contentTypeId: $contentTypeId, limit: $limit) {
      items {
        id
        title
        posterUrl
        releaseDate
      }
    }
  }
`;

/* ─── Content type styling ─── */
const getContentTypeInfo = (contentTypeId: number) => {
  switch (contentTypeId) {
    case 1:
      return {
        name: 'Film',
        bg: 'bg-blue-500/15 text-blue-400',
        icon: <Film size={18} />,
        accentColor: 'border-blue-500/30',
        solidBg: 'bg-blue-600',
        path: 'movie',
      };
    case 2:
      return {
        name: 'Dizi',
        bg: 'bg-purple-500/15 text-purple-400',
        icon: <Tv size={18} />,
        accentColor: 'border-purple-500/30',
        solidBg: 'bg-purple-600',
        path: 'tv',
      };
    case 3:
      return {
        name: 'Oyun',
        bg: 'bg-green-500/15 text-green-400',
        icon: <Gamepad2 size={18} />,
        accentColor: 'border-green-500/30',
        solidBg: 'bg-green-600',
        path: 'game',
      };
    case 4:
      return {
        name: 'Kitap',
        bg: 'bg-amber-500/15 text-amber-400',
        icon: <BookOpen size={18} />,
        accentColor: 'border-amber-500/30',
        solidBg: 'bg-amber-600',
        path: 'book',
      };
    case 5:
      return {
        name: 'Müzik',
        bg: 'bg-pink-500/15 text-pink-400',
        icon: <Music size={18} />,
        accentColor: 'border-pink-500/30',
        solidBg: 'bg-pink-600',
        path: 'music',
      };
    default:
      return {
        name: 'İçerik',
        bg: 'bg-gray-500/15 text-gray-400',
        icon: <FolderOpen size={18} />,
        accentColor: 'border-gray-500/30',
        solidBg: 'bg-gray-600',
        path: 'content',
      };
  }
};

const calculateAverageRating = (distribution?: number[], tmdbRating?: number | null) => {
  if (distribution?.length) {
    const totalVotes = distribution.reduce((sum, count) => sum + count, 0);
    if (totalVotes > 0) {
      const weightedSum = distribution.reduce((sum, count, index) => sum + count * (index + 1), 0);
      return weightedSum / totalVotes;
    }
  }

  if (tmdbRating != null && Number.isFinite(tmdbRating) && tmdbRating > 0) {
    return tmdbRating;
  }

  return 0;
};

const compareNumberValues = (valueA: number, valueB: number, order: 'asc' | 'desc') => {
  return order === 'asc' ? valueA - valueB : valueB - valueA;
};

const compareDateValues = (
  valueA: string | undefined,
  valueB: string | undefined,
  order: 'asc' | 'desc'
) => {
  const timeA = valueA ? new Date(valueA).getTime() : 0;
  const timeB = valueB ? new Date(valueB).getTime() : 0;

  return compareNumberValues(timeA, timeB, order);
};

// ListItemCard removed in favor of InteractivePoster inside the page

/* ─── Collaborator Card ─── */
const CollaboratorCard = ({
  collaborator,
  isOwner,
  onRemove,
}: {
  collaborator: UserListCollaborator;
  isOwner: boolean;
  onRemove: (username: string) => void;
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    onRemove(collaborator.user.username);
  };

  return (
    <div className="flex items-center justify-between bg-surface-page border border-gray-800/60 rounded-xl p-3 hover:bg-surface-panel transition-all group">
      <Link
        href={`/profile/${collaborator.user.username}` as any}
        className="flex items-center gap-3 min-w-0"
      >
        <div className="w-10 h-10 rounded-full bg-gray-800/50 overflow-hidden flex-shrink-0 border border-gray-700/40">
          {collaborator.user.picturePath ? (
            <Image
              src={collaborator.user.picturePath}
              alt={collaborator.user.username}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold flex items-center justify-center h-full text-sm">
              {collaborator.user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-100 truncate group-hover:text-blue-400 transition-colors text-sm">
            {collaborator.user.username}
          </p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            {collaborator.role === 'editor' ? (
              <>
                <Pencil size={10} /> Düzenleyici
              </>
            ) : (
              <>
                <Users size={10} /> İzleyici
              </>
            )}
          </p>
        </div>
      </Link>

      {isOwner && (
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="Ortağı Çıkar"
        >
          {isRemoving ? (
            <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
          ) : (
            <X size={14} />
          )}
        </button>
      )}
    </div>
  );
};

/* ─── Add Collaborator Modal ─── */
const AddCollaboratorModal = ({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (username: string, role: 'editor' | 'viewer') => Promise<void>;
}) => {
  const [username, setUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let isCurrentSearch = true;

    const q = username.trim();
    if (selectedUser && q === selectedUser.username) {
      return () => {
        isCurrentSearch = false;
      };
    }

    if (q.length < 2) {
      return;
    }

    const t = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await searchUsers(q, 8);
      if (!isCurrentSearch) return;

      if (error) {
        console.warn('⚠️ [AddCollaboratorModal] searchUsers error', error);
        setResults([]);
      } else {
        setResults(data || []);
      }
      setIsSearching(false);
    }, 250);

    return () => {
      isCurrentSearch = false;
      clearTimeout(t);
    };
  }, [username, isOpen, selectedUser]);

  const chooseUser = (u: UserSearchResult) => {
    setSelectedUser(u);
    setUsername(u.username);
    setResults([]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      setError('Lütfen listeden bir kullanıcı seçin');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onAdd(selectedUser.username, role);
      console.log('✅ [AddCollaboratorModal] Ortak eklendi:', selectedUser.username);
      setUsername('');
      setSelectedUser(null);
      setResults([]);
      setRole('editor');
      onClose();
    } catch (err: any) {
      console.error('❌ [AddCollaboratorModal] Hata:', err.message);
      setError(err.message || 'Bir hata oluştu');
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-surface-page border border-gray-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">Ortak Ekle</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Kullanıcı Adı
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                disabled={isSubmitting}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSelectedUser(null);
                  setResults([]);
                  setIsSearching(false);
                }}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                placeholder="kullaniciadi"
                autoComplete="off"
              />

              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}

              {results.length > 0 && (
                <div className="absolute z-50 mt-2 w-full bg-surface-panel border border-gray-800/60 rounded-xl overflow-hidden shadow-2xl">
                  {results.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => chooseUser(u)}
                      disabled={isSubmitting}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-800/50 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-800/50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-700/40">
                        {u.picturePath ? (
                          <Image
                            src={u.picturePath}
                            alt={u.username}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-200 font-medium truncate text-sm">{u.username}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Seçildi: {selectedUser.username}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Rol
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setRole('editor')}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                  role === 'editor'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 ring-1 ring-blue-500/20'
                    : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                }`}
              >
                <Pencil size={14} />
                Düzenleyici
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setRole('viewer')}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                  role === 'viewer'
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 ring-1 ring-purple-500/20'
                    : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                }`}
              >
                <Users size={14} />
                İzleyici
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// İçerik ekleme modal'ı
const AddContentToListModal = ({
  isOpen,
  onClose,
  onAdd,
  contentTypeId,
  existingContentIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contentId: string) => Promise<void>;
  contentTypeId: number;
  existingContentIds: string[];
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');

  const [searchContent, { data, loading, variables: searchVariables }] = useLazyQuery<{
    searchContent: {
      items: any[];
      total: number;
    };
  }>(SEARCH_CONTENT_FOR_LIST);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setLocalError('');
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const t = setTimeout(() => {
      searchContent({
        variables: {
          searchQuery: query.trim(),
          contentTypeId: contentTypeId,
          limit: 10,
        },
      });
    }, 300);

    return () => clearTimeout(t);
  }, [query, isOpen, contentTypeId, searchContent]);

  useEffect(() => {
    if (data?.searchContent?.items) {
      // Listede zaten mevcut olan içerikleri filtrele
      const filtered = data.searchContent.items.filter(
        (item: any) => !existingContentIds.includes(item.id)
      );
      setResults(filtered);
    }
  }, [data, existingContentIds]);

  const normalizedQuery = query.trim();
  const hasCurrentResults =
    searchVariables?.searchQuery === normalizedQuery &&
    searchVariables?.contentTypeId === contentTypeId;
  const visibleResults = hasCurrentResults ? results : [];
  const isSearchPending = normalizedQuery.length >= 2 && !hasCurrentResults;

  const handleAdd = async (contentId: string) => {
    setIsSubmitting(contentId);
    setLocalError('');
    try {
      await onAdd(contentId);
      onClose();
    } catch (err: any) {
      console.error('Failed to add content:', err);
      setLocalError(err.message || 'Eklenirken bir hata oluştu');
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={() => {
        if (isSubmitting === null) onClose();
      }}
    >
      <div
        className="bg-neutral-950 border border-neutral-800/50 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">İçerik Ekle</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting !== null}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="relative group">
            <input
              type="text"
              value={query}
              disabled={isSubmitting !== null}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-4 pr-10 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500"
              placeholder="İsim ile içerik ara..."
              autoFocus
              autoComplete="off"
            />
            {(loading || isSearchPending) && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {localError && (
          <div className="text-red-400 text-sm mb-6 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
            {localError}
          </div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {!loading &&
            hasCurrentResults &&
            normalizedQuery.length >= 2 &&
            visibleResults.length === 0 && (
              <div className="text-center py-8 text-gray-500 italic">Sonuç bulunamadı.</div>
            )}
          {!loading && normalizedQuery.length < 2 && (
            <div className="text-center py-8 text-gray-500 italic text-sm">
              Aramak için yazmaya başlayın...
            </div>
          )}
          {visibleResults.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-gray-700/30 rounded-xl p-3 hover:bg-gray-700/60 transition-all border border-gray-700/50 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-14 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-gray-700">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      width={40}
                      height={56}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">
                      No Image
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate text-sm group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </p>
                  {item.releaseDate && (
                    <p className="text-[11px] text-gray-500 font-medium">
                      {new Date(item.releaseDate).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAdd(item.id)}
                disabled={isSubmitting !== null}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-[11px] font-bold rounded-lg transition-all transform active:scale-95 shadow-lg flex-shrink-0"
              >
                {isSubmitting === item.id ? (
                  '...'
                ) : (
                  <div className="flex items-center gap-1">
                    <span>Ekle</span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function ListDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();

  const username = decodeURIComponent(params.username as string);
  const listId = Number(params.listId);

  const [list, setList] = useState<UserList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editIsOrdered, setEditIsOrdered] = useState(false);

  // Reorder state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [selectedMoveContentId, setSelectedMoveContentId] = useState<string | null>(null);
  const [moveTargetValue, setMoveTargetValue] = useState('');
  const [moveMode, setMoveMode] = useState<'swap' | 'insert-before'>('insert-before');
  const moveInputRef = useRef<HTMLInputElement | null>(null);

  // Layout & Sorting State
  const preferences = useUserPreferences();
  const gridClassName =
    preferences?.gridClassName ||
    'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
  const [itemStates, setItemStates] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<SortOption>('custom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('asc');
  const [hideOptions, setHideOptions] = useState<HideOptions>({
    hideWatched: 'passive',
    hideWatchlist: 'passive',
    hideContinuing: 'passive',
    hideFavorites: 'passive',
    hideAbandoned: 'passive',
    hideInAnyList: 'passive',
  });

  const isOwner = user?.id === list?.ownerId;
  const isCollaborator = list?.collaborators?.some((c) => c.userId === user?.id);
  const collaboratorRole = list?.collaborators?.find((c) => c.userId === user?.id)?.role;
  const canEdit = isOwner || collaboratorRole === 'editor';

  const normalizeItemDisplayOrder = (items: UserList['items'] = []) =>
    items.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

  const closeMovePanel = () => {
    setSelectedMoveContentId(null);
    setMoveTargetValue('');
  };

  const persistListItemOrder = async (
    items: UserListItem[],
    successMessage: string = 'Liste sırası kaydedildi'
  ) => {
    if (!list) return false;

    const previousItems = list.items || [];
    const normalizedItems = normalizeItemDisplayOrder(items);

    setList((prev) =>
      prev
        ? {
            ...prev,
            items: normalizedItems,
          }
        : prev
    );

    setIsSavingOrder(true);
    console.log('🔄 [ListDetailPage] Liste sırası kaydediliyor', {
      listId: list.id,
      itemCount: normalizedItems.length,
    });

    try {
      const payload = normalizedItems.map((item, idx) => ({
        contentId: item.contentId,
        displayOrder: idx,
      }));

      const { success, error } = await reorderListItems(list.id, payload);
      if (!success) {
        throw error || new Error('Sıra kaydedilemedi');
      }

      console.log('✅ [ListDetailPage] Liste sırası kaydedildi', {
        listId: list.id,
        itemCount: normalizedItems.length,
      });
      toast.success(successMessage);
      return true;
    } catch (err: any) {
      console.error('❌ [ListDetailPage] Liste sırası kaydedilemedi', err);
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: previousItems,
            }
          : prev
      );
      toast.error(err.message || 'Sıra kaydedilirken bir hata oluştu');
      return false;
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSelectItemForMove = (item: UserListItem) => {
    if (!isEditing) return;

    console.log('🎯 [ListDetailPage] İçerik taşıma paneli açıldı', {
      contentId: item.contentId,
      currentPosition: item.displayOrder + 1,
    });

    setSelectedMoveContentId(item.contentId);
    setMoveTargetValue(String(item.displayOrder + 1));
  };

  const handleMoveTargetChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    const normalizedValue = digitsOnly.replace(/^0+/, '');
    setMoveTargetValue(normalizedValue);
  };

  const handleMoveItemByInput = async () => {
    if (!list?.items || !selectedMoveContentId) return;

    if (!/^[1-9]\d*$/.test(moveTargetValue)) {
      console.warn('⚠️ [ListDetailPage] Geçersiz sıra girişi', {
        value: moveTargetValue,
      });
      toast.error('Lütfen 1 veya daha büyük bir sıra numarası girin');
      return;
    }

    const sourceIndex = list.items.findIndex((item) => item.contentId === selectedMoveContentId);
    if (sourceIndex === -1) {
      console.warn('⚠️ [ListDetailPage] Taşınacak içerik bulunamadı', {
        contentId: selectedMoveContentId,
      });
      closeMovePanel();
      return;
    }

    const requestedPosition = Number(moveTargetValue);
    const currentPosition = sourceIndex + 1;
    const clampedTargetPosition = Math.min(Math.max(requestedPosition, 1), list.items.length);

    if (clampedTargetPosition === currentPosition) {
      console.log('ℹ️ [ListDetailPage] İçerik zaten istenen sırada', {
        contentId: selectedMoveContentId,
        currentPosition,
      });
      closeMovePanel();
      return;
    }

    const reorderedItems = [...list.items];
    let finalPosition = clampedTargetPosition;

    if (moveMode === 'swap') {
      const targetIndex = clampedTargetPosition - 1;
      [reorderedItems[sourceIndex], reorderedItems[targetIndex]] = [
        reorderedItems[targetIndex],
        reorderedItems[sourceIndex],
      ];
    } else {
      const [movedItem] = reorderedItems.splice(sourceIndex, 1);
      const targetIndex = Math.min(Math.max(requestedPosition - 1, 0), reorderedItems.length);
      reorderedItems.splice(targetIndex, 0, movedItem);
      finalPosition = Math.min(requestedPosition, list.items.length);
    }

    console.log('🔀 [ListDetailPage] İçerik yeni sıraya taşınıyor', {
      contentId: selectedMoveContentId,
      from: currentPosition,
      requestedPosition,
      finalPosition,
      moveMode,
    });

    const success = await persistListItemOrder(
      reorderedItems,
      moveMode === 'swap'
        ? `İçerik ${finalPosition}. sıradaki içerikle yer değiştirdi`
        : `İçerik ${finalPosition}. sıraya taşındı`
    );

    if (success) {
      closeMovePanel();
    }
  };

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      const { data, error } = await getList(listId);

      if (error) {
        // GraphQL hataları için mesajı doğru yerden al
        const errorMessage =
          error.graphQLErrors?.[0]?.message || error.message || 'Liste yüklenemedi';
        setError(errorMessage);
      } else if (data) {
        setList(data);
        setEditName(data.name);
        setEditDescription(data.description || '');
        setEditIsPublic(data.isPublic);
        setEditIsOrdered(data.isOrdered);

        // Fetch item states
        if (data.items && data.items.length > 0) {
          const contentIds = data.items.map((i: any) => i.contentId.toString());
          try {
            const states = await loadItemStates(contentIds);
            setItemStates(states);
          } catch (err) {
            console.error('Failed to load item states:', err);
          }
        }
      }

      setLoading(false);
    };

    if (listId) {
      fetchList();
    }
  }, [listId]);

  useEffect(() => {
    const fetchSavedState = async () => {
      // auth yoksa yıldız göstermeyelim
      if (!user || !listId) return;

      const { data } = await isListSaved(listId);
      setIsSaved(Boolean(data));
    };

    fetchSavedState();
  }, [user, listId]);

  useEffect(() => {
    if (!isEditing) {
      closeMovePanel();
      return;
    }

    if (selectedMoveContentId) {
      requestAnimationFrame(() => {
        moveInputRef.current?.focus();
        moveInputRef.current?.select();
      });
    }
  }, [isEditing, selectedMoveContentId]);

  useEffect(() => {
    if (!selectedMoveContentId) return;

    const selectedItemStillExists = list?.items?.some(
      (item) => item.contentId === selectedMoveContentId
    );

    if (!selectedItemStillExists) {
      closeMovePanel();
    }
  }, [list?.items, selectedMoveContentId]);

  const handleToggleSave = async () => {
    if (!user || !list) return;
    if (isOwner) return;
    if (isSaveLoading) return;

    setIsSaveLoading(true);
    setError('');

    const prev = isSaved;
    setIsSaved(!prev);
    console.log('🔖 [ListDetail] toggleSave', { listId: list.id, prev });

    try {
      if (prev) {
        const res = await unsaveList(list.id);
        if (!res.success) throw res.error;
      } else {
        const res = await saveList(list.id);
        if (!res.success) throw res.error;
      }
    } catch (e: any) {
      console.warn('⚠️ [ListDetail] toggleSave failed, rollback');
      setIsSaved(prev);
      setError(e?.message || 'Liste kaydedilirken bir hata oluştu');
    } finally {
      setIsSaveLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!list) return;

    const { data, error } = await updateList(list.id, {
      name: editName,
      description: editDescription,
      isPublic: editIsPublic,
      isOrdered: editIsOrdered,
    });

    if (data) {
      setList((prev) =>
        prev ? { ...prev, ...data, items: prev.items, collaborators: prev.collaborators } : data
      );
      setIsEditing(false);
    }
  };

  const handleRemoveItem = async (contentId: string) => {
    if (!list) return;

    const { success } = await removeFromList(list.id, contentId);
    if (success) {
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: normalizeItemDisplayOrder(
                prev.items?.filter((item) => item.contentId !== contentId) || []
              ),
              itemCount: prev.itemCount - 1,
            }
          : null
      );
    }
  };

  const handleAddCollaborator = async (username: string, role: 'editor' | 'viewer') => {
    if (!list) return;

    const { data, error } = await addCollaborator(list.id, username, role);
    if (error) throw error;

    if (data) {
      setList((prev) =>
        prev
          ? {
              ...prev,
              collaborators: [...(prev.collaborators || []), data],
            }
          : null
      );
    }
  };

  const handleRemoveCollaborator = async (username: string) => {
    if (!list) return;

    const { success } = await removeCollaborator(list.id, username);
    if (success) {
      setList((prev) =>
        prev
          ? {
              ...prev,
              collaborators: prev.collaborators?.filter((c) => c.user.username !== username),
            }
          : null
      );
    }
  };

  const handleAddContent = async (contentId: string) => {
    if (!list) return;

    const { data, error } = await addToList(list.id, contentId);
    if (error) {
      toast.error(error.message || 'Eklenirken bir hata oluştu');
      throw error;
    }

    if (data) {
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: normalizeItemDisplayOrder([data, ...(prev.items || [])]),
              itemCount: prev.itemCount + 1,
            }
          : null
      );
      toast.success('İçerik listeye eklendi');
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Only allow if editing AND it is an ordered list (or if we want to allow reordering any list that we're editing?)
    // Let's allow reordering ANY list you can edit, but only actually change it on backend.
    setDraggedIndex(index);
    // Required for Firefox
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    if (draggedIndex === null || draggedIndex === index || !list?.items) return;

    // Optional: Visual feedback of drag over could go here, but React handles state well
    const itemsCopy = [...list.items];
    const draggedItem = itemsCopy[draggedIndex];
    itemsCopy.splice(draggedIndex, 1);
    itemsCopy.splice(index, 0, draggedItem);
    const normalizedItems = normalizeItemDisplayOrder(itemsCopy);

    // Update local state for immediate feedback
    setList((prev) =>
      prev
        ? {
            ...prev,
            items: normalizedItems,
          }
        : prev
    );
    setDraggedIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedIndex(null);

    // Trigger save to backend
    if (!list?.items) return;

    await persistListItemOrder(list.items);
  };

  // State handlers for InteractivePoster
  const updateSingleItemState = async (
    contentId: string,
    actionName: string,
    actionFn: () => Promise<any>
  ) => {
    console.log(`[ListDetailPage] ${actionName} for ${contentId}`);
    try {
      await actionFn();
      const newState = await updateItemState(contentId);
      setItemStates((prev) => ({ ...prev, [contentId]: newState }));
    } catch (error) {
      console.error(`[ListDetailPage] Error ${actionName}:`, error);
    }
  };

  const handleWatch = (item: any) =>
    updateSingleItemState(item.id.toString(), 'Toggle watch', async () => {
      const currentState = itemStates[item.id];
      if (currentState?.isConsumed) {
        await unlogContentWatch(item.id.toString());
      } else {
        await logContentWatch(item.id.toString());
      }
    });

  const handleToggleFavorite = (item: any) =>
    updateSingleItemState(item.id.toString(), 'Toggle favorite', () =>
      toggleContentFavorite(item.id.toString())
    );

  const handleToggleWatchlist = (item: any) =>
    updateSingleItemState(item.id.toString(), 'Toggle watchlist', () =>
      toggleConsumeLater(item.id.toString())
    );

  const handleToggleContinuing = (item: any) =>
    updateSingleItemState(item.id.toString(), 'Toggle continuing', () =>
      toggleContinuing(item.id.toString())
    );

  const typeInfo = list ? getContentTypeInfo(list.contentTypeId) : null;

  const handleLeaveList = async () => {
    if (!list) return;

    if (!confirm('Bu listeden çıkmak istediğinizden emin misiniz?')) return;

    const { success } = await leaveList(list.id);
    if (success) {
      router.push(`/profile/${username}/lists` as any);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-700 border-t-blue-500" />
        <p className="text-sm text-gray-500">Liste yükleniyor...</p>
      </div>
    );
  }

  if (error || !list || !typeInfo) {
    const isAccessDenied = error?.includes('erişim yetkiniz yok');
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800/50 mx-auto mb-4">
            {isAccessDenied ? (
              <Lock size={28} className="text-gray-500" />
            ) : (
              <FolderOpen size={28} className="text-gray-500" />
            )}
          </div>
          <h2 className="text-xl font-bold mb-2">
            {isAccessDenied ? 'Erişim Yetkiniz Yok' : 'Liste Bulunamadı'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isAccessDenied
              ? 'Bu listeyi görüntüleme izniniz bulunmamaktadır.'
              : error || 'Bu liste mevcut değil veya silinmiş olabilir.'}
          </p>
          <Link
            href={`/profile/${username}` as any}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 inline-block"
          >
            Profile Dön
          </Link>
        </div>
      </div>
    );
  }

  // Filter and Sort Items
  let displayItems = list.items || [];

  // Filter by hide options
  displayItems = displayItems.filter((listItem) => {
    const state = itemStates[listItem.contentId];
    if (hideOptions.hideWatched === 'hide' && state?.isConsumed) return false;
    if (hideOptions.hideWatched === 'show' && !state?.isConsumed) return false;
    if (hideOptions.hideWatchlist === 'hide' && state?.isConsumeLater) return false;
    if (hideOptions.hideWatchlist === 'show' && !state?.isConsumeLater) return false;
    if (hideOptions.hideContinuing === 'hide' && state?.isContinuing) return false;
    if (hideOptions.hideContinuing === 'show' && !state?.isContinuing) return false;
    if (hideOptions.hideFavorites === 'hide' && state?.isFavorite) return false;
    if (hideOptions.hideFavorites === 'show' && !state?.isFavorite) return false;
    if (hideOptions.hideAbandoned === 'hide' && state?.isAbandoned) return false;
    if (hideOptions.hideAbandoned === 'show' && !state?.isAbandoned) return false;
    return true;
  });

  // Sort
  if (!isEditing && sortOrder !== 'none') {
    displayItems = [...displayItems].sort((a, b) => {
      switch (sortBy) {
        case 'popularity': {
          const consumeComparison = compareNumberValues(
            a.content.consumeCount || 0,
            b.content.consumeCount || 0,
            sortOrder
          );
          if (consumeComparison !== 0) return consumeComparison;

          const favoriteComparison = compareNumberValues(
            a.content.favoriteCount || 0,
            b.content.favoriteCount || 0,
            sortOrder
          );
          if (favoriteComparison !== 0) return favoriteComparison;

          return compareNumberValues(a.displayOrder, b.displayOrder, 'asc');
        }

        case 'rating': {
          const ratingComparison = compareNumberValues(
            calculateAverageRating(a.content.ratingDistribution, a.content.tmdbRating),
            calculateAverageRating(b.content.ratingDistribution, b.content.tmdbRating),
            sortOrder
          );
          if (ratingComparison !== 0) return ratingComparison;

          return compareNumberValues(a.displayOrder, b.displayOrder, 'asc');
        }

        case 'title': {
          const titleA = (a.content.title || '').toLocaleLowerCase('tr');
          const titleB = (b.content.title || '').toLocaleLowerCase('tr');
          const comparison = titleA.localeCompare(titleB, 'tr');

          if (comparison !== 0) {
            return sortOrder === 'asc' ? comparison : -comparison;
          }

          return compareNumberValues(a.displayOrder, b.displayOrder, 'asc');
        }

        case 'releaseDate': {
          const releaseDateComparison = compareDateValues(
            a.content.releaseDate,
            b.content.releaseDate,
            sortOrder
          );
          if (releaseDateComparison !== 0) return releaseDateComparison;

          return compareNumberValues(a.displayOrder, b.displayOrder, 'asc');
        }

        case 'userDate': {
          const addedAtComparison = compareDateValues(a.addedAt, b.addedAt, sortOrder);
          if (addedAtComparison !== 0) return addedAtComparison;

          return compareNumberValues(a.displayOrder, b.displayOrder, 'asc');
        }

        case 'custom':
        default:
          return compareNumberValues(a.displayOrder, b.displayOrder, sortOrder);
      }
    });
  }

  const listParticipantCount = 1 + (list.collaborators?.length || 0);
  const distinctItemAdderCount = new Set(
    (list.items || []).map((item) => item.addedBy?.id || item.addedById)
  ).size;
  const shouldShowAddedBy = listParticipantCount > 1 || distinctItemAdderCount > 1;
  const selectedMoveItem = selectedMoveContentId
    ? list.items?.find((item) => item.contentId === selectedMoveContentId)
    : null;
  const movePreviewPosition = moveTargetValue || String((selectedMoveItem?.displayOrder || 0) + 1);
  const moveModeLabel = moveMode === 'swap' ? 'Yer değiştir' : 'Önüne ekle';

  const completedCount =
    list?.items?.filter((item) => itemStates[item.contentId]?.isConsumed)?.length || 0;
  const totalCount = list?.items?.length || list?.itemCount || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link
            href={`/profile/${username}` as any}
            className="hover:text-gray-300 transition-colors"
          >
            {username}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-200 font-medium">{list.name}</span>
        </div>

        {/* Header */}
        <div
          className={`overflow-hidden rounded-2xl border bg-surface-page ${typeInfo.accentColor} mb-8 shadow-2xl`}
        >
          {/* Top accent line */}
          <div className={`h-[2px] ${typeInfo.bg.split(' ')[0].replace('/15', '/40')}`} />

          <div className="p-6">
            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-xl font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none placeholder-gray-600"
                  rows={3}
                  placeholder="Açıklama ekle..."
                />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-gray-900/30 rounded-xl px-4 py-3 border border-gray-800/40">
                    <div className="flex items-center gap-2">
                      {!editIsPublic && <Lock size={14} className="text-gray-500" />}
                      <span className="text-sm text-gray-300">Herkese açık liste</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editIsPublic}
                      onClick={() => setEditIsPublic(!editIsPublic)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        editIsPublic ? 'bg-blue-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          editIsPublic ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {/* Sıralı / Serbest */}
                  <div className="flex items-center justify-between bg-gray-900/30 rounded-xl px-4 py-3 border border-gray-800/40">
                    <div className="flex items-center gap-2">
                      <ListOrdered
                        size={14}
                        className={editIsOrdered ? 'text-blue-400' : 'text-gray-500'}
                      />
                      <span className="text-sm text-gray-300">Sıralı liste (Numaralı)</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editIsOrdered}
                      onClick={() => setEditIsOrdered(!editIsOrdered)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        editIsOrdered ? 'bg-blue-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          editIsOrdered ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl ${typeInfo.bg} flex-shrink-0`}
                    >
                      {typeInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <h1 className="text-2xl font-bold text-white">{list.name}</h1>
                        <span className="text-sm font-medium text-gray-400 bg-gray-800/50 border border-gray-700/50 px-2 py-0.5 rounded-md flex-shrink-0">
                          {totalCount} içerik
                        </span>
                        {totalCount > 0 && user && (
                          <span
                            className="text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex-shrink-0"
                            title="Tamamlanma Oranı"
                          >
                            {completedCount} tamamlandı (%{completionPercentage})
                          </span>
                        )}
                        {!list.isPublic && (
                          <Lock size={14} className="text-gray-500 flex-shrink-0" />
                        )}
                      </div>

                      {list.description && (
                        <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                          {list.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[12px] flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${typeInfo.bg}`}
                        >
                          {typeInfo.icon}
                          {typeInfo.name}
                        </span>
                        <Link
                          href={`/profile/${list.owner.username}` as any}
                          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-gray-800/50 overflow-hidden border border-gray-700/40">
                            {list.owner.picturePath ? (
                              <Image
                                src={list.owner.picturePath}
                                alt={list.owner.username}
                                width={20}
                                height={20}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-[9px] font-semibold flex items-center justify-center h-full">
                                {list.owner.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {list.owner.username}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isOwner && (
                      <button
                        onClick={handleToggleSave}
                        disabled={!user || isSaveLoading}
                        className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 border ${
                          isSaved
                            ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                            : 'bg-gray-900/30 border-gray-700 text-gray-300 hover:bg-gray-800/50 hover:text-white'
                        } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={
                          !user ? 'Kaydetmek için giriş yapın' : isSaved ? 'Kayıttan Çık' : 'Kaydet'
                        }
                      >
                        {isSaveLoading ? (
                          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : isSaved ? (
                          <BookmarkCheck size={15} />
                        ) : (
                          <Bookmark size={15} />
                        )}
                        {isSaved ? 'Kaydedildi' : 'Kaydet'}
                      </button>
                    )}
                    {isOwner && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/50 transition-all"
                          title="Düzenle"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setShowAddCollaborator(true)}
                          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/50 transition-all"
                          title="Ortak Ekle"
                        >
                          <UserPlus size={16} />
                        </button>
                      </>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => setShowAddContent(true)}
                        className="px-3 py-1.5 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-500/10 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                        title="İçerik Ekle"
                      >
                        <Plus size={14} />
                        İçerik Ekle
                      </button>
                    )}
                    {isCollaborator && !isOwner && (
                      <button
                        onClick={handleLeaveList}
                        className="px-3 py-1.5 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-400/40 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                      >
                        <LogOut size={14} />
                        Listeden Çık
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="max-w-5xl mx-auto -mt-4 mb-6">
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Collaborators */}
        {list.collaborators && list.collaborators.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={14} />
              Ortaklar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.collaborators.map((collab) => (
                <CollaboratorCard
                  key={collab.id}
                  collaborator={collab}
                  isOwner={isOwner}
                  onRemove={handleRemoveCollaborator}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="max-w-[1920px] mx-auto px-6 pb-12">
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div className="flex items-center justify-between md:justify-end gap-3 flex-1">
              {!isEditing && (
                <div className="w-full flex-1">
                  <SortingBar
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    hideOptions={hideOptions}
                    onSortChange={(field, order) => {
                      console.info('[ListDetailPage] Sort changed', { field, order });
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                    onHideChange={(option, state) =>
                      setHideOptions((prev) => ({ ...prev, [option]: state }))
                    }
                    showCustomSort={list.isOrdered}
                  />
                </div>
              )}
              {isSavingOrder && (
                <div className="text-xs text-blue-400 animate-pulse">Kaydediliyor...</div>
              )}
            </div>
          </div>

          {displayItems && displayItems.length > 0 ? (
            <div className={`grid gap-3 sm:gap-4 lg:gap-5 ${gridClassName}`}>
              {displayItems.map((item, index) => {
                const state = itemStates[item.contentId];

                return (
                  <div
                    key={item.id}
                    className={`relative ${isEditing ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-blue-500 rounded-xl transition-all' : ''}`}
                    draggable={isEditing}
                    onClick={() => handleSelectItemForMove(item)}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {isEditing && (
                      <div className="absolute top-2 left-2 z-20 bg-black/60 backdrop-blur-md p-1.5 rounded-md text-white/70 pointer-events-none">
                        <GripVertical size={16} />
                      </div>
                    )}
                    {list.isOrdered && (
                      <div
                        className={`absolute top-2 left-2 z-20 w-7 h-7 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-full text-xs font-bold ring-2 ${typeInfo.accentColor} shadow-lg pointer-events-none ${isEditing ? 'ml-8' : ''}`}
                      >
                        {item.displayOrder + 1}
                      </div>
                    )}
                    {canEdit && isEditing && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveItem(item.contentId);
                        }}
                        className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all"
                        title="Listeden Çıkar"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <div className={isEditing ? 'pointer-events-none' : ''}>
                      <InteractivePoster
                        content={item.content as any}
                        contentType={typeInfo.path as any}
                        viewerIsConsumed={state?.isConsumed}
                        viewerIsFavorite={state?.isFavorite}
                        viewerIsConsumeLater={state?.isConsumeLater}
                        viewerIsContinuing={state?.isContinuing}
                        onWatch={user ? () => handleWatch(item.content) : undefined}
                        onToggleFavorite={
                          user ? () => handleToggleFavorite(item.content) : undefined
                        }
                        onToggleWatchlist={
                          user ? () => handleToggleWatchlist(item.content) : undefined
                        }
                        onToggleContinuing={
                          user ? () => handleToggleContinuing(item.content) : undefined
                        }
                      />
                    </div>

                    {shouldShowAddedBy && item.addedBy?.username && (
                      <ListItemAddedByMeta
                        username={item.addedBy.username}
                        profileHref={`/profile/${item.addedBy.username}`}
                        picturePath={item.addedBy.picturePath}
                        isEditing={isEditing}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-surface-page border border-gray-800/60 rounded-xl">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${typeInfo.bg} mb-4`}
              >
                {typeInfo.icon}
              </div>
              <p className="text-gray-400 text-sm font-medium mb-1">Bu listede henüz içerik yok.</p>
              {canEdit && (
                <>
                  <p className="text-gray-600 text-xs mb-4">
                    Aşağıdaki butona tıklayarak veya içerik sayfalarından &quot;Listeye Ekle&quot;
                    seçeneğini kullanarak içerik ekleyebilirsiniz.
                  </p>
                  <button
                    onClick={() => setShowAddContent(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all active:scale-95"
                  >
                    <Plus size={16} />
                    İçerik Ekle
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing && selectedMoveItem && (
        <div className="fixed bottom-4 right-4 z-50 w-[220px] rounded-2xl border border-blue-500/20 bg-black/85 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Sıra taşı
              </p>
              <p className="mt-1 text-2xl font-bold text-white leading-none">
                {movePreviewPosition}
              </p>
            </div>
            <button
              onClick={closeMovePanel}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
              title="Kapat"
            >
              <X size={14} />
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-400 line-clamp-2">
            {selectedMoveItem.content.title}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Şu anki sıra: {selectedMoveItem.displayOrder + 1}
          </p>

          <div className="mt-3 flex rounded-xl border border-gray-800 bg-gray-900/70 p-1">
            <button
              type="button"
              onClick={() => setMoveMode('swap')}
              className={`flex-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-all ${
                moveMode === 'swap'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yer değiştir
            </button>
            <button
              type="button"
              onClick={() => setMoveMode('insert-before')}
              className={`flex-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-all ${
                moveMode === 'insert-before'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Önüne ekle
            </button>
          </div>

          <input
            ref={moveInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={moveTargetValue}
            onChange={(e) => handleMoveTargetChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleMoveItemByInput();
              }

              if (e.key === 'Escape') {
                e.preventDefault();
                closeMovePanel();
              }
            }}
            className="mt-3 w-full rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-blue-500"
            placeholder="Yeni sıra"
          />

          <p className="mt-2 text-[11px] text-gray-500">
            {moveModeLabel} aktif. Sadece pozitif sayı gir. Enter ile uygula.
          </p>
        </div>
      )}

      {/* Add Collaborator Modal */}
      {showAddCollaborator && (
        <AddCollaboratorModal
          isOpen
          onClose={() => setShowAddCollaborator(false)}
          onAdd={handleAddCollaborator}
        />
      )}

      {/* Add Content Modal */}
      <AddContentToListModal
        isOpen={showAddContent}
        onClose={() => setShowAddContent(false)}
        onAdd={handleAddContent}
        contentTypeId={list?.contentTypeId || 0}
        existingContentIds={list?.items?.map((item) => item.contentId) || []}
      />
    </div>
  );
}
