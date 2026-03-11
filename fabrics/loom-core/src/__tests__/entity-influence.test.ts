import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEntityInfluence,
  type EntityInfluenceDeps,
  type Position,
} from '../entity-influence.js';

function createMockDeps(): EntityInfluenceDeps {
  let currentTime = BigInt(1000000);
  const logs: Array<{ level: string; msg: string; ctx: Record<string, unknown> }> = [];

  return {
    clock: {
      nowMicroseconds: () => currentTime,
    },
    logger: {
      info: (msg, ctx) => {
        logs.push({ level: 'info', msg, ctx });
      },
      warn: (msg, ctx) => {
        logs.push({ level: 'warn', msg, ctx });
      },
    },
  };
}

describe('EntityInfluence', () => {
  let deps: EntityInfluenceDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('registerEntity', () => {
    it('registers a new entity influence zone', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      const result = influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');
      expect(result).toBe('OK');
    });

    it('returns error if entity already registered', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');
      const result = influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');
      expect(result).toBe('ENTITY_ALREADY_REGISTERED');
    });

    it('registers multiple entities', () => {
      const influence = createEntityInfluence(deps);
      const pos1: Position = { x: 0, y: 0, z: 0 };
      const pos2: Position = { x: 10, y: 10, z: 0 };

      expect(influence.registerEntity('entity-1', 'world-1', pos1, 'FRIENDLY')).toBe('OK');
      expect(influence.registerEntity('entity-2', 'world-1', pos2, 'HOSTILE')).toBe('OK');
    });

    it('registers entities with different influence types', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };

      expect(influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY')).toBe('OK');
      expect(influence.registerEntity('entity-2', 'world-1', pos, 'HOSTILE')).toBe('OK');
      expect(influence.registerEntity('entity-3', 'world-1', pos, 'NEUTRAL')).toBe('OK');
      expect(influence.registerEntity('entity-4', 'world-1', pos, 'ENVIRONMENTAL')).toBe('OK');
    });
  });

  describe('setInfluenceRadius', () => {
    it('sets influence radius for registered entity', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');

      const result = influence.setInfluenceRadius('entity-1', 50.0);
      expect(result).toBe('OK');
    });

    it('returns error if entity not found', () => {
      const influence = createEntityInfluence(deps);
      const result = influence.setInfluenceRadius('nonexistent', 50.0);
      expect(result).toBe('ENTITY_NOT_FOUND');
    });

    it('returns error if radius is negative', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');

      const result = influence.setInfluenceRadius('entity-1', -10.0);
      expect(result).toBe('INVALID_RADIUS');
    });

    it('allows zero radius', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');

      const result = influence.setInfluenceRadius('entity-1', 0);
      expect(result).toBe('OK');
    });
  });

  describe('setInfluenceStrength', () => {
    it('sets influence strength for registered entity', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');

      const result = influence.setInfluenceStrength('entity-1', 0.8);
      expect(result).toBe('OK');
    });

    it('returns error if entity not found', () => {
      const influence = createEntityInfluence(deps);
      const result = influence.setInfluenceStrength('nonexistent', 0.8);
      expect(result).toBe('ENTITY_NOT_FOUND');
    });

    it('returns error if strength is negative', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');

      const result = influence.setInfluenceStrength('entity-1', -0.5);
      expect(result).toBe('INVALID_STRENGTH');
    });

    it('returns error if strength exceeds 1', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');

      const result = influence.setInfluenceStrength('entity-1', 1.5);
      expect(result).toBe('INVALID_STRENGTH');
    });
  });

  describe('updatePosition', () => {
    it('updates entity position', () => {
      const influence = createEntityInfluence(deps);
      const pos1: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', pos1, 'FRIENDLY');

      const pos2: Position = { x: 10, y: 10, z: 10 };
      const result = influence.updatePosition('entity-1', pos2);
      expect(result).toBe('OK');
    });

    it('returns error if entity not found', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 10, y: 10, z: 10 };
      const result = influence.updatePosition('nonexistent', pos);
      expect(result).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('computeInfluenceAt', () => {
    it('returns zero influence at position with no entities', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 50, y: 50, z: 0 };
      const result = influence.computeInfluenceAt('world-1', pos);

      expect(result.totalInfluence).toBe(0);
      expect(result.contributingZones).toHaveLength(0);
    });

    it('computes influence within entity radius', () => {
      const influence = createEntityInfluence(deps);
      const entityPos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', entityPos, 'FRIENDLY');
      influence.setInfluenceRadius('entity-1', 20.0);

      const testPos: Position = { x: 5, y: 0, z: 0 };
      const result = influence.computeInfluenceAt('world-1', testPos);

      expect(result.totalInfluence).toBeGreaterThan(0);
      expect(result.contributingZones).toContain('entity-1');
    });

    it('returns zero influence outside entity radius', () => {
      const influence = createEntityInfluence(deps);
      const entityPos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', entityPos, 'FRIENDLY');
      influence.setInfluenceRadius('entity-1', 10.0);

      const testPos: Position = { x: 50, y: 50, z: 0 };
      const result = influence.computeInfluenceAt('world-1', testPos);

      expect(result.totalInfluence).toBe(0);
      expect(result.contributingZones).toHaveLength(0);
    });

    it('computes influence from multiple entities', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 10, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const testPos: Position = { x: 5, y: 0, z: 0 };
      const result = influence.computeInfluenceAt('world-1', testPos);

      expect(result.totalInfluence).toBeGreaterThan(0);
      expect(result.contributingZones).toHaveLength(2);
    });

    it('applies distance-based falloff', () => {
      const influence = createEntityInfluence(deps);
      const entityPos: Position = { x: 0, y: 0, z: 0 };
      influence.registerEntity('entity-1', 'world-1', entityPos, 'FRIENDLY');
      influence.setInfluenceRadius('entity-1', 20.0);

      const nearPos: Position = { x: 2, y: 0, z: 0 };
      const farPos: Position = { x: 15, y: 0, z: 0 };

      const nearResult = influence.computeInfluenceAt('world-1', nearPos);
      const farResult = influence.computeInfluenceAt('world-1', farPos);

      expect(nearResult.totalInfluence).toBeGreaterThan(farResult.totalInfluence);
    });

    it('respects influence strength', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceStrength('entity-1', 0.5);

      const testPos: Position = { x: 5, y: 0, z: 0 };
      const weakResult = influence.computeInfluenceAt('world-1', testPos);

      influence.setInfluenceStrength('entity-1', 1.0);
      const strongResult = influence.computeInfluenceAt('world-1', testPos);

      expect(strongResult.totalInfluence).toBeGreaterThan(weakResult.totalInfluence);
    });
  });

  describe('detectConflicts', () => {
    it('returns empty array when no conflicts exist', () => {
      const influence = createEntityInfluence(deps);
      const conflicts = influence.detectConflicts('world-1');
      expect(conflicts).toHaveLength(0);
    });

    it('detects conflict between FRIENDLY and HOSTILE zones', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const conflicts = influence.detectConflicts('world-1');
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('does not detect conflict between FRIENDLY zones', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const conflicts = influence.detectConflicts('world-1');
      expect(conflicts).toHaveLength(0);
    });

    it('does not detect conflict when zones do not overlap', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 100, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 10.0);
      influence.setInfluenceRadius('entity-2', 10.0);

      const conflicts = influence.detectConflicts('world-1');
      expect(conflicts).toHaveLength(0);
    });

    it('calculates conflict severity based on overlap', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 2, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const conflicts = influence.detectConflicts('world-1');
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        if (conflict !== undefined) {
          expect(conflict.severity).toBeGreaterThan(0);
        }
      }
    });

    it('includes conflict position', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 10, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const conflicts = influence.detectConflicts('world-1');
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        if (conflict !== undefined) {
          expect(conflict.conflictPosition).toBeDefined();
        }
      }
    });
  });

  describe('detectSynergies', () => {
    it('returns empty array when no synergies exist', () => {
      const influence = createEntityInfluence(deps);
      const synergies = influence.detectSynergies('world-1');
      expect(synergies).toHaveLength(0);
    });

    it('detects synergy between FRIENDLY zones', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const synergies = influence.detectSynergies('world-1');
      expect(synergies.length).toBeGreaterThan(0);
    });

    it('detects synergy between HOSTILE zones', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'HOSTILE');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const synergies = influence.detectSynergies('world-1');
      expect(synergies.length).toBeGreaterThan(0);
    });

    it('does not detect synergy between FRIENDLY and HOSTILE', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const synergies = influence.detectSynergies('world-1');
      expect(synergies).toHaveLength(0);
    });

    it('calculates synergy multiplier based on overlap', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 2, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      const synergies = influence.detectSynergies('world-1');
      if (synergies.length > 0) {
        const synergy = synergies[0];
        if (synergy !== undefined) {
          expect(synergy.multiplier).toBeGreaterThan(1.0);
        }
      }
    });

    it('does not detect synergy when zones do not overlap', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 100, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 10.0);
      influence.setInfluenceRadius('entity-2', 10.0);

      const synergies = influence.detectSynergies('world-1');
      expect(synergies).toHaveLength(0);
    });
  });

  describe('getInfluenceMap', () => {
    it('returns map with all zones in world', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 10, y: 0, z: 0 }, 'HOSTILE');

      const map = influence.getInfluenceMap('world-1', 'region-1');
      expect(map.zones).toHaveLength(2);
    });

    it('includes detected conflicts in map', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      influence.detectConflicts('world-1');

      const map = influence.getInfluenceMap('world-1', 'region-1');
      expect(map.conflicts.length).toBeGreaterThan(0);
    });

    it('includes detected synergies in map', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      influence.detectSynergies('world-1');

      const map = influence.getInfluenceMap('world-1', 'region-1');
      expect(map.synergies.length).toBeGreaterThan(0);
    });

    it('filters zones by world ID', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-2', { x: 0, y: 0, z: 0 }, 'FRIENDLY');

      const map = influence.getInfluenceMap('world-1', 'region-1');
      expect(map.zones).toHaveLength(1);
    });
  });

  describe('getInfluenceReport', () => {
    it('returns report for registered entity', () => {
      const influence = createEntityInfluence(deps);
      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');

      const report = influence.getInfluenceReport('entity-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.entityId).toBe('entity-1');
      expect(report.zone).toBeDefined();
    });

    it('returns error for unregistered entity', () => {
      const influence = createEntityInfluence(deps);
      const result = influence.getInfluenceReport('nonexistent');
      expect(result).toBe('ENTITY_NOT_FOUND');
    });

    it('includes active conflicts in report', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'HOSTILE');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      influence.detectConflicts('world-1');

      const report = influence.getInfluenceReport('entity-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.activeConflicts.length).toBeGreaterThan(0);
    });

    it('includes active synergies in report', () => {
      const influence = createEntityInfluence(deps);

      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
      influence.registerEntity('entity-2', 'world-1', { x: 5, y: 0, z: 0 }, 'FRIENDLY');

      influence.setInfluenceRadius('entity-1', 20.0);
      influence.setInfluenceRadius('entity-2', 20.0);

      influence.detectSynergies('world-1');

      const report = influence.getInfluenceReport('entity-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.activeSynergies.length).toBeGreaterThan(0);
    });
  });

  describe('removeEntity', () => {
    it('removes registered entity', () => {
      const influence = createEntityInfluence(deps);
      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');

      const result = influence.removeEntity('entity-1');
      expect(result).toBe('OK');
    });

    it('returns error if entity not found', () => {
      const influence = createEntityInfluence(deps);
      const result = influence.removeEntity('nonexistent');
      expect(result).toBe('ENTITY_NOT_FOUND');
    });

    it('removes entity from influence map', () => {
      const influence = createEntityInfluence(deps);
      influence.registerEntity('entity-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');

      influence.removeEntity('entity-1');

      const map = influence.getInfluenceMap('world-1', 'region-1');
      expect(map.zones).toHaveLength(0);
    });

    it('allows re-registering removed entity', () => {
      const influence = createEntityInfluence(deps);
      const pos: Position = { x: 0, y: 0, z: 0 };

      influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');
      influence.removeEntity('entity-1');

      const result = influence.registerEntity('entity-1', 'world-1', pos, 'FRIENDLY');
      expect(result).toBe('OK');
    });
  });
});
