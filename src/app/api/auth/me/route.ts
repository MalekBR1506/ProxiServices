import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/server/auth';
import { prisma } from '@/server/db';
import { providerInclude, toProviderProfile } from '@/server/services/serializers';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const provider = user.role === 'PROVIDER'
    ? await prisma.provider.findUnique({ where: { userId: user.id }, include: providerInclude }) : null;
  return NextResponse.json({ success: true, data: {
    user, providerProfile: provider ? toProviderProfile(provider) : null,
  } });
}
