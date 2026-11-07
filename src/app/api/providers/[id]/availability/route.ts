import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, unauthorized } from '@/server/auth';
import { ok, readJson, serviceErrorResponse } from '@/server/http';
import { updateWorkingHours } from '@/server/services/providers';
import { TIME_PATTERN, toMinutes } from '@/lib/time';

const day = z.object({
  weekday: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  startTime: z.string().regex(TIME_PATTERN, 'Use HH:MM times.'),
  endTime: z.string().regex(TIME_PATTERN, 'Use HH:MM times.'),
}).strict().refine((d) => !d.enabled || toMinutes(d.endTime) - toMinutes(d.startTime) >= 30,
  'End time must be at least 30 minutes after start time.');

const schema = z.object({
  days: z.array(day).length(7).refine((days) => new Set(days.map((d) => d.weekday)).size === 7, 'Send each weekday once.'),
}).strict();

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const input = await readJson(request, schema);
  if (input instanceof NextResponse) return input;
  try {
    return ok(await updateWorkingHours(user, params.id, input.days));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
