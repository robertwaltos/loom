/**
 * Simulation tests — diagnostic-reporter
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createDiagnosticReporter,
  type DiagnosticReporterDeps,
} from '../diagnostic-reporter.js';

let ts = 1_000_000_000;
let seq = 0;

function makeDeps(): DiagnosticReporterDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 100) },
    idGenerator: { next: () => `dr-${++seq}` },
    healthPort: {
      evaluate: vi.fn(() => ({
        overallStatus: 'HEALTHY',
        totalProbes: 2,
        healthyCount: 2,
        degradedCount: 0,
        unhealthyCount: 0,
        probes: [
          { name: 'db', fabric: 'core', status: 'HEALTHY' },
          { name: 'cache', fabric: 'core', status: 'HEALTHY' },
        ],
      })),
    },
    alertPort: {
      getFiringAlerts: vi.fn(() => []),
    },
    metricPort: {
      getValue: vi.fn((name: string) => (name === 'cpu' ? 42 : undefined)),
    },
  };
}

describe('diagnostic-reporter — report generation', () => {
  it('generates a report with no watched metrics', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    const report = reporter.generate([]);
    expect(typeof report).toBe('object');
    expect(reporter.reportCount()).toBe(1);
  });

  it('generates a report with watched metrics', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    const report = reporter.generate(['cpu', 'memory']);
    expect(typeof report).toBe('object');
  });

  it('getLastReport returns the most recent report', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    reporter.generate([]);
    const last = reporter.getLastReport();
    expect(last).toBeDefined();
  });

  it('getHistory returns array of reports', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    reporter.generate([]);
    reporter.generate(['cpu']);
    const history = reporter.getHistory(10);
    expect(history.length).toBe(2);
  });

  it('getLastReport returns undefined when no reports generated', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    expect(reporter.getLastReport()).toBeUndefined();
  });
});

describe('diagnostic-reporter — report count', () => {
  it('increments report count on each generate call', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    reporter.generate([]);
    reporter.generate([]);
    reporter.generate([]);
    expect(reporter.reportCount()).toBe(3);
  });
});
