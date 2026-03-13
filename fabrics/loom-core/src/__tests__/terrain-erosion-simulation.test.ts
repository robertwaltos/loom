import { describe, expect, it } from 'vitest';
import { createTerrainErosion } from '../terrain-erosion.js';

describe('terrain-erosion simulation', () => {
  it('simulates wear accumulation and scheduled restoration back to pristine', () => {
    let now = 1_000_000n;
    const erosion = createTerrainErosion({
      clock: { nowMicroseconds: () => now },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    });

    erosion.registerCell('cell-1', 'earth');
    for (let i = 0; i < 8; i++) {
      erosion.recordTraffic('cell-1', 1.0);
    }

    const before = erosion.getErosionReport('cell-1');
    erosion.scheduleRestoration('cell-1', 'PRISTINE', 2_000n);
    now += 3_000n;
    const processed = erosion.processRestorations();
    const after = erosion.getErosionReport('cell-1');

    expect(typeof before).toBe('object');
    expect(processed).toBe(1);
    expect(typeof after).toBe('object');
    if (typeof after === 'string') return;
    expect(after.currentQuality).toBe('PRISTINE');
    expect(after.erosionScore).toBeLessThanOrEqual(20);
  });
});
