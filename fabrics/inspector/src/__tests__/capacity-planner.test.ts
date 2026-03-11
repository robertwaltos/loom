import { describe, it, expect } from 'vitest';
import { createCapacityPlannerSystem } from '../capacity-planner.js';
import type { CapacityPlannerSystem, ResourceCapacity, CapacityPlan } from '../capacity-planner.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): { system: CapacityPlannerSystem; advanceTime: (us: bigint) => void } {
  let now = 1_000_000n;
  return {
    system: createCapacityPlannerSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'id-' + String(++idCounter) },
      logger: { info: () => undefined, warn: () => undefined },
    }),
    advanceTime(us: bigint) {
      now += us;
    },
  };
}

function asResource(r: ResourceCapacity | string): ResourceCapacity {
  if (typeof r === 'string') throw new Error('Expected ResourceCapacity, got: ' + r);
  return r;
}

function asPlan(r: CapacityPlan | string): CapacityPlan {
  if (typeof r === 'string') throw new Error('Expected CapacityPlan, got: ' + r);
  return r;
}

// ─── registerResource ────────────────────────────────────────────────────────

describe('registerResource', () => {
  it('registers resource with initial UNDERUTILIZED status', () => {
    const { system } = createTestSystem();
    const r = asResource(system.registerResource('cpu', 100, 200));
    expect(r.currentCapacity).toBe(100);
    expect(r.maxCapacity).toBe(200);
    expect(r.currentDemand).toBe(0);
    expect(r.utilizationPercent).toBe(0);
    expect(r.status).toBe('UNDERUTILIZED');
  });

  it('returns invalid-capacity for zero initialCapacity', () => {
    const { system } = createTestSystem();
    expect(system.registerResource('cpu', 0, 100)).toBe('invalid-capacity');
  });

  it('returns invalid-capacity when initialCapacity > maxCapacity', () => {
    const { system } = createTestSystem();
    expect(system.registerResource('cpu', 200, 100)).toBe('invalid-capacity');
  });

  it('returns invalid-capacity for zero maxCapacity', () => {
    const { system } = createTestSystem();
    expect(system.registerResource('cpu', 0, 0)).toBe('invalid-capacity');
  });

  it('returns already-registered for duplicate resource', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    expect(system.registerResource('cpu', 100, 200)).toBe('already-registered');
  });

  it('allows equal initialCapacity and maxCapacity', () => {
    const { system } = createTestSystem();
    const r = system.registerResource('cpu', 100, 100);
    expect(typeof r).not.toBe('string');
  });
});

// ─── updateDemand ─────────────────────────────────────────────────────────────

describe('updateDemand', () => {
  it('updates demand and derives UNDERUTILIZED status', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const result = system.updateDemand('cpu', 20);
    expect(result).toEqual({ success: true, status: 'UNDERUTILIZED' });
    expect(system.getResource('cpu')?.utilizationPercent).toBe(20);
  });

  it('derives OPTIMAL status at 40-80%', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const result = system.updateDemand('cpu', 60);
    expect(result).toEqual({ success: true, status: 'OPTIMAL' });
  });

  it('derives NEAR_LIMIT status at 80-95%', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const result = system.updateDemand('cpu', 85);
    expect(result).toEqual({ success: true, status: 'NEAR_LIMIT' });
  });

  it('derives OVERLOADED status at >= 95%', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const result = system.updateDemand('cpu', 100);
    expect(result).toEqual({ success: true, status: 'OVERLOADED' });
  });

  it('returns invalid-demand for negative demand', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    expect(system.updateDemand('cpu', -1)).toEqual({
      success: false,
      error: 'invalid-demand',
    });
  });

  it('returns resource-not-found for unknown resource', () => {
    const { system } = createTestSystem();
    expect(system.updateDemand('unknown', 10)).toEqual({
      success: false,
      error: 'resource-not-found',
    });
  });
});

// ─── updateCapacity ───────────────────────────────────────────────────────────

describe('updateCapacity', () => {
  it('updates capacity and recalculates utilization', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    system.updateDemand('cpu', 60);
    system.updateCapacity('cpu', 200);
    expect(system.getResource('cpu')?.utilizationPercent).toBe(30);
    expect(system.getResource('cpu')?.status).toBe('UNDERUTILIZED');
  });

  it('returns invalid-capacity for zero new capacity', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    expect(system.updateCapacity('cpu', 0)).toEqual({
      success: false,
      error: 'invalid-capacity',
    });
  });

  it('returns resource-not-found for unknown resource', () => {
    const { system } = createTestSystem();
    expect(system.updateCapacity('unknown', 100)).toEqual({
      success: false,
      error: 'resource-not-found',
    });
  });
});

// ─── createPlan / implementPlan ───────────────────────────────────────────────

describe('createPlan and implementPlan', () => {
  it('creates a plan for a registered resource', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const plan = asPlan(system.createPlan('cpu', 150, 'scaling up', 2_000_000n));
    expect(plan.resourceName).toBe('cpu');
    expect(plan.targetCapacity).toBe(150);
    expect(plan.implemented).toBe(false);
  });

  it('returns resource-not-found when resource does not exist', () => {
    const { system } = createTestSystem();
    expect(system.createPlan('unknown', 100, 'test', 2_000_000n)).toBe('resource-not-found');
  });

  it('implements plan and updates resource capacity', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const plan = asPlan(system.createPlan('cpu', 150, 'scale', 2_000_000n));
    const result = system.implementPlan(plan.planId);
    expect(result).toEqual({ success: true });
    expect(system.getResource('cpu')?.currentCapacity).toBe(150);
  });

  it('returns plan-not-found when plan already implemented', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const plan = asPlan(system.createPlan('cpu', 150, 'scale', 2_000_000n));
    system.implementPlan(plan.planId);
    expect(system.implementPlan(plan.planId)).toEqual({
      success: false,
      error: 'plan-not-found',
    });
  });

  it('returns plan-not-found for unknown planId', () => {
    const { system } = createTestSystem();
    expect(system.implementPlan('bad-id')).toEqual({
      success: false,
      error: 'plan-not-found',
    });
  });
});

// ─── forecastDemand ──────────────────────────────────────────────────────────

describe('forecastDemand', () => {
  it('returns 50% confidence with < 3 samples', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    system.updateDemand('cpu', 40);
    const forecast = system.forecastDemand('cpu', 60_000_000n);
    expect(typeof forecast).not.toBe('string');
    if (typeof forecast === 'string') return;
    expect(forecast.confidencePercent).toBe(50);
    expect(forecast.basedOnSamples).toBe(1);
  });

  it('returns 70% confidence with 3-9 samples', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    for (let i = 0; i < 5; i++) system.updateDemand('cpu', 40);
    const forecast = system.forecastDemand('cpu', 60_000_000n);
    if (typeof forecast === 'string') throw new Error('unexpected error');
    expect(forecast.confidencePercent).toBe(70);
  });

  it('returns 90% confidence with >= 10 samples', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    for (let i = 0; i < 10; i++) system.updateDemand('cpu', 40);
    const forecast = system.forecastDemand('cpu', 60_000_000n);
    if (typeof forecast === 'string') throw new Error('unexpected error');
    expect(forecast.confidencePercent).toBe(90);
  });

  it('predictedDemand equals last recorded demand', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    system.updateDemand('cpu', 55);
    const forecast = system.forecastDemand('cpu', 60_000_000n);
    if (typeof forecast === 'string') throw new Error('unexpected error');
    expect(forecast.predictedDemand).toBe(55);
  });

  it('returns resource-not-found for unknown resource', () => {
    const { system } = createTestSystem();
    expect(system.forecastDemand('unknown', 60_000_000n)).toBe('resource-not-found');
  });
});

// ─── listPlans ────────────────────────────────────────────────────────────────

describe('listPlans', () => {
  it('lists all plans when no filter', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    system.registerResource('mem', 50, 100);
    system.createPlan('cpu', 150, 'r1', 2_000_000n);
    system.createPlan('mem', 80, 'r2', 2_000_000n);
    expect(system.listPlans()).toHaveLength(2);
  });

  it('filters plans by resourceName', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    system.registerResource('mem', 50, 100);
    system.createPlan('cpu', 150, 'r1', 2_000_000n);
    system.createPlan('mem', 80, 'r2', 2_000_000n);
    expect(system.listPlans('cpu')).toHaveLength(1);
  });

  it('filters plans by implemented=false', () => {
    const { system } = createTestSystem();
    system.registerResource('cpu', 100, 200);
    const plan = asPlan(system.createPlan('cpu', 150, 'r1', 2_000_000n));
    system.implementPlan(plan.planId);
    system.createPlan('cpu', 180, 'r2', 3_000_000n);
    expect(system.listPlans(undefined, false)).toHaveLength(1);
  });
});
