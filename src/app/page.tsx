'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Brush, CarFront, Droplets, Hammer, Lightbulb, Sparkles, Wrench } from 'lucide-react';
import { EmptyState, ErrorState, Spinner, primaryButton } from '@/components/ui';
import type { Category } from '@/types';

const iconFor = (slug: string) => ({ mechanic: CarFront, cleaning: Sparkles, electrician: Lightbulb, plumber: Droplets, painter: Brush, carpenter: Hammer }[slug] ?? Wrench);
const stickerColors = ['bg-mustard', 'bg-tomato text-white', 'bg-teal text-white', 'bg-paper', 'bg-success text-white', 'bg-mustard'];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/categories').then((r) => r.json())
      .then((categoryResult) => { if (!categoryResult.success) throw new Error('Could not load local services.'); setCategories(categoryResult.data); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load local services.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="overflow-hidden">
    <section className="paper-grain border-b-2 border-ink bg-sand px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
      <div className="mx-auto max-w-7xl"><div className="max-w-3xl">
        <div><p className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-tomato"><span className="h-2 w-2 bg-tomato" /> Trusted local help in Greater Tunis</p><h1 className="font-display text-5xl font-black leading-[.93] tracking-[-.045em] text-ink sm:text-7xl">Find the right professional <span className="text-teal">for the job.</span></h1><p className="mt-6 max-w-md text-base leading-7 text-ink/70">Describe what you need, understand the problem clearly, and book a trusted local professional with confidence.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/register?role=client" className={primaryButton}>Find a Professional <ArrowRight className="h-4 w-4" /></Link><Link href="/register?role=provider" className="inline-flex items-center border-2 border-ink bg-paper px-4 py-2.5 text-sm font-extrabold text-ink shadow-hard-sm">Become a Professional</Link></div></div>
      </div></div>
    </section>
    <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="mb-8"><p className="text-xs font-black uppercase tracking-[.2em] text-tomato">Main services</p><h2 className="font-display text-4xl font-black tracking-tight">Everyday help, one guided request.</h2></div>{loading ? <Spinner label="Loading local services..." /> : error ? <ErrorState message={error} /> : categories.length === 0 ? <EmptyState title="The service board is empty." /> : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">{categories.map((category, index) => { const Icon = iconFor(category.slug); return <Link href="/register?role=client" key={category.id} className={`group min-h-[150px] border-2 border-ink p-4 shadow-hard-sm ${stickerColors[index % stickerColors.length]} ${index % 2 ? '-rotate-2' : 'rotate-2'}`}><Icon className="mb-7 h-8 w-8" /><span className="block font-display text-xl font-black leading-none">{category.name}</span><span className="mt-2 block text-xs font-bold opacity-70">{category.badgeCount ?? 0} local pros</span></Link>; })}</div>}</section>
    <section id="how-it-works" className="border-y-2 border-ink bg-teal px-4 py-14 text-sand sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-mustard">How it works</p><h2 className="font-display text-4xl font-black">From problem to solved.</h2></div><p className="max-w-sm text-sm leading-6 text-sand/75">A clear process keeps the right people and the right information together.</p></div><div className="grid gap-0 md:grid-cols-3">{[['01', 'Describe the problem', 'Tell us what is happening in plain language and confirm the guided analysis.'], ['02', 'Choose your professional', 'Compare nearby professionals, reviews, clear prices, and availability.'], ['03', 'Book with confidence', 'Pick a time, follow the request, and keep everything in one place.']].map(([number, title, text], index) => <div key={number} className={`border-2 border-sand/50 p-6 ${index === 1 ? 'bg-sand text-ink' : ''}`}><span className="font-display text-5xl font-black text-tomato">{number}</span><h3 className="mt-5 font-display text-2xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 opacity-75">{text}</p></div>)}</div></div></section>
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"><div className="md:col-span-3"><p className="text-xs font-black uppercase tracking-[.2em] text-tomato">Why ProxiService</p><h2 className="font-display text-4xl font-black">Local help, without the guesswork.</h2></div>{[['Verified local professionals', 'See real profiles, services, reviews, and availability before you book.'], ['Clear next steps', 'Our guided request turns a vague problem into a useful, shareable summary.'], ['A service you can follow', 'Keep requests, bookings, updates, and contact details together in your account.']].map(([title, text]) => <div key={title} className="border-2 border-ink bg-paper p-6 shadow-hard-sm"><BadgeCheck className="mb-5 h-8 w-8 text-teal" /><h3 className="font-display text-2xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-ink/65">{text}</p></div>)}</section>
  </div>;
}
