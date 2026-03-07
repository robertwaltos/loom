/**
 * Alerting Engine — Threshold-based alerts for metrics and health.
 *
 * Evaluates registered alert rules against current metric values
 * and produces alert notifications when thresholds are crossed.
 *
 * Alert lifecycle:
 *   pending → firing → resolved
 *
 * Features:
 *   - Configurable thresholds (above/below)
 *   - Alert cooldown to prevent notification spam
 *   - Alert severity levels (warning, critical)
 *   - History tracking for trend analysis
 *   - Callback notification on state transitions
 *
 * "The Inspector never sleeps. When threads fray, it sounds the alarm."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type AlertSeverity = 'warning' | 'critical';
export type AlertState = 'pending' | 'firing' | 'resolved';
export type ThresholdDirection = 'above' | 'below';

export interface AlertRule {
  readonly name: string;
  readonly metricName: string;
  readonly severity: AlertSeverity;
  readonly direction: ThresholdDirection;
  readonly threshold: number;
  readonly cooldownMicroseconds: number;
  readonly description: string;
}

export interface AlertStatus {
  readonly name: string;
  readonly state: AlertState;
  readonly severity: AlertSeverity;
  readonly currentValue: number;
  readonly threshold: number;
  readonly firedAt: number | null;
  readonly resolvedAt: number | null;
  readonly fireCount: number;
}

export interface AlertNotification {
  readonly ruleName: string;
  readonly severity: AlertSeverity;
  readonly state: AlertState;
  readonly value: number;
  readonly threshold: number;
  readonly at: number;
  readonly message: string;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export type MetricValueProvider = (metricName: string) => number | undefined;
export type AlertCallback = (notification: AlertNotification) => void;

export interface AlertingDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly getMetricValue: MetricValueProvider;
  readonly onAlert: AlertCallback;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface AlertingEngine {
  registerRule(rule: AlertRule): void;
  removeRule(name: string): boolean;
  evaluate(): ReadonlyArray<AlertNotification>;
  getStatus(name: string): AlertStatus | undefined;
  getAllStatuses(): ReadonlyArray<AlertStatus>;
  getFiringAlerts(): ReadonlyArray<AlertStatus>;
  ruleCount(): number;
}

// ─── State ──────────────────────────────────────────────────────────

interface MutableAlertState {
  state: AlertState;
  currentValue: number;
  firedAt: number | null;
  resolvedAt: number | null;
  lastNotifiedAt: number;
  fireCount: number;
}

interface EngineState {
  readonly rules: Map<string, AlertRule>;
  readonly alerts: Map<string, MutableAlertState>;
  readonly deps: AlertingDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createAlertingEngine(
  deps: AlertingDeps,
): AlertingEngine {
  const state: EngineState = {
    rules: new Map(),
    alerts: new Map(),
    deps,
  };

  return {
    registerRule: (r) => { registerRuleImpl(state, r); },
    removeRule: (n) => removeRuleImpl(state, n),
    evaluate: () => evaluateImpl(state),
    getStatus: (n) => getStatusImpl(state, n),
    getAllStatuses: () => getAllStatusesImpl(state),
    getFiringAlerts: () => getFiringImpl(state),
    ruleCount: () => state.rules.size,
  };
}

// ─── Registration ───────────────────────────────────────────────────

function registerRuleImpl(state: EngineState, rule: AlertRule): void {
  state.rules.set(rule.name, rule);
  state.alerts.set(rule.name, {
    state: 'pending',
    currentValue: 0,
    firedAt: null,
    resolvedAt: null,
    lastNotifiedAt: 0,
    fireCount: 0,
  });
}

function removeRuleImpl(state: EngineState, name: string): boolean {
  state.alerts.delete(name);
  return state.rules.delete(name);
}

// ─── Evaluation ─────────────────────────────────────────────────────

function evaluateImpl(state: EngineState): ReadonlyArray<AlertNotification> {
  const notifications: AlertNotification[] = [];
  const now = state.deps.clock.nowMicroseconds();

  for (const [name, rule] of state.rules.entries()) {
    const alertState = state.alerts.get(name);
    if (alertState === undefined) continue;
    const notification = evaluateRule(state, rule, alertState, now);
    if (notification !== null) {
      notifications.push(notification);
      state.deps.onAlert(notification);
    }
  }

  return notifications;
}

function evaluateRule(
  state: EngineState,
  rule: AlertRule,
  alertState: MutableAlertState,
  now: number,
): AlertNotification | null {
  const value = state.deps.getMetricValue(rule.metricName);
  if (value === undefined) return null;
  alertState.currentValue = value;

  const breached = isBreached(value, rule);

  if (breached && alertState.state !== 'firing') {
    return transitionToFiring(rule, alertState, value, now);
  }
  if (!breached && alertState.state === 'firing') {
    return transitionToResolved(rule, alertState, value, now);
  }
  if (breached && alertState.state === 'firing') {
    return emitIfCooldownExpired(rule, alertState, value, now);
  }
  return null;
}

function isBreached(value: number, rule: AlertRule): boolean {
  if (rule.direction === 'above') return value > rule.threshold;
  return value < rule.threshold;
}

// ─── State Transitions ──────────────────────────────────────────────

function transitionToFiring(
  rule: AlertRule,
  alertState: MutableAlertState,
  value: number,
  now: number,
): AlertNotification {
  alertState.state = 'firing';
  alertState.firedAt = now;
  alertState.resolvedAt = null;
  alertState.lastNotifiedAt = now;
  alertState.fireCount += 1;
  return buildNotification(rule, 'firing', value, now);
}

function transitionToResolved(
  rule: AlertRule,
  alertState: MutableAlertState,
  value: number,
  now: number,
): AlertNotification {
  alertState.state = 'resolved';
  alertState.resolvedAt = now;
  alertState.lastNotifiedAt = now;
  return buildNotification(rule, 'resolved', value, now);
}

function emitIfCooldownExpired(
  rule: AlertRule,
  alertState: MutableAlertState,
  value: number,
  now: number,
): AlertNotification | null {
  const elapsed = now - alertState.lastNotifiedAt;
  if (elapsed < rule.cooldownMicroseconds) return null;
  alertState.lastNotifiedAt = now;
  return buildNotification(rule, 'firing', value, now);
}

function buildNotification(
  rule: AlertRule,
  alertState: AlertState,
  value: number,
  at: number,
): AlertNotification {
  const prefix = alertState === 'firing' ? 'ALERT' : 'RESOLVED';
  const msg = prefix + ': ' + rule.name + ' (' + rule.description + ')';
  return {
    ruleName: rule.name,
    severity: rule.severity,
    state: alertState,
    value,
    threshold: rule.threshold,
    at,
    message: msg,
  };
}

// ─── Queries ────────────────────────────────────────────────────────

function getStatusImpl(
  state: EngineState,
  name: string,
): AlertStatus | undefined {
  const rule = state.rules.get(name);
  const alert = state.alerts.get(name);
  if (rule === undefined || alert === undefined) return undefined;
  return toStatus(rule, alert);
}

function getAllStatusesImpl(
  state: EngineState,
): ReadonlyArray<AlertStatus> {
  const result: AlertStatus[] = [];
  for (const [name, rule] of state.rules.entries()) {
    const alert = state.alerts.get(name);
    if (alert !== undefined) result.push(toStatus(rule, alert));
  }
  return result;
}

function getFiringImpl(
  state: EngineState,
): ReadonlyArray<AlertStatus> {
  const result: AlertStatus[] = [];
  for (const [name, rule] of state.rules.entries()) {
    const alert = state.alerts.get(name);
    if (alert !== undefined && alert.state === 'firing') {
      result.push(toStatus(rule, alert));
    }
  }
  return result;
}

function toStatus(rule: AlertRule, alert: MutableAlertState): AlertStatus {
  return {
    name: rule.name,
    state: alert.state,
    severity: rule.severity,
    currentValue: alert.currentValue,
    threshold: rule.threshold,
    firedAt: alert.firedAt,
    resolvedAt: alert.resolvedAt,
    fireCount: alert.fireCount,
  };
}
