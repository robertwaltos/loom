/**
 * Quality Gate Engine — Automated quality checkpoint evaluation.
 *
 * Define quality gates with named conditions. Each condition checks
 * a metric threshold, test pass rate, or coverage minimum. Gates
 * evaluate to PASS, FAIL, or WARN.
 *
 * Composite gates combine sub-gates with AND/OR logic.
 * Gate history tracks evaluations over time.
 * Reporting produces human-readable status summaries.
 *
 * "No thread leaves The Loom unless it passes the gate."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type GateVerdict = 'pass' | 'fail' | 'warn';
export type GateConditionKind = 'metric_threshold' | 'test_pass_rate' | 'coverage_minimum';
export type GateCompositeOp = 'and' | 'or';

export interface GateCondition {
  readonly conditionId: string;
  readonly kind: GateConditionKind;
  readonly metricName: string;
  readonly operator: 'gte' | 'lte' | 'gt' | 'lt' | 'eq';
  readonly target: number;
  readonly warnThreshold?: number;
}

export interface GateDefinition {
  readonly gateId: string;
  readonly name: string;
  readonly description: string;
  readonly conditions: ReadonlyArray<GateCondition>;
}

export interface CompositeGateDefinition {
  readonly gateId: string;
  readonly name: string;
  readonly description: string;
  readonly operator: GateCompositeOp;
  readonly subGateIds: ReadonlyArray<string>;
}

export interface GateConditionResult {
  readonly conditionId: string;
  readonly verdict: GateVerdict;
  readonly actualValue: number;
  readonly targetValue: number;
  readonly message: string;
}

export interface GateEvaluation {
  readonly gateId: string;
  readonly name: string;
  readonly verdict: GateVerdict;
  readonly evaluatedAt: number;
  readonly conditionResults: ReadonlyArray<GateConditionResult>;
}

export interface GateHistoryRecord {
  readonly gateId: string;
  readonly verdict: GateVerdict;
  readonly evaluatedAt: number;
}

export interface GateReport {
  readonly generatedAt: number;
  readonly totalGates: number;
  readonly passed: number;
  readonly failed: number;
  readonly warned: number;
  readonly evaluations: ReadonlyArray<GateEvaluation>;
}

// ─── Ports ──────────────────────────────────────────────────────────

export type GateMetricProvider = (metricName: string) => number | undefined;

export interface QualityGateDeps {
  readonly clock: { nowMilliseconds(): number };
  readonly getMetricValue: GateMetricProvider;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface QualityGateEngine {
  readonly defineGate: (gate: GateDefinition) => void;
  readonly defineCompositeGate: (gate: CompositeGateDefinition) => void;
  readonly removeGate: (gateId: string) => boolean;
  readonly evaluateGate: (gateId: string) => GateEvaluation | undefined;
  readonly evaluateAll: () => ReadonlyArray<GateEvaluation>;
  readonly getHistory: (gateId: string, limit: number) => ReadonlyArray<GateHistoryRecord>;
  readonly generateReport: () => GateReport;
  readonly getGate: (gateId: string) => GateDefinition | undefined;
  readonly listGates: () => ReadonlyArray<string>;
  readonly gateCount: () => number;
}

// ─── Internal State ─────────────────────────────────────────────────

interface GateState {
  readonly gates: Map<string, GateDefinition>;
  readonly composites: Map<string, CompositeGateDefinition>;
  readonly history: Map<string, GateHistoryRecord[]>;
  readonly deps: QualityGateDeps;
  readonly maxHistory: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createQualityGateEngine(deps: QualityGateDeps): QualityGateEngine {
  const state: GateState = {
    gates: new Map(),
    composites: new Map(),
    history: new Map(),
    deps,
    maxHistory: 500,
  };

  return {
    defineGate: (g) => {
      defineGateImpl(state, g);
    },
    defineCompositeGate: (g) => {
      defineCompositeImpl(state, g);
    },
    removeGate: (id) => removeGateImpl(state, id),
    evaluateGate: (id) => evaluateGateImpl(state, id),
    evaluateAll: () => evaluateAllImpl(state),
    getHistory: (id, n) => getHistoryImpl(state, id, n),
    generateReport: () => generateReportImpl(state),
    getGate: (id) => state.gates.get(id),
    listGates: () => listGatesImpl(state),
    gateCount: () => state.gates.size + state.composites.size,
  };
}

// ─── Gate Definition ────────────────────────────────────────────────

function defineGateImpl(state: GateState, gate: GateDefinition): void {
  state.gates.set(gate.gateId, gate);
}

function defineCompositeImpl(state: GateState, gate: CompositeGateDefinition): void {
  state.composites.set(gate.gateId, gate);
}

function removeGateImpl(state: GateState, gateId: string): boolean {
  const removed = state.gates.delete(gateId) || state.composites.delete(gateId);
  if (removed) state.history.delete(gateId);
  return removed;
}

// ─── Evaluation ─────────────────────────────────────────────────────

function evaluateGateImpl(state: GateState, gateId: string): GateEvaluation | undefined {
  const gate = state.gates.get(gateId);
  if (gate !== undefined) return evaluateSimpleGate(state, gate);

  const composite = state.composites.get(gateId);
  if (composite !== undefined) return evaluateCompositeGate(state, composite);

  return undefined;
}

function evaluateSimpleGate(state: GateState, gate: GateDefinition): GateEvaluation {
  const now = state.deps.clock.nowMilliseconds();
  const results: GateConditionResult[] = [];

  for (const condition of gate.conditions) {
    results.push(evaluateCondition(state, condition));
  }

  const verdict = deriveVerdict(results);
  const evaluation: GateEvaluation = {
    gateId: gate.gateId,
    name: gate.name,
    verdict,
    evaluatedAt: now,
    conditionResults: results,
  };

  recordHistory(state, gate.gateId, verdict, now);
  return evaluation;
}

function evaluateCompositeGate(state: GateState, gate: CompositeGateDefinition): GateEvaluation {
  const now = state.deps.clock.nowMilliseconds();
  const subResults: GateConditionResult[] = [];
  const verdicts: GateVerdict[] = [];

  for (const subId of gate.subGateIds) {
    const subEval = evaluateGateImpl(state, subId);
    if (subEval !== undefined) {
      verdicts.push(subEval.verdict);
      for (const cr of subEval.conditionResults) {
        subResults.push(cr);
      }
    }
  }

  const verdict = combineVerdicts(verdicts, gate.operator);
  const evaluation: GateEvaluation = {
    gateId: gate.gateId,
    name: gate.name,
    verdict,
    evaluatedAt: now,
    conditionResults: subResults,
  };

  recordHistory(state, gate.gateId, verdict, now);
  return evaluation;
}

// ─── Condition Evaluation ───────────────────────────────────────────

function evaluateCondition(state: GateState, cond: GateCondition): GateConditionResult {
  const value = state.deps.getMetricValue(cond.metricName) ?? 0;
  const passed = compareValue(value, cond.operator, cond.target);
  let verdict: GateVerdict = passed ? 'pass' : 'fail';

  if (!passed && cond.warnThreshold !== undefined) {
    const inWarnRange = compareValue(value, cond.operator, cond.warnThreshold);
    if (inWarnRange) verdict = 'warn';
  }

  const msg = buildConditionMessage(cond, value, verdict);
  return {
    conditionId: cond.conditionId,
    verdict,
    actualValue: value,
    targetValue: cond.target,
    message: msg,
  };
}

function compareValue(value: number, op: GateCondition['operator'], target: number): boolean {
  if (op === 'gte') return value >= target;
  if (op === 'lte') return value <= target;
  if (op === 'gt') return value > target;
  if (op === 'lt') return value < target;
  return value === target;
}

function buildConditionMessage(cond: GateCondition, value: number, verdict: GateVerdict): string {
  return (
    cond.conditionId +
    ': ' +
    String(value) +
    ' ' +
    cond.operator +
    ' ' +
    String(cond.target) +
    ' -> ' +
    verdict
  );
}

// ─── Verdict Logic ──────────────────────────────────────────────────

function deriveVerdict(results: ReadonlyArray<GateConditionResult>): GateVerdict {
  if (results.length === 0) return 'pass';
  let hasWarn = false;
  for (const r of results) {
    if (r.verdict === 'fail') return 'fail';
    if (r.verdict === 'warn') hasWarn = true;
  }
  return hasWarn ? 'warn' : 'pass';
}

function combineVerdicts(verdicts: ReadonlyArray<GateVerdict>, op: GateCompositeOp): GateVerdict {
  if (verdicts.length === 0) return 'pass';

  if (op === 'and') {
    return deriveVerdictFromList(verdicts);
  }

  let hasPassed = false;
  for (const v of verdicts) {
    if (v === 'pass') hasPassed = true;
  }
  return hasPassed ? 'pass' : deriveVerdictFromList(verdicts);
}

function deriveVerdictFromList(verdicts: ReadonlyArray<GateVerdict>): GateVerdict {
  let hasWarn = false;
  for (const v of verdicts) {
    if (v === 'fail') return 'fail';
    if (v === 'warn') hasWarn = true;
  }
  return hasWarn ? 'warn' : 'pass';
}

// ─── History ────────────────────────────────────────────────────────

function recordHistory(state: GateState, gateId: string, verdict: GateVerdict, at: number): void {
  let entries = state.history.get(gateId);
  if (entries === undefined) {
    entries = [];
    state.history.set(gateId, entries);
  }
  entries.push({ gateId, verdict, evaluatedAt: at });
  if (entries.length > state.maxHistory) entries.shift();
}

function getHistoryImpl(
  state: GateState,
  gateId: string,
  limit: number,
): ReadonlyArray<GateHistoryRecord> {
  const entries = state.history.get(gateId) ?? [];
  const start = Math.max(0, entries.length - limit);
  return entries.slice(start);
}

// ─── Evaluate All ───────────────────────────────────────────────────

function evaluateAllImpl(state: GateState): ReadonlyArray<GateEvaluation> {
  const result: GateEvaluation[] = [];
  for (const gateId of state.gates.keys()) {
    const ev = evaluateGateImpl(state, gateId);
    if (ev !== undefined) result.push(ev);
  }
  for (const gateId of state.composites.keys()) {
    const ev = evaluateGateImpl(state, gateId);
    if (ev !== undefined) result.push(ev);
  }
  return result;
}

// ─── Report ─────────────────────────────────────────────────────────

function generateReportImpl(state: GateState): GateReport {
  const now = state.deps.clock.nowMilliseconds();
  const evaluations = evaluateAllImpl(state);
  let passed = 0;
  let failed = 0;
  let warned = 0;

  for (const ev of evaluations) {
    if (ev.verdict === 'pass') passed += 1;
    else if (ev.verdict === 'fail') failed += 1;
    else warned += 1;
  }

  return {
    generatedAt: now,
    totalGates: evaluations.length,
    passed,
    failed,
    warned,
    evaluations,
  };
}

// ─── List Gates ─────────────────────────────────────────────────────

function listGatesImpl(state: GateState): ReadonlyArray<string> {
  const result: string[] = [];
  for (const id of state.gates.keys()) result.push(id);
  for (const id of state.composites.keys()) result.push(id);
  return result;
}
