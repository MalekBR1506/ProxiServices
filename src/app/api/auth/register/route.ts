import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { createSession, setSessionCookie } from '@/server/auth';
import { toProviderProfile, providerInclude } from '@/server/services/serializers';

const serviceSchema = z.object({
  title: z.string().trim().min(2).max(140), description: z.string().trim().max(2000).default(''),
  price: z.coerce.number().min(0).max(100000), priceType: z.enum(['FIXED', 'HOURLY', 'ESTIMATE']),
  durationMinutes: z.coerce.number().int().min(15).max(1440).default(60),
});
const portfolioSchema = z.object({
  title: z.string().trim().min(2).max(140), description: z.string().trim().max(2000).default(''),
});
const schema = z.object({
  name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  phone: z.string().trim().min(6).max(30), password: z.string().min(8).max(72),
  role: z.enum(['CLIENT', 'PROVIDER']).default('CLIENT'),
  addressLabel: z.string().trim().max(255).default('Greater Tunis, Tunisia'),
  lat: z.coerce.number().min(-90).max(90).default(36.8065), lng: z.coerce.number().min(-180).max(180).default(10.1815),
  categorySlug: z.string().trim().min(1).optional(), bio: z.string().trim().max(4000).default(''),
  experienceYears: z.coerce.number().int().min(0).max(80).default(0),
  operationalRadiusKm: z.coerce.number().int().min(1).max(200).default(20),
  services: z.array(serviceSchema).max(20).default([]),
  portfolio: z.array(portfolioSchema).max(20).default([]),
}).superRefine((data, ctx) => {
  if (data.role === 'PROVIDER' && !data.categorySlug) ctx.addIssue({ code: 'custom', message: 'Choose a service category.', path: ['categorySlug'] });
  if (data.role === 'PROVIDER' && data.services.length === 0) ctx.addIssue({ code: 'custom', message: 'Add at least one service.', path: ['services'] });
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, { status: 400 });
  const input = parsed.data;
  const category = input.role === 'PROVIDER'
    ? await prisma.category.findUnique({ where: { slug: input.categorySlug } }) : null;
  if (input.role === 'PROVIDER' && !category) return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 400 });

  try {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name, email: input.email.toLowerCase(), phone: input.phone, passwordHash,
        role: input.role, lat: input.lat, lng: input.lng, addressLabel: input.addressLabel,
        ...(input.role === 'PROVIDER' ? { provider: { create: {
          bio: input.bio, experienceYears: input.experienceYears, radiusKm: input.operationalRadiusKm,
          categories: { create: [{ categoryId: category!.id }] },
          services: { create: input.services.map((service) => ({
            title: service.title, description: service.description, price: new Prisma.Decimal(service.price),
            priceType: service.priceType, durationMin: service.durationMinutes, categoryId: category!.id,
          })) },
          portfolio: { create: input.portfolio },
          availability: { create: Array.from({ length: 6 }, (_, index) => ({ weekday: index + 1, startTime: '08:30', endTime: '17:30' })) },
        } } } : {}),
      },
    });
    const token = await createSession(user.id, user.role);
    let profile = null;
    if (input.role === 'PROVIDER') {
      const row = await prisma.provider.findUnique({ where: { userId: user.id }, include: providerInclude });
      if (row) profile = toProviderProfile(row);
    }
    const response = NextResponse.json({ success: true, data: {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
        lat: user.lat, lng: user.lng, addressLabel: user.addressLabel }, providerProfile: profile,
    } }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }
    console.error('Registration error', error);
    return NextResponse.json({ success: false, error: 'Could not create account.' }, { status: 500 });
  }
}
