import { describe, it, expect } from 'vitest';
import { createDiplomacyEngine, DEFAULT_DIPLOMACY_CONFIG } from '../diplomacy-engine.js';
import type { DiplomacyEngineDeps } from '../diplomacy-engine.js';

function makeDeps(overrides?: Partial<DiplomacyEngineDeps>): DiplomacyEngineDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'inc-' + String(idCounter);
      },
    },
    config: { cooldownUs: 0 },
    ...overrides,
  };
}

describe('DiplomacyEngine -- actions', () => {
  it('declares friendship between two dynasties', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.performAction({
      actorId: 'alpha',
      targetId: 'beta',
      action: 'DECLARE_FRIENDSHIP',
    });
    expect(relation.state).toBe('FRIENDLY');
    expect(relation.score).toBe(20);
  });

  it('declares rivalry setting hostile state', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.performAction({
      actorId: 'alpha',
      targetId: 'beta',
      action: 'DECLARE_RIVALRY',
    });
    expect(relation.state).toBe('HOSTILE');
    expect(relation.score).toBe(-20);
  });

  it('declares war setting score to -50', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.performAction({
      actorId: 'alpha',
      targetId: 'beta',
      action: 'DECLARE_WAR',
    });
    expect(relation.state).toBe('WAR');
    expect(relation.score).toBe(-50);
  });

  it('makes peace after war', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_WAR' });
    const relation = engine.performAction({
      actorId: 'alpha',
      targetId: 'beta',
      action: 'MAKE_PEACE',
    });
    expect(relation.state).toBe('NEUTRAL');
    expect(relation.score).toBe(-25);
  });

  it('declares embargo', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.performAction({
      actorId: 'alpha',
      targetId: 'beta',
      action: 'DECLARE_EMBARGO',
    });
    expect(relation.state).toBe('EMBARGO');
  });

  it('lifts embargo', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_EMBARGO' });
    const relation = engine.performAction({
      actorId: 'alpha',
      targetId: 'beta',
      action: 'LIFT_EMBARGO',
    });
    expect(relation.state).toBe('NEUTRAL');
  });

  it('rejects self-diplomacy', () => {
    const engine = createDiplomacyEngine(makeDeps());
    expect(() =>
      engine.performAction({ actorId: 'alpha', targetId: 'alpha', action: 'DECLARE_FRIENDSHIP' }),
    ).toThrow('Cannot perform diplomatic action on self');
  });

  it('rejects non-war actions during war', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_WAR' });
    expect(() =>
      engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_FRIENDSHIP' }),
    ).toThrow('only MAKE_PEACE is allowed');
  });

  it('rejects peace when not at war', () => {
    const engine = createDiplomacyEngine(makeDeps());
    expect(() =>
      engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'MAKE_PEACE' }),
    ).toThrow('not at war');
  });

  it('rejects lifting embargo when none exists', () => {
    const engine = createDiplomacyEngine(makeDeps());
    expect(() =>
      engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'LIFT_EMBARGO' }),
    ).toThrow('No embargo to lift');
  });
});

describe('DiplomacyEngine -- cooldowns', () => {
  it('enforces cooldown between actions', () => {
    let time = 0;
    const engine = createDiplomacyEngine({
      clock: { nowMicroseconds: () => (time += 100) },
      idGenerator: { generate: () => 'x' },
      config: { cooldownUs: 1_000_000 },
    });
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_FRIENDSHIP' });
    expect(() =>
      engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_RIVALRY' }),
    ).toThrow('Cooldown period active');
  });
});

describe('DiplomacyEngine -- incidents', () => {
  it('records an incident and adjusts score', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.recordIncident({
      dynastyA: 'alpha',
      dynastyB: 'beta',
      description: 'Border skirmish',
      scoreDelta: -15,
    });
    expect(relation.score).toBe(-15);
    expect(relation.incidents).toHaveLength(1);
    expect(relation.incidents[0]?.description).toBe('Border skirmish');
  });

  it('clamps score to bounds', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.recordIncident({
      dynastyA: 'alpha',
      dynastyB: 'beta',
      description: 'Total betrayal',
      scoreDelta: -200,
    });
    expect(relation.score).toBe(-100);
  });

  it('derives HOSTILE from negative score', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.recordIncident({
      dynastyA: 'alpha',
      dynastyB: 'beta',
      description: 'Massive insult',
      scoreDelta: -50,
    });
    expect(relation.state).toBe('HOSTILE');
  });

  it('derives FRIENDLY from positive score', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.recordIncident({
      dynastyA: 'alpha',
      dynastyB: 'beta',
      description: 'Gift exchange',
      scoreDelta: 50,
    });
    expect(relation.state).toBe('FRIENDLY');
  });

  it('rejects self-incident', () => {
    const engine = createDiplomacyEngine(makeDeps());
    expect(() =>
      engine.recordIncident({
        dynastyA: 'alpha',
        dynastyB: 'alpha',
        description: 'Self',
        scoreDelta: 0,
      }),
    ).toThrow('Cannot record incident with self');
  });
});

describe('DiplomacyEngine -- queries', () => {
  it('gets relation between two dynasties', () => {
    const engine = createDiplomacyEngine(makeDeps());
    const relation = engine.getRelation('alpha', 'beta');
    expect(relation.state).toBe('NEUTRAL');
    expect(relation.score).toBe(0);
  });

  it('returns same relation regardless of order', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_FRIENDSHIP' });
    const r1 = engine.getRelation('alpha', 'beta');
    const r2 = engine.getRelation('beta', 'alpha');
    expect(r1.score).toBe(r2.score);
    expect(r1.state).toBe(r2.state);
  });

  it('lists relations for a dynasty', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_FRIENDSHIP' });
    engine.performAction({ actorId: 'alpha', targetId: 'gamma', action: 'DECLARE_RIVALRY' });
    const list = engine.listRelations('alpha');
    expect(list).toHaveLength(2);
  });

  it('gets score for a pair', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_FRIENDSHIP' });
    expect(engine.getScore('alpha', 'beta')).toBe(20);
  });

  it('returns zero for unknown pair', () => {
    const engine = createDiplomacyEngine(makeDeps());
    expect(engine.getScore('unknown1', 'unknown2')).toBe(0);
  });
});

describe('DiplomacyEngine -- decay', () => {
  it('decays positive scores toward zero', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_FRIENDSHIP' });
    engine.decayTick();
    const score = engine.getScore('alpha', 'beta');
    expect(score).toBe(19);
  });

  it('decays negative scores toward zero', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_RIVALRY' });
    engine.decayTick();
    const score = engine.getScore('alpha', 'beta');
    expect(score).toBe(-19);
  });

  it('does not decay locked states (WAR, EMBARGO, ALLIED)', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'alpha', targetId: 'beta', action: 'DECLARE_WAR' });
    engine.decayTick();
    const score = engine.getScore('alpha', 'beta');
    expect(score).toBe(-50);
  });

  it('does not overshoot zero during decay', () => {
    const engine = createDiplomacyEngine(
      makeDeps({ config: { cooldownUs: 0, decayRatePerTick: 100 } }),
    );
    engine.recordIncident({
      dynastyA: 'alpha',
      dynastyB: 'beta',
      description: 'Minor',
      scoreDelta: 5,
    });
    engine.decayTick();
    expect(engine.getScore('alpha', 'beta')).toBe(0);
  });
});

describe('DiplomacyEngine -- stats', () => {
  it('reports correct stats', () => {
    const engine = createDiplomacyEngine(makeDeps());
    engine.performAction({ actorId: 'a', targetId: 'b', action: 'DECLARE_FRIENDSHIP' });
    engine.performAction({ actorId: 'c', targetId: 'd', action: 'DECLARE_WAR' });
    engine.performAction({ actorId: 'e', targetId: 'f', action: 'DECLARE_EMBARGO' });
    const stats = engine.getStats();
    expect(stats.totalRelations).toBe(3);
    expect(stats.friendlyCount).toBe(1);
    expect(stats.warCount).toBe(1);
    expect(stats.embargoCount).toBe(1);
  });

  it('exports default config', () => {
    expect(DEFAULT_DIPLOMACY_CONFIG.maxScore).toBe(100);
    expect(DEFAULT_DIPLOMACY_CONFIG.minScore).toBe(-100);
  });
});
