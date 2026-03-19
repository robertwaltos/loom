import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectBetrayalDriftTriggers,
  detectArchaeologicalQuestTriggers,
  detectPriceOfSilenceTriggers,
  detectCrisisSurgeTriggers,
  analyzePatterns,
  BETRAYAL_DRIFT_THRESHOLD,
  ARCHAEOLOGICAL_QUEST_THRESHOLD,
  SOVEREIGNTY_SILENCE_YEARS,
  CRISIS_UNRESOLVED_BETRAYAL_THRESHOLD,
  CRISIS_PROBABILITY_BOOST,
} from '../remembrance-pattern-analyzer.js';
import type {
  SovereignDynastyInput,
  PatternTrigger,
} from '../remembrance-pattern-analyzer.js';
import type { RemembranceEntryInput } from '../historical-pressure-vectors.js';

let idCounter = 0;
function idGen(): string {
  idCounter += 1;
  return 'trigger-' + String(idCounter);
}

function makeEntry(overrides: Partial<RemembranceEntryInput> = {}): RemembranceEntryInput {
  return {
    entryId: 'e-' + String(idCounter++),
    worldId: 'world-1',
    dynastyId: 'dynasty-1',
    theme: 'CONFLICT',
    isBetrayal: false,
    isResolved: true,
    chronicleYear: 50,
    ...overrides,
  };
}

describe('remembrance-pattern-analyzer', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2350-06-01T00:00:00Z');
    idCounter = 0;
  });

  describe('constants', () => {
    it('should define BETRAYAL_DRIFT_THRESHOLD as 15', () => {
      expect(BETRAYAL_DRIFT_THRESHOLD).toBe(15);
    });

    it('should define ARCHAEOLOGICAL_QUEST_THRESHOLD as 40', () => {
      expect(ARCHAEOLOGICAL_QUEST_THRESHOLD).toBe(40);
    });

    it('should define SOVEREIGNTY_SILENCE_YEARS as 30', () => {
      expect(SOVEREIGNTY_SILENCE_YEARS).toBe(30);
    });

    it('should define CRISIS_UNRESOLVED_BETRAYAL_THRESHOLD as 3', () => {
      expect(CRISIS_UNRESOLVED_BETRAYAL_THRESHOLD).toBe(3);
    });
  });

  describe('detectBetrayalDriftTriggers', () => {
    it('should return empty when no betrayals exist', () => {
      const entries = [makeEntry({ isBetrayal: false })];
      const triggers = detectBetrayalDriftTriggers(entries, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should return empty when betrayals are below threshold', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 14; i++) {
        entries.push(makeEntry({ isBetrayal: true }));
      }
      const triggers = detectBetrayalDriftTriggers(entries, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should trigger at exactly 15 betrayals', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 15; i++) {
        entries.push(makeEntry({ isBetrayal: true }));
      }
      const triggers = detectBetrayalDriftTriggers(entries, idGen, now);
      expect(triggers.length).toBe(1);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.type).toBe('NPC_NON_COOPERATION_DRIFT');
        expect(first.dynastyId).toBe('dynasty-1');
      }
    });

    it('should group betrayals by dynasty', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 15; i++) {
        entries.push(makeEntry({ dynastyId: 'dynasty-A', isBetrayal: true }));
      }
      for (let i = 0; i < 10; i++) {
        entries.push(makeEntry({ dynastyId: 'dynasty-B', isBetrayal: true }));
      }
      const triggers = detectBetrayalDriftTriggers(entries, idGen, now);
      expect(triggers.length).toBe(1);
    });

    it('should include severity in payload', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 20; i++) {
        entries.push(makeEntry({ isBetrayal: true }));
      }
      const triggers = detectBetrayalDriftTriggers(entries, idGen, now);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(typeof first.payload['severity']).toBe('number');
      }
    });
  });

  describe('detectArchaeologicalQuestTriggers', () => {
    it('should return empty when no event has 40+ entries', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 39; i++) {
        entries.push(makeEntry({ subjectEventId: 'event-1' }));
      }
      const triggers = detectArchaeologicalQuestTriggers(entries, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should trigger at exactly 40 entries for one event', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 40; i++) {
        entries.push(makeEntry({ subjectEventId: 'event-1' }));
      }
      const triggers = detectArchaeologicalQuestTriggers(entries, idGen, now);
      expect(triggers.length).toBe(1);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.type).toBe('ARCHAEOLOGICAL_QUEST');
        expect(first.eventId).toBe('event-1');
      }
    });

    it('should skip entries without subjectEventId', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 50; i++) {
        entries.push(makeEntry()); // no subjectEventId
      }
      const triggers = detectArchaeologicalQuestTriggers(entries, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should include worldsReferenced in payload', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 40; i++) {
        entries.push(makeEntry({
          subjectEventId: 'event-2',
          worldId: i < 20 ? 'world-1' : 'world-2',
        }));
      }
      const triggers = detectArchaeologicalQuestTriggers(entries, idGen, now);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        const worlds = first.payload['worldsReferenced'] as string[];
        expect(worlds).toBeDefined();
        if (worlds) {
          expect(worlds.length).toBe(2);
        }
      }
    });
  });

  describe('detectPriceOfSilenceTriggers', () => {
    it('should return empty when dynasty has entries', () => {
      const entries = [makeEntry({ dynastyId: 'dynasty-1' })];
      const sovereigns: SovereignDynastyInput[] = [{
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        sovereigntyStartYear: 0,
        currentYear: 50,
      }];
      const triggers = detectPriceOfSilenceTriggers(entries, sovereigns, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should return empty when sovereignty is below 30 years', () => {
      const sovereigns: SovereignDynastyInput[] = [{
        dynastyId: 'dynasty-X',
        worldId: 'world-1',
        sovereigntyStartYear: 30,
        currentYear: 50,
      }];
      const triggers = detectPriceOfSilenceTriggers([], sovereigns, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should trigger when dynasty is silent for 30+ years', () => {
      const sovereigns: SovereignDynastyInput[] = [{
        dynastyId: 'dynasty-X',
        worldId: 'world-1',
        sovereigntyStartYear: 10,
        currentYear: 50,
      }];
      const triggers = detectPriceOfSilenceTriggers([], sovereigns, idGen, now);
      expect(triggers.length).toBe(1);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.type).toBe('PRICE_OF_SILENCE');
        expect(first.entryCount).toBe(0);
      }
    });

    it('should include architectAction in payload', () => {
      const sovereigns: SovereignDynastyInput[] = [{
        dynastyId: 'dynasty-silent',
        worldId: 'world-3',
        sovereigntyStartYear: 0,
        currentYear: 40,
      }];
      const triggers = detectPriceOfSilenceTriggers([], sovereigns, idGen, now);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(typeof first.payload['architectAction']).toBe('string');
      }
    });
  });

  describe('detectCrisisSurgeTriggers', () => {
    it('should return empty when unresolved betrayals are below 3', () => {
      const entries = [
        makeEntry({ isBetrayal: true, isResolved: false }),
        makeEntry({ isBetrayal: true, isResolved: false }),
      ];
      const triggers = detectCrisisSurgeTriggers(entries, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should trigger at exactly 3 unresolved betrayals on a world', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 3; i++) {
        entries.push(makeEntry({ isBetrayal: true, isResolved: false }));
      }
      const triggers = detectCrisisSurgeTriggers(entries, idGen, now);
      expect(triggers.length).toBe(1);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.type).toBe('CRISIS_PROBABILITY_SURGE');
        expect(first.payload['crisisProbabilityBoostPercent']).toBe(CRISIS_PROBABILITY_BOOST);
      }
    });

    it('should not count resolved betrayals', () => {
      const entries = [
        makeEntry({ isBetrayal: true, isResolved: true }),
        makeEntry({ isBetrayal: true, isResolved: true }),
        makeEntry({ isBetrayal: true, isResolved: true }),
      ];
      const triggers = detectCrisisSurgeTriggers(entries, idGen, now);
      expect(triggers.length).toBe(0);
    });

    it('should group by world', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 3; i++) {
        entries.push(makeEntry({ worldId: 'world-A', isBetrayal: true, isResolved: false }));
      }
      for (let i = 0; i < 2; i++) {
        entries.push(makeEntry({ worldId: 'world-B', isBetrayal: true, isResolved: false }));
      }
      const triggers = detectCrisisSurgeTriggers(entries, idGen, now);
      expect(triggers.length).toBe(1);
      const first = triggers[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.worldId).toBe('world-A');
      }
    });
  });

  describe('analyzePatterns', () => {
    it('should return all zero counts for empty input', () => {
      const result = analyzePatterns({
        analysisId: 'analysis-1',
        entries: [],
        sovereigns: [],
        now,
        idGenerator: idGen,
      });
      expect(result.triggers.length).toBe(0);
      expect(result.betrayalDriftCount).toBe(0);
      expect(result.archaeologicalQuestCount).toBe(0);
      expect(result.priceOfSilenceCount).toBe(0);
      expect(result.crisisSurgeCount).toBe(0);
    });

    it('should set analysisId and analyzedAt', () => {
      const result = analyzePatterns({
        analysisId: 'analysis-42',
        entries: [],
        sovereigns: [],
        now,
        idGenerator: idGen,
      });
      expect(result.analysisId).toBe('analysis-42');
      expect(result.analyzedAt.getTime()).toBe(now.getTime());
    });

    it('should aggregate triggers from all four patterns', () => {
      const entries: RemembranceEntryInput[] = [];
      // 15 betrayals for drift
      for (let i = 0; i < 15; i++) {
        entries.push(makeEntry({
          dynastyId: 'dynasty-drift',
          isBetrayal: true,
        }));
      }
      // 3 unresolved betrayals for crisis
      for (let i = 0; i < 3; i++) {
        entries.push(makeEntry({
          worldId: 'world-crisis',
          isBetrayal: true,
          isResolved: false,
        }));
      }
      const sovereigns: SovereignDynastyInput[] = [{
        dynastyId: 'dynasty-silent',
        worldId: 'world-99',
        sovereigntyStartYear: 0,
        currentYear: 40,
      }];

      const result = analyzePatterns({
        analysisId: 'full-test',
        entries,
        sovereigns,
        now,
        idGenerator: idGen,
      });

      expect(result.betrayalDriftCount).toBeGreaterThanOrEqual(1);
      expect(result.crisisSurgeCount).toBeGreaterThanOrEqual(1);
      expect(result.priceOfSilenceCount).toBe(1);
    });
  });
});
