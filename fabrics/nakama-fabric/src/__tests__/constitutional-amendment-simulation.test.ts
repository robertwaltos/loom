import { beforeEach, describe, expect, it } from 'vitest';
import {
  createConstitutionalAmendmentEngine,
  type AmendmentDeps,
  type ConstitutionalAmendmentEngine,
} from '../constitutional-amendment.js';

const ONE_DAY_US = 24 * 60 * 60 * 1_000_000;

describe('constitutional-amendment simulation', () => {
  let nowUs: number;
  let idCounter: number;
  let engine: ConstitutionalAmendmentEngine;

  const deps = (): AmendmentDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { next: () => `sim-amend-${++idCounter}` },
  });

  const propose = (
    title: string,
    proposerDynastyId: string,
    worldId: string,
  ): string => {
    return engine.propose({
      title,
      description: `${title} description`,
      proposerDynastyId,
      worldId,
    }).amendmentId;
  };

  const moveToVoting = (amendmentId: string): void => {
    const firstStep = engine.advanceToVoting(amendmentId);
    if (firstStep.phase === 'DEBATING') {
      nowUs += 8 * ONE_DAY_US;
      engine.advanceToVoting(amendmentId);
    }
  };

  beforeEach(() => {
    nowUs = 10_000_000;
    idCounter = 0;
    engine = createConstitutionalAmendmentEngine(deps());
  });

  it('runs a mixed constitutional cycle with enacted and rejected outcomes', () => {
    const enactedId = propose('Right to Petition', 'dawn', 'world-a');
    const failedVoteId = propose('Coin Standard Rewrite', 'ember', 'world-a');
    const vetoedId = propose('Office Term Reset', 'frost', 'world-b');

    moveToVoting(enactedId);
    moveToVoting(failedVoteId);
    moveToVoting(vetoedId);

    engine.recordVoteResult(enactedId, { passed: true, percentageFor: 0.81, totalWeight: 100 });
    engine.recordVoteResult(failedVoteId, { passed: false, percentageFor: 0.62, totalWeight: 100 });
    engine.recordVoteResult(vetoedId, { passed: true, percentageFor: 0.9, totalWeight: 100 });

    engine.architectApprove(enactedId);
    engine.architectVeto(vetoedId);
    const enacted = engine.enact(enactedId, 'chronicle:amend:001');

    expect(enacted.phase).toBe('ENACTED');
    expect(engine.getAmendment(failedVoteId).rejectionReason).toBe('VOTE_FAILED');
    expect(engine.getAmendment(vetoedId).rejectionReason).toBe('ARCHITECT_VETO');

    const stats = engine.getStats();
    expect(stats.total).toBe(3);
    expect(stats.enacted).toBe(1);
    expect(stats.rejected).toBe(2);
    expect(stats.ratification).toBe(0);
  });

  it('enforces architect affirmative before enactment', () => {
    const amendmentId = propose('Debt Limit Guardrail', 'opal', 'world-a');
    moveToVoting(amendmentId);
    engine.recordVoteResult(amendmentId, { passed: true, percentageFor: 0.85, totalWeight: 100 });

    expect(() => engine.enact(amendmentId, 'chronicle:amend:002')).toThrow(
      'Cannot enact without Architect affirmative (Rule 9)',
    );
  });

  it('keeps amendment in DEBATING until debate period elapses', () => {
    const amendmentId = propose('Harbor Charter', 'river', 'world-c');

    const debating = engine.advanceToVoting(amendmentId);
    expect(debating.phase).toBe('DEBATING');

    nowUs += 7 * ONE_DAY_US;
    const voting = engine.advanceToVoting(amendmentId);
    expect(voting.phase).toBe('VOTING');
    expect(voting.votingMotionId).toBe('sim-amend-2');
  });

  it('expires ratification window and records expiration reason', () => {
    const amendmentId = propose('Judicial Census Cadence', 'lumen', 'world-d');
    moveToVoting(amendmentId);
    engine.recordVoteResult(amendmentId, { passed: true, percentageFor: 0.78, totalWeight: 100 });

    const approved = engine.architectApprove(amendmentId);
    expect(approved.ratificationDeadline).not.toBeNull();

    nowUs += 15 * ONE_DAY_US;
    const expired = engine.checkExpired();

    expect(expired).toHaveLength(1);
    expect(expired[0].amendmentId).toBe(amendmentId);
    expect(expired[0].rejectionReason).toBe('RATIFICATION_EXPIRED');
  });

  it('withdrawal by proposer supersedes pending phase and updates pending list', () => {
    const openId = propose('Town Militia Rotation', 'anchor', 'world-e');
    const withdrawnId = propose('Mint Governance Rules', 'anchor', 'world-e');

    moveToVoting(openId);
    engine.withdraw(withdrawnId, 'anchor');

    const pendingIds = engine.getPending().map((a) => a.amendmentId);
    expect(pendingIds).toContain(openId);
    expect(pendingIds).not.toContain(withdrawnId);
    expect(engine.getAmendment(withdrawnId).rejectionReason).toBe('PROPOSER_WITHDRAWN');
  });

  it('blocks non-proposer withdrawal in multi-dynasty contention', () => {
    const amendmentId = propose('Road Toll Sunset', 'atlas', 'world-f');

    expect(() => engine.withdraw(amendmentId, 'briar')).toThrow(
      'Only the proposer can withdraw an amendment',
    );

    expect(engine.getAmendment(amendmentId).phase).toBe('PROPOSED');
  });

  it('treats unknown amendment operations as hard errors', () => {
    expect(() => engine.getAmendment('missing-amendment')).toThrow('Unknown amendment: missing-amendment');
    expect(() => engine.architectVeto('missing-amendment')).toThrow('Unknown amendment: missing-amendment');
    expect(() => engine.enact('missing-amendment', 'chronicle:x')).toThrow('Unknown amendment: missing-amendment');
  });

  it('tracks world ids through enacted records without cross-world mutation', () => {
    const worldAId = propose('Port Tax Clarification', 'ember', 'world-alpha');
    const worldBId = propose('Transit Bond Framework', 'ember', 'world-beta');

    moveToVoting(worldAId);
    moveToVoting(worldBId);

    engine.recordVoteResult(worldAId, { passed: true, percentageFor: 0.88, totalWeight: 100 });
    engine.recordVoteResult(worldBId, { passed: true, percentageFor: 0.8, totalWeight: 100 });

    engine.architectApprove(worldAId);
    engine.architectApprove(worldBId);

    engine.enact(worldAId, 'chronicle:a');
    engine.enact(worldBId, 'chronicle:b');

    const enacted = engine.getEnacted();
    const worldIds = enacted.map((a) => a.worldId).sort();
    expect(worldIds).toEqual(['world-alpha', 'world-beta']);
  });

  it('preserves monotonic timestamps across full happy path', () => {
    const amendmentId = propose('Succession Appeal Rights', 'fable', 'world-g');

    const proposed = engine.getAmendment(amendmentId);
    nowUs += 8 * ONE_DAY_US;
    engine.advanceToVoting(amendmentId);
    engine.recordVoteResult(amendmentId, { passed: true, percentageFor: 0.76, totalWeight: 100 });

    const approved = engine.architectApprove(amendmentId);
    nowUs += ONE_DAY_US;
    const enacted = engine.enact(amendmentId, 'chronicle:timeline');

    expect(proposed.proposedAt).toBeLessThanOrEqual(approved.ratificationDeadline ?? Number.MAX_SAFE_INTEGER);
    expect((approved.ratificationDeadline ?? 0) - 14 * ONE_DAY_US).toBeGreaterThanOrEqual(proposed.proposedAt);
    expect(enacted.enactedAt).not.toBeNull();
    expect(enacted.enactedAt as number).toBeGreaterThan(proposed.proposedAt);
  });

  it('produces deterministic ids for amendment and voting motion allocation', () => {
    const amendmentId = propose('Archive Duty Charter', 'gale', 'world-h');
    nowUs += 8 * ONE_DAY_US;

    const voting = engine.advanceToVoting(amendmentId);
    expect(amendmentId).toBe('sim-amend-1');
    expect(voting.votingMotionId).toBe('sim-amend-2');

    const secondAmendment = propose('Canal Bond Formula', 'gale', 'world-h');
    expect(secondAmendment).toBe('sim-amend-3');
  });
});
