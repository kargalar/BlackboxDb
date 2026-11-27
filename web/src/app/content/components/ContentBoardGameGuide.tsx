import Link from 'next/link';
import { ChevronDown, Clock, Dice5, ExternalLink, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { UnifiedContent } from '@/types/unified-content';

function getExternalUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

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
  const locale = useLocale();
  const publishers = (content.companies ?? []).flatMap(({ companyRoleId, company }) =>
    companyRoleId === 2 && company ? [company] : []
  );
  const languages = (content.languages ?? [])
    .map((language) => (typeof language === 'string' ? language : language.language?.name))
    .filter((name): name is string => Boolean(name));
  const productUrl = getExternalUrl(content.infoLink);
  const rulesUrl = getExternalUrl(content.previewLink);

  return (
    <details id="how-to-play" className="group/guide glass-card mb-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 [&::-webkit-details-marker]:hidden">
        <Dice5 className="h-5 w-5 text-violet-300" aria-hidden="true" />
        {t('howToPlay')}
        <ChevronDown
          className="ml-auto h-4 w-4 text-white/65 group-open/guide:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-4 border-t border-white/10 px-4 py-4">
        <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">
          {content.howToPlay?.trim() || t('noInstructions')}
        </p>
        {(publishers.length > 0 || languages.length > 0) && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {publishers.length > 0 && (
              <div>
                <dt className="font-medium text-white">{t('publishers')}</dt>
                <dd className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-violet-200">
                  {publishers.map((company) => (
                    <Link
                      key={company.id}
                      href={`/company/${company.id}`}
                      className="hover:underline"
                    >
                      {company.name}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
            {languages.length > 0 && (
              <div>
                <dt className="font-medium text-white">{t('supportedLanguages')}</dt>
                <dd className="mt-1 text-white/75">
                  {new Intl.ListFormat(locale).format(languages)}
                </dd>
              </div>
            )}
          </dl>
        )}
        {(productUrl || rulesUrl) && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {productUrl && (
              <a
                href={productUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-violet-200 hover:underline"
              >
                {t('productSource')} <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            {rulesUrl && rulesUrl !== productUrl && (
              <a
                href={rulesUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-violet-200 hover:underline"
              >
                {t('rulebook')} <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
