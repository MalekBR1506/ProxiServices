'use client';

import Link from 'next/link';
import AIProblemChat from '@/components/AIProblemChat';
import RoleGuard from '@/components/RoleGuard';
import { secondaryButton } from '@/components/ui';

export default function NewRequestPage() {
  return (
    <RoleGuard allowedRoles={['CLIENT']}>
      <div className="min-h-screen bg-sand px-4 py-8 paper-grain">
        <div className="mx-auto max-w-3xl space-y-5">
          <Link href="/client/dashboard" className={secondaryButton}>Back to my dashboard</Link>
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-tomato">New service request</p>
            <h1 className="font-display text-4xl font-black text-ink">Tell us what needs fixing</h1>
            <p className="mt-2 text-sm text-ink/65">Complete the analysis and confirm it before we show matching providers.</p>
          </div>
          <AIProblemChat />
        </div>
      </div>
    </RoleGuard>
  );
}
