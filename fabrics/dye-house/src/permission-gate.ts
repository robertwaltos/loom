/**
 * Permission Gate — Action authorization for dynasties.
 *
 * The Dye House controls who may do what within The Loom.
 * The Permission Gate evaluates whether a dynasty is authorized
 * to perform a given action based on:
 *   - Subscription tier requirements
 *   - Dynasty status requirements (active, dormant, completed)
 *   - Custom predicate rules for domain-specific logic
 *
 * Actions are registered with permission rules. At check time,
 * the gate evaluates all applicable rules and returns a verdict
 * with reasons if denied. This enables clear error messaging
 * and auditable authorization decisions.
 *
 * "The Dye House marks each thread. Only those with the right
 *  color may enter."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SubscriptionTierGate = 'free' | 'accord' | 'patron' | 'herald';
export type DynastyStatusGate = 'active' | 'dormant' | 'completed';

export interface PermissionRule {
  readonly action: string;
  readonly minimumTier: SubscriptionTierGate;
  readonly requiredStatus: ReadonlyArray<DynastyStatusGate>;
  readonly description: string;
}

export interface PermissionSubject {
  readonly dynastyId: string;
  readonly tier: SubscriptionTierGate;
  readonly status: DynastyStatusGate;
}

export interface PermissionVerdict {
  readonly allowed: boolean;
  readonly action: string;
  readonly denialReasons: ReadonlyArray<string>;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface PermissionGateDeps {
  readonly customPredicates: ReadonlyArray<CustomPredicate>;
}

export interface CustomPredicate {
  readonly name: string;
  readonly actions: ReadonlyArray<string>;
  evaluate(subject: PermissionSubject, action: string): PredicateResult;
}

export interface PredicateResult {
  readonly allowed: boolean;
  readonly reason: string;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface PermissionGate {
  registerRule(rule: PermissionRule): void;
  removeRule(action: string): boolean;
  check(subject: PermissionSubject, action: string): PermissionVerdict;
  checkMany(
    subject: PermissionSubject,
    actions: ReadonlyArray<string>,
  ): ReadonlyArray<PermissionVerdict>;
  getRule(action: string): PermissionRule | undefined;
  listActions(): ReadonlyArray<string>;
  ruleCount(): number;
}

// ─── Tier Ordering ──────────────────────────────────────────────────

const TIER_RANK: Readonly<Record<SubscriptionTierGate, number>> = {
  free: 0,
  accord: 1,
  patron: 2,
  herald: 3,
};

// ─── State ──────────────────────────────────────────────────────────

interface GateState {
  readonly rules: Map<string, PermissionRule>;
  readonly deps: PermissionGateDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPermissionGate(deps: PermissionGateDeps): PermissionGate {
  const state: GateState = {
    rules: new Map(),
    deps,
  };

  return {
    registerRule: (r) => { registerRuleImpl(state, r); },
    removeRule: (a) => removeRuleImpl(state, a),
    check: (s, a) => checkImpl(state, s, a),
    checkMany: (s, a) => checkManyImpl(state, s, a),
    getRule: (a) => state.rules.get(a),
    listActions: () => [...state.rules.keys()],
    ruleCount: () => state.rules.size,
  };
}

// ─── Rule Registration ─────────────────────────────────────────────

function registerRuleImpl(state: GateState, rule: PermissionRule): void {
  state.rules.set(rule.action, rule);
}

function removeRuleImpl(state: GateState, action: string): boolean {
  return state.rules.delete(action);
}

// ─── Check ──────────────────────────────────────────────────────────

function checkImpl(
  state: GateState,
  subject: PermissionSubject,
  action: string,
): PermissionVerdict {
  const rule = state.rules.get(action);
  if (rule === undefined) {
    return { allowed: false, action, denialReasons: ['Unknown action: ' + action] };
  }

  const reasons: string[] = [];
  evaluateTier(subject, rule, reasons);
  evaluateStatus(subject, rule, reasons);
  evaluatePredicates(state, subject, action, reasons);

  return { allowed: reasons.length === 0, action, denialReasons: reasons };
}

function checkManyImpl(
  state: GateState,
  subject: PermissionSubject,
  actions: ReadonlyArray<string>,
): ReadonlyArray<PermissionVerdict> {
  return actions.map((a) => checkImpl(state, subject, a));
}

// ─── Tier Evaluation ────────────────────────────────────────────────

function evaluateTier(
  subject: PermissionSubject,
  rule: PermissionRule,
  reasons: string[],
): void {
  const subjectRank = TIER_RANK[subject.tier];
  const requiredRank = TIER_RANK[rule.minimumTier];
  if (subjectRank < requiredRank) {
    reasons.push(
      'Requires ' + rule.minimumTier + ' tier or higher, has ' + subject.tier,
    );
  }
}

// ─── Status Evaluation ─────────────────────────────────────────────

function evaluateStatus(
  subject: PermissionSubject,
  rule: PermissionRule,
  reasons: string[],
): void {
  if (rule.requiredStatus.length === 0) return;
  const match = rule.requiredStatus.includes(subject.status);
  if (!match) {
    const allowed = rule.requiredStatus.join(', ');
    reasons.push(
      'Requires status ' + allowed + ', has ' + subject.status,
    );
  }
}

// ─── Custom Predicate Evaluation ────────────────────────────────────

function evaluatePredicates(
  state: GateState,
  subject: PermissionSubject,
  action: string,
  reasons: string[],
): void {
  for (const predicate of state.deps.customPredicates) {
    if (!appliesToAction(predicate, action)) continue;
    const result = predicate.evaluate(subject, action);
    if (!result.allowed) {
      reasons.push(predicate.name + ': ' + result.reason);
    }
  }
}

function appliesToAction(
  predicate: CustomPredicate,
  action: string,
): boolean {
  if (predicate.actions.length === 0) return true;
  return predicate.actions.includes(action);
}
