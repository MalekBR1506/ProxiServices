'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CornerDownLeft, LoaderCircle, Pencil, Send, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
type AIResult = { reply: string; status: 'need_more' | 'ready'; categorySlug: string | null; urgency: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string };

type Message = { role: 'user' | 'assistant'; content: string };
const examples = ['my sink is leaking under the cabinet', 'el ma ye9tor ta7t el lavabo', 'ma voiture ne démarre plus', 'power keeps cutting in the kitchen'];

export default function AIProblemChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingAnalysisId = searchParams.get('analysisId');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [result, setResult] = useState<(AIResult & { id: string | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => {
    if (!existingAnalysisId) return;
    void fetch(`/api/analyses/${encodeURIComponent(existingAnalysisId)}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error ?? 'Could not reopen this analysis.');
        const analysis = json.data as { id: string; status: string; categorySlug: string; urgency: AIResult['urgency']; summary: string; messages: Message[] };
        setMessages(analysis.messages);
        if (analysis.status === 'CONFIRMED' || analysis.status === 'ANALYZED') {
          setResult({ id: analysis.id, reply: 'This analysis is ready to review.', status: 'ready', categorySlug: analysis.categorySlug, urgency: analysis.urgency, summary: analysis.summary });
        }
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not reopen this analysis.'));
  }, [existingAnalysisId]);
  const send = async (text = draft) => {
    const content = text.trim(); if (!content || typing) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next); setDraft(''); setTyping(true); setError(null); setResult(null);
    try {
      const response = await fetch('/api/analyses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next }) });
      const json = await response.json() as { success?: boolean; data?: { id: string | null; result: AIResult }; error?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? 'The assistant could not answer.');
      setMessages((current) => [...current, { role: 'assistant', content: json.data!.result.reply }]);
      if (json.data.result.status === 'ready') setResult({ ...json.data.result, id: json.data.id });
    } catch (err) { setError(err instanceof Error ? err.message : 'The assistant could not answer.'); }
    finally { setTyping(false); }
  };

  return (
    <section aria-labelledby="problem-chat-title" className="paper-grain border-2 border-ink bg-paper p-4 shadow-hard sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div><p className="mb-1 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-tomato"><Sparkles className="h-4 w-4" /> The quick way in</p><h2 id="problem-chat-title" className="font-display text-3xl font-black leading-none text-ink sm:text-4xl">Tell us what&apos;s wrong.</h2><p className="mt-2 max-w-xl text-sm text-ink/65">Write it like you would tell a neighbor. English, French, Derja — mix them up if you like.</p></div>
        <span className="hidden rotate-2 border-2 border-ink bg-mustard px-2 py-1 text-[10px] font-black uppercase sm:block">No jargon</span>
      </div>
      <div className="mt-4 min-h-[210px] max-h-[310px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && <div className="tunisian-pattern border border-dashed border-teal p-4 text-sm text-ink/70"><p className="font-bold text-teal">Start anywhere.</p><p>“There&apos;s water under my sink” is perfect.</p></div>}
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><p className={`max-w-[86%] border-2 border-ink px-3 py-2 text-sm font-semibold ${message.role === 'user' ? 'bg-teal text-white' : 'bg-sand text-ink'}`}>{message.content}</p></div>)}
        {typing && <div className="flex items-center gap-2 text-xs font-bold text-teal"><LoaderCircle className="h-4 w-4 animate-spin" /> Thinking like a practical neighbor...</div>}
        <div ref={bottomRef} />
      </div>
      {result?.status === 'ready' && <div className="mt-4 border-2 border-ink bg-mustard p-4 shadow-hard-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-ink/65">Analysis result</p><p className="font-display text-xl font-black capitalize">{result.categorySlug} help <span className="text-tomato">/</span> {result.urgency} urgency</p><p className="mt-1 text-sm font-semibold">{result.summary}</p><p className="mt-3 text-sm font-black">Does this describe your problem correctly?</p></div><div className="flex flex-wrap gap-2"><button type="button" className="inline-flex items-center gap-2 border-2 border-ink bg-paper px-3 py-2 text-sm font-black text-ink shadow-hard-sm hover:bg-white" onClick={() => { setResult(null); setDraft(''); }}> <Pencil className="h-4 w-4" /> Edit description</button><button type="button" disabled={!result.id} className="inline-flex items-center gap-2 border-2 border-ink bg-teal px-3 py-2 text-sm font-black text-white shadow-hard-sm hover:bg-tomato disabled:opacity-50" onClick={async () => { if (!result.id) return; const response = await fetch(`/api/analyses/${result.id}`, { method: 'PATCH' }); if (!response.ok) { setError('Please confirm the analysis again.'); return; } router.push(`/search?analysisId=${result.id}`); }}>Confirm analysis <ArrowRight className="h-4 w-4" /></button></div></div></div>}
      {error && <p role="alert" className="mt-3 border-2 border-tomato bg-tomato/10 p-3 text-sm font-bold text-tomato">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Example problems">{examples.map((example) => <button key={example} type="button" onClick={() => send(example)} className="border-2 border-ink bg-sand px-2.5 py-1.5 text-left text-xs font-bold text-ink transition hover:-translate-y-0.5 hover:bg-white">{example}</button>)}</div>
      <form className="mt-4 flex gap-2 border-t-2 border-ink pt-4" onSubmit={(event) => { event.preventDefault(); send(); }}><label htmlFor="problem-input" className="sr-only">Describe your problem</label><textarea id="problem-input" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Describe the problem..." className="min-w-0 flex-1 resize-none border-2 border-ink bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/45 focus:border-tomato focus:outline-none" /><button type="submit" disabled={!draft.trim() || typing} className="self-stretch border-2 border-ink bg-tomato px-3 text-white shadow-hard-sm transition hover:bg-teal disabled:opacity-40" aria-label="Send message"><Send className="h-5 w-5" /></button></form>
      <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-ink/50"><CornerDownLeft className="h-3 w-3" /> Enter sends. Shift + Enter adds a line.</p>
    </section>
  );
}
