/**
 * Economy Maturation Engine — Central bank, futures, taxes, insurance.
 *
 *   - Central bank AI: automated monetary policy (interest, KALON supply)
 *   - Commodity futures: forward contracts, price discovery
 *   - Insurance marketplace: player-created insurance products
 *   - Tax automation: progressive rates, assembly-voted adjustments
 *   - Inter-world trade treaties: tariffs, quotas, free trade zones
 *   - Economic indicators: GDP per world, trade balance, employment
 *   - Recession/boom management: automatic stimulus or austerity
 *   - Wealth redistribution: commons pool, public goods funding
 *
 * "The KALON flows where the Loom wills."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface EconClockPort {
  readonly now: () => bigint;
}

export interface EconIdPort {
  readonly next: () => string;
}

export interface EconLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface EconEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface MonetaryStorePort {
  readonly getWorldEconomy: (worldId: string) => Promise<WorldEconomicState>;
  readonly saveWorldEconomy: (state: WorldEconomicState) => Promise<void>;
  readonly getGlobalSupply: () => Promise<number>;
  readonly adjustSupply: (delta: number) => Promise<void>;
}

export interface FuturesStorePort {
  readonly saveContract: (contract: FuturesContract) => Promise<void>;
  readonly getContract: (contractId: string) => Promise<FuturesContract | undefined>;
  readonly getActiveContracts: (commodityId: string) => Promise<readonly FuturesContract[]>;
  readonly settleContract: (contractId: string, settlementPrice: number) => Promise<void>;
}

export interface TreatyStorePort {
  readonly saveTreaty: (treaty: TradeTreaty) => Promise<void>;
  readonly getTreaty: (worldA: string, worldB: string) => Promise<TradeTreaty | undefined>;
  readonly getWorldTreaties: (worldId: string) => Promise<readonly TradeTreaty[]>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type MonetaryPolicyAction =
  | 'raise-interest'
  | 'lower-interest'
  | 'expand-supply'
  | 'contract-supply'
  | 'stimulus'
  | 'austerity'
  | 'hold';

export type EconomicCyclePhase = 'expansion' | 'peak' | 'recession' | 'trough' | 'recovery';

export type InsuranceType = 'estate-damage' | 'cargo-loss' | 'market-crash' | 'siege-defense' | 'crop-failure';

export type TreatyType = 'free-trade' | 'tariff' | 'quota' | 'embargo' | 'preferential';

export type TaxCategory = 'income' | 'sales' | 'property' | 'trade' | 'luxury' | 'capital-gains';

export interface WorldEconomicState {
  readonly worldId: string;
  readonly gdp: number;
  readonly inflationRate: number;
  readonly interestRate: number;
  readonly unemploymentRate: number;
  readonly tradeBalance: number;
  readonly kalonVelocity: number;
  readonly wealthGini: number;
  readonly cyclePhase: EconomicCyclePhase;
  readonly commonsPoolKalon: number;
  readonly lastPolicyAction: MonetaryPolicyAction;
  readonly updatedAt: bigint;
}

export interface FuturesContract {
  readonly contractId: string;
  readonly commodityId: string;
  readonly worldId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly quantity: number;
  readonly strikePrice: number;
  readonly expiresAt: bigint;
  readonly settled: boolean;
  readonly settlementPrice: number | undefined;
  readonly createdAt: bigint;
}

export interface InsurancePolicy {
  readonly policyId: string;
  readonly type: InsuranceType;
  readonly providerId: string;
  readonly holderId: string;
  readonly premiumKalon: number;
  readonly coverageKalon: number;
  readonly deductibleKalon: number;
  readonly expiresAt: bigint;
  readonly claimed: boolean;
  readonly createdAt: bigint;
}

export interface InsuranceClaim {
  readonly claimId: string;
  readonly policyId: string;
  readonly description: string;
  readonly claimedAmount: number;
  readonly approvedAmount: number;
  readonly approved: boolean;
  readonly claimedAt: bigint;
}

export interface TaxBracket {
  readonly minIncome: number;
  readonly maxIncome: number;
  readonly rate: number;
}

export interface TaxPolicy {
  readonly worldId: string;
  readonly category: TaxCategory;
  readonly brackets: readonly TaxBracket[];
  readonly lastVoteId: string | undefined;
  readonly effectiveAt: bigint;
}

export interface TradeTreaty {
  readonly treatyId: string;
  readonly worldIdA: string;
  readonly worldIdB: string;
  readonly type: TreatyType;
  readonly tariffRate: number;
  readonly quotaLimit: number | undefined;
  readonly exemptCommodities: readonly string[];
  readonly signedAt: bigint;
  readonly expiresAt: bigint;
}

export interface EconomicIndicators {
  readonly worldId: string;
  readonly gdpGrowthRate: number;
  readonly cpi: number;
  readonly tradeVolume: number;
  readonly employmentRate: number;
  readonly consumerConfidence: number;
  readonly businessConfidence: number;
  readonly publicDebt: number;
  readonly measuredAt: bigint;
}

export interface PolicyDecision {
  readonly action: MonetaryPolicyAction;
  readonly rationale: string;
  readonly confidence: number;
  readonly projectedInflation: number;
  readonly projectedGrowth: number;
}

export interface RedistributionEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly fromPool: number;
  readonly toPlayers: number;
  readonly perPlayerAmount: number;
  readonly reason: string;
  readonly distributedAt: bigint;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface EconomyMaturationConfig {
  readonly targetInflation: number;
  readonly maxInterestRate: number;
  readonly minInterestRate: number;
  readonly stimulusThreshold: number;
  readonly austerityThreshold: number;
  readonly commonsContributionRate: number;
  readonly futuresMaxDurationMs: number;
  readonly taxVoteCooldownMs: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface EconomyMaturationStats {
  readonly policyDecisions: number;
  readonly futuresCreated: number;
  readonly futuresSettled: number;
  readonly insurancePolicies: number;
  readonly insuranceClaims: number;
  readonly treatiesNegotiated: number;
  readonly taxRevenueCollected: number;
  readonly redistributions: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface EconomyMaturationEngine {
  // Central bank
  readonly evaluatePolicy: (worldId: string) => Promise<PolicyDecision>;
  readonly executePolicy: (worldId: string, action: MonetaryPolicyAction) => Promise<WorldEconomicState>;
  readonly getIndicators: (worldId: string) => Promise<EconomicIndicators>;

  // Futures
  readonly createFuture: (commodityId: string, worldId: string, buyerId: string, sellerId: string, quantity: number, strikePrice: number, durationMs: number) => Promise<FuturesContract>;
  readonly settleFuture: (contractId: string, currentPrice: number) => Promise<FuturesContract>;
  readonly getActiveFutures: (commodityId: string) => Promise<readonly FuturesContract[]>;

  // Insurance
  readonly createPolicy: (type: InsuranceType, providerId: string, holderId: string, premium: number, coverage: number) => Promise<InsurancePolicy>;
  readonly fileClaim: (policyId: string, description: string, amount: number) => Promise<InsuranceClaim>;

  // Tax
  readonly setTaxPolicy: (worldId: string, category: TaxCategory, brackets: readonly TaxBracket[]) => Promise<TaxPolicy>;
  readonly calculateTax: (worldId: string, category: TaxCategory, amount: number) => Promise<number>;

  // Treaties
  readonly negotiateTreaty: (worldA: string, worldB: string, type: TreatyType, tariffRate: number) => Promise<TradeTreaty>;
  readonly getWorldTreaties: (worldId: string) => Promise<readonly TradeTreaty[]>;

  // Redistribution
  readonly contributeToCommons: (worldId: string, amount: number) => Promise<number>;
  readonly distributeCommons: (worldId: string, playerCount: number, reason: string) => Promise<RedistributionEvent>;

  readonly getStats: () => EconomyMaturationStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface EconomyMaturationDeps {
  readonly clock: EconClockPort;
  readonly id: EconIdPort;
  readonly log: EconLogPort;
  readonly events: EconEventPort;
  readonly monetary: MonetaryStorePort;
  readonly futures: FuturesStorePort;
  readonly treaties: TreatyStorePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: EconomyMaturationConfig = {
  targetInflation: 0.02,
  maxInterestRate: 0.15,
  minInterestRate: 0.001,
  stimulusThreshold: -0.02,
  austerityThreshold: 0.08,
  commonsContributionRate: 0.01,
  futuresMaxDurationMs: 90 * 24 * 60 * 60 * 1000,
  taxVoteCooldownMs: 7 * 24 * 60 * 60 * 1000,
};

// ─── Factory ────────────────────────────────────────────────────────

export function createEconomyMaturationEngine(
  deps: EconomyMaturationDeps,
  config: Partial<EconomyMaturationConfig> = {},
): EconomyMaturationEngine {
  const cfg: EconomyMaturationConfig = { ...DEFAULT_CONFIG, ...config };

  const insurancePolicies = new Map<string, InsurancePolicy>();
  const taxPolicies = new Map<string, TaxPolicy[]>();

  let policyDecisions = 0;
  let futuresCreated = 0;
  let futuresSettled = 0;
  let insurancePolicyCount = 0;
  let insuranceClaimsCount = 0;
  let treatiesNegotiated = 0;
  let taxRevenueCollected = 0;
  let redistributions = 0;

  async function evaluatePolicy(worldId: string): Promise<PolicyDecision> {
    const state = await deps.monetary.getWorldEconomy(worldId);

    let action: MonetaryPolicyAction = 'hold';
    let rationale = 'Economy within target parameters';
    let projectedInflation = state.inflationRate;
    let projectedGrowth = 0;
    let confidence = 0.5;

    if (state.inflationRate > cfg.austerityThreshold) {
      action = 'raise-interest';
      rationale = `Inflation ${(state.inflationRate * 100).toFixed(1)}% exceeds ${(cfg.austerityThreshold * 100).toFixed(1)}% threshold`;
      projectedInflation = state.inflationRate * 0.85;
      projectedGrowth = -0.005;
      confidence = 0.8;
    } else if (state.inflationRate > cfg.targetInflation * 2) {
      action = 'contract-supply';
      rationale = `Inflation ${(state.inflationRate * 100).toFixed(1)}% above 2x target`;
      projectedInflation = state.inflationRate * 0.9;
      confidence = 0.7;
    } else if (state.cyclePhase === 'recession' || state.cyclePhase === 'trough') {
      action = state.inflationRate < cfg.stimulusThreshold ? 'stimulus' : 'lower-interest';
      rationale = `Economy in ${state.cyclePhase}, stimulus needed`;
      projectedGrowth = 0.01;
      confidence = 0.65;
    } else if (state.inflationRate < 0) {
      action = 'expand-supply';
      rationale = 'Deflation detected';
      projectedInflation = 0.005;
      confidence = 0.75;
    }

    policyDecisions++;
    return { action, rationale, confidence, projectedInflation, projectedGrowth };
  }

  async function executePolicy(worldId: string, action: MonetaryPolicyAction): Promise<WorldEconomicState> {
    const state = await deps.monetary.getWorldEconomy(worldId);

    let interestRate = state.interestRate;
    let kalonVelocity = state.kalonVelocity;
    let commonsPool = state.commonsPoolKalon;

    switch (action) {
      case 'raise-interest':
        interestRate = Math.min(cfg.maxInterestRate, interestRate + 0.005);
        break;
      case 'lower-interest':
        interestRate = Math.max(cfg.minInterestRate, interestRate - 0.005);
        break;
      case 'expand-supply':
        await deps.monetary.adjustSupply(state.gdp * 0.01);
        kalonVelocity *= 1.05;
        break;
      case 'contract-supply':
        await deps.monetary.adjustSupply(-state.gdp * 0.005);
        kalonVelocity *= 0.95;
        break;
      case 'stimulus':
        commonsPool += state.gdp * 0.02;
        break;
      case 'austerity':
        commonsPool = Math.max(0, commonsPool - state.gdp * 0.01);
        break;
      case 'hold':
        break;
    }

    const updated: WorldEconomicState = {
      ...state,
      interestRate,
      kalonVelocity,
      commonsPoolKalon: commonsPool,
      lastPolicyAction: action,
      updatedAt: deps.clock.now(),
    };

    await deps.monetary.saveWorldEconomy(updated);
    deps.log.info('monetary-policy-executed', { worldId, action, interestRate });
    return updated;
  }

  async function getIndicators(worldId: string): Promise<EconomicIndicators> {
    const state = await deps.monetary.getWorldEconomy(worldId);
    return {
      worldId,
      gdpGrowthRate: 0,
      cpi: 100 * (1 + state.inflationRate),
      tradeVolume: state.tradeBalance,
      employmentRate: 1 - state.unemploymentRate,
      consumerConfidence: state.cyclePhase === 'expansion' ? 0.8 : state.cyclePhase === 'recession' ? 0.3 : 0.5,
      businessConfidence: state.cyclePhase === 'expansion' ? 0.85 : state.cyclePhase === 'recession' ? 0.25 : 0.5,
      publicDebt: 0,
      measuredAt: deps.clock.now(),
    };
  }

  async function createFuture(
    commodityId: string,
    worldId: string,
    buyerId: string,
    sellerId: string,
    quantity: number,
    strikePrice: number,
    durationMs: number,
  ): Promise<FuturesContract> {
    const now = deps.clock.now();
    const contract: FuturesContract = {
      contractId: deps.id.next(),
      commodityId,
      worldId,
      buyerId,
      sellerId,
      quantity,
      strikePrice,
      expiresAt: now + BigInt(Math.min(durationMs, cfg.futuresMaxDurationMs)),
      settled: false,
      settlementPrice: undefined,
      createdAt: now,
    };

    await deps.futures.saveContract(contract);
    futuresCreated++;
    deps.log.info('futures-contract-created', { contractId: contract.contractId, commodityId, quantity, strikePrice });
    return contract;
  }

  async function settleFuture(contractId: string, currentPrice: number): Promise<FuturesContract> {
    const contract = await deps.futures.getContract(contractId);
    if (contract === undefined) throw new Error(`Contract ${contractId} not found`);
    if (contract.settled) throw new Error('Contract already settled');

    await deps.futures.settleContract(contractId, currentPrice);
    futuresSettled++;

    const settled: FuturesContract = { ...contract, settled: true, settlementPrice: currentPrice };
    deps.log.info('futures-settled', {
      contractId,
      strike: contract.strikePrice,
      settlement: currentPrice,
      buyerProfit: (currentPrice - contract.strikePrice) * contract.quantity,
    });
    return settled;
  }

  async function getActiveFutures(commodityId: string): Promise<readonly FuturesContract[]> {
    return deps.futures.getActiveContracts(commodityId);
  }

  async function createPolicy(
    type: InsuranceType,
    providerId: string,
    holderId: string,
    premium: number,
    coverage: number,
  ): Promise<InsurancePolicy> {
    const policy: InsurancePolicy = {
      policyId: deps.id.next(),
      type,
      providerId,
      holderId,
      premiumKalon: premium,
      coverageKalon: coverage,
      deductibleKalon: coverage * 0.1,
      expiresAt: deps.clock.now() + BigInt(30 * 24 * 60 * 60 * 1000),
      claimed: false,
      createdAt: deps.clock.now(),
    };

    insurancePolicies.set(policy.policyId, policy);
    insurancePolicyCount++;
    deps.log.info('insurance-created', { policyId: policy.policyId, type, premium, coverage });
    return policy;
  }

  async function fileClaim(policyId: string, description: string, amount: number): Promise<InsuranceClaim> {
    const policy = insurancePolicies.get(policyId);
    if (policy === undefined) throw new Error(`Policy ${policyId} not found`);
    if (policy.claimed) throw new Error('Policy already claimed');

    const approved = amount <= policy.coverageKalon;
    const approvedAmount = approved ? Math.max(0, amount - policy.deductibleKalon) : 0;

    insurancePolicies.set(policyId, { ...policy, claimed: true });
    insuranceClaimsCount++;

    const claim: InsuranceClaim = {
      claimId: deps.id.next(),
      policyId,
      description,
      claimedAmount: amount,
      approvedAmount,
      approved,
      claimedAt: deps.clock.now(),
    };

    deps.log.info('insurance-claimed', { claimId: claim.claimId, policyId, approved, approvedAmount });
    return claim;
  }

  async function setTaxPolicy(
    worldId: string,
    category: TaxCategory,
    brackets: readonly TaxBracket[],
  ): Promise<TaxPolicy> {
    const policy: TaxPolicy = {
      worldId,
      category,
      brackets,
      lastVoteId: undefined,
      effectiveAt: deps.clock.now(),
    };

    const existing = taxPolicies.get(worldId) ?? [];
    const filtered = existing.filter(p => p.category !== category);
    taxPolicies.set(worldId, [...filtered, policy]);

    deps.log.info('tax-policy-set', { worldId, category, bracketCount: brackets.length });
    return policy;
  }

  async function calculateTax(worldId: string, category: TaxCategory, amount: number): Promise<number> {
    const policies = taxPolicies.get(worldId) ?? [];
    const policy = policies.find(p => p.category === category);
    if (policy === undefined) return 0;

    let totalTax = 0;
    let remaining = amount;

    for (const bracket of policy.brackets) {
      if (remaining <= 0) break;
      const taxableInBracket = Math.min(remaining, bracket.maxIncome - bracket.minIncome);
      totalTax += taxableInBracket * bracket.rate;
      remaining -= taxableInBracket;
    }

    taxRevenueCollected += totalTax;
    return totalTax;
  }

  async function negotiateTreaty(
    worldA: string,
    worldB: string,
    type: TreatyType,
    tariffRate: number,
  ): Promise<TradeTreaty> {
    const treaty: TradeTreaty = {
      treatyId: deps.id.next(),
      worldIdA: worldA,
      worldIdB: worldB,
      type,
      tariffRate: type === 'free-trade' ? 0 : tariffRate,
      quotaLimit: type === 'quota' ? 10000 : undefined,
      exemptCommodities: [],
      signedAt: deps.clock.now(),
      expiresAt: deps.clock.now() + BigInt(365 * 24 * 60 * 60 * 1000),
    };

    await deps.treaties.saveTreaty(treaty);
    treatiesNegotiated++;
    deps.log.info('treaty-negotiated', { treatyId: treaty.treatyId, worldA, worldB, type, tariffRate });
    return treaty;
  }

  async function getWorldTreaties(worldId: string): Promise<readonly TradeTreaty[]> {
    return deps.treaties.getWorldTreaties(worldId);
  }

  async function contributeToCommons(worldId: string, amount: number): Promise<number> {
    const state = await deps.monetary.getWorldEconomy(worldId);
    const updated: WorldEconomicState = {
      ...state,
      commonsPoolKalon: state.commonsPoolKalon + amount,
      updatedAt: deps.clock.now(),
    };
    await deps.monetary.saveWorldEconomy(updated);
    return updated.commonsPoolKalon;
  }

  async function distributeCommons(worldId: string, playerCount: number, reason: string): Promise<RedistributionEvent> {
    const state = await deps.monetary.getWorldEconomy(worldId);
    if (state.commonsPoolKalon <= 0) throw new Error('Commons pool empty');

    const perPlayer = Math.floor(state.commonsPoolKalon / playerCount);
    const distributed = perPlayer * playerCount;

    const updated: WorldEconomicState = {
      ...state,
      commonsPoolKalon: state.commonsPoolKalon - distributed,
      updatedAt: deps.clock.now(),
    };
    await deps.monetary.saveWorldEconomy(updated);

    const event: RedistributionEvent = {
      eventId: deps.id.next(),
      worldId,
      fromPool: distributed,
      toPlayers: playerCount,
      perPlayerAmount: perPlayer,
      reason,
      distributedAt: deps.clock.now(),
    };

    redistributions++;
    deps.log.info('commons-distributed', { worldId, amount: distributed, players: playerCount, reason });
    return event;
  }

  function getStats(): EconomyMaturationStats {
    return {
      policyDecisions,
      futuresCreated,
      futuresSettled,
      insurancePolicies: insurancePolicyCount,
      insuranceClaims: insuranceClaimsCount,
      treatiesNegotiated,
      taxRevenueCollected,
      redistributions,
    };
  }

  deps.log.info('economy-maturation-engine-created', {
    targetInflation: cfg.targetInflation,
    maxInterest: cfg.maxInterestRate,
  });

  return {
    evaluatePolicy,
    executePolicy,
    getIndicators,
    createFuture,
    settleFuture,
    getActiveFutures,
    createPolicy,
    fileClaim,
    setTaxPolicy,
    calculateTax,
    negotiateTreaty,
    getWorldTreaties,
    contributeToCommons,
    distributeCommons,
    getStats,
  };
}
