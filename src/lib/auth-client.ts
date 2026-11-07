'use client';

import { User, ProviderProfile } from '@/types';

export interface AuthSession {
  user: User;
  providerProfile?: ProviderProfile | null;
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!response.ok) return null;
    const result = await response.json();
    return result.success ? result.data as AuthSession : null;
  } catch {
    return null;
  }
}

export function saveSession(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth_change'));
}

export async function clearSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.dispatchEvent(new Event('auth_change'));
  }
}
