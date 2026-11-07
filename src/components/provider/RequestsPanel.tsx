'use client';

import React, { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useLoad } from '@/lib/use-load';
import { isSameTunisDay } from '@/lib/time';
import type { Booking } from '@/types';
import BookingListItem from '@/components/BookingListItem';
import { EmptyState, ErrorState, Notice, Spinner, dangerButton, primaryButton } from '@/components/ui';

const small = 'px-3 py-1.5 text-xs';

/** Pending requests with quick accept/decline, today's jobs, and upcoming confirmed jobs. */
export default function RequestsPanel() {
  const { data, setData, error, loading, reload } = useLoad(() => api<Booking[]>('/api/bookings'), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (booking: Booking, action: 'ACCEPT' | 'REJECT') => {
    if (action === 'REJECT' && !window.confirm(`Decline the request from ${booking.client.name}?`)) return;
    setBusyId(booking.id);
    setActionError(null);
    try {
      const updated = await api<Booking>(`/api/bookings/${booking.id}`, { method: 'PATCH', body: { action } });
      setData((list) => list?.map((b) => (b.id === updated.id ? updated : b)) ?? null);
    } catch (err) {
      setActionError(errorMessage(err));
      void reload();
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <Spinner label="Loading requests..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const now = new Date();
  const all = data ?? [];
  const pending = all.filter((b) => b.status === 'PENDING');
  const today = all.filter((b) => (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS') && isSameTunisDay(new Date(b.startAt), now));
  const upcoming = all.filter((b) => b.status === 'ACCEPTED' && new Date(b.startAt) > now && !today.includes(b));

  return (
    <div className="space-y-8">
      {actionError && <Notice>{actionError}</Notice>}
      <Group title={`New requests (${pending.length})`} empty="No new requests right now.">
        {pending.map((b) => (
          <BookingListItem key={b.id} booking={b} party="client">
            {b.actions.includes('ACCEPT') && (
              <button type="button" className={`${primaryButton} ${small}`} disabled={busyId === b.id} onClick={() => act(b, 'ACCEPT')}>Accept</button>
            )}
            {b.actions.includes('REJECT') && (
              <button type="button" className={`${dangerButton} ${small}`} disabled={busyId === b.id} onClick={() => act(b, 'REJECT')}>Decline</button>
            )}
          </BookingListItem>
        ))}
      </Group>
      <Group title={`Today's jobs (${today.length})`} empty="No jobs scheduled for today.">
        {today.map((b) => <BookingListItem key={b.id} booking={b} party="client" />)}
      </Group>
      <Group title="Upcoming confirmed" empty="No upcoming confirmed jobs.">
        {upcoming.map((b) => <BookingListItem key={b.id} booking={b} party="client" />)}
      </Group>
    </div>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      {children.length === 0 ? <EmptyState title={empty} /> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}
