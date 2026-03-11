import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcCombatAIState, NpcCombatAIDeps, CombatStats } from '../npc-combat-ai.js';
import {
  createNpcCombatAIState,
  registerNpcCombat,
  startCombat,
  makeDecision,
  endCombat,
  updateCombatStats,
  getCombatEncounter,
  getDecisionHistory,
  getNpcCombatStats,
} from '../npc-combat-ai.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcCombatAIDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'cbt-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

function makeStats(npcId: string, health = 100, morale = 100): CombatStats {
  return { npcId, health, attackPower: 10, defense: 5, speed: 8, morale };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcCombatAI - Registration', () => {
  let state: NpcCombatAIState;

  beforeEach(() => {
    state = createNpcCombatAIState(createMockDeps());
  });

  it('should register NPC successfully', () => {
    const result = registerNpcCombat(state, 'npc-1', makeStats('npc-1'));
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate', () => {
    registerNpcCombat(state, 'npc-1', makeStats('npc-1'));
    const result = registerNpcCombat(state, 'npc-1', makeStats('npc-1'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should return invalid-stat for health > 100', () => {
    const result = registerNpcCombat(state, 'npc-bad', makeStats('npc-bad', 101));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-stat');
  });

  it('should return invalid-stat for negative morale', () => {
    const stats: CombatStats = {
      npcId: 'npc-x',
      health: 50,
      attackPower: 5,
      defense: 3,
      speed: 5,
      morale: -1,
    };
    const result = registerNpcCombat(state, 'npc-x', stats);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-stat');
  });

  it('should return invalid-stat for negative attackPower', () => {
    const stats: CombatStats = {
      npcId: 'npc-y',
      health: 50,
      attackPower: -5,
      defense: 3,
      speed: 5,
      morale: 50,
    };
    const result = registerNpcCombat(state, 'npc-y', stats);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-stat');
  });
});

// ============================================================================
// TESTS: START COMBAT
// ============================================================================

describe('NpcCombatAI - Start Combat', () => {
  let state: NpcCombatAIState;

  beforeEach(() => {
    state = createNpcCombatAIState(createMockDeps());
    registerNpcCombat(state, 'a', makeStats('a'));
    registerNpcCombat(state, 'b', makeStats('b'));
  });

  it('should create a CombatEncounter on success', () => {
    const result = startCombat(state, ['a', 'b']);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.participantIds).toContain('a');
      expect(result.participantIds).toContain('b');
      expect(result.endedAt).toBeNull();
      expect(result.roundCount).toBe(0);
    }
  });

  it('should return npc-not-found if participant not registered', () => {
    const result = startCombat(state, ['a', 'ghost']);
    expect(result).toBe('npc-not-found');
  });

  it('should return already-in-combat if participant is already fighting', () => {
    startCombat(state, ['a', 'b']);
    registerNpcCombat(state, 'c', makeStats('c'));
    const result = startCombat(state, ['a', 'c']);
    expect(result).toBe('already-in-combat');
  });
});

// ============================================================================
// TESTS: MAKE DECISION
// ============================================================================

describe('NpcCombatAI - Make Decision (stances)', () => {
  let state: NpcCombatAIState;

  beforeEach(() => {
    state = createNpcCombatAIState(createMockDeps());
  });

  it('AGGRESSIVE with health > 30 should choose ATTACK', () => {
    registerNpcCombat(state, 'a', makeStats('a', 80));
    registerNpcCombat(state, 'b', makeStats('b'));
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'a', encounter.combatId, 'AGGRESSIVE');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('ATTACK');
  });

  it('AGGRESSIVE with health <= 30 should choose USE_SKILL', () => {
    registerNpcCombat(state, 'a', makeStats('a', 25));
    registerNpcCombat(state, 'b', makeStats('b'));
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'a', encounter.combatId, 'AGGRESSIVE');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('USE_SKILL');
  });

  it('DEFENSIVE with health < 50 should choose DEFEND', () => {
    registerNpcCombat(state, 'a', makeStats('a', 40));
    registerNpcCombat(state, 'b', makeStats('b'));
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'a', encounter.combatId, 'DEFENSIVE');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('DEFEND');
  });

  it('EVASIVE with health < 40 should choose FLEE with no target', () => {
    registerNpcCombat(state, 'a', makeStats('a', 30));
    registerNpcCombat(state, 'b', makeStats('b'));
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'a', encounter.combatId, 'EVASIVE');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('FLEE');
    expect(decision.targetId).toBeNull();
  });

  it('BERSERKER always chooses ATTACK', () => {
    registerNpcCombat(state, 'a', makeStats('a', 10));
    registerNpcCombat(state, 'b', makeStats('b'));
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'a', encounter.combatId, 'BERSERKER');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('ATTACK');
  });
});

describe('NpcCombatAI - Make Decision (support and errors)', () => {
  let state: NpcCombatAIState;

  beforeEach(() => {
    state = createNpcCombatAIState(createMockDeps());
  });

  it('SUPPORT should choose HEAL_ALLY when ally health < 50', () => {
    registerNpcCombat(state, 'healer', makeStats('healer', 90));
    registerNpcCombat(state, 'weak', makeStats('weak', 30));
    const encounter = startCombat(state, ['healer', 'weak']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'healer', encounter.combatId, 'SUPPORT');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('HEAL_ALLY');
    expect(decision.targetId).toBe('weak');
  });

  it('SUPPORT should choose TAUNT when no ally below 50 health', () => {
    registerNpcCombat(state, 'healer', makeStats('healer', 90));
    registerNpcCombat(state, 'strong', makeStats('strong', 80));
    const encounter = startCombat(state, ['healer', 'strong']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'healer', encounter.combatId, 'SUPPORT');
    if (typeof decision === 'string') return;
    expect(decision.action).toBe('TAUNT');
  });

  it('should return not-in-combat if NPC is not part of the encounter', () => {
    registerNpcCombat(state, 'a', makeStats('a'));
    registerNpcCombat(state, 'b', makeStats('b'));
    registerNpcCombat(state, 'c', makeStats('c'));
    registerNpcCombat(state, 'd', makeStats('d'));
    const enc1 = startCombat(state, ['a', 'b']);
    const enc2 = startCombat(state, ['c', 'd']);
    if (typeof enc1 === 'string' || typeof enc2 === 'string') return;
    const result = makeDecision(state, 'a', enc2.combatId, 'AGGRESSIVE');
    expect(result).toBe('not-in-combat');
  });

  it('should include reasoning string in decision', () => {
    registerNpcCombat(state, 'a', makeStats('a', 80));
    registerNpcCombat(state, 'b', makeStats('b'));
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') return;
    const decision = makeDecision(state, 'a', encounter.combatId, 'AGGRESSIVE');
    if (typeof decision === 'string') return;
    expect(decision.reasoning).toContain('AGGRESSIVE');
  });
});

// ============================================================================
// TESTS: END COMBAT
// ============================================================================

describe('NpcCombatAI - End Combat', () => {
  let state: NpcCombatAIState;

  beforeEach(() => {
    state = createNpcCombatAIState(createMockDeps());
    registerNpcCombat(state, 'a', makeStats('a'));
    registerNpcCombat(state, 'b', makeStats('b'));
  });

  it('should set endedAt and increment roundCount', () => {
    const enc = startCombat(state, ['a', 'b']);
    if (typeof enc === 'string') return;
    endCombat(state, enc.combatId);
    const updated = getCombatEncounter(state, enc.combatId);
    expect(updated?.endedAt).not.toBeNull();
    expect(updated?.roundCount).toBe(1);
  });

  it('should allow participants to re-enter combat after end', () => {
    const enc = startCombat(state, ['a', 'b']);
    if (typeof enc === 'string') return;
    endCombat(state, enc.combatId);
    const result = startCombat(state, ['a', 'b']);
    expect(typeof result).toBe('object');
  });

  it('should return combat-not-found for invalid combatId', () => {
    const result = endCombat(state, 'bad-id');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('combat-not-found');
  });
});

// ============================================================================
// TESTS: UPDATE STATS AND QUERIES
// ============================================================================

describe('NpcCombatAI - Update Stats and Queries', () => {
  let state: NpcCombatAIState;

  beforeEach(() => {
    state = createNpcCombatAIState(createMockDeps());
    registerNpcCombat(state, 'npc-1', makeStats('npc-1', 100));
  });

  it('should update stats successfully', () => {
    const result = updateCombatStats(state, 'npc-1', { health: 50 });
    expect(result.success).toBe(true);
    const stats = getNpcCombatStats(state, 'npc-1');
    expect(stats?.health).toBe(50);
  });

  it('should return invalid-stat when updating health > 100', () => {
    const result = updateCombatStats(state, 'npc-1', { health: 150 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-stat');
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = updateCombatStats(state, 'ghost', { health: 50 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should getDecisionHistory limited to last N decisions', () => {
    registerNpcCombat(state, 'npc-2', makeStats('npc-2'));
    const enc = startCombat(state, ['npc-1', 'npc-2']);
    if (typeof enc === 'string') return;
    makeDecision(state, 'npc-1', enc.combatId, 'AGGRESSIVE');
    makeDecision(state, 'npc-1', enc.combatId, 'DEFENSIVE');
    makeDecision(state, 'npc-1', enc.combatId, 'BERSERKER');
    const history = getDecisionHistory(state, 'npc-1', 2);
    expect(history.length).toBe(2);
  });

  it('should return undefined getNpcCombatStats for unknown NPC', () => {
    expect(getNpcCombatStats(state, 'ghost')).toBeUndefined();
  });
});
