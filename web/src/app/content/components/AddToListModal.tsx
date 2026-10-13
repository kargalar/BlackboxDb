'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { getMyLists, addToList, UserList } from '@/services/graphql/list';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const GET_CONTENT_TYPE_BY_SLUG = gql`
  query GetContentTypeBySlug($slug: String!) {
    contentTypeBySlug(slug: $slug) {
      id
    }
  }
`;

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: string;
  contentTypeId?: number;
  contentTitle?: string;
}

/** Modal for adding content to user lists */
const AddToListModal: React.FC<AddToListModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTypeId,
}) => {
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [addingToList, setAddingToList] = useState<number | null>(null);
  const [showCreateListForm, setShowCreateListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const t = useTranslations('AddToListModal');
  const { data: typeData } = useQuery<{ contentTypeBySlug?: { id: number } | null }>(
    GET_CONTENT_TYPE_BY_SLUG,
    {
      variables: { slug: contentType },
      skip: contentTypeId !== undefined,
    }
  );
  const resolvedContentTypeId = contentTypeId ?? typeData?.contentTypeBySlug?.id;

  const loadLists = useCallback(async () => {
    setListsLoading(true);
    setShowCreateListForm(false);
    setNewListName('');
    try {
      const { data } = await getMyLists();
      const filteredLists = (data || []).filter((l) => l.contentTypeId === resolvedContentTypeId);
      setUserLists(filteredLists);
      console.log('✅ [AddToListModal] Listeler yüklendi:', filteredLists.length);
    } catch (e) {
      console.error('❌ [AddToListModal] Liste yükleme hatası:', e);
    } finally {
      setListsLoading(false);
    }
  }, [resolvedContentTypeId]);

  // Load user lists when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('📋 [AddToListModal] Modal açıldı, listeler yükleniyor', {
        contentId,
        contentType,
      });
      loadLists();
    }
  }, [isOpen, loadLists, contentId, contentType]);

  // Toggle content in list (add if not exist, remove if exist)
  const handleAddToList = async (listId: number) => {
    const intListId = Number(listId);
    setAddingToList(intListId);
    console.log('📋 [AddToListModal] Listeye ekleniyor/çıkarılıyor', {
      listId: intListId,
      contentId,
    });

    const { data, error } = await addToList(intListId, contentId);

    if (error) {
      console.error('❌ [AddToListModal] İşlem hatası:', error);
      toast.error(t('errorAction'));
    } else if (data === null || data === undefined) {
      console.log('✅ [AddToListModal] İçerik listeden çıkarıldı');
      toast.success(t('successRemove'));
      const { data: refreshedLists } = await getMyLists();
      setUserLists((refreshedLists || []).filter((l) => l.contentTypeId === resolvedContentTypeId));
      window.dispatchEvent(new Event('refetchLists'));
    } else {
      console.log('✅ [AddToListModal] İçerik listeye eklendi');
      toast.success(t('successAdd'));
      const { data: refreshedLists } = await getMyLists();
      setUserLists((refreshedLists || []).filter((l) => l.contentTypeId === resolvedContentTypeId));
      window.dispatchEvent(new Event('refetchLists'));
    }

    setAddingToList(null);
  };

  // Create new list and add content immediately
  const handleCreateListAndAdd = async () => {
    if (!newListName.trim()) {
      toast.error(t('nameRequired'));
      return;
    }
    if (!resolvedContentTypeId) {
      toast.error(t('errorCreate'));
      return;
    }

    setCreatingList(true);
    console.log('📋 [AddToListModal] Yeni liste oluşturuluyor:', newListName);
    const { createList } = await import('@/services/graphql/list');

    const { data: newList } = await createList(
      newListName.trim(),
      resolvedContentTypeId,
      undefined,
      false
    );

    if (newList) {
      const { data: addResult } = await addToList(Number(newList.id), contentId);
      if (addResult) {
        console.log('✅ [AddToListModal] Liste oluşturuldu ve içerik eklendi');
        toast.success(t('successCreateAdd', { name: newListName }));
        window.dispatchEvent(new Event('refetchLists'));
        onClose();
      } else {
        console.log('⚠️ [AddToListModal] Liste oluşturuldu ama içerik eklenemedi');
        toast.success(t('warnCreateNoAdd'));
      }
    } else {
      console.error('❌ [AddToListModal] Liste oluşturulamadı');
      toast.error(t('errorCreate'));
    }

    setCreatingList(false);
    setNewListName('');
    setShowCreateListForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{t('title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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

        {listsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {/* Create New List Section */}
            {showCreateListForm ? (
              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={t('listNamePlaceholder')}
                  className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-purple-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateListAndAdd();
                    if (e.key === 'Escape') setShowCreateListForm(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateListAndAdd}
                    disabled={creatingList}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {creatingList ? t('creating') : t('createAndAdd')}
                  </button>
                  <button
                    onClick={() => setShowCreateListForm(false)}
                    className="px-3 text-gray-400 hover:text-white text-sm"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateListForm(true)}
                className="w-full mb-4 p-3 border-2 border-dashed border-gray-600 hover:border-purple-500 rounded-lg text-gray-400 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t('createNewList')}
              </button>
            )}

            {/* Existing Lists */}
            {userLists.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  {t('existingLists')}
                </p>
                {userLists.map((list) => {
                  const isInList = list.items?.some((item) => item.contentId === contentId);
                  return (
                    <button
                      key={list.id}
                      onClick={() => handleAddToList(Number(list.id))}
                      disabled={addingToList === Number(list.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                        isInList
                          ? 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          {list.name}
                          {isInList && (
                            <span className="text-xs text-purple-400">{t('inList')}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {t('itemsCount', { count: list.itemCount })}
                        </p>
                      </div>
                      {addingToList === Number(list.id) ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : isInList ? (
                        <svg
                          className="w-5 h-5 text-purple-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              !showCreateListForm && (
                <p className="text-center text-gray-400 py-4">{t('noListsForType')}</p>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddToListModal;
