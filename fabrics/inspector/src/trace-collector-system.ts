/**
 * Trace Collector System — Distributed request tracing with span collection.
 *
 * Full lifecycle for traces and spans: start, end, error tracking, and
 * cross-service correlation via parent span IDs.
 *
 * "Every thread through The Loom leaves a trace."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface TracerClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface TracerIdGenPort {
  readonly next: () => string;
}

interface TracerLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type TraceId = string;
export type SpanId = string;
export type ServiceName = string;

export type TracerError =
  | 'trace-not-found'
  | 'span-not-found'
  | 'already-exists'
  | 'invalid-duration'
  | 'parent-not-found';

export type SpanStatus = 'IN_PROGRESS' | 'SUCCESS' | 'ERROR' | 'TIMEOUT';

export interface TraceSpan {
  readonly spanId: SpanId;
  readonly traceId: TraceId;
  readonly parentSpanId: SpanId | null;
  readonly serviceName: ServiceName;
  readonly operationName: string;
  status: SpanStatus;
  readonly startedAt: bigint;
  endedAt: bigint | null;
  durationUs: bigint | null;
  readonly tags: Record<string, string>;
  errorMessage: string | null;
}

export interface Trace {
  readonly traceId: TraceId;
  readonly rootSpanId: SpanId;
  readonly serviceName: ServiceName;
  readonly startedAt: bigint;
  endedAt: bigint | null;
  totalSpans: number;
  errorCount: number;
}

export interface TraceStats {
  readonly totalTraces: number;
  readonly completedTraces: number;
  readonly errorRate: number;
  readonly avgDurationUs: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface TraceCollectorSystem {
  startTrace(
    traceId: TraceId,
    rootServiceName: ServiceName,
    rootOperation: string,
    tags?: Record<string, string>,
  ): Trace | TracerError;
  startSpan(
    traceId: TraceId,
    serviceName: ServiceName,
    operationName: string,
    parentSpanId: SpanId | null,
    tags?: Record<string, string>,
  ): TraceSpan | TracerError;
  endSpan(
    spanId: SpanId,
    status: SpanStatus,
    errorMessage?: string,
  ): { success: true } | { success: false; error: TracerError };
  getTrace(traceId: TraceId): Trace | undefined;
  getSpan(spanId: SpanId): TraceSpan | undefined;
  listSpans(traceId: TraceId): ReadonlyArray<TraceSpan>;
  getStats(): TraceStats;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface TraceCollectorSystemDeps {
  readonly clock: TracerClockPort;
  readonly idGen: TracerIdGenPort;
  readonly logger: TracerLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface CollectorState {
  readonly traces: Map<TraceId, Trace>;
  readonly spans: Map<SpanId, TraceSpan>;
  readonly spansByTrace: Map<TraceId, SpanId[]>;
  readonly deps: TraceCollectorSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createTraceCollectorSystem(deps: TraceCollectorSystemDeps): TraceCollectorSystem {
  const state: CollectorState = {
    traces: new Map(),
    spans: new Map(),
    spansByTrace: new Map(),
    deps,
  };

  return {
    startTrace: (traceId, rootServiceName, rootOperation, tags) =>
      startTraceImpl(state, traceId, rootServiceName, rootOperation, tags),
    startSpan: (traceId, serviceName, operationName, parentSpanId, tags) =>
      startSpanImpl(state, traceId, serviceName, operationName, parentSpanId, tags),
    endSpan: (spanId, status, errorMessage) => endSpanImpl(state, spanId, status, errorMessage),
    getTrace: (traceId) => state.traces.get(traceId),
    getSpan: (spanId) => state.spans.get(spanId),
    listSpans: (traceId) => listSpansImpl(state, traceId),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Start Trace ──────────────────────────────────────────────────────────────

function startTraceImpl(
  state: CollectorState,
  traceId: TraceId,
  rootServiceName: ServiceName,
  rootOperation: string,
  tags?: Record<string, string>,
): Trace | TracerError {
  if (state.traces.has(traceId)) return 'already-exists';

  const now = state.deps.clock.nowMicroseconds();
  const rootSpanId = state.deps.idGen.next();
  const rootSpan = buildSpan(rootSpanId, traceId, null, rootServiceName, rootOperation, now, tags);
  const trace = buildTrace(traceId, rootSpanId, rootServiceName, now);

  state.traces.set(traceId, trace);
  state.spans.set(rootSpanId, rootSpan);
  state.spansByTrace.set(traceId, [rootSpanId]);

  state.deps.logger.info('trace-started', { traceId, rootSpanId, rootServiceName });
  return trace;
}

function buildTrace(
  traceId: TraceId,
  rootSpanId: SpanId,
  serviceName: ServiceName,
  startedAt: bigint,
): Trace {
  return {
    traceId,
    rootSpanId,
    serviceName,
    startedAt,
    endedAt: null,
    totalSpans: 1,
    errorCount: 0,
  };
}

function buildSpan(
  spanId: SpanId,
  traceId: TraceId,
  parentSpanId: SpanId | null,
  serviceName: ServiceName,
  operationName: string,
  startedAt: bigint,
  tags?: Record<string, string>,
): TraceSpan {
  return {
    spanId,
    traceId,
    parentSpanId,
    serviceName,
    operationName,
    status: 'IN_PROGRESS',
    startedAt,
    endedAt: null,
    durationUs: null,
    tags: tags ?? {},
    errorMessage: null,
  };
}

// ─── Start Span ───────────────────────────────────────────────────────────────

function startSpanImpl(
  state: CollectorState,
  traceId: TraceId,
  serviceName: ServiceName,
  operationName: string,
  parentSpanId: SpanId | null,
  tags?: Record<string, string>,
): TraceSpan | TracerError {
  const trace = state.traces.get(traceId);
  if (trace === undefined) return 'trace-not-found';

  if (parentSpanId !== null) {
    const parent = state.spans.get(parentSpanId);
    if (parent === undefined || parent.traceId !== traceId) return 'parent-not-found';
  }

  const spanId = state.deps.idGen.next();
  const now = state.deps.clock.nowMicroseconds();
  const span = buildSpan(spanId, traceId, parentSpanId, serviceName, operationName, now, tags);

  registerSpan(state, traceId, spanId, span, trace);
  return span;
}

function registerSpan(
  state: CollectorState,
  traceId: TraceId,
  spanId: SpanId,
  span: TraceSpan,
  trace: Trace,
): void {
  state.spans.set(spanId, span);
  const traceSpans = state.spansByTrace.get(traceId) ?? [];
  traceSpans.push(spanId);
  state.spansByTrace.set(traceId, traceSpans);
  trace.totalSpans += 1;
}

// ─── End Span ─────────────────────────────────────────────────────────────────

function endSpanImpl(
  state: CollectorState,
  spanId: SpanId,
  status: SpanStatus,
  errorMessage?: string,
): { success: true } | { success: false; error: TracerError } {
  const span = state.spans.get(spanId);
  if (span === undefined) return { success: false, error: 'span-not-found' };

  const now = state.deps.clock.nowMicroseconds();
  span.endedAt = now;
  span.durationUs = now - span.startedAt;
  span.status = status;
  span.errorMessage = errorMessage ?? null;

  const trace = state.traces.get(span.traceId);
  if (trace !== undefined && status === 'ERROR') {
    trace.errorCount += 1;
  }

  if (trace !== undefined) {
    updateTraceEndedAt(state, trace);
  }

  state.deps.logger.info('span-ended', { spanId, status, durationUs: String(span.durationUs) });
  return { success: true };
}

function updateTraceEndedAt(state: CollectorState, trace: Trace): void {
  const spanIds = state.spansByTrace.get(trace.traceId) ?? [];
  const allEnded = spanIds.every((id) => {
    const s = state.spans.get(id);
    return s !== undefined && s.endedAt !== null;
  });

  if (!allEnded) return;

  let maxEndedAt = 0n;
  for (const id of spanIds) {
    const s = state.spans.get(id);
    if (s?.endedAt !== null && s?.endedAt !== undefined && s.endedAt > maxEndedAt) {
      maxEndedAt = s.endedAt;
    }
  }

  trace.endedAt = maxEndedAt;
}

// ─── List Spans ───────────────────────────────────────────────────────────────

function listSpansImpl(state: CollectorState, traceId: TraceId): ReadonlyArray<TraceSpan> {
  const spanIds = state.spansByTrace.get(traceId) ?? [];
  const result: TraceSpan[] = [];
  for (const spanId of spanIds) {
    const span = state.spans.get(spanId);
    if (span !== undefined) result.push(span);
  }
  return result;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function getStatsImpl(state: CollectorState): TraceStats {
  const totalTraces = state.traces.size;
  let completedTraces = 0;
  let errorTraces = 0;
  let totalDurationUs = 0n;

  for (const trace of state.traces.values()) {
    if (trace.endedAt !== null) {
      completedTraces += 1;
      totalDurationUs += trace.endedAt - trace.startedAt;
    }
    if (trace.errorCount > 0) {
      errorTraces += 1;
    }
  }

  const errorRate = totalTraces > 0 ? errorTraces / totalTraces : 0;
  const avgDurationUs = completedTraces > 0 ? totalDurationUs / BigInt(completedTraces) : 0n;

  return { totalTraces, completedTraces, errorRate, avgDurationUs };
}
