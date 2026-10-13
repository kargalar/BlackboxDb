'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apolloClient } from '@/lib/apollo-client';
import {
  GET_PODCAST_PROGRAM,
  SAVE_PODCAST_PROGRAM,
  SAVE_PODCAST_EPISODE,
  RECORD_PODCAST_LISTEN,
} from '@/services/graphql/media';
import { gql } from '@apollo/client';

const DELETE_PODCAST_LISTEN = gql`
  mutation DeletePodcastListen($listenId: Int!) {
    deletePodcastListen(listenId: $listenId)
  }
`;

type Episode = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
  audioUrl?: string | null;
  listenCount: number;
  myListenCount: number;
  recentListens: Array<{
    id: number;
    listenedAt: string;
    secondsListened?: number | null;
    completed: boolean;
  }>;
};

type Program = {
  id: string;
  contentId: string;
  title: string;
  publicationStatus: string;
  languageCode?: string | null;
  releaseFrequency?: string | null;
  releaseInterval?: number | null;
  releaseWeekdays: number[];
  credits: Array<{ personId: string; name: string; role: string }>;
  episodes: Episode[];
};

type ProgramDraft = {
  programId: string | null;
  status: string;
  languageCode: string;
  releaseFrequency: string;
  releaseInterval: string;
  releaseWeekdays: string;
  hostPersonIds: string;
};

function createProgramDraft(program?: Program | null): ProgramDraft {
  return {
    programId: program?.id ?? null,
    status: program?.publicationStatus ?? 'ongoing',
    languageCode: program?.languageCode ?? '',
    releaseFrequency: program?.releaseFrequency ?? '',
    releaseInterval: program?.releaseInterval?.toString() ?? '',
    releaseWeekdays: program?.releaseWeekdays.join(',') ?? '',
    hostPersonIds: program?.credits.map((credit) => credit.personId).join(', ') ?? '',
  };
}

const emptyEpisode = {
  title: '',
  seasonNumber: '1',
  episodeNumber: '1',
  description: '',
  publishedAt: '',
  durationSeconds: '',
  audioUrl: '',
  externalGuid: '',
  guestPersonIds: '',
};

export function PodcastProgramSection({ contentId }: { contentId: string }) {
  const { user } = useAuth();
  const canManage = !!(user?.isAdmin || user?.isModerator);
  const { data, loading, error, refetch } = useQuery<{ podcastProgram: Program | null }>(
    GET_PODCAST_PROGRAM,
    { variables: { contentId } }
  );
  const program = data?.podcastProgram;
  const [programDraft, setProgramDraft] = useState(() => createProgramDraft(program));
  const [episode, setEpisode] = useState(emptyEpisode);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | undefined>();

  if (program && programDraft.programId !== program.id) {
    setProgramDraft(createProgramDraft(program));
  }

  const updateProgramDraft = (field: keyof ProgramDraft, value: string) => {
    setProgramDraft((current) => ({ ...current, [field]: value }));
  };

  const [saveProgram, { loading: savingProgram }] = useMutation(SAVE_PODCAST_PROGRAM, {
    onCompleted: () => refetch(),
  });
  const [saveEpisode, { loading: savingEpisode }] = useMutation(SAVE_PODCAST_EPISODE, {
    onCompleted: () => {
      setEpisode(emptyEpisode);
      setEditingEpisodeId(undefined);
      refetch();
    },
  });
  const [recordListen] = useMutation(RECORD_PODCAST_LISTEN, { onCompleted: () => refetch() });
  const [deleteListen] = useMutation(DELETE_PODCAST_LISTEN, { onCompleted: () => refetch() });

  const submitProgram = async () => {
    try {
      await saveProgram({
        variables: {
          contentId,
          publicationStatus: programDraft.status,
          languageCode: programDraft.languageCode || null,
          releaseFrequency: programDraft.releaseFrequency || null,
          releaseInterval: programDraft.releaseInterval
            ? Number(programDraft.releaseInterval)
            : null,
          releaseWeekdays: programDraft.releaseWeekdays
            ? programDraft.releaseWeekdays
                .split(',')
                .map((day) => Number(day.trim()))
                .filter(Number.isInteger)
            : [],
          hostPersonIds: programDraft.hostPersonIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        },
      });
      toast.success('Podcast program saved');
    } catch (e: any) {
      toast.error(e.message || 'Could not save podcast program');
    }
  };

  const submitEpisode = async () => {
    if (!program) return;
    try {
      await saveEpisode({
        variables: {
          programId: program.id,
          episodeId: editingEpisodeId,
          title: episode.title,
          seasonNumber: Number(episode.seasonNumber),
          episodeNumber: Number(episode.episodeNumber),
          description: episode.description || null,
          publishedAt: episode.publishedAt ? new Date(episode.publishedAt).toISOString() : null,
          durationSeconds: episode.durationSeconds ? Number(episode.durationSeconds) : null,
          audioUrl: episode.audioUrl || null,
          externalGuid: episode.externalGuid || null,
          isExplicit: null,
          guestPersonIds: episode.guestPersonIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        },
      });
      toast.success(editingEpisodeId ? 'Episode updated' : 'Episode added');
    } catch (e: any) {
      toast.error(e.message || 'Could not save episode');
    }
  };

  const repeatListen = async (episodeId: string) => {
    try {
      await recordListen({ variables: { episodeId, completed: true } });
      toast.success('Listen recorded');
    } catch (e: any) {
      toast.error(e.message || 'Could not record listen');
    }
  };

  const editEpisode = (item: Episode) => {
    setEditingEpisodeId(item.id);
    setEpisode({
      title: item.title,
      seasonNumber: String(item.seasonNumber),
      episodeNumber: String(item.episodeNumber),
      description: item.description || '',
      publishedAt: item.publishedAt ? item.publishedAt.slice(0, 16) : '',
      durationSeconds: item.durationSeconds ? String(item.durationSeconds) : '',
      audioUrl: item.audioUrl || '',
      externalGuid: '',
      guestPersonIds: '',
    });
  };

  if (loading)
    return <section className="rounded-xl bg-white/5 p-5 text-white/60">Loading podcast…</section>;
  if (error)
    return <section className="rounded-xl bg-white/5 p-5 text-red-300">{error.message}</section>;

  return (
    <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-white">
      <div>
        <h2 className="text-2xl font-semibold">Podcast program</h2>
        {program?.credits.length ? (
          <p className="mt-1 text-sm text-white/60">
            Hosts: {program.credits.map((credit) => credit.name).join(', ')}
          </p>
        ) : null}
      </div>
      {canManage && (
        <div className="grid gap-3 rounded-lg bg-black/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            Publication status
            <select
              className="mt-1 w-full rounded bg-gray-800 p-2"
              value={programDraft.status}
              onChange={(e) => updateProgramDraft('status', e.target.value)}
            >
              <option value="ongoing">Ongoing</option>
              <option value="hiatus">On hiatus</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="text-sm">
            Language code
            <input
              className="mt-1 w-full rounded bg-gray-800 p-2"
              value={programDraft.languageCode}
              onChange={(e) => updateProgramDraft('languageCode', e.target.value)}
              placeholder="en, tr..."
            />
          </label>
          <label className="text-sm">
            Release frequency
            <input
              className="mt-1 w-full rounded bg-gray-800 p-2"
              value={programDraft.releaseFrequency}
              onChange={(e) => updateProgramDraft('releaseFrequency', e.target.value)}
              placeholder="weekly, monthly..."
            />
          </label>
          <label className="text-sm">
            Every N intervals
            <input
              type="number"
              min="1"
              className="mt-1 w-full rounded bg-gray-800 p-2"
              value={programDraft.releaseInterval}
              onChange={(e) => updateProgramDraft('releaseInterval', e.target.value)}
            />
          </label>
          <label className="text-sm">
            Weekdays (0 Sunday – 6 Saturday)
            <input
              className="mt-1 w-full rounded bg-gray-800 p-2"
              value={programDraft.releaseWeekdays}
              onChange={(e) => updateProgramDraft('releaseWeekdays', e.target.value)}
              placeholder="1, 4"
            />
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-3">
            Host person IDs
            <input
              className="mt-1 w-full rounded bg-gray-800 p-2"
              value={programDraft.hostPersonIds}
              onChange={(e) => updateProgramDraft('hostPersonIds', e.target.value)}
              placeholder="Comma separated person IDs"
            />
          </label>
          <button
            disabled={savingProgram}
            onClick={submitProgram}
            className="rounded bg-indigo-600 px-4 py-2 font-medium disabled:opacity-50 sm:col-span-2 lg:col-span-3"
          >
            {program ? 'Save program' : 'Create program details'}
          </button>
        </div>
      )}

      {canManage && program && (
        <div className="grid gap-3 rounded-lg bg-black/20 p-4 sm:grid-cols-2">
          <h3 className="font-medium sm:col-span-2">
            {editingEpisodeId ? 'Edit episode' : 'Add episode'}
          </h3>
          <input
            className="rounded bg-gray-800 p-2"
            placeholder="Episode title"
            value={episode.title}
            onChange={(e) => setEpisode({ ...episode, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              aria-label="Season number"
              className="rounded bg-gray-800 p-2"
              value={episode.seasonNumber}
              onChange={(e) => setEpisode({ ...episode, seasonNumber: e.target.value })}
            />
            <input
              type="number"
              min="1"
              aria-label="Episode number"
              className="rounded bg-gray-800 p-2"
              value={episode.episodeNumber}
              onChange={(e) => setEpisode({ ...episode, episodeNumber: e.target.value })}
            />
          </div>
          <textarea
            className="rounded bg-gray-800 p-2 sm:col-span-2"
            placeholder="Description"
            value={episode.description}
            onChange={(e) => setEpisode({ ...episode, description: e.target.value })}
          />
          <input
            type="datetime-local"
            className="rounded bg-gray-800 p-2"
            value={episode.publishedAt}
            onChange={(e) => setEpisode({ ...episode, publishedAt: e.target.value })}
          />
          <input
            type="number"
            min="1"
            className="rounded bg-gray-800 p-2"
            placeholder="Duration (seconds)"
            value={episode.durationSeconds}
            onChange={(e) => setEpisode({ ...episode, durationSeconds: e.target.value })}
          />
          <input
            type="url"
            className="rounded bg-gray-800 p-2"
            placeholder="Audio URL"
            value={episode.audioUrl}
            onChange={(e) => setEpisode({ ...episode, audioUrl: e.target.value })}
          />
          <input
            className="rounded bg-gray-800 p-2"
            placeholder="External episode GUID"
            value={episode.externalGuid}
            onChange={(e) => setEpisode({ ...episode, externalGuid: e.target.value })}
          />
          <input
            className="rounded bg-gray-800 p-2 sm:col-span-2"
            placeholder="Guest person IDs, comma separated"
            value={episode.guestPersonIds}
            onChange={(e) => setEpisode({ ...episode, guestPersonIds: e.target.value })}
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={savingEpisode || !episode.title.trim()}
              onClick={submitEpisode}
              className="rounded bg-indigo-600 px-4 py-2 disabled:opacity-50"
            >
              {editingEpisodeId ? 'Save episode' : 'Add episode'}
            </button>
            {editingEpisodeId && (
              <button
                onClick={() => {
                  setEditingEpisodeId(undefined);
                  setEpisode(emptyEpisode);
                }}
                className="rounded bg-gray-700 px-4 py-2"
              >
                Cancel edit
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!program && (
          <p className="text-sm text-white/55">Program details have not been added yet.</p>
        )}
        {program?.episodes.map((item) => (
          <article key={item.id} className="rounded-lg border border-white/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  S{item.seasonNumber} · E{item.episodeNumber} — {item.title}
                </h3>
                <p className="mt-1 text-xs text-white/50">
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleDateString()
                    : 'Release date not set'}{' '}
                  · {item.listenCount} listens · {item.myListenCount} by you
                </p>
                {item.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                    {item.description}
                  </p>
                )}
                {item.audioUrl && (
                  <a
                    className="mt-2 inline-block text-sm text-indigo-300 underline"
                    href={item.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Listen externally
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                {user && (
                  <button
                    onClick={() => repeatListen(item.id)}
                    className="rounded bg-emerald-700 px-3 py-2 text-sm"
                  >
                    Log listen
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => editEpisode(item)}
                    className="rounded bg-gray-700 px-3 py-2 text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            {item.recentListens.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-white/10 pt-2 text-xs text-white/55">
                {item.recentListens.map((listen) => (
                  <li key={listen.id} className="flex items-center justify-between">
                    {new Date(listen.listenedAt).toLocaleString()} ·{' '}
                    {listen.completed
                      ? 'completed'
                      : `partial${listen.secondsListened ? ` · ${listen.secondsListened}s` : ''}`}
                    <button
                      onClick={() =>
                        deleteListen({ variables: { listenId: listen.id } }).catch((e) =>
                          toast.error(e.message)
                        )
                      }
                      className="text-red-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
