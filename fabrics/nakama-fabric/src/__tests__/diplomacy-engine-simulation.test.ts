import { beforeEach, describe, expect, it } from 'vitest';
import { createDiplomacyEngine, type DiplomacyEngineDeps } from '../diplomacy-engine.js';

describe('diplomacy-engine simulation', () => {
  let nowUs: number;
  let idCounter: number;

  const advance = (deltaUs = 1_000_000): void => {
    nowUs += deltaUs;
  };

  const deps = (overrides?: Partial<DiplomacyEngineDeps>): DiplomacyEngineDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return `sim-diplomacy-${idCounter}`;
      },
    },
    config: { cooldownUs: 0 },
    ...overrides,
  });

  beforeEach(() => {
    nowUs = 100_000;
    idCounter = 0;
  });

  it('runs a bilateral arc from friendship to alliance then breakdown into hostility', () => {
    const engine = createDiplomacyEngine(deps());

    const friendship = engine.performAction({
      actorId: 'house-a',
      targetId: 'house-b',
      action: 'DECLARE_FRIENDSHIP',
    });
    expect(friendship.state).toBe('FRIENDLY');
    expect(friendship.score).toBe(20);

    const alliance = engine.performAction({
      actorId: 'house-a',
      targetId: 'house-b',
      action: 'PROPOSE_TREATY',
    });
    expect(alliance.state).toBe('ALLIED');
    expect(alliance.score).toBe(30);

    const broken = engine.performAction({
      actorId: 'house-a',
      targetId: 'house-b',
      action: 'BREAK_TREATY',
    });
    expect(broken.state).toBe('NEUTRAL');
    expect(broken.score).toBe(0);

    const rivalry = engine.performAction({
      actorId: 'house-a',
      targetId: 'house-b',
      action: 'DECLARE_RIVALRY',
    });
    expect(rivalry.state).toBe('HOSTILE');
    expect(rivalry.score).toBe(-20);
  });

  it('enforces war lock until peace and resumes normal transitions afterwards', () => {
    const engine = createDiplomacyEngine(deps());

    engine.performAction({ actorId: 'house-c', targetId: 'house-d', action: 'DECLARE_WAR' });

    expect(() =>
      engine.performAction({
        actorId: 'house-c',
        targetId: 'house-d',
        action: 'DECLARE_FRIENDSHIP',
      }),
    ).toThrow('only MAKE_PEACE is allowed');

    const peace = engine.performAction({
      actorId: 'house-c',
      targetId: 'house-d',
      action: 'MAKE_PEACE',
    });
    expect(peace.state).toBe('NEUTRAL');

    const friendship = engine.performAction({
      actorId: 'house-c',
      targetId: 'house-d',
      action: 'DECLARE_FRIENDSHIP',
    });
    expect(friendship.state).toBe('FRIENDLY');
  });

  it('handles embargo lifecycle and rejects lifting when no embargo exists', () => {
    const engine = createDiplomacyEngine(deps());

    expect(() =>
      engine.performAction({ actorId: 'house-e', targetId: 'house-f', action: 'LIFT_EMBARGO' }),
    ).toThrow('No embargo to lift');

    const embargo = engine.performAction({
      actorId: 'house-e',
      targetId: 'house-f',
      action: 'DECLARE_EMBARGO',
    });
    expect(embargo.state).toBe('EMBARGO');

    const lifted = engine.performAction({
      actorId: 'house-e',
      targetId: 'house-f',
      action: 'LIFT_EMBARGO',
    });
    expect(lifted.state).toBe('NEUTRAL');
    expect(lifted.score).toBe(-10);
  });

  it('enforces configured cooldown between actions on the same pair', () => {
    const engine = createDiplomacyEngine(
      deps({
        config: {
          cooldownUs: 5_000,
        },
      }),
    );

    engine.performAction({ actorId: 'house-g', targetId: 'house-h', action: 'DECLARE_FRIENDSHIP' });
    advance(2_000);

    expect(() =>
      engine.performAction({ actorId: 'house-g', targetId: 'house-h', action: 'DECLARE_RIVALRY' }),
    ).toThrow('Cooldown period active');

    advance(3_000);
    const allowed = engine.performAction({
      actorId: 'house-g',
      targetId: 'house-h',
      action: 'DECLARE_RIVALRY',
    });
    expect(allowed.state).toBe('HOSTILE');
  });

  it('records deterministic incident ids in chronological order', () => {
    const engine = createDiplomacyEngine(deps());

    engine.recordIncident({
      dynastyA: 'house-i',
      dynastyB: 'house-j',
      description: 'caravan dispute',
      scoreDelta: -5,
    });
    advance(100);
    const relation = engine.recordIncident({
      dynastyA: 'house-j',
      dynastyB: 'house-i',
      description: 'trade apology',
      scoreDelta: 8,
    });

    expect(relation.incidents).toHaveLength(2);
    expect(relation.incidents[0]?.incidentId).toBe('sim-diplomacy-1');
    expect(relation.incidents[1]?.incidentId).toBe('sim-diplomacy-2');
    expect((relation.incidents[0]?.timestamp ?? 0) < (relation.incidents[1]?.timestamp ?? 0)).toBe(
      true,
    );
  });

  it('derives relation states from incident score thresholds and clamps bounds', () => {
    const engine = createDiplomacyEngine(deps());

    const hostile = engine.recordIncident({
      dynastyA: 'house-k',
      dynastyB: 'house-l',
      description: 'major betrayal',
      scoreDelta: -40,
    });
    expect(hostile.state).toBe('HOSTILE');
    expect(hostile.score).toBe(-40);

    const friendly = engine.recordIncident({
      dynastyA: 'house-k',
      dynastyB: 'house-l',
      description: 'historic aid package',
      scoreDelta: 80,
    });
    expect(friendly.state).toBe('FRIENDLY');
    expect(friendly.score).toBe(40);

    const clamped = engine.recordIncident({
      dynastyA: 'house-k',
      dynastyB: 'house-l',
      description: 'maximum goodwill charter',
      scoreDelta: 200,
    });
    expect(clamped.score).toBe(100);
  });

  it('keeps locked states despite incident-driven score changes', () => {
    const engine = createDiplomacyEngine(deps());

    engine.performAction({ actorId: 'house-m', targetId: 'house-n', action: 'DECLARE_WAR' });
    const wartime = engine.recordIncident({
      dynastyA: 'house-m',
      dynastyB: 'house-n',
      description: 'ceasefire talks',
      scoreDelta: 80,
    });

    expect(wartime.state).toBe('WAR');
    expect(wartime.score).toBe(30);

    engine.performAction({ actorId: 'house-o', targetId: 'house-p', action: 'DECLARE_EMBARGO' });
    const embargo = engine.recordIncident({
      dynastyA: 'house-o',
      dynastyB: 'house-p',
      description: 'limited concessions',
      scoreDelta: 60,
    });

    expect(embargo.state).toBe('EMBARGO');
    expect(embargo.score).toBe(35);
  });

  it('decays only non-locked relations toward zero and returns decayed count', () => {
    const engine = createDiplomacyEngine(
      deps({
        config: {
          cooldownUs: 0,
          decayRatePerTick: 5,
        },
      }),
    );

    engine.recordIncident({
      dynastyA: 'house-q',
      dynastyB: 'house-r',
      description: 'small grudge',
      scoreDelta: -8,
    });
    engine.recordIncident({
      dynastyA: 'house-s',
      dynastyB: 'house-t',
      description: 'friendly summit',
      scoreDelta: 9,
    });
    engine.performAction({ actorId: 'house-u', targetId: 'house-v', action: 'DECLARE_WAR' });

    const decayed = engine.decayTick();
    expect(decayed).toBe(2);
    expect(engine.getScore('house-q', 'house-r')).toBe(-3);
    expect(engine.getScore('house-s', 'house-t')).toBe(4);
    expect(engine.getScore('house-u', 'house-v')).toBe(-50);
  });

  it('uses canonical pairing so reverse lookups and listings stay consistent', () => {
    const engine = createDiplomacyEngine(deps());

    engine.performAction({ actorId: 'house-y', targetId: 'house-z', action: 'DECLARE_FRIENDSHIP' });
    engine.recordIncident({
      dynastyA: 'house-z',
      dynastyB: 'house-y',
      description: 'minor misunderstanding',
      scoreDelta: -2,
    });

    const yz = engine.getRelation('house-y', 'house-z');
    const zy = engine.getRelation('house-z', 'house-y');

    expect(yz.score).toBe(18);
    expect(zy.score).toBe(18);
    expect(yz.incidents).toHaveLength(1);
    expect(zy.incidents).toHaveLength(1);
    expect(engine.listRelations('house-y')).toHaveLength(1);
    expect(engine.listRelations('house-z')).toHaveLength(1);
  });

  it('reports aggregate state distribution across mixed diplomatic outcomes', () => {
    const engine = createDiplomacyEngine(deps());

    engine.performAction({ actorId: 'a', targetId: 'b', action: 'DECLARE_FRIENDSHIP' });
    engine.performAction({ actorId: 'c', targetId: 'd', action: 'DECLARE_RIVALRY' });
    engine.performAction({ actorId: 'e', targetId: 'f', action: 'PROPOSE_TREATY' });
    engine.performAction({ actorId: 'g', targetId: 'h', action: 'DECLARE_WAR' });
    engine.performAction({ actorId: 'i', targetId: 'j', action: 'DECLARE_EMBARGO' });
    engine.getRelation('k', 'l');

    const stats = engine.getStats();
    expect(stats.totalRelations).toBe(6);
    expect(stats.friendlyCount).toBe(1);
    expect(stats.hostileCount).toBe(1);
    expect(stats.alliedCount).toBe(1);
    expect(stats.warCount).toBe(1);
    expect(stats.embargoCount).toBe(1);
    expect(stats.neutralCount).toBe(1);
  });
});
