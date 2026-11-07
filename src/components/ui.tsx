'use client';

import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { BookingStatus } from '@/types';
import { STATUS_LABEL } from '@/lib/format';

export function Spinner({ label = 'Loading...' }: { label?: string }) { return <div role="status" className="flex flex-col items-center gap-3 py-16 text-ink/60"><div className="h-9 w-9 animate-spin border-4 border-teal border-t-transparent" /><p className="text-sm font-bold">{label}</p></div>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div role="alert" className="paper-grain border-2 border-ink bg-paper px-6 py-12 text-center shadow-hard-sm"><AlertTriangle className="mx-auto mb-3 h-8 w-8 text-tomato" /><p className="text-sm font-bold text-ink">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 border-2 border-ink bg-tomato px-4 py-2 text-sm font-bold text-white shadow-hard-sm">Try again</button>}</div>; }
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="tunisian-pattern border-2 border-dashed border-teal px-6 py-12 text-center"><Inbox className="mx-auto mb-3 h-8 w-8 text-teal" /><p className="font-display text-xl font-bold text-ink">{title}</p>{children && <div className="mt-2 text-sm text-ink/65">{children}</div>}</div>; }
const STATUS_STYLE: Record<BookingStatus, string> = { PENDING: 'bg-mustard text-ink', ACCEPTED: 'bg-teal text-white', IN_PROGRESS: 'bg-teal text-white', COMPLETED: 'bg-success text-white', REJECTED: 'bg-tomato text-white', CANCELLED: 'bg-ink text-sand' };
export function StatusBadge({ status }: { status: BookingStatus }) { return <span className={`ink-stamp inline-flex px-2 py-1 text-[10px] font-black uppercase ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>; }
export function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) { const cls = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-24 w-24 text-3xl' }[size]; return <div aria-hidden className={`${cls} grid shrink-0 place-items-center border-2 border-ink bg-mustard font-display font-black text-ink`}>{initials}</div>; }
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: React.ReactNode }) { const cls = { error: 'border-tomato bg-tomato/10 text-tomato', success: 'border-success bg-success/10 text-success', info: 'border-teal bg-teal/10 text-teal' }[tone]; return <div role={tone === 'error' ? 'alert' : 'status'} className={`border-2 px-4 py-3 text-sm font-bold ${cls}`}>{children}</div>; }
export const inputClass = 'w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink/45 focus:border-tomato focus:outline-none';
export const primaryButton = 'inline-flex items-center justify-center gap-2 border-2 border-ink bg-teal px-4 py-2.5 text-sm font-extrabold text-white shadow-hard-sm transition hover:bg-tomato active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButton = 'inline-flex items-center justify-center gap-2 border-2 border-ink bg-paper px-4 py-2.5 text-sm font-extrabold text-ink shadow-hard-sm transition hover:bg-mustard disabled:opacity-50';
export const dangerButton = 'inline-flex items-center justify-center gap-2 border-2 border-ink bg-tomato px-4 py-2.5 text-sm font-extrabold text-white shadow-hard-sm transition hover:bg-ink disabled:opacity-50';
