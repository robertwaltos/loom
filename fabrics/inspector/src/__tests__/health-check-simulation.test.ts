/**
 * Simulation tests — health-check
 */

import { describe, it, expect } from 'vitest';
import {
  createHealthCheckEngine,
  type HealthCheckDeps,
  type ProbeRegistration,
} from '../health-check.js';

let ts = 1_000_000_000;

function makeDeps(): HealthCheckDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 100) },
    maxHistory: 50,
  };
}

const healthyProbe: ProbeRegistration = {
  name: 'db-probe',
  fabric: 'core',
  evaluate: () => ({ status: 'healthy', message: 'ok', durationMicroseconds: 50 }),
};

const degradedProbe: ProbeRegistration = {
  name: 'cache-probe',
  fabric: 'core',
  evaluate: () => ({
    status: 'degraded',
    message: 'slow response',
    durationMicroseconds: 800,
  }),
};

describe('health-check — probe registration', () => {
  it('starts with zero probes', () => {
    const eng = createHealthCheckEngine(makeDeps());
    expect(eng.probeCount()).toBe(0);
  });

  it('registers a probe and increments count', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    expect(eng.probeCount()).toBe(1);
  });

  it('removeProbe returns true for a registered probe', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    expect(eng.removeProbe('db-probe')).toBe(true);
    expect(eng.probeCount()).toBe(0);
  });

  it('removeProbe returns false for an unknown probe', () => {
    const eng = createHealthCheckEngine(makeDeps());
    expect(eng.removeProbe('ghost')).toBe(false);
  });

  it('getProbeNames returns registered probe names', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    expect(eng.getProbeNames()).toContain('db-probe');
  });

  it('getFabrics returns fabric names', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    expect(eng.getFabrics()).toContain('core');
  });
});

describe('health-check — evaluation', () => {
  it('evaluate returns HEALTHY when all probes pass', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    const report = eng.evaluate();
    expect(report.overallStatus).toBe('healthy');
    expect(report.healthyCount).toBe(1);
  });

  it('evaluate reflects degraded probe', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(degradedProbe);
    const report = eng.evaluate();
    expect(report.degradedCount).toBe(1);
  });

  it('evaluateFabric returns report scoped to fabric', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    const report = eng.evaluateFabric('core');
    expect(report.totalProbes).toBe(1);
  });

  it('getHistory stores evaluation results', () => {
    const eng = createHealthCheckEngine(makeDeps());
    eng.registerProbe(healthyProbe);
    eng.evaluate();
    eng.evaluate();
    expect(eng.getHistory(10).length).toBe(2);
  });
});
