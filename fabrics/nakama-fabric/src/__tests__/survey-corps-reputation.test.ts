import { describe, it, expect } from 'vitest';
import { createCorpsReputationService, RANK_THRESHOLDS } from '../survey-corps-reputation.js';
import type { CorpsReputationDeps, MissionReputationParams } from '../survey-corps-reputation.js';

// ─── Test Helpers ────────────────────────────────────────────────────

function makeDeps(): CorpsReputationDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

function makeMissionParams(overrides?: Partial<MissionReputationParams>): MissionReputationParams {
  return {
    dynastyId: 'dynasty-1',
    missionDifficulty: 5,
    wasCommander: false,
    crewSize: 3,
    ...overrides,
  };
}

// ─── Enrollment ──────────────────────────────────────────────────────

describe('CorpsReputation — enrollment', () => {
  it('enrolls a dynasty with zero reputation', () => {
    const service = createCorpsReputationService(makeDeps());
    const record = service.enroll('dynasty-1');

    expect(record.dynastyId).toBe('dynasty-1');
    expect(record.reputation).toBe(0);
    expect(record.rank).toBe('recruit');
    expect(record.missionsCompleted).toBe(0);
  });

  it('rejects duplicate enrollment', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    expect(() => service.enroll('dynasty-1')).toThrow('already enrolled');
  });

  it('tracks enrollment timestamp', () => {
    const service = createCorpsReputationService(makeDeps());
    const record = service.enroll('dynasty-1');

    expect(record.joinedAt).toBeGreaterThan(0);
    expect(record.lastMissionAt).toBeNull();
  });
});

// ─── Mission Completion Reputation ──────────────────────────────────

describe('CorpsReputation — mission completion', () => {
  it('awards reputation for completed missions', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    const event = service.awardMissionComplete(makeMissionParams());
    expect(event.delta).toBeGreaterThan(0);
    expect(event.newReputation).toBeGreaterThan(0);
  });

  it('increases reputation proportional to difficulty', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    const easy = service.awardMissionComplete(
      makeMissionParams({ dynastyId: 'dynasty-1', missionDifficulty: 2 }),
    );
    const hard = service.awardMissionComplete(
      makeMissionParams({ dynastyId: 'dynasty-2', missionDifficulty: 8 }),
    );

    expect(hard.delta).toBeGreaterThan(easy.delta);
  });

  it('gives commander bonus', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    const regular = service.awardMissionComplete(
      makeMissionParams({ dynastyId: 'dynasty-1', wasCommander: false }),
    );
    const commander = service.awardMissionComplete(
      makeMissionParams({ dynastyId: 'dynasty-2', wasCommander: true }),
    );

    expect(commander.delta).toBeGreaterThan(regular.delta);
  });

  it('increments missions completed counter', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    service.awardMissionComplete(makeMissionParams());
    service.awardMissionComplete(makeMissionParams());

    const record = service.getRecord('dynasty-1');
    expect(record.missionsCompleted).toBe(2);
  });

  it('updates last mission timestamp', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.awardMissionComplete(makeMissionParams());

    const record = service.getRecord('dynasty-1');
    expect(record.lastMissionAt).not.toBeNull();
  });
});

// ─── Failure and Abort Penalties ────────────────────────────────────

describe('CorpsReputation — penalties', () => {
  it('penalizes mission failure', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.awardMissionComplete(makeMissionParams({ missionDifficulty: 8 }));

    const before = service.getRecord('dynasty-1').reputation;
    service.penalizeMissionFailure(makeMissionParams());
    const after = service.getRecord('dynasty-1').reputation;

    expect(after).toBeLessThan(before);
  });

  it('penalizes mission abort less than failure', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    service.adjustReputation('dynasty-1', 200, 'seed');
    service.adjustReputation('dynasty-2', 200, 'seed');

    const failure = service.penalizeMissionFailure(makeMissionParams({ dynastyId: 'dynasty-1' }));
    const abort = service.penalizeMissionAbort('dynasty-2', 5);

    expect(Math.abs(abort.delta)).toBeLessThan(Math.abs(failure.delta));
  });

  it('clamps reputation to zero minimum', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    service.penalizeMissionFailure(makeMissionParams({ missionDifficulty: 10 }));
    const record = service.getRecord('dynasty-1');
    expect(record.reputation).toBe(0);
  });

  it('increments failure counter', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.penalizeMissionFailure(makeMissionParams());

    const record = service.getRecord('dynasty-1');
    expect(record.missionsFailed).toBe(1);
  });

  it('increments abort counter', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.penalizeMissionAbort('dynasty-1', 5);

    const record = service.getRecord('dynasty-1');
    expect(record.missionsAborted).toBe(1);
  });
});

// ─── Discovery Bonus ─────────────────────────────────────────────────

describe('CorpsReputation — discovery bonus', () => {
  it('awards discovery bonus', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    const event = service.awardDiscoveryBonus('dynasty-1', 'New World Alpha');
    expect(event.delta).toBe(50);
    expect(event.reason).toContain('New World Alpha');
  });
});

// ─── Rank Progression ───────────────────────────────────────────────

describe('CorpsReputation — rank progression', () => {
  it('starts as recruit', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    expect(service.getRank('dynasty-1')).toBe('recruit');
  });

  it('promotes to scout at threshold', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', RANK_THRESHOLDS.scout, 'test promotion');

    expect(service.getRank('dynasty-1')).toBe('scout');
  });

  it('promotes to pathfinder at threshold', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', RANK_THRESHOLDS.pathfinder, 'test promotion');

    expect(service.getRank('dynasty-1')).toBe('pathfinder');
  });

  it('promotes to legend at threshold', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', RANK_THRESHOLDS.legend, 'test promotion');

    expect(service.getRank('dynasty-1')).toBe('legend');
  });

  it('demotes on reputation loss', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', 150, 'promote');

    expect(service.getRank('dynasty-1')).toBe('scout');

    service.adjustReputation('dynasty-1', -100, 'demote');
    expect(service.getRank('dynasty-1')).toBe('recruit');
  });

  it('reports rank change in event', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    const event = service.adjustReputation('dynasty-1', RANK_THRESHOLDS.scout, 'promo');

    expect(event.previousRank).toBe('recruit');
    expect(event.newRank).toBe('scout');
  });
});

// ─── Access Control ─────────────────────────────────────────────────

describe('CorpsReputation — access control', () => {
  it('restricts recruits to low difficulty', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    expect(service.canAccessMission('dynasty-1', 3)).toBe(true);
    expect(service.canAccessMission('dynasty-1', 5)).toBe(false);
  });

  it('grants access to higher difficulty with rank', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', RANK_THRESHOLDS.navigator, 'rank up');

    expect(service.canAccessMission('dynasty-1', 8)).toBe(true);
  });

  it('denies access for unenrolled dynasty', () => {
    const service = createCorpsReputationService(makeDeps());

    expect(service.canAccessMission('ghost', 1)).toBe(false);
  });

  it('requires pathfinder rank for commander role', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    expect(service.canBeCommander('dynasty-1')).toBe(false);

    service.adjustReputation('dynasty-2', RANK_THRESHOLDS.pathfinder, 'promote');
    expect(service.canBeCommander('dynasty-2')).toBe(true);
  });

  it('denies commander for unenrolled dynasty', () => {
    const service = createCorpsReputationService(makeDeps());

    expect(service.canBeCommander('ghost')).toBe(false);
  });
});

// ─── Leaderboard ────────────────────────────────────────────────────

describe('CorpsReputation — leaderboard', () => {
  it('returns sorted leaderboard', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-A');
    service.enroll('dynasty-B');
    service.enroll('dynasty-C');

    service.adjustReputation('dynasty-B', 300, 'test');
    service.adjustReputation('dynasty-A', 100, 'test');
    service.adjustReputation('dynasty-C', 200, 'test');

    const board = service.getLeaderboard(10);
    expect(board[0]?.dynastyId).toBe('dynasty-B');
    expect(board[1]?.dynastyId).toBe('dynasty-C');
    expect(board[2]?.dynastyId).toBe('dynasty-A');
  });

  it('respects limit parameter', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');
    service.enroll('dynasty-3');

    const board = service.getLeaderboard(2);
    expect(board).toHaveLength(2);
  });

  it('returns leaderboard position', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-A');
    service.enroll('dynasty-B');

    service.adjustReputation('dynasty-B', 500, 'test');
    service.adjustReputation('dynasty-A', 100, 'test');

    expect(service.getLeaderboardPosition('dynasty-B')).toBe(1);
    expect(service.getLeaderboardPosition('dynasty-A')).toBe(2);
  });

  it('returns -1 for unenrolled dynasty position', () => {
    const service = createCorpsReputationService(makeDeps());

    expect(service.getLeaderboardPosition('ghost')).toBe(-1);
  });

  it('breaks ties by missions completed', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-A');
    service.enroll('dynasty-B');

    service.adjustReputation('dynasty-A', 100, 'test');
    service.adjustReputation('dynasty-B', 100, 'test');
    service.awardMissionComplete(makeMissionParams({ dynastyId: 'dynasty-B' }));

    const board = service.getLeaderboard(10);
    expect(board[0]?.dynastyId).toBe('dynasty-B');
  });
});

// ─── Queries ─────────────────────────────────────────────────────────

describe('CorpsReputation — queries', () => {
  it('retrieves record by dynasty ID', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');

    const record = service.getRecord('dynasty-1');
    expect(record.dynastyId).toBe('dynasty-1');
  });

  it('throws for unknown dynasty', () => {
    const service = createCorpsReputationService(makeDeps());

    expect(() => service.getRecord('ghost')).toThrow('not enrolled');
  });

  it('returns undefined for unknown dynasty (tryGet)', () => {
    const service = createCorpsReputationService(makeDeps());

    expect(service.tryGetRecord('ghost')).toBeUndefined();
  });

  it('lists members by rank', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');
    service.enroll('dynasty-3');

    service.adjustReputation('dynasty-2', RANK_THRESHOLDS.scout, 'promote');

    const recruits = service.listByRank('recruit');
    expect(recruits).toHaveLength(2);

    const scouts = service.listByRank('scout');
    expect(scouts).toHaveLength(1);
  });

  it('counts enrolled members', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    expect(service.count()).toBe(2);
  });
});

// ─── Stats ───────────────────────────────────────────────────────────

describe('CorpsReputation — stats', () => {
  it('reports total members', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    const stats = service.getStats();
    expect(stats.totalMembers).toBe(2);
  });

  it('reports members by rank', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');
    service.adjustReputation('dynasty-2', RANK_THRESHOLDS.scout, 'promote');

    const stats = service.getStats();
    expect(stats.membersByRank.recruit).toBe(1);
    expect(stats.membersByRank.scout).toBe(1);
  });

  it('reports average reputation', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.enroll('dynasty-2');

    service.adjustReputation('dynasty-1', 100, 'test');
    service.adjustReputation('dynasty-2', 200, 'test');

    const stats = service.getStats();
    expect(stats.averageReputation).toBe(150);
  });

  it('handles empty stats', () => {
    const service = createCorpsReputationService(makeDeps());
    const stats = service.getStats();

    expect(stats.totalMembers).toBe(0);
    expect(stats.averageReputation).toBe(0);
  });
});

// ─── Reputation Tracking ─────────────────────────────────────────────

describe('CorpsReputation — tracking totals', () => {
  it('tracks total reputation earned', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', 100, 'grant');
    service.adjustReputation('dynasty-1', 50, 'bonus');

    const record = service.getRecord('dynasty-1');
    expect(record.totalReputationEarned).toBe(150);
  });

  it('tracks total reputation lost', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', 200, 'grant');
    service.adjustReputation('dynasty-1', -30, 'penalty');

    const record = service.getRecord('dynasty-1');
    expect(record.totalReputationLost).toBe(30);
  });

  it('reports change event with correct previous values', () => {
    const service = createCorpsReputationService(makeDeps());
    service.enroll('dynasty-1');
    service.adjustReputation('dynasty-1', 50, 'first');

    const event = service.adjustReputation('dynasty-1', 60, 'second');
    expect(event.previousReputation).toBe(50);
    expect(event.newReputation).toBe(110);
  });
});

// ─── Constants Export ────────────────────────────────────────────────

describe('CorpsReputation — constants', () => {
  it('exports rank thresholds', () => {
    expect(RANK_THRESHOLDS.recruit).toBe(0);
    expect(RANK_THRESHOLDS.scout).toBe(100);
    expect(RANK_THRESHOLDS.pathfinder).toBe(500);
    expect(RANK_THRESHOLDS.navigator).toBe(1500);
    expect(RANK_THRESHOLDS.vanguard).toBe(4000);
    expect(RANK_THRESHOLDS.legend).toBe(10000);
  });
});
