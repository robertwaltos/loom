import { describe, expect, it } from 'vitest';
import {
  SEALED_CHAMBER_CONSTANTS,
  createSealedChamberEngine,
  type TriggerConditions,
} from '../sealed-chambers.js';

function createConditions(overrides?: Partial<TriggerConditions>): TriggerConditions {
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

function createEngine(overrides?: Partial<TriggerConditions>) {
  let t = 10_000;
  let id = 0;
  return createSealedChamberEngine({
    clock: { nowMicroseconds: () => ++t },
    idGenerator: { next: () => `tr-${++id}` },
    conditions: createConditions(overrides),
  });
}

describe('SealedChamberEngine simulation', () => {
  it('starts with all chambers sealed and expected totals', () => {
    const engine = createEngine();
    const stats = engine.getStats();

    expect(engine.getDefinitions()).toHaveLength(7);
    expect(engine.getAllRecords()).toHaveLength(7);
    expect(stats.sealed).toBe(7);
    expect(stats.triggered).toBe(0);
    expect(stats.opened).toBe(0);
  });

  it('triggers chamber one when dynasty survey threshold is met', () => {
    const engine = createEngine({
      dynastySurveyWorldCount: () => SEALED_CHAMBER_CONSTANTS.KWAME_SURVEY_THRESHOLD,
    });

    const transition = engine.evaluate('KWAME_FILES', 'dyn-1');
    const record = engine.getRecord('KWAME_FILES');

    expect(transition?.from).toBe('SEALED');
    expect(transition?.to).toBe('TRIGGERED');
    expect(record.state).toBe('TRIGGERED');
    expect(record.triggerDynastyId).toBe('dyn-1');
  });

  it('does not trigger dynasty-scoped conditions when dynastyId is null', () => {
    const engine = createEngine({
      dynastySurveyWorldCount: () => 999,
      hasReachedOuterArc: () => true,
      hasFiledAuditIrregularity: () => true,
    });

    expect(engine.evaluate('KWAME_FILES', null)).toBeNull();
    expect(engine.evaluate('SUNDARAM_CHEN_LOGS', null)).toBeNull();
    expect(engine.evaluate('DAGNA_THREE_REPORTS', null)).toBeNull();
  });

  it('opens only TRIGGERED chambers and records chronicle ref', () => {
    const engine = createEngine({
      hasPassedDeclassificationMotion: () => true,
    });

    expect(engine.openTriggered('ORDINANCE_7_RECORD', 'chronicle:x')).toBeNull();

    const trigger = engine.evaluate('ORDINANCE_7_RECORD', null);
    const open = engine.openTriggered('ORDINANCE_7_RECORD', 'chronicle:x');
    const record = engine.getRecord('ORDINANCE_7_RECORD');

    expect(trigger?.to).toBe('TRIGGERED');
    expect(open?.to).toBe('OPENED');
    expect(record.state).toBe('OPENED');
    expect(record.triggerChronicleRef).toBe('chronicle:x');
  });

  it('preserves append-only transition invariants after opened state', () => {
    const engine = createEngine({
      getCurrentInGameYear: () => SEALED_CHAMBER_CONSTANTS.ARCHITECT_STATEMENT_YEAR,
    });

    const t1 = engine.evaluate('ARCHITECT_STATEMENT', null);
    const t2 = engine.openTriggered('ARCHITECT_STATEMENT', 'chronicle:seal-7');

    expect(t1?.from).toBe('SEALED');
    expect(t1?.to).toBe('TRIGGERED');
    expect(t2?.from).toBe('TRIGGERED');
    expect(t2?.to).toBe('OPENED');

    expect(engine.evaluate('ARCHITECT_STATEMENT', null)).toBeNull();
    expect(engine.openTriggered('ARCHITECT_STATEMENT', 'chronicle:new')).toBeNull();

    const history = engine.getTransitionHistory('ARCHITECT_STATEMENT');
    expect(history).toHaveLength(2);
    expect(history[0]?.to).toBe('TRIGGERED');
    expect(history[1]?.to).toBe('OPENED');
  });

  it('returns immutable snapshots for chamber records', () => {
    const engine = createEngine({ hasPassedDeclassificationMotion: () => true });
    engine.evaluate('ORDINANCE_7_RECORD', null);

    const snapshot = engine.getRecord('ORDINANCE_7_RECORD') as unknown as {
      state: 'SEALED' | 'TRIGGERED' | 'OPENED';
      triggerDynastyId: string | null;
    };
    snapshot.state = 'SEALED';
    snapshot.triggerDynastyId = 'tampered';

    const after = engine.getRecord('ORDINANCE_7_RECORD');
    expect(after.state).toBe('TRIGGERED');
    expect(after.triggerDynastyId).toBeNull();
  });

  it('evaluateAll triggers only chambers whose conditions are satisfied', () => {
    const engine = createEngine({
      hasPassedDeclassificationMotion: () => true,
      chronicleEntryCountForWorld: () => SEALED_CHAMBER_CONSTANTS.WORLD_412_CHRONICLE_THRESHOLD,
      isQuarantineLifted: () => true,
    });

    const transitions = engine.evaluateAll('dyn-77');
    const triggeredIds = new Set(transitions.map((t) => t.chamberId));

    expect(triggeredIds.has('ORDINANCE_7_RECORD')).toBe(true);
    expect(triggeredIds.has('WORLD_412_ACCOUNT')).toBe(true);
    expect(triggeredIds.has('FERREIRA_ASANTE_FINDING')).toBe(true);
    expect(triggeredIds.has('ARCHITECT_STATEMENT')).toBe(false);
  });

  it('updates stats as chambers progress states', () => {
    const engine = createEngine({
      hasPassedDeclassificationMotion: () => true,
      getCurrentInGameYear: () => SEALED_CHAMBER_CONSTANTS.ARCHITECT_STATEMENT_YEAR,
    });

    engine.evaluate('ORDINANCE_7_RECORD', null);
    engine.evaluate('ARCHITECT_STATEMENT', null);
    engine.openTriggered('ARCHITECT_STATEMENT', 'chronicle:a7');

    const stats = engine.getStats();
    expect(stats.sealed).toBe(5);
    expect(stats.triggered).toBe(1);
    expect(stats.opened).toBe(1);
  });
});
