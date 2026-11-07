import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { providerInclude, toProviderProfile } from '@/server/services/serializers';
import { addDaysToKey, tunisDateKey, tunisInstant } from '@/lib/time';
import { computeSlots } from '@/server/services/availability';
import { calculateMatchScore, type MatchUrgency } from '@/server/services/matching';
import { getSessionUser, unauthorized } from '@/server/auth';
import { getConfirmedAnalysis } from '@/server/services/analyses';

const schema = z.object({
  analysisId: z.string().min(1).max(30),
  lat: z.coerce.number().min(-90).max(90).default(36.8065),
  lng: z.coerce.number().min(-180).max(180).default(10.1815),
  radius: z.coerce.number().min(1).max(200).default(25),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['match', 'distance', 'rating', 'price_asc', 'reviews']).default('match'),
  query: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid search filters.' }, { status: 400 });
  const filter = parsed.data;
  let analysis;
  try {
    analysis = await getConfirmedAnalysis(user, filter.analysisId);
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? Number((error as { status: number }).status) : 400;
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Analysis is required.' }, { status });
  }
  const rows = await prisma.provider.findMany({
    where: {
      categories: { some: { category: { slug: analysis.categorySlug } } },
      ...(filter.minRating !== undefined ? { ratingAvg: { gte: filter.minRating } } : {}),
      ...(filter.query ? { OR: [
        { user: { name: { contains: filter.query } } }, { bio: { contains: filter.query } },
        { services: { some: { active: true, OR: [{ title: { contains: filter.query } }, { description: { contains: filter.query } }] } } },
        { categories: { some: { category: { name: { contains: filter.query } } } } },
      ] } : {}),
    },
    include: providerInclude,
  });
  const point = { latitude: filter.lat, longitude: filter.lng };
  const candidates = rows.map((row) => ({ row, profile: toProviderProfile(row, point) }))
    .filter(({ profile }) => (profile.distanceKm ?? Infinity) <= Math.min(filter.radius, profile.operationalRadiusKm))
    .filter(({ profile }) => filter.maxPrice === undefined || profile.services.some((service) => service.price <= filter.maxPrice!));
  const providerIds = candidates.map(({ row }) => row.id);
  const now = new Date();
  const today = tunisDateKey(now);
  const busyRows = providerIds.length ? await prisma.booking.findMany({
    where: { providerId: { in: providerIds }, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] }, startAt: { lt: tunisInstant(addDaysToKey(today, 7), 0) }, endAt: { gt: tunisInstant(today, 0) } },
    select: { providerId: true, startAt: true, endAt: true },
  }) : [];
  const prices = candidates.flatMap(({ profile }) => profile.services.map((service) => service.price));
  const priceMin = Math.min(...prices, 0);
  const priceMax = Math.max(...prices, priceMin);
  const averagePrice = prices.length ? prices.reduce((total, price) => total + price, 0) / prices.length : priceMin;
  const profiles = candidates.map(({ row, profile }) => {
    const busy = busyRows.filter((booking) => booking.providerId === row.id);
    const available = profile.services.flatMap((service) => computeSlots({ hours: profile.availability, durationMin: service.durationMinutes, fromDate: today, days: 7, busy, now })).flatMap((day) => day.slots.length ? [day] : []);
    const firstFreeDay = available.length ? Math.min(...available.map((day) => day.date === today ? 0 : day.date === addDaysToKey(today, 1) ? 1 : 2)) : -1;
    const availabilityScore = firstFreeDay < 0 ? 0 : firstFreeDay < 2 ? 1 : 0.6;
    const availabilityReason = firstFreeDay === 0 ? 'Free today' : firstFreeDay === 1 ? 'Free tomorrow' : firstFreeDay > 1 ? 'Free within 7 days' : 'No slots this week';
    const minPrice = Math.min(...profile.services.map((service) => service.price), priceMax);
    const match = calculateMatchScore({ distanceKm: profile.distanceKm ?? Infinity, radiusKm: profile.operationalRadiusKm, ratingAvg: profile.ratingAverage, ratingCount: profile.reviewCount, minPrice, jobsDone: profile.jobsDone, availabilityScore, availabilityReason }, { priceMin, priceMax, averagePrice, urgency: analysis.urgency as MatchUrgency });
    return toProviderProfile(row, point, match);
  });
  const getPrice = (profile: typeof profiles[number]) => Math.min(...profile.services.map((service: any) => service.price), Infinity);
  profiles.sort((a, b) => filter.sortBy === 'rating' ? b.ratingAverage - a.ratingAverage
    : filter.sortBy === 'reviews' ? b.reviewCount - a.reviewCount
    : filter.sortBy === 'price_asc' ? getPrice(a) - getPrice(b)
    : filter.sortBy === 'distance' ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    : (b.matchScore ?? 0) - (a.matchScore ?? 0));
  return NextResponse.json({ success: true, meta: {
    center: { latitude: filter.lat, longitude: filter.lng }, radiusKm: filter.radius, totalFound: profiles.length,
    analysis: { categorySlug: analysis.categorySlug, urgency: analysis.urgency, summary: analysis.summary },
  }, data: profiles });
}
