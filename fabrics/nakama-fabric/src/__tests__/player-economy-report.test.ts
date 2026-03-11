import { describe, it, expect } from 'vitest';
import { createPlayerEconomyReport } from '../player-economy-report.js';

function createTestReport() {
  let time = 1_000_000n;
  let idCount = 0;
  return createPlayerEconomyReport({
    clock: { nowMicroseconds: () => time },
    idGen: { next: () => 'id-' + String((idCount = idCount + 1)) },
  });
}

const MICRO = 1_000_000n;

describe('PlayerEconomyReport income tracking', () => {
  it('records income event', () => {
    const report = createTestReport();
    const eventId = report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Sold iron ore');
    expect(eventId).toContain('income-');
  });

  it('records multiple income events', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade 1');
    report.recordIncome('dynasty-1', 'CRAFT', 500n * MICRO, 'Craft 1');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('income from different sources', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'QUEST_REWARD', 2000n * MICRO, 'Quest');
    report.recordIncome('dynasty-1', 'INTEREST', 50n * MICRO, 'Interest');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBe(3);
  });

  it('retrieves total income for period', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade 1');
    report.recordIncome('dynasty-1', 'TRADE', 500n * MICRO, 'Trade 2');
    const total = report.getTotalIncome('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(1500n * MICRO);
  });

  it('income outside period not counted', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Old trade');
    const total = report.getTotalIncome('dynasty-1', 5_000_000n, 10_000_000n);
    expect(total).toBe(0n);
  });

  it('income breakdown by source', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'TRADE', 500n * MICRO, 'Trade 2');
    report.recordIncome('dynasty-1', 'CRAFT', 300n * MICRO, 'Craft');
    const breakdown = report.getIncomeBreakdown('dynasty-1', 0n, 2_000_000n);
    expect(breakdown.length).toBeGreaterThanOrEqual(2);
  });

  it('income breakdown sorted by amount', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'CRAFT', 2000n * MICRO, 'Craft');
    const breakdown = report.getIncomeBreakdown('dynasty-1', 0n, 2_000_000n);
    const first = breakdown[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(first.source).toBe('CRAFT');
    }
  });

  it('income breakdown includes percentage', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 500n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'CRAFT', 500n * MICRO, 'Craft');
    const breakdown = report.getIncomeBreakdown('dynasty-1', 0n, 2_000_000n);
    const first = breakdown[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(first.percentage).toBeCloseTo(50, 0);
    }
  });

  it('identifies top income source', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'CRAFT', 2000n * MICRO, 'Craft');
    report.recordIncome('dynasty-1', 'QUEST_REWARD', 500n * MICRO, 'Quest');
    const top = report.getTopIncomeSource('dynasty-1', 0n, 2_000_000n);
    expect(top).toBe('CRAFT');
  });

  it('top income source null when no income', () => {
    const report = createTestReport();
    const top = report.getTopIncomeSource('dynasty-1', 0n, 2_000_000n);
    expect(top).toBe(null);
  });
});

describe('PlayerEconomyReport spending tracking', () => {
  it('records spending event', () => {
    const report = createTestReport();
    const eventId = report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Bought tools');
    expect(eventId).toContain('spending-');
  });

  it('records multiple spending events', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Purchase 1');
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax 1');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('spending from different categories', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax');
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Purchase');
    report.recordSpending('dynasty-1', 'INVESTMENT', 1000n * MICRO, 'Investment');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBe(3);
  });

  it('retrieves total spending for period', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Purchase 1');
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax 1');
    const total = report.getTotalSpending('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(600n * MICRO);
  });

  it('spending outside period not counted', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Old purchase');
    const total = report.getTotalSpending('dynasty-1', 5_000_000n, 10_000_000n);
    expect(total).toBe(0n);
  });

  it('spending breakdown by category', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Purchase');
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax');
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase 2');
    const breakdown = report.getSpendingBreakdown('dynasty-1', 0n, 2_000_000n);
    expect(breakdown.length).toBeGreaterThanOrEqual(2);
  });

  it('spending breakdown sorted by amount', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax');
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Purchase');
    const breakdown = report.getSpendingBreakdown('dynasty-1', 0n, 2_000_000n);
    const first = breakdown[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(first.category).toBe('PURCHASE');
    }
  });

  it('spending breakdown includes percentage', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase');
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax');
    const breakdown = report.getSpendingBreakdown('dynasty-1', 0n, 2_000_000n);
    const first = breakdown[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(first.percentage).toBeCloseTo(75, 0);
    }
  });
});

describe('PlayerEconomyReport wealth snapshots', () => {
  it('takes wealth snapshot', () => {
    const report = createTestReport();
    const result = report.takeWealthSnapshot('dynasty-1', 5000n * MICRO, 10000n * MICRO);
    expect(result).toBe('success');
  });

  it('snapshot includes net worth', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 5000n * MICRO, 10000n * MICRO);
    const trajectory = report.getWealthTrajectory('dynasty-1');
    const snapshot = trajectory[0];
    expect(snapshot).toBeDefined();
    if (snapshot !== undefined) {
      expect(snapshot.netWorth).toBe(15000n * MICRO);
    }
  });

  it('snapshot separates liquid and illiquid assets', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 5000n * MICRO, 10000n * MICRO);
    const trajectory = report.getWealthTrajectory('dynasty-1');
    const snapshot = trajectory[0];
    expect(snapshot).toBeDefined();
    if (snapshot !== undefined) {
      expect(snapshot.liquidAssets).toBe(5000n * MICRO);
      expect(snapshot.illiquidAssets).toBe(10000n * MICRO);
    }
  });

  it('retrieves wealth trajectory', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 5000n * MICRO, 10000n * MICRO);
    report.takeWealthSnapshot('dynasty-1', 6000n * MICRO, 12000n * MICRO);
    const trajectory = report.getWealthTrajectory('dynasty-1');
    expect(trajectory.length).toBe(2);
  });

  it('empty trajectory for dynasty with no snapshots', () => {
    const report = createTestReport();
    const trajectory = report.getWealthTrajectory('dynasty-999');
    expect(trajectory.length).toBe(0);
  });

  it('snapshots include timestamps', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 5000n * MICRO, 10000n * MICRO);
    const trajectory = report.getWealthTrajectory('dynasty-1');
    const snapshot = trajectory[0];
    expect(snapshot).toBeDefined();
    if (snapshot !== undefined) {
      expect(snapshot.timestamp).toBeGreaterThan(0n);
    }
  });

  it('multiple snapshots accumulate', () => {
    const report = createTestReport();
    for (let i = 0; i < 10; i = i + 1) {
      const amount = BigInt(i) * 1000n * MICRO;
      report.takeWealthSnapshot('dynasty-1', amount, amount);
    }
    const trajectory = report.getWealthTrajectory('dynasty-1');
    expect(trajectory.length).toBe(10);
  });
});

describe('PlayerEconomyReport economic reports', () => {
  it('generates economic report', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.dynastyId).toBe('dynasty-1');
  });

  it('report includes total income', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'CRAFT', 500n * MICRO, 'Craft');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.totalIncome).toBe(1500n * MICRO);
  });

  it('report includes total spending', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase');
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.totalSpending).toBe(400n * MICRO);
  });

  it('report calculates net change', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.netChange).toBe(700n * MICRO);
  });

  it('report includes period boundaries', () => {
    const report = createTestReport();
    const econ = report.generateReport('dynasty-1', 1_000_000n, 5_000_000n);
    expect(econ.periodStart).toBe(1_000_000n);
    expect(econ.periodEnd).toBe(5_000_000n);
  });

  it('report identifies top income source', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 500n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'CRAFT', 1500n * MICRO, 'Craft');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.topIncomeSource).toBe('CRAFT');
  });

  it('report identifies top spending category', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'PURCHASE', 500n * MICRO, 'Purchase');
    report.recordSpending('dynasty-1', 'INVESTMENT', 1500n * MICRO, 'Investment');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.topSpendingCategory).toBe('INVESTMENT');
  });

  it('report calculates wealth growth rate', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 1000n * MICRO, 0n);
    report.takeWealthSnapshot('dynasty-1', 1500n * MICRO, 0n);
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.wealthGrowthRate).toBeCloseTo(50, 0);
  });

  it('growth rate zero with no snapshots', () => {
    const report = createTestReport();
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.wealthGrowthRate).toBe(0);
  });

  it('growth rate zero with single snapshot', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 1000n * MICRO, 0n);
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.wealthGrowthRate).toBe(0);
  });

  it('negative growth rate when wealth decreases', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 2000n * MICRO, 0n);
    report.takeWealthSnapshot('dynasty-1', 1000n * MICRO, 0n);
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.wealthGrowthRate).toBeCloseTo(-50, 0);
  });
});

describe('PlayerEconomyReport market share', () => {
  it('calculates market share', () => {
    const report = createTestReport();
    const share = report.getMarketShare('dynasty-1', 'world-1', 'iron', 1000n);
    expect(share.dynastyId).toBe('dynasty-1');
    expect(share.commodityId).toBe('iron');
  });

  it('market share percentage based on volume', () => {
    const report = createTestReport();
    const share = report.getMarketShare('dynasty-1', 'world-1', 'iron', 1000n);
    expect(share.sharePercentage).toBeGreaterThanOrEqual(0);
  });

  it('zero share when no player volume', () => {
    const report = createTestReport();
    const share = report.getMarketShare('dynasty-1', 'world-1', 'iron', 1000n);
    expect(share.playerVolume).toBe(0n);
    expect(share.sharePercentage).toBe(0);
  });

  it('share includes total volume', () => {
    const report = createTestReport();
    const share = report.getMarketShare('dynasty-1', 'world-1', 'iron', 5000n);
    expect(share.totalVolume).toBe(5000n);
  });

  it('handles zero total volume', () => {
    const report = createTestReport();
    const share = report.getMarketShare('dynasty-1', 'world-1', 'iron', 0n);
    expect(share.sharePercentage).toBe(0);
  });

  it('market share separate per commodity', () => {
    const report = createTestReport();
    const shareIron = report.getMarketShare('dynasty-1', 'world-1', 'iron', 1000n);
    const shareWheat = report.getMarketShare('dynasty-1', 'world-1', 'wheat', 2000n);
    expect(shareIron.commodityId).toBe('iron');
    expect(shareWheat.commodityId).toBe('wheat');
  });
});

describe('PlayerEconomyReport event history', () => {
  it('retrieves complete event history', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBe(2);
  });

  it('history includes both income and spending', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Trade');
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Purchase');
    report.recordIncome('dynasty-1', 'CRAFT', 500n * MICRO, 'Craft');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBe(3);
  });

  it('history sorted by timestamp', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'First');
    report.recordSpending('dynasty-1', 'PURCHASE', 300n * MICRO, 'Second');
    report.recordIncome('dynasty-1', 'CRAFT', 500n * MICRO, 'Third');
    const history = report.getEventHistory('dynasty-1');
    expect(history.length).toBe(3);
    const first = history[0];
    const last = history[2];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (first !== undefined && last !== undefined) {
      expect(first.timestamp).toBeLessThanOrEqual(last.timestamp);
    }
  });

  it('empty history for dynasty with no events', () => {
    const report = createTestReport();
    const history = report.getEventHistory('dynasty-999');
    expect(history.length).toBe(0);
  });

  it('event includes description', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Sold 100 units of iron');
    const history = report.getEventHistory('dynasty-1');
    const event = history[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.description).toBe('Sold 100 units of iron');
    }
  });

  it('event includes category', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'QUEST_REWARD', 2000n * MICRO, 'Quest completion');
    const history = report.getEventHistory('dynasty-1');
    const event = history[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.category).toBe('QUEST_REWARD');
    }
  });
});

describe('PlayerEconomyReport edge cases', () => {
  it('handles zero income', () => {
    const report = createTestReport();
    const total = report.getTotalIncome('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(0n);
  });

  it('handles zero spending', () => {
    const report = createTestReport();
    const total = report.getTotalSpending('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(0n);
  });

  it('handles very large income amounts', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1_000_000_000n * MICRO, 'Massive trade');
    const total = report.getTotalIncome('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(1_000_000_000n * MICRO);
  });

  it('handles very large spending amounts', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'INVESTMENT', 1_000_000_000n * MICRO, 'Large investment');
    const total = report.getTotalSpending('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(1_000_000_000n * MICRO);
  });

  it('multiple dynasties tracked independently', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Dynasty 1 trade');
    report.recordIncome('dynasty-2', 'CRAFT', 2000n * MICRO, 'Dynasty 2 craft');
    const total1 = report.getTotalIncome('dynasty-1', 0n, 2_000_000n);
    const total2 = report.getTotalIncome('dynasty-2', 0n, 2_000_000n);
    expect(total1).toBe(1000n * MICRO);
    expect(total2).toBe(2000n * MICRO);
  });

  it('period filtering excludes events outside range', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 1000n * MICRO, 'Income');
    const totalBefore = report.getTotalIncome('dynasty-1', 0n, 500_000n);
    const totalAfter = report.getTotalIncome('dynasty-1', 2_000_000n, 5_000_000n);
    expect(totalBefore).toBe(0n);
    expect(totalAfter).toBe(0n);
  });

  it('handles empty income breakdown', () => {
    const report = createTestReport();
    const breakdown = report.getIncomeBreakdown('dynasty-1', 0n, 2_000_000n);
    expect(breakdown.length).toBe(0);
  });

  it('handles empty spending breakdown', () => {
    const report = createTestReport();
    const breakdown = report.getSpendingBreakdown('dynasty-1', 0n, 2_000_000n);
    expect(breakdown.length).toBe(0);
  });

  it('handles mixed positive and negative net change', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 500n * MICRO, 'Income');
    report.recordSpending('dynasty-1', 'LOSS', 1000n * MICRO, 'Loss');
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.netChange).toBe(-500n * MICRO);
  });

  it('wealth growth handles zero initial wealth', () => {
    const report = createTestReport();
    report.takeWealthSnapshot('dynasty-1', 0n, 0n);
    report.takeWealthSnapshot('dynasty-1', 1000n * MICRO, 0n);
    const econ = report.generateReport('dynasty-1', 0n, 2_000_000n);
    expect(econ.wealthGrowthRate).toBe(0);
  });

  it('handles many events efficiently', () => {
    const report = createTestReport();
    for (let i = 0; i < 1000; i = i + 1) {
      report.recordIncome('dynasty-1', 'TRADE', 10n * MICRO, 'Trade ' + String(i));
    }
    const total = report.getTotalIncome('dynasty-1', 0n, 2_000_000n);
    expect(total).toBe(10000n * MICRO);
  });

  it('handles all income source types', () => {
    const report = createTestReport();
    report.recordIncome('dynasty-1', 'TRADE', 100n * MICRO, 'Trade');
    report.recordIncome('dynasty-1', 'CRAFT', 100n * MICRO, 'Craft');
    report.recordIncome('dynasty-1', 'QUEST_REWARD', 100n * MICRO, 'Quest');
    report.recordIncome('dynasty-1', 'INTEREST', 100n * MICRO, 'Interest');
    report.recordIncome('dynasty-1', 'DIVIDEND', 100n * MICRO, 'Dividend');
    report.recordIncome('dynasty-1', 'GIFT', 100n * MICRO, 'Gift');
    report.recordIncome('dynasty-1', 'MINING', 100n * MICRO, 'Mining');
    report.recordIncome('dynasty-1', 'HARVEST', 100n * MICRO, 'Harvest');
    const breakdown = report.getIncomeBreakdown('dynasty-1', 0n, 2_000_000n);
    expect(breakdown.length).toBe(8);
  });

  it('handles all spending category types', () => {
    const report = createTestReport();
    report.recordSpending('dynasty-1', 'TAX', 100n * MICRO, 'Tax');
    report.recordSpending('dynasty-1', 'PURCHASE', 100n * MICRO, 'Purchase');
    report.recordSpending('dynasty-1', 'INVESTMENT', 100n * MICRO, 'Investment');
    report.recordSpending('dynasty-1', 'LOSS', 100n * MICRO, 'Loss');
    report.recordSpending('dynasty-1', 'TRANSFER', 100n * MICRO, 'Transfer');
    report.recordSpending('dynasty-1', 'FEE', 100n * MICRO, 'Fee');
    report.recordSpending('dynasty-1', 'DONATION', 100n * MICRO, 'Donation');
    const breakdown = report.getSpendingBreakdown('dynasty-1', 0n, 2_000_000n);
    expect(breakdown.length).toBe(7);
  });
});
