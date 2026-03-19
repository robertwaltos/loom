import { describe, it, expect } from 'vitest';
import {
  GENESIS_VAULT_INITIAL_BALANCE_MICRO,
  FOUNDING_MARK_ELIGIBLE_DYNASTY_NUMBER_LIMIT,
  CANONICAL_FOUNDING_OATH_TEXT,
  RITUAL_SEQUENCE,
  CANONICAL_EXAMPLE_CEREMONIES,
  createFoundingCeremony,
  completeRitual,
  isEligibleForFoundingMark,
  getCeremonyCompletionPercentage,
  getNextPendingRitual,
  hasCompletedAllRequiredRituals,
  computeGenesisVaultWithReplenishment,
} from '../dynasty-founding-rituals.js';

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('GENESIS_VAULT_INITIAL_BALANCE_MICRO is 500 KALON in micro', () => {
    expect(GENESIS_VAULT_INITIAL_BALANCE_MICRO).toBe(500_000_000n);
  });

  it('FOUNDING_MARK_ELIGIBLE_DYNASTY_NUMBER_LIMIT is 10000', () => {
    expect(FOUNDING_MARK_ELIGIBLE_DYNASTY_NUMBER_LIMIT).toBe(10_000);
  });

  it('CANONICAL_FOUNDING_OATH_TEXT contains the key phrase', () => {
    expect(CANONICAL_FOUNDING_OATH_TEXT).toContain('I am woven in.');
  });

  it('RITUAL_SEQUENCE has 7 steps', () => {
    expect(RITUAL_SEQUENCE).toHaveLength(7);
  });

  it('RITUAL_SEQUENCE starts with GENESIS_OATH', () => {
    expect(RITUAL_SEQUENCE[0]).toBe('GENESIS_OATH');
  });

  it('RITUAL_SEQUENCE ends with FIRST_KALON_ISSUANCE', () => {
    expect(RITUAL_SEQUENCE[RITUAL_SEQUENCE.length - 1]).toBe('FIRST_KALON_ISSUANCE');
  });

  it('CANONICAL_EXAMPLE_CEREMONIES has 3 entries', () => {
    expect(CANONICAL_EXAMPLE_CEREMONIES).toHaveLength(3);
  });

  it('CANONICAL_EXAMPLE_CEREMONIES[0] has Founding Mark', () => {
    expect(CANONICAL_EXAMPLE_CEREMONIES[0]?.hasFoundingMark).toBe(true);
  });

  it('CANONICAL_EXAMPLE_CEREMONIES[1] has no Founding Mark', () => {
    expect(CANONICAL_EXAMPLE_CEREMONIES[1]?.hasFoundingMark).toBe(false);
  });
});

// ─── isEligibleForFoundingMark ────────────────────────────────────────────────

describe('isEligibleForFoundingMark', () => {
  it('dynasty #1 is eligible', () => {
    expect(isEligibleForFoundingMark(1)).toBe(true);
  });

  it('dynasty #10000 is eligible (boundary)', () => {
    expect(isEligibleForFoundingMark(10_000)).toBe(true);
  });

  it('dynasty #10001 is not eligible', () => {
    expect(isEligibleForFoundingMark(10_001)).toBe(false);
  });

  it('dynasty #0 is not eligible', () => {
    expect(isEligibleForFoundingMark(0)).toBe(false);
  });

  it('large dynasty number is not eligible', () => {
    expect(isEligibleForFoundingMark(999_999)).toBe(false);
  });
});

// ─── createFoundingCeremony ───────────────────────────────────────────────────

describe('createFoundingCeremony', () => {
  it('creates a ceremony with correct dynastyId and inGameYear', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 42, 100);
    expect(ceremony.dynastyId).toBe('dynasty-test');
    expect(ceremony.inGameYear).toBe(42);
  });

  it('creates ceremony with 7 PENDING rituals', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 5);
    expect(ceremony.rituals).toHaveLength(7);
    for (const ritual of ceremony.rituals) {
      expect(ritual.status).toBe('PENDING');
    }
  });

  it('isComplete is false for a new ceremony', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 5);
    expect(ceremony.isComplete).toBe(false);
  });

  it('hasFoundingMark is true when dynastyNumber <= 10000', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 9999);
    expect(ceremony.hasFoundingMark).toBe(true);
  });

  it('hasFoundingMark is false when dynastyNumber > 10000', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 10_001);
    expect(ceremony.hasFoundingMark).toBe(false);
  });

  it('genesisVaultBalanceMicro equals the initial constant', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 1);
    expect(ceremony.genesisVaultBalanceMicro).toBe(GENESIS_VAULT_INITIAL_BALANCE_MICRO);
  });

  it('oathText equals canonical oath', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 1);
    expect(ceremony.oathText).toBe(CANONICAL_FOUNDING_OATH_TEXT);
  });

  it('ceremonyId encodes dynastyId and year', () => {
    const ceremony = createFoundingCeremony('dynasty-abc', 7, 1);
    expect(ceremony.ceremonyId).toContain('dynasty-abc');
    expect(ceremony.ceremonyId).toContain('7');
  });

  it('assigns witnessId to all rituals when provided', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 1, 'witness-007');
    for (const ritual of ceremony.rituals) {
      expect(ritual.witnessId).toBe('witness-007');
    }
  });

  it('witnessId is null when not provided', () => {
    const ceremony = createFoundingCeremony('dynasty-test', 1, 1);
    for (const ritual of ceremony.rituals) {
      expect(ritual.witnessId).toBeNull();
    }
  });
});

// ─── completeRitual ───────────────────────────────────────────────────────────

describe('completeRitual', () => {
  it('updates the specified ritual to COMPLETED', () => {
    const ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    const updated = completeRitual(ceremony, 'GENESIS_OATH', '2100-01-01T00:00:00Z');
    const ritual = updated.rituals.find((r) => r.ritualType === 'GENESIS_OATH');
    expect(ritual?.status).toBe('COMPLETED');
    expect(ritual?.completedAt).toBe('2100-01-01T00:00:00Z');
  });

  it('other rituals remain PENDING after completing one', () => {
    const ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    const updated = completeRitual(ceremony, 'GENESIS_OATH', '2100-01-01T00:00:00Z');
    const pendingCount = updated.rituals.filter((r) => r.status === 'PENDING').length;
    expect(pendingCount).toBe(6);
  });

  it('sets SKIPPED for MARK_APPLICATION when hasFoundingMark is false', () => {
    const ceremony = createFoundingCeremony('dynasty-late', 1, 99_999);
    expect(ceremony.hasFoundingMark).toBe(false);
    const updated = completeRitual(ceremony, 'MARK_APPLICATION', '2100-01-01T00:00:00Z');
    const ritual = updated.rituals.find((r) => r.ritualType === 'MARK_APPLICATION');
    expect(ritual?.status).toBe('SKIPPED');
  });

  it('sets COMPLETED for MARK_APPLICATION when hasFoundingMark is true', () => {
    const ceremony = createFoundingCeremony('dynasty-early', 1, 42);
    const updated = completeRitual(ceremony, 'MARK_APPLICATION', '2100-01-01T00:00:00Z');
    const ritual = updated.rituals.find((r) => r.ritualType === 'MARK_APPLICATION');
    expect(ritual?.status).toBe('COMPLETED');
  });

  it('isComplete becomes true when all rituals are completed', () => {
    let ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    for (const ritualType of RITUAL_SEQUENCE) {
      ceremony = completeRitual(ceremony, ritualType, '2100-01-01T00:00:00Z');
    }
    expect(ceremony.isComplete).toBe(true);
  });

  it('stores chronicleEntryId when provided', () => {
    const ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    const updated = completeRitual(ceremony, 'CHRONICLE_INSCRIPTION', 'ts', 'chronicle-ref-001');
    const ritual = updated.rituals.find((r) => r.ritualType === 'CHRONICLE_INSCRIPTION');
    expect(ritual?.chronicleEntryId).toBe('chronicle-ref-001');
  });
});

// ─── getCeremonyCompletionPercentage ──────────────────────────────────────────

describe('getCeremonyCompletionPercentage', () => {
  it('returns 0 for a new ceremony', () => {
    const ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    expect(getCeremonyCompletionPercentage(ceremony)).toBe(0);
  });

  it('returns ~14 after one of seven rituals is completed', () => {
    let ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    ceremony = completeRitual(ceremony, 'GENESIS_OATH', 'ts');
    expect(getCeremonyCompletionPercentage(ceremony)).toBe(14);
  });

  it('returns 100 for a fully completed ceremony', () => {
    let ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    for (const ritualType of RITUAL_SEQUENCE) {
      ceremony = completeRitual(ceremony, ritualType, 'ts');
    }
    expect(getCeremonyCompletionPercentage(ceremony)).toBe(100);
  });

  it('SKIPPED rituals count toward completion', () => {
    let ceremony = createFoundingCeremony('dynasty-late', 1, 50_000); // no mark
    ceremony = completeRitual(ceremony, 'MARK_APPLICATION', 'ts'); // becomes SKIPPED
    expect(getCeremonyCompletionPercentage(ceremony)).toBe(14);
  });
});

// ─── getNextPendingRitual ─────────────────────────────────────────────────────

describe('getNextPendingRitual', () => {
  it('returns first ritual for a fresh ceremony', () => {
    const ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    const next = getNextPendingRitual(ceremony);
    expect(next?.ritualType).toBe('GENESIS_OATH');
  });

  it('returns undefined when all rituals are done', () => {
    let ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    for (const ritualType of RITUAL_SEQUENCE) {
      ceremony = completeRitual(ceremony, ritualType, 'ts');
    }
    expect(getNextPendingRitual(ceremony)).toBeUndefined();
  });

  it('returns next pending ritual after some are completed', () => {
    let ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    ceremony = completeRitual(ceremony, 'GENESIS_OATH', 'ts');
    const next = getNextPendingRitual(ceremony);
    expect(next?.ritualType).toBe('CHRONICLE_INSCRIPTION');
  });
});

// ─── hasCompletedAllRequiredRituals ───────────────────────────────────────────

describe('hasCompletedAllRequiredRituals', () => {
  it('returns false for an incomplete ceremony', () => {
    const ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    expect(hasCompletedAllRequiredRituals(ceremony)).toBe(false);
  });

  it('returns true for a ceremony with all rituals completed', () => {
    let ceremony = createFoundingCeremony('dynasty-x', 1, 1);
    for (const ritualType of RITUAL_SEQUENCE) {
      ceremony = completeRitual(ceremony, ritualType, 'ts');
    }
    expect(hasCompletedAllRequiredRituals(ceremony)).toBe(true);
  });

  it('returns true for CANONICAL_EXAMPLE_CEREMONIES[2] (late dynasty, some SKIPPED)', () => {
    expect(hasCompletedAllRequiredRituals(CANONICAL_EXAMPLE_CEREMONIES[2]!)).toBe(true);
  });
});

// ─── computeGenesisVaultWithReplenishment ─────────────────────────────────────

describe('computeGenesisVaultWithReplenishment', () => {
  it('returns same balance for 0 years', () => {
    expect(computeGenesisVaultWithReplenishment(500_000_000n, 0)).toBe(500_000_000n);
  });

  it('returns same balance for negative years', () => {
    expect(computeGenesisVaultWithReplenishment(500_000_000n, -5)).toBe(500_000_000n);
  });

  it('grows by 1% after 1 year', () => {
    // 500_000_000 * 100/10000 = 5_000_000 replenishment
    const result = computeGenesisVaultWithReplenishment(500_000_000n, 1);
    expect(result).toBe(505_000_000n);
  });

  it('compounds correctly over multiple years', () => {
    // year 1: 500M + 5M = 505M
    // year 2: 505M + 5.05M = 510.05M (BigInt rounds down: 510_050_000)
    const result = computeGenesisVaultWithReplenishment(500_000_000n, 2);
    expect(result).toBe(510_050_000n);
  });

  it('always returns value >= initial balance', () => {
    const initial = 1_000_000n;
    for (let years = 0; years <= 10; years++) {
      expect(computeGenesisVaultWithReplenishment(initial, years)).toBeGreaterThanOrEqual(initial);
    }
  });
});
