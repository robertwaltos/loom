import { describe, it, expect } from 'vitest';
import { createAnomalyDetectorSystem } from '../anomaly-detector-system.js';
import type { AnomalyDetectorSystem, Anomaly } from '../anomaly-detector-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): AnomalyDetectorSystem {
  return createAnomalyDetectorSystem({
    clock: { nowMicroseconds: () => BigInt(Date.now()) * 1000n },
    idGen: { next: () => 'anomaly-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

function asAnomaly(
  r: { success: true; anomaly?: Anomaly } | { success: false; error: string },
): Anomaly | undefined {
  if (!r.success) throw new Error('Expected success, got: ' + r.error);
  return r.anomaly;
}

// ─── registerMetric ───────────────────────────────────────────────────────────

describe('registerMetric', () => {
  it('registers a new metric', () => {
    const sys = createTestSystem();
    expect(sys.registerMetric('cpu')).toEqual({ success: true });
  });

  it('returns metric-not-found (already-exists guard) for duplicate', () => {
    const sys = createTestSystem();
    sys.registerMetric('cpu');
    const r = sys.registerMetric('cpu');
    expect(r.success).toBe(false);
  });

  it('getBaseline returns empty baseline after registration', () => {
    const sys = createTestSystem();
    sys.registerMetric('cpu');
    const b = sys.getBaseline('cpu');
    expect(b?.sampleCount).toBe(0);
    expect(b?.mean).toBe(0);
  });

  it('getBaseline returns undefined for unknown metric', () => {
    const sys = createTestSystem();
    expect(sys.getBaseline('unknown')).toBeUndefined();
  });
});

// ─── recordValue — error cases ────────────────────────────────────────────────

describe('recordValue — errors', () => {
  it('returns metric-not-found for unregistered metric', () => {
    const sys = createTestSystem();
    expect(sys.recordValue('ghost', 42)).toEqual({ success: false, error: 'metric-not-found' });
  });

  it('returns invalid-value for NaN', () => {
    const sys = createTestSystem();
    sys.registerMetric('cpu');
    expect(sys.recordValue('cpu', NaN)).toEqual({ success: false, error: 'invalid-value' });
  });

  it('returns invalid-value for Infinity', () => {
    const sys = createTestSystem();
    sys.registerMetric('cpu');
    expect(sys.recordValue('cpu', Infinity)).toEqual({ success: false, error: 'invalid-value' });
  });

  it('succeeds with no anomaly for fewer than 5 samples', () => {
    const sys = createTestSystem();
    sys.registerMetric('cpu');
    for (let i = 0; i < 4; i++) {
      const r = sys.recordValue('cpu', 50);
      expect(r).toEqual({ success: true });
      expect((r as { success: true; anomaly?: Anomaly }).anomaly).toBeUndefined();
    }
  });
});

// ─── recordValue — anomaly detection ─────────────────────────────────────────

describe('recordValue — detection', () => {
  it('detects SPIKE with MEDIUM sensitivity (> 2 stddev)', () => {
    const sys = createTestSystem();
    sys.registerMetric('metric');
    for (let i = 0; i < 10; i++) sys.recordValue('metric', 10 + (i % 2) * 2);
    const result = sys.recordValue('metric', 100);
    expect(result.success).toBe(true);
    const anomaly = (result as { success: true; anomaly?: Anomaly }).anomaly;
    expect(anomaly?.type).toBe('SPIKE');
  });

  it('detects DROP with HIGH sensitivity', () => {
    const sys = createTestSystem();
    sys.registerMetric('rps');
    for (let i = 0; i < 10; i++) sys.recordValue('rps', 10 + (i % 2) * 2);
    sys.setThreshold('rps', 'HIGH');
    const anomaly = asAnomaly(sys.recordValue('rps', 1));
    expect(anomaly?.type).toBe('DROP');
  });

  it('detects FLATLINE when last 5 values are identical', () => {
    const sys = createTestSystem();
    sys.registerMetric('net');
    for (let i = 0; i < 10; i++) sys.recordValue('net', i * 2);
    for (let i = 0; i < 5; i++) sys.recordValue('net', 20);
    const anomaly = asAnomaly(sys.recordValue('net', 20));
    expect(anomaly?.type).toBe('FLATLINE');
  });

  it('detects TREND_UP when last 5 values strictly increase', () => {
    const sys = createTestSystem();
    sys.registerMetric('mem');
    for (let i = 0; i < 10; i++) sys.recordValue('mem', 50);
    for (let i = 1; i <= 5; i++) sys.recordValue('mem', 50 + i);
    const anomaly = asAnomaly(sys.recordValue('mem', 56));
    expect(anomaly?.type).toBe('TREND_UP');
  });
});

// ─── setThreshold ─────────────────────────────────────────────────────────────

describe('setThreshold', () => {
  it('updates sensitivity', () => {
    const sys = createTestSystem();
    sys.registerMetric('cpu');
    expect(sys.setThreshold('cpu', 'LOW')).toEqual({ success: true });
  });

  it('returns metric-not-found for unknown metric', () => {
    const sys = createTestSystem();
    expect(sys.setThreshold('ghost', 'HIGH')).toEqual({
      success: false,
      error: 'metric-not-found',
    });
  });
});

// ─── listAnomalies / clearAnomalies ──────────────────────────────────────────

describe('listAnomalies', () => {
  it('returns all anomalies when no metric specified', () => {
    const sys = createTestSystem();
    sys.registerMetric('m1');
    for (let i = 0; i < 10; i++) sys.recordValue('m1', 10 + (i % 2) * 2);
    sys.recordValue('m1', 1000); // spike
    expect(sys.listAnomalies().length).toBeGreaterThanOrEqual(1);
  });

  it('returns anomalies filtered by metric', () => {
    const sys = createTestSystem();
    sys.registerMetric('m1');
    sys.registerMetric('m2');
    for (let i = 0; i < 10; i++) sys.recordValue('m1', 10 + (i % 2) * 2);
    sys.recordValue('m1', 1000);
    expect(sys.listAnomalies('m2').length).toBe(0);
    expect(sys.listAnomalies('m1').length).toBeGreaterThanOrEqual(1);
  });
});

describe('clearAnomalies', () => {
  it('clears anomalies for a metric', () => {
    const sys = createTestSystem();
    sys.registerMetric('m1');
    for (let i = 0; i < 10; i++) sys.recordValue('m1', 10 + (i % 2) * 2);
    sys.recordValue('m1', 1000);
    const r = sys.clearAnomalies('m1');
    expect(r.success).toBe(true);
    if (r.success) expect(r.cleared).toBeGreaterThanOrEqual(1);
    expect(sys.listAnomalies('m1').length).toBe(0);
  });

  it('returns metric-not-found for unknown metric', () => {
    const sys = createTestSystem();
    expect(sys.clearAnomalies('ghost')).toEqual({ success: false, error: 'metric-not-found' });
  });
});

// ─── getBaseline ─────────────────────────────────────────────────────────────

describe('getBaseline', () => {
  it('computes mean, stdDev, min, max from samples', () => {
    const sys = createTestSystem();
    sys.registerMetric('temp');
    for (const v of [10, 20, 30, 40, 50]) sys.recordValue('temp', v);
    const b = sys.getBaseline('temp');
    expect(b?.sampleCount).toBe(5);
    expect(b?.mean).toBe(30);
    expect(b?.min).toBe(10);
    expect(b?.max).toBe(50);
  });

  it('keeps rolling window of 20 samples', () => {
    const sys = createTestSystem();
    sys.registerMetric('q');
    for (let i = 0; i < 25; i++) sys.recordValue('q', i);
    expect(sys.getBaseline('q')?.sampleCount).toBe(20);
  });
});
