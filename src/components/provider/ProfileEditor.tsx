'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useLoad } from '@/lib/use-load';
import { PRICE_TYPE_LABEL } from '@/lib/format';
import type { Category, PriceType, ProviderProfile } from '@/types';
import LocationPicker, { type PickedLocation } from '@/components/LocationPicker';
import { ErrorState, Notice, Spinner, inputClass, primaryButton, secondaryButton } from '@/components/ui';

interface ServiceDraft { key: string; id?: string; title: string; description: string; price: number; priceType: PriceType; durationMinutes: number; categorySlug: string }
interface PortfolioDraft { key: string; id?: string; title: string; description: string }
interface Draft {
  bio: string; experienceYears: number; radiusKm: number; categories: string[];
  services: ServiceDraft[]; portfolio: PortfolioDraft[]; location: PickedLocation;
}

let counter = 0;
const newKey = () => `new-${++counter}`;

function toDraft(p: ProviderProfile): Draft {
  return {
    bio: p.bio, experienceYears: p.experienceYears, radiusKm: p.operationalRadiusKm,
    categories: p.categories.map((c) => c.slug),
    services: p.services.map((s) => ({ key: s.id, ...s })),
    portfolio: p.portfolio.map((item) => ({ key: item.id, ...item })),
    location: { lat: p.latitude, lng: p.longitude, addressLabel: p.addressText },
  };
}

const PRICE_TYPES: PriceType[] = ['FIXED', 'HOURLY', 'ESTIMATE'];
const label = 'block text-xs font-semibold text-slate-700';

/** Edits the whitelisted provider fields: services, categories, radius, bio, portfolio and location. */
export default function ProfileEditor({ providerId, onSaved }: { providerId: string; onSaved: () => void }) {
  const { data, error, loading, reload } = useLoad(() => Promise.all([
    api<ProviderProfile>(`/api/providers/${providerId}`), api<Category[]>('/api/categories'),
  ]), [providerId]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => { if (data) setDraft(toDraft(data[0])); }, [data]);

  if (loading && !draft) return <Spinner label="Loading your profile..." />;
  if (error || !data || !draft) return <ErrorState message={error ?? 'Could not load your profile.'} onRetry={reload} />;
  const allCategories = data[1];

  const set = (patch: Partial<Draft>) => { setMessage(null); setDraft({ ...draft, ...patch }); };
  const setService = (key: string, patch: Partial<ServiceDraft>) => set({ services: draft.services.map((s) => (s.key === key ? { ...s, ...patch } : s)) });
  const setItem = (key: string, patch: Partial<PortfolioDraft>) => set({ portfolio: draft.portfolio.map((p) => (p.key === key ? { ...p, ...patch } : p)) });
  const toggleCategory = (slug: string) => {
    const categories = draft.categories.includes(slug) ? draft.categories.filter((c) => c !== slug) : [...draft.categories, slug];
    set({ categories, services: draft.services.map((s) => (categories.includes(s.categorySlug) ? s : { ...s, categorySlug: categories[0] ?? s.categorySlug })) });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.categories.length === 0) { setMessage({ tone: 'error', text: 'Choose at least one category.' }); return; }
    if (draft.services.length === 0) { setMessage({ tone: 'error', text: 'Keep at least one service.' }); return; }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api<ProviderProfile>(`/api/providers/${providerId}`, { method: 'PUT', body: {
        bio: draft.bio, experienceYears: draft.experienceYears, radiusKm: draft.radiusKm, categories: draft.categories,
        services: draft.services.map(({ key: _key, ...s }) => s),
        portfolio: draft.portfolio.map(({ key: _key, ...p }) => p),
        location: draft.location,
      } });
      setDraft(toDraft(updated));
      setMessage({ tone: 'success', text: 'Profile saved.' });
      onSaved();
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Card title="About you">
        <label className={label}>Bio
          <textarea className={`${inputClass} mt-1`} rows={4} maxLength={4000} value={draft.bio} onChange={(e) => set({ bio: e.target.value })} />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={label}>Years of experience
            <input type="number" min={0} max={80} className={`${inputClass} mt-1`} value={draft.experienceYears} onChange={(e) => set({ experienceYears: Number(e.target.value) })} />
          </label>
          <label className={label}>Service radius (km)
            <input type="number" min={1} max={200} className={`${inputClass} mt-1`} value={draft.radiusKm} onChange={(e) => set({ radiusKm: Number(e.target.value) })} />
          </label>
        </div>
        <fieldset>
          <legend className={label}>Categories</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {allCategories.map((c) => {
              const on = draft.categories.includes(c.slug);
              return (
                <label key={c.slug} className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleCategory(c.slug)} />{c.name}
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <Card title="Services and prices">
        <ul className="space-y-4">
          {draft.services.map((s) => (
            <li key={s.key} className="p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                <label className={label}>Title
                  <input className={`${inputClass} mt-1`} required minLength={2} maxLength={140} value={s.title} onChange={(e) => setService(s.key, { title: e.target.value })} />
                </label>
                <button type="button" aria-label={`Remove ${s.title || 'service'}`} className={`${secondaryButton} self-end`} onClick={() => set({ services: draft.services.filter((x) => x.key !== s.key) })}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <label className={label}>Description
                <textarea className={`${inputClass} mt-1`} rows={2} maxLength={2000} value={s.description} onChange={(e) => setService(s.key, { description: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className={label}>Price (TND)
                  <input type="number" min={0} step="0.5" required className={`${inputClass} mt-1`} value={s.price} onChange={(e) => setService(s.key, { price: Number(e.target.value) })} />
                </label>
                <label className={label}>Price type
                  <select className={`${inputClass} mt-1`} value={s.priceType} onChange={(e) => setService(s.key, { priceType: e.target.value as PriceType })}>
                    {PRICE_TYPES.map((t) => <option key={t} value={t}>{PRICE_TYPE_LABEL[t]}</option>)}
                  </select>
                </label>
                <label className={label}>Duration (min)
                  <input type="number" min={15} max={720} step={15} required className={`${inputClass} mt-1`} value={s.durationMinutes} onChange={(e) => setService(s.key, { durationMinutes: Number(e.target.value) })} />
                </label>
                <label className={label}>Category
                  <select className={`${inputClass} mt-1`} value={s.categorySlug} onChange={(e) => setService(s.key, { categorySlug: e.target.value })}>
                    {allCategories.filter((c) => draft.categories.includes(c.slug)).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className={secondaryButton} onClick={() => set({ services: [...draft.services, {
          key: newKey(), title: '', description: '', price: 30, priceType: 'FIXED', durationMinutes: 60, categorySlug: draft.categories[0] ?? '',
        }] })}><Plus className="w-4 h-4" />Add service</button>
      </Card>

      <Card title="Portfolio">
        {draft.portfolio.length === 0 && <p className="text-sm text-slate-500">No portfolio items yet. Describe a few recent jobs.</p>}
        <ul className="space-y-3">
          {draft.portfolio.map((p) => (
            <li key={p.key} className="p-4 rounded-2xl border border-slate-200 grid sm:grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <input aria-label="Portfolio title" className={inputClass} required minLength={2} maxLength={140} placeholder="Title" value={p.title} onChange={(e) => setItem(p.key, { title: e.target.value })} />
                <textarea aria-label="Portfolio description" className={inputClass} rows={2} maxLength={2000} placeholder="What did you do?" value={p.description} onChange={(e) => setItem(p.key, { description: e.target.value })} />
              </div>
              <button type="button" aria-label={`Remove ${p.title || 'item'}`} className={`${secondaryButton} self-start`} onClick={() => set({ portfolio: draft.portfolio.filter((x) => x.key !== p.key) })}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={secondaryButton} onClick={() => set({ portfolio: [...draft.portfolio, { key: newKey(), title: '', description: '' }] })}>
          <Plus className="w-4 h-4" />Add portfolio item
        </button>
      </Card>

      <Card title="Location">
        <LocationPicker label="Base address" value={draft.location} onChange={(location) => set({ location })} />
      </Card>

      <div className="sticky bottom-4 bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-3 shadow-lg">
        <button type="submit" className={primaryButton} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
        {message && <div className="flex-1 min-w-[200px]"><Notice tone={message.tone}>{message.text}</Notice></div>}
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
