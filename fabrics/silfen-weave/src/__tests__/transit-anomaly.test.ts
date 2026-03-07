import { describe, it, expect } from 'vitest';
import {
  createTransitAnomalyDetector,
  DEFAULT_ANOMALY_CONFIG,
} from '../transit-anomaly.js';
import type {
  TransitAnomaly,
  AnomalyDetectorDeps,
  AnomalyDetectorConfig,
} from '../transit-anomaly.js';

function makeDeps(overrides?: Partial<AnomalyDetectorDeps>): AnomalyDetectorDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'anomaly-' + String(++idCounter) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    onAnomaly: () => {},
    ...overrides,
  };
}

function quickConfig(overrides?: Partial<AnomalyDetectorConfig>): AnomalyDetectorConfig {
  return { ...DEFAULT_ANOMALY_CONFIG, ...overrides };
}

describe('TransitAnomalyDetector — tracking lifecycle', () => {
  it('starts tracking a lock', () => {
    const detector = createTransitAnomalyDetector(makeDeps());
    detector.startTracking('lock-1', 'entity-1');
    expect(detector.isTracking('lock-1')).toBe(true);
    expect(detector.getTrackedLockCount()).toBe(1);
  });

  it('stops tracking a lock', () => {
    const detector = createTransitAnomalyDetector(makeDeps());
    detector.startTracking('lock-1', 'entity-1');
    detector.stopTracking('lock-1');
    expect(detector.isTracking('lock-1')).toBe(false);
    expect(detector.getTrackedLockCount()).toBe(0);
  });

  it('auto-starts tracking on first coherence record', () => {
    const detector = createTransitAnomalyDetector(makeDeps());
    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    expect(detector.isTracking('lock-1')).toBe(true);
  });

  it('ignores duplicate startTracking calls', () => {
    const detector = createTransitAnomalyDetector(makeDeps());
    detector.startTracking('lock-1', 'entity-1');
    detector.startTracking('lock-1', 'entity-1');
    expect(detector.getTrackedLockCount()).toBe(1);
  });
});

describe('TransitAnomalyDetector — coherence jump detection', () => {
  it('detects a large coherence jump as warning', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({ maxCoherenceStep: 0.15 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.3);

    expect(captured).toHaveLength(1);
    expect(captured[0]?.type).toBe('coherence_jump');
    expect(captured[0]?.severity).toBe('warning');
  });

  it('detects extreme jump as critical', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({ maxCoherenceStep: 0.15 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);

    const jump = captured.find((a) => a.type === 'coherence_jump');
    expect(jump?.severity).toBe('critical');
  });

  it('does not flag normal coherence changes', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({ maxCoherenceStep: 0.15 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.2);

    const jumps = captured.filter((a) => a.type === 'coherence_jump');
    expect(jumps).toHaveLength(0);
  });
});

describe('TransitAnomalyDetector — velocity violation', () => {
  it('detects coherence changing too fast', () => {
    const captured: TransitAnomaly[] = [];
    let time = 1_000_000;
    const deps: AnomalyDetectorDeps = {
      idGenerator: { next: () => 'a-' + String(++time) },
      clock: { nowMicroseconds: () => (time += 100) },
      onAnomaly: (a) => { captured.push(a); },
    };
    const config = quickConfig({
      maxVelocityPerUs: 0.000001,
      maxCoherenceStep: 1.0,
    });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.0);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);

    const violations = captured.filter((a) => a.type === 'velocity_violation');
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });

  it('allows normal velocity changes', () => {
    const captured: TransitAnomaly[] = [];
    let time = 0;
    const deps: AnomalyDetectorDeps = {
      idGenerator: { next: () => 'a-' + String(++time) },
      clock: { nowMicroseconds: () => (time += 10_000_000) },
      onAnomaly: (a) => { captured.push(a); },
    };
    const config = quickConfig({
      maxVelocityPerUs: 0.000001,
      maxCoherenceStep: 1.0,
    });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.0);
    detector.recordCoherence('lock-1', 'entity-1', 0.005);

    const violations = captured.filter((a) => a.type === 'velocity_violation');
    expect(violations).toHaveLength(0);
  });
});

describe('TransitAnomalyDetector — oscillation detection', () => {
  it('detects rapid oscillation pattern', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({
      oscillationWindowSize: 5,
      oscillationThreshold: 3,
      maxCoherenceStep: 1.0,
    });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.5);
    detector.recordCoherence('lock-1', 'entity-1', 0.7);
    detector.recordCoherence('lock-1', 'entity-1', 0.4);
    detector.recordCoherence('lock-1', 'entity-1', 0.8);
    detector.recordCoherence('lock-1', 'entity-1', 0.3);

    const oscillations = captured.filter((a) => a.type === 'oscillation');
    expect(oscillations.length).toBeGreaterThanOrEqual(1);
    expect(oscillations[0]?.severity).toBe('critical');
  });

  it('does not flag monotonic increase', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({
      oscillationWindowSize: 5,
      oscillationThreshold: 3,
      maxCoherenceStep: 1.0,
    });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.2);
    detector.recordCoherence('lock-1', 'entity-1', 0.3);
    detector.recordCoherence('lock-1', 'entity-1', 0.4);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);

    const oscillations = captured.filter((a) => a.type === 'oscillation');
    expect(oscillations).toHaveLength(0);
  });
});

describe('TransitAnomalyDetector — anomaly queries', () => {
  it('retrieves anomalies for a specific lock', () => {
    const deps = makeDeps();
    const config = quickConfig({ maxCoherenceStep: 0.1 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);

    const anomalies = detector.getAnomalies('lock-1');
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies[0]?.lockId).toBe('lock-1');
  });

  it('returns empty for unknown lock', () => {
    const detector = createTransitAnomalyDetector(makeDeps());
    expect(detector.getAnomalies('unknown')).toHaveLength(0);
  });

  it('getAllAnomalies aggregates across locks', () => {
    const deps = makeDeps();
    const config = quickConfig({ maxCoherenceStep: 0.1 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);
    detector.recordCoherence('lock-2', 'entity-2', 0.1);
    detector.recordCoherence('lock-2', 'entity-2', 0.5);

    const all = detector.getAllAnomalies();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('clearAnomalies removes anomalies for a lock', () => {
    const deps = makeDeps();
    const config = quickConfig({ maxCoherenceStep: 0.1 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);

    const cleared = detector.clearAnomalies('lock-1');
    expect(cleared).toBeGreaterThanOrEqual(1);
    expect(detector.getAnomalies('lock-1')).toHaveLength(0);
  });

  it('clearAnomalies returns 0 for unknown lock', () => {
    const detector = createTransitAnomalyDetector(makeDeps());
    expect(detector.clearAnomalies('unknown')).toBe(0);
  });
});

describe('TransitAnomalyDetector — anomaly metadata', () => {
  it('includes lockId, entityId, and timestamps', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({ maxCoherenceStep: 0.05 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-42', 'entity-7', 0.1);
    detector.recordCoherence('lock-42', 'entity-7', 0.5);

    expect(captured[0]?.lockId).toBe('lock-42');
    expect(captured[0]?.entityId).toBe('entity-7');
    expect(captured[0]?.anomalyId).toBeTruthy();
    expect(captured[0]?.detectedAt).toBeGreaterThan(0);
    expect(captured[0]?.coherenceValue).toBe(0.5);
    expect(captured[0]?.previousCoherence).toBe(0.1);
  });

  it('generates unique anomaly IDs', () => {
    const captured: TransitAnomaly[] = [];
    const deps = makeDeps({ onAnomaly: (a) => { captured.push(a); } });
    const config = quickConfig({ maxCoherenceStep: 0.05 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);
    detector.recordCoherence('lock-1', 'entity-1', 0.1);

    const ids = captured.map((a) => a.anomalyId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('TransitAnomalyDetector — callback and defaults', () => {
  it('calls onAnomaly callback for each anomaly', () => {
    let callCount = 0;
    const deps = makeDeps({ onAnomaly: () => { callCount += 1; } });
    const config = quickConfig({ maxCoherenceStep: 0.05 });
    const detector = createTransitAnomalyDetector(deps, config);

    detector.recordCoherence('lock-1', 'entity-1', 0.1);
    detector.recordCoherence('lock-1', 'entity-1', 0.5);

    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  it('has sensible defaults', () => {
    expect(DEFAULT_ANOMALY_CONFIG.maxCoherenceStep).toBe(0.15);
    expect(DEFAULT_ANOMALY_CONFIG.oscillationWindowSize).toBe(5);
    expect(DEFAULT_ANOMALY_CONFIG.oscillationThreshold).toBe(3);
    expect(DEFAULT_ANOMALY_CONFIG.stallTimeoutUs).toBe(30_000_000);
  });
});
