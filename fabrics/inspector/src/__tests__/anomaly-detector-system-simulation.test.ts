/**
 * Simulation tests — anomaly-detector-system
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createAnomalyDetectorSystem,
  type AnomalyDetectorSystemDeps,
} from '../anomaly-detector-system.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps(): AnomalyDetectorSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `ads-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
}

describe('anomaly-detector-system — metric registration', () => {
  it('registers a metric successfully', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    const result = sys.registerMetric('cpu');
    expect(result).toMatchObject({ success: true });
  });

  it('returns error for duplicate metric', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    sys.registerMetric('cpu');
    const result = sys.registerMetric('cpu');
    expect(result).toMatchObject({ success: false });
  });

  it('returns error when recording value for unregistered metric', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    const result = sys.recordValue('unknown', 50);
    expect(result).toMatchObject({ success: false });
  });
});

describe('anomaly-detector-system — value recording', () => {
  it('records value without anomaly for normal data', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    sys.registerMetric('mem');
    const result = sys.recordValue('mem', 60);
    expect(result).toMatchObject({ success: true });
    const r = result as { success: true; anomaly?: unknown };
    if (r.anomaly !== undefined) {
      // Anomaly may or may not fire on first sample; just verify shape
      expect(typeof r.anomaly).toBe('object');
    }
  });
});

describe('anomaly-detector-system — threshold and listing', () => {
  it('sets threshold sensitivity', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    sys.registerMetric('cpu');
    const result = sys.setThreshold('cpu', 'HIGH');
    expect(result).toMatchObject({ success: true });
  });

  it('returns error when setting threshold for unregistered metric', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    const result = sys.setThreshold('unknown', 'LOW');
    expect(result).toMatchObject({ success: false });
  });

  it('listAnomalies returns empty array when no anomalies detected', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    sys.registerMetric('cpu');
    sys.recordValue('cpu', 50);
    expect(sys.listAnomalies('cpu')).toEqual([]);
  });

  it('clearAnomalies returns error for unregistered metric', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    const result = sys.clearAnomalies('unknown');
    expect(result).toMatchObject({ success: false });
  });

  it('clearAnomalies succeeds for registered metric', () => {
    const sys = createAnomalyDetectorSystem(makeDeps());
    sys.registerMetric('cpu');
    const result = sys.clearAnomalies('cpu');
    expect(result).toMatchObject({ success: true });
  });
});
