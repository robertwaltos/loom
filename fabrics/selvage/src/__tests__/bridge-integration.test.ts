/**
 * Bridge gRPC Transport + World State Adapter — Integration Tests
 *
 * Tests the full pipeline: WorldStateAdapter → BridgeGrpcServer → Transport
 * without starting a real gRPC network listener (logic-level integration).
 *
 * Thread: bridge/selvage/bridge-integration-tests
 * Tier: 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBridgeGrpcServer,
  type BridgeGrpcServer,
  type BridgeGrpcServerDeps,
  type CapabilityManifest,
  type ServerStreamMessage,
} from '../bridge-grpc-server.js';
import {
  createBridgeWorldStateAdapter,
  type BridgeWorldStateAdapter,
} from '../bridge-world-state-adapter.js';

// ── Test Helpers ─────────────────────────────────────────────────

function createDeps(): BridgeGrpcServerDeps {
  let counter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    id: { generate: () => `client-${++counter}` },
    log: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

function makeManifest(overrides?: Partial<CapabilityManifest>): CapabilityManifest {
  return {
    fabricId: 'ue5-test',
    fabricName: 'Test UE5',
    maxResolution: { width: 1920, height: 1080 },
    maxRefreshRate: 60,
    currentTier: 'high',
    features: {
      naniteGeometry: true,
      hardwareRayTracing: false,
      softwareRayTracing: true,
      globalIllumination: true,
      virtualShadowMaps: true,
      volumetricClouds: false,
      hairSimulation: false,
      clothSimulation: true,
      facialAnimation: true,
      proceduralGeneration: true,
      metaHumanSupport: true,
      massEntityFramework: false,
      chaosPhysics: true,
      metaSoundAudio: true,
    },
    maxVisibleEntities: 5000,
    supportsWeaveZoneOverlap: true,
    supportsPixelStreaming: false,
    preferredStateUpdateRate: 30,
    ...overrides,
  };
}

function makeBridgeVisualUpdate(entityId: string) {
  return {
    entityId,
    timestamp: Date.now(),
    sequenceNumber: 0,
    delta: {
      entityId,
      transform: {
        position: { x: 10, y: 20, z: 30 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      mesh: {
        contentHash: 'mesh-abc',
        assetName: 'SM_Character',
        availableTiers: ['high'],
      },
      animation: {
        clipName: 'idle',
        normalizedTime: 0.5,
        blendWeight: 1.0,
        playbackRate: 1.0,
      },
      visibility: true,
      renderPriority: 50,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('Bridge World State Adapter', () => {
  let adapter: BridgeWorldStateAdapter;

  beforeEach(() => {
    adapter = createBridgeWorldStateAdapter({
      clock: { nowMicroseconds: () => 1_000_000 },
    });
  });

  it('starts with empty queues', () => {
    const provider = adapter.provider;
    expect(provider.getEntitySnapshots()).toHaveLength(0);
    expect(provider.getSpawnQueue()).toHaveLength(0);
    expect(provider.getDespawnQueue()).toHaveLength(0);
    expect(provider.getTimeWeather()).toBeUndefined();
    expect(provider.getFacialPoseUpdates()).toHaveLength(0);
  });

  it('converts visual updates to entity snapshots', () => {
    const update = makeBridgeVisualUpdate('entity-1');
    adapter.onStatePush([update]);

    const snapshots = adapter.provider.getEntitySnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.type).toBe('entity-snapshot');
    expect(snapshots[0]?.sequenceNumber).toBe(0);
  });

  it('builds spawn messages with entity data', () => {
    const update = makeBridgeVisualUpdate('entity-2');
    adapter.onEntitySpawn('entity-2', update);

    const spawns = adapter.provider.getSpawnQueue();
    expect(spawns).toHaveLength(1);
    expect(spawns[0]?.type).toBe('entity-spawn');
    // Payload is now FlatBuffers binary, not JSON — verify non-empty bytes
    expect(spawns[0]?.payload).toBeInstanceOf(Uint8Array);
    expect(spawns[0]?.payload.length).toBeGreaterThan(0);
  });

  it('builds despawn messages', () => {
    adapter.onEntityDespawn('entity-3');

    const despawns = adapter.provider.getDespawnQueue();
    expect(despawns).toHaveLength(1);
    expect(despawns[0]?.type).toBe('entity-despawn');
    // Payload is now FlatBuffers binary, not JSON — verify non-empty bytes
    expect(despawns[0]?.payload).toBeInstanceOf(Uint8Array);
    expect(despawns[0]?.payload.length).toBeGreaterThan(0);
  });

  it('clears queues on request', () => {
    adapter.onStatePush([makeBridgeVisualUpdate('e1')]);
    adapter.onEntitySpawn('e2', makeBridgeVisualUpdate('e2'));
    adapter.onEntityDespawn('e3');

    expect(adapter.provider.getEntitySnapshots()).toHaveLength(1);
    expect(adapter.provider.getSpawnQueue()).toHaveLength(1);
    expect(adapter.provider.getDespawnQueue()).toHaveLength(1);

    adapter.provider.clearQueues();

    expect(adapter.provider.getEntitySnapshots()).toHaveLength(0);
    expect(adapter.provider.getSpawnQueue()).toHaveLength(0);
    expect(adapter.provider.getDespawnQueue()).toHaveLength(0);
  });

  it('increments sequence numbers across message types', () => {
    adapter.onEntitySpawn('e1', makeBridgeVisualUpdate('e1'));
    adapter.onStatePush([makeBridgeVisualUpdate('e1')]);
    adapter.onEntityDespawn('e1');

    const spawn = adapter.provider.getSpawnQueue()[0];
    const snapshot = adapter.provider.getEntitySnapshots()[0];
    const despawn = adapter.provider.getDespawnQueue()[0];

    expect(spawn?.sequenceNumber).toBe(0);
    expect(snapshot?.sequenceNumber).toBe(1);
    expect(despawn?.sequenceNumber).toBe(2);
  });

  it('accepts time/weather updates', () => {
    const weatherMsg: ServerStreamMessage = {
      type: 'time-weather',
      sequenceNumber: 0,
      timestamp: 1_000_000,
      payload: new Uint8Array([1, 2, 3]),
    };
    adapter.onTimeWeatherUpdate(weatherMsg);

    expect(adapter.provider.getTimeWeather()).toBe(weatherMsg);
  });

  it('collects facial pose updates', () => {
    const poseMsg: ServerStreamMessage = {
      type: 'facial-pose',
      sequenceNumber: 0,
      timestamp: 1_000_000,
      payload: new Uint8Array([4, 5, 6]),
    };
    adapter.onFacialPoseUpdate(poseMsg);
    adapter.onFacialPoseUpdate(poseMsg);

    expect(adapter.provider.getFacialPoseUpdates()).toHaveLength(2);
  });
});

describe('Bridge Integration: Adapter → Server → Tick → Flush', () => {
  let server: BridgeGrpcServer;
  let adapter: BridgeWorldStateAdapter;

  beforeEach(() => {
    const deps = createDeps();
    server = createBridgeGrpcServer(deps);

    adapter = createBridgeWorldStateAdapter({
      clock: deps.clock,
    });

    server.registerWorldStateProvider(adapter.provider);
  });

  it('pushes entity snapshots to connected clients via tick', () => {
    // Connect a client
    const result = server.negotiate(makeManifest());
    expect(result.accepted).toBe(true);
    const clientId = result.assignedClientId;

    // Push entity state through the adapter
    adapter.onStatePush([makeBridgeVisualUpdate('npc-1')]);

    // Tick the server (broadcasts queued state to all clients)
    server.tick();

    // Flush to get per-client message queues
    const queues = server.flush();
    const clientMsgs = queues.get(clientId) ?? [];

    expect(clientMsgs.length).toBeGreaterThan(0);
    expect(clientMsgs[0]?.type).toBe('entity-snapshot');
  });

  it('pushes spawn messages before snapshots', () => {
    const result = server.negotiate(makeManifest());
    const clientId = result.assignedClientId;

    adapter.onEntitySpawn('hero-1', makeBridgeVisualUpdate('hero-1'));
    adapter.onStatePush([makeBridgeVisualUpdate('hero-1')]);

    server.tick();

    const queues = server.flush();
    const msgs = queues.get(clientId) ?? [];

    // Bridge server processes spawns before snapshots
    const types = msgs.map((m) => m.type);
    const spawnIdx = types.indexOf('entity-spawn');
    const snapIdx = types.indexOf('entity-snapshot');

    expect(spawnIdx).toBeGreaterThanOrEqual(0);
    expect(snapIdx).toBeGreaterThanOrEqual(0);
    expect(spawnIdx).toBeLessThan(snapIdx);
  });

  it('broadcasts to multiple clients', () => {
    const c1 = server.negotiate(makeManifest({ fabricId: 'ue5-1' }));
    const c2 = server.negotiate(makeManifest({ fabricId: 'ue5-2' }));

    adapter.onStatePush([makeBridgeVisualUpdate('shared-entity')]);
    server.tick();

    const queues = server.flush();

    const c1Msgs = queues.get(c1.assignedClientId) ?? [];
    const c2Msgs = queues.get(c2.assignedClientId) ?? [];

    expect(c1Msgs.length).toBe(1);
    expect(c2Msgs.length).toBe(1);
    expect(c1Msgs[0]?.type).toBe('entity-snapshot');
    expect(c2Msgs[0]?.type).toBe('entity-snapshot');
  });

  it('clears adapter queues after server tick', () => {
    server.negotiate(makeManifest());
    adapter.onStatePush([makeBridgeVisualUpdate('e1')]);

    server.tick();

    // After tick, the provider should have been cleared
    expect(adapter.provider.getEntitySnapshots()).toHaveLength(0);
  });

  it('disconnected clients do not receive messages', () => {
    const c1 = server.negotiate(makeManifest({ fabricId: 'ue5-stay' }));
    const c2 = server.negotiate(makeManifest({ fabricId: 'ue5-leave' }));

    server.disconnect(c2.assignedClientId);

    adapter.onStatePush([makeBridgeVisualUpdate('e1')]);
    server.tick();

    const queues = server.flush();
    expect(queues.has(c1.assignedClientId)).toBe(true);
    expect(queues.has(c2.assignedClientId)).toBe(false);
  });

  it('handles multiple ticks with accumulating state', () => {
    const result = server.negotiate(makeManifest());
    const clientId = result.assignedClientId;

    // Tick 1
    adapter.onStatePush([makeBridgeVisualUpdate('e1')]);
    server.tick();
    server.flush();

    // Tick 2
    adapter.onStatePush([makeBridgeVisualUpdate('e1'), makeBridgeVisualUpdate('e2')]);
    server.tick();

    const queues = server.flush();
    const msgs = queues.get(clientId) ?? [];
    expect(msgs).toHaveLength(2);
  });

  it('weather updates broadcast to all clients', () => {
    const c1 = server.negotiate(makeManifest());
    const weatherMsg: ServerStreamMessage = {
      type: 'time-weather',
      sequenceNumber: 99,
      timestamp: 1_000_000,
      payload: new Uint8Array([10, 20, 30]),
    };
    adapter.onTimeWeatherUpdate(weatherMsg);

    server.tick();
    const queues = server.flush();
    const msgs = queues.get(c1.assignedClientId) ?? [];

    const weather = msgs.find((m) => m.type === 'time-weather');
    expect(weather).toBeDefined();
  });
});

describe('Bridge gRPC Transport — proto conversion helpers', () => {
  it('createBridgeGrpcTransport is importable', async () => {
    const mod = await import('../bridge-grpc-transport.js');
    expect(typeof mod.createBridgeGrpcTransport).toBe('function');
    expect(typeof mod.DEFAULT_TRANSPORT_CONFIG).toBe('object');
  });
});
