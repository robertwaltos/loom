import { describe, expect, it } from 'vitest';
import { createNpcKnowledgeSystem } from '../npc-knowledge.js';

describe('npc-knowledge simulation', () => {
  it('simulates rumor propagation with trust-weighted fidelity decay', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createNpcKnowledgeSystem({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `know-${id++}` },
      logger: { info: () => undefined },
    });

    const rumor = sys.createRumor('npc-1', 'EVENT', 'harvest', 'Harvest begins at dawn');
    sys.evaluateTrustworthiness('npc-2', 'npc-1', 0.8, 0.9, 0.8);
    const spread = sys.spreadRumor(rumor.rumorId, 'npc-1', 'npc-2');

    expect(typeof spread).toBe('object');
    expect(sys.getKnownFacts('npc-2', 'EVENT').length).toBe(1);
    expect(sys.getRumor(rumor.rumorId)?.fidelity).toBeLessThan(1);
  });
});
