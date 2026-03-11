/**
 * Data Masker — PII masking and data anonymization.
 *
 * Applies configurable masking strategies to sensitive fields.
 * Multiple active rules can match a single field (all applied).
 *
 * "The Dye House protects what must not be seen."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ──────────────────────────────────────────────────────────

interface DataMaskerClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface DataMaskerIdGenPort {
  readonly next: () => string;
}

interface DataMaskerLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MaskRuleId = string;

export type DataMaskerError = 'rule-not-found' | 'already-registered' | 'invalid-pattern';

export type MaskStrategy = 'REDACT' | 'HASH' | 'TRUNCATE' | 'PARTIAL' | 'TOKENIZE';

export interface MaskRule {
  readonly ruleId: MaskRuleId;
  readonly fieldPattern: string;
  readonly strategy: MaskStrategy;
  readonly active: boolean;
  readonly createdAt: bigint;
}

export interface MaskedRecord {
  readonly originalFields: ReadonlyArray<string>;
  readonly maskedData: Record<string, string>;
  readonly appliedRules: ReadonlyArray<MaskRuleId>;
  readonly maskedAt: bigint;
}

export interface MaskerStats {
  readonly totalRules: number;
  readonly activeMaskings: number;
  readonly totalFieldsMasked: number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface DataMaskerSystem {
  addRule(fieldPattern: string, strategy: MaskStrategy): MaskRule | DataMaskerError;
  deactivateRule(
    ruleId: MaskRuleId,
  ): { success: true } | { success: false; error: DataMaskerError };
  maskRecord(data: Record<string, string>): MaskedRecord;
  maskField(fieldName: string, value: string, strategy: MaskStrategy): string;
  listRules(active?: boolean): ReadonlyArray<MaskRule>;
  getStats(): MaskerStats;
}

// ─── Deps ─────────────────────────────────────────────────────────────────────

export interface DataMaskerSystemDeps {
  readonly clock: DataMaskerClockPort;
  readonly idGen: DataMaskerIdGenPort;
  readonly logger: DataMaskerLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface MaskerState {
  readonly rules: Map<MaskRuleId, MaskRule>;
  activeMaskings: number;
  totalFieldsMasked: number;
  readonly deps: DataMaskerSystemDeps;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createDataMaskerSystem(deps: DataMaskerSystemDeps): DataMaskerSystem {
  const state: MaskerState = {
    rules: new Map(),
    activeMaskings: 0,
    totalFieldsMasked: 0,
    deps,
  };

  return {
    addRule: (fieldPattern, strategy) => addRuleImpl(state, fieldPattern, strategy),
    deactivateRule: (ruleId) => deactivateRuleImpl(state, ruleId),
    maskRecord: (data) => maskRecordImpl(state, data),
    maskField: (fieldName, value, strategy) => applyStrategy(value, strategy, 'unknown', fieldName),
    listRules: (active) => listRulesImpl(state, active),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Add Rule ─────────────────────────────────────────────────────────────────

function addRuleImpl(
  state: MaskerState,
  fieldPattern: string,
  strategy: MaskStrategy,
): MaskRule | DataMaskerError {
  if (fieldPattern.length === 0) return 'invalid-pattern';

  const ruleId = state.deps.idGen.next();
  const rule: MaskRule = {
    ruleId,
    fieldPattern,
    strategy,
    active: true,
    createdAt: state.deps.clock.nowMicroseconds(),
  };

  state.rules.set(ruleId, rule);
  state.deps.logger.info('mask-rule-added', { ruleId, fieldPattern, strategy });
  return rule;
}

// ─── Deactivate Rule ──────────────────────────────────────────────────────────

function deactivateRuleImpl(
  state: MaskerState,
  ruleId: MaskRuleId,
): { success: true } | { success: false; error: DataMaskerError } {
  const rule = state.rules.get(ruleId);
  if (rule === undefined) return { success: false, error: 'rule-not-found' };

  const updated: MaskRule = { ...rule, active: false };
  state.rules.set(ruleId, updated);
  state.deps.logger.info('mask-rule-deactivated', { ruleId });
  return { success: true };
}

// ─── Mask Record ──────────────────────────────────────────────────────────────

function maskRecordImpl(state: MaskerState, data: Record<string, string>): MaskedRecord {
  state.activeMaskings += 1;
  const now = state.deps.clock.nowMicroseconds();
  const originalFields = Object.keys(data);
  const maskedData: Record<string, string> = { ...data };
  const appliedRules: MaskRuleId[] = [];

  const activeRules = [...state.rules.values()].filter((r) => r.active);

  for (const fieldName of originalFields) {
    for (const rule of activeRules) {
      if (fieldMatchesPattern(fieldName, rule.fieldPattern)) {
        const currentValue = maskedData[fieldName] ?? '';
        maskedData[fieldName] = applyStrategy(currentValue, rule.strategy, rule.ruleId, fieldName);
        if (!appliedRules.includes(rule.ruleId)) {
          appliedRules.push(rule.ruleId);
        }
        state.totalFieldsMasked += 1;
      }
    }
  }

  return { originalFields, maskedData, appliedRules, maskedAt: now };
}

function fieldMatchesPattern(fieldName: string, pattern: string): boolean {
  const lower = fieldName.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  return lower === lowerPattern || lower.includes(lowerPattern);
}

// ─── Strategy Application ─────────────────────────────────────────────────────

function applyStrategy(
  value: string,
  strategy: MaskStrategy,
  ruleId: string,
  _fieldName: string,
): string {
  switch (strategy) {
    case 'REDACT':
      return '[REDACTED]';
    case 'HASH':
      return `hash:${value.length}:${value.charCodeAt(0)}`;
    case 'TRUNCATE':
      return value.length <= 3 ? value : value.slice(0, 3) + '...';
    case 'PARTIAL':
      return applyPartial(value);
    case 'TOKENIZE':
      return `tok_${ruleId}_${value.length}`;
  }
}

function applyPartial(value: string): string {
  if (value.length <= 4) return '[REDACTED]';
  const first = value.slice(0, 2);
  const last = value.slice(-2);
  const middle = '*'.repeat(Math.max(0, value.length - 4));
  return first + middle + last;
}

// ─── List Rules ───────────────────────────────────────────────────────────────

function listRulesImpl(state: MaskerState, active?: boolean): ReadonlyArray<MaskRule> {
  const all = [...state.rules.values()];
  if (active === undefined) return all;
  return all.filter((r) => r.active === active);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function getStatsImpl(state: MaskerState): MaskerStats {
  return {
    totalRules: state.rules.size,
    activeMaskings: state.activeMaskings,
    totalFieldsMasked: state.totalFieldsMasked,
  };
}
