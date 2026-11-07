'use client';

import React, { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { toMinutes, WEEKDAYS } from '@/lib/time';
import type { WorkingHours } from '@/types';
import { Notice, inputClass, primaryButton } from '@/components/ui';

interface DayRow { weekday: number; enabled: boolean; startTime: string; endTime: string }
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

function toRows(hours: WorkingHours[]): DayRow[] {
  return ORDER.map((weekday) => {
    const range = hours.find((h) => h.weekday === weekday);
    return range ? { weekday, enabled: true, startTime: range.startTime, endTime: range.endTime } : { weekday, enabled: false, startTime: '08:00', endTime: '17:00' };
  });
}

/** Weekly working hours: one on/off switch and start/end per weekday. Times are Tunis time. */
export default function AvailabilityEditor({ providerId, initial, onSaved }: { providerId: string; initial: WorkingHours[]; onSaved: () => void }) {
  const [rows, setRows] = useState<DayRow[]>(() => toRows(initial));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  const update = (weekday: number, patch: Partial<DayRow>) => {
    setMessage(null);
    setRows((list) => list.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  };
  const invalid = rows.find((r) => r.enabled && toMinutes(r.endTime) - toMinutes(r.startTime) < 30);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await api(`/api/providers/${providerId}/availability`, { method: 'PUT', body: { days: rows } });
      setMessage({ tone: 'success', text: 'Working hours saved. Clients now see the new free times.' });
      onSaved();
    } catch (err) {
      setMessage({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Weekly working hours</h2>
        <p className="text-sm text-slate-500">Clients can book free times inside these hours. Existing bookings are not changed.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((row) => {
          const rowInvalid = row === invalid;
          return (
            <li key={row.weekday} className="py-3 flex flex-wrap items-center gap-3">
              <label className="w-36 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={row.enabled} onChange={(e) => update(row.weekday, { enabled: e.target.checked })} />
                {WEEKDAYS[row.weekday]}
              </label>
              {row.enabled ? (
                <div className="flex items-center gap-2">
                  <input type="time" step={900} aria-label={`${WEEKDAYS[row.weekday]} start`} className={`${inputClass} w-32`} value={row.startTime} onChange={(e) => update(row.weekday, { startTime: e.target.value })} required />
                  <span className="text-slate-400">to</span>
                  <input type="time" step={900} aria-label={`${WEEKDAYS[row.weekday]} end`} className={`${inputClass} w-32 ${rowInvalid ? 'border-rose-400' : ''}`} value={row.endTime} onChange={(e) => update(row.weekday, { endTime: e.target.value })} required />
                </div>
              ) : <span className="text-sm text-slate-400">Closed</span>}
              {rowInvalid && <span className="text-xs text-rose-700">End must be at least 30 min after start.</span>}
            </li>
          );
        })}
      </ul>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <button type="submit" className={primaryButton} disabled={saving || !!invalid}>{saving ? 'Saving...' : 'Save hours'}</button>
    </form>
  );
}
