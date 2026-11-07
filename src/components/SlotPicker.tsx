'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/use-load';
import { formatDayKey, formatTime } from '@/lib/time';
import type { DaySlots } from '@/types';
import { ErrorState, Spinner } from '@/components/ui';

interface SlotsResponse { days: DaySlots[]; durationMinutes: number }

interface SlotPickerProps {
  providerId: string;
  serviceId: string;
  selected: string | null;
  onSelect: (startAt: string) => void;
  /** Change this value to force a reload, e.g. after a slot was taken. */
  refreshKey?: number;
}

/** Next 7 days with free-slot counts, then the free start times of the chosen day. */
export default function SlotPicker({ providerId, serviceId, selected, onSelect, refreshKey = 0 }: SlotPickerProps) {
  const { data, error, loading, reload } = useLoad(
    () => api<SlotsResponse>(`/api/providers/${providerId}/slots?serviceId=${encodeURIComponent(serviceId)}&days=7`),
    [providerId, serviceId, refreshKey],
  );
  const [day, setDay] = useState<string | null>(null);

  // Default to the first day that has a free slot whenever the data changes.
  useEffect(() => {
    if (!data) return;
    if (!day || !data.days.some((d) => d.date === day)) setDay(data.days.find((d) => d.slots.length)?.date ?? data.days[0]?.date ?? null);
  }, [data, day]);

  if (loading) return <Spinner label="Loading free times..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.days.every((d) => d.slots.length === 0)) {
    return <p className="tunisian-pattern border-2 border-ink p-6 text-center text-sm font-bold text-ink/70">No free times in the next 7 days. Try another service or check back later.</p>;
  }
  const current = data.days.find((d) => d.date === day);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5" role="radiogroup" aria-label="Day">
        {data.days.map((d) => {
          const active = d.date === day;
          const [weekday, ...rest] = formatDayKey(d.date).split(' ');
          return (
            <button
              key={d.date} type="button" role="radio" aria-checked={active} disabled={!d.slots.length}
              onClick={() => setDay(d.date)}
              className={`border-2 px-1 py-2 text-center font-bold transition ${active ? 'border-ink bg-teal text-white shadow-hard-sm' : 'border-ink bg-paper text-ink hover:-translate-y-0.5 hover:bg-mustard'} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className="block text-[11px] font-semibold uppercase">{weekday}</span>
              <span className="block text-sm font-bold">{rest.join(' ')}</span>
              <span className={`block text-[10px] ${active ? 'text-white/80' : 'text-ink/50'}`}>{d.slots.length ? `${d.slots.length} free` : 'Closed'}</span>
            </button>
          );
        })}
      </div>
      {current && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Start time">
          {current.slots.map((slot) => (
            <button
              key={slot} type="button" role="radio" aria-checked={selected === slot} onClick={() => onSelect(slot)}
              className={`border-2 px-2 py-2 text-sm font-black transition ${selected === slot ? 'border-ink bg-teal text-white shadow-hard-sm' : 'border-teal bg-paper text-teal hover:bg-mustard hover:text-ink'} ${selected ? '' : 'decoration-tomato'}`}
            >
              {formatTime(slot)}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] font-bold text-ink/50">Times are shown in Tunis time.</p>
    </div>
  );
}
