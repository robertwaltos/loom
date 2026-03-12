import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConstitutionalAmendmentEngine,
  DEFAULT_AMENDMENT_CONFIG,
  type ConstitutionalAmendmentEngine,
  type AmendmentDeps,
} from '../constitutional-amendment.js';

// ─── Helpers ─────────────────────────────────────────────────────

let nowUs = 1_000_000;
let idSeq = 0;

function createDeps(): AmendmentDeps {
  nowUs = 1_000_000;
  idSeq = 0;
  return {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { next: () => `amend-${++idSeq}` },
  };
}

function advanceTime(us: number): void {
  nowUs += us;
}

const ONE_DAY_US = 24 * 60 * 60 * 1_000_000;

// ─── Tests ───────────────────────────────────────────────────────

describe('ConstitutionalAmendmentEngine', () => {
  let engine: ConstitutionalAmendmentEngine;

  beforeEach(() => {
    engine = createConstitutionalAmendmentEngine(createDeps());
  });

  describe('proposal', () => {
    it('creates amendment in PROPOSED phase', () => {
      const a = engine.propose({
        title: 'Expand voting rights',
        description: 'Lower civic threshold',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      expect(a.phase).toBe('PROPOSED');
      expect(a.title).toBe('Expand voting rights');
      expect(a.proposerDynastyId).toBe('dynasty-1');
      expect(a.architectApproved).toBeNull();
      expect(a.votePassed).toBeNull();
    });

    it('stats reflect proposed', () => {
      engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      const stats = engine.getStats();
      expect(stats.total).toBe(1);
      expect(stats.proposed).toBe(1);
    });
  });

  describe('debate and voting', () => {
    it('enters DEBATING if debate period not elapsed', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      const debating = engine.advanceToVoting(a.amendmentId);
      expect(debating.phase).toBe('DEBATING');
    });

    it('enters VOTING after debate period elapses', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      advanceTime(8 * ONE_DAY_US); // past 7-day debate period
      const voting = engine.advanceToVoting(a.amendmentId);
      expect(voting.phase).toBe('VOTING');
      expect(voting.votingMotionId).not.toBeNull();
    });
  });

  describe('vote recording', () => {
    it('rejects amendment when vote fails', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);

      const rejected = engine.recordVoteResult(a.amendmentId, {
        passed: false,
        percentageFor: 0.60,
        totalWeight: 100,
      });

      expect(rejected.phase).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('VOTE_FAILED');
      expect(rejected.votePercentage).toBe(0.60);
    });

    it('moves to ratification when vote passes', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);

      const ratifying = engine.recordVoteResult(a.amendmentId, {
        passed: true,
        percentageFor: 0.80,
        totalWeight: 100,
      });

      expect(ratifying.phase).toBe('RATIFICATION');
      expect(ratifying.votePassed).toBe(true);
      expect(ratifying.votePercentage).toBe(0.80);
    });
  });

  describe('Architect Rule 9', () => {
    function proposeAndPassVote(): string {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });
      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);
      engine.recordVoteResult(a.amendmentId, {
        passed: true,
        percentageFor: 0.80,
        totalWeight: 100,
      });
      return a.amendmentId;
    }

    it('cannot enact without Architect approval', () => {
      const id = proposeAndPassVote();
      expect(() => engine.enact(id, 'chronicle-ref')).toThrow('Architect affirmative');
    });

    it('Architect veto rejects at any vetoable phase', () => {
      const id = proposeAndPassVote();
      const rejected = engine.architectVeto(id);
      expect(rejected.phase).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('ARCHITECT_VETO');
      expect(rejected.architectApproved).toBe(false);
    });

    it('Architect approval sets ratification deadline', () => {
      const id = proposeAndPassVote();
      const approved = engine.architectApprove(id);
      expect(approved.architectApproved).toBe(true);
      expect(approved.ratificationDeadline).not.toBeNull();
    });

    it('full happy path: propose → vote → approve → enact', () => {
      const id = proposeAndPassVote();
      engine.architectApprove(id);

      const enacted = engine.enact(id, 'chronicle-123');
      expect(enacted.phase).toBe('ENACTED');
      expect(enacted.enactedAt).not.toBeNull();
      expect(enacted.chronicleRef).toBe('chronicle-123');
    });
  });

  describe('ratification expiry', () => {
    it('expires if ratification deadline passes', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });
      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);
      engine.recordVoteResult(a.amendmentId, {
        passed: true,
        percentageFor: 0.80,
        totalWeight: 100,
      });
      engine.architectApprove(a.amendmentId);

      advanceTime(15 * ONE_DAY_US); // past 14-day ratification
      const expired = engine.checkExpired();
      expect(expired).toHaveLength(1);
      expect(expired[0].phase).toBe('REJECTED');
      expect(expired[0].rejectionReason).toBe('RATIFICATION_EXPIRED');
    });

    it('enact rejects if past deadline', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });
      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);
      engine.recordVoteResult(a.amendmentId, {
        passed: true,
        percentageFor: 0.80,
        totalWeight: 100,
      });
      engine.architectApprove(a.amendmentId);

      advanceTime(15 * ONE_DAY_US);
      const result = engine.enact(a.amendmentId, 'ref');
      expect(result.phase).toBe('REJECTED');
      expect(result.rejectionReason).toBe('RATIFICATION_EXPIRED');
    });
  });

  describe('withdrawal', () => {
    it('proposer can withdraw own amendment', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      const withdrawn = engine.withdraw(a.amendmentId, 'dynasty-1');
      expect(withdrawn.phase).toBe('REJECTED');
      expect(withdrawn.rejectionReason).toBe('PROPOSER_WITHDRAWN');
    });

    it('non-proposer cannot withdraw', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      expect(() => engine.withdraw(a.amendmentId, 'dynasty-2')).toThrow('Only the proposer');
    });

    it('cannot withdraw enacted amendment', () => {
      const a = engine.propose({
        title: 'Test',
        description: 'Desc',
        proposerDynastyId: 'dynasty-1',
        worldId: 'world-1',
      });
      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);
      engine.recordVoteResult(a.amendmentId, {
        passed: true,
        percentageFor: 0.80,
        totalWeight: 100,
      });
      engine.architectApprove(a.amendmentId);
      engine.enact(a.amendmentId, 'ref');

      expect(() => engine.withdraw(a.amendmentId, 'dynasty-1')).toThrow('Cannot withdraw');
    });
  });

  describe('queries', () => {
    it('getPending returns only active amendments', () => {
      engine.propose({ title: 'A', description: 'D', proposerDynastyId: 'd1', worldId: 'w1' });
      const b = engine.propose({ title: 'B', description: 'D', proposerDynastyId: 'd2', worldId: 'w1' });
      engine.withdraw(b.amendmentId, 'd2');

      expect(engine.getPending()).toHaveLength(1);
    });

    it('getEnacted returns only enacted amendments', () => {
      const a = engine.propose({ title: 'A', description: 'D', proposerDynastyId: 'd1', worldId: 'w1' });
      advanceTime(8 * ONE_DAY_US);
      engine.advanceToVoting(a.amendmentId);
      engine.recordVoteResult(a.amendmentId, { passed: true, percentageFor: 0.85, totalWeight: 100 });
      engine.architectApprove(a.amendmentId);
      engine.enact(a.amendmentId, 'ref');

      expect(engine.getEnacted()).toHaveLength(1);
      expect(engine.getEnacted()[0].title).toBe('A');
    });

    it('unknown amendment throws', () => {
      expect(() => engine.getAmendment('nope')).toThrow('Unknown amendment');
    });
  });

  describe('constants', () => {
    it('default config has correct values', () => {
      expect(DEFAULT_AMENDMENT_CONFIG.supermajorityThreshold).toBe(0.75);
      expect(DEFAULT_AMENDMENT_CONFIG.debatePeriodUs).toBe(7 * ONE_DAY_US);
      expect(DEFAULT_AMENDMENT_CONFIG.ratificationPeriodUs).toBe(14 * ONE_DAY_US);
    });
  });
});
