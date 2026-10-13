'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Lock,
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Music,
  FolderOpen,
  ListOrdered,
} from 'lucide-react';
import {
  getUserLists,
  getSavedLists,
  createList,
  saveList,
  unsaveList,
  UserList,
} from '@/services/graphql/list';
import ProfileListCard from '@/components/organisms/profile/ProfileListCard';
import { useTranslations } from 'next-intl';

interface ListsTabProps {
  username: string;
  isOwnProfile: boolean;
}

/* ─── Content type styling ─── */
const getContentTypeInfo = (contentTypeId: number, t: any) => {
  switch (contentTypeId) {
    case 1:
      return {
        name: t('contentTypes.movie'),
        bg: 'bg-blue-500/15 text-blue-400',
        icon: <Film size={16} />,
        accentColor: 'border-blue-500/30',
      };
    case 2:
      return {
        name: t('contentTypes.tv'),
        bg: 'bg-purple-500/15 text-purple-400',
        icon: <Tv size={16} />,
        accentColor: 'border-purple-500/30',
      };
    case 3:
      return {
        name: t('contentTypes.game'),
        bg: 'bg-green-500/15 text-green-400',
        icon: <Gamepad2 size={16} />,
        accentColor: 'border-green-500/30',
      };
    case 4:
      return {
        name: t('contentTypes.book'),
        bg: 'bg-amber-500/15 text-amber-400',
        icon: <BookOpen size={16} />,
        accentColor: 'border-amber-500/30',
      };
    case 5:
      return {
        name: t('contentTypes.music'),
        bg: 'bg-pink-500/15 text-pink-400',
        icon: <Music size={16} />,
        accentColor: 'border-pink-500/30',
      };
    default:
      return {
        name: t('contentTypes.general'),
        bg: 'bg-gray-500/15 text-gray-400',
        icon: <FolderOpen size={16} />,
        accentColor: 'border-gray-500/30',
      };
  }
};

/* ─── Create List Modal ─── */
const CreateListModal = ({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (list: UserList) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentTypeId, setContentTypeId] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('ProfileListsTab');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('errors.nameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    const { data, error: apiError } = await createList(
      name.trim(),
      contentTypeId,
      description.trim() || undefined,
      isPublic,
      isOrdered
    );

    if (data) {
      console.log('✅ [CreateListModal] Liste oluşturuldu:', data.name);
      onCreated(data);
      setName('');
      setDescription('');
      setContentTypeId(1);
      setIsPublic(false);
      setIsOrdered(false);
      onClose();
    } else {
      console.error('❌ [CreateListModal] Hata:', apiError?.message);
      setError(apiError?.message || t('errors.createError'));
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const contentTypes = [
    { id: 1, icon: <Film size={16} />, label: t('contentTypes.movie') },
    { id: 2, icon: <Tv size={16} />, label: t('contentTypes.tv') },
    { id: 3, icon: <Gamepad2 size={16} />, label: t('contentTypes.game') },
    { id: 4, icon: <BookOpen size={16} />, label: t('contentTypes.book') },
    { id: 5, icon: <Music size={16} />, label: t('contentTypes.music') },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-page border border-gray-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6">{t('createModal.title')}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Liste adı */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('createModal.nameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
              placeholder={t('createModal.namePlaceholder')}
              maxLength={255}
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('createModal.descLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none placeholder-gray-600"
              placeholder={t('createModal.descPlaceholder')}
              rows={3}
            />
          </div>

          {/* İçerik türü - buttons */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('createModal.typeLabel')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {contentTypes.map((ct) => {
                const isActive = contentTypeId === ct.id;
                const info = getContentTypeInfo(ct.id, t);
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setContentTypeId(ct.id)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      isActive
                        ? `${info.bg} ${info.accentColor} ring-1 ring-current/20`
                        : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Görünürlük Container */}
          <div className="flex flex-col gap-3">
            {/* Görünürlük */}
            <div className="flex items-center justify-between bg-gray-900/30 rounded-xl px-4 py-3 border border-gray-800/40">
              <div className="flex items-center gap-2">
                {!isPublic && <Lock size={14} className="text-gray-500" />}
                <span className="text-sm text-gray-300">{t('createModal.public')}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sıralı / Serbest */}
            <div className="flex items-center justify-between bg-gray-900/30 rounded-xl px-4 py-3 border border-gray-800/40">
              <div className="flex items-center gap-2">
                <ListOrdered size={14} className={isOrdered ? 'text-blue-400' : 'text-gray-500'} />
                <span className="text-sm text-gray-300">{t('createModal.ordered')}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOrdered}
                onClick={() => setIsOrdered(!isOrdered)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  isOrdered ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    isOrdered ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              {error}
            </p>
          )}

          {/* Butonlar */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {t('createModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? t('createModal.creating') : t('createModal.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function ListsTab({ username, isOwnProfile }: ListsTabProps) {
  const [lists, setLists] = useState<UserList[]>([]);
  const [savedLists, setSavedLists] = useState<UserList[]>([]);
  const [activeTab, setActiveTab] = useState<'lists' | 'saved'>('lists');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const t = useTranslations('ProfileListsTab');

  useEffect(() => {
    const fetchLists = async () => {
      setLoading(true);
      console.log('📋 [ListsTab] Liste sekmesi yükleniyor:', { username, isOwnProfile });

      try {
        const { data, error } = await getUserLists(username);
        if (error) {
          console.error('❌ [ListsTab] Kullanıcı listeleri alınamadı:', error);
        }
        setLists(data || []);

        if (isOwnProfile) {
          const saved = await getSavedLists();
          if (saved.error) {
            console.error('❌ [ListsTab] Kaydedilen listeler alınamadı:', saved.error);
          }
          setSavedLists(saved.data || []);
        } else {
          setSavedLists([]);
        }
      } finally {
        setLoading(false);
        console.log('✅ [ListsTab] Liste sekmesi yüklendi:', { username, isOwnProfile });
      }
    };

    fetchLists();
  }, [isOwnProfile, username]);

  useEffect(() => {
    setActiveTab('lists');
  }, [username]);

  const handleListCreated = (newList: UserList) => {
    setLists((prev) => [newList, ...prev]);
  };

  const handleListDeleted = (listId: number) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const savedListIds = new Set(savedLists.map((l) => l.id));

  const toggleSave = async (listId: number) => {
    const intListId = parseInt(String(listId), 10);
    const isCurrentlySaved = savedListIds.has(intListId);
    console.log('🔖 [ListsTab] toggleSave', { listId: intListId, isCurrentlySaved });

    if (isCurrentlySaved) {
      const prev = savedLists;
      setSavedLists(prev.filter((l) => l.id !== intListId));
      const res = await unsaveList(intListId);
      if (!res.success) {
        console.warn('⚠️ [ListsTab] unsave failed, rollback');
        setSavedLists(prev);
      }
      return;
    }

    const listToSave = lists.find((l) => l.id === intListId);
    if (!listToSave) return;

    const prev = savedLists;
    setSavedLists([listToSave, ...prev]);
    const res = await saveList(intListId);
    if (!res.success) {
      console.warn('⚠️ [ListsTab] save failed, rollback');
      setSavedLists(prev);
    }
  };

  const displayedLists = isOwnProfile && activeTab === 'saved' ? savedLists : lists;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-700 border-t-blue-500" />
        <p className="text-sm text-gray-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      {isOwnProfile && (
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">{t('title')}</h2>
            <div className="inline-flex bg-surface-page border border-gray-800/60 rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setActiveTab('lists')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'lists'
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t('tabs.myLists')}
                {lists.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{lists.length}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'saved'
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t('tabs.savedLists')}
                {savedLists.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">{savedLists.length}</span>
                )}
              </button>
            </div>
          </div>

          {activeTab === 'lists' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 text-sm font-medium shadow-lg shadow-blue-600/20"
            >
              <Plus size={18} />
              {t('newList')}
            </button>
          )}
        </div>
      )}

      {/* Lists Grid */}
      {displayedLists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedLists.map((list) => (
            <ProfileListCard
              key={list.id}
              list={list}
              isOwnProfile={isOwnProfile}
              isSaved={savedListIds.has(list.id)}
              canSave={!isOwnProfile}
              onToggleSave={toggleSave}
              onDelete={handleListDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-800/50 mb-4">
            <FolderOpen size={28} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-sm mb-1 font-medium">
            {isOwnProfile
              ? activeTab === 'saved'
                ? t('empty.saved')
                : t('empty.created')
              : t('empty.otherUser')}
          </p>
          <p className="text-gray-600 text-xs mb-5">
            {isOwnProfile && activeTab === 'lists' ? t('empty.helper') : ''}
          </p>
          {isOwnProfile && activeTab === 'lists' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} />
              {t('createFirstList')}
            </button>
          )}
        </div>
      )}

      {/* Create List Modal */}
      <CreateListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleListCreated}
      />
    </div>
  );
}
