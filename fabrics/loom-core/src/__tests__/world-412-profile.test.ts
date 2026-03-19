import { describe, it, expect, beforeEach } from 'vitest';
import {
  WORLD_412_PROFILE,
  getWorld412LatticeHz,
  isWorld412Accessible,
  getWorld412SealedChamberCondition,
} from '../world-412-profile.js';
import type {
  World412Profile,
  World412ChronicleEntry,
  WorldClassification,
  World412AccessStatus,
} from '../world-412-profile.js';

describe('world-412-profile', () => {
  describe('WORLD_412_PROFILE constant', () => {
    it('should have worldId of world-412', () => {
      expect(WORLD_412_PROFILE.worldId).toBe('world-412');
    });

    it('should be named Osei-Voss Survey Reserve', () => {
      expect(WORLD_412_PROFILE.worldName).toBe('Osei-Voss Survey Reserve');
    });

    it('should be Garden-class classification', () => {
      expect(WORLD_412_PROFILE.classification).toBe('Garden-class');
    });

    it('should have SEALED_SURVEY_RESERVE access status', () => {
      expect(WORLD_412_PROFILE.accessStatus).toBe('SEALED_SURVEY_RESERVE');
    });

    it('should have population of 0', () => {
      expect(WORLD_412_PROFILE.population).toBe(0);
    });

    it('should have been discovered in Year 31', () => {
      expect(WORLD_412_PROFILE.discoveryYear).toBe(31);
    });

    it('should have survey commander ID 202', () => {
      expect(WORLD_412_PROFILE.surveyCommanderId).toBe(202);
    });

    it('should have geological instability as official closure reason', () => {
      expect(WORLD_412_PROFILE.officialClosureReason).toBe('geological instability');
    });

    it('should have null actual closure reason', () => {
      expect(WORLD_412_PROFILE.actualClosureReason).toBeNull();
    });

    it('should have latticeBaseHz of 44.0', () => {
      expect(WORLD_412_PROFILE.latticeBaseHz).toBe(44.0);
    });

    it('should have latticeAnomalyDeltaHz of 2.7', () => {
      expect(WORLD_412_PROFILE.latticeAnomalyDeltaHz).toBe(2.7);
    });

    it('should have null lattice anomaly explanation', () => {
      expect(WORLD_412_PROFILE.latticeAnomalyExplanation).toBeNull();
    });

    it('should have Ankorite as primary resource', () => {
      expect(WORLD_412_PROFILE.primaryResource).toBe('Ankorite');
    });
  });

  describe('chronicle entries', () => {
    it('should have exactly 3 chronicle entries', () => {
      expect(WORLD_412_PROFILE.chronicleEntries.length).toBe(3);
    });

    it('should all be filed in year 31', () => {
      for (const entry of WORLD_412_PROFILE.chronicleEntries) {
        expect(entry.yearFiled).toBe(31);
      }
    });

    it('should all be SURVEY_CORPS_FIELD_REPORT classification', () => {
      for (const entry of WORLD_412_PROFILE.chronicleEntries) {
        expect(entry.classification).toBe('SURVEY_CORPS_FIELD_REPORT');
      }
    });

    it('should all be reviewed before filing', () => {
      for (const entry of WORLD_412_PROFILE.chronicleEntries) {
        expect(entry.reviewedBeforeFiling).toBe(true);
      }
    });

    it('should have unique entry IDs', () => {
      const ids = WORLD_412_PROFILE.chronicleEntries.map((e) => e.entryId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have different authors', () => {
      const authors = WORLD_412_PROFILE.chronicleEntries.map((e) => e.author);
      const unique = new Set(authors);
      expect(unique.size).toBe(authors.length);
    });

    it('should all contain instrument variance phrasing', () => {
      for (const entry of WORLD_412_PROFILE.chronicleEntries) {
        expect(entry.text).toContain('Instrument variance noted during transit');
      }
    });

    it('should safely access first entry by guarding index', () => {
      const first = WORLD_412_PROFILE.chronicleEntries[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.entryId).toBe('w412-chronicle-001');
      }
    });
  });

  describe('getWorld412LatticeHz', () => {
    it('should return base + anomaly delta', () => {
      expect(getWorld412LatticeHz()).toBe(46.7);
    });

    it('should equal latticeBaseHz + latticeAnomalyDeltaHz', () => {
      const expected = WORLD_412_PROFILE.latticeBaseHz + WORLD_412_PROFILE.latticeAnomalyDeltaHz;
      expect(getWorld412LatticeHz()).toBe(expected);
    });
  });

  describe('isWorld412Accessible', () => {
    it('should return false since status is SEALED_SURVEY_RESERVE', () => {
      expect(isWorld412Accessible()).toBe(false);
    });
  });

  describe('getWorld412SealedChamberCondition', () => {
    it('should return a non-empty string', () => {
      const condition = getWorld412SealedChamberCondition();
      expect(condition.length).toBeGreaterThan(0);
    });

    it('should mention geological instability', () => {
      const condition = getWorld412SealedChamberCondition();
      expect(condition).toContain('geological instability');
    });

    it('should mention ID_202', () => {
      const condition = getWorld412SealedChamberCondition();
      expect(condition).toContain('ID_202');
    });

    it('should mention Chamber 3', () => {
      const condition = getWorld412SealedChamberCondition();
      expect(condition).toContain('Chamber 3');
    });
  });
});
