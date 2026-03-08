/**
 * Permission Policy Engine — Attribute-based access control (ABAC).
 *
 * Evaluates access decisions based on subject attributes, resource
 * attributes, and environmental conditions. Complements the ACL
 * module with context-aware, fine-grained policy evaluation.
 *
 * Policy effects:
 *   allow — explicitly permits the action
 *   deny  — explicitly blocks the action (takes precedence)
 *
 * Evaluation: Any deny → denied. At least one allow → allowed.
 * No matching policies → denied by default (deny-by-default).
 */

// ─── Types ──────────────────────────────────────────────────────────

export type PolicyEffect = 'allow' | 'deny';
export type PolicyDecision = 'allowed' | 'denied';

export interface PolicyAttributes {
  readonly [key: string]: string | number | boolean;
}

export interface PolicyCondition {
  readonly attribute: string;
  readonly operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  readonly value: string | number | boolean | ReadonlyArray<string>;
}

export interface Policy {
  readonly policyId: string;
  readonly name: string;
  readonly effect: PolicyEffect;
  readonly resourcePattern: string;
  readonly action: string;
  readonly conditions: ReadonlyArray<PolicyCondition>;
  readonly priority: number;
}

export interface CreatePolicyParams {
  readonly name: string;
  readonly effect: PolicyEffect;
  readonly resourcePattern: string;
  readonly action: string;
  readonly conditions?: ReadonlyArray<PolicyCondition>;
  readonly priority?: number;
}

export interface EvaluationRequest {
  readonly subjectAttributes: PolicyAttributes;
  readonly resource: string;
  readonly action: string;
  readonly environmentAttributes?: PolicyAttributes;
}

export interface EvaluationResult {
  readonly decision: PolicyDecision;
  readonly matchedPolicies: ReadonlyArray<string>;
  readonly evaluatedAt: number;
}

export interface PolicyStats {
  readonly totalPolicies: number;
  readonly totalEvaluations: number;
  readonly allowCount: number;
  readonly denyCount: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface PolicyIdGenerator {
  next(): string;
}

export interface PermissionPolicyDeps {
  readonly idGenerator: PolicyIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface PermissionPolicyEngine {
  addPolicy(params: CreatePolicyParams): Policy;
  removePolicy(policyId: string): boolean;
  getPolicy(policyId: string): Policy | undefined;
  listPolicies(): ReadonlyArray<Policy>;
  evaluate(request: EvaluationRequest): EvaluationResult;
  getStats(): PolicyStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface EngineState {
  readonly policies: Map<string, Policy>;
  readonly deps: PermissionPolicyDeps;
  totalEvaluations: number;
  allowCount: number;
  denyCount: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPermissionPolicyEngine(
  deps: PermissionPolicyDeps,
): PermissionPolicyEngine {
  const state: EngineState = {
    policies: new Map(),
    deps,
    totalEvaluations: 0,
    allowCount: 0,
    denyCount: 0,
  };

  return {
    addPolicy: (p) => addPolicyImpl(state, p),
    removePolicy: (pid) => state.policies.delete(pid),
    getPolicy: (pid) => state.policies.get(pid),
    listPolicies: () => [...state.policies.values()],
    evaluate: (req) => evaluateImpl(state, req),
    getStats: () => computeStats(state),
  };
}

// ─── Add Policy ─────────────────────────────────────────────────────

function addPolicyImpl(
  state: EngineState,
  params: CreatePolicyParams,
): Policy {
  const policy: Policy = {
    policyId: state.deps.idGenerator.next(),
    name: params.name,
    effect: params.effect,
    resourcePattern: params.resourcePattern,
    action: params.action,
    conditions: params.conditions ?? [],
    priority: params.priority ?? 0,
  };
  state.policies.set(policy.policyId, policy);
  return policy;
}

// ─── Evaluation ─────────────────────────────────────────────────────

function evaluateImpl(
  state: EngineState,
  request: EvaluationRequest,
): EvaluationResult {
  const matched = findMatchingPolicies(state, request);
  const decision = decideFromMatched(matched);
  state.totalEvaluations += 1;
  if (decision === 'allowed') {
    state.allowCount += 1;
  } else {
    state.denyCount += 1;
  }
  return {
    decision,
    matchedPolicies: matched.map((p) => p.policyId),
    evaluatedAt: state.deps.clock.nowMicroseconds(),
  };
}

function findMatchingPolicies(
  state: EngineState,
  request: EvaluationRequest,
): Policy[] {
  const result: Policy[] = [];
  for (const policy of state.policies.values()) {
    if (!matchesResource(policy.resourcePattern, request.resource)) continue;
    if (policy.action !== '*' && policy.action !== request.action) continue;
    const attrs = mergeAttributes(request);
    if (!allConditionsMet(policy.conditions, attrs)) continue;
    result.push(policy);
  }
  return result;
}

function decideFromMatched(matched: Policy[]): PolicyDecision {
  if (matched.length === 0) return 'denied';
  for (const policy of matched) {
    if (policy.effect === 'deny') return 'denied';
  }
  return 'allowed';
}

// ─── Resource Matching ──────────────────────────────────────────────

function matchesResource(pattern: string, resource: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return resource.startsWith(prefix) || resource === prefix.slice(0, -1);
  }
  return pattern === resource;
}

// ─── Condition Evaluation ───────────────────────────────────────────

function mergeAttributes(request: EvaluationRequest): PolicyAttributes {
  return { ...request.subjectAttributes, ...request.environmentAttributes };
}

function allConditionsMet(
  conditions: ReadonlyArray<PolicyCondition>,
  attrs: PolicyAttributes,
): boolean {
  for (const cond of conditions) {
    if (!evaluateCondition(cond, attrs)) return false;
  }
  return true;
}

function evaluateCondition(
  cond: PolicyCondition,
  attrs: PolicyAttributes,
): boolean {
  const value = attrs[cond.attribute];
  if (value === undefined) return false;
  return applyOperator(cond.operator, value, cond.value);
}

function applyOperator(
  op: PolicyCondition['operator'],
  actual: string | number | boolean,
  expected: string | number | boolean | ReadonlyArray<string>,
): boolean {
  if (op === 'eq') return actual === expected;
  if (op === 'neq') return actual !== expected;
  if (op === 'in') return Array.isArray(expected) && expected.includes(String(actual));
  if (typeof actual !== 'number' || typeof expected !== 'number') return false;
  if (op === 'gt') return actual > expected;
  if (op === 'lt') return actual < expected;
  if (op === 'gte') return actual >= expected;
  return actual <= expected;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: EngineState): PolicyStats {
  return {
    totalPolicies: state.policies.size,
    totalEvaluations: state.totalEvaluations,
    allowCount: state.allowCount,
    denyCount: state.denyCount,
  };
}
