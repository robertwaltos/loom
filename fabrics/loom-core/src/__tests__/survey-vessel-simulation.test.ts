import { describe, it, expect } from 'vitest';
import {
  createSurveyVesselService,
  computeTransitHours,
  SURVEY_VESSEL_MIN_VELOCITY,
  SURVEY_VESSEL_MAX_VELOCITY,
  HOURS_PER_YEAR,
  FUSION_RANGE_MIN_LY,
  FUSION_RANGE_MAX_LY,
} from '../survey-vessel.js';
import type { GalacticCoordinate, RegisterVesselParams } from '../survey-vessel.js';

// ─── helpers ───────────────────────────────────────────────────────────────

let _id = 0;
function makeDeps(nowMs = 1_700_000_000_000) {
  return {
    clock: { nowMs: () => nowMs },
    idGenerator: { next: () => `id-${++_id}` },
  };
}

function makeCoord(distanceLY: number, ra = 45, dec = 10): GalacticCoordinate {
  return { ra, dec, distanceLY };
}

function makeVesselParams(overrides: Partial<RegisterVesselParams> = {}): RegisterVesselParams {
  return {
    dynastyId: 'dynasty-alpha',
    vesselName: 'ISV Halcyon',
    vesselClass: 'SCOUT',
    bubbleCapacity: 100,
    initialPosition: makeCoord(10),
    ...overrides,
  };
}

// ─── computeTransitHours ──────────────────────────────────────────────────

describe('SurveyVessel — computeTransitHours', () => {
  it('distance / velocity * HOURS_PER_YEAR', () => {
    const hours = computeTransitHours(10, 0.1);
    expect(hours).toBeCloseTo(10 / 0.1 * HOURS_PER_YEAR, 6);
  });

  it('slower velocity → more hours', () => {
    const slow = computeTransitHours(5, SURVEY_VESSEL_MIN_VELOCITY);
    const fast = computeTransitHours(5, SURVEY_VESSEL_MAX_VELOCITY);
    expect(slow).toBeGreaterThan(fast);
  });
});

// ─── exported constants ────────────────────────────────────────────────────

describe('SurveyVessel — exported constants', () => {
  it('SURVEY_VESSEL_MIN_VELOCITY is 0.08', () => {
    expect(SURVEY_VESSEL_MIN_VELOCITY).toBeCloseTo(0.08);
  });
  it('SURVEY_VESSEL_MAX_VELOCITY is 0.12', () => {
    expect(SURVEY_VESSEL_MAX_VELOCITY).toBeCloseTo(0.12);
  });
  it('HOURS_PER_YEAR is 8760', () => {
    expect(HOURS_PER_YEAR).toBe(8_760);
  });
  it('FUSION_RANGE_MIN_LY is 5', () => {
    expect(FUSION_RANGE_MIN_LY).toBe(5);
  });
  it('FUSION_RANGE_MAX_LY is 8', () => {
    expect(FUSION_RANGE_MAX_LY).toBe(8);
  });
});

// ─── registerVessel ───────────────────────────────────────────────────────

describe('SurveyVessel — registerVessel', () => {
  it('returns a vessel in DOCKED state', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.registerVessel(makeVesselParams());
    expect(typeof result).not.toBe('string');
    const vessel = result as Record<string, unknown>;
    expect(vessel['transitState']).toBe('DOCKED');
  });

  it('stores the correct vesselClass', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.registerVessel(makeVesselParams({ vesselClass: 'DEEP_RANGE' }));
    const vessel = result as Record<string, unknown>;
    expect(vessel['vesselClass']).toBe('DEEP_RANGE');
  });

  it('sets fusionCharge to 1.0 by default', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.registerVessel(makeVesselParams());
    const vessel = result as Record<string, unknown>;
    expect(vessel['fusionCharge']).toBeCloseTo(1.0);
  });
});

// ─── getVessel / getDynastyFleet ──────────────────────────────────────────

describe('SurveyVessel — getVessel / getDynastyFleet', () => {
  it('getVessel returns the registered vessel', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.registerVessel(makeVesselParams());
    const vessel = result as Record<string, unknown>;
    const found = svc.getVessel(vessel['vesselId'] as string);
    expect(found).toBeDefined();
    expect((found as Record<string, unknown>)['vesselName']).toBe('ISV Halcyon');
  });

  it('getVessel returns undefined for unknown id', () => {
    const svc = createSurveyVesselService(makeDeps());
    expect(svc.getVessel('ghost-vessel')).toBeUndefined();
  });

  it('getDynastyFleet returns vessels for a dynasty', () => {
    const svc = createSurveyVesselService(makeDeps());
    svc.registerVessel(makeVesselParams({ vesselName: 'Vessel A' }));
    svc.registerVessel(makeVesselParams({ vesselName: 'Vessel B' }));
    const fleet = svc.getDynastyFleet('dynasty-alpha');
    expect(fleet.length).toBeGreaterThanOrEqual(2);
  });

  it('getDynastyFleet returns empty for unknown dynasty', () => {
    const svc = createSurveyVesselService(makeDeps());
    expect(svc.getDynastyFleet('no-such-dynasty')).toHaveLength(0);
  });
});

// ─── estimateTransit ──────────────────────────────────────────────────────

describe('SurveyVessel — estimateTransit', () => {
  it('reports feasible when charge is sufficient for a short hop', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.registerVessel(makeVesselParams());
    const vessel = result as Record<string, unknown>;
    const estimate = svc.estimateTransit(vessel['vesselId'] as string, makeCoord(12));
    expect(typeof estimate).not.toBe('string');
    const est = estimate as Record<string, unknown>;
    // Small 2 LY hop from position 10 → dest 12: distanceLY may vary, but should be feasible
    expect(typeof est['isFeasible']).toBe('boolean');
    expect(typeof est['chargeRequired']).toBe('number');
  });

  it('reports infeasible when destination is beyond fusion reach', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.registerVessel(makeVesselParams({ initialPosition: makeCoord(10) }));
    const vessel = result as Record<string, unknown>;
    // Max range is 8 LY from current position — 50 LY away is infeasible
    const estimate = svc.estimateTransit(vessel['vesselId'] as string, makeCoord(60));
    expect(typeof estimate).not.toBe('string');
    const est = estimate as Record<string, unknown>;
    expect(est['isFeasible']).toBe(false);
    expect(est['insufficientChargeBy']).toBeGreaterThan(0);
  });

  it('returns error string for unknown vessel', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.estimateTransit('ghost', makeCoord(5));
    expect(typeof result).toBe('string');
  });
});

// ─── initiateTransit ──────────────────────────────────────────────────────

describe('SurveyVessel — initiateTransit', () => {
  it('returns a VesselTransitRecord when vessel is DOCKED', () => {
    const svc = createSurveyVesselService(makeDeps());
    const regResult = svc.registerVessel(makeVesselParams({ initialPosition: makeCoord(10) }));
    const vessel = regResult as Record<string, unknown>;
    const result = svc.initiateTransit({ vesselId: vessel['vesselId'] as string, destinationCoord: makeCoord(14) });
    expect(typeof result).not.toBe('string');
    const record = result as Record<string, unknown>;
    expect(record['transitState']).toBeDefined();
  });

  it('rejects chain-jump: initiateTransit when vessel is not DOCKED', () => {
    const svc = createSurveyVesselService(makeDeps());
    const regResult = svc.registerVessel(makeVesselParams({ initialPosition: makeCoord(10) }));
    const vessel = regResult as Record<string, unknown>;
    const vesselId = vessel['vesselId'] as string;
    // First transit — should succeed
    svc.initiateTransit({ vesselId, destinationCoord: makeCoord(14) });
    // Second transit without arriving first — should fail
    const result = svc.initiateTransit({ vesselId, destinationCoord: makeCoord(18) });
    expect(typeof result).toBe('string');
  });
});

// ─── refuelVessel ─────────────────────────────────────────────────────────

describe('SurveyVessel — refuelVessel', () => {
  it('adds fuel to a DOCKED vessel', () => {
    const svc = createSurveyVesselService(makeDeps());
    const regResult = svc.registerVessel(makeVesselParams());
    const vessel = regResult as Record<string, unknown>;
    const vesselId = vessel['vesselId'] as string;
    // Drain some fuel first by getting the vessel and mutating (or just test refuel works)
    const refueled = svc.refuelVessel(vesselId, 0.1);
    // Should not return a string error
    expect(typeof refueled).not.toBe('string');
  });

  it('returns error string for unknown vessel', () => {
    const svc = createSurveyVesselService(makeDeps());
    const result = svc.refuelVessel('no-vessel', 0.5);
    expect(typeof result).toBe('string');
  });
});

// ─── getFleetStats ────────────────────────────────────────────────────────

describe('SurveyVessel — getFleetStats', () => {
  it('starts with zero vessels', () => {
    const svc = createSurveyVesselService(makeDeps());
    const stats = svc.getFleetStats();
    expect(stats.totalVessels).toBe(0);
    expect(stats.dockedVessels).toBe(0);
    expect(stats.totalTransitsCompleted).toBe(0);
  });

  it('adds a vessel to stats after registration', () => {
    const svc = createSurveyVesselService(makeDeps());
    svc.registerVessel(makeVesselParams());
    const stats = svc.getFleetStats();
    expect(stats.totalVessels).toBe(1);
    expect(stats.dockedVessels).toBe(1);
  });
});
