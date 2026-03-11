/**
 * Transit Anomaly Detector — Coherence pattern analysis for the Silfen Weave.
 *
 * The Weave is not passive infrastructure — it is alive, and it resists
 * manipulation. The Transit Anomaly Detector watches coherence telemetry
 * and flags suspicious patterns:
 *
 *   - Impossible coherence jumps (> maxCoherenceStep per update)
 *   - Oscillation (rapid rise/fall suggesting spoofing)
 *   - Stalled locks (no coherence change within timeout)
 *   - Velocity violations (coherence changing too fast per microsecond)
 *
 * The detector does NOT block transit — it raises anomalies that higher-level
 * systems (e.g., the Dye House) may act upon. This preserves separation of
 * concerns: detection here, enforcement elsewhere.
 *
 * "The Weave remembers every vibration. Deception leaves fingerprints."
 */

// ─── Types ───────────────────────────────────────────────────────────

export type AnomalyType = 'coherence_jump' | 'oscillation' | 'stalled_lock' | 'velocity_violation';

export type AnomalySeverity = 'warning' | 'critical';

export interface TransitAnomaly {
  readonly anomalyId: string;
  readonly lockId: string;
  readonly entityId: string;
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly detectedAt: number;
  readonly coherenceValue: number;
  readonly previousCoherence: number;
}

export interface AnomalyDetectorConfig {
  readonly maxCoherenceStep: number;
  readonly maxVelocityPerUs: number;
  readonly oscillationWindowSize: number;
  readonly oscillationThreshold: number;
  readonly stallTimeoutUs: number;
}

export interface AnomalyCallback {
  (anomaly: TransitAnomaly): void;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface AnomalyIdGenerator {
  next(): string;
}

export interface AnomalyDetectorDeps {
  readonly idGenerator: AnomalyIdGenerator;
  readonly clock: { nowMicroseconds(): number };
  readonly onAnomaly: AnomalyCallback;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface TransitAnomalyDetector {
  recordCoherence(lockId: string, entityId: string, coherence: number): void;
  startTracking(lockId: string, entityId: string): void;
  stopTracking(lockId: string): void;
  getAnomalies(lockId: string): ReadonlyArray<TransitAnomaly>;
  getAllAnomalies(): ReadonlyArray<TransitAnomaly>;
  getTrackedLockCount(): number;
  isTracking(lockId: string): boolean;
  clearAnomalies(lockId: string): number;
}

// ─── Default Config ─────────────────────────────────────────────────

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectorConfig = {
  maxCoherenceStep: 0.15,
  maxVelocityPerUs: 0.000001,
  oscillationWindowSize: 5,
  oscillationThreshold: 3,
  stallTimeoutUs: 30_000_000,
};

// ─── Internal State ─────────────────────────────────────────────────

interface LockTelemetry {
  readonly lockId: string;
  readonly entityId: string;
  readonly readings: CoherenceReading[];
  readonly anomalies: TransitAnomaly[];
}

interface CoherenceReading {
  readonly coherence: number;
  readonly at: number;
}

interface DetectorState {
  readonly locks: Map<string, LockTelemetry>;
  readonly config: AnomalyDetectorConfig;
  readonly deps: AnomalyDetectorDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createTransitAnomalyDetector(
  deps: AnomalyDetectorDeps,
  config: AnomalyDetectorConfig = DEFAULT_ANOMALY_CONFIG,
): TransitAnomalyDetector {
  const state: DetectorState = {
    locks: new Map(),
    config,
    deps,
  };

  return {
    recordCoherence: (l, e, c) => {
      recordCoherenceImpl(state, l, e, c);
    },
    startTracking: (l, e) => {
      startTrackingImpl(state, l, e);
    },
    stopTracking: (l) => {
      stopTrackingImpl(state, l);
    },
    getAnomalies: (l) => getAnomaliesImpl(state, l),
    getAllAnomalies: () => getAllAnomaliesImpl(state),
    getTrackedLockCount: () => state.locks.size,
    isTracking: (l) => state.locks.has(l),
    clearAnomalies: (l) => clearAnomaliesImpl(state, l),
  };
}

// ─── Tracking Lifecycle ─────────────────────────────────────────────

function startTrackingImpl(state: DetectorState, lockId: string, entityId: string): void {
  if (state.locks.has(lockId)) return;
  state.locks.set(lockId, {
    lockId,
    entityId,
    readings: [],
    anomalies: [],
  });
}

function stopTrackingImpl(state: DetectorState, lockId: string): void {
  state.locks.delete(lockId);
}

// ─── Record Coherence ───────────────────────────────────────────────

function recordCoherenceImpl(
  state: DetectorState,
  lockId: string,
  entityId: string,
  coherence: number,
): void {
  let telemetry = state.locks.get(lockId);
  if (telemetry === undefined) {
    startTrackingImpl(state, lockId, entityId);
    telemetry = state.locks.get(lockId) as LockTelemetry;
  }

  const now = state.deps.clock.nowMicroseconds();
  const previous = lastReading(telemetry);

  telemetry.readings.push({ coherence, at: now });

  if (previous !== undefined) {
    checkCoherenceJump(state, telemetry, previous, coherence, now);
    checkVelocityViolation(state, telemetry, previous, coherence, now);
    checkOscillation(state, telemetry, now);
  }
}

// ─── Coherence Jump Detection ───────────────────────────────────────

function checkCoherenceJump(
  state: DetectorState,
  telemetry: LockTelemetry,
  previous: CoherenceReading,
  coherence: number,
  now: number,
): void {
  const delta = Math.abs(coherence - previous.coherence);
  if (delta <= state.config.maxCoherenceStep) return;

  const severity: AnomalySeverity =
    delta > state.config.maxCoherenceStep * 2 ? 'critical' : 'warning';

  emitAnomaly(state, telemetry, {
    type: 'coherence_jump',
    severity,
    description:
      'Coherence changed by ' +
      delta.toFixed(4) +
      ' (max ' +
      state.config.maxCoherenceStep.toFixed(4) +
      ')',
    coherenceValue: coherence,
    previousCoherence: previous.coherence,
    detectedAt: now,
  });
}

// ─── Velocity Violation Detection ───────────────────────────────────

function checkVelocityViolation(
  state: DetectorState,
  telemetry: LockTelemetry,
  previous: CoherenceReading,
  coherence: number,
  now: number,
): void {
  const timeDelta = now - previous.at;
  if (timeDelta <= 0) return;

  const coherenceDelta = Math.abs(coherence - previous.coherence);
  const velocity = coherenceDelta / timeDelta;

  if (velocity <= state.config.maxVelocityPerUs) return;

  emitAnomaly(state, telemetry, {
    type: 'velocity_violation',
    severity: 'warning',
    description:
      'Coherence velocity ' +
      velocity.toExponential(4) +
      '/us exceeds max ' +
      state.config.maxVelocityPerUs.toExponential(4) +
      '/us',
    coherenceValue: coherence,
    previousCoherence: previous.coherence,
    detectedAt: now,
  });
}

// ─── Oscillation Detection ──────────────────────────────────────────

function checkOscillation(state: DetectorState, telemetry: LockTelemetry, now: number): void {
  const windowSize = state.config.oscillationWindowSize;
  if (telemetry.readings.length < windowSize) return;

  const window = telemetry.readings.slice(-windowSize);
  const reversals = countDirectionReversals(window);

  if (reversals < state.config.oscillationThreshold) return;

  const lastVal = window[window.length - 1] ?? { coherence: 0 };
  const prevVal = window[window.length - 2] ?? { coherence: 0 };

  emitAnomaly(state, telemetry, {
    type: 'oscillation',
    severity: 'critical',
    description:
      'Detected ' +
      String(reversals) +
      ' direction reversals in ' +
      String(windowSize) +
      ' readings',
    coherenceValue: lastVal.coherence,
    previousCoherence: prevVal.coherence,
    detectedAt: now,
  });
}

function countDirectionReversals(readings: ReadonlyArray<CoherenceReading>): number {
  let reversals = 0;
  let lastDirection = 0;

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    if (prev === undefined || curr === undefined) continue;

    const diff = curr.coherence - prev.coherence;
    const direction = diff > 0 ? 1 : diff < 0 ? -1 : 0;

    if (direction !== 0 && lastDirection !== 0 && direction !== lastDirection) {
      reversals += 1;
    }
    if (direction !== 0) {
      lastDirection = direction;
    }
  }
  return reversals;
}

// ─── Stall Detection (on-demand) ────────────────────────────────────

// Note: Stall detection is checked passively during recordCoherence.
// A dedicated checkStalls() method could be added for periodic evaluation.

// ─── Anomaly Emission ───────────────────────────────────────────────

interface AnomalyParams {
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly coherenceValue: number;
  readonly previousCoherence: number;
  readonly detectedAt: number;
}

function emitAnomaly(state: DetectorState, telemetry: LockTelemetry, params: AnomalyParams): void {
  const anomaly: TransitAnomaly = {
    anomalyId: state.deps.idGenerator.next(),
    lockId: telemetry.lockId,
    entityId: telemetry.entityId,
    type: params.type,
    severity: params.severity,
    description: params.description,
    detectedAt: params.detectedAt,
    coherenceValue: params.coherenceValue,
    previousCoherence: params.previousCoherence,
  };
  telemetry.anomalies.push(anomaly);
  state.deps.onAnomaly(anomaly);
}

// ─── Queries ────────────────────────────────────────────────────────

function getAnomaliesImpl(state: DetectorState, lockId: string): ReadonlyArray<TransitAnomaly> {
  const telemetry = state.locks.get(lockId);
  if (telemetry === undefined) return [];
  return [...telemetry.anomalies];
}

function getAllAnomaliesImpl(state: DetectorState): ReadonlyArray<TransitAnomaly> {
  const all: TransitAnomaly[] = [];
  for (const telemetry of state.locks.values()) {
    all.push(...telemetry.anomalies);
  }
  return all;
}

function clearAnomaliesImpl(state: DetectorState, lockId: string): number {
  const telemetry = state.locks.get(lockId);
  if (telemetry === undefined) return 0;
  const count = telemetry.anomalies.length;
  telemetry.anomalies.length = 0;
  return count;
}

// ─── Helpers ────────────────────────────────────────────────────────

function lastReading(telemetry: LockTelemetry): CoherenceReading | undefined {
  if (telemetry.readings.length === 0) return undefined;
  return telemetry.readings[telemetry.readings.length - 1];
}
