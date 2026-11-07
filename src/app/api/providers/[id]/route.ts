import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { getSessionUser, unauthorized } from '@/server/auth';
import { fail, ok, readJson, serviceErrorResponse } from '@/server/http';
import { updateProviderProfile } from '@/server/services/providers';
import { providerInclude, toProviderProfile } from '@/server/services/serializers';

const text = (max: number) => z.string().trim().max(max);

const serviceSchema = z.object({
  id: z.string().max(30).optional(),
  title: text(140).min(2, 'Each service needs a title.'),
  description: text(2000).default(''),
  price: z.coerce.number().min(0).max(100000),
  priceType: z.enum(['FIXED', 'HOURLY', 'ESTIMATE']),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  categorySlug: z.string().max(80).optional(),
}).strict();

const portfolioSchema = z.object({
  id: z.string().max(30).optional(), title: text(140).min(2, 'Each portfolio item needs a title.'), description: text(2000).default(''),
}).strict();

// Whitelist: only these fields can change. Rating, verification, counters and ownership cannot.
const updateSchema = z.object({
  bio: text(4000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  radiusKm: z.coerce.number().int().min(1).max(200).optional(),
  categories: z.array(z.string().max(80)).min(1, 'Choose at least one category.').max(6).optional(),
  services: z.array(serviceSchema).min(1, 'Keep at least one service.').max(20).optional(),
  portfolio: z.array(portfolioSchema).max(20).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), addressLabel: text(255).min(3, 'Enter your address.'),
  }).strict().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'No editable fields were supplied.');

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const provider = await prisma.provider.findUnique({ where: { id: params.id }, include: providerInclude });
  if (!provider) return fail(404, 'Provider not found.');
  return ok(toProviderProfile(provider));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const input = await readJson(request, updateSchema);
  if (input instanceof NextResponse) return input;
  try {
    return ok(toProviderProfile(await updateProviderProfile(user, params.id, input)));
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
