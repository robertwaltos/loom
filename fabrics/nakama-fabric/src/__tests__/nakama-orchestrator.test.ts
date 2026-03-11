/**
 * Nakama Fabric Orchestrator — Proves the top-level composition works.
 */

import { describe, it, expect } from 'vitest';
import { createNakamaOrchestrator } from '../nakama-orchestrator.js';
import type {
  NakamaOrchestratorDeps,
  FabricPresencePort,
  FabricContinuityPort,
  FabricLatticePort,
  FabricChroniclePort,
  FabricMortalityPort,
  FabricPresenceRecord,
  FabricContinuityTransition,
} from '../nakama-orchestrator.js';

// ─── Helpers ────────────────────────────────────────────────────────

interface MockPresence extends FabricPresencePort {
  readonly addOnline: (dynastyId: string, worldId: string) => void;
  readonly idleSweptCount: () => number;
}

function createMockPresence(): MockPresence {
  const records: FabricPresenceRecord[] = [];
  let swept = 0;

  return {
    addOnline: (dynastyId, worldId) => {
      records.push({ dynastyId, worldId });
    },
    idleSweptCount: () => swept,
    sweepIdle: () => {
      swept += 1;
      return 0;
    },
    listInWorld: (wId) => records.filter((r) => r.worldId === wId),
    getStats: () => ({ onlineCount: records.length, idleCount: 0 }),
  };
}

function createMockContinuity(
  transitions?: ReadonlyArray<FabricContinuityTransition>,
): FabricContinuityPort {
  const trans = transitions ?? [];
  return {
    tick: () => ({
      transitions: trans,
      auctionsCreated: 0,
      auctionsCompleted: 0,
      chronicleEntries: 0,
    }),
  };
}

interface MockLattice extends FabricLatticePort {
  readonly addWorld: (worldId: string, integrity: number) => void;
}

function createMockLattice(): MockLattice {
  const worlds = new Map<string, number>();

  return {
    addWorld: (id, integrity) => {
      worlds.set(id, integrity);
    },
    listWorlds: () => [...worlds.keys()],
    getIntegrity: (id) => worlds.get(id) ?? 0,
    restore: (id, amount, _reason) => {
      const prev = worlds.get(id) ?? 0;
      const next = Math.min(100, prev + amount);
      worlds.set(id, next);
      return { worldId: id, previousIntegrity: prev, newIntegrity: next };
    },
    degrade: (id, amount, _reason) => {
      const prev = worlds.get(id) ?? 0;
      const next = Math.max(0, prev - amount);
      worlds.set(id, next);
      return { worldId: id, previousIntegrity: prev, newIntegrity: next };
    },
  };
}

interface MockChronicle extends FabricChroniclePort {
  readonly entries: () => ReadonlyArray<{ category: string; worldId: string }>;
}

function createMockChronicle(): MockChronicle {
  const log: Array<{ category: string; worldId: string }> = [];
  let seq = 0;

  return {
    entries: () => [...log],
    append: (entry) => {
      seq += 1;
      log.push({ category: entry.category, worldId: entry.worldId });
      return 'chr-' + String(seq);
    },
  };
}

function mockClock(): { readonly nowMicroseconds: () => number } {
  let t = 1000;
  return { nowMicroseconds: () => t++ };
}

function buildDeps(overrides?: Partial<NakamaOrchestratorDeps>): {
  readonly deps: NakamaOrchestratorDeps;
  readonly presence: MockPresence;
  readonly lattice: MockLattice;
  readonly chronicle: MockChronicle;
} {
  const presence = createMockPresence();
  const lattice = createMockLattice();
  const chronicle = createMockChronicle();

  const deps: NakamaOrchestratorDeps = {
    presence,
    continuity: createMockContinuity(),
    lattice,
    chronicle,
    clock: mockClock(),
    ...overrides,
  };

  return { deps, presence, lattice, chronicle };
}

// ─── Construction ───────────────────────────────────────────────────

describe('NakamaOrchestrator — construction', () => {
  it('creates with default config', () => {
    const { deps } = buildDeps();
    const orch = createNakamaOrchestrator(deps);
    expect(orch.getTickCount()).toBe(0);
    expect(orch.getWorldActivity()).toEqual([]);
  });

  it('accepts custom config overrides', () => {
    const { deps } = buildDeps();
    const orch = createNakamaOrchestrator(deps, { restorePerPlayer: 0.5 });
    expect(orch.getTickCount()).toBe(0);
  });
});

// ─── Basic Tick ─────────────────────────────────────────────────────

describe('NakamaOrchestrator — basic tick', () => {
  it('increments tick count on each tick', () => {
    const { deps } = buildDeps();
    const orch = createNakamaOrchestrator(deps);
    orch.tick();
    expect(orch.getTickCount()).toBe(1);
    orch.tick();
    expect(orch.getTickCount()).toBe(2);
  });

  it('returns tick number in result', () => {
    const { deps } = buildDeps();
    const orch = createNakamaOrchestrator(deps);
    const r1 = orch.tick();
    const r2 = orch.tick();
    expect(r1.tickNumber).toBe(1);
    expect(r2.tickNumber).toBe(2);
  });

  it('sweeps idle presences each tick', () => {
    const { deps, presence } = buildDeps();
    const orch = createNakamaOrchestrator(deps);
    orch.tick();
    expect(presence.idleSweptCount()).toBe(1);
  });
});

// ─── Continuity Integration ─────────────────────────────────────────

describe('NakamaOrchestrator — continuity', () => {
  it('reports continuity transitions from tick', () => {
    const transitions: FabricContinuityTransition[] = [
      { dynastyId: 'd1', from: 'active', to: 'dormant_30', reason: 'inactive' },
    ];
    const continuity = createMockContinuity(transitions);
    const { deps } = buildDeps({ continuity });
    const orch = createNakamaOrchestrator(deps);
    const result = orch.tick();
    expect(result.continuityTransitions).toBe(1);
  });

  it('reports zero transitions when none occur', () => {
    const { deps } = buildDeps();
    const orch = createNakamaOrchestrator(deps);
    const result = orch.tick();
    expect(result.continuityTransitions).toBe(0);
  });
});

// ─── World Activity ─────────────────────────────────────────────────

describe('NakamaOrchestrator — world activity', () => {
  it('computes activity per registered world', () => {
    const { deps, presence, lattice } = buildDeps();
    lattice.addWorld('earth', 80);
    lattice.addWorld('mars', 60);
    presence.addOnline('alice', 'earth');
    presence.addOnline('bob', 'earth');

    const orch = createNakamaOrchestrator(deps);
    orch.tick();
    const activity = orch.getWorldActivity();

    expect(activity).toHaveLength(2);
    const earth = activity.find((a) => a.worldId === 'earth');
    const mars = activity.find((a) => a.worldId === 'mars');
    expect(earth?.activePlayers).toBe(2);
    expect(mars?.activePlayers).toBe(0);
  });
});

// ─── Lattice Integrity ──────────────────────────────────────────────

describe('NakamaOrchestrator — integrity adjustment', () => {
  it('restores integrity for worlds with active players', () => {
    const { deps, presence, lattice } = buildDeps();
    lattice.addWorld('earth', 50);
    presence.addOnline('alice', 'earth');

    const orch = createNakamaOrchestrator(deps, { restorePerPlayer: 1.0 });
    orch.tick();

    expect(lattice.getIntegrity('earth')).toBe(51);
  });

  it('degrades integrity for empty worlds', () => {
    const { deps, lattice } = buildDeps();
    lattice.addWorld('mars', 50);

    const orch = createNakamaOrchestrator(deps, { degradeEmptyWorld: 0.5 });
    orch.tick();

    expect(lattice.getIntegrity('mars')).toBe(49.5);
  });

  it('does not restore beyond 100', () => {
    const { deps, presence, lattice } = buildDeps();
    lattice.addWorld('earth', 100);
    presence.addOnline('alice', 'earth');

    const orch = createNakamaOrchestrator(deps, { restorePerPlayer: 5.0 });
    const result = orch.tick();

    expect(lattice.getIntegrity('earth')).toBe(100);
    expect(result.integrityChanges).toBe(0);
  });

  it('does not degrade below 0', () => {
    const { deps, lattice } = buildDeps();
    lattice.addWorld('mars', 0);

    const orch = createNakamaOrchestrator(deps, { degradeEmptyWorld: 1.0 });
    const result = orch.tick();

    expect(lattice.getIntegrity('mars')).toBe(0);
    expect(result.integrityChanges).toBe(0);
  });

  it('records chronicle entries for integrity changes', () => {
    const { deps, presence, lattice, chronicle } = buildDeps();
    lattice.addWorld('earth', 50);
    lattice.addWorld('mars', 50);
    presence.addOnline('alice', 'earth');

    const orch = createNakamaOrchestrator(deps, {
      restorePerPlayer: 1.0,
      degradeEmptyWorld: 0.5,
    });
    orch.tick();

    const entries = chronicle.entries();
    const integrityEntries = entries.filter((e) => e.category === 'world.integrity');
    expect(integrityEntries.length).toBe(2);
  });

  it('scales restoration by player count', () => {
    const { deps, presence, lattice } = buildDeps();
    lattice.addWorld('earth', 50);
    presence.addOnline('alice', 'earth');
    presence.addOnline('bob', 'earth');
    presence.addOnline('carol', 'earth');

    const orch = createNakamaOrchestrator(deps, { restorePerPlayer: 0.5 });
    orch.tick();

    expect(lattice.getIntegrity('earth')).toBe(51.5);
  });
});

// ─── Multi-Tick ─────────────────────────────────────────────────────

describe('NakamaOrchestrator — multi-tick', () => {
  it('accumulates integrity changes over multiple ticks', () => {
    const { deps, presence, lattice } = buildDeps();
    lattice.addWorld('earth', 50);
    presence.addOnline('alice', 'earth');

    const orch = createNakamaOrchestrator(deps, { restorePerPlayer: 1.0 });

    for (let i = 0; i < 5; i++) {
      orch.tick();
    }

    expect(lattice.getIntegrity('earth')).toBe(55);
    expect(orch.getTickCount()).toBe(5);
  });
});

// ─── Mortality Dispatch ──────────────────────────────────────────────

function createMockMortality(): FabricMortalityPort & {
  readonly receivedTransitions: FabricContinuityTransition[][];
} {
  const receivedTransitions: FabricContinuityTransition[][] = [];
  return {
    receivedTransitions,
    processTransitions: (transitions) => {
      receivedTransitions.push([...transitions]);
      return transitions.length;
    },
  };
}

describe('NakamaOrchestrator — mortality dispatch', () => {
  it('dispatches continuity transitions to mortality port', () => {
    const transitions: FabricContinuityTransition[] = [
      { dynastyId: 'd1', from: 'active', to: 'dormant_30', reason: 'inactive' },
      { dynastyId: 'd2', from: 'active', to: 'dormant_60', reason: 'inactive' },
    ];
    const continuity = createMockContinuity(transitions);
    const mortality = createMockMortality();
    const { deps } = buildDeps({ continuity, mortality });
    const orch = createNakamaOrchestrator(deps);

    const result = orch.tick();

    expect(result.mortalityNotifications).toBe(2);
    expect(mortality.receivedTransitions).toHaveLength(1);
    expect(mortality.receivedTransitions[0]).toHaveLength(2);
  });

  it('returns zero mortality notifications when no port', () => {
    const { deps } = buildDeps();
    const orch = createNakamaOrchestrator(deps);
    const result = orch.tick();
    expect(result.mortalityNotifications).toBe(0);
  });

  it('returns zero when no transitions to dispatch', () => {
    const mortality = createMockMortality();
    const { deps } = buildDeps({ mortality });
    const orch = createNakamaOrchestrator(deps);
    const result = orch.tick();
    expect(result.mortalityNotifications).toBe(0);
    expect(mortality.receivedTransitions).toHaveLength(0);
  });
});
