/**
 * NPC Mythology System — Belief systems, myths, and sacred traditions.
 *
 * NPCs believe myths (creation stories, heroes, cosmic events) and practice
 * traditions (daily, weekly, seasonal, annual, once). BeliefProfile aggregates
 * devoutness from the count of myths and traditions held.
 *
 * "A world without myths is a world without memory."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcMythologyClock = {
  now(): bigint;
};

export type NpcMythologyIdGen = {
  generate(): string;
};

export type NpcMythologyLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcMythologyDeps = {
  readonly clock: NpcMythologyClock;
  readonly idGen: NpcMythologyIdGen;
  readonly logger: NpcMythologyLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type MythId = string;
export type TraditionId = string;

export type MythologyError =
  | 'npc-not-found'
  | 'myth-not-found'
  | 'tradition-not-found'
  | 'already-registered'
  | 'already-believes';

export type MythCategory =
  | 'CREATION'
  | 'APOCALYPSE'
  | 'HERO'
  | 'TRICKSTER'
  | 'ANCESTOR'
  | 'NATURE'
  | 'COSMIC';

export type TraditionFrequency = 'DAILY' | 'WEEKLY' | 'SEASONAL' | 'ANNUAL' | 'ONCE';

export type Myth = {
  readonly mythId: MythId;
  readonly title: string;
  readonly category: MythCategory;
  readonly worldId: string;
  believedBy: ReadonlyArray<NpcId>;
  readonly devotionScore: number;
};

export type SacredTradition = {
  readonly traditionId: TraditionId;
  readonly name: string;
  practitionerIds: ReadonlyArray<NpcId>;
  readonly frequency: TraditionFrequency;
  lastObservedAt: bigint | null;
};

export type BeliefProfile = {
  readonly npcId: NpcId;
  readonly myths: ReadonlyArray<MythId>;
  readonly traditions: ReadonlyArray<TraditionId>;
  readonly devoutness: number;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcMythologyState = {
  readonly deps: NpcMythologyDeps;
  readonly npcs: Set<NpcId>;
  readonly myths: Map<MythId, Myth>;
  readonly traditions: Map<TraditionId, SacredTradition>;
  readonly npcMyths: Map<NpcId, MythId[]>;
  readonly npcTraditions: Map<NpcId, TraditionId[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcMythologyState(deps: NpcMythologyDeps): NpcMythologyState {
  return {
    deps,
    npcs: new Set(),
    myths: new Map(),
    traditions: new Map(),
    npcMyths: new Map(),
    npcTraditions: new Map(),
  };
}

// ============================================================================
// REGISTER NPC
// ============================================================================

export function registerNpc(
  state: NpcMythologyState,
  npcId: NpcId,
): { success: true } | { success: false; error: MythologyError } {
  if (state.npcs.has(npcId)) return { success: false, error: 'already-registered' };
  state.npcs.add(npcId);
  state.npcMyths.set(npcId, []);
  state.npcTraditions.set(npcId, []);
  state.deps.logger.info('npc-mythology: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// CREATE MYTH
// ============================================================================

export function createMyth(
  state: NpcMythologyState,
  title: string,
  category: MythCategory,
  worldId: string,
  devotionScore: number,
): Myth {
  const mythId = state.deps.idGen.generate();
  const myth: Myth = { mythId, title, category, worldId, believedBy: [], devotionScore };
  state.myths.set(mythId, myth);
  state.deps.logger.info('npc-mythology: created myth ' + mythId);
  return myth;
}

// ============================================================================
// BELIEVE MYTH
// ============================================================================

export function believeMyth(
  state: NpcMythologyState,
  npcId: NpcId,
  mythId: MythId,
): { success: true } | { success: false; error: MythologyError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const myth = state.myths.get(mythId);
  if (myth === undefined) return { success: false, error: 'myth-not-found' };
  const npcMythList = state.npcMyths.get(npcId) ?? [];
  if (npcMythList.includes(mythId)) return { success: false, error: 'already-believes' };
  npcMythList.push(mythId);
  state.npcMyths.set(npcId, npcMythList);
  myth.believedBy = [...myth.believedBy, npcId];
  state.deps.logger.info('npc-mythology: npc ' + npcId + ' believes myth ' + mythId);
  return { success: true };
}

// ============================================================================
// CREATE TRADITION
// ============================================================================

export function createTradition(
  state: NpcMythologyState,
  name: string,
  frequency: TraditionFrequency,
): SacredTradition {
  const traditionId = state.deps.idGen.generate();
  const tradition: SacredTradition = {
    traditionId,
    name,
    practitionerIds: [],
    frequency,
    lastObservedAt: null,
  };
  state.traditions.set(traditionId, tradition);
  state.deps.logger.info('npc-mythology: created tradition ' + traditionId);
  return tradition;
}

// ============================================================================
// PRACTICE TRADITION
// ============================================================================

export function practiceTradition(
  state: NpcMythologyState,
  npcId: NpcId,
  traditionId: TraditionId,
): { success: true } | { success: false; error: MythologyError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const tradition = state.traditions.get(traditionId);
  if (tradition === undefined) return { success: false, error: 'tradition-not-found' };
  if (tradition.practitionerIds.includes(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  tradition.practitionerIds = [...tradition.practitionerIds, npcId];
  const npcTradList = state.npcTraditions.get(npcId) ?? [];
  npcTradList.push(traditionId);
  state.npcTraditions.set(npcId, npcTradList);
  state.deps.logger.info('npc-mythology: npc ' + npcId + ' practices tradition ' + traditionId);
  return { success: true };
}

// ============================================================================
// OBSERVE TRADITION
// ============================================================================

export function observeTradition(
  state: NpcMythologyState,
  traditionId: TraditionId,
): { success: true } | { success: false; error: MythologyError } {
  const tradition = state.traditions.get(traditionId);
  if (tradition === undefined) return { success: false, error: 'tradition-not-found' };
  tradition.lastObservedAt = state.deps.clock.now();
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getBeliefProfile(
  state: NpcMythologyState,
  npcId: NpcId,
): BeliefProfile | undefined {
  if (!state.npcs.has(npcId)) return undefined;
  const myths = state.npcMyths.get(npcId) ?? [];
  const traditions = state.npcTraditions.get(npcId) ?? [];
  const raw = myths.length * 0.1 + traditions.length * 0.15;
  const devoutness = Math.min(1, raw);
  return { npcId, myths, traditions, devoutness };
}

export function getMyth(state: NpcMythologyState, mythId: MythId): Myth | undefined {
  return state.myths.get(mythId);
}

export function listMythsByCategory(
  state: NpcMythologyState,
  category: MythCategory,
): ReadonlyArray<Myth> {
  const result: Myth[] = [];
  for (const myth of state.myths.values()) {
    if (myth.category === category) result.push(myth);
  }
  return result;
}

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type NpcMythologySystem = {
  registerNpc(npcId: NpcId): { success: true } | { success: false; error: MythologyError };
  createMyth(title: string, category: MythCategory, worldId: string, devotionScore: number): Myth;
  believeMyth(
    npcId: NpcId,
    mythId: MythId,
  ): { success: true } | { success: false; error: MythologyError };
  createTradition(name: string, frequency: TraditionFrequency): SacredTradition;
  practiceTradition(
    npcId: NpcId,
    traditionId: TraditionId,
  ): { success: true } | { success: false; error: MythologyError };
  observeTradition(
    traditionId: TraditionId,
  ): { success: true } | { success: false; error: MythologyError };
  getBeliefProfile(npcId: NpcId): BeliefProfile | undefined;
  getMyth(mythId: MythId): Myth | undefined;
  listMythsByCategory(category: MythCategory): ReadonlyArray<Myth>;
};

export function createNpcMythologySystem(deps: NpcMythologyDeps): NpcMythologySystem {
  const state = createNpcMythologyState(deps);
  return {
    registerNpc: (npcId) => registerNpc(state, npcId),
    createMyth: (title, category, worldId, devotionScore) =>
      createMyth(state, title, category, worldId, devotionScore),
    believeMyth: (npcId, mythId) => believeMyth(state, npcId, mythId),
    createTradition: (name, frequency) => createTradition(state, name, frequency),
    practiceTradition: (npcId, traditionId) => practiceTradition(state, npcId, traditionId),
    observeTradition: (traditionId) => observeTradition(state, traditionId),
    getBeliefProfile: (npcId) => getBeliefProfile(state, npcId),
    getMyth: (mythId) => getMyth(state, mythId),
    listMythsByCategory: (category) => listMythsByCategory(state, category),
  };
}
