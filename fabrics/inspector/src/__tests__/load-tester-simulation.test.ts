/**
 * Simulation tests — load-tester
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createLoadTester,
  createOperationMix,
  addOperation,
  defineScenario,
  runScenario,
  recordLatency,
  getReport,
  getScenario,
} from '../load-tester.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps() {
  return {
    clock: { nowUs: () => (t += 1000n) },
    idGen: { generate: () => `lt-${++seq}` },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe('load-tester — scenario definition', () => {
  it('creates empty operation mix', () => {
    const mix = createOperationMix();
    expect(mix.operations.length).toBe(0);
    expect(mix.totalWeight).toBe(0);
  });

  it('adds an operation to a mix', () => {
    const mix = addOperation(createOperationMix(), {
      type: 'READ',
      weight: 70,
      minLatencyUs: 100n,
      maxLatencyUs: 500n,
    });
    expect(mix.operations.length).toBe(1);
    expect(mix.totalWeight).toBe(70);
  });

  it('defines a scenario with valid parameters', () => {
    const state = createLoadTester(makeDeps());
    const mix = addOperation(createOperationMix(), {
      type: 'WRITE',
      weight: 100,
      minLatencyUs: 200n,
      maxLatencyUs: 1000n,
    });
    const result = defineScenario(state, 10, 1_000_000n, 5_000_000n, mix);
    expect(result).not.toBe('invalid-user-count');
    expect(result).not.toBe('invalid-duration');
    expect(result).not.toBe('invalid-operation-mix');
    expect(typeof (result as { scenarioId: string }).scenarioId).toBe('string');
  });

  it('returns error for zero user count', () => {
    const state = createLoadTester(makeDeps());
    const mix = addOperation(createOperationMix(), {
      type: 'READ',
      weight: 100,
      minLatencyUs: 100n,
      maxLatencyUs: 500n,
    });
    expect(defineScenario(state, 0, 0n, 5_000_000n, mix)).toBe(
      'invalid-user-count',
    );
  });

  it('returns error for empty operation mix', () => {
    const state = createLoadTester(makeDeps());
    expect(
      defineScenario(state, 5, 0n, 5_000_000n, createOperationMix()),
    ).toBe('invalid-operation-mix');
  });
});

describe('load-tester — scenario retrieval', () => {
  it('getScenario returns scenario-not-found for unknown id', () => {
    const state = createLoadTester(makeDeps());
    expect(getScenario(state, 'no-such')).toBe('scenario-not-found');
  });

  it('getScenario returns the defined scenario by id', () => {
    const state = createLoadTester(makeDeps());
    const mix = addOperation(createOperationMix(), {
      type: 'QUERY',
      weight: 50,
      minLatencyUs: 50n,
      maxLatencyUs: 300n,
    });
    const scenario = defineScenario(state, 5, 0n, 3_000_000n, mix) as {
      scenarioId: string;
    };
    const found = getScenario(state, scenario.scenarioId);
    expect(found).toMatchObject({ scenarioId: scenario.scenarioId });
  });
});

describe('load-tester — latency recording', () => {
  it('recordLatency returns ok for known scenario', () => {
    const state = createLoadTester(makeDeps());
    const mix = addOperation(createOperationMix(), {
      type: 'COMPUTE',
      weight: 100,
      minLatencyUs: 100n,
      maxLatencyUs: 900n,
    });
    const scenario = defineScenario(state, 3, 0n, 2_000_000n, mix) as {
      scenarioId: string;
    };
    runScenario(state, scenario.scenarioId);
    const res = recordLatency(state, scenario.scenarioId, 250n);
    expect(res).toBe('ok');
  });

  it('recordLatency returns scenario-not-found for unknown scenario', () => {
    const state = createLoadTester(makeDeps());
    expect(recordLatency(state, 'ghost', 999n)).toBe('scenario-not-found');
  });
});
