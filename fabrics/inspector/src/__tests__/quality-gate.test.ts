import { describe, it, expect } from 'vitest';
import { createQualityGateEngine } from '../quality-gate.js';
import type {
  QualityGateEngine,
  QualityGateDeps,
  GateDefinition,
  CompositeGateDefinition,
} from '../quality-gate.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createTestEngine(metrics: Record<string, number> = {}): {
  engine: QualityGateEngine;
  setMetric: (name: string, val: number) => void;
} {
  const deps: QualityGateDeps = {
    clock: { nowMilliseconds: () => 1000 },
    getMetricValue: (name) => metrics[name],
  };
  return {
    engine: createQualityGateEngine(deps),
    setMetric: (name: string, val: number) => {
      metrics[name] = val;
    },
  };
}

function coverageGate(overrides?: Partial<GateDefinition>): GateDefinition {
  return {
    gateId: 'coverage',
    name: 'Code Coverage',
    description: 'Code coverage must be at least 80%',
    conditions: [
      {
        conditionId: 'cov-min',
        kind: 'coverage_minimum',
        metricName: 'coverage_percent',
        operator: 'gte',
        target: 80,
        warnThreshold: 70,
      },
    ],
    ...overrides,
  };
}

function testPassGate(): GateDefinition {
  return {
    gateId: 'tests',
    name: 'Test Pass Rate',
    description: 'Tests must pass at 100%',
    conditions: [
      {
        conditionId: 'test-rate',
        kind: 'test_pass_rate',
        metricName: 'test_pass_rate',
        operator: 'eq',
        target: 100,
      },
    ],
  };
}

// ─── Gate Definition ────────────────────────────────────────────────

describe('QualityGateEngine definition', () => {
  it('starts with zero gates', () => {
    const { engine } = createTestEngine();
    expect(engine.gateCount()).toBe(0);
  });

  it('defines a gate', () => {
    const { engine } = createTestEngine();
    engine.defineGate(coverageGate());
    expect(engine.gateCount()).toBe(1);
  });

  it('retrieves a defined gate', () => {
    const { engine } = createTestEngine();
    engine.defineGate(coverageGate());
    const gate = engine.getGate('coverage');
    expect(gate?.name).toBe('Code Coverage');
  });

  it('removes a gate', () => {
    const { engine } = createTestEngine();
    engine.defineGate(coverageGate());
    expect(engine.removeGate('coverage')).toBe(true);
    expect(engine.gateCount()).toBe(0);
  });

  it('returns false removing nonexistent gate', () => {
    const { engine } = createTestEngine();
    expect(engine.removeGate('nope')).toBe(false);
  });

  it('lists gate ids', () => {
    const { engine } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    const ids = engine.listGates();
    expect(ids).toHaveLength(2);
  });
});

// ─── Evaluation ─────────────────────────────────────────────────────

describe('QualityGateEngine evaluation', () => {
  it('passes when metric meets threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 85);
    const result = engine.evaluateGate('coverage');
    expect(result?.verdict).toBe('pass');
  });

  it('fails when metric does not meet threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 60);
    const result = engine.evaluateGate('coverage');
    expect(result?.verdict).toBe('fail');
  });

  it('warns when metric meets warn threshold but not target', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 75);
    const result = engine.evaluateGate('coverage');
    expect(result?.verdict).toBe('warn');
  });

  it('returns undefined for nonexistent gate', () => {
    const { engine } = createTestEngine();
    expect(engine.evaluateGate('nonexistent')).toBeUndefined();
  });

  it('evaluates equality condition', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(testPassGate());
    setMetric('test_pass_rate', 100);
    expect(engine.evaluateGate('tests')?.verdict).toBe('pass');
  });

  it('fails equality when not exact match', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(testPassGate());
    setMetric('test_pass_rate', 99);
    expect(engine.evaluateGate('tests')?.verdict).toBe('fail');
  });
});

// ─── Multi-condition Gates ──────────────────────────────────────────

describe('QualityGateEngine multi-condition', () => {
  it('fails if any condition fails', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate({
      gateId: 'multi',
      name: 'Multi',
      description: 'Multiple conditions',
      conditions: [
        {
          conditionId: 'a',
          kind: 'metric_threshold',
          metricName: 'x',
          operator: 'gte',
          target: 50,
        },
        {
          conditionId: 'b',
          kind: 'metric_threshold',
          metricName: 'y',
          operator: 'gte',
          target: 50,
        },
      ],
    });
    setMetric('x', 60);
    setMetric('y', 30);
    expect(engine.evaluateGate('multi')?.verdict).toBe('fail');
  });

  it('passes if all conditions pass', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate({
      gateId: 'multi',
      name: 'Multi',
      description: 'Multiple conditions',
      conditions: [
        {
          conditionId: 'a',
          kind: 'metric_threshold',
          metricName: 'x',
          operator: 'gte',
          target: 50,
        },
        {
          conditionId: 'b',
          kind: 'metric_threshold',
          metricName: 'y',
          operator: 'gte',
          target: 50,
        },
      ],
    });
    setMetric('x', 60);
    setMetric('y', 60);
    expect(engine.evaluateGate('multi')?.verdict).toBe('pass');
  });

  it('returns condition results with details', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 85);
    const result = engine.evaluateGate('coverage');
    expect(result?.conditionResults).toHaveLength(1);
    expect(result?.conditionResults[0]?.actualValue).toBe(85);
  });
});

// ─── Composite Gates ────────────────────────────────────────────────

describe('QualityGateEngine composite gates', () => {
  it('AND composite fails if any sub-gate fails', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    const composite: CompositeGateDefinition = {
      gateId: 'all',
      name: 'All Gates',
      description: 'All must pass',
      operator: 'and',
      subGateIds: ['coverage', 'tests'],
    };
    engine.defineCompositeGate(composite);
    setMetric('coverage_percent', 85);
    setMetric('test_pass_rate', 50);
    expect(engine.evaluateGate('all')?.verdict).toBe('fail');
  });

  it('AND composite passes if all sub-gates pass', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    engine.defineCompositeGate({
      gateId: 'all',
      name: 'All Gates',
      description: 'All must pass',
      operator: 'and',
      subGateIds: ['coverage', 'tests'],
    });
    setMetric('coverage_percent', 85);
    setMetric('test_pass_rate', 100);
    expect(engine.evaluateGate('all')?.verdict).toBe('pass');
  });

  it('OR composite passes if any sub-gate passes', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    engine.defineCompositeGate({
      gateId: 'any',
      name: 'Any Gate',
      description: 'At least one must pass',
      operator: 'or',
      subGateIds: ['coverage', 'tests'],
    });
    setMetric('coverage_percent', 85);
    setMetric('test_pass_rate', 50);
    expect(engine.evaluateGate('any')?.verdict).toBe('pass');
  });
});

// ─── History ────────────────────────────────────────────────────────

describe('QualityGateEngine history', () => {
  it('records evaluation history', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 85);
    engine.evaluateGate('coverage');
    const history = engine.getHistory('coverage', 10);
    expect(history).toHaveLength(1);
    expect(history[0]?.verdict).toBe('pass');
  });

  it('tracks multiple evaluations in history', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 85);
    engine.evaluateGate('coverage');
    setMetric('coverage_percent', 50);
    engine.evaluateGate('coverage');
    const history = engine.getHistory('coverage', 10);
    expect(history).toHaveLength(2);
  });
});

// ─── Report ─────────────────────────────────────────────────────────

describe('QualityGateEngine report', () => {
  it('generates report with all gates', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    setMetric('coverage_percent', 85);
    setMetric('test_pass_rate', 100);
    const report = engine.generateReport();
    expect(report.totalGates).toBe(2);
    expect(report.passed).toBe(2);
    expect(report.failed).toBe(0);
  });

  it('reports counts correctly with failures', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    setMetric('coverage_percent', 50);
    setMetric('test_pass_rate', 100);
    const report = engine.generateReport();
    expect(report.failed).toBe(1);
    expect(report.passed).toBe(1);
  });

  it('includes evaluations in report', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    setMetric('coverage_percent', 85);
    const report = engine.generateReport();
    expect(report.evaluations).toHaveLength(1);
  });
});

// ─── Evaluate All ───────────────────────────────────────────────────

describe('QualityGateEngine evaluateAll', () => {
  it('evaluates all gates at once', () => {
    const { engine, setMetric } = createTestEngine();
    engine.defineGate(coverageGate());
    engine.defineGate(testPassGate());
    setMetric('coverage_percent', 85);
    setMetric('test_pass_rate', 100);
    const results = engine.evaluateAll();
    expect(results).toHaveLength(2);
  });
});
