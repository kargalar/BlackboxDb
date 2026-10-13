'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useParams } from 'next/navigation';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  GET_MEDIA_EVENT,
  RECORD_EVENT_ATTENDANCE,
  REMOVE_EVENT_ATTENDANCE,
  RESCHEDULE_MEDIA_EVENT,
} from '@/services/graphql/media';

const SET_STATUS = gql`
  mutation SetMediaEventStatus($eventId: String!, $status: String!) {
    setMediaEventStatus(eventId: $eventId, status: $status) {
      id
      status
    }
  }
`;

export default function MediaEventPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = !!(user?.isAdmin || user?.isModerator);
  const [newDate, setNewDate] = useState('');
  const { data, loading, error, refetch } = useQuery<{ mediaEvent: any | null }>(GET_MEDIA_EVENT, {
    variables: { id },
  });
  const event = data?.mediaEvent;
  const [attend] = useMutation(RECORD_EVENT_ATTENDANCE, { onCompleted: () => refetch() });
  const [removeAttendance] = useMutation(REMOVE_EVENT_ATTENDANCE, { onCompleted: () => refetch() });
  const [setStatus] = useMutation(SET_STATUS, { onCompleted: () => refetch() });
  const [reschedule, { loading: rescheduling }] = useMutation(RESCHEDULE_MEDIA_EVENT, {
    onCompleted: () => {
      setNewDate('');
      refetch();
    },
  });
  if (loading) return <div className="min-h-screen bg-black p-8 text-white/60">Loading event…</div>;
  if (error || !event)
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <p>Event not found.</p>
        <Link className="mt-4 inline-block text-indigo-300" href={'/concerts' as Route}>
          Back to concerts
        </Link>
      </div>
    );
  const past = new Date(event.startsAt) <= new Date();
  const title = event.eventType === 'CONCERT' ? event.title : event.theaterProduction?.title;
  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <Link
          href={
            (event.eventType === 'CONCERT'
              ? '/concerts'
              : `/content/theater/${event.theaterProductionId}`) as Route
          }
          className="text-sm text-indigo-300"
        >
          ← {event.eventType === 'CONCERT' ? 'Concert calendar' : 'Theater production'}
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-indigo-300">
              {event.eventType === 'CONCERT' ? 'Concert' : 'Theater performance'}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          </div>
          <span className="rounded bg-white/10 px-3 py-1 text-sm">
            {event.status.toLowerCase()}
          </span>
        </div>
        <p className="mt-6 text-lg">
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: event.timeZone,
          }).format(new Date(event.startsAt))}
        </p>
        <p className="mt-2 text-white/75">
          {event.venueName} · {event.city}
        </p>
        {event.address && <p className="text-sm text-white/50">{event.address}</p>}
        {event.credits?.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold">Lineup</h2>
            <ul className="mt-2 space-y-1 text-white/70">
              {event.credits.map((credit: any, index: number) => (
                <li key={`${credit.personId || credit.displayName}-${index}`}>
                  {credit.name}
                  {credit.role ? ` · ${credit.role}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <span className="text-sm text-white/55">{event.attendanceCount} people attended</span>
          {user && past && event.status !== 'CANCELLED' && (
            <button
              onClick={() =>
                (event.attendedByMe
                  ? removeAttendance({ variables: { eventId: id } })
                  : attend({ variables: { eventId: id } })
                ).catch((e) => toast.error(e.message))
              }
              className="rounded bg-emerald-800 px-4 py-2"
            >
              {event.attendedByMe ? 'Undo attendance' : 'I attended'}
            </button>
          )}
        </div>
        {canManage && event.status !== 'CANCELLED' && (
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
            <button
              onClick={() =>
                setStatus({ variables: { eventId: id, status: 'CANCELLED' } }).catch((e) =>
                  toast.error(e.message)
                )
              }
              className="rounded bg-red-900 px-4 py-2"
            >
              Cancel event
            </button>
            {event.status !== 'COMPLETED' && (
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Replacement date and time"
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="rounded bg-gray-800 px-3 py-2"
                />
                <button
                  disabled={!newDate || rescheduling}
                  onClick={() =>
                    reschedule({
                      variables: { eventId: id, startsAt: new Date(newDate).toISOString() },
                    }).catch((e) => toast.error(e.message))
                  }
                  className="rounded bg-amber-700 px-4 py-2 disabled:opacity-50"
                >
                  Reschedule
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
