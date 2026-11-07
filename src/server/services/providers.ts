import { Prisma } from '@/generated/prisma/client';
import type { PriceType } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { ServiceError } from '@/server/services/errors';
import { replaceWorkingHours, type WeekdayHours } from '@/server/services/availability';
import type { Viewer } from '@/server/services/bookings';
import { providerInclude } from '@/server/services/serializers';

type Db = Prisma.TransactionClient;

export interface ServiceInput {
  id?: string; title: string; description: string; price: number; priceType: PriceType; durationMinutes: number; categorySlug?: string;
}
export interface ProfileUpdate {
  bio?: string; experienceYears?: number; radiusKm?: number; categories?: string[];
  services?: ServiceInput[]; portfolio?: { id?: string; title: string; description: string }[];
  location?: { lat: number; lng: number; addressLabel: string };
}

/** Loads the caller's own provider profile row; 403 for anyone else. */
export async function getOwnProvider(db: Db, viewer: Viewer, providerId: string) {
  if (viewer.role !== 'PROVIDER') throw new ServiceError(403, 'Only providers can edit a provider profile.');
  const provider = await db.provider.findUnique({ where: { id: providerId }, include: { categories: { include: { category: true } } } });
  if (!provider) throw new ServiceError(404, 'Provider not found.');
  if (provider.userId !== viewer.id) throw new ServiceError(403, 'You can only edit your own provider profile.');
  return provider;
}

async function assertOwned(ids: (string | undefined)[], findOwned: (ids: string[]) => Promise<{ id: string }[]>, label: string) {
  const wanted = ids.filter((id): id is string => !!id);
  const owned = await findOwned(wanted);
  if (owned.length !== new Set(wanted).size) throw new ServiceError(403, `A ${label} does not belong to your profile.`);
  return wanted;
}

export async function updateProviderProfile(viewer: Viewer, providerId: string, input: ProfileUpdate) {
  return prisma.$transaction(async (tx) => {
    const provider = await getOwnProvider(tx, viewer, providerId);

    const slugs = [...new Set(input.categories ?? provider.categories.map((link) => link.category.slug))];
    const categories = await tx.category.findMany({ where: { slug: { in: slugs } } });
    if (categories.length !== slugs.length) throw new ServiceError(400, 'Unknown category.');
    const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    if (input.categories) {
      await tx.providerCategory.deleteMany({ where: { providerId } });
      await tx.providerCategory.createMany({ data: categories.map((c) => ({ providerId, categoryId: c.id })) });
    }

    if (input.services) {
      const keep = await assertOwned(input.services.map((s) => s.id),
        (ids) => tx.service.findMany({ where: { id: { in: ids }, providerId }, select: { id: true } }), 'service');
      const created: string[] = [];
      for (const service of input.services) {
        const categoryId = categoryIdBySlug.get(service.categorySlug ?? slugs[0]);
        if (!categoryId) throw new ServiceError(400, `"${service.title}" must use one of your categories.`);
        const data = {
          title: service.title, description: service.description, price: new Prisma.Decimal(service.price),
          priceType: service.priceType, durationMin: service.durationMinutes, categoryId, active: true,
        };
        if (service.id) await tx.service.update({ where: { id: service.id }, data });
        else created.push((await tx.service.create({ data: { ...data, providerId } })).id);
      }
      // Removed services are deactivated, not deleted: past bookings still reference them.
      await tx.service.updateMany({ where: { providerId, id: { notIn: [...keep, ...created] } }, data: { active: false } });
    } else if (input.categories) {
      await tx.service.updateMany({ where: { providerId, categoryId: { notIn: categories.map((c) => c.id) } }, data: { active: false } });
    }

    if (input.portfolio) {
      const keep = await assertOwned(input.portfolio.map((p) => p.id),
        (ids) => tx.portfolioItem.findMany({ where: { id: { in: ids }, providerId }, select: { id: true } }), 'portfolio item');
      await tx.portfolioItem.deleteMany({ where: { providerId, id: { notIn: keep } } });
      for (const { id, title, description } of input.portfolio) {
        if (id) await tx.portfolioItem.update({ where: { id }, data: { title, description } });
        else await tx.portfolioItem.create({ data: { providerId, title, description } });
      }
    }

    if (input.location) await tx.user.update({ where: { id: provider.userId }, data: input.location });

    await tx.provider.update({ where: { id: providerId }, data: {
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.experienceYears !== undefined && { experienceYears: input.experienceYears }),
      ...(input.radiusKm !== undefined && { radiusKm: input.radiusKm }),
    } });
    return tx.provider.findUniqueOrThrow({ where: { id: providerId }, include: providerInclude });
  });
}

export async function updateWorkingHours(viewer: Viewer, providerId: string, days: WeekdayHours[]) {
  return prisma.$transaction(async (tx) => {
    await getOwnProvider(tx, viewer, providerId);
    return replaceWorkingHours(tx, providerId, days);
  });
}
