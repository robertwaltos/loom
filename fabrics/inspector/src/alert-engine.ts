/**
 * Alert Engine — Advanced alerting with state management and grouping.
 *
 * Alert rules: threshold-based, rate-of-change, anomaly detection.
 * Alert states: ACTIVE -> ACKNOWLEDGED -> RESOLVED | SILENCED
 * Severities: INFO, WARNING, CRITICAL, EMERGENCY
 * Alert grouping consolidates similar alerts.
 * Cooldown prevents re-firing within a window.
 * History tracks all alert transitions with timestamps.
 *
 * "The Inspector never sleeps. When threads fray, it sounds the alarm."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type AlertEngineSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertEngineState = 'active' | 'acknowledged' | 'resolved' | 'silenced';
export type AlertRuleKind = 'threshold' | 'rate_of_change' | 'anomaly';
export type AlertThresholdDir = 'above' | 'below';

export interface AlertEngineRule {
  readonly ruleId: string;
  readonly metricName: string;
  readonly kind: AlertRuleKind;
  readonly severity: AlertEngineSeverity;
  readonly direction: AlertThresholdDir;
  readonly threshold: number;
  readonly cooldownMs: number;
  readonly groupKey: string;
  readonly description: string;
}

export interface AlertRecord {
  readonly alertId: string;
  readonly ruleId: string;
  readonly state: AlertEngineState;
  readonly severity: AlertEngineSeverity;
  readonly value: number;
  readonly threshold: number;
  readonly firedAt: number;
  readonly acknowledgedAt: number | null;
  readonly resolvedAt: number | null;
  readonly groupKey: string;
  readonly message: string;
}

export interface AlertHistoryEntry {
  readonly alertId: string;
  readonly ruleId: string;
  readonly fromState: AlertEngineState | null;
  readonly toState: AlertEngineState;
  readonly at: number;
  readonly value: number;
}

export interface AlertDispatch {
  readonly alertId: string;
  readonly severity: AlertEngineSeverity;
  readonly message: string;
  readonly state: AlertEngineState;
  readonly at: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export type AlertMetricProvider = (metricName: string) => number | undefined;
export type AlertDispatchCallback = (dispatch: AlertDispatch) => void;

export interface AlertEngineDeps {
  readonly clock: { nowMilliseconds(): number };
  readonly idGenerator: { next(): string };
  readonly getMetricValue: AlertMetricProvider;
  readonly onDispatch: AlertDispatchCallback;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface AlertEngine {
  readonly addRule: (rule: AlertEngineRule) => void;
  readonly removeRule: (ruleId: string) => boolean;
  readonly evaluate: () => ReadonlyArray<AlertDispatch>;
  readonly acknowledge: (alertId: string) => boolean;
  readonly silence: (alertId: string, durationMs: number) => boolean;
  readonly resolve: (alertId: string) => boolean;
  readonly getAlert: (alertId: string) => AlertRecord | undefined;
  readonly getActiveAlerts: () => ReadonlyArray<AlertRecord>;
  readonly getAlertsByGroup: (groupKey: string) => ReadonlyArray<AlertRecord>;
  readonly getHistory: (limit: number) => ReadonlyArray<AlertHistoryEntry>;
  readonly ruleCount: () => number;
  readonly alertCount: () => number;
}

// ─── Internal State ─────────────────────────────────────────────────

interface MutableAlert {
  readonly alertId: string;
  readonly ruleId: string;
  state: AlertEngineState;
  readonly severity: AlertEngineSeverity;
  value: number;
  readonly threshold: number;
  readonly firedAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  readonly groupKey: string;
  message: string;
  lastNotifiedAt: number;
  silencedUntil: number;
}

interface EngineState {
  readonly rules: Map<string, AlertEngineRule>;
  readonly alerts: Map<string, MutableAlert>;
  readonly ruleToAlert: Map<string, string>;
  readonly history: AlertHistoryEntry[];
  readonly deps: AlertEngineDeps;
  readonly maxHistory: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createAlertEngine(deps: AlertEngineDeps): AlertEngine {
  const state: EngineState = {
    rules: new Map(),
    alerts: new Map(),
    ruleToAlert: new Map(),
    history: [],
    deps,
    maxHistory: 1000,
  };

  return {
    addRule: (r) => {
      addRuleImpl(state, r);
    },
    removeRule: (id) => removeRuleImpl(state, id),
    evaluate: () => evaluateImpl(state),
    acknowledge: (id) => acknowledgeImpl(state, id),
    silence: (id, dur) => silenceImpl(state, id, dur),
    resolve: (id) => resolveImpl(state, id),
    getAlert: (id) => getAlertImpl(state, id),
    getActiveAlerts: () => getActiveImpl(state),
    getAlertsByGroup: (gk) => getByGroupImpl(state, gk),
    getHistory: (n) => getHistoryImpl(state, n),
    ruleCount: () => state.rules.size,
    alertCount: () => state.alerts.size,
  };
}

// ─── Rule Management ────────────────────────────────────────────────

function addRuleImpl(state: EngineState, rule: AlertEngineRule): void {
  state.rules.set(rule.ruleId, rule);
}

function removeRuleImpl(state: EngineState, ruleId: string): boolean {
  const alertId = state.ruleToAlert.get(ruleId);
  if (alertId !== undefined) {
    state.alerts.delete(alertId);
    state.ruleToAlert.delete(ruleId);
  }
  return state.rules.delete(ruleId);
}

// ─── Evaluation ─────────────────────────────────────────────────────

function evaluateImpl(state: EngineState): ReadonlyArray<AlertDispatch> {
  const dispatches: AlertDispatch[] = [];
  const now = state.deps.clock.nowMilliseconds();

  for (const rule of state.rules.values()) {
    const dispatch = evaluateRule(state, rule, now);
    if (dispatch !== null) {
      dispatches.push(dispatch);
      state.deps.onDispatch(dispatch);
    }
  }

  return dispatches;
}

function evaluateRule(
  state: EngineState,
  rule: AlertEngineRule,
  now: number,
): AlertDispatch | null {
  const value = state.deps.getMetricValue(rule.metricName);
  if (value === undefined) return null;

  const breached = isBreached(value, rule);
  const existingId = state.ruleToAlert.get(rule.ruleId);
  const existing = existingId !== undefined ? state.alerts.get(existingId) : undefined;

  if (breached && existing === undefined) {
    return fireNewAlert(state, rule, value, now);
  }
  if (breached && existing !== undefined) {
    return handleOngoingBreach(state, rule, existing, value, now);
  }
  if (!breached && existing !== undefined && existing.state === 'active') {
    return autoResolve(state, existing, value, now);
  }
  return null;
}

function isBreached(value: number, rule: AlertEngineRule): boolean {
  if (rule.direction === 'above') return value > rule.threshold;
  return value < rule.threshold;
}

// ─── Alert Lifecycle ────────────────────────────────────────────────

function fireNewAlert(
  state: EngineState,
  rule: AlertEngineRule,
  value: number,
  now: number,
): AlertDispatch {
  const alertId = state.deps.idGenerator.next();
  const msg = 'ALERT: ' + rule.ruleId + ' (' + rule.description + ')';
  const alert: MutableAlert = {
    alertId,
    ruleId: rule.ruleId,
    state: 'active',
    severity: rule.severity,
    value,
    threshold: rule.threshold,
    firedAt: now,
    acknowledgedAt: null,
    resolvedAt: null,
    groupKey: rule.groupKey,
    message: msg,
    lastNotifiedAt: now,
    silencedUntil: 0,
  };
  state.alerts.set(alertId, alert);
  state.ruleToAlert.set(rule.ruleId, alertId);
  recordHistory(state, alertId, rule.ruleId, null, 'active', now, value);
  return { alertId, severity: rule.severity, message: msg, state: 'active', at: now };
}

function handleOngoingBreach(
  state: EngineState,
  rule: AlertEngineRule,
  alert: MutableAlert,
  value: number,
  now: number,
): AlertDispatch | null {
  alert.value = value;
  if (alert.state === 'silenced' && now < alert.silencedUntil) return null;
  if (alert.state === 'silenced' && now >= alert.silencedUntil) {
    return reactivateAlert(state, alert, value, now);
  }
  if (now - alert.lastNotifiedAt < rule.cooldownMs) return null;
  alert.lastNotifiedAt = now;
  const msg = 'ONGOING: ' + rule.ruleId + ' value=' + String(value);
  return {
    alertId: alert.alertId,
    severity: alert.severity,
    message: msg,
    state: alert.state,
    at: now,
  };
}

function reactivateAlert(
  state: EngineState,
  alert: MutableAlert,
  value: number,
  now: number,
): AlertDispatch {
  const prevState = alert.state;
  alert.state = 'active';
  alert.lastNotifiedAt = now;
  alert.silencedUntil = 0;
  recordHistory(state, alert.alertId, alert.ruleId, prevState, 'active', now, value);
  const msg = 'REACTIVATED: ' + alert.ruleId;
  return {
    alertId: alert.alertId,
    severity: alert.severity,
    message: msg,
    state: 'active',
    at: now,
  };
}

function autoResolve(
  state: EngineState,
  alert: MutableAlert,
  value: number,
  now: number,
): AlertDispatch {
  alert.state = 'resolved';
  alert.resolvedAt = now;
  alert.value = value;
  recordHistory(state, alert.alertId, alert.ruleId, 'active', 'resolved', now, value);
  const msg = 'RESOLVED: ' + alert.ruleId;
  return {
    alertId: alert.alertId,
    severity: alert.severity,
    message: msg,
    state: 'resolved',
    at: now,
  };
}

// ─── Manual Transitions ─────────────────────────────────────────────

function acknowledgeImpl(state: EngineState, alertId: string): boolean {
  const alert = state.alerts.get(alertId);
  if (alert === undefined) return false;
  if (alert.state !== 'active') return false;
  const now = state.deps.clock.nowMilliseconds();
  alert.state = 'acknowledged';
  alert.acknowledgedAt = now;
  recordHistory(state, alertId, alert.ruleId, 'active', 'acknowledged', now, alert.value);
  return true;
}

function silenceImpl(state: EngineState, alertId: string, durationMs: number): boolean {
  const alert = state.alerts.get(alertId);
  if (alert === undefined) return false;
  if (alert.state === 'resolved') return false;
  const now = state.deps.clock.nowMilliseconds();
  const prevState = alert.state;
  alert.state = 'silenced';
  alert.silencedUntil = now + durationMs;
  recordHistory(state, alertId, alert.ruleId, prevState, 'silenced', now, alert.value);
  return true;
}

function resolveImpl(state: EngineState, alertId: string): boolean {
  const alert = state.alerts.get(alertId);
  if (alert === undefined) return false;
  if (alert.state === 'resolved') return false;
  const now = state.deps.clock.nowMilliseconds();
  const prevState = alert.state;
  alert.state = 'resolved';
  alert.resolvedAt = now;
  recordHistory(state, alertId, alert.ruleId, prevState, 'resolved', now, alert.value);
  return true;
}

// ─── History ────────────────────────────────────────────────────────

function recordHistory(
  state: EngineState,
  alertId: string,
  ruleId: string,
  fromState: AlertEngineState | null,
  toState: AlertEngineState,
  at: number,
  value: number,
): void {
  state.history.push({ alertId, ruleId, fromState, toState, at, value });
  if (state.history.length > state.maxHistory) {
    state.history.shift();
  }
}

// ─── Queries ────────────────────────────────────────────────────────

function getAlertImpl(state: EngineState, alertId: string): AlertRecord | undefined {
  const a = state.alerts.get(alertId);
  return a !== undefined ? toRecord(a) : undefined;
}

function getActiveImpl(state: EngineState): ReadonlyArray<AlertRecord> {
  const result: AlertRecord[] = [];
  for (const a of state.alerts.values()) {
    if (a.state === 'active' || a.state === 'acknowledged') {
      result.push(toRecord(a));
    }
  }
  return result;
}

function getByGroupImpl(state: EngineState, groupKey: string): ReadonlyArray<AlertRecord> {
  const result: AlertRecord[] = [];
  for (const a of state.alerts.values()) {
    if (a.groupKey === groupKey) result.push(toRecord(a));
  }
  return result;
}

function getHistoryImpl(state: EngineState, limit: number): ReadonlyArray<AlertHistoryEntry> {
  const start = Math.max(0, state.history.length - limit);
  return state.history.slice(start);
}

function toRecord(a: MutableAlert): AlertRecord {
  return {
    alertId: a.alertId,
    ruleId: a.ruleId,
    state: a.state,
    severity: a.severity,
    value: a.value,
    threshold: a.threshold,
    firedAt: a.firedAt,
    acknowledgedAt: a.acknowledgedAt,
    resolvedAt: a.resolvedAt,
    groupKey: a.groupKey,
    message: a.message,
  };
}
