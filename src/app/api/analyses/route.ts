import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, unauthorized } from '@/server/auth';
import { ok, readJson, serviceErrorResponse } from '@/server/http';
import { chatMessageSchema, type ChatMessage } from '@/server/services/ai-chat';
import { createProblemAnalysis } from '@/server/services/analyses';

const schema = z.object({ messages: z.array(chatMessageSchema).min(1).max(12) }).strict();

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const input = await readJson(request, schema);
  if (input instanceof NextResponse) return input;
  try {
    return ok(await createProblemAnalysis(user, input.messages as ChatMessage[]), 201);
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
