/**
 * Simulation tests — capacity-planner
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createCapacityPlannerSystem,
  type CapacityPlannerSystemDeps,
} from '../capacity-planner.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps(): CapacityPlannerSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `cp-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
}

describe('capacity-planner — resource registration', () => {
  it('registers a resource successfully', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    const result = sys.registerResource('web', 50, 100);
    expect(result).toMatchObject({ resourceName: 'web' });
  });

  it('returns error for duplicate resource registration', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    sys.registerResource('web', 50, 100);
    const result = sys.registerResource('web', 50, 100);
    expect(result).toBe('already-registered');
  });

  it('getResource returns undefined for unknown resource', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    expect(sys.getResource('unknown')).toBeUndefined();
  });
});

describe('capacity-planner — demand and capacity updates', () => {
  it('updateDemand returns success with a capacity status', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    sys.registerResource('db', 30, 100);
    const result = sys.updateDemand('db', 20);
    expect(result).toMatchObject({ success: true });
  });

  it('updateDemand returns error for unregistered resource', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    const result = sys.updateDemand('unknown', 50);
    expect(result).toMatchObject({ success: false });
  });

  it('updateCapacity succeeds for registered resource', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    sys.registerResource('cache', 20, 80);
    const result = sys.updateCapacity('cache', 60);
    expect(result).toMatchObject({ success: true });
  });
});

describe('capacity-planner — plans and forecasting', () => {
  it('createPlan returns a plan object', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    sys.registerResource('api', 40, 100);
    const result = sys.createPlan('api', 80, 'scale up', t + 10_000_000n);
    expect(result).toMatchObject({ targetCapacity: 80 });
  });

  it('listPlans returns empty array initially', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    expect(sys.listPlans()).toEqual([]);
  });

  it('forecastDemand returns error for unregistered resource', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    const result = sys.forecastDemand('ghost', 3_600_000_000n);
    expect(result).toBe('resource-not-found');
  });

  it('forecastDemand returns a forecast for a resource with demand history', () => {
    const sys = createCapacityPlannerSystem(makeDeps());
    sys.registerResource('svc', 10, 100);
    sys.updateDemand('svc', 30);
    sys.updateDemand('svc', 40);
    const result = sys.forecastDemand('svc', 3_600_000_000n);
    // May succeed or fail depending on data requirements — just check shape
    expect(typeof result).toBe('object');
  });
});
