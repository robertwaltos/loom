/**
 * sealed-chambers.test.ts — Tests for the Seven Sealed Chambers system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSealedChambersService,
  CHAMBER_ONE_MIN_SURVEY_WORLDS,
  CHAMBER_THREE_CHRONICLE_TARGET,
  CHAMBER_FIVE_OUTER_ARC_LY,
  CHAMBER_SIX_KALON_ANOMALY_COUNT,
  CHAMBER_SEVEN_UNLOCK_YEAR,
  type SealedChambersService,
  type ChamberChronicleEntry,
  type ChamberConditionEvaluator,
} from '../sealed-chambers.js';

// ── Helpers ───────────────────────────────────────────────────────────────

class TestClock {
  ms = 5_000_000;
  nowMs(): number { return this.ms; }
  advance(n: number): void { this.ms += n; }
}

function makeEvaluator(overrides?: Partial<{
  surveyCount: number;
  assembly247: boolean;
  world412Count: number;
  world499Lifted: boolean;
  maxArcLY: number;
  kalonAnomalies: number;
  ingameYear: number;
}>): ChamberConditionEvaluator {
  return {
    getDynastySurveyWorldCount: () => overrides?.surveyCount ?? 0,
    hasAssemblyDeclassifiedWorld247: () => overrides?.assembly247 ?? false,
    getWorld412ChronicleCount: () => overrides?.world412Count ?? 0,
    isWorld499QuarantineLifted: () => overrides?.world499Lifted ?? false,
    getMaxDynastyArcDistanceLY: () => overrides?.maxArcLY ?? 0,
    getKalonAuditAnomalyCount: () => overrides?.kalonAnomalies ?? 0,
    getCurrentIngameYear: () => overrides?.ingameYear ?? 1,
  };
}

function makeDeps(chronicle?: { emit: (e: ChamberChronicleEntry) => void }) {
  return { clock: new TestClock(), chronicle };
}

// ── Initial state ─────────────────────────────────────────────────────────

describe('SealedChambersService — initial state', () => {
  it('initialises with all 7 chambers LOCKED', () => {
    const svc = createSealedChambersService(makeDeps());
    const all = svc.getAllChambers();
    expect(all.length).toBe(7);
    for (const c of all) {
      expect(c.status).toBe('LOCKED');
    }
  });

  it('getUnlockSummary starts at 0/7', () => {
    const svc = createSealedChambersService(makeDeps());
    const summary = svc.getUnlockSummary();
    expect(summary.unlockedCount).toBe(0);
    expect(summary.lockedCount).toBe(7);
    expect(summary.allUnlocked).toBe(false);
  });
});

// ── evaluateConditions ────────────────────────────────────────────────────

describe('SealedChambersService — evaluateConditions', () => {
  let svc: SealedChambersService;

  beforeEach(() => {
    svc = createSealedChambersService(makeDeps());
  });

  it('Chamber One triggers when dynasty surveys ≥50 worlds with Lattice data', () => {
    const newlyMet = svc.evaluateConditions(
      makeEvaluator({ surveyCount: CHAMBER_ONE_MIN_SURVEY_WORLDS }),
      'dynasty-007',
    );
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_ONE_KWAME_FILES')).toBe(true);
  });

  it('Chamber One does not trigger without dynastyId', () => {
    const newlyMet = svc.evaluateConditions(
      makeEvaluator({ surveyCount: 999 }),
      // No dynastyId passed.
    );
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_ONE_KWAME_FILES')).toBe(false);
  });

  it('Chamber Two triggers on Assembly World-247 declassification', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ assembly247: true }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_TWO_ORDINANCE_7')).toBe(true);
  });

  it('Chamber Three triggers on 10,000 Chronicle entries for World-412', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ world412Count: CHAMBER_THREE_CHRONICLE_TARGET }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_THREE_WORLD_412')).toBe(true);
  });

  it('Chamber Three does not trigger below 10,000 entries', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ world412Count: 9_999 }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_THREE_WORLD_412')).toBe(false);
  });

  it('Chamber Four triggers when World-499 quarantine is lifted', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ world499Lifted: true }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_FOUR_FERREIRA_ASANTE')).toBe(true);
  });

  it('Chamber Five triggers when any dynasty reaches outer arc', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ maxArcLY: CHAMBER_FIVE_OUTER_ARC_LY }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_FIVE_SUNDARAM_CHEN')).toBe(true);
  });

  it('Chamber Five does not trigger below outer arc threshold', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ maxArcLY: CHAMBER_FIVE_OUTER_ARC_LY - 1 }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_FIVE_SUNDARAM_CHEN')).toBe(false);
  });

  it('Chamber Six triggers on ≥3 correlated KALON audit anomalies', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ kalonAnomalies: CHAMBER_SIX_KALON_ANOMALY_COUNT }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_SIX_DAGNA_REPORTS')).toBe(true);
  });

  it('Chamber Seven triggers at in-game year 105', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ ingameYear: CHAMBER_SEVEN_UNLOCK_YEAR }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_SEVEN_ARCHITECT')).toBe(true);
  });

  it('Chamber Seven does not trigger at year 104', () => {
    const newlyMet = svc.evaluateConditions(makeEvaluator({ ingameYear: CHAMBER_SEVEN_UNLOCK_YEAR - 1 }));
    expect(newlyMet.some(c => c.chamberId === 'CHAMBER_SEVEN_ARCHITECT')).toBe(false);
  });

  it('does not re-trigger a chamber already in CONDITION_MET', () => {
    svc.evaluateConditions(makeEvaluator({ assembly247: true }));
    const second = svc.evaluateConditions(makeEvaluator({ assembly247: true }));
    expect(second.some(c => c.chamberId === 'CHAMBER_TWO_ORDINANCE_7')).toBe(false);
  });
});

// ── unlockChamber ─────────────────────────────────────────────────────────

describe('SealedChambersService — unlockChamber', () => {
  it('unlocks a chamber that is in CONDITION_MET', () => {
    const entries: ChamberChronicleEntry[] = [];
    const svc = createSealedChambersService(makeDeps({ emit: (e) => entries.push(e) }));

    svc.evaluateConditions(makeEvaluator({ assembly247: true }));
    const result = svc.unlockChamber('CHAMBER_TWO_ORDINANCE_7');

    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error(result);
    expect(result.status).toBe('UNLOCKED');
    expect(result.unlockedAtMs).toBeDefined();
  });

  it('emits Chronicle entry on unlock', () => {
    const entries: ChamberChronicleEntry[] = [];
    const svc = createSealedChambersService(makeDeps({ emit: (e) => entries.push(e) }));

    svc.evaluateConditions(makeEvaluator({ world499Lifted: true }));
    svc.unlockChamber('CHAMBER_FOUR_FERREIRA_ASANTE');

    expect(entries.length).toBe(1);
    expect(entries[0].entryType).toBe('SEALED_CHAMBER_UNLOCKED');
    expect(entries[0].chamberId).toBe('CHAMBER_FOUR_FERREIRA_ASANTE');
    expect(entries[0].characterName).toBe('Ferreira-Asante');
  });

  it('rejects unlocking a LOCKED chamber (condition not met)', () => {
    const svc = createSealedChambersService(makeDeps());
    const result = svc.unlockChamber('CHAMBER_ONE_KWAME_FILES');
    expect(typeof result).toBe('string');
  });

  it('rejects double-unlocking', () => {
    const svc = createSealedChambersService(makeDeps());
    svc.evaluateConditions(makeEvaluator({ assembly247: true }));
    svc.unlockChamber('CHAMBER_TWO_ORDINANCE_7');
    const result = svc.unlockChamber('CHAMBER_TWO_ORDINANCE_7');
    expect(typeof result).toBe('string');
  });

  it('rejects unknown chamberId', () => {
    const svc = createSealedChambersService(makeDeps());
    const result = svc.unlockChamber('DOES_NOT_EXIST' as never);
    expect(typeof result).toBe('string');
  });
});

// ── getUnlockSummary ──────────────────────────────────────────────────────

describe('SealedChambersService — getUnlockSummary', () => {
  it('allUnlocked only when all 7 are UNLOCKED', () => {
    const svc = createSealedChambersService(makeDeps());
    const allConditions = makeEvaluator({
      surveyCount: 50,
      assembly247: true,
      world412Count: 10_000,
      world499Lifted: true,
      maxArcLY: 280,
      kalonAnomalies: 3,
      ingameYear: 105,
    });

    svc.evaluateConditions(allConditions, 'dynasty-1');
    for (const c of svc.getAllChambers()) {
      svc.unlockChamber(c.chamberId);
    }

    const summary = svc.getUnlockSummary();
    expect(summary.allUnlocked).toBe(true);
    expect(summary.unlockedCount).toBe(7);
  });
});
