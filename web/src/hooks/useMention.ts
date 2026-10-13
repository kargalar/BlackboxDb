import { useState, useEffect, useCallback } from 'react';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';

const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      picturePath
    }
  }
`;

export interface MentionUser {
  id: string;
  username: string;
  picturePath: string | null;
}

interface MentionRange {
  start: number;
  end: number;
}

function getMentionTrigger(
  text: string,
  caretPosition: number
): (MentionRange & { query: string }) | null {
  const beforeCaret = text.slice(0, caretPosition);
  const match = beforeCaret.match(/(^|\s)@([A-Za-z0-9_.-]*)$/);
  if (!match) return null;
  const query = match[2] ?? '';
  const start = beforeCaret.length - query.length - 1;
  const end = caretPosition;
  return { start, end, query };
}

const MENTION_REGEX = /@([A-Za-z0-9_.-]+)/g;

export function collectMentionedUserIds(text: string, selectedUsers: MentionUser[]): string[] {
  const usernamesInText = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    if (match[1]) usernamesInText.add(match[1].toLowerCase());
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const u of selectedUsers) {
    if (usernamesInText.has(u.username.toLowerCase()) && !seen.has(u.id)) {
      seen.add(u.id);
      ids.push(u.id);
    }
  }
  return ids;
}

export function useMention(currentUserId?: string) {
  const [mentionRange, setMentionRange] = useState<MentionRange | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionActive, setMentionActive] = useState(false);

  const closeMention = useCallback(() => {
    setMentionActive(false);
    setMentionRange(null);
    setMentionQuery('');
    setMentionResults([]);
    setMentionLoading(false);
  }, []);

  /** Textarea onChange içinde çağır */
  const onTextChange = useCallback(
    (text: string, caretPosition: number) => {
      const trigger = getMentionTrigger(text, caretPosition);
      if (!trigger) {
        closeMention();
        return;
      }
      setMentionActive(true);
      setMentionRange({ start: trigger.start, end: trigger.end });
      setMentionQuery(trigger.query);
    },
    [closeMention]
  );

  /** Dropdown'dan kullanıcı seçilince çağır */
  const selectUser = useCallback(
    (
      mentionedUser: MentionUser,
      currentText: string,
      setText: (t: string) => void,
      setSelectedUsers: React.Dispatch<React.SetStateAction<MentionUser[]>>
    ) => {
      if (!mentionRange) return;
      const replacement = `@${mentionedUser.username} `;
      const nextText =
        currentText.slice(0, mentionRange.start) +
        replacement +
        currentText.slice(mentionRange.end);
      setText(nextText);
      setSelectedUsers((prev) =>
        prev.some((u) => u.id === mentionedUser.id) ? prev : [...prev, mentionedUser]
      );
      closeMention();
    },
    [mentionRange, closeMention]
  );

  // Kullanıcı arama
  useEffect(() => {
    if (!mentionActive || mentionQuery.trim().length < 2) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setMentionLoading(true);
      try {
        const { data } = await apolloClient.query<{ searchUsers: MentionUser[] }>({
          query: SEARCH_USERS,
          variables: { query: mentionQuery.trim(), limit: 8 },
          fetchPolicy: 'network-only',
        });
        if (!cancelled) {
          setMentionResults((data?.searchUsers || []).filter((u) => u.id !== currentUserId));
        }
      } catch {
        if (!cancelled) setMentionResults([]);
      } finally {
        if (!cancelled) setMentionLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [mentionQuery, mentionActive, currentUserId]);

  return {
    mentionActive,
    mentionQuery,
    mentionResults,
    mentionLoading,
    onTextChange,
    selectUser,
    closeMention,
  };
}
