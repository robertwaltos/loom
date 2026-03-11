import { describe, it, expect } from 'vitest';
import { createDiagnosticReporter } from '../diagnostic-reporter.js';
import type {
  DiagnosticReporterDeps,
  DiagnosticHealthPort,
  DiagnosticAlertPort,
  DiagnosticMetricPort,
} from '../diagnostic-reporter.js';

function makeHealthPort(overrides?: {
  overallStatus?: string;
  probes?: ReadonlyArray<{ name: string; fabric: string; status: string }>;
  healthyCount?: number;
  degradedCount?: number;
  unhealthyCount?: number;
}): DiagnosticHealthPort {
  const probes = overrides?.probes ?? [
    { name: 'probe-1', fabric: 'loom-core', status: 'healthy' },
    { name: 'probe-2', fabric: 'selvage', status: 'healthy' },
  ];
  const healthyCount = overrides?.healthyCount ?? probes.length;
  return {
    evaluate: () => ({
      overallStatus: overrides?.overallStatus ?? 'healthy',
      totalProbes: probes.length,
      healthyCount,
      degradedCount: overrides?.degradedCount ?? 0,
      unhealthyCount: overrides?.unhealthyCount ?? 0,
      probes,
    }),
  };
}

function makeAlertPort(
  alerts?: ReadonlyArray<{
    name: string;
    severity: string;
    currentValue: number;
    threshold: number;
    firedAt: number | null;
  }>,
): DiagnosticAlertPort {
  return {
    getFiringAlerts: () => alerts ?? [],
  };
}

function makeMetricPort(values?: Record<string, number>): DiagnosticMetricPort {
  const map = new Map(Object.entries(values ?? {}));
  return { getValue: (name) => map.get(name) };
}

let idCounter = 0;
function makeDeps(overrides?: {
  healthPort?: DiagnosticHealthPort;
  alertPort?: DiagnosticAlertPort;
  metricPort?: DiagnosticMetricPort;
}): DiagnosticReporterDeps {
  let time = 1_000_000;
  return {
    healthPort: overrides?.healthPort ?? makeHealthPort(),
    alertPort: overrides?.alertPort ?? makeAlertPort(),
    metricPort: overrides?.metricPort ?? makeMetricPort(),
    idGenerator: { next: () => 'report-' + String(++idCounter) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('DiagnosticReporter — generation', () => {
  it('generates a nominal report when all healthy', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    const report = reporter.generate([]);
    expect(report.severity).toBe('nominal');
    expect(report.healthSummary.overallStatus).toBe('healthy');
    expect(report.activeAlerts.totalFiring).toBe(0);
    expect(report.recommendations).toHaveLength(0);
  });

  it('assigns a report id and timestamp', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    const report = reporter.generate([]);
    expect(report.reportId).toContain('report-');
    expect(report.generatedAt).toBeGreaterThan(0);
  });
});

describe('DiagnosticReporter — health summary', () => {
  it('groups probes by fabric', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        healthPort: makeHealthPort({
          probes: [
            { name: 'p1', fabric: 'loom-core', status: 'healthy' },
            { name: 'p2', fabric: 'loom-core', status: 'degraded' },
            { name: 'p3', fabric: 'selvage', status: 'healthy' },
          ],
          degradedCount: 1,
        }),
      }),
    );
    const report = reporter.generate([]);
    const fabrics = report.healthSummary.fabricStatuses;
    expect(fabrics).toHaveLength(2);

    const loomCore = fabrics.find((f) => f.fabric === 'loom-core');
    expect(loomCore?.probeCount).toBe(2);
    expect(loomCore?.status).toBe('degraded');
  });

  it('reports unhealthy probes', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        healthPort: makeHealthPort({
          overallStatus: 'unhealthy',
          probes: [{ name: 'p1', fabric: 'a', status: 'unhealthy' }],
          healthyCount: 0,
          unhealthyCount: 1,
        }),
      }),
    );
    const report = reporter.generate([]);
    expect(report.healthSummary.unhealthyCount).toBe(1);
  });
});

describe('DiagnosticReporter — alert summary', () => {
  it('includes firing alerts', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        alertPort: makeAlertPort([
          {
            name: 'cpu-high',
            severity: 'critical',
            currentValue: 95,
            threshold: 80,
            firedAt: 1000,
          },
          { name: 'mem-warn', severity: 'warning', currentValue: 70, threshold: 60, firedAt: 2000 },
        ]),
      }),
    );
    const report = reporter.generate([]);
    expect(report.activeAlerts.totalFiring).toBe(2);
    expect(report.activeAlerts.criticalCount).toBe(1);
    expect(report.activeAlerts.warningCount).toBe(1);
  });

  it('reports zero when no alerts firing', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    const report = reporter.generate([]);
    expect(report.activeAlerts.totalFiring).toBe(0);
    expect(report.activeAlerts.criticalCount).toBe(0);
  });
});

describe('DiagnosticReporter — key metrics', () => {
  it('includes watched metric values', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        metricPort: makeMetricPort({ 'tick.duration': 450, 'entity.count': 1200 }),
      }),
    );
    const report = reporter.generate(['tick.duration', 'entity.count']);
    expect(report.keyMetrics.entries).toHaveLength(2);
    expect(report.keyMetrics.entries[0]?.name).toBe('tick.duration');
    expect(report.keyMetrics.entries[0]?.value).toBe(450);
  });

  it('skips unknown metrics', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        metricPort: makeMetricPort({ known: 42 }),
      }),
    );
    const report = reporter.generate(['known', 'unknown']);
    expect(report.keyMetrics.entries).toHaveLength(1);
  });
});

describe('DiagnosticReporter — severity computation', () => {
  it('returns critical when probes unhealthy', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        healthPort: makeHealthPort({
          overallStatus: 'unhealthy',
          unhealthyCount: 1,
          probes: [{ name: 'p', fabric: 'a', status: 'unhealthy' }],
          healthyCount: 0,
        }),
      }),
    );
    expect(reporter.generate([]).severity).toBe('critical');
  });

  it('returns critical when critical alerts firing', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        alertPort: makeAlertPort([
          { name: 'a', severity: 'critical', currentValue: 1, threshold: 0, firedAt: null },
        ]),
      }),
    );
    expect(reporter.generate([]).severity).toBe('critical');
  });

  it('returns warning when degraded probes', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        healthPort: makeHealthPort({
          overallStatus: 'degraded',
          degradedCount: 1,
          probes: [{ name: 'p', fabric: 'a', status: 'degraded' }],
          healthyCount: 0,
        }),
      }),
    );
    expect(reporter.generate([]).severity).toBe('warning');
  });

  it('returns warning when warning alerts firing', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        alertPort: makeAlertPort([
          { name: 'a', severity: 'warning', currentValue: 1, threshold: 0, firedAt: null },
        ]),
      }),
    );
    expect(reporter.generate([]).severity).toBe('warning');
  });

  it('returns nominal when everything healthy', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    expect(reporter.generate([]).severity).toBe('nominal');
  });
});

describe('DiagnosticReporter — recommendations', () => {
  it('recommends investigation for unhealthy probes', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        healthPort: makeHealthPort({
          overallStatus: 'unhealthy',
          unhealthyCount: 2,
          probes: [
            { name: 'p1', fabric: 'a', status: 'unhealthy' },
            { name: 'p2', fabric: 'b', status: 'unhealthy' },
          ],
          healthyCount: 0,
        }),
      }),
    );
    const report = reporter.generate([]);
    const highPriority = report.recommendations.filter((r) => r.priority === 'high');
    expect(highPriority.length).toBeGreaterThan(0);
    expect(highPriority[0]?.category).toBe('health');
  });

  it('recommends review for warning alerts', () => {
    const reporter = createDiagnosticReporter(
      makeDeps({
        alertPort: makeAlertPort([
          { name: 'a', severity: 'warning', currentValue: 1, threshold: 0, firedAt: null },
        ]),
      }),
    );
    const report = reporter.generate([]);
    const alertRecs = report.recommendations.filter((r) => r.category === 'alerting');
    expect(alertRecs.length).toBeGreaterThan(0);
  });

  it('returns no recommendations when nominal', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    expect(reporter.generate([]).recommendations).toHaveLength(0);
  });
});

describe('DiagnosticReporter — history', () => {
  it('stores generated reports in history', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    reporter.generate([]);
    reporter.generate([]);
    expect(reporter.reportCount()).toBe(2);
  });

  it('returns last report', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    reporter.generate([]);
    const second = reporter.generate([]);
    expect(reporter.getLastReport()?.reportId).toBe(second.reportId);
  });

  it('returns undefined when no reports', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    expect(reporter.getLastReport()).toBeUndefined();
  });

  it('limits history to maxHistory', () => {
    const reporter = createDiagnosticReporter(makeDeps(), 3);
    for (let i = 0; i < 5; i++) {
      reporter.generate([]);
    }
    expect(reporter.reportCount()).toBe(3);
  });

  it('returns limited history', () => {
    const reporter = createDiagnosticReporter(makeDeps());
    for (let i = 0; i < 5; i++) {
      reporter.generate([]);
    }
    const recent = reporter.getHistory(2);
    expect(recent).toHaveLength(2);
  });
});
