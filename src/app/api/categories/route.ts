import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { providers: true } } } });
  return NextResponse.json({ success: true, data: categories.map(({ _count, ...category }) => ({ ...category, description: '', badgeCount: _count.providers })) });
}
