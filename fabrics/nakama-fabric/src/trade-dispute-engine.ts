/**
 * Trade Dispute Engine — Resolution system for contested trades.
 *
 * Bible v1.2: When a trade goes sideways, either party can file a dispute.
 * Disputes follow a lifecycle:
 *
 *   FILED        -> Initial dispute filing by buyer or seller
 *   UNDER_REVIEW -> Dispute acknowledged, evidence collection begins
 *   MEDIATION    -> Arbitrator assigned, mediating between parties
 *   RESOLVED     -> Final resolution applied (terminal)
 *   ESCALATED    -> Dispute escalated to The Assembly (terminal for engine)
 *
 * Resolution types:
 *   REFUND          -> Full refund to buyer
 *   PARTIAL_REFUND  -> Partial refund, remainder to seller
 *   COMPLETE_TRADE  -> Trade completes as originally intended
 *   PENALTY         -> Penalty applied to the at-fault party
 *
 * Arbitration eligibility requires a minimum civic score threshold.
 * Dispute outcomes affect dynasty reputation.
 */

// ── Port Types ─────────────────────────────────────────────────────

export interface DisputeClock {
  readonly nowMicroseconds: () => number;
}

export interface DisputeIdGenerator {
  readonly generate: () => string;
}

export interface CivicScorePort {
  readonly getScore: (dynastyId: string) => number;
}

export interface DisputeReputationPort {
  readonly applyPenalty: (dynastyId: string, amount: number) => void;
}

// ── Types ──────────────────────────────────────────────────────────

export type DisputePhase = 'FILED' | 'UNDER_REVIEW' | 'MEDIATION' | 'RESOLVED' | 'ESCALATED';

export type ResolutionType = 'REFUND' | 'PARTIAL_REFUND' | 'COMPLETE_TRADE' | 'PENALTY';

export interface EvidenceEntry {
  readonly submittedBy: string;
  readonly text: string;
  readonly submittedAt: number;
}

export interface DisputeResolution {
  readonly type: ResolutionType;
  readonly resolvedBy: string;
  readonly resolvedAt: number;
  readonly refundAmount: bigint;
  readonly penaltyAmount: bigint;
  readonly reason: string;
}

export interface TradeDispute {
  readonly disputeId: string;
  readonly tradeOfferId: string;
  readonly filedBy: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly tradeAmount: bigint;
  readonly phase: DisputePhase;
  readonly evidence: ReadonlyArray<EvidenceEntry>;
  readonly arbitratorId: string | null;
  readonly resolution: DisputeResolution | null;
  readonly filedAt: number;
  readonly updatedAt: number;
}

export interface FileDisputeParams {
  readonly tradeOfferId: string;
  readonly filedBy: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly tradeAmount: bigint;
  readonly reason: string;
}

export interface ResolveDisputeParams {
  readonly disputeId: string;
  readonly resolvedBy: string;
  readonly type: ResolutionType;
  readonly refundAmount?: bigint;
  readonly penaltyAmount?: bigint;
  readonly reason: string;
}

export interface DisputeEngineConfig {
  readonly minCivicScoreForArbitration: number;
  readonly maxEvidenceEntries: number;
  readonly reputationPenaltyOnFault: number;
}

export interface DisputeEngineDeps {
  readonly clock: DisputeClock;
  readonly idGenerator: DisputeIdGenerator;
  readonly civicScore: CivicScorePort;
  readonly reputation: DisputeReputationPort;
  readonly config?: Partial<DisputeEngineConfig>;
}

export interface DisputeStats {
  readonly totalFiled: number;
  readonly totalResolved: number;
  readonly totalEscalated: number;
  readonly activeDisputes: number;
  readonly resolutionsByType: Readonly<Record<ResolutionType, number>>;
}

export interface TradeDisputeEngine {
  readonly fileDispute: (params: FileDisputeParams) => TradeDispute;
  readonly beginReview: (disputeId: string) => TradeDispute;
  readonly assignArbitrator: (disputeId: string, arbitratorId: string) => TradeDispute;
  readonly submitEvidence: (disputeId: string, submittedBy: string, text: string) => TradeDispute;
  readonly resolve: (params: ResolveDisputeParams) => TradeDispute;
  readonly escalate: (disputeId: string) => TradeDispute;
  readonly getDispute: (disputeId: string) => TradeDispute | undefined;
  readonly listByTradeOffer: (tradeOfferId: string) => ReadonlyArray<TradeDispute>;
  readonly listByDynasty: (dynastyId: string) => ReadonlyArray<TradeDispute>;
  readonly listActive: () => ReadonlyArray<TradeDispute>;
  readonly getStats: () => DisputeStats;
}

// ── Constants ──────────────────────────────────────────────────────

export const DEFAULT_DISPUTE_CONFIG: DisputeEngineConfig = {
  minCivicScoreForArbitration: 5000,
  maxEvidenceEntries: 20,
  reputationPenaltyOnFault: -50,
};

const TERMINAL_PHASES: ReadonlyArray<DisputePhase> = ['RESOLVED', 'ESCALATED'];

// ── State ──────────────────────────────────────────────────────────

interface MutableDispute {
  readonly disputeId: string;
  readonly tradeOfferId: string;
  readonly filedBy: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly tradeAmount: bigint;
  phase: DisputePhase;
  readonly evidence: EvidenceEntry[];
  arbitratorId: string | null;
  resolution: DisputeResolution | null;
  readonly filedAt: number;
  updatedAt: number;
}

interface DisputeState {
  readonly disputes: Map<string, MutableDispute>;
  readonly clock: DisputeClock;
  readonly idGenerator: DisputeIdGenerator;
  readonly civicScore: CivicScorePort;
  readonly reputation: DisputeReputationPort;
  readonly config: DisputeEngineConfig;
  totalFiled: number;
  totalResolved: number;
  totalEscalated: number;
  resolutionCounts: Record<ResolutionType, number>;
}

// ── Factory ────────────────────────────────────────────────────────

function initDisputeState(deps: DisputeEngineDeps): DisputeState {
  return {
    disputes: new Map(),
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    civicScore: deps.civicScore,
    reputation: deps.reputation,
    config: mergeConfig(deps.config),
    totalFiled: 0,
    totalResolved: 0,
    totalEscalated: 0,
    resolutionCounts: { REFUND: 0, PARTIAL_REFUND: 0, COMPLETE_TRADE: 0, PENALTY: 0 },
  };
}

export function createTradeDisputeEngine(deps: DisputeEngineDeps): TradeDisputeEngine {
  const state = initDisputeState(deps);
  return buildDisputeEngine(state);
}

function buildDisputeEngine(state: DisputeState): TradeDisputeEngine {
  return {
    fileDispute: (p) => fileDisputeImpl(state, p),
    beginReview: (did) => beginReviewImpl(state, did),
    assignArbitrator: (did, aid) => assignArbitratorImpl(state, did, aid),
    submitEvidence: (did, by, text) => submitEvidenceImpl(state, did, by, text),
    resolve: (p) => resolveImpl(state, p),
    escalate: (did) => escalateImpl(state, did),
    getDispute: (did) => getDisputeImpl(state, did),
    listByTradeOffer: (oid) => listByTradeOfferImpl(state, oid),
    listByDynasty: (did) => listByDynastyImpl(state, did),
    listActive: () => listActiveImpl(state),
    getStats: () => computeStats(state),
  };
}

function mergeConfig(overrides?: Partial<DisputeEngineConfig>): DisputeEngineConfig {
  if (overrides === undefined) return DEFAULT_DISPUTE_CONFIG;
  return {
    minCivicScoreForArbitration:
      overrides.minCivicScoreForArbitration ?? DEFAULT_DISPUTE_CONFIG.minCivicScoreForArbitration,
    maxEvidenceEntries: overrides.maxEvidenceEntries ?? DEFAULT_DISPUTE_CONFIG.maxEvidenceEntries,
    reputationPenaltyOnFault:
      overrides.reputationPenaltyOnFault ?? DEFAULT_DISPUTE_CONFIG.reputationPenaltyOnFault,
  };
}

// ── File Dispute ───────────────────────────────────────────────────

function fileDisputeImpl(state: DisputeState, params: FileDisputeParams): TradeDispute {
  validateFilingParams(params);
  const now = state.clock.nowMicroseconds();
  const disputeId = state.idGenerator.generate();
  const dispute: MutableDispute = {
    disputeId,
    tradeOfferId: params.tradeOfferId,
    filedBy: params.filedBy,
    buyerId: params.buyerId,
    sellerId: params.sellerId,
    tradeAmount: params.tradeAmount,
    phase: 'FILED',
    evidence: [{ submittedBy: params.filedBy, text: params.reason, submittedAt: now }],
    arbitratorId: null,
    resolution: null,
    filedAt: now,
    updatedAt: now,
  };
  state.disputes.set(disputeId, dispute);
  state.totalFiled++;
  return toReadonly(dispute);
}

function validateFilingParams(params: FileDisputeParams): void {
  const isParty = params.filedBy === params.buyerId || params.filedBy === params.sellerId;
  if (!isParty) {
    throw new Error('Only buyer or seller can file a dispute');
  }
  if (params.reason.length === 0) {
    throw new Error('Dispute reason cannot be empty');
  }
  if (params.tradeAmount <= 0n) {
    throw new Error('Trade amount must be positive');
  }
}

// ── Begin Review ───────────────────────────────────────────────────

function beginReviewImpl(state: DisputeState, disputeId: string): TradeDispute {
  const dispute = requireDispute(state, disputeId);
  if (dispute.phase !== 'FILED') {
    throw new Error('Dispute ' + disputeId + ' is not in FILED phase');
  }
  dispute.phase = 'UNDER_REVIEW';
  dispute.updatedAt = state.clock.nowMicroseconds();
  return toReadonly(dispute);
}

// ── Assign Arbitrator ──────────────────────────────────────────────

function assignArbitratorImpl(
  state: DisputeState,
  disputeId: string,
  arbitratorId: string,
): TradeDispute {
  const dispute = requireDispute(state, disputeId);
  if (dispute.phase !== 'UNDER_REVIEW') {
    throw new Error('Dispute ' + disputeId + ' must be UNDER_REVIEW to assign arbitrator');
  }
  validateArbitrator(state, dispute, arbitratorId);
  dispute.arbitratorId = arbitratorId;
  dispute.phase = 'MEDIATION';
  dispute.updatedAt = state.clock.nowMicroseconds();
  return toReadonly(dispute);
}

function validateArbitrator(
  state: DisputeState,
  dispute: MutableDispute,
  arbitratorId: string,
): void {
  if (arbitratorId === dispute.buyerId || arbitratorId === dispute.sellerId) {
    throw new Error('Arbitrator cannot be a party to the dispute');
  }
  const score = state.civicScore.getScore(arbitratorId);
  if (score < state.config.minCivicScoreForArbitration) {
    throw new Error(
      'Arbitrator civic score ' +
        String(score) +
        ' below minimum ' +
        String(state.config.minCivicScoreForArbitration),
    );
  }
}

// ── Submit Evidence ────────────────────────────────────────────────

function submitEvidenceImpl(
  state: DisputeState,
  disputeId: string,
  submittedBy: string,
  text: string,
): TradeDispute {
  const dispute = requireDispute(state, disputeId);
  if (isTerminal(dispute.phase)) {
    throw new Error('Cannot submit evidence to a terminal dispute');
  }
  if (text.length === 0) {
    throw new Error('Evidence text cannot be empty');
  }
  if (dispute.evidence.length >= state.config.maxEvidenceEntries) {
    throw new Error('Maximum evidence entries reached');
  }
  const isAllowed =
    submittedBy === dispute.buyerId ||
    submittedBy === dispute.sellerId ||
    submittedBy === dispute.arbitratorId;
  if (!isAllowed) {
    throw new Error('Only parties or arbitrator can submit evidence');
  }
  dispute.evidence.push({
    submittedBy,
    text,
    submittedAt: state.clock.nowMicroseconds(),
  });
  dispute.updatedAt = state.clock.nowMicroseconds();
  return toReadonly(dispute);
}

// ── Resolve ────────────────────────────────────────────────────────

function resolveImpl(state: DisputeState, params: ResolveDisputeParams): TradeDispute {
  const dispute = requireDispute(state, params.disputeId);
  if (isTerminal(dispute.phase)) {
    throw new Error('Dispute ' + params.disputeId + ' is already terminal');
  }
  if (dispute.phase !== 'MEDIATION' && dispute.phase !== 'UNDER_REVIEW') {
    throw new Error('Dispute must be in MEDIATION or UNDER_REVIEW to resolve');
  }
  const refundAmount = params.refundAmount ?? 0n;
  const penaltyAmount = params.penaltyAmount ?? 0n;
  validateResolution(params.type, refundAmount, dispute.tradeAmount);
  dispute.resolution = {
    type: params.type,
    resolvedBy: params.resolvedBy,
    resolvedAt: state.clock.nowMicroseconds(),
    refundAmount,
    penaltyAmount,
    reason: params.reason,
  };
  dispute.phase = 'RESOLVED';
  dispute.updatedAt = state.clock.nowMicroseconds();
  state.totalResolved++;
  state.resolutionCounts[params.type]++;
  applyReputationImpact(state, dispute, params.type);
  return toReadonly(dispute);
}

function validateResolution(type: ResolutionType, refundAmount: bigint, tradeAmount: bigint): void {
  if (type === 'PARTIAL_REFUND' && refundAmount <= 0n) {
    throw new Error('Partial refund must specify a positive refund amount');
  }
  if (type === 'PARTIAL_REFUND' && refundAmount >= tradeAmount) {
    throw new Error('Partial refund must be less than trade amount');
  }
}

function applyReputationImpact(
  state: DisputeState,
  dispute: MutableDispute,
  type: ResolutionType,
): void {
  if (type === 'REFUND' || type === 'PENALTY') {
    state.reputation.applyPenalty(dispute.sellerId, state.config.reputationPenaltyOnFault);
  }
}

// ── Escalate ───────────────────────────────────────────────────────

function escalateImpl(state: DisputeState, disputeId: string): TradeDispute {
  const dispute = requireDispute(state, disputeId);
  if (isTerminal(dispute.phase)) {
    throw new Error('Dispute ' + disputeId + ' is already terminal');
  }
  dispute.phase = 'ESCALATED';
  dispute.updatedAt = state.clock.nowMicroseconds();
  state.totalEscalated++;
  return toReadonly(dispute);
}

// ── Queries ────────────────────────────────────────────────────────

function getDisputeImpl(state: DisputeState, disputeId: string): TradeDispute | undefined {
  const dispute = state.disputes.get(disputeId);
  if (dispute === undefined) return undefined;
  return toReadonly(dispute);
}

function listByTradeOfferImpl(state: DisputeState, tradeOfferId: string): TradeDispute[] {
  const results: TradeDispute[] = [];
  for (const dispute of state.disputes.values()) {
    if (dispute.tradeOfferId === tradeOfferId) {
      results.push(toReadonly(dispute));
    }
  }
  return results;
}

function listByDynastyImpl(state: DisputeState, dynastyId: string): TradeDispute[] {
  const results: TradeDispute[] = [];
  for (const dispute of state.disputes.values()) {
    const involved =
      dispute.buyerId === dynastyId ||
      dispute.sellerId === dynastyId ||
      dispute.filedBy === dynastyId;
    if (involved) results.push(toReadonly(dispute));
  }
  return results;
}

function listActiveImpl(state: DisputeState): TradeDispute[] {
  const results: TradeDispute[] = [];
  for (const dispute of state.disputes.values()) {
    if (!isTerminal(dispute.phase)) results.push(toReadonly(dispute));
  }
  return results;
}

// ── Stats ──────────────────────────────────────────────────────────

function computeStats(state: DisputeState): DisputeStats {
  let activeCount = 0;
  for (const dispute of state.disputes.values()) {
    if (!isTerminal(dispute.phase)) activeCount++;
  }
  return {
    totalFiled: state.totalFiled,
    totalResolved: state.totalResolved,
    totalEscalated: state.totalEscalated,
    activeDisputes: activeCount,
    resolutionsByType: { ...state.resolutionCounts },
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function requireDispute(state: DisputeState, disputeId: string): MutableDispute {
  const dispute = state.disputes.get(disputeId);
  if (dispute === undefined) {
    throw new Error('Dispute ' + disputeId + ' not found');
  }
  return dispute;
}

function isTerminal(phase: DisputePhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

function toReadonly(dispute: MutableDispute): TradeDispute {
  return {
    disputeId: dispute.disputeId,
    tradeOfferId: dispute.tradeOfferId,
    filedBy: dispute.filedBy,
    buyerId: dispute.buyerId,
    sellerId: dispute.sellerId,
    tradeAmount: dispute.tradeAmount,
    phase: dispute.phase,
    evidence: [...dispute.evidence],
    arbitratorId: dispute.arbitratorId,
    resolution: dispute.resolution,
    filedAt: dispute.filedAt,
    updatedAt: dispute.updatedAt,
  };
}
