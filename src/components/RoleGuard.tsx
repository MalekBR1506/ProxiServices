'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentSession, type AuthSession } from '@/lib/auth-client';
import type { Role } from '@/types';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  allowIncompleteProvider?: boolean;
}

export default function RoleGuard({ allowedRoles, children, allowIncompleteProvider = false }: RoleGuardProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setSession(await getCurrentSession());
      setIsChecking(false);
    };
    void checkAuth();
    window.addEventListener('auth_change', checkAuth);
    return () => window.removeEventListener('auth_change', checkAuth);
  }, []);

  useEffect(() => {
    if (isChecking) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (session.user.role === 'PROVIDER' && !session.providerProfile && !allowIncompleteProvider) {
      router.replace('/provider/onboarding');
      return;
    }
    if (!allowedRoles.includes(session.user.role)) {
      router.replace(session.user.role === 'PROVIDER' ? '/provider/dashboard' : '/client/dashboard');
    }
  }, [allowedRoles, isChecking, router, session]);

  if (isChecking || !session || !allowedRoles.includes(session.user.role) || (session.user.role === 'PROVIDER' && !session.providerProfile && !allowIncompleteProvider)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <p className="text-sm font-bold text-ink/60">{isChecking ? 'Checking access...' : 'Redirecting...'}</p>
      </div>
    );
  }

  return <>{children}</>;
}
