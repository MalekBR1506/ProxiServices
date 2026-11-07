import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { getSessionUser, unauthorized } from '@/server/auth';
import { ok, readJson, serviceErrorResponse } from '@/server/http';
import { bookingInclude, createBooking } from '@/server/services/bookings';
import { toBooking } from '@/server/services/serializers';

const createSchema = z.object({
  analysisId: z.string().min(1).max(30),
  providerId: z.string().min(1).max(30), serviceId: z.string().min(1).max(30),
  startAt: z.iso.datetime({ offset: true }), address: z.string().trim().min(3, 'Enter the job address.').max(255),
  lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().max(3000).default(''),
  problemSummary: z.string().trim().min(3, 'Describe the problem in a few words.').max(255).optional(),
}).strict();

/** Only the caller's own bookings: as client, or as provider. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const where = user.role === 'CLIENT' ? { clientId: user.id } : { provider: { userId: user.id } };
  const rows = await prisma.booking.findMany({ where, include: bookingInclude, orderBy: { startAt: 'asc' } });
  const now = new Date();
  return ok(rows.map((row) => toBooking(row, user, now)));
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const input = await readJson(request, createSchema);
  if (input instanceof NextResponse) return input;
  try {
    const booking = await createBooking(user, { ...input, startAt: new Date(input.startAt) });
    return ok(toBooking(booking, user), 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
