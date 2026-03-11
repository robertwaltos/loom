/**
 * Vertical Integration Test
 *
 * Proves the full pipeline works end-to-end:
 *   Player connects → Spawn system creates entity →
 *   Movement system processes input → Visual state mapper
 *   generates buffer → Bridge service pushes to fabric →
 *   Wire codec serializes/deserializes messages.
 *
 * This is the proof that all layers compose correctly.
 */

import { describe, it, expect } from 'vitest';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createEventFactory } from '../event-factory.js';
import { createSilentLogger } from '../logger.js';
import { createMovementSystem } from '../movement-system.js';
import { createSpawnSystem } from '../spawn-system.js';
import { createVisualStateMapper } from '../visual-state-mapper.js';
import { createBridgeService } from '../bridge-service.js';
import { createPlayerConnectionSystem } from '../player-connection-system.js';
import { createJsonPayloadCodec, createMessageFactory } from '../wire-codec.js';
import type { SystemContext } from '../system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type { TransformComponent, MovementComponent } from '@loom/entities-contracts';
import type { StateSnapshotPayload } from '@loom/protocols-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function context(tick: number, deltaMs: number): SystemContext {
  return { deltaMs, tickNumber: tick, wallTimeMicroseconds: tick * 33000 };
}

// ── Infrastructure factory ──────────────────────────────────────

function createInfrastructure() {
  let time = 1000;
  let entityNum = 0;
  let eventNum = 0;
  const clock = { nowMicroseconds: () => time++ };
  const store = createComponentStore();
  const bus = createInProcessEventBus({ logger: createSilentLogger() });
  const idGen = { generate: () => 'ent-' + String(entityNum++) };
  const eventIdGen = { generate: () => 'evt-' + String(eventNum++) };
  const eventFactory = createEventFactory(clock, eventIdGen);
  const registry = createEntityRegistry({
    eventBus: bus,
    eventFactory,
    componentStore: store,
    idGenerator: idGen,
    clock,
  });
  return { clock, store, bus, registry };
}

function setupSpawnPoint(
  store: ReturnType<typeof createComponentStore>,
  spId: EntityId,
  worldId: string,
  position: { x: number; y: number; z: number },
): void {
  store.set(spId, 'spawn-point', {
    spawnType: 'player',
    capacity: 10,
    activeSpawns: 0,
    cooldownMicroseconds: 0,
  });
  store.set(spId, 'transform', {
    position,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  });
  store.set(spId, 'world-membership', {
    worldId,
    enteredAt: Date.now(),
    isTransitioning: false,
    transitionTargetWorldId: null,
  });
}

describe('Vertical — player spawn to fabric push', () => {
  it('spawns a player and pushes visual state', () => {
    const { clock, store, registry } = createInfrastructure();
    const spId = eid('spawn-1');
    setupSpawnPoint(store, spId, 'earth', { x: 100, y: 0, z: 200 });

    const spawnSys = createSpawnSystem({
      entityRegistry: registry,
      componentStore: store,
      clock,
    });
    const connections = createPlayerConnectionSystem({ clock });

    // Connect + spawn player
    connections.connect({ connectionId: 'c1', playerId: 'alice', displayName: 'Alice' });
    const result = spawnSys.spawnPlayer({
      spawnPointEntityId: 'spawn-1',
      playerId: 'alice',
      displayName: 'Alice',
      meshContentHash: 'mesh-alice',
      assetName: 'HumanFemale',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    connections.markSpawned('c1', result.entityId, 'earth');

    // Verify spawn position
    const t = store.get(result.entityId, 'transform') as TransformComponent;
    expect(t.position.x).toBe(100);

    // Inject input → run movement
    store.set(result.entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 1,
    });
    const moveSys = createMovementSystem({ componentStore: store });
    moveSys(context(1, 1000));

    const afterMove = store.get(result.entityId, 'transform') as TransformComponent;
    expect(afterMove.position.z).toBeGreaterThan(200);

    // Run visual mapper + bridge
    const mapper = createVisualStateMapper({ componentStore: store });
    mapper.system(context(1, 33));

    const spawned: string[] = [];
    const pushCounts: number[] = [];
    const bridge = createBridgeService({
      visualStateMapper: mapper,
      renderingFabric: {
        pushStateSnapshot: (u) => {
          pushCounts.push(u.length);
        },
        spawnVisual: (id) => {
          spawned.push(id);
          return Promise.resolve();
        },
        despawnVisual: () => Promise.resolve(),
      },
      clock,
    });
    bridge.system(context(1, 33));

    expect(spawned.length).toBeGreaterThanOrEqual(1);
    expect(pushCounts.length).toBe(1);
    expect(connections.getStats().activeConnections).toBe(1);
  });
});

// ── Wire codec helpers ──────────────────────────────────────────

import type { VisualStateBuffer, MappedVisualState } from '../visual-state-mapper.js';
import type { VisualEntityPayload } from '@loom/protocols-contracts';

function mappedToWireEntity(s: MappedVisualState): VisualEntityPayload {
  return {
    entityId: s.entityId,
    position: [s.transform.position.x, s.transform.position.y, s.transform.position.z],
    rotation: [
      s.transform.rotation.x,
      s.transform.rotation.y,
      s.transform.rotation.z,
      s.transform.rotation.w,
    ],
    scale: [s.transform.scale.x, s.transform.scale.y, s.transform.scale.z],
    meshContentHash: s.mesh?.contentHash ?? null,
    meshAssetName: s.mesh?.assetName ?? null,
    animClipName: s.animation?.clipName ?? null,
    animNormalizedTime: s.animation?.normalizedTime ?? 0,
    animBlendWeight: s.animation?.blendWeight ?? 1,
    animPlaybackRate: s.animation?.playbackRate ?? 1,
    visibility: s.visibility,
    renderPriority: s.renderPriority,
  };
}

function bufferToPayload(buffer: VisualStateBuffer, worldId: string): StateSnapshotPayload {
  return {
    worldId,
    tickNumber: buffer.tickNumber,
    entityCount: buffer.states.length,
    states: buffer.states.map(mappedToWireEntity),
  };
}

describe('Vertical — wire codec round-trip', () => {
  it('serializes NPC state through wire protocol', () => {
    const { clock, store, registry } = createInfrastructure();
    const spId = eid('sp-npc');
    setupSpawnPoint(store, spId, 'earth', { x: 50, y: 0, z: 50 });

    const spawnSys = createSpawnSystem({
      entityRegistry: registry,
      componentStore: store,
      clock,
    });
    const npcResult = spawnSys.spawnNpc({
      spawnPointEntityId: 'sp-npc',
      displayName: 'Merchant Kira',
      meshContentHash: 'mesh-kira',
      assetName: 'NpcFemale',
      tier: 2,
    });
    expect(npcResult.ok).toBe(true);

    const mapper = createVisualStateMapper({ componentStore: store });
    mapper.system(context(1, 33));
    const buffer = mapper.getLatestBuffer();
    expect(buffer).toBeDefined();
    if (buffer === undefined) return;

    const msgFactory = createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock: { nowMicroseconds: () => 1000 },
      idGenerator: { next: () => 'corr-1' },
    });

    const wireMsg = msgFactory.create('state-snapshot', bufferToPayload(buffer, 'earth'));
    expect(wireMsg.payload.byteLength).toBeGreaterThan(0);

    const parsed = msgFactory.parse(wireMsg);
    const decoded = parsed.payload as StateSnapshotPayload;
    expect(decoded.worldId).toBe('earth');
    expect(decoded.states.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Vertical — multi-tick simulation', () => {
  it('runs 10 ticks with movement and state push', () => {
    const { clock, store, registry } = createInfrastructure();
    const spId = eid('sp');
    setupSpawnPoint(store, spId, 'test', { x: 0, y: 0, z: 0 });

    const spawnSys = createSpawnSystem({
      entityRegistry: registry,
      componentStore: store,
      clock,
    });
    const result = spawnSys.spawnPlayer({
      spawnPointEntityId: 'sp',
      playerId: 'p1',
      displayName: 'TestPlayer',
      meshContentHash: 'mesh-test',
      assetName: 'TestMesh',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    store.set(result.entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 1,
    });

    const moveSys = createMovementSystem({ componentStore: store });
    const mapper = createVisualStateMapper({ componentStore: store });
    let pushCount = 0;
    const bridge = createBridgeService({
      visualStateMapper: mapper,
      renderingFabric: {
        pushStateSnapshot: () => {
          pushCount++;
        },
        spawnVisual: () => Promise.resolve(),
        despawnVisual: () => Promise.resolve(),
      },
      clock,
    });

    for (let tick = 1; tick <= 10; tick++) {
      moveSys(context(tick, 33));
      mapper.system(context(tick, 33));
      bridge.system(context(tick, 33));
    }

    const finalT = store.get(result.entityId, 'transform') as TransformComponent;
    expect(finalT.position.z).toBeGreaterThan(0.5);
    const movement = store.get(result.entityId, 'movement') as MovementComponent;
    expect(movement.speed).toBeGreaterThan(0);
    expect(pushCount).toBe(10);
    expect(bridge.getStats().totalPushes).toBe(10);
  });
});
