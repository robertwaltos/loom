import { describe, it, expect } from 'vitest';
import {
  PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON,
  createLucaRecord,
  addRedirectionEvent,
  architectDiscovers,
  assemblyDiscovers,
  getReserveBalance,
  isPermanenceCovenantFundable,
  getPublicRecord,
} from '../luca-supply-redirections.js';
import type { RedirectionEvent } from '../luca-supply-redirections.js';

function makeEvent(id: string, year: number, amount: bigint): RedirectionEvent {
  return {
    eventId: id,
    worldId: `world-${year}`,
    inGameYear: year,
    amountAtomicKalon: amount,
    routingNote: `Redirection in year ${year}`,
  };
}

describe('PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON', () => {
  it('is 5 trillion atomic KALON (5_000_000_000_000n)', () => {
    expect(PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON).toBe(5_000_000_000_000n);
  });

  it('is a BigInt', () => {
    expect(typeof PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON).toBe('bigint');
  });
});

describe('createLucaRecord', () => {
  it('characterId is always 13', () => {
    expect(createLucaRecord().characterId).toBe(13);
  });

  it('reserveAccountId is RESERVE_CACHE_001', () => {
    expect(createLucaRecord().reserveAccountId).toBe('RESERVE_CACHE_001');
  });

  it('totalRedirectedAtomicKalon starts at 0n', () => {
    expect(createLucaRecord().totalRedirectedAtomicKalon).toBe(0n);
  });

  it('redirectionEvents starts empty', () => {
    expect(createLucaRecord().redirectionEvents).toHaveLength(0);
  });

  it('purpose is PERMANENCE_COVENANT_RESERVE', () => {
    expect(createLucaRecord().purpose).toBe('PERMANENCE_COVENANT_RESERVE');
  });

  it('isLucaAware is always true', () => {
    expect(createLucaRecord().isLucaAware).toBe(true);
  });

  it('isArchitectAware starts false', () => {
    expect(createLucaRecord().isArchitectAware).toBe(false);
  });

  it('isAssemblyAware starts false', () => {
    expect(createLucaRecord().isAssemblyAware).toBe(false);
  });

  it('motivationStatement is a non-empty string', () => {
    const r = createLucaRecord();
    expect(typeof r.motivationStatement).toBe('string');
    expect(r.motivationStatement.length).toBeGreaterThan(0);
  });
});

describe('addRedirectionEvent', () => {
  it('adds event to redirectionEvents', () => {
    const r = createLucaRecord();
    const updated = addRedirectionEvent(r, makeEvent('e-1', 8, 500_000_000n));
    expect(updated.redirectionEvents).toHaveLength(1);
  });

  it('accumulates totalRedirectedAtomicKalon', () => {
    let r = createLucaRecord();
    r = addRedirectionEvent(r, makeEvent('e-1', 8, 500_000_000n));
    r = addRedirectionEvent(r, makeEvent('e-2', 12, 300_000_000n));
    expect(r.totalRedirectedAtomicKalon).toBe(800_000_000n);
  });

  it('returns a new record (immutable)', () => {
    const r = createLucaRecord();
    const updated = addRedirectionEvent(r, makeEvent('e-1', 8, 1n));
    expect(updated).not.toBe(r);
    expect(r.redirectionEvents).toHaveLength(0);
  });

  it('preserves all other fields', () => {
    const r = createLucaRecord();
    const updated = addRedirectionEvent(r, makeEvent('e-1', 8, 1n));
    expect(updated.characterId).toBe(13);
    expect(updated.purpose).toBe('PERMANENCE_COVENANT_RESERVE');
  });
});

describe('architectDiscovers', () => {
  it('sets isArchitectAware to true', () => {
    const r = architectDiscovers(createLucaRecord());
    expect(r.isArchitectAware).toBe(true);
  });

  it('returns a new record', () => {
    const r = createLucaRecord();
    expect(architectDiscovers(r)).not.toBe(r);
  });

  it('does not change isAssemblyAware', () => {
    const r = architectDiscovers(createLucaRecord());
    expect(r.isAssemblyAware).toBe(false);
  });
});

describe('assemblyDiscovers', () => {
  it('sets isAssemblyAware to true', () => {
    const r = assemblyDiscovers(createLucaRecord());
    expect(r.isAssemblyAware).toBe(true);
  });

  it('returns a new record', () => {
    const r = createLucaRecord();
    expect(assemblyDiscovers(r)).not.toBe(r);
  });
});

describe('getReserveBalance', () => {
  it('returns 0n initially', () => {
    expect(getReserveBalance(createLucaRecord())).toBe(0n);
  });

  it('returns correct sum after events', () => {
    let r = createLucaRecord();
    r = addRedirectionEvent(r, makeEvent('e-1', 8, 1_000_000_000n));
    r = addRedirectionEvent(r, makeEvent('e-2', 12, 2_000_000_000n));
    expect(getReserveBalance(r)).toBe(3_000_000_000n);
  });
});

describe('isPermanenceCovenantFundable', () => {
  it('returns false when balance is 0', () => {
    expect(isPermanenceCovenantFundable(createLucaRecord())).toBe(false);
  });

  it('returns false when balance is just below threshold', () => {
    let r = createLucaRecord();
    r = addRedirectionEvent(r, makeEvent('e-1', 8, PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON - 1n));
    expect(isPermanenceCovenantFundable(r)).toBe(false);
  });

  it('returns true at exactly the threshold', () => {
    let r = createLucaRecord();
    r = addRedirectionEvent(r, makeEvent('e-1', 8, PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON));
    expect(isPermanenceCovenantFundable(r)).toBe(true);
  });

  it('returns true above the threshold', () => {
    let r = createLucaRecord();
    r = addRedirectionEvent(r, makeEvent('e-1', 8, PERMANENCE_COVENANT_MINIMUM_ATOMIC_KALON + 1n));
    expect(isPermanenceCovenantFundable(r)).toBe(true);
  });
});

describe('getPublicRecord', () => {
  it('isAuthorized is always false', () => {
    expect(getPublicRecord(createLucaRecord()).isAuthorized).toBe(false);
  });

  it('includes reserveAccountId', () => {
    expect(getPublicRecord(createLucaRecord()).reserveAccountId).toBe('RESERVE_CACHE_001');
  });

  it('totalKalonInReserve is a string', () => {
    expect(typeof getPublicRecord(createLucaRecord()).totalKalonInReserve).toBe('string');
  });

  it('does not expose characterId or motivationStatement', () => {
    const pub = getPublicRecord(createLucaRecord());
    expect(pub).not.toHaveProperty('characterId');
    expect(pub).not.toHaveProperty('motivationStatement');
  });
});
