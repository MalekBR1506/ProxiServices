import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { fail, ok } from '@/server/http';
import { getProviderSlots, MAX_SLOT_DAYS } from '@/server/services/availability';
import { DATE_PATTERN, tunisDateKey } from '@/lib/time';

const schema = z.object({
  serviceId: z.string().min(1).max(30),
  from: z.string().regex(DATE_PATTERN, 'Use YYYY-MM-DD for from.').optional(),
  days: z.coerce.number().int().min(1).max(MAX_SLOT_DAYS).default(7),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? 'Invalid slot query.');
  const { serviceId, days } = parsed.data;
  const today = tunisDateKey(new Date());
  const from = parsed.data.from && parsed.data.from > today ? parsed.data.from : today;
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { providerId: true, durationMin: true, active: true } });
  if (!service || !service.active || service.providerId !== params.id) return fail(404, 'Service not found for this provider.');
  const slots = await getProviderSlots(prisma, { providerId: params.id, durationMin: service.durationMin, fromDate: from, days });
  return ok({ serviceId, durationMinutes: service.durationMin, from, days: slots });
}
