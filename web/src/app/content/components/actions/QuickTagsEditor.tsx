'use client';
import React, { useMemo, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormTagsInput } from '@/components/atoms/FormTagsInput';
import { UserSearchInput } from '@/components/molecules/UserSearchInput';
import {
  getRecentTaggedUsers,
  getRecentTags,
  rememberTaggedUsers,
  rememberTags,
  type TaggedUserSuggestion,
} from '@/lib/log-suggestions';

const WITH_PREFIX = 'with:';

interface QuickTagsEditorProps {
  userTags: string[];
  userTaggedUsers: TaggedUserSuggestion[];
  onSave: (tags: string[], taggedUserIds: string[]) => Promise<void>;
}

const buildCustomUsers = (tags: string[]): TaggedUserSuggestion[] =>
  tags
    .filter((tag) => tag.startsWith(WITH_PREFIX))
    .map((tag) => ({
      id: `custom-${tag.substring(WITH_PREFIX.length)}`,
      username: tag.substring(WITH_PREFIX.length),
      isCustom: true,
    }));

const QuickTagsEditor: React.FC<QuickTagsEditorProps> = ({ userTags, userTaggedUsers, onSave }) => {
  const t = useTranslations('AddLogDialog');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>(getRecentTags);
  const [previousUsers, setPreviousUsers] = useState<TaggedUserSuggestion[]>(getRecentTaggedUsers);

  const plainTags = useMemo(() => userTags.filter((tag) => !tag.startsWith(WITH_PREFIX)), [userTags]);
  const selectedUsers = useMemo(
    () => [
      ...userTaggedUsers.filter((user) => typeof user === 'object' && user.id && user.username),
      ...buildCustomUsers(userTags),
    ],
    [userTags, userTaggedUsers]
  );

  const persist = async (tags: string[], users: TaggedUserSuggestion[]): Promise<void> => {
    const customTags = users.filter((user) => user.isCustom).map((user) => `${WITH_PREFIX}${user.username.trim()}`);
    const registeredIds = users.filter((user) => !user.isCustom).map((user) => user.id);
    await onSave(Array.from(new Set([...tags, ...customTags])), registeredIds);
  };

  const handleTagsChange = (value: string): void => {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    setSuggestedTags(rememberTags(tags));
    void persist(tags, selectedUsers);
  };

  const handleUserAdd = (user: TaggedUserSuggestion): void => {
    setPreviousUsers(rememberTaggedUsers([user]));
    void persist(plainTags, [...selectedUsers, user]);
  };

  const handleUserRemove = (userId: string): void => {
    void persist(
      plainTags,
      selectedUsers.filter((user) => user.id !== userId)
    );
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex items-center gap-1.5 self-start text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        {isOpen ? <X size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
        {t('tags')} / {t('withWho')}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/30 p-3">
          <FormTagsInput
            label={t('tags')}
            name="quick-tags"
            value={plainTags.join(', ')}
            onChange={handleTagsChange}
            placeholder={t('tagsPlaceholder')}
            suggestedTags={suggestedTags}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-400">{t('withWho')}</label>
            <UserSearchInput
              selectedUsers={selectedUsers}
              previousTaggedUsers={previousUsers}
              allowCustom={true}
              onUserAdd={handleUserAdd}
              onUserRemove={handleUserRemove}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickTagsEditor;

