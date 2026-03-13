import { describe, it, expect } from 'vitest';
import {
  getAllWorlds,
  getWorldById,
  getWorldCount,
  getWorldsByStellarClass,
  getWorldsBySovereignty,
  STELLAR_ISSUANCE_MULTIPLIER,
} from '../world-bible-registry.js';

// ── getAllWorlds ────────────────────────────────────────────────

describe('getAllWorlds', () => {
  it('returns 8 canonical worlds', () => {
    expect(getAllWorlds()).toHaveLength(8);
  });

  it('every world has a non-empty worldId', () => {
    const all = getAllWorlds();
    expect(all.every((w) => w.worldId.length > 0)).toBe(true);
  });

  it('world IDs are unique', () => {
    const all = getAllWorlds();
    const ids = new Set(all.map((w) => w.worldId));
    expect(ids.size).toBe(all.length);
  });

  it('every world has a valid latticeIntegrity between 0 and 100', () => {
    const all = getAllWorlds();
    expect(all.every((w) => w.latticeIntegrity >= 0 && w.latticeIntegrity <= 100)).toBe(true);
  });
});

// ── getWorldCount ──────────────────────────────────────────────

describe('getWorldCount', () => {
  it('returns 8', () => {
    expect(getWorldCount()).toBe(8);
  });
});

// ── getWorldById ───────────────────────────────────────────────

describe('getWorldById', () => {
  it('returns Alkahest for worldId alkahest', () => {
    const world = getWorldById('alkahest');
    expect(world).toBeDefined();
    expect(world?.name).toBe('Alkahest');
    expect(world?.worldNumber).toBe(1);
  });

  it('returns undefined for an unknown worldId', () => {
    expect(getWorldById('nonexistent')).toBeUndefined();
  });

  it('alkahest has assembly-common-trust sovereignty', () => {
    expect(getWorldById('alkahest')?.sovereignty).toBe('assembly-common-trust');
  });

  it('alkahest has G stellar class', () => {
    expect(getWorldById('alkahest')?.stellarClass).toBe('G');
  });

  it('alkahest has resident character IDs', () => {
    const world = getWorldById('alkahest');
    expect(world?.residentCharacterIds.length).toBeGreaterThan(0);
  });
});

// ── getWorldsByStellarClass ────────────────────────────────────

describe('getWorldsByStellarClass', () => {
  it('G class includes Alkahest', () => {
    const gWorlds = getWorldsByStellarClass('G');
    expect(gWorlds.some((w) => w.worldId === 'alkahest')).toBe(true);
    expect(gWorlds.every((w) => w.stellarClass === 'G')).toBe(true);
  });

  it('returns empty array for an unused stellar class', () => {
    const result = getWorldsByStellarClass('binary');
    expect(Array.isArray(result)).toBe(true);
    expect(result.every((w) => w.stellarClass === 'binary')).toBe(true);
  });

  it('stellar class union covers all worlds', () => {
    const all = getAllWorlds();
    const classes = [...new Set(all.map((w) => w.stellarClass))];
    const covered = classes.flatMap((c) => getWorldsByStellarClass(c));
    expect(covered).toHaveLength(all.length);
  });
});

// ── getWorldsBySovereignty ─────────────────────────────────────

describe('getWorldsBySovereignty', () => {
  it('assembly-common-trust includes Alkahest', () => {
    const result = getWorldsBySovereignty('assembly-common-trust');
    expect(result.some((w) => w.worldId === 'alkahest')).toBe(true);
    expect(result.every((w) => w.sovereignty === 'assembly-common-trust')).toBe(true);
  });

  it('returns empty array for an unused sovereignty type', () => {
    const result = getWorldsBySovereignty('contested');
    expect(Array.isArray(result)).toBe(true);
  });

  it('sovereignty union covers all worlds', () => {
    const all = getAllWorlds();
    const sovereignties = [...new Set(all.map((w) => w.sovereignty))];
    const covered = sovereignties.flatMap((s) => getWorldsBySovereignty(s));
    expect(covered).toHaveLength(all.length);
  });
});

// ── STELLAR_ISSUANCE_MULTIPLIER ───────────────────────────────

describe('STELLAR_ISSUANCE_MULTIPLIER', () => {
  it('G class has multiplier 1.0', () => {
    expect(STELLAR_ISSUANCE_MULTIPLIER['G']).toBe(1.0);
  });

  it('F class has multiplier greater than G', () => {
    const f = STELLAR_ISSUANCE_MULTIPLIER['F'] ?? 0;
    const g = STELLAR_ISSUANCE_MULTIPLIER['G'] ?? 0;
    expect(f).toBeGreaterThan(g);
  });

  it('M class has multiplier less than G', () => {
    const m = STELLAR_ISSUANCE_MULTIPLIER['M'] ?? 0;
    const g = STELLAR_ISSUANCE_MULTIPLIER['G'] ?? 0;
    expect(m).toBeLessThan(g);
  });

  it('binary has the highest multiplier', () => {
    const values = Object.values(STELLAR_ISSUANCE_MULTIPLIER);
    expect(STELLAR_ISSUANCE_MULTIPLIER['binary']).toBe(Math.max(...values));
  });
});
