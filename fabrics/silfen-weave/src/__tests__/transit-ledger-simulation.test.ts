import { describe, expect, it } from 'vitest';
import { createTransitLedger } from '../transit-ledger.js';

function makeLedger() {
  let now = 1_000_000;
  let i = 0;
  return createTransitLedger({
    clock: { nowMicroseconds: () => (now += 1_000_000) },
    idGenerator: { next: () => `txn-${++i}` },
  });
}

describe('transit-ledger simulation', () => {
  it('records multi-dynasty traffic and computes route statistics', () => {
    const ledger = makeLedger();
    ledger.record({ dynastyId: 'd1', originWorldId: 'a', destinationWorldId: 'b', durationMicroseconds: 100 });
    ledger.record({ dynastyId: 'd2', originWorldId: 'a', destinationWorldId: 'b', durationMicroseconds: 200 });
    ledger.record({ dynastyId: 'd1', originWorldId: 'b', destinationWorldId: 'c', durationMicroseconds: 300 });

    expect(ledger.countByRoute('a', 'b')).toBe(2);
    const stats = ledger.getStats();
    expect(stats.totalTransits).toBe(3);
    expect(stats.uniqueTravellers).toBe(2);
  });
});
