'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CalendarClock, Eye, Inbox, UserCog } from 'lucide-react';
import { getCurrentSession } from '@/lib/auth-client';
import { useLoad } from '@/lib/use-load';
import RoleGuard from '@/components/RoleGuard';
import RequestsPanel from '@/components/provider/RequestsPanel';
import AvailabilityEditor from '@/components/provider/AvailabilityEditor';
import ProfileEditor from '@/components/provider/ProfileEditor';
import { ErrorState, Spinner, secondaryButton } from '@/components/ui';
import type { ProviderProfile } from '@/types';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'availability', label: 'Availability', icon: CalendarClock },
  { id: 'profile', label: 'My Profile', icon: UserCog },
] as const;
type Tab = typeof TABS[number]['id'];

export default function ProviderDashboardPage() {
  return <RoleGuard allowedRoles={['PROVIDER']}><Dashboard /></RoleGuard>;
}

function Dashboard() {
  const [tab, setTab] = useState<Tab>('requests');
  const { data: session, error, loading, reload } = useLoad(async () => {
    const s = await getCurrentSession();
    if (!s?.providerProfile) throw new Error('Your provider profile could not be loaded.');
    return s;
  }, []);

  // Deep links: /provider/dashboard#availability or #profile
  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === hash)) setTab(hash as Tab);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const select = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  };

  if (loading && !session) return <Spinner label="Loading your dashboard..." />;
  if (error || !session?.providerProfile) return <div className="max-w-xl mx-auto px-4 py-16"><ErrorState message={error ?? 'Could not load your profile.'} onRetry={reload} /></div>;
  const profile = session.providerProfile;

  return (
    <div className="min-h-screen bg-sand px-4 py-8 paper-grain">
      <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-black text-ink">Hello, {profile.name.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">{profile.ratingAverage.toFixed(1)} ★ · {profile.reviewCount} reviews · {profile.jobsDone} jobs done</p>
        </div>
        <Link href={`/providers/${profile.id}`} className={secondaryButton}><Eye className="w-4 h-4" />View public profile</Link>
      </div>

      <div role="tablist" aria-label="Dashboard sections" className="flex w-full gap-1 border-2 border-ink bg-paper p-1 shadow-hard-sm sm:w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => select(id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-sm font-black transition sm:flex-none ${tab === id ? 'bg-teal text-white shadow-hard-sm' : 'text-ink/60 hover:bg-mustard hover:text-ink'}`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`}>
        {tab === 'overview' && <Overview profile={profile} />}
        {tab === 'requests' && <RequestsPanel />}
        {tab === 'availability' && <AvailabilityEditor providerId={profile.id} initial={profile.availability} onSaved={reload} />}
        {tab === 'profile' && <ProfileEditor providerId={profile.id} onSaved={reload} />}
      </div>
      </div>
    </div>
  );
}

function Overview({ profile }: { profile: ProviderProfile }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[['Jobs completed', profile.jobsDone], ['Client rating', `${profile.ratingAverage.toFixed(1)} / 5`], ['Services listed', profile.services.length]].map(([label, value]) => <div key={String(label)} className="border-2 border-ink bg-paper p-5 shadow-hard-sm"><p className="text-3xl font-black">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink/55">{String(label)}</p></div>)}
      </div>
      <div className="border-2 border-ink bg-paper p-6 shadow-hard-sm">
        <p className="text-xs font-black uppercase tracking-[.18em] text-tomato">Today</p>
        <h2 className="mt-2 font-display text-2xl font-black">Keep your service board current.</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink/65">Review new requests, keep your availability accurate, and make sure your professional profile reflects the work you want to receive.</p>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => window.location.hash = 'requests'} className={secondaryButton}>Review requests</button><button type="button" onClick={() => window.location.hash = 'availability'} className={secondaryButton}>Update availability</button></div>
      </div>
    </div>
  );
}
