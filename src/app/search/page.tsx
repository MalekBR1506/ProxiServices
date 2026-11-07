'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Crosshair, List, Map as MapIcon, MapPin, Pencil, Search, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ProviderProfile } from '@/types';
import ProviderCard from '@/components/ProviderCard';
import MapComponent from '@/components/MapComponent';
import { DEFAULT_COORDINATES } from '@/lib/geo';
import { EmptyState, ErrorState, Spinner, inputClass, primaryButton, secondaryButton } from '@/components/ui';
import RoleGuard from '@/components/RoleGuard';

type SortBy = 'match' | 'distance' | 'rating' | 'price_asc';

function SearchPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const analysisId = params.get('analysisId') || '';
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [analysisUrgency, setAnalysisUrgency] = useState('LOW');
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(Number(params.get('radius') || 25));
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('match');
  const [center, setCenter] = useState({ latitude: Number(params.get('lat') || DEFAULT_COORDINATES.latitude), longitude: Number(params.get('lng') || DEFAULT_COORDINATES.longitude) });
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const loadProviders = async () => {
    setLoading(true); setError(null);
    if (!analysisId) { router.replace('/client/request/new'); return; }
    const search = new URLSearchParams({ analysisId, lat: String(center.latitude), lng: String(center.longitude), radius: String(radius), sortBy });
    if (minRating) search.set('minRating', String(minRating));
    if (query.trim()) search.set('query', query.trim());
    try {
      const response = await fetch(`/api/providers/search?${search}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not load providers.');
      setProviders(result.data);
      setAnalysisSummary(result.meta?.analysis?.summary ?? '');
      setAnalysisUrgency(result.meta?.analysis?.urgency ?? 'LOW');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load providers.';
      if (message.toLowerCase().includes('analysis') || message.toLowerCase().includes('confirm')) {
        router.replace(`/client/request/new${analysisId ? `?analysisId=${encodeURIComponent(analysisId)}` : ''}`);
        return;
      }
      setError(message);
    }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadProviders(); }, [radius, minRating, sortBy, center]);

  const locate = () => {
    if (!navigator.geolocation) { setError('Location is not available in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => { setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setLocating(false); }, () => { setError('We could not read your location.'); setLocating(false); });
  };

  return <main className="min-h-[calc(100vh-72px)] bg-sand paper-grain">
    <section className="sticky top-16 z-20 border-b-2 border-ink bg-paper/95 px-4 py-4 backdrop-blur-sm">
      <form onSubmit={(event) => { event.preventDefault(); void loadProviders(); }} className="mx-auto flex max-w-7xl flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1 text-xs font-black uppercase tracking-widest text-ink">Find a fix
          <span className="relative mt-1 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal" /><input aria-label="Search providers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Describe the job..." className={`${inputClass} pl-9`} /></span>
        </label>
        <label className="text-xs font-black uppercase tracking-widest text-ink">Sort
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)} className={`${inputClass} mt-1 min-w-40`}><option value="match">Best match</option><option value="distance">Nearest</option><option value="price_asc">Cheapest</option><option value="rating">Top rated</option></select>
        </label>
        <label className="hidden text-xs font-black uppercase tracking-widest text-ink sm:block">Rating
          <select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} className={`${inputClass} mt-1`}><option value="0">Any rating</option><option value="4">4.0+</option><option value="4.5">4.5+</option><option value="4.8">4.8+</option></select>
        </label>
        <button type="button" onClick={locate} className={`${secondaryButton} whitespace-nowrap`}><Crosshair className={locating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Use my location</button>
        <button type="submit" className={primaryButton}>Refresh</button>
      </form>
    </section>

    {analysisSummary && <div className="mx-auto mt-5 max-w-7xl px-4"><div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-mustard p-3 text-sm font-bold shadow-hard-sm"><div><span className="uppercase tracking-widest">Confirmed brief:</span> {analysisSummary}<span className="ml-3 text-xs uppercase text-ink/65">Urgency: {analysisUrgency}</span></div><button type="button" onClick={() => router.push(`/client/request/new?analysisId=${encodeURIComponent(analysisId)}`)} className="inline-flex items-center gap-1 text-xs font-black text-teal hover:text-tomato"><Pencil className="h-3.5 w-3.5" /> Edit my problem</button></div></div>}
    <div className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 py-3 lg:hidden"><button type="button" onClick={() => setMobileView('list')} className={mobileView === 'list' ? `${primaryButton} py-2` : `${secondaryButton} py-2`}><List className="h-4 w-4" /> List ({providers.length})</button><button type="button" onClick={() => setMobileView('map')} className={mobileView === 'map' ? `${primaryButton} py-2` : `${secondaryButton} py-2`}><MapIcon className="h-4 w-4" /> Map</button></div>

    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-12">
      <section className={`${mobileView === 'map' ? 'hidden lg:block' : 'block'} lg:col-span-7`}>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-tomato">Your confirmed request</p><h1 className="font-display text-3xl font-black">Matching providers</h1><p className="mt-1 text-sm text-ink/65">{providers.length} provider{providers.length === 1 ? '' : 's'} within {radius} km</p></div><SlidersHorizontal className="h-5 w-5 text-teal" /></div>
        {loading && <Spinner label="Finding the right hands..." />}
        {!loading && error && <ErrorState message={error} onRetry={loadProviders} />}
        {!loading && !error && providers.length === 0 && <EmptyState title="No nearby providers yet.">Try a larger radius or another category.</EmptyState>}
        <div className="space-y-4">{providers.map((provider) => <div key={provider.id} onMouseEnter={() => setSelectedId(provider.id)} onMouseLeave={() => setSelectedId(null)}><ProviderCard provider={provider} isHighlighted={selectedId === provider.id} problemSummary={analysisSummary || query} urgency={analysisUrgency} analysisId={analysisId} /></div>)}</div>
      </section>
      <section className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'} lg:sticky lg:top-36 lg:col-span-5 lg:h-[calc(100vh-180px)]`}><div className="flex h-[520px] flex-col border-2 border-ink bg-paper shadow-hard"><div className="flex items-center justify-between border-b-2 border-ink bg-teal px-4 py-3 text-sm font-black text-white"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-mustard" /> Match map</span><span>{providers.length} pins</span></div><div className="min-h-0 flex-1"><MapComponent center={center} radiusKm={radius} providers={providers} selectedProviderId={selectedId} onSelectProvider={setSelectedId} /></div></div></section>
    </div>
  </main>;
}

export default function SearchPage() { return <RoleGuard allowedRoles={['CLIENT']}><Suspense fallback={<div className="bg-sand p-12 text-center font-bold">Loading the workshop board...</div>}><SearchPageContent /></Suspense></RoleGuard>; }
