import { describe, it, expect } from 'vitest';
import { createTradeDisputeEngine, DEFAULT_DISPUTE_CONFIG } from '../trade-dispute-engine.js';
import type {
  DisputeEngineDeps,
  DisputeEngineConfig,
  FileDisputeParams,
  CivicScorePort,
  DisputeReputationPort,
} from '../trade-dispute-engine.js';

// ── Test Helpers ───────────────────────────────────────────────────

function makeCivicScore(scores?: Record<string, number>): CivicScorePort {
  const data = new Map<string, number>(Object.entries(scores ?? {}));
  return { getScore: (id) => data.get(id) ?? 0 };
}

function makeReputation(): DisputeReputationPort & {
  readonly penalties: Array<{ readonly id: string; readonly amount: number }>;
} {
  const penalties: Array<{ readonly id: string; readonly amount: number }> = [];
  return {
    applyPenalty: (id, amount) => {
      penalties.push({ id, amount });
    },
    penalties,
  };
}

type TestReputation = DisputeReputationPort & {
  readonly penalties: Array<{ readonly id: string; readonly amount: number }>;
};

interface TestDeps extends DisputeEngineDeps {
  readonly reputation: TestReputation;
}

function makeDeps(overrides?: {
  readonly civicScore?: CivicScorePort;
  readonly config?: Partial<DisputeEngineConfig>;
}): TestDeps {
  let time = 1_000_000;
  let idCounter = 0;
  const reputation = makeReputation();
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { generate: () => 'dispute-' + String(++idCounter) },
    civicScore: overrides?.civicScore ?? makeCivicScore({ arbitrator: 6000 }),
    reputation,
    config: overrides?.config,
  };
}

function makeFileParams(overrides?: Partial<FileDisputeParams>): FileDisputeParams {
  return {
    tradeOfferId: 'trade-1',
    filedBy: 'buyer-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    tradeAmount: 10000n,
    reason: 'Goods not delivered as described',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('TradeDisputeEngine -- filing', () => {
  it('files a dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const dispute = engine.fileDispute(makeFileParams());
    expect(dispute.phase).toBe('FILED');
    expect(dispute.filedBy).toBe('buyer-1');
    expect(dispute.tradeAmount).toBe(10000n);
    expect(dispute.evidence).toHaveLength(1);
  });

  it('includes initial reason as first evidence entry', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const dispute = engine.fileDispute(makeFileParams({ reason: 'Missing items' }));
    expect(dispute.evidence[0]?.text).toBe('Missing items');
    expect(dispute.evidence[0]?.submittedBy).toBe('buyer-1');
  });

  it('rejects filing by non-party', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    expect(() => engine.fileDispute(makeFileParams({ filedBy: 'stranger' }))).toThrow(
      'Only buyer or seller can file',
    );
  });

  it('rejects empty reason', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    expect(() => engine.fileDispute(makeFileParams({ reason: '' }))).toThrow(
      'Dispute reason cannot be empty',
    );
  });

  it('rejects zero trade amount', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    expect(() => engine.fileDispute(makeFileParams({ tradeAmount: 0n }))).toThrow(
      'Trade amount must be positive',
    );
  });

  it('seller can file a dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const dispute = engine.fileDispute(makeFileParams({ filedBy: 'seller-1' }));
    expect(dispute.filedBy).toBe('seller-1');
  });
});

describe('TradeDisputeEngine -- review and mediation', () => {
  it('transitions to UNDER_REVIEW', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    const reviewed = engine.beginReview(filed.disputeId);
    expect(reviewed.phase).toBe('UNDER_REVIEW');
  });

  it('rejects review on non-FILED dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    expect(() => engine.beginReview(filed.disputeId)).toThrow('not in FILED phase');
  });

  it('assigns arbitrator with sufficient civic score', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    const mediated = engine.assignArbitrator(filed.disputeId, 'arbitrator');
    expect(mediated.phase).toBe('MEDIATION');
    expect(mediated.arbitratorId).toBe('arbitrator');
  });

  it('rejects arbitrator with insufficient civic score', () => {
    const deps = makeDeps({
      civicScore: makeCivicScore({ lowscore: 1000 }),
    });
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    expect(() => engine.assignArbitrator(filed.disputeId, 'lowscore')).toThrow('below minimum');
  });

  it('rejects party as arbitrator', () => {
    const deps = makeDeps({
      civicScore: makeCivicScore({ 'buyer-1': 8000 }),
    });
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    expect(() => engine.assignArbitrator(filed.disputeId, 'buyer-1')).toThrow('cannot be a party');
  });

  it('rejects arbitrator assignment on non-UNDER_REVIEW dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    expect(() => engine.assignArbitrator(filed.disputeId, 'arbitrator')).toThrow(
      'must be UNDER_REVIEW',
    );
  });
});

describe('TradeDisputeEngine -- evidence', () => {
  it('allows parties to submit evidence', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    const updated = engine.submitEvidence(filed.disputeId, 'seller-1', 'Goods were shipped');
    expect(updated.evidence).toHaveLength(2);
    expect(updated.evidence[1]?.text).toBe('Goods were shipped');
  });

  it('allows arbitrator to submit evidence', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    engine.assignArbitrator(filed.disputeId, 'arbitrator');
    const updated = engine.submitEvidence(
      filed.disputeId,
      'arbitrator',
      'Reviewed shipping records',
    );
    expect(updated.evidence).toHaveLength(2);
  });

  it('rejects evidence from non-party non-arbitrator', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    expect(() => engine.submitEvidence(filed.disputeId, 'stranger', 'I saw it happen')).toThrow(
      'Only parties or arbitrator',
    );
  });

  it('rejects empty evidence text', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    expect(() => engine.submitEvidence(filed.disputeId, 'buyer-1', '')).toThrow(
      'Evidence text cannot be empty',
    );
  });

  it('enforces maximum evidence entries', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine({
      ...deps,
      config: { maxEvidenceEntries: 2 },
    });
    const filed = engine.fileDispute(makeFileParams());
    engine.submitEvidence(filed.disputeId, 'seller-1', 'Response');
    expect(() => engine.submitEvidence(filed.disputeId, 'buyer-1', 'Another piece')).toThrow(
      'Maximum evidence entries reached',
    );
  });

  it('rejects evidence on terminal dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.escalate(filed.disputeId);
    expect(() => engine.submitEvidence(filed.disputeId, 'buyer-1', 'Too late')).toThrow(
      'terminal dispute',
    );
  });
});

describe('TradeDisputeEngine -- resolution types', () => {
  it('resolves with full refund', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    const resolved = engine.resolve({
      disputeId: filed.disputeId,
      resolvedBy: 'admin',
      type: 'REFUND',
      reason: 'Seller failed to deliver',
    });
    expect(resolved.phase).toBe('RESOLVED');
    expect(resolved.resolution?.type).toBe('REFUND');
    expect(deps.reputation.penalties).toHaveLength(1);
    expect(deps.reputation.penalties[0]?.id).toBe('seller-1');
  });

  it('resolves with partial refund', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    const resolved = engine.resolve({
      disputeId: filed.disputeId,
      resolvedBy: 'admin',
      type: 'PARTIAL_REFUND',
      refundAmount: 5000n,
      reason: 'Partial delivery acknowledged',
    });
    expect(resolved.resolution?.type).toBe('PARTIAL_REFUND');
    expect(resolved.resolution?.refundAmount).toBe(5000n);
  });

  it('completes trade resolution without seller penalty', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    engine.resolve({
      disputeId: filed.disputeId,
      resolvedBy: 'admin',
      type: 'COMPLETE_TRADE',
      reason: 'Goods confirmed delivered',
    });
    expect(deps.reputation.penalties).toHaveLength(0);
  });

  it('applies penalty resolution with reputation impact', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    engine.resolve({
      disputeId: filed.disputeId,
      resolvedBy: 'admin',
      type: 'PENALTY',
      penaltyAmount: 1000n,
      reason: 'Fraudulent listing',
    });
    expect(deps.reputation.penalties[0]?.amount).toBe(-50);
  });
});

describe('TradeDisputeEngine -- resolution validation', () => {
  it('rejects partial refund without amount', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    expect(() =>
      engine.resolve({
        disputeId: filed.disputeId,
        resolvedBy: 'admin',
        type: 'PARTIAL_REFUND',
        reason: 'No amount given',
      }),
    ).toThrow('positive refund amount');
  });

  it('rejects partial refund exceeding trade amount', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.beginReview(filed.disputeId);
    expect(() =>
      engine.resolve({
        disputeId: filed.disputeId,
        resolvedBy: 'admin',
        type: 'PARTIAL_REFUND',
        refundAmount: 10000n,
        reason: 'Too much',
      }),
    ).toThrow('less than trade amount');
  });
});

describe('TradeDisputeEngine -- escalation', () => {
  it('escalates a dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    const escalated = engine.escalate(filed.disputeId);
    expect(escalated.phase).toBe('ESCALATED');
  });

  it('rejects escalation of terminal dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    engine.escalate(filed.disputeId);
    expect(() => engine.escalate(filed.disputeId)).toThrow('already terminal');
  });
});

describe('TradeDisputeEngine -- queries', () => {
  it('gets dispute by ID', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const filed = engine.fileDispute(makeFileParams());
    const retrieved = engine.getDispute(filed.disputeId);
    expect(retrieved?.disputeId).toBe(filed.disputeId);
  });

  it('returns undefined for unknown dispute', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    expect(engine.getDispute('unknown')).toBeUndefined();
  });

  it('lists disputes by trade offer', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    engine.fileDispute(makeFileParams({ tradeOfferId: 'trade-1' }));
    engine.fileDispute(makeFileParams({ tradeOfferId: 'trade-2' }));
    const results = engine.listByTradeOffer('trade-1');
    expect(results).toHaveLength(1);
  });

  it('lists disputes by dynasty', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    engine.fileDispute(makeFileParams({ buyerId: 'buyer-1', filedBy: 'buyer-1' }));
    engine.fileDispute(makeFileParams({ buyerId: 'buyer-2', filedBy: 'buyer-2' }));
    expect(engine.listByDynasty('buyer-1')).toHaveLength(1);
    expect(engine.listByDynasty('seller-1')).toHaveLength(2);
  });

  it('lists active disputes', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    engine.fileDispute(makeFileParams());
    const toEscalate = engine.fileDispute(makeFileParams({ tradeOfferId: 'trade-2' }));
    engine.escalate(toEscalate.disputeId);
    expect(engine.listActive()).toHaveLength(1);
  });
});

describe('TradeDisputeEngine -- stats and config', () => {
  it('reports comprehensive stats', () => {
    const deps = makeDeps();
    const engine = createTradeDisputeEngine(deps);
    const d1 = engine.fileDispute(makeFileParams());
    engine.fileDispute(makeFileParams({ tradeOfferId: 'trade-2' }));
    engine.beginReview(d1.disputeId);
    engine.resolve({
      disputeId: d1.disputeId,
      resolvedBy: 'admin',
      type: 'REFUND',
      reason: 'Full refund granted',
    });
    const stats = engine.getStats();
    expect(stats.totalFiled).toBe(2);
    expect(stats.totalResolved).toBe(1);
    expect(stats.activeDisputes).toBe(1);
    expect(stats.resolutionsByType.REFUND).toBe(1);
    expect(stats.resolutionsByType.PARTIAL_REFUND).toBe(0);
  });

  it('exports default dispute config', () => {
    expect(DEFAULT_DISPUTE_CONFIG.minCivicScoreForArbitration).toBe(5000);
    expect(DEFAULT_DISPUTE_CONFIG.maxEvidenceEntries).toBe(20);
    expect(DEFAULT_DISPUTE_CONFIG.reputationPenaltyOnFault).toBe(-50);
  });
});
