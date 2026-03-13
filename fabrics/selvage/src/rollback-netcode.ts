/**
 * rollback-netcode.ts — Client-side prediction v2 with rollback.
 *
 * NEXT-STEPS Phase 17.5: "Client-side prediction v2: rollback netcode
 * for competitive play."
 *
 * Approach:
 *   1. Client speculatively applies inputs each frame via `predict()`.
 *   2. When server acks a frame via `confirm()`, compare checksums.
 *   3. On mismatch: roll back to the server's authoritative state,
 *      re-apply all buffered inputs, producing a corrected prediction.
 *
 * Callers supply `applyInput` (pure) and `computeChecksum` (pure) as
 * deps, keeping game-specific logic outside this module.
 *
 * Thread: steel/selvage/rollback-netcode
 * Tier: 1
 */

// ── Types ──────────────────────────────────────────────────────────────

export type FrameNumber = number;
export type PlayerId = string;

export interface ClientInput {
  readonly frame: FrameNumber;
  readonly playerId: PlayerId;
  readonly actions: readonly string[];
  readonly timestampMs: number;
}

export interface EntitySnapshot {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly extras: Readonly<Record<string, unknown>>;
}

export interface GameState {
  readonly frame: FrameNumber;
  readonly entities: ReadonlyArray<EntitySnapshot>;
  readonly checksum: string;
}

export interface PredictionResult {
  readonly frame: FrameNumber;
  readonly state: GameState;
  readonly bufferedInputCount: number;
}

export interface RollbackResult {
  readonly rolledBackTo: FrameNumber;
  readonly reappliedFrames: number;
  readonly divergenceDetected: boolean;
}

export interface RollbackNetcodeStats {
  readonly totalPredictions: number;
  readonly totalRollbacks: number;
  readonly totalMispredictions: number;
  readonly maxRollbackDepth: number;
  readonly currentBufferDepth: number;
}

// ── Ports ──────────────────────────────────────────────────────────────

export interface RollbackClockPort { readonly nowMs: () => number; }
export interface RollbackLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface RollbackNetecodeDeps {
  readonly clock: RollbackClockPort;
  readonly log: RollbackLogPort;
  readonly applyInput: (state: GameState, input: ClientInput) => GameState;
  readonly computeChecksum: (state: GameState) => string;
}

// ── Public interface ───────────────────────────────────────────────────

export interface RollbackNetcode {
  readonly predict: (input: ClientInput, currentState: GameState) => PredictionResult;
  readonly confirm: (serverFrame: FrameNumber, serverState: GameState) => RollbackResult | undefined;
  readonly getConfirmedState: () => GameState | undefined;
  readonly getPredictedState: () => GameState | undefined;
  readonly getStats: () => RollbackNetcodeStats;
}

// ── Internal state ─────────────────────────────────────────────────────

interface Internals {
  confirmedState: GameState | undefined;
  predictedState: GameState | undefined;
  inputBuffer: Map<FrameNumber, ClientInput>;
  predictions: number;
  rollbacks: number;
  mispredictions: number;
  maxDepth: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function reapplyInputs(
  base: GameState,
  inputs: Map<FrameNumber, ClientInput>,
  fromFrame: FrameNumber,
  apply: (state: GameState, input: ClientInput) => GameState,
): GameState {
  let state = base;
  const sortedFrames = [...inputs.keys()].filter((f) => f > fromFrame).sort((a, b) => a - b);
  for (const f of sortedFrames) {
    const inp = inputs.get(f);
    if (inp !== undefined) state = apply(state, inp);
  }
  return state;
}

function pruneBuffer(buffer: Map<FrameNumber, ClientInput>, confirmedFrame: FrameNumber): void {
  for (const f of buffer.keys()) {
    if (f <= confirmedFrame) buffer.delete(f);
  }
}

function makePredict(state: Internals, deps: RollbackNetecodeDeps) {
  return function predict(input: ClientInput, currentState: GameState): PredictionResult {
    state.inputBuffer.set(input.frame, input);
    state.predictedState = deps.applyInput(currentState, input);
    state.predictions++;
    const depth = state.inputBuffer.size;
    if (depth > state.maxDepth) state.maxDepth = depth;
    return { frame: state.predictedState.frame, state: state.predictedState, bufferedInputCount: depth };
  };
}

function makeConfirm(state: Internals, deps: RollbackNetecodeDeps) {
  return function confirm(serverFrame: FrameNumber, serverState: GameState): RollbackResult | undefined {
    const predicted = state.predictedState;
    if (predicted === undefined || predicted.frame < serverFrame) return undefined;

    state.confirmedState = serverState;
    const diverged = serverState.frame === predicted.frame && serverState.checksum !== predicted.checksum;
    if (diverged) state.mispredictions++;

    const depth = state.inputBuffer.size;
    const reapplied = reapplyInputs(serverState, state.inputBuffer, serverFrame, deps.applyInput);
    state.predictedState = reapplied;

    if (diverged) {
      state.rollbacks++;
      deps.log.warn('Rollback triggered', { serverFrame, serverChecksum: serverState.checksum });
    }
    pruneBuffer(state.inputBuffer, serverFrame);
    return { rolledBackTo: serverFrame, reappliedFrames: depth, divergenceDetected: diverged };
  };
}

// ── Factory ────────────────────────────────────────────────────────────

export function createRollbackNetcode(deps: RollbackNetecodeDeps): RollbackNetcode {
  const state: Internals = {
    confirmedState: undefined,
    predictedState: undefined,
    inputBuffer: new Map(),
    predictions: 0,
    rollbacks: 0,
    mispredictions: 0,
    maxDepth: 0,
  };

  return Object.freeze({
    predict: makePredict(state, deps),
    confirm: makeConfirm(state, deps),
    getConfirmedState: () => state.confirmedState,
    getPredictedState: () => state.predictedState,
    getStats: () => Object.freeze({
      totalPredictions: state.predictions,
      totalRollbacks: state.rollbacks,
      totalMispredictions: state.mispredictions,
      maxRollbackDepth: state.maxDepth,
      currentBufferDepth: state.inputBuffer.size,
    }),
  });
}
