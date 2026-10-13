'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import type { Route } from 'next';
import {
  CREATE_MEDIA_EVENT,
  GET_MEDIA_EVENTS,
  RECORD_EVENT_ATTENDANCE,
  REMOVE_EVENT_ATTENDANCE,
} from '@/services/graphql/media';
import { gql } from '@apollo/client';

const SET_MEDIA_EVENT_STATUS = gql`
  mutation SetMediaEventStatus($eventId: String!, $status: String!) {
    setMediaEventStatus(eventId: $eventId, status: $status) {
      id
      status
    }
  }
`;

export interface MediaEventItem {
  id: string;
  eventType: string;
  theaterProductionId?: string | null;
  title?: string | null;
  startsAt: string;
  timeZone: string;
  venueName: string;
  city: string;
  address?: string | null;
  status: string;
  rescheduledFromId?: string | null;
  theaterProduction?: { id: string; title: string; posterUrl?: string | null } | null;
  credits: Array<{
    personId?: string | null;
    displayName: string;
    name: string;
    role?: string | null;
    position: number;
  }>;
  attendanceCount: number;
  attendedByMe: boolean;
}

const blank = { title: '', startsAt: '', venueName: '', city: '', address: '', credits: '' };

export function MediaEventList({
  eventType,
  theaterProductionId,
  heading,
  searchable = false,
}: {
  eventType: 'THEATER_PERFORMANCE' | 'CONCERT';
  theaterProductionId?: string;
  heading: string;
  searchable?: boolean;
}) {
  const { user } = useAuth();
  const canManage = !!(user?.isAdmin || user?.isModerator);
  const [cityInput, setCityInput] = useState('');
  const [city, setCity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [form, setForm] = useState(blank);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const variables = {
    eventType,
    city: city || undefined,
    theaterProductionId,
    from: fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined,
    to: toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined,
    limit: 50,
    offset: 0,
  };
  const { data, loading, error, refetch } = useQuery<{ mediaEvents: MediaEventItem[] }>(
    GET_MEDIA_EVENTS,
    {
      variables,
    }
  );
  const events = data?.mediaEvents || [];
  const [createEvent, { loading: creating }] = useMutation(CREATE_MEDIA_EVENT, {
    onCompleted: () => refetch(),
  });
  const [markAttendance] = useMutation(RECORD_EVENT_ATTENDANCE, { onCompleted: () => refetch() });
  const [removeAttendance] = useMutation(REMOVE_EVENT_ATTENDANCE, { onCompleted: () => refetch() });
  const [setStatus] = useMutation(SET_MEDIA_EVENT_STATUS, { onCompleted: () => refetch() });

  const submit = async () => {
    const credits = form.credits
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [displayName, personId, role] = line.split('|').map((part) => part.trim());
        return { displayName, ...(personId ? { personId } : {}), ...(role ? { role } : {}) };
      });
    try {
      await createEvent({
        variables: {
          eventType,
          startsAt: new Date(form.startsAt).toISOString(),
          timeZone: timezone,
          venueName: form.venueName,
          city: form.city,
          title: eventType === 'CONCERT' ? form.title : null,
          theaterProductionId,
          address: form.address || null,
          credits,
        },
      });
      setForm(blank);
      toast.success(eventType === 'CONCERT' ? 'Concert created' : 'Performance added');
    } catch (e: any) {
      toast.error(e.message || 'Could not save event');
    }
  };

  const toggleAttendance = async (item: MediaEventItem) => {
    try {
      await (item.attendedByMe
        ? removeAttendance({ variables: { eventId: item.id } })
        : markAttendance({ variables: { eventId: item.id } }));
      toast.success(item.attendedByMe ? 'Attendance removed' : 'Attendance recorded');
    } catch (e: any) {
      toast.error(e.message || 'Could not update attendance');
    }
  };

  const applyCitySearch = () => setCity(cityInput.trim());

  return (
    <section className="space-y-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{heading}</h2>
        {searchable && (
          <div className="flex flex-wrap gap-2">
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCitySearch()}
              placeholder="City"
              className="rounded bg-gray-800 px-3 py-2"
            />
            <input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded bg-gray-800 px-3 py-2"
            />
            <input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded bg-gray-800 px-3 py-2"
            />
            <button onClick={applyCitySearch} className="rounded bg-gray-700 px-3 py-2">
              Search
            </button>
          </div>
        )}
      </div>

      {canManage && (
        <div className="grid gap-3 rounded-lg bg-black/20 p-4 sm:grid-cols-2">
          {eventType === 'CONCERT' && (
            <input
              className="rounded bg-gray-800 p-2 sm:col-span-2"
              placeholder="Concert or event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
          <input
            type="datetime-local"
            className="rounded bg-gray-800 p-2"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
          />
          <input
            className="rounded bg-gray-800 p-2"
            placeholder="Venue name"
            value={form.venueName}
            onChange={(e) => setForm({ ...form, venueName: e.target.value })}
          />
          <input
            className="rounded bg-gray-800 p-2"
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            className="rounded bg-gray-800 p-2"
            placeholder="Address (optional)"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <textarea
            className="rounded bg-gray-800 p-2 sm:col-span-2"
            placeholder={'Line per credit: display name | person ID (optional) | role (optional)'}
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: e.target.value })}
          />
          <button
            disabled={
              creating ||
              !form.startsAt ||
              !form.venueName.trim() ||
              !form.city.trim() ||
              (eventType === 'CONCERT' && !form.title.trim())
            }
            onClick={submit}
            className="rounded bg-indigo-600 px-4 py-2 disabled:opacity-50 sm:col-span-2"
          >
            {eventType === 'CONCERT' ? 'Create concert' : 'Add performance'}
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-white/55">Loading events…</p>}
      {error && <p className="text-sm text-red-300">{error.message}</p>}
      {!loading && !events.length && <p className="text-sm text-white/55">No events found.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((item) => {
          const past = new Date(item.startsAt) <= new Date();
          return (
            <article key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    <Link className="hover:text-indigo-300" href={`/events/${item.id}` as Route}>
                      {item.title || item.theaterProduction?.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-white/65">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: item.timeZone,
                    }).format(new Date(item.startsAt))}
                  </p>
                  <p className="text-sm text-white/65">
                    {item.venueName} · {item.city}
                  </p>
                  {item.address && <p className="text-xs text-white/45">{item.address}</p>}
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs ${item.status === 'CANCELLED' ? 'bg-red-900 text-red-200' : item.status === 'POSTPONED' ? 'bg-amber-900 text-amber-100' : 'bg-white/10 text-white/70'}`}
                >
                  {item.status.toLowerCase()}
                </span>
              </div>
              {item.credits.length > 0 && (
                <p className="mt-2 text-sm text-white/65">
                  {item.credits
                    .map((credit) => `${credit.name}${credit.role ? ` (${credit.role})` : ''}`)
                    .join(', ')}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                <span className="text-xs text-white/50">{item.attendanceCount} attended</span>
                <div className="flex gap-2">
                  {user && past && item.status !== 'CANCELLED' && (
                    <button
                      onClick={() => toggleAttendance(item)}
                      className="rounded bg-emerald-800 px-3 py-1.5 text-sm"
                    >
                      {item.attendedByMe ? 'Undo attendance' : 'I attended'}
                    </button>
                  )}
                  {canManage && item.status !== 'CANCELLED' && (
                    <button
                      onClick={() =>
                        setStatus({ variables: { eventId: item.id, status: 'CANCELLED' } }).catch(
                          (e) => toast.error(e.message)
                        )
                      }
                      className="rounded bg-red-900/70 px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
