'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getMyLists, addToList, createList, UserList } from '@/services/graphql/list';
import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import toast from 'react-hot-toast';

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: string;
  contentTitle?: string;
}

const GET_CONTENT_TYPE_BY_SLUG = gql`
  query ContentTypeBySlug($slug: String!) {
    contentTypeBySlug(slug: $slug) {
      id
    }
  }
`;

export function AddToListModal({ isOpen, ...props }: AddToListModalProps) {
  if (!isOpen) return null;

  return <AddToListModalContent key={`${props.contentType}:${props.contentId}`} {...props} />;
}

function AddToListModalContent({
  onClose,
  contentId,
  contentType,
  contentTitle,
}: Omit<AddToListModalProps, 'isOpen'>) {
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [addingToList, setAddingToList] = useState<number | null>(null);
  const [showCreateListForm, setShowCreateListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [contentTypeId, setContentTypeId] = useState<number | null>(null);
  const loadRequestIdRef = useRef(0);
  const isMountedRef = useRef(false);

  const loadLists = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setListsLoading(true);
    setShowCreateListForm(false);
    setNewListName('');
    try {
      const [typeResult, listResult] = await Promise.all([
        apolloClient.query<{
          contentTypeBySlug: { id: number } | null;
        }>({
          query: GET_CONTENT_TYPE_BY_SLUG,
          variables: { slug: contentType },
          fetchPolicy: 'cache-first',
        }),
        getMyLists(),
      ]);

      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) return;

      const resolvedTypeId = typeResult.data?.contentTypeBySlug?.id;
      setContentTypeId(resolvedTypeId ?? null);
      if (listResult.error) {
        console.error('[AddToListModal] Failed to load lists:', listResult.error);
        toast.error('Listeler yüklenemedi. Lütfen tekrar deneyin.');
        setUserLists([]);
        return;
      }

      const filteredLists = resolvedTypeId
        ? (listResult.data || []).filter((list) => list.contentTypeId === resolvedTypeId)
        : [];
      setUserLists(filteredLists);
    } catch (error) {
      if (!isMountedRef.current || requestId !== loadRequestIdRef.current) return;
      console.error('[AddToListModal] Failed to load lists:', error);
      toast.error('Listeler yüklenemedi. Lütfen tekrar deneyin.');
      setContentTypeId(null);
      setUserLists([]);
    } finally {
      if (isMountedRef.current && requestId === loadRequestIdRef.current) {
        setListsLoading(false);
      }
    }
  }, [contentType]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadLists();

    return () => {
      isMountedRef.current = false;
      loadRequestIdRef.current += 1;
    };
  }, [loadLists]);

  // Toggle content in list (add if not exist, remove if exist)
  const handleAddToList = async (listId: number) => {
    if (addingToList !== null) return;

    const intListId = Number(listId);
    setAddingToList(intListId);
    try {
      const { data, error } = await addToList(intListId, contentId);
      if (!isMountedRef.current) return;

      if (error) {
        toast.error('İşlem başarısız.');
        return;
      }

      toast.success(data == null ? 'İçerik listeden çıkarıldı.' : 'İçerik listeye eklendi.');
      await loadLists();
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[AddToListModal] Failed to update list:', error);
      toast.error('İşlem başarısız.');
    } finally {
      if (isMountedRef.current) setAddingToList(null);
    }
  };

  // Create new list and add content immediately
  const handleCreateListAndAdd = async () => {
    if (!newListName.trim()) {
      toast.error('Liste adı gerekli.');
      return;
    }

    if (creatingList) return;

    setCreatingList(true);
    try {
      if (!contentTypeId) {
        toast.error('İçerik türü çözümlenemedi.');
        return;
      }

      const { data: newList, error: createError } = await createList(
        newListName.trim(),
        contentTypeId,
        undefined,
        false
      );
      if (!isMountedRef.current) return;
      if (createError || !newList) {
        toast.error('Liste oluşturulamadı.');
        return;
      }

      const { data: addResult, error: addError } = await addToList(Number(newList.id), contentId);
      if (!isMountedRef.current) return;

      if (addError || !addResult) {
        toast.error('Liste oluşturuldu fakat içerik eklenemedi.');
        await loadLists();
        return;
      }

      toast.success(`"${newListName.trim()}" listesi oluşturuldu ve içerik eklendi.`);
      onClose();
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('[AddToListModal] Failed to create list:', error);
      toast.error('Liste oluşturulamadı.');
    } finally {
      if (isMountedRef.current) {
        setCreatingList(false);
        setNewListName('');
        setShowCreateListForm(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Listeye Ekle</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={addingToList !== null || creatingList}
            className="text-gray-400 hover:text-white disabled:opacity-50"
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

        {contentTitle && (
          <p className="text-gray-400 text-sm mb-4">
            <span className="text-white font-medium">{contentTitle}</span> içeriğini hangi listeye
            eklemek istiyorsunuz?
          </p>
        )}

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
                  disabled={creatingList}
                  placeholder="Liste adı..."
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
                    disabled={creatingList || addingToList !== null}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {creatingList ? 'Oluşturuluyor...' : 'Oluştur ve Ekle'}
                  </button>
                  <button
                    onClick={() => setShowCreateListForm(false)}
                    disabled={creatingList}
                    className="px-3 text-gray-400 hover:text-white text-sm"
                  >
                    İptal
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
                Yeni Liste Oluştur
              </button>
            )}

            {/* Existing Lists */}
            {userLists.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Mevcut Listeler
                </p>
                {userLists.map((list) => {
                  const isInList = list.items?.some((item) => item.contentId === contentId);
                  return (
                    <button
                      key={list.id}
                      onClick={() => handleAddToList(Number(list.id))}
                      disabled={addingToList !== null || creatingList}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                        isInList
                          ? 'bg-purple-600/20 border border-purple-500/50 hover:bg-purple-600/30'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-white flex items-center gap-2">
                          {list.name}
                          {isInList && <span className="text-xs text-purple-400">(Listede)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{list.itemCount} içerik</p>
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
                <p className="text-center text-gray-400 py-4">
                  Bu içerik türü için henüz listeniz yok. Yukarıdan yeni bir liste
                  oluşturabilirsiniz.
                </p>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AddToListModal;
