import { describe, it, expect } from 'vitest';
import {
  createRegressionDetector,
  type RegressionDetector,
  type RegressionDetectorDeps,
  type MetricSnapshot,
  type RegressionThreshold,
} from '../regression-detector.js';

function createTestDeps(): RegressionDetectorDeps {
  let now = BigInt(1000000000000);
  let idCounter = 1;
  return {
    clock: {
      nowMicroseconds: () => now,
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
    idGenerator: {
      generate: () => {
        const id = 'alert-' + String(idCounter);
        idCounter += 1;
        return id;
      },
    },
    maxSnapshotsPerMetric: 100,
    maxAlertsPerMetric: 50,
  };
}

function createDefaultThreshold(): RegressionThreshold {
  return {
    minorPercent: 5,
    moderatePercent: 15,
    severePercent: 30,
  };
}

describe('RegressionDetector', () => {
  describe('Baseline Management', () => {
    it('sets a metric baseline', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const baseline = detector.getBaseline('latency-ms');
      expect(baseline).not.toBeNull();
      expect(baseline?.value).toBe(100);
      expect(baseline?.direction).toBe('LOWER_IS_BETTER');
    });

    it('returns null for non-existent baseline', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const baseline = detector.getBaseline('nonexistent');
      expect(baseline).toBeNull();
    });

    it('updates existing baseline', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'auto');
      const updated = detector.updateBaseline('throughput', 1200, 'manual');

      expect(updated).toBe(true);

      const baseline = detector.getBaseline('throughput');
      expect(baseline?.value).toBe(1200);
    });

    it('returns false when updating non-existent baseline', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const updated = detector.updateBaseline('nonexistent', 100, 'manual');
      expect(updated).toBe(false);
    });

    it('preserves direction when updating baseline', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      detector.setBaseline('error-rate', 0.01, 'LOWER_IS_BETTER', 'auto');
      detector.updateBaseline('error-rate', 0.005, 'manual');

      const baseline = detector.getBaseline('error-rate');
      expect(baseline?.direction).toBe('LOWER_IS_BETTER');
    });

    it('tracks baseline source', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      detector.setBaseline('metric', 100, 'LOWER_IS_BETTER', 'automated-capture');

      const baseline = detector.getBaseline('metric');
      expect(baseline?.source).toBe('automated-capture');
    });
  });

  describe('Snapshot Recording', () => {
    it('records a metric snapshot', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 105,
        capturedAt: BigInt(1000000000000),
        metadata: { host: 'server-1' },
      };

      detector.recordSnapshot(snapshot);

      expect(detector.getSnapshotCount('latency-ms')).toBe(1);
    });

    it('returns zero count for metric with no snapshots', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      expect(detector.getSnapshotCount('nonexistent')).toBe(0);
    });

    it('accumulates multiple snapshots', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const snapshot1: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 100,
        capturedAt: BigInt(1000000000000),
        metadata: {},
      };

      const snapshot2: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 105,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };

      detector.recordSnapshot(snapshot1);
      detector.recordSnapshot(snapshot2);

      expect(detector.getSnapshotCount('latency-ms')).toBe(2);
    });

    it('limits snapshot count per metric', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      for (let i = 0; i < 150; i += 1) {
        const snapshot: MetricSnapshot = {
          metricName: 'latency-ms',
          value: 100 + i,
          capturedAt: BigInt(1000000000000 + i * 1000),
          metadata: {},
        };
        detector.recordSnapshot(snapshot);
      }

      expect(detector.getSnapshotCount('latency-ms')).toBe(100);
    });

    it('clears snapshots for a metric', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const snapshot1: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 100,
        capturedAt: BigInt(1000000000000),
        metadata: {},
      };

      const snapshot2: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 105,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };

      detector.recordSnapshot(snapshot1);
      detector.recordSnapshot(snapshot2);

      const cleared = detector.clearSnapshots('latency-ms');
      expect(cleared).toBe(2);
      expect(detector.getSnapshotCount('latency-ms')).toBe(0);
    });

    it('returns zero when clearing non-existent metric', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const cleared = detector.clearSnapshots('nonexistent');
      expect(cleared).toBe(0);
    });
  });

  describe('Regression Detection - LOWER_IS_BETTER', () => {
    it('detects no regression when value improves', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 90,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(0);
    });

    it('detects minor regression', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(1);
      expect(regressions[0]?.severity).toBe('MINOR');
    });

    it('detects moderate regression', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 120,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(1);
      expect(regressions[0]?.severity).toBe('MODERATE');
    });

    it('detects severe regression', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 150,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(1);
      expect(regressions[0]?.severity).toBe('SEVERE');
    });

    it('computes correct regression percentage', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 120,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions[0]?.regressionPercent).toBe(20);
    });
  });

  describe('Regression Detection - HIGHER_IS_BETTER', () => {
    it('detects no regression when value improves', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'throughput',
        value: 1100,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(0);
    });

    it('detects minor regression', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'throughput',
        value: 940,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(1);
      expect(regressions[0]?.severity).toBe('MINOR');
    });

    it('detects severe regression', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'throughput',
        value: 650,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(1);
      expect(regressions[0]?.severity).toBe('SEVERE');
    });

    it('computes correct regression percentage for HIGHER_IS_BETTER', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'throughput',
        value: 800,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions[0]?.regressionPercent).toBe(20);
    });
  });

  describe('Regression History', () => {
    it('returns empty history for metric with no regressions', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const history = detector.getRegressionHistory('latency-ms', 10);
      expect(history.length).toBe(0);
    });

    it('records regressions in history', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);
      detector.detectRegressions(threshold);

      const history = detector.getRegressionHistory('latency-ms', 10);
      expect(history.length).toBe(1);
    });

    it('accumulates multiple regressions', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot1: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot1);
      detector.detectRegressions(threshold);

      const snapshot2: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 120,
        capturedAt: BigInt(1000002000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot2);
      detector.detectRegressions(threshold);

      const history = detector.getRegressionHistory('latency-ms', 10);
      expect(history.length).toBe(2);
    });

    it('respects limit parameter', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      for (let i = 0; i < 10; i += 1) {
        const snapshot: MetricSnapshot = {
          metricName: 'latency-ms',
          value: 110 + i,
          capturedAt: BigInt(1000001000000 + i * 1000000),
          metadata: {},
        };
        detector.recordSnapshot(snapshot);
        detector.detectRegressions(threshold);
      }

      const history = detector.getRegressionHistory('latency-ms', 5);
      expect(history.length).toBe(5);
    });

    it('returns all history when limit exceeds size', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);
      detector.detectRegressions(threshold);

      const history = detector.getRegressionHistory('latency-ms', 100);
      expect(history.length).toBe(1);
    });

    it('limits history size per metric', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      for (let i = 0; i < 60; i += 1) {
        const snapshot: MetricSnapshot = {
          metricName: 'latency-ms',
          value: 110 + i,
          capturedAt: BigInt(1000001000000 + i * 1000000),
          metadata: {},
        };
        detector.recordSnapshot(snapshot);
        detector.detectRegressions(threshold);
      }

      const history = detector.getRegressionHistory('latency-ms', 100);
      expect(history.length).toBe(50);
    });
  });

  describe('Alert Cleanup', () => {
    it('clears old alerts', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const oldSnapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(500000000000),
        metadata: {},
      };
      detector.recordSnapshot(oldSnapshot);
      detector.detectRegressions(threshold);

      const cleared = detector.clearOldAlerts(BigInt(600000000000));
      expect(cleared).toBe(1);

      const history = detector.getRegressionHistory('latency-ms', 10);
      expect(history.length).toBe(0);
    });

    it('preserves recent alerts', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const oldSnapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(500000000000),
        metadata: {},
      };
      detector.recordSnapshot(oldSnapshot);
      detector.detectRegressions(threshold);

      const recentSnapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 115,
        capturedAt: BigInt(900000000000),
        metadata: {},
      };
      detector.recordSnapshot(recentSnapshot);
      detector.detectRegressions(threshold);

      const cleared = detector.clearOldAlerts(BigInt(200000000000));
      expect(cleared).toBe(1);

      const history = detector.getRegressionHistory('latency-ms', 10);
      expect(history.length).toBe(1);
    });

    it('returns zero when no old alerts exist', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const cleared = detector.clearOldAlerts(BigInt(600000000000));
      expect(cleared).toBe(0);
    });
  });

  describe('Baseline Report', () => {
    it('generates baseline report', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const report = detector.getBaselineReport();

      expect(report).not.toBeNull();
      expect(report.generatedAt).toBeGreaterThan(0);
    });

    it('reports total baseline count', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');
      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'manual');

      const report = detector.getBaselineReport();
      expect(report.totalBaselines).toBe(2);
    });

    it('includes all baselines in report', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      detector.setBaseline('metric1', 100, 'LOWER_IS_BETTER', 'manual');
      detector.setBaseline('metric2', 200, 'HIGHER_IS_BETTER', 'auto');

      const report = detector.getBaselineReport();
      expect(report.baselinesByMetric.length).toBe(2);
    });

    it('reports oldest and newest baseline timestamps', () => {
      let currentTime = BigInt(1000000000000);
      let idCounter = 1;
      const deps: RegressionDetectorDeps = {
        clock: { nowMicroseconds: () => currentTime },
        logger: { info: () => {}, warn: () => {} },
        idGenerator: {
          generate: () => {
            const id = 'alert-' + String(idCounter);
            idCounter += 1;
            return id;
          },
        },
        maxSnapshotsPerMetric: 100,
        maxAlertsPerMetric: 50,
      };
      const detector = createRegressionDetector(deps);

      detector.setBaseline('metric1', 100, 'LOWER_IS_BETTER', 'manual');

      currentTime = BigInt(2000000000000);
      detector.setBaseline('metric2', 200, 'HIGHER_IS_BETTER', 'manual');

      const report = detector.getBaselineReport();
      expect(report.oldestBaseline).toBe(BigInt(1000000000000));
      expect(report.newestBaseline).toBe(BigInt(2000000000000));
    });

    it('reports null timestamps when no baselines exist', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const report = detector.getBaselineReport();
      expect(report.oldestBaseline).toBeNull();
      expect(report.newestBaseline).toBeNull();
    });
  });

  describe('Multiple Metrics', () => {
    it('detects regressions across multiple metrics', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');
      detector.setBaseline('throughput', 1000, 'HIGHER_IS_BETTER', 'manual');

      const snapshot1: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 120,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot1);

      const snapshot2: MetricSnapshot = {
        metricName: 'throughput',
        value: 800,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot2);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(2);
    });

    it('tracks snapshots independently per metric', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const snapshot1: MetricSnapshot = {
        metricName: 'metric1',
        value: 100,
        capturedAt: BigInt(1000000000000),
        metadata: {},
      };

      const snapshot2: MetricSnapshot = {
        metricName: 'metric2',
        value: 200,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };

      detector.recordSnapshot(snapshot1);
      detector.recordSnapshot(snapshot2);

      expect(detector.getSnapshotCount('metric1')).toBe(1);
      expect(detector.getSnapshotCount('metric2')).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles metric with no baseline', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      const snapshot: MetricSnapshot = {
        metricName: 'unbased-metric',
        value: 100,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(0);
    });

    it('handles metric with no snapshots', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('metric', 100, 'LOWER_IS_BETTER', 'manual');

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(0);
    });

    it('uses latest snapshot for regression detection', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot1: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };

      const snapshot2: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 90,
        capturedAt: BigInt(1000002000000),
        metadata: {},
      };

      detector.recordSnapshot(snapshot1);
      detector.recordSnapshot(snapshot2);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBe(0);
    });

    it('generates descriptive alert messages', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('api-latency', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'api-latency',
        value: 120,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions[0]?.message).toContain('api-latency');
      expect(regressions[0]?.message).toContain('20.0%');
    });

    it('assigns unique IDs to alerts', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot1: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 110,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot1);
      const reg1 = detector.detectRegressions(threshold);

      const snapshot2: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 115,
        capturedAt: BigInt(1000002000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot2);
      const reg2 = detector.detectRegressions(threshold);

      expect(reg1[0]?.id).not.toBe(reg2[0]?.id);
    });

    it('handles custom thresholds', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);

      const customThreshold: RegressionThreshold = {
        minorPercent: 10,
        moderatePercent: 25,
        severePercent: 50,
      };

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 115,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(customThreshold);
      expect(regressions.length).toBe(1);
      expect(regressions[0]?.severity).toBe('MINOR');
    });
  });

  describe('Additional Coverage', () => {
    it('handles baseline value of zero', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('error-count', 0, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'error-count',
        value: 5,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions.length).toBeGreaterThan(0);
    });

    it('validates regression percent calculation accuracy', () => {
      const deps = createTestDeps();
      const detector = createRegressionDetector(deps);
      const threshold = createDefaultThreshold();

      detector.setBaseline('latency-ms', 100, 'LOWER_IS_BETTER', 'manual');

      const snapshot: MetricSnapshot = {
        metricName: 'latency-ms',
        value: 125,
        capturedAt: BigInt(1000001000000),
        metadata: {},
      };
      detector.recordSnapshot(snapshot);

      const regressions = detector.detectRegressions(threshold);
      expect(regressions[0]?.regressionPercent).toBeCloseTo(25, 1);
    });
  });
});
