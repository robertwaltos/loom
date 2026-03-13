/**
 * bandwidth-predictor-simulation.test.ts — Simulation tests for BandwidthPredictor.
 *
 * Thread: silk/selvage/bandwidth-predictor
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createBandwidthPredictor,
  BANDWIDTH_PREDICTOR_PRIORITY,
} from '../bandwidth-predictor.js';
import type { ActivityTier } from '../bandwidth-predictor.js';

// ── Helpers ───────────────────────────────────────────────────────

function makePredictor(windowSize = 8) {
  return createBandwidthPredictor(
    { clock: { nowMs: () => Date.now() } },
    { windowSize },
  );
}

// ── Module constants ──────────────────────────────────────────────

describe('module constants', () => {
  it('BANDWIDTH_PREDICTOR_PRIORITY is 29', () => {
    expect(BANDWIDTH_PREDICTOR_PRIORITY).toBe(29);
  });
});

// ── registerClient / unregisterClient ────────────────────────────

describe('registerClient / unregisterClient', () => {
  it('registers a client successfully', () => {
    const p = makePredictor();
    expect(p.registerClient('c1')).toBe(true);
    expect(p.clientCount()).toBe(1);
  });

  it('returns false for duplicate registration', () => {
    const p = makePredictor();
    p.registerClient('c1');
    expect(p.registerClient('c1')).toBe(false);
    expect(p.clientCount()).toBe(1);
  });

  it('unregisters a client', () => {
    const p = makePredictor();
    p.registerClient('c1');
    expect(p.unregisterClient('c1')).toBe(true);
    expect(p.clientCount()).toBe(0);
  });

  it('returns false unregistering unknown client', () => {
    const p = makePredictor();
    expect(p.unregisterClient('ghost')).toBe(false);
  });

  it('predict returns undefined for unregistered client', () => {
    const p = makePredictor();
    expect(p.predict('ghost')).toBeUndefined();
  });
});

// ── recordObservation ─────────────────────────────────────────────

describe('recordObservation', () => {
  it('observedSamples increments', () => {
    const p = makePredictor();
    p.registerClient('c1');
    p.recordObservation('c1', 500);
    p.recordObservation('c1', 600);
    expect(p.getStats('c1')?.observedSamples).toBe(2);
  });

  it('fast EWMA moves toward observed value', () => {
    const p = makePredictor();
    p.registerClient('c1', 1000);
    // record a large value many times
    for (let i = 0; i < 20; i++) p.recordObservation('c1', 2000);
    const stats = p.getStats('c1')!;
    expect(stats.fastEwma).toBeGreaterThan(1800);
  });

  it('slow EWMA lags behind fast EWMA', () => {
    const p = makePredictor();
    p.registerClient('c1', 1000);
    for (let i = 0; i < 20; i++) p.recordObservation('c1', 2000);
    const stats = p.getStats('c1')!;
    expect(stats.fastEwma).toBeGreaterThan(stats.slowEwma);
  });

  it('ignores observations for unregistered clients', () => {
    const p = makePredictor();
    expect(() => p.recordObservation('ghost', 100)).not.toThrow();
  });

  it('peakObserved tracks the highest value in the window', () => {
    const p = makePredictor();
    p.registerClient('c1');
    p.recordObservation('c1', 100);
    p.recordObservation('c1', 500);
    p.recordObservation('c1', 200);
    expect(p.getStats('c1')?.peakObserved).toBe(500);
  });
});

// ── setActivityTier ───────────────────────────────────────────────

describe('setActivityTier', () => {
  it('defaults to idle', () => {
    const p = makePredictor();
    p.registerClient('c1');
    expect(p.getStats('c1')?.activityTier).toBe('idle');
  });

  it('updates the tier', () => {
    const p = makePredictor();
    p.registerClient('c1');
    p.setActivityTier('c1', 'combat');
    expect(p.getStats('c1')?.activityTier).toBe('combat');
  });

  it('ignores unknown clients', () => {
    const p = makePredictor();
    expect(() => p.setActivityTier('ghost', 'combat')).not.toThrow();
  });

  const tiers: ActivityTier[] = ['idle', 'walking', 'combat', 'transit'];
  for (const tier of tiers) {
    it(`accepts tier "${tier}"`, () => {
      const p = makePredictor();
      p.registerClient('c1');
      p.setActivityTier('c1', tier);
      expect(p.getStats('c1')?.activityTier).toBe(tier);
    });
  }
});

// ── predict ───────────────────────────────────────────────────────

describe('predict', () => {
  it('returns a prediction object with required fields', () => {
    const p = makePredictor();
    p.registerClient('c1', 2000);
    const r = p.predict('c1')!;
    expect(r).toBeDefined();
    expect(typeof r.predictedBytesNextTick).toBe('number');
    expect(r.predictedBytesNextTick).toBeGreaterThan(0);
    expect(r.clientId).toBe('c1');
    expect(r.activityTier).toBe('idle');
    expect(typeof r.confidenceLevel).toBe('number');
    expect(r.confidenceLevel).toBeGreaterThanOrEqual(0);
    expect(r.confidenceLevel).toBeLessThanOrEqual(1);
  });

  it('returns undefined for unregistered client', () => {
    const p = makePredictor();
    expect(p.predict('ghost')).toBeUndefined();
  });

  it('higher activity tier predicts more bytes', () => {
    const p1 = makePredictor();
    p1.registerClient('idle-c', 2000);
    const idlePred = p1.predict('idle-c')!.predictedBytesNextTick;

    const p2 = makePredictor();
    p2.registerClient('combat-c', 2000);
    p2.setActivityTier('combat-c', 'combat');
    const combatPred = p2.predict('combat-c')!.predictedBytesNextTick;

    expect(combatPred).toBeGreaterThan(idlePred);
  });

  it('prediction increases toward observed values after samples', () => {
    const p = makePredictor();
    p.registerClient('c1', 100); // low initial budget
    const before = p.predict('c1')!.predictedBytesNextTick;

    // Observe high traffic
    for (let i = 0; i < 10; i++) p.recordObservation('c1', 5000);
    const after = p.predict('c1')!.predictedBytesNextTick;

    expect(after).toBeGreaterThan(before);
  });

  it('confidence increases with more samples', () => {
    const p = makePredictor(8);
    p.registerClient('c1');
    const conf0 = p.predict('c1')!.confidenceLevel;

    for (let i = 0; i < 8; i++) p.recordObservation('c1', 1000);
    const conf8 = p.predict('c1')!.confidenceLevel;

    expect(conf8).toBeGreaterThan(conf0);
  });

  it('fastEwma and slowEwma are returned in prediction', () => {
    const p = makePredictor();
    p.registerClient('c1', 1000);
    for (let i = 0; i < 5; i++) p.recordObservation('c1', 1500);
    const r = p.predict('c1')!;
    expect(r.fastEwma).toBeGreaterThan(0);
    expect(r.slowEwma).toBeGreaterThan(0);
  });

  it('prediction is always a positive integer', () => {
    const p = makePredictor();
    p.registerClient('c1', 2000);
    for (let i = 0; i < 20; i++) p.recordObservation('c1', Math.random() * 4000);
    const r = p.predict('c1')!;
    expect(Number.isInteger(r.predictedBytesNextTick)).toBe(true);
    expect(r.predictedBytesNextTick).toBeGreaterThan(0);
  });
});

// ── predictAll ────────────────────────────────────────────────────

describe('predictAll', () => {
  it('returns predictions for all registered clients', () => {
    const p = makePredictor();
    p.registerClient('c1');
    p.registerClient('c2');
    p.registerClient('c3');
    const results = p.predictAll();
    expect(results).toHaveLength(3);
    const ids = results.map((r) => r.clientId).sort();
    expect(ids).toEqual(['c1', 'c2', 'c3']);
  });

  it('returns empty array when no clients', () => {
    const p = makePredictor();
    expect(p.predictAll()).toHaveLength(0);
  });
});

// ── getStats ──────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns undefined for unknown client', () => {
    const p = makePredictor();
    expect(p.getStats('ghost')).toBeUndefined();
  });

  it('tracks all required fields', () => {
    const p = makePredictor();
    p.registerClient('c1', 2000);
    for (let i = 0; i < 5; i++) p.recordObservation('c1', 1000 + i * 100);
    p.predict('c1');
    const stats = p.getStats('c1')!;
    expect(stats.clientId).toBe('c1');
    expect(stats.observedSamples).toBe(5);
    expect(stats.fastEwma).toBeGreaterThan(0);
    expect(stats.slowEwma).toBeGreaterThan(0);
    expect(stats.peakObserved).toBeGreaterThan(0);
    expect(stats.varianceEstimate).toBeGreaterThanOrEqual(0);
    expect(stats.activityTier).toBe('idle');
    expect(stats.lastPrediction).toBeGreaterThan(0);
  });

  it('varianceEstimate is 0 with a single sample', () => {
    const p = makePredictor();
    p.registerClient('c1');
    p.recordObservation('c1', 1000);
    expect(p.getStats('c1')?.varianceEstimate).toBe(0);
  });

  it('varianceEstimate is 0 with no samples', () => {
    const p = makePredictor();
    p.registerClient('c1');
    expect(p.getStats('c1')?.varianceEstimate).toBe(0);
  });
});

// ── spike guard ───────────────────────────────────────────────────

describe('spike guard', () => {
  it('applies multiplier when variance is high', () => {
    const p = createBandwidthPredictor(
      { clock: { nowMs: () => 0 } },
      { windowSize: 8, spikeMultiplier: 2.0 },
    );
    p.registerClient('c1', 2000);
    // Alternating high/low to create high variance
    for (let i = 0; i < 8; i++) {
      p.recordObservation('c1', i % 2 === 0 ? 100 : 4000);
    }
    const result = p.predict('c1')!;
    // With high variance the spike guard should inflate the prediction
    // somewhat — at least more than the fast EWMA alone
    expect(result.predictedBytesNextTick).toBeGreaterThan(result.fastEwma);
  });

  it('does not apply multiplier with stable traffic', () => {
    const p = createBandwidthPredictor(
      { clock: { nowMs: () => 0 } },
      { windowSize: 8, spikeMultiplier: 2.0 },
    );
    p.registerClient('c1', 2000);
    // Stable traffic: all ~1000 bytes
    for (let i = 0; i < 8; i++) {
      p.recordObservation('c1', 1000);
    }
    const result = p.predict('c1')!;
    // Confidence should be high, spike not applied (mult = 1.0)
    // predicted ≈ fastEwma (very close since variance near 0)
    expect(result.predictedBytesNextTick).toBeLessThanOrEqual(
      Math.ceil(result.fastEwma * 1.1), // within 10% of ewma
    );
  });
});

// ── multiple clients ──────────────────────────────────────────────

describe('multiple clients', () => {
  it('tracks each client independently', () => {
    const p = makePredictor();
    p.registerClient('a', 1000);
    p.registerClient('b', 1000);

    for (let i = 0; i < 10; i++) p.recordObservation('a', 2000);
    for (let i = 0; i < 10; i++) p.recordObservation('b', 200);

    const ra = p.predict('a')!;
    const rb = p.predict('b')!;
    expect(ra.predictedBytesNextTick).toBeGreaterThan(rb.predictedBytesNextTick);
  });

  it('unregistering one client does not affect others', () => {
    const p = makePredictor();
    p.registerClient('a');
    p.registerClient('b');
    p.unregisterClient('a');
    expect(p.predict('a')).toBeUndefined();
    expect(p.predict('b')).toBeDefined();
  });
});
