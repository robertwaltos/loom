/**
 * cqrs-handler.ts — Command-Query Responsibility Segregation registry.
 *
 * Separates write operations (commands) from read operations (queries)
 * with independent handler registries, execution tracking, and
 * per-handler statistics. Commands mutate state; queries read it.
 *
 * "The Loom distinguishes intent from observation."
 */

// ── Ports ────────────────────────────────────────────────────────

interface CqrsClock {
  readonly nowMicroseconds: () => number;
}

interface CqrsIdGenerator {
  readonly next: () => string;
}

interface CqrsDeps {
  readonly clock: CqrsClock;
  readonly idGenerator: CqrsIdGenerator;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_EXECUTION_LOG_SIZE = 10_000;
const DEFAULT_TIMEOUT_US = 5_000_000;

// ── Types ────────────────────────────────────────────────────────

type HandlerType = 'COMMAND' | 'QUERY';

type CommandHandlerFn = (payload: Record<string, unknown>) => Record<string, unknown>;

type QueryHandlerFn = (payload: Record<string, unknown>) => Record<string, unknown>;

interface CommandEnvelope {
  readonly commandType: string;
  readonly payload: Record<string, unknown>;
  readonly issuedBy: string;
  readonly correlationId: string;
}

interface QueryEnvelope {
  readonly queryType: string;
  readonly payload: Record<string, unknown>;
  readonly issuedBy: string;
  readonly correlationId: string;
}

interface HandlerRegistration {
  readonly type: string;
  readonly handlerType: HandlerType;
  readonly registeredAt: number;
}

interface ExecutionResult {
  readonly success: boolean;
  readonly data: Record<string, unknown> | null;
  readonly error: string | null;
  readonly executionId: string;
  readonly durationUs: number;
}

type CqrsEventKind =
  | 'COMMAND_EXECUTED'
  | 'COMMAND_FAILED'
  | 'QUERY_EXECUTED'
  | 'QUERY_FAILED'
  | 'HANDLER_REGISTERED'
  | 'HANDLER_REMOVED';

interface CqrsEvent {
  readonly eventId: string;
  readonly kind: CqrsEventKind;
  readonly handlerType: HandlerType;
  readonly type: string;
  readonly occurredAt: number;
  readonly durationUs: number | null;
  readonly error: string | null;
}

interface HandlerStats {
  readonly type: string;
  readonly handlerType: HandlerType;
  readonly totalExecutions: number;
  readonly totalSuccesses: number;
  readonly totalFailures: number;
  readonly lastExecutedAt: number | null;
}

interface CqrsStats {
  readonly totalCommandHandlers: number;
  readonly totalQueryHandlers: number;
  readonly totalCommandExecutions: number;
  readonly totalQueryExecutions: number;
  readonly totalSuccesses: number;
  readonly totalFailures: number;
  readonly logSize: number;
}

interface CqrsHandler {
  readonly registerCommandHandler: (commandType: string, handler: CommandHandlerFn) => void;
  readonly registerQueryHandler: (queryType: string, handler: QueryHandlerFn) => void;
  readonly executeCommand: (envelope: CommandEnvelope) => ExecutionResult;
  readonly executeQuery: (envelope: QueryEnvelope) => ExecutionResult;
  readonly hasHandler: (type: string, handlerType: HandlerType) => boolean;
  readonly removeHandler: (type: string, handlerType: HandlerType) => boolean;
  readonly getHandlerStats: (type: string) => HandlerStats | undefined;
  readonly listRegisteredTypes: (handlerType?: HandlerType) => readonly string[];
  readonly getExecutionLog: (limit: number) => readonly CqrsEvent[];
  readonly getStats: () => CqrsStats;
}

// ── Internal Mutable State ──────────────────────────────────────

interface MutableHandlerStats {
  readonly type: string;
  readonly handlerType: HandlerType;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  lastExecutedAt: number | null;
}

interface HandlerEntry {
  readonly fn: CommandHandlerFn | QueryHandlerFn;
  readonly registration: HandlerRegistration;
  readonly stats: MutableHandlerStats;
}

interface CqrsState {
  readonly deps: CqrsDeps;
  readonly commandHandlers: Map<string, HandlerEntry>;
  readonly queryHandlers: Map<string, HandlerEntry>;
  readonly executionLog: CqrsEvent[];
  totalCommandExecutions: number;
  totalQueryExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
}

// ── Helpers ─────────────────────────────────────────────────────

function recordCqrsEvent(
  state: CqrsState,
  kind: CqrsEventKind,
  handlerType: HandlerType,
  type: string,
  durationUs: number | null,
  error: string | null,
): void {
  const event: CqrsEvent = {
    eventId: state.deps.idGenerator.next(),
    kind,
    handlerType,
    type,
    occurredAt: state.deps.clock.nowMicroseconds(),
    durationUs,
    error,
  };
  state.executionLog.push(event);
  trimLog(state);
}

function trimLog(state: CqrsState): void {
  if (state.executionLog.length > MAX_EXECUTION_LOG_SIZE) {
    const excess = state.executionLog.length - MAX_EXECUTION_LOG_SIZE;
    state.executionLog.splice(0, excess);
  }
}

function toReadonlyStats(s: MutableHandlerStats): HandlerStats {
  return {
    type: s.type,
    handlerType: s.handlerType,
    totalExecutions: s.totalExecutions,
    totalSuccesses: s.totalSuccesses,
    totalFailures: s.totalFailures,
    lastExecutedAt: s.lastExecutedAt,
  };
}

function getHandlerMap(state: CqrsState, handlerType: HandlerType): Map<string, HandlerEntry> {
  return handlerType === 'COMMAND' ? state.commandHandlers : state.queryHandlers;
}

// ── Operations ──────────────────────────────────────────────────

function registerCommandHandlerImpl(
  state: CqrsState,
  commandType: string,
  handler: CommandHandlerFn,
): void {
  const entry: HandlerEntry = {
    fn: handler,
    registration: {
      type: commandType,
      handlerType: 'COMMAND',
      registeredAt: state.deps.clock.nowMicroseconds(),
    },
    stats: {
      type: commandType,
      handlerType: 'COMMAND',
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastExecutedAt: null,
    },
  };
  state.commandHandlers.set(commandType, entry);
  recordCqrsEvent(state, 'HANDLER_REGISTERED', 'COMMAND', commandType, null, null);
}

function registerQueryHandlerImpl(
  state: CqrsState,
  queryType: string,
  handler: QueryHandlerFn,
): void {
  const entry: HandlerEntry = {
    fn: handler,
    registration: {
      type: queryType,
      handlerType: 'QUERY',
      registeredAt: state.deps.clock.nowMicroseconds(),
    },
    stats: {
      type: queryType,
      handlerType: 'QUERY',
      totalExecutions: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastExecutedAt: null,
    },
  };
  state.queryHandlers.set(queryType, entry);
  recordCqrsEvent(state, 'HANDLER_REGISTERED', 'QUERY', queryType, null, null);
}

function executeCommandImpl(state: CqrsState, envelope: CommandEnvelope): ExecutionResult {
  const executionId = state.deps.idGenerator.next();
  const entry = state.commandHandlers.get(envelope.commandType);
  if (!entry) {
    return buildNotFoundResult(state, executionId, 'COMMAND', envelope.commandType);
  }
  return executeHandler(state, executionId, entry, envelope.payload, 'COMMAND');
}

function executeQueryImpl(state: CqrsState, envelope: QueryEnvelope): ExecutionResult {
  const executionId = state.deps.idGenerator.next();
  const entry = state.queryHandlers.get(envelope.queryType);
  if (!entry) {
    return buildNotFoundResult(state, executionId, 'QUERY', envelope.queryType);
  }
  return executeHandler(state, executionId, entry, envelope.payload, 'QUERY');
}

function buildNotFoundResult(
  state: CqrsState,
  executionId: string,
  handlerType: HandlerType,
  type: string,
): ExecutionResult {
  const error = 'No ' + handlerType.toLowerCase() + ' handler for: ' + type;
  if (handlerType === 'COMMAND') {
    state.totalCommandExecutions += 1;
  } else {
    state.totalQueryExecutions += 1;
  }
  state.totalFailures += 1;
  recordCqrsEvent(
    state,
    handlerType === 'COMMAND' ? 'COMMAND_FAILED' : 'QUERY_FAILED',
    handlerType,
    type,
    0,
    error,
  );
  return { success: false, data: null, error, executionId, durationUs: 0 };
}

function executeHandler(
  state: CqrsState,
  executionId: string,
  entry: HandlerEntry,
  payload: Record<string, unknown>,
  handlerType: HandlerType,
): ExecutionResult {
  const startTime = state.deps.clock.nowMicroseconds();
  const type = entry.registration.type;
  if (handlerType === 'COMMAND') {
    state.totalCommandExecutions += 1;
  } else {
    state.totalQueryExecutions += 1;
  }
  try {
    const data = entry.fn(payload);
    const durationUs = state.deps.clock.nowMicroseconds() - startTime;
    entry.stats.totalExecutions += 1;
    entry.stats.totalSuccesses += 1;
    entry.stats.lastExecutedAt = state.deps.clock.nowMicroseconds();
    state.totalSuccesses += 1;
    recordCqrsEvent(
      state,
      handlerType === 'COMMAND' ? 'COMMAND_EXECUTED' : 'QUERY_EXECUTED',
      handlerType,
      type,
      durationUs,
      null,
    );
    return { success: true, data, error: null, executionId, durationUs };
  } catch (thrown: unknown) {
    const durationUs = state.deps.clock.nowMicroseconds() - startTime;
    const errorMsg = thrown instanceof Error ? thrown.message : 'Unknown error';
    entry.stats.totalExecutions += 1;
    entry.stats.totalFailures += 1;
    entry.stats.lastExecutedAt = state.deps.clock.nowMicroseconds();
    state.totalFailures += 1;
    recordCqrsEvent(
      state,
      handlerType === 'COMMAND' ? 'COMMAND_FAILED' : 'QUERY_FAILED',
      handlerType,
      type,
      durationUs,
      errorMsg,
    );
    return {
      success: false,
      data: null,
      error: errorMsg,
      executionId,
      durationUs,
    };
  }
}

function hasHandlerImpl(state: CqrsState, type: string, handlerType: HandlerType): boolean {
  return getHandlerMap(state, handlerType).has(type);
}

function removeHandlerImpl(state: CqrsState, type: string, handlerType: HandlerType): boolean {
  const removed = getHandlerMap(state, handlerType).delete(type);
  if (removed) {
    recordCqrsEvent(state, 'HANDLER_REMOVED', handlerType, type, null, null);
  }
  return removed;
}

function getHandlerStatsImpl(state: CqrsState, type: string): HandlerStats | undefined {
  const cmdEntry = state.commandHandlers.get(type);
  if (cmdEntry) return toReadonlyStats(cmdEntry.stats);
  const queryEntry = state.queryHandlers.get(type);
  if (queryEntry) return toReadonlyStats(queryEntry.stats);
  return undefined;
}

function listRegisteredTypesImpl(state: CqrsState, handlerType?: HandlerType): string[] {
  const result: string[] = [];
  if (!handlerType || handlerType === 'COMMAND') {
    for (const key of state.commandHandlers.keys()) {
      result.push(key);
    }
  }
  if (!handlerType || handlerType === 'QUERY') {
    for (const key of state.queryHandlers.keys()) {
      result.push(key);
    }
  }
  return result;
}

function getExecutionLogImpl(state: CqrsState, limit: number): CqrsEvent[] {
  const len = state.executionLog.length;
  const start = Math.max(0, len - limit);
  return state.executionLog.slice(start);
}

function getStatsImpl(state: CqrsState): CqrsStats {
  return {
    totalCommandHandlers: state.commandHandlers.size,
    totalQueryHandlers: state.queryHandlers.size,
    totalCommandExecutions: state.totalCommandExecutions,
    totalQueryExecutions: state.totalQueryExecutions,
    totalSuccesses: state.totalSuccesses,
    totalFailures: state.totalFailures,
    logSize: state.executionLog.length,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createCqrsHandler(deps: CqrsDeps): CqrsHandler {
  const state: CqrsState = {
    deps,
    commandHandlers: new Map(),
    queryHandlers: new Map(),
    executionLog: [],
    totalCommandExecutions: 0,
    totalQueryExecutions: 0,
    totalSuccesses: 0,
    totalFailures: 0,
  };
  return {
    registerCommandHandler: (t, h) => {
      registerCommandHandlerImpl(state, t, h);
    },
    registerQueryHandler: (t, h) => {
      registerQueryHandlerImpl(state, t, h);
    },
    executeCommand: (e) => executeCommandImpl(state, e),
    executeQuery: (e) => executeQueryImpl(state, e),
    hasHandler: (t, ht) => hasHandlerImpl(state, t, ht),
    removeHandler: (t, ht) => removeHandlerImpl(state, t, ht),
    getHandlerStats: (t) => getHandlerStatsImpl(state, t),
    listRegisteredTypes: (ht) => listRegisteredTypesImpl(state, ht),
    getExecutionLog: (l) => getExecutionLogImpl(state, l),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createCqrsHandler, MAX_EXECUTION_LOG_SIZE, DEFAULT_TIMEOUT_US };
export type {
  CqrsHandler,
  CqrsDeps,
  HandlerType,
  CommandHandlerFn,
  QueryHandlerFn,
  CommandEnvelope,
  QueryEnvelope,
  HandlerRegistration,
  ExecutionResult,
  CqrsEvent,
  CqrsEventKind,
  HandlerStats,
  CqrsStats,
};
