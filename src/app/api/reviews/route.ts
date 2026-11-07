import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, unauthorized } from '@/server/auth';
import { ok, readJson, serviceErrorResponse } from '@/server/http';
import { createReview } from '@/server/services/bookings';

const schema = z.object({
  bookingId: z.string().min(1).max(30),
  rating: z.coerce.number().int().min(1, 'Choose 1 to 5 stars.').max(5, 'Choose 1 to 5 stars.'),
  comment: z.string().trim().min(3, 'Write a short comment.').max(2000),
}).strict();

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const input = await readJson(request, schema);
  if (input instanceof NextResponse) return input;
  try {
    return ok(await createReview(user, input), 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
