import { describe, expect, it } from 'vitest';
import { createTransitCapacityModule } from '../transit-capacity.js';

describe('transit-capacity simulation', () => {
  it('tracks corridor utilization and reports congestion levels', () => {
    const module = createTransitCapacityModule({
      clock: { nowMicroseconds: () => 1_000_000n },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    });

    module.setCapacity('c1', 10, 3_600_000_000n);
    for (let i = 0; i < 8; i++) {
      module.recordTransit('c1', `entity-${i}`);
    }

    const congestion = module.getCongestionLevel('c1');
    expect(congestion.found).toBe(true);
    if (!congestion.found) return;
    expect(congestion.level).toBe('HEAVY');

    const report = module.getCapacityReport('c1');
    expect(report.found).toBe(true);
    if (!report.found) return;
    expect(report.report.currentLoad).toBe(8);
  });
});
