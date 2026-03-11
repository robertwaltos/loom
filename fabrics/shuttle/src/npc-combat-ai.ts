/**
 * NPC Combat AI System — AI-driven combat decision making for NPCs.
 *
 * Manages combat encounters between registered NPCs. Each NPC has
 * CombatStats including health and morale. The system assigns stances
 * and derives deterministic CombatDecision actions based on stance +
 * health state. Combat is grouped into CombatEncounters.
 *
 * "When diplomacy ends, the Shuttle chooses the blade."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcCombatAIClock = {
  now(): bigint;
};

export type NpcCombatAIIdGen = {
  generate(): string;
};

export type NpcCombatAILogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcCombatAIDeps = {
  readonly clock: NpcCombatAIClock;
  readonly idGen: NpcCombatAIIdGen;
  readonly logger: NpcCombatAILogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type CombatId = string;
export type TargetId = string;

export type CombatError =
  | 'npc-not-found'
  | 'combat-not-found'
  | 'not-in-combat'
  | 'already-in-combat'
  | 'invalid-stat'
  | 'already-registered';

export type CombatStance = 'AGGRESSIVE' | 'DEFENSIVE' | 'EVASIVE' | 'BERSERKER' | 'SUPPORT';

export type CombatAction = 'ATTACK' | 'DEFEND' | 'FLEE' | 'USE_SKILL' | 'TAUNT' | 'HEAL_ALLY';

export type CombatStats = {
  readonly npcId: NpcId;
  health: number;
  attackPower: number;
  defense: number;
  speed: number;
  morale: number;
};

export type CombatEncounter = {
  readonly combatId: CombatId;
  readonly participantIds: ReadonlyArray<NpcId>;
  readonly startedAt: bigint;
  endedAt: bigint | null;
  roundCount: number;
};

export type CombatDecision = {
  readonly decisionId: string;
  readonly npcId: NpcId;
  readonly combatId: CombatId;
  readonly action: CombatAction;
  readonly targetId: TargetId | null;
  readonly reasoning: string;
  readonly madeAt: bigint;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcCombatAIState = {
  readonly deps: NpcCombatAIDeps;
  readonly stats: Map<NpcId, CombatStats>;
  readonly activeCombat: Map<NpcId, CombatId>;
  readonly combats: Map<CombatId, CombatEncounter>;
  readonly decisionHistory: Map<NpcId, CombatDecision[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcCombatAIState(deps: NpcCombatAIDeps): NpcCombatAIState {
  return {
    deps,
    stats: new Map(),
    activeCombat: new Map(),
    combats: new Map(),
    decisionHistory: new Map(),
  };
}

// ============================================================================
// REGISTER
// ============================================================================

export function registerNpcCombat(
  state: NpcCombatAIState,
  npcId: NpcId,
  stats: CombatStats,
): { success: true } | { success: false; error: CombatError } {
  if (state.stats.has(npcId)) return { success: false, error: 'already-registered' };
  const validationError = validateCombatStats(stats);
  if (validationError !== null) return { success: false, error: validationError };
  state.stats.set(npcId, { ...stats });
  state.decisionHistory.set(npcId, []);
  state.deps.logger.info('npc-combat-ai: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// START COMBAT
// ============================================================================

export function startCombat(
  state: NpcCombatAIState,
  participantIds: ReadonlyArray<NpcId>,
): CombatEncounter | CombatError {
  for (const npcId of participantIds) {
    if (!state.stats.has(npcId)) return 'npc-not-found';
    if (state.activeCombat.has(npcId)) return 'already-in-combat';
  }
  const combatId = state.deps.idGen.generate();
  const encounter: CombatEncounter = {
    combatId,
    participantIds: [...participantIds],
    startedAt: state.deps.clock.now(),
    endedAt: null,
    roundCount: 0,
  };
  state.combats.set(combatId, encounter);
  for (const npcId of participantIds) {
    state.activeCombat.set(npcId, combatId);
  }
  state.deps.logger.info('npc-combat-ai: started combat ' + combatId);
  return encounter;
}

// ============================================================================
// MAKE DECISION
// ============================================================================

export function makeDecision(
  state: NpcCombatAIState,
  npcId: NpcId,
  combatId: CombatId,
  stance: CombatStance,
): CombatDecision | CombatError {
  if (!state.stats.has(npcId)) return 'npc-not-found';
  const encounter = state.combats.get(combatId);
  if (encounter === undefined) return 'combat-not-found';
  if (state.activeCombat.get(npcId) !== combatId) return 'not-in-combat';
  const npcStats = state.stats.get(npcId);
  if (npcStats === undefined) return 'npc-not-found';
  const others = encounter.participantIds.filter((id) => id !== npcId);
  const decision = buildDecision(state, npcId, combatId, stance, npcStats, others);
  state.decisionHistory.get(npcId)?.push(decision);
  return decision;
}

function buildDecision(
  state: NpcCombatAIState,
  npcId: NpcId,
  combatId: CombatId,
  stance: CombatStance,
  npcStats: CombatStats,
  others: NpcId[],
): CombatDecision {
  const { action, targetId } = resolveActionAndTarget(state, stance, npcStats, others);
  const reasoning = `health=${String(npcStats.health)} stance=${stance} → ${action}`;
  return {
    decisionId: state.deps.idGen.generate(),
    npcId,
    combatId,
    action,
    targetId,
    reasoning,
    madeAt: state.deps.clock.now(),
  };
}

function resolveActionAndTarget(
  state: NpcCombatAIState,
  stance: CombatStance,
  npcStats: CombatStats,
  others: NpcId[],
): { action: CombatAction; targetId: TargetId | null } {
  const firstOther = others[0] ?? null;
  if (stance === 'AGGRESSIVE') {
    return {
      action: npcStats.health > 30 ? 'ATTACK' : 'USE_SKILL',
      targetId: firstOther,
    };
  }
  if (stance === 'DEFENSIVE') {
    return {
      action: npcStats.health < 50 ? 'DEFEND' : 'ATTACK',
      targetId: firstOther,
    };
  }
  if (stance === 'EVASIVE') {
    return {
      action: npcStats.health < 40 ? 'FLEE' : 'DEFEND',
      targetId: null,
    };
  }
  if (stance === 'BERSERKER') {
    return { action: 'ATTACK', targetId: firstOther };
  }
  return resolveSupportAction(state, others);
}

function resolveSupportAction(
  state: NpcCombatAIState,
  others: NpcId[],
): { action: CombatAction; targetId: TargetId | null } {
  const lowestAlly = findLowestHealthAlly(state, others);
  if (lowestAlly !== null) {
    const allyStats = state.stats.get(lowestAlly);
    if (allyStats !== undefined && allyStats.health < 50) {
      return { action: 'HEAL_ALLY', targetId: lowestAlly };
    }
  }
  return { action: 'TAUNT', targetId: lowestAlly };
}

function findLowestHealthAlly(state: NpcCombatAIState, others: NpcId[]): NpcId | null {
  let lowestId: NpcId | null = null;
  let lowestHealth = Infinity;
  for (const id of others) {
    const s = state.stats.get(id);
    if (s !== undefined && s.health < lowestHealth) {
      lowestHealth = s.health;
      lowestId = id;
    }
  }
  return lowestId;
}

// ============================================================================
// END COMBAT
// ============================================================================

export function endCombat(
  state: NpcCombatAIState,
  combatId: CombatId,
): { success: true } | { success: false; error: CombatError } {
  const encounter = state.combats.get(combatId);
  if (encounter === undefined) return { success: false, error: 'combat-not-found' };
  encounter.endedAt = state.deps.clock.now();
  encounter.roundCount += 1;
  for (const npcId of encounter.participantIds) {
    state.activeCombat.delete(npcId);
  }
  state.deps.logger.info('npc-combat-ai: ended combat ' + combatId);
  return { success: true };
}

// ============================================================================
// UPDATE STATS
// ============================================================================

export function updateCombatStats(
  state: NpcCombatAIState,
  npcId: NpcId,
  updates: Partial<CombatStats>,
): { success: true } | { success: false; error: CombatError } {
  const existing = state.stats.get(npcId);
  if (existing === undefined) return { success: false, error: 'npc-not-found' };
  const merged: CombatStats = { ...existing, ...updates };
  const validationError = validateCombatStats(merged);
  if (validationError !== null) return { success: false, error: validationError };
  Object.assign(existing, updates);
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getCombatEncounter(
  state: NpcCombatAIState,
  combatId: CombatId,
): CombatEncounter | undefined {
  return state.combats.get(combatId);
}

export function getDecisionHistory(
  state: NpcCombatAIState,
  npcId: NpcId,
  limit: number,
): ReadonlyArray<CombatDecision> {
  const history = state.decisionHistory.get(npcId) ?? [];
  return history.slice(-limit);
}

export function getNpcCombatStats(state: NpcCombatAIState, npcId: NpcId): CombatStats | undefined {
  return state.stats.get(npcId);
}

// ============================================================================
// HELPERS
// ============================================================================

function validateCombatStats(stats: CombatStats): CombatError | null {
  if (stats.health < 0 || stats.health > 100) return 'invalid-stat';
  if (stats.morale < 0 || stats.morale > 100) return 'invalid-stat';
  if (stats.attackPower < 0) return 'invalid-stat';
  if (stats.defense < 0) return 'invalid-stat';
  if (stats.speed < 0) return 'invalid-stat';
  return null;
}
