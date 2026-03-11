import { describe, it, expect } from 'vitest';
import {
  createSurveyMissionEngine,
  calculateTransitDurationUs,
  SURVEY_CONSTANTS,
} from '../survey-mission.js';
import type { RegisterVesselParams, InitiateMissionParams } from '../survey-mission.js';

const US_PER_HOUR = 3_600_000_000;
const US_PER_DAY = 24 * US_PER_HOUR;
const HOURS_PER_YEAR = 8_760;

function createTestClock(initialDays = 0) {
  let time = initialDays * US_PER_DAY;
  return {
    nowMicroseconds: () => time,
    advanceDays(days: number) {
      time += days * US_PER_DAY;
    },
    advanceHours(hours: number) {
      time += hours * US_PER_HOUR;
    },
    advanceYears(years: number) {
      time += years * HOURS_PER_YEAR * US_PER_HOUR;
    },
  };
}

function createTestEngine(initialDays = 0) {
  const clock = createTestClock(initialDays);
  const engine = createSurveyMissionEngine({ clock });
  return { engine, clock };
}

function defaultVesselParams(overrides?: Partial<RegisterVesselParams>): RegisterVesselParams {
  return {
    vesselId: 'sv-001',
    dynastyId: 'house-atreides',
    maxRangeLY: 6,
    effectiveVelocity: 0.1,
    ...overrides,
  };
}

function defaultMissionParams(overrides?: Partial<InitiateMissionParams>): InitiateMissionParams {
  return {
    missionId: 'mission-001',
    vesselId: 'sv-001',
    originNodeId: 'node-earth',
    targetWorldId: 'world-kepler-442b',
    distanceLY: 3,
    priority: 'standard',
    ...overrides,
  };
}

// ─── Vessel Registration ────────────────────────────────────────────

describe('SurveyMissionEngine vessel registration', () => {
  it('registers a vessel with full fuel', () => {
    const { engine } = createTestEngine();
    const vessel = engine.registerVessel(defaultVesselParams());
    expect(vessel.vesselId).toBe('sv-001');
    expect(vessel.dynastyId).toBe('house-atreides');
    expect(vessel.fusionCharge).toBe(1.0);
    expect(vessel.maxRangeLY).toBe(6);
    expect(vessel.effectiveVelocity).toBe(0.1);
    expect(vessel.status).toBe('docked');
  });

  it('rejects duplicate vessel registration', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    expect(() => engine.registerVessel(defaultVesselParams())).toThrow('already exists');
  });

  it('throws for unknown vessel on get', () => {
    const { engine } = createTestEngine();
    expect(() => engine.getVessel('nonexistent')).toThrow('not found');
  });

  it('returns undefined for unknown vessel on tryGet', () => {
    const { engine } = createTestEngine();
    expect(engine.tryGetVessel('nonexistent')).toBeUndefined();
  });

  it('counts vessels', () => {
    const { engine } = createTestEngine();
    expect(engine.vesselCount()).toBe(0);
    engine.registerVessel(defaultVesselParams());
    expect(engine.vesselCount()).toBe(1);
  });
});

// ─── Vessel Refuelling ──────────────────────────────────────────────

describe('SurveyMissionEngine vessel refuelling', () => {
  it('refuels a docked vessel to full charge', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());

    // Deploy then complete a mission to use fuel
    engine.initiateMission(defaultMissionParams());
    clock.advanceYears(50);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-001');

    const before = engine.getVessel('sv-001');
    expect(before.fusionCharge).toBe(0.5);

    const after = engine.refuelVessel('sv-001');
    expect(after.fusionCharge).toBe(1.0);
  });

  it('rejects refuelling a deployed vessel', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    expect(() => engine.refuelVessel('sv-001')).toThrow('not docked');
  });
});

// ─── Mission Initiation ─────────────────────────────────────────────

describe('SurveyMissionEngine mission initiation', () => {
  it('initiates a mission and deploys vessel', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    const mission = engine.initiateMission(defaultMissionParams());

    expect(mission.missionId).toBe('mission-001');
    expect(mission.dynastyId).toBe('house-atreides');
    expect(mission.vesselId).toBe('sv-001');
    expect(mission.phase).toBe('in_transit');
    expect(mission.distanceLY).toBe(3);
    expect(mission.departedAt).not.toBeNull();
    expect(mission.estimatedTransitUs).toBeGreaterThan(0);
  });

  it('consumes fuel on initiation (distanceLY / maxRangeLY)', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams({ maxRangeLY: 6 }));
    engine.initiateMission(defaultMissionParams({ distanceLY: 3 }));
    const vessel = engine.getVessel('sv-001');
    expect(vessel.fusionCharge).toBe(0.5);
    expect(vessel.status).toBe('deployed');
  });

  it('rejects mission with priority none', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    expect(() =>
      engine.initiateMission(
        defaultMissionParams({
          priority: 'none',
        }),
      ),
    ).toThrow('priority');
  });

  it('rejects mission when vessel is not docked', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    expect(() =>
      engine.initiateMission(
        defaultMissionParams({
          missionId: 'mission-002',
          targetWorldId: 'world-other',
        }),
      ),
    ).toThrow('not docked');
  });
});

describe('SurveyMissionEngine mission rejections', () => {
  it('rejects mission when fuel is insufficient', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams({ maxRangeLY: 6 }));
    engine.initiateMission(defaultMissionParams({ distanceLY: 5 }));
    clock.advanceYears(100);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-001');

    expect(() =>
      engine.initiateMission(
        defaultMissionParams({
          missionId: 'mission-002',
          targetWorldId: 'world-other',
          distanceLY: 3,
        }),
      ),
    ).toThrow('insufficient fuel');
  });

  it('rejects mission to already-surveyed world', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    clock.advanceYears(50);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-001');
    engine.refuelVessel('sv-001');

    expect(() =>
      engine.initiateMission(
        defaultMissionParams({
          missionId: 'mission-002',
          targetWorldId: 'world-kepler-442b',
        }),
      ),
    ).toThrow('already been surveyed');
  });
});

// ─── Transit Evaluation ─────────────────────────────────────────────

describe('SurveyMissionEngine transit evaluation', () => {
  it('returns null when transit is not complete', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 1 }));
    clock.advanceDays(1);
    const result = engine.evaluateTransit('mission-001');
    expect(result).toBeNull();
  });

  it('transitions to arrived when transit time elapsed', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams({ effectiveVelocity: 0.1 }));
    engine.initiateMission(defaultMissionParams({ distanceLY: 1 }));

    // 1 LY at 0.1c = 10 years
    clock.advanceYears(11);
    const result = engine.evaluateTransit('mission-001');
    expect(result).not.toBeNull();
    expect(result?.from).toBe('in_transit');
    expect(result?.to).toBe('arrived');
  });

  it('returns null for non-transit missions', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    // Now in 'arrived' phase
    const secondEval = engine.evaluateTransit('mission-001');
    expect(secondEval).toBeNull();
  });

  it('sets arrivedAt timestamp', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    const mission = engine.getMission('mission-001');
    expect(mission.arrivedAt).not.toBeNull();
  });
});

// ─── Transit Duration Calculation ───────────────────────────────────

describe('calculateTransitDurationUs', () => {
  it('calculates correct transit time (1 LY at 0.1c = 10 years)', () => {
    const duration = calculateTransitDurationUs(1, 0.1);
    const expectedHours = 10 * HOURS_PER_YEAR;
    expect(duration).toBe(expectedHours * US_PER_HOUR);
  });

  it('scales linearly with distance', () => {
    const d1 = calculateTransitDurationUs(1, 0.1);
    const d5 = calculateTransitDurationUs(5, 0.1);
    expect(d5).toBe(d1 * 5);
  });

  it('inversely proportional to velocity', () => {
    const fast = calculateTransitDurationUs(1, 0.12);
    const slow = calculateTransitDurationUs(1, 0.08);
    expect(slow).toBeGreaterThan(fast);
  });
});

// ─── Beacon Deployment & Completion ─────────────────────────────────

describe('SurveyMissionEngine beacon deployment', () => {
  it('transitions arrived → deploying', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    const transition = engine.beginBeaconDeployment('mission-001');
    expect(transition.from).toBe('arrived');
    expect(transition.to).toBe('deploying');
  });

  it('rejects deployment from wrong phase', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    expect(() => engine.beginBeaconDeployment('mission-001')).toThrow('in_transit');
  });

  it('completes mission with beacon id', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    const transition = engine.completeMission('mission-001', 'beacon-alpha');
    expect(transition.from).toBe('deploying');
    expect(transition.to).toBe('completed');
    expect(transition.reason).toContain('beacon-alpha');
  });
});

describe('SurveyMissionEngine mission completion effects', () => {
  it('records deployed beacon id on mission', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-alpha');
    const mission = engine.getMission('mission-001');
    expect(mission.deployedBeaconId).toBe('beacon-alpha');
    expect(mission.completedAt).not.toBeNull();
  });

  it('marks world as surveyed on completion', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    expect(engine.isWorldSurveyed('world-kepler-442b')).toBe(false);
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-alpha');
    expect(engine.isWorldSurveyed('world-kepler-442b')).toBe(true);
    expect(engine.surveyedWorldCount()).toBe(1);
  });

  it('returns vessel to docked on completion', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-alpha');
    const vessel = engine.getVessel('sv-001');
    expect(vessel.status).toBe('docked');
  });
});

// ─── Mission Abort ──────────────────────────────────────────────────

describe('SurveyMissionEngine mission abort', () => {
  it('aborts an in-transit mission', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    const transition = engine.abortMission('mission-001', 'fuel emergency');
    expect(transition.from).toBe('in_transit');
    expect(transition.to).toBe('aborted');
    expect(transition.reason).toContain('fuel emergency');
  });

  it('aborts a deploying mission', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    const transition = engine.abortMission('mission-001', 'beacon failure');
    expect(transition.to).toBe('aborted');
  });

  it('returns vessel to docked on abort', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    engine.abortMission('mission-001', 'recall');
    expect(engine.getVessel('sv-001').status).toBe('docked');
  });

  it('rejects abort of completed mission', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams({ distanceLY: 0.1 }));
    clock.advanceYears(5);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-alpha');
    expect(() => engine.abortMission('mission-001', 'too late')).toThrow('completed');
  });

  it('rejects abort of already aborted mission', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.initiateMission(defaultMissionParams());
    engine.abortMission('mission-001', 'first abort');
    expect(() => engine.abortMission('mission-001', 'second abort')).toThrow('aborted');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('SurveyMissionEngine queries', () => {
  it('lists missions by dynasty', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.registerVessel(
      defaultVesselParams({
        vesselId: 'sv-002',
        dynastyId: 'house-harkonnen',
      }),
    );

    engine.initiateMission(defaultMissionParams());
    engine.initiateMission(
      defaultMissionParams({
        missionId: 'mission-002',
        vesselId: 'sv-002',
        targetWorldId: 'world-other',
      }),
    );

    const atreides = engine.listByDynasty('house-atreides');
    const harkonnen = engine.listByDynasty('house-harkonnen');
    expect(atreides).toHaveLength(1);
    expect(harkonnen).toHaveLength(1);
  });

  it('lists missions by phase', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    engine.registerVessel(
      defaultVesselParams({
        vesselId: 'sv-002',
        dynastyId: 'house-harkonnen',
      }),
    );
    engine.initiateMission(defaultMissionParams());
    engine.initiateMission(
      defaultMissionParams({
        missionId: 'mission-002',
        vesselId: 'sv-002',
        targetWorldId: 'world-other',
      }),
    );

    const inTransit = engine.listByPhase('in_transit');
    expect(inTransit).toHaveLength(2);
  });

  it('counts missions', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    expect(engine.missionCount()).toBe(0);
    engine.initiateMission(defaultMissionParams());
    expect(engine.missionCount()).toBe(1);
  });

  it('throws for unknown mission on get', () => {
    const { engine } = createTestEngine();
    expect(() => engine.getMission('nope')).toThrow('not found');
  });

  it('returns undefined for unknown mission on tryGet', () => {
    const { engine } = createTestEngine();
    expect(engine.tryGetMission('nope')).toBeUndefined();
  });
});

// ─── Full Mission Lifecycle ─────────────────────────────────────────

describe('SurveyMissionEngine full lifecycle', () => {
  it('completes prepare → transit → arrive → deploy → complete', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams({ effectiveVelocity: 0.1 }));

    // 1. Initiate (immediately enters in_transit)
    const mission = engine.initiateMission(
      defaultMissionParams({
        distanceLY: 0.5,
      }),
    );
    expect(mission.phase).toBe('in_transit');

    // 2. Transit (0.5 LY at 0.1c = 5 years)
    clock.advanceYears(3);
    expect(engine.evaluateTransit('mission-001')).toBeNull();
    clock.advanceYears(3);
    const arrival = engine.evaluateTransit('mission-001');
    expect(arrival?.to).toBe('arrived');

    // 3. Begin deployment
    const deploy = engine.beginBeaconDeployment('mission-001');
    expect(deploy.to).toBe('deploying');

    // 4. Complete with beacon
    const complete = engine.completeMission('mission-001', 'beacon-kepler');
    expect(complete.to).toBe('completed');

    // Verify final state
    const final = engine.getMission('mission-001');
    expect(final.phase).toBe('completed');
    expect(final.deployedBeaconId).toBe('beacon-kepler');
    expect(final.completedAt).not.toBeNull();
    expect(engine.isWorldSurveyed('world-kepler-442b')).toBe(true);
    expect(engine.getVessel('sv-001').status).toBe('docked');
  });

  it('supports sequential missions after refuelling', () => {
    const { engine, clock } = createTestEngine();
    engine.registerVessel(defaultVesselParams({ maxRangeLY: 6 }));

    // First mission: 2 LY trip
    engine.initiateMission(defaultMissionParams({ distanceLY: 2 }));
    clock.advanceYears(25);
    engine.evaluateTransit('mission-001');
    engine.beginBeaconDeployment('mission-001');
    engine.completeMission('mission-001', 'beacon-001');
    expect(engine.getVessel('sv-001').fusionCharge).toBeCloseTo(0.667, 2);

    // Refuel
    engine.refuelVessel('sv-001');
    expect(engine.getVessel('sv-001').fusionCharge).toBe(1.0);

    // Second mission: 4 LY trip
    engine.initiateMission(
      defaultMissionParams({
        missionId: 'mission-002',
        targetWorldId: 'world-second',
        distanceLY: 4,
      }),
    );
    clock.advanceYears(50);
    engine.evaluateTransit('mission-002');
    engine.beginBeaconDeployment('mission-002');
    engine.completeMission('mission-002', 'beacon-002');

    expect(engine.surveyedWorldCount()).toBe(2);
    expect(engine.isWorldSurveyed('world-kepler-442b')).toBe(true);
    expect(engine.isWorldSurveyed('world-second')).toBe(true);
  });

  it('survey constants match Bible v1.1 ranges', () => {
    expect(SURVEY_CONSTANTS.minEffectiveVelocity).toBe(0.08);
    expect(SURVEY_CONSTANTS.maxEffectiveVelocity).toBe(0.12);
    expect(SURVEY_CONSTANTS.minRangeLY).toBe(5);
    expect(SURVEY_CONSTANTS.maxRangeLY).toBe(8);
  });
});

// ─── Priority Enforcement ───────────────────────────────────────────

describe('SurveyMissionEngine priority enforcement', () => {
  it('allows standard priority missions', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    const mission = engine.initiateMission(
      defaultMissionParams({
        priority: 'standard',
      }),
    );
    expect(mission.priority).toBe('standard');
  });

  it('allows priority missions', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    const mission = engine.initiateMission(
      defaultMissionParams({
        priority: 'priority',
      }),
    );
    expect(mission.priority).toBe('priority');
  });

  it('allows priority_with_observer missions', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    const mission = engine.initiateMission(
      defaultMissionParams({
        priority: 'priority_with_observer',
      }),
    );
    expect(mission.priority).toBe('priority_with_observer');
  });

  it('rejects none priority missions', () => {
    const { engine } = createTestEngine();
    engine.registerVessel(defaultVesselParams());
    expect(() =>
      engine.initiateMission(
        defaultMissionParams({
          priority: 'none',
        }),
      ),
    ).toThrow('priority');
  });
});
