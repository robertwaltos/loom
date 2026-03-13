import { describe, it, expect } from 'vitest';
import { createAssembly } from '../assembly.js';
import { calculateCivicScore } from '../civic-score.js';
import { kalonToMicro } from '../kalon-constants.js';
import type { Assembly, AssemblyConfig, VoteCategory } from '../assembly.js';
import type { CivicScoreResult } from '../civic-score.js';

const SUPPLY = kalonToMicro(1_000_000_000n);
const PERIOD = 21_000_000;

function score(params: {
  chronicle: number;
  kalon: bigint;
  votes: number;
  motions: number;
  marks?: number;
}): CivicScoreResult {
  return calculateCivicScore({
    chronicleEntryCount: params.chronicle,
    kalonBalance: kalonToMicro(params.kalon),
    totalKalonSupply: SUPPLY,
    votesParticipated: params.votes,
    motionsProposed: params.motions,
    marksCount: params.marks ?? 0,
  });
}

function createTimedAssembly(start = 1_000_000): {
  assembly: Assembly;
  setNow: (next: number) => void;
} {
  let now = start;
  const config: AssemblyConfig = {
    clock: { nowMicroseconds: () => now },
    votingPeriodMicroseconds: PERIOD,
  };
  return {
    assembly: createAssembly(config),
    setNow: (next: number) => {
      now = next;
    },
  };
}

function propose(assembly: Assembly, id: string, category: VoteCategory = 'ordinary') {
  return assembly.proposeMotion({
    motionId: id,
    title: `Motion ${id}`,
    description: `Description ${id}`,
    category,
    proposerDynastyId: 'proposer',
    worldId: 'earth',
  });
}

describe('Assembly simulation scenarios', () => {
  it('favors high-civic dynasties in weighted outcomes', () => {
    const { assembly } = createTimedAssembly();
    propose(assembly, 'm1', 'ordinary');

    assembly.castVote({ motionId: 'm1', dynastyId: 'rich', choice: 'for', civicScore: score({ chronicle: 600, kalon: 700_000n, votes: 80, motions: 12 }) });
    assembly.castVote({ motionId: 'm1', dynastyId: 'small-a', choice: 'against', civicScore: score({ chronicle: 10, kalon: 100n, votes: 1, motions: 0 }) });
    assembly.castVote({ motionId: 'm1', dynastyId: 'small-b', choice: 'against', civicScore: score({ chronicle: 12, kalon: 120n, votes: 1, motions: 0 }) });

    const tally = assembly.tallyMotion('m1');
    expect(tally.weightedFor).toBeGreaterThan(tally.weightedAgainst);
    expect(tally.status).toBe('passed');
  });

  it('uses architect vote to flip a close ordinary motion', () => {
    const { assembly } = createTimedAssembly();
    propose(assembly, 'm2', 'ordinary');

    assembly.castVote({ motionId: 'm2', dynastyId: 'd-for', choice: 'for', civicScore: score({ chronicle: 40, kalon: 3_000n, votes: 8, motions: 1 }) });
    assembly.castVote({ motionId: 'm2', dynastyId: 'd-against', choice: 'against', civicScore: score({ chronicle: 42, kalon: 3_200n, votes: 8, motions: 1 }) });

    const before = assembly.tallyMotion('m2');
    expect(before.status).toBe('failed');

    assembly.castArchitectVote('m2', 'for');
    const after = assembly.tallyMotion('m2');
    expect(after.status).toBe('passed');
  });

  it('does not allow architect intervention in constitutional votes', () => {
    const { assembly } = createTimedAssembly();
    propose(assembly, 'm3', 'constitutional');

    expect(() => assembly.castArchitectVote('m3', 'for')).toThrow('cannot vote on constitutional');
  });

  it('keeps abstentions out of decisive percentage denominator', () => {
    const { assembly } = createTimedAssembly();
    propose(assembly, 'm4', 'significant');

    assembly.castVote({ motionId: 'm4', dynastyId: 'for-1', choice: 'for', civicScore: score({ chronicle: 120, kalon: 20_000n, votes: 20, motions: 4 }) });
    assembly.castVote({ motionId: 'm4', dynastyId: 'against-1', choice: 'against', civicScore: score({ chronicle: 100, kalon: 20_000n, votes: 20, motions: 4 }) });
    assembly.castVote({ motionId: 'm4', dynastyId: 'abstain-1', choice: 'abstain', civicScore: score({ chronicle: 900, kalon: 900_000n, votes: 90, motions: 20 }) });

    const tally = assembly.tallyMotion('m4');
    expect(tally.weightedAbstain).toBeGreaterThan(0);
    expect(tally.percentageFor).toBeLessThan(0.65);
    expect(tally.status).toBe('failed');
  });

  it('expires zero-participation motions as failed at close', () => {
    const { assembly, setNow } = createTimedAssembly(500_000);
    const m = propose(assembly, 'm5', 'ordinary');

    setNow(m.closesAt + 1);
    const closed = assembly.closeExpiredMotions(m.closesAt + 1);

    expect(closed).toHaveLength(1);
    expect(closed[0]?.status).toBe('failed');
    expect(assembly.getMotion('m5').status).toBe('failed');
  });

  it('closes multiple expired motions in one sweep', () => {
    const { assembly, setNow } = createTimedAssembly(100_000);
    const m1 = propose(assembly, 'm6', 'ordinary');
    const m2 = propose(assembly, 'm7', 'significant');

    assembly.castVote({ motionId: 'm6', dynastyId: 'd1', choice: 'for', civicScore: score({ chronicle: 80, kalon: 15_000n, votes: 12, motions: 2 }) });
    assembly.castVote({ motionId: 'm7', dynastyId: 'd2', choice: 'for', civicScore: score({ chronicle: 80, kalon: 15_000n, votes: 12, motions: 2 }) });

    setNow(Math.max(m1.closesAt, m2.closesAt) + 1);
    const results = assembly.closeExpiredMotions(Math.max(m1.closesAt, m2.closesAt) + 1);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.motionId).sort()).toEqual(['m6', 'm7']);
  });

  it('preserves closed status on repeated closeExpired calls', () => {
    const { assembly, setNow } = createTimedAssembly();
    const m = propose(assembly, 'm8', 'ordinary');
    assembly.castVote({ motionId: 'm8', dynastyId: 'd1', choice: 'for', civicScore: score({ chronicle: 60, kalon: 7_000n, votes: 9, motions: 1 }) });

    setNow(m.closesAt + 1);
    const first = assembly.closeExpiredMotions(m.closesAt + 1);
    const second = assembly.closeExpiredMotions(m.closesAt + 2);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect(assembly.getMotion('m8').status).toBe('passed');
  });

  it('prevents any vote casting once motion is closed', () => {
    const { assembly, setNow } = createTimedAssembly();
    const m = propose(assembly, 'm9', 'ordinary');

    setNow(m.closesAt + 1);
    assembly.closeExpiredMotions(m.closesAt + 1);

    expect(() => {
      assembly.castVote({ motionId: 'm9', dynastyId: 'late', choice: 'for', civicScore: score({ chronicle: 200, kalon: 100_000n, votes: 30, motions: 5 }) });
    }).toThrow('not open');
  });

  it('keeps vote records immutable from read API perspective', () => {
    const { assembly } = createTimedAssembly();
    propose(assembly, 'm10', 'ordinary');

    const rec = assembly.castVote({ motionId: 'm10', dynastyId: 'd1', choice: 'for', civicScore: score({ chronicle: 20, kalon: 2_000n, votes: 3, motions: 0 }) });
    const all = assembly.getVotesForMotion('m10');

    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(rec);
  });

  it('reports open motions list as statuses change over time', () => {
    const { assembly, setNow } = createTimedAssembly(200_000);
    const mA = propose(assembly, 'm11', 'ordinary');
    const mB = propose(assembly, 'm12', 'ordinary');

    assembly.castVote({ motionId: 'm11', dynastyId: 'd1', choice: 'for', civicScore: score({ chronicle: 90, kalon: 8_000n, votes: 10, motions: 1 }) });

    expect(assembly.listOpenMotions().map((m) => m.motionId).sort()).toEqual(['m11', 'm12']);

    setNow(mA.closesAt + 1);
    assembly.closeExpiredMotions(mA.closesAt + 1);

    expect(assembly.listOpenMotions()).toHaveLength(0);
    expect(assembly.getMotion('m11').status).toBe('passed');
    expect(assembly.getMotion('m12').status).toBe('failed');

    // Ensure close times were computed from creation time + configured period.
    expect(mB.closesAt - mB.createdAt).toBe(PERIOD);
  });
});
