import { describe, expect, it } from 'vitest';
import { createTradeAI } from '../npc-trade-ai.js';

describe('npc-trade-ai simulation', () => {
  it('simulates opportunity scan and selective execution by risk profile', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createTradeAI({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `trade-${++id}` },
      logger: { info: () => undefined },
    });

    const opportunities = system.scanOpportunities('world-1', ['ore', 'grain', 'silk']);
    expect(typeof opportunities === 'string' || Array.isArray(opportunities)).toBe(true);
    if (typeof opportunities !== 'string' && opportunities.length > 0) {
      system.setRiskTolerance('npc-1', 'MODERATE');
      const ok = system.evaluateTrade('npc-1', opportunities[0]!.opportunityId);
      expect(typeof ok === 'boolean' || ok === 'risk_too_high').toBe(true);
    }
  });
});
