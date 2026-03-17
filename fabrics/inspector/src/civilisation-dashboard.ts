/**
 * civilisation-dashboard.ts ΓÇö Unified Concord health dashboard.
 *
 * Gives Loom operators a real-time view of The Concord's health across
 * all civilisational dimensions: economy, governance, lattice integrity,
 * population, narrative, security, and performance.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CivDashboardPanel =
  | 'ECONOMY'
  | 'GOVERNANCE'
  | 'LATTICE'
  | 'POPULATION'
  | 'NARRATIVE'
  | 'SECURITY'
  | 'PERFORMANCE';

export type CivAlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'CRITICAL';

export interface CivDashboardMetric {
  readonly metricId: string;
  readonly panel: CivDashboardPanel;
  readonly label: string;
  readonly currentValue: number | string | bigint;
  readonly previousValue: number | string | bigint | null;
  readonly trend: 'UP' | 'DOWN' | 'STABLE';
  readonly alertLevel: CivAlertLevel;
  readonly alertReason: string | null;
  readonly lastUpdatedAt: string;
}

export interface CivDashboardSnapshot {
  readonly snapshotId: string;
  readonly inGameYear: number;
  readonly generatedAt: string;
  readonly metrics: readonly CivDashboardMetric[];
  readonly overallAlertLevel: CivAlertLevel;
  readonly criticalAlerts: readonly CivDashboardMetric[];
  readonly activeIncidents: number;
}

// ΓöÇΓöÇ Alert Threshold Configuration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const ALERT_THRESHOLD_CONFIG: Record<
  CivDashboardPanel,
  { yellow: number; orange: number; red: number; critical: number }
> = {
  ECONOMY: { yellow: 0.5, orange: 0.2, red: 0, critical: -1 },
  GOVERNANCE: { yellow: 3, orange: 7, red: 10, critical: 15 },
  LATTICE: { yellow: 70, orange: 55, red: 30, critical: 20 },
  POPULATION: { yellow: 35, orange: 20, red: 15, critical: 5 },
  NARRATIVE: { yellow: 1000, orange: 500, red: 200, critical: 50 },
  SECURITY: { yellow: 20, orange: 30, red: 40, critical: 60 },
  PERFORMANCE: { yellow: 0.35, orange: 0.4, red: 0.5, critical: 1.0 },
};

// ΓöÇΓöÇ Alert Level Logic ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const ALERT_ORDER: readonly CivAlertLevel[] = ['GREEN', 'YELLOW', 'ORANGE', 'RED', 'CRITICAL'];

function alertLevelIndex(level: CivAlertLevel): number {
  return ALERT_ORDER.indexOf(level);
}

function maxAlertLevel(a: CivAlertLevel, b: CivAlertLevel): CivAlertLevel {
  return alertLevelIndex(a) >= alertLevelIndex(b) ? a : b;
}

/**
 * Compute alert level for a numeric value against a panel's thresholds.
 * LATTICE, POPULATION, and NARRATIVE thresholds are lower-is-worse.
 * ECONOMY thresholds are lower-is-worse (growth rate).
 * GOVERNANCE, SECURITY, PERFORMANCE thresholds are higher-is-worse.
 */
export function getAlertLevelForValue(panel: CivDashboardPanel, value: number): CivAlertLevel {
  const t = ALERT_THRESHOLD_CONFIG[panel];

  if (panel === 'LATTICE' || panel === 'POPULATION' || panel === 'NARRATIVE') {
    if (value <= t.critical) return 'CRITICAL';
    if (value <= t.red) return 'RED';
    if (value <= t.orange) return 'ORANGE';
    if (value <= t.yellow) return 'YELLOW';
    return 'GREEN';
  }

  if (panel === 'ECONOMY') {
    if (value < t.critical) return 'CRITICAL';
    if (value < t.red) return 'RED';
    if (value < t.yellow) return 'YELLOW';
    return 'GREEN';
  }

  // GOVERNANCE, SECURITY, PERFORMANCE ΓÇö higher is worse
  if (value >= t.critical) return 'CRITICAL';
  if (value >= t.red) return 'RED';
  if (value >= t.orange) return 'ORANGE';
  if (value >= t.yellow) return 'YELLOW';
  return 'GREEN';
}

// ΓöÇΓöÇ Core Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function computeOverallAlertLevel(metrics: readonly CivDashboardMetric[]): CivAlertLevel {
  let overall: CivAlertLevel = 'GREEN';
  for (const metric of metrics) {
    overall = maxAlertLevel(overall, metric.alertLevel);
  }
  return overall;
}

export function getCriticalAlerts(snapshot: CivDashboardSnapshot): CivDashboardMetric[] {
  return snapshot.metrics.filter((m) => m.alertLevel === 'CRITICAL' || m.alertLevel === 'RED');
}

export function getMetricsByPanel(
  snapshot: CivDashboardSnapshot,
  panel: CivDashboardPanel,
): CivDashboardMetric[] {
  return snapshot.metrics.filter((m) => m.panel === panel);
}

export function createDashboardSnapshot(
  year: number,
  metrics: CivDashboardMetric[],
): CivDashboardSnapshot {
  const overallAlertLevel = computeOverallAlertLevel(metrics);
  const criticalAlerts = metrics.filter(
    (m) => m.alertLevel === 'CRITICAL' || m.alertLevel === 'RED',
  );
  return {
    snapshotId: `snapshot-y${year}-${Date.now()}`,
    inGameYear: year,
    generatedAt: new Date().toISOString(),
    metrics,
    overallAlertLevel,
    criticalAlerts,
    activeIncidents: criticalAlerts.length,
  };
}

export function formatMetricValue(metric: CivDashboardMetric): string {
  const { panel, currentValue, label } = metric;

  if (typeof currentValue === 'bigint') {
    const microKalon = currentValue;
    const kalon = microKalon / 1_000_000n;
    return `${label}: ${kalon.toLocaleString()} KALON`;
  }

  if (panel === 'ECONOMY' && typeof currentValue === 'number') {
    return `${label}: ${currentValue.toFixed(2)}%`;
  }

  if (panel === 'PERFORMANCE' && typeof currentValue === 'number') {
    return `${label}: ${currentValue.toFixed(3)}ms`;
  }

  if (panel === 'SECURITY' && typeof currentValue === 'number') {
    return `${label}: ${currentValue.toFixed(1)}%`;
  }

  if (typeof currentValue === 'number') {
    return `${label}: ${currentValue}`;
  }

  return `${label}: ${currentValue}`;
}

// ΓöÇΓöÇ Year 105 Canonical Snapshot ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const SNAPSHOT_TIMESTAMP = '2105-01-01T00:00:00.000Z';

function makeMetric(
  metricId: string,
  panel: CivDashboardPanel,
  label: string,
  currentValue: number | string | bigint,
  previousValue: number | string | bigint | null,
  trend: 'UP' | 'DOWN' | 'STABLE',
  alertLevel: CivAlertLevel,
  alertReason: string | null,
): CivDashboardMetric {
  return {
    metricId,
    panel,
    label,
    currentValue,
    previousValue,
    trend,
    alertLevel,
    alertReason,
    lastUpdatedAt: SNAPSHOT_TIMESTAMP,
  };
}

export const YEAR_105_DASHBOARD_SNAPSHOT: CivDashboardSnapshot = createDashboardSnapshot(105, [
  makeMetric(
    'econ-total-supply',
    'ECONOMY',
    'Total KALON Supply',
    1_200_000_000_000_000_000n,
    1_174_800_000_000_000_000n,
    'UP',
    'GREEN',
    null,
  ),
  makeMetric(
    'econ-growth-rate',
    'ECONOMY',
    'Annual Supply Growth Rate',
    2.1,
    3.0,
    'DOWN',
    'GREEN',
    null,
  ),
  makeMetric(
    'econ-excluded-worlds',
    'ECONOMY',
    'Worlds Excluded from Issuance',
    3,
    2,
    'UP',
    'YELLOW',
    'One additional world excluded since last year',
  ),
  makeMetric(
    'gov-assembly-attendance',
    'GOVERNANCE',
    'Assembly Session Attendance',
    78,
    83,
    'DOWN',
    'YELLOW',
    'Attendance dropped 5 points from 83% last year',
  ),
  makeMetric(
    'lattice-world-247',
    'LATTICE',
    'World 247 Lattice Integrity',
    51,
    58,
    'DOWN',
    'ORANGE',
    'Integrity approaching RED threshold (30)',
  ),
  makeMetric(
    'lattice-world-312',
    'LATTICE',
    'World 312 Lattice Integrity',
    43,
    47,
    'DOWN',
    'ORANGE',
    'Integrity below 50 ΓÇö active degradation detected',
  ),
  makeMetric(
    'lattice-world-394',
    'LATTICE',
    'World 394 Lattice Integrity',
    71,
    69,
    'UP',
    'GREEN',
    null,
  ),
  makeMetric(
    'pop-world1-retention',
    'POPULATION',
    'World 1 Founding Dynasty Retention',
    42,
    45,
    'DOWN',
    'GREEN',
    null,
  ),
  makeMetric(
    'pop-concord-retention',
    'POPULATION',
    'Concord-Wide Founding Dynasty Retention',
    31,
    34,
    'DOWN',
    'YELLOW',
    'Retention near RED threshold of 15%',
  ),
  makeMetric(
    'narr-chronicle-entries',
    'NARRATIVE',
    'Chronicle Entries Filed Per Day',
    14200,
    13800,
    'UP',
    'GREEN',
    null,
  ),
  makeMetric(
    'narr-sealed-chambers',
    'NARRATIVE',
    'Sealed Chambers Opened (Year 105)',
    2,
    0,
    'UP',
    'YELLOW',
    'Year 105 target is 5+ chambers; only 2 of 7 opened',
  ),
  makeMetric(
    'sec-moderation-rejection',
    'SECURITY',
    'Content Moderation Rejection Rate',
    12,
    10,
    'UP',
    'GREEN',
    null,
  ),
  makeMetric(
    'perf-event-latency',
    'PERFORMANCE',
    'Average Event Processing Latency',
    0.31,
    0.28,
    'UP',
    'GREEN',
    null,
  ),
]);
