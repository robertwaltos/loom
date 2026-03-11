/**
 * Monetary Policy System — Central monetary policy controls for KALON supply management.
 *
 * Supports four policy tools: INTEREST_RATE, RESERVE_REQUIREMENT, OPEN_MARKET,
 * EMERGENCY_FACILITY. Each world maintains its own set of policies. Locked policies
 * are immutable. Reports summarize world-level monetary conditions.
 */

// ============================================================================
// Types
// ============================================================================

export type PolicyId = string;
export type WorldId = string;

export type MonetaryError =
  | 'policy-not-found'
  | 'world-not-found'
  | 'invalid-rate'
  | 'invalid-target'
  | 'already-registered'
  | 'policy-locked';

export type PolicyTool =
  | 'INTEREST_RATE'
  | 'RESERVE_REQUIREMENT'
  | 'OPEN_MARKET'
  | 'EMERGENCY_FACILITY';

export interface MonetaryPolicy {
  readonly policyId: PolicyId;
  readonly worldId: WorldId;
  readonly tool: PolicyTool;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly rationale: string;
  readonly effectiveFrom: bigint;
  readonly locked: boolean;
}

export interface PolicyEffect {
  readonly effectId: string;
  readonly policyId: PolicyId;
  readonly metric: string;
  readonly projectedChange: number;
  readonly appliedAt: bigint;
}

export interface MonetaryReport {
  readonly worldId: WorldId;
  readonly activePolicies: number;
  readonly averageInterestRate: number;
  readonly reserveRequirement: number;
  readonly openMarketBalance: bigint;
}

export interface MonetaryPolicySystem {
  registerWorld(worldId: WorldId): { success: true } | { success: false; error: MonetaryError };
  setPolicy(
    worldId: WorldId,
    tool: PolicyTool,
    targetValue: number,
    rationale: string,
  ): MonetaryPolicy | MonetaryError;
  lockPolicy(policyId: PolicyId): { success: true } | { success: false; error: MonetaryError };
  updateCurrentValue(
    policyId: PolicyId,
    currentValue: number,
  ): { success: true } | { success: false; error: MonetaryError };
  applyPolicy(
    policyId: PolicyId,
  ):
    | { success: true; effects: ReadonlyArray<PolicyEffect> }
    | { success: false; error: MonetaryError };
  getPolicy(policyId: PolicyId): MonetaryPolicy | undefined;
  getReport(worldId: WorldId): MonetaryReport | undefined;
  listPolicies(worldId: WorldId, tool?: PolicyTool): ReadonlyArray<MonetaryPolicy>;
}

// ============================================================================
// Internal State
// ============================================================================

interface MutablePolicy {
  policyId: PolicyId;
  worldId: WorldId;
  tool: PolicyTool;
  targetValue: number;
  currentValue: number;
  rationale: string;
  effectiveFrom: bigint;
  locked: boolean;
}

interface MonetaryPolicyState {
  readonly worlds: Set<WorldId>;
  readonly policies: Map<PolicyId, MutablePolicy>;
  readonly worldPolicies: Map<WorldId, PolicyId[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generate(): string };
  readonly logger: { info(msg: string, ctx: Record<string, unknown>): void };
}

// ============================================================================
// Validation
// ============================================================================

function validateTargetValue(tool: PolicyTool, targetValue: number): MonetaryError | null {
  if (tool === 'INTEREST_RATE') {
    return targetValue >= 0 && targetValue <= 50 ? null : 'invalid-rate';
  }
  if (tool === 'RESERVE_REQUIREMENT') {
    return targetValue >= 0 && targetValue <= 100 ? null : 'invalid-target';
  }
  return targetValue > 0 ? null : 'invalid-target';
}

// ============================================================================
// Policy Effects by Tool
// ============================================================================

const TOOL_EFFECTS: Record<PolicyTool, ReadonlyArray<{ metric: string; factor: number }>> = {
  INTEREST_RATE: [
    { metric: 'inflation_rate', factor: -0.3 },
    { metric: 'lending_rate', factor: 1.0 },
    { metric: 'savings_rate', factor: 0.6 },
  ],
  RESERVE_REQUIREMENT: [
    { metric: 'credit_availability', factor: -0.5 },
    { metric: 'bank_stability', factor: 0.8 },
  ],
  OPEN_MARKET: [
    { metric: 'kalon_supply', factor: 1.2 },
    { metric: 'bond_yield', factor: -0.4 },
    { metric: 'velocity', factor: 0.3 },
  ],
  EMERGENCY_FACILITY: [
    { metric: 'liquidity_ratio', factor: 1.5 },
    { metric: 'crisis_index', factor: -0.7 },
  ],
};

// ============================================================================
// Core Implementation Functions
// ============================================================================

function registerWorldImpl(
  state: MonetaryPolicyState,
  worldId: WorldId,
): { success: true } | { success: false; error: MonetaryError } {
  if (state.worlds.has(worldId)) return { success: false, error: 'already-registered' };
  state.worlds.add(worldId);
  state.worldPolicies.set(worldId, []);
  state.logger.info('World registered for monetary policy', { worldId });
  return { success: true };
}

function hasLockedPolicyForTool(
  state: MonetaryPolicyState,
  worldId: WorldId,
  tool: PolicyTool,
): boolean {
  const existingPolicies = state.worldPolicies.get(worldId) ?? [];
  return existingPolicies.some((pId) => {
    const p = state.policies.get(pId);
    return p !== undefined && p.tool === tool && p.locked;
  });
}

function buildPolicy(
  state: MonetaryPolicyState,
  worldId: WorldId,
  tool: PolicyTool,
  targetValue: number,
  rationale: string,
): MutablePolicy {
  return {
    policyId: state.idGen.generate(),
    worldId,
    tool,
    targetValue,
    currentValue: targetValue,
    rationale,
    effectiveFrom: state.clock.nowMicroseconds(),
    locked: false,
  };
}

function setPolicyImpl(
  state: MonetaryPolicyState,
  worldId: WorldId,
  tool: PolicyTool,
  targetValue: number,
  rationale: string,
): MonetaryPolicy | MonetaryError {
  if (!state.worlds.has(worldId)) return 'world-not-found';
  const validationError = validateTargetValue(tool, targetValue);
  if (validationError) return validationError;
  if (hasLockedPolicyForTool(state, worldId, tool)) return 'policy-locked';

  const policy = buildPolicy(state, worldId, tool, targetValue, rationale);
  const existingPolicies = state.worldPolicies.get(worldId) ?? [];
  state.policies.set(policy.policyId, policy);
  existingPolicies.push(policy.policyId);
  state.worldPolicies.set(worldId, existingPolicies);
  state.logger.info('Monetary policy set', {
    policyId: policy.policyId,
    worldId,
    tool,
    targetValue,
  });
  return policy;
}

function lockPolicyImpl(
  state: MonetaryPolicyState,
  policyId: PolicyId,
): { success: true } | { success: false; error: MonetaryError } {
  const policy = state.policies.get(policyId);
  if (!policy) return { success: false, error: 'policy-not-found' };
  policy.locked = true;
  state.logger.info('Policy locked', { policyId });
  return { success: true };
}

function updateCurrentValueImpl(
  state: MonetaryPolicyState,
  policyId: PolicyId,
  currentValue: number,
): { success: true } | { success: false; error: MonetaryError } {
  const policy = state.policies.get(policyId);
  if (!policy) return { success: false, error: 'policy-not-found' };
  if (policy.locked) return { success: false, error: 'policy-locked' };
  policy.currentValue = currentValue;
  return { success: true };
}

function applyPolicyImpl(
  state: MonetaryPolicyState,
  policyId: PolicyId,
):
  | { success: true; effects: ReadonlyArray<PolicyEffect> }
  | { success: false; error: MonetaryError } {
  const policy = state.policies.get(policyId);
  if (!policy) return { success: false, error: 'policy-not-found' };

  const now = state.clock.nowMicroseconds();
  const effectDefs = TOOL_EFFECTS[policy.tool];
  const effects: PolicyEffect[] = effectDefs.map((def) => ({
    effectId: state.idGen.generate(),
    policyId,
    metric: def.metric,
    projectedChange: policy.targetValue * def.factor,
    appliedAt: now,
  }));

  state.logger.info('Policy applied', { policyId, effectCount: effects.length });
  return { success: true, effects };
}

function buildReport(state: MonetaryPolicyState, worldId: WorldId): MonetaryReport {
  const policyIds = state.worldPolicies.get(worldId) ?? [];
  const policies = policyIds.map((id) => state.policies.get(id)).filter(Boolean) as MutablePolicy[];

  const interestPolicies = policies.filter((p) => p.tool === 'INTEREST_RATE');
  const averageInterestRate =
    interestPolicies.length === 0
      ? 0
      : interestPolicies.reduce((sum, p) => sum + p.currentValue, 0) / interestPolicies.length;

  const reservePolicies = policies.filter((p) => p.tool === 'RESERVE_REQUIREMENT');
  const lastReserve = reservePolicies[reservePolicies.length - 1];
  const reserveRequirement =
    reservePolicies.length === 0 || !lastReserve ? 0 : lastReserve.currentValue;

  const openMarketPolicies = policies.filter((p) => p.tool === 'OPEN_MARKET');
  const openMarketBalance = openMarketPolicies.reduce(
    (sum, p) => sum + BigInt(Math.round(p.targetValue)) * 1_000_000n,
    0n,
  );

  return {
    worldId,
    activePolicies: policies.length,
    averageInterestRate,
    reserveRequirement,
    openMarketBalance,
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createMonetaryPolicySystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generate(): string };
  readonly logger: { info(msg: string, ctx: Record<string, unknown>): void };
}): MonetaryPolicySystem {
  const state: MonetaryPolicyState = {
    worlds: new Set(),
    policies: new Map(),
    worldPolicies: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerWorld: (worldId) => registerWorldImpl(state, worldId),
    setPolicy: (worldId, tool, targetValue, rationale) =>
      setPolicyImpl(state, worldId, tool, targetValue, rationale),
    lockPolicy: (policyId) => lockPolicyImpl(state, policyId),
    updateCurrentValue: (policyId, currentValue) =>
      updateCurrentValueImpl(state, policyId, currentValue),
    applyPolicy: (policyId) => applyPolicyImpl(state, policyId),
    getPolicy: (policyId) => state.policies.get(policyId),
    getReport: (worldId) => {
      if (!state.worlds.has(worldId)) return undefined;
      return buildReport(state, worldId);
    },
    listPolicies: (worldId, tool) => {
      const policyIds = state.worldPolicies.get(worldId) ?? [];
      const all = policyIds.map((id) => state.policies.get(id)).filter(Boolean) as MutablePolicy[];
      return tool ? all.filter((p) => p.tool === tool) : all;
    },
  };
}
