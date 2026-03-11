/**
 * npc-trade-ai.ts — NPC autonomous trading decisions and market optimization.
 *
 * Models NPC trading behavior: market scanning, opportunity identification,
 * profit optimization, and risk-adjusted decision making. NPCs have configurable
 * risk tolerance levels that influence trade execution. Merchant networks enable
 * bulk deals and information sharing. All amounts in bigint micro-KALON.
 */

// -- Ports ────────────────────────────────────────────────────────

interface TradeClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface TradeIdGeneratorPort {
  readonly next: () => string;
}

interface TradeLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface TradeDeps {
  readonly clock: TradeClockPort;
  readonly idGenerator: TradeIdGeneratorPort;
  readonly logger: TradeLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type RiskTolerance = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

interface TradeOpportunity {
  readonly opportunityId: string;
  readonly itemId: string;
  readonly buyWorldId: string;
  readonly sellWorldId: string;
  readonly buyPriceMicroKalon: bigint;
  readonly sellPriceMicroKalon: bigint;
  readonly projectedProfitMicroKalon: bigint;
  readonly riskScore: number;
  readonly discoveredAt: bigint;
}

interface TradeExecution {
  readonly executionId: string;
  readonly npcId: string;
  readonly opportunityId: string;
  readonly itemId: string;
  readonly buyWorldId: string;
  readonly sellWorldId: string;
  readonly buyPriceMicroKalon: bigint;
  readonly sellPriceMicroKalon: bigint;
  readonly actualProfitMicroKalon: bigint;
  readonly executedAt: bigint;
}

interface MerchantNetwork {
  readonly networkId: string;
  readonly name: string;
  readonly memberIds: string[];
  readonly foundedAt: bigint;
  readonly totalTrades: number;
  readonly totalProfitMicroKalon: bigint;
}

interface TradingHistory {
  readonly npcId: string;
  readonly totalTrades: number;
  readonly profitableTrades: number;
  readonly lossMakingTrades: number;
  readonly totalProfitMicroKalon: bigint;
  readonly averageProfitMicroKalon: bigint;
}

interface ProfitReport {
  readonly npcId: string;
  readonly totalProfitMicroKalon: bigint;
  readonly topOpportunity: TradeOpportunity | undefined;
  readonly successRate: number;
}

type ScanOpportunitiesError = 'invalid_world' | 'no_opportunities';
type EvaluateTradeError = 'opportunity_not_found' | 'risk_too_high';
type ExecuteTradeError = 'opportunity_not_found' | 'insufficient_funds' | 'trade_failed';
type JoinNetworkError = 'network_not_found' | 'already_member';
type SetRiskToleranceError = 'npc_not_found';

// -- Constants ────────────────────────────────────────────────────

const MICRO_KALON = 1_000_000n;
const MIN_PROFIT_THRESHOLD_MICRO_KALON = 100n * MICRO_KALON;
const RISK_SCORE_MIN = 0;
const RISK_SCORE_MAX = 100;
const CONSERVATIVE_RISK_THRESHOLD = 30;
const MODERATE_RISK_THRESHOLD = 60;
const AGGRESSIVE_RISK_THRESHOLD = 90;
const NETWORK_PROFIT_SHARE = 0.05;

// -- State ────────────────────────────────────────────────────────

interface TradeAIState {
  readonly opportunities: Map<string, TradeOpportunity>;
  readonly executions: TradeExecution[];
  readonly networks: Map<string, MerchantNetwork>;
  readonly riskTolerances: Map<string, RiskTolerance>;
  readonly npcBalances: Map<string, bigint>;
}

// -- Factory ──────────────────────────────────────────────────────

export interface TradeAI {
  readonly scanOpportunities: (
    worldId: string,
    itemIds: string[],
  ) => ScanOpportunitiesError | TradeOpportunity[];
  readonly evaluateTrade: (npcId: string, opportunityId: string) => EvaluateTradeError | boolean;
  readonly executeTrade: (npcId: string, opportunityId: string) => ExecuteTradeError | string;
  readonly joinNetwork: (npcId: string, networkId: string) => JoinNetworkError | 'ok';
  readonly getTradeHistory: (npcId: string) => TradingHistory;
  readonly getProfitReport: (npcId: string) => ProfitReport;
  readonly setRiskTolerance: (
    npcId: string,
    tolerance: RiskTolerance,
  ) => SetRiskToleranceError | 'ok';
}

export function createTradeAI(deps: TradeDeps): TradeAI {
  const state: TradeAIState = {
    opportunities: new Map(),
    executions: [],
    networks: new Map(),
    riskTolerances: new Map(),
    npcBalances: new Map(),
  };
  return {
    scanOpportunities: (worldId, itemIds) => scanOpportunities(state, deps, worldId, itemIds),
    evaluateTrade: (npcId, opportunityId) => evaluateTrade(state, npcId, opportunityId),
    executeTrade: (npcId, opportunityId) => executeTrade(state, deps, npcId, opportunityId),
    joinNetwork: (npcId, networkId) => joinNetwork(state, deps, npcId, networkId),
    getTradeHistory: (npcId) => getTradeHistory(state, npcId),
    getProfitReport: (npcId) => getProfitReport(state, npcId),
    setRiskTolerance: (npcId, tolerance) => setRiskTolerance(state, npcId, tolerance),
  };
}

// -- Module-level functions ───────────────────────────────────────

function scanOpportunities(
  state: TradeAIState,
  deps: TradeDeps,
  worldId: string,
  itemIds: string[],
): ScanOpportunitiesError | TradeOpportunity[] {
  if (itemIds.length === 0) {
    return 'no_opportunities';
  }
  const now = deps.clock.nowMicroseconds();
  const opportunities: TradeOpportunity[] = [];
  for (let i = 0; i < itemIds.length; i = i + 1) {
    const itemId = itemIds[i];
    if (itemId === undefined) {
      continue;
    }
    const buyPrice = (BigInt(Math.floor(Math.random() * 500)) + 100n) * MICRO_KALON;
    const markup = (BigInt(Math.floor(Math.random() * 500)) + 200n) * MICRO_KALON;
    const sellPrice = buyPrice + markup;
    const projectedProfit = markup;
    const riskScore = Math.floor(Math.random() * RISK_SCORE_MAX);
    const opportunityId = deps.idGenerator.next();
    const opportunity: TradeOpportunity = {
      opportunityId,
      itemId,
      buyWorldId: worldId,
      sellWorldId: 'world_' + String(Math.floor(Math.random() * 100)),
      buyPriceMicroKalon: buyPrice,
      sellPriceMicroKalon: sellPrice,
      projectedProfitMicroKalon: projectedProfit,
      riskScore,
      discoveredAt: now,
    };
    opportunities.push(opportunity);
    state.opportunities.set(opportunityId, opportunity);
  }
  if (opportunities.length === 0) {
    return 'no_opportunities';
  }
  deps.logger.info('opportunities_scanned', {
    worldId,
    count: String(opportunities.length),
  });
  return opportunities;
}

function evaluateTrade(
  state: TradeAIState,
  npcId: string,
  opportunityId: string,
): EvaluateTradeError | boolean {
  const opportunity = state.opportunities.get(opportunityId);
  if (opportunity === undefined) {
    return 'opportunity_not_found';
  }
  const tolerance = state.riskTolerances.get(npcId);
  const riskThreshold =
    tolerance === 'CONSERVATIVE'
      ? CONSERVATIVE_RISK_THRESHOLD
      : tolerance === 'AGGRESSIVE'
        ? AGGRESSIVE_RISK_THRESHOLD
        : MODERATE_RISK_THRESHOLD;
  if (opportunity.riskScore > riskThreshold) {
    return 'risk_too_high';
  }
  return true;
}

function executeTrade(
  state: TradeAIState,
  deps: TradeDeps,
  npcId: string,
  opportunityId: string,
): ExecuteTradeError | string {
  const opportunity = state.opportunities.get(opportunityId);
  if (opportunity === undefined) {
    return 'opportunity_not_found';
  }
  const balance = state.npcBalances.get(npcId);
  const currentBalance = balance !== undefined ? balance : 1_000_000n * MICRO_KALON;
  if (currentBalance < opportunity.buyPriceMicroKalon) {
    return 'insufficient_funds';
  }
  const executionId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const actualProfitVariance = BigInt(Math.floor(Math.random() * 200) - 100) * MICRO_KALON;
  const actualProfit = opportunity.projectedProfitMicroKalon + actualProfitVariance;
  const execution: TradeExecution = {
    executionId,
    npcId,
    opportunityId,
    itemId: opportunity.itemId,
    buyWorldId: opportunity.buyWorldId,
    sellWorldId: opportunity.sellWorldId,
    buyPriceMicroKalon: opportunity.buyPriceMicroKalon,
    sellPriceMicroKalon: opportunity.sellPriceMicroKalon,
    actualProfitMicroKalon: actualProfit,
    executedAt: now,
  };
  state.executions.push(execution);
  const newBalance = currentBalance + actualProfit;
  state.npcBalances.set(npcId, newBalance);
  for (const network of state.networks.values()) {
    const isMember = network.memberIds.includes(npcId);
    if (isMember) {
      const networkShare = BigInt(Math.floor(Number(actualProfit) * NETWORK_PROFIT_SHARE));
      const updatedNetwork: MerchantNetwork = {
        ...network,
        totalTrades: network.totalTrades + 1,
        totalProfitMicroKalon: network.totalProfitMicroKalon + networkShare,
      };
      state.networks.set(network.networkId, updatedNetwork);
    }
  }
  deps.logger.info('trade_executed', {
    executionId,
    npcId,
    actualProfit: String(actualProfit),
  });
  return executionId;
}

function joinNetwork(
  state: TradeAIState,
  deps: TradeDeps,
  npcId: string,
  networkId: string,
): JoinNetworkError | 'ok' {
  const network = state.networks.get(networkId);
  if (network === undefined) {
    const now = deps.clock.nowMicroseconds();
    const newNetwork: MerchantNetwork = {
      networkId,
      name: 'Network_' + String(networkId),
      memberIds: [npcId],
      foundedAt: now,
      totalTrades: 0,
      totalProfitMicroKalon: 0n,
    };
    state.networks.set(networkId, newNetwork);
    deps.logger.info('network_created', { networkId, npcId });
    return 'ok';
  }
  const isMember = network.memberIds.includes(npcId);
  if (isMember) {
    return 'already_member';
  }
  const updatedNetwork: MerchantNetwork = {
    ...network,
    memberIds: [...network.memberIds, npcId],
  };
  state.networks.set(networkId, updatedNetwork);
  deps.logger.info('network_joined', { networkId, npcId });
  return 'ok';
}

function getTradeHistory(state: TradeAIState, npcId: string): TradingHistory {
  let totalTrades = 0;
  let profitableTrades = 0;
  let lossMakingTrades = 0;
  let totalProfit = 0n;
  for (let i = 0; i < state.executions.length; i = i + 1) {
    const exec = state.executions[i];
    if (exec === undefined) {
      continue;
    }
    if (exec.npcId === npcId) {
      totalTrades = totalTrades + 1;
      totalProfit = totalProfit + exec.actualProfitMicroKalon;
      if (exec.actualProfitMicroKalon > 0n) {
        profitableTrades = profitableTrades + 1;
      } else {
        lossMakingTrades = lossMakingTrades + 1;
      }
    }
  }
  const averageProfit = totalTrades > 0 ? totalProfit / BigInt(totalTrades) : 0n;
  return {
    npcId,
    totalTrades,
    profitableTrades,
    lossMakingTrades,
    totalProfitMicroKalon: totalProfit,
    averageProfitMicroKalon: averageProfit,
  };
}

function getProfitReport(state: TradeAIState, npcId: string): ProfitReport {
  let totalProfit = 0n;
  let totalTrades = 0;
  let successfulTrades = 0;
  for (let i = 0; i < state.executions.length; i = i + 1) {
    const exec = state.executions[i];
    if (exec === undefined) {
      continue;
    }
    if (exec.npcId === npcId) {
      totalTrades = totalTrades + 1;
      totalProfit = totalProfit + exec.actualProfitMicroKalon;
      if (exec.actualProfitMicroKalon > 0n) {
        successfulTrades = successfulTrades + 1;
      }
    }
  }
  let topOpportunity: TradeOpportunity | undefined = undefined;
  let maxProfit = 0n;
  for (const opp of state.opportunities.values()) {
    if (opp.projectedProfitMicroKalon > maxProfit) {
      maxProfit = opp.projectedProfitMicroKalon;
      topOpportunity = opp;
    }
  }
  const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0;
  return {
    npcId,
    totalProfitMicroKalon: totalProfit,
    topOpportunity,
    successRate,
  };
}

function setRiskTolerance(
  state: TradeAIState,
  npcId: string,
  tolerance: RiskTolerance,
): SetRiskToleranceError | 'ok' {
  state.riskTolerances.set(npcId, tolerance);
  return 'ok';
}
