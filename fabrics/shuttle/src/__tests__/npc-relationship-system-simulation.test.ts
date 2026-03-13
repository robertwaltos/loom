import { describe, expect, it } from 'vitest';
import {
  adjustRelationshipScore,
  createNpcRelationshipState,
  createRelationship,
  getRelationshipSummary,
  setRelationshipType,
} from '../npc-relationship-system.js';

describe('npc-relationship-system simulation', () => {
  it('simulates bidirectional score evolution and alliance formalization', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcRelationshipState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `rel-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    createRelationship(state, 'npc-1', 'npc-2', 10);
    adjustRelationshipScore(state, 'npc-1', 'npc-2', 25, 'shared mission success');
    setRelationshipType(state, 'npc-1', 'npc-2', 'ALLY');

    const summary = getRelationshipSummary(state, 'npc-1');
    expect(summary.totalRelationships).toBe(1);
    expect(summary.allies).toBe(1);
  });
});
