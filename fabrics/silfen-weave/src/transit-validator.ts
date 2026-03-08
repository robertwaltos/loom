/**
 * Transit Validator — Entity state consistency for world transitions.
 *
 * Before an entity transits between worlds, the validator ensures:
 *   - Required components exist (Position, Health for characters)
 *   - Inventory doesn't exceed destination world limits
 *   - Entity is not locked (in combat, in trade, frozen)
 *   - Destination world can accept the entity (capacity, zone)
 *   - No conflicting active corridors exist
 *
 * The validator runs pre-transit and post-transit checks.
 * Pre-transit can block the corridor from opening.
 * Post-transit can flag inconsistencies for reconciliation.
 *
 * "The Weave does not accept broken threads."
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly entityId: string;
}

export interface TransitValidationResult {
  readonly valid: boolean;
  readonly entityId: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly issues: ReadonlyArray<ValidationIssue>;
  readonly validatedAt: number;
}

export interface TransitValidationRule {
  readonly name: string;
  readonly phase: 'pre_transit' | 'post_transit' | 'both';
  check(context: ValidationContext): ReadonlyArray<ValidationIssue>;
}

export interface ValidationContext {
  readonly entityId: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly entityComponents: ReadonlyArray<string>;
  readonly entityState: Readonly<Record<string, string>>;
  readonly destinationCapacity: WorldCapacityInfo;
}

export interface WorldCapacityInfo {
  readonly currentPopulation: number;
  readonly maxPopulation: number;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface TransitValidatorDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface TransitValidator {
  registerRule(rule: TransitValidationRule): void;
  removeRule(name: string): boolean;
  validatePreTransit(context: ValidationContext): TransitValidationResult;
  validatePostTransit(context: ValidationContext): TransitValidationResult;
  listRules(): ReadonlyArray<string>;
  ruleCount(): number;
}

// ─── State ──────────────────────────────────────────────────────────

interface ValidatorState {
  readonly rules: Map<string, TransitValidationRule>;
  readonly deps: TransitValidatorDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createTransitValidator(
  deps: TransitValidatorDeps,
): TransitValidator {
  const state: ValidatorState = { rules: new Map(), deps };

  return {
    registerRule: (r) => { state.rules.set(r.name, r); },
    removeRule: (n) => state.rules.delete(n),
    validatePreTransit: (ctx) => validatePhase(state, ctx, 'pre_transit'),
    validatePostTransit: (ctx) => validatePhase(state, ctx, 'post_transit'),
    listRules: () => [...state.rules.keys()],
    ruleCount: () => state.rules.size,
  };
}

// ─── Validation ─────────────────────────────────────────────────────

function validatePhase(
  state: ValidatorState,
  context: ValidationContext,
  phase: 'pre_transit' | 'post_transit',
): TransitValidationResult {
  const issues: ValidationIssue[] = [];

  for (const rule of state.rules.values()) {
    if (!appliesToPhase(rule, phase)) continue;
    const ruleIssues = rule.check(context);
    issues.push(...ruleIssues);
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    valid: !hasErrors,
    entityId: context.entityId,
    originWorldId: context.originWorldId,
    destinationWorldId: context.destinationWorldId,
    issues,
    validatedAt: state.deps.clock.nowMicroseconds(),
  };
}

function appliesToPhase(
  rule: TransitValidationRule,
  phase: 'pre_transit' | 'post_transit',
): boolean {
  return rule.phase === phase || rule.phase === 'both';
}

// ─── Built-in Rules ─────────────────────────────────────────────────

export function requiredComponentsRule(
  required: ReadonlyArray<string>,
): TransitValidationRule {
  return {
    name: 'required_components',
    phase: 'pre_transit',
    check: (ctx) => checkRequiredComponents(ctx, required),
  };
}

function checkRequiredComponents(
  ctx: ValidationContext,
  required: ReadonlyArray<string>,
): ReadonlyArray<ValidationIssue> {
  const issues: ValidationIssue[] = [];
  for (const comp of required) {
    if (!ctx.entityComponents.includes(comp)) {
      issues.push({
        code: 'MISSING_COMPONENT',
        severity: 'error',
        message: 'Missing required component: ' + comp,
        entityId: ctx.entityId,
      });
    }
  }
  return issues;
}

export function worldCapacityRule(): TransitValidationRule {
  return {
    name: 'world_capacity',
    phase: 'pre_transit',
    check: (ctx) => checkWorldCapacity(ctx),
  };
}

function checkWorldCapacity(
  ctx: ValidationContext,
): ReadonlyArray<ValidationIssue> {
  const cap = ctx.destinationCapacity;
  if (cap.currentPopulation >= cap.maxPopulation) {
    return [{
      code: 'WORLD_AT_CAPACITY',
      severity: 'error',
      message: 'Destination world at capacity ('
        + String(cap.currentPopulation) + '/'
        + String(cap.maxPopulation) + ')',
      entityId: ctx.entityId,
    }];
  }
  return [];
}

export function entityLockRule(): TransitValidationRule {
  return {
    name: 'entity_lock',
    phase: 'pre_transit',
    check: (ctx) => checkEntityLock(ctx),
  };
}

function checkEntityLock(
  ctx: ValidationContext,
): ReadonlyArray<ValidationIssue> {
  const locked = ctx.entityState['locked'];
  if (locked === 'true') {
    return [{
      code: 'ENTITY_LOCKED',
      severity: 'error',
      message: 'Entity is locked and cannot transit',
      entityId: ctx.entityId,
    }];
  }
  return [];
}
