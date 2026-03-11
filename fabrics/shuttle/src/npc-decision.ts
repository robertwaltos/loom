/**
 * NPC Decision Engine — Think/act loop for AI agents.
 *
 * Bible v1.1: NPCs act according to their tier's AI backend.
 * Tier 1 crowd agents use rule tables, Tier 2 use behavior trees,
 * Tier 3-4 use LLM inference. The Decision Engine abstracts this:
 *
 *   1. Perceive: Gather world context relevant to the NPC
 *   2. Decide: Route to the tier-appropriate decision backend
 *   3. Act: Return an action to be executed by the world
 *
 * The engine is stateless per tick — it receives perception, produces
 * decisions. Memory and learning live in NpcMemoryService.
 *
 * "Every NPC in The Loom has a reason for what they do.
 *  The crowd follows patterns. The notable follow purpose."
 */

import type { NpcTier, AiBackend } from './npc-tiers.js';

// ─── Types ───────────────────────────────────────────────────────────

export type DecisionOutcome = 'act' | 'idle' | 'defer';

export interface NpcPerception {
  readonly npcId: string;
  readonly worldId: string;
  readonly tier: NpcTier;
  readonly context: ReadonlyArray<ContextSignal>;
  readonly timestamp: number;
}

export interface ContextSignal {
  readonly type: string;
  readonly source: string;
  readonly value: string;
  readonly salience: number;
}

export interface NpcDecision {
  readonly npcId: string;
  readonly worldId: string;
  readonly actionType: string;
  readonly parameters: Readonly<Record<string, string>>;
  readonly outcome: DecisionOutcome;
  readonly confidence: number;
  readonly reasoningTrace: string;
  readonly decidedAt: number;
  readonly backendUsed: AiBackend;
}

export interface DecisionRequest {
  readonly perception: NpcPerception;
  readonly availableActions: ReadonlyArray<string>;
}

export interface DecisionStats {
  readonly totalDecisions: number;
  readonly actCount: number;
  readonly idleCount: number;
  readonly deferCount: number;
  readonly byBackend: Readonly<Record<AiBackend, number>>;
}

// ─── Backend Port ───────────────────────────────────────────────────

export interface DecisionBackend {
  readonly backend: AiBackend;
  decide(request: DecisionRequest): BackendResult;
}

export interface BackendResult {
  readonly actionType: string;
  readonly parameters: Readonly<Record<string, string>>;
  readonly outcome: DecisionOutcome;
  readonly confidence: number;
  readonly reasoningTrace: string;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface NpcDecisionDeps {
  readonly backends: ReadonlyArray<DecisionBackend>;
  readonly tierToBackend: TierBackendResolver;
  readonly clock: { nowMicroseconds(): number };
}

export interface TierBackendResolver {
  resolve(tier: NpcTier): AiBackend;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface NpcDecisionEngine {
  decide(request: DecisionRequest): NpcDecision;
  decideBatch(requests: ReadonlyArray<DecisionRequest>): ReadonlyArray<NpcDecision>;
  getStats(): DecisionStats;
  hasBackend(backend: AiBackend): boolean;
  listBackends(): ReadonlyArray<AiBackend>;
}

// ─── State ──────────────────────────────────────────────────────────

interface EngineState {
  readonly backendMap: Map<AiBackend, DecisionBackend>;
  readonly deps: NpcDecisionDeps;
  totalDecisions: number;
  actCount: number;
  idleCount: number;
  deferCount: number;
  readonly byBackend: Record<AiBackend, number>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createNpcDecisionEngine(deps: NpcDecisionDeps): NpcDecisionEngine {
  const backendMap = new Map<AiBackend, DecisionBackend>();
  for (const backend of deps.backends) {
    backendMap.set(backend.backend, backend);
  }

  const state: EngineState = {
    backendMap,
    deps,
    totalDecisions: 0,
    actCount: 0,
    idleCount: 0,
    deferCount: 0,
    byBackend: {
      mass_entity: 0,
      behavior_tree: 0,
      llm_haiku: 0,
      llm_opus: 0,
    },
  };

  return {
    decide: (req) => decideImpl(state, req),
    decideBatch: (reqs) => decideBatchImpl(state, reqs),
    getStats: () => getStatsImpl(state),
    hasBackend: (b) => backendMap.has(b),
    listBackends: () => [...backendMap.keys()],
  };
}

// ─── Decision Logic ─────────────────────────────────────────────────

function decideImpl(state: EngineState, request: DecisionRequest): NpcDecision {
  const aiBackend = state.deps.tierToBackend.resolve(request.perception.tier);
  const backend = state.backendMap.get(aiBackend);

  if (backend === undefined) {
    return buildIdleDecision(state, request, aiBackend);
  }

  const result = backend.decide(request);
  return buildDecision(state, request, aiBackend, result);
}

function decideBatchImpl(
  state: EngineState,
  requests: ReadonlyArray<DecisionRequest>,
): ReadonlyArray<NpcDecision> {
  return requests.map((r) => decideImpl(state, r));
}

// ─── Decision Building ──────────────────────────────────────────────

function buildDecision(
  state: EngineState,
  request: DecisionRequest,
  aiBackend: AiBackend,
  result: BackendResult,
): NpcDecision {
  trackOutcome(state, result.outcome, aiBackend);

  return {
    npcId: request.perception.npcId,
    worldId: request.perception.worldId,
    actionType: result.actionType,
    parameters: result.parameters,
    outcome: result.outcome,
    confidence: clampConfidence(result.confidence),
    reasoningTrace: result.reasoningTrace,
    decidedAt: state.deps.clock.nowMicroseconds(),
    backendUsed: aiBackend,
  };
}

function buildIdleDecision(
  state: EngineState,
  request: DecisionRequest,
  aiBackend: AiBackend,
): NpcDecision {
  trackOutcome(state, 'idle', aiBackend);

  return {
    npcId: request.perception.npcId,
    worldId: request.perception.worldId,
    actionType: 'idle',
    parameters: {},
    outcome: 'idle',
    confidence: 0,
    reasoningTrace: 'No backend available for ' + aiBackend,
    decidedAt: state.deps.clock.nowMicroseconds(),
    backendUsed: aiBackend,
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

function trackOutcome(state: EngineState, outcome: DecisionOutcome, backend: AiBackend): void {
  state.totalDecisions += 1;
  state.byBackend[backend] += 1;

  if (outcome === 'act') {
    state.actCount += 1;
  } else if (outcome === 'idle') {
    state.idleCount += 1;
  } else {
    state.deferCount += 1;
  }
}

function getStatsImpl(state: EngineState): DecisionStats {
  return {
    totalDecisions: state.totalDecisions,
    actCount: state.actCount,
    idleCount: state.idleCount,
    deferCount: state.deferCount,
    byBackend: { ...state.byBackend },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function clampConfidence(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
