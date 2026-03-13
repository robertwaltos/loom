import { describe, expect, it } from 'vitest';
import { createSurveyMissionEngine } from '../survey-mission.js';

function makeEngine() {
  let now = 1_000_000;
  return {
    advance: (delta: number) => {
      now += delta;
    },
    engine: createSurveyMissionEngine({
      clock: { nowMicroseconds: () => now },
    }),
  };
}

describe('survey-mission simulation', () => {
  it('runs vessel mission lifecycle with beacon deployment and completion', () => {
    const { engine, advance } = makeEngine();
    engine.registerVessel({
      vesselId: 'sv-1',
      dynastyId: 'dyn-1',
      maxRangeLY: 8,
      effectiveVelocity: 0.12,
    });

    engine.initiateMission({
      missionId: 'm-1',
      vesselId: 'sv-1',
      originNodeId: 'n-earth',
      targetWorldId: 'w-frontier',
      distanceLY: 2,
      priority: 'standard',
    });

    advance(600_000_000_000_000);
    const transit = engine.evaluateTransit('m-1');
    expect(transit?.to).toBe('arrived');
    engine.beginBeaconDeployment('m-1');
    engine.completeMission('m-1', 'beacon-1');

    expect(engine.getMission('m-1').phase).toBe('completed');
    expect(engine.isWorldSurveyed('w-frontier')).toBe(true);
  });
});
