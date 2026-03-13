import { describe, expect, it } from 'vitest';
import { createComponentStore } from '../component-store.js';
import { createEntityRegistry } from '../entity-registry.js';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createEventFactory } from '../event-factory.js';
import { createSilentLogger } from '../logger.js';
import { createMovementSystem } from '../movement-system.js';
import { createSpawnSystem } from '../spawn-system.js';
import { createVisualStateMapper } from '../visual-state-mapper.js';
import { createBridgeService } from '../bridge-service.js';
import { createJsonPayloadCodec, createMessageFactory } from '../wire-codec.js';
import type { EntityId } from '@loom/entities-contracts';
import type { StateSnapshotPayload, VisualEntityPayload } from '@loom/protocols-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

describe('vertical-integration simulation', () => {
  it('simulates spawn -> movement -> visual mapping -> bridge push -> wire roundtrip', () => {
    let now = 1_000;
    let entityNum = 0;
    let eventNum = 0;
    const clock = { nowMicroseconds: () => now++ };

    const store = createComponentStore();
    const bus = createInProcessEventBus({ logger: createSilentLogger() });
    const entityRegistry = createEntityRegistry({
      eventBus: bus,
      eventFactory: createEventFactory(clock, { generate: () => 'evt-' + String(eventNum++) }),
      componentStore: store,
      idGenerator: { generate: () => 'ent-' + String(entityNum++) },
      clock,
    });

    store.set(eid('sp-1'), 'spawn-point', {
      spawnType: 'player',
      capacity: 3,
      activeSpawns: 0,
      cooldownMicroseconds: 0,
    });
    store.set(eid('sp-1'), 'transform', {
      position: { x: 10, y: 0, z: 20 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    store.set(eid('sp-1'), 'world-membership', {
      worldId: 'earth',
      enteredAt: 0,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    const spawn = createSpawnSystem({ entityRegistry, componentStore: store, clock });
    const player = spawn.spawnPlayer({
      spawnPointEntityId: 'sp-1',
      playerId: 'player-1',
      displayName: 'Player One',
      meshContentHash: 'mesh-1',
      assetName: 'SM_Player',
    });
    expect(player.ok).toBe(true);
    if (!player.ok) return;

    store.set(player.entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 1,
    });

    createMovementSystem({ componentStore: store })({
      deltaMs: 100,
      tickNumber: 1,
      wallTimeMicroseconds: 100_000,
    });

    const mapper = createVisualStateMapper({ componentStore: store });
    mapper.system({ deltaMs: 16, tickNumber: 2, wallTimeMicroseconds: 116_000 });

    const pushes: number[] = [];
    createBridgeService({
      visualStateMapper: mapper,
      renderingFabric: {
        pushStateSnapshot: (snapshot) => pushes.push(snapshot.length),
        spawnVisual: () => Promise.resolve(),
        despawnVisual: () => Promise.resolve(),
      },
      clock,
    }).system({ deltaMs: 16, tickNumber: 2, wallTimeMicroseconds: 116_000 });

    const buffer = mapper.getLatestBuffer();
    expect(buffer?.states.length).toBeGreaterThan(0);
    expect(pushes).toEqual([buffer?.states.length ?? 0]);

    const messageFactory = createMessageFactory({
      codec: createJsonPayloadCodec(),
      clock,
      idGenerator: { next: () => 'corr-1' },
    });

    const payload: StateSnapshotPayload = {
      worldId: 'earth',
      tickNumber: buffer?.tickNumber ?? 0,
      entityCount: buffer?.states.length ?? 0,
      states: (buffer?.states ?? []).map((s) => {
        const wire: VisualEntityPayload = {
          entityId: s.entityId,
          position: [s.transform.position.x, s.transform.position.y, s.transform.position.z],
          rotation: [s.transform.rotation.x, s.transform.rotation.y, s.transform.rotation.z, s.transform.rotation.w],
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
        return wire;
      }),
    };

    const wire = messageFactory.create('state-snapshot', payload);
    const decoded = messageFactory.parse(wire);
    expect(decoded.type).toBe('state-snapshot');
    expect((decoded.payload as StateSnapshotPayload).entityCount).toBe(payload.entityCount);
  });
});
