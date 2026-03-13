import { describe, it, expect, vi } from 'vitest';
import {
  createSealedChambersService,
  CHAMBER_ONE_MIN_SURVEY_WORLDS,
  CHAMBER_THREE_CHRONICLE_TARGET,
  CHAMBER_FIVE_OUTER_ARC_LY,
  CHAMBER_SIX_KALON_ANOMALY_COUNT,
  CHAMBER_SEVEN_UNLOCK_YEAR,
} from '../sealed-chambers.js';
import type { ChamberConditionEvaluator } from '../sealed-chambers.js';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeDeps(nowMs = 1_700_000_000_000) {
  return { clock: { nowMs: () => nowMs } };
}

/** Evaluator that fails every condition (all locked). */
function makeNoopEvaluator(overrides: Partial<ChamberConditionEvaluator> = {}): ChamberConditionEvaluator {
  return {
    getDynastySurveyWorldCount: () => 0,
    hasAssemblyDeclassifiedWorld247: () => false,
    getWorld412ChronicleCount: () => 0,
    isWorld499QuarantineLifted: () => false,
    getMaxDynastyArcDistanceLY: () => 0,
    getKalonAuditAnomalyCount: () => 0,
    getCurrentIngameYear: () => 0,
    ...overrides,
  };
}

// ─── exported constants ────────────────────────────────────────────────────

describe('SealedChambers — exported constants', () => {
  it('CHAMBER_ONE_MIN_SURVEY_WORLDS is 50', () => {
    expect(CHAMBER_ONE_MIN_SURVEY_WORLDS).toBe(50);
  });
  it('CHAMBER_THREE_CHRONICLE_TARGET is 10_000', () => {
    expect(CHAMBER_THREE_CHRONICLE_TARGET).toBe(10_000);
  });
  it('CHAMBER_FIVE_OUTER_ARC_LY is 280', () => {
    expect(CHAMBER_FIVE_OUTER_ARC_LY).toBe(280);
  });
  it('CHAMBER_SIX_KALON_ANOMALY_COUNT is 3', () => {
    expect(CHAMBER_SIX_KALON_ANOMALY_COUNT).toBe(3);
  });
  it('CHAMBER_SEVEN_UNLOCK_YEAR is 105', () => {
    expect(CHAMBER_SEVEN_UNLOCK_YEAR).toBe(105);
  });
});

// ─── getAllChambers / getChamber ───────────────────────────────────────────

describe('SealedChambers — getAllChambers / getChamber', () => {
  it('starts with 7 chambers all LOCKED', () => {
    const svc = createSealedChambersService(makeDeps());
    const chambers = svc.getAllChambers();
    expect(chambers).toHaveLength(7);
    for (const c of chambers) {
      expect(c.status).toBe('LOCKED');
    }
  });

  it('getChamber returns correct data for Chamber One', () => {
    const svc = createSealedChambersService(makeDeps());
    const c = svc.getChamber('CHAMBER_ONE_KWAME_FILES');
    expect(c).toBeDefined();
    expect(c!.chamberId).toBe('CHAMBER_ONE_KWAME_FILES');
    expect(c!.title).toBe('The Kwame Files');
    expect(typeof c!.characterName).toBe('string');
  });

  it('getChamber returns undefined for unknown id', () => {
    const svc = createSealedChambersService(makeDeps());
    expect(svc.getChamber('NONEXISTENT' as never)).toBeUndefined();
  });
});

// ─── evaluateConditions ────────────────────────────────────────────────────

describe('SealedChambers — evaluateConditions', () => {
  it('returns empty array when no conditions are met', () => {
    const svc = createSealedChambersService(makeDeps());
    const result = svc.evaluateConditions(makeNoopEvaluator());
    expect(result).toHaveLength(0);
  });

  it('Chamber Three condition met when World-412 chronicle count hits target', () => {
    const svc = createSealedChambersService(makeDeps());
    const evaluator = makeNoopEvaluator({
      getWorld412ChronicleCount: () => CHAMBER_THREE_CHRONICLE_TARGET,
    });
    svc.evaluateConditions(evaluator);
    const c3 = svc.getChamber('CHAMBER_THREE_WORLD_412');
    expect(c3!.status).not.toBe('LOCKED');
  });

  it('Chamber Seven condition met when in-game year reaches 105', () => {
    const svc = createSealedChambersService(makeDeps());
    const evaluator = makeNoopEvaluator({
      getCurrentIngameYear: () => CHAMBER_SEVEN_UNLOCK_YEAR,
    });
    svc.evaluateConditions(evaluator);
    const c7 = svc.getChamber('CHAMBER_SEVEN_ARCHITECT');
    expect(c7!.status).not.toBe('LOCKED');
  });

  it('Chamber One condition requires at least CHAMBER_ONE_MIN_SURVEY_WORLDS', () => {
    const svc = createSealedChambersService(makeDeps());
    const evaluator = makeNoopEvaluator({
      getDynastySurveyWorldCount: () => CHAMBER_ONE_MIN_SURVEY_WORLDS,
    });
    svc.evaluateConditions(evaluator, 'dynasty-test');
    const c1 = svc.getChamber('CHAMBER_ONE_KWAME_FILES');
    expect(c1!.status).not.toBe('LOCKED');
  });

  it('Chamber Two condition met when World-247 declassification passes', () => {
    const svc = createSealedChambersService(makeDeps());
    const evaluator = makeNoopEvaluator({
      hasAssemblyDeclassifiedWorld247: () => true,
    });
    svc.evaluateConditions(evaluator);
    const c2 = svc.getChamber('CHAMBER_TWO_ORDINANCE_7');
    expect(c2!.status).not.toBe('LOCKED');
  });
});

// ─── unlockChamber ────────────────────────────────────────────────────────

describe('SealedChambers — unlockChamber', () => {
  it('transitions CONDITION_MET → UNLOCKED', () => {
    const emit = vi.fn();
    const svc = createSealedChambersService({ clock: { nowMs: () => 1_700_000_000_000 }, chronicle: { emit } });
    const evaluator = makeNoopEvaluator({
      getCurrentIngameYear: () => CHAMBER_SEVEN_UNLOCK_YEAR,
    });
    svc.evaluateConditions(evaluator);
    const result = svc.unlockChamber('CHAMBER_SEVEN_ARCHITECT');
    expect(typeof result).toBe('object');
    const chamber = result as Record<string, unknown>;
    expect(chamber['status']).toBe('UNLOCKED');
  });

  it('emits a chronicle entry when unlocking', () => {
    const emit = vi.fn();
    const svc = createSealedChambersService({ clock: { nowMs: () => 1_700_000_000_000 }, chronicle: { emit } });
    const evaluator = makeNoopEvaluator({
      getCurrentIngameYear: () => CHAMBER_SEVEN_UNLOCK_YEAR,
    });
    svc.evaluateConditions(evaluator);
    svc.unlockChamber('CHAMBER_SEVEN_ARCHITECT');
    expect(emit).toHaveBeenCalledOnce();
  });

  it('returns error when trying to unlock a LOCKED chamber (condition not met)', () => {
    const svc = createSealedChambersService(makeDeps());
    const result = svc.unlockChamber('CHAMBER_ONE_KWAME_FILES');
    expect(typeof result).toBe('string');
  });
});

// ─── getUnlockCount / getUnlockSummary ────────────────────────────────────

describe('SealedChambers — getUnlockCount / getUnlockSummary', () => {
  it('starts with zero unlocked', () => {
    const svc = createSealedChambersService(makeDeps());
    expect(svc.getUnlockCount()).toBe(0);
  });

  it('getUnlockSummary shows totalChambers = 7', () => {
    const svc = createSealedChambersService(makeDeps());
    const summary = svc.getUnlockSummary();
    expect(summary.totalChambers).toBe(7);
    expect(summary.lockedCount).toBe(7);
    expect(summary.allUnlocked).toBe(false);
  });

  it('unlocking a chamber increments unlock count', () => {
    const svc = createSealedChambersService(makeDeps());
    const evaluator = makeNoopEvaluator({
      getCurrentIngameYear: () => CHAMBER_SEVEN_UNLOCK_YEAR,
    });
    svc.evaluateConditions(evaluator);
    svc.unlockChamber('CHAMBER_SEVEN_ARCHITECT');
    expect(svc.getUnlockCount()).toBe(1);
  });
});
