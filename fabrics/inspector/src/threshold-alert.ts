/**
 * threshold-alert.ts — Metric threshold breach alerting.
 *
 * Defines threshold rules for named metrics and evaluates current
 * values against them. Generates alerts when thresholds are breached
 * and tracks alert history with acknowledgement support.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AlertClock {
  readonly nowMicroseconds: () => number;
}

interface AlertIdGenerator {
  readonly next: () => string;
}

interface ThresholdAlertDeps {
  readonly clock: AlertClock;
  readonly idGenerator: AlertIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ThresholdDirection = 'above' | 'below';
type AlertSeverity = 'warning' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface ThresholdRule {
  readonly ruleId: string;
  readonly metricName: string;
  readonly direction: ThresholdDirection;
  readonly threshold: number;
  readonly severity: AlertSeverity;
}

interface CreateRuleParams {
  readonly metricName: string;
  readonly direction: ThresholdDirection;
  readonly threshold: number;
  readonly severity: AlertSeverity;
}

interface ThresholdAlert {
  readonly alertId: string;
  readonly ruleId: string;
  readonly metricName: string;
  readonly value: number;
  readonly threshold: number;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly triggeredAt: number;
}

interface EvaluateParams {
  readonly metricName: string;
  readonly value: number;
}

interface ThresholdAlertStats {
  readonly totalRules: number;
  readonly activeAlerts: number;
  readonly totalAlerts: number;
}

interface ThresholdAlertService {
  readonly addRule: (params: CreateRuleParams) => ThresholdRule;
  readonly removeRule: (ruleId: string) => boolean;
  readonly evaluate: (params: EvaluateParams) => readonly ThresholdAlert[];
  readonly acknowledge: (alertId: string) => boolean;
  readonly resolve: (alertId: string) => boolean;
  readonly listAlerts: (status?: AlertStatus) => readonly ThresholdAlert[];
  readonly getStats: () => ThresholdAlertStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableAlert {
  readonly alertId: string;
  readonly ruleId: string;
  readonly metricName: string;
  readonly value: number;
  readonly threshold: number;
  readonly severity: AlertSeverity;
  status: AlertStatus;
  readonly triggeredAt: number;
}

interface AlertState {
  readonly deps: ThresholdAlertDeps;
  readonly rules: Map<string, ThresholdRule>;
  readonly alerts: Map<string, MutableAlert>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(alert: MutableAlert): ThresholdAlert {
  return {
    alertId: alert.alertId,
    ruleId: alert.ruleId,
    metricName: alert.metricName,
    value: alert.value,
    threshold: alert.threshold,
    severity: alert.severity,
    status: alert.status,
    triggeredAt: alert.triggeredAt,
  };
}

function isBreached(rule: ThresholdRule, value: number): boolean {
  if (rule.direction === 'above') return value > rule.threshold;
  return value < rule.threshold;
}

// ── Operations ───────────────────────────────────────────────────

function addRuleImpl(state: AlertState, params: CreateRuleParams): ThresholdRule {
  const rule: ThresholdRule = {
    ruleId: state.deps.idGenerator.next(),
    metricName: params.metricName,
    direction: params.direction,
    threshold: params.threshold,
    severity: params.severity,
  };
  state.rules.set(rule.ruleId, rule);
  return rule;
}

function evaluateImpl(state: AlertState, params: EvaluateParams): ThresholdAlert[] {
  const triggered: ThresholdAlert[] = [];
  for (const rule of state.rules.values()) {
    if (rule.metricName !== params.metricName) continue;
    if (!isBreached(rule, params.value)) continue;
    const alert: MutableAlert = {
      alertId: state.deps.idGenerator.next(),
      ruleId: rule.ruleId,
      metricName: rule.metricName,
      value: params.value,
      threshold: rule.threshold,
      severity: rule.severity,
      status: 'active',
      triggeredAt: state.deps.clock.nowMicroseconds(),
    };
    state.alerts.set(alert.alertId, alert);
    triggered.push(toReadonly(alert));
  }
  return triggered;
}

function setAlertStatus(state: AlertState, alertId: string, status: AlertStatus): boolean {
  const alert = state.alerts.get(alertId);
  if (!alert) return false;
  alert.status = status;
  return true;
}

function listAlertsImpl(state: AlertState, status?: AlertStatus): ThresholdAlert[] {
  const result: ThresholdAlert[] = [];
  for (const alert of state.alerts.values()) {
    if (status !== undefined && alert.status !== status) continue;
    result.push(toReadonly(alert));
  }
  return result;
}

function getStatsImpl(state: AlertState): ThresholdAlertStats {
  let active = 0;
  for (const alert of state.alerts.values()) {
    if (alert.status === 'active') active++;
  }
  return {
    totalRules: state.rules.size,
    activeAlerts: active,
    totalAlerts: state.alerts.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createThresholdAlertService(deps: ThresholdAlertDeps): ThresholdAlertService {
  const state: AlertState = { deps, rules: new Map(), alerts: new Map() };
  return {
    addRule: (p) => addRuleImpl(state, p),
    removeRule: (id) => state.rules.delete(id),
    evaluate: (p) => evaluateImpl(state, p),
    acknowledge: (id) => setAlertStatus(state, id, 'acknowledged'),
    resolve: (id) => setAlertStatus(state, id, 'resolved'),
    listAlerts: (s) => listAlertsImpl(state, s),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createThresholdAlertService };
export type {
  ThresholdAlertService,
  ThresholdAlertDeps,
  ThresholdRule,
  ThresholdDirection,
  AlertSeverity as ThresholdAlertSeverity,
  AlertStatus as ThresholdAlertStatus,
  ThresholdAlert,
  CreateRuleParams as CreateThresholdRuleParams,
  EvaluateParams as ThresholdEvaluateParams,
  ThresholdAlertStats,
};
