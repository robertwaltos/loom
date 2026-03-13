/**
 * survey-vessel.test.ts — Survey Corps fleet management tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSurveyVesselService,
  computeTransitHours,
  SURVEY_VESSEL_MIN_VELOCITY,
  SURVEY_VESSEL_MAX_VELOCITY,
  HOURS_PER_YEAR,
  FUSION_CHARGE_PER_LY,
  type SurveyVesselService,
  type GalacticCoordinate,
  type SurveyChronicleEntry,
} from '../survey-vessel.js';

// ── Helpers ───────────────────────────────────────────────────────────────

class TestClock {
  ms = 1_000_000;
  nowMs(): number { return this.ms; }
  advance(ms: number): void { this.ms += ms; }
}

class TestIdGen {
  n = 0;
  next(): string { return `sv-${++this.n}`; }
}

const HOME: GalacticCoordinate = { ra: 0, dec: 0, distanceLY: 0 };
const NEAR: GalacticCoordinate = { ra: 10, dec: 5, distanceLY: 3 };
const OUTER_ARC: GalacticCoordinate = { ra: 45, dec: 20, distanceLY: 310 };

function makeDeps(chronicle?: { emit: (e: SurveyChronicleEntry) => void }) {
  return {
    clock: new TestClock(),
    idGenerator: new TestIdGen(),
    chronicle,
  };
}

// ── computeTransitHours ───────────────────────────────────────────────────

describe('computeTransitHours', () => {
  it('matches bible formula: distanceLY / velocity * 8760', () => {
    expect(computeTransitHours(1, 0.10)).toBeCloseTo(HOURS_PER_YEAR / 0.10, 5);
    expect(computeTransitHours(5, 0.08)).toBeCloseTo(5 / 0.08 * HOURS_PER_YEAR, 5);
  });
});

// ── registerVessel ────────────────────────────────────────────────────────

describe('SurveyVesselService — registerVessel', () => {
  it('creates a vessel at full charge and DOCKED', () => {
    const svc = createSurveyVesselService(makeDeps());
    const vessel = svc.registerVessel({
      dynastyId: 'dynasty-1',
      vesselName: 'Vantage',
      vesselClass: 'SCOUT',
      bubbleCapacity: 100,
      initialPosition: HOME,
    });
    if (typeof vessel === 'string') throw new Error(vessel);
    expect(vessel.fusionCharge).toBe(1.0);
    expect(vessel.transitState).toBe('DOCKED');
  });

  it('clamps effectiveVelocity to bible range', () => {
    const svc = createSurveyVesselService(makeDeps());
    const tooSlow = svc.registerVessel({
      dynastyId: 'dy', vesselName: 'Tortoise', vesselClass: 'SCOUT',
      bubbleCapacity: 10, effectiveVelocity: 0.001, initialPosition: HOME,
    });
    const tooFast = svc.registerVessel({
      dynastyId: 'dy', vesselName: 'Rocket', vesselClass: 'SCOUT',
      bubbleCapacity: 10, effectiveVelocity: 0.9, initialPosition: HOME,
    });
    if (typeof tooSlow === 'string' || typeof tooFast === 'string') throw new Error('setup');
    expect(tooSlow.effectiveVelocity).toBe(SURVEY_VESSEL_MIN_VELOCITY);
    expect(tooFast.effectiveVelocity).toBe(SURVEY_VESSEL_MAX_VELOCITY);
  });

  it('rejects duplicate vesselId', () => {
    const svc = createSurveyVesselService(makeDeps());
    svc.registerVessel({ vesselId: 'dup', dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 10, initialPosition: HOME });
    const result = svc.registerVessel({ vesselId: 'dup', dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 10, initialPosition: HOME });
    expect(typeof result).toBe('string');
  });
});

// ── estimateTransit ───────────────────────────────────────────────────────

describe('SurveyVesselService — estimateTransit', () => {
  let svc: SurveyVesselService;
  let vesselId: string;

  beforeEach(() => {
    svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'Scout-1', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);
    vesselId = v.vesselId;
  });

  it('computes transit hours using bible formula', () => {
    const est = svc.estimateTransit(vesselId, NEAR);
    if (typeof est === 'string') throw new Error(est);
    expect(est.distanceLY).toBeCloseTo(3, 5);
    expect(est.transitHours).toBeGreaterThan(0);
    expect(est.isFeasible).toBe(true);
  });

  it('marks infeasible when charge is insufficient', () => {
    const drainedVessel = svc.registerVessel({
      dynastyId: 'dy', vesselName: 'Drained', vesselClass: 'SCOUT',
      bubbleCapacity: 10, initialPosition: HOME,
    });
    if (typeof drainedVessel === 'string') throw new Error(drainedVessel);

    // Drain the charge manually.
    drainedVessel.fusionCharge = 0.001;

    const far: GalacticCoordinate = { ra: 0, dec: 0, distanceLY: 8 };
    const est = svc.estimateTransit(drainedVessel.vesselId, far);
    if (typeof est === 'string') throw new Error(est);
    expect(est.isFeasible).toBe(false);
    expect(est.insufficientChargeBy).toBeGreaterThan(0);
  });

  it('returns error for unknown vessel', () => {
    const result = svc.estimateTransit('ghost', NEAR);
    expect(typeof result).toBe('string');
  });
});

// ── initiateTransit (chain-jump prevention) ───────────────────────────────

describe('SurveyVesselService — initiateTransit', () => {
  it('starts a transit and returns a record', () => {
    const svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    const transit = svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: NEAR });
    if (typeof transit === 'string') throw new Error(transit);
    expect(transit.transitState).toBe('IN_BUBBLE');
  });

  it('drains fusion charge on transit', () => {
    const svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    const chargeBefore = v.fusionCharge;
    svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: NEAR });
    expect(v.fusionCharge).toBeLessThan(chargeBefore);
  });

  it('BLOCKS chain-jump when vessel is IN_BUBBLE', () => {
    const svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: NEAR });
    const chainAttempt = svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: { ra: 30, dec: 15, distanceLY: 6 } });
    expect(typeof chainAttempt).toBe('string');
    expect(chainAttempt as string).toMatch(/chain-jump/i);
  });
});

// ── advanceTransit + survey marks ─────────────────────────────────────────

describe('SurveyVesselService — advanceTransit', () => {
  it('completes transit after enough time has elapsed', () => {
    const clock = new TestClock();
    const svc = createSurveyVesselService({ clock, idGenerator: new TestIdGen() });
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    const transit = svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: NEAR });
    if (typeof transit === 'string') throw new Error(transit);

    // Advance past estimated arrival.
    const duration = transit.estimatedArrivalMs - transit.departedAtMs;
    clock.advance(duration + 1);

    const result = svc.advanceTransit(transit.transitId);
    if (typeof result === 'string') throw new Error(result);
    expect(result.kind).toBe('ARRIVED');
  });

  it('vessel position updates on arrival', () => {
    const clock = new TestClock();
    const svc = createSurveyVesselService({ clock, idGenerator: new TestIdGen() });
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    const transit = svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: NEAR });
    if (typeof transit === 'string') throw new Error(transit);

    const duration = transit.estimatedArrivalMs - transit.departedAtMs;
    clock.advance(duration + 1);
    svc.advanceTransit(transit.transitId);

    expect(v.currentPosition.distanceLY).toBeCloseTo(NEAR.distanceLY, 5);
  });

  it('awards SurveyMark when arriving at outer arc coordinates', () => {
    const entries: SurveyChronicleEntry[] = [];
    const clock = new TestClock();
    const svc = createSurveyVesselService({ clock, idGenerator: new TestIdGen(), chronicle: { emit: (e) => entries.push(e) } });
    const v = svc.registerVessel({ dynastyId: 'dynasty-x', vesselName: 'Frontier', vesselClass: 'DEEP_RANGE', bubbleCapacity: 200, initialPosition: { ra: 0, dec: 0, distanceLY: 305 } });
    if (typeof v === 'string') throw new Error(v);

    const transit = svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: OUTER_ARC });
    if (typeof transit === 'string') throw new Error(transit);

    const duration = transit.estimatedArrivalMs - transit.departedAtMs;
    clock.advance(duration + 1);
    const result = svc.advanceTransit(transit.transitId);
    if (typeof result === 'string') throw new Error(result);

    expect(result.kind).toBe('ARRIVED');
    if (result.kind === 'ARRIVED') {
      expect(result.surveyMark).toBeDefined();
      expect(result.surveyMark?.isOuterArc).toBe(true);
    }

    // Chronicle must record the mark.
    const markEntries = entries.filter(e => e.entryType === 'SURVEY_MARK_AWARDED');
    expect(markEntries.length).toBe(1);
  });
});

// ── refuelVessel ──────────────────────────────────────────────────────────

describe('SurveyVesselService — refuelVessel', () => {
  it('restores fusion charge when vessel is DOCKED', () => {
    const svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    v.fusionCharge = 0.3;
    const result = svc.refuelVessel(v.vesselId, 0.5);
    if (typeof result === 'string') throw new Error(result);
    expect(result.fusionCharge).toBeCloseTo(0.8, 5);
  });

  it('caps fusion charge at 1.0', () => {
    const svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    const result = svc.refuelVessel(v.vesselId, 5.0);
    if (typeof result === 'string') throw new Error(result);
    expect(result.fusionCharge).toBe(1.0);
  });

  it('rejects refuel when vessel is in transit', () => {
    const svc = createSurveyVesselService(makeDeps());
    const v = svc.registerVessel({ dynastyId: 'dy', vesselName: 'V', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    if (typeof v === 'string') throw new Error(v);

    svc.initiateTransit({ vesselId: v.vesselId, destinationCoord: NEAR });
    const result = svc.refuelVessel(v.vesselId, 1.0);
    expect(typeof result).toBe('string');
  });
});

// ── getFleetStats ─────────────────────────────────────────────────────────

describe('SurveyVesselService — getFleetStats', () => {
  it('tracks vessel and mark counts', () => {
    const svc = createSurveyVesselService(makeDeps());
    svc.registerVessel({ dynastyId: 'dy', vesselName: 'A', vesselClass: 'SCOUT', bubbleCapacity: 50, initialPosition: HOME });
    svc.registerVessel({ dynastyId: 'dy', vesselName: 'B', vesselClass: 'EXPLORER', bubbleCapacity: 100, initialPosition: HOME });

    const stats = svc.getFleetStats();
    expect(stats.totalVessels).toBe(2);
    expect(stats.dockedVessels).toBe(2);
  });
});
