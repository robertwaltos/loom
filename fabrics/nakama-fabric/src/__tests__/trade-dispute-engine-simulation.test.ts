import { describe, expect, it } from 'vitest';
import { createTradeDisputeEngine } from '../trade-dispute-engine.js';

describe('trade-dispute-engine simulation', () => {
  it('simulates dispute filing, mediation assignment, and resolution', () => {
    let now = 1_000_000;
    let id = 0;
    const penalties: Array<{ id: string; amount: number }> = [];
    const engine = createTradeDisputeEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `td-${++id}` },
      civicScore: { getScore: (dynastyId) => (dynastyId === 'arb-1' ? 8_000 : 0) },
      reputation: { applyPenalty: (id, amount) => penalties.push({ id, amount }) },
    });

    const filed = engine.fileDispute({
      tradeOfferId: 'offer-1',
      filedBy: 'buyer-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      tradeAmount: 10_000n,
      reason: 'Item not delivered',
    });
    engine.beginReview(filed.disputeId);
    engine.assignArbitrator(filed.disputeId, 'arb-1');
    const resolved = engine.resolve({
      disputeId: filed.disputeId,
      resolvedBy: 'arb-1',
      type: 'REFUND',
      reason: 'verified seller fault',
    });

    expect(resolved.phase).toBe('RESOLVED');
    expect(penalties.length).toBeGreaterThan(0);
  });
});
