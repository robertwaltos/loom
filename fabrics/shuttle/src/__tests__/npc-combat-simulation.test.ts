import { describe, it, expect, vi } from 'vitest';
import {
  createNpcCombatSystem,
  THREAT_DECAY_RATE,
  MAX_THREATS_PER_NPC,
  ABILITY_COOLDOWN_US,
  RETREAT_HEALTH_THRESHOLD,
} from '../npc-combat.js';

function makeDeps() {
  let time = BigInt(0);
  let seq = 0;
  return {
    clock: { nowMicroseconds: () => (time += BigInt(1_000_000)) },
    idGenerator: { next: () => `id-${++seq}` },
  };
}

describe('npc-combat simulation', () => {
  // ── constants ─────────────────────────────────────────────────────

  it('THREAT_DECAY_RATE = 0.1', () => { expect(THREAT_DECAY_RATE).toBeCloseTo(0.1); });
  it('MAX_THREATS_PER_NPC = 10', () => { expect(MAX_THREATS_PER_NPC).toBe(10); });
  it('ABILITY_COOLDOWN_US = 1_000_000', () => { expect(ABILITY_COOLDOWN_US).toBe(1_000_000); });
  it('RETREAT_HEALTH_THRESHOLD = 0.25', () => { expect(RETREAT_HEALTH_THRESHOLD).toBeCloseTo(0.25); });

  // ── registerCombatant ─────────────────────────────────────────────

  describe('registerCombatant', () => {
    it('registers an NPC and getCombatant returns it', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 10);
      const combatant = sys.getCombatant('npc-1');
      expect(combatant).toBeDefined();
      expect(combatant!.npcId).toBe('npc-1');
    });

    it('registering twice does not replace the previous combatant', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 10);
      sys.registerCombatant('npc-1', 'defensive', 200, 5);
      const combatant = sys.getCombatant('npc-1');
      expect(combatant!.style).toBe('aggressive'); // first registration wins
    });

    it('getCombatant returns undefined for unknown npc', () => {
      const sys = createNpcCombatSystem(makeDeps());
      expect(sys.getCombatant('__nobody__')).toBeUndefined();
    });
  });

  // ── addAbility ────────────────────────────────────────────────────

  describe('addAbility', () => {
    it('adds an ability and getAbilities returns it', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 10);
      sys.addAbility('npc-1', 'fireball', 30, 20, 1_000_000);
      const abilities = sys.getAbilities('npc-1');
      expect(abilities.length).toBe(1);
      expect(abilities[0].name).toBe('fireball');
    });

    it('getAbilities returns empty array when no abilities', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 0);
      expect(sys.getAbilities('npc-1')).toHaveLength(0);
    });
  });

  // ── evaluateThreat ────────────────────────────────────────────────

  describe('evaluateThreat', () => {
    it('adds a threat entry for the NPC', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 10);
      sys.registerCombatant('player-1', 'defensive', 100, 0);
      sys.evaluateThreat('npc-1', 'player-1', 50);
      const threats = sys.getThreatsFor('npc-1');
      expect(threats.length).toBe(1);
      expect(threats[0]!.targetId).toBe('player-1');
    });

    it('does not exceed MAX_THREATS_PER_NPC entries', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'passive', 100, 0);
      for (let i = 0; i < MAX_THREATS_PER_NPC + 5; i++) {
        sys.evaluateThreat('npc-1', `target-${i}`, 10);
      }
      expect(sys.getThreatsFor('npc-1').length).toBeLessThanOrEqual(MAX_THREATS_PER_NPC);
    });
  });

  // ── applyDamage ───────────────────────────────────────────────────

  describe('applyDamage', () => {
    it('reduces health by (rawDamage - armor)', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 10);
      sys.applyDamage('npc-1', 30); // effective = 30 - 10 = 20
      const combatant = sys.getCombatant('npc-1');
      expect(combatant!.health).toBe(80);
    });

    it('damage cannot reduce health below 0', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 0);
      sys.applyDamage('npc-1', 200);
      const combatant = sys.getCombatant('npc-1');
      expect(combatant!.health).toBe(0);
    });

    it('armor absorbs up to full damage (effective never negative)', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 50);
      sys.applyDamage('npc-1', 10); // armor=50 > 10, effective=0
      const combatant = sys.getCombatant('npc-1');
      expect(combatant!.health).toBe(100);
    });
  });

  // ── processRetreat ────────────────────────────────────────────────

  describe('processRetreat', () => {
    it('triggers retreat when health ratio <= 0.25', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 0);
      sys.applyDamage('npc-1', 75); // health = 25, ratio = 0.25
      const result = sys.processRetreat('npc-1');
      expect(result).toBeDefined();
      expect(result!.state).toBe('retreating');
    });

    it('does not retreat when health is above threshold', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 0);
      sys.applyDamage('npc-1', 50); // health = 50, ratio = 0.5
      const action = sys.processRetreat('npc-1');
      expect(action.action).not.toBe('retreat');
    });
  });

  // ── decayThreats ──────────────────────────────────────────────────

  describe('decayThreats', () => {
    it('reduces threat values by THREAT_DECAY_RATE factor', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 0);
      sys.registerCombatant('target-1', 'defensive', 100, 0);
      sys.evaluateThreat('npc-1', 'target-1', 100);
      sys.decayThreats('npc-1');
      const threats = sys.getThreatsFor('npc-1');
      expect(threats[0]!.threatValue).toBeCloseTo(90); // 100 * (1 - 0.1)
    });

    it('removes threats that decay below 0.01', () => {
      const sys = createNpcCombatSystem(makeDeps());
      sys.registerCombatant('npc-1', 'aggressive', 100, 0);
      sys.evaluateThreat('npc-1', 'target-1', 0.001);
      sys.decayThreats('npc-1');
      // 0.001 * 0.9 = 0.0009 < 0.01, should be removed
      expect(sys.getThreatsFor('npc-1')).toHaveLength(0);
    });
  });

  // ── getCombatStats ────────────────────────────────────────────────

  it('getCombatStats returns consistent aggregates', () => {
    const sys = createNpcCombatSystem(makeDeps());
    sys.registerCombatant('npc-1', 'aggressive', 100, 0);
    sys.registerCombatant('npc-2', 'defensive', 200, 10);
    const stats = sys.getStats();
    expect(stats.totalCombatants).toBe(2);
  });
});
