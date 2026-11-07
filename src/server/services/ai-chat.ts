import { z } from 'zod';

export const CATEGORY_SLUGS = ['mechanic', 'cleaning', 'electrician', 'plumber', 'painter', 'carpenter'] as const;
export const chatMessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1000) }).strict();
export const aiResultSchema = z.object({ reply: z.string().trim().min(1).max(500), status: z.enum(['need_more', 'ready']), categorySlug: z.enum(CATEGORY_SLUGS).nullable(), urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']), summary: z.string().trim().max(255) }).strict();
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AIResult = z.infer<typeof aiResultSchema>;

const systemPrompt = `You are ProxiService's practical triage assistant for Greater Tunis. Understand English, French, Tunisian Derja in Latin or Arabic, and mixed messages. Classify into exactly one of mechanic, cleaning, electrician, plumber, painter, carpenter. Ask at most two short follow-up questions when unclear, then classify. Return JSON only: reply, status (need_more|ready), categorySlug (allowed slug or null), urgency (LOW|MEDIUM|HIGH), summary (one line, max 255 chars). HIGH means danger, flooding, smoke, sparks, gas, or an unsafe situation.`;
const words: Record<(typeof CATEGORY_SLUGS)[number], string[]> = {
  plumber: ['sink', 'leak', 'leaking', 'water', 'faucet', 'pipe', 'lavabo', 'fuite', 'eau', 'robinet', 'evier', 'ye9tor', 'y9tor', 'ta7t', 'تسرب', 'ماء', 'حنفية', 'مغسلة'],
  mechanic: ['car', 'vehicle', 'engine', 'brake', 'battery', 'motor', 'voiture', 'demarre', 'démarre', 'moteur', 'frein', 'batterie', 'tomobil', 'ma tkhademch', 'ما تخدمش', 'طوموبيل', 'كرهبة'],
  electrician: ['power', 'electric', 'electricity', 'outlet', 'socket', 'light', 'wiring', 'current', 'cutting', 'courant', 'electricite', 'électricité', 'prise', 'disjoncteur', 'كهرباء', 'ضو', 'يقطع', 'تقص'],
  cleaning: ['clean', 'cleaning', 'dirty', 'housekeeping', 'nettoyage', 'menage', 'ménage', 'sale', 'تنظيف', 'وسخ'],
  painter: ['paint', 'painting', 'wall', 'peinture', 'mur', 'دهان', 'حيط'],
  carpenter: ['wood', 'furniture', 'door', 'carpenter', 'bois', 'meuble', 'porte', 'menuisier', 'نجار', 'خشب', 'باب'],
};
const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const userText = (messages: ChatMessage) => messages;

export function classifyProblem(messages: ChatMessage[], forceReady = false): AIResult {
  const text = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ').replace(/\s+/g, ' ').trim();
  const normalized = normalize(text);
  const ranked = CATEGORY_SLUGS.map((category) => ({ category, score: words[category].filter((word) => normalized.includes(normalize(word))).length })).sort((a, b) => b.score - a.score);
  const categorySlug = ranked[0].score ? ranked[0].category : null;
  const urgency = /(fire|smoke|spark|gas|flood|danger|urgent|immediate|incendie|fumee|etincelle|gaz|inondation|urgence|خطر|حريق|دخان|غاز|فيضان)/i.test(normalized) ? 'HIGH' : /(today|tonight|now|asap|aujourd|maintenant|vite|tawa|اليوم|توا)/i.test(normalized) ? 'MEDIUM' : 'LOW';
  if (categorySlug) return { reply: 'I have enough to find the right local help.', status: 'ready', categorySlug, urgency, summary: text.slice(0, 255) };
  if (forceReady) return { reply: 'I could not identify the right service yet. Please edit your description and mention the item or trade involved.', status: 'need_more', categorySlug: null, urgency, summary: text.slice(0, 255) };
  const question = messages.filter((m) => m.role === 'assistant').length === 0 ? 'What needs attention, and where is it located?' : 'Is it a vehicle, water, electrical, cleaning, painting, or woodwork problem?';
  return { reply: question, status: 'need_more', categorySlug: null, urgency, summary: text.slice(0, 255) };
}

function parseJson(text: string) { const candidate = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0]; if (!candidate) throw new Error('No JSON'); return JSON.parse(candidate); }
async function providerCall(url: string, init: RequestInit) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 8000); try { const response = await fetch(url, { ...init, signal: controller.signal }); if (!response.ok) throw new Error(`AI provider error ${response.status}`); return response; } finally { clearTimeout(timer); } }

async function gemini(messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY?.trim(); if (!key) return null;
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash';
  const response = await providerCall(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }) });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return aiResultSchema.parse(parseJson(data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''));
}
async function groq(messages: ChatMessage[]) {
  const key = process.env.GROQ_API_KEY?.trim(); if (!key) return null;
  const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
  const response = await providerCall('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, ...messages] }) });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return aiResultSchema.parse(parseJson(data.choices?.[0]?.message?.content ?? ''));
}

export async function answerProblem(messages: ChatMessage[]) {
  const followUps = messages.filter((message) => message.role === 'assistant').length;
  for (const call of [gemini, groq]) { try { const result = await call(messages); if (result) return result.status === 'need_more' && followUps >= 2 ? classifyProblem(messages, true) : result; } catch { /* fall through to the next provider */ } }
  return classifyProblem(messages, followUps >= 2);
}
