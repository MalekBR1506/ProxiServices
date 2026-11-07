'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Clock, MapPin, Phone, Star } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { getCurrentSession, type AuthSession } from '@/lib/auth-client';
import { useLoad } from '@/lib/use-load';
import { formatDuration, formatPrice, PRICE_TYPE_LABEL } from '@/lib/format';
import { formatDateTime, formatFullDate, formatTime } from '@/lib/time';
import type { Booking, BookingAction } from '@/types';
import { Avatar, ErrorState, Notice, Spinner, StatusBadge, dangerButton, inputClass, primaryButton, secondaryButton } from '@/components/ui';

type StatusAction = Exclude<BookingAction, 'REVIEW'>;
const ACTION_UI: Record<StatusAction, { label: string; style: string; confirm?: string }> = {
  ACCEPT: { label: 'Accept request', style: primaryButton },
  REJECT: { label: 'Decline', style: dangerButton, confirm: 'Decline this request? The client will be told you are not available.' },
  START: { label: 'Start job', style: primaryButton },
  COMPLETE: { label: 'Mark as completed', style: primaryButton, confirm: 'Mark this job as completed?' },
  CANCEL: { label: 'Cancel booking', style: dangerButton, confirm: 'Cancel this booking?' },
};

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, setData, error, loading, reload } = useLoad(() => api<Booking>(`/api/bookings/${id}`), [id]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [busy, setBusy] = useState<StatusAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { getCurrentSession().then(setSession); }, []);

  const run = async (action: StatusAction) => {
    const ui = ACTION_UI[action];
    if (ui.confirm && !window.confirm(ui.confirm)) return;
    setBusy(action);
    setActionError(null);
    try {
      setData(await api<Booking>(`/api/bookings/${id}`, { method: 'PATCH', body: { action } }));
    } catch (err) {
      setActionError(errorMessage(err));
      void reload();
    } finally {
      setBusy(null);
    }
  };

  if (loading && !booking) return <Spinner label="Loading booking..." />;
  if (error || !booking) {
    return <div className="max-w-xl mx-auto px-4 py-16"><ErrorState message={error ?? 'Booking not found.'} onRetry={reload} /></div>;
  }

  const isProvider = session?.user.role === 'PROVIDER';
  const other = isProvider ? booking.client : booking.provider;
  const backHref = isProvider ? '/provider/dashboard' : '/client/dashboard';
  const statusActions = booking.actions.filter((a): a is StatusAction => a !== 'REVIEW');

  return (
    <div className="min-h-screen bg-sand pb-20 paper-grain">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-black text-teal hover:text-tomato">
          <ArrowLeft className="w-4 h-4" /> {isProvider ? 'Back to requests' : 'Back to my bookings'}
        </Link>

        <header className="ticket space-y-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-black text-ink">{booking.service.title}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/70"><Clock className="w-4 h-4 text-tomato" />
            {formatFullDate(booking.startAt)}, {formatTime(booking.startAt)}–{formatTime(booking.endAt)} ({formatDuration(booking.service.durationMinutes)})
          </p>
          {actionError && <Notice>{actionError}</Notice>}
          {statusActions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {statusActions.map((action) => (
                <button key={action} type="button" className={ACTION_UI[action].style} disabled={!!busy} onClick={() => run(action)}>
                  {busy === action ? 'Saving...' : ACTION_UI[action].label}
                </button>
              ))}
            </div>
          )}
          <StatusHint booking={booking} isProvider={isProvider} />
        </header>

        <div className="grid md:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="space-y-5">
            <Card title="Details">
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <Item label="Problem">{booking.problemSummary}</Item>
                <Item label="Price">{formatPrice(booking.price, booking.priceType)} <span className="text-slate-500">· {PRICE_TYPE_LABEL[booking.priceType]}</span></Item>
                <Item label="Address"><span className="inline-flex items-start gap-1"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />{booking.address}</span></Item>
                <Item label="Notes">{booking.notes || <span className="text-slate-400">None</span>}</Item>
              </dl>
            </Card>

            {(booking.actions.includes('REVIEW') || booking.review) && (
              <Card title="Review">
                {booking.review ? <ReviewView review={booking.review} /> : <ReviewForm bookingId={booking.id} onDone={reload} />}
              </Card>
            )}
          </div>

          <div className="space-y-5">
            <Card title={isProvider ? 'Client' : 'Provider'}>
              <div className="flex items-center gap-3">
                <Avatar initials={other.avatar} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{other.name}</p>
                  {!isProvider && <Link href={`/providers/${booking.provider.id}`} className="text-xs font-bold text-teal hover:text-tomato">View profile</Link>}
                </div>
              </div>
              {other.phone ? (
                <a href={`tel:${other.phone.replace(/\s/g, '')}`} className={`${secondaryButton} w-full mt-3`}><Phone className="w-4 h-4" />{other.phone}</a>
              ) : (
                <p className="mt-3 text-xs text-slate-500">The phone number is shared once the provider accepts.</p>
              )}
            </Card>
            <Card title="Timeline"><Timeline booking={booking} /></Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-ink bg-paper p-5 shadow-hard-sm">
      <h2 className="mb-3 font-display text-xl font-black text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs font-black uppercase tracking-wide text-ink/50">{label}</dt><dd className="mt-0.5 text-ink">{children}</dd></div>;
}

function StatusHint({ booking, isProvider }: { booking: Booking; isProvider: boolean }) {
  let text: string | null = null;
  if (booking.status === 'PENDING') text = isProvider ? 'Accept or decline this request.' : 'Waiting for the provider to accept your request.';
  if (booking.status === 'ACCEPTED' && isProvider && !booking.actions.includes('START')) text = 'You can start this job on the day of the appointment.';
  if (booking.status === 'ACCEPTED' && !isProvider) text = 'Your booking is confirmed. You can call the provider if needed.';
  if (booking.status === 'IN_PROGRESS' && !isProvider) text = 'The provider has started the job.';
  return text ? <p className="text-xs text-slate-500">{text}</p> : null;
}

function Timeline({ booking }: { booking: Booking }) {
  const t = booking.timeline;
  const closed = booking.status === 'REJECTED' ? { label: 'Declined', at: t.rejectedAt } : booking.status === 'CANCELLED' ? { label: 'Cancelled', at: t.cancelledAt } : null;
  const steps = [
    { label: 'Requested', at: t.createdAt },
    ...(closed && !t.acceptedAt ? [closed] : [
      { label: 'Accepted', at: t.acceptedAt },
      ...(closed ? [closed] : [{ label: 'Started', at: t.startedAt }, { label: 'Completed', at: t.completedAt }]),
    ]),
  ];
  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-teal pl-5">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-3">
          <span className={`absolute -left-[11px] mt-0.5 grid h-5 w-5 place-items-center border-2 border-ink ${step.at ? (step === closed ? 'bg-tomato' : 'bg-success') : 'bg-sand'}`}>
            {step.at && <Check className="h-3 w-3 text-white" />}
          </span>
          <div>
            <p className={`text-sm font-black ${step.at ? 'text-ink' : 'text-ink/35'}`}>{step.label}</p>
            {step.at && <p className="text-xs text-ink/55">{formatDateTime(step.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ReviewView({ review }: { review: NonNullable<Booking['review']> }) {
  return (
    <div className="space-y-1">
      <p className="text-amber-500" aria-label={`${review.rating} out of 5`}>{'★'.repeat(review.rating)}<span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span></p>
      <p className="text-sm text-slate-700">{review.comment}</p>
      <p className="text-xs text-slate-400">{formatFullDate(review.createdAt)}</p>
    </div>
  );
}

function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) { setError('Choose 1 to 5 stars.'); return; }
    setSaving(true);
    setError(null);
    try {
      await api('/api/reviews', { method: 'POST', body: { bookingId, rating, comment } });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-slate-600">How did it go? Your review helps other clients.</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}>
            <Star className={`w-7 h-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        ))}
      </div>
      <textarea className={inputClass} rows={3} required minLength={3} maxLength={2000} placeholder="What went well? Anything to improve?" value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <Notice>{error}</Notice>}
      <button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Sending...' : 'Submit review'}</button>
    </form>
  );
}
