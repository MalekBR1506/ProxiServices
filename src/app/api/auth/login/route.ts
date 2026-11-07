import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { createSession, setSessionCookie } from '@/server/auth';

const schema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()), password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Enter a valid email and password.' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ success: false, error: 'Email or password is incorrect.' }, { status: 401 });
  }
  const token = await createSession(user.id, user.role);
  const response = NextResponse.json({ success: true, data: { user: {
    id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
    lat: user.lat, lng: user.lng, addressLabel: user.addressLabel,
  } } });
  setSessionCookie(response, token);
  return response;
}
