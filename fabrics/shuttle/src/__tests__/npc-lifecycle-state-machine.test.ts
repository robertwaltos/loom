import { describe, it, expect, beforeEach } from 'vitest';
import {
  canTransitionLifecycle,
  validateLifecycleTransition,
  transitionLifecycle,
  getAgingOnsetAge,
  getCriticalOnsetAge,
  computeExpectedLifecycleState,
  isTerminalLifecycleState,
  isAlive,
  AGE_THRESHOLDS,
  NpcLifecycleError,
  type NpcLifecycleRecord,
  type NpcLifecycleState,
  type NpcTier,
  type RenewalStatus,
} from '../npc-lifecycle-state-machine.js';

function makeRecord(
  overrides: Partial<NpcLifecycleRecord> = {},
): NpcLifecycleRecord {
  return {
    characterId: 1,
    displayName: 'Test NPC',
    tier: 3,
    renewalStatus: 'NOT_ELIGIBLE',
    age: 50,
    state: 'ACTIVE',
    stateEnteredAt: '2300-01-01T00:00:00Z',
    vigilDeclaredAt: null,
    dyingAt: null,
    deadAt: null,
    sealedAt: null,
    estateEnteredAuction: false,
    chronicleSealEntryId: null,
    ...overrides,
  };
}

describe('npc-lifecycle-state-machine', () => {
  describe('canTransitionLifecycle', () => {
    it('allows ACTIVE to AGING', () => {
      expect(canTransitionLifecycle('ACTIVE', 'AGING')).toBe(true);
    });

    it('allows ACTIVE to CRITICAL', () => {
      expect(canTransitionLifecycle('ACTIVE', 'CRITICAL')).toBe(true);
    });

    it('disallows ACTIVE to DEAD', () => {
      expect(canTransitionLifecycle('ACTIVE', 'DEAD')).toBe(false);
    });

    it('allows AGING to CRITICAL', () => {
      expect(canTransitionLifecycle('AGING', 'CRITICAL')).toBe(true);
    });

    it('disallows AGING to ACTIVE', () => {
      expect(canTransitionLifecycle('AGING', 'ACTIVE')).toBe(false);
    });

    it('allows CRITICAL to VIGIL_DECLARED', () => {
      expect(canTransitionLifecycle('CRITICAL', 'VIGIL_DECLARED')).toBe(true);
    });

    it('allows CRITICAL to DYING', () => {
      expect(canTransitionLifecycle('CRITICAL', 'DYING')).toBe(true);
    });

    it('allows DYING to DEAD', () => {
      expect(canTransitionLifecycle('DYING', 'DEAD')).toBe(true);
    });

    it('allows DEAD to SEALED', () => {
      expect(canTransitionLifecycle('DEAD', 'SEALED')).toBe(true);
    });

    it('SEALED has no valid transitions', () => {
      const states: ReadonlyArray<NpcLifecycleState> = [
        'ACTIVE',
        'AGING',
        'CRITICAL',
        'VIGIL_DECLARED',
        'DYING',
        'DEAD',
        'SEALED',
      ];
      for (const s of states) {
        expect(canTransitionLifecycle('SEALED', s)).toBe(false);
      }
    });
  });

  describe('validateLifecycleTransition', () => {
    it('does not throw for a valid transition', () => {
      expect(() => {
        validateLifecycleTransition(1, 'ACTIVE', 'AGING');
      }).not.toThrow();
    });

    it('throws ALREADY_SEALED for SEALED state', () => {
      try {
        validateLifecycleTransition(42, 'SEALED', 'ACTIVE');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NpcLifecycleError);
        const typed = err as NpcLifecycleError;
        expect(typed.code).toBe('ALREADY_SEALED');
        expect(typed.characterId).toBe(42);
        expect(typed.currentState).toBe('SEALED');
      }
    });

    it('throws INVALID_TRANSITION for bad transition', () => {
      try {
        validateLifecycleTransition(10, 'ACTIVE', 'DEAD');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NpcLifecycleError);
        const typed = err as NpcLifecycleError;
        expect(typed.code).toBe('INVALID_TRANSITION');
      }
    });
  });

  describe('transitionLifecycle', () => {
    it('transitions ACTIVE to AGING', () => {
      const record = makeRecord({ state: 'ACTIVE' });
      const next = transitionLifecycle(record, 'AGING', '2300-06-01T00:00:00Z');
      expect(next.state).toBe('AGING');
      expect(next.stateEnteredAt).toBe('2300-06-01T00:00:00Z');
    });

    it('sets vigilDeclaredAt when transitioning to VIGIL_DECLARED', () => {
      const record = makeRecord({ state: 'CRITICAL' });
      const now = '2300-06-15T00:00:00Z';
      const next = transitionLifecycle(record, 'VIGIL_DECLARED', now);
      expect(next.vigilDeclaredAt).toBe(now);
    });

    it('sets dyingAt when transitioning to DYING', () => {
      const record = makeRecord({ state: 'VIGIL_DECLARED' });
      const now = '2300-07-01T00:00:00Z';
      const next = transitionLifecycle(record, 'DYING', now);
      expect(next.dyingAt).toBe(now);
    });

    it('sets deadAt when transitioning to DEAD', () => {
      const record = makeRecord({ state: 'DYING' });
      const now = '2300-07-10T00:00:00Z';
      const next = transitionLifecycle(record, 'DEAD', now);
      expect(next.deadAt).toBe(now);
    });

    it('sets sealedAt when transitioning to SEALED', () => {
      const record = makeRecord({ state: 'DEAD' });
      const now = '2300-08-01T00:00:00Z';
      const next = transitionLifecycle(record, 'SEALED', now);
      expect(next.sealedAt).toBe(now);
    });

    it('throws on invalid transition', () => {
      const record = makeRecord({ state: 'ACTIVE' });
      expect(() => {
        transitionLifecycle(record, 'DEAD', '2300-01-01T00:00:00Z');
      }).toThrow(NpcLifecycleError);
    });
  });

  describe('getAgingOnsetAge', () => {
    it('returns 100 for tier 3', () => {
      expect(getAgingOnsetAge(3, 'NOT_ELIGIBLE')).toBe(100);
    });

    it('returns 150 for tier 2 enrolled', () => {
      expect(getAgingOnsetAge(2, 'ENROLLED')).toBe(150);
    });

    it('returns 60 for tier 2 refused', () => {
      expect(getAgingOnsetAge(2, 'REFUSED')).toBe(60);
    });

    it('returns Infinity for tier 4', () => {
      expect(getAgingOnsetAge(4, 'NOT_ELIGIBLE')).toBe(Infinity);
    });
  });

  describe('getCriticalOnsetAge', () => {
    it('returns 150 for tier 3', () => {
      expect(getCriticalOnsetAge(3, 'NOT_ELIGIBLE')).toBe(150);
    });

    it('returns 220 for tier 2 enrolled', () => {
      expect(getCriticalOnsetAge(2, 'ENROLLED')).toBe(220);
    });

    it('returns 80 for tier 2 refused', () => {
      expect(getCriticalOnsetAge(2, 'REFUSED')).toBe(80);
    });

    it('returns Infinity for tier 4', () => {
      expect(getCriticalOnsetAge(4, 'NOT_ELIGIBLE')).toBe(Infinity);
    });
  });

  describe('computeExpectedLifecycleState', () => {
    it('returns ACTIVE for young tier 3', () => {
      expect(computeExpectedLifecycleState(50, 3, 'NOT_ELIGIBLE')).toBe('ACTIVE');
    });

    it('returns AGING for tier 3 at age 120', () => {
      expect(computeExpectedLifecycleState(120, 3, 'NOT_ELIGIBLE')).toBe('AGING');
    });

    it('returns CRITICAL for tier 3 at age 160', () => {
      expect(computeExpectedLifecycleState(160, 3, 'NOT_ELIGIBLE')).toBe('CRITICAL');
    });

    it('returns ACTIVE for tier 4 at any age', () => {
      expect(computeExpectedLifecycleState(9999, 4, 'NOT_ELIGIBLE')).toBe('ACTIVE');
    });

    it('returns AGING for tier 2 refused at age 70', () => {
      expect(computeExpectedLifecycleState(70, 2, 'REFUSED')).toBe('AGING');
    });

    it('returns CRITICAL for tier 2 refused at age 80', () => {
      expect(computeExpectedLifecycleState(80, 2, 'REFUSED')).toBe('CRITICAL');
    });
  });

  describe('isTerminalLifecycleState', () => {
    it('returns true for SEALED', () => {
      expect(isTerminalLifecycleState('SEALED')).toBe(true);
    });

    it('returns false for DEAD', () => {
      expect(isTerminalLifecycleState('DEAD')).toBe(false);
    });

    it('returns false for ACTIVE', () => {
      expect(isTerminalLifecycleState('ACTIVE')).toBe(false);
    });
  });

  describe('isAlive', () => {
    it('returns true for ACTIVE', () => {
      expect(isAlive('ACTIVE')).toBe(true);
    });

    it('returns true for VIGIL_DECLARED', () => {
      expect(isAlive('VIGIL_DECLARED')).toBe(true);
    });

    it('returns true for DYING', () => {
      expect(isAlive('DYING')).toBe(true);
    });

    it('returns false for DEAD', () => {
      expect(isAlive('DEAD')).toBe(false);
    });

    it('returns false for SEALED', () => {
      expect(isAlive('SEALED')).toBe(false);
    });
  });

  describe('AGE_THRESHOLDS', () => {
    it('contains expected threshold values', () => {
      expect(AGE_THRESHOLDS.TIER_3_AGING_ONSET).toBe(100);
      expect(AGE_THRESHOLDS.TIER_3_CRITICAL_ONSET).toBe(150);
      expect(AGE_THRESHOLDS.TIER_2_AGING_ONSET).toBe(150);
      expect(AGE_THRESHOLDS.TIER_2_CRITICAL_ONSET).toBe(220);
      expect(AGE_THRESHOLDS.TIER_2_REFUSED_AGING_ONSET).toBe(60);
      expect(AGE_THRESHOLDS.TIER_2_REFUSED_CRITICAL_ONSET).toBe(80);
    });
  });
});
