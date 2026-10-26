'use client';
import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useQuery } from '@apollo/client/react';
import { SEARCH_USERS } from '@/services/graphql/listQueries';
import { removeTagFromAllLogs } from '@/services/userContentService';

interface UserSearchResult {
  id: string;
  username: string;
  picturePath?: string;
  isCustom?: boolean;
}

interface UserSearchInputProps {
  selectedUsers: UserSearchResult[];
  onUserAdd: (user: UserSearchResult) => void;
  onUserRemove: (userId: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  previousTaggedUsers?: UserSearchResult[];
  onGlobalDelete?: () => void;
}

const HIDDEN_CUSTOM_USERS_STORAGE_KEY = 'bb_hidden_custom_users';

function getHiddenCustomUsers(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(HIDDEN_CUSTOM_USERS_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((username): username is string => typeof username === 'string')
      : [];
  } catch {
    return [];
  }
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({
  selectedUsers,
  onUserAdd,
  onUserRemove,
  placeholder = 'Kullanıcı ara (@kullanıcıadı)...',
  allowCustom = true, // Varsayılan olarak özel etiket eklemeye izin ver
  previousTaggedUsers = [],
  onGlobalDelete,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [hiddenUsers, setHiddenUsers] = useState<string[]>(getHiddenCustomUsers);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resultsId = useId();

  const { data, loading } = useQuery<{ searchUsers: UserSearchResult[] }>(SEARCH_USERS, {
    variables: { query: inputValue },
    skip: inputValue.trim().length <= 1,
    fetchPolicy: 'network-only',
  });

  const searchResults: UserSearchResult[] = (data?.searchUsers || []).filter(
    (u: UserSearchResult) =>
      !selectedUsers.some(
        (su) => su.id === u.id || su.username.toLowerCase() === u.username.toLowerCase()
      )
  );

  const trimmedInput = inputValue.trim();

  // Daha önce eklenenlerden input ile eşleşenler
  const matchingPrevious = useMemo(() => {
    if (trimmedInput.length === 0) return [];
    const query = trimmedInput.toLowerCase();
    return (previousTaggedUsers || []).filter(
      (u: UserSearchResult) =>
        !selectedUsers.some(
          (su) => su.id === u.id || su.username.toLowerCase() === u.username.toLowerCase()
        ) &&
        !hiddenUsers.includes(u.username) &&
        u.username.toLowerCase().includes(query)
    );
  }, [trimmedInput, previousTaggedUsers, selectedUsers, hiddenUsers]);

  // Arama dropdown için birleşik liste (Önce geçmiş eşleşmeler, sonra arama sonuçları)
  const combinedSuggestions = useMemo(() => {
    if (trimmedInput.length === 0) return [];
    const seen = new Set<string>();
    const list: UserSearchResult[] = [];

    matchingPrevious.forEach((u: UserSearchResult) => {
      const key = u.username.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(u);
      }
    });

    searchResults.forEach((u: UserSearchResult) => {
      const key = u.username.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(u);
      }
    });

    return list;
  }, [trimmedInput, matchingPrevious, searchResults]);

  // Textfield altında gösterilecek öneri chip'leri (seçilmemiş geçmiş kişiler)
  const suggestedUserChips = useMemo(() => {
    return (previousTaggedUsers || []).filter(
      (u: UserSearchResult) =>
        !selectedUsers.some(
          (su) => su.id === u.id || su.username.toLowerCase() === u.username.toLowerCase()
        ) && !hiddenUsers.includes(u.username)
    );
  }, [previousTaggedUsers, selectedUsers, hiddenUsers]);

  const showCustomOption =
    allowCustom &&
    trimmedInput.length > 0 &&
    !selectedUsers.some((u) => u.username.toLowerCase() === trimmedInput.toLowerCase()) &&
    !combinedSuggestions.some(
      (u: UserSearchResult) => u.username.toLowerCase() === trimmedInput.toLowerCase()
    );

  const shouldShowResults =
    showResults &&
    trimmedInput.length > 0 &&
    (combinedSuggestions.length > 0 || showCustomOption || loading);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHideUser = async (e: React.MouseEvent, user: UserSearchResult) => {
    e.stopPropagation();
    if (!user.isCustom || deletingUsername) return; // Yalnızca özel etiketler kalıcı silinebilir.

    if (
      !window.confirm(
        `"${user.username}" etiketini tüm geçmiş loglarınızdan tamamen silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    setDeletingUsername(user.username);

    try {
      const result = await removeTagFromAllLogs({ tag: `with:${user.username}` });
      if (!result.success) {
        console.error('Etiket tüm geçmiş loglardan silinemedi:', result.error);
        toast.error('Etiket geçmiş loglardan silinemedi. Lütfen tekrar deneyin.');
        return;
      }

      const newHidden = [...new Set([...hiddenUsers, user.username])];
      setHiddenUsers(newHidden);
      try {
        localStorage.setItem(HIDDEN_CUSTOM_USERS_STORAGE_KEY, JSON.stringify(newHidden));
      } catch (storageError) {
        console.error('Etiket gizleme tercihi kaydedilemedi:', storageError);
      }

      onGlobalDelete?.();
    } catch (err) {
      console.error('Etiket silinirken hata:', err);
      toast.error('Etiket silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setDeletingUsername(null);
    }
  };

  return (
    <div ref={wrapperRef} className="w-full relative">
      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="inline-flex flex-row items-center gap-1.5 bg-surface-raised border border-[#2d323b] rounded-full px-2.5 py-1"
            >
              {user.isCustom ? (
                <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[10px] font-bold">
                  #
                </div>
              ) : user.picturePath ? (
                <span className="relative block w-4 h-4 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={user.picturePath}
                    alt=""
                    fill
                    sizes="16px"
                    unoptimized
                    className="object-cover"
                  />
                </span>
              ) : (
                <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] text-white">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className={`text-xs ${user.isCustom ? 'text-violet-300' : 'text-neutral-300'}`}>
                {!user.isCustom && '@'}
                {user.username}
              </span>
              <button
                type="button"
                onClick={() => onUserRemove(user.id)}
                aria-label={`Etiketi kaldır: ${user.username}`}
                className="text-neutral-500 hover:text-red-400 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        type="text"
        value={inputValue}
        aria-label={placeholder}
        aria-controls={shouldShowResults ? resultsId : undefined}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowResults(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputValue.trim().length > 0 && allowCustom) {
            e.preventDefault();
            // Enter'a basınca özel etiket ekleme
            const exactMatch = combinedSuggestions.find(
              (u) => u.username.toLowerCase() === inputValue.trim().toLowerCase()
            );
            if (exactMatch) {
              onUserAdd(exactMatch);
              setInputValue('');
              setShowResults(false);
              return;
            }
            if (
              !exactMatch &&
              !selectedUsers.some(
                (u) => u.username.toLowerCase() === inputValue.trim().toLowerCase()
              )
            ) {
              const customId = `custom-${Date.now()}`;
              onUserAdd({ id: customId, username: inputValue.trim(), isCustom: true });
              setInputValue('');
              setShowResults(false);
            }
          }
        }}
        onFocus={() => setShowResults(true)}
        placeholder={placeholder}
        className="w-full bg-surface-raised border border-[#2d323b] rounded-lg px-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:bg-surface-hover transition-all duration-200"
      />

      {/* Dropdown */}
      {shouldShowResults && (
        <div
          id={resultsId}
          role="region"
          aria-label="Kullanıcı arama sonuçları"
          className="absolute z-50 w-full mt-1 bg-surface-raised border border-[#2d323b] rounded-lg shadow-xl overflow-hidden shadow-black/50"
        >
          {/* Header */}
          {inputValue.trim().length === 0 && previousTaggedUsers.length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-neutral-500 bg-neutral-900/50 border-b border-[#2d323b]">
              Daha Önce Birlikte Olanlar
            </div>
          )}

          {loading && inputValue.trim().length > 1 && combinedSuggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400">Aranıyor...</div>
          ) : combinedSuggestions.length > 0 || showCustomOption ? (
            <ul className="max-h-48 overflow-y-auto">
              {combinedSuggestions.map((user: UserSearchResult) => (
                <li
                  key={user.id}
                  className="group flex items-center border-b border-[#2d323b] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onUserAdd(user);
                      setInputValue('');
                      setShowResults(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                  >
                    {user.picturePath ? (
                      <span className="relative block w-6 h-6 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                        <Image
                          src={user.picturePath}
                          alt=""
                          fill
                          sizes="24px"
                          unoptimized
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span className="flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                        {user.isCustom ? '#' : user.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-sm font-medium text-neutral-200">
                      {user.isCustom ? '' : '@'}
                      {user.username}
                    </span>
                  </button>

                  {user.isCustom && (
                    <button
                      type="button"
                      onClick={(e) => handleHideUser(e, user)}
                      disabled={deletingUsername !== null}
                      title="Etiketi kalıcı olarak sil"
                      aria-label={`Etiketi kalıcı olarak sil: ${user.username}`}
                      className="mr-2 rounded p-1.5 text-[#ef4444] opacity-0 transition-all hover:bg-[#ef4444]/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 group-hover:opacity-100 disabled:cursor-wait disabled:opacity-50"
                    >
                      <svg
                        aria-hidden="true"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </li>
              ))}

              {showCustomOption && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const customId = `custom-${Date.now()}`;
                      onUserAdd({ id: customId, username: trimmedInput, isCustom: true });
                      setInputValue('');
                      setShowResults(false);
                    }}
                    className="flex w-full items-center gap-3 border-t border-[#2d323b] px-4 py-2 text-left text-violet-400 transition-colors hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
                  >
                    <span className="flex w-6 h-6 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold">
                      #
                    </span>
                    <span className="text-sm font-medium">
                      &quot;{trimmedInput}&quot; olarak ekle
                    </span>
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-neutral-400">Sonuç bulunamadı</div>
          )}
        </div>
      )}

      {/* Textfield Altında Gösterilen Öneri Chip'leri */}
      {suggestedUserChips.length > 0 && (
        <div className="mt-2.5">
          <span className="block text-xs text-neutral-400 font-medium mb-1.5">
            Önerilen Kişiler:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {suggestedUserChips.map((user: UserSearchResult) => (
              <button
                key={user.id}
                type="button"
                onClick={() => onUserAdd(user)}
                className="group inline-flex items-center gap-1.5 bg-surface-raised hover:bg-violet-950/40 border border-[#2d323b] hover:border-violet-500/40 rounded-full px-2.5 py-1 text-xs text-neutral-300 hover:text-violet-200 transition-all cursor-pointer"
                title={`"${user.username}" kişisini ekle`}
              >
                {user.picturePath ? (
                  <span className="relative block w-3.5 h-3.5 shrink-0 overflow-hidden rounded-full bg-neutral-700">
                    <Image
                      src={user.picturePath}
                      alt=""
                      fill
                      sizes="14px"
                      unoptimized
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[9px] font-bold">
                    {user.isCustom ? '#' : user.username.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>
                  {user.isCustom ? '' : '@'}
                  {user.username}
                </span>
                <span className="text-[10px] text-neutral-500 group-hover:text-violet-300 font-bold">
                  +
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
