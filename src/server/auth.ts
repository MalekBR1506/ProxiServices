import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { SESSION_COOKIE } from '@/server/session-constants';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSigningKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters.');
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, role: string) {
  return new SignJWT({ role }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId)
    .setIssuedAt().setExpirationTime(`${SESSION_TTL_SECONDS}s`).sign(getSigningKey());
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSessionUser(request?: NextRequest) {
  const token = request ? request.cookies.get(SESSION_COOKIE)?.value : cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string') return null;
    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, phone: true, role: true, lat: true, lng: true, addressLabel: true },
    });
  } catch {
    return null;
  }
}

export function unauthorized(message = 'Sign in required.') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'You do not have permission to do this.') {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function badRequest(message = 'Invalid input.') {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}
