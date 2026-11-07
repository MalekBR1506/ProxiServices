'use client';

import React, { useEffect, useRef } from 'react';
import { ProviderProfile } from '@/types';
import { formatDistance } from '@/lib/geo';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));

interface MapComponentProps {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  providers: ProviderProfile[];
  selectedProviderId?: string | null;
  onSelectProvider?: (id: string) => void;
  onLocationSelect?: (latitude: number, longitude: number) => void;
}

export default function MapComponent({ center, radiusKm, providers, selectedProviderId, onSelectProvider, onLocationSelect }: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    let active = true;
    import('leaflet').then((L) => {
      if (!active) return;
      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, { center: [center.latitude, center.longitude], zoom: 12, scrollWheelZoom: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
        map.on('click', (event: any) => onLocationSelectRef.current?.(event.latlng.lat, event.latlng.lng));
      }
      const map = mapInstanceRef.current;
      const markers = markersLayerRef.current;
      if (!map || !markers) return;
      map.setView([center.latitude, center.longitude], 12);
      markers.clearLayers();
      const userIcon = L.divIcon({ className: 'user-marker', html: '<div style="background:#0F5257;width:18px;height:18px;border-radius:50%;border:3px solid #F4EFE6;box-shadow:3px 3px 0 #1C1917"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker([center.latitude, center.longitude], { icon: userIcon }).addTo(markers).bindPopup('<b>Your selected location</b>');
      radiusCircleRef.current?.remove();
      radiusCircleRef.current = L.circle([center.latitude, center.longitude], { radius: radiusKm * 1000, color: '#0F5257', fillColor: '#F2B134', fillOpacity: 0.12, weight: 2, dashArray: '6, 6' }).addTo(markers);
      providers.forEach((provider) => {
        const selected = provider.id === selectedProviderId;
        const score = provider.matchScore ?? 0;
        const pinColor = selected ? '#0F5257' : score >= 80 ? '#2F7D4F' : score >= 60 ? '#F2B134' : '#E4572E';
        const label = provider.matchScore !== undefined ? `${provider.matchScore}% match` : `${provider.ratingAverage.toFixed(1)} stars`;
        const icon = L.divIcon({ className: 'provider-custom-pin', html: `<div style="background:${pinColor};color:${selected || score < 60 ? '#fff' : '#1C1917'};padding:4px 8px;border-radius:0;font-size:11px;font-weight:800;border:2px solid #1C1917;box-shadow:3px 3px 0 #1C1917;white-space:nowrap;cursor:pointer;transform:scale(${selected ? 1.15 : 1})"><span>${label}</span> <span>-</span> <span>${escapeHtml(provider.name.split(' ')[0])}</span></div>`, iconSize: [100, 30], iconAnchor: [50, 15] });
        const marker = L.marker([provider.latitude, provider.longitude], { icon }).addTo(markers);
        marker.bindPopup(`<div style="font-family:inherit;width:220px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:44px;height:44px;background:#F2B134;color:#1C1917;display:grid;place-items:center;font-weight:800;border:2px solid #1C1917">${escapeHtml(provider.avatar)}</div><div><h4 style="margin:0;font-size:14px;font-weight:800;color:#1C1917">${escapeHtml(provider.name)}</h4><p style="margin:0;font-size:11px;color:#0F5257;font-weight:800">${escapeHtml(provider.categories[0]?.name || 'Provider')}</p><div style="font-size:11px;color:#57534E">${formatDistance(provider.distanceKm)}</div></div></div><p style="font-size:11px;color:#57534E;margin:0 0 10px;line-height:1.3">${escapeHtml(provider.bio.substring(0, 75))}...</p><a href="/providers/${provider.id}" style="display:block;text-align:center;background:#0F5257;color:white;text-decoration:none;padding:7px 10px;border:2px solid #1C1917;font-size:11px;font-weight:800">View profile</a></div>`);
        marker.on('click', () => onSelectProvider?.(provider.id));
        if (selected) marker.openPopup();
      });
    });
    return () => { active = false; };
  }, [center, radiusKm, providers, selectedProviderId, onSelectProvider]);

  return <div className="relative h-full min-h-[420px] w-full overflow-hidden border-2 border-ink shadow-hard-sm"><div ref={mapContainerRef} className="h-full w-full" /></div>;
}
