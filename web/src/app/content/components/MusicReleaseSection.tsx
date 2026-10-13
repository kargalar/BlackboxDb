'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useMutation, useQuery } from '@apollo/client/react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { GET_MUSIC_RELEASE_DETAILS, SAVE_MUSIC_RELEASE_DETAILS } from '@/services/graphql/media';

type TrackEntry = {
  trackContentId: string;
  title: string;
  discNumber: number;
  trackNumber: number;
  spotifyUrl?: string | null;
  durationMinutes?: number | null;
};
type Release = {
  contentId: string;
  releaseType: 'ALBUM' | 'SINGLE' | 'TRACK' | null;
  tracks: TrackEntry[];
};

type MusicTrackInput = {
  trackContentId: string;
  discNumber: number;
  trackNumber: number;
};

type ReleaseDraft = {
  contentId: string;
  releaseType: 'ALBUM' | 'SINGLE' | 'TRACK';
  trackRows: string;
};

function serializeTrackRows(tracks: TrackEntry[]): string {
  return tracks
    .map((track) => `${track.trackContentId}|${track.discNumber}|${track.trackNumber}`)
    .join('\n');
}

function parseTrackRows(rows: string): { tracks: MusicTrackInput[]; error: string | null } {
  const tracks: MusicTrackInput[] = [];
  const usedPositions = new Set<string>();

  for (const [index, row] of rows.split(/\r?\n/).entries()) {
    const value = row.trim();
    if (!value) continue;

    const fields = value.split('|').map((field) => field.trim());
    const lineNumber = index + 1;
    if (fields.length !== 3 || !fields[0]) {
      return {
        tracks: [],
        error: `Line ${lineNumber}: use content ID | disc number | track number.`,
      };
    }

    const [trackContentId, discValue, trackValue] = fields;
    const discNumber = discValue ? Number(discValue) : 1;
    const trackNumber = Number(trackValue);
    if (
      (discValue && !/^\d+$/.test(discValue)) ||
      !Number.isSafeInteger(discNumber) ||
      discNumber < 1 ||
      !/^\d+$/.test(trackValue) ||
      !Number.isSafeInteger(trackNumber) ||
      trackNumber < 1
    ) {
      return {
        tracks: [],
        error: `Line ${lineNumber}: disc and track numbers must be positive whole numbers.`,
      };
    }

    const position = `${discNumber}:${trackNumber}`;
    if (usedPositions.has(position)) {
      return {
        tracks: [],
        error: `Line ${lineNumber}: disc ${discNumber}, track ${trackNumber} is listed more than once.`,
      };
    }

    usedPositions.add(position);
    tracks.push({ trackContentId, discNumber, trackNumber });
  }

  return { tracks, error: null };
}

export function MusicReleaseSection({ contentId }: { contentId: string }) {
  const { user } = useAuth();
  const canManage = !!(user?.isAdmin || user?.isModerator);
  const [draft, setDraft] = useState<ReleaseDraft | null>(null);
  const { data, loading, error, refetch } = useQuery<{ musicReleaseDetails: Release | null }>(
    GET_MUSIC_RELEASE_DETAILS,
    { variables: { contentId } }
  );
  const [saveDetails, { loading: saving }] = useMutation(SAVE_MUSIC_RELEASE_DETAILS);
  const queryRelease = data?.musicReleaseDetails;
  const release = queryRelease?.contentId === contentId ? queryRelease : null;
  const serverReleaseType = release?.releaseType || 'ALBUM';
  const serverTrackRows = serializeTrackRows(release?.tracks ?? []);
  const currentDraft = draft?.contentId === contentId ? draft : null;
  const releaseType = currentDraft?.releaseType ?? serverReleaseType;
  const trackRows = currentDraft?.trackRows ?? serverTrackRows;

  const updateDraft = (changes: Partial<Omit<ReleaseDraft, 'contentId'>>) => {
    setDraft((current) => ({
      contentId,
      releaseType: current?.contentId === contentId ? current.releaseType : serverReleaseType,
      trackRows: current?.contentId === contentId ? current.trackRows : serverTrackRows,
      ...changes,
    }));
  };

  const save = async () => {
    const parsedTracks =
      releaseType === 'TRACK' ? { tracks: [], error: null } : parseTrackRows(trackRows);
    if (parsedTracks.error) {
      toast.error(parsedTracks.error);
      return;
    }

    try {
      await saveDetails({
        variables: {
          contentId,
          releaseType,
          tracks: parsedTracks.tracks,
        },
      });
      toast.success('Music details saved');
      try {
        await refetch();
        setDraft((current) => (current?.contentId === contentId ? null : current));
      } catch (refreshError) {
        console.error('Could not refresh saved music details', refreshError);
      }
    } catch (saveError: any) {
      toast.error(saveError.message || 'Could not save music details');
    }
  };

  if (loading)
    return (
      <section className="rounded-xl bg-white/5 p-5 text-white/60">Loading music details…</section>
    );
  if (error)
    return <section className="rounded-xl bg-white/5 p-5 text-red-300">{error.message}</section>;

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-white">
      <h2 className="text-2xl font-semibold">Music release</h2>
      {release?.releaseType ? (
        <p className="text-sm text-white/60">
          {release.releaseType.toLowerCase()} · {release.tracks.length} linked tracks
        </p>
      ) : (
        <p className="text-sm text-white/55">Release type has not been classified yet.</p>
      )}
      {release && release.tracks.length > 0 && (
        <ol className="space-y-2">
          {release.tracks.map((track) => (
            <li
              key={`${track.discNumber}-${track.trackNumber}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-black/20 px-3 py-2"
            >
              <span className="text-sm text-white/55">
                {track.discNumber}.{track.trackNumber}
              </span>
              <Link
                className="flex-1 hover:text-indigo-300"
                href={`/content/music/${track.trackContentId}` as Route}
              >
                {track.title}
              </Link>
              {track.durationMinutes ? (
                <span className="text-xs text-white/45">{track.durationMinutes} min</span>
              ) : null}
              {track.spotifyUrl && (
                <a
                  className="text-xs text-emerald-300"
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Spotify
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
      {canManage && (
        <div className="space-y-3 rounded-lg bg-black/20 p-4">
          <label className="block text-sm">
            Release type
            <select
              value={releaseType}
              onChange={(event) =>
                updateDraft({ releaseType: event.target.value as ReleaseDraft['releaseType'] })
              }
              disabled={saving}
              className="mt-1 w-full rounded bg-gray-800 p-2"
            >
              <option value="ALBUM">Album</option>
              <option value="SINGLE">Single</option>
              <option value="TRACK">Track</option>
            </select>
          </label>
          {releaseType !== 'TRACK' && (
            <label className="block text-sm">
              Track rows: content ID | disc number | track number
              <textarea
                value={trackRows}
                onChange={(event) => updateDraft({ trackRows: event.target.value })}
                disabled={saving}
                rows={5}
                className="mt-1 w-full rounded bg-gray-800 p-2 font-mono"
                placeholder="track-content-id|1|1"
              />
            </label>
          )}
          <button
            disabled={saving}
            onClick={save}
            className="rounded bg-indigo-600 px-4 py-2 disabled:opacity-50"
          >
            Save music details
          </button>
        </div>
      )}
    </section>
  );
}
