/**
 * npc-combat.ts — NPC combat AI system.
 *
 * Manages NPC combat behavior with threat evaluation, combat styles,
 * ability cooldowns, damage application, and retreat logic. Each
 * combatant has a style that influences decision-making and a
 * threat table that decays over time.
 */

// -- Ports ────────────────────────────────────────────────────────

interface CombatClock {
  readonly nowMicroseconds: () => number;
}

interface CombatIdGenerator {
  readonly next: () => string;
}

interface NpcCombatDeps {
  readonly clock: CombatClock;
  readonly idGenerator: CombatIdGenerator;
}

// -- Types ────────────────────────────────────────────────────────

type CombatStyle = 'aggressive' | 'defensive' | 'tactical' | 'support' | 'berserker';

type CombatState = 'idle' | 'engaged' | 'retreating' | 'pursuing' | 'flanking';

interface ThreatEntry {
  readonly targetId: string;
  readonly threatValue: number;
  readonly lastUpdatedAt: number;
}

interface CombatAbility {
  readonly abilityId: string;
  readonly name: string;
  readonly damage: number;
  readonly range: number;
  readonly cooldownUs: number;
  readonly lastUsedAt: number;
}

interface CombatAction {
  readonly actionId: string;
  readonly npcId: string;
  readonly abilityId: string;
  readonly targetId: string;
  readonly damage: number;
  readonly timestamp: number;
}

type CombatDecisionType = 'attack' | 'defend' | 'retreat' | 'pursue' | 'flank' | 'support' | 'idle';

interface CombatDecision {
  readonly npcId: string;
  readonly decisionType: CombatDecisionType;
  readonly targetId: string | undefined;
  readonly abilityId: string | undefined;
  readonly confidence: number;
}

interface Combatant {
  readonly npcId: string;
  readonly style: CombatStyle;
  readonly state: CombatState;
  readonly health: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly registeredAt: number;
}

interface CombatStats {
  readonly totalCombatants: number;
  readonly totalEngaged: number;
  readonly totalRetreating: number;
  readonly totalActions: number;
  readonly totalThreats: number;
}

type RegisterCombatantError = 'already_registered';

type EvaluateThreatError = 'combatant_not_found' | 'target_not_found' | 'self_target';

type DecideActionError = 'combatant_not_found';

type ApplyDamageError = 'combatant_not_found' | 'already_dead';

// -- Constants ────────────────────────────────────────────────────

const THREAT_DECAY_RATE = 0.1;
const MAX_THREATS_PER_NPC = 10;
const ABILITY_COOLDOWN_US = 1_000_000;
const RETREAT_HEALTH_THRESHOLD = 0.25;

// -- State ────────────────────────────────────────────────────────

interface MutableCombatant {
  readonly npcId: string;
  readonly style: CombatStyle;
  state: CombatState;
  health: number;
  readonly maxHealth: number;
  readonly armor: number;
  readonly registeredAt: number;
}

interface MutableAbility {
  readonly abilityId: string;
  readonly name: string;
  readonly damage: number;
  readonly range: number;
  readonly cooldownUs: number;
  lastUsedAt: number;
}

interface MutableThreatEntry {
  readonly targetId: string;
  threatValue: number;
  lastUpdatedAt: number;
}

interface CombatSystemState {
  readonly deps: NpcCombatDeps;
  readonly combatants: Map<string, MutableCombatant>;
  readonly threats: Map<string, MutableThreatEntry[]>;
  readonly abilities: Map<string, MutableAbility[]>;
  readonly actions: CombatAction[];
}

// -- Helpers ──────────────────────────────────────────────────────

function toCombatant(m: MutableCombatant): Combatant {
  return {
    npcId: m.npcId,
    style: m.style,
    state: m.state,
    health: m.health,
    maxHealth: m.maxHealth,
    armor: m.armor,
    registeredAt: m.registeredAt,
  };
}

function toThreatEntry(t: MutableThreatEntry): ThreatEntry {
  return {
    targetId: t.targetId,
    threatValue: t.threatValue,
    lastUpdatedAt: t.lastUpdatedAt,
  };
}

function toAbility(a: MutableAbility): CombatAbility {
  return {
    abilityId: a.abilityId,
    name: a.name,
    damage: a.damage,
    range: a.range,
    cooldownUs: a.cooldownUs,
    lastUsedAt: a.lastUsedAt,
  };
}

function getOrCreateThreats(state: CombatSystemState, npcId: string): MutableThreatEntry[] {
  let list = state.threats.get(npcId);
  if (!list) {
    list = [];
    state.threats.set(npcId, list);
  }
  return list;
}

function findHighestThreat(threats: readonly MutableThreatEntry[]): MutableThreatEntry | undefined {
  if (threats.length === 0) return undefined;
  let highest = threats[0];
  for (const t of threats) {
    if (highest === undefined || t.threatValue > highest.threatValue) {
      highest = t;
    }
  }
  return highest;
}

function isAbilityReady(ability: MutableAbility, now: number): boolean {
  return now - ability.lastUsedAt >= ability.cooldownUs;
}

function findReadyAbility(
  abilities: readonly MutableAbility[],
  now: number,
): MutableAbility | undefined {
  for (const a of abilities) {
    if (isAbilityReady(a, now)) return a;
  }
  return undefined;
}

function healthRatio(c: MutableCombatant): number {
  if (c.maxHealth <= 0) return 0;
  return c.health / c.maxHealth;
}

function shouldRetreat(c: MutableCombatant): boolean {
  return healthRatio(c) <= RETREAT_HEALTH_THRESHOLD;
}

function styleConfidence(style: CombatStyle, decision: CombatDecisionType): number {
  if (style === 'aggressive' && decision === 'attack') return 0.9;
  if (style === 'defensive' && decision === 'defend') return 0.9;
  if (style === 'tactical' && decision === 'flank') return 0.85;
  if (style === 'support' && decision === 'support') return 0.9;
  if (style === 'berserker' && decision === 'attack') return 0.95;
  return 0.5;
}

// -- Operations ───────────────────────────────────────────────────

function registerCombatantImpl(
  state: CombatSystemState,
  npcId: string,
  style: CombatStyle,
  maxHealth: number,
  armor: number,
): Combatant | RegisterCombatantError {
  if (state.combatants.has(npcId)) return 'already_registered';
  const combatant: MutableCombatant = {
    npcId,
    style,
    state: 'idle',
    health: maxHealth,
    maxHealth,
    armor,
    registeredAt: state.deps.clock.nowMicroseconds(),
  };
  state.combatants.set(npcId, combatant);
  return toCombatant(combatant);
}

function addAbilityImpl(
  state: CombatSystemState,
  npcId: string,
  name: string,
  damage: number,
  range: number,
  cooldownUs: number,
): CombatAbility | undefined {
  if (!state.combatants.has(npcId)) return undefined;
  const ability: MutableAbility = {
    abilityId: state.deps.idGenerator.next(),
    name,
    damage,
    range,
    cooldownUs,
    lastUsedAt: 0,
  };
  let list = state.abilities.get(npcId);
  if (!list) {
    list = [];
    state.abilities.set(npcId, list);
  }
  list.push(ability);
  return toAbility(ability);
}

function evaluateThreatImpl(
  state: CombatSystemState,
  npcId: string,
  targetId: string,
  threatValue: number,
): ThreatEntry | EvaluateThreatError {
  if (!state.combatants.has(npcId)) return 'combatant_not_found';
  if (!state.combatants.has(targetId)) return 'target_not_found';
  if (npcId === targetId) return 'self_target';
  const threats = getOrCreateThreats(state, npcId);
  const existing = threats.find((t) => t.targetId === targetId);
  const now = state.deps.clock.nowMicroseconds();
  if (existing) {
    existing.threatValue = threatValue;
    existing.lastUpdatedAt = now;
    return toThreatEntry(existing);
  }
  return addNewThreat(state, npcId, targetId, threatValue, now);
}

function addNewThreat(
  state: CombatSystemState,
  npcId: string,
  targetId: string,
  threatValue: number,
  now: number,
): ThreatEntry {
  const threats = getOrCreateThreats(state, npcId);
  if (threats.length >= MAX_THREATS_PER_NPC) {
    evictLowestThreat(threats);
  }
  const entry: MutableThreatEntry = {
    targetId,
    threatValue,
    lastUpdatedAt: now,
  };
  threats.push(entry);
  return toThreatEntry(entry);
}

function evictLowestThreat(threats: MutableThreatEntry[]): void {
  if (threats.length === 0) return;
  let lowestIdx = 0;
  for (let i = 1; i < threats.length; i++) {
    const current = threats[i];
    const lowest = threats[lowestIdx];
    if (current !== undefined && lowest !== undefined) {
      if (current.threatValue < lowest.threatValue) {
        lowestIdx = i;
      }
    }
  }
  threats.splice(lowestIdx, 1);
}

function decideCombatActionImpl(
  state: CombatSystemState,
  npcId: string,
): CombatDecision | DecideActionError {
  const combatant = state.combatants.get(npcId);
  if (!combatant) return 'combatant_not_found';
  if (shouldRetreat(combatant)) {
    return buildRetreatDecision(npcId, combatant.style);
  }
  return buildOffensiveDecision(state, npcId, combatant);
}

function buildRetreatDecision(npcId: string, style: CombatStyle): CombatDecision {
  const decisionType = style === 'berserker' ? 'attack' : 'retreat';
  return {
    npcId,
    decisionType,
    targetId: undefined,
    abilityId: undefined,
    confidence: styleConfidence(style, decisionType),
  };
}

function buildOffensiveDecision(
  state: CombatSystemState,
  npcId: string,
  combatant: MutableCombatant,
): CombatDecision {
  const threats = state.threats.get(npcId) ?? [];
  const highest = findHighestThreat(threats);
  if (!highest) {
    return buildIdleDecision(npcId);
  }
  const decisionType = selectDecisionType(combatant.style);
  return {
    npcId,
    decisionType,
    targetId: highest.targetId,
    abilityId: selectAbilityId(state, npcId),
    confidence: styleConfidence(combatant.style, decisionType),
  };
}

function buildIdleDecision(npcId: string): CombatDecision {
  return {
    npcId,
    decisionType: 'idle',
    targetId: undefined,
    abilityId: undefined,
    confidence: 1.0,
  };
}

function selectDecisionType(style: CombatStyle): CombatDecisionType {
  if (style === 'aggressive' || style === 'berserker') return 'attack';
  if (style === 'defensive') return 'defend';
  if (style === 'tactical') return 'flank';
  return 'support';
}

function selectAbilityId(state: CombatSystemState, npcId: string): string | undefined {
  const abilities = state.abilities.get(npcId) ?? [];
  const now = state.deps.clock.nowMicroseconds();
  const ready = findReadyAbility(abilities, now);
  return ready ? ready.abilityId : undefined;
}

function updateCombatStateImpl(
  state: CombatSystemState,
  npcId: string,
  newState: CombatState,
): Combatant | undefined {
  const combatant = state.combatants.get(npcId);
  if (!combatant) return undefined;
  combatant.state = newState;
  return toCombatant(combatant);
}

function applyDamageImpl(
  state: CombatSystemState,
  npcId: string,
  rawDamage: number,
): Combatant | ApplyDamageError {
  const combatant = state.combatants.get(npcId);
  if (!combatant) return 'combatant_not_found';
  if (combatant.health <= 0) return 'already_dead';
  const effectiveDamage = Math.max(0, rawDamage - combatant.armor);
  combatant.health = Math.max(0, combatant.health - effectiveDamage);
  return toCombatant(combatant);
}

function executeAbilityImpl(
  state: CombatSystemState,
  npcId: string,
  abilityId: string,
  targetId: string,
): CombatAction | undefined {
  const abilities = state.abilities.get(npcId) ?? [];
  const ability = abilities.find((a) => a.abilityId === abilityId);
  if (!ability) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  if (!isAbilityReady(ability, now)) return undefined;
  ability.lastUsedAt = now;
  const action: CombatAction = {
    actionId: state.deps.idGenerator.next(),
    npcId,
    abilityId,
    targetId,
    damage: ability.damage,
    timestamp: now,
  };
  state.actions.push(action);
  return action;
}

function processRetreatImpl(state: CombatSystemState, npcId: string): Combatant | undefined {
  const combatant = state.combatants.get(npcId);
  if (!combatant) return undefined;
  if (!shouldRetreat(combatant)) return toCombatant(combatant);
  combatant.state = 'retreating';
  return toCombatant(combatant);
}

function decayThreatsImpl(state: CombatSystemState, npcId: string): number {
  const threats = state.threats.get(npcId);
  if (!threats) return 0;
  for (const t of threats) {
    t.threatValue = t.threatValue * (1 - THREAT_DECAY_RATE);
  }
  const before = threats.length;
  const remaining = threats.filter((t) => t.threatValue >= 0.01);
  state.threats.set(npcId, remaining);
  return before - remaining.length;
}

function getThreatsForImpl(state: CombatSystemState, npcId: string): readonly ThreatEntry[] {
  const threats = state.threats.get(npcId) ?? [];
  return threats.map(toThreatEntry);
}

function getCombatantImpl(state: CombatSystemState, npcId: string): Combatant | undefined {
  const c = state.combatants.get(npcId);
  return c ? toCombatant(c) : undefined;
}

function getAbilitiesImpl(state: CombatSystemState, npcId: string): readonly CombatAbility[] {
  const list = state.abilities.get(npcId) ?? [];
  return list.map(toAbility);
}

function getActionsImpl(state: CombatSystemState): readonly CombatAction[] {
  return [...state.actions];
}

function getCombatStatsImpl(state: CombatSystemState): CombatStats {
  let totalEngaged = 0;
  let totalRetreating = 0;
  let totalThreats = 0;
  for (const c of state.combatants.values()) {
    if (c.state === 'engaged') totalEngaged++;
    if (c.state === 'retreating') totalRetreating++;
  }
  for (const threats of state.threats.values()) {
    totalThreats += threats.length;
  }
  return {
    totalCombatants: state.combatants.size,
    totalEngaged,
    totalRetreating,
    totalActions: state.actions.length,
    totalThreats,
  };
}

// -- Public API ───────────────────────────────────────────────────

interface NpcCombatSystem {
  readonly registerCombatant: (
    npcId: string,
    style: CombatStyle,
    maxHealth: number,
    armor: number,
  ) => Combatant | RegisterCombatantError;
  readonly addAbility: (
    npcId: string,
    name: string,
    damage: number,
    range: number,
    cooldownUs: number,
  ) => CombatAbility | undefined;
  readonly evaluateThreat: (
    npcId: string,
    targetId: string,
    threatValue: number,
  ) => ThreatEntry | EvaluateThreatError;
  readonly decideCombatAction: (npcId: string) => CombatDecision | DecideActionError;
  readonly updateCombatState: (npcId: string, newState: CombatState) => Combatant | undefined;
  readonly applyDamage: (npcId: string, rawDamage: number) => Combatant | ApplyDamageError;
  readonly executeAbility: (
    npcId: string,
    abilityId: string,
    targetId: string,
  ) => CombatAction | undefined;
  readonly processRetreat: (npcId: string) => Combatant | undefined;
  readonly decayThreats: (npcId: string) => number;
  readonly getThreatsFor: (npcId: string) => readonly ThreatEntry[];
  readonly getCombatant: (npcId: string) => Combatant | undefined;
  readonly getAbilities: (npcId: string) => readonly CombatAbility[];
  readonly getActions: () => readonly CombatAction[];
  readonly getStats: () => CombatStats;
}

// -- Factory ──────────────────────────────────────────────────────

function createNpcCombatSystem(deps: NpcCombatDeps): NpcCombatSystem {
  const state: CombatSystemState = {
    deps,
    combatants: new Map(),
    threats: new Map(),
    abilities: new Map(),
    actions: [],
  };
  return {
    registerCombatant: (npc, style, hp, arm) => registerCombatantImpl(state, npc, style, hp, arm),
    addAbility: (npc, name, dmg, rng, cd) => addAbilityImpl(state, npc, name, dmg, rng, cd),
    evaluateThreat: (npc, tgt, val) => evaluateThreatImpl(state, npc, tgt, val),
    decideCombatAction: (npc) => decideCombatActionImpl(state, npc),
    updateCombatState: (npc, s) => updateCombatStateImpl(state, npc, s),
    applyDamage: (npc, dmg) => applyDamageImpl(state, npc, dmg),
    executeAbility: (npc, aid, tgt) => executeAbilityImpl(state, npc, aid, tgt),
    processRetreat: (npc) => processRetreatImpl(state, npc),
    decayThreats: (npc) => decayThreatsImpl(state, npc),
    getThreatsFor: (npc) => getThreatsForImpl(state, npc),
    getCombatant: (npc) => getCombatantImpl(state, npc),
    getAbilities: (npc) => getAbilitiesImpl(state, npc),
    getActions: () => getActionsImpl(state),
    getStats: () => getCombatStatsImpl(state),
  };
}

// -- Exports ──────────────────────────────────────────────────────

export {
  createNpcCombatSystem,
  THREAT_DECAY_RATE,
  MAX_THREATS_PER_NPC,
  ABILITY_COOLDOWN_US,
  RETREAT_HEALTH_THRESHOLD,
};
export type {
  NpcCombatSystem,
  NpcCombatDeps,
  CombatStyle,
  CombatState,
  ThreatEntry,
  CombatAbility,
  CombatAction,
  CombatDecision,
  CombatDecisionType,
  Combatant,
  CombatStats,
  RegisterCombatantError,
  EvaluateThreatError,
  DecideActionError,
  ApplyDamageError,
};
