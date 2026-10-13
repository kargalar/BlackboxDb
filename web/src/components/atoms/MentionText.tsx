'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

interface MentionTextProps {
  text: string;
  className?: string;
  as?: 'div' | 'p' | 'span';
  mentionMode?: 'link' | 'action';
}

const MENTION_REGEX = /(^|\s)@([A-Za-z0-9_.-]+)/g;

export default function MentionText({
  text,
  className = '',
  as = 'span',
  mentionMode = 'link',
}: MentionTextProps) {
  const router = useRouter();
  const Component = as;
  const content: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_REGEX)) {
    const fullMatch = match[0];
    const prefix = match[1] ?? '';
    const username = match[2];
    const matchIndex = match.index ?? 0;
    const mentionStart = matchIndex + prefix.length;
    const mentionEnd = matchIndex + fullMatch.length;

    if (lastIndex < matchIndex) {
      content.push(text.slice(lastIndex, matchIndex));
    }

    if (prefix) {
      content.push(prefix);
    }

    const href = `/profile/${encodeURIComponent(username)}`;
    const mentionClassName =
      'font-bold text-violet-300 transition-colors hover:text-violet-200 hover:underline underline-offset-2';

    if (mentionMode === 'action') {
      const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        event.stopPropagation();
        router.push(href as any);
      };

      const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          router.push(href as any);
        }
      };

      content.push(
        <span
          key={`${username}-${mentionStart}`}
          role="link"
          tabIndex={0}
          data-mention-link="true"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={`${mentionClassName} cursor-pointer focus:outline-none focus:underline`}
        >
          @{username}
        </span>
      );
    } else {
      content.push(
        <Link
          key={`${username}-${mentionStart}`}
          href={href as any}
          data-mention-link="true"
          className={mentionClassName}
        >
          @{username}
        </Link>
      );
    }

    lastIndex = mentionEnd;
  }

  if (lastIndex < text.length) {
    content.push(text.slice(lastIndex));
  }

  return <Component className={className}>{content}</Component>;
}
