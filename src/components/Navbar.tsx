'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LogIn, LogOut, Menu, Search, UserPlus, X } from 'lucide-react';
import { getCurrentSession, clearSession, type AuthSession } from '@/lib/auth-client';
import Logo from '@/components/Logo';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const sync = () => getCurrentSession().then(setSession);
    sync(); window.addEventListener('auth_change', sync);
    return () => window.removeEventListener('auth_change', sync);
  }, []);
  const isProvider = session?.user.role === 'PROVIDER';
  const links = isProvider
    ? [{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/provider/dashboard' }, { label: 'My requests', href: '/provider/dashboard#requests' }, { label: 'Profile', href: session.providerProfile ? `/providers/${session.providerProfile.id}` : '/provider/dashboard#profile' }]
    : session
    ? [{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/client/dashboard' }, { label: 'My bookings', href: '/client/dashboard#bookings' }, { label: 'Profile', href: '/client/dashboard#profile' }]
    : [{ label: 'Home', href: '/' }, { label: 'Services', href: '/#services' }, { label: 'How it works', href: '/#how-it-works' }];
  const logout = async () => { await clearSession(); setSession(null); router.push('/'); };

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-sand">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setOpen(false)}><Logo /></Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className={`border-b-2 py-2 text-sm font-bold transition-colors ${pathname === link.href ? 'border-tomato text-teal' : 'border-transparent text-ink/70 hover:border-tomato hover:text-ink'}`}>{link.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          {session ? <><span className="border-2 border-ink bg-paper px-3 py-2 text-xs font-bold shadow-hard-sm">{session.user.name.split(' ')[0]} <span className="text-tomato">/</span> {isProvider ? 'Professional' : 'Client'}</span><button type="button" onClick={logout} className="inline-flex items-center gap-1.5 border-2 border-transparent px-2 py-2 text-xs font-bold text-ink/70 hover:border-ink hover:text-tomato" aria-label="Log out"><LogOut className="h-4 w-4" /> Log out</button></> : <><Link href="/login" className="inline-flex items-center gap-1.5 px-2 py-2 text-sm font-bold text-ink hover:text-teal"><LogIn className="h-4 w-4" /> Login</Link><Link href="/register" className="inline-flex items-center gap-1.5 border-2 border-ink bg-tomato px-4 py-2 text-sm font-extrabold text-white shadow-hard-sm transition hover:bg-teal"><UserPlus className="h-4 w-4" /> Sign up</Link></>}
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="border-2 border-ink p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <div className="border-t-2 border-ink bg-paper px-4 py-4 md:hidden"><nav className="grid gap-1" aria-label="Mobile navigation">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-line px-2 py-3 text-sm font-bold"><Search className="h-4 w-4 text-teal" />{link.label}</Link>)}{session ? <button type="button" onClick={logout} className="mt-3 flex items-center gap-2 border-2 border-ink px-3 py-3 text-left text-sm font-bold text-tomato"><LogOut className="h-4 w-4" /> Log out</button> : <><Link href="/login" onClick={() => setOpen(false)} className="mt-3 flex items-center gap-2 border-2 border-ink px-3 py-3 text-sm font-bold"><LogIn className="h-4 w-4" /> Login</Link><Link href="/register" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-2 border-2 border-ink bg-tomato px-3 py-3 text-sm font-bold text-white"><UserPlus className="h-4 w-4" /> Sign up</Link></>}</nav></div>}
    </header>
  );
}
