import { describe, expect, it } from 'vitest';
import {
  createNpcKnowledgeSystemState,
  findExperts,
  learnKnowledge,
  registerNpcKnowledge,
  teachKnowledge,
} from '../npc-knowledge-system.js';

describe('npc-knowledge-system simulation', () => {
  it('simulates teaching flow and expert discovery', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcKnowledgeSystemState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `ks-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpcKnowledge(state, 'teacher');
    registerNpcKnowledge(state, 'student');
    const entry = learnKnowledge(state, 'teacher', 'TRADE', 'silk futures', 92, null);
    if (typeof entry === 'string') throw new Error('teacher setup failed');

    const taught = teachKnowledge(state, 'teacher', 'student', entry.knowledgeId, 35);
    expect(taught.success).toBe(true);
    expect(findExperts(state, 'TRADE', 80)).toContain('teacher');
  });
});
