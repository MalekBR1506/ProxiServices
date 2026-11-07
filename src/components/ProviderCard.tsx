'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, MapPin, Star } from 'lucide-react';
import type { ProviderProfile } from '@/types';
import { formatDistance } from '@/lib/geo';
import { formatTnd } from '@/lib/format';

interface ProviderCardProps { provider: ProviderProfile; isHighlighted?: boolean; problemSummary?: string; urgency?: string; analysisId?: string }
const profileHref = (provider: ProviderProfile, problemSummary?: string, urgency?: string, analysisId?: string, book = false) => { const params = new URLSearchParams(); if (problemSummary) params.set('summary', problemSummary); if (urgency) params.set('urgency', urgency); if (analysisId) params.set('analysisId', analysisId); const query = params.toString(); return `/providers/${provider.id}${query ? `?${query}` : ''}${book ? '#book' : ''}`; };

export default function ProviderCard({ provider, isHighlighted = false, problemSummary, urgency, analysisId }: ProviderCardProps) {
  const minPrice = provider.services.length ? Math.min(...provider.services.map((service) => service.price)) : 0;
  return <article className={`group relative border-2 border-ink bg-paper p-5 transition hover:-translate-y-1 hover:shadow-hard ${isHighlighted ? 'shadow-hard' : 'shadow-hard-sm'}`}>
    <div className="flex items-start gap-4"><div className="relative shrink-0"><div aria-label={provider.name} className="grid h-16 w-16 place-items-center border-2 border-ink bg-mustard font-display text-xl font-black text-ink sm:h-20 sm:w-20">{provider.avatar}</div>{provider.isVerified && <span title="Verified profile" className="absolute -bottom-2 -right-2 grid h-6 w-6 place-items-center border-2 border-ink bg-success text-white"><CheckCircle className="h-3.5 w-3.5" /></span>}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={profileHref(provider, problemSummary, urgency, analysisId)} className="font-display text-2xl font-black text-ink hover:text-teal">{provider.name}</Link><div className="mt-1 flex flex-wrap gap-1.5">{provider.categories.map((category) => <span key={category.id} className="border border-teal px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-teal">{category.name}</span>)}</div></div>{provider.matchScore !== undefined && <div className="ink-stamp bg-tomato px-2 py-2 text-center text-white"><span className="block font-display text-2xl font-black leading-none">{provider.matchScore}%</span><span className="text-[9px] font-black uppercase">match</span></div>}</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-ink/60"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-tomato" />{formatDistance(provider.distanceKm)}</span><span className="inline-flex items-center gap-1 text-ink"><Star className="h-3.5 w-3.5 fill-mustard text-mustard" />{provider.ratingAverage.toFixed(1)} ({provider.reviewCount})</span><span>{provider.experienceYears} years experience</span></div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70">{provider.bio}</p>
        {provider.matchReasons?.length ? <details className="mt-3 border-t-2 border-line pt-2 text-xs"><summary className="cursor-pointer font-black text-teal">Why this provider?</summary><ul className="mt-2 grid gap-1 text-ink/70 sm:grid-cols-2">{provider.matchReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul></details> : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-line pt-3"><div><span className="block text-[10px] font-black uppercase tracking-wider text-ink/50">Starting at</span><span className="font-display text-xl font-black text-teal">{formatTnd(minPrice)}</span></div><div className="flex gap-2"><Link href={profileHref(provider, problemSummary, urgency, analysisId)} className="border-2 border-ink px-3 py-2 text-xs font-black text-ink hover:bg-mustard">Profile</Link><Link href={profileHref(provider, problemSummary, urgency, analysisId, true)} className="inline-flex items-center gap-1 border-2 border-ink bg-teal px-3 py-2 text-xs font-black text-white shadow-hard-sm hover:bg-tomato">Book <ArrowRight className="h-3.5 w-3.5" /></Link></div></div>
      </div></div>
  </article>;
}
