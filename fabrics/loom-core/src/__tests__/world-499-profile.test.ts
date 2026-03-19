import { describe, it, expect, beforeEach } from 'vitest';
import {
  WORLD_499_PROFILE,
  getWorld499StructureCount,
  isWorld499AnomalyReported,
  getWorld499SealedChamberCondition,
} from '../world-499-profile.js';
import type {
  World499Profile,
  World499PreConcordStructure,
  World499StructureStatus,
} from '../world-499-profile.js';

describe('world-499-profile', () => {
  describe('WORLD_499_PROFILE constant', () => {
    it('should have worldId of world-499', () => {
      expect(WORLD_499_PROFILE.worldId).toBe('world-499');
    });

    it('should be named Ferreira-Asante', () => {
      expect(WORLD_499_PROFILE.worldName).toBe('Ferreira-Asante');
    });

    it('should be Frontier-class classification', () => {
      expect(WORLD_499_PROFILE.classification).toBe('Frontier-class');
    });

    it('should have been claimed in Year 12', () => {
      expect(WORLD_499_PROFILE.claimedYear).toBe(12);
    });

    it('should have two co-claiming families', () => {
      expect(WORLD_499_PROFILE.coClaimingFamilies.length).toBe(2);
      expect(WORLD_499_PROFILE.coClaimingFamilies[0]).toBe('Ferreira');
      expect(WORLD_499_PROFILE.coClaimingFamilies[1]).toBe('Asante');
    });

    it('should have family relationship as NOT_SPEAKING', () => {
      expect(WORLD_499_PROFILE.familyRelationshipStatus).toBe('NOT_SPEAKING');
    });

    it('should have population of 847', () => {
      expect(WORLD_499_PROFILE.population).toBe(847);
    });

    it('should have fewer than 3 average dynasty visits per year', () => {
      expect(WORLD_499_PROFILE.avgDynastyVisitsPerYear).toBeLessThan(3);
      expect(WORLD_499_PROFILE.avgDynastyVisitsPerYear).toBe(2.4);
    });

    it('should have survey commander ID 201', () => {
      expect(WORLD_499_PROFILE.surveyCommanderId).toBe(201);
    });

    it('should have structure status KNOWN_TO_RESIDENTS', () => {
      expect(WORLD_499_PROFILE.structureStatus).toBe('KNOWN_TO_RESIDENTS');
    });

    it('should have UNCONFIRMED_PATTERN_MATCH as ascendancy implication', () => {
      expect(WORLD_499_PROFILE.ascendancyImplicationStatus).toBe('UNCONFIRMED_PATTERN_MATCH');
    });
  });

  describe('survey text discrepancy', () => {
    it('should have original survey mentioning pre-Concord visitation', () => {
      expect(WORLD_499_PROFILE.originalSurveyText).toContain('pre-Concord visitation');
    });

    it('should have submitted survey claiming no anomalies', () => {
      expect(WORLD_499_PROFILE.submittedSurveyText).toContain('no anomalies detected');
    });

    it('should have different original and submitted texts', () => {
      expect(WORLD_499_PROFILE.originalSurveyText).not.toBe(WORLD_499_PROFILE.submittedSurveyText);
    });
  });

  describe('pre-Concord structures', () => {
    it('should have exactly 3 structures', () => {
      expect(WORLD_499_PROFILE.preConcordStructures.length).toBe(3);
    });

    it('should all match Ascendancy patterns', () => {
      for (const structure of WORLD_499_PROFILE.preConcordStructures) {
        expect(structure.ascendancyPatternMatch).toBe(true);
      }
    });

    it('should all be estimated pre-Year-0', () => {
      for (const structure of WORLD_499_PROFILE.preConcordStructures) {
        expect(structure.estimatedAge).toBe('pre-Year-0');
      }
    });

    it('should have unique structure IDs', () => {
      const ids = WORLD_499_PROFILE.preConcordStructures.map((s) => s.structureId);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('should safely access first structure by guarding index', () => {
      const first = WORLD_499_PROFILE.preConcordStructures[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.structureId).toBe('w499-structure-001');
      }
    });

    it('should each have a location description', () => {
      for (const structure of WORLD_499_PROFILE.preConcordStructures) {
        expect(structure.locationDescription.length).toBeGreaterThan(0);
      }
    });

    it('should each have a resident adaptation', () => {
      for (const structure of WORLD_499_PROFILE.preConcordStructures) {
        expect(structure.residentAdaptation.length).toBeGreaterThan(0);
      }
    });

    it('should have third structure containing Ankorite', () => {
      const third = WORLD_499_PROFILE.preConcordStructures[2];
      expect(third).toBeDefined();
      if (third) {
        expect(third.constructionMethodology).toContain('Ankorite');
      }
    });
  });

  describe('getWorld499StructureCount', () => {
    it('should return 3', () => {
      expect(getWorld499StructureCount()).toBe(3);
    });
  });

  describe('isWorld499AnomalyReported', () => {
    it('should return false since status is KNOWN_TO_RESIDENTS', () => {
      expect(isWorld499AnomalyReported()).toBe(false);
    });
  });

  describe('getWorld499SealedChamberCondition', () => {
    it('should return a non-empty string', () => {
      const condition = getWorld499SealedChamberCondition();
      expect(condition.length).toBeGreaterThan(0);
    });

    it('should mention World 499', () => {
      const condition = getWorld499SealedChamberCondition();
      expect(condition).toContain('World 499');
    });

    it('should mention ID_201', () => {
      const condition = getWorld499SealedChamberCondition();
      expect(condition).toContain('ID_201');
    });

    it('should mention Chamber 4', () => {
      const condition = getWorld499SealedChamberCondition();
      expect(condition).toContain('Chamber 4');
    });

    it('should mention pre-Concord structures', () => {
      const condition = getWorld499SealedChamberCondition();
      expect(condition).toContain('pre-Concord structures');
    });
  });
});
