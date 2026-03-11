/**
 * transit-analytics.ts — Transit traffic analysis and pattern detection.
 *
 * Collects and analyzes transit data across the Silfen Weave network.
 * Detects traffic patterns, bottlenecks, and anomalous behavior.
 * Provides route optimization suggestions and capacity planning data.
 */

// ── Types ────────────────────────────────────────────────────────

export interface TransitRecord {
  readonly transitId: string;
  readonly entityId: string;
  readonly dynastyId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly corridorId: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly durationMicroseconds: number;
  readonly success: boolean;
  readonly failureReason: string | null;
}

export interface RouteTrafficSummary {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly totalTransits: number;
  readonly successfulTransits: number;
  readonly failedTransits: number;
  readonly averageDuration: number;
  readonly peakHourTransits: number;
  readonly successRate: number;
}

export interface WorldTrafficSummary {
  readonly worldId: string;
  readonly inboundTransits: number;
  readonly outboundTransits: number;
  readonly totalTransits: number;
  readonly uniqueDynasties: number;
  readonly averageInboundDuration: number;
  readonly averageOutboundDuration: number;
}

export interface TrafficBottleneck {
  readonly routeKey: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly severity: BottleneckSeverity;
  readonly averageDelay: number;
  readonly failureRate: number;
  readonly detectedAt: number;
}

export type BottleneckSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TransitPattern {
  readonly patternId: string;
  readonly patternType: PatternType;
  readonly description: string;
  readonly affectedRoutes: readonly string[];
  readonly confidence: number;
  readonly detectedAt: number;
}

export type PatternType =
  | 'peak_hour_surge'
  | 'dynasty_migration'
  | 'route_avoidance'
  | 'circular_transit'
  | 'bottleneck_cascade';

export interface TransitAnalyticsStats {
  readonly totalRecords: number;
  readonly totalRoutes: number;
  readonly overallSuccessRate: number;
  readonly averageDuration: number;
  readonly bottleneckCount: number;
  readonly patternCount: number;
}

// ── Port Interfaces ──────────────────────────────────────────────

export interface AnalyticsClock {
  readonly nowMicroseconds: () => number;
}

export interface AnalyticsIdGenerator {
  readonly generate: () => string;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface TransitAnalyticsDeps {
  readonly clock: AnalyticsClock;
  readonly idGenerator: AnalyticsIdGenerator;
}

// ── State ────────────────────────────────────────────────────────

interface AnalyticsState {
  readonly deps: TransitAnalyticsDeps;
  readonly records: TransitRecord[];
  readonly routeSummaries: Map<string, MutableRouteSummary>;
  readonly worldSummaries: Map<string, MutableWorldSummary>;
  readonly bottlenecks: Map<string, TrafficBottleneck>;
  readonly patterns: TransitPattern[];
}

interface MutableRouteSummary {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  total: number;
  successful: number;
  failed: number;
  totalDuration: number;
  peakHour: number;
}

interface MutableWorldSummary {
  readonly worldId: string;
  inbound: number;
  outbound: number;
  totalInboundDuration: number;
  totalOutboundDuration: number;
  readonly dynasties: Set<string>;
}

// ── Route Key ────────────────────────────────────────────────────

function routeKey(from: string, to: string): string {
  return from + '->' + to;
}

// ── Record Collection ────────────────────────────────────────────

function recordTransit(state: AnalyticsState, record: TransitRecord): void {
  state.records.push(record);
  updateRouteSummary(state, record);
  updateWorldSummary(state, record);
}

function updateRouteSummary(state: AnalyticsState, record: TransitRecord): void {
  const key = routeKey(record.fromWorldId, record.toWorldId);
  let summary = state.routeSummaries.get(key);
  if (summary === undefined) {
    summary = {
      fromWorldId: record.fromWorldId,
      toWorldId: record.toWorldId,
      total: 0,
      successful: 0,
      failed: 0,
      totalDuration: 0,
      peakHour: 0,
    };
    state.routeSummaries.set(key, summary);
  }
  summary.total += 1;
  if (record.success) {
    summary.successful += 1;
    summary.totalDuration += record.durationMicroseconds;
  } else {
    summary.failed += 1;
  }
}

function updateWorldSummary(state: AnalyticsState, record: TransitRecord): void {
  updateWorldInbound(state, record);
  updateWorldOutbound(state, record);
}

function updateWorldInbound(state: AnalyticsState, record: TransitRecord): void {
  const toSummary = ensureWorldSummary(state, record.toWorldId);
  toSummary.inbound += 1;
  if (record.success) {
    toSummary.totalInboundDuration += record.durationMicroseconds;
  }
  toSummary.dynasties.add(record.dynastyId);
}

function updateWorldOutbound(state: AnalyticsState, record: TransitRecord): void {
  const fromSummary = ensureWorldSummary(state, record.fromWorldId);
  fromSummary.outbound += 1;
  if (record.success) {
    fromSummary.totalOutboundDuration += record.durationMicroseconds;
  }
  fromSummary.dynasties.add(record.dynastyId);
}

function ensureWorldSummary(state: AnalyticsState, worldId: string): MutableWorldSummary {
  let summary = state.worldSummaries.get(worldId);
  if (summary !== undefined) return summary;
  summary = {
    worldId,
    inbound: 0,
    outbound: 0,
    totalInboundDuration: 0,
    totalOutboundDuration: 0,
    dynasties: new Set(),
  };
  state.worldSummaries.set(worldId, summary);
  return summary;
}

// ── Bottleneck Detection ─────────────────────────────────────────

function detectBottlenecks(state: AnalyticsState): readonly TrafficBottleneck[] {
  const detected: TrafficBottleneck[] = [];
  const now = state.deps.clock.nowMicroseconds();
  for (const [key, summary] of state.routeSummaries) {
    if (summary.total < 5) continue;
    const failureRate = summary.failed / summary.total;
    const avgDuration = summary.successful > 0 ? summary.totalDuration / summary.successful : 0;
    const severity = classifyBottleneck(failureRate, avgDuration);
    if (severity === null) continue;
    const bottleneck: TrafficBottleneck = {
      routeKey: key,
      fromWorldId: summary.fromWorldId,
      toWorldId: summary.toWorldId,
      severity,
      averageDelay: avgDuration,
      failureRate,
      detectedAt: now,
    };
    state.bottlenecks.set(key, bottleneck);
    detected.push(bottleneck);
  }
  return detected;
}

function classifyBottleneck(failureRate: number, avgDuration: number): BottleneckSeverity | null {
  if (failureRate > 0.5) return 'critical';
  if (failureRate > 0.3) return 'high';
  if (failureRate > 0.15) return 'medium';
  if (failureRate > 0.05) return 'low';
  return null;
}

// ── Pattern Detection ────────────────────────────────────────────

function detectPatterns(state: AnalyticsState): readonly TransitPattern[] {
  const detected: TransitPattern[] = [];
  detectMigrationPattern(state, detected);
  detectCircularPattern(state, detected);
  return detected;
}

function detectMigrationPattern(state: AnalyticsState, detected: TransitPattern[]): void {
  for (const summary of state.worldSummaries.values()) {
    if (summary.outbound > summary.inbound * 3 && summary.outbound > 10) {
      const pattern: TransitPattern = {
        patternId: state.deps.idGenerator.generate(),
        patternType: 'dynasty_migration',
        description: 'Mass exodus detected from world ' + summary.worldId,
        affectedRoutes: [summary.worldId],
        confidence: 0.8,
        detectedAt: state.deps.clock.nowMicroseconds(),
      };
      detected.push(pattern);
      state.patterns.push(pattern);
    }
  }
}

function detectCircularPattern(state: AnalyticsState, detected: TransitPattern[]): void {
  for (const [key, summary] of state.routeSummaries) {
    const reverseKey = routeKey(summary.toWorldId, summary.fromWorldId);
    const reverse = state.routeSummaries.get(reverseKey);
    if (reverse === undefined) continue;
    if (summary.total > 10 && reverse.total > 10) {
      const ratio = Math.min(summary.total, reverse.total) / Math.max(summary.total, reverse.total);
      if (ratio > 0.7) {
        const pattern: TransitPattern = {
          patternId: state.deps.idGenerator.generate(),
          patternType: 'circular_transit',
          description:
            'Circular traffic between ' + summary.fromWorldId + ' and ' + summary.toWorldId,
          affectedRoutes: [key, reverseKey],
          confidence: ratio,
          detectedAt: state.deps.clock.nowMicroseconds(),
        };
        detected.push(pattern);
        state.patterns.push(pattern);
      }
    }
  }
}

// ── Queries ──────────────────────────────────────────────────────

function getRouteSummary(
  state: AnalyticsState,
  from: string,
  to: string,
): RouteTrafficSummary | undefined {
  const key = routeKey(from, to);
  const summary = state.routeSummaries.get(key);
  if (summary === undefined) return undefined;
  const avgDuration = summary.successful > 0 ? summary.totalDuration / summary.successful : 0;
  const successRate = summary.total > 0 ? summary.successful / summary.total : 0;
  return {
    fromWorldId: summary.fromWorldId,
    toWorldId: summary.toWorldId,
    totalTransits: summary.total,
    successfulTransits: summary.successful,
    failedTransits: summary.failed,
    averageDuration: avgDuration,
    peakHourTransits: summary.peakHour,
    successRate,
  };
}

function getWorldSummary(state: AnalyticsState, worldId: string): WorldTrafficSummary | undefined {
  const summary = state.worldSummaries.get(worldId);
  if (summary === undefined) return undefined;
  const avgIn = summary.inbound > 0 ? summary.totalInboundDuration / summary.inbound : 0;
  const avgOut = summary.outbound > 0 ? summary.totalOutboundDuration / summary.outbound : 0;
  return {
    worldId: summary.worldId,
    inboundTransits: summary.inbound,
    outboundTransits: summary.outbound,
    totalTransits: summary.inbound + summary.outbound,
    uniqueDynasties: summary.dynasties.size,
    averageInboundDuration: avgIn,
    averageOutboundDuration: avgOut,
  };
}

function getTopRoutes(state: AnalyticsState, count: number): readonly RouteTrafficSummary[] {
  const summaries: Array<{ key: string; summary: MutableRouteSummary }> = [];
  for (const [key, summary] of state.routeSummaries) {
    summaries.push({ key, summary });
  }
  summaries.sort((a, b) => b.summary.total - a.summary.total);
  return summaries.slice(0, count).map((s) => {
    const avg = s.summary.successful > 0 ? s.summary.totalDuration / s.summary.successful : 0;
    const rate = s.summary.total > 0 ? s.summary.successful / s.summary.total : 0;
    return {
      fromWorldId: s.summary.fromWorldId,
      toWorldId: s.summary.toWorldId,
      totalTransits: s.summary.total,
      successfulTransits: s.summary.successful,
      failedTransits: s.summary.failed,
      averageDuration: avg,
      peakHourTransits: s.summary.peakHour,
      successRate: rate,
    };
  });
}

function getStats(state: AnalyticsState): TransitAnalyticsStats {
  let totalDuration = 0;
  let successful = 0;
  for (const record of state.records) {
    if (record.success) {
      totalDuration += record.durationMicroseconds;
      successful += 1;
    }
  }
  return {
    totalRecords: state.records.length,
    totalRoutes: state.routeSummaries.size,
    overallSuccessRate: state.records.length > 0 ? successful / state.records.length : 0,
    averageDuration: successful > 0 ? totalDuration / successful : 0,
    bottleneckCount: state.bottlenecks.size,
    patternCount: state.patterns.length,
  };
}

// ── Public API ──────────────────────────────────────────────────

export interface TransitAnalyticsService {
  readonly recordTransit: (record: TransitRecord) => void;
  readonly detectBottlenecks: () => readonly TrafficBottleneck[];
  readonly detectPatterns: () => readonly TransitPattern[];
  readonly getRouteSummary: (from: string, to: string) => RouteTrafficSummary | undefined;
  readonly getWorldSummary: (worldId: string) => WorldTrafficSummary | undefined;
  readonly getTopRoutes: (count: number) => readonly RouteTrafficSummary[];
  readonly getBottlenecks: () => readonly TrafficBottleneck[];
  readonly getPatterns: () => readonly TransitPattern[];
  readonly getStats: () => TransitAnalyticsStats;
}

// ── Factory ─────────────────────────────────────────────────────

function createTransitAnalyticsService(deps: TransitAnalyticsDeps): TransitAnalyticsService {
  const state: AnalyticsState = {
    deps,
    records: [],
    routeSummaries: new Map(),
    worldSummaries: new Map(),
    bottlenecks: new Map(),
    patterns: [],
  };

  return {
    recordTransit: (record) => recordTransit(state, record),
    detectBottlenecks: () => detectBottlenecks(state),
    detectPatterns: () => detectPatterns(state),
    getRouteSummary: (from, to) => getRouteSummary(state, from, to),
    getWorldSummary: (worldId) => getWorldSummary(state, worldId),
    getTopRoutes: (count) => getTopRoutes(state, count),
    getBottlenecks: () => [...state.bottlenecks.values()],
    getPatterns: () => [...state.patterns],
    getStats: () => getStats(state),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createTransitAnalyticsService };
