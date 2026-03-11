import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInvestmentFundSystem,
  type InvestmentFundSystem,
  type AssetClass,
  type PortfolioAllocation,
} from '../investment-fund.js';

function createMockClock() {
  let currentTime = 1000000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'id-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logs.push({ message, meta });
    },
    getLogs: () => logs,
    clear: () => {
      logs.length = 0;
    },
  };
}

const MICRO_KALON = 1_000_000n;

describe('InvestmentFundSystem', () => {
  let system: InvestmentFundSystem;
  let clock: ReturnType<typeof createMockClock>;
  let idGen: ReturnType<typeof createMockIdGen>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
    system = createInvestmentFundSystem({ clock, idGen, logger });
  });

  describe('createFund', () => {
    const allocations: PortfolioAllocation[] = [
      { assetClass: 'TRADE_ROUTES', allocationPercent: 0.4 },
      { assetClass: 'REAL_ESTATE', allocationPercent: 0.3 },
      { assetClass: 'BONDS', allocationPercent: 0.3 },
    ];

    it('creates fund successfully', () => {
      const result = system.createFund('Prosperity Fund', 0.02, allocations);
      expect(result.success).toBe(true);
      if (result.success) expect(result.fundId).toBe('id-1');
    });

    it('returns error for invalid levy rate below zero', () => {
      const result = system.createFund('Bad Fund', -0.1, allocations);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-levy-rate');
    });

    it('returns error for invalid levy rate above one', () => {
      const result = system.createFund('Bad Fund', 1.5, allocations);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-levy-rate');
    });

    it('returns error when allocations do not sum to one', () => {
      const badAllocations = [
        { assetClass: 'TRADE_ROUTES' as AssetClass, allocationPercent: 0.4 },
        { assetClass: 'BONDS' as AssetClass, allocationPercent: 0.3 },
      ];
      const result = system.createFund('Bad Fund', 0.02, badAllocations);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('allocations-must-sum-to-one');
      }
    });

    it('initializes fund with zero assets and shares', () => {
      const result = system.createFund('New Fund', 0.02, allocations);
      expect(result.success).toBe(true);
      if (result.success) {
        const fund = system.getFund(result.fundId);
        expect(fund?.totalAssets).toBe(0n);
        expect(fund?.totalShares).toBe(0n);
      }
    });

    it('initializes NAV at 1.0 micro-KALON', () => {
      const result = system.createFund('New Fund', 0.02, allocations);
      expect(result.success).toBe(true);
      if (result.success) {
        const nav = system.computeNAV(result.fundId);
        expect(nav).toBe(MICRO_KALON);
      }
    });

    it('logs fund creation', () => {
      logger.clear();
      system.createFund('Test Fund', 0.02, allocations);
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Investment fund created');
      expect(log?.meta?.fundName).toBe('Test Fund');
    });
  });

  describe('invest', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [
        { assetClass: 'TRADE_ROUTES', allocationPercent: 0.5 },
        { assetClass: 'BONDS', allocationPercent: 0.5 },
      ];
      const result = system.createFund('Growth Fund', 0.02, allocations);
      if (result.success) fundId = result.fundId;
    });

    it('invests successfully and issues shares', () => {
      const result = system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.sharesIssued).toBe(1000n * MICRO_KALON);
      }
    });

    it('returns error for non-existent fund', () => {
      const result = system.invest('bad-fund', 'dynasty1', 1000n * MICRO_KALON);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('fund-not-found');
    });

    it('returns error for invalid amount', () => {
      const result = system.invest(fundId, 'dynasty1', 0n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-amount');
    });

    it('returns error for negative amount', () => {
      const result = system.invest(fundId, 'dynasty1', -1000n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-amount');
    });

    it('increases fund total assets', () => {
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
      const fund = system.getFund(fundId);
      expect(fund?.totalAssets).toBe(1000n * MICRO_KALON);
    });

    it('increases fund total shares', () => {
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
      const fund = system.getFund(fundId);
      expect(fund?.totalShares).toBe(1000n * MICRO_KALON);
    });

    it('creates shareholding record for new investor', () => {
      system.invest(fundId, 'dynasty1', 500n * MICRO_KALON);
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding).toBeDefined();
      expect(shareholding?.sharesOwned).toBe(500n * MICRO_KALON);
    });

    it('updates existing shareholding for repeat investor', () => {
      system.invest(fundId, 'dynasty1', 500n * MICRO_KALON);
      system.invest(fundId, 'dynasty1', 300n * MICRO_KALON);
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding?.sharesOwned).toBe(800n * MICRO_KALON);
    });

    it('tracks invested amount', () => {
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding?.investedAmount).toBe(1000n * MICRO_KALON);
    });

    it('logs investment', () => {
      logger.clear();
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
      const logs = logger.getLogs();
      const investLog = logs.find((l) => l.message === 'Investment made');
      expect(investLog).toBeDefined();
      expect(investLog?.meta?.dynastyId).toBe('dynasty1');
    });
  });

  describe('redeem', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      const result = system.createFund('Bond Fund', 0.01, allocations);
      if (result.success) fundId = result.fundId;
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
    });

    it('redeems shares successfully', () => {
      const result = system.redeem(fundId, 'dynasty1', 500n * MICRO_KALON);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.amountRedeemed).toBeGreaterThan(0n);
      }
    });

    it('returns error for non-existent fund', () => {
      const result = system.redeem('bad-fund', 'dynasty1', 100n * MICRO_KALON);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('fund-not-found');
    });

    it('returns error for invalid shares', () => {
      const result = system.redeem(fundId, 'dynasty1', 0n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-shares');
    });

    it('returns error when no shareholding exists', () => {
      const result = system.redeem(fundId, 'dynasty2', 100n * MICRO_KALON);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('no-shareholding');
    });

    it('returns error when insufficient shares owned', () => {
      const result = system.redeem(fundId, 'dynasty1', 2000n * MICRO_KALON);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('insufficient-shares');
    });

    it('decreases fund total assets', () => {
      const assetsBefore = system.getFund(fundId)?.totalAssets ?? 0n;
      system.redeem(fundId, 'dynasty1', 500n * MICRO_KALON);
      const assetsAfter = system.getFund(fundId)?.totalAssets ?? 0n;
      expect(assetsAfter).toBeLessThan(assetsBefore);
    });

    it('decreases fund total shares', () => {
      const sharesBefore = system.getFund(fundId)?.totalShares ?? 0n;
      system.redeem(fundId, 'dynasty1', 500n * MICRO_KALON);
      const sharesAfter = system.getFund(fundId)?.totalShares ?? 0n;
      expect(sharesAfter).toBe(sharesBefore - 500n * MICRO_KALON);
    });

    it('decreases shareholding shares owned', () => {
      system.redeem(fundId, 'dynasty1', 300n * MICRO_KALON);
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding?.sharesOwned).toBe(700n * MICRO_KALON);
    });

    it('logs redemption', () => {
      logger.clear();
      system.redeem(fundId, 'dynasty1', 200n * MICRO_KALON);
      const logs = logger.getLogs();
      const redeemLog = logs.find((l) => l.message === 'Shares redeemed');
      expect(redeemLog).toBeDefined();
      expect(redeemLog?.meta?.dynastyId).toBe('dynasty1');
    });
  });

  describe('recordReturn', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [
        { assetClass: 'TRADE_ROUTES', allocationPercent: 0.6 },
        { assetClass: 'COMMODITIES', allocationPercent: 0.4 },
      ];
      const result = system.createFund('Diversified Fund', 0.02, allocations);
      if (result.success) fundId = result.fundId;
      system.invest(fundId, 'dynasty1', 10000n * MICRO_KALON);
    });

    it('records return successfully', () => {
      const result = system.recordReturn(fundId, 'TRADE_ROUTES', 0.05);
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent fund', () => {
      const result = system.recordReturn('bad-fund', 'TRADE_ROUTES', 0.05);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('fund-not-found');
    });

    it('returns error for non-allocated asset class', () => {
      const result = system.recordReturn(fundId, 'VENTURES', 0.05);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('asset-class-not-allocated');
      }
    });

    it('increases fund total assets after positive return', () => {
      const assetsBefore = system.getFund(fundId)?.totalAssets ?? 0n;
      system.recordReturn(fundId, 'TRADE_ROUTES', 0.1);
      const assetsAfter = system.getFund(fundId)?.totalAssets ?? 0n;
      expect(assetsAfter).toBeGreaterThan(assetsBefore);
    });

    it('updates NAV after return recorded', () => {
      const navBefore = system.computeNAV(fundId) ?? 0n;
      system.recordReturn(fundId, 'TRADE_ROUTES', 0.15);
      const navAfter = system.computeNAV(fundId) ?? 0n;
      expect(navAfter).toBeGreaterThan(navBefore);
    });

    it('applies manager levy to returns', () => {
      const assetsBefore = system.getFund(fundId)?.totalAssets ?? 0n;
      const result = system.recordReturn(fundId, 'TRADE_ROUTES', 0.1);
      const assetsAfter = system.getFund(fundId)?.totalAssets ?? 0n;
      const gain = assetsAfter - assetsBefore;
      expect(result.success).toBe(true);
      if (result.success) {
        expect(gain).toBeLessThan(result.returnRecord.amountGained + 1n);
      }
    });

    it('logs return recording', () => {
      logger.clear();
      system.recordReturn(fundId, 'COMMODITIES', 0.08);
      const logs = logger.getLogs();
      const returnLog = logs.find((l) => l.message === 'Fund return recorded');
      expect(returnLog).toBeDefined();
      expect(returnLog?.meta?.assetClass).toBe('COMMODITIES');
    });
  });

  describe('distributeDividends', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      const result = system.createFund('Income Fund', 0.01, allocations);
      if (result.success) fundId = result.fundId;
      system.invest(fundId, 'dynasty1', 5000n * MICRO_KALON);
      system.invest(fundId, 'dynasty2', 5000n * MICRO_KALON);
      system.recordReturn(fundId, 'BONDS', 0.05);
    });

    it('distributes dividends successfully', () => {
      const result = system.distributeDividends(fundId);
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent fund', () => {
      const result = system.distributeDividends('bad-fund');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('fund-not-found');
    });

    it('returns error when no shareholders', () => {
      const allocations: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      const result2 = system.createFund('Empty Fund', 0.01, allocations);
      if (result2.success) {
        const result = system.distributeDividends(result2.fundId);
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error).toBe('no-shareholders');
      }
    });

    it('creates dividend records for shareholders', () => {
      const result = system.distributeDividends(fundId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.dividends.length).toBe(2);
      }
    });

    it('distributes proportional to shares owned', () => {
      system.invest(fundId, 'dynasty3', 10000n * MICRO_KALON);
      const result = system.distributeDividends(fundId);
      expect(result.success).toBe(true);
      if (result.success) {
        const div1 = result.dividends.find((d) => d.dynastyId === 'dynasty1');
        const div3 = result.dividends.find((d) => d.dynastyId === 'dynasty3');
        if (div1 && div3) {
          expect(div3.amount).toBeGreaterThan(div1.amount);
        }
      }
    });

    it('assigns unique dividend IDs', () => {
      const result = system.distributeDividends(fundId);
      expect(result.success).toBe(true);
      if (result.success) {
        const ids = result.dividends.map((d) => d.dividendId);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('logs dividend distribution', () => {
      logger.clear();
      system.distributeDividends(fundId);
      const logs = logger.getLogs();
      const divLog = logs.find((l) => l.message === 'Dividends distributed');
      expect(divLog).toBeDefined();
      expect(divLog?.meta?.fundId).toBe(fundId);
    });
  });

  describe('computeNAV', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [
        { assetClass: 'REAL_ESTATE', allocationPercent: 1.0 },
      ];
      const result = system.createFund('Property Fund', 0.02, allocations);
      if (result.success) fundId = result.fundId;
    });

    it('returns initial NAV of 1.0 micro-KALON', () => {
      const nav = system.computeNAV(fundId);
      expect(nav).toBe(MICRO_KALON);
    });

    it('returns undefined for non-existent fund', () => {
      const nav = system.computeNAV('bad-fund');
      expect(nav).toBeUndefined();
    });

    it('maintains NAV after investment with no returns', () => {
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
      const nav = system.computeNAV(fundId);
      expect(nav).toBe(MICRO_KALON);
    });

    it('increases NAV after positive returns', () => {
      system.invest(fundId, 'dynasty1', 10000n * MICRO_KALON);
      system.recordReturn(fundId, 'REAL_ESTATE', 0.2);
      const nav = system.computeNAV(fundId);
      expect(nav).toBeGreaterThan(MICRO_KALON);
    });
  });

  describe('getFundReport', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [
        { assetClass: 'TRADE_ROUTES', allocationPercent: 0.5 },
        { assetClass: 'BONDS', allocationPercent: 0.5 },
      ];
      const result = system.createFund('Balanced Fund', 0.015, allocations);
      if (result.success) fundId = result.fundId;
      system.invest(fundId, 'dynasty1', 3000n * MICRO_KALON);
      system.invest(fundId, 'dynasty2', 2000n * MICRO_KALON);
    });

    it('returns fund report', () => {
      const report = system.getFundReport(fundId);
      expect(report).toBeDefined();
      expect(report?.fundId).toBe(fundId);
    });

    it('returns undefined for non-existent fund', () => {
      const report = system.getFundReport('bad-fund');
      expect(report).toBeUndefined();
    });

    it('includes fund name', () => {
      const report = system.getFundReport(fundId);
      expect(report?.fundName).toBe('Balanced Fund');
    });

    it('includes total assets', () => {
      const report = system.getFundReport(fundId);
      expect(report?.totalAssets).toBe(5000n * MICRO_KALON);
    });

    it('includes total shares', () => {
      const report = system.getFundReport(fundId);
      expect(report?.totalShares).toBe(5000n * MICRO_KALON);
    });

    it('includes NAV per share', () => {
      const report = system.getFundReport(fundId);
      expect(report?.navPerShare).toBe(MICRO_KALON);
    });

    it('counts shareholders', () => {
      const report = system.getFundReport(fundId);
      expect(report?.shareholders).toBe(2);
    });

    it('includes portfolio allocations', () => {
      const report = system.getFundReport(fundId);
      expect(report?.portfolioAllocations.length).toBe(2);
    });

    it('includes total returns distributed', () => {
      system.recordReturn(fundId, 'BONDS', 0.05);
      system.distributeDividends(fundId);
      const report = system.getFundReport(fundId);
      expect(report?.totalReturnsDistributed).toBeGreaterThan(0n);
    });

    it('includes generation timestamp', () => {
      const report = system.getFundReport(fundId);
      expect(report?.generatedAt).toBeDefined();
    });
  });

  describe('rebalance', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [
        { assetClass: 'BONDS', allocationPercent: 0.5 },
        { assetClass: 'COMMODITIES', allocationPercent: 0.5 },
      ];
      const result = system.createFund('Flexible Fund', 0.02, allocations);
      if (result.success) fundId = result.fundId;
    });

    it('rebalances successfully', () => {
      const newAllocations: PortfolioAllocation[] = [
        { assetClass: 'TRADE_ROUTES', allocationPercent: 0.4 },
        { assetClass: 'VENTURES', allocationPercent: 0.6 },
      ];
      const result = system.rebalance(fundId, newAllocations);
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent fund', () => {
      const newAllocations: PortfolioAllocation[] = [
        { assetClass: 'BONDS', allocationPercent: 1.0 },
      ];
      const result = system.rebalance('bad-fund', newAllocations);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('fund-not-found');
    });

    it('returns error when allocations do not sum to one', () => {
      const badAllocations: PortfolioAllocation[] = [
        { assetClass: 'BONDS', allocationPercent: 0.3 },
        { assetClass: 'COMMODITIES', allocationPercent: 0.3 },
      ];
      const result = system.rebalance(fundId, badAllocations);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('allocations-must-sum-to-one');
      }
    });

    it('updates portfolio allocations', () => {
      const newAllocations: PortfolioAllocation[] = [
        { assetClass: 'REAL_ESTATE', allocationPercent: 1.0 },
      ];
      system.rebalance(fundId, newAllocations);
      const report = system.getFundReport(fundId);
      expect(report?.portfolioAllocations.length).toBe(1);
      const allocation = report?.portfolioAllocations[0];
      expect(allocation?.assetClass).toBe('REAL_ESTATE');
    });

    it('logs rebalance', () => {
      logger.clear();
      const newAllocations: PortfolioAllocation[] = [
        { assetClass: 'VENTURES', allocationPercent: 1.0 },
      ];
      system.rebalance(fundId, newAllocations);
      const logs = logger.getLogs();
      const rebalanceLog = logs.find((l) => l.message === 'Fund rebalanced');
      expect(rebalanceLog).toBeDefined();
      expect(rebalanceLog?.meta?.fundId).toBe(fundId);
    });
  });

  describe('getFund', () => {
    it('returns fund when found', () => {
      const allocations: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      const result = system.createFund('Test Fund', 0.01, allocations);
      if (result.success) {
        const fund = system.getFund(result.fundId);
        expect(fund).toBeDefined();
        expect(fund?.fundName).toBe('Test Fund');
      }
    });

    it('returns undefined when not found', () => {
      const fund = system.getFund('bad-fund');
      expect(fund).toBeUndefined();
    });
  });

  describe('getShareholding', () => {
    let fundId: string;

    beforeEach(() => {
      const allocations: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      const result = system.createFund('Bond Fund', 0.01, allocations);
      if (result.success) fundId = result.fundId;
      system.invest(fundId, 'dynasty1', 1000n * MICRO_KALON);
    });

    it('returns shareholding when found', () => {
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding).toBeDefined();
      expect(shareholding?.dynastyId).toBe('dynasty1');
    });

    it('returns undefined when not found', () => {
      const shareholding = system.getShareholding(fundId, 'dynasty2');
      expect(shareholding).toBeUndefined();
    });

    it('includes shares owned', () => {
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding?.sharesOwned).toBe(1000n * MICRO_KALON);
    });

    it('includes invested amount', () => {
      const shareholding = system.getShareholding(fundId, 'dynasty1');
      expect(shareholding?.investedAmount).toBe(1000n * MICRO_KALON);
    });
  });

  describe('listFunds', () => {
    it('returns empty array when no funds', () => {
      const funds = system.listFunds();
      expect(funds.length).toBe(0);
    });

    it('returns all created funds', () => {
      const allocations: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      system.createFund('Fund A', 0.01, allocations);
      system.createFund('Fund B', 0.02, allocations);
      const funds = system.listFunds();
      expect(funds.length).toBe(2);
    });

    it('includes fund details', () => {
      const allocations: PortfolioAllocation[] = [
        { assetClass: 'COMMODITIES', allocationPercent: 1.0 },
      ];
      system.createFund('Commodity Fund', 0.015, allocations);
      const funds = system.listFunds();
      const fund = funds[0];
      expect(fund?.fundName).toBe('Commodity Fund');
      expect(fund?.managerLevyRate).toBe(0.015);
    });
  });

  describe('asset class types', () => {
    const assetClasses: AssetClass[] = [
      'TRADE_ROUTES',
      'REAL_ESTATE',
      'BONDS',
      'COMMODITIES',
      'VENTURES',
    ];

    it('supports all asset class types', () => {
      const allocations = assetClasses.map((ac, i) => ({
        assetClass: ac,
        allocationPercent: 1.0 / assetClasses.length,
      }));
      const result = system.createFund('Diversified Fund', 0.02, allocations);
      expect(result.success).toBe(true);
    });

    it('records returns for each asset class', () => {
      const allocations = assetClasses.map((ac) => ({
        assetClass: ac,
        allocationPercent: 0.2,
      }));
      const createResult = system.createFund('Multi Fund', 0.01, allocations);
      if (createResult.success) {
        system.invest(createResult.fundId, 'dynasty1', 10000n * MICRO_KALON);
        for (const ac of assetClasses) {
          const result = system.recordReturn(createResult.fundId, ac, 0.05);
          expect(result.success).toBe(true);
        }
      }
    });
  });

  describe('multiple funds integration', () => {
    it('manages multiple funds independently', () => {
      const allocations1: PortfolioAllocation[] = [{ assetClass: 'BONDS', allocationPercent: 1.0 }];
      const allocations2: PortfolioAllocation[] = [
        { assetClass: 'VENTURES', allocationPercent: 1.0 },
      ];

      const result1 = system.createFund('Conservative', 0.01, allocations1);
      const result2 = system.createFund('Aggressive', 0.03, allocations2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        system.invest(result1.fundId, 'dynasty1', 5000n * MICRO_KALON);
        system.invest(result2.fundId, 'dynasty1', 3000n * MICRO_KALON);

        const fund1 = system.getFund(result1.fundId);
        const fund2 = system.getFund(result2.fundId);

        expect(fund1?.totalAssets).toBe(5000n * MICRO_KALON);
        expect(fund2?.totalAssets).toBe(3000n * MICRO_KALON);
      }
    });
  });
});
