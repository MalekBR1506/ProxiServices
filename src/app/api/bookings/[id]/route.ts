import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, unauthorized } from '@/server/auth';
import { ok, readJson, serviceErrorResponse } from '@/server/http';
import { getBookingForViewer, performBookingAction, STATUS_ACTIONS } from '@/server/services/bookings';
import { toBooking } from '@/server/services/serializers';

const schema = z.object({ action: z.enum(STATUS_ACTIONS) }).strict();
type Ctx = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Ctx) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  try {
    return ok(toBooking(await getBookingForViewer(user, params.id), user));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const input = await readJson(request, schema);
  if (input instanceof NextResponse) return input;
  try {
    return ok(toBooking(await performBookingAction(user, params.id, input.action), user));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
