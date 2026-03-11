import { describe, it, expect, beforeEach } from 'vitest';
import type {
  MilitaryState,
  Clock,
  IdGenerator,
  Logger,
  MilitaryForce,
  BattleOrder,
  BattleOutcome,
  WarExhaustion,
  MilitaryReport,
  Tactic,
  TroopType,
  TerrainType,
} from '../npc-war-ai.js';
import {
  createMilitaryState,
  registerForce,
  getForce,
  updateMorale,
  updateFatigue,
  adjustTroops,
  assessMilitary,
  selectTactic,
  getTacticModifiers,
  orderBattle,
  recordOutcome,
  initializeExhaustion,
  computeExhaustion,
  shouldSurrender,
  surrender,
  getMilitaryReport,
} from '../npc-war-ai.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockClock(): Clock {
  let time = 1000000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function createMockIdGen(): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter = counter + 1;
      return 'id-' + String(counter);
    },
  };
}

function createMockLogger(): Logger {
  const messages: string[] = [];
  const errors: string[] = [];
  return {
    info: (msg: string) => {
      messages.push(msg);
    },
    error: (msg: string) => {
      errors.push(msg);
    },
  };
}

function createBasicTroops(): Map<TroopType, number> {
  const troops = new Map<TroopType, number>();
  troops.set('INFANTRY', 1000);
  troops.set('CAVALRY', 200);
  troops.set('ARCHERS', 300);
  troops.set('SIEGE_ENGINES', 50);
  return troops;
}

// ============================================================================
// TESTS: FORCE MANAGEMENT
// ============================================================================

describe('NPC War AI - Force Management', () => {
  let state: MilitaryState;
  let clock: Clock;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
  });

  it('should register a military force', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, 80, 20, clock);
    expect(typeof force).toBe('object');
    if (typeof force === 'object') {
      expect(force.dynastyId).toBe('dyn1');
      expect(force.morale).toBe(80);
      expect(force.fatigue).toBe(20);
      expect(force.combatPower).toBeGreaterThan(0);
      expect(force.defensivePower).toBeGreaterThan(0);
    }
  });

  it('should return invalid-dynasty for empty dynastyId', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, '', troops, 80, 20, clock);
    expect(force).toBe('invalid-dynasty');
  });

  it('should return invalid-morale for morale < 0', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, -10, 20, clock);
    expect(force).toBe('invalid-morale');
  });

  it('should return invalid-morale for morale > 100', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, 110, 20, clock);
    expect(force).toBe('invalid-morale');
  });

  it('should return invalid-fatigue for fatigue < 0', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, 80, -10, clock);
    expect(force).toBe('invalid-fatigue');
  });

  it('should return invalid-fatigue for fatigue > 100', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, 80, 110, clock);
    expect(force).toBe('invalid-fatigue');
  });

  it('should calculate combat power correctly', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, 100, 0, clock);
    if (typeof force === 'object') {
      expect(force.combatPower).toBeGreaterThan(2000);
    }
  });

  it('should calculate defensive power correctly', () => {
    const troops = createBasicTroops();
    const force = registerForce(state, 'dyn1', troops, 100, 0, clock);
    if (typeof force === 'object') {
      expect(force.defensivePower).toBeGreaterThan(1000);
    }
  });

  it('should reduce combat power with low morale', () => {
    const troops = createBasicTroops();
    const high = registerForce(state, 'dyn1', troops, 90, 10, clock);
    const low = registerForce(state, 'dyn2', troops, 30, 10, clock);
    if (typeof high === 'object' && typeof low === 'object') {
      expect(high.combatPower).toBeGreaterThan(low.combatPower);
    }
  });

  it('should reduce combat power with high fatigue', () => {
    const troops = createBasicTroops();
    const low = registerForce(state, 'dyn1', troops, 80, 10, clock);
    const high = registerForce(state, 'dyn2', troops, 80, 80, clock);
    if (typeof low === 'object' && typeof high === 'object') {
      expect(low.combatPower).toBeGreaterThan(high.combatPower);
    }
  });

  it('should get force by dynastyId', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const force = getForce(state, 'dyn1');
    expect(typeof force).toBe('object');
  });

  it('should return force-not-found for missing dynasty', () => {
    const force = getForce(state, 'dyn-missing');
    expect(force).toBe('force-not-found');
  });

  it('should update morale positively', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 50, 20, clock);
    const updated = updateMorale(state, 'dyn1', 20, clock);
    if (typeof updated === 'object') {
      expect(updated.morale).toBe(70);
    }
  });

  it('should update morale negatively', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 70, 20, clock);
    const updated = updateMorale(state, 'dyn1', -30, clock);
    if (typeof updated === 'object') {
      expect(updated.morale).toBe(40);
    }
  });

  it('should clamp morale to 0 minimum', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 30, 20, clock);
    const updated = updateMorale(state, 'dyn1', -50, clock);
    if (typeof updated === 'object') {
      expect(updated.morale).toBe(0);
    }
  });

  it('should clamp morale to 100 maximum', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 85, 20, clock);
    const updated = updateMorale(state, 'dyn1', 30, clock);
    if (typeof updated === 'object') {
      expect(updated.morale).toBe(100);
    }
  });

  it('should update fatigue positively', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const updated = updateFatigue(state, 'dyn1', 15, clock);
    if (typeof updated === 'object') {
      expect(updated.fatigue).toBe(35);
    }
  });

  it('should update fatigue negatively (rest)', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 50, clock);
    const updated = updateFatigue(state, 'dyn1', -20, clock);
    if (typeof updated === 'object') {
      expect(updated.fatigue).toBe(30);
    }
  });

  it('should clamp fatigue to 0 minimum', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const updated = updateFatigue(state, 'dyn1', -50, clock);
    if (typeof updated === 'object') {
      expect(updated.fatigue).toBe(0);
    }
  });

  it('should clamp fatigue to 100 maximum', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 85, clock);
    const updated = updateFatigue(state, 'dyn1', 30, clock);
    if (typeof updated === 'object') {
      expect(updated.fatigue).toBe(100);
    }
  });

  it('should adjust troops by type', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const updated = adjustTroops(state, 'dyn1', 'INFANTRY', 500, clock);
    if (typeof updated === 'object') {
      const infantry = updated.troops.get('INFANTRY');
      expect(infantry).toBe(1500);
    }
  });

  it('should reduce troops with negative delta', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const updated = adjustTroops(state, 'dyn1', 'CAVALRY', -50, clock);
    if (typeof updated === 'object') {
      const cavalry = updated.troops.get('CAVALRY');
      expect(cavalry).toBe(150);
    }
  });

  it('should clamp troops to 0 minimum', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const updated = adjustTroops(state, 'dyn1', 'ARCHERS', -500, clock);
    if (typeof updated === 'object') {
      const archers = updated.troops.get('ARCHERS');
      expect(archers).toBe(0);
    }
  });

  it('should update combat power after troop adjustment', () => {
    const troops = createBasicTroops();
    const before = registerForce(state, 'dyn1', troops, 80, 20, clock);
    const after = adjustTroops(state, 'dyn1', 'INFANTRY', 1000, clock);
    if (typeof before === 'object' && typeof after === 'object') {
      expect(after.combatPower).toBeGreaterThan(before.combatPower);
    }
  });
});

// ============================================================================
// TESTS: MILITARY ASSESSMENT
// ============================================================================

describe('NPC War AI - Military Assessment', () => {
  let state: MilitaryState;
  let clock: Clock;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
  });

  it('should assess military strength', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    expect(typeof assessment).toBe('object');
    if (typeof assessment === 'object' && 'powerRatio' in assessment) {
      expect(assessment.powerRatio).toBeGreaterThan(0);
      expect(assessment.recommendation).toBeTruthy();
    }
  });

  it('should recommend ASSAULT for high power ratio', () => {
    const troops1 = createBasicTroops();
    const troops2 = new Map<TroopType, number>();
    troops2.set('INFANTRY', 200);
    registerForce(state, 'dyn1', troops1, 90, 10, clock);
    registerForce(state, 'dyn2', troops2, 50, 50, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    if (typeof assessment === 'object' && 'recommendation' in assessment) {
      expect(assessment.recommendation).toBe('ASSAULT');
    }
  });

  it('should recommend RETREAT for high fatigue', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 40, 75, clock);
    registerForce(state, 'dyn2', troops2, 80, 20, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    if (typeof assessment === 'object' && 'recommendation' in assessment) {
      expect(assessment.recommendation).toBe('RETREAT');
    }
  });

  it('should recommend RETREAT for low morale', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 25, 30, clock);
    registerForce(state, 'dyn2', troops2, 80, 20, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    if (typeof assessment === 'object' && 'recommendation' in assessment) {
      expect(assessment.recommendation).toBe('RETREAT');
    }
  });

  it('should recommend SIEGE for moderate disadvantage', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 75, 20, clock);
    registerForce(state, 'dyn2', troops2, 85, 10, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    if (typeof assessment === 'object' && 'recommendation' in assessment) {
      expect(['SIEGE', 'SKIRMISH', 'NEGOTIATE']).toContain(assessment.recommendation);
    }
  });

  it('should return error for missing attacker force', () => {
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    expect(assessment).toBe('force-not-found');
  });

  it('should return error for missing defender force', () => {
    const troops1 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    const assessment = assessMilitary(state, 'dyn1', 'dyn2');
    expect(assessment).toBe('force-not-found');
  });
});

// ============================================================================
// TESTS: TACTIC SELECTION
// ============================================================================

describe('NPC War AI - Tactic Selection', () => {
  let state: MilitaryState;
  let clock: Clock;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
  });

  it('should select a tactic', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const tactic = selectTactic(state, 'dyn1', 'dyn2', 'OPEN');
    expect(typeof tactic).toBe('string');
    if (typeof tactic === 'string' && tactic !== 'force-not-found') {
      const valid: Tactic[] = ['ASSAULT', 'SIEGE', 'AMBUSH', 'RETREAT', 'FORTIFY', 'SKIRMISH'];
      expect(valid).toContain(tactic);
    }
  });

  it('should adjust ASSAULT to AMBUSH on mountains', () => {
    const troops1 = createBasicTroops();
    const troops2 = new Map<TroopType, number>();
    troops2.set('INFANTRY', 200);
    registerForce(state, 'dyn1', troops1, 90, 10, clock);
    registerForce(state, 'dyn2', troops2, 50, 50, clock);
    const tactic = selectTactic(state, 'dyn1', 'dyn2', 'MOUNTAINS');
    expect(tactic).toBe('AMBUSH');
  });

  it('should adjust SIEGE to SKIRMISH in forest', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 75, 20, clock);
    registerForce(state, 'dyn2', troops2, 85, 10, clock);
    const tactic = selectTactic(state, 'dyn1', 'dyn2', 'FOREST');
    if (typeof tactic === 'string' && tactic === 'SIEGE') {
      expect(tactic).toBe('SKIRMISH');
    }
  });

  it('should get tactic modifiers', () => {
    const mods = getTacticModifiers('ASSAULT', 'OPEN');
    expect(mods.tactic).toBe('ASSAULT');
    expect(mods.terrain).toBe('OPEN');
    expect(mods.attackBonus).toBeGreaterThan(1.0);
  });

  it('should boost ASSAULT attack bonus', () => {
    const mods = getTacticModifiers('ASSAULT', 'OPEN');
    expect(mods.attackBonus).toBeGreaterThanOrEqual(1.5);
    expect(mods.casualtyMultiplier).toBeGreaterThan(1.0);
  });

  it('should reduce SIEGE casualties', () => {
    const mods = getTacticModifiers('SIEGE', 'OPEN');
    expect(mods.casualtyMultiplier).toBeLessThan(1.0);
  });

  it('should boost FORTIFY defense', () => {
    const mods = getTacticModifiers('FORTIFY', 'OPEN');
    expect(mods.defenseBonus).toBeGreaterThan(1.5);
  });

  it('should apply terrain modifiers for mountains', () => {
    const mods = getTacticModifiers('FORTIFY', 'MOUNTAINS');
    expect(mods.defenseBonus).toBeGreaterThan(1.8);
  });

  it('should apply terrain modifiers for forest ambush', () => {
    const mods = getTacticModifiers('AMBUSH', 'FOREST');
    expect(mods.attackBonus).toBeGreaterThan(1.5);
  });

  it('should apply terrain modifiers for urban siege', () => {
    const mods = getTacticModifiers('SIEGE', 'URBAN');
    expect(mods.attackBonus).toBeGreaterThan(0.7);
  });
});

// ============================================================================
// TESTS: BATTLE ORDERS
// ============================================================================

describe('NPC War AI - Battle Orders', () => {
  let state: MilitaryState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should order a battle', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    expect(typeof order).toBe('object');
    if (typeof order === 'object') {
      expect(order.attackerDynasty).toBe('dyn1');
      expect(order.defenderDynasty).toBe('dyn2');
      expect(order.tactic).toBe('ASSAULT');
      expect(order.terrain).toBe('OPEN');
    }
  });

  it('should return invalid-dynasty for empty attacker', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn2', troops, 70, 30, clock);
    const order = orderBattle(state, '', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    expect(order).toBe('invalid-dynasty');
  });

  it('should return invalid-dynasty for empty defender', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 80, 20, clock);
    const order = orderBattle(state, 'dyn1', '', 'ASSAULT', 'OPEN', idGen, clock, logger);
    expect(order).toBe('invalid-dynasty');
  });

  it('should return invalid-tactic for bad tactic', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'BAD' as Tactic, 'OPEN', idGen, clock, logger);
    expect(order).toBe('invalid-tactic');
  });

  it('should return invalid-terrain for bad terrain', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(
      state,
      'dyn1',
      'dyn2',
      'ASSAULT',
      'BAD' as TerrainType,
      idGen,
      clock,
      logger,
    );
    expect(order).toBe('invalid-terrain');
  });

  it('should store order in state', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      expect(state.orders.has(order.id)).toBe(true);
    }
  });

  it('should record attacker and defender force levels', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      expect(order.attackerForce).toBeGreaterThan(0);
      expect(order.defenderForce).toBeGreaterThan(0);
    }
  });

  it('should generate unique order IDs', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const o1 = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    const o2 = orderBattle(state, 'dyn1', 'dyn2', 'SIEGE', 'FOREST', idGen, clock, logger);
    if (typeof o1 === 'object' && typeof o2 === 'object') {
      expect(o1.id).not.toBe(o2.id);
    }
  });
});

// ============================================================================
// TESTS: BATTLE OUTCOMES
// ============================================================================

describe('NPC War AI - Battle Outcomes', () => {
  let state: MilitaryState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should record a battle outcome', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      const outcome = recordOutcome(
        state,
        order.id,
        'dyn1',
        100,
        200,
        10,
        5000n,
        50,
        idGen,
        clock,
        logger,
      );
      expect(typeof outcome).toBe('object');
      if (typeof outcome === 'object') {
        expect(outcome.battleId).toBe(order.id);
        expect(outcome.victor).toBe('dyn1');
        expect(outcome.attackerCasualties).toBe(100);
        expect(outcome.defenderCasualties).toBe(200);
      }
    }
  });

  it('should return order-not-found for missing battleId', () => {
    const outcome = recordOutcome(
      state,
      'missing',
      'dyn1',
      100,
      200,
      10,
      5000n,
      50,
      idGen,
      clock,
      logger,
    );
    expect(outcome).toBe('order-not-found');
  });

  it('should return invalid-force for negative casualties', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 80, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      const outcome = recordOutcome(
        state,
        order.id,
        'dyn1',
        -10,
        200,
        10,
        5000n,
        50,
        idGen,
        clock,
        logger,
      );
      expect(outcome).toBe('invalid-force');
    }
  });

  it('should update victor morale positively', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 100, 200, 15, 5000n, 50, idGen, clock, logger);
      const force = getForce(state, 'dyn1');
      if (typeof force === 'object') {
        expect(force.morale).toBeGreaterThan(70);
      }
    }
  });

  it('should update loser morale negatively', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 100, 200, 15, 5000n, 50, idGen, clock, logger);
      const force = getForce(state, 'dyn2');
      if (typeof force === 'object') {
        expect(force.morale).toBeLessThan(70);
      }
    }
  });

  it('should increase fatigue for both sides', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 100, 200, 15, 5000n, 50, idGen, clock, logger);
      const force1 = getForce(state, 'dyn1');
      const force2 = getForce(state, 'dyn2');
      if (typeof force1 === 'object' && typeof force2 === 'object') {
        expect(force1.fatigue).toBeGreaterThan(20);
        expect(force2.fatigue).toBeGreaterThan(30);
      }
    }
  });

  it('should reduce troops based on casualties', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 150, 250, 15, 5000n, 50, idGen, clock, logger);
      const force1 = getForce(state, 'dyn1');
      const force2 = getForce(state, 'dyn2');
      if (typeof force1 === 'object' && typeof force2 === 'object') {
        const inf1 = force1.troops.get('INFANTRY') || 0;
        const inf2 = force2.troops.get('INFANTRY') || 0;
        expect(inf1).toBe(850);
        expect(inf2).toBe(750);
      }
    }
  });

  it('should increment war exhaustion', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);
    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 100, 200, 15, 5000n, 50, idGen, clock, logger);
      const exhaustion = computeExhaustion(state, 'dyn1');
      if (typeof exhaustion === 'object') {
        expect(exhaustion.battlesEngaged).toBe(1);
        expect(exhaustion.level).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// TESTS: WAR EXHAUSTION
// ============================================================================

describe('NPC War AI - War Exhaustion', () => {
  let state: MilitaryState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should initialize war exhaustion', () => {
    const exhaustion = initializeExhaustion(state, 'dyn1', clock);
    expect(typeof exhaustion).toBe('object');
    if (typeof exhaustion === 'object') {
      expect(exhaustion.dynastyId).toBe('dyn1');
      expect(exhaustion.level).toBe(0);
      expect(exhaustion.battlesEngaged).toBe(0);
    }
  });

  it('should return invalid-dynasty for empty dynastyId', () => {
    const exhaustion = initializeExhaustion(state, '', clock);
    expect(exhaustion).toBe('invalid-dynasty');
  });

  it('should compute exhaustion', () => {
    initializeExhaustion(state, 'dyn1', clock);
    const exhaustion = computeExhaustion(state, 'dyn1');
    expect(typeof exhaustion).toBe('object');
  });

  it('should return exhaustion-not-found for missing dynasty', () => {
    const exhaustion = computeExhaustion(state, 'dyn-missing');
    expect(exhaustion).toBe('exhaustion-not-found');
  });

  it('should increase exhaustion after battles', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);

    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 200, 150, 10, 5000n, 50, idGen, clock, logger);
      const exhaustion = computeExhaustion(state, 'dyn1');
      if (typeof exhaustion === 'object') {
        expect(exhaustion.level).toBeGreaterThan(0);
      }
    }
  });

  it('should track consecutive losses', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);

    for (let i = 0; i < 3; i = i + 1) {
      const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
      if (typeof order === 'object') {
        recordOutcome(state, order.id, 'dyn2', 100, 80, 10, 3000n, 30, idGen, clock, logger);
      }
    }

    const exhaustion = computeExhaustion(state, 'dyn1');
    if (typeof exhaustion === 'object') {
      expect(exhaustion.consecutiveLosses).toBe(3);
    }
  });

  it('should reset consecutive losses after victory', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);

    const order1 = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order1 === 'object') {
      recordOutcome(state, order1.id, 'dyn2', 100, 80, 10, 3000n, 30, idGen, clock, logger);
    }

    const order2 = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order2 === 'object') {
      recordOutcome(state, order2.id, 'dyn1', 80, 120, 10, 4000n, 40, idGen, clock, logger);
    }

    const exhaustion = computeExhaustion(state, 'dyn1');
    if (typeof exhaustion === 'object') {
      expect(exhaustion.consecutiveLosses).toBe(0);
    }
  });

  it('should determine surrender condition at high exhaustion', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 70, 20, clock);
    initializeExhaustion(state, 'dyn1', clock);
    const exhaustion = state.exhaustion.get('dyn1');
    if (exhaustion) {
      exhaustion.level = 90;
    }
    const should = shouldSurrender(state, 'dyn1');
    expect(should).toBe(true);
  });

  it('should determine surrender after many losses and low morale', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 15, 50, clock);
    initializeExhaustion(state, 'dyn1', clock);
    const exhaustion = state.exhaustion.get('dyn1');
    if (exhaustion) {
      exhaustion.consecutiveLosses = 6;
      exhaustion.level = 65;
    }
    const should = shouldSurrender(state, 'dyn1');
    expect(should).toBe(true);
  });

  it('should not surrender at low exhaustion', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 70, 20, clock);
    initializeExhaustion(state, 'dyn1', clock);
    const should = shouldSurrender(state, 'dyn1');
    expect(should).toBe(false);
  });

  it('should execute surrender', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 70, 20, clock);
    const result = surrender(state, 'dyn1', logger);
    expect(result).toBe('surrendered');
  });
});

// ============================================================================
// TESTS: REPORTING
// ============================================================================

describe('NPC War AI - Reporting', () => {
  let state: MilitaryState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createMilitaryState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should generate a military report', () => {
    const troops = createBasicTroops();
    registerForce(state, 'dyn1', troops, 70, 20, clock);
    initializeExhaustion(state, 'dyn1', clock);
    const report = getMilitaryReport(state, 'dyn1', clock);
    expect(typeof report).toBe('object');
    if (typeof report === 'object') {
      expect(report.dynastyId).toBe('dyn1');
      expect(report.force).toBeDefined();
      expect(report.exhaustion).toBeDefined();
    }
  });

  it('should return force-not-found for missing dynasty', () => {
    const report = getMilitaryReport(state, 'dyn-missing', clock);
    expect(report).toBe('force-not-found');
  });

  it('should include recent battles in report', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);

    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 100, 150, 10, 5000n, 50, idGen, clock, logger);
    }

    const report = getMilitaryReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.recentBattles.length).toBeGreaterThan(0);
    }
  });

  it('should count wins and losses in last 10 battles', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);

    for (let i = 0; i < 7; i = i + 1) {
      const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
      if (typeof order === 'object') {
        recordOutcome(state, order.id, 'dyn1', 100, 150, 10, 5000n, 50, idGen, clock, logger);
      }
    }

    for (let i = 0; i < 3; i = i + 1) {
      const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
      if (typeof order === 'object') {
        recordOutcome(state, order.id, 'dyn2', 150, 100, 10, 4000n, 40, idGen, clock, logger);
      }
    }

    const report = getMilitaryReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.winsLast10).toBe(7);
      expect(report.lossesLast10).toBe(3);
    }
  });

  it('should sum total casualties', () => {
    const troops1 = createBasicTroops();
    const troops2 = createBasicTroops();
    registerForce(state, 'dyn1', troops1, 70, 20, clock);
    registerForce(state, 'dyn2', troops2, 70, 30, clock);
    initializeExhaustion(state, 'dyn1', clock);

    const order = orderBattle(state, 'dyn1', 'dyn2', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof order === 'object') {
      recordOutcome(state, order.id, 'dyn1', 150, 200, 10, 5000n, 50, idGen, clock, logger);
    }

    const report = getMilitaryReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.totalCasualties).toBe(150);
    }
  });
});
