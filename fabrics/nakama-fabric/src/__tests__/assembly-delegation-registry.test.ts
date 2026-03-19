import { describe, it, expect } from 'vitest';
import {
  FOUNDING_WORLD_COUNT,
  ASSEMBLY_SIZE_AT_YEAR,
  DEFAULT_DELEGATE_VOTING_WEIGHT,
  FOUNDING_WORLD_DELEGATE_WEIGHT,
  LAUNCH_WORLD_DELEGATIONS,
  computeTotalVotingCapacity,
  getFoundingWorldDelegations,
  getOuterArcDelegations,
  getDelegationsByStatus,
  admitNewDelegation,
  updateDelegation,
  suspendDelegation,
  reinstateDelegation,
  revokeDelegation,
  grantObserverStatus,
  ratifyDelegation,
  recordDelegationElection,
  buildDelegationSummaryChronicleEntry,
  createDelegationRegistryState,
  createEmptyDelegationRegistryState,
} from '../assembly-delegation-registry.js';
import type {
  AssemblyDelegation,
  DelegationRegistryState,
} from '../assembly-delegation-registry.js';

// ── Helpers ──────────────────────────────────────────────────────────

function makeOuter(worldId = 'world-999'): AssemblyDelegation {
  return {
    worldId,
    worldName: 'Test World',
    delegationStatus: 'ACTIVE',
    delegateIds: ['d1', 'd2'],
    delegateSlots: 2,
    admittedYear: 50,
    lastElectionYear: undefined,
    votingWeightTotal: DEFAULT_DELEGATE_VOTING_WEIGHT * 2,
    isFoundingWorld: false,
    arcId: 'arc-3',
  };
}

function emptyState(): DelegationRegistryState {
  return createEmptyDelegationRegistryState();
}

// ── Constants ────────────────────────────────────────────────────────

describe('constants', () => {
  it('FOUNDING_WORLD_COUNT is 20', () => {
    expect(FOUNDING_WORLD_COUNT).toBe(20);
  });

  it('ASSEMBLY_SIZE_AT_YEAR contains key years', () => {
    expect(ASSEMBLY_SIZE_AT_YEAR[1]).toBe(20);
    expect(ASSEMBLY_SIZE_AT_YEAR[105]).toBe(600);
  });

  it('DEFAULT_DELEGATE_VOTING_WEIGHT is 1.0', () => {
    expect(DEFAULT_DELEGATE_VOTING_WEIGHT).toBe(1.0);
  });

  it('FOUNDING_WORLD_DELEGATE_WEIGHT is 1.5', () => {
    expect(FOUNDING_WORLD_DELEGATE_WEIGHT).toBe(1.5);
  });
});

// ── LAUNCH_WORLD_DELEGATIONS ─────────────────────────────────────────

describe('LAUNCH_WORLD_DELEGATIONS', () => {
  it('contains 20 worlds', () => {
    expect(Object.keys(LAUNCH_WORLD_DELEGATIONS).length).toBe(20);
  });

  it('world-001 is Verdant Prime and is a founding world', () => {
    const d = LAUNCH_WORLD_DELEGATIONS['world-001'];
    expect(d.worldName).toBe('Verdant Prime');
    expect(d.isFoundingWorld).toBe(true);
  });

  it('world-020 is The Concord Heart', () => {
    expect(LAUNCH_WORLD_DELEGATIONS['world-020'].worldName).toBe('The Concord Heart');
  });

  it('all launch worlds start ACTIVE', () => {
    expect(
      Object.values(LAUNCH_WORLD_DELEGATIONS).every((d) => d.delegationStatus === 'ACTIVE'),
    ).toBe(true);
  });
});

// ── createEmptyDelegationRegistryState ───────────────────────────────

describe('createEmptyDelegationRegistryState', () => {
  it('has zero delegates and empty delegations', () => {
    const s = emptyState();
    expect(Object.keys(s.delegations).length).toBe(0);
    expect(s.totalDelegates).toBe(0);
    expect(s.foundingWorldDelegates).toBe(0);
    expect(s.outerArcDelegates).toBe(0);
  });
});

// ── createDelegationRegistryState ────────────────────────────────────

describe('createDelegationRegistryState', () => {
  it('pre-loads all 20 launch worlds', () => {
    const s = createDelegationRegistryState();
    expect(Object.keys(s.delegations).length).toBe(20);
  });

  it('suspension log starts empty', () => {
    expect(createDelegationRegistryState().suspensionLog.length).toBe(0);
  });
});

// ── admitNewDelegation ───────────────────────────────────────────────

describe('admitNewDelegation', () => {
  it('adds a new delegation', () => {
    const d = makeOuter();
    const s = admitNewDelegation(emptyState(), d);
    expect(s.delegations['world-999']).toBeDefined();
  });

  it('increments outerArcDelegates counter', () => {
    const d = makeOuter();
    const s = admitNewDelegation(emptyState(), d);
    expect(s.outerArcDelegates).toBe(2);
  });

  it('throws if world already has a delegation', () => {
    const d = makeOuter();
    const s = admitNewDelegation(emptyState(), d);
    expect(() => admitNewDelegation(s, d)).toThrow();
  });
});

// ── updateDelegation ─────────────────────────────────────────────────

describe('updateDelegation', () => {
  it('updates delegationStatus', () => {
    const s = admitNewDelegation(emptyState(), makeOuter());
    const updated = updateDelegation(s, 'world-999', { delegationStatus: 'SUSPENDED' });
    expect(updated.delegations['world-999'].delegationStatus).toBe('SUSPENDED');
  });

  it('throws if world has no delegation', () => {
    expect(() =>
      updateDelegation(emptyState(), 'no-world', { delegationStatus: 'ACTIVE' }),
    ).toThrow();
  });
});

// ── suspendDelegation ────────────────────────────────────────────────

describe('suspendDelegation', () => {
  it('suspends the delegation and logs the reason', () => {
    const s = admitNewDelegation(emptyState(), makeOuter());
    const updated = suspendDelegation(s, 'world-999', 'Charter violation', 55);
    expect(updated.delegations['world-999'].delegationStatus).toBe('SUSPENDED');
    expect(updated.suspensionLog.length).toBe(1);
    expect(updated.suspensionLog[0].reason).toBe('Charter violation');
    expect(updated.suspensionLog[0].year).toBe(55);
  });

  it('throws if world not found', () => {
    expect(() => suspendDelegation(emptyState(), 'nope', 'reason', 1)).toThrow();
  });
});

// ── reinstateDelegation ──────────────────────────────────────────────

describe('reinstateDelegation', () => {
  it('reinstates a suspended delegation to ACTIVE', () => {
    let s = admitNewDelegation(emptyState(), makeOuter());
    s = suspendDelegation(s, 'world-999', 'test', 10);
    s = reinstateDelegation(s, 'world-999');
    expect(s.delegations['world-999'].delegationStatus).toBe('ACTIVE');
  });
});

// ── revokeDelegation ─────────────────────────────────────────────────

describe('revokeDelegation', () => {
  it('sets status to REVOKED', () => {
    let s = admitNewDelegation(emptyState(), makeOuter());
    s = revokeDelegation(s, 'world-999');
    expect(s.delegations['world-999'].delegationStatus).toBe('REVOKED');
  });
});

// ── grantObserverStatus ──────────────────────────────────────────────

describe('grantObserverStatus', () => {
  it('sets status to OBSERVER_STATUS', () => {
    let s = admitNewDelegation(emptyState(), { ...makeOuter(), delegationStatus: 'PENDING_RATIFICATION' });
    s = grantObserverStatus(s, 'world-999');
    expect(s.delegations['world-999'].delegationStatus).toBe('OBSERVER_STATUS');
  });
});

// ── ratifyDelegation ─────────────────────────────────────────────────

describe('ratifyDelegation', () => {
  it('advances PENDING_RATIFICATION to ACTIVE', () => {
    let s = admitNewDelegation(emptyState(), { ...makeOuter(), delegationStatus: 'PENDING_RATIFICATION' });
    s = ratifyDelegation(s, 'world-999');
    expect(s.delegations['world-999'].delegationStatus).toBe('ACTIVE');
  });
});

// ── recordDelegationElection ─────────────────────────────────────────

describe('recordDelegationElection', () => {
  it('updates delegateIds and lastElectionYear', () => {
    let s = admitNewDelegation(emptyState(), makeOuter());
    s = recordDelegationElection(s, 'world-999', ['new-d1', 'new-d2', 'new-d3'], 60);
    const d = s.delegations['world-999'];
    expect(d.delegateIds).toEqual(['new-d1', 'new-d2', 'new-d3']);
    expect(d.lastElectionYear).toBe(60);
  });

  it('throws if world not found', () => {
    expect(() => recordDelegationElection(emptyState(), 'unknown', ['d1'], 1)).toThrow();
  });
});

// ── computeTotalVotingCapacity ───────────────────────────────────────

describe('computeTotalVotingCapacity', () => {
  it('returns 0 for empty state', () => {
    expect(computeTotalVotingCapacity(emptyState())).toBe(0);
  });

  it('sums only ACTIVE delegations', () => {
    let s = admitNewDelegation(emptyState(), makeOuter('world-a'));
    s = admitNewDelegation(s, { ...makeOuter('world-b'), delegationStatus: 'SUSPENDED' });
    const cap = computeTotalVotingCapacity(s);
    expect(cap).toBeCloseTo(DEFAULT_DELEGATE_VOTING_WEIGHT * 2);
  });
});

// ── getFoundingWorldDelegations / getOuterArcDelegations ─────────────

describe('getFoundingWorldDelegations', () => {
  it('returns only founding worlds from launch state', () => {
    const s = createDelegationRegistryState();
    const founding = getFoundingWorldDelegations(s);
    expect(founding.length).toBe(20);
    expect(founding.every((d) => d.isFoundingWorld)).toBe(true);
  });
});

describe('getOuterArcDelegations', () => {
  it('returns 0 outer arc delegations for launch state', () => {
    const s = createDelegationRegistryState();
    expect(getOuterArcDelegations(s).length).toBe(0);
  });

  it('returns admitted outer arc world', () => {
    const s = admitNewDelegation(createDelegationRegistryState(), makeOuter());
    const outer = getOuterArcDelegations(s);
    expect(outer.length).toBe(1);
    expect(outer[0].worldId).toBe('world-999');
  });
});

// ── getDelegationsByStatus ────────────────────────────────────────────

describe('getDelegationsByStatus', () => {
  it('returns ACTIVE delegations from launch state', () => {
    const s = createDelegationRegistryState();
    const active = getDelegationsByStatus(s, 'ACTIVE');
    expect(active.length).toBe(20);
  });

  it('returns SUSPENDED delegations after suspension', () => {
    let s = createDelegationRegistryState();
    s = suspendDelegation(s, 'world-001', 'test', 10);
    const suspended = getDelegationsByStatus(s, 'SUSPENDED');
    expect(suspended.length).toBe(1);
    expect(suspended[0].worldId).toBe('world-001');
  });
});

// ── buildDelegationSummaryChronicleEntry ─────────────────────────────

describe('buildDelegationSummaryChronicleEntry', () => {
  it('returns correct category', () => {
    const entry = buildDelegationSummaryChronicleEntry(createDelegationRegistryState(), 50);
    expect(entry.category).toBe('ASSEMBLY_COMPOSITION');
  });

  it('totalWorlds is 20 for launch state', () => {
    const entry = buildDelegationSummaryChronicleEntry(createDelegationRegistryState(), 1);
    expect(entry.totalWorlds).toBe(20);
  });

  it('summary string contains the year', () => {
    const entry = buildDelegationSummaryChronicleEntry(createDelegationRegistryState(), 77);
    expect(entry.summary).toContain('77');
  });

  it('activeDelegations is 20 for launch state', () => {
    const entry = buildDelegationSummaryChronicleEntry(createDelegationRegistryState(), 1);
    expect(entry.activeDelegations).toBe(20);
  });

  it('suspendedDelegations is 1 after one suspension', () => {
    let s = createDelegationRegistryState();
    s = suspendDelegation(s, 'world-001', 'test', 5);
    const entry = buildDelegationSummaryChronicleEntry(s, 5);
    expect(entry.suspendedDelegations).toBe(1);
  });
});
