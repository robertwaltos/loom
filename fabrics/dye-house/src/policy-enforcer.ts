/**
 * Policy Enforcer — Security policy evaluation and enforcement.
 *
 * Evaluates request contexts against ranked policy rules.
 * First matching rule wins; defaults to ALLOW when no rule matches.
 *
 * "The Dye House sets the rules. The Weave must comply."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ──────────────────────────────────────────────────────────

interface PolicyEnforcerClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface PolicyEnforcerIdGenPort {
  readonly next: () => string;
}

interface PolicyEnforcerLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PolicyRuleId = string;
export type RequestContextId = string;

export type EnforcerError =
  | 'rule-not-found'
  | 'already-registered'
  | 'invalid-condition'
  | 'context-not-found';

export type PolicyEffect = 'ALLOW' | 'DENY' | 'CHALLENGE' | 'LOG';

export type ConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'GREATER_THAN'
  | 'LESS_THAN';

export interface PolicyCondition {
  readonly field: string;
  readonly operator: ConditionOperator;
  readonly value: string;
}

export interface PolicyRule {
  readonly ruleId: PolicyRuleId;
  readonly name: string;
  readonly priority: number;
  readonly conditions: ReadonlyArray<PolicyCondition>;
  readonly effect: PolicyEffect;
  readonly active: boolean;
  readonly createdAt: bigint;
}

export interface RequestContext {
  readonly contextId: RequestContextId;
  readonly fields: Record<string, string>;
  readonly evaluatedAt: bigint;
}

export interface EnforcementResult {
  readonly contextId: RequestContextId;
  readonly ruleId: PolicyRuleId | null;
  readonly effect: PolicyEffect;
  readonly matchedRule: boolean;
  readonly reason: string;
  readonly decidedAt: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface PolicyEnforcerSystem {
  createRule(
    name: string,
    priority: number,
    conditions: ReadonlyArray<PolicyCondition>,
    effect: PolicyEffect,
  ): PolicyRule | EnforcerError;
  deactivateRule(
    ruleId: PolicyRuleId,
  ): { success: true } | { success: false; error: EnforcerError };
  evaluateRequest(contextFields: Record<string, string>): EnforcementResult;
  getRule(ruleId: PolicyRuleId): PolicyRule | undefined;
  listRules(active?: boolean): ReadonlyArray<PolicyRule>;
  getStats(): { totalRules: number; evaluations: number; denyCount: number; allowCount: number };
}

// ─── Deps ─────────────────────────────────────────────────────────────────────

export interface PolicyEnforcerSystemDeps {
  readonly clock: PolicyEnforcerClockPort;
  readonly idGen: PolicyEnforcerIdGenPort;
  readonly logger: PolicyEnforcerLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface EnforcerState {
  readonly rules: Map<PolicyRuleId, PolicyRule>;
  evaluations: number;
  denyCount: number;
  allowCount: number;
  readonly deps: PolicyEnforcerSystemDeps;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPolicyEnforcerSystem(deps: PolicyEnforcerSystemDeps): PolicyEnforcerSystem {
  const state: EnforcerState = {
    rules: new Map(),
    evaluations: 0,
    denyCount: 0,
    allowCount: 0,
    deps,
  };

  return {
    createRule: (name, priority, conditions, effect) =>
      createRuleImpl(state, name, priority, conditions, effect),
    deactivateRule: (ruleId) => deactivateRuleImpl(state, ruleId),
    evaluateRequest: (contextFields) => evaluateRequestImpl(state, contextFields),
    getRule: (ruleId) => state.rules.get(ruleId),
    listRules: (active) => listRulesImpl(state, active),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Create Rule ─────────────────────────────────────────────────────────────

function createRuleImpl(
  state: EnforcerState,
  name: string,
  priority: number,
  conditions: ReadonlyArray<PolicyCondition>,
  effect: PolicyEffect,
): PolicyRule | EnforcerError {
  if (conditions.length === 0) return 'invalid-condition';

  const ruleId = state.deps.idGen.next();
  const rule: PolicyRule = {
    ruleId,
    name,
    priority,
    conditions,
    effect,
    active: true,
    createdAt: state.deps.clock.nowMicroseconds(),
  };

  state.rules.set(ruleId, rule);
  state.deps.logger.info('policy-rule-created', { ruleId, name, priority, effect });
  return rule;
}

// ─── Deactivate Rule ──────────────────────────────────────────────────────────

function deactivateRuleImpl(
  state: EnforcerState,
  ruleId: PolicyRuleId,
): { success: true } | { success: false; error: EnforcerError } {
  const rule = state.rules.get(ruleId);
  if (rule === undefined) return { success: false, error: 'rule-not-found' };

  const updated: PolicyRule = { ...rule, active: false };
  state.rules.set(ruleId, updated);
  state.deps.logger.info('policy-rule-deactivated', { ruleId });
  return { success: true };
}

// ─── Evaluate Request ─────────────────────────────────────────────────────────

function evaluateRequestImpl(
  state: EnforcerState,
  contextFields: Record<string, string>,
): EnforcementResult {
  state.evaluations += 1;
  const contextId = state.deps.idGen.next();
  const now = state.deps.clock.nowMicroseconds();

  const activeRules = [...state.rules.values()]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    if (allConditionsMatch(rule.conditions, contextFields)) {
      trackEffect(state, rule.effect);
      state.deps.logger.info('policy-matched', { ruleId: rule.ruleId, effect: rule.effect });
      return {
        contextId,
        ruleId: rule.ruleId,
        effect: rule.effect,
        matchedRule: true,
        reason: rule.name,
        decidedAt: now,
      };
    }
  }

  state.allowCount += 1;
  return {
    contextId,
    ruleId: null,
    effect: 'ALLOW',
    matchedRule: false,
    reason: 'no-rule-matched',
    decidedAt: now,
  };
}

function trackEffect(state: EnforcerState, effect: PolicyEffect): void {
  if (effect === 'DENY') {
    state.denyCount += 1;
  } else {
    state.allowCount += 1;
  }
}

// ─── Condition Evaluation ─────────────────────────────────────────────────────

function allConditionsMatch(
  conditions: ReadonlyArray<PolicyCondition>,
  fields: Record<string, string>,
): boolean {
  for (const condition of conditions) {
    if (!evaluateCondition(condition, fields)) return false;
  }
  return true;
}

function evaluateCondition(condition: PolicyCondition, fields: Record<string, string>): boolean {
  const fieldValue = fields[condition.field];
  if (fieldValue === undefined) return false;

  switch (condition.operator) {
    case 'EQUALS':
      return fieldValue === condition.value;
    case 'NOT_EQUALS':
      return fieldValue !== condition.value;
    case 'CONTAINS':
      return fieldValue.includes(condition.value);
    case 'STARTS_WITH':
      return fieldValue.startsWith(condition.value);
    case 'GREATER_THAN':
      return Number(fieldValue) > Number(condition.value);
    case 'LESS_THAN':
      return Number(fieldValue) < Number(condition.value);
  }
}

// ─── List Rules ───────────────────────────────────────────────────────────────

function listRulesImpl(state: EnforcerState, active?: boolean): ReadonlyArray<PolicyRule> {
  const all = [...state.rules.values()];
  if (active === undefined) return all;
  return all.filter((r) => r.active === active);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function getStatsImpl(state: EnforcerState) {
  return {
    totalRules: state.rules.size,
    evaluations: state.evaluations,
    denyCount: state.denyCount,
    allowCount: state.allowCount,
  };
}
