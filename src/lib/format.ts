import type { BookingStatus, PriceType } from '@/types';

export const formatTnd = (amount: number) =>
  `${amount.toLocaleString('en-US', { maximumFractionDigits: 3 })} TND`;

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  FIXED: 'Fixed price', HOURLY: 'Per hour', ESTIMATE: 'Estimate',
};

/** "45 TND", "35 TND / hour", "From 250 TND". */
export function formatPrice(amount: number, type: PriceType) {
  if (type === 'HOURLY') return `${formatTnd(amount)} / hour`;
  if (type === 'ESTIMATE') return `From ${formatTnd(amount)}`;
  return formatTnd(amount);
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Waiting for provider', ACCEPTED: 'Accepted', REJECTED: 'Declined',
  IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
