import React from 'react';

export default function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="ProxiService">
      <svg aria-hidden="true" viewBox="0 0 44 44" className="h-10 w-10 shrink-0">
        <path d="M22 3C13.7 3 7 9.4 7 17.3c0 10.6 15 22.6 15 22.6s15-12 15-22.6C37 9.4 30.3 3 22 3Z" fill="#E4572E" stroke="#1C1917" strokeWidth="2" />
        <circle cx="22" cy="17" r="5" fill="#F4EFE6" stroke="#1C1917" strokeWidth="2" />
        <path d="M20 25.5h10.5M25.5 22v7M29 25.5l3-3M29 25.5l3 3" fill="none" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact && <span className={`font-display text-2xl font-black tracking-tight ${light ? 'text-sand' : 'text-ink'}`}>Proxi<span className={light ? 'text-mustard' : 'text-teal'}>Service</span></span>}
    </span>
  );
}
