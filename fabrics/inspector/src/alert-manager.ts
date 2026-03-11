/**
 * Alert Manager — Threshold-based alerting with escalation rules.
 *
 * Rules define metric thresholds with operators (GT/LT/GTE/LTE) and
 * severity levels. Evaluating a metric checks all matching rules and
 * fires new Alert records when conditions are met and the cooldown has
 * elapsed since the rule last fired. Alerts can be resolved or suppressed
 * for a configurable duration.
 *
 * "The Inspector never sleeps. When threads fray, it sounds the alarm."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface AlertManagerClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface AlertManagerIdGenPort {
  readonly next: () => string;
}

interface AlertManagerLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertId = string;
export type RuleId = string;

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'FIRING' | 'RESOLVED' | 'SUPPRESSED';
export type AlertError =
  | 'rule-not-found'
  | 'alert-not-found'
  | 'already-suppressed'
  | 'invalid-threshold';

export interface AlertRule {
  readonly ruleId: RuleId;
  readonly name: string;
  readonly metric: string;
  readonly threshold: number;
  readonly operator: 'GT' | 'LT' | 'GTE' | 'LTE';
  readonly severity: AlertSeverity;
  readonly cooldownUs: bigint;
  lastFiredAt: bigint | null;
}

export interface Alert {
  readonly alertId: AlertId;
  readonly ruleId: RuleId;
  readonly metric: string;
  readonly value: number;
  status: AlertStatus;
  readonly firedAt: bigint;
  resolvedAt: bigint | null;
  suppressedUntil: bigint | null;
}

export interface AlertSummary {
  readonly totalRules: number;
  readonly firingAlerts: number;
  readonly resolvedAlerts: number;
  readonly suppressedAlerts: number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface AlertManagerSystem {
  createRule(
    name: string,
    metric: string,
    threshold: number,
    operator: 'GT' | 'LT' | 'GTE' | 'LTE',
    severity: AlertSeverity,
    cooldownUs: bigint,
  ): AlertRule | AlertError;
  evaluateMetric(metric: string, value: number): ReadonlyArray<Alert>;
  resolveAlert(alertId: AlertId): { success: true } | { success: false; error: AlertError };
  suppressAlert(
    alertId: AlertId,
    durationUs: bigint,
  ): { success: true } | { success: false; error: AlertError };
  getAlert(alertId: AlertId): Alert | undefined;
  getRule(ruleId: RuleId): AlertRule | undefined;
  listAlerts(status?: AlertStatus): ReadonlyArray<Alert>;
  getSummary(): AlertSummary;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface AlertManagerSystemDeps {
  readonly clock: AlertManagerClockPort;
  readonly idGen: AlertManagerIdGenPort;
  readonly logger: AlertManagerLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface ManagerState {
  readonly rules: Map<RuleId, AlertRule>;
  readonly alerts: Map<AlertId, Alert>;
  readonly deps: AlertManagerSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createAlertManagerSystem(deps: AlertManagerSystemDeps): AlertManagerSystem {
  const state: ManagerState = {
    rules: new Map(),
    alerts: new Map(),
    deps,
  };

  return {
    createRule: (name, metric, threshold, operator, severity, cooldownUs) =>
      createRuleImpl(state, name, metric, threshold, operator, severity, cooldownUs),
    evaluateMetric: (metric, value) => evaluateMetricImpl(state, metric, value),
    resolveAlert: (alertId) => resolveAlertImpl(state, alertId),
    suppressAlert: (alertId, durationUs) => suppressAlertImpl(state, alertId, durationUs),
    getAlert: (alertId) => state.alerts.get(alertId),
    getRule: (ruleId) => state.rules.get(ruleId),
    listAlerts: (status) => listAlertsImpl(state, status),
    getSummary: () => getSummaryImpl(state),
  };
}

// ─── Create Rule ──────────────────────────────────────────────────────────────

function createRuleImpl(
  state: ManagerState,
  name: string,
  metric: string,
  threshold: number,
  operator: 'GT' | 'LT' | 'GTE' | 'LTE',
  severity: AlertSeverity,
  cooldownUs: bigint,
): AlertRule | AlertError {
  const ruleId = state.deps.idGen.next();
  const rule: AlertRule = {
    ruleId,
    name,
    metric,
    threshold,
    operator,
    severity,
    cooldownUs,
    lastFiredAt: null,
  };
  state.rules.set(ruleId, rule);
  state.deps.logger.info('alert-rule-created', { ruleId, name, metric, operator });
  return rule;
}

// ─── Evaluate Metric ──────────────────────────────────────────────────────────

function evaluateMetricImpl(
  state: ManagerState,
  metric: string,
  value: number,
): ReadonlyArray<Alert> {
  const now = state.deps.clock.nowMicroseconds();
  const fired: Alert[] = [];

  for (const rule of state.rules.values()) {
    if (rule.metric !== metric) continue;
    if (!conditionMet(rule, value)) continue;
    if (!cooldownElapsed(rule, now)) continue;

    const alert = fireAlert(state, rule, metric, value, now);
    rule.lastFiredAt = now;
    fired.push(alert);
  }

  return fired;
}

function conditionMet(rule: AlertRule, value: number): boolean {
  if (rule.operator === 'GT') return value > rule.threshold;
  if (rule.operator === 'LT') return value < rule.threshold;
  if (rule.operator === 'GTE') return value >= rule.threshold;
  return value <= rule.threshold; // LTE
}

function cooldownElapsed(rule: AlertRule, now: bigint): boolean {
  if (rule.lastFiredAt === null) return true;
  return now - rule.lastFiredAt > rule.cooldownUs;
}

function fireAlert(
  state: ManagerState,
  rule: AlertRule,
  metric: string,
  value: number,
  now: bigint,
): Alert {
  const alertId = state.deps.idGen.next();
  const alert: Alert = {
    alertId,
    ruleId: rule.ruleId,
    metric,
    value,
    status: 'FIRING',
    firedAt: now,
    resolvedAt: null,
    suppressedUntil: null,
  };
  state.alerts.set(alertId, alert);
  state.deps.logger.warn('alert-fired', { alertId, ruleId: rule.ruleId, metric, value });
  return alert;
}

// ─── Resolve Alert ────────────────────────────────────────────────────────────

function resolveAlertImpl(
  state: ManagerState,
  alertId: AlertId,
): { success: true } | { success: false; error: AlertError } {
  const alert = state.alerts.get(alertId);
  if (alert === undefined) return { success: false, error: 'alert-not-found' };
  alert.status = 'RESOLVED';
  alert.resolvedAt = state.deps.clock.nowMicroseconds();
  return { success: true };
}

// ─── Suppress Alert ───────────────────────────────────────────────────────────

function suppressAlertImpl(
  state: ManagerState,
  alertId: AlertId,
  durationUs: bigint,
): { success: true } | { success: false; error: AlertError } {
  const alert = state.alerts.get(alertId);
  if (alert === undefined) return { success: false, error: 'alert-not-found' };
  if (alert.status === 'SUPPRESSED') return { success: false, error: 'already-suppressed' };
  const now = state.deps.clock.nowMicroseconds();
  alert.status = 'SUPPRESSED';
  alert.suppressedUntil = now + durationUs;
  return { success: true };
}

// ─── List Alerts ─────────────────────────────────────────────────────────────

function listAlertsImpl(state: ManagerState, status?: AlertStatus): ReadonlyArray<Alert> {
  const result: Alert[] = [];
  for (const alert of state.alerts.values()) {
    if (status === undefined || alert.status === status) result.push(alert);
  }
  return result;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function getSummaryImpl(state: ManagerState): AlertSummary {
  let firingAlerts = 0;
  let resolvedAlerts = 0;
  let suppressedAlerts = 0;

  for (const alert of state.alerts.values()) {
    if (alert.status === 'FIRING') firingAlerts += 1;
    else if (alert.status === 'RESOLVED') resolvedAlerts += 1;
    else suppressedAlerts += 1;
  }

  return {
    totalRules: state.rules.size,
    firingAlerts,
    resolvedAlerts,
    suppressedAlerts,
  };
}
