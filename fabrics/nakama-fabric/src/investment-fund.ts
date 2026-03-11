/**
 * Investment Fund System — Dynasty investment pools and portfolio management.
 *
 * Dynasties pool KALON into investment funds that invest across asset classes.
 * Fund manager simulates returns, distributes quarterly dividends proportional
 * to shares held. NAV (net asset value) tracks fund health. Fund manager levy
 * deducted from returns.
 *
 * All amounts in bigint micro-KALON (10^6 precision).
 * AssetClass: 'TRADE_ROUTES' | 'REAL_ESTATE' | 'BONDS' | 'COMMODITIES' | 'VENTURES'
 */

export type AssetClass = 'TRADE_ROUTES' | 'REAL_ESTATE' | 'BONDS' | 'COMMODITIES' | 'VENTURES';

export type FundId = string;
export type DynastyId = string;

export interface InvestmentFund {
  readonly fundId: FundId;
  readonly fundName: string;
  readonly totalAssets: bigint;
  readonly totalShares: bigint;
  readonly navPerShare: bigint;
  readonly managerLevyRate: number;
  readonly createdAt: bigint;
}

export interface FundShare {
  readonly fundId: FundId;
  readonly dynastyId: DynastyId;
  readonly sharesOwned: bigint;
  readonly investedAmount: bigint;
  readonly acquiredAt: bigint;
}

export interface PortfolioAllocation {
  readonly assetClass: AssetClass;
  readonly allocationPercent: number;
}

export interface FundReturn {
  readonly fundId: FundId;
  readonly assetClass: AssetClass;
  readonly returnRate: number;
  readonly amountGained: bigint;
  readonly recordedAt: bigint;
}

export interface DividendRecord {
  readonly dividendId: string;
  readonly fundId: FundId;
  readonly dynastyId: DynastyId;
  readonly amount: bigint;
  readonly distributedAt: bigint;
}

export interface FundReport {
  readonly fundId: FundId;
  readonly fundName: string;
  readonly totalAssets: bigint;
  readonly totalShares: bigint;
  readonly navPerShare: bigint;
  readonly shareholders: number;
  readonly portfolioAllocations: ReadonlyArray<PortfolioAllocation>;
  readonly totalReturnsDistributed: bigint;
  readonly generatedAt: bigint;
}

export interface InvestmentFundSystem {
  createFund(
    fundName: string,
    managerLevyRate: number,
    allocations: ReadonlyArray<PortfolioAllocation>,
  ):
    | { readonly success: true; readonly fundId: FundId }
    | { readonly success: false; readonly error: string };
  invest(
    fundId: FundId,
    dynastyId: DynastyId,
    amount: bigint,
  ):
    | { readonly success: true; readonly sharesIssued: bigint }
    | { readonly success: false; readonly error: string };
  redeem(
    fundId: FundId,
    dynastyId: DynastyId,
    shares: bigint,
  ):
    | { readonly success: true; readonly amountRedeemed: bigint }
    | { readonly success: false; readonly error: string };
  recordReturn(
    fundId: FundId,
    assetClass: AssetClass,
    returnRate: number,
  ):
    | { readonly success: true; readonly returnRecord: FundReturn }
    | { readonly success: false; readonly error: string };
  distributeDividends(fundId: FundId):
    | {
        readonly success: true;
        readonly dividends: ReadonlyArray<DividendRecord>;
      }
    | { readonly success: false; readonly error: string };
  computeNAV(fundId: FundId): bigint | undefined;
  getFundReport(fundId: FundId): FundReport | undefined;
  rebalance(
    fundId: FundId,
    newAllocations: ReadonlyArray<PortfolioAllocation>,
  ): { readonly success: true } | { readonly success: false; readonly error: string };
  getFund(fundId: FundId): InvestmentFund | undefined;
  getShareholding(fundId: FundId, dynastyId: DynastyId): FundShare | undefined;
  listFunds(): ReadonlyArray<InvestmentFund>;
}

interface InvestmentFundState {
  readonly funds: Map<FundId, MutableFund>;
  readonly shareholdings: Map<string, MutableFundShare>;
  readonly allocations: Map<FundId, MutablePortfolioAllocation[]>;
  readonly returns: MutableFundReturn[];
  readonly dividends: MutableDividendRecord[];
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}

interface MutableFund {
  readonly fundId: FundId;
  readonly fundName: string;
  totalAssets: bigint;
  totalShares: bigint;
  navPerShare: bigint;
  readonly managerLevyRate: number;
  readonly createdAt: bigint;
}

interface MutableFundShare {
  readonly fundId: FundId;
  readonly dynastyId: DynastyId;
  sharesOwned: bigint;
  investedAmount: bigint;
  readonly acquiredAt: bigint;
}

interface MutablePortfolioAllocation {
  readonly assetClass: AssetClass;
  allocationPercent: number;
}

interface MutableFundReturn {
  readonly fundId: FundId;
  readonly assetClass: AssetClass;
  readonly returnRate: number;
  readonly amountGained: bigint;
  readonly recordedAt: bigint;
}

interface MutableDividendRecord {
  readonly dividendId: string;
  readonly fundId: FundId;
  readonly dynastyId: DynastyId;
  readonly amount: bigint;
  readonly distributedAt: bigint;
}

const MICRO_KALON = 1_000_000n;

export function createInvestmentFundSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}): InvestmentFundSystem {
  const state: InvestmentFundState = {
    funds: new Map(),
    shareholdings: new Map(),
    allocations: new Map(),
    returns: [],
    dividends: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    createFund: (name, levy, allocations) => createFundImpl(state, name, levy, allocations),
    invest: (fid, did, amount) => investImpl(state, fid, did, amount),
    redeem: (fid, did, shares) => redeemImpl(state, fid, did, shares),
    recordReturn: (fid, assetClass, rate) => recordReturnImpl(state, fid, assetClass, rate),
    distributeDividends: (fid) => distributeDividendsImpl(state, fid),
    computeNAV: (fid) => computeNAVImpl(state, fid),
    getFundReport: (fid) => getFundReportImpl(state, fid),
    rebalance: (fid, allocations) => rebalanceImpl(state, fid, allocations),
    getFund: (fid) => state.funds.get(fid),
    getShareholding: (fid, did) => getShareholdingImpl(state, fid, did),
    listFunds: () => [...state.funds.values()],
  };
}

function makeShareKey(fundId: FundId, dynastyId: DynastyId): string {
  return fundId + ':' + dynastyId;
}

function createFundImpl(
  state: InvestmentFundState,
  fundName: string,
  managerLevyRate: number,
  allocations: ReadonlyArray<PortfolioAllocation>,
):
  | { readonly success: true; readonly fundId: FundId }
  | { readonly success: false; readonly error: string } {
  if (managerLevyRate < 0 || managerLevyRate > 1) {
    return { success: false, error: 'invalid-levy-rate' };
  }

  const totalAllocation = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  if (Math.abs(totalAllocation - 1.0) > 0.001) {
    return { success: false, error: 'allocations-must-sum-to-one' };
  }

  const fundId = state.idGen.generateId();
  const now = state.clock.nowMicroseconds();

  const fund: MutableFund = {
    fundId,
    fundName,
    totalAssets: 0n,
    totalShares: 0n,
    navPerShare: MICRO_KALON,
    managerLevyRate,
    createdAt: now,
  };

  state.funds.set(fundId, fund);
  state.allocations.set(
    fundId,
    allocations.map((a) => ({
      assetClass: a.assetClass,
      allocationPercent: a.allocationPercent,
    })),
  );

  state.logger.info('Investment fund created', {
    fundId,
    fundName,
    managerLevyRate,
  });

  return { success: true, fundId };
}

function investImpl(
  state: InvestmentFundState,
  fundId: FundId,
  dynastyId: DynastyId,
  amount: bigint,
):
  | { readonly success: true; readonly sharesIssued: bigint }
  | { readonly success: false; readonly error: string } {
  const fund = state.funds.get(fundId);
  if (!fund) return { success: false, error: 'fund-not-found' };
  if (amount <= 0n) return { success: false, error: 'invalid-amount' };

  const navPerShare = fund.navPerShare;
  const sharesIssued = (amount * MICRO_KALON) / navPerShare;

  fund.totalAssets += amount;
  fund.totalShares += sharesIssued;

  const key = makeShareKey(fundId, dynastyId);
  let shareholding = state.shareholdings.get(key);

  if (!shareholding) {
    const now = state.clock.nowMicroseconds();
    shareholding = {
      fundId,
      dynastyId,
      sharesOwned: sharesIssued,
      investedAmount: amount,
      acquiredAt: now,
    };
    state.shareholdings.set(key, shareholding);
  } else {
    shareholding.sharesOwned += sharesIssued;
    shareholding.investedAmount += amount;
  }

  state.logger.info('Investment made', {
    fundId,
    dynastyId,
    amount: String(amount),
    sharesIssued: String(sharesIssued),
  });

  return { success: true, sharesIssued };
}

function redeemImpl(
  state: InvestmentFundState,
  fundId: FundId,
  dynastyId: DynastyId,
  shares: bigint,
):
  | { readonly success: true; readonly amountRedeemed: bigint }
  | { readonly success: false; readonly error: string } {
  const fund = state.funds.get(fundId);
  if (!fund) return { success: false, error: 'fund-not-found' };
  if (shares <= 0n) return { success: false, error: 'invalid-shares' };

  const key = makeShareKey(fundId, dynastyId);
  const shareholding = state.shareholdings.get(key);
  if (!shareholding) return { success: false, error: 'no-shareholding' };
  if (shareholding.sharesOwned < shares) {
    return { success: false, error: 'insufficient-shares' };
  }

  const navPerShare = fund.navPerShare;
  const amountRedeemed = (shares * navPerShare) / MICRO_KALON;

  if (fund.totalAssets < amountRedeemed) {
    return { success: false, error: 'insufficient-fund-assets' };
  }

  fund.totalAssets -= amountRedeemed;
  fund.totalShares -= shares;
  shareholding.sharesOwned -= shares;

  const proportionRedeemed = (shares * MICRO_KALON) / (shareholding.sharesOwned + shares);
  const investedReduction = (shareholding.investedAmount * proportionRedeemed) / MICRO_KALON;
  shareholding.investedAmount -= investedReduction;

  state.logger.info('Shares redeemed', {
    fundId,
    dynastyId,
    shares: String(shares),
    amountRedeemed: String(amountRedeemed),
  });

  return { success: true, amountRedeemed };
}

function recordReturnImpl(
  state: InvestmentFundState,
  fundId: FundId,
  assetClass: AssetClass,
  returnRate: number,
):
  | { readonly success: true; readonly returnRecord: FundReturn }
  | { readonly success: false; readonly error: string } {
  const fund = state.funds.get(fundId);
  if (!fund) return { success: false, error: 'fund-not-found' };

  const allocations = state.allocations.get(fundId) ?? [];
  const allocation = allocations.find((a) => a.assetClass === assetClass);
  if (!allocation) return { success: false, error: 'asset-class-not-allocated' };

  const allocatedAssets =
    (fund.totalAssets * BigInt(Math.floor(allocation.allocationPercent * 10000))) / 10000n;
  const grossGain = (allocatedAssets * BigInt(Math.floor(returnRate * 10000))) / 10000n;
  const levyAmount = (grossGain * BigInt(Math.floor(fund.managerLevyRate * 10000))) / 10000n;
  const netGain = grossGain - levyAmount;

  fund.totalAssets += netGain;
  if (fund.totalShares > 0n) {
    fund.navPerShare = (fund.totalAssets * MICRO_KALON) / fund.totalShares;
  }

  const now = state.clock.nowMicroseconds();
  const returnRecord: MutableFundReturn = {
    fundId,
    assetClass,
    returnRate,
    amountGained: netGain,
    recordedAt: now,
  };

  state.returns.push(returnRecord);

  state.logger.info('Fund return recorded', {
    fundId,
    assetClass,
    returnRate,
    grossGain: String(grossGain),
    netGain: String(netGain),
  });

  return { success: true, returnRecord };
}

function distributeDividendsImpl(
  state: InvestmentFundState,
  fundId: FundId,
):
  | {
      readonly success: true;
      readonly dividends: ReadonlyArray<DividendRecord>;
    }
  | { readonly success: false; readonly error: string } {
  const fund = state.funds.get(fundId);
  if (!fund) return { success: false, error: 'fund-not-found' };
  if (fund.totalShares === 0n) {
    return { success: false, error: 'no-shareholders' };
  }

  const recentReturns = state.returns.filter((r) => r.fundId === fundId);
  const totalReturns = recentReturns.reduce((sum, r) => sum + r.amountGained, 0n);
  if (totalReturns <= 0n) return { success: false, error: 'no-returns-to-distribute' };

  const dividends: MutableDividendRecord[] = [];
  const now = state.clock.nowMicroseconds();

  for (const shareholding of state.shareholdings.values()) {
    if (shareholding.fundId !== fundId) continue;
    if (shareholding.sharesOwned === 0n) continue;

    const proportion = (shareholding.sharesOwned * MICRO_KALON) / fund.totalShares;
    const dividendAmount = (totalReturns * proportion) / MICRO_KALON;

    if (dividendAmount > 0n) {
      const dividendId = state.idGen.generateId();
      const dividend: MutableDividendRecord = {
        dividendId,
        fundId,
        dynastyId: shareholding.dynastyId,
        amount: dividendAmount,
        distributedAt: now,
      };
      dividends.push(dividend);
      state.dividends.push(dividend);
    }
  }

  state.logger.info('Dividends distributed', {
    fundId,
    totalReturns: String(totalReturns),
    dividendCount: dividends.length,
  });

  return { success: true, dividends };
}

function computeNAVImpl(state: InvestmentFundState, fundId: FundId): bigint | undefined {
  const fund = state.funds.get(fundId);
  if (!fund) return undefined;
  return fund.navPerShare;
}

function getFundReportImpl(state: InvestmentFundState, fundId: FundId): FundReport | undefined {
  const fund = state.funds.get(fundId);
  if (!fund) return undefined;

  const allocations = state.allocations.get(fundId) ?? [];
  let shareholders = 0;

  for (const shareholding of state.shareholdings.values()) {
    if (shareholding.fundId === fundId && shareholding.sharesOwned > 0n) {
      shareholders += 1;
    }
  }

  const totalReturnsDistributed = state.dividends
    .filter((d) => d.fundId === fundId)
    .reduce((sum, d) => sum + d.amount, 0n);

  const generatedAt = state.clock.nowMicroseconds();

  return {
    fundId: fund.fundId,
    fundName: fund.fundName,
    totalAssets: fund.totalAssets,
    totalShares: fund.totalShares,
    navPerShare: fund.navPerShare,
    shareholders,
    portfolioAllocations: allocations,
    totalReturnsDistributed,
    generatedAt,
  };
}

function rebalanceImpl(
  state: InvestmentFundState,
  fundId: FundId,
  newAllocations: ReadonlyArray<PortfolioAllocation>,
): { readonly success: true } | { readonly success: false; readonly error: string } {
  const fund = state.funds.get(fundId);
  if (!fund) return { success: false, error: 'fund-not-found' };

  const totalAllocation = newAllocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  if (Math.abs(totalAllocation - 1.0) > 0.001) {
    return { success: false, error: 'allocations-must-sum-to-one' };
  }

  state.allocations.set(
    fundId,
    newAllocations.map((a) => ({
      assetClass: a.assetClass,
      allocationPercent: a.allocationPercent,
    })),
  );

  state.logger.info('Fund rebalanced', {
    fundId,
    newAllocationCount: newAllocations.length,
  });

  return { success: true };
}

function getShareholdingImpl(
  state: InvestmentFundState,
  fundId: FundId,
  dynastyId: DynastyId,
): FundShare | undefined {
  const key = makeShareKey(fundId, dynastyId);
  return state.shareholdings.get(key);
}
