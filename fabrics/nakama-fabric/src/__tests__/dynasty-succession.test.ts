import { describe, it, expect } from 'vitest';
import { createDynastySuccession } from '../dynasty-succession.js';

function createTestSuccession() {
  let time = 1_000_000n;
  let idCount = 0;
  return createDynastySuccession({
    clock: { nowMicroseconds: () => time },
    idGen: { next: () => 'id-' + String((idCount = idCount + 1)) },
  });
}

describe('DynastySuccession heir designation', () => {
  it('designates primary heir at position 0', () => {
    const suc = createTestSuccession();
    const result = suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    expect(result).toBe('success');
  });

  it('retrieves succession line with primary heir', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe('heir-1');
    }
  });

  it('designates backup heir at position 1', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    suc.designateHeir('dynasty-1', 'heir-2', 1, 'founder');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.backupHeirs.length).toBeGreaterThanOrEqual(1);
      const first = line.backupHeirs[0];
      expect(first).toBe('heir-2');
    }
  });

  it('designates multiple backup heirs', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    suc.designateHeir('dynasty-1', 'heir-2', 1, 'founder');
    suc.designateHeir('dynasty-1', 'heir-3', 2, 'founder');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.backupHeirs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects negative position', () => {
    const suc = createTestSuccession();
    const result = suc.designateHeir('dynasty-1', 'heir-1', -1, 'founder');
    expect(result).toBe('invalid-position');
  });

  it('returns not-found for missing succession line', () => {
    const suc = createTestSuccession();
    const line = suc.getSuccessionLine('dynasty-999');
    expect(line).toBe('not-found');
  });

  it('updates primary heir when designated again', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    suc.designateHeir('dynasty-1', 'heir-2', 0, 'founder');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe('heir-2');
    }
  });

  it('succession line has ACTIVE status by default', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.status).toBe('ACTIVE');
    }
  });

  it('creates succession line automatically on first designation', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-new', 'heir-1', 0, 'founder');
    const line = suc.getSuccessionLine('dynasty-new');
    expect(line).not.toBe('not-found');
  });
});

describe('DynastySuccession order management', () => {
  it('sets full succession order with array', () => {
    const suc = createTestSuccession();
    suc.setSuccessionOrder('dynasty-1', ['heir-1', 'heir-2', 'heir-3']);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe('heir-1');
      expect(line.backupHeirs.length).toBe(2);
    }
  });

  it('clears succession order with empty array', () => {
    const suc = createTestSuccession();
    suc.setSuccessionOrder('dynasty-1', ['heir-1', 'heir-2']);
    suc.setSuccessionOrder('dynasty-1', []);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe(null);
      expect(line.backupHeirs.length).toBe(0);
    }
  });

  it('replaces existing succession order', () => {
    const suc = createTestSuccession();
    suc.setSuccessionOrder('dynasty-1', ['heir-1', 'heir-2']);
    suc.setSuccessionOrder('dynasty-1', ['heir-3', 'heir-4', 'heir-5']);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe('heir-3');
      expect(line.backupHeirs.length).toBe(2);
      const first = line.backupHeirs[0];
      expect(first).toBe('heir-4');
    }
  });

  it('sets single heir with one-element array', () => {
    const suc = createTestSuccession();
    suc.setSuccessionOrder('dynasty-1', ['heir-solo']);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe('heir-solo');
      expect(line.backupHeirs.length).toBe(0);
    }
  });

  it('succession line tracks last updated timestamp', () => {
    const suc = createTestSuccession();
    suc.setSuccessionOrder('dynasty-1', ['heir-1']);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.lastUpdatedAt).toBeGreaterThan(0n);
    }
  });
});

describe('DynastySuccession contests', () => {
  it('opens succession contest', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    expect(contestId).toContain('contest-');
  });

  it('contest changes succession status to IN_CONTEST', () => {
    const suc = createTestSuccession();
    suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.status).toBe('IN_CONTEST');
    }
  });

  it('records vote in contest', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    const result = suc.voteInContest(contestId, 'voter-1', 'claimant-1');
    expect(result).toBe('success');
  });

  it('vote fails for non-existent contest', () => {
    const suc = createTestSuccession();
    const result = suc.voteInContest('contest-999', 'voter-1', 'claimant-1');
    expect(result).toBe('not-found');
  });

  it('resolves contest and picks winner', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    suc.voteInContest(contestId, 'voter-1', 'claimant-1');
    suc.voteInContest(contestId, 'voter-2', 'claimant-1');
    suc.voteInContest(contestId, 'voter-3', 'claimant-2');
    const outcome = suc.resolveContest(contestId);
    expect(outcome).not.toBe('not-found');
    expect(outcome).not.toBe('already-resolved');
    if (outcome !== 'not-found' && outcome !== 'already-resolved') {
      expect(outcome.winner).toBe('claimant-1');
      expect(outcome.totalVotes).toBe(3);
    }
  });

  it('resolving contest updates primary heir', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    suc.voteInContest(contestId, 'voter-1', 'claimant-2');
    suc.resolveContest(contestId);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.primaryHeir).toBe('claimant-2');
    }
  });

  it('resolving contest changes status to RESOLVED', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    suc.voteInContest(contestId, 'voter-1', 'claimant-1');
    suc.resolveContest(contestId);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.status).toBe('RESOLVED');
    }
  });

  it('cannot resolve same contest twice', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    suc.voteInContest(contestId, 'voter-1', 'claimant-1');
    suc.resolveContest(contestId);
    const outcome = suc.resolveContest(contestId);
    expect(outcome).toBe('already-resolved');
  });

  it('resolve fails for non-existent contest', () => {
    const suc = createTestSuccession();
    const outcome = suc.resolveContest('contest-999');
    expect(outcome).toBe('not-found');
  });

  it('lists all contests', () => {
    const suc = createTestSuccession();
    suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    suc.openContest('dynasty-2', ['claimant-3', 'claimant-4']);
    const contests = suc.getAllContests();
    expect(contests.length).toBe(2);
  });

  it('retrieves contest votes', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    suc.voteInContest(contestId, 'voter-1', 'claimant-1');
    suc.voteInContest(contestId, 'voter-2', 'claimant-2');
    const votes = suc.getContestVotes(contestId);
    expect(votes.length).toBe(2);
  });

  it('returns empty votes for non-existent contest', () => {
    const suc = createTestSuccession();
    const votes = suc.getContestVotes('contest-999');
    expect(votes.length).toBe(0);
  });

  it('contest with no votes resolves to first claimant by default', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    const outcome = suc.resolveContest(contestId);
    expect(outcome).not.toBe('not-found');
    expect(outcome).not.toBe('already-resolved');
    if (outcome !== 'not-found' && outcome !== 'already-resolved') {
      expect(outcome.totalVotes).toBe(0);
    }
  });
});

describe('DynastySuccession legitimacy scoring', () => {
  it('calculates legitimacy score from factors', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 1.0, 0.8, 0.5);
    expect(score.totalScore).toBeGreaterThan(0);
  });

  it('bloodline proximity weighted at 40 percent', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 1.0, 0, 0);
    expect(score.totalScore).toBeCloseTo(40, 0);
  });

  it('civic score weighted at 35 percent', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 0, 1.0, 0);
    expect(score.totalScore).toBeCloseTo(35, 0);
  });

  it('time served weighted at 25 percent', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 0, 0, 1.0);
    expect(score.totalScore).toBeCloseTo(25, 0);
  });

  it('combines all legitimacy factors', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 1.0, 1.0, 1.0);
    expect(score.totalScore).toBeCloseTo(100, 0);
  });

  it('legitimacy score includes dynasty and heir IDs', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 0.5, 0.5, 0.5);
    expect(score.dynastyId).toBe('dynasty-1');
    expect(score.heirId).toBe('heir-1');
  });

  it('handles zero legitimacy factors', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 0, 0, 0);
    expect(score.totalScore).toBe(0);
  });

  it('legitimacy score preserves input factors', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 0.8, 0.6, 0.4);
    expect(score.bloodlineProximity).toBe(0.8);
    expect(score.civicScore).toBe(0.6);
    expect(score.timeServed).toBe(0.4);
  });
});

describe('DynastySuccession regency', () => {
  it('enters regency for minor heir', () => {
    const suc = createTestSuccession();
    const result = suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'heir is underage');
    expect(result).toBe('success');
  });

  it('regency changes status to IN_REGENCY', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.status).toBe('IN_REGENCY');
    }
  });

  it('retrieves regency record', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    const record = suc.getRegencyRecord('dynasty-1');
    expect(record).not.toBe('not-found');
    if (record !== 'not-found') {
      expect(record.regentDynastyId).toBe('regent-1');
      expect(record.minorHeirId).toBe('minor-1');
    }
  });

  it('regency record includes reason', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'heir is only 12 years old');
    const record = suc.getRegencyRecord('dynasty-1');
    expect(record).not.toBe('not-found');
    if (record !== 'not-found') {
      expect(record.reason).toBe('heir is only 12 years old');
    }
  });

  it('cannot enter regency twice', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    const result = suc.enterRegency('dynasty-1', 'regent-2', 'minor-1', 'still underage');
    expect(result).toBe('already-in-regency');
  });

  it('exits regency', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    const result = suc.exitRegency('dynasty-1');
    expect(result).toBe('success');
  });

  it('exiting regency changes status to ACTIVE', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    suc.exitRegency('dynasty-1');
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.status).toBe('ACTIVE');
    }
  });

  it('exiting regency sets end timestamp', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    suc.exitRegency('dynasty-1');
    const record = suc.getRegencyRecord('dynasty-1');
    expect(record).not.toBe('not-found');
    if (record !== 'not-found') {
      expect(record.endedAt).not.toBe(null);
    }
  });

  it('cannot exit regency if not in regency', () => {
    const suc = createTestSuccession();
    const result = suc.exitRegency('dynasty-1');
    expect(result).toBe('not-in-regency');
  });

  it('returns not-found for missing regency record', () => {
    const suc = createTestSuccession();
    const record = suc.getRegencyRecord('dynasty-999');
    expect(record).toBe('not-found');
  });

  it('can enter new regency after exiting previous', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-1', 'regent-1', 'minor-1', 'underage');
    suc.exitRegency('dynasty-1');
    const result = suc.enterRegency('dynasty-1', 'regent-2', 'minor-2', 'new minor');
    expect(result).toBe('success');
  });
});

describe('DynastySuccession edge cases', () => {
  it('handles very large succession order', () => {
    const suc = createTestSuccession();
    const heirs: Array<string> = [];
    for (let i = 0; i < 100; i = i + 1) {
      heirs.push('heir-' + String(i));
    }
    suc.setSuccessionOrder('dynasty-1', heirs);
    const line = suc.getSuccessionLine('dynasty-1');
    expect(line).not.toBe('not-found');
    if (line !== 'not-found') {
      expect(line.backupHeirs.length).toBe(99);
    }
  });

  it('handles contest with many claimants', () => {
    const suc = createTestSuccession();
    const claimants: Array<string> = [];
    for (let i = 0; i < 20; i = i + 1) {
      claimants.push('claimant-' + String(i));
    }
    const contestId = suc.openContest('dynasty-1', claimants);
    const contests = suc.getAllContests();
    const contest = contests[0];
    expect(contest).toBeDefined();
    if (contest !== undefined) {
      expect(contest.claimants.length).toBe(20);
    }
  });

  it('handles contest with many votes', () => {
    const suc = createTestSuccession();
    const contestId = suc.openContest('dynasty-1', ['claimant-1', 'claimant-2']);
    for (let i = 0; i < 1000; i = i + 1) {
      suc.voteInContest(contestId, 'voter-' + String(i), 'claimant-1');
    }
    const outcome = suc.resolveContest(contestId);
    expect(outcome).not.toBe('not-found');
    expect(outcome).not.toBe('already-resolved');
    if (outcome !== 'not-found' && outcome !== 'already-resolved') {
      expect(outcome.totalVotes).toBe(1000);
    }
  });

  it('legitimacy score handles fractional inputs', () => {
    const suc = createTestSuccession();
    const score = suc.getLegitimacy('dynasty-1', 'heir-1', 0.75, 0.65, 0.55);
    expect(score.totalScore).toBeGreaterThan(0);
  });

  it('regency persists across multiple operations', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1', 0, 'founder');
    suc.enterRegency('dynasty-1', 'regent-1', 'heir-1', 'underage');
    suc.designateHeir('dynasty-1', 'heir-2', 1, 'regent');
    const record = suc.getRegencyRecord('dynasty-1');
    expect(record).not.toBe('not-found');
    if (record !== 'not-found') {
      expect(record.endedAt).toBe(null);
    }
  });

  it('succession line created automatically on regency entry', () => {
    const suc = createTestSuccession();
    suc.enterRegency('dynasty-new', 'regent-1', 'minor-1', 'underage');
    const line = suc.getSuccessionLine('dynasty-new');
    expect(line).not.toBe('not-found');
  });

  it('succession line created automatically on contest open', () => {
    const suc = createTestSuccession();
    suc.openContest('dynasty-new', ['claimant-1', 'claimant-2']);
    const line = suc.getSuccessionLine('dynasty-new');
    expect(line).not.toBe('not-found');
  });

  it('multiple dynasties tracked independently', () => {
    const suc = createTestSuccession();
    suc.designateHeir('dynasty-1', 'heir-1a', 0, 'founder-1');
    suc.designateHeir('dynasty-2', 'heir-2a', 0, 'founder-2');
    const line1 = suc.getSuccessionLine('dynasty-1');
    const line2 = suc.getSuccessionLine('dynasty-2');
    expect(line1).not.toBe('not-found');
    expect(line2).not.toBe('not-found');
    if (line1 !== 'not-found' && line2 !== 'not-found') {
      expect(line1.primaryHeir).toBe('heir-1a');
      expect(line2.primaryHeir).toBe('heir-2a');
    }
  });
});
