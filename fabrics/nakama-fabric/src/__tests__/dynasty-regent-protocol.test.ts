import { describe, it, expect } from 'vitest';
import {
  REGENT_ACTIVATION_REAL_MONTHS,
  REGENT_CHRONICLE_INTERVAL_INGAME_DAYS,
  RETURN_ACCLIMATISATION_INGAME_DAYS,
  MAX_REGENT_QUEUE_RETENTION_INGAME_DAYS,
  activateRegent,
  generateRegentChronicleEntry,
  processReturn,
  buildReturnSummary,
  buildReturnChronicleEntry,
  createRegentProtocolState,
  recordRegentChronicleEntry,
  updateKalonPreserved,
  enqueueMessage,
  enqueueVote,
  enqueueTradeOffer,
  beginMonitoring,
  isUnderRegency,
  isInAcclimatisationWindow,
  advanceAcclimatisation,
} from '../dynasty-regent-protocol.js';
import type { RegentProtocolState } from '../dynasty-regent-protocol.js';

function makeState(overrides: Partial<RegentProtocolState> = {}): RegentProtocolState {
  return {
    ...createRegentProtocolState('dynasty-test', 'npc-regent-001'),
    ...overrides,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('REGENT_ACTIVATION_REAL_MONTHS is 6', () => {
    expect(REGENT_ACTIVATION_REAL_MONTHS).toBe(6);
  });

  it('REGENT_CHRONICLE_INTERVAL_INGAME_DAYS is 10', () => {
    expect(REGENT_CHRONICLE_INTERVAL_INGAME_DAYS).toBe(10);
  });

  it('RETURN_ACCLIMATISATION_INGAME_DAYS is 90', () => {
    expect(RETURN_ACCLIMATISATION_INGAME_DAYS).toBe(90);
  });

  it('MAX_REGENT_QUEUE_RETENTION_INGAME_DAYS is 1000', () => {
    expect(MAX_REGENT_QUEUE_RETENTION_INGAME_DAYS).toBe(1_000);
  });
});

// ─── createRegentProtocolState ───────────────────────────────────────────────

describe('createRegentProtocolState', () => {
  it('creates state with NOT_ACTIVE status', () => {
    const state = createRegentProtocolState('dynasty-x', 'npc-y');
    expect(state.status).toBe('NOT_ACTIVE');
  });

  it('sets dynastyId correctly', () => {
    const state = createRegentProtocolState('dynasty-x', 'npc-y');
    expect(state.dynastyId).toBe('dynasty-x');
  });

  it('sets regentNpcId correctly', () => {
    const state = createRegentProtocolState('dynasty-x', 'npc-y');
    expect(state.regentNpcId).toBe('npc-y');
  });

  it('all numeric fields start at 0', () => {
    const state = createRegentProtocolState('dynasty-x', 'npc-y');
    expect(state.totalKalonPreserved).toBe(0n);
    expect(state.chronicleEntriesFiledByRegent).toBe(0);
    expect(state.queuedMessages).toBe(0);
    expect(state.queuedVotes).toBe(0);
    expect(state.queuedTradeOffers).toBe(0);
    expect(state.returnAcclimatisationDaysRemaining).toBe(0);
  });

  it('activatedAt and realWorldActivationDate are undefined', () => {
    const state = createRegentProtocolState('dynasty-x', 'npc-y');
    expect(state.activatedAt).toBeUndefined();
    expect(state.realWorldActivationDate).toBeUndefined();
  });
});

// ─── activateRegent ───────────────────────────────────────────────────────────

describe('activateRegent', () => {
  it('INACTIVITY_6_MONTHS trigger → REGENT_ASSIGNED', () => {
    const state = makeState();
    const updated = activateRegent(state, 'INACTIVITY_6_MONTHS', 10, '2050-01-01');
    expect(updated.status).toBe('REGENT_ASSIGNED');
  });

  it('PLAYER_REQUEST trigger → REGENT_ASSIGNED', () => {
    const state = makeState();
    const updated = activateRegent(state, 'PLAYER_REQUEST', 10, '2050-01-01');
    expect(updated.status).toBe('REGENT_ASSIGNED');
  });

  it('EMERGENCY_SUCCESSION trigger → FULL_REGENT', () => {
    const state = makeState();
    const updated = activateRegent(state, 'EMERGENCY_SUCCESSION', 10, '2050-01-01');
    expect(updated.status).toBe('FULL_REGENT');
  });

  it('REAL_WORLD_DEATH trigger → FULL_REGENT', () => {
    const state = makeState();
    const updated = activateRegent(state, 'REAL_WORLD_DEATH', 10, '2050-01-01');
    expect(updated.status).toBe('FULL_REGENT');
  });

  it('sets activatedAt to provided inGameYear', () => {
    const state = makeState();
    const updated = activateRegent(state, 'PLAYER_REQUEST', 42, '2050-01-01');
    expect(updated.activatedAt).toBe(42);
  });

  it('sets realWorldActivationDate to provided date', () => {
    const state = makeState();
    const updated = activateRegent(state, 'PLAYER_REQUEST', 1, '2099-06-15');
    expect(updated.realWorldActivationDate).toBe('2099-06-15');
  });

  it('does not mutate the original state', () => {
    const state = makeState();
    activateRegent(state, 'PLAYER_REQUEST', 1, '2099-06-15');
    expect(state.status).toBe('NOT_ACTIVE');
  });
});

// ─── generateRegentChronicleEntry ────────────────────────────────────────────

describe('generateRegentChronicleEntry', () => {
  it('generates entry with correct dynastyId and inGameYear', () => {
    const entry = generateRegentChronicleEntry('dynasty-z', 15, 1_000_000_000n);
    expect(entry.dynastyId).toBe('dynasty-z');
    expect(entry.inGameYear).toBe(15);
  });

  it('entryId encodes dynastyId and year', () => {
    const entry = generateRegentChronicleEntry('dynasty-z', 15, 1_000_000_000n);
    expect(entry.entryId).toContain('dynasty-z');
    expect(entry.entryId).toContain('15');
  });

  it('entryText contains KALON balance in KALON (not micro)', () => {
    const entry = generateRegentChronicleEntry('dynasty-z', 5, 2_500_000_000n);
    // 2_500_000_000 / 1_000_000 = 2500 KALON
    expect(entry.entryText).toContain('2500 KALON');
  });

  it('entryText contains the dynasty name', () => {
    const entry = generateRegentChronicleEntry('dynasty-abc', 1, 0n);
    expect(entry.entryText).toContain('dynasty-abc');
  });

  it('entryText mentions regent mandate', () => {
    const entry = generateRegentChronicleEntry('dynasty-z', 1, 0n);
    expect(entry.entryText).toContain('regent');
  });

  it('kalonBalance stored in entry matches input', () => {
    const entry = generateRegentChronicleEntry('d', 1, 999_999n);
    expect(entry.kalonBalance).toBe(999_999n);
  });
});

// ─── processReturn ────────────────────────────────────────────────────────────

describe('processReturn', () => {
  it('transitions status to RETURNING', () => {
    const state = makeState({ status: 'REGENT_ASSIGNED', activatedAt: 5 });
    const updated = processReturn(state, 15);
    expect(updated.status).toBe('RETURNING');
  });

  it('sets returnAcclimatisationDaysRemaining to the constant', () => {
    const state = makeState({ status: 'REGENT_ASSIGNED', activatedAt: 5 });
    const updated = processReturn(state, 15);
    expect(updated.returnAcclimatisationDaysRemaining).toBe(RETURN_ACCLIMATISATION_INGAME_DAYS);
  });

  it('does not mutate the original state', () => {
    const state = makeState({ status: 'REGENT_ASSIGNED' });
    processReturn(state, 10);
    expect(state.status).toBe('REGENT_ASSIGNED');
  });
});

// ─── buildReturnSummary ───────────────────────────────────────────────────────

describe('buildReturnSummary', () => {
  it('builds summary with correct dynastyId', () => {
    const state = makeState({ activatedAt: 10, chronicleEntriesFiledByRegent: 3, totalKalonPreserved: 1_000_000n });
    const summary = buildReturnSummary(state, 20);
    expect(summary.dynastyId).toBe('dynasty-test');
  });

  it('inGameYearsAway = currentYear - activatedAt', () => {
    const state = makeState({ activatedAt: 10 });
    const summary = buildReturnSummary(state, 25);
    expect(summary.inGameYearsAway).toBe(15);
  });

  it('inGameYearsAway is 0 when activatedAt is undefined', () => {
    const state = makeState({ activatedAt: undefined });
    const summary = buildReturnSummary(state, 25);
    expect(summary.inGameYearsAway).toBe(0);
  });

  it('chronicleEntries matches state.chronicleEntriesFiledByRegent', () => {
    const state = makeState({ chronicleEntriesFiledByRegent: 7 });
    const summary = buildReturnSummary(state, 1);
    expect(summary.chronicleEntries).toBe(7);
  });

  it('kalonPreserved matches state.totalKalonPreserved', () => {
    const state = makeState({ totalKalonPreserved: 999_000_000n });
    const summary = buildReturnSummary(state, 1);
    expect(summary.kalonPreserved).toBe(999_000_000n);
  });

  it('politicalEventsQueued is sum of queued items', () => {
    const state = makeState({ queuedMessages: 2, queuedVotes: 3, queuedTradeOffers: 1 });
    const summary = buildReturnSummary(state, 1);
    expect(summary.politicalEventsQueued).toBe(6);
  });

  it('summaryText contains dynasty name', () => {
    const state = makeState();
    const summary = buildReturnSummary(state, 1);
    expect(summary.summaryText).toContain('dynasty-test');
  });
});

// ─── buildReturnChronicleEntry ────────────────────────────────────────────────

describe('buildReturnChronicleEntry', () => {
  it('entryId starts with "return-chronicle"', () => {
    const state = makeState({ activatedAt: 5 });
    const entry = buildReturnChronicleEntry(state, 'dynasty-test', 15);
    expect(entry.entryId).toContain('return-chronicle');
  });

  it('entryText contains dynastyId', () => {
    const state = makeState({ activatedAt: 5 });
    const entry = buildReturnChronicleEntry(state, 'dynasty-test', 15);
    expect(entry.entryText).toContain('dynasty-test');
  });

  it('kalonBalance in entry matches state.totalKalonPreserved', () => {
    const state = makeState({ totalKalonPreserved: 5_000_000_000n });
    const entry = buildReturnChronicleEntry(state, 'dynasty-test', 10);
    expect(entry.kalonBalance).toBe(5_000_000_000n);
  });
});

// ─── State mutation helpers ───────────────────────────────────────────────────

describe('recordRegentChronicleEntry', () => {
  it('increments chronicleEntriesFiledByRegent by 1', () => {
    const state = makeState({ chronicleEntriesFiledByRegent: 4 });
    expect(recordRegentChronicleEntry(state).chronicleEntriesFiledByRegent).toBe(5);
  });
});

describe('updateKalonPreserved', () => {
  it('sets totalKalonPreserved to the new value', () => {
    const state = makeState();
    expect(updateKalonPreserved(state, 42_000_000n).totalKalonPreserved).toBe(42_000_000n);
  });
});

describe('enqueueMessage', () => {
  it('increments queuedMessages by 1', () => {
    const state = makeState({ queuedMessages: 2 });
    expect(enqueueMessage(state).queuedMessages).toBe(3);
  });
});

describe('enqueueVote', () => {
  it('increments queuedVotes by 1', () => {
    const state = makeState({ queuedVotes: 0 });
    expect(enqueueVote(state).queuedVotes).toBe(1);
  });
});

describe('enqueueTradeOffer', () => {
  it('increments queuedTradeOffers by 1', () => {
    const state = makeState({ queuedTradeOffers: 5 });
    expect(enqueueTradeOffer(state).queuedTradeOffers).toBe(6);
  });
});

describe('beginMonitoring', () => {
  it('transitions status to MONITORING', () => {
    const state = makeState({ status: 'NOT_ACTIVE' });
    expect(beginMonitoring(state).status).toBe('MONITORING');
  });
});

// ─── isUnderRegency ───────────────────────────────────────────────────────────

describe('isUnderRegency', () => {
  it('returns false for NOT_ACTIVE', () => {
    expect(isUnderRegency(makeState({ status: 'NOT_ACTIVE' }))).toBe(false);
  });

  it('returns false for MONITORING', () => {
    expect(isUnderRegency(makeState({ status: 'MONITORING' }))).toBe(false);
  });

  it('returns true for REGENT_ASSIGNED', () => {
    expect(isUnderRegency(makeState({ status: 'REGENT_ASSIGNED' }))).toBe(true);
  });

  it('returns true for FULL_REGENT', () => {
    expect(isUnderRegency(makeState({ status: 'FULL_REGENT' }))).toBe(true);
  });

  it('returns false for RETURNING', () => {
    expect(isUnderRegency(makeState({ status: 'RETURNING' }))).toBe(false);
  });
});

// ─── isInAcclimatisationWindow ────────────────────────────────────────────────

describe('isInAcclimatisationWindow', () => {
  it('returns false when NOT_ACTIVE', () => {
    expect(isInAcclimatisationWindow(makeState({ status: 'NOT_ACTIVE', returnAcclimatisationDaysRemaining: 90 }))).toBe(false);
  });

  it('returns true when RETURNING with days remaining', () => {
    expect(isInAcclimatisationWindow(makeState({ status: 'RETURNING', returnAcclimatisationDaysRemaining: 50 }))).toBe(true);
  });

  it('returns false when RETURNING with 0 days remaining', () => {
    expect(isInAcclimatisationWindow(makeState({ status: 'RETURNING', returnAcclimatisationDaysRemaining: 0 }))).toBe(false);
  });
});

// ─── advanceAcclimatisation ───────────────────────────────────────────────────

describe('advanceAcclimatisation', () => {
  it('reduces days remaining by the given amount', () => {
    const state = makeState({ status: 'RETURNING', returnAcclimatisationDaysRemaining: 90 });
    const updated = advanceAcclimatisation(state, 30);
    expect(updated.returnAcclimatisationDaysRemaining).toBe(60);
  });

  it('clamps days at 0 when advance exceeds remaining', () => {
    const state = makeState({ status: 'RETURNING', returnAcclimatisationDaysRemaining: 10 });
    const updated = advanceAcclimatisation(state, 100);
    expect(updated.returnAcclimatisationDaysRemaining).toBe(0);
  });

  it('transitions to NOT_ACTIVE when days hit 0', () => {
    const state = makeState({ status: 'RETURNING', returnAcclimatisationDaysRemaining: 5 });
    const updated = advanceAcclimatisation(state, 5);
    expect(updated.status).toBe('NOT_ACTIVE');
  });

  it('stays RETURNING when days are still > 0', () => {
    const state = makeState({ status: 'RETURNING', returnAcclimatisationDaysRemaining: 90 });
    const updated = advanceAcclimatisation(state, 45);
    expect(updated.status).toBe('RETURNING');
  });
});
