import { describe, it, expect } from 'vitest';
import {
  createNetworkSimulator,
  PROFILE_PERFECT,
  PROFILE_LOSSY,
  PROFILE_MOBILE_4G,
  type NetworkSimulator,
  type NetworkSimulatorDeps,
  type SimPacket,
} from '../index.js';

// ── Test doubles ──────────────────────────────────────────────────────

let packetCounter = 0;
function makePacket(bytes = 512): SimPacket {
  return Object.freeze({
    id: 'pkt-' + String(++packetCounter),
    bytes,
    payload: Object.freeze({ seq: packetCounter }),
    enqueuedAt: 1_000,
  });
}

type ScheduledFn = { fn: () => void; delayMs: number };

function makeDeps(lossOverride?: number): { deps: NetworkSimulatorDeps; scheduled: ScheduledFn[] } {
  const scheduled: ScheduledFn[] = [];
  let rngSeq = 0;
  // Pseudo-RNG: returns values cycling 0.0, 0.1, 0.2 … 0.9, repeat
  // lossOverride forces loss check (rng.random()) to always return that value
  const deps: NetworkSimulatorDeps = {
    clock: { nowMs: () => 2_000 },
    rng: {
      random: () => {
        const v = (rngSeq++ % 10) / 10;
        return lossOverride !== undefined ? lossOverride : v;
      },
    },
    scheduler: {
      schedule: (fn, delayMs) => { scheduled.push({ fn, delayMs }); },
    },
  };
  return { deps, scheduled };
}

function flushAll(scheduled: ScheduledFn[]): void {
  while (scheduled.length > 0) {
    const item = scheduled.shift();
    if (item !== undefined) item.fn();
  }
}

function makeSimulator(lossOverride?: number): { sim: NetworkSimulator; scheduled: ScheduledFn[] } {
  packetCounter = 0;
  const { deps, scheduled } = makeDeps(lossOverride);
  const sim = createNetworkSimulator(deps, PROFILE_PERFECT);
  return { sim, scheduled };
}

// ── send + perfect profile ────────────────────────────────────────────

describe('send with PROFILE_PERFECT', () => {
  it('queues every packet without drops', () => {
    const { sim, scheduled } = makeSimulator();
    sim.send(makePacket());
    sim.send(makePacket());
    expect(scheduled).toHaveLength(2);
    expect(sim.getStats().dropped).toBe(0);
  });

  it('delivers packets via scheduler callbacks', () => {
    const { sim, scheduled } = makeSimulator();
    const delivered: string[] = [];
    sim.onDeliver((p) => { delivered.push(p.id); });
    sim.send(makePacket());
    flushAll(scheduled);
    expect(delivered).toHaveLength(1);
    expect(sim.getStats().delivered).toBe(1);
  });
});

// ── packet loss ───────────────────────────────────────────────────────

describe('packet loss', () => {
  it('drops all packets when lossRate=1 (rng always returns 0 < 1.0 threshold)', () => {
    // force rng to return 0 so 0 < any lossRate always triggers loss
    const { deps, scheduled } = makeDeps(0);
    const sim = createNetworkSimulator(deps, { ...PROFILE_PERFECT, lossRate: 1.0 });
    sim.send(makePacket());
    sim.send(makePacket());
    expect(sim.getStats().dropped).toBe(2);
    expect(scheduled).toHaveLength(0);
  });

  it('never drops when lossRate=0', () => {
    const { sim } = makeSimulator();
    sim.setProfile({ ...PROFILE_PERFECT, lossRate: 0 });
    sim.send(makePacket());
    expect(sim.getStats().dropped).toBe(0);
  });
});

// ── setProfile / getProfile ───────────────────────────────────────────

describe('setProfile / getProfile', () => {
  it('returns current profile via getProfile', () => {
    const { sim } = makeSimulator();
    sim.setProfile(PROFILE_MOBILE_4G);
    expect(sim.getProfile()).toBe(PROFILE_MOBILE_4G);
  });
});

// ── stats ─────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks sent, delivered, and dropped correctly', () => {
    const { deps, scheduled } = makeDeps(0);
    // loss=0.5 — with rng returning 0, 0 < 0.5 → drop
    const sim = createNetworkSimulator(deps, { ...PROFILE_PERFECT, lossRate: 0.5 });
    sim.send(makePacket());
    flushAll(scheduled);
    const s = sim.getStats();
    // rng returns 0 → 0 < 0.5 → ALL dropped
    expect(s.sent).toBe(0);
    expect(s.dropped).toBe(1);
  });

  it('calculates avgLatencyMs after delivery', () => {
    const { sim, scheduled } = makeSimulator();
    sim.setProfile({ ...PROFILE_PERFECT, latencyMs: 50, jitterMs: 0 });
    sim.send(makePacket());
    flushAll(scheduled);
    expect(sim.getStats().avgLatencyMs).toBeCloseTo(50, 0);
  });
});

// ── reset ─────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears all counters', () => {
    const { sim, scheduled } = makeSimulator();
    sim.send(makePacket());
    flushAll(scheduled);
    sim.reset();
    const s = sim.getStats();
    expect(s.sent).toBe(0);
    expect(s.delivered).toBe(0);
  });
});

// ── PROFILE_LOSSY smoke test ──────────────────────────────────────────

describe('PROFILE_LOSSY smoke test', () => {
  it('activates without errors', () => {
    const { sim } = makeSimulator();
    expect(() => { sim.setProfile(PROFILE_LOSSY); }).not.toThrow();
    expect(sim.getProfile().lossRate).toBe(0.10);
  });
});
