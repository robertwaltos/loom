import { describe, expect, it } from 'vitest';
import { createSurveyCorpsEngine } from '../survey-corps.js';
import { createSurveyMissionOrchestrator } from '../survey-mission-orchestrator.js';

describe('survey-mission-orchestrator simulation', () => {
  it('simulates orchestrated phase advancement across ticks', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createSurveyCorpsEngine({
      clock: { nowMicroseconds: () => now },
      idGenerator: { generate: () => `sm-${++id}` },
      rewardPort: { issueReward: () => undefined },
      worldUnlockPort: { unlockWorld: () => undefined },
    });
    const mission = engine.proposeMission({
      missionType: 'exploration',
      target: { worldId: 'world-beta', stellarClass: 'K', distanceLightYears: 12, knownHazards: 2 },
      sponsorDynastyId: 'dyn-1',
    });
    engine.assignCrew({ missionId: mission.missionId, dynastyId: 'dyn-1', role: 'commander', experienceLevel: 6 });
    engine.approveMission(mission.missionId);

    const orchestrator = createSurveyMissionOrchestrator({
      engine,
      clock: { nowMicroseconds: () => now },
      rng: { random: () => 0.1 },
      logger: { log: () => undefined },
    });

    const approvedDur = engine.getMission(mission.missionId).phaseDurationsUs['approved'] ?? 0;
    now += approvedDur + 1;
    const tick = orchestrator.tick();
    expect(tick.missionsEvaluated).toBeGreaterThanOrEqual(1);
    expect(engine.getMission(mission.missionId).phase).not.toBe('approved');
  });
});
