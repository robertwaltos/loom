/**
 * request-pipeline.ts — Composable request processing pipeline.
 *
 * Registers named middleware stages that execute in order.
 * Supports sync middleware, stage enable/disable, execution
 * tracking, and aggregate pipeline statistics.
 */

// ── Ports ────────────────────────────────────────────────────────

interface PipelineClock {
  readonly nowMicroseconds: () => number;
}

interface RequestPipelineDeps {
  readonly clock: PipelineClock;
}

// ── Types ────────────────────────────────────────────────────────

interface PipelineContext {
  readonly requestId: string;
  readonly values: Map<string, unknown>;
}

type StageHandler = (ctx: PipelineContext) => boolean;

interface PipelineStage {
  readonly name: string;
  readonly enabled: boolean;
  readonly order: number;
}

interface AddStageParams {
  readonly name: string;
  readonly handler: StageHandler;
  readonly order: number;
}

interface ExecutionResult {
  readonly success: boolean;
  readonly stagesRun: number;
  readonly failedStage: string | undefined;
  readonly durationUs: number;
}

interface PipelineStats {
  readonly totalStages: number;
  readonly enabledStages: number;
  readonly totalExecutions: number;
  readonly totalFailures: number;
}

interface RequestPipeline {
  readonly addStage: (params: AddStageParams) => boolean;
  readonly removeStage: (name: string) => boolean;
  readonly enableStage: (name: string) => boolean;
  readonly disableStage: (name: string) => boolean;
  readonly getStage: (name: string) => PipelineStage | undefined;
  readonly listStages: () => readonly PipelineStage[];
  readonly execute: (requestId: string) => ExecutionResult;
  readonly getStats: () => PipelineStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableStage {
  readonly name: string;
  readonly handler: StageHandler;
  enabled: boolean;
  readonly order: number;
}

interface PipelineState {
  readonly deps: RequestPipelineDeps;
  readonly stages: Map<string, MutableStage>;
  totalExecutions: number;
  totalFailures: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(stage: MutableStage): PipelineStage {
  return { name: stage.name, enabled: stage.enabled, order: stage.order };
}

function getSortedStages(state: PipelineState): MutableStage[] {
  const stages = [...state.stages.values()];
  stages.sort((a, b) => a.order - b.order);
  return stages;
}

// ── Operations ───────────────────────────────────────────────────

function addStageImpl(state: PipelineState, params: AddStageParams): boolean {
  if (state.stages.has(params.name)) return false;
  state.stages.set(params.name, {
    name: params.name,
    handler: params.handler,
    enabled: true,
    order: params.order,
  });
  return true;
}

function executeImpl(state: PipelineState, requestId: string): ExecutionResult {
  const start = state.deps.clock.nowMicroseconds();
  const sorted = getSortedStages(state);
  const ctx: PipelineContext = { requestId, values: new Map() };
  let stagesRun = 0;
  let failedStage: string | undefined;
  for (const stage of sorted) {
    if (!stage.enabled) continue;
    stagesRun += 1;
    const ok = stage.handler(ctx);
    if (!ok) {
      failedStage = stage.name;
      break;
    }
  }
  state.totalExecutions += 1;
  if (failedStage !== undefined) state.totalFailures += 1;
  const end = state.deps.clock.nowMicroseconds();
  return {
    success: failedStage === undefined,
    stagesRun,
    failedStage,
    durationUs: end - start,
  };
}

function enableStageImpl(state: PipelineState, name: string): boolean {
  const s = state.stages.get(name);
  if (!s) return false;
  s.enabled = true;
  return true;
}

function disableStageImpl(state: PipelineState, name: string): boolean {
  const s = state.stages.get(name);
  if (!s) return false;
  s.enabled = false;
  return true;
}

function getStatsImpl(state: PipelineState): PipelineStats {
  let enabled = 0;
  for (const stage of state.stages.values()) {
    if (stage.enabled) enabled += 1;
  }
  return {
    totalStages: state.stages.size,
    enabledStages: enabled,
    totalExecutions: state.totalExecutions,
    totalFailures: state.totalFailures,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createRequestPipeline(deps: RequestPipelineDeps): RequestPipeline {
  const state: PipelineState = {
    deps,
    stages: new Map(),
    totalExecutions: 0,
    totalFailures: 0,
  };
  return {
    addStage: (p) => addStageImpl(state, p),
    removeStage: (n) => state.stages.delete(n),
    enableStage: (n) => enableStageImpl(state, n),
    disableStage: (n) => disableStageImpl(state, n),
    getStage: (n) => {
      const s = state.stages.get(n);
      return s ? toReadonly(s) : undefined;
    },
    listStages: () => getSortedStages(state).map(toReadonly),
    execute: (rid) => executeImpl(state, rid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createRequestPipeline };
export type {
  RequestPipeline,
  RequestPipelineDeps,
  PipelineContext,
  StageHandler,
  PipelineStage,
  AddStageParams,
  ExecutionResult,
  PipelineStats,
};
