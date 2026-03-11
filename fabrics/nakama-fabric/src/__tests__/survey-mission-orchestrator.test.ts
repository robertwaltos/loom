import { describe, it, expect } from 'vitest';
import { createSurveyCorpsEngine } from '../survey-corps.js';
import {
  createSurveyMissionOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG,
} from '../survey-mission-orchestrator.js';
import type {
  SurveyCorpsDeps,
  SurveyCorpsEngine,
  MissionTarget,
  ProposeMissionParams,
  SurveyData,
  MissionRewardPort,
  WorldUnlockPort,
} from '../survey-corps.js';
import type {
  SurveyMissionOrchestratorDeps,
  OrchestratorLogger,
} from '../survey-mission-orchestrator.js';

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

interface TestLogger extends OrchestratorLogger {
  readonly logs: Array<{ missionId: string; event: string; detail: string }>;
}

function makeLogger(): TestLogger {
  const logs: Array<{ missionId: string; event: string; detail: string }> = [];
  return {
    logs,
    log: (missionId, event, detail) => {
      logs.push({ missionId, event, detail });
    },
  };
}

interface TimeControl {
  time: number;
  advance(us: number): void;
}

function makeTimeControl(): TimeControl {
  const ctrl: TimeControl = {
    time: 1_000_000,
    advance: (us: number) => {
      ctrl.time += us;
    },
  };
  return ctrl;
}

function makeEngineDeps(timeCtrl: TimeControl): SurveyCorpsDeps & {
  rewardPort: TestRewardPort;
  worldUnlockPort: TestUnlockPort;
} {
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => timeCtrl.time },
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

function makeTarget(): MissionTarget {
  return {
    worldId: 'world-beta',
    stellarClass: 'G',
    distanceLightYears: 10,
    knownHazards: 1,
  };
}

function makeProposal(): ProposeMissionParams {
  return {
    missionType: 'exploration',
    target: makeTarget(),
    sponsorDynastyId: 'dynasty-1',
  };
}

function setupApprovedMission(engine: SurveyCorpsEngine): string {
  const mission = engine.proposeMission(makeProposal());
  engine.assignCrew({
    missionId: mission.missionId,
    dynastyId: 'pilot-1',
    role: 'commander',
    experienceLevel: 5,
  });
  engine.approveMission(mission.missionId);
  return mission.missionId;
}

function makeOrchestratorDeps(
  engine: SurveyCorpsEngine,
  timeCtrl: TimeControl,
  rngValue?: number,
): SurveyMissionOrchestratorDeps & { logger: TestLogger } {
  const logger = makeLogger();
  return {
    engine,
    clock: { nowMicroseconds: () => timeCtrl.time },
    rng: { random: () => rngValue ?? 0.1 },
    logger,
  };
}

// ─── Tick Processing ────────────────────────────────────────────────

describe('SurveyMissionOrchestrator — tick processing', () => {
  it('returns tick result with timestamp', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const result = orchestrator.tick();
    expect(result.tickTimestamp).toBe(timeCtrl.time);
  });

  it('evaluates active missions on tick', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    setupApprovedMission(engine);
    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const result = orchestrator.tick();
    expect(result.missionsEvaluated).toBeGreaterThanOrEqual(1);
  });

  it('advances phase when duration elapses', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const mission = engine.getMission(missionId);
    const approvedDur = mission.phaseDurationsUs['approved'] ?? 0;
    timeCtrl.advance(approvedDur + 1);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    const result = orchestrator.tick();

    const phaseTransition = result.transitions.find((t) => t.missionId === missionId);
    expect(phaseTransition).toBeDefined();
    expect(phaseTransition?.to).toBe('outbound');
  });

  it('does not advance when duration not elapsed', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    setupApprovedMission(engine);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    const result = orchestrator.tick();

    expect(result.transitions).toHaveLength(0);
  });
});

// ─── Risk System ────────────────────────────────────────────────────

function advanceToOutbound(
  engine: SurveyCorpsEngine,
  missionId: string,
  timeCtrl: TimeControl,
): void {
  const mission = engine.getMission(missionId);
  const approvedDur = mission.phaseDurationsUs['approved'] ?? 0;
  timeCtrl.advance(approvedDur + 1);
  engine.advancePhase(missionId);
}

describe('SurveyMissionOrchestrator — risk rolls', () => {
  it('rolls risk for missions in risk phases', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);
    advanceToOutbound(engine, missionId, timeCtrl);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl, 0.1);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    const result = orchestrator.evaluateMission(missionId);
    expect(result.riskRolled).toBe(true);
  });

  it('survives with low risk roll', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);
    advanceToOutbound(engine, missionId, timeCtrl);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl, 0.1);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    const result = orchestrator.evaluateMission(missionId);
    expect(result.riskOutcome).toBe('survived');
  });

  it('triggers total loss on extreme roll', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);
    advanceToOutbound(engine, missionId, timeCtrl);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl, 0.99);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    const result = orchestrator.evaluateMission(missionId);
    expect(result.riskOutcome).toBe('total_loss');
  });
});

describe('SurveyMissionOrchestrator — risk guards', () => {
  it('does not roll risk for non-risk phases', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl, 0.5);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    const result = orchestrator.evaluateMission(missionId);
    expect(result.riskRolled).toBe(false);
  });

  it('only rolls risk once per phase per mission', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);
    advanceToOutbound(engine, missionId, timeCtrl);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl, 0.1);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const first = orchestrator.evaluateMission(missionId);
    const second = orchestrator.evaluateMission(missionId);
    expect(first.riskRolled).toBe(true);
    expect(second.riskRolled).toBe(false);
  });
});

// ─── Abort Processing ───────────────────────────────────────────────

describe('SurveyMissionOrchestrator — abort requests', () => {
  it('processes abort requests', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const transitions = orchestrator.processAborts([
      { missionId, reason: 'Emergency recall', requestedBy: 'command' },
    ]);
    expect(transitions).toHaveLength(1);
    expect(transitions[0]?.to).toBe('aborted');
  });

  it('queues and processes aborts on tick', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    orchestrator.queueAbort({ missionId, reason: 'Budget cut', requestedBy: 'admin' });
    expect(orchestrator.getPendingAborts()).toHaveLength(1);

    const result = orchestrator.tick();
    const abortTransition = result.transitions.find((t) => t.to === 'aborted');
    expect(abortTransition).toBeDefined();
    expect(orchestrator.getPendingAborts()).toHaveLength(0);
  });

  it('ignores duplicate abort requests', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    orchestrator.queueAbort({ missionId, reason: 'First', requestedBy: 'admin' });
    orchestrator.queueAbort({ missionId, reason: 'Second', requestedBy: 'admin' });
    expect(orchestrator.getPendingAborts()).toHaveLength(1);
  });
});

describe('SurveyMissionOrchestrator — abort edge cases', () => {
  it('skips abort for terminal missions', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const mission = engine.proposeMission(makeProposal());
    engine.abortMission(mission.missionId, 'already done');

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const transitions = orchestrator.processAborts([
      { missionId: mission.missionId, reason: 'too late', requestedBy: 'admin' },
    ]);
    expect(transitions).toHaveLength(0);
  });

  it('skips abort for unknown missions', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const transitions = orchestrator.processAborts([
      { missionId: 'ghost', reason: 'unknown', requestedBy: 'admin' },
    ]);
    expect(transitions).toHaveLength(0);
  });
});

// ─── Corps Stats ────────────────────────────────────────────────────

describe('SurveyMissionOrchestrator — stats', () => {
  it('reports corps stats from engine', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    engine.proposeMission(makeProposal());
    engine.proposeMission(makeProposal());

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const stats = orchestrator.getCorpsStats();
    expect(stats.totalMissions).toBe(2);
    expect(stats.activeMissions).toBe(2);
  });
});

// ─── Configuration ──────────────────────────────────────────────────

describe('SurveyMissionOrchestrator — configuration', () => {
  it('uses default config when none provided', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);

    const config = orchestrator.getConfig();
    expect(config.casualtyThreshold).toBe(DEFAULT_ORCHESTRATOR_CONFIG.casualtyThreshold);
  });

  it('merges partial config overrides', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const logger = makeLogger();
    const orchestrator = createSurveyMissionOrchestrator({
      engine,
      clock: { nowMicroseconds: () => timeCtrl.time },
      rng: { random: () => 0.5 },
      logger,
      config: { casualtyThreshold: 0.5 },
    });

    const config = orchestrator.getConfig();
    expect(config.casualtyThreshold).toBe(0.5);
    expect(config.totalLossThreshold).toBe(DEFAULT_ORCHESTRATOR_CONFIG.totalLossThreshold);
  });
});

// ─── Logging ────────────────────────────────────────────────────────

describe('SurveyMissionOrchestrator — logging', () => {
  it('logs risk events', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const mission = engine.getMission(missionId);
    const approvedDur = mission.phaseDurationsUs['approved'] ?? 0;
    timeCtrl.advance(approvedDur + 1);
    engine.advancePhase(missionId);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl, 0.1);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    orchestrator.evaluateMission(missionId);

    const riskLogs = orchDeps.logger.logs.filter((l) => l.event === 'RISK_ROLL');
    expect(riskLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('logs abort events', () => {
    const timeCtrl = makeTimeControl();
    const engineDeps = makeEngineDeps(timeCtrl);
    const engine = createSurveyCorpsEngine(engineDeps);
    const missionId = setupApprovedMission(engine);

    const orchDeps = makeOrchestratorDeps(engine, timeCtrl);
    const orchestrator = createSurveyMissionOrchestrator(orchDeps);
    orchestrator.processAborts([{ missionId, reason: 'Emergency', requestedBy: 'command' }]);

    const abortLogs = orchDeps.logger.logs.filter((l) => l.event === 'ABORT');
    expect(abortLogs).toHaveLength(1);
  });
});
