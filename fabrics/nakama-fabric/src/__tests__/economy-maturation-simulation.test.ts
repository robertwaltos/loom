/**
 * Economy Maturation Engine - Simulation Tests
 *
 * Covers policy evaluation/execution, futures, insurance,
 * tax policy, treaties, commons redistribution, and stats.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createEconomyMaturationEngine,
  type EconomyMaturationDeps,
  type WorldEconomicState,
  type FuturesContract,
  type TradeTreaty,
} from '../economy-maturation.js';

function makeWorld(overrides: Partial<WorldEconomicState> = {}): WorldEconomicState {
  return {
    worldId: 'world-1',
    gdp: 1_000_000,
    inflationRate: 0.02,
    interestRate: 0.03,
    unemploymentRate: 0.1,
    tradeBalance: 5_000,
    kalonVelocity: 1.2,
    wealthGini: 0.4,
    cyclePhase: 'expansion',
    commonsPoolKalon: 1_000,
    lastPolicyAction: 'hold',
    updatedAt: 0n,
    ...overrides,
  };
}

function makeHarness() {
  let now = 1_000_000n;
  let idCounter = 0;
  let globalSupply = 10_000_000;

  const worlds = new Map<string, WorldEconomicState>();
  const futures = new Map<string, FuturesContract>();
  const treatyByPair = new Map<string, TradeTreaty>();

  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const emit = vi.fn();

  const deps: EconomyMaturationDeps = {
    clock: { now: () => now },
    id: { next: () => `econ-${++idCounter}` },
    log: { info, warn, error },
    events: { emit },
    monetary: {
      getWorldEconomy: async (worldId) => {
        const state = worlds.get(worldId);
        if (!state) throw new Error(`world ${worldId} not found`);
        return state;
      },
      saveWorldEconomy: async (state) => {
        worlds.set(state.worldId, state);
      },
      getGlobalSupply: async () => globalSupply,
      adjustSupply: async (delta) => {
        globalSupply += delta;
      },
    },
    futures: {
      saveContract: async (contract) => {
        futures.set(contract.contractId, contract);
      },
      getContract: async (contractId) => futures.get(contractId),
      getActiveContracts: async (commodityId) =>
        [...futures.values()].filter((contract) => contract.commodityId === commodityId && !contract.settled),
      settleContract: async (contractId, settlementPrice) => {
        const contract = futures.get(contractId);
        if (!contract) return;
        futures.set(contractId, { ...contract, settled: true, settlementPrice });
      },
    },
    treaties: {
      saveTreaty: async (treaty) => {
        treatyByPair.set(`${treaty.worldIdA}|${treaty.worldIdB}`, treaty);
      },
      getTreaty: async (worldA, worldB) => treatyByPair.get(`${worldA}|${worldB}`),
      getWorldTreaties: async (worldId) =>
        [...treatyByPair.values()].filter((treaty) => treaty.worldIdA === worldId || treaty.worldIdB === worldId),
    },
  };

  const engine = createEconomyMaturationEngine(deps, {
    targetInflation: 0.02,
    austerityThreshold: 0.08,
    stimulusThreshold: -0.02,
    maxInterestRate: 0.05,
    minInterestRate: 0.01,
    futuresMaxDurationMs: 1000,
  });

  return {
    engine,
    worlds,
    futures,
    treatyByPair,
    info,
    warn,
    error,
    emit,
    getSupply: () => globalSupply,
    setNow: (value: bigint) => {
      now = value;
    },
  };
}

describe('EconomyMaturationEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('evaluates high inflation as raise-interest with strong confidence', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ inflationRate: 0.1 }));

    const decision = await engine.evaluatePolicy('world-1');

    expect(decision.action).toBe('raise-interest');
    expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('evaluates recession policy to lower-interest when below stimulus threshold check fails', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ cyclePhase: 'recession', inflationRate: -0.01 }));

    const decision = await engine.evaluatePolicy('world-1');
    expect(decision.action).toBe('lower-interest');
  });

  it('evaluates recession with deep deflation as stimulus', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ cyclePhase: 'trough', inflationRate: -0.03 }));

    const decision = await engine.evaluatePolicy('world-1');
    expect(decision.action).toBe('stimulus');
  });

  it('evaluates mild deflation outside recession as expand-supply', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ cyclePhase: 'expansion', inflationRate: -0.005 }));

    const decision = await engine.evaluatePolicy('world-1');
    expect(decision.action).toBe('expand-supply');
  });

  it('executes interest rate adjustments with configured clamps', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ interestRate: 0.049 }));

    const raised = await engine.executePolicy('world-1', 'raise-interest');
    expect(raised.interestRate).toBe(0.05);

    worlds.set('world-1', { ...raised, interestRate: 0.011 });
    const lowered = await engine.executePolicy('world-1', 'lower-interest');
    expect(lowered.interestRate).toBe(0.01);
  });

  it('executes expand/contract supply actions and adjusts velocity', async () => {
    const { engine, worlds, getSupply } = makeHarness();
    worlds.set('world-1', makeWorld({ gdp: 500_000, kalonVelocity: 1.0 }));

    const before = getSupply();
    const expanded = await engine.executePolicy('world-1', 'expand-supply');
    expect(getSupply()).toBe(before + 5000);
    expect(expanded.kalonVelocity).toBeCloseTo(1.05, 6);

    worlds.set('world-1', expanded);
    const contracted = await engine.executePolicy('world-1', 'contract-supply');
    expect(getSupply()).toBe(before + 5000 - 2500);
    expect(contracted.kalonVelocity).toBeCloseTo(0.9975, 6);
  });

  it('executes stimulus and austerity effects on commons pool', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ gdp: 100_000, commonsPoolKalon: 500 }));

    const stimulated = await engine.executePolicy('world-1', 'stimulus');
    expect(stimulated.commonsPoolKalon).toBe(2500);

    worlds.set('world-1', stimulated);
    const austerity = await engine.executePolicy('world-1', 'austerity');
    expect(austerity.commonsPoolKalon).toBe(1500);
  });

  it('builds indicators with cpi, employment, and confidence from cycle', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ inflationRate: 0.05, unemploymentRate: 0.2, cyclePhase: 'recession' }));

    const indicators = await engine.getIndicators('world-1');

    expect(indicators.cpi).toBe(105);
    expect(indicators.employmentRate).toBe(0.8);
    expect(indicators.consumerConfidence).toBe(0.3);
    expect(indicators.businessConfidence).toBe(0.25);
  });

  it('creates futures with duration capped by config and settles them', async () => {
    const { engine, futures } = makeHarness();

    const created = await engine.createFuture('iron', 'world-1', 'buyer', 'seller', 10, 30, 99_999);
    expect(created.expiresAt - created.createdAt).toBe(1000n);
    expect(futures.get(created.contractId)?.settled).toBe(false);

    const settled = await engine.settleFuture(created.contractId, 42);
    expect(settled.settled).toBe(true);
    expect(settled.settlementPrice).toBe(42);
  });

  it('throws when settling missing or already-settled futures', async () => {
    const { engine } = makeHarness();

    await expect(engine.settleFuture('missing', 10)).rejects.toThrow('Contract missing not found');

    const created = await engine.createFuture('gold', 'world-1', 'b', 's', 1, 10, 500);
    await engine.settleFuture(created.contractId, 11);
    await expect(engine.settleFuture(created.contractId, 12)).rejects.toThrow('already settled');
  });

  it('returns active futures per commodity', async () => {
    const { engine } = makeHarness();

    const c1 = await engine.createFuture('grain', 'world-1', 'b1', 's1', 2, 5, 500);
    const c2 = await engine.createFuture('grain', 'world-1', 'b2', 's2', 2, 6, 500);
    await engine.settleFuture(c1.contractId, 7);

    const active = await engine.getActiveFutures('grain');
    expect(active).toHaveLength(1);
    expect(active[0]?.contractId).toBe(c2.contractId);
  });

  it('creates insurance policy and files approved claim with deductible applied', async () => {
    const { engine } = makeHarness();

    const policy = await engine.createPolicy('cargo-loss', 'insurer', 'holder', 100, 1000);
    const claim = await engine.fileClaim(policy.policyId, 'Cargo sank', 800);

    expect(claim.approved).toBe(true);
    expect(claim.approvedAmount).toBe(700);
  });

  it('denies over-coverage insurance claims and rejects duplicate claims', async () => {
    const { engine } = makeHarness();

    const policy = await engine.createPolicy('market-crash', 'insurer', 'holder', 100, 500);
    const denied = await engine.fileClaim(policy.policyId, 'Crash loss', 1000);
    expect(denied.approved).toBe(false);
    expect(denied.approvedAmount).toBe(0);

    await expect(engine.fileClaim(policy.policyId, 'Second claim', 100)).rejects.toThrow('already claimed');
    await expect(engine.fileClaim('missing-policy', 'Unknown', 100)).rejects.toThrow('Policy missing-policy not found');
  });

  it('sets tax policy and calculates progressive tax, defaulting to zero without policy', async () => {
    const { engine } = makeHarness();

    await engine.setTaxPolicy('world-1', 'income', [
      { minIncome: 0, maxIncome: 1000, rate: 0.1 },
      { minIncome: 1000, maxIncome: 5000, rate: 0.2 },
    ]);

    const tax = await engine.calculateTax('world-1', 'income', 2000);
    expect(tax).toBe(300);

    const noTax = await engine.calculateTax('world-1', 'sales', 2000);
    expect(noTax).toBe(0);
  });

  it('negotiates free-trade and quota treaties with expected fields', async () => {
    const { engine } = makeHarness();

    const freeTrade = await engine.negotiateTreaty('wA', 'wB', 'free-trade', 0.15);
    expect(freeTrade.tariffRate).toBe(0);

    const quota = await engine.negotiateTreaty('wA', 'wC', 'quota', 0.12);
    expect(quota.quotaLimit).toBe(10000);

    const treaties = await engine.getWorldTreaties('wA');
    expect(treaties).toHaveLength(2);
  });

  it('contributes to commons and distributes evenly with remainder preserved', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ commonsPoolKalon: 1001 }));

    const afterContribution = await engine.contributeToCommons('world-1', 99);
    expect(afterContribution).toBe(1100);

    const event = await engine.distributeCommons('world-1', 3, 'festival stipend');
    expect(event.fromPool).toBe(1098);
    expect(event.perPlayerAmount).toBe(366);

    const remaining = worlds.get('world-1')?.commonsPoolKalon;
    expect(remaining).toBe(2);
  });

  it('throws when distributing from empty commons pool', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ commonsPoolKalon: 0 }));

    await expect(engine.distributeCommons('world-1', 5, 'aid')).rejects.toThrow('Commons pool empty');
  });

  it('tracks stats counters across policy, market, and redistribution operations', async () => {
    const { engine, worlds } = makeHarness();
    worlds.set('world-1', makeWorld({ inflationRate: 0.09 }));

    await engine.evaluatePolicy('world-1');
    await engine.executePolicy('world-1', 'raise-interest');

    const future = await engine.createFuture('oil', 'world-1', 'b', 's', 1, 10, 500);
    await engine.settleFuture(future.contractId, 12);

    const policy = await engine.createPolicy('estate-damage', 'prov', 'hold', 10, 100);
    await engine.fileClaim(policy.policyId, 'storm', 80);

    await engine.setTaxPolicy('world-1', 'trade', [{ minIncome: 0, maxIncome: 1000, rate: 0.1 }]);
    await engine.calculateTax('world-1', 'trade', 500);

    await engine.negotiateTreaty('w1', 'w2', 'tariff', 0.2);

    await engine.contributeToCommons('world-1', 500);
    await engine.distributeCommons('world-1', 10, 'rebate');

    const stats = engine.getStats();
    expect(stats.policyDecisions).toBe(1);
    expect(stats.futuresCreated).toBe(1);
    expect(stats.futuresSettled).toBe(1);
    expect(stats.insurancePolicies).toBe(1);
    expect(stats.insuranceClaims).toBe(1);
    expect(stats.treatiesNegotiated).toBe(1);
    expect(stats.taxRevenueCollected).toBe(50);
    expect(stats.redistributions).toBe(1);
  });
});
