import { describe, expect, it } from 'vitest';
import { createCorpsReputationService, RANK_THRESHOLDS } from '../survey-corps-reputation.js';

describe('survey-corps-reputation simulation', () => {
  it('simulates progression from recruit with mission gains and penalties', () => {
    let now = 1_000_000;
    const service = createCorpsReputationService({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    service.enroll('dyn-1');
    service.awardMissionComplete({ dynastyId: 'dyn-1', missionDifficulty: 6, wasCommander: true, crewSize: 4 });
    service.awardDiscoveryBonus('dyn-1', 'Gamma Verge');
    service.penalizeMissionAbort('dyn-1', 3);

    const record = service.getRecord('dyn-1');
    expect(record.reputation).toBeGreaterThan(0);
    service.adjustReputation('dyn-1', RANK_THRESHOLDS.scout, 'promotion');
    expect(['scout', 'pathfinder', 'navigator', 'legend']).toContain(service.getRank('dyn-1'));
  });
});
