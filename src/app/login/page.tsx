'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LogIn, 
  Mail, 
  Lock, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  Briefcase,
  UserCheck
} from 'lucide-react';
import { getCurrentSession, saveSession } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('client@proxiservice.tn');
  const [password, setPassword] = useState<string>('Demo1234');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    getCurrentSession().then((session) => {
      if (session) router.replace(session.user.role === 'PROVIDER' ? '/provider/dashboard' : '/client/dashboard');
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      saveSession();

      const home = data.data.user.role === 'PROVIDER' ? '/provider/dashboard' : '/client/dashboard';
      const next = new URLSearchParams(window.location.search).get('next');
      // Only follow same-site relative paths, and only into the area this role may open.
      const safeNext = next && next.startsWith('/') && !next.startsWith('//')
        && !next.startsWith(data.data.user.role === 'PROVIDER' ? '/client/' : '/provider/') ? next : null;
      router.push(safeNext ?? home);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234');
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-sand px-4 py-12 paper-grain sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center border-2 border-ink bg-mustard text-ink shadow-hard-sm">
          <MapPin className="w-6 h-6" />
        </div>
        <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Sign in to ProxiService
        </h2>
        <p className="text-xs text-ink/60 sm:text-sm">
          Open your customer account or provider dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Quick Demo Switcher */}
        <div className="mb-4 space-y-2 border-2 border-ink bg-mustard p-3.5 text-xs text-ink shadow-hard-sm">
          <span className="flex items-center gap-1.5 font-black text-ink">
            <UserCheck className="w-4 h-4" />
            Demo accounts (password: Demo1234)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('client@proxiservice.tn')}
              className="border-2 border-ink bg-paper p-2 text-left text-[11px] font-black text-ink transition hover:bg-teal hover:text-white"
            >
              Client demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('provider@proxiservice.tn')}
              className="border-2 border-ink bg-paper p-2 text-left text-[11px] font-black text-ink transition hover:bg-teal hover:text-white"
            >
              Plumber demo
            </button>
          </div>
        </div>

        <div className="space-y-6 border-2 border-ink bg-paper px-6 py-8 shadow-hard sm:px-8">
          {error && (
            <div className="flex items-center gap-2 border-2 border-tomato bg-tomato/10 p-3.5 text-xs text-tomato">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full border-2 border-ink bg-sand py-2.5 pl-10 pr-3.5 text-xs outline-none focus:bg-paper sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-2 border-ink bg-sand py-2.5 pl-10 pr-3.5 text-xs outline-none focus:bg-paper sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 border-2 border-ink bg-teal px-4 py-3 text-xs font-black text-white shadow-hard transition hover:bg-tomato disabled:opacity-50 sm:text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New here?{' '}
              <Link href="/register" className="font-black text-teal hover:text-tomato hover:underline">
                Create an account (client or provider)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
