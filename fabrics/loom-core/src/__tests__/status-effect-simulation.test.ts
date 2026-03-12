/**
 * Status Effect System — Simulation Tests
 *
 * Exercises buffs, debuffs, stacking behaviors (REPLACE/EXTEND/STACK/REFRESH),
 * immunity grants/revocation, tick effects, expiry cleanup, active effect queries,
 * status reports, and bulk clearing operations.
 */

import { describe, it, expect } from 'vitest';
import {
  createStatusEffectSystem,
  applyEffect,
  removeEffect,
  grantImmunity,
  revokeImmunity,
  tickEffects,
  getActiveEffects,
  getStatusReport,
  clearAllEffects,
  clearAllImmunities,
  removeEffectsByType,
} from '../status-effect.js';
import type { StatusEffectState, EffectType, StatusEffect } from '../status-effect.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeDeps() {
  let time = 1_000_000n;
  let idCounter = 0;
  return {
    clock: { nowUs: () => time },
    idGen: { generate: () => `eff-${++idCounter}` },
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    advance: (us: bigint) => { time += us; },
    setTime: (us: bigint) => { time = us; },
  };
}

function withPoison(state: StatusEffectState, deps: ReturnType<typeof makeDeps>) {
  return applyEffect(
    state, 'caster', 'target', 'POISON',
    10n, 5_000_000n, 'STACK', 1_000_000n,
  );
}

// ── Apply Effect ────────────────────────────────────────────────

describe('Status Effect System', () => {
  describe('applyEffect', () => {
    it('applies an effect with correct fields', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const result = applyEffect(
        state, 'caster', 'target', 'POISON',
        10n, 5_000_000n, 'STACK', 1_000_000n,
      );
      expect(typeof result).toBe('object');
      const eff = result as StatusEffect;
      expect(eff.effectId).toBe('eff-1');
      expect(eff.effectType).toBe('POISON');
      expect(eff.magnitude).toBe(10n);
      expect(eff.durationUs).toBe(5_000_000n);
      expect(eff.stackBehavior).toBe('STACK');
      expect(eff.tickIntervalUs).toBe(1_000_000n);
      expect(eff.sourceEntityId).toBe('caster');
      expect(eff.targetEntityId).toBe('target');
      expect(eff.appliedAt).toBe(1_000_000n);
      expect(eff.expiresAt).toBe(6_000_000n);
    });

    it('rejects negative magnitude', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const result = applyEffect(state, 'a', 'b', 'BURN', -1n, 100n, 'STACK', 10n);
      expect(result).toBe('invalid-magnitude');
    });

    it('rejects zero duration', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const result = applyEffect(state, 'a', 'b', 'BURN', 10n, 0n, 'STACK', 10n);
      expect(result).toBe('invalid-duration');
    });

    it('rejects zero tick interval', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const result = applyEffect(state, 'a', 'b', 'BURN', 10n, 100n, 'STACK', 0n);
      expect(result).toBe('invalid-tick-interval');
    });

    it('applies effects to multiple entities independently', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'src', 'e1', 'POISON', 10n, 5_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'src', 'e2', 'BURN', 20n, 5_000_000n, 'STACK', 1_000_000n);
      const e1Effects = getActiveEffects(state, 'e1');
      const e2Effects = getActiveEffects(state, 'e2');
      expect(e1Effects.length).toBe(1);
      expect(e1Effects[0].effectType).toBe('POISON');
      expect(e2Effects.length).toBe(1);
      expect(e2Effects[0].effectType).toBe('BURN');
    });
  });

  // ── Stack Behaviors ───────────────────────────────────────────

  describe('REPLACE stacking', () => {
    it('removes existing effect of same type and adds new', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'POISON', 5n, 3_000_000n, 'REPLACE', 1_000_000n);
      deps.advance(500_000n);
      applyEffect(state, 'a', 'target', 'POISON', 15n, 4_000_000n, 'REPLACE', 1_000_000n);
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(1);
      expect(active[0].magnitude).toBe(15n);
    });
  });

  describe('EXTEND stacking', () => {
    it('extends duration of existing effect', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'REGEN', 5n, 3_000_000n, 'EXTEND', 1_000_000n);
      applyEffect(state, 'a', 'target', 'REGEN', 5n, 2_000_000n, 'EXTEND', 1_000_000n);
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(1);
      // Extended duration: 3M + 2M = 5M
      expect(active[0].remainingDurationUs).toBe(5_000_000n);
    });
  });

  describe('STACK stacking', () => {
    it('keeps both effects as independent stacks', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'POISON', 5n, 3_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'a', 'target', 'POISON', 10n, 4_000_000n, 'STACK', 1_000_000n);
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(2);
      expect(active[0].stackCount).toBe(2);
      expect(active[1].stackCount).toBe(2);
    });
  });

  describe('REFRESH stacking', () => {
    it('refreshes magnitude and timing of existing effect', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'HASTE', 5n, 3_000_000n, 'REFRESH', 1_000_000n);
      deps.advance(1_000_000n);
      applyEffect(state, 'a', 'target', 'HASTE', 20n, 4_000_000n, 'REFRESH', 1_000_000n);
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(1);
      expect(active[0].magnitude).toBe(20n);
      // Remaining = expiresAt(2M + 4M) - now(2M) = 4M
      expect(active[0].remainingDurationUs).toBe(4_000_000n);
    });
  });

  // ── Immunity ──────────────────────────────────────────────────

  describe('immunity', () => {
    it('blocks effects when immune', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      grantImmunity(state, 'target', 'FREEZE', 10_000_000n);
      const result = applyEffect(state, 'a', 'target', 'FREEZE', 10n, 5_000_000n, 'STACK', 1_000_000n);
      expect(result).toBe('immune-to-effect');
    });

    it('allows effects of different type', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      grantImmunity(state, 'target', 'FREEZE', 10_000_000n);
      const result = applyEffect(state, 'a', 'target', 'BURN', 10n, 5_000_000n, 'STACK', 1_000_000n);
      expect(typeof result).toBe('object');
    });

    it('immunity expires over time', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      grantImmunity(state, 'target', 'STUN', 2_000_000n);
      deps.advance(2_000_001n);
      const result = applyEffect(state, 'a', 'target', 'STUN', 5n, 1_000_000n, 'STACK', 500_000n);
      expect(typeof result).toBe('object');
    });

    it('rejects immunity with zero/negative duration', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const result = grantImmunity(state, 'target', 'POISON', 0n);
      expect(result).toBe('invalid-duration');
    });

    it('returns immunity record on success', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const result = grantImmunity(state, 'target', 'SLOW', 5_000_000n);
      expect(typeof result).toBe('object');
      const imm = result as { entityId: string; effectType: string; expiresAt: bigint };
      expect(imm.entityId).toBe('target');
      expect(imm.effectType).toBe('SLOW');
      expect(imm.expiresAt).toBe(6_000_000n);
    });

    it('revokeImmunity removes immunity of given type', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      grantImmunity(state, 'target', 'FREEZE', 10_000_000n);
      revokeImmunity(state, 'target', 'FREEZE');
      const result = applyEffect(state, 'a', 'target', 'FREEZE', 10n, 5_000_000n, 'STACK', 1_000_000n);
      expect(typeof result).toBe('object');
    });
  });

  // ── Remove Effect ─────────────────────────────────────────────

  describe('removeEffect', () => {
    it('removes a specific effect by ID', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const eff = applyEffect(state, 'a', 'target', 'POISON', 10n, 5_000_000n, 'STACK', 1_000_000n) as StatusEffect;
      const result = removeEffect(state, 'target', eff.effectId);
      expect(result).toBe('ok');
      expect(getActiveEffects(state, 'target').length).toBe(0);
    });

    it('returns error for unknown entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      expect(removeEffect(state, 'ghost', 'eff-1')).toBe('entity-not-found');
    });

    it('returns error for unknown effect ID', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'BURN', 10n, 5_000_000n, 'STACK', 1_000_000n);
      expect(removeEffect(state, 'target', 'wrong-id')).toBe('effect-not-found');
    });
  });

  // ── Tick Effects ──────────────────────────────────────────────

  describe('tickEffects', () => {
    it('generates tick results for active effects', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'caster', 'target', 'POISON', 10n, 5_000_000n, 'STACK', 1_000_000n);
      deps.advance(1_000_000n);
      const results = tickEffects(state, 'target');
      expect(Array.isArray(results)).toBe(true);
      const ticks = results as ReadonlyArray<{ effectType: string; magnitude: bigint }>;
      expect(ticks.length).toBe(1);
      expect(ticks[0].effectType).toBe('POISON');
      expect(ticks[0].magnitude).toBe(10n);
    });

    it('does not tick before interval elapses', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'caster', 'target', 'BURN', 5n, 5_000_000n, 'STACK', 2_000_000n);
      // First tick at application
      const first = tickEffects(state, 'target') as ReadonlyArray<unknown>;
      expect(first.length).toBe(1);
      // Advance less than interval
      deps.advance(1_000_000n);
      const second = tickEffects(state, 'target') as ReadonlyArray<unknown>;
      expect(second.length).toBe(0);
      // Advance past interval
      deps.advance(1_000_001n);
      const third = tickEffects(state, 'target') as ReadonlyArray<unknown>;
      expect(third.length).toBe(1);
    });

    it('returns empty array for entity with no effects', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const results = tickEffects(state, 'nobody');
      expect(results).toEqual([]);
    });

    it('cleans expired effects during tick', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'SHIELD', 20n, 1_000_000n, 'STACK', 500_000n);
      deps.advance(2_000_000n); // past expiry
      const results = tickEffects(state, 'target') as ReadonlyArray<unknown>;
      expect(results.length).toBe(0);
      expect(getActiveEffects(state, 'target').length).toBe(0);
    });
  });

  // ── Active Effects Query ──────────────────────────────────────

  describe('getActiveEffects', () => {
    it('returns active effects with remaining duration', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'STRENGTH', 30n, 10_000_000n, 'STACK', 2_000_000n);
      deps.advance(3_000_000n);
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(1);
      expect(active[0].effectType).toBe('STRENGTH');
      expect(active[0].magnitude).toBe(30n);
      expect(active[0].remainingDurationUs).toBe(7_000_000n);
    });

    it('returns empty for unknown entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      expect(getActiveEffects(state, 'nobody')).toEqual([]);
    });

    it('reflects correct stackCount for stacked effects', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'WEAKNESS', 5n, 10_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'a', 'target', 'WEAKNESS', 8n, 10_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'a', 'target', 'WEAKNESS', 3n, 10_000_000n, 'STACK', 1_000_000n);
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(3);
      // All WEAKNESS effects should report stackCount = 3
      for (const eff of active) {
        expect(eff.stackCount).toBe(3);
      }
    });
  });

  // ── Status Report ─────────────────────────────────────────────

  describe('getStatusReport', () => {
    it('returns comprehensive entity status', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'REGEN', 5n, 10_000_000n, 'STACK', 2_000_000n);
      applyEffect(state, 'a', 'target', 'SHIELD', 20n, 10_000_000n, 'STACK', 2_000_000n);
      grantImmunity(state, 'target', 'POISON', 5_000_000n);
      const report = getStatusReport(state, 'target');
      expect(report.entityId).toBe('target');
      expect(report.totalEffects).toBe(2);
      expect(report.activeEffects.length).toBe(2);
      expect(report.immunities.length).toBe(1);
      expect(report.immunities[0].effectType).toBe('POISON');
      expect(report.generatedAt).toBe(1_000_000n);
    });

    it('excludes expired immunities from report', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      grantImmunity(state, 'target', 'STUN', 1_000_000n);
      deps.advance(2_000_000n);
      const report = getStatusReport(state, 'target');
      expect(report.immunities.length).toBe(0);
    });

    it('reports empty for entity with no effects', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      const report = getStatusReport(state, 'clean');
      expect(report.totalEffects).toBe(0);
      expect(report.activeEffects.length).toBe(0);
      expect(report.immunities.length).toBe(0);
    });
  });

  // ── Bulk Operations ───────────────────────────────────────────

  describe('clearAllEffects', () => {
    it('removes all effects from an entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'POISON', 5n, 10_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'a', 'target', 'BURN', 10n, 10_000_000n, 'STACK', 1_000_000n);
      expect(clearAllEffects(state, 'target')).toBe('ok');
      expect(getActiveEffects(state, 'target').length).toBe(0);
    });

    it('returns error for unknown entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      expect(clearAllEffects(state, 'ghost')).toBe('entity-not-found');
    });
  });

  describe('clearAllImmunities', () => {
    it('removes all immunities from an entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      grantImmunity(state, 'target', 'FREEZE', 10_000_000n);
      grantImmunity(state, 'target', 'STUN', 10_000_000n);
      expect(clearAllImmunities(state, 'target')).toBe('ok');
      // Should now be able to apply FREEZE
      const result = applyEffect(state, 'a', 'target', 'FREEZE', 10n, 5_000_000n, 'STACK', 1_000_000n);
      expect(typeof result).toBe('object');
    });

    it('returns error for unknown entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      expect(clearAllImmunities(state, 'ghost')).toBe('entity-not-found');
    });
  });

  describe('removeEffectsByType', () => {
    it('removes all effects of a specific type', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      applyEffect(state, 'a', 'target', 'POISON', 5n, 10_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'a', 'target', 'POISON', 8n, 10_000_000n, 'STACK', 1_000_000n);
      applyEffect(state, 'a', 'target', 'BURN', 10n, 10_000_000n, 'STACK', 1_000_000n);
      expect(removeEffectsByType(state, 'target', 'POISON')).toBe('ok');
      const active = getActiveEffects(state, 'target');
      expect(active.length).toBe(1);
      expect(active[0].effectType).toBe('BURN');
    });

    it('returns error for unknown entity', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      expect(removeEffectsByType(state, 'ghost', 'POISON')).toBe('entity-not-found');
    });
  });

  // ── All 10 Effect Types ───────────────────────────────────────

  describe('all effect types', () => {
    const allTypes: EffectType[] = [
      'POISON', 'BURN', 'FREEZE', 'STUN', 'SLOW',
      'HASTE', 'REGEN', 'SHIELD', 'WEAKNESS', 'STRENGTH',
    ];

    it('accepts all 10 effect types', () => {
      const deps = makeDeps();
      const state = createStatusEffectSystem(deps);
      for (const type of allTypes) {
        const result = applyEffect(state, 'src', `target-${type}`, type, 10n, 5_000_000n, 'STACK', 1_000_000n);
        expect(typeof result).toBe('object');
        expect((result as StatusEffect).effectType).toBe(type);
      }
    });
  });
});
