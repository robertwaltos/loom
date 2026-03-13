import { describe, it, expect, vi } from 'vitest';
import { createGovernanceEngine } from '../governance-engine.js';
import type { GovernanceEngineDeps } from '../governance-engine.js';

// ── Helpers ────────────────────────────────────────────────────────

let idSeq = 0;

function makeDeps(nowMs = 0): GovernanceEngineDeps & { nowMs: () => number; setNow: (ms: number) => void } {
  let currentNowMs = nowMs;
  return {
    get nowMs() { return () => currentNowMs; },
    setNow: (ms) => { currentNowMs = ms; },
    clock: { nowMicroseconds: () => currentNowMs * 1_000 },
    idGenerator: { generate: () => { idSeq++; return `id-${String(idSeq)}`; } },
    logger: { info: vi.fn(), warn: vi.fn() },
    world: { applyParameter: vi.fn(), getParameter: vi.fn().mockReturnValue(0) },
    notifications: { notifyWorld: vi.fn(), notifyDynasty: vi.fn() },
  };
}

function makeEngine(nowMs = 0) {
  const deps = makeDeps(nowMs);
  const engine = createGovernanceEngine(
    { clock: deps.clock, idGenerator: deps.idGenerator, logger: deps.logger, world: deps.world, notifications: deps.notifications },
    {
      electionRegistrationDurationMs: 1_000,
      electionCampaignDurationMs: 500,
      electionVotingDurationMs: 500,
      minCandidatesForElection: 2,
      maxCandidatesPerElection: 5,
      arbitrationPanelSize: 3,
      legislationDefaultDurationMs: 10_000,
      debateDurationMs: 1_000,
      regularSessionIntervalMs: 10_000,
      regularSessionDurationMs: 1_000,
    },
  );
  return { engine, deps };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('callElection', () => {
  it('creates an election in REGISTRATION phase', () => {
    const { engine } = makeEngine();
    const election = engine.callElection('world-1', 'GOVERNOR');
    expect(election.phase).toBe('REGISTRATION');
    expect(election.role).toBe('GOVERNOR');
    expect(election.worldId).toBe('world-1');
  });

  it('assigns an id from the generator', () => {
    const { engine } = makeEngine();
    const e = engine.callElection('world-1', 'TREASURER');
    expect(e.electionId).toMatch(/^id-/);
  });

  it('is retrievable via getElection', () => {
    const { engine } = makeEngine();
    const e = engine.callElection('world-1', 'JUDGE');
    expect(engine.getElection(e.electionId)).toEqual(e);
  });
});

describe('registerCandidate', () => {
  it('adds a candidate to the election', () => {
    const { engine } = makeEngine();
    const e = engine.callElection('world-1', 'GOVERNOR');
    const updated = engine.registerCandidate({
      electionId: e.electionId,
      dynastyId: 'dynasty-a',
      displayName: 'Alice',
      platform: 'lower taxes',
    });
    expect(updated.candidates).toHaveLength(1);
    expect(updated.candidates[0]?.dynastyId).toBe('dynasty-a');
  });

  it('throws when same dynasty registers twice', () => {
    const { engine } = makeEngine();
    const e = engine.callElection('world-1', 'GOVERNOR');
    engine.registerCandidate({
      electionId: e.electionId, dynastyId: 'dynasty-a', displayName: 'Alice', platform: 'p',
    });
    expect(() => {
      engine.registerCandidate({
        electionId: e.electionId, dynastyId: 'dynasty-a', displayName: 'Alice2', platform: 'p',
      });
    }).toThrow();
  });
});

describe('concludeElection', () => {
  it('sets winner to candidate with most weighted votes', () => {
    const { engine, deps } = makeEngine(0);
    const e = engine.callElection('world-1', 'GOVERNOR');
    engine.registerCandidate({
      electionId: e.electionId, dynastyId: 'dynasty-a', displayName: 'Alice', platform: 'p',
    });
    engine.registerCandidate({
      electionId: e.electionId, dynastyId: 'dynasty-b', displayName: 'Bob', platform: 'q',
    });

    // Advance through REGISTRATION -> CAMPAIGNING -> VOTING.
    deps.setNow(1_000);
    engine.tick();
    deps.setNow(1_500);
    engine.tick();

    const id = e.electionId;
    engine.castElectionVote({ electionId: id, voterId: 'voter-1', candidateId: 'dynasty-a', weight: 3 });
    engine.castElectionVote({ electionId: id, voterId: 'voter-2', candidateId: 'dynasty-b', weight: 1 });

    const result = engine.concludeElection(id);
    expect(result.phase).toBe('CONCLUDED');
    expect(result.winnerId).toBe('dynasty-a');
  });

  it('throws when fewer than minCandidates are registered', () => {
    const { engine } = makeEngine();
    const e = engine.callElection('world-1', 'GOVERNOR');
    engine.registerCandidate({
      electionId: e.electionId, dynastyId: 'dynasty-a', displayName: 'Alice', platform: 'p',
    });
    expect(() => { engine.concludeElection(e.electionId); }).toThrow();
  });
});

describe('enactLegislation', () => {
  it('creates active legislation', () => {
    const { engine } = makeEngine(0);
    const law = engine.enactLegislation(
      'world-1', 'prop-1', 'TAX_RATE', 'Tax Reform', 'Lower taxes', { taxRate: 0.1 }, 'dynasty-a',
    );
    expect(law.worldId).toBe('world-1');
    expect(law.type).toBe('TAX_RATE');
    expect(law.title).toBe('Tax Reform');
  });

  it('applies world parameters via the port', () => {
    const { engine, deps } = makeEngine(0);
    engine.enactLegislation(
      'world-1', 'prop-1', 'TAX_RATE', 'Tax Reform', 'desc', { taxRate: 0.15 }, 'dynasty-a',
    );
    expect(deps.world.applyParameter).toHaveBeenCalledWith('world-1', 'taxRate', 0.15);
  });

  it('is included in getActiveLegislation', () => {
    const { engine } = makeEngine(0);
    engine.enactLegislation('world-1', 'p1', 'TRADE_TARIFF', 'Tariff', 'desc', {}, 'dynasty-a');
    const active = engine.getActiveLegislation('world-1');
    expect(active).toHaveLength(1);
  });

  it('is excluded from active legislation after expiry', () => {
    const { engine, deps } = makeEngine(0);
    engine.enactLegislation('world-1', 'p1', 'TRADE_TARIFF', 'Tariff', 'desc', {}, 'dynasty-a');
    deps.setNow(100_000); // advance past 10_000 ms legislationDefaultDurationMs
    const active = engine.getActiveLegislation('world-1');
    expect(active).toHaveLength(0);
  });
});

describe('revokeLegislation', () => {
  it('removes law from active legislation', () => {
    const { engine } = makeEngine(0);
    const law = engine.enactLegislation('world-1', 'p1', 'TAX_RATE', 'Tax', 'desc', {}, 'dynasty-a');
    const revoked = engine.revokeLegislation(law.legislationId);
    expect(revoked).toBe(true);
    expect(engine.getActiveLegislation('world-1')).toHaveLength(0);
  });

  it('returns false for unknown legislation id', () => {
    const { engine } = makeEngine(0);
    expect(engine.revokeLegislation('nonexistent')).toBe(false);
  });
});

describe('fileDispute', () => {
  it('creates a dispute in FILED status', () => {
    const { engine } = makeEngine();
    const dispute = engine.fileDispute({
      worldId: 'world-1',
      plaintiffId: 'dynasty-a',
      defendantId: 'dynasty-b',
      category: 'trade',
      description: 'Unfair pricing',
      evidence: ['doc-1'],
    });
    expect(dispute.status).toBe('FILED');
    expect(dispute.plaintiffId).toBe('dynasty-a');
    expect(dispute.defendantId).toBe('dynasty-b');
  });

  it('is retrievable via getDispute', () => {
    const { engine } = makeEngine();
    const d = engine.fileDispute({
      worldId: 'world-1', plaintiffId: 'p', defendantId: 'q',
      category: 'land', description: 'desc', evidence: [],
    });
    expect(engine.getDispute(d.disputeId)?.status).toBe('FILED');
  });
});

describe('getStats', () => {
  it('returns zeroes on fresh engine', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.totalElections).toBe(0);
    expect(stats.totalLegislation).toBe(0);
    expect(stats.totalDisputes).toBe(0);
  });

  it('counts elections and disputes', () => {
    const { engine } = makeEngine();
    engine.callElection('world-1', 'GOVERNOR');
    engine.callElection('world-1', 'TREASURER');
    engine.fileDispute({
      worldId: 'world-1', plaintiffId: 'p', defendantId: 'q',
      category: 'trade', description: 'd', evidence: [],
    });
    const stats = engine.getStats();
    expect(stats.totalElections).toBe(2);
    expect(stats.activeElections).toBe(2);
    expect(stats.totalDisputes).toBe(1);
  });

  it('counts active legislation', () => {
    const { engine } = makeEngine(0);
    engine.enactLegislation('world-1', 'p1', 'TAX_RATE', 'T', 'd', {}, 'a');
    expect(engine.getStats().activeLegislation).toBe(1);
  });
});
