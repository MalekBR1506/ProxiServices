import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { chatMessageSchema, answerProblem } from '@/server/services/ai-chat';
import { getSessionUser, unauthorized } from '@/server/auth';

const schema = z.object({ messages: z.array(chatMessageSchema).min(1).max(12) }).strict();
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'CLIENT') return unauthorized('A client session is required.');
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Send at least one valid message.' }, { status: 400 });
  try { return NextResponse.json({ success: true, data: await answerProblem(parsed.data.messages) }); }
  catch { return NextResponse.json({ success: false, error: 'The problem assistant is unavailable.' }, { status: 500 }); }
}
