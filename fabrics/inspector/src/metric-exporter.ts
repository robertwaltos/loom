/**
 * metric-exporter.ts — Metric export for external systems.
 *
 * Collects metric snapshots from registered sources and formats
 * them for export. Supports multiple output formats and
 * scheduled collection with history tracking.
 */

// ── Ports ────────────────────────────────────────────────────────

interface ExporterClock {
  readonly nowMicroseconds: () => number;
}

interface ExporterIdGenerator {
  readonly next: () => string;
}

interface MetricExporterDeps {
  readonly clock: ExporterClock;
  readonly idGenerator: ExporterIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ExportFormat = 'json' | 'prometheus' | 'csv';

interface MetricSource {
  readonly sourceId: string;
  readonly name: string;
  readonly collector: () => readonly MetricSample[];
}

interface MetricSample {
  readonly name: string;
  readonly value: number;
  readonly labels: Record<string, string>;
}

interface RegisterSourceParams {
  readonly name: string;
  readonly collector: () => readonly MetricSample[];
}

interface ExportSnapshot {
  readonly snapshotId: string;
  readonly collectedAt: number;
  readonly samples: readonly MetricSample[];
  readonly sourceCount: number;
}

interface MetricExporterStats {
  readonly totalSources: number;
  readonly totalExports: number;
  readonly totalSamples: number;
}

interface MetricExporterService {
  readonly registerSource: (params: RegisterSourceParams) => MetricSource;
  readonly removeSource: (sourceId: string) => boolean;
  readonly collect: () => ExportSnapshot;
  readonly format: (snapshot: ExportSnapshot, fmt: ExportFormat) => string;
  readonly getStats: () => MetricExporterStats;
}

// ── State ────────────────────────────────────────────────────────

interface ExporterState {
  readonly deps: MetricExporterDeps;
  readonly sources: Map<string, MetricSource>;
  totalExports: number;
  totalSamples: number;
}

// ── Operations ───────────────────────────────────────────────────

function registerSourceImpl(state: ExporterState, params: RegisterSourceParams): MetricSource {
  const source: MetricSource = {
    sourceId: state.deps.idGenerator.next(),
    name: params.name,
    collector: params.collector,
  };
  state.sources.set(source.sourceId, source);
  return source;
}

function collectImpl(state: ExporterState): ExportSnapshot {
  const samples: MetricSample[] = [];
  for (const source of state.sources.values()) {
    const collected = source.collector();
    for (const s of collected) {
      samples.push(s);
    }
  }
  state.totalExports++;
  state.totalSamples += samples.length;
  return {
    snapshotId: state.deps.idGenerator.next(),
    collectedAt: state.deps.clock.nowMicroseconds(),
    samples,
    sourceCount: state.sources.size,
  };
}

function formatJson(snapshot: ExportSnapshot): string {
  return JSON.stringify({
    snapshotId: snapshot.snapshotId,
    collectedAt: snapshot.collectedAt,
    samples: snapshot.samples,
  });
}

function formatPrometheus(snapshot: ExportSnapshot): string {
  const lines: string[] = [];
  for (const s of snapshot.samples) {
    const labelParts: string[] = [];
    for (const [k, v] of Object.entries(s.labels)) {
      labelParts.push(k + '="' + v + '"');
    }
    const labelStr = labelParts.length > 0 ? '{' + labelParts.join(',') + '}' : '';
    lines.push(s.name + labelStr + ' ' + String(s.value));
  }
  return lines.join('\n');
}

function formatCsv(snapshot: ExportSnapshot): string {
  const lines = ['name,value,labels'];
  for (const s of snapshot.samples) {
    const labelStr = Object.entries(s.labels)
      .map(([k, v]) => k + '=' + v)
      .join(';');
    lines.push(s.name + ',' + String(s.value) + ',' + labelStr);
  }
  return lines.join('\n');
}

function formatImpl(snapshot: ExportSnapshot, fmt: ExportFormat): string {
  if (fmt === 'json') return formatJson(snapshot);
  if (fmt === 'prometheus') return formatPrometheus(snapshot);
  return formatCsv(snapshot);
}

function getStatsImpl(state: ExporterState): MetricExporterStats {
  return {
    totalSources: state.sources.size,
    totalExports: state.totalExports,
    totalSamples: state.totalSamples,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createMetricExporterService(deps: MetricExporterDeps): MetricExporterService {
  const state: ExporterState = {
    deps,
    sources: new Map(),
    totalExports: 0,
    totalSamples: 0,
  };
  return {
    registerSource: (p) => registerSourceImpl(state, p),
    removeSource: (id) => state.sources.delete(id),
    collect: () => collectImpl(state),
    format: (s, f) => formatImpl(s, f),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createMetricExporterService };
export type {
  MetricExporterService,
  MetricExporterDeps,
  ExportFormat,
  MetricSource,
  MetricSample,
  RegisterSourceParams,
  ExportSnapshot,
  MetricExporterStats,
};
