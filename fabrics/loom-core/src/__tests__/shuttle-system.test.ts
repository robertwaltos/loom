/**
 * Shuttle System — Proves the ECS-to-Shuttle adapter works.
 */

import { describe, it, expect } from 'vitest';
import {
  createShuttleSystem,
  createEcsPopulationAdapter,
  SHUTTLE_SYSTEM_PRIORITY,
} from '../shuttle-system.js';
import type { ShuttleSystemOrchestrator, ShuttleSystemTickResult } from '../shuttle-system.js';
import type { SystemContext } from '../system-registry.js';
import { createComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function ctx(tick: number): SystemContext {
  return { deltaMs: 33, tickNumber: tick, wallTimeMicroseconds: tick * 33000 };
}

// ── Mock Orchestrator ──────────────────────────────────────────────

function mockOrchestrator(): ShuttleSystemOrchestrator & {
  readonly calls: () => ReadonlyArray<{ worldId: string; deltaUs: number }>;
} {
  const log: Array<{ worldId: string; deltaUs: number }> = [];
  let seq = 0;

  return {
    tick: (worldId: string, deltaUs: number): ShuttleSystemTickResult => {
      seq += 1;
      log.push({ worldId, deltaUs });
      return { npcsProcessed: 0, decisionsActed: 0, tickNumber: seq };
    },
    calls: () => [...log],
  };
}

// ── System Adapter ─────────────────────────────────────────────────

describe('ShuttleSystem — adapter', () => {
  it('ticks orchestrator for each world', () => {
    const orch = mockOrchestrator();
    const store = createComponentStore();
    const system = createShuttleSystem({
      orchestrator: orch,
      componentStore: store,
      worldList: { listWorldIds: () => ['earth', 'mars'] },
    });

    system(ctx(1));

    const calls = orch.calls();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.worldId).toBe('earth');
    expect(calls[1]?.worldId).toBe('mars');
  });

  it('converts deltaMs to deltaUs', () => {
    const orch = mockOrchestrator();
    const store = createComponentStore();
    const system = createShuttleSystem({
      orchestrator: orch,
      componentStore: store,
      worldList: { listWorldIds: () => ['earth'] },
    });

    system(ctx(1));

    expect(orch.calls()[0]?.deltaUs).toBe(33000);
  });

  it('skips tick when no worlds exist', () => {
    const orch = mockOrchestrator();
    const store = createComponentStore();
    const system = createShuttleSystem({
      orchestrator: orch,
      componentStore: store,
      worldList: { listWorldIds: () => [] },
    });

    system(ctx(1));

    expect(orch.calls()).toHaveLength(0);
  });

  it('has correct priority constant', () => {
    expect(SHUTTLE_SYSTEM_PRIORITY).toBe(400);
  });
});

// ── ECS Population Adapter ─────────────────────────────────────────

describe('EcsPopulationAdapter', () => {
  it('finds NPCs with npc-tier and world-membership', () => {
    const store = createComponentStore();
    const npcId = eid('npc-1');

    store.set(npcId, 'npc-tier', {
      tier: 2,
      memoryWindowDays: null,
      aiBackend: 'llm-haiku',
      canCreateAssets: true,
    });
    store.set(npcId, 'world-membership', {
      worldId: 'earth',
      enteredAt: 1000,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });
    store.set(npcId, 'identity', {
      displayName: 'Merchant Kira',
      playerId: null,
      faction: null,
      reputation: 0,
    });

    const adapter = createEcsPopulationAdapter(store);
    const npcs = adapter.listActiveNpcs('earth');

    expect(npcs).toHaveLength(1);
    expect(npcs[0]?.npcId).toBe('npc-1');
    expect(npcs[0]?.tier).toBe(2);
    expect(npcs[0]?.displayName).toBe('Merchant Kira');
    expect(npcs[0]?.worldId).toBe('earth');
  });

  it('excludes NPCs in other worlds', () => {
    const store = createComponentStore();
    const npcId = eid('npc-1');

    store.set(npcId, 'npc-tier', {
      tier: 1,
      memoryWindowDays: 90,
      aiBackend: 'behavior-tree',
      canCreateAssets: false,
    });
    store.set(npcId, 'world-membership', {
      worldId: 'mars',
      enteredAt: 1000,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const adapter = createEcsPopulationAdapter(store);
    const npcs = adapter.listActiveNpcs('earth');

    expect(npcs).toHaveLength(0);
  });

  it('excludes entities without world-membership', () => {
    const store = createComponentStore();
    const npcId = eid('npc-1');

    store.set(npcId, 'npc-tier', {
      tier: 0,
      memoryWindowDays: null,
      aiBackend: 'rule-based',
      canCreateAssets: false,
    });

    const adapter = createEcsPopulationAdapter(store);
    const npcs = adapter.listActiveNpcs('earth');

    expect(npcs).toHaveLength(0);
  });
});

describe('EcsPopulationAdapter — edge cases', () => {
  it('uses entity ID as fallback display name', () => {
    const store = createComponentStore();
    const npcId = eid('npc-anon');

    store.set(npcId, 'npc-tier', {
      tier: 0,
      memoryWindowDays: null,
      aiBackend: 'rule-based',
      canCreateAssets: false,
    });
    store.set(npcId, 'world-membership', {
      worldId: 'earth',
      enteredAt: 1000,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const adapter = createEcsPopulationAdapter(store);
    const npcs = adapter.listActiveNpcs('earth');

    expect(npcs[0]?.displayName).toBe('npc-anon');
  });

  it('returns multiple NPCs in same world', () => {
    const store = createComponentStore();

    for (let i = 1; i <= 3; i++) {
      const id = eid('npc-' + String(i));
      store.set(id, 'npc-tier', {
        tier: 1,
        memoryWindowDays: 90,
        aiBackend: 'behavior-tree',
        canCreateAssets: false,
      });
      store.set(id, 'world-membership', {
        worldId: 'earth',
        enteredAt: 1000,
        isTransitioning: false,
        transitionTargetWorldId: null,
      });
    }

    const adapter = createEcsPopulationAdapter(store);
    const npcs = adapter.listActiveNpcs('earth');

    expect(npcs).toHaveLength(3);
  });
});
