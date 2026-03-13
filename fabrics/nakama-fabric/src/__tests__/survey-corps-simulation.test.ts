import { describe, expect, it } from 'vitest';
import { createSurveyCorpsEngine } from '../survey-corps.js';

describe('survey-corps simulation', () => {
  it('simulates mission proposal, crewing, approval, and completion rewards', () => {
    let now = 1_000_000;
    let id = 0;
    const rewards: Array<{ dynastyId: string; amount: bigint; reason: string }> = [];
    const unlocked: string[] = [];
    const engine = createSurveyCorpsEngine({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { generate: () => `sc-${++id}` },
      rewardPort: { issueReward: (dynastyId, amount, reason) => rewards.push({ dynastyId, amount, reason }) },
      worldUnlockPort: { unlockWorld: (worldId) => unlocked.push(worldId) },
    });

    const mission = engine.proposeMission({
      missionType: 'exploration',
      target: { worldId: 'world-x', stellarClass: 'G', distanceLightYears: 8, knownHazards: 1 },
      sponsorDynastyId: 'dyn-1',
    });
    engine.assignCrew({ missionId: mission.missionId, dynastyId: 'dyn-1', role: 'commander', experienceLevel: 5 });
    engine.approveMission(mission.missionId);

    const approvedDur = engine.getMission(mission.missionId).phaseDurationsUs['approved'] ?? 0;
    now += approvedDur + 1;
    engine.advancePhase(mission.missionId);
    const outboundDur = engine.getMission(mission.missionId).phaseDurationsUs['outbound'] ?? 0;
    now += outboundDur + 1;
    engine.advancePhase(mission.missionId);
    const surveyingDur = engine.getMission(mission.missionId).phaseDurationsUs['surveying'] ?? 0;
    now += surveyingDur + 1;
    engine.advancePhase(mission.missionId);
    const onSiteDur = engine.getMission(mission.missionId).phaseDurationsUs['on_site'] ?? 0;
    now += onSiteDur + 1;
    engine.advancePhase(mission.missionId);
    engine.completeMission(mission.missionId);

    expect(rewards.length).toBeGreaterThan(0);
    expect(unlocked).toContain('world-x');
    expect(engine.getMission(mission.missionId).phase).toBe('completed');
  });
});
