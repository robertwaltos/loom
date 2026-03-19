import { describe, it, expect } from 'vitest';
import {
  WORLD_03_GOVERNANCE_NOTE,
  DEFAULT_ELECTION_CYCLE_YEARS,
  POPULATION_DELEGATE_TIERS,
  computeDelegateSlots,
  isElectionDue,
  scheduleLocalElection,
  openElectionVoting,
  closeElectionVoting,
  certifyElectionResult,
  contestElectionResult,
  resolveContestedElection,
  transitionGovernanceModel,
  setDelegates,
  setNpcSovereignStateApplication,
  clearElectionStatus,
  buildGovernanceChronicleEntry,
  createWorldGovernanceState,
  type WorldGovernanceState,
  type WorldGovernanceModel,
} from '../world-local-governance.js';

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('WORLD_03_GOVERNANCE_NOTE mentions Amber Reach', () => {
    expect(WORLD_03_GOVERNANCE_NOTE).toContain('Amber Reach');
  });

  it('DEFAULT_ELECTION_CYCLE_YEARS is 5', () => {
    expect(DEFAULT_ELECTION_CYCLE_YEARS).toBe(5);
  });

  it('POPULATION_DELEGATE_TIERS has at least 5 entries', () => {
    expect(POPULATION_DELEGATE_TIERS.length).toBeGreaterThanOrEqual(5);
  });
});

// ── computeDelegateSlots ──────────────────────────────────────────────────────

describe('computeDelegateSlots', () => {
  it('returns 1 for population below 100M', () => {
    expect(computeDelegateSlots(50_000_000)).toBe(1);
  });

  it('returns 2 for population between 100M and 500M', () => {
    expect(computeDelegateSlots(200_000_000)).toBe(2);
  });

  it('returns 3 for population between 500M and 1B', () => {
    expect(computeDelegateSlots(750_000_000)).toBe(3);
  });

  it('returns 4 for population between 1B and 3B', () => {
    expect(computeDelegateSlots(2_000_000_000)).toBe(4);
  });

  it('returns 5 for population above 3B', () => {
    expect(computeDelegateSlots(4_000_000_000)).toBe(5);
  });
});

// ── createWorldGovernanceState ────────────────────────────────────────────────

function makeState(overrides: Partial<WorldGovernanceState> = {}): WorldGovernanceState {
  const base = createWorldGovernanceState({
    worldId: 'world-001',
    governanceModel: 'DIRECT_DEMOCRACY',
    population: 50_000_000,
  });
  return { ...base, ...overrides };
}

describe('createWorldGovernanceState', () => {
  it('sets worldId correctly', () => {
    const s = createWorldGovernanceState({ worldId: 'w-99', governanceModel: 'FREE_PORT', population: 1 });
    expect(s.worldId).toBe('w-99');
  });

  it('starts with NO_ELECTION status', () => {
    expect(makeState().localElectionStatus).toBe('NO_ELECTION');
  });

  it('starts with empty delegateIds', () => {
    expect(makeState().currentDelegateIds).toHaveLength(0);
  });

  it('starts with npcSovereignStateApplicationFiled = false', () => {
    expect(makeState().npcSovereignStateApplicationFiled).toBe(false);
  });

  it('starts with empty historicalTransitions', () => {
    expect(makeState().historicalTransitions).toHaveLength(0);
  });

  it('computes delegate slots from population', () => {
    const s = createWorldGovernanceState({
      worldId: 'w1',
      governanceModel: 'REPRESENTATIVE',
      population: 200_000_000,
    });
    expect(s.delegateSlots).toBe(2);
  });

  it('uses provided electionCycleYears', () => {
    const s = createWorldGovernanceState({
      worldId: 'w1',
      governanceModel: 'REPRESENTATIVE',
      population: 1_000,
      electionCycleYears: 10,
    });
    expect(s.electionCycleYears).toBe(10);
  });
});

// ── isElectionDue ─────────────────────────────────────────────────────────────

describe('isElectionDue', () => {
  it('returns true when lastElectionYear is undefined', () => {
    expect(isElectionDue(makeState(), 10)).toBe(true);
  });

  it('returns true when cycle is exceeded', () => {
    const s = makeState({ lastElectionYear: 1, electionCycleYears: 5 });
    expect(isElectionDue(s, 6)).toBe(true);
  });

  it('returns false when cycle not yet reached', () => {
    const s = makeState({ lastElectionYear: 1, electionCycleYears: 5 });
    expect(isElectionDue(s, 5)).toBe(false);
  });
});

// ── scheduleLocalElection ─────────────────────────────────────────────────────

describe('scheduleLocalElection', () => {
  it('advances NO_ELECTION → CAMPAIGN_PERIOD', () => {
    const updated = scheduleLocalElection(makeState(), 10);
    expect(updated.localElectionStatus).toBe('CAMPAIGN_PERIOD');
  });

  it('sets lastElectionYear', () => {
    const updated = scheduleLocalElection(makeState(), 10);
    expect(updated.lastElectionYear).toBe(10);
  });

  it('has no effect when election already in CAMPAIGN_PERIOD', () => {
    const s = makeState({ localElectionStatus: 'CAMPAIGN_PERIOD' });
    expect(scheduleLocalElection(s, 20)).toBe(s);
  });

  it('has no effect when election is VOTING_OPEN', () => {
    const s = makeState({ localElectionStatus: 'VOTING_OPEN' });
    expect(scheduleLocalElection(s, 20)).toBe(s);
  });
});

// ── openElectionVoting / closeElectionVoting ──────────────────────────────────

describe('openElectionVoting', () => {
  it('advances CAMPAIGN_PERIOD → VOTING_OPEN', () => {
    const s = makeState({ localElectionStatus: 'CAMPAIGN_PERIOD' });
    expect(openElectionVoting(s).localElectionStatus).toBe('VOTING_OPEN');
  });

  it('has no effect when status is not CAMPAIGN_PERIOD', () => {
    const s = makeState({ localElectionStatus: 'NO_ELECTION' });
    expect(openElectionVoting(s)).toBe(s);
  });
});

describe('closeElectionVoting', () => {
  it('advances VOTING_OPEN → VOTE_COUNTING', () => {
    const s = makeState({ localElectionStatus: 'VOTING_OPEN' });
    expect(closeElectionVoting(s).localElectionStatus).toBe('VOTE_COUNTING');
  });

  it('has no effect when status is not VOTING_OPEN', () => {
    const s = makeState({ localElectionStatus: 'CAMPAIGN_PERIOD' });
    expect(closeElectionVoting(s)).toBe(s);
  });
});

// ── certifyElectionResult ─────────────────────────────────────────────────────

describe('certifyElectionResult', () => {
  it('sets status to RESULT_CERTIFIED', () => {
    const updated = certifyElectionResult(makeState(), 'dynasty-alpha', 10);
    expect(updated.localElectionStatus).toBe('RESULT_CERTIFIED');
  });

  it('sets sovereign dynasty to winner', () => {
    const updated = certifyElectionResult(makeState(), 'dynasty-alpha', 10);
    expect(updated.currentSovereignDynastyId).toBe('dynasty-alpha');
  });
});

// ── contestElectionResult / resolveContestedElection ─────────────────────────

describe('contestElectionResult', () => {
  it('advances RESULT_CERTIFIED → CONTESTED_RESULT', () => {
    const s = makeState({ localElectionStatus: 'RESULT_CERTIFIED' });
    expect(contestElectionResult(s).localElectionStatus).toBe('CONTESTED_RESULT');
  });

  it('has no effect when status is not RESULT_CERTIFIED', () => {
    const s = makeState({ localElectionStatus: 'VOTING_OPEN' });
    expect(contestElectionResult(s)).toBe(s);
  });
});

describe('resolveContestedElection', () => {
  it('certifies result with resolved dynasty', () => {
    const s = makeState({ localElectionStatus: 'CONTESTED_RESULT' });
    const updated = resolveContestedElection(s, 'dynasty-beta', 15);
    expect(updated.localElectionStatus).toBe('RESULT_CERTIFIED');
    expect(updated.currentSovereignDynastyId).toBe('dynasty-beta');
  });

  it('has no effect when status is not CONTESTED_RESULT', () => {
    const s = makeState({ localElectionStatus: 'NO_ELECTION' });
    expect(resolveContestedElection(s, 'd', 10)).toBe(s);
  });
});

// ── transitionGovernanceModel ─────────────────────────────────────────────────

describe('transitionGovernanceModel', () => {
  it('changes governance model', () => {
    const s = makeState();
    const updated = transitionGovernanceModel(s, 'REPRESENTATIVE', 'reasons', 5, 'chr-001');
    expect(updated.governanceModel).toBe('REPRESENTATIVE');
  });

  it('appends to historicalTransitions', () => {
    const s = makeState();
    const updated = transitionGovernanceModel(s, 'COMPACT_CONSORTIUM', 'war outcome', 10, 'chr-002');
    expect(updated.historicalTransitions).toHaveLength(1);
    expect(updated.historicalTransitions[0]?.fromModel).toBe('DIRECT_DEMOCRACY');
    expect(updated.historicalTransitions[0]?.toModel).toBe('COMPACT_CONSORTIUM');
  });
});

// ── setDelegates ──────────────────────────────────────────────────────────────

describe('setDelegates', () => {
  it('installs delegates when count within slots', () => {
    const s = makeState({ delegateSlots: 2 });
    const updated = setDelegates(s, ['d1', 'd2']);
    expect(updated.currentDelegateIds).toEqual(['d1', 'd2']);
  });

  it('throws when too many delegates specified', () => {
    const s = makeState({ delegateSlots: 1 });
    expect(() => setDelegates(s, ['d1', 'd2'])).toThrow();
  });
});

// ── setNpcSovereignStateApplication ──────────────────────────────────────────

describe('setNpcSovereignStateApplication', () => {
  it('sets application filed to true', () => {
    expect(setNpcSovereignStateApplication(makeState(), true).npcSovereignStateApplicationFiled).toBe(true);
  });

  it('sets application filed to false', () => {
    const s = makeState({ npcSovereignStateApplicationFiled: true });
    expect(setNpcSovereignStateApplication(s, false).npcSovereignStateApplicationFiled).toBe(false);
  });
});

// ── clearElectionStatus ───────────────────────────────────────────────────────

describe('clearElectionStatus', () => {
  it('resets status to NO_ELECTION', () => {
    const s = makeState({ localElectionStatus: 'RESULT_CERTIFIED' });
    expect(clearElectionStatus(s).localElectionStatus).toBe('NO_ELECTION');
  });
});

// ── buildGovernanceChronicleEntry ─────────────────────────────────────────────

describe('buildGovernanceChronicleEntry', () => {
  it('returns category GOVERNANCE', () => {
    const entry = buildGovernanceChronicleEntry(makeState(), 10);
    expect(entry.category).toBe('GOVERNANCE');
  });

  it('worldId matches state', () => {
    const entry = buildGovernanceChronicleEntry(makeState(), 10);
    expect(entry.worldId).toBe('world-001');
  });

  it('summary contains world id', () => {
    const entry = buildGovernanceChronicleEntry(makeState(), 10);
    expect(entry.summary).toContain('world-001');
  });

  it('summary contains year', () => {
    const entry = buildGovernanceChronicleEntry(makeState(), 42);
    expect(entry.summary).toContain('42');
  });

  it('electionStatus reflects state', () => {
    const s = makeState({ localElectionStatus: 'VOTING_OPEN' });
    const entry = buildGovernanceChronicleEntry(s, 1);
    expect(entry.electionStatus).toBe('VOTING_OPEN');
  });

  it('delegateSlots reflects computed value', () => {
    const entry = buildGovernanceChronicleEntry(makeState(), 1);
    expect(entry.delegateSlots).toBe(1); // population 50M → 1 slot
  });
});
