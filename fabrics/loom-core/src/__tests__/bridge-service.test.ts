/**
 * BridgeService — Validates Loom → Fabric state push pipeline.
 */

import { describe, it, expect } from 'vitest';
import { createBridgeService } from '../bridge-service.js';
import type {
  BridgeServiceDeps,
  BridgeRenderingFabric,
} from '../bridge-service.js';
import type { VisualStateMapperService, VisualStateBuffer, MappedVisualState } from '../visual-state-mapper.js';
import type { SystemContext } from '../system-registry.js';

function context(tick: number): SystemContext {
  return { deltaMs: 33, tickNumber: tick, wallTimeMicroseconds: tick * 33000 };
}

function mappedState(entityId: string): MappedVisualState {
  return {
    entityId,
    transform: {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    },
    mesh: { contentHash: 'hash-1', assetName: 'Mesh', availableTiers: ['high'] },
    animation: { clipName: 'Idle', normalizedTime: 0, blendWeight: 1, playbackRate: 1 },
    visibility: true,
    renderPriority: 50,
  };
}

function createMockMapper(buffer: VisualStateBuffer | undefined): VisualStateMapperService {
  return {
    getLatestBuffer: () => buffer,
    system: () => { /* noop */ },
  };
}

function createMockFabric(): BridgeRenderingFabric & {
  readonly spawned: string[];
  readonly despawned: string[];
  readonly pushes: Array<{ count: number }>;
} {
  const spawned: string[] = [];
  const despawned: string[] = [];
  const pushes: Array<{ count: number }> = [];
  return {
    spawned,
    despawned,
    pushes,
    pushStateSnapshot: (updates) => { pushes.push({ count: updates.length }); },
    spawnVisual: (id) => { spawned.push(id); return Promise.resolve(); },
    despawnVisual: (id) => { despawned.push(id); return Promise.resolve(); },
  };
}

function createDeps(
  buffer: VisualStateBuffer | undefined,
): { deps: BridgeServiceDeps; fabric: ReturnType<typeof createMockFabric> } {
  const fabric = createMockFabric();
  const deps: BridgeServiceDeps = {
    visualStateMapper: createMockMapper(buffer),
    renderingFabric: fabric,
    clock: { nowMicroseconds: () => 1000 },
  };
  return { deps, fabric };
}

describe('BridgeService — no buffer', () => {
  it('does nothing when mapper has no buffer', () => {
    const { deps, fabric } = createDeps(undefined);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(fabric.spawned).toHaveLength(0);
    expect(fabric.pushes).toHaveLength(0);
  });

  it('reports zero stats when idle', () => {
    const { deps } = createDeps(undefined);
    const svc = createBridgeService(deps);
    const stats = svc.getStats();
    expect(stats.trackedEntities).toBe(0);
    expect(stats.totalPushes).toBe(0);
  });
});

describe('BridgeService — entity spawning', () => {
  it('spawns new entities in the fabric', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('ent-1'), mappedState('ent-2')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps, fabric } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(fabric.spawned).toEqual(['ent-1', 'ent-2']);
  });

  it('does not re-spawn already tracked entities', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('ent-1')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps, fabric } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    svc.system(context(2));
    expect(fabric.spawned).toEqual(['ent-1']);
  });

  it('tracks spawn count in stats', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('ent-1'), mappedState('ent-2')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(svc.getStats().totalSpawns).toBe(2);
  });
});

describe('BridgeService — entity despawning', () => {
  it('despawns entities removed from buffer', () => {
    const fabric = createMockFabric();
    let currentBuffer: VisualStateBuffer = {
      states: [mappedState('ent-1'), mappedState('ent-2')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const mapper: VisualStateMapperService = {
      getLatestBuffer: () => currentBuffer,
      system: () => { /* noop */ },
    };
    const deps: BridgeServiceDeps = {
      visualStateMapper: mapper,
      renderingFabric: fabric,
      clock: { nowMicroseconds: () => 2000 },
    };
    const svc = createBridgeService(deps);
    svc.system(context(1));
    currentBuffer = {
      states: [mappedState('ent-1')],
      tickNumber: 2,
      timestamp: 2000,
    };
    svc.system(context(2));
    expect(fabric.despawned).toEqual(['ent-2']);
  });

  it('tracks despawn count in stats', () => {
    const fabric = createMockFabric();
    let currentBuffer: VisualStateBuffer = {
      states: [mappedState('ent-1')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const mapper: VisualStateMapperService = {
      getLatestBuffer: () => currentBuffer,
      system: () => { /* noop */ },
    };
    const deps: BridgeServiceDeps = {
      visualStateMapper: mapper,
      renderingFabric: fabric,
      clock: { nowMicroseconds: () => 2000 },
    };
    const svc = createBridgeService(deps);
    svc.system(context(1));
    currentBuffer = { states: [], tickNumber: 2, timestamp: 2000 };
    svc.system(context(2));
    expect(svc.getStats().totalDespawns).toBe(1);
  });
});

describe('BridgeService — state push', () => {
  it('pushes visual updates to the fabric each tick', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('ent-1')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps, fabric } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(fabric.pushes).toHaveLength(1);
    expect(fabric.pushes[0]?.count).toBe(1);
  });

  it('pushes all entities in the buffer', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('a'), mappedState('b'), mappedState('c')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps, fabric } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(fabric.pushes[0]?.count).toBe(3);
  });

  it('increments push count in stats', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('ent-1')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    svc.system(context(2));
    expect(svc.getStats().totalPushes).toBe(2);
  });

  it('updates lastPushTimestamp', () => {
    const buffer: VisualStateBuffer = {
      states: [mappedState('ent-1')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const { deps } = createDeps(buffer);
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(svc.getStats().lastPushTimestamp).toBe(1000);
  });
});

describe('BridgeService — tracked entity count', () => {
  it('reflects current entity set size', () => {
    const fabric = createMockFabric();
    let currentBuffer: VisualStateBuffer = {
      states: [mappedState('a'), mappedState('b')],
      tickNumber: 1,
      timestamp: 1000,
    };
    const mapper: VisualStateMapperService = {
      getLatestBuffer: () => currentBuffer,
      system: () => { /* noop */ },
    };
    const deps: BridgeServiceDeps = {
      visualStateMapper: mapper,
      renderingFabric: fabric,
      clock: { nowMicroseconds: () => 1000 },
    };
    const svc = createBridgeService(deps);
    svc.system(context(1));
    expect(svc.getStats().trackedEntities).toBe(2);
    currentBuffer = {
      states: [mappedState('a')],
      tickNumber: 2,
      timestamp: 2000,
    };
    svc.system(context(2));
    expect(svc.getStats().trackedEntities).toBe(1);
  });
});
