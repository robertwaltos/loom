import { describe, it, expect } from 'vitest';
import { createSurveyCorpsEngine } from '../survey-corps.js';
import type {
  SurveyCorpsDeps,
  ProposeMissionParams,
  MissionTarget,
  MissionRewardPort,
  WorldUnlockPort,
  SurveyData,
} from '../survey-corps.js';

// ─── Test Helpers ────────────────────────────────────────────────────

interface TestRewardPort extends MissionRewardPort {
  readonly rewards: Array<{ dynastyId: string; amount: bigint; reason: string }>;
}

interface TestUnlockPort extends WorldUnlockPort {
  readonly unlocked: Array<{ worldId: string; surveyData: SurveyData }>;
}

function makeRewardPort(): TestRewardPort {
  const rewards: Array<{ dynastyId: string; amount: bigint; reason: string }> = [];
  return {
    rewards,
    issueReward: (dynastyId, amount, reason) => {
      rewards.push({ dynastyId, amount, reason });
    },
  };
}

function makeUnlockPort(): TestUnlockPort {
  const unlocked: Array<{ worldId: string; surveyData: SurveyData }> = [];
  return {
    unlocked,
    unlockWorld: (worldId, surveyData) => {
      unlocked.push({ worldId, surveyData });
    },
  };
}

function makeDeps(): SurveyCorpsDeps & {
  readonly rewardPort: TestRewardPort;
  readonly worldUnlockPort: TestUnlockPort;
} {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'id-' + String(idCounter);
      },
    },
    rewardPort: makeRewardPort(),
    worldUnlockPort: makeUnlockPort(),
  };
}

function makeTarget(overrides?: Partial<MissionTarget>): MissionTarget {
  return {
    worldId: 'world-alpha',
    stellarClass: 'G',
    distanceLightYears: 50,
    knownHazards: 2,
    ...overrides,
  };
}

function makeProposal(overrides?: Partial<ProposeMissionParams>): ProposeMissionParams {
  return {
    missionType: 'exploration',
    target: makeTarget(),
    sponsorDynastyId: 'dynasty-1',
    ...overrides,
  };
}

// ─── Mission Proposal ───────────────────────────────────────────────

describe('SurveyCorps — mission proposal', () => {
  it('creates a mission in proposed phase', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    expect(mission.phase).toBe('proposed');
    expect(mission.missionType).toBe('exploration');
    expect(mission.sponsorDynastyId).toBe('dynasty-1');
    expect(mission.target.worldId).toBe('world-alpha');
  });

  it('assigns unique mission IDs', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const m1 = engine.proposeMission(makeProposal());
    const m2 = engine.proposeMission(makeProposal());

    expect(m1.missionId).not.toBe(m2.missionId);
  });

  it('calculates difficulty based on target', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const easy = engine.calculateDifficulty(makeTarget({ stellarClass: 'M', knownHazards: 0 }));
    const hard = engine.calculateDifficulty(makeTarget({ stellarClass: 'O', knownHazards: 4 }));

    expect(easy).toBeLessThan(hard);
    expect(easy).toBeGreaterThanOrEqual(1);
    expect(hard).toBeLessThanOrEqual(10);
  });

  it('calculates reward proportional to difficulty', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const lowReward = engine.calculateReward('exploration', 2);
    const highReward = engine.calculateReward('exploration', 8);

    expect(highReward.kalonBounty).toBeGreaterThan(lowReward.kalonBounty);
  });

  it('grants naming rights only for exploration missions', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const exploration = engine.calculateReward('exploration', 5);
    const deepSurvey = engine.calculateReward('deep_survey', 5);

    expect(exploration.namingRights).toBe(true);
    expect(deepSurvey.namingRights).toBe(false);
  });

  it('creates initial log entry on proposal', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    const entries = engine.getLogEntries(mission.missionId);

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.phase).toBe('proposed');
  });
});

// ─── Crew Management ────────────────────────────────────────────────

describe('SurveyCorps — crew assignment', () => {
  it('assigns crew to a proposed mission', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    const crew = engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });

    expect(crew.dynastyId).toBe('pilot-1');
    expect(crew.role).toBe('commander');
    expect(crew.experienceLevel).toBe(5);
  });

  it('rejects duplicate crew assignment', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });

    expect(() =>
      engine.assignCrew({
        missionId: mission.missionId,
        dynastyId: 'pilot-1',
        role: 'scout',
        experienceLevel: 3,
      }),
    ).toThrow('already assigned');
  });
});

describe('SurveyCorps — crew removal', () => {
  it('removes crew from proposed mission', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });

    engine.removeCrew(mission.missionId, 'pilot-1');
    const updated = engine.getMission(mission.missionId);
    expect(updated.crew).toHaveLength(0);
  });

  it('rejects crew removal after approval', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });
    engine.approveMission(mission.missionId);

    expect(() => {
      engine.removeCrew(mission.missionId, 'pilot-1');
    }).toThrow('Cannot remove crew');
  });

  it('rejects removing non-existent crew member', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    expect(() => {
      engine.removeCrew(mission.missionId, 'ghost');
    }).toThrow('not in crew');
  });
});

// ─── Mission Approval ───────────────────────────────────────────────

describe('SurveyCorps — mission approval', () => {
  it('approves a mission with crew', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });

    const transition = engine.approveMission(mission.missionId);
    expect(transition.from).toBe('proposed');
    expect(transition.to).toBe('approved');
  });

  it('rejects approval without crew', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    expect(() => engine.approveMission(mission.missionId)).toThrow('no crew assigned');
  });

  it('calculates risk factor on approval', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });
    engine.approveMission(mission.missionId);

    const approved = engine.getMission(mission.missionId);
    expect(approved.riskFactor).toBeGreaterThan(0);
    expect(approved.riskFactor).toBeLessThanOrEqual(1);
  });
});

// ─── Phase Advancement ──────────────────────────────────────────────

describe('SurveyCorps — phase advancement', () => {
  it('advances phase when duration elapses', () => {
    let time = 0;
    const deps: SurveyCorpsDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { generate: () => 'id-' + String(++time) },
      rewardPort: makeRewardPort(),
      worldUnlockPort: makeUnlockPort(),
    };
    const engine = createSurveyCorpsEngine(deps);

    time = 1_000_000;
    const mission = engine.proposeMission(makeProposal());
    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });

    time = 2_000_000;
    engine.approveMission(mission.missionId);

    const approved = engine.getMission(mission.missionId);
    const approvedDuration = approved.phaseDurationsUs['approved'];
    time = 2_000_000 + (approvedDuration ?? 0) + 1;

    const transition = engine.advancePhase(mission.missionId);
    expect(transition).not.toBeNull();
    expect(transition?.to).toBe('outbound');
  });

  it('returns null when phase duration has not elapsed', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.assignCrew({
      missionId: mission.missionId,
      dynastyId: 'pilot-1',
      role: 'commander',
      experienceLevel: 5,
    });
    engine.approveMission(mission.missionId);

    const transition = engine.advancePhase(mission.missionId);
    expect(transition).toBeNull();
  });

  it('returns null for terminal phases', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.abortMission(mission.missionId, 'test');

    const transition = engine.advancePhase(mission.missionId);
    expect(transition).toBeNull();
  });
});

// ─── Terminal Transitions ───────────────────────────────────────────

describe('SurveyCorps — terminal transitions', () => {
  it('aborts a mission', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    const transition = engine.abortMission(mission.missionId, 'funding cut');
    expect(transition.to).toBe('aborted');
    expect(transition.reason).toContain('funding cut');
  });

  it('rejects abort on terminal mission', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.abortMission(mission.missionId, 'first abort');

    expect(() => engine.abortMission(mission.missionId, 'second abort')).toThrow('terminal phase');
  });

  it('fails a mission', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    const transition = engine.failMission(mission.missionId, 'catastrophic failure');
    expect(transition.to).toBe('failed');
  });

  it('cannot fail a terminal mission', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    engine.abortMission(mission.missionId, 'test');

    expect(() => engine.failMission(mission.missionId, 'too late')).toThrow('terminal phase');
  });
});

// ─── Mission Completion ─────────────────────────────────────────────

function buildReturningMission(deps: SurveyCorpsDeps) {
  let time = 0;
  const clockDeps: SurveyCorpsDeps = {
    ...deps,
    clock: { nowMicroseconds: () => time },
    idGenerator: { generate: () => 'id-' + String(++time) },
  };
  const engine = createSurveyCorpsEngine(clockDeps);

  time = 1_000_000;
  const mission = engine.proposeMission(makeProposal());
  engine.assignCrew({
    missionId: mission.missionId,
    dynastyId: 'pilot-1',
    role: 'commander',
    experienceLevel: 5,
  });

  time = 2_000_000;
  engine.approveMission(mission.missionId);

  const m = engine.getMission(mission.missionId);
  time = 2_000_000 + (m.phaseDurationsUs['approved'] ?? 0) + 1;
  engine.advancePhase(mission.missionId);

  const m2 = engine.getMission(mission.missionId);
  time += (m2.phaseDurationsUs['outbound'] ?? 0) + 1;
  engine.advancePhase(mission.missionId);

  const m3 = engine.getMission(mission.missionId);
  time += (m3.phaseDurationsUs['on_site'] ?? 0) + 1;
  engine.advancePhase(mission.missionId);

  return { engine, missionId: mission.missionId };
}

function makeCompletionDeps(): SurveyCorpsDeps & {
  rewardPort: TestRewardPort;
  worldUnlockPort: TestUnlockPort;
} {
  return {
    clock: { nowMicroseconds: () => 0 },
    idGenerator: { generate: () => '' },
    rewardPort: makeRewardPort(),
    worldUnlockPort: makeUnlockPort(),
  };
}

describe('SurveyCorps — completion lifecycle', () => {
  it('completes a returning mission', () => {
    const deps = makeCompletionDeps();
    const { engine, missionId } = buildReturningMission(deps);
    const transition = engine.completeMission(missionId, 7, 4);
    expect(transition.to).toBe('completed');
  });

  it('issues rewards on completion', () => {
    const deps = makeCompletionDeps();
    const { engine, missionId } = buildReturningMission(deps);
    engine.completeMission(missionId, 7, 4);
    expect(deps.rewardPort.rewards.length).toBeGreaterThan(0);
  });

  it('unlocks world on completion', () => {
    const deps = makeCompletionDeps();
    const { engine, missionId } = buildReturningMission(deps);
    engine.completeMission(missionId, 7, 4);
    expect(deps.worldUnlockPort.unlocked).toHaveLength(1);
    expect(deps.worldUnlockPort.unlocked[0]?.worldId).toBe('world-alpha');
  });
});

describe('SurveyCorps — completion data', () => {
  it('stores survey data on completion', () => {
    const deps = makeCompletionDeps();
    const { engine, missionId } = buildReturningMission(deps);
    engine.completeMission(missionId, 7, 4);

    const completed = engine.getMission(missionId);
    expect(completed.completedSurveyData).not.toBeNull();
    expect(completed.completedSurveyData?.resourceRating).toBe(7);
    expect(completed.completedSurveyData?.hazardRating).toBe(4);
  });

  it('rejects completion from non-returning phase', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());
    expect(() => engine.completeMission(mission.missionId, 5, 3)).toThrow('expected returning');
  });
});

// ─── Queries ─────────────────────────────────────────────────────────

describe('SurveyCorps — queries', () => {
  it('retrieves a mission by ID', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    const fetched = engine.getMission(mission.missionId);
    expect(fetched.missionId).toBe(mission.missionId);
  });

  it('returns undefined for unknown mission (tryGet)', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);

    expect(engine.tryGetMission('nonexistent')).toBeUndefined();
  });

  it('throws for unknown mission (get)', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);

    expect(() => engine.getMission('nonexistent')).toThrow('not found');
  });

  it('lists missions by phase', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    engine.proposeMission(makeProposal());
    engine.proposeMission(makeProposal());

    const proposed = engine.listByPhase('proposed');
    expect(proposed).toHaveLength(2);
  });

  it('lists missions by dynasty', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    engine.proposeMission(makeProposal({ sponsorDynastyId: 'dynasty-A' }));
    engine.proposeMission(makeProposal({ sponsorDynastyId: 'dynasty-B' }));

    const dynastyA = engine.listByDynasty('dynasty-A');
    expect(dynastyA).toHaveLength(1);
  });
});

// ─── Risk Calculations ──────────────────────────────────────────────

describe('SurveyCorps — risk calculations', () => {
  it('returns risk between 0.01 and 0.95', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const crew = [
      { dynastyId: 'a', role: 'commander' as const, assignedAt: 0, experienceLevel: 1 },
    ];
    const risk = engine.calculateRisk(10, crew);

    expect(risk).toBeGreaterThanOrEqual(0.01);
    expect(risk).toBeLessThanOrEqual(0.95);
  });

  it('reduces risk with experienced crew', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const rookies = [
      { dynastyId: 'a', role: 'commander' as const, assignedAt: 0, experienceLevel: 1 },
    ];
    const veterans = [
      { dynastyId: 'a', role: 'commander' as const, assignedAt: 0, experienceLevel: 10 },
    ];

    const rookieRisk = engine.calculateRisk(5, rookies);
    const veteranRisk = engine.calculateRisk(5, veterans);
    expect(veteranRisk).toBeLessThan(rookieRisk);
  });

  it('increases risk with higher difficulty', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const crew = [
      { dynastyId: 'a', role: 'commander' as const, assignedAt: 0, experienceLevel: 3 },
    ];

    const lowRisk = engine.calculateRisk(2, crew);
    const highRisk = engine.calculateRisk(9, crew);
    expect(highRisk).toBeGreaterThan(lowRisk);
  });
});

// ─── Phase Durations ────────────────────────────────────────────────

describe('SurveyCorps — phase durations', () => {
  it('calculates travel duration based on distance', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const near = engine.calculatePhaseDurations(
      makeTarget({ distanceLightYears: 10 }),
      'exploration',
    );
    const far = engine.calculatePhaseDurations(
      makeTarget({ distanceLightYears: 200 }),
      'exploration',
    );

    const nearOutbound = near['outbound'] ?? 0;
    const farOutbound = far['outbound'] ?? 0;
    expect(farOutbound).toBeGreaterThan(nearOutbound);
  });

  it('varies on-site duration by mission type', () => {
    const engine = createSurveyCorpsEngine(makeDeps());
    const target = makeTarget();
    const exploration = engine.calculatePhaseDurations(target, 'exploration');
    const colony = engine.calculatePhaseDurations(target, 'colony_prep');

    const explorationOnSite = exploration['on_site'] ?? 0;
    const colonyOnSite = colony['on_site'] ?? 0;
    expect(colonyOnSite).toBeGreaterThan(explorationOnSite);
  });
});

// ─── Stats ──────────────────────────────────────────────────────────

describe('SurveyCorps — stats', () => {
  it('tracks mission statistics', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    engine.proposeMission(makeProposal());
    const m2 = engine.proposeMission(makeProposal());
    engine.abortMission(m2.missionId, 'test');

    const stats = engine.getStats();
    expect(stats.totalMissions).toBe(2);
    expect(stats.activeMissions).toBe(1);
    expect(stats.abortedMissions).toBe(1);
  });
});

// ─── Logging ────────────────────────────────────────────────────────

describe('SurveyCorps — logging', () => {
  it('adds manual log entries', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    engine.addLogEntry(mission.missionId, 'Anomalous readings detected');
    const entries = engine.getLogEntries(mission.missionId);

    const manual = entries.find((e) => e.message === 'Anomalous readings detected');
    expect(manual).toBeDefined();
  });

  it('log entries are append-only', () => {
    const deps = makeDeps();
    const engine = createSurveyCorpsEngine(deps);
    const mission = engine.proposeMission(makeProposal());

    const before = engine.getLogEntries(mission.missionId).length;
    engine.addLogEntry(mission.missionId, 'Entry A');
    engine.addLogEntry(mission.missionId, 'Entry B');
    const after = engine.getLogEntries(mission.missionId).length;

    expect(after).toBe(before + 2);
  });
});
