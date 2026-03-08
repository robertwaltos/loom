/**
 * metrics-dashboard.ts — Metrics dashboard aggregation.
 *
 * Collects and organizes metric snapshots for dashboard display.
 * Groups metrics by category, supports pinned/starred metrics,
 * and provides summary views for monitoring panels.
 */

// ── Ports ────────────────────────────────────────────────────────

interface DashboardClock {
  readonly nowMicroseconds: () => number;
}

interface DashboardIdGenerator {
  readonly next: () => string;
}

interface MetricsDashboardDeps {
  readonly clock: DashboardClock;
  readonly idGenerator: DashboardIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface DashboardMetric {
  readonly metricId: string;
  readonly name: string;
  readonly category: string;
  readonly value: number;
  readonly unit: string;
  readonly pinned: boolean;
  readonly updatedAt: number;
}

interface AddMetricParams {
  readonly name: string;
  readonly category: string;
  readonly value: number;
  readonly unit: string;
}

interface DashboardPanel {
  readonly category: string;
  readonly metrics: readonly DashboardMetric[];
}

interface DashboardStats {
  readonly totalMetrics: number;
  readonly totalCategories: number;
  readonly pinnedMetrics: number;
  readonly totalUpdates: number;
}

interface MetricsDashboard {
  readonly addMetric: (params: AddMetricParams) => DashboardMetric;
  readonly updateValue: (metricId: string, value: number) => boolean;
  readonly pin: (metricId: string) => boolean;
  readonly unpin: (metricId: string) => boolean;
  readonly removeMetric: (metricId: string) => boolean;
  readonly getMetric: (metricId: string) => DashboardMetric | undefined;
  readonly listPinned: () => readonly DashboardMetric[];
  readonly getPanels: () => readonly DashboardPanel[];
  readonly getStats: () => DashboardStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableMetric {
  readonly metricId: string;
  readonly name: string;
  readonly category: string;
  value: number;
  readonly unit: string;
  pinned: boolean;
  updatedAt: number;
}

interface DashboardState {
  readonly deps: MetricsDashboardDeps;
  readonly metrics: Map<string, MutableMetric>;
  totalUpdates: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(metric: MutableMetric): DashboardMetric {
  return { ...metric };
}

// ── Operations ───────────────────────────────────────────────────

function addMetricImpl(state: DashboardState, params: AddMetricParams): DashboardMetric {
  const metric: MutableMetric = {
    metricId: state.deps.idGenerator.next(),
    name: params.name,
    category: params.category,
    value: params.value,
    unit: params.unit,
    pinned: false,
    updatedAt: state.deps.clock.nowMicroseconds(),
  };
  state.metrics.set(metric.metricId, metric);
  return toReadonly(metric);
}

function updateValueImpl(state: DashboardState, metricId: string, value: number): boolean {
  const metric = state.metrics.get(metricId);
  if (!metric) return false;
  metric.value = value;
  metric.updatedAt = state.deps.clock.nowMicroseconds();
  state.totalUpdates += 1;
  return true;
}

function pinImpl(state: DashboardState, metricId: string): boolean {
  const metric = state.metrics.get(metricId);
  if (!metric) return false;
  if (metric.pinned) return false;
  metric.pinned = true;
  return true;
}

function unpinImpl(state: DashboardState, metricId: string): boolean {
  const metric = state.metrics.get(metricId);
  if (!metric) return false;
  if (!metric.pinned) return false;
  metric.pinned = false;
  return true;
}

function removeMetricImpl(state: DashboardState, metricId: string): boolean {
  return state.metrics.delete(metricId);
}

function listPinnedImpl(state: DashboardState): DashboardMetric[] {
  const result: DashboardMetric[] = [];
  for (const metric of state.metrics.values()) {
    if (metric.pinned) result.push(toReadonly(metric));
  }
  return result;
}

function getPanelsImpl(state: DashboardState): DashboardPanel[] {
  const categoryMap = new Map<string, DashboardMetric[]>();
  for (const metric of state.metrics.values()) {
    let list = categoryMap.get(metric.category);
    if (!list) {
      list = [];
      categoryMap.set(metric.category, list);
    }
    list.push(toReadonly(metric));
  }
  const panels: DashboardPanel[] = [];
  for (const [category, metrics] of categoryMap) {
    panels.push({ category, metrics });
  }
  return panels;
}

function getStatsImpl(state: DashboardState): DashboardStats {
  const categories = new Set<string>();
  let pinned = 0;
  for (const metric of state.metrics.values()) {
    categories.add(metric.category);
    if (metric.pinned) pinned += 1;
  }
  return {
    totalMetrics: state.metrics.size,
    totalCategories: categories.size,
    pinnedMetrics: pinned,
    totalUpdates: state.totalUpdates,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createMetricsDashboard(deps: MetricsDashboardDeps): MetricsDashboard {
  const state: DashboardState = {
    deps,
    metrics: new Map(),
    totalUpdates: 0,
  };
  return {
    addMetric: (p) => addMetricImpl(state, p),
    updateValue: (id, v) => updateValueImpl(state, id, v),
    pin: (id) => pinImpl(state, id),
    unpin: (id) => unpinImpl(state, id),
    removeMetric: (id) => removeMetricImpl(state, id),
    getMetric: (id) => {
      const m = state.metrics.get(id);
      return m ? toReadonly(m) : undefined;
    },
    listPinned: () => listPinnedImpl(state),
    getPanels: () => getPanelsImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createMetricsDashboard };
export type {
  MetricsDashboard,
  MetricsDashboardDeps,
  DashboardMetric,
  AddMetricParams,
  DashboardPanel,
  DashboardStats,
};
