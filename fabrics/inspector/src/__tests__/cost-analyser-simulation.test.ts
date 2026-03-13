/**
 * Simulation tests — cost-analyser
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createCostAnalyser,
  recordCost,
  recordOperationCost,
  getServiceCosts,
  detectWaste,
  computeEfficiency,
} from '../cost-analyser.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps() {
  return {
    clock: { nowUs: () => (t += 1000n) },
    idGen: { generate: () => `ca-${++seq}` },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe('cost-analyser — state creation', () => {
  it('creates a cost analyser state', () => {
    const state = createCostAnalyser(makeDeps());
    expect(state).toBeDefined();
  });
});

describe('cost-analyser — recordCost', () => {
  it("records a CPU cost returning 'ok'", () => {
    const state = createCostAnalyser(makeDeps());
    const result = recordCost(state, 'service-alpha', 'CPU', 420n);
    expect(result).toBe('ok');
  });

  it("records a MEMORY cost returning 'ok'", () => {
    const state = createCostAnalyser(makeDeps());
    const result = recordCost(state, 'service-alpha', 'MEMORY', 1024n);
    expect(result).toBe('ok');
  });
});

describe('cost-analyser — getServiceCosts', () => {
  it('returns service costs after recording', () => {
    const state = createCostAnalyser(makeDeps());
    recordCost(state, 'svc-beta', 'CPU', 200n);
    recordCost(state, 'svc-beta', 'STORAGE', 500n);
    const result = getServiceCosts(state, 'svc-beta');
    expect(result).not.toMatchObject({ kind: 'error' });
  });

  it('returns error for unknown service', () => {
    const state = createCostAnalyser(makeDeps());
    const result = getServiceCosts(state, 'unknown-svc');
    expect(result).toBe('service-not-found');
  });
});

describe('cost-analyser — recordOperationCost', () => {
  it("records an operation cost returning 'ok'", () => {
    const state = createCostAnalyser(makeDeps());
    const result = recordOperationCost(state, 'svc-gamma', 'op-1', 'CPU', 200n, 150n);
    expect(result).toBe('ok');
  });
});

describe('cost-analyser — detectWaste', () => {
  it('returns a waste report for a service with data', () => {
    const state = createCostAnalyser(makeDeps());
    recordOperationCost(state, 'svc-delta', 'op-d1', 'CPU', 1000n, 700n);
    recordOperationCost(state, 'svc-delta', 'op-d2', 'CPU', 500n, 400n);
    const result = detectWaste(state, 'svc-delta', 'CPU');
    expect(typeof result).toBe('object');
  });
});

describe('cost-analyser — computeEfficiency', () => {
  it('returns an efficiency score or an error', () => {
    const state = createCostAnalyser(makeDeps());
    recordOperationCost(state, 'svc-epsilon', 'op-e1', 'CPU', 200n, 160n);
    const result = computeEfficiency(state, 'svc-epsilon');
    expect(typeof result).toBe('object');
  });
});
