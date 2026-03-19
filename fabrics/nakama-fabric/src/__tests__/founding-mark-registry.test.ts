import { describe, it, expect } from 'vitest';
import {
  FOUNDING_MARK_WINDOW_BLOCKS,
  FOUNDING_MARK_REAL_DAYS,
  FOUNDING_MARK_INGAME_DAYS,
  ESTIMATED_FOUNDING_MARK_HOLDERS,
  FOUNDING_MARK_NARRATIVE,
  LAUNCH_DATE,
  isFoundingMarkWindowOpen,
  validateFoundingMarkEligibility,
  awardFoundingMark,
  buildNotEligibleRecord,
  buildWindowOpenRecord,
  buildWindowClosedRecord,
  buildFoundingMarkChronicleEntry,
  createFoundingMarkRegistry,
} from '../founding-mark-registry.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('FOUNDING_MARK_WINDOW_BLOCKS is 43_200', () => {
    expect(FOUNDING_MARK_WINDOW_BLOCKS).toBe(43_200);
  });

  it('FOUNDING_MARK_REAL_DAYS is 6', () => {
    expect(FOUNDING_MARK_REAL_DAYS).toBe(6);
  });

  it('FOUNDING_MARK_INGAME_DAYS is 18', () => {
    expect(FOUNDING_MARK_INGAME_DAYS).toBe(18);
  });

  it('ESTIMATED_FOUNDING_MARK_HOLDERS is 10_000', () => {
    expect(ESTIMATED_FOUNDING_MARK_HOLDERS).toBe(10_000);
  });

  it('FOUNDING_MARK_NARRATIVE mentions first 18 in-game days', () => {
    expect(FOUNDING_MARK_NARRATIVE).toContain('18 in-game days');
  });

  it('LAUNCH_DATE is a valid ISO date', () => {
    expect(() => new Date(LAUNCH_DATE)).not.toThrow();
    expect(Date.parse(LAUNCH_DATE)).not.toBeNaN();
  });
});

// ── isFoundingMarkWindowOpen ──────────────────────────────────────────────────

describe('isFoundingMarkWindowOpen', () => {
  it('returns true when at launch block', () => {
    expect(isFoundingMarkWindowOpen(1000, 1000)).toBe(true);
  });

  it('returns true just before window ends', () => {
    expect(isFoundingMarkWindowOpen(1000 + FOUNDING_MARK_WINDOW_BLOCKS - 1, 1000)).toBe(true);
  });

  it('returns false at window end block', () => {
    expect(isFoundingMarkWindowOpen(1000 + FOUNDING_MARK_WINDOW_BLOCKS, 1000)).toBe(false);
  });

  it('returns false when blockHeight is before launchBlockHeight', () => {
    expect(isFoundingMarkWindowOpen(999, 1000)).toBe(false);
  });

  it('returns false well after the window', () => {
    expect(isFoundingMarkWindowOpen(1000 + FOUNDING_MARK_WINDOW_BLOCKS + 100, 1000)).toBe(false);
  });
});

// ── validateFoundingMarkEligibility ──────────────────────────────────────────

describe('validateFoundingMarkEligibility', () => {
  const launchDate = '2027-01-01T00:00:00Z';

  it('returns true when joined at launch', () => {
    expect(validateFoundingMarkEligibility('d-001', '2027-01-01T00:00:00Z', launchDate)).toBe(true);
  });

  it('returns true when joined on day 5 (within 6-day window)', () => {
    expect(validateFoundingMarkEligibility('d-001', '2027-01-05T00:00:00Z', launchDate)).toBe(true);
  });

  it('returns false when joined on exactly day 6 (boundary)', () => {
    expect(validateFoundingMarkEligibility('d-001', '2027-01-07T00:00:00Z', launchDate)).toBe(false);
  });

  it('returns false when joined before launch', () => {
    expect(validateFoundingMarkEligibility('d-001', '2026-12-31T00:00:00Z', launchDate)).toBe(false);
  });

  it('returns false when dynastyId is empty string', () => {
    expect(validateFoundingMarkEligibility('', '2027-01-01T00:00:00Z', launchDate)).toBe(false);
  });

  it('returns false when dynastyId is only whitespace', () => {
    expect(validateFoundingMarkEligibility('   ', '2027-01-01T00:00:00Z', launchDate)).toBe(false);
  });

  it('returns false for invalid date strings', () => {
    expect(validateFoundingMarkEligibility('d-001', 'not-a-date', launchDate)).toBe(false);
  });
});

// ── awardFoundingMark ─────────────────────────────────────────────────────────

describe('awardFoundingMark', () => {
  it('returns record with AWARDED status', () => {
    const record = awardFoundingMark('d-001', 1000, 1000, '2027-01-01T00:00:00Z');
    expect(record.status).toBe('AWARDED');
  });

  it('isTransferable is always false', () => {
    const record = awardFoundingMark('d-001', 1000, 1000, '2027-01-01T00:00:00Z');
    expect(record.isTransferable).toBe(false);
  });

  it('stores dynastyId', () => {
    const record = awardFoundingMark('d-001', 1000, 1000, '2027-01-01T00:00:00Z');
    expect(record.dynastyId).toBe('d-001');
  });

  it('stores blockHeightAtAward', () => {
    const record = awardFoundingMark('d-001', 5000, 1000, '2027-01-01T00:00:00Z');
    expect(record.blockHeightAtAward).toBe(5000);
  });

  it('computes inGameDayAtAward as at least 1', () => {
    const record = awardFoundingMark('d-001', 1000, 1000, '2027-01-01T00:00:00Z');
    expect(record.inGameDayAtAward).toBeGreaterThanOrEqual(1);
  });

  it('stores narrativeSignificance', () => {
    const record = awardFoundingMark('d-001', 1000, 1000, '2027-01-01T00:00:00Z');
    expect(record.narrativeSignificance).toBe(FOUNDING_MARK_NARRATIVE);
  });
});

// ── buildNotEligibleRecord ────────────────────────────────────────────────────

describe('buildNotEligibleRecord', () => {
  it('returns NOT_ELIGIBLE status', () => {
    expect(buildNotEligibleRecord('d-late').status).toBe('NOT_ELIGIBLE');
  });

  it('isTransferable is false', () => {
    expect(buildNotEligibleRecord('d-late').isTransferable).toBe(false);
  });

  it('awardedAt is undefined', () => {
    expect(buildNotEligibleRecord('d-late').awardedAt).toBeUndefined();
  });
});

// ── buildWindowOpenRecord ─────────────────────────────────────────────────────

describe('buildWindowOpenRecord', () => {
  it('returns WINDOW_OPEN status', () => {
    expect(buildWindowOpenRecord('d-early').status).toBe('WINDOW_OPEN');
  });
});

// ── buildWindowClosedRecord ───────────────────────────────────────────────────

describe('buildWindowClosedRecord', () => {
  it('returns WINDOW_CLOSED status', () => {
    expect(buildWindowClosedRecord('d-closed').status).toBe('WINDOW_CLOSED');
  });
});

// ── buildFoundingMarkChronicleEntry ───────────────────────────────────────────

describe('buildFoundingMarkChronicleEntry', () => {
  it('returns entry with inGameDay 0 for NOT_ELIGIBLE record', () => {
    const record = buildNotEligibleRecord('d-001');
    const entry = buildFoundingMarkChronicleEntry(record);
    expect(entry.inGameDay).toBe(0);
    expect(entry.dynastyId).toBe('d-001');
  });

  it('returns ineligible entry for WINDOW_OPEN record', () => {
    const record = buildWindowOpenRecord('d-002');
    const entry = buildFoundingMarkChronicleEntry(record);
    expect(entry.inGameDay).toBe(0);
  });

  it('returns narrative entry for AWARDED record', () => {
    const record = awardFoundingMark('d-001', 1000, 1000, '2027-01-01T00:00:00Z');
    const entry = buildFoundingMarkChronicleEntry(record);
    expect(entry.inGameDay).toBeGreaterThanOrEqual(1);
    expect(entry.chronicleText).toContain('d-001');
    expect(entry.entryId).toContain('founding-mark');
  });

  it('chronicle text for awarded record mentions Assembly', () => {
    const record = awardFoundingMark('d-abc', 1000, 1000, '2027-01-01T00:00:00Z');
    const entry = buildFoundingMarkChronicleEntry(record);
    expect(entry.chronicleText).toContain('Assembly');
  });
});

// ── createFoundingMarkRegistry ────────────────────────────────────────────────

describe('createFoundingMarkRegistry', () => {
  const LAUNCH_BLOCK = 0;
  const WINDOW_DATE = '2027-01-02T00:00:00Z';
  const BEFORE_WINDOW_DATE = '2027-01-08T00:00:00Z';

  it('starts with 0 total awarded', () => {
    const registry = createFoundingMarkRegistry();
    expect(registry.totalAwarded()).toBe(0);
  });

  it('getRecord returns undefined for unregistered dynasty', () => {
    const registry = createFoundingMarkRegistry();
    expect(registry.getRecord('unknown')).toBeUndefined();
  });

  it('isWindowOpen delegates to isFoundingMarkWindowOpen', () => {
    const registry = createFoundingMarkRegistry();
    expect(registry.isWindowOpen(LAUNCH_BLOCK + 100, LAUNCH_BLOCK)).toBe(true);
    expect(registry.isWindowOpen(LAUNCH_BLOCK + 100_000, LAUNCH_BLOCK)).toBe(false);
  });

  it('awards mark when eligible and window open', () => {
    const registry = createFoundingMarkRegistry();
    const record = registry.awardIfEligible('d-001', WINDOW_DATE, LAUNCH_BLOCK + 100, LAUNCH_BLOCK, WINDOW_DATE);
    expect(record.status).toBe('AWARDED');
  });

  it('returns NOT_ELIGIBLE when dynasty joined after window', () => {
    const registry = createFoundingMarkRegistry();
    const record = registry.awardIfEligible('d-late', BEFORE_WINDOW_DATE, LAUNCH_BLOCK + 100, LAUNCH_BLOCK, WINDOW_DATE);
    expect(record.status).toBe('NOT_ELIGIBLE');
  });

  it('increments totalAwarded after a valid award', () => {
    const registry = createFoundingMarkRegistry();
    registry.awardIfEligible('d-001', WINDOW_DATE, LAUNCH_BLOCK + 100, LAUNCH_BLOCK, WINDOW_DATE);
    expect(registry.totalAwarded()).toBe(1);
  });

  it('listAwarded returns awarded records', () => {
    const registry = createFoundingMarkRegistry();
    registry.awardIfEligible('d-001', WINDOW_DATE, LAUNCH_BLOCK + 100, LAUNCH_BLOCK, WINDOW_DATE);
    registry.awardIfEligible('d-002', WINDOW_DATE, LAUNCH_BLOCK + 200, LAUNCH_BLOCK, WINDOW_DATE);
    const awarded = registry.listAwarded();
    expect(awarded.length).toBe(2);
    expect(awarded.every((r) => r.status === 'AWARDED')).toBe(true);
  });

  it('returns same record on repeated awardIfEligible for same dynasty', () => {
    const registry = createFoundingMarkRegistry();
    const first = registry.awardIfEligible('d-001', WINDOW_DATE, LAUNCH_BLOCK + 100, LAUNCH_BLOCK, WINDOW_DATE);
    const second = registry.awardIfEligible('d-001', WINDOW_DATE, LAUNCH_BLOCK + 200, LAUNCH_BLOCK, WINDOW_DATE);
    expect(first).toBe(second);
  });

  it('getRecord returns stored record after award', () => {
    const registry = createFoundingMarkRegistry();
    registry.awardIfEligible('d-001', WINDOW_DATE, LAUNCH_BLOCK + 100, LAUNCH_BLOCK, WINDOW_DATE);
    const record = registry.getRecord('d-001');
    expect(record?.dynastyId).toBe('d-001');
  });

  it('window closed record when block height beyond window', () => {
    const registry = createFoundingMarkRegistry();
    const closedBlock = LAUNCH_BLOCK + FOUNDING_MARK_WINDOW_BLOCKS + 1;
    const record = registry.awardIfEligible('d-001', WINDOW_DATE, closedBlock, LAUNCH_BLOCK, WINDOW_DATE);
    expect(record.status).toBe('WINDOW_CLOSED');
  });
});
