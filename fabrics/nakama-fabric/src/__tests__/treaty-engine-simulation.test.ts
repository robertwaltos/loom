import { describe, expect, it } from 'vitest';
import { createTreatyEngine, MAX_VIOLATIONS_BEFORE_BREAK } from '../treaty-engine.js';

describe('treaty-engine simulation', () => {
  it('simulates negotiation, activation, violations, and treaty break', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createTreatyEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `tr-${++id}` },
    });

    const treaty = engine.propose({
      proposerId: 'dyn-a',
      counterpartyId: 'dyn-b',
      treatyType: 'NON_AGGRESSION',
      terms: { description: 'No raids', conditions: ['No raids across border'] },
      durationUs: 20_000_000,
    });
    engine.counterPropose({
      treatyId: treaty.treatyId,
      newTerms: { description: 'No raids + patrols', conditions: ['No raids', 'Shared patrols'] },
    });
    engine.sign(treaty.treatyId);
    engine.activate(treaty.treatyId);

    for (let i = 0; i < MAX_VIOLATIONS_BEFORE_BREAK; i += 1) {
      engine.reportViolation({
        treatyId: treaty.treatyId,
        violatorId: 'dyn-a',
        description: `violation-${i + 1}`,
      });
    }

    expect(engine.getTreaty(treaty.treatyId)?.phase).toBe('BROKEN');
  });
});
