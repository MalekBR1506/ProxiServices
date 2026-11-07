import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from '@/server/session-constants';

function requiredRole(pathname: string): 'CLIENT' | 'PROVIDER' | null {
  if (pathname.startsWith('/provider/')) return 'PROVIDER';
  if (pathname.startsWith('/client/') || pathname === '/search') return 'CLIENT';
  return null;
}

export async function middleware(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || secret.length < 32) return NextResponse.redirect(loginUrl);

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    const role = requiredRole(request.nextUrl.pathname);
    if (role && payload.role !== role) {
      return NextResponse.redirect(new URL(payload.role === 'PROVIDER' ? '/provider/dashboard' : '/client/dashboard', request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = { matcher: ['/client/:path*', '/provider/:path*', '/bookings/:path*', '/search'] };
