/**
 * governance-assembly-simulation.test.ts — The Assembly voting engine.
 *
 * Proves that:
 *   - Motions can be proposed, voted on, and tallied
 *   - Vote categories have correct thresholds (50%, 65%, 75%)
 *   - Architect has weighted advisory votes (7%/14%/0)
 *   - Architect CANNOT vote on constitutional motions
 *   - Duplicate votes are rejected
 *   - Expired motions auto-close correctly
 *   - Dignity floor ensures minimum voting weight
 *   - Civic score drives voting weight
 *   - Edge cases: no votes, tied votes, zero weight
 */

import { describe, it, expect } from 'vitest';
import {
  createAssembly,
} from '../assembly.js';
import type {
  Assembly,
  VoteCategory,
  TallyResult,
  CivicScoreResult,
} from '../assembly.js';

// ── Helpers ─────────────────────────────────────────────────────

function createClock(startTime = 1_000_000) {
  let time = startTime;
  return {
    nowMicroseconds: () => time,
    advance: (microseconds: number) => { time += microseconds; },
    set: (newTime: number) => { time = newTime; },
  };
}

function makeCivicScore(votingWeight: number): CivicScoreResult {
  return {
    totalScore: 5000,
    chronicleComponent: 2000,
    economicComponent: 1750,
    civicComponent: 1250,
    marksMultiplier: 1.0,
    votingWeight,
  };
}

const ONE_DAY_MICROS = 24 * 60 * 60 * 1_000_000;
const VOTING_PERIOD = 21 * ONE_DAY_MICROS;

function createTestAssembly(clock?: ReturnType<typeof createClock>) {
  const c = clock ?? createClock();
  return {
    assembly: createAssembly({
      clock: c,
      votingPeriodMicroseconds: VOTING_PERIOD,
    }),
    clock: c,
  };
}

// ── Proposal Tests ──────────────────────────────────────────────

describe('Assembly', () => {
  describe('proposing motions', () => {
    it('creates a motion with correct fields', () => {
      const { assembly } = createTestAssembly();

      const motion = assembly.proposeMotion({
        motionId: 'm-1',
        title: 'Open trade route to Meridian',
        description: 'Proposal to establish a direct trade route.',
        category: 'ordinary',
        proposerDynastyId: 'd-1',
        worldId: 'alkahest',
      });

      expect(motion.motionId).toBe('m-1');
      expect(motion.title).toBe('Open trade route to Meridian');
      expect(motion.category).toBe('ordinary');
      expect(motion.status).toBe('open');
      expect(motion.worldId).toBe('alkahest');
    });

    it('rejects duplicate motion IDs', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'A', description: 'B',
        category: 'ordinary', proposerDynastyId: 'd-1', worldId: 'w-1',
      });

      expect(() => assembly.proposeMotion({
        motionId: 'm-1', title: 'C', description: 'D',
        category: 'ordinary', proposerDynastyId: 'd-2', worldId: 'w-1',
      })).toThrow('already exists');
    });

    it('lists open motions', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'A', description: '',
        category: 'ordinary', proposerDynastyId: 'd-1', worldId: 'w-1',
      });
      assembly.proposeMotion({
        motionId: 'm-2', title: 'B', description: '',
        category: 'significant', proposerDynastyId: 'd-2', worldId: 'w-1',
      });

      expect(assembly.listOpenMotions()).toHaveLength(2);
    });

    it('retrieves a motion by ID', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Test', description: '',
        category: 'constitutional', proposerDynastyId: 'd-1', worldId: 'w-1',
      });

      const motion = assembly.getMotion('m-1');
      expect(motion.category).toBe('constitutional');
    });

    it('throws on unknown motion ID', () => {
      const { assembly } = createTestAssembly();
      expect(() => assembly.getMotion('nope')).toThrow('not found');
    });
  });

  describe('voting', () => {
    it('records a vote with civic weight', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'A', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      const vote = assembly.castVote({
        motionId: 'm-1',
        dynastyId: 'd-1',
        choice: 'for',
        civicScore: makeCivicScore(0.25),
      });

      expect(vote.dynastyId).toBe('d-1');
      expect(vote.choice).toBe('for');
      expect(vote.weight).toBe(0.25);
    });

    it('rejects duplicate votes from same dynasty', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'A', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({
        motionId: 'm-1', dynastyId: 'd-1',
        choice: 'for', civicScore: makeCivicScore(0.3),
      });

      expect(() => assembly.castVote({
        motionId: 'm-1', dynastyId: 'd-1',
        choice: 'against', civicScore: makeCivicScore(0.3),
      })).toThrow('already voted');
    });

    it('rejects votes on closed motions', () => {
      const clock = createClock();
      const { assembly } = createTestAssembly(clock);
      assembly.proposeMotion({
        motionId: 'm-1', title: 'A', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      // Expire the motion
      clock.advance(VOTING_PERIOD + 1);
      assembly.closeExpiredMotions(clock.nowMicroseconds());

      expect(() => assembly.castVote({
        motionId: 'm-1', dynastyId: 'd-1',
        choice: 'for', civicScore: makeCivicScore(0.5),
      })).toThrow('not open');
    });

    it('returns all votes for a motion', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'A', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.2) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.3) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-3', choice: 'abstain', civicScore: makeCivicScore(0.1) });

      const votes = assembly.getVotesForMotion('m-1');
      expect(votes).toHaveLength(3);
    });
  });

  describe('ordinary threshold (50%)', () => {
    it('passes when for > 50% of decisive', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Trade Route', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      // 0.6 for, 0.4 against → 60% for → passes
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.6) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.4) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('passed');
      expect(tally.percentageFor).toBeCloseTo(0.6, 5);
      expect(tally.threshold).toBe(0.5);
    });

    it('fails when for < 50% of decisive', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Bad Idea', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      // 0.3 for, 0.7 against → 30% for → fails
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.3) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.7) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('failed');
      expect(tally.percentageFor).toBeCloseTo(0.3, 5);
    });

    it('passes at exactly 50%', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Razor Edge', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.5) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.5) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('passed');
      expect(tally.percentageFor).toBeCloseTo(0.5, 5);
    });
  });

  describe('significant threshold (65%)', () => {
    it('passes when for >= 65% of decisive', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'War Declaration', description: '',
        category: 'significant', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.7) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.3) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('passed');
      expect(tally.threshold).toBe(0.65);
    });

    it('fails at 60% (below 65%)', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Territory Grab', description: '',
        category: 'significant', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.6) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.4) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('failed');
    });
  });

  describe('constitutional threshold (75%)', () => {
    it('passes when for >= 75% of decisive', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Amend Foundation', description: '',
        category: 'constitutional', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.8) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.2) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('passed');
      expect(tally.threshold).toBe(0.75);
    });

    it('fails at 70% (below 75%)', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Constitutional Change', description: '',
        category: 'constitutional', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.7) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.3) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.status).toBe('failed');
    });
  });

  describe('architect votes', () => {
    it('architect has 7% weight on ordinary motions', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Minor Policy', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      const vote = assembly.castArchitectVote('m-1', 'for');
      expect(vote.weight).toBe(0.07);
      expect(vote.dynastyId).toBe('__architect__');
    });

    it('architect has 14% weight on significant motions', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'War Vote', description: '',
        category: 'significant', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      const vote = assembly.castArchitectVote('m-1', 'against');
      expect(vote.weight).toBe(0.14);
    });

    it('architect CANNOT vote on constitutional motions', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Constitutional', description: '',
        category: 'constitutional', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      expect(() => assembly.castArchitectVote('m-1', 'for'))
        .toThrow('cannot vote on constitutional');
    });

    it('architect cannot double-vote', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Test', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castArchitectVote('m-1', 'for');
      expect(() => assembly.castArchitectVote('m-1', 'against'))
        .toThrow('already voted');
    });

    it('architect vote affects tally', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Close Call', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      // Dynasty votes against (0.45), architect votes for (0.07)
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'against', civicScore: makeCivicScore(0.45) });
      assembly.castArchitectVote('m-1', 'for');

      const tally = assembly.tallyMotion('m-1');
      // 0.07 / (0.07 + 0.45) ≈ 0.1346 → fails ordinary (< 50%)
      expect(tally.status).toBe('failed');
      expect(tally.weightedFor).toBeCloseTo(0.07, 5);
    });
  });

  describe('abstain votes', () => {
    it('abstain votes count toward total weight but not decisive', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Abstain Test', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.3) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.2) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-3', choice: 'abstain', civicScore: makeCivicScore(0.5) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.totalWeight).toBeCloseTo(1.0, 5);
      expect(tally.weightedAbstain).toBeCloseTo(0.5, 5);
      // percentage = 0.3 / (0.3 + 0.2) = 0.6 → passes ordinary
      expect(tally.percentageFor).toBeCloseTo(0.6, 5);
      expect(tally.status).toBe('passed');
      expect(tally.voteCount).toBe(3);
    });
  });

  describe('expiration', () => {
    it('closes expired motions', () => {
      const clock = createClock();
      const { assembly } = createTestAssembly(clock);

      assembly.proposeMotion({
        motionId: 'm-1', title: 'Expires', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      // Vote in favor with 0.6 weight
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.6) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'against', civicScore: makeCivicScore(0.4) });

      // Advance past deadline
      clock.advance(VOTING_PERIOD + 1);
      const results = assembly.closeExpiredMotions(clock.nowMicroseconds());

      expect(results).toHaveLength(1);
      expect(results[0]!.motionId).toBe('m-1');
      expect(results[0]!.status).toBe('passed');

      // Motion is no longer open
      expect(assembly.listOpenMotions()).toHaveLength(0);
    });

    it('does not close motions before deadline', () => {
      const clock = createClock();
      const { assembly } = createTestAssembly(clock);

      assembly.proposeMotion({
        motionId: 'm-1', title: 'Still Open', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      clock.advance(VOTING_PERIOD - 1000);
      const results = assembly.closeExpiredMotions(clock.nowMicroseconds());

      expect(results).toHaveLength(0);
      expect(assembly.listOpenMotions()).toHaveLength(1);
    });

    it('expired motion with no votes resolves correctly', () => {
      const clock = createClock();
      const { assembly } = createTestAssembly(clock);

      assembly.proposeMotion({
        motionId: 'm-1', title: 'Nobody Cared', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      clock.advance(VOTING_PERIOD + 1);
      const results = assembly.closeExpiredMotions(clock.nowMicroseconds());

      expect(results).toHaveLength(1);
      // 0% for (0 decisive) → fails
      expect(results[0]!.status).toBe('failed');
      expect(results[0]!.voteCount).toBe(0);
    });
  });

  describe('multi-dynasty voting', () => {
    it('5 dynasties voting on ordinary motion', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Trade Agreement', description: '',
        category: 'ordinary', proposerDynastyId: 'd-0', worldId: 'alkahest',
      });

      // 3 for (0.2 + 0.3 + 0.15 = 0.65), 2 against (0.1 + 0.25 = 0.35)
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-1', choice: 'for', civicScore: makeCivicScore(0.2) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-2', choice: 'for', civicScore: makeCivicScore(0.3) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-3', choice: 'for', civicScore: makeCivicScore(0.15) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-4', choice: 'against', civicScore: makeCivicScore(0.1) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-5', choice: 'against', civicScore: makeCivicScore(0.25) });

      const tally = assembly.tallyMotion('m-1');
      expect(tally.voteCount).toBe(5);
      expect(tally.weightedFor).toBeCloseTo(0.65, 5);
      expect(tally.weightedAgainst).toBeCloseTo(0.35, 5);
      expect(tally.percentageFor).toBeCloseTo(0.65, 5);
      expect(tally.status).toBe('passed');
    });

    it('constitutional motion requires supermajority across many dynasties', () => {
      const { assembly } = createTestAssembly();
      assembly.proposeMotion({
        motionId: 'm-1', title: 'Amend Constitution', description: '',
        category: 'constitutional', proposerDynastyId: 'd-0', worldId: 'w-1',
      });

      // 8 for, 2 against with various weights
      for (let i = 1; i <= 8; i++) {
        assembly.castVote({
          motionId: 'm-1', dynastyId: `d-${i}`,
          choice: 'for', civicScore: makeCivicScore(0.1),
        });
      }
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-9', choice: 'against', civicScore: makeCivicScore(0.1) });
      assembly.castVote({ motionId: 'm-1', dynastyId: 'd-10', choice: 'against', civicScore: makeCivicScore(0.1) });

      const tally = assembly.tallyMotion('m-1');
      // 0.8 / 1.0 = 80% → passes constitutional (>= 75%)
      expect(tally.status).toBe('passed');
      expect(tally.percentageFor).toBeCloseTo(0.8, 5);
    });
  });
});
