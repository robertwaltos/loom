import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNPCInstance,
  applyDrift,
  sealInstance,
  getNPCInstance,
  instanceKey,
} from '../npc-instance-system.js';
import type {
  NPCInstance,
  NPCInstanceState,
  SealedNPCRecord,
} from '../npc-instance-system.js';
import type { HistoricalPressureVector } from '../historical-pressure-vectors.js';

function makePressureVector(
  overrides: Partial<HistoricalPressureVector> = {},
): HistoricalPressureVector {
  const now = new Date('2350-01-01T00:00:00Z');
  return {
    worldId: 'world-1',
    betrayalWeight: 0,
    conflictWeight: 0,
    prosperityWeight: 0,
    ascendancySignatureWeight: 0,
    calculatedAt: now,
    expiresAt: new Date(now.getTime() + 90 * 86_400_000),
    sourceEntryCount: 0,
    dominantTheme: 'SILENCE',
    ...overrides,
  };
}

describe('npc-instance-system', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2350-01-01T00:00:00Z');
  });

  describe('createNPCInstance', () => {
    it('should create an instance with ACTIVE state', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-1',
        npcId: 100,
        worldId: 'world-1',
        createdAt: now,
      });
      expect(instance.state).toBe('ACTIVE');
    });

    it('should start with cooperationLevel 100', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-2',
        npcId: 101,
        worldId: 'world-2',
        createdAt: now,
      });
      expect(instance.cooperationLevel).toBe(100);
    });

    it('should start with driftScore 0', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-3',
        npcId: 102,
        worldId: 'world-3',
        createdAt: now,
      });
      expect(instance.driftScore).toBe(0.0);
    });

    it('should store correct npcId and worldId', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-4',
        npcId: 200,
        worldId: 'world-42',
        createdAt: now,
      });
      expect(instance.npcId).toBe(200);
      expect(instance.worldId).toBe('world-42');
    });

    it('should not have sealedAt or lastDriftAppliedAt', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-5',
        npcId: 300,
        worldId: 'world-1',
        createdAt: now,
      });
      expect(instance.sealedAt).toBeUndefined();
      expect(instance.lastDriftAppliedAt).toBeUndefined();
    });
  });

  describe('applyDrift', () => {
    it('should not modify a SEALED instance', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-s',
        npcId: 50,
        worldId: 'world-1',
        createdAt: now,
      });
      const sealed: NPCInstance = { ...instance, state: 'SEALED', sealedAt: now };
      const vector = makePressureVector({ betrayalWeight: 100 });
      const result = applyDrift(sealed, vector, now);
      expect(result.state).toBe('SEALED');
      expect(result.cooperationLevel).toBe(100);
    });

    it('should decrease cooperation when betrayalWeight is high', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-d1',
        npcId: 60,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({ betrayalWeight: 50 });
      const result = applyDrift(instance, vector, now);
      // impact = 50/100 = 0.5, decrease = round(0.5*15) = 8
      expect(result.cooperationLevel).toBe(92);
    });

    it('should not drop cooperation below 0', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-d2',
        npcId: 61,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({ betrayalWeight: 100 });
      // Apply multiple times
      let current = instance;
      for (let i = 0; i < 10; i++) {
        current = applyDrift(current, vector, now);
      }
      expect(current.cooperationLevel).toBeGreaterThanOrEqual(0);
    });

    it('should increase driftScore with conflict and ascendancy weights', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-d3',
        npcId: 62,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({
        conflictWeight: 40,
        ascendancySignatureWeight: 60,
      });
      const result = applyDrift(instance, vector, now);
      // driftIncrease = (40+60)/200 = 0.5
      expect(result.driftScore).toBe(0.5);
    });

    it('should cap driftScore at 1.0', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-d4',
        npcId: 63,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({
        conflictWeight: 100,
        ascendancySignatureWeight: 100,
      });
      let current = instance;
      for (let i = 0; i < 5; i++) {
        current = applyDrift(current, vector, now);
      }
      expect(current.driftScore).toBeLessThanOrEqual(1.0);
    });

    it('should transition to DRIFTING when drift > 0.3', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-d5',
        npcId: 64,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({
        conflictWeight: 80,
        ascendancySignatureWeight: 80,
      });
      const result = applyDrift(instance, vector, now);
      expect(result.state).toBe('DRIFTING');
    });

    it('should transition to UNCOOPERATIVE when cooperation < 30', () => {
      let instance = createNPCInstance({
        instanceId: 'inst-d6',
        npcId: 65,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({ betrayalWeight: 100 });
      for (let i = 0; i < 10; i++) {
        instance = applyDrift(instance, vector, now);
      }
      expect(instance.state).toBe('UNCOOPERATIVE');
    });

    it('should set lastDriftAppliedAt', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-d7',
        npcId: 66,
        worldId: 'world-1',
        createdAt: now,
      });
      const later = new Date(now.getTime() + 1000);
      const vector = makePressureVector();
      const result = applyDrift(instance, vector, later);
      expect(result.lastDriftAppliedAt).toBeDefined();
      if (result.lastDriftAppliedAt) {
        expect(result.lastDriftAppliedAt.getTime()).toBe(later.getTime());
      }
    });
  });

  describe('sealInstance', () => {
    it('should set state to SEALED', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-seal-1',
        npcId: 70,
        worldId: 'world-1',
        createdAt: now,
      });
      const { sealed } = sealInstance(instance, 'NPC_DEATH', now);
      expect(sealed.state).toBe('SEALED');
    });

    it('should set sealedAt on the instance', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-seal-2',
        npcId: 71,
        worldId: 'world-1',
        createdAt: now,
      });
      const sealTime = new Date(now.getTime() + 5000);
      const { sealed } = sealInstance(instance, 'WORLD_DESTROYED', sealTime);
      expect(sealed.sealedAt).toBeDefined();
      if (sealed.sealedAt) {
        expect(sealed.sealedAt.getTime()).toBe(sealTime.getTime());
      }
    });

    it('should produce a SealedNPCRecord with correct cause', () => {
      const instance = createNPCInstance({
        instanceId: 'inst-seal-3',
        npcId: 72,
        worldId: 'world-1',
        createdAt: now,
      });
      const { record } = sealInstance(instance, 'MANUAL_SEAL', now);
      expect(record.causeOfSealing).toBe('MANUAL_SEAL');
    });

    it('should capture final drift and cooperation in the record', () => {
      let instance = createNPCInstance({
        instanceId: 'inst-seal-4',
        npcId: 73,
        worldId: 'world-1',
        createdAt: now,
      });
      const vector = makePressureVector({ betrayalWeight: 50, conflictWeight: 60 });
      instance = applyDrift(instance, vector, now);
      const { record } = sealInstance(instance, 'NPC_DEATH', now);
      expect(record.finalDriftScore).toBe(instance.driftScore);
      expect(record.finalCooperationLevel).toBe(instance.cooperationLevel);
    });
  });

  describe('getNPCInstance', () => {
    it('should return null when store is empty', () => {
      const store = new Map<string, NPCInstance>();
      expect(getNPCInstance(store, 1, 'world-1')).toBeNull();
    });

    it('should return the instance when found', () => {
      const store = new Map<string, NPCInstance>();
      const instance = createNPCInstance({
        instanceId: 'inst-get-1',
        npcId: 80,
        worldId: 'world-5',
        createdAt: now,
      });
      store.set(instanceKey(80, 'world-5'), instance);
      const found = getNPCInstance(store, 80, 'world-5');
      expect(found).not.toBeNull();
      if (found) {
        expect(found.instanceId).toBe('inst-get-1');
      }
    });

    it('should return null for a different worldId', () => {
      const store = new Map<string, NPCInstance>();
      const instance = createNPCInstance({
        instanceId: 'inst-get-2',
        npcId: 81,
        worldId: 'world-5',
        createdAt: now,
      });
      store.set(instanceKey(81, 'world-5'), instance);
      expect(getNPCInstance(store, 81, 'world-6')).toBeNull();
    });
  });

  describe('instanceKey', () => {
    it('should produce a colon-separated key', () => {
      expect(instanceKey(42, 'world-7')).toBe('42:world-7');
    });

    it('should produce unique keys for different npc/world combos', () => {
      const k1 = instanceKey(1, 'world-a');
      const k2 = instanceKey(2, 'world-a');
      const k3 = instanceKey(1, 'world-b');
      expect(k1).not.toBe(k2);
      expect(k1).not.toBe(k3);
    });
  });
});
