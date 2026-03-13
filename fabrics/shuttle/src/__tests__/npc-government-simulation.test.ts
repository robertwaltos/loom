import { describe, expect, it } from 'vitest';
import { createNpcGovernmentModule } from '../npc-government.js';

describe('npc-government simulation', () => {
  it('simulates government setup, office assignment, and policy enactment', () => {
    let now = 1_000_000n;
    let id = 0;
    const gov = createNpcGovernmentModule({
      clock: { nowMicroseconds: () => now },
      idGen: { generate: () => `gov-${++id}` },
      logger: { info: () => undefined, warn: () => undefined },
    });

    const govId = gov.establishGovernment('world-1', 'REPUBLIC');
    if (typeof govId !== 'string') throw new Error('establish failed');

    gov.addOffice(govId, {
      officeId: 'office-1',
      title: 'Trade Minister',
      type: 'MINISTER',
      termLengthMicros: 365n * 24n * 3600n * 1_000_000n,
      responsibilities: ['trade policy'],
      corruptionRisk: 0.2,
    });
    const enacted = gov.enactPolicy(govId, {
      policyId: 'policy-1',
      name: 'Open Markets',
      description: 'Expand market access',
      category: 'economic',
      enactedAtMicros: now,
      expiresAtMicros: null,
      supportLevel: 0.7,
      effects: { economy: 8 },
    });

    expect(typeof enacted).toBe('string');
    const report = gov.getGovernmentReport(govId);
    expect('error' in report).toBe(false);
  });
});
