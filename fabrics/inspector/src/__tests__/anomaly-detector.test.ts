import { describe, it, expect } from 'vitest';
import { createAnomalyDetector } from '../anomaly-detector.js';
import type { AnomalyDetectorDeps } from '../anomaly-detector.js';

function makeDeps(): AnomalyDetectorDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'anom-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('AnomalyDetector — metric registration', () => {
  it('registers a metric', () => {
    const detector = createAnomalyDetector(makeDeps());
    expect(detector.registerMetric({ metricName: 'cpu' })).toBe(true);
  });

  it('rejects duplicate metric', () => {
    const detector = createAnomalyDetector(makeDeps());
    detector.registerMetric({ metricName: 'cpu' });
    expect(detector.registerMetric({ metricName: 'cpu' })).toBe(false);
  });

  it('removes a metric', () => {
    const detector = createAnomalyDetector(makeDeps());
    detector.registerMetric({ metricName: 'cpu' });
    expect(detector.removeMetric('cpu')).toBe(true);
    expect(detector.removeMetric('cpu')).toBe(false);
  });
});

describe('AnomalyDetector — normal values', () => {
  it('returns null for unregistered metric', () => {
    const detector = createAnomalyDetector(makeDeps());
    expect(detector.recordValue('unknown', 42)).toBeNull();
  });

  it('returns null before minimum samples', () => {
    const detector = createAnomalyDetector(makeDeps(), { minSamples: 5 });
    detector.registerMetric({ metricName: 'cpu' });
    for (let i = 0; i < 4; i++) {
      expect(detector.recordValue('cpu', 50)).toBeNull();
    }
  });

  it('returns null for normal values', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 5,
      deviationThreshold: 3,
    });
    detector.registerMetric({ metricName: 'cpu' });
    for (let i = 0; i < 20; i++) {
      const result = detector.recordValue('cpu', 50 + (i % 3));
      expect(result).toBeNull();
    }
  });
});

describe('AnomalyDetector — anomaly detection', () => {
  it('detects an anomalous value', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 10,
      deviationThreshold: 2,
    });
    detector.registerMetric({ metricName: 'latency' });
    for (let i = 0; i < 20; i++) {
      detector.recordValue('latency', 100);
    }
    const result = detector.recordValue('latency', 500);
    expect(result).not.toBeNull();
    expect(result?.metricName).toBe('latency');
    expect(result?.value).toBe(500);
    expect(result?.deviations).toBeGreaterThan(2);
  });

  it('assigns severity based on deviations', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 10,
      deviationThreshold: 2,
      windowSize: 50,
    });
    detector.registerMetric({ metricName: 'm' });
    for (let i = 0; i < 30; i++) {
      detector.recordValue('m', 100 + (i % 2));
    }
    const anomaly = detector.recordValue('m', 1000);
    expect(anomaly).not.toBeNull();
    expect(['medium', 'high', 'critical']).toContain(anomaly?.severity);
  });

  it('returns null when stddev is zero', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 5,
      deviationThreshold: 2,
    });
    detector.registerMetric({ metricName: 'const' });
    for (let i = 0; i < 10; i++) {
      expect(detector.recordValue('const', 42)).toBeNull();
    }
  });
});

describe('AnomalyDetector — anomaly history', () => {
  it('stores anomalies per metric', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 10,
      deviationThreshold: 2,
    });
    detector.registerMetric({ metricName: 'x' });
    for (let i = 0; i < 20; i++) {
      detector.recordValue('x', 50);
    }
    detector.recordValue('x', 500);
    expect(detector.getAnomalies('x')).toHaveLength(1);
  });

  it('returns empty for unknown metric', () => {
    const detector = createAnomalyDetector(makeDeps());
    expect(detector.getAnomalies('nope')).toHaveLength(0);
  });

  it('returns recent anomalies across all metrics', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 10,
      deviationThreshold: 2,
    });
    detector.registerMetric({ metricName: 'a' });
    detector.registerMetric({ metricName: 'b' });
    for (let i = 0; i < 20; i++) {
      detector.recordValue('a', 50);
      detector.recordValue('b', 100);
    }
    detector.recordValue('a', 500);
    detector.recordValue('b', 1000);
    expect(detector.getRecentAnomalies(10).length).toBeGreaterThanOrEqual(2);
  });
});

describe('AnomalyDetector — stats', () => {
  it('tracks aggregate statistics', () => {
    const detector = createAnomalyDetector(makeDeps(), {
      minSamples: 5,
      deviationThreshold: 2,
    });
    detector.registerMetric({ metricName: 'cpu' });
    for (let i = 0; i < 10; i++) {
      detector.recordValue('cpu', 50);
    }
    detector.recordValue('cpu', 500);

    const stats = detector.getStats();
    expect(stats.trackedMetrics).toBe(1);
    expect(stats.totalSamples).toBe(11);
    expect(stats.totalAnomalies).toBeGreaterThanOrEqual(1);
  });

  it('starts with zero stats', () => {
    const detector = createAnomalyDetector(makeDeps());
    const stats = detector.getStats();
    expect(stats.trackedMetrics).toBe(0);
    expect(stats.totalSamples).toBe(0);
  });
});
