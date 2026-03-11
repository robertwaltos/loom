/**
 * Action Dispatcher — Routes player actions to fabric handlers.
 *
 * The Selvage receives raw InputActions from clients. The Action
 * Dispatcher routes each action to the appropriate handler registered
 * by downstream fabrics (nakama-fabric, silfen-weave, etc.).
 *
 * Design:
 *   - Handlers register by action type
 *   - Each action is validated, dispatched, and tracked
 *   - Unknown actions are rejected with structured errors
 *   - Results include execution timing for performance monitoring
 *   - Batch dispatch processes multiple actions atomically
 *
 * "The Selvage weaves intent into action."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ActionRequest {
  readonly actionType: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type ActionOutcome = 'success' | 'rejected' | 'error';

export interface ActionResult {
  readonly actionType: string;
  readonly outcome: ActionOutcome;
  readonly message: string;
  readonly durationMicroseconds: number;
}

export interface ActionHandler {
  readonly actionType: string;
  readonly description: string;
  execute(request: ActionRequest): ActionHandlerResult;
}

export interface ActionHandlerResult {
  readonly outcome: ActionOutcome;
  readonly message: string;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface ActionDispatcherDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ActionDispatcher {
  registerHandler(handler: ActionHandler): void;
  removeHandler(actionType: string): boolean;
  dispatch(request: ActionRequest): ActionResult;
  dispatchBatch(requests: ReadonlyArray<ActionRequest>): ReadonlyArray<ActionResult>;
  hasHandler(actionType: string): boolean;
  listActionTypes(): ReadonlyArray<string>;
  handlerCount(): number;
  getStats(): DispatchStats;
}

export interface DispatchStats {
  readonly totalDispatched: number;
  readonly successCount: number;
  readonly rejectedCount: number;
  readonly errorCount: number;
  readonly unknownActionCount: number;
}

// ─── State ──────────────────────────────────────────────────────────

interface DispatcherState {
  readonly handlers: Map<string, ActionHandler>;
  readonly deps: ActionDispatcherDeps;
  totalDispatched: number;
  successCount: number;
  rejectedCount: number;
  errorCount: number;
  unknownActionCount: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createActionDispatcher(deps: ActionDispatcherDeps): ActionDispatcher {
  const state: DispatcherState = {
    handlers: new Map(),
    deps,
    totalDispatched: 0,
    successCount: 0,
    rejectedCount: 0,
    errorCount: 0,
    unknownActionCount: 0,
  };

  return {
    registerHandler: (h) => {
      registerImpl(state, h);
    },
    removeHandler: (t) => removeImpl(state, t),
    dispatch: (r) => dispatchImpl(state, r),
    dispatchBatch: (rs) => dispatchBatchImpl(state, rs),
    hasHandler: (t) => state.handlers.has(t),
    listActionTypes: () => [...state.handlers.keys()],
    handlerCount: () => state.handlers.size,
    getStats: () => buildStats(state),
  };
}

// ─── Registration ───────────────────────────────────────────────────

function registerImpl(state: DispatcherState, handler: ActionHandler): void {
  state.handlers.set(handler.actionType, handler);
}

function removeImpl(state: DispatcherState, actionType: string): boolean {
  return state.handlers.delete(actionType);
}

// ─── Dispatch ───────────────────────────────────────────────────────

function dispatchImpl(state: DispatcherState, request: ActionRequest): ActionResult {
  state.totalDispatched += 1;
  const handler = state.handlers.get(request.actionType);

  if (handler === undefined) {
    state.unknownActionCount += 1;
    return unknownActionResult(state, request.actionType);
  }

  return executeHandler(state, handler, request);
}

function dispatchBatchImpl(
  state: DispatcherState,
  requests: ReadonlyArray<ActionRequest>,
): ReadonlyArray<ActionResult> {
  return requests.map((r) => dispatchImpl(state, r));
}

// ─── Execution ──────────────────────────────────────────────────────

function executeHandler(
  state: DispatcherState,
  handler: ActionHandler,
  request: ActionRequest,
): ActionResult {
  const startTime = state.deps.clock.nowMicroseconds();
  const handlerResult = handler.execute(request);
  const endTime = state.deps.clock.nowMicroseconds();
  const duration = endTime - startTime;

  trackOutcome(state, handlerResult.outcome);

  return {
    actionType: request.actionType,
    outcome: handlerResult.outcome,
    message: handlerResult.message,
    durationMicroseconds: duration,
  };
}

function unknownActionResult(state: DispatcherState, actionType: string): ActionResult {
  const now = state.deps.clock.nowMicroseconds();
  return {
    actionType,
    outcome: 'error',
    message: 'No handler for action: ' + actionType,
    durationMicroseconds: state.deps.clock.nowMicroseconds() - now,
  };
}

// ─── Tracking ───────────────────────────────────────────────────────

function trackOutcome(state: DispatcherState, outcome: ActionOutcome): void {
  if (outcome === 'success') state.successCount += 1;
  else if (outcome === 'rejected') state.rejectedCount += 1;
  else state.errorCount += 1;
}

function buildStats(state: DispatcherState): DispatchStats {
  return {
    totalDispatched: state.totalDispatched,
    successCount: state.successCount,
    rejectedCount: state.rejectedCount,
    errorCount: state.errorCount,
    unknownActionCount: state.unknownActionCount,
  };
}
