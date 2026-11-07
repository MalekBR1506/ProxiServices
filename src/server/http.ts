import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { ServiceError } from '@/server/services/errors';

export function fail(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** Parses a JSON body with a Zod schema. Returns the data, or a 400 response. */
export async function readJson<S extends z.ZodType>(request: NextRequest, schema: S): Promise<z.infer<S> | NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? 'Invalid input.');
  return parsed.data;
}

/** Turns a ServiceError into its HTTP response; rethrows anything unexpected. */
export function serviceErrorResponse(error: unknown) {
  if (error instanceof ServiceError) return fail(error.status, error.message);
  throw error;
}
