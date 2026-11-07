'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, CalendarCheck, CheckCircle, Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { api, ApiError, errorMessage } from '@/lib/api';
import { getCurrentSession, type AuthSession } from '@/lib/auth-client';
import { useLoad } from '@/lib/use-load';
import { formatDuration, formatPrice, PRICE_TYPE_LABEL } from '@/lib/format';
import { formatDateTime, formatFullDate, formatTime, WEEKDAYS } from '@/lib/time';
import type { Booking, ProviderProfile, ServiceItem } from '@/types';
import SlotPicker from '@/components/SlotPicker';
import { Avatar, EmptyState, ErrorState, Notice, Spinner, inputClass, primaryButton, secondaryButton } from '@/components/ui';

export default function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const initialSummary = searchParams.get('summary') || '';
  const analysisId = searchParams.get('analysisId') || '';
  const { data: provider, error, loading, reload } = useLoad(() => api<ProviderProfile>(`/api/providers/${id}`), [id]);
  const [serviceId, setServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (provider && !provider.services.some((s) => s.id === serviceId)) setServiceId(provider.services[0]?.id ?? null);
  }, [provider, serviceId]);

  if (loading) return <Spinner label="Loading provider profile..." />;
  if (error || !provider) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-4">
        <ErrorState message={error ?? 'Provider not found.'} onRetry={reload} />
        <Link href={analysisId ? `/search?analysisId=${encodeURIComponent(analysisId)}` : '/client/request/new'} className={secondaryButton}><ArrowLeft className="w-4 h-4" /> Back to search</Link>
      </div>
    );
  }
  const service = provider.services.find((s) => s.id === serviceId) ?? null;

  return (
    <div className="min-h-screen bg-sand pb-20 paper-grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <Link href={analysisId ? `/search?analysisId=${encodeURIComponent(analysisId)}` : '/client/request/new'} className="inline-flex items-center gap-1.5 text-xs font-black text-teal hover:text-tomato">
          <ArrowLeft className="w-4 h-4" /> Back to search
        </Link>

        <header className="flex flex-col gap-6 border-2 border-ink bg-paper p-6 shadow-hard sm:flex-row sm:p-8">
          <Avatar initials={provider.avatar} size="lg" />
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">{provider.name}</h1>
              {provider.isVerified && (
                <span className="ink-stamp inline-flex items-center gap-1 bg-success px-2.5 py-0.5 text-xs font-black text-white">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {provider.categories.map((c) => <span key={c.id} className="border border-teal px-2 py-0.5 text-xs font-black uppercase text-teal">{c.name}</span>)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-ink/70">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{provider.ratingAverage.toFixed(1)} <span className="font-normal text-slate-500">({provider.reviewCount} reviews)</span></span>
              <span className="inline-flex items-center gap-1"><Briefcase className="w-4 h-4" />{provider.experienceYears} years · {provider.jobsDone} jobs done</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{provider.addressText} · serves {provider.operationalRadiusKm} km around</span>
            </div>
            {provider.bio && <p className="max-w-2xl text-sm leading-relaxed text-ink/70">{provider.bio}</p>}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
          <div className="space-y-6">
            <Section title="Services">
              {provider.services.length === 0 ? <EmptyState title="No services listed yet." /> : (
                <div className="space-y-2" role="radiogroup" aria-label="Service">
                  {provider.services.map((s) => <ServiceOption key={s.id} service={s} selected={s.id === serviceId} onSelect={() => setServiceId(s.id)} />)}
                </div>
              )}
            </Section>

            <Section title="Working hours">
              <WorkingHoursList hours={provider.availability} />
            </Section>

            <Section title="Portfolio">
              {provider.portfolio.length === 0 ? <EmptyState title="No portfolio items yet." /> : (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {provider.portfolio.map((item) => (
                    <li key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      {item.description && <p className="text-xs text-slate-600 mt-1">{item.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={`Reviews (${provider.reviewCount})`}>
              {provider.reviews.length === 0 ? <EmptyState title="No reviews yet." /> : (
                <ul className="divide-y divide-slate-100">
                  {provider.reviews.map((r) => (
                    <li key={r.id} className="py-4 flex gap-3">
                      <Avatar initials={r.clientAvatar} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{r.clientName} <span className="ml-2 text-amber-500" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></span></p>
                        <p className="text-xs text-slate-400">{formatFullDate(r.createdAt)}</p>
                        <p className="text-sm text-slate-700 mt-1">{r.comment}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <aside id="book" className="lg:sticky lg:top-20 scroll-mt-24">
            {service ? <BookingPanel provider={provider} service={service} initialSummary={initialSummary} analysisId={analysisId} /> : <EmptyState title="Nothing to book yet." />}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-2 border-ink bg-paper p-6 shadow-hard-sm">
      <h2 className="font-display text-2xl font-black text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ServiceOption({ service, selected, onSelect }: { service: ServiceItem; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={`flex w-full items-start justify-between gap-4 border-2 p-4 text-left transition ${selected ? 'border-ink bg-mustard shadow-hard-sm' : 'border-ink bg-paper hover:bg-sand'}`}
    >
      <div>
        <p className="text-sm font-black text-ink">{service.title}</p>
        {service.description && <p className="mt-1 text-xs text-ink/65">{service.description}</p>}
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink/50"><Clock className="w-3.5 h-3.5" />{formatDuration(service.durationMinutes)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-teal">{formatPrice(service.price, service.priceType)}</p>
        <p className="text-[11px] font-bold text-ink/50">{PRICE_TYPE_LABEL[service.priceType]}</p>
      </div>
    </button>
  );
}

function WorkingHoursList({ hours }: { hours: ProviderProfile['availability'] }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      {order.map((weekday) => {
        const ranges = hours.filter((h) => h.weekday === weekday);
        return (
            <div key={weekday} className="border-2 border-line bg-sand p-2.5">
            <dt className="text-xs font-black text-ink/60">{WEEKDAYS[weekday]}</dt>
            <dd className={ranges.length ? 'text-slate-900' : 'text-slate-400'}>{ranges.length ? ranges.map((r) => `${r.startTime}–${r.endTime}`).join(', ') : 'Closed'}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function BookingPanel({ provider, service, initialSummary, analysisId }: { provider: ProviderProfile; service: ServiceItem; initialSummary: string; analysisId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [slot, setSlot] = useState<string | null>(null);
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ address: '', problemSummary: initialSummary, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentSession().then((s) => {
      setSession(s);
      if (s?.user.addressLabel) setForm((f) => ({ ...f, address: f.address || s.user.addressLabel || '' }));
    });
  }, []);
  useEffect(() => { setSlot(null); setStep('pick'); }, [service.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slot || !session) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api<Booking>('/api/bookings', { method: 'POST', body: {
        analysisId, providerId: provider.id, serviceId: service.id, startAt: slot,
        address: form.address, lat: session.user.lat ?? provider.latitude, lng: session.user.lng ?? provider.longitude,
        problemSummary: form.problemSummary, notes: form.notes,
      } });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) {
        setSlot(null);
        setStep('pick');
        setRefreshKey((k) => k + 1);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 border-2 border-ink bg-paper p-6 shadow-hard">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-black text-ink"><CalendarCheck className="w-5 h-5 text-tomato" />Book {service.title}</h2>
        <p className="text-sm text-slate-500">{formatPrice(service.price, service.priceType)} · {formatDuration(service.durationMinutes)}</p>
      </div>
      {error && <Notice>{error}</Notice>}

      {step === 'pick' ? (
        <>
          <SlotPicker providerId={provider.id} serviceId={service.id} selected={slot} onSelect={setSlot} refreshKey={refreshKey} />
          <BookAction session={session} providerId={provider.id} analysisId={analysisId} disabled={!slot} onBook={() => { setError(null); setStep('confirm'); }} />
        </>
      ) : (
        <form onSubmit={submit} className="space-y-3">
            <div className="border-2 border-ink bg-mustard p-3 text-sm">
            <p className="font-semibold text-slate-900">{slot && `${formatFullDate(slot)}, ${formatTime(slot)}`}</p>
            <p className="text-slate-600">{service.title} with {provider.name}</p>
          </div>
          <label className="block text-sm font-medium text-slate-700">Address
            <input className={`${inputClass} mt-1`} required minLength={3} maxLength={255} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">What is the problem?
            <input className={`${inputClass} mt-1`} required minLength={3} maxLength={255} placeholder="e.g. Water leaking under the sink" value={form.problemSummary} onChange={(e) => setForm({ ...form, problemSummary: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Notes for the provider <span className="text-slate-400 font-normal">(optional)</span>
            <textarea className={`${inputClass} mt-1`} rows={3} maxLength={3000} placeholder="Floor, access code, parking..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <p className="text-xs text-slate-500">The price is confirmed by the provider. Their phone number is shared once they accept.</p>
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} onClick={() => setStep('pick')} disabled={submitting}>Back</button>
            <button type="submit" className={`${primaryButton} flex-1`} disabled={submitting}>{submitting ? 'Sending request...' : 'Confirm booking'}</button>
          </div>
        </form>
      )}
      {slot && step === 'pick' && <p className="text-xs text-slate-500 inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" />Selected: {formatDateTime(slot)}</p>}
    </div>
  );
}

function BookAction({ session, providerId, analysisId, disabled, onBook }: { session: AuthSession | null | undefined; providerId: string; analysisId: string; disabled: boolean; onBook: () => void }) {
  if (session === undefined) return null;
  if (!analysisId) return <Notice tone="info">Complete and confirm a problem analysis before booking.</Notice>;
  if (!session) {
    return <Link href={`/login?next=${encodeURIComponent(`/providers/${providerId}?analysisId=${analysisId}#book`)}`} className={`${primaryButton} w-full`}>Sign in to book</Link>;
  }
  if (session.user.role !== 'CLIENT') return <Notice tone="info">Provider accounts cannot book services. Sign in as a client to book.</Notice>;
  return <button type="button" className={`${primaryButton} w-full`} disabled={disabled} onClick={onBook}>{disabled ? 'Choose a time' : 'Book'}</button>;
}
