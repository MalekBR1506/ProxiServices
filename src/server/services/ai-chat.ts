import { z } from 'zod';

export const CATEGORY_SLUGS = ['mechanic', 'cleaning', 'electrician', 'plumber', 'painter', 'carpenter'] as const;
export const chatMessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1000) }).strict();
export const aiResultSchema = z.object({ reply: z.string().trim().min(1).max(500), status: z.enum(['need_more', 'ready']), categorySlug: z.enum(CATEGORY_SLUGS).nullable(), urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']), summary: z.string().trim().max(255) }).strict();
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AIResult = z.infer<typeof aiResultSchema>;

const systemPrompt = `You are ProxiService's practical triage assistant for Greater Tunis. Understand English, French, Tunisian Derja in Latin or Arabic, Arabizi numerals (such as 3, 5, 7, and 9), mixed languages, abbreviations, phonetic spellings, typos, and missing accents. Infer the intended meaning from context; do not reject a message just because it is misspelled. Classify into exactly one of mechanic, cleaning, electrician, plumber, painter, carpenter. Ask at most two short follow-up questions only when the trade is genuinely unclear, then classify. Return JSON only: reply, status (need_more|ready), categorySlug (allowed slug or null), urgency (LOW|MEDIUM|HIGH), summary (one line, max 255 chars). HIGH means danger, flooding, smoke, sparks, gas, or an unsafe situation.`;
const words: Record<(typeof CATEGORY_SLUGS)[number], string[]> = {
  plumber: ['sink', 'washbasin', 'leak', 'leaking', 'drip', 'dripping', 'water', 'faucet', 'tap', 'pipe', 'toilet', 'shower', 'drain', 'boiler', 'heater', 'lavabo', 'fuite', 'fuiter', 'goutte', 'eau', 'robinet', 'evier', 'tuyau', 'canalisation', 'toilette', 'douche', 'plombier', 'ye9tor', 'y9tor', 't9atter', 't9atar', 'ta9ter', 'y9attar', 'mee', 'koujina', 'kitchen', 'cuisine', 'تسرب', 'يقطر', 'ماء', 'مية', 'حنفية', 'مغسلة', 'كوجينة', 'سبالة'],
  mechanic: ['car', 'vehicle', 'auto', 'automobile', 'engine', 'motor', 'brake', 'battery', 'tire', 'wheel', 'starter', 'garage', 'voiture', 'vehicule', 'moteur', 'frein', 'batterie', 'pneu', 'roue', 'demarre', 'demarrer', 'marche', 'mecanicien', 'tomobil', 'karhba', 'karhab', 'ma tkhademch', 'm tkhademch', 'ma tetla3ch', 'ما تخدمش', 'ما تشتغلش', 'طوموبيل', 'كرهبة', 'كراهب'],
  electrician: ['power', 'electric', 'electricity', 'outlet', 'socket', 'plug', 'light', 'lamp', 'bulb', 'wiring', 'wire', 'current', 'fuse', 'breaker', 'short circuit', 'cutting', 'courant', 'electricite', 'prise', 'fiche', 'lumiere', 'ampoule', 'cable', 'disjoncteur', 'court circuit', 'electricien', 'kahraba', 'dhaw', 'daw', 'yit9atta3', 't9oss', 't9os', 'يقطع', 'تقص', 'كهرباء', 'ضو', 'ضوء', 'شرارة'],
  cleaning: ['clean', 'cleaning', 'dirty', 'dirt', 'stain', 'wash', 'washing', 'housekeeping', 'home cleaning', 'nettoyage', 'nettoyer', 'menage', 'ménage', 'sale', 'salete', 'propre', 'nettoyeuse', 'ndhafa', 'nadhafa', 'تنظيف', 'وسخ', 'وسخانة', 'نظافة'],
  painter: ['paint', 'painting', 'wall', 'ceiling', 'color', 'repaint', 'peinture', 'peindre', 'mur', 'plafond', 'couleur', 'peintre', 'sabbagh', 'sabbagh', 'دهان', 'صباغ', 'حيط', 'حايط', 'سقف'],
  carpenter: ['wood', 'woodwork', 'furniture', 'cabinet', 'shelf', 'door', 'wardrobe', 'table', 'chair', 'carpenter', 'bois', 'menuiserie', 'meuble', 'armoire', 'etagere', 'porte', 'menuisier', 'najjar', 'bab', 'beb', 'نجار', 'خشب', 'باب', 'بيبان'],
};
const normalize = (text: string) => text.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/gi, ' ').replace(/\s+/g, ' ').trim();
const editDistance = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = left[i - 1] === right[j - 1] ? diagonal : Math.min(row[j - 1] + 1, above + 1, diagonal + 1);
      diagonal = above;
    }
  }
  return row[right.length];
};
const matchesWord = (token: string, keyword: string) => token.includes(keyword) || (keyword.length >= 5 && token.length >= 4 && editDistance(token, keyword) <= (keyword.length >= 8 ? 2 : 1));
const phraseMatches = (text: string, category: (typeof CATEGORY_SLUGS)[number]) => {
  const phrases: Partial<Record<(typeof CATEGORY_SLUGS)[number], string[]>> = {
    plumber: ['under the sink', 'under lavabo', 'water leak', 'water dripping', 'ma y9tor', 'el ma', 'bl mee', 'bl me'],
    mechanic: ['does not start', 'wont start', 'won t start', 'ne demarre plus', 'ne demarre pas', 'ma tkhademch', 'm tkhademch'],
    electrician: ['power keeps', 'power cut', 'keeps cutting', 'lights out', 'la lumiere se coupe', 'ne sallume pas', 'yit9atta3 edhaw', 'yit9ata3 edhaw'],
    cleaning: ['need cleaning', 'house is dirty', 'nettoyage maison', 'dar mwas5a', 'dar mwas5a'],
    painter: ['paint the wall', 'repaint the', 'peindre le mur', 'sabbagh lel 7it'],
    carpenter: ['fix the door', 'wooden door', 'repair furniture', 'najjar lel beb'],
  };
  return phrases[category]?.some((phrase) => normalize(text).includes(normalize(phrase))) ?? false;
};

export function classifyProblem(messages: ChatMessage[], forceReady = false): AIResult {
  const text = messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ').replace(/\s+/g, ' ').trim();
  const normalized = normalize(text);
  const tokens = normalized.split(' ').filter(Boolean);
  const ranked = CATEGORY_SLUGS.map((category) => ({ category, score: (phraseMatches(text, category) ? 3 : 0) + words[category].filter((word) => {
    const keyword = normalize(word);
    return (keyword.length >= 4 && normalized.includes(keyword)) || tokens.some((token) => matchesWord(token, keyword));
  }).length })).sort((a, b) => b.score - a.score);
  const categorySlug = ranked[0].score ? ranked[0].category : null;
  const urgency = /(fire|smoke|spark|gas|flood|danger|urgent|immediate|incendie|fumee|etincelle|gaz|inondation|urgence|خطر|حريق|دخان|غاز|فيضان)/i.test(normalized) ? 'HIGH' : /(today|tonight|now|asap|aujourd|maintenant|vite|tawa|اليوم|توا)/i.test(normalized) ? 'MEDIUM' : 'LOW';
  if (categorySlug) return { reply: 'I have enough to find the right local help.', status: 'ready', categorySlug, urgency, summary: text.slice(0, 255) };
  if (forceReady) return { reply: 'I could not identify the right service yet. Please edit your description and mention the item or trade involved.', status: 'need_more', categorySlug: null, urgency, summary: text.slice(0, 255) };
  const question = messages.filter((m) => m.role === 'assistant').length === 0
    ? 'What is happening, and where is it located?'
    : 'Can you describe the symptom or the item involved (for example: water, electricity, a vehicle, cleaning, paint, or wood)?';
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
