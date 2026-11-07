'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { LocateFixed } from 'lucide-react';
import { inputClass } from '@/components/ui';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export interface PickedLocation { lat: number; lng: number; addressLabel: string }

/** Editable address + Leaflet pin + "Use my location". Used by registration and the provider profile. */
export default function LocationPicker({ value, onChange, label = 'Address' }: {
  value: PickedLocation; onChange: (next: PickedLocation) => void; label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const setPoint = useCallback((lat: number, lng: number) => onChange({ ...value, lat, lng }), [onChange, value]);

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) { setError('Location is not available in this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPoint(coords.latitude, coords.longitude),
      () => setError('Could not read your location. Click the map instead.'),
    );
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700">{label} *
        <input
          type="text" required minLength={3} maxLength={255} value={value.addressLabel}
          onChange={(e) => onChange({ ...value, addressLabel: e.target.value })}
          placeholder="Neighbourhood, city (e.g. La Marsa, Tunis)" className={`${inputClass} mt-1`}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Click the map to place your pin.</p>
        <button type="button" onClick={useMyLocation} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100">
          <LocateFixed className="w-3.5 h-3.5" /> Use my location
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      <div className="h-64 overflow-hidden rounded-xl">
        <MapComponent center={{ latitude: value.lat, longitude: value.lng }} radiusKm={1} providers={[]} onLocationSelect={setPoint} />
      </div>
      <p className="text-[11px] text-slate-500">Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</p>
    </div>
  );
}
