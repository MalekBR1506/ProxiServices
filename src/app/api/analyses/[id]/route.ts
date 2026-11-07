import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/server/auth';
import { ok, serviceErrorResponse } from '@/server/http';
import { confirmProblemAnalysis, getProblemAnalysis } from '@/server/services/analyses';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  try {
    return ok(await getProblemAnalysis(user, params.id));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  try {
    return ok(await confirmProblemAnalysis(user, params.id));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
