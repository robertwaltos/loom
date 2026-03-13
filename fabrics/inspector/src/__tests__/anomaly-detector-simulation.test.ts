/**
 * Simulation tests — anomaly-detector
 *
 * Tests the sliding-window anomaly detector: register metrics, feed samples,
 * and verify anomalies are detected when values deviate significantly.
 */

import { describe, it, expect } from 'vitest';
import { createAnomalyDetector, DEFAULT_ANOMALY_CONFIG } from '../anomaly-detector.js';

let t = 1_000_000;

function makeDeps() {
  return {
    clock: { nowMicroseconds: () => t++ },
    idGenerator: { next: () => `anm-${t}` },
  };
}

describe('anomaly-detector — registration', () => {
  it('registers a metric', () => {
    const det = createAnomalyDetector(makeDeps());
    expect(det.registerMetric({ metricName: 'cpu' })).toBe(true);
  });

  it('returns false on duplicate registration', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'cpu' });
    expect(det.registerMetric({ metricName: 'cpu' })).toBe(false);
  });

  it('removes a registered metric', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'cpu' });
    expect(det.removeMetric('cpu')).toBe(true);
  });
});

describe('anomaly-detector — anomaly detection', () => {
  it('returns null for normal values within window', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'load', config: { windowSize: 10, minSamples: 3, deviationThreshold: 2 } });
    // Feed stable values
    for (let i = 0; i < 5; i++) {
      expect(det.recordValue('load', 50)).toBeNull();
    }
  });

  it('returns null for unregistered metric', () => {
    const det = createAnomalyDetector(makeDeps());
    expect(det.recordValue('unknown', 10)).toBeNull();
  });

  it('detects a spike anomaly after establishing baseline', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'cpu', config: { windowSize: 10, minSamples: 3, deviationThreshold: 2 } });
    // Establish stable baseline
    for (let i = 0; i < 8; i++) det.recordValue('cpu', 50);
    // Now inject a massive spike
    const anomaly = det.recordValue('cpu', 50000);
    expect(anomaly).not.toBeNull();
  });

  it('getAnomalies returns all anomalies for a metric', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'cpu', config: { windowSize: 10, minSamples: 3, deviationThreshold: 2 } });
    for (let i = 0; i < 8; i++) det.recordValue('cpu', 50);
    det.recordValue('cpu', 50000);
    expect(det.getAnomalies('cpu').length).toBeGreaterThanOrEqual(1);
  });

  it('getRecentAnomalies respects limit', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'x', config: { windowSize: 20, minSamples: 3, deviationThreshold: 1 } });
    for (let i = 0; i < 10; i++) det.recordValue('x', 50);
    for (let i = 0; i < 5; i++) det.recordValue('x', 50000);
    expect(det.getRecentAnomalies(2).length).toBeLessThanOrEqual(2);
  });
});

describe('anomaly-detector — stats', () => {
  it('reports registered metric count', () => {
    const det = createAnomalyDetector(makeDeps());
    det.registerMetric({ metricName: 'cpu' });
    det.registerMetric({ metricName: 'mem' });
    const stats = det.getStats();
    expect(stats.trackedMetrics).toBe(2);
  });
});

describe('DEFAULT_ANOMALY_CONFIG', () => {
  it('exports sensible defaults', () => {
    expect(DEFAULT_ANOMALY_CONFIG.windowSize).toBeGreaterThan(0);
    expect(DEFAULT_ANOMALY_CONFIG.deviationThreshold).toBeGreaterThan(0);
    expect(DEFAULT_ANOMALY_CONFIG.minSamples).toBeGreaterThan(0);
  });
});
