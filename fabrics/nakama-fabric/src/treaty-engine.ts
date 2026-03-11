/**
 * Treaty Engine — Treaty creation, enforcement, and lifecycle.
 *
 * Treaties are formal agreements between two dynasties with structured
 * terms, time-limited duration, violation tracking, and automatic
 * expiration. Each treaty type carries specific term schemas.
 *
 * Treaty Lifecycle:
 *   PROPOSED    → One party drafts the treaty
 *   NEGOTIATING → Counter-terms exchanged
 *   SIGNED      → Both parties agree to terms
 *   ACTIVE      → Treaty in force after effective date
 *   EXPIRED     → Duration elapsed naturally (terminal)
 *   BROKEN      → Violated by one party (terminal)
 *   TERMINATED  → Mutually ended early (terminal)
 */

// ── Ports ────────────────────────────────────────────────────────

export interface TreatyClock {
  readonly nowMicroseconds: () => number;
}

export interface TreatyIdGenerator {
  readonly generate: () => string;
}

// ── Types ────────────────────────────────────────────────────────

export type TreatyType =
  | 'NON_AGGRESSION'
  | 'TRADE_AGREEMENT'
  | 'MUTUAL_DEFENSE'
  | 'BORDER_AGREEMENT'
  | 'TECHNOLOGY_SHARING';

export type TreatyPhase =
  | 'PROPOSED'
  | 'NEGOTIATING'
  | 'SIGNED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'BROKEN'
  | 'TERMINATED';

export interface TreatyTerms {
  readonly description: string;
  readonly conditions: ReadonlyArray<string>;
  readonly tradeTariffPercent?: number;
  readonly defensePledgePercent?: number;
  readonly borderWorldIds?: ReadonlyArray<string>;
  readonly sharedTechCategories?: ReadonlyArray<string>;
}

export interface TreatyViolation {
  readonly violationId: string;
  readonly violatorId: string;
  readonly description: string;
  readonly timestamp: number;
}

export interface TreatyRecord {
  readonly treatyId: string;
  readonly treatyType: TreatyType;
  readonly phase: TreatyPhase;
  readonly proposerId: string;
  readonly counterpartyId: string;
  readonly terms: TreatyTerms;
  readonly durationUs: number;
  readonly proposedAt: number;
  readonly signedAt: number;
  readonly activatedAt: number;
  readonly expiresAt: number;
  readonly terminatedAt: number;
  readonly violations: ReadonlyArray<TreatyViolation>;
}

export interface ProposeTreatyParams {
  readonly proposerId: string;
  readonly counterpartyId: string;
  readonly treatyType: TreatyType;
  readonly terms: TreatyTerms;
  readonly durationUs: number;
}

export interface CounterProposalParams {
  readonly treatyId: string;
  readonly newTerms: TreatyTerms;
}

export interface ReportViolationParams {
  readonly treatyId: string;
  readonly violatorId: string;
  readonly description: string;
}

export interface TreatyEngineStats {
  readonly totalTreaties: number;
  readonly activeTreaties: number;
  readonly proposedTreaties: number;
  readonly brokenTreaties: number;
  readonly expiredTreaties: number;
  readonly terminatedTreaties: number;
}

export interface TreatyHistoryEntry {
  readonly treatyId: string;
  readonly treatyType: TreatyType;
  readonly phase: TreatyPhase;
  readonly otherParty: string;
  readonly proposedAt: number;
}

export interface TreatyEngine {
  readonly propose: (params: ProposeTreatyParams) => TreatyRecord;
  readonly counterPropose: (params: CounterProposalParams) => TreatyRecord;
  readonly sign: (treatyId: string) => TreatyRecord;
  readonly activate: (treatyId: string) => TreatyRecord;
  readonly terminate: (treatyId: string) => TreatyRecord;
  readonly reportViolation: (params: ReportViolationParams) => TreatyRecord;
  readonly getTreaty: (treatyId: string) => TreatyRecord | undefined;
  readonly listByDynasty: (dynastyId: string) => ReadonlyArray<TreatyRecord>;
  readonly listActive: () => ReadonlyArray<TreatyRecord>;
  readonly getHistory: (dynastyId: string) => ReadonlyArray<TreatyHistoryEntry>;
  readonly sweepExpired: () => number;
  readonly getStats: () => TreatyEngineStats;
}

export interface TreatyEngineDeps {
  readonly clock: TreatyClock;
  readonly idGenerator: TreatyIdGenerator;
}

// ── Constants ────────────────────────────────────────────────────

const TERMINAL_PHASES: ReadonlyArray<TreatyPhase> = ['EXPIRED', 'BROKEN', 'TERMINATED'];

const MAX_VIOLATIONS_BEFORE_BREAK = 3;

// ── State ────────────────────────────────────────────────────────

interface MutableViolation {
  readonly violationId: string;
  readonly violatorId: string;
  readonly description: string;
  readonly timestamp: number;
}

interface MutableTreaty {
  readonly treatyId: string;
  readonly treatyType: TreatyType;
  phase: TreatyPhase;
  readonly proposerId: string;
  readonly counterpartyId: string;
  terms: TreatyTerms;
  readonly durationUs: number;
  readonly proposedAt: number;
  signedAt: number;
  activatedAt: number;
  expiresAt: number;
  terminatedAt: number;
  readonly violations: MutableViolation[];
}

interface EngineState {
  readonly deps: TreatyEngineDeps;
  readonly treaties: Map<string, MutableTreaty>;
}

// ── Helpers ──────────────────────────────────────────────────────

function violationToReadonly(v: MutableViolation): TreatyViolation {
  return {
    violationId: v.violationId,
    violatorId: v.violatorId,
    description: v.description,
    timestamp: v.timestamp,
  };
}

function treatyToReadonly(t: MutableTreaty): TreatyRecord {
  return {
    treatyId: t.treatyId,
    treatyType: t.treatyType,
    phase: t.phase,
    proposerId: t.proposerId,
    counterpartyId: t.counterpartyId,
    terms: t.terms,
    durationUs: t.durationUs,
    proposedAt: t.proposedAt,
    signedAt: t.signedAt,
    activatedAt: t.activatedAt,
    expiresAt: t.expiresAt,
    terminatedAt: t.terminatedAt,
    violations: t.violations.map(violationToReadonly),
  };
}

function requireTreaty(state: EngineState, treatyId: string): MutableTreaty {
  const t = state.treaties.get(treatyId);
  if (!t) throw new Error('Treaty ' + treatyId + ' not found');
  return t;
}

function isTerminal(phase: TreatyPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

function requireNonTerminal(treaty: MutableTreaty): void {
  if (isTerminal(treaty.phase)) {
    throw new Error('Treaty ' + treaty.treatyId + ' is in terminal phase ' + treaty.phase);
  }
}

function involvesDynasty(t: MutableTreaty, dynastyId: string): boolean {
  return t.proposerId === dynastyId || t.counterpartyId === dynastyId;
}

function checkExpiry(state: EngineState, treaty: MutableTreaty): void {
  if (treaty.phase !== 'ACTIVE') return;
  if (treaty.expiresAt === 0) return;
  const now = state.deps.clock.nowMicroseconds();
  if (now >= treaty.expiresAt) {
    treaty.phase = 'EXPIRED';
  }
}

// ── Operations ───────────────────────────────────────────────────

function proposeImpl(state: EngineState, params: ProposeTreatyParams): TreatyRecord {
  if (params.proposerId === params.counterpartyId) {
    throw new Error('Cannot propose a treaty with self');
  }
  if (params.durationUs <= 0) {
    throw new Error('Treaty duration must be positive');
  }
  const now = state.deps.clock.nowMicroseconds();
  const treaty: MutableTreaty = {
    treatyId: state.deps.idGenerator.generate(),
    treatyType: params.treatyType,
    phase: 'PROPOSED',
    proposerId: params.proposerId,
    counterpartyId: params.counterpartyId,
    terms: params.terms,
    durationUs: params.durationUs,
    proposedAt: now,
    signedAt: 0,
    activatedAt: 0,
    expiresAt: 0,
    terminatedAt: 0,
    violations: [],
  };
  state.treaties.set(treaty.treatyId, treaty);
  return treatyToReadonly(treaty);
}

function counterProposeImpl(state: EngineState, params: CounterProposalParams): TreatyRecord {
  const treaty = requireTreaty(state, params.treatyId);
  if (treaty.phase !== 'PROPOSED' && treaty.phase !== 'NEGOTIATING') {
    throw new Error('Treaty ' + params.treatyId + ' is not open for negotiation');
  }
  treaty.terms = params.newTerms;
  treaty.phase = 'NEGOTIATING';
  return treatyToReadonly(treaty);
}

function signImpl(state: EngineState, treatyId: string): TreatyRecord {
  const treaty = requireTreaty(state, treatyId);
  if (treaty.phase !== 'PROPOSED' && treaty.phase !== 'NEGOTIATING') {
    throw new Error('Treaty ' + treatyId + ' cannot be signed in phase ' + treaty.phase);
  }
  treaty.phase = 'SIGNED';
  treaty.signedAt = state.deps.clock.nowMicroseconds();
  return treatyToReadonly(treaty);
}

function activateImpl(state: EngineState, treatyId: string): TreatyRecord {
  const treaty = requireTreaty(state, treatyId);
  if (treaty.phase !== 'SIGNED') {
    throw new Error('Treaty ' + treatyId + ' must be SIGNED before activation');
  }
  const now = state.deps.clock.nowMicroseconds();
  treaty.phase = 'ACTIVE';
  treaty.activatedAt = now;
  treaty.expiresAt = now + treaty.durationUs;
  return treatyToReadonly(treaty);
}

function terminateImpl(state: EngineState, treatyId: string): TreatyRecord {
  const treaty = requireTreaty(state, treatyId);
  requireNonTerminal(treaty);
  treaty.phase = 'TERMINATED';
  treaty.terminatedAt = state.deps.clock.nowMicroseconds();
  return treatyToReadonly(treaty);
}

function reportViolationImpl(state: EngineState, params: ReportViolationParams): TreatyRecord {
  const treaty = requireTreaty(state, params.treatyId);
  if (treaty.phase !== 'ACTIVE') {
    throw new Error('Can only report violations on ACTIVE treaties');
  }
  if (!involvesDynasty(treaty, params.violatorId)) {
    throw new Error('Violator ' + params.violatorId + ' is not party to this treaty');
  }
  const violation: MutableViolation = {
    violationId: state.deps.idGenerator.generate(),
    violatorId: params.violatorId,
    description: params.description,
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  treaty.violations.push(violation);
  if (treaty.violations.length >= MAX_VIOLATIONS_BEFORE_BREAK) {
    treaty.phase = 'BROKEN';
    treaty.terminatedAt = state.deps.clock.nowMicroseconds();
  }
  return treatyToReadonly(treaty);
}

function listByDynastyImpl(state: EngineState, dynastyId: string): TreatyRecord[] {
  const results: TreatyRecord[] = [];
  for (const t of state.treaties.values()) {
    checkExpiry(state, t);
    if (involvesDynasty(t, dynastyId)) {
      results.push(treatyToReadonly(t));
    }
  }
  return results;
}

function listActiveImpl(state: EngineState): TreatyRecord[] {
  const results: TreatyRecord[] = [];
  for (const t of state.treaties.values()) {
    checkExpiry(state, t);
    if (t.phase === 'ACTIVE') {
      results.push(treatyToReadonly(t));
    }
  }
  return results;
}

function getHistoryImpl(state: EngineState, dynastyId: string): TreatyHistoryEntry[] {
  const results: TreatyHistoryEntry[] = [];
  for (const t of state.treaties.values()) {
    if (!involvesDynasty(t, dynastyId)) continue;
    const other = t.proposerId === dynastyId ? t.counterpartyId : t.proposerId;
    results.push({
      treatyId: t.treatyId,
      treatyType: t.treatyType,
      phase: t.phase,
      otherParty: other,
      proposedAt: t.proposedAt,
    });
  }
  return results;
}

function sweepExpiredImpl(state: EngineState): number {
  let count = 0;
  for (const t of state.treaties.values()) {
    checkExpiry(state, t);
    if (t.phase === 'ACTIVE') continue;
    if (t.phase === 'EXPIRED') count++;
  }
  return count;
}

function getStatsImpl(state: EngineState): TreatyEngineStats {
  let active = 0;
  let proposed = 0;
  let broken = 0;
  let expired = 0;
  let terminated = 0;
  for (const t of state.treaties.values()) {
    checkExpiry(state, t);
    if (t.phase === 'ACTIVE') active++;
    else if (t.phase === 'PROPOSED' || t.phase === 'NEGOTIATING' || t.phase === 'SIGNED')
      proposed++;
    else if (t.phase === 'BROKEN') broken++;
    else if (t.phase === 'EXPIRED') expired++;
    else terminated++;
  }
  return {
    totalTreaties: state.treaties.size,
    activeTreaties: active,
    proposedTreaties: proposed,
    brokenTreaties: broken,
    expiredTreaties: expired,
    terminatedTreaties: terminated,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTreatyEngine(deps: TreatyEngineDeps): TreatyEngine {
  const state: EngineState = {
    deps,
    treaties: new Map(),
  };
  return {
    propose: (p) => proposeImpl(state, p),
    counterPropose: (p) => counterProposeImpl(state, p),
    sign: (tid) => signImpl(state, tid),
    activate: (tid) => activateImpl(state, tid),
    terminate: (tid) => terminateImpl(state, tid),
    reportViolation: (p) => reportViolationImpl(state, p),
    getTreaty: (tid) => {
      const t = state.treaties.get(tid);
      if (!t) return undefined;
      checkExpiry(state, t);
      return treatyToReadonly(t);
    },
    listByDynasty: (did) => listByDynastyImpl(state, did),
    listActive: () => listActiveImpl(state),
    getHistory: (did) => getHistoryImpl(state, did),
    sweepExpired: () => sweepExpiredImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTreatyEngine, MAX_VIOLATIONS_BEFORE_BREAK };
