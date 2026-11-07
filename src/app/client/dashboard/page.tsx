'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarDays, Clock3, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/use-load';
import { getCurrentSession, type AuthSession } from '@/lib/auth-client';
import type { Booking } from '@/types';
import RoleGuard from '@/components/RoleGuard';
import BookingListItem, { ACTIVE_STATUSES } from '@/components/BookingListItem';
import { EmptyState, ErrorState, Spinner, primaryButton } from '@/components/ui';

export default function ClientDashboardPage() {
  return <RoleGuard allowedRoles={['CLIENT']}><MyBookings /></RoleGuard>;
}

function MyBookings() {
  const { data, error, loading, reload } = useLoad(() => api<Booking[]>('/api/bookings'), []);
  const { data: session } = useLoad<AuthSession | null>(() => getCurrentSession(), []);

  const upcoming = (data ?? []).filter((b) => ACTIVE_STATUSES.includes(b.status));
  const completed = (data ?? []).filter((b) => b.status === 'COMPLETED');
  const recent = [...(data ?? [])].sort((a, b) => b.timeline.createdAt.localeCompare(a.timeline.createdAt)).slice(0, 3);
  const metrics = [
    { label: 'Active bookings', count: upcoming.length, icon: CalendarDays },
    { label: 'Upcoming appointments', count: upcoming.filter((b) => new Date(b.startAt) >= new Date()).length, icon: Clock3 },
    { label: 'Completed bookings', count: completed.length, icon: UserRound },
  ];

  return (
    <div className="min-h-screen bg-sand px-4 py-8 paper-grain">
      <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-tomato">Client dashboard</p><h1 className="font-display text-4xl font-black text-ink">Welcome{session?.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}.</h1><p className="mt-2 text-sm text-ink/60">Keep your requests and appointments moving.</p></div>
        <Link href="/client/request/new" className={primaryButton}>Describe a Problem</Link>
      </div>

      {loading && !data ? <Spinner label="Loading your dashboard..." /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {metrics.map(({ label, count, icon: Icon }) => <div key={label} className="border-2 border-ink bg-paper p-5 shadow-hard-sm"><Icon className="mb-5 h-6 w-6 text-teal" /><p className="text-3xl font-black">{count}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink/55">{label}</p></div>)}
          </section>
          <section id="bookings" className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-black">Upcoming appointments</h2><Link href="#activity" className="text-xs font-black text-teal hover:text-tomato">View recent activity</Link></div>
            {upcoming.length === 0
              ? <EmptyState title="No upcoming appointments.">Describe a problem to find a provider and pick a time.</EmptyState>
              : <ul className="space-y-2">{upcoming.map((b) => <BookingListItem key={b.id} booking={b} party="client" />)}</ul>}
          </section>
          <section id="activity" className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <div className="space-y-3"><h2 className="font-display text-2xl font-black">Recent activity</h2>
            {recent.length === 0
              ? <EmptyState title="No activity yet." />
              : (
                <ul className="space-y-2">{recent.map((b) => <BookingListItem key={b.id} booking={b} party="client" />)}</ul>
              )}</div>
            <div id="profile" className="border-2 border-ink bg-paper p-6 shadow-hard-sm"><div className="flex items-center gap-3"><UserRound className="h-6 w-6 text-teal" /><h2 className="font-display text-2xl font-black">Profile</h2></div><p className="mt-4 text-sm font-bold">{session?.user.name ?? 'Your account'}</p><p className="text-sm text-ink/60">{session?.user.email}</p><p className="text-sm text-ink/60">{session?.user.phone}</p><p className="mt-5 text-xs text-ink/55">Your profile details are used to keep requests and bookings accurate.</p></div>
          </section>
        </>
      )}
      </div>
    </div>
  );
}
