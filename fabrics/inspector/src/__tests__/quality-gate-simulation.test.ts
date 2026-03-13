/**
 * Simulation tests — quality-gate
 */

import { describe, it, expect } from 'vitest';
import {
  createQualityGateEngine,
  type QualityGateDeps,
  type GateDefinition,
} from '../quality-gate.js';

const metrics: Map<string, number> = new Map([
  ['test.pass_rate', 98],
  ['coverage.percent', 85],
  ['error.rate', 0.5],
]);

let ts = 1_000_000;

function makeDeps(): QualityGateDeps {
  return {
    clock: { nowMilliseconds: () => (ts += 100) },
    getMetricValue: (name: string) => metrics.get(name),
  };
}

const COVERAGE_GATE: GateDefinition = {
  gateId: 'coverage-gate',
  name: 'Coverage Gate',
  description: 'Ensure code coverage is above 80%',
  conditions: [
    {
      conditionId: 'cov-1',
      kind: 'coverage_minimum',
      metricName: 'coverage.percent',
      operator: 'gte',
      target: 80,
    },
  ],
};

const ERROR_GATE: GateDefinition = {
  gateId: 'error-gate',
  name: 'Error Rate Gate',
  description: 'Ensure error rate is below 1%',
  conditions: [
    {
      conditionId: 'err-1',
      kind: 'metric_threshold',
      metricName: 'error.rate',
      operator: 'lte',
      target: 1,
    },
  ],
};

describe('quality-gate — gate definitions', () => {
  it('starts with zero gates', () => {
    const eng = createQualityGateEngine(makeDeps());
    expect(eng.gateCount()).toBe(0);
  });

  it('defineGate adds a gate', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    expect(eng.gateCount()).toBe(1);
  });

  it('listGates returns gate ids', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    expect(eng.listGates()).toContain('coverage-gate');
  });

  it('getGate returns the gate definition', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    const gate = eng.getGate('coverage-gate');
    expect(gate?.name).toBe('Coverage Gate');
  });

  it('removeGate returns true and decrements count', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    expect(eng.removeGate('coverage-gate')).toBe(true);
    expect(eng.gateCount()).toBe(0);
  });

  it('removeGate returns false for unknown gate', () => {
    const eng = createQualityGateEngine(makeDeps());
    expect(eng.removeGate('ghost')).toBe(false);
  });
});

describe('quality-gate — evaluation', () => {
  it('evaluateGate returns pass when coverage meets threshold', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    const result = eng.evaluateGate('coverage-gate');
    expect(result?.verdict).toBe('pass');
  });

  it('evaluateGate returns fail when coverage is below threshold', () => {
    const lowCovDeps: QualityGateDeps = {
      clock: { nowMilliseconds: () => ts++ },
      getMetricValue: () => 60,
    };
    const eng = createQualityGateEngine(lowCovDeps);
    eng.defineGate(COVERAGE_GATE);
    const result = eng.evaluateGate('coverage-gate');
    expect(result?.verdict).toBe('fail');
  });

  it('evaluateGate returns undefined for unknown gate', () => {
    const eng = createQualityGateEngine(makeDeps());
    expect(eng.evaluateGate('ghost')).toBeUndefined();
  });

  it('evaluateAll returns an array of evaluations', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    eng.defineGate(ERROR_GATE);
    const results = eng.evaluateAll();
    expect(results.length).toBe(2);
  });

  it('getHistory records evaluations', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    eng.evaluateGate('coverage-gate');
    eng.evaluateGate('coverage-gate');
    expect(eng.getHistory('coverage-gate', 10).length).toBe(2);
  });

  it('generateReport returns a gate report', () => {
    const eng = createQualityGateEngine(makeDeps());
    eng.defineGate(COVERAGE_GATE);
    const report = eng.generateReport();
    expect(typeof report.totalGates).toBe('number');
  });
});
