/**
 * NPC Tier System — Classification and capability rules for AI agents.
 *
 * Bible v1.1: NPCs exist on a four-tier hierarchy with distinct AI
 * capabilities, memory persistence, and narrative significance.
 *
 * Tier 1 — Crowd Agents:     ~100K/world, stateless, rule-based
 * Tier 2 — Inhabitants:      ~10K/world, 90-day memory, behavior trees
 * Tier 3 — Notable Agents:   ~1K/world, permanent memory, LLM (Haiku)
 * Tier 4 — Architect's Agents: 10-50 total, universe-aware, LLM (Opus)
 *
 * Design constraints:
 *   - Tier 1 uses Mass Entity Framework (never Character Blueprint)
 *   - Tier 3+ are economic participants (hold KALON, trade, wealth zones)
 *   - Tier 4 persist through world compromise (migrate via Silfen Weave)
 *   - Tier 3+ transitions are permanent and recorded in Chronicle
 *   - NPC dynasties follow same continuity rules as player dynasties
 */

// ─── Types ───────────────────────────────────────────────────────────

export type NpcTier = 1 | 2 | 3 | 4;

export type AiBackend = 'mass_entity' | 'behavior_tree' | 'llm_haiku' | 'llm_opus';

export type MemoryModel = 'none' | 'rolling_90d' | 'permanent' | 'permanent_universe';

export interface NpcTierConfig {
  readonly tier: NpcTier;
  readonly name: string;
  readonly typicalCountPerWorld: number | null;
  readonly globalCap: number | null;
  readonly aiBackend: AiBackend;
  readonly memoryModel: MemoryModel;
  readonly hasChronicleIdentity: boolean;
  readonly isEconomicParticipant: boolean;
  readonly canMigrateWorlds: boolean;
  readonly usesMassEntity: boolean;
}

export interface NpcClassification {
  readonly npcId: string;
  readonly worldId: string;
  readonly tier: NpcTier;
  readonly name: string | null;
  readonly dynastyId: string | null;
  readonly classifiedAt: number;
}

export interface NpcTierRegistry {
  classify(params: ClassifyNpcParams): NpcClassification;
  getClassification(npcId: string): NpcClassification;
  tryGetClassification(npcId: string): NpcClassification | undefined;
  promote(npcId: string, newTier: NpcTier): NpcClassification;
  listByWorld(worldId: string): ReadonlyArray<NpcClassification>;
  listByTier(tier: NpcTier): ReadonlyArray<NpcClassification>;
  countByWorldAndTier(worldId: string, tier: NpcTier): number;
  count(): number;
}

export interface ClassifyNpcParams {
  readonly npcId: string;
  readonly worldId: string;
  readonly tier: NpcTier;
  readonly name?: string;
  readonly dynastyId?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

export const TIER_CONFIGS: Readonly<Record<NpcTier, NpcTierConfig>> = {
  1: {
    tier: 1,
    name: 'Crowd Agent',
    typicalCountPerWorld: 100_000,
    globalCap: null,
    aiBackend: 'mass_entity',
    memoryModel: 'none',
    hasChronicleIdentity: false,
    isEconomicParticipant: false,
    canMigrateWorlds: false,
    usesMassEntity: true,
  },
  2: {
    tier: 2,
    name: 'Inhabitant',
    typicalCountPerWorld: 10_000,
    globalCap: null,
    aiBackend: 'behavior_tree',
    memoryModel: 'rolling_90d',
    hasChronicleIdentity: false,
    isEconomicParticipant: false,
    canMigrateWorlds: false,
    usesMassEntity: false,
  },
  3: {
    tier: 3,
    name: 'Notable Agent',
    typicalCountPerWorld: 1_000,
    globalCap: null,
    aiBackend: 'llm_haiku',
    memoryModel: 'permanent',
    hasChronicleIdentity: true,
    isEconomicParticipant: true,
    canMigrateWorlds: false,
    usesMassEntity: false,
  },
  4: {
    tier: 4,
    name: "Architect's Agent",
    typicalCountPerWorld: null,
    globalCap: 50,
    aiBackend: 'llm_opus',
    memoryModel: 'permanent_universe',
    hasChronicleIdentity: true,
    isEconomicParticipant: true,
    canMigrateWorlds: true,
    usesMassEntity: false,
  },
};

// ─── State ───────────────────────────────────────────────────────────

interface MutableClassification {
  readonly npcId: string;
  worldId: string;
  tier: NpcTier;
  name: string | null;
  dynastyId: string | null;
  readonly classifiedAt: number;
}

interface RegistryState {
  readonly classifications: Map<string, MutableClassification>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Validation ─────────────────────────────────────────────────────

function validatePromotion(npcId: string, from: NpcTier, to: NpcTier): void {
  if (to <= from) {
    throw new Error(`Cannot demote NPC ${npcId} from tier ${String(from)} to ${String(to)}`);
  }
  if (to === 3 || to === 4) {
    // Tier 3+ transitions are permanent — this is a one-way promotion
    return;
  }
}

function validateTierRequirements(params: ClassifyNpcParams): void {
  const config = TIER_CONFIGS[params.tier];
  if (config.hasChronicleIdentity && params.name === undefined) {
    throw new Error(`Tier ${String(params.tier)} NPCs require a name`);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createNpcTierRegistry(deps: {
  readonly clock: { nowMicroseconds(): number };
}): NpcTierRegistry {
  const state: RegistryState = {
    classifications: new Map(),
    clock: deps.clock,
  };

  return {
    classify: (p) => classifyImpl(state, p),
    getClassification: (id) => getImpl(state, id),
    tryGetClassification: (id) => tryGetImpl(state, id),
    promote: (id, tier) => promoteImpl(state, id, tier),
    listByWorld: (wId) => listByWorldImpl(state, wId),
    listByTier: (t) => listByTierImpl(state, t),
    countByWorldAndTier: (wId, t) => countByWorldAndTierImpl(state, wId, t),
    count: () => state.classifications.size,
  };
}

// ─── Classification ─────────────────────────────────────────────────

function classifyImpl(state: RegistryState, params: ClassifyNpcParams): NpcClassification {
  if (state.classifications.has(params.npcId)) {
    throw new Error(`NPC ${params.npcId} already classified`);
  }
  validateTierRequirements(params);
  const entry: MutableClassification = {
    npcId: params.npcId,
    worldId: params.worldId,
    tier: params.tier,
    name: params.name ?? null,
    dynastyId: params.dynastyId ?? null,
    classifiedAt: state.clock.nowMicroseconds(),
  };
  state.classifications.set(params.npcId, entry);
  return toReadonly(entry);
}

function getImpl(state: RegistryState, npcId: string): NpcClassification {
  const entry = state.classifications.get(npcId);
  if (entry === undefined) throw new Error(`NPC ${npcId} not found`);
  return toReadonly(entry);
}

function tryGetImpl(state: RegistryState, npcId: string): NpcClassification | undefined {
  const entry = state.classifications.get(npcId);
  return entry !== undefined ? toReadonly(entry) : undefined;
}

// ─── Promotion ──────────────────────────────────────────────────────

function promoteImpl(state: RegistryState, npcId: string, newTier: NpcTier): NpcClassification {
  const entry = state.classifications.get(npcId);
  if (entry === undefined) throw new Error(`NPC ${npcId} not found`);
  validatePromotion(npcId, entry.tier, newTier);
  entry.tier = newTier;
  return toReadonly(entry);
}

// ─── Queries ────────────────────────────────────────────────────────

function listByWorldImpl(
  state: RegistryState,
  worldId: string,
): ReadonlyArray<NpcClassification> {
  const results: NpcClassification[] = [];
  for (const entry of state.classifications.values()) {
    if (entry.worldId === worldId) results.push(toReadonly(entry));
  }
  return results;
}

function listByTierImpl(state: RegistryState, tier: NpcTier): ReadonlyArray<NpcClassification> {
  const results: NpcClassification[] = [];
  for (const entry of state.classifications.values()) {
    if (entry.tier === tier) results.push(toReadonly(entry));
  }
  return results;
}

function countByWorldAndTierImpl(state: RegistryState, worldId: string, tier: NpcTier): number {
  let count = 0;
  for (const entry of state.classifications.values()) {
    if (entry.worldId === worldId && entry.tier === tier) count++;
  }
  return count;
}

// ─── Helpers ────────────────────────────────────────────────────────

function toReadonly(entry: MutableClassification): NpcClassification {
  return {
    npcId: entry.npcId,
    worldId: entry.worldId,
    tier: entry.tier,
    name: entry.name,
    dynastyId: entry.dynastyId,
    classifiedAt: entry.classifiedAt,
  };
}

// ─── Tier Queries (Pure) ────────────────────────────────────────────

export function tierRequiresChronicle(tier: NpcTier): boolean {
  return TIER_CONFIGS[tier].hasChronicleIdentity;
}

export function tierIsEconomicParticipant(tier: NpcTier): boolean {
  return TIER_CONFIGS[tier].isEconomicParticipant;
}

export function tierCanMigrate(tier: NpcTier): boolean {
  return TIER_CONFIGS[tier].canMigrateWorlds;
}

export function aiBackendForTier(tier: NpcTier): AiBackend {
  return TIER_CONFIGS[tier].aiBackend;
}
