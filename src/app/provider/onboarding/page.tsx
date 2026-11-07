'use client';

import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import RoleGuard from '@/components/RoleGuard';
import { primaryButton } from '@/components/ui';

export default function ProviderOnboardingPage() {
  return <RoleGuard allowedRoles={['PROVIDER']} allowIncompleteProvider><div className="min-h-[65vh] bg-sand px-4 py-16 paper-grain"><div className="mx-auto max-w-xl border-2 border-ink bg-paper p-8 text-center shadow-hard"><BriefcaseBusiness className="mx-auto h-10 w-10 text-teal" /><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-tomato">Professional setup</p><h1 className="mt-2 font-display text-4xl font-black">Complete your professional profile.</h1><p className="mt-4 text-sm leading-6 text-ink/65">Add your services, prices, location, and availability before clients can find or contact you.</p><Link href="/register?role=provider&setup=1" className={`${primaryButton} mt-7`}>Continue setup <ArrowRight className="h-4 w-4" /></Link></div></div></RoleGuard>;
}
