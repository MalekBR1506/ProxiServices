import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { ServiceError } from '@/server/services/errors';
import { answerProblem, chatMessageSchema, type AIResult, type ChatMessage } from '@/server/services/ai-chat';
import type { Viewer } from '@/server/services/bookings';

export async function createProblemAnalysis(viewer: Viewer, messages: ChatMessage[]) {
  if (viewer.role !== 'CLIENT') throw new ServiceError(403, 'Only clients can analyze a service request.');
  const result = await answerProblem(messages);
  if (result.status !== 'ready' || !result.categorySlug) {
    return { id: null, result };
  }
  const analysis = await prisma.problemAnalysis.create({
    data: {
      clientId: viewer.id,
      categorySlug: result.categorySlug,
      urgency: result.urgency,
      summary: result.summary || 'General home service request',
      messages: messages.map((message) => chatMessageSchema.parse(message)) as unknown as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return { id: analysis.id, result };
}

export async function confirmProblemAnalysis(viewer: Viewer, id: string) {
  if (viewer.role !== 'CLIENT') throw new ServiceError(403, 'Only clients can confirm a service request.');
  const analysis = await prisma.problemAnalysis.findUnique({ where: { id } });
  if (!analysis || analysis.clientId !== viewer.id) throw new ServiceError(404, 'Analysis not found.');
  if (analysis.status === 'EXPIRED') throw new ServiceError(400, 'This analysis has expired. Start a new request.');
  return prisma.problemAnalysis.update({
    where: { id },
    data: { status: 'CONFIRMED', confirmedAt: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
}

export async function getProblemAnalysis(viewer: Viewer, id: string) {
  if (viewer.role !== 'CLIENT') throw new ServiceError(403, 'Only clients can access service analyses.');
  const analysis = await prisma.problemAnalysis.findUnique({ where: { id } });
  if (!analysis || analysis.clientId !== viewer.id) throw new ServiceError(404, 'Analysis not found.');
  return {
    id: analysis.id,
    status: analysis.status,
    categorySlug: analysis.categorySlug,
    urgency: analysis.urgency,
    summary: analysis.summary,
    messages: analysis.messages,
    expiresAt: analysis.expiresAt,
  };
}

export async function getConfirmedAnalysis(viewer: Viewer, id: string) {
  if (viewer.role !== 'CLIENT') throw new ServiceError(403, 'Only clients can access matching.');
  const analysis = await prisma.problemAnalysis.findUnique({ where: { id } });
  if (!analysis || analysis.clientId !== viewer.id) throw new ServiceError(404, 'Analysis not found.');
  if (analysis.status !== 'CONFIRMED') throw new ServiceError(400, 'Confirm your problem analysis before matching providers.');
  if (analysis.expiresAt && analysis.expiresAt <= new Date()) throw new ServiceError(400, 'This analysis has expired. Start a new request.');
  return analysis;
}

export type AnalysisResult = AIResult;
