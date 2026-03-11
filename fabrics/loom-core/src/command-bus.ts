/**
 * Command Bus — Typed imperative command dispatch.
 *
 * Events describe what happened. Commands describe what should happen.
 * The Command Bus routes named commands to registered handlers,
 * supporting middleware pipelines for validation, authorization,
 * and logging before execution.
 *
 * "The Loom responds to intent, not just observation."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface Command {
  readonly type: string;
  readonly payload: unknown;
  readonly issuedBy: string;
  readonly issuedAt: number;
  readonly correlationId: string;
}

export type CommandResult =
  | { readonly success: true; readonly data: unknown }
  | { readonly success: false; readonly error: string; readonly code: string };

export type CommandHandler = (command: Command) => CommandResult;

export type CommandMiddleware = (command: Command, next: () => CommandResult) => CommandResult;

export interface CommandRegistration {
  readonly type: string;
  readonly handler: CommandHandler;
}

export interface CommandBusStats {
  readonly totalDispatched: number;
  readonly totalSucceeded: number;
  readonly totalFailed: number;
  readonly totalUnhandled: number;
  readonly handlerCount: number;
  readonly middlewareCount: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface CommandBus {
  register(type: string, handler: CommandHandler): void;
  unregister(type: string): boolean;
  use(middleware: CommandMiddleware): void;
  dispatch(command: Command): CommandResult;
  hasHandler(type: string): boolean;
  getStats(): CommandBusStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface BusState {
  readonly handlers: Map<string, CommandHandler>;
  readonly middlewares: CommandMiddleware[];
  totalDispatched: number;
  totalSucceeded: number;
  totalFailed: number;
  totalUnhandled: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createCommandBus(): CommandBus {
  const state: BusState = {
    handlers: new Map(),
    middlewares: [],
    totalDispatched: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalUnhandled: 0,
  };

  return {
    register: (t, h) => {
      registerImpl(state, t, h);
    },
    unregister: (t) => unregisterImpl(state, t),
    use: (m) => {
      useMiddleware(state, m);
    },
    dispatch: (c) => dispatchImpl(state, c),
    hasHandler: (t) => state.handlers.has(t),
    getStats: () => buildStats(state),
  };
}

// ─── Registration ───────────────────────────────────────────────────

function registerImpl(state: BusState, type: string, handler: CommandHandler): void {
  state.handlers.set(type, handler);
}

function unregisterImpl(state: BusState, type: string): boolean {
  return state.handlers.delete(type);
}

function useMiddleware(state: BusState, middleware: CommandMiddleware): void {
  state.middlewares.push(middleware);
}

// ─── Dispatch ───────────────────────────────────────────────────────

function dispatchImpl(state: BusState, command: Command): CommandResult {
  state.totalDispatched += 1;
  const handler = state.handlers.get(command.type);

  if (handler === undefined) {
    state.totalUnhandled += 1;
    return { success: false, error: 'No handler for ' + command.type, code: 'UNHANDLED' };
  }

  const result = executeWithMiddleware(state, command, handler);
  trackResult(state, result);
  return result;
}

function executeWithMiddleware(
  state: BusState,
  command: Command,
  handler: CommandHandler,
): CommandResult {
  if (state.middlewares.length === 0) {
    return handler(command);
  }
  return buildChain(state.middlewares, 0, command, handler);
}

function buildChain(
  middlewares: ReadonlyArray<CommandMiddleware>,
  index: number,
  command: Command,
  handler: CommandHandler,
): CommandResult {
  if (index >= middlewares.length) {
    return handler(command);
  }
  const current = middlewares[index];
  if (current === undefined) return handler(command);
  return current(command, () => buildChain(middlewares, index + 1, command, handler));
}

// ─── Tracking ───────────────────────────────────────────────────────

function trackResult(state: BusState, result: CommandResult): void {
  if (result.success) {
    state.totalSucceeded += 1;
  } else {
    state.totalFailed += 1;
  }
}

// ─── Stats ──────────────────────────────────────────────────────────

function buildStats(state: BusState): CommandBusStats {
  return {
    totalDispatched: state.totalDispatched,
    totalSucceeded: state.totalSucceeded,
    totalFailed: state.totalFailed,
    totalUnhandled: state.totalUnhandled,
    handlerCount: state.handlers.size,
    middlewareCount: state.middlewares.length,
  };
}
