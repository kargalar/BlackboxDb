'use client';

import { useQuery } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';
import { ReleaseRegionFlag, useReleaseRegionLabel } from '@/components/atoms/ReleaseRegionFlag';
import { type ContentRelease, formatReleaseDate, releaseKey } from '@/lib/contentReleases';
import { GET_CONTENT_RELEASES } from '@/services/graphql/contentReleases';

export function ContentReleaseTab({ contentId }: { contentId: string }) {
  const t = useTranslations('ContentReleases');
  const locale = useLocale();
  const regionName = useReleaseRegionLabel();
  const { data, loading, error } = useQuery<{ contentReleases: ContentRelease[] }>(
    GET_CONTENT_RELEASES,
    { variables: { id: contentId }, fetchPolicy: 'cache-and-network' }
  );
  const releases = data?.contentReleases ?? [];

  if (releases.length === 0) {
    return (
      <p role="status" className="py-2 text-sm text-white/65">
        {loading ? t('loading') : error ? t('loadFailed') : t('empty')}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.75rem),1fr))] gap-2">
      {releases.map((release) => (
        <li
          key={releaseKey(release)}
          className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 p-2 text-sm font-medium text-white"
        >
          <ReleaseRegionFlag code={release.regionCode} label={regionName(release.regionCode)} />
          <time dateTime={release.date.includes('-Q') ? undefined : release.date} className="tabular-nums">
            {formatReleaseDate(release.date, locale, (year, quarter) => t('quarter', { year, quarter }))}
          </time>
        </li>
      ))}
    </ul>
  );
}
