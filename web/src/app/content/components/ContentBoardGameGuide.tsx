import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { UnifiedContent } from '@/types/unified-content';

export function ContentBoardGameSummary({ content }: { content: UnifiedContent }) {
  const t = useTranslations('BoardGames');
  const { minPlayers, maxPlayers, runtime, expansionParentId } = content;
  let players = null;

  if (minPlayers && maxPlayers) {
    players =
      minPlayers === maxPlayers
        ? t('playerCount', { count: minPlayers })
        : t('playerRange', { min: minPlayers, max: maxPlayers });
  } else if (minPlayers) {
    players = t('atLeastPlayers', { count: minPlayers });
  } else if (maxPlayers) {
    players = t('upToPlayers', { count: maxPlayers });
  }

  if (!players && !runtime && !expansionParentId) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
      {players && (
        <span className="inline-flex items-center gap-1.5">
          <Users size={16} aria-hidden="true" />
          {players}
        </span>
      )}
      {runtime ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock size={16} aria-hidden="true" />
          {t('minutes', { count: runtime })}
        </span>
      ) : null}
      {expansionParentId && (
        <Link
          href={`/content/board-game/${expansionParentId}`}
          className="text-violet-200 hover:underline"
        >
          {t('parentGame')}
        </Link>
      )}
    </div>
  );
}

export function ContentBoardGameGuide({ content }: { content: UnifiedContent }) {
  const t = useTranslations('BoardGames');
  return (
    <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
      {content.howToPlay?.trim() || t('noInstructions')}
    </p>
  );
}
