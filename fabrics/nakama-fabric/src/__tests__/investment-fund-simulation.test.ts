import { describe, expect, it } from 'vitest';
import { createInvestmentFundSystem } from '../investment-fund.js';

describe('investment-fund simulation', () => {
  const make = () => {
    let now = 1_000_000n;
    let ids = 0;
    return createInvestmentFundSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { generateId: () => `fund-${++ids}` },
      logger: { info: () => undefined },
    });
  };

  it('simulates pooled investment, multi-asset returns, and proportional dividends', () => {
    const fundSystem = make();

    const created = fundSystem.createFund('Dynasty Growth', 0.02, [
      { assetClass: 'TRADE_ROUTES', allocationPercent: 0.5 },
      { assetClass: 'BONDS', allocationPercent: 0.5 },
    ]);
    expect(created.success).toBe(true);
    if (!created.success) return;

    const fundId = created.fundId;
    const i1 = fundSystem.invest(fundId, 'd1', 6_000n * 1_000_000n);
    const i2 = fundSystem.invest(fundId, 'd2', 4_000n * 1_000_000n);
    expect(i1.success && i2.success).toBe(true);

    const r1 = fundSystem.recordReturn(fundId, 'TRADE_ROUTES', 0.10);
    const r2 = fundSystem.recordReturn(fundId, 'BONDS', 0.04);
    expect(r1.success && r2.success).toBe(true);

    const nav = fundSystem.computeNAV(fundId);
    expect(nav).toBeDefined();
    expect(nav && nav > 1_000_000n).toBe(true);

    const dividends = fundSystem.distributeDividends(fundId);
    expect(dividends.success).toBe(true);
    if (!dividends.success) return;

    const d1 = dividends.dividends.find((d) => d.dynastyId === 'd1');
    const d2 = dividends.dividends.find((d) => d.dynastyId === 'd2');
    expect(d1).toBeDefined();
    expect(d2).toBeDefined();
    if (d1 && d2) {
      expect(d1.amount > d2.amount).toBe(true);
    }
  });

  it('simulates rebalance and partial redemption while preserving fund state integrity', () => {
    const fundSystem = make();

    const created = fundSystem.createFund('Adaptive Fund', 0.01, [
      { assetClass: 'COMMODITIES', allocationPercent: 1.0 },
    ]);
    expect(created.success).toBe(true);
    if (!created.success) return;

    const fundId = created.fundId;
    const invested = fundSystem.invest(fundId, 'd1', 3_000n * 1_000_000n);
    expect(invested.success).toBe(true);
    if (!invested.success) return;

    const rebalanced = fundSystem.rebalance(fundId, [
      { assetClass: 'REAL_ESTATE', allocationPercent: 0.7 },
      { assetClass: 'VENTURES', allocationPercent: 0.3 },
    ]);
    expect(rebalanced.success).toBe(true);

    const redeemed = fundSystem.redeem(fundId, 'd1', invested.sharesIssued / 2n);
    expect(redeemed.success).toBe(true);

    const report = fundSystem.getFundReport(fundId);
    expect(report).toBeDefined();
    expect(report?.portfolioAllocations).toHaveLength(2);
    expect(report?.shareholders).toBe(1);
  });
});
