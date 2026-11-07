import type { Prisma } from '@/generated/prisma/client';
import { calculateHaversineDistance } from '@/lib/geo';
import { allowedActions, PHONE_VISIBLE, type BookingRow, type Viewer } from '@/server/services/bookings';
import type { Booking, ProviderProfile } from '@/types';
import type { MatchResult } from '@/server/services/matching';

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export const providerInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, lat: true, lng: true, addressLabel: true } },
  categories: { include: { category: true } },
  services: { where: { active: true }, include: { category: true }, orderBy: { price: 'asc' } },
  portfolio: { orderBy: { createdAt: 'desc' } },
  reviews: { include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
  availability: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] },
} satisfies Prisma.ProviderInclude;
export type ProviderRow = Prisma.ProviderGetPayload<{ include: typeof providerInclude }>;

export function toProviderProfile(row: ProviderRow, point?: { latitude: number; longitude: number }, match?: MatchResult): ProviderProfile {
  const latitude = row.user.lat ?? 36.8065;
  const longitude = row.user.lng ?? 10.1815;
  return {
    id: row.id, userId: row.userId, name: row.user.name, avatar: initials(row.user.name),
    addressText: row.user.addressLabel ?? 'Greater Tunis, Tunisia',
    latitude, longitude, operationalRadiusKm: row.radiusKm, isVerified: row.verified,
    ratingAverage: row.ratingAvg, reviewCount: row.ratingCount, jobsDone: row.jobsDone,
    bio: row.bio, experienceYears: row.experienceYears,
    categories: row.categories.map(({ category }) => ({ id: category.id, slug: category.slug, name: category.name, icon: category.icon })),
    services: row.services.map((service) => ({
      id: service.id, title: service.title, description: service.description,
      price: Number(service.price), priceType: service.priceType, durationMinutes: service.durationMin,
      categorySlug: service.category.slug,
    })),
    portfolio: row.portfolio.map((item) => ({ id: item.id, title: item.title, description: item.description })),
    reviews: row.reviews.map((review) => ({
      id: review.id, clientName: review.client.name, clientAvatar: initials(review.client.name),
      rating: review.rating, comment: review.comment, createdAt: review.createdAt.toISOString(),
    })),
    availability: row.availability.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
    distanceKm: point ? calculateHaversineDistance(point.latitude, point.longitude, latitude, longitude) : undefined,
    matchScore: match?.score,
    matchBreakdown: match?.breakdown,
    matchReasons: match?.reasons,
  };
}

const iso = (date: Date | null) => date?.toISOString() ?? null;

/** Shapes a booking for one viewer: hides phone numbers until acceptance and lists the viewer's allowed actions. */
export function toBooking(row: BookingRow, viewer: Viewer, now = new Date()): Booking {
  const showPhone = PHONE_VISIBLE.includes(row.status);
  return {
    id: row.id, status: row.status,
    service: { id: row.service.id, title: row.service.title, durationMinutes: row.service.durationMin },
    price: Number(row.price), priceType: row.priceType,
    startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString(),
    address: row.address, lat: row.lat, lng: row.lng, notes: row.notes, problemSummary: row.problemSummary,
    client: { id: row.client.id, name: row.client.name, avatar: initials(row.client.name), phone: showPhone ? row.client.phone : null },
    provider: { id: row.provider.id, name: row.provider.user.name, avatar: initials(row.provider.user.name), phone: showPhone ? row.provider.user.phone : null },
    timeline: {
      createdAt: row.createdAt.toISOString(), acceptedAt: iso(row.acceptedAt), rejectedAt: iso(row.rejectedAt),
      startedAt: iso(row.startedAt), completedAt: iso(row.completedAt), cancelledAt: iso(row.cancelledAt),
    },
    review: row.review ? { id: row.review.id, rating: row.review.rating, comment: row.review.comment, createdAt: row.review.createdAt.toISOString() } : null,
    actions: allowedActions(viewer.role, { status: row.status, startAt: row.startAt, hasReview: !!row.review }, now),
  };
}
