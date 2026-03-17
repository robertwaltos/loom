/**
 * Prometheus Metrics Endpoint ΓÇö Exposes system metrics in Prometheus text format.
 *
 * Provides a MetricsCollector for counters and gauges, and a route
 * registration function for Fastify that serves GET /metrics.
 *
 * Format: Prometheus exposition text format v0.0.4
 * Content-Type: text/plain; version=0.0.4
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type MetricKind = 'counter' | 'gauge';

export interface MetricDefinition {
  readonly name: string;
  readonly help: string;
  readonly kind: MetricKind;
}

export interface MetricEntry {
  readonly definition: MetricDefinition;
  value: number;
}

export interface MetricsCollector {
  increment(metric: string, value?: number): void;
  set(metric: string, value: number): void;
  getPrometheusText(): string;
  registerRoute(fastify: FastifyLike): void;
}

// Minimal Fastify type to avoid importing fastify at test time
export interface FastifyLike {
  get(path: string, handler: (request: unknown, reply: FastifyReplyLike) => Promise<void>): void;
}

export interface FastifyReplyLike {
  type(contentType: string): FastifyReplyLike;
  send(body: string): void;
}

// ΓöÇΓöÇΓöÇ Well-Known Metrics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const CONCORD_METRICS: MetricDefinition[] = [
  {
    name: 'concord_chronicle_entries_total',
    help: 'Total chronicle entries',
    kind: 'counter',
  },
  {
    name: 'concord_kalon_total_supply',
    help: 'Current KALON total supply',
    kind: 'gauge',
  },
  {
    name: 'concord_worlds_online',
    help: 'Number of worlds currently online',
    kind: 'gauge',
  },
  {
    name: 'concord_dynasties_active',
    help: 'Active dynasty count',
    kind: 'gauge',
  },
  {
    name: 'concord_npc_conversations_total',
    help: 'Total NPC conversations initiated',
    kind: 'counter',
  },
];

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface CollectorState {
  readonly metrics: Map<string, MetricEntry>;
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createMetricsCollector(): MetricsCollector {
  const state = buildInitialState();
  return {
    increment: (metric, value = 1) => incrementMetric(state, metric, value),
    set: (metric, value) => setMetric(state, metric, value),
    getPrometheusText: () => renderPrometheusText(state),
    registerRoute: (fastify) => registerFastifyRoute(state, fastify),
  };
}

function buildInitialState(): CollectorState {
  const metrics = new Map<string, MetricEntry>();
  for (const def of CONCORD_METRICS) {
    metrics.set(def.name, { definition: def, value: getDefaultValue(def.name) });
  }
  return { metrics };
}

function getDefaultValue(metricName: string): number {
  if (metricName === 'concord_worlds_online') return 20;
  return 0;
}

// ΓöÇΓöÇΓöÇ Mutation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function incrementMetric(state: CollectorState, metric: string, value: number): void {
  const entry = state.metrics.get(metric);
  if (entry) {
    entry.value += value;
    return;
  }
  // Register ad-hoc counter
  state.metrics.set(metric, {
    definition: { name: metric, help: metric, kind: 'counter' },
    value,
  });
}

function setMetric(state: CollectorState, metric: string, value: number): void {
  const entry = state.metrics.get(metric);
  if (entry) {
    entry.value = value;
    return;
  }
  // Register ad-hoc gauge
  state.metrics.set(metric, {
    definition: { name: metric, help: metric, kind: 'gauge' },
    value,
  });
}

// ΓöÇΓöÇΓöÇ Rendering ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function renderPrometheusText(state: CollectorState): string {
  const lines: string[] = [];
  for (const entry of state.metrics.values()) {
    lines.push(renderMetricEntry(entry));
  }
  return lines.join('\n') + '\n';
}

function renderMetricEntry(entry: MetricEntry): string {
  const { definition, value } = entry;
  return [
    `# HELP ${definition.name} ${definition.help}`,
    `# TYPE ${definition.name} ${definition.kind}`,
    `${definition.name} ${value}`,
  ].join('\n');
}

// ΓöÇΓöÇΓöÇ Fastify Route ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function registerFastifyRoute(state: CollectorState, fastify: FastifyLike): void {
  fastify.get('/metrics', async (_request, reply) => {
    reply.type('text/plain; version=0.0.4').send(renderPrometheusText(state));
  });
}
