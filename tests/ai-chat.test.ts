import { describe, expect, it } from 'vitest';
import { classifyProblem } from '@/server/services/ai-chat';

describe('keyword problem classifier', () => {
  it.each([
    ['my sink is leaking under the cabinet', 'plumber'],
    ['el ma ye9tor ta7t el lavabo', 'plumber'],
    ['ma voiture ne démarre plus', 'mechanic'],
    ['power keeps cutting in the kitchen', 'electrician'],
    ['my sink is leeking under the cabnet', 'plumber'],
    ['ma voitur ne demarre pa', 'mechanic'],
    ['el mé y9tor ta7t el lavab', 'plumber'],
    ['l koujina t9atter bl mee', 'plumber'],
    ['le robinet fuit dans la cuisine', 'plumber'],
    ['ma karhba ma tkhademch', 'mechanic'],
    ['la lumière se coupe dans la cuisine', 'electrician'],
    ['dar mwas5a barcha', 'cleaning'],
    ['nheb nsabbagh el 7it', 'painter'],
    ['bab el dar mkassar', 'carpenter'],
  ])('classifies %s as %s without an API key', (message, category) => {
    const result = classifyProblem([{ role: 'user', content: message }]);
    expect(result.status).toBe('ready');
    expect(result.categorySlug).toBe(category);
  });

  it('uses the original problem when the user answers a location follow-up', () => {
    const messages = [
      { role: 'user' as const, content: 'l koujina t9atter bl mee' },
      { role: 'assistant' as const, content: 'What needs attention, and where is it located?' },
      { role: 'user' as const, content: 'kitchen' },
    ];
    const result = classifyProblem(messages);
    expect(result.status).toBe('ready');
    expect(result.categorySlug).toBe('plumber');
  });

  it('does not invent a category after two follow-up questions', () => {
    const messages = [{ role: 'user' as const, content: 'I need help' }, { role: 'assistant' as const, content: 'What happened?' }, { role: 'user' as const, content: 'It is in my home' }, { role: 'assistant' as const, content: 'Which trade?' }];
    expect(classifyProblem(messages).status).toBe('need_more');
    expect(classifyProblem(messages).categorySlug).toBeNull();
  });
});
