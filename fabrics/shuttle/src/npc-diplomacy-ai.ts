/**
 * NPC Diplomacy AI - Autonomous diplomatic decision-making and relationship management
 *
 * NPCs evaluate diplomatic options based on relationship scores, power balance, and betrayal history.
 * Strategies range from appeasement to alliance to betrayal. Trust levels decay after betrayals.
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

export type DiplomaticStrategy =
  | 'APPEASE'
  | 'THREATEN'
  | 'NEGOTIATE'
  | 'IGNORE'
  | 'ALLY'
  | 'BETRAY';

export type RelationshipStatus = 'HOSTILE' | 'UNFRIENDLY' | 'NEUTRAL' | 'FRIENDLY' | 'ALLIED';

export type RelationshipAssessment = {
  dynastyId: string;
  targetDynastyId: string;
  relationshipScore: number; // -100 to 100
  powerBalance: number; // ratio: target power / own power
  trustLevel: number; // 0.0 to 1.0
  status: RelationshipStatus;
  assessedAt: bigint;
};

export type DiplomacyAction = {
  id: string;
  fromDynasty: string;
  toDynasty: string;
  strategy: DiplomaticStrategy;
  risk: number; // 0-100
  expectedReward: number; // 0-100
  executedAt: bigint;
  success: boolean;
};

export type BetrayalRecord = {
  id: string;
  betrayerDynasty: string;
  victimDynasty: string;
  description: string;
  severity: number; // 0-100
  recordedAt: bigint;
};

export type DiplomacyHistory = {
  dynastyId: string;
  actions: DiplomacyAction[];
  betrayalsCommitted: BetrayalRecord[];
  betrayalsSuffered: BetrayalRecord[];
};

export type DiplomacyReport = {
  dynastyId: string;
  relationships: RelationshipAssessment[];
  recentActions: DiplomacyAction[];
  totalBetrayas: number;
  totalBetrayed: number;
  averageTrust: number;
  generatedAt: bigint;
};

export type StrategyWeights = {
  relationshipWeight: number; // 0.0-1.0
  powerWeight: number;
  trustWeight: number;
  historyWeight: number;
};

export type DiplomacyState = {
  relationships: Map<string, RelationshipAssessment>;
  history: Map<string, DiplomacyHistory>;
  actions: Map<string, DiplomacyAction>;
  betrayals: Map<string, BetrayalRecord>;
};

export type DiplomacyError =
  | 'invalid-dynasty'
  | 'invalid-target'
  | 'invalid-score'
  | 'invalid-power'
  | 'invalid-trust'
  | 'invalid-strategy'
  | 'invalid-severity'
  | 'relationship-not-found'
  | 'action-not-found'
  | 'history-not-found';

// ============================================================================
// FACTORY
// ============================================================================

export function createDiplomacyState(): DiplomacyState {
  return {
    relationships: new Map(),
    history: new Map(),
    actions: new Map(),
    betrayals: new Map(),
  };
}

// ============================================================================
// RELATIONSHIP ASSESSMENT
// ============================================================================

export function evaluateRelationship(
  state: DiplomacyState,
  dynastyId: string,
  targetDynastyId: string,
  relationshipScore: number,
  powerBalance: number,
  trustLevel: number,
  clock: Clock,
): RelationshipAssessment | DiplomacyError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';
  if (!targetDynastyId || targetDynastyId.length === 0) return 'invalid-target';
  if (relationshipScore < -100 || relationshipScore > 100) return 'invalid-score';
  if (powerBalance < 0) return 'invalid-power';
  if (trustLevel < 0 || trustLevel > 1) return 'invalid-trust';

  const status = deriveStatus(relationshipScore);
  const key = dynastyId + ':' + targetDynastyId;

  const assessment: RelationshipAssessment = {
    dynastyId,
    targetDynastyId,
    relationshipScore,
    powerBalance,
    trustLevel,
    status,
    assessedAt: clock.now(),
  };

  state.relationships.set(key, assessment);
  return assessment;
}

function deriveStatus(score: number): RelationshipStatus {
  if (score >= 75) return 'ALLIED';
  if (score >= 25) return 'FRIENDLY';
  if (score >= -25) return 'NEUTRAL';
  if (score >= -75) return 'UNFRIENDLY';
  return 'HOSTILE';
}

export function getRelationship(
  state: DiplomacyState,
  dynastyId: string,
  targetDynastyId: string,
): RelationshipAssessment | DiplomacyError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';
  if (!targetDynastyId || targetDynastyId.length === 0) return 'invalid-target';

  const key = dynastyId + ':' + targetDynastyId;
  const rel = state.relationships.get(key);
  if (!rel) return 'relationship-not-found';
  return rel;
}

export function updateRelationshipScore(
  state: DiplomacyState,
  dynastyId: string,
  targetDynastyId: string,
  delta: number,
  clock: Clock,
): RelationshipAssessment | DiplomacyError {
  const rel = getRelationship(state, dynastyId, targetDynastyId);
  if (typeof rel === 'string') return rel;

  const newScore = Math.max(-100, Math.min(100, rel.relationshipScore + delta));
  return evaluateRelationship(
    state,
    dynastyId,
    targetDynastyId,
    newScore,
    rel.powerBalance,
    rel.trustLevel,
    clock,
  );
}

// ============================================================================
// STRATEGY SELECTION
// ============================================================================

export function selectStrategy(
  state: DiplomacyState,
  dynastyId: string,
  targetDynastyId: string,
  weights: StrategyWeights,
): DiplomaticStrategy | DiplomacyError {
  const rel = getRelationship(state, dynastyId, targetDynastyId);
  if (typeof rel === 'string') return rel;

  const score = computeStrategyScore(rel, weights);
  return mapScoreToStrategy(score, rel);
}

function computeStrategyScore(rel: RelationshipAssessment, weights: StrategyWeights): number {
  const relScore = (rel.relationshipScore / 100) * weights.relationshipWeight;
  const powerScore = (Math.min(rel.powerBalance, 2) / 2) * weights.powerWeight;
  const trustScore = rel.trustLevel * weights.trustWeight;
  return relScore + powerScore + trustScore;
}

function mapScoreToStrategy(score: number, rel: RelationshipAssessment): DiplomaticStrategy {
  if (score >= 2.4) return 'ALLY';
  if (rel.powerBalance > 2.0) return 'THREATEN';
  if (score >= 1.7) return 'NEGOTIATE';
  if (rel.powerBalance <= 0.5 && score >= 1.2) return 'NEGOTIATE';
  if (score >= 1.1) return 'APPEASE';
  if (score >= 0.8) return 'IGNORE';
  if (rel.powerBalance < 0.5) return 'THREATEN';
  if (rel.trustLevel < 0.3) return 'BETRAY';
  return 'THREATEN';
}

// ============================================================================
// DIPLOMACY EXECUTION
// ============================================================================

export function executeDiplomacy(
  state: DiplomacyState,
  fromDynasty: string,
  toDynasty: string,
  strategy: DiplomaticStrategy,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): DiplomacyAction | DiplomacyError {
  if (!fromDynasty || fromDynasty.length === 0) return 'invalid-dynasty';
  if (!toDynasty || toDynasty.length === 0) return 'invalid-target';
  if (!isValidStrategy(strategy)) return 'invalid-strategy';

  const rel = getRelationship(state, fromDynasty, toDynasty);
  if (typeof rel === 'string') return rel;

  const risk = calculateRisk(strategy, rel);
  const reward = calculateReward(strategy, rel);
  const success = Math.random() > risk / 100;

  const action: DiplomacyAction = {
    id: idGen.generate(),
    fromDynasty,
    toDynasty,
    strategy,
    risk,
    expectedReward: reward,
    executedAt: clock.now(),
    success,
  };

  state.actions.set(action.id, action);
  appendToHistory(state, fromDynasty, action);

  const msg = 'Diplomacy: ' + fromDynasty + ' -> ' + toDynasty + ' (' + strategy + ')';
  logger.info(msg);

  return action;
}

function isValidStrategy(strategy: DiplomaticStrategy): boolean {
  const valid: DiplomaticStrategy[] = [
    'APPEASE',
    'THREATEN',
    'NEGOTIATE',
    'IGNORE',
    'ALLY',
    'BETRAY',
  ];
  return valid.includes(strategy);
}

function calculateRisk(strategy: DiplomaticStrategy, rel: RelationshipAssessment): number {
  switch (strategy) {
    case 'APPEASE':
      return 10;
    case 'IGNORE':
      return 5;
    case 'NEGOTIATE':
      return 25 + (rel.relationshipScore < 0 ? 20 : 0);
    case 'ALLY':
      return 35 + (rel.status === 'HOSTILE' ? 40 : 0);
    case 'THREATEN':
      return 50 + (rel.powerBalance > 1.5 ? 30 : 0);
    case 'BETRAY':
      return 80 + (rel.trustLevel > 0.5 ? 15 : 0);
  }
}

function calculateReward(strategy: DiplomaticStrategy, rel: RelationshipAssessment): number {
  switch (strategy) {
    case 'APPEASE':
      return 15;
    case 'IGNORE':
      return 0;
    case 'NEGOTIATE':
      return 40 + (rel.status === 'FRIENDLY' ? 15 : 0);
    case 'ALLY':
      return 70 + (rel.relationshipScore > 50 ? 20 : 0);
    case 'THREATEN':
      return 30 + (rel.powerBalance < 0.7 ? 25 : 0);
    case 'BETRAY':
      return 90 + (rel.trustLevel > 0.7 ? 10 : 0);
  }
}

function appendToHistory(state: DiplomacyState, dynastyId: string, action: DiplomacyAction): void {
  let history = state.history.get(dynastyId);
  if (!history) {
    history = {
      dynastyId,
      actions: [],
      betrayalsCommitted: [],
      betrayalsSuffered: [],
    };
    state.history.set(dynastyId, history);
  }
  history.actions.push(action);
}

// ============================================================================
// BETRAYAL MANAGEMENT
// ============================================================================

export function recordBetrayal(
  state: DiplomacyState,
  betrayerDynasty: string,
  victimDynasty: string,
  description: string,
  severity: number,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): BetrayalRecord | DiplomacyError {
  if (!betrayerDynasty || betrayerDynasty.length === 0) return 'invalid-dynasty';
  if (!victimDynasty || victimDynasty.length === 0) return 'invalid-target';
  if (severity < 0 || severity > 100) return 'invalid-severity';

  const record: BetrayalRecord = {
    id: idGen.generate(),
    betrayerDynasty,
    victimDynasty,
    description,
    severity,
    recordedAt: clock.now(),
  };

  state.betrayals.set(record.id, record);

  const betrayerHistory = ensureHistory(state, betrayerDynasty);
  betrayerHistory.betrayalsCommitted.push(record);

  const victimHistory = ensureHistory(state, victimDynasty);
  victimHistory.betrayalsSuffered.push(record);

  const rel = getRelationship(state, victimDynasty, betrayerDynasty);
  if (typeof rel !== 'string') {
    const trustPenalty = (severity / 100) * 0.5;
    const newTrust = Math.max(0, rel.trustLevel - trustPenalty);
    const newScore = Math.max(-100, rel.relationshipScore - severity);
    evaluateRelationship(
      state,
      victimDynasty,
      betrayerDynasty,
      newScore,
      rel.powerBalance,
      newTrust,
      clock,
    );
  }

  const msg =
    'Betrayal: ' +
    betrayerDynasty +
    ' betrayed ' +
    victimDynasty +
    ' (severity ' +
    String(severity) +
    ')';
  logger.error(msg);

  return record;
}

function ensureHistory(state: DiplomacyState, dynastyId: string): DiplomacyHistory {
  let history = state.history.get(dynastyId);
  if (!history) {
    history = {
      dynastyId,
      actions: [],
      betrayalsCommitted: [],
      betrayalsSuffered: [],
    };
    state.history.set(dynastyId, history);
  }
  return history;
}

// ============================================================================
// TRUST CALCULATION
// ============================================================================

export function computeTrustLevel(
  state: DiplomacyState,
  dynastyId: string,
  targetDynastyId: string,
): number | DiplomacyError {
  const targetHistory = state.history.get(targetDynastyId);
  if (!targetHistory) return 1.0;

  const betrayalsAgainst = targetHistory.betrayalsCommitted.filter(
    (b) => b.victimDynasty === dynastyId,
  );

  if (betrayalsAgainst.length === 0) return 1.0;

  let totalSeverity = 0;
  for (const b of betrayalsAgainst) {
    totalSeverity = totalSeverity + b.severity;
  }

  const avgSeverity = totalSeverity / betrayalsAgainst.length;
  const countPenalty = Math.min(betrayalsAgainst.length * 0.1, 0.5);
  const severityPenalty = (avgSeverity / 100) * 0.4;

  return Math.max(0, 1.0 - countPenalty - severityPenalty);
}

export function getDiplomacyHistory(
  state: DiplomacyState,
  dynastyId: string,
): DiplomacyHistory | DiplomacyError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';
  const history = state.history.get(dynastyId);
  if (!history) return 'history-not-found';
  return history;
}

// ============================================================================
// REPORTING
// ============================================================================

export function getDiplomacyReport(
  state: DiplomacyState,
  dynastyId: string,
  clock: Clock,
): DiplomacyReport | DiplomacyError {
  if (!dynastyId || dynastyId.length === 0) return 'invalid-dynasty';

  const relationships: RelationshipAssessment[] = [];
  for (const [key, rel] of state.relationships) {
    if (rel.dynastyId === dynastyId) {
      relationships.push(rel);
    }
  }

  const history = state.history.get(dynastyId);
  const recentActions = history ? history.actions.slice(-10) : [];
  const totalBetrayas = history ? history.betrayalsCommitted.length : 0;
  const totalBetrayed = history ? history.betrayalsSuffered.length : 0;

  let trustSum = 0;
  for (const rel of relationships) {
    trustSum = trustSum + rel.trustLevel;
  }
  const averageTrust = relationships.length > 0 ? trustSum / relationships.length : 1.0;

  return {
    dynastyId,
    relationships,
    recentActions,
    totalBetrayas,
    totalBetrayed,
    averageTrust,
    generatedAt: clock.now(),
  };
}

export function getAllRelationships(
  state: DiplomacyState,
  dynastyId: string,
): RelationshipAssessment[] {
  const results: RelationshipAssessment[] = [];
  for (const [key, rel] of state.relationships) {
    if (rel.dynastyId === dynastyId) {
      results.push(rel);
    }
  }
  return results;
}

export function getBetrayalsBetween(
  state: DiplomacyState,
  dynastyA: string,
  dynastyB: string,
): BetrayalRecord[] {
  const results: BetrayalRecord[] = [];
  for (const [id, record] of state.betrayals) {
    const match =
      (record.betrayerDynasty === dynastyA && record.victimDynasty === dynastyB) ||
      (record.betrayerDynasty === dynastyB && record.victimDynasty === dynastyA);
    if (match) {
      results.push(record);
    }
  }
  return results;
}
