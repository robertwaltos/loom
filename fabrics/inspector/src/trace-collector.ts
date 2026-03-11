/**
 * Trace Collector — Distributed tracing, span correlation
 * Fabric: inspector
 * Thread tier: M (Multi-agent orchestration)
 */

// ============================================================================
// Port Definitions (duplicated per fabric isolation)
// ============================================================================

interface TraceCollectorClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface TraceCollectorLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type TraceId = string;
export type SpanId = string;

export interface TraceSpan {
  readonly traceId: TraceId;
  readonly spanId: SpanId;
  readonly parentSpanId?: SpanId;
  readonly operationName: string;
  readonly startMicros: bigint;
  endMicros?: bigint;
  readonly tags: Map<string, string>;
  readonly logs: Array<{ timestampMicros: bigint; message: string }>;
}

export interface SpanCorrelation {
  readonly traceId: TraceId;
  readonly rootSpanId: SpanId;
  readonly spanCount: number;
  readonly totalDurationMicros: bigint;
  readonly longestSpanId: SpanId;
}

export interface TraceReport {
  readonly traceId: TraceId;
  readonly spans: TraceSpan[];
  readonly totalDurationMicros: bigint;
  readonly spanCount: number;
  readonly maxDepth: number;
  readonly criticalPath: SpanId[];
}

export type StartSpanResult = 'OK' | 'SPAN_ALREADY_EXISTS';
export type EndSpanResult = 'OK' | 'SPAN_NOT_FOUND' | 'SPAN_ALREADY_ENDED';
export type AddTagResult = 'OK' | 'SPAN_NOT_FOUND';

// ============================================================================
// State
// ============================================================================

interface TraceCollectorState {
  readonly spans: Map<SpanId, TraceSpan>;
  readonly traceIndex: Map<TraceId, Set<SpanId>>;
  totalSpans: bigint;
  totalTraces: bigint;
  readonly slowThresholdMicros: bigint;
}

export interface TraceCollectorDeps {
  readonly clock: TraceCollectorClockPort;
  readonly logger: TraceCollectorLoggerPort;
}

export interface TraceCollector {
  readonly startSpan: (
    traceId: TraceId,
    spanId: SpanId,
    operationName: string,
    parentSpanId?: SpanId,
  ) => StartSpanResult;
  readonly endSpan: (spanId: SpanId) => EndSpanResult;
  readonly addSpanTag: (spanId: SpanId, key: string, value: string) => AddTagResult;
  readonly addSpanLog: (spanId: SpanId, message: string) => AddTagResult;
  readonly getSpan: (spanId: SpanId) => TraceSpan | 'SPAN_NOT_FOUND';
  readonly getTrace: (traceId: TraceId) => TraceSpan[];
  readonly getSlowSpans: (thresholdMicros: bigint) => TraceSpan[];
  readonly getTraceReport: (traceId: TraceId) => TraceReport | 'TRACE_NOT_FOUND';
  readonly pruneCompletedTraces: (olderThanMicros: bigint) => number;
  readonly getStats: () => {
    readonly totalSpans: bigint;
    readonly totalTraces: bigint;
    readonly activeSpans: number;
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createTraceCollector(deps: TraceCollectorDeps): TraceCollector {
  const state: TraceCollectorState = {
    spans: new Map(),
    traceIndex: new Map(),
    totalSpans: 0n,
    totalTraces: 0n,
    slowThresholdMicros: 1000000n,
  };

  return {
    startSpan: (traceId, spanId, op, parent) => startSpan(state, deps, traceId, spanId, op, parent),
    endSpan: (spanId) => endSpan(state, deps, spanId),
    addSpanTag: (spanId, key, value) => addSpanTag(state, spanId, key, value),
    addSpanLog: (spanId, msg) => addSpanLog(state, deps, spanId, msg),
    getSpan: (spanId) => getSpan(state, spanId),
    getTrace: (traceId) => getTrace(state, traceId),
    getSlowSpans: (threshold) => getSlowSpans(state, threshold),
    getTraceReport: (traceId) => getTraceReport(state, traceId),
    pruneCompletedTraces: (olderThan) => pruneCompletedTraces(state, deps, olderThan),
    getStats: () => getStats(state),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

function startSpan(
  state: TraceCollectorState,
  deps: TraceCollectorDeps,
  traceId: TraceId,
  spanId: SpanId,
  operationName: string,
  parentSpanId?: SpanId,
): StartSpanResult {
  if (state.spans.has(spanId)) {
    return 'SPAN_ALREADY_EXISTS';
  }

  const span: TraceSpan = {
    traceId,
    spanId,
    parentSpanId,
    operationName,
    startMicros: deps.clock.nowMicroseconds(),
    tags: new Map(),
    logs: [],
  };

  state.spans.set(spanId, span);

  let spanSet = state.traceIndex.get(traceId);
  if (spanSet === undefined) {
    spanSet = new Set();
    state.traceIndex.set(traceId, spanSet);
    state.totalTraces = state.totalTraces + 1n;
  }

  spanSet.add(spanId);
  state.totalSpans = state.totalSpans + 1n;

  deps.logger.info('Span started', {
    traceId,
    spanId,
    operationName,
    parentSpanId: parentSpanId || 'none',
  });

  return 'OK';
}

function endSpan(
  state: TraceCollectorState,
  deps: TraceCollectorDeps,
  spanId: SpanId,
): EndSpanResult {
  const span = state.spans.get(spanId);
  if (span === undefined) {
    return 'SPAN_NOT_FOUND';
  }

  if (span.endMicros !== undefined) {
    return 'SPAN_ALREADY_ENDED';
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const durationMicros = nowMicros - span.startMicros;

  const updatedSpan: TraceSpan = {
    ...span,
    endMicros: nowMicros,
  };

  state.spans.set(spanId, updatedSpan);

  deps.logger.info('Span ended', {
    spanId,
    durationMicros: String(durationMicros),
  });

  if (durationMicros > state.slowThresholdMicros) {
    deps.logger.warn('Slow span detected', {
      spanId,
      operationName: span.operationName,
      durationMicros: String(durationMicros),
    });
  }

  return 'OK';
}

function addSpanTag(
  state: TraceCollectorState,
  spanId: SpanId,
  key: string,
  value: string,
): AddTagResult {
  const span = state.spans.get(spanId);
  if (span === undefined) {
    return 'SPAN_NOT_FOUND';
  }

  span.tags.set(key, value);
  return 'OK';
}

function addSpanLog(
  state: TraceCollectorState,
  deps: TraceCollectorDeps,
  spanId: SpanId,
  message: string,
): AddTagResult {
  const span = state.spans.get(spanId);
  if (span === undefined) {
    return 'SPAN_NOT_FOUND';
  }

  span.logs.push({
    timestampMicros: deps.clock.nowMicroseconds(),
    message,
  });

  return 'OK';
}

function getSpan(state: TraceCollectorState, spanId: SpanId): TraceSpan | 'SPAN_NOT_FOUND' {
  const span = state.spans.get(spanId);
  if (span === undefined) {
    return 'SPAN_NOT_FOUND';
  }

  return span;
}

function getTrace(state: TraceCollectorState, traceId: TraceId): TraceSpan[] {
  const spanIds = state.traceIndex.get(traceId);
  if (spanIds === undefined) {
    return [];
  }

  const spans: TraceSpan[] = [];
  for (const spanId of spanIds) {
    const span = state.spans.get(spanId);
    if (span !== undefined) {
      spans.push(span);
    }
  }

  return spans;
}

function getSlowSpans(state: TraceCollectorState, thresholdMicros: bigint): TraceSpan[] {
  const result: TraceSpan[] = [];

  for (const span of state.spans.values()) {
    if (span.endMicros === undefined) {
      continue;
    }

    const duration = span.endMicros - span.startMicros;
    if (duration > thresholdMicros) {
      result.push(span);
    }
  }

  return result.sort((a, b) => {
    const aDur = a.endMicros !== undefined ? a.endMicros - a.startMicros : 0n;
    const bDur = b.endMicros !== undefined ? b.endMicros - b.startMicros : 0n;
    return aDur > bDur ? -1 : 1;
  });
}

function getTraceReport(
  state: TraceCollectorState,
  traceId: TraceId,
): TraceReport | 'TRACE_NOT_FOUND' {
  const spans = getTrace(state, traceId);
  if (spans.length === 0) {
    return 'TRACE_NOT_FOUND';
  }

  const rootSpan = findRootSpan(spans);
  const totalDuration =
    rootSpan.endMicros !== undefined ? rootSpan.endMicros - rootSpan.startMicros : 0n;

  const maxDepth = calculateMaxDepth(spans);
  const criticalPath = calculateCriticalPath(spans);

  return {
    traceId,
    spans,
    totalDurationMicros: totalDuration,
    spanCount: spans.length,
    maxDepth,
    criticalPath,
  };
}

function findRootSpan(spans: TraceSpan[]): TraceSpan {
  for (const span of spans) {
    if (span.parentSpanId === undefined) {
      return span;
    }
  }

  const first = spans[0];
  if (first === undefined) {
    throw new Error('Empty spans array');
  }

  return first;
}

function calculateMaxDepth(spans: TraceSpan[]): number {
  const depthMap = new Map<SpanId, number>();

  for (const span of spans) {
    if (span.parentSpanId === undefined) {
      depthMap.set(span.spanId, 0);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const span of spans) {
      if (depthMap.has(span.spanId)) {
        continue;
      }

      if (span.parentSpanId === undefined) {
        continue;
      }

      const parentDepth = depthMap.get(span.parentSpanId);
      if (parentDepth !== undefined) {
        depthMap.set(span.spanId, parentDepth + 1);
        changed = true;
      }
    }
  }

  let maxDepth = 0;
  for (const depth of depthMap.values()) {
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }

  return maxDepth + 1;
}

function calculateCriticalPath(spans: TraceSpan[]): SpanId[] {
  const path: SpanId[] = [];

  for (const span of spans) {
    if (span.endMicros === undefined) {
      continue;
    }

    const duration = span.endMicros - span.startMicros;
    if (duration > 0n) {
      path.push(span.spanId);
    }
  }

  return path;
}

function pruneCompletedTraces(
  state: TraceCollectorState,
  deps: TraceCollectorDeps,
  olderThanMicros: bigint,
): number {
  let pruned = 0;
  const nowMicros = deps.clock.nowMicroseconds();
  const tracesToRemove: TraceId[] = [];

  for (const item of state.traceIndex.entries()) {
    const traceId = item[0];
    const spanIds = item[1];

    if (spanIds === undefined) {
      continue;
    }

    let allComplete = true;
    let oldestEndMicros = BigInt(Number.MAX_SAFE_INTEGER);

    for (const spanId of spanIds) {
      const span = state.spans.get(spanId);
      if (span === undefined || span.endMicros === undefined) {
        allComplete = false;
        break;
      }

      if (span.endMicros < oldestEndMicros) {
        oldestEndMicros = span.endMicros;
      }
    }

    if (allComplete && nowMicros - oldestEndMicros >= olderThanMicros) {
      tracesToRemove.push(traceId);

      for (const spanId of spanIds) {
        state.spans.delete(spanId);
        pruned = pruned + 1;
      }
    }
  }

  for (const traceId of tracesToRemove) {
    state.traceIndex.delete(traceId);
  }

  if (pruned > 0) {
    deps.logger.info('Pruned completed traces', { count: pruned });
  }

  return pruned;
}

function getStats(state: TraceCollectorState) {
  let activeSpans = 0;

  for (const span of state.spans.values()) {
    if (span.endMicros === undefined) {
      activeSpans = activeSpans + 1;
    }
  }

  return {
    totalSpans: state.totalSpans,
    totalTraces: state.totalTraces,
    activeSpans,
  };
}
