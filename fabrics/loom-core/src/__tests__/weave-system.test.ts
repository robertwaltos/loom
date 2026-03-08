/**
 * Weave System — Proves the transit-to-ECS adapter works.
 */

import { describe, it, expect } from 'vitest';
import { createWeaveSystem, WEAVE_SYSTEM_PRIORITY } from '../weave-system.js';
import type {
  WeaveSystemOrchestrator,
  WeaveSystemTickResult,
  WeaveTransitCompletionPort,
  WeaveCompletedTransit,
} from '../weave-system.js';
import type { SystemContext } from '../system-registry.js';
import { createComponentStore } from '../component-store.js';
import type { EntityId, WorldMembershipComponent } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function ctx(tick: number): SystemContext {
  return { deltaMs: 33, tickNumber: tick, wallTimeMicroseconds: tick * 33000 };
}

function mockClock(): { readonly nowMicroseconds: () => number } {
  let t = 1_000_000;
  return { nowMicroseconds: () => t++ };
}

// ── Mock Orchestrator ──────────────────────────────────────────────

function mockOrchestrator(): WeaveSystemOrchestrator & { readonly tickCount: () => number } {
  let ticks = 0;
  return {
    tick: (): WeaveSystemTickResult => {
      ticks += 1;
      return {
        corridorsOpened: 0,
        transitsCompleted: 0,
        transitsAborted: 0,
        activeCorridors: 0,
        tickNumber: ticks,
      };
    },
    tickCount: () => ticks,
  };
}

// ── Mock Completion Port ───────────────────────────────────────────

function mockCompletions(
  entries?: WeaveCompletedTransit[],
): WeaveTransitCompletionPort {
  const queue = entries ?? [];
  return {
    drainCompleted: (): WeaveCompletedTransit[] => {
      const result = [...queue];
      queue.length = 0;
      return result;
    },
  };
}

// ── System Adapter ─────────────────────────────────────────────────

describe('WeaveSystem — adapter', () => {
  it('calls orchestrator tick each system tick', () => {
    const orch = mockOrchestrator();
    const system = createWeaveSystem({
      orchestrator: orch,
      completions: mockCompletions(),
      componentStore: createComponentStore(),
      clock: mockClock(),
    });

    system(ctx(1));
    system(ctx(2));

    expect(orch.tickCount()).toBe(2);
  });

  it('has correct priority constant', () => {
    expect(WEAVE_SYSTEM_PRIORITY).toBe(500);
  });
});

// ── Transit Application ────────────────────────────────────────────

describe('WeaveSystem — transit completion', () => {
  it('updates world-membership on completed transit', () => {
    const store = createComponentStore();
    const entityId = eid('ship-1');

    store.set(entityId, 'world-membership', {
      worldId: 'earth-node',
      enteredAt: 500,
      isTransitioning: true,
      transitionTargetWorldId: 'mars-node',
    });

    const completions = mockCompletions([
      { entityId: 'ship-1', destinationNodeId: 'mars-node' },
    ]);

    const system = createWeaveSystem({
      orchestrator: mockOrchestrator(),
      completions,
      componentStore: store,
      clock: mockClock(),
    });

    system(ctx(1));

    const membership = store.get(entityId, 'world-membership') as WorldMembershipComponent;
    expect(membership.worldId).toBe('mars-node');
    expect(membership.isTransitioning).toBe(false);
    expect(membership.transitionTargetWorldId).toBeNull();
  });

  it('skips entities without world-membership', () => {
    const store = createComponentStore();
    const completions = mockCompletions([
      { entityId: 'unknown-entity', destinationNodeId: 'mars-node' },
    ]);

    const system = createWeaveSystem({
      orchestrator: mockOrchestrator(),
      completions,
      componentStore: store,
      clock: mockClock(),
    });

    expect(() => { system(ctx(1)); }).not.toThrow();
  });

});

describe('WeaveSystem — transit edge cases', () => {
  it('does not update if already at destination', () => {
    const store = createComponentStore();
    const entityId = eid('ship-1');
    const originalTime = 500;

    store.set(entityId, 'world-membership', {
      worldId: 'mars-node',
      enteredAt: originalTime,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const completions = mockCompletions([
      { entityId: 'ship-1', destinationNodeId: 'mars-node' },
    ]);

    const system = createWeaveSystem({
      orchestrator: mockOrchestrator(),
      completions,
      componentStore: store,
      clock: mockClock(),
    });

    system(ctx(1));

    const membership = store.get(entityId, 'world-membership') as WorldMembershipComponent;
    expect(membership.enteredAt).toBe(originalTime);
  });
});

describe('WeaveSystem — multi-transit and drain', () => {
  it('processes multiple completions in one tick', () => {
    const store = createComponentStore();
    const e1 = eid('ship-1');
    const e2 = eid('ship-2');

    store.set(e1, 'world-membership', {
      worldId: 'earth',
      enteredAt: 100,
      isTransitioning: true,
      transitionTargetWorldId: 'mars',
    });
    store.set(e2, 'world-membership', {
      worldId: 'mars',
      enteredAt: 200,
      isTransitioning: true,
      transitionTargetWorldId: 'venus',
    });

    const completions = mockCompletions([
      { entityId: 'ship-1', destinationNodeId: 'mars' },
      { entityId: 'ship-2', destinationNodeId: 'venus' },
    ]);

    const system = createWeaveSystem({
      orchestrator: mockOrchestrator(),
      completions,
      componentStore: store,
      clock: mockClock(),
    });

    system(ctx(1));

    const m1 = store.get(e1, 'world-membership') as WorldMembershipComponent;
    const m2 = store.get(e2, 'world-membership') as WorldMembershipComponent;

    expect(m1.worldId).toBe('mars');
    expect(m2.worldId).toBe('venus');
  });

  it('drains completions so they are not reprocessed', () => {
    const store = createComponentStore();
    const entityId = eid('ship-1');

    store.set(entityId, 'world-membership', {
      worldId: 'earth',
      enteredAt: 100,
      isTransitioning: true,
      transitionTargetWorldId: 'mars',
    });

    const completions = mockCompletions([
      { entityId: 'ship-1', destinationNodeId: 'mars' },
    ]);

    const system = createWeaveSystem({
      orchestrator: mockOrchestrator(),
      completions,
      componentStore: store,
      clock: mockClock(),
    });

    system(ctx(1));
    system(ctx(2));

    // Second tick should not re-process
    const membership = store.get(entityId, 'world-membership') as WorldMembershipComponent;
    expect(membership.worldId).toBe('mars');
  });
});
