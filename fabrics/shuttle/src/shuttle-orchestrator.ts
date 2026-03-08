/**
 * Shuttle Orchestrator — NPC lifecycle driver.
 *
 * Ties the decision engine, memory service, behavior trees, schedule
 * manager, and relationship tracker into a unified per-tick NPC
 * processing cycle. This is the connective tissue that makes all
 * isolated NPC systems coherent within the game loop.
 *
 * Per tick:
 *   1. Gather active NPCs from the world population
 *   2. Route by tier: batch (Tier 1), tree (Tier 2), decision (Tier 3+)
 *   3. Record memories for significant decisions
 *   4. Prune stale memories per tier policy
 *   5. Return comprehensive tick result
 *
 * The orchestrator never makes AI decisions — each backend owns its
 * own intelligence. This service is purely sequencing and wiring.
 */

// ─── Port Interfaces ────────────────────────────────────────────────

export interface ShuttlePopulationPort {
  listActiveNpcs(worldId: string): ReadonlyArray<ShuttleNpcRecord>;
}

export interface ShuttleNpcRecord {
  readonly npcId: string;
  readonly worldId: string;
  readonly tier: number;
  readonly displayName: string;
}

export interface ShuttleDecisionPort {
  decide(request: ShuttleDecisionRequest): ShuttleDecision;
  decideBatch(requests: ReadonlyArray<ShuttleDecisionRequest>): ReadonlyArray<ShuttleDecision>;
}

export interface ShuttleDecisionRequest {
  readonly npcId: string;
  readonly worldId: string;
  readonly tier: number;
  readonly context: ReadonlyArray<string>;
}

export interface ShuttleDecision {
  readonly npcId: string;
  readonly actionType: string;
  readonly outcome: 'act' | 'idle' | 'defer';
  readonly confidence: number;
}

export interface ShuttleBehaviorTreePort {
  tickTree(name: string, ctx: ShuttleTreeContext): ShuttleTreeResult;
  hasTree(name: string): boolean;
}

export interface ShuttleTreeContext {
  readonly npcId: string;
  readonly worldId: string;
  readonly deltaUs: number;
}

export type ShuttleTreeResult = 'success' | 'failure' | 'running';

export interface ShuttleMemoryPort {
  record(params: ShuttleMemoryRecord): string;
  recall(npcId: string): ReadonlyArray<ShuttleMemoryEntry>;
  prune(npcId: string, maxAge: number): number;
}

export interface ShuttleMemoryRecord {
  readonly npcId: string;
  readonly category: string;
  readonly content: string;
  readonly salience: number;
}

export interface ShuttleMemoryEntry {
  readonly memoryId: string;
  readonly content: string;
  readonly salience: number;
}

export interface ShuttleSchedulePort {
  getActiveBlock(npcId: string, timeUs: number): string | null;
}

export interface ShuttleClockPort {
  readonly nowMicroseconds: () => number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface ShuttleOrchestratorConfig {
  readonly maxBatchSize: number;
  readonly tier1PruneAgeUs: number;
  readonly tier2PruneAgeUs: number;
  readonly memoryRecordThreshold: number;
}

const DEFAULT_SHUTTLE_CONFIG: ShuttleOrchestratorConfig = {
  maxBatchSize: 500,
  tier1PruneAgeUs: 0,
  tier2PruneAgeUs: 7_776_000_000_000,
  memoryRecordThreshold: 0.3,
};

// ─── Deps ───────────────────────────────────────────────────────────

export interface ShuttleOrchestratorDeps {
  readonly population: ShuttlePopulationPort;
  readonly decision: ShuttleDecisionPort;
  readonly behaviorTree: ShuttleBehaviorTreePort;
  readonly memory: ShuttleMemoryPort;
  readonly schedule: ShuttleSchedulePort;
  readonly clock: ShuttleClockPort;
}

// ─── Result Types ───────────────────────────────────────────────────

export interface ShuttleTickResult {
  readonly npcsProcessed: number;
  readonly tier1Batched: number;
  readonly tier2Treed: number;
  readonly tier3Decided: number;
  readonly decisionsActed: number;
  readonly memoriesRecorded: number;
  readonly memoriesPruned: number;
  readonly tickNumber: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ShuttleOrchestrator {
  readonly tick: (worldId: string, deltaUs: number) => ShuttleTickResult;
  readonly getTickCount: () => number;
  readonly getStats: () => ShuttleOrchestratorStats;
}

export interface ShuttleOrchestratorStats {
  readonly totalTicks: number;
  readonly totalNpcsProcessed: number;
  readonly totalDecisionsActed: number;
  readonly totalMemoriesRecorded: number;
}

// ─── State ──────────────────────────────────────────────────────────

interface OrchestratorState {
  readonly deps: ShuttleOrchestratorDeps;
  readonly config: ShuttleOrchestratorConfig;
  tickCount: number;
  totalProcessed: number;
  totalActed: number;
  totalMemories: number;
}

// ─── Factory ────────────────────────────────────────────────────────

function createShuttleOrchestrator(
  deps: ShuttleOrchestratorDeps,
  config?: Partial<ShuttleOrchestratorConfig>,
): ShuttleOrchestrator {
  const state: OrchestratorState = {
    deps,
    config: { ...DEFAULT_SHUTTLE_CONFIG, ...config },
    tickCount: 0,
    totalProcessed: 0,
    totalActed: 0,
    totalMemories: 0,
  };

  return {
    tick: (worldId, deltaUs) => shuttleTick(state, worldId, deltaUs),
    getTickCount: () => state.tickCount,
    getStats: () => buildStats(state),
  };
}

// ─── Tick Implementation ────────────────────────────────────────────

function shuttleTick(
  state: OrchestratorState,
  worldId: string,
  deltaUs: number,
): ShuttleTickResult {
  state.tickCount += 1;
  const npcs = state.deps.population.listActiveNpcs(worldId);
  const groups = groupByTier(npcs);

  const tier1 = processTier1Batch(state, groups.tier1);
  const tier2 = processTier2Trees(state, groups.tier2, deltaUs);
  const tier3 = processTier3Decisions(state, groups.tier3Plus);

  const memoriesRecorded = recordDecisionMemories(state, [
    ...tier1.decisions,
    ...tier2.decisions,
    ...tier3.decisions,
  ]);
  const pruned = pruneStaleMemories(state, npcs);

  updateCumulativeStats(state, npcs.length, tier1.acted + tier2.acted + tier3.acted, memoriesRecorded);

  return {
    npcsProcessed: npcs.length,
    tier1Batched: groups.tier1.length,
    tier2Treed: groups.tier2.length,
    tier3Decided: groups.tier3Plus.length,
    decisionsActed: tier1.acted + tier2.acted + tier3.acted,
    memoriesRecorded,
    memoriesPruned: pruned,
    tickNumber: state.tickCount,
  };
}

function updateCumulativeStats(
  state: OrchestratorState,
  processed: number,
  acted: number,
  memories: number,
): void {
  state.totalProcessed += processed;
  state.totalActed += acted;
  state.totalMemories += memories;
}

function buildStats(state: OrchestratorState): ShuttleOrchestratorStats {
  return {
    totalTicks: state.tickCount,
    totalNpcsProcessed: state.totalProcessed,
    totalDecisionsActed: state.totalActed,
    totalMemoriesRecorded: state.totalMemories,
  };
}

// ─── Tier Grouping ──────────────────────────────────────────────────

interface TierGroups {
  readonly tier1: ReadonlyArray<ShuttleNpcRecord>;
  readonly tier2: ReadonlyArray<ShuttleNpcRecord>;
  readonly tier3Plus: ReadonlyArray<ShuttleNpcRecord>;
}

function groupByTier(npcs: ReadonlyArray<ShuttleNpcRecord>): TierGroups {
  const tier1: ShuttleNpcRecord[] = [];
  const tier2: ShuttleNpcRecord[] = [];
  const tier3Plus: ShuttleNpcRecord[] = [];

  for (const npc of npcs) {
    if (npc.tier <= 1) tier1.push(npc);
    else if (npc.tier === 2) tier2.push(npc);
    else tier3Plus.push(npc);
  }

  return { tier1, tier2, tier3Plus };
}

// ─── Tier 1: Batch Processing ───────────────────────────────────────

interface TierProcessResult {
  readonly decisions: ReadonlyArray<ShuttleDecision>;
  readonly acted: number;
}

function processTier1Batch(
  state: OrchestratorState,
  npcs: ReadonlyArray<ShuttleNpcRecord>,
): TierProcessResult {
  if (npcs.length === 0) return { decisions: [], acted: 0 };

  const requests = npcs.map((npc) => buildRequest(state, npc));
  const batches = chunkArray(requests, state.config.maxBatchSize);
  const decisions: ShuttleDecision[] = [];

  for (const batch of batches) {
    decisions.push(...state.deps.decision.decideBatch(batch));
  }

  return { decisions, acted: countActed(decisions) };
}

function chunkArray<T>(arr: ReadonlyArray<T>, size: number): ReadonlyArray<ReadonlyArray<T>> {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Tier 2: Behavior Tree ──────────────────────────────────────────

function processTier2Trees(
  state: OrchestratorState,
  npcs: ReadonlyArray<ShuttleNpcRecord>,
  deltaUs: number,
): TierProcessResult {
  const decisions: ShuttleDecision[] = [];

  for (const npc of npcs) {
    const decision = processSingleTier2(state, npc, deltaUs);
    decisions.push(decision);
  }

  return { decisions, acted: countActed(decisions) };
}

function processSingleTier2(
  state: OrchestratorState,
  npc: ShuttleNpcRecord,
  deltaUs: number,
): ShuttleDecision {
  const treeName = 'npc-' + npc.npcId;
  if (!state.deps.behaviorTree.hasTree(treeName)) {
    return idleDecision(npc.npcId);
  }

  const ctx: ShuttleTreeContext = { npcId: npc.npcId, worldId: npc.worldId, deltaUs };
  const result = state.deps.behaviorTree.tickTree(treeName, ctx);

  return treeResultToDecision(npc.npcId, result);
}

function treeResultToDecision(npcId: string, result: ShuttleTreeResult): ShuttleDecision {
  if (result === 'success') return { npcId, actionType: 'tree-complete', outcome: 'act', confidence: 1.0 };
  if (result === 'running') return { npcId, actionType: 'tree-running', outcome: 'defer', confidence: 0.5 };
  return idleDecision(npcId);
}

// ─── Tier 3+: Individual Decisions ──────────────────────────────────

function processTier3Decisions(
  state: OrchestratorState,
  npcs: ReadonlyArray<ShuttleNpcRecord>,
): TierProcessResult {
  const decisions: ShuttleDecision[] = [];

  for (const npc of npcs) {
    const request = buildRequest(state, npc);
    const decision = state.deps.decision.decide(request);
    decisions.push(decision);
  }

  return { decisions, acted: countActed(decisions) };
}

// ─── Shared Helpers ─────────────────────────────────────────────────

function buildRequest(
  state: OrchestratorState,
  npc: ShuttleNpcRecord,
): ShuttleDecisionRequest {
  const now = state.deps.clock.nowMicroseconds();
  const block = state.deps.schedule.getActiveBlock(npc.npcId, now);
  const context = block !== null ? [block] : [];
  return { npcId: npc.npcId, worldId: npc.worldId, tier: npc.tier, context };
}

function idleDecision(npcId: string): ShuttleDecision {
  return { npcId, actionType: 'idle', outcome: 'idle', confidence: 1.0 };
}

function countActed(decisions: ReadonlyArray<ShuttleDecision>): number {
  let count = 0;
  for (const d of decisions) {
    if (d.outcome === 'act') count += 1;
  }
  return count;
}

// ─── Memory Integration ─────────────────────────────────────────────

function recordDecisionMemories(
  state: OrchestratorState,
  decisions: ReadonlyArray<ShuttleDecision>,
): number {
  let recorded = 0;
  for (const decision of decisions) {
    if (shouldRecordMemory(state, decision)) {
      state.deps.memory.record({
        npcId: decision.npcId,
        category: 'decision',
        content: decision.actionType,
        salience: decision.confidence,
      });
      recorded += 1;
    }
  }
  return recorded;
}

function shouldRecordMemory(
  state: OrchestratorState,
  decision: ShuttleDecision,
): boolean {
  if (decision.outcome !== 'act') return false;
  return decision.confidence >= state.config.memoryRecordThreshold;
}

function pruneStaleMemories(
  state: OrchestratorState,
  npcs: ReadonlyArray<ShuttleNpcRecord>,
): number {
  let pruned = 0;
  for (const npc of npcs) {
    const maxAge = getPruneAge(state.config, npc.tier);
    if (maxAge > 0) {
      pruned += state.deps.memory.prune(npc.npcId, maxAge);
    }
  }
  return pruned;
}

function getPruneAge(config: ShuttleOrchestratorConfig, tier: number): number {
  if (tier <= 1) return config.tier1PruneAgeUs;
  if (tier === 2) return config.tier2PruneAgeUs;
  return 0;
}

// ─── Exports ────────────────────────────────────────────────────────

export { createShuttleOrchestrator, DEFAULT_SHUTTLE_CONFIG };
