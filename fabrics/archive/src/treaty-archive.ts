/**
 * Treaty Archive - Treaty storage, compliance monitoring, and violation tracking
 *
 * Records treaties with full terms, parties, dates, and obligations. Monitors compliance,
 * flags violations, computes treaty health scores, and alerts on upcoming expirations.
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type TreatyStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'VIOLATED' | 'TERMINATED';

export type ObligationType =
  | 'TRIBUTE'
  | 'MILITARY_SUPPORT'
  | 'TRADE_AGREEMENT'
  | 'NON_AGGRESSION'
  | 'TECHNOLOGY_SHARING'
  | 'BORDER_RESPECT'
  | 'CULTURAL_EXCHANGE';

export type Treaty = {
  id: string;
  name: string;
  parties: string[]; // dynastyIds
  effectiveDate: bigint;
  expiryDate: bigint | null; // null = perpetual
  status: TreatyStatus;
  terms: string[]; // term IDs
  createdAt: bigint;
};

export type TreatyTerm = {
  id: string;
  treatyId: string;
  obligationType: ObligationType;
  obligatedParty: string; // dynastyId
  beneficiary: string; // dynastyId
  description: string;
  penalty: bigint; // KALON
  recurringInterval: bigint | null; // microseconds, null = one-time
  nextDueDate: bigint | null;
};

export type ComplianceEvent = {
  id: string;
  treatyId: string;
  termId: string;
  obligatedParty: string;
  complied: boolean;
  eventDate: bigint;
  notes: string;
};

export type ViolationRecord = {
  id: string;
  treatyId: string;
  termId: string;
  violatorDynasty: string;
  severity: number; // 0-100
  description: string;
  penaltyAssessed: bigint; // KALON
  recordedAt: bigint;
};

export type TreatyHealth = {
  treatyId: string;
  healthScore: number; // 0-100
  complianceRate: number; // 0.0-1.0
  totalComplianceEvents: number;
  totalViolations: number;
  violationSeverityAvg: number;
  status: TreatyStatus;
  computedAt: bigint;
};

export type ExpiryAlert = {
  id: string;
  treatyId: string;
  treatyName: string;
  expiryDate: bigint;
  daysRemaining: number;
  alertLevel: 'INFO' | 'WARNING' | 'URGENT';
  createdAt: bigint;
};

export type TreatyReport = {
  treatyId: string;
  treaty: Treaty;
  health: TreatyHealth;
  recentCompliance: ComplianceEvent[];
  recentViolations: ViolationRecord[];
  expiryAlert: ExpiryAlert | null;
  generatedAt: bigint;
};

export type TreatyState = {
  treaties: Map<string, Treaty>;
  terms: Map<string, TreatyTerm>;
  compliance: Map<string, ComplianceEvent>;
  violations: Map<string, ViolationRecord>;
  alerts: Map<string, ExpiryAlert>;
};

export type TreatyError =
  | 'invalid-treaty'
  | 'invalid-term'
  | 'invalid-party'
  | 'invalid-date'
  | 'invalid-status'
  | 'invalid-obligation'
  | 'invalid-severity'
  | 'invalid-penalty'
  | 'treaty-not-found'
  | 'term-not-found'
  | 'compliance-not-found'
  | 'violation-not-found'
  | 'alert-not-found';

// ============================================================================
// FACTORY
// ============================================================================

export function createTreatyState(): TreatyState {
  return {
    treaties: new Map(),
    terms: new Map(),
    compliance: new Map(),
    violations: new Map(),
    alerts: new Map(),
  };
}

// ============================================================================
// TREATY MANAGEMENT
// ============================================================================

export function recordTreaty(
  state: TreatyState,
  name: string,
  parties: string[],
  effectiveDate: bigint,
  expiryDate: bigint | null,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): Treaty | TreatyError {
  if (!name || name.length === 0) return 'invalid-treaty';
  if (!parties || parties.length < 2) return 'invalid-party';
  if (effectiveDate < 0n) return 'invalid-date';
  if (expiryDate !== null && expiryDate <= effectiveDate) return 'invalid-date';

  const treaty: Treaty = {
    id: idGen.generate(),
    name,
    parties,
    effectiveDate,
    expiryDate,
    status: 'ACTIVE',
    terms: [],
    createdAt: clock.now(),
  };

  state.treaties.set(treaty.id, treaty);

  const msg = 'Treaty recorded: ' + name + ' between ' + String(parties.length) + ' parties';
  logger.info(msg);

  return treaty;
}

export function getTreaty(state: TreatyState, treatyId: string): Treaty | TreatyError {
  if (!treatyId || treatyId.length === 0) return 'invalid-treaty';
  const treaty = state.treaties.get(treatyId);
  if (!treaty) return 'treaty-not-found';
  return treaty;
}

export function updateTreatyStatus(
  state: TreatyState,
  treatyId: string,
  status: TreatyStatus,
  logger: Logger,
): Treaty | TreatyError {
  const treaty = getTreaty(state, treatyId);
  if (typeof treaty === 'string') return treaty;

  if (!isValidStatus(status)) return 'invalid-status';

  treaty.status = status;

  const msg = 'Treaty ' + treaty.name + ' status: ' + status;
  logger.info(msg);

  return treaty;
}

function isValidStatus(status: TreatyStatus): boolean {
  const valid: TreatyStatus[] = ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'VIOLATED', 'TERMINATED'];
  return valid.includes(status);
}

export function terminateTreaty(
  state: TreatyState,
  treatyId: string,
  logger: Logger,
): Treaty | TreatyError {
  return updateTreatyStatus(state, treatyId, 'TERMINATED', logger);
}

// ============================================================================
// TREATY TERMS
// ============================================================================

export function addTerm(
  state: TreatyState,
  treatyId: string,
  obligationType: ObligationType,
  obligatedParty: string,
  beneficiary: string,
  description: string,
  penalty: bigint,
  recurringInterval: bigint | null,
  idGen: IdGenerator,
  clock: Clock,
): TreatyTerm | TreatyError {
  const treaty = getTreaty(state, treatyId);
  if (typeof treaty === 'string') return treaty;

  if (!isValidObligation(obligationType)) return 'invalid-obligation';
  if (!obligatedParty || obligatedParty.length === 0) return 'invalid-party';
  if (!beneficiary || beneficiary.length === 0) return 'invalid-party';
  if (penalty < 0n) return 'invalid-penalty';

  const nextDueDate = recurringInterval ? clock.now() + recurringInterval : null;

  const term: TreatyTerm = {
    id: idGen.generate(),
    treatyId,
    obligationType,
    obligatedParty,
    beneficiary,
    description,
    penalty,
    recurringInterval,
    nextDueDate,
  };

  state.terms.set(term.id, term);
  treaty.terms.push(term.id);

  return term;
}

function isValidObligation(obligation: ObligationType): boolean {
  const valid: ObligationType[] = [
    'TRIBUTE',
    'MILITARY_SUPPORT',
    'TRADE_AGREEMENT',
    'NON_AGGRESSION',
    'TECHNOLOGY_SHARING',
    'BORDER_RESPECT',
    'CULTURAL_EXCHANGE',
  ];
  return valid.includes(obligation);
}

export function getTerm(state: TreatyState, termId: string): TreatyTerm | TreatyError {
  if (!termId || termId.length === 0) return 'invalid-term';
  const term = state.terms.get(termId);
  if (!term) return 'term-not-found';
  return term;
}

export function updateNextDueDate(
  state: TreatyState,
  termId: string,
  nextDueDate: bigint,
): TreatyTerm | TreatyError {
  const term = getTerm(state, termId);
  if (typeof term === 'string') return term;

  if (nextDueDate < 0n) return 'invalid-date';

  term.nextDueDate = nextDueDate;
  return term;
}

export function getTermsByTreaty(state: TreatyState, treatyId: string): TreatyTerm[] {
  const results: TreatyTerm[] = [];
  for (const [id, term] of state.terms) {
    if (term.treatyId === treatyId) {
      results.push(term);
    }
  }
  return results;
}

// ============================================================================
// COMPLIANCE MONITORING
// ============================================================================

export function recordCompliance(
  state: TreatyState,
  treatyId: string,
  termId: string,
  obligatedParty: string,
  complied: boolean,
  notes: string,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): ComplianceEvent | TreatyError {
  const treaty = getTreaty(state, treatyId);
  if (typeof treaty === 'string') return treaty;

  const term = getTerm(state, termId);
  if (typeof term === 'string') return term;

  if (!obligatedParty || obligatedParty.length === 0) return 'invalid-party';

  const event: ComplianceEvent = {
    id: idGen.generate(),
    treatyId,
    termId,
    obligatedParty,
    complied,
    eventDate: clock.now(),
    notes,
  };

  state.compliance.set(event.id, event);

  if (term.recurringInterval && term.nextDueDate) {
    const newDue = term.nextDueDate + term.recurringInterval;
    updateNextDueDate(state, termId, newDue);
  }

  const status = complied ? 'complied with' : 'failed';
  const msg = obligatedParty + ' ' + status + ' term ' + termId;
  logger.info(msg);

  return event;
}

export function getComplianceEvents(state: TreatyState, treatyId: string): ComplianceEvent[] {
  const results: ComplianceEvent[] = [];
  for (const [id, event] of state.compliance) {
    if (event.treatyId === treatyId) {
      results.push(event);
    }
  }
  results.sort((a, b) => (a.eventDate > b.eventDate ? -1 : 1));
  return results;
}

export function getComplianceByParty(
  state: TreatyState,
  treatyId: string,
  partyId: string,
): ComplianceEvent[] {
  const events = getComplianceEvents(state, treatyId);
  return events.filter((e) => e.obligatedParty === partyId);
}

// ============================================================================
// VIOLATION TRACKING
// ============================================================================

export function recordViolation(
  state: TreatyState,
  treatyId: string,
  termId: string,
  violatorDynasty: string,
  severity: number,
  description: string,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): ViolationRecord | TreatyError {
  const treaty = getTreaty(state, treatyId);
  if (typeof treaty === 'string') return treaty;

  const term = getTerm(state, termId);
  if (typeof term === 'string') return term;

  if (!violatorDynasty || violatorDynasty.length === 0) return 'invalid-party';
  if (severity < 0 || severity > 100) return 'invalid-severity';

  const penaltyAssessed = term.penalty + (BigInt(severity) * term.penalty) / 100n;

  const violation: ViolationRecord = {
    id: idGen.generate(),
    treatyId,
    termId,
    violatorDynasty,
    severity,
    description,
    penaltyAssessed,
    recordedAt: clock.now(),
  };

  state.violations.set(violation.id, violation);

  if (severity >= 75) {
    updateTreatyStatus(state, treatyId, 'VIOLATED', logger);
  }

  const msg =
    'Treaty violation: ' +
    violatorDynasty +
    ' violated ' +
    treaty.name +
    ' (severity ' +
    String(severity) +
    ')';
  logger.error(msg);

  return violation;
}

export function getViolations(state: TreatyState, treatyId: string): ViolationRecord[] {
  const results: ViolationRecord[] = [];
  for (const [id, violation] of state.violations) {
    if (violation.treatyId === treatyId) {
      results.push(violation);
    }
  }
  results.sort((a, b) => (a.recordedAt > b.recordedAt ? -1 : 1));
  return results;
}

export function getViolationsByParty(
  state: TreatyState,
  treatyId: string,
  partyId: string,
): ViolationRecord[] {
  const violations = getViolations(state, treatyId);
  return violations.filter((v) => v.violatorDynasty === partyId);
}

// ============================================================================
// TREATY HEALTH
// ============================================================================

export function computeHealth(
  state: TreatyState,
  treatyId: string,
  clock: Clock,
): TreatyHealth | TreatyError {
  const treaty = getTreaty(state, treatyId);
  if (typeof treaty === 'string') return treaty;

  const complianceEvents = getComplianceEvents(state, treatyId);
  const violations = getViolations(state, treatyId);

  let compliedCount = 0;
  for (const event of complianceEvents) {
    if (event.complied) {
      compliedCount = compliedCount + 1;
    }
  }

  const complianceRate =
    complianceEvents.length > 0 ? compliedCount / complianceEvents.length : 1.0;

  let totalSeverity = 0;
  for (const violation of violations) {
    totalSeverity = totalSeverity + violation.severity;
  }

  const violationSeverityAvg = violations.length > 0 ? totalSeverity / violations.length : 0;

  const healthScore = calculateHealthScore(complianceRate, violations.length, violationSeverityAvg);

  return {
    treatyId,
    healthScore,
    complianceRate,
    totalComplianceEvents: complianceEvents.length,
    totalViolations: violations.length,
    violationSeverityAvg,
    status: treaty.status,
    computedAt: clock.now(),
  };
}

function calculateHealthScore(
  complianceRate: number,
  violationCount: number,
  avgSeverity: number,
): number {
  const complianceScore = complianceRate * 60;
  const violationPenalty = Math.min(violationCount * 5, 30);
  const severityPenalty = (avgSeverity / 100) * 20;

  const score = complianceScore - violationPenalty - severityPenalty;
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// EXPIRY ALERTS
// ============================================================================

export function getExpiryAlerts(
  state: TreatyState,
  thresholdDays: number,
  clock: Clock,
  idGen: IdGenerator,
): ExpiryAlert[] {
  const results: ExpiryAlert[] = [];
  const now = clock.now();
  const microsecondsPerDay = 86400n * 1000000n;
  const threshold = BigInt(thresholdDays) * microsecondsPerDay;

  for (const [id, treaty] of state.treaties) {
    if (treaty.expiryDate === null) continue;
    if (treaty.status !== 'ACTIVE') continue;

    const timeRemaining = treaty.expiryDate - now;
    if (timeRemaining > threshold) continue;

    const daysRemaining = Number(timeRemaining / microsecondsPerDay);
    const alertLevel = determineAlertLevel(daysRemaining);

    const existingAlert = findAlertForTreaty(state, treaty.id);
    if (existingAlert) {
      existingAlert.daysRemaining = daysRemaining;
      existingAlert.alertLevel = alertLevel;
      continue;
    }

    const alert: ExpiryAlert = {
      id: idGen.generate(),
      treatyId: treaty.id,
      treatyName: treaty.name,
      expiryDate: treaty.expiryDate,
      daysRemaining,
      alertLevel,
      createdAt: now,
    };

    state.alerts.set(alert.id, alert);
    results.push(alert);
  }

  results.sort((a, b) => (a.daysRemaining < b.daysRemaining ? -1 : 1));
  return results;
}

function findAlertForTreaty(state: TreatyState, treatyId: string): ExpiryAlert | null {
  for (const [id, alert] of state.alerts) {
    if (alert.treatyId === treatyId) {
      return alert;
    }
  }
  return null;
}

function determineAlertLevel(daysRemaining: number): 'INFO' | 'WARNING' | 'URGENT' {
  if (daysRemaining <= 7) return 'URGENT';
  if (daysRemaining <= 30) return 'WARNING';
  return 'INFO';
}

export function clearExpiredAlerts(state: TreatyState, clock: Clock): number {
  const now = clock.now();
  let cleared = 0;

  const toDelete: string[] = [];
  for (const [id, alert] of state.alerts) {
    if (alert.expiryDate < now) {
      toDelete.push(id);
    }
  }

  for (const id of toDelete) {
    state.alerts.delete(id);
    cleared = cleared + 1;
  }

  return cleared;
}

// ============================================================================
// AUTOMATIC EXPIRY PROCESSING
// ============================================================================

export function processExpiredTreaties(state: TreatyState, clock: Clock, logger: Logger): number {
  const now = clock.now();
  let expired = 0;

  for (const [id, treaty] of state.treaties) {
    if (treaty.expiryDate === null) continue;
    if (treaty.status !== 'ACTIVE') continue;
    if (treaty.expiryDate > now) continue;

    updateTreatyStatus(state, treaty.id, 'EXPIRED', logger);
    expired = expired + 1;
  }

  return expired;
}

// ============================================================================
// REPORTING
// ============================================================================

export function getTreatyReport(
  state: TreatyState,
  treatyId: string,
  clock: Clock,
): TreatyReport | TreatyError {
  const treaty = getTreaty(state, treatyId);
  if (typeof treaty === 'string') return treaty;

  const health = computeHealth(state, treatyId, clock);
  if (typeof health === 'string') return health;

  const complianceEvents = getComplianceEvents(state, treatyId);
  const recentCompliance = complianceEvents.slice(0, 10);

  const violations = getViolations(state, treatyId);
  const recentViolations = violations.slice(0, 10);

  const expiryAlert = findAlertForTreaty(state, treatyId);

  return {
    treatyId,
    treaty,
    health,
    recentCompliance,
    recentViolations,
    expiryAlert,
    generatedAt: clock.now(),
  };
}

export function getAllTreaties(state: TreatyState): Treaty[] {
  const results: Treaty[] = [];
  for (const [id, treaty] of state.treaties) {
    results.push(treaty);
  }
  results.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  return results;
}

export function getTreatiesByParty(state: TreatyState, partyId: string): Treaty[] {
  const results: Treaty[] = [];
  for (const [id, treaty] of state.treaties) {
    if (treaty.parties.includes(partyId)) {
      results.push(treaty);
    }
  }
  return results;
}

export function getTreatiesByStatus(state: TreatyState, status: TreatyStatus): Treaty[] {
  const results: Treaty[] = [];
  for (const [id, treaty] of state.treaties) {
    if (treaty.status === status) {
      results.push(treaty);
    }
  }
  return results;
}

export function getActiveTreaties(state: TreatyState): Treaty[] {
  return getTreatiesByStatus(state, 'ACTIVE');
}

export function getOverdueTreaties(state: TreatyState, clock: Clock): Treaty[] {
  const results: Treaty[] = [];
  const now = clock.now();

  for (const [id, treaty] of state.treaties) {
    if (treaty.status !== 'ACTIVE') continue;

    const terms = getTermsByTreaty(state, treaty.id);
    for (const term of terms) {
      if (term.nextDueDate && term.nextDueDate < now) {
        results.push(treaty);
        break;
      }
    }
  }

  return results;
}
