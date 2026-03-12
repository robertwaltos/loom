/**
 * Bridge Spawn Pipeline — Integration tests proving:
 *   1. gRPC negotiate triggers PlayerConnect → entity spawn
 *   2. Entity spawn/despawn events populate bridge queues
 *   3. Snapshot sequence numbers monotonically increase
 *   4. Disconnect triggers entity cleanup
 *
 * Uses real GameOrchestrator + BridgeGrpcServer in-process.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createGameOrchestrator,
  createSilentLogger,
  type GameOrchestrator,
} from '@loom/loom-core';
import {
  createBridgeGrpcServer,
  type BridgeGrpcServer,
  type BridgeGrpcServerDeps,
  type ServerStreamMessage,
} from '@loom/selvage';

// ── Test infrastructure ──────────────────────────────────────────

/** Flush microtask queue so async event bus delivery completes. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

function makeGrpcDeps(): BridgeGrpcServerDeps {
  let counter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    id: { generate: () => `client-${++counter}` },
    log: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

function makeMockFabric() {
  return {
    pushStateSnapshot: () => {},
    spawnVisual: () => Promise.resolve(),
    despawnVisual: () => Promise.resolve(),
  };
}

function makeConnectDeps() {
  return {
    token: {
      validate: (tokenId: string) => {
        if (tokenId.length === 0) {
          return { valid: false, dynastyId: null, reason: 'empty token' };
        }
        return { valid: true, dynastyId: tokenId, reason: null };
      },
    },
    identity: {
      resolve: (dynastyId: string) => ({
        dynastyId,
        displayName: `Player-${dynastyId.slice(0, 8)}`,
        homeWorldId: 'default',
        status: 'active',
      }),
    },
    spawnPoints: {
      findSpawnPoint: (worldId: string) => `spawn-${worldId}-default`,
    },
  };
}

function makeManifest(fabricId = 'ue5-test') {
  return {
    fabricId,
    fabricName: 'BridgeLoom Test',
    maxResolution: { width: 1920, height: 1080 },
    maxRefreshRate: 60,
    currentTier: 'high' as const,
    features: {
      naniteGeometry: true,
      hardwareRayTracing: false,
      softwareRayTracing: true,
      globalIllumination: true,
      virtualShadowMaps: true,
      volumetricClouds: true,
      hairSimulation: false,
      clothSimulation: true,
      facialAnimation: true,
      proceduralGeneration: true,
      metaHumanSupport: true,
      massEntityFramework: true,
      chaosPhysics: true,
      metaSoundAudio: true,
    },
    maxVisibleEntities: 5000,
    supportsWeaveZoneOverlap: true,
    supportsPixelStreaming: false,
    preferredStateUpdateRate: 30,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('Bridge Spawn Pipeline — negotiate→spawn→lifecycle', () => {
  let orchestrator: GameOrchestrator;
  let grpc: BridgeGrpcServer;
  let clock: { nowMicroseconds: () => number };

  beforeEach(() => {
    let time = 1_000_000;
    clock = { nowMicroseconds: () => time++ };

    orchestrator = createGameOrchestrator({
      renderingFabric: makeMockFabric(),
      coreConfig: {
        logger: createSilentLogger(),
        clock,
      },
      fabrics: {
        connect: makeConnectDeps(),
      },
    });

    // Create the spawn point entity that findSpawnPoint() references.
    // The spawn system checks the component store for 'spawn-point',
    // so we seed it directly on the expected entity ID.
    const spawnPointId = 'spawn-default-default';
    orchestrator.core.entities.components.set(spawnPointId, 'spawn-point', {
      spawnType: 'player',
      capacity: 100,
      activeSpawns: 0,
      cooldownMicroseconds: 0,
    });
    orchestrator.core.entities.components.set(spawnPointId, 'transform', {
      position: { x: 0, y: 0, z: 100 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    orchestrator.core.entities.components.set(spawnPointId, 'world-membership', {
      worldId: 'default',
      enteredAt: 0,
      isTransitioning: false,
      transitionTargetWorldId: null,
    });

    grpc = createBridgeGrpcServer(makeGrpcDeps());
  });

  afterEach(() => {
    orchestrator.stop();
  });

  // ── Negotiate → Spawn Pipeline ──────────────────────────────

  it('registerNegotiateHandler is called on successful negotiate', () => {
    const negotiated: string[] = [];
    grpc.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        negotiated.push(clientId);
      },
    });

    const result = grpc.negotiate(makeManifest());
    expect(result.accepted).toBe(true);
    expect(negotiated).toHaveLength(1);
    expect(negotiated[0]).toBe(result.assignedClientId);
  });

  it('negotiate handler spawns entity via PlayerConnect orchestrator', () => {
    grpc.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        if (orchestrator.playerConnect === undefined) return;
        orchestrator.playerConnect.connect({
          connectionId: clientId,
          tokenId: clientId,
          meshContentHash: '',
          assetName: 'default',
        });
      },
    });

    const result = grpc.negotiate(makeManifest());
    const connection = orchestrator.connections.getConnection(
      result.assignedClientId,
    );
    expect(connection).toBeDefined();
    expect(connection?.entityId).toBeTruthy();
    expect(connection?.state).toBe('spawned');
  });

  it('spawned entity has required movement components', () => {
    let spawnedEntityId: string | undefined;

    grpc.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        if (orchestrator.playerConnect === undefined) return;
        const r = orchestrator.playerConnect.connect({
          connectionId: clientId,
          tokenId: clientId,
          meshContentHash: '',
          assetName: 'default',
        });
        if (r.ok) spawnedEntityId = r.value.entityId;
      },
    });

    grpc.negotiate(makeManifest());
    expect(spawnedEntityId).toBeDefined();

    const transform = orchestrator.core.entities.components.tryGet(
      spawnedEntityId!,
      'transform',
    );
    const movement = orchestrator.core.entities.components.tryGet(
      spawnedEntityId!,
      'movement',
    );
    expect(transform).toBeDefined();
    expect(movement).toBeDefined();
  });

  // ── Disconnect Handler ──────────────────────────────────────

  it('registerDisconnectHandler is called on client disconnect', () => {
    const disconnected: string[] = [];
    grpc.registerDisconnectHandler({
      onDisconnect: (clientId) => {
        disconnected.push(clientId);
      },
    });

    const result = grpc.negotiate(makeManifest());
    grpc.disconnect(result.assignedClientId);
    expect(disconnected).toHaveLength(1);
    expect(disconnected[0]).toBe(result.assignedClientId);
  });

  it('disconnect cleans up connection and entity', () => {
    let spawnedEntityId: string | undefined;

    grpc.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        if (orchestrator.playerConnect === undefined) return;
        const r = orchestrator.playerConnect.connect({
          connectionId: clientId,
          tokenId: clientId,
          meshContentHash: '',
          assetName: 'default',
        });
        if (r.ok) spawnedEntityId = r.value.entityId;
      },
    });

    grpc.registerDisconnectHandler({
      onDisconnect: (clientId) => {
        if (orchestrator.playerConnect === undefined) return;
        const connection = orchestrator.connections.getConnection(clientId);
        if (connection?.entityId) {
          orchestrator.core.entities.despawn(connection.entityId, 'destroyed');
        }
        orchestrator.playerConnect.disconnect(clientId);
      },
    });

    const result = grpc.negotiate(makeManifest());
    expect(spawnedEntityId).toBeDefined();

    grpc.disconnect(result.assignedClientId);

    const connection = orchestrator.connections.getConnection(
      result.assignedClientId,
    );
    expect(connection?.state).toBe('disconnected');
    expect(orchestrator.core.entities.exists(spawnedEntityId!)).toBe(false);
  });

  // ── Entity Lifecycle → Bridge Queues ────────────────────────

  it('entity.spawned event populates spawn queue via event bus', async () => {
    const spawnQueue: ServerStreamMessage[] = [];

    orchestrator.core.eventBus.subscribe(
      { types: ['entity.spawned'] },
      (event) => {
        const payload = event.payload as {
          entityId: string;
          worldId: string;
          entityType: string;
        };
        spawnQueue.push({
          type: 'entity-spawn',
          sequenceNumber: 1,
          timestamp: clock.nowMicroseconds(),
          payload: new TextEncoder().encode(
            JSON.stringify({
              entityId: payload.entityId,
              entityType: payload.entityType,
              worldId: payload.worldId,
            }),
          ),
        });
      },
    );

    orchestrator.core.entities.spawn('player', 'default');
    await flushMicrotasks();
    expect(spawnQueue).toHaveLength(1);
    expect(spawnQueue[0]!.type).toBe('entity-spawn');

    const decoded = JSON.parse(
      new TextDecoder().decode(spawnQueue[0]!.payload),
    ) as { entityType: string; worldId: string };
    expect(decoded.entityType).toBe('player');
    expect(decoded.worldId).toBe('default');
  });

  it('entity.despawned event populates despawn queue via event bus', async () => {
    const despawnQueue: ServerStreamMessage[] = [];

    orchestrator.core.eventBus.subscribe(
      { types: ['entity.despawned'] },
      (event) => {
        const payload = event.payload as {
          entityId: string;
          worldId: string;
          reason: string;
        };
        despawnQueue.push({
          type: 'entity-despawn',
          sequenceNumber: 1,
          timestamp: clock.nowMicroseconds(),
          payload: new TextEncoder().encode(
            JSON.stringify({
              entityId: payload.entityId,
              worldId: payload.worldId,
              reason: payload.reason,
            }),
          ),
        });
      },
    );

    const entityId = orchestrator.core.entities.spawn('npc', 'default');
    orchestrator.core.entities.despawn(entityId, 'destroyed');
    await flushMicrotasks();

    expect(despawnQueue).toHaveLength(1);
    expect(despawnQueue[0]!.type).toBe('entity-despawn');

    const decoded = JSON.parse(
      new TextDecoder().decode(despawnQueue[0]!.payload),
    ) as { reason: string };
    expect(decoded.reason).toBe('destroyed');
  });

  // ── Sequence Numbers ──────────────────────────────────────────

  it('world state provider assigns monotonically increasing sequence numbers', () => {
    // Set up a world state provider wired to the orchestrator
    let seq = 0;
    const provider = {
      getEntitySnapshots: (): ReadonlyArray<ServerStreamMessage> => {
        return orchestrator.core.entities
          .queryByWorld('default')
          .map((entity) => ({
            type: 'entity-snapshot' as const,
            sequenceNumber: ++seq,
            timestamp: clock.nowMicroseconds(),
            payload: new TextEncoder().encode(
              JSON.stringify({ entityId: entity.id }),
            ),
          }));
      },
      getSpawnQueue: () => [] as ReadonlyArray<ServerStreamMessage>,
      getDespawnQueue: () => [] as ReadonlyArray<ServerStreamMessage>,
      getTimeWeather: (): ServerStreamMessage | undefined => ({
        type: 'time-weather' as const,
        sequenceNumber: ++seq,
        timestamp: clock.nowMicroseconds(),
        payload: new TextEncoder().encode('{}'),
      }),
      getFacialPoseUpdates: () => [] as ReadonlyArray<ServerStreamMessage>,
      clearQueues: () => {},
    };
    grpc.registerWorldStateProvider(provider);

    // Spawn entities so snapshots have data
    orchestrator.core.entities.spawn('player', 'default');
    orchestrator.core.entities.spawn('npc', 'default');

    // Tick and flush
    grpc.negotiate(makeManifest());
    grpc.tick();
    const flushed = grpc.flush();

    // Collect all sequence numbers
    const seqNums: number[] = [];
    for (const msgs of flushed.values()) {
      for (const msg of msgs) {
        seqNums.push(msg.sequenceNumber);
      }
    }

    // All non-zero and monotonically increasing
    for (const s of seqNums) {
      expect(s).toBeGreaterThan(0);
    }
    for (let i = 1; i < seqNums.length; i++) {
      expect(seqNums[i]).toBeGreaterThan(seqNums[i - 1]!);
    }
  });

  // ── Full Pipeline ─────────────────────────────────────────────

  it('full pipeline: negotiate → spawn → input → tick → snapshot with sequence', async () => {
    let spawnedEntityId: string | undefined;

    grpc.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        if (orchestrator.playerConnect === undefined) return;
        const r = orchestrator.playerConnect.connect({
          connectionId: clientId,
          tokenId: clientId,
          meshContentHash: '',
          assetName: 'default',
        });
        if (r.ok) spawnedEntityId = r.value.entityId;
      },
    });

    const spawnQueue: ServerStreamMessage[] = [];
    let seq = 0;

    orchestrator.core.eventBus.subscribe(
      { types: ['entity.spawned'] },
      (event) => {
        const p = event.payload as {
          entityId: string;
          worldId: string;
          entityType: string;
        };
        spawnQueue.push({
          type: 'entity-spawn',
          sequenceNumber: ++seq,
          timestamp: clock.nowMicroseconds(),
          payload: new TextEncoder().encode(
            JSON.stringify({
              entityId: p.entityId,
              entityType: p.entityType,
              worldId: p.worldId,
            }),
          ),
        });
      },
    );

    // Negotiate → triggers spawn
    const result = grpc.negotiate(makeManifest());
    await flushMicrotasks();
    expect(spawnedEntityId).toBeDefined();
    expect(spawnQueue).toHaveLength(1);

    // Verify input handler can reach the connection
    const connection = orchestrator.connections.getConnection(
      result.assignedClientId,
    );
    expect(connection).toBeDefined();
    expect(connection?.entityId).toBe(spawnedEntityId);

    // Write player input
    orchestrator.core.entities.components.set(
      spawnedEntityId!,
      'player-input',
      {
        moveDirection: { x: 1, y: 0, z: 0 },
        lookDirection: { x: 1, y: 0, z: 0 },
        actions: [],
        sequenceNumber: 1,
      },
    );

    // Run one tick
    orchestrator.core.systems.runAll({
      deltaMs: 50,
      tickNumber: 1,
      wallTimeMicroseconds: 1000,
    });

    // Verify entity moved
    const transform = orchestrator.core.entities.components.get(
      spawnedEntityId!,
      'transform',
    ) as { position: { x: number; y: number; z: number } };
    expect(transform.position.x).toBeGreaterThan(0);
  });

  it('multiple clients negotiate independently and get separate entities', () => {
    const entities: Map<string, string> = new Map();

    grpc.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        if (orchestrator.playerConnect === undefined) return;
        const r = orchestrator.playerConnect.connect({
          connectionId: clientId,
          tokenId: clientId,
          meshContentHash: '',
          assetName: 'default',
        });
        if (r.ok) entities.set(clientId, r.value.entityId);
      },
    });

    const a = grpc.negotiate(makeManifest('ue5-a'));
    const b = grpc.negotiate(makeManifest('ue5-b'));

    expect(entities.size).toBe(2);
    expect(entities.get(a.assignedClientId)).toBeDefined();
    expect(entities.get(b.assignedClientId)).toBeDefined();
    expect(entities.get(a.assignedClientId)).not.toBe(
      entities.get(b.assignedClientId),
    );
  });

  it('negotiate handler not called when max connections exceeded', () => {
    const grpcLimited = createBridgeGrpcServer({
      ...makeGrpcDeps(),
      config: { maxConcurrentStreams: 1 },
    });

    const negotiated: string[] = [];
    grpcLimited.registerNegotiateHandler({
      onNegotiate: (clientId) => {
        negotiated.push(clientId);
      },
    });

    const first = grpcLimited.negotiate(makeManifest('ue5-first'));
    expect(first.accepted).toBe(true);
    expect(negotiated).toHaveLength(1);

    const second = grpcLimited.negotiate(makeManifest('ue5-second'));
    expect(second.accepted).toBe(false);
    expect(negotiated).toHaveLength(1); // not called for rejected
  });
});
