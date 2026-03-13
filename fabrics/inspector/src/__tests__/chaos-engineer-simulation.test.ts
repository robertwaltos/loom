/**
 * Simulation tests — chaos-engineer
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createChaosEngineer,
  type ChaosEngineerDeps,
  type ChaosScenario,
} from '../chaos-engineer.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps(): ChaosEngineerDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    logger: { info: vi.fn(), warn: vi.fn() },
    idGenerator: { generate: () => `exp-${++seq}` },
    maxObservationsPerExperiment: 100,
  };
}

const SCENARIO: ChaosScenario = {
  name: 'latency-spike',
  description: 'Inject artificial latency into the weave service',
  faultType: 'LATENCY',
  target: { fabric: 'inspector', service: 'api', operation: 'GET /health' },
  parameters: { intensity: 0.5, frequency: 0.1, metadata: {} },
  durationMicroseconds: 5_000_000n,
};

describe('chaos-engineer — scenario management', () => {
  it('returns scenario count of 0 initially', () => {
    const eng = createChaosEngineer(makeDeps());
    expect(eng.getScenarioCount()).toBe(0);
  });

  it('defines a scenario and increments count', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    expect(eng.getScenarioCount()).toBe(1);
  });

  it('removes a scenario', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    const removed = eng.removeScenario('latency-spike');
    expect(removed).toBe(true);
    expect(eng.getScenarioCount()).toBe(0);
  });

  it('removeScenario returns false for unknown scenario', () => {
    const eng = createChaosEngineer(makeDeps());
    expect(eng.removeScenario('ghost')).toBe(false);
  });
});

describe('chaos-engineer — experiment lifecycle', () => {
  it('starts an experiment and returns an id', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    const id = eng.startExperiment('latency-spike');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getExperiment returns the running experiment', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    const id = eng.startExperiment('latency-spike');
    const exp = eng.getExperiment(id);
    expect(exp).not.toBeNull();
    expect(exp?.status).toBe('RUNNING');
  });

  it('getActiveExperiments includes running experiment', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    const id = eng.startExperiment('latency-spike');
    const active = eng.getActiveExperiments();
    expect(active.some((e) => e.id === id)).toBe(true);
  });

  it('stopExperiment returns true and marks experiment stopped', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    const id = eng.startExperiment('latency-spike');
    const stopped = eng.stopExperiment(id);
    expect(stopped).toBe(true);
  });

  it('injectFault returns true for a running experiment', () => {
    const eng = createChaosEngineer(makeDeps());
    eng.defineScenario(SCENARIO);
    const id = eng.startExperiment('latency-spike');
    const injected = eng.injectFault(id);
    expect(injected).toBe(true);
  });

  it('getExperiment returns null for unknown experiment id', () => {
    const eng = createChaosEngineer(makeDeps());
    expect(eng.getExperiment('no-such-id')).toBeNull();
  });
});

describe('chaos-engineer — resilience report', () => {
  it('generates a resilience report with zero experiments initially', () => {
    const eng = createChaosEngineer(makeDeps());
    const report = eng.getResilienceReport();
    expect(typeof report).toBe('object');
  });
});
