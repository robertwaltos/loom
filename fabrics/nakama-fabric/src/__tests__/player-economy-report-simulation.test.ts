import { describe, expect, it } from 'vitest';
import { createPlayerEconomyReport } from '../player-economy-report.js';

describe('player-economy-report simulation', () => {
  it('simulates an economic season with income, spending, and wealth snapshots', () => {
    let now = 1_000_000n;
    let id = 0;
    const micro = 1_000_000n;
    const report = createPlayerEconomyReport({
      clock: { nowMicroseconds: () => (now += 1_000_000n) },
      idGen: { next: () => `rep-${++id}` },
    });

    report.recordIncome('dyn-1', 'TRADE', 2_000n * micro, 'ore run');
    report.recordIncome('dyn-1', 'CRAFT', 1_000n * micro, 'tooling');
    report.recordSpending('dyn-1', 'PURCHASE', 900n * micro, 'fleet repair');
    report.recordSpending('dyn-1', 'TAX', 100n * micro, 'planetary tax');
    report.takeWealthSnapshot('dyn-1', 5_000n * micro, 10_000n * micro);

    const econ = report.generateReport('dyn-1', 0n, now + 5_000_000n);
    expect(econ.totalIncome).toBe(3_000n * micro);
    expect(econ.totalSpending).toBe(1_000n * micro);
    expect(report.getTopIncomeSource('dyn-1', 0n, now)).toBe('TRADE');
    expect(report.getWealthTrajectory('dyn-1')).toHaveLength(1);
  });
});
