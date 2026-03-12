import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSealedChamberEngine,
  type SealedChamberEngine,
  type SealedChamberDeps,
  type TriggerConditions,
  type ChamberId,
  SEALED_CHAMBER_CONSTANTS,
} from '../src/sealed-chambers.js';

// ─── Test Helpers ────────────────────────────────────────────────────

function createMockConditions(overrides: Partial<TriggerConditions> = {}): TriggerConditions {
  return {
    dynastySurveyWorldCount: () => 0,
    hasPassedDeclassificationMotion: () => false,
    chronicleEntryCountForWorld: () => 0,
    isQuarantineLifted: () => false,
    hasReachedOuterArc: () => false,
    hasFiledAuditIrregularity: () => false,
    getCurrentInGameYear: () => 1,
    ...overrides,
  };
}

let idCounter = 0;

function createDeps(conditionOverrides: Partial<TriggerConditions> = {}): SealedChamberDeps {
  idCounter = 0;
  return {
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { next: () => `tx-${++idCounter}` },
    conditions: createMockConditions(conditionOverrides),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('SealedChamberEngine', () => {
  let engine: SealedChamberEngine;

  beforeEach(() => {
    engine = createSealedChamberEngine(createDeps());
  });

  describe('initialization', () => {
    it('creates 7 chamber definitions', () => {
      expect(engine.getDefinitions()).toHaveLength(7);
    });

    it('all chambers start SEALED', () => {
      const records = engine.getAllRecords();
      expect(records).toHaveLength(7);
      for (const r of records) {
        expect(r.state).toBe('SEALED');
        expect(r.triggeredAt).toBeNull();
        expect(r.openedAt).toBeNull();
        expect(r.triggerDynastyId).toBeNull();
        expect(r.triggerChronicleRef).toBeNull();
      }
    });

    it('stats reflect all sealed', () => {
      const stats = engine.getStats();
      expect(stats).toEqual({ sealed: 7, triggered: 0, opened: 0, total: 7 });
    });

    it('throws for unknown chamber id', () => {
      expect(() => engine.getRecord('INVALID' as ChamberId)).toThrow('Unknown chamber');
    });
  });

  describe('Chamber One — Kwame Files', () => {
    it('stays sealed when survey count below threshold', () => {
      engine = createSealedChamberEngine(createDeps({
        dynastySurveyWorldCount: () => 49,
      }));
      const result = engine.evaluate('KWAME_FILES', 'dynasty-1');
      expect(result).toBeNull();
      expect(engine.getRecord('KWAME_FILES').state).toBe('SEALED');
    });

    it('triggers at exactly 50 surveyed worlds', () => {
      engine = createSealedChamberEngine(createDeps({
        dynastySurveyWorldCount: () => 50,
      }));
      const result = engine.evaluate('KWAME_FILES', 'dynasty-1');
      expect(result).not.toBeNull();
      expect(result!.from).toBe('SEALED');
      expect(result!.to).toBe('TRIGGERED');
      expect(engine.getRecord('KWAME_FILES').state).toBe('TRIGGERED');
      expect(engine.getRecord('KWAME_FILES').triggerDynastyId).toBe('dynasty-1');
    });

    it('requires a dynasty id', () => {
      engine = createSealedChamberEngine(createDeps({
        dynastySurveyWorldCount: () => 100,
      }));
      const result = engine.evaluate('KWAME_FILES', null);
      expect(result).toBeNull();
    });
  });

  describe('Chamber Two — Ordinance 7 Record', () => {
    it('stays sealed when motion not passed', () => {
      const result = engine.evaluate('ORDINANCE_7_RECORD', null);
      expect(result).toBeNull();
    });

    it('triggers when declassification motion passes for World 247', () => {
      engine = createSealedChamberEngine(createDeps({
        hasPassedDeclassificationMotion: (worldId) => worldId === 'world-247',
      }));
      const result = engine.evaluate('ORDINANCE_7_RECORD', null);
      expect(result).not.toBeNull();
      expect(result!.to).toBe('TRIGGERED');
    });
  });

  describe('Chamber Three — World 412 Account', () => {
    it('stays sealed below 10,000 entries', () => {
      engine = createSealedChamberEngine(createDeps({
        chronicleEntryCountForWorld: () => 9_999,
      }));
      const result = engine.evaluate('WORLD_412_ACCOUNT', null);
      expect(result).toBeNull();
    });

    it('triggers at exactly 10,000 Chronicle entries', () => {
      engine = createSealedChamberEngine(createDeps({
        chronicleEntryCountForWorld: () => 10_000,
      }));
      const result = engine.evaluate('WORLD_412_ACCOUNT', null);
      expect(result).not.toBeNull();
      expect(result!.to).toBe('TRIGGERED');
    });
  });

  describe('Chamber Four — Ferreira-Asante Finding', () => {
    it('stays sealed when quarantine not lifted', () => {
      const result = engine.evaluate('FERREIRA_ASANTE_FINDING', null);
      expect(result).toBeNull();
    });

    it('triggers when World 499 quarantine is lifted', () => {
      engine = createSealedChamberEngine(createDeps({
        isQuarantineLifted: (worldId) => worldId === 'world-499',
      }));
      const result = engine.evaluate('FERREIRA_ASANTE_FINDING', null);
      expect(result).not.toBeNull();
    });
  });

  describe('Chamber Five — Sundaram-Chen Logs', () => {
    it('requires dynasty id', () => {
      engine = createSealedChamberEngine(createDeps({
        hasReachedOuterArc: () => true,
      }));
      const result = engine.evaluate('SUNDARAM_CHEN_LOGS', null);
      expect(result).toBeNull();
    });

    it('triggers when dynasty reaches outer arc', () => {
      engine = createSealedChamberEngine(createDeps({
        hasReachedOuterArc: () => true,
      }));
      const result = engine.evaluate('SUNDARAM_CHEN_LOGS', 'dynasty-2');
      expect(result).not.toBeNull();
    });
  });

  describe('Chamber Six — Dagna\'s Three Reports', () => {
    it('requires dynasty id', () => {
      engine = createSealedChamberEngine(createDeps({
        hasFiledAuditIrregularity: () => true,
      }));
      const result = engine.evaluate('DAGNA_THREE_REPORTS', null);
      expect(result).toBeNull();
    });

    it('triggers when audit irregularity filed', () => {
      engine = createSealedChamberEngine(createDeps({
        hasFiledAuditIrregularity: () => true,
      }));
      const result = engine.evaluate('DAGNA_THREE_REPORTS', 'dynasty-3');
      expect(result).not.toBeNull();
    });
  });

  describe('Chamber Seven — Architect\'s Statement', () => {
    it('stays sealed before Year 105', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 104,
      }));
      const result = engine.evaluate('ARCHITECT_STATEMENT', null);
      expect(result).toBeNull();
    });

    it('triggers at Year 105', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
      }));
      const result = engine.evaluate('ARCHITECT_STATEMENT', null);
      expect(result).not.toBeNull();
      expect(result!.to).toBe('TRIGGERED');
    });

    it('triggers after Year 105', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 200,
      }));
      const result = engine.evaluate('ARCHITECT_STATEMENT', null);
      expect(result).not.toBeNull();
    });
  });

  describe('state transitions', () => {
    it('cannot re-trigger an already triggered chamber', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
      }));
      const first = engine.evaluate('ARCHITECT_STATEMENT', null);
      expect(first).not.toBeNull();
      const second = engine.evaluate('ARCHITECT_STATEMENT', null);
      expect(second).toBeNull();
    });

    it('opens a triggered chamber with chronicle ref', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
      }));
      engine.evaluate('ARCHITECT_STATEMENT', null);

      const opening = engine.openTriggered('ARCHITECT_STATEMENT', 'chronicle-xyz');
      expect(opening).not.toBeNull();
      expect(opening!.from).toBe('TRIGGERED');
      expect(opening!.to).toBe('OPENED');

      const record = engine.getRecord('ARCHITECT_STATEMENT');
      expect(record.state).toBe('OPENED');
      expect(record.triggerChronicleRef).toBe('chronicle-xyz');
      expect(record.openedAt).toBe(1_000_000);
    });

    it('cannot open a sealed chamber directly', () => {
      const result = engine.openTriggered('KWAME_FILES', 'ref-1');
      expect(result).toBeNull();
    });

    it('cannot open an already opened chamber', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
      }));
      engine.evaluate('ARCHITECT_STATEMENT', null);
      engine.openTriggered('ARCHITECT_STATEMENT', 'ref-1');

      const result = engine.openTriggered('ARCHITECT_STATEMENT', 'ref-2');
      expect(result).toBeNull();
    });
  });

  describe('evaluateAll', () => {
    it('triggers multiple chambers simultaneously', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
        hasPassedDeclassificationMotion: () => true,
        chronicleEntryCountForWorld: () => 15_000,
      }));

      const transitions = engine.evaluateAll(null);
      expect(transitions).toHaveLength(3);

      const ids = transitions.map(t => t.chamberId);
      expect(ids).toContain('ORDINANCE_7_RECORD');
      expect(ids).toContain('WORLD_412_ACCOUNT');
      expect(ids).toContain('ARCHITECT_STATEMENT');
    });

    it('skips already triggered chambers', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
      }));

      engine.evaluateAll(null);
      const secondPass = engine.evaluateAll(null);
      expect(secondPass).toHaveLength(0);
    });
  });

  describe('transition history', () => {
    it('records full transition chain', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
      }));
      engine.evaluate('ARCHITECT_STATEMENT', 'dynasty-a');
      engine.openTriggered('ARCHITECT_STATEMENT', 'ref-1');

      const history = engine.getTransitionHistory('ARCHITECT_STATEMENT');
      expect(history).toHaveLength(2);
      expect(history[0].from).toBe('SEALED');
      expect(history[0].to).toBe('TRIGGERED');
      expect(history[1].from).toBe('TRIGGERED');
      expect(history[1].to).toBe('OPENED');
    });

    it('empty history for untouched chamber', () => {
      expect(engine.getTransitionHistory('KWAME_FILES')).toHaveLength(0);
    });
  });

  describe('stats', () => {
    it('updates correctly through transitions', () => {
      engine = createSealedChamberEngine(createDeps({
        getCurrentInGameYear: () => 105,
        hasPassedDeclassificationMotion: () => true,
      }));

      engine.evaluateAll(null);
      expect(engine.getStats()).toEqual({ sealed: 5, triggered: 2, opened: 0, total: 7 });

      engine.openTriggered('ARCHITECT_STATEMENT', 'ref-1');
      expect(engine.getStats()).toEqual({ sealed: 5, triggered: 1, opened: 1, total: 7 });
    });
  });

  describe('constants', () => {
    it('exports correct thresholds', () => {
      expect(SEALED_CHAMBER_CONSTANTS.KWAME_SURVEY_THRESHOLD).toBe(50);
      expect(SEALED_CHAMBER_CONSTANTS.WORLD_412_CHRONICLE_THRESHOLD).toBe(10_000);
      expect(SEALED_CHAMBER_CONSTANTS.ARCHITECT_STATEMENT_YEAR).toBe(105);
    });
  });
});
