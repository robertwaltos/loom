/**
 * bandwidth-optimizer-simulation.test.ts — Simulation tests for BandwidthOptimizer.
 *
 * Thread: silk/selvage/bandwidth-optimizer
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createBandwidthOptimizer,
  BANDWIDTH_OPTIMIZER_PRIORITY,
} from '../bandwidth-optimizer.js';
import type {
  EntityUpdateCandidate,
  EntityPriority,
  OptimisedUpdateBatch,
} from '../bandwidth-optimizer.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeOptimizer(bpsDefault = 500_000, tickRateHz = 30) {
  return createBandwidthOptimizer({}, { defaultBandwidthBps: bpsDefault, tickRateHz });
}

function candidate(
  entityId: string,
  priority: EntityPriority,
  estimatedBytes: number,
  data?: Record<string, unknown>,
): EntityUpdateCandidate {
  return { entityId, priority, estimatedBytes, data: data ?? {} };
}

// ── Module constants ─────────────────────────────────────────────

describe('module constants', () => {
  it('BANDWIDTH_OPTIMIZER_PRIORITY is 30', () => {
    expect(BANDWIDTH_OPTIMIZER_PRIORITY).toBe(30);
  });
});

// ── registerClient / unregisterClient ────────────────────────────

describe('registerClient / unregisterClient', () => {
  it('registers a new client and tracks it', () => {
    const opt = makeOptimizer();
    const ok = opt.registerClient('client-1');
    expect(ok).toBe(true);
    expect(opt.clientCount()).toBe(1);
  });

  it('returns false when registering duplicate client', () => {
    const opt = makeOptimizer();
    opt.registerClient('client-1');
    expect(opt.registerClient('client-1')).toBe(false);
    expect(opt.clientCount()).toBe(1);
  });

  it('removes client on unregisterClient', () => {
    const opt = makeOptimizer();
    opt.registerClient('client-1');
    opt.unregisterClient('client-1');
    expect(opt.clientCount()).toBe(0);
  });

  it('getStats returns undefined for unregistered client', () => {
    const opt = makeOptimizer();
    expect(opt.getStats('ghost')).toBeUndefined();
  });
});

// ── updateClientBandwidth ────────────────────────────────────────

describe('updateClientBandwidth', () => {
  it('changes the budget after update', () => {
    const opt = makeOptimizer(500_000); // 500 kbps → ~2083 bytes/tick at 30 Hz
    opt.registerClient('client-1');
    opt.updateClientBandwidth('client-1', 1_000_000); // 1 Mbps → ~4166 bytes/tick
    const stats = opt.getStats('client-1')!;
    expect(stats.bandwidthBps).toBe(1_000_000);
    expect(stats.budgetBytesPerTick).toBeGreaterThan(3000);
  });
});

// ── optimise — no budget pressure ────────────────────────────────

describe('optimise — no budget pressure', () => {
  it('approves all candidates when they fit in budget', () => {
    const opt = makeOptimizer(500_000, 30); // ~2083 bytes/tick
    opt.registerClient('client-1');

    const candidates: EntityUpdateCandidate[] = [
      candidate('e1', 'normal', 100),
      candidate('e2', 'normal', 100),
      candidate('e3', 'low', 50),
    ];
    const batch = opt.optimise('client-1', candidates);

    expect(batch.approved).toHaveLength(3);
    expect(batch.deferred).toHaveLength(0);
  });

  it('predictedBytes is sum of approved sizes', () => {
    const opt = makeOptimizer();
    opt.registerClient('client-1');
    const batch = opt.optimise('client-1', [
      candidate('e1', 'normal', 100),
      candidate('e2', 'normal', 50),
    ]);
    expect(batch.predictedBytes).toBe(150);
  });
});

// ── optimise — budget pressure ────────────────────────────────────

describe('optimise — budget pressure', () => {
  it('critical updates always pass even when over budget', () => {
    // Very tight budget: 1 kbps @ 30 Hz → ~4 bytes/tick
    const opt = makeOptimizer(1_000, 30);
    opt.registerClient('client-1');

    const candidates: EntityUpdateCandidate[] = [
      candidate('criti', 'critical', 500), // way over budget but must pass
      candidate('cosm', 'cosmetic', 10),
    ];
    const batch = opt.optimise('client-1', candidates);

    const approvedIds = batch.approved.map(c => c.entityId);
    expect(approvedIds).toContain('criti');
  });

  it('drops low-priority candidates when budget full', () => {
    // 10 kbps @ 1 Hz → 1250 bytes/tick
    const opt = makeOptimizer(10_000, 1);
    opt.registerClient('client-1');

    const candidates: EntityUpdateCandidate[] = [
      candidate('high1', 'high', 600),
      candidate('high2', 'high', 600),
      candidate('cosm1', 'cosmetic', 600),
    ];
    const batch = opt.optimise('client-1', candidates);

    const approvedIds = batch.approved.map(c => c.entityId);
    const deferredIds = batch.deferred.map(c => c.entityId);
    expect(approvedIds).toContain('high1');
    expect(approvedIds).toContain('high2');
    expect(deferredIds).toContain('cosm1');
  });

  it('priority order: critical > high > normal > low > cosmetic', () => {
    // Budget can hold exactly 3 items of 100 bytes each (budget = 300 bytes/tick)
    // 24000 bps / (8 bits/byte * 10 Hz) = 300 bytes/tick
    const opt = makeOptimizer(24_000, 10);
    opt.registerClient('client-1');

    const candidates: EntityUpdateCandidate[] = [
      candidate('cosm', 'cosmetic', 100),
      candidate('low', 'low', 100),
      candidate('norm', 'normal', 100),
      candidate('high', 'high', 100),
      candidate('crit', 'critical', 100),
    ];

    const batch = opt.optimise('client-1', candidates);
    // Only 3 slots fit; critical, high, normal should pass; low and cosmetic deferred
    const approvedIds = new Set(batch.approved.map(c => c.entityId));
    expect(approvedIds.has('crit')).toBe(true);
    expect(approvedIds.has('high')).toBe(true);
    expect(approvedIds.has('norm')).toBe(true);
    const deferredIds = new Set(batch.deferred.map(c => c.entityId));
    expect(deferredIds.has('low')).toBe(true);
    expect(deferredIds.has('cosm')).toBe(true);
  });

  it('budgetBytes exposed in returned batch', () => {
    // 4800 bps @ 30 Hz → floor(4800/240) = 20 bytes/tick
    const opt = makeOptimizer(4_800, 30);
    opt.registerClient('client-1');
    const batch = opt.optimise('client-1', []);
    expect(batch.budgetBytes).toBe(20);
  });
});

// ── Unknown client ────────────────────────────────────────────────

describe('optimise — unknown client', () => {
  it('approves everything when client not registered', () => {
    const opt = makeOptimizer(1_000, 30);
    // Do NOT register client
    const candidates: EntityUpdateCandidate[] = [
      candidate('e1', 'cosmetic', 999999),
      candidate('e2', 'cosmetic', 999999),
    ];
    const batch = opt.optimise('unknown-client', candidates);
    expect(batch.approved).toHaveLength(2);
    expect(batch.deferred).toHaveLength(0);
  });
});

// ── recordSent / smoothed usage ───────────────────────────────────

describe('recordSent', () => {
  it('updates smoothedUsageBytesPerTick towards recorded value', () => {
    const opt = makeOptimizer();
    opt.registerClient('client-1');

    // Record a large transmission
    opt.recordSent('client-1', 2000);

    const stats = opt.getStats('client-1')!;
    // EWMA α=0.25: new_smoothed = 0.75*0 + 0.25*2000 = 500
    expect(stats.smoothedUsageBytesPerTick).toBeCloseTo(500, 0);
  });
});

// ── getStats — accounting ─────────────────────────────────────────

describe('getStats — accounting', () => {
  it('tracks totalBytesApproved and totalBytesDeferred across ticks', () => {
    // Very tight: 800 bps @ 10 Hz → 10 bytes/tick
    const opt = makeOptimizer(800, 10);
    opt.registerClient('c1');

    // Tick 1: approve some, defer some
    opt.optimise('c1', [
      candidate('a', 'normal', 6),
      candidate('b', 'cosmetic', 6),
    ]);
    // Tick 2
    opt.optimise('c1', [
      candidate('c', 'high', 4),
    ]);

    const stats = opt.getStats('c1')!;
    // Tick 1: 'a' approved (6), 'b' deferred (6); Tick 2: 'c' approved (4)
    expect(stats.totalBytesApproved).toBe(10);
    expect(stats.totalBytesDeferred).toBe(6);
  });

  it('tracks ticksProcessed', () => {
    const opt = makeOptimizer();
    opt.registerClient('c1');

    for (let i = 0; i < 5; i++) {
      opt.optimise('c1', []);
    }

    expect(opt.getStats('c1')?.ticksProcessed).toBe(5);
  });

  it('exposes bandwidthBps and budgetBytesPerTick', () => {
    // 240_000 bps @ 30 Hz → 1000 bytes/tick
    const opt = makeOptimizer(240_000, 30);
    opt.registerClient('c1');

    const stats = opt.getStats('c1')!;
    expect(stats.bandwidthBps).toBe(240_000);
    expect(stats.budgetBytesPerTick).toBe(1000);
  });
});
