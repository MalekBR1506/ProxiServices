'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Booking, BookingStatus } from '@/types';
import { formatPrice } from '@/lib/format';
import { formatDay, formatTime } from '@/lib/time';
import { Avatar, StatusBadge } from '@/components/ui';

export const ACTIVE_STATUSES: BookingStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];

/** One booking row linking to /bookings/[id]. `party` picks whose name is shown. */
export default function BookingListItem({ booking, party, children }: { booking: Booking; party: 'client' | 'provider'; children?: React.ReactNode }) {
  const other = booking[party];
  return (
    <li className="border-2 border-ink bg-paper shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-mustard">
      <Link href={`/bookings/${booking.id}`} className="flex items-center gap-4 p-4">
        <Avatar initials={other.avatar} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">{booking.service.title}</p>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-xs text-slate-600 truncate">{other.name} · {booking.problemSummary}</p>
          <p className="text-xs text-slate-500">{formatDay(booking.startAt)}, {formatTime(booking.startAt)} · {formatPrice(booking.price, booking.priceType)}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </Link>
      {children && <div className="px-4 pb-4 -mt-1 flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}
