import { describe, it, expect } from 'vitest';
import { createTransitLedger } from '../transit-ledger.js';
import type { TransitLedgerDeps } from '../transit-ledger.js';

function makeDeps(): TransitLedgerDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'txn-' + String(++idCounter) },
  };
}

describe('TransitLedger — record and retrieve', () => {
  it('records a transit', () => {
    const ledger = createTransitLedger(makeDeps());
    const record = ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'earth',
      destinationWorldId: 'mars',
      durationMicroseconds: 5_000_000,
    });
    expect(record.transitId).toBe('txn-1');
    expect(record.dynastyId).toBe('dyn-1');
  });

  it('retrieves by id', () => {
    const ledger = createTransitLedger(makeDeps());
    const record = ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'earth',
      destinationWorldId: 'mars',
      durationMicroseconds: 5_000_000,
    });
    expect(ledger.getTransit(record.transitId)?.dynastyId).toBe('dyn-1');
  });

  it('returns undefined for unknown transit', () => {
    const ledger = createTransitLedger(makeDeps());
    expect(ledger.getTransit('missing')).toBeUndefined();
  });
});

describe('TransitLedger — queries', () => {
  it('lists by dynasty', () => {
    const ledger = createTransitLedger(makeDeps());
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'a',
      destinationWorldId: 'b',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'b',
      destinationWorldId: 'c',
      durationMicroseconds: 200,
    });
    ledger.record({
      dynastyId: 'dyn-2',
      originWorldId: 'a',
      destinationWorldId: 'b',
      durationMicroseconds: 100,
    });
    expect(ledger.listByDynasty('dyn-1')).toHaveLength(2);
    expect(ledger.listByDynasty('dyn-2')).toHaveLength(1);
  });

  it('lists by origin world', () => {
    const ledger = createTransitLedger(makeDeps());
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'earth',
      destinationWorldId: 'mars',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-2',
      originWorldId: 'earth',
      destinationWorldId: 'venus',
      durationMicroseconds: 200,
    });
    expect(ledger.listByOrigin('earth')).toHaveLength(2);
  });

  it('lists by destination world', () => {
    const ledger = createTransitLedger(makeDeps());
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'a',
      destinationWorldId: 'mars',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-2',
      originWorldId: 'b',
      destinationWorldId: 'mars',
      durationMicroseconds: 200,
    });
    expect(ledger.listByDestination('mars')).toHaveLength(2);
  });

  it('returns empty for unknown dynasty', () => {
    const ledger = createTransitLedger(makeDeps());
    expect(ledger.listByDynasty('nobody')).toHaveLength(0);
  });

  it('counts transits by route', () => {
    const ledger = createTransitLedger(makeDeps());
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'a',
      destinationWorldId: 'b',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-2',
      originWorldId: 'a',
      destinationWorldId: 'b',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'a',
      destinationWorldId: 'c',
      durationMicroseconds: 100,
    });
    expect(ledger.countByRoute('a', 'b')).toBe(2);
    expect(ledger.countByRoute('a', 'c')).toBe(1);
    expect(ledger.countByRoute('x', 'y')).toBe(0);
  });
});

describe('TransitLedger — stats', () => {
  it('starts with zero stats', () => {
    const ledger = createTransitLedger(makeDeps());
    const stats = ledger.getStats();
    expect(stats.totalTransits).toBe(0);
    expect(stats.uniqueTravellers).toBe(0);
    expect(stats.uniqueRoutes).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const ledger = createTransitLedger(makeDeps());
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'a',
      destinationWorldId: 'b',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-1',
      originWorldId: 'b',
      destinationWorldId: 'a',
      durationMicroseconds: 100,
    });
    ledger.record({
      dynastyId: 'dyn-2',
      originWorldId: 'a',
      destinationWorldId: 'b',
      durationMicroseconds: 100,
    });
    const stats = ledger.getStats();
    expect(stats.totalTransits).toBe(3);
    expect(stats.uniqueTravellers).toBe(2);
    expect(stats.uniqueRoutes).toBe(2);
  });
});
