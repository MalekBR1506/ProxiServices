import { describe, expect, it } from 'vitest';
import { classifyProblem } from '@/server/services/ai-chat';

describe('keyword problem classifier', () => {
  it.each([
    ['my sink is leaking under the cabinet', 'plumber'],
    ['el ma ye9tor ta7t el lavabo', 'plumber'],
    ['ma voiture ne démarre plus', 'mechanic'],
    ['power keeps cutting in the kitchen', 'electrician'],
  ])('classifies %s as %s without an API key', (message, category) => {
    const result = classifyProblem([{ role: 'user', content: message }]);
    expect(result.status).toBe('ready');
    expect(result.categorySlug).toBe(category);
  });

  it('does not invent a category after two follow-up questions', () => {
    const messages = [{ role: 'user' as const, content: 'I need help' }, { role: 'assistant' as const, content: 'What happened?' }, { role: 'user' as const, content: 'It is in my home' }, { role: 'assistant' as const, content: 'Which trade?' }];
    expect(classifyProblem(messages).status).toBe('need_more');
    expect(classifyProblem(messages).categorySlug).toBeNull();
  });
});
