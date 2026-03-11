/**
 * Capacity Planner — Resource capacity planning with demand forecasting.
 *
 * Tracks resource utilization, generates scaling plans, and forecasts future
 * demand based on historical sample counts.
 *
 * "Know the ceiling before the ceiling knows you."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface CapacityClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface CapacityIdGenPort {
  readonly next: () => string;
}

interface CapacityLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResourceName = string;
export type PlanId = string;

export type PlannerError =
  | 'resource-not-found'
  | 'plan-not-found'
  | 'invalid-capacity'
  | 'invalid-demand'
  | 'already-registered';

export type CapacityStatus = 'UNDERUTILIZED' | 'OPTIMAL' | 'NEAR_LIMIT' | 'OVERLOADED';

export interface ResourceCapacity {
  readonly resourceName: ResourceName;
  currentCapacity: number;
  readonly maxCapacity: number;
  currentDemand: number;
  utilizationPercent: number;
  status: CapacityStatus;
  lastUpdated: bigint;
}

export interface CapacityPlan {
  readonly planId: PlanId;
  readonly resourceName: ResourceName;
  readonly targetCapacity: number;
  readonly reason: string;
  readonly createdAt: bigint;
  readonly scheduledAt: bigint;
  implemented: boolean;
}

export interface DemandForecast {
  readonly resourceName: ResourceName;
  readonly forecastPeriodUs: bigint;
  readonly predictedDemand: number;
  readonly confidencePercent: number;
  readonly basedOnSamples: number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface CapacityPlannerSystem {
  registerResource(
    resourceName: ResourceName,
    initialCapacity: number,
    maxCapacity: number,
  ): ResourceCapacity | PlannerError;
  updateDemand(
    resourceName: ResourceName,
    currentDemand: number,
  ): { success: true; status: CapacityStatus } | { success: false; error: PlannerError };
  updateCapacity(
    resourceName: ResourceName,
    newCapacity: number,
  ): { success: true } | { success: false; error: PlannerError };
  createPlan(
    resourceName: ResourceName,
    targetCapacity: number,
    reason: string,
    scheduledAt: bigint,
  ): CapacityPlan | PlannerError;
  implementPlan(planId: PlanId): { success: true } | { success: false; error: PlannerError };
  forecastDemand(
    resourceName: ResourceName,
    forecastPeriodUs: bigint,
  ): DemandForecast | PlannerError;
  getResource(resourceName: ResourceName): ResourceCapacity | undefined;
  listPlans(resourceName?: string, implemented?: boolean): ReadonlyArray<CapacityPlan>;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface CapacityPlannerDeps {
  readonly clock: CapacityClockPort;
  readonly idGen: CapacityIdGenPort;
  readonly logger: CapacityLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface PlannerState {
  readonly resources: Map<ResourceName, ResourceCapacity>;
  readonly plans: Map<PlanId, CapacityPlan>;
  readonly demandSampleCounts: Map<ResourceName, number>;
  readonly deps: CapacityPlannerDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createCapacityPlannerSystem(deps: CapacityPlannerDeps): CapacityPlannerSystem {
  const state: PlannerState = {
    resources: new Map(),
    plans: new Map(),
    demandSampleCounts: new Map(),
    deps,
  };

  return {
    registerResource: (resourceName, initialCapacity, maxCapacity) =>
      registerResourceImpl(state, resourceName, initialCapacity, maxCapacity),
    updateDemand: (resourceName, currentDemand) =>
      updateDemandImpl(state, resourceName, currentDemand),
    updateCapacity: (resourceName, newCapacity) =>
      updateCapacityImpl(state, resourceName, newCapacity),
    createPlan: (resourceName, targetCapacity, reason, scheduledAt) =>
      createPlanImpl(state, resourceName, targetCapacity, reason, scheduledAt),
    implementPlan: (planId) => implementPlanImpl(state, planId),
    forecastDemand: (resourceName, forecastPeriodUs) =>
      forecastDemandImpl(state, resourceName, forecastPeriodUs),
    getResource: (resourceName) => state.resources.get(resourceName),
    listPlans: (resourceName, implemented) => listPlansImpl(state, resourceName, implemented),
  };
}

// ─── Register Resource ────────────────────────────────────────────────────────

function registerResourceImpl(
  state: PlannerState,
  resourceName: ResourceName,
  initialCapacity: number,
  maxCapacity: number,
): ResourceCapacity | PlannerError {
  if (initialCapacity <= 0 || maxCapacity <= 0 || initialCapacity > maxCapacity) {
    return 'invalid-capacity';
  }
  if (state.resources.has(resourceName)) return 'already-registered';

  const resource: ResourceCapacity = {
    resourceName,
    currentCapacity: initialCapacity,
    maxCapacity,
    currentDemand: 0,
    utilizationPercent: 0,
    status: 'UNDERUTILIZED',
    lastUpdated: state.deps.clock.nowMicroseconds(),
  };

  state.resources.set(resourceName, resource);
  state.deps.logger.info('resource-registered', { resourceName, initialCapacity, maxCapacity });
  return resource;
}

// ─── Update Demand ────────────────────────────────────────────────────────────

function updateDemandImpl(
  state: PlannerState,
  resourceName: ResourceName,
  currentDemand: number,
): { success: true; status: CapacityStatus } | { success: false; error: PlannerError } {
  if (currentDemand < 0) return { success: false, error: 'invalid-demand' };

  const resource = state.resources.get(resourceName);
  if (resource === undefined) return { success: false, error: 'resource-not-found' };

  resource.currentDemand = currentDemand;
  resource.utilizationPercent =
    resource.currentCapacity > 0 ? (currentDemand / resource.currentCapacity) * 100 : 0;
  resource.status = deriveStatus(resource.utilizationPercent);
  resource.lastUpdated = state.deps.clock.nowMicroseconds();

  const prev = state.demandSampleCounts.get(resourceName) ?? 0;
  state.demandSampleCounts.set(resourceName, prev + 1);

  if (resource.status === 'OVERLOADED') {
    state.deps.logger.warn('resource-overloaded', {
      resourceName,
      utilizationPercent: resource.utilizationPercent,
    });
  }

  return { success: true, status: resource.status };
}

// ─── Update Capacity ──────────────────────────────────────────────────────────

function updateCapacityImpl(
  state: PlannerState,
  resourceName: ResourceName,
  newCapacity: number,
): { success: true } | { success: false; error: PlannerError } {
  if (newCapacity <= 0) return { success: false, error: 'invalid-capacity' };

  const resource = state.resources.get(resourceName);
  if (resource === undefined) return { success: false, error: 'resource-not-found' };

  resource.currentCapacity = newCapacity;
  resource.utilizationPercent = newCapacity > 0 ? (resource.currentDemand / newCapacity) * 100 : 0;
  resource.status = deriveStatus(resource.utilizationPercent);
  resource.lastUpdated = state.deps.clock.nowMicroseconds();

  state.deps.logger.info('capacity-updated', { resourceName, newCapacity });
  return { success: true };
}

// ─── Create Plan ──────────────────────────────────────────────────────────────

function createPlanImpl(
  state: PlannerState,
  resourceName: ResourceName,
  targetCapacity: number,
  reason: string,
  scheduledAt: bigint,
): CapacityPlan | PlannerError {
  if (!state.resources.has(resourceName)) return 'resource-not-found';

  const plan: CapacityPlan = {
    planId: state.deps.idGen.next(),
    resourceName,
    targetCapacity,
    reason,
    createdAt: state.deps.clock.nowMicroseconds(),
    scheduledAt,
    implemented: false,
  };

  state.plans.set(plan.planId, plan);
  state.deps.logger.info('plan-created', { planId: plan.planId, resourceName, targetCapacity });
  return plan;
}

// ─── Implement Plan ───────────────────────────────────────────────────────────

function implementPlanImpl(
  state: PlannerState,
  planId: PlanId,
): { success: true } | { success: false; error: PlannerError } {
  const plan = state.plans.get(planId);
  if (plan === undefined) return { success: false, error: 'plan-not-found' };
  if (plan.implemented) return { success: false, error: 'plan-not-found' };

  const resource = state.resources.get(plan.resourceName);
  if (resource === undefined) return { success: false, error: 'resource-not-found' };

  resource.currentCapacity = plan.targetCapacity;
  resource.utilizationPercent =
    plan.targetCapacity > 0 ? (resource.currentDemand / plan.targetCapacity) * 100 : 0;
  resource.status = deriveStatus(resource.utilizationPercent);
  resource.lastUpdated = state.deps.clock.nowMicroseconds();
  plan.implemented = true;

  state.deps.logger.info('plan-implemented', { planId, resourceName: plan.resourceName });
  return { success: true };
}

// ─── Forecast Demand ──────────────────────────────────────────────────────────

function forecastDemandImpl(
  state: PlannerState,
  resourceName: ResourceName,
  forecastPeriodUs: bigint,
): DemandForecast | PlannerError {
  const resource = state.resources.get(resourceName);
  if (resource === undefined) return 'resource-not-found';

  const sampleCount = state.demandSampleCounts.get(resourceName) ?? 0;
  const confidencePercent = deriveConfidence(sampleCount);

  return {
    resourceName,
    forecastPeriodUs,
    predictedDemand: resource.currentDemand,
    confidencePercent,
    basedOnSamples: sampleCount,
  };
}

// ─── List Plans ───────────────────────────────────────────────────────────────

function listPlansImpl(
  state: PlannerState,
  resourceName?: string,
  implemented?: boolean,
): ReadonlyArray<CapacityPlan> {
  const result: CapacityPlan[] = [];
  for (const plan of state.plans.values()) {
    if (resourceName !== undefined && plan.resourceName !== resourceName) continue;
    if (implemented !== undefined && plan.implemented !== implemented) continue;
    result.push(plan);
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveStatus(utilizationPercent: number): CapacityStatus {
  if (utilizationPercent < 40) return 'UNDERUTILIZED';
  if (utilizationPercent < 80) return 'OPTIMAL';
  if (utilizationPercent < 95) return 'NEAR_LIMIT';
  return 'OVERLOADED';
}

function deriveConfidence(sampleCount: number): number {
  if (sampleCount < 3) return 50;
  if (sampleCount < 10) return 70;
  return 90;
}
