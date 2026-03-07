import { describe, it, expect } from 'vitest';
import { createAssembly } from '../assembly.js';
import { calculateCivicScore } from '../civic-score.js';
import { kalonToMicro } from '../kalon-constants.js';
import type { Assembly, ProposeMotionParams, VoteCategory } from '../assembly.js';
import type { CivicScoreResult } from '../civic-score.js';

const SUPPLY = kalonToMicro(1_000_000_000n);
const VOTING_PERIOD = 21_000_000;

function createTestAssembly() {
  return createAssembly({
    clock: { nowMicroseconds: () => 1_000_000 },
    votingPeriodMicroseconds: VOTING_PERIOD,
  });
}

function activeScore(): CivicScoreResult {
  return calculateCivicScore({
    chronicleEntryCount: 100,
    kalonBalance: kalonToMicro(10_000n),
    totalKalonSupply: SUPPLY,
    votesParticipated: 20,
    motionsProposed: 3,
  });
}

function wealthyScore(): CivicScoreResult {
  return calculateCivicScore({
    chronicleEntryCount: 500,
    kalonBalance: kalonToMicro(500_000n),
    totalKalonSupply: SUPPLY,
    votesParticipated: 50,
    motionsProposed: 10,
  });
}

function motion(id: string, category: VoteCategory = 'ordinary'): ProposeMotionParams {
  return {
    motionId: id,
    title: `Motion ${id}`,
    description: `Description for ${id}`,
    category,
    proposerDynastyId: 'd1',
    worldId: 'w1',
  };
}

function voteFor(assembly: Assembly, motionId: string, dynastyId: string) {
  return assembly.castVote({
    motionId,
    dynastyId,
    choice: 'for',
    civicScore: activeScore(),
  });
}

describe('Assembly motion lifecycle', () => {
  it('proposes a new motion', () => {
    const assembly = createTestAssembly();
    const m = assembly.proposeMotion(motion('m1'));
    expect(m.status).toBe('open');
    expect(m.category).toBe('ordinary');
  });

  it('throws on duplicate motion', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    expect(() => {
      assembly.proposeMotion(motion('m1'));
    }).toThrow('already exists');
  });

  it('lists open motions', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    assembly.proposeMotion(motion('m2', 'significant'));
    expect(assembly.listOpenMotions()).toHaveLength(2);
  });
});

describe('Assembly vote casting', () => {
  it('casts a vote with civic score weight', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    const record = voteFor(assembly, 'm1', 'd1');
    expect(record.choice).toBe('for');
    expect(record.weight).toBeGreaterThan(0);
  });

  it('prevents duplicate votes', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    voteFor(assembly, 'm1', 'd1');
    expect(() => {
      voteFor(assembly, 'm1', 'd1');
    }).toThrow('already voted');
  });
});

describe('Assembly vote on closed motion', () => {
  it('prevents voting after expiration', () => {
    let time = 1_000_000;
    const assembly = createAssembly({
      clock: { nowMicroseconds: () => time },
      votingPeriodMicroseconds: VOTING_PERIOD,
    });
    assembly.proposeMotion(motion('m1'));
    time = 1_000_000 + VOTING_PERIOD + 1;
    assembly.closeExpiredMotions(time);
    expect(() => {
      voteFor(assembly, 'm1', 'd2');
    }).toThrow('not open');
  });
});

describe('Assembly architect vote', () => {
  it('architect votes 7% weight on ordinary', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    const record = assembly.castArchitectVote('m1', 'for');
    expect(record.weight).toBe(0.07);
  });

  it('architect votes 14% weight on significant', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1', 'significant'));
    const record = assembly.castArchitectVote('m1', 'against');
    expect(record.weight).toBe(0.14);
  });

  it('architect cannot vote on constitutional', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1', 'constitutional'));
    expect(() => {
      assembly.castArchitectVote('m1', 'for');
    }).toThrow('cannot vote on constitutional');
  });
});

describe('Assembly tallying ordinary', () => {
  it('passes at 50% threshold with weighted votes', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    assembly.castVote({
      motionId: 'm1',
      dynastyId: 'd1',
      choice: 'for',
      civicScore: wealthyScore(),
    });
    assembly.castVote({
      motionId: 'm1',
      dynastyId: 'd2',
      choice: 'against',
      civicScore: activeScore(),
    });
    const tally = assembly.tallyMotion('m1');
    expect(tally.threshold).toBe(0.5);
    expect(tally.percentageFor).toBeGreaterThan(0.5);
    expect(tally.status).toBe('passed');
  });
});

describe('Assembly tallying significant', () => {
  it('fails below 65% threshold', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1', 'significant'));
    voteFor(assembly, 'm1', 'd1');
    assembly.castVote({
      motionId: 'm1',
      dynastyId: 'd2',
      choice: 'against',
      civicScore: activeScore(),
    });
    const tally = assembly.tallyMotion('m1');
    expect(tally.status).toBe('failed');
  });
});

describe('Assembly tallying abstentions', () => {
  it('counts abstentions in total but not pass/fail', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    voteFor(assembly, 'm1', 'd1');
    assembly.castVote({
      motionId: 'm1',
      dynastyId: 'd2',
      choice: 'abstain',
      civicScore: activeScore(),
    });
    const tally = assembly.tallyMotion('m1');
    expect(tally.weightedAbstain).toBeGreaterThan(0);
    expect(tally.percentageFor).toBe(1);
    expect(tally.status).toBe('passed');
  });
});

describe('Assembly expiration', () => {
  it('closes expired motions and tallies', () => {
    let time = 1_000_000;
    const assembly = createAssembly({
      clock: { nowMicroseconds: () => time },
      votingPeriodMicroseconds: VOTING_PERIOD,
    });
    assembly.proposeMotion(motion('m1'));
    voteFor(assembly, 'm1', 'd1');
    time = 1_000_000 + VOTING_PERIOD + 1;
    const results = assembly.closeExpiredMotions(time);
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('passed');
    expect(assembly.getMotion('m1').status).toBe('passed');
  });

  it('does not close before expiry', () => {
    const assembly = createTestAssembly();
    assembly.proposeMotion(motion('m1'));
    const results = assembly.closeExpiredMotions(1_000_000);
    expect(results).toHaveLength(0);
  });
});
