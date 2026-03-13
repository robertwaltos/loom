import { describe, it, expect } from 'vitest';
import {
  createEconomySimulator,
  DEFAULT_ECONOMY_PARAMS,
  ECONOMY_PRESETS,
} from '../index.js';

// ── setParameter ──────────────────────────────────────────────────

describe('setParameter', () => {
  it('changes a parameter before next run', () => {
    const sim = createEconomySimulator({ playerCount: 10, avgTradeVolumePerPlayer: 100, taxRate: 0.1 });
    sim.setParameter('taxRate', 0.5);
    const snaps = sim.run(1);
    const snap = snaps.at(0);
    if (snap === undefined) throw new Error('expected snapshot');
    // With 50% tax, revenue is 10 * 100 * 0.5 = 500
    expect(snap.taxRevenue).toBeCloseTo(500, 2);
  });

  it('does not retroactively change past snapshots', () => {
    const sim = createEconomySimulator();
    const firstRun = sim.run(1);
    const before = firstRun.at(0);
    if (before === undefined) throw new Error('expected snapshot');
    sim.setParameter('taxRate', 0.99);
    const afterTax = before.taxRevenue;
    // The first run already completed; the stored snapshot is unchanged
    expect(sim.getSnapshot(1)?.taxRevenue).toBeCloseTo(afterTax, 5);
  });
});

// ── run ───────────────────────────────────────────────────────────

describe('run', () => {
  it('returns one snapshot per tick', () => {
    const sim = createEconomySimulator();
    const snaps = sim.run(5);
    expect(snaps).toHaveLength(5);
    const first = snaps.at(0);
    const last = snaps.at(4);
    if (first === undefined || last === undefined) throw new Error('expected snapshots');
    expect(first.tick).toBe(1);
    expect(last.tick).toBe(5);
  });

  it('returns empty array for 0 ticks', () => {
    const sim = createEconomySimulator();
    expect(sim.run(0)).toHaveLength(0);
  });

  it('accumulates ticks across multiple run calls', () => {
    const sim = createEconomySimulator();
    sim.run(3);
    sim.run(2);
    expect(sim.getStats().currentTick).toBe(5);
  });

  it('velocity is non-negative', () => {
    const sim = createEconomySimulator();
    for (const snap of sim.run(10)) {
      expect(snap.velocity).toBeGreaterThanOrEqual(0);
    }
  });

  it('gini coefficient is between 0 and 1', () => {
    const sim = createEconomySimulator();
    for (const snap of sim.run(10)) {
      expect(snap.giniCoefficient).toBeGreaterThanOrEqual(0);
      expect(snap.giniCoefficient).toBeLessThanOrEqual(1);
    }
  });

  it('inflation stays within floor and ceiling', () => {
    const sim = createEconomySimulator({ inflationFloor: 1.0, inflationCeiling: 3.0 });
    for (const snap of sim.run(50)) {
      expect(snap.inflationIndex).toBeGreaterThanOrEqual(1.0);
      expect(snap.inflationIndex).toBeLessThanOrEqual(3.0);
    }
  });

  it('wealth bands sum to approximately playerCount', () => {
    const sim = createEconomySimulator({ playerCount: 100 });
    const snaps = sim.run(1);
    const snap = snaps.at(0);
    if (snap === undefined) throw new Error('expected snapshot');
    const total = snap.wealthBands.reduce((s, b) => s + b.playerCount, 0);
    // bands use Math.floor so sum might be slightly under playerCount
    expect(total).toBeLessThanOrEqual(100);
    expect(total).toBeGreaterThan(90);
  });
});

// ── getSnapshot ───────────────────────────────────────────────────

describe('getSnapshot', () => {
  it('returns null for tick before simulation starts', () => {
    const sim = createEconomySimulator();
    expect(sim.getSnapshot(0)).toBeNull();
  });

  it('returns null for a future tick not yet run', () => {
    const sim = createEconomySimulator();
    sim.run(3);
    expect(sim.getSnapshot(4)).toBeNull();
  });

  it('returns snapshot for a tick that has been run', () => {
    const sim = createEconomySimulator();
    sim.run(5);
    const snap = sim.getSnapshot(3);
    expect(snap).not.toBeNull();
    expect(snap?.tick).toBe(3);
  });
});

// ── getLatest ─────────────────────────────────────────────────────

describe('getLatest', () => {
  it('returns null before any ticks', () => {
    expect(createEconomySimulator().getLatest()).toBeNull();
  });

  it('returns last snapshot after running', () => {
    const sim = createEconomySimulator();
    sim.run(7);
    expect(sim.getLatest()?.tick).toBe(7);
  });
});

// ── reset ─────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears tick history', () => {
    const sim = createEconomySimulator();
    sim.run(10);
    sim.reset();
    expect(sim.getStats().currentTick).toBe(0);
    expect(sim.getSnapshot(5)).toBeNull();
  });

  it('can override params on reset', () => {
    const sim = createEconomySimulator({ kalonSupply: 1_000 });
    sim.run(3);
    sim.reset({ kalonSupply: 9_999 });
    const afterResetSnaps = sim.run(1);
    const snap = afterResetSnaps.at(0);
    if (snap === undefined) throw new Error('expected snapshot');
    // Supply after reset starts at 9_999
    expect(snap.kalonSupply).toBeGreaterThan(1_000);
  });
});

// ── getStats ──────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zero stats initially', () => {
    const stats = createEconomySimulator().getStats();
    expect(stats).toMatchObject({
      currentTick: 0,
      totalTaxCollected: 0,
      snapshotCount: 0,
    });
  });

  it('accumulates tax across ticks', () => {
    const sim = createEconomySimulator({ playerCount: 10, avgTradeVolumePerPlayer: 100, taxRate: 0.1 });
    sim.run(5);
    // Each tick: tax = 10 * 100 * 0.1 = 100; 5 ticks = 500
    expect(sim.getStats().totalTaxCollected).toBeCloseTo(500, 0);
  });

  it('tracks peak inflation index', () => {
    const sim = createEconomySimulator();
    sim.run(20);
    expect(sim.getStats().peakInflationIndex).toBeGreaterThanOrEqual(DEFAULT_ECONOMY_PARAMS.inflationFloor);
  });

  it('counts snapshots correctly', () => {
    const sim = createEconomySimulator();
    sim.run(5);
    expect(sim.getStats().snapshotCount).toBe(5);
  });
});

// ── ECONOMY_PRESETS ───────────────────────────────────────────────

describe('ECONOMY_PRESETS', () => {
  it.each(Object.entries(ECONOMY_PRESETS))('preset %s produces snapshots without errors', (_, params) => {
    const sim = createEconomySimulator(params);
    const snaps = sim.run(10);
    expect(snaps).toHaveLength(10);
    for (const s of snaps) {
      expect(s.inflationIndex).toBeGreaterThanOrEqual(params.inflationFloor);
      expect(s.inflationIndex).toBeLessThanOrEqual(params.inflationCeiling);
    }
  });
});

// ── DEFAULT_ECONOMY_PARAMS ────────────────────────────────────────

describe('DEFAULT_ECONOMY_PARAMS', () => {
  it('has valid shape', () => {
    expect(DEFAULT_ECONOMY_PARAMS.kalonSupply).toBeGreaterThan(0);
    expect(DEFAULT_ECONOMY_PARAMS.taxRate).toBeGreaterThan(0);
    expect(DEFAULT_ECONOMY_PARAMS.taxRate).toBeLessThan(1);
    expect(DEFAULT_ECONOMY_PARAMS.playerCount).toBeGreaterThan(0);
  });
});
