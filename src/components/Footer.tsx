import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="tunisian-pattern border-t-2 border-ink text-ink">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div className="space-y-4"><Logo /><p className="max-w-xs text-sm leading-6 text-ink/70">Local help for the jobs that do not fit in a search box.</p><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">Made for Greater Tunis</p></div>
        <div><h2 className="mb-4 text-sm font-black uppercase tracking-[.15em] text-teal">Explore</h2><ul className="space-y-2 text-sm font-bold"><li><Link href="/#services" className="hover:text-tomato">Services</Link></li><li><Link href="/#how-it-works" className="hover:text-tomato">How it works</Link></li><li><Link href="/register?role=client" className="inline-flex items-center gap-1 hover:text-tomato">Find a Professional <ArrowUpRight className="h-3.5 w-3.5" /></Link></li></ul></div>
        <div><h2 className="mb-4 text-sm font-black uppercase tracking-[.15em] text-teal">Join</h2><ul className="space-y-2 text-sm font-bold"><li><Link href="/register?role=provider" className="hover:text-tomato">Become a Professional</Link></li><li><Link href="/login" className="hover:text-tomato">Login</Link></li><li><Link href="/register" className="hover:text-tomato">Sign up</Link></li></ul></div>
        <div><h2 className="mb-4 text-sm font-black uppercase tracking-[.15em] text-teal">Talk to us</h2><ul className="space-y-3 text-sm font-bold"><li className="flex items-center gap-2"><Phone className="h-4 w-4 text-tomato" />+216 55 000 000</li><li className="flex items-center gap-2"><Mail className="h-4 w-4 text-tomato" />hello@proxiservice.tn</li><li className="pt-2 text-xs font-medium text-ink/60">Sunday to Thursday, 08:30-18:00.</li></ul></div>
      </div>
      <div className="border-t-2 border-ink bg-sand/70"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs font-bold text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>(c) 2026 ProxiService</span><span>People first. Prices clear. No fuss.</span></div></div>
    </footer>
  );
}
