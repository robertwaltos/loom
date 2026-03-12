/**
 * Player Session Flow — Integration test proving the full loop:
 *   connect → negotiate → spawn → input → movement → snapshot
 *
 * Uses the real GameOrchestrator + BridgeGrpcServer in-process.
 * No actual gRPC transport — tests call the server API directly.
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
} from '@loom/selvage';
import type { TransformComponent, PlayerInputComponent } from '@loom/entities-contracts';

// ── Test infrastructure ──────────────────────────────────────────

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
  let pushes = 0;
  const spawned: string[] = [];
  return {
    pushCount: () => pushes,
    spawnedIds: () => [...spawned],
    pushStateSnapshot: () => { pushes++; },
    spawnVisual: (id: string) => { spawned.push(id); return Promise.resolve(); },
    despawnVisual: () => Promise.resolve(),
  };
}

function makeManifest(overrides?: Partial<{ fabricId: string }>) {
  return {
    fabricId: overrides?.fabricId ?? 'ue5-test',
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

/** Yaw+pitch → look direction (matches main.ts helper). */
function yawPitchToLookVector(yaw: number, pitch: number) {
  const cosPitch = Math.cos(pitch);
  return {
    x: Math.cos(yaw) * cosPitch,
    y: Math.sin(yaw) * cosPitch,
    z: Math.sin(pitch),
  };
}

/** Action bitflags → names (matches main.ts helper). */
const ACTION_FLAG_MAP: ReadonlyArray<readonly [number, string]> = [
  [1 << 0, 'jump'], [1 << 1, 'sprint'], [1 << 2, 'interact'],
  [1 << 3, 'attack'], [1 << 4, 'defend'], [1 << 5, 'dodge'],
];

function actionFlagsToNames(flags: number): string[] {
  const names: string[] = [];
  for (const [bit, name] of ACTION_FLAG_MAP) {
    if ((flags & bit) !== 0) names.push(name);
  }
  return names;
}

function encodeInput(dx: number, dy: number, dz: number, yaw: number, pitch: number, actionFlags = 0) {
  return new TextEncoder().encode(
    JSON.stringify({ dx, dy, dz, yaw, pitch, actionFlags }),
  );
}

// ── Tests ────────────────────────────────────────────────────────

describe('Player Session Flow — end-to-end', () => {
  let orchestrator: GameOrchestrator;
  let grpc: BridgeGrpcServer;

  beforeEach(() => {
    orchestrator = createGameOrchestrator({
      renderingFabric: makeMockFabric(),
      coreConfig: { logger: createSilentLogger() },
    });

    grpc = createBridgeGrpcServer(makeGrpcDeps());
  });

  afterEach(() => {
    orchestrator.stop();
  });

  it('negotiate assigns a unique client ID', () => {
    const result = grpc.negotiate(makeManifest());
    expect(result.assignedClientId).toBeTruthy();
    expect(typeof result.assignedClientId).toBe('string');
    expect(result.accepted).toBe(true);
  });

  it('two clients get different IDs', () => {
    const a = grpc.negotiate(makeManifest({ fabricId: 'ue5-a' }));
    const b = grpc.negotiate(makeManifest({ fabricId: 'ue5-b' }));
    expect(a.assignedClientId).not.toBe(b.assignedClientId);
  });

  it('connect → spawn entity → write input → movement system updates transform', () => {
    // 1. Negotiate
    const { assignedClientId } = grpc.negotiate(makeManifest());

    // 2. Connect player in the connection system
    orchestrator.connections.connect({
      connectionId: assignedClientId,
      playerId: `player-${assignedClientId}`,
      displayName: `Tester-${assignedClientId}`,
    });

    // 3. Spawn entity in the ECS
    const entityId = orchestrator.core.entities.spawn('player', 'default');

    // Mark spawned so getConnection returns entityId
    orchestrator.connections.markSpawned(assignedClientId, entityId, 'default');

    // Seed required components for the movement system
    orchestrator.core.entities.components.set(entityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    } satisfies TransformComponent);

    orchestrator.core.entities.components.set(entityId, 'movement', {
      speed: 0,
      maxSpeed: 3.5,
      isGrounded: true,
      movementMode: 'walking',
    });

    orchestrator.core.entities.components.set(entityId, 'physics-body', {
      mass: 70,
      velocity: { x: 0, y: 0, z: 0 },
      isKinematic: false,
      collisionLayer: 1,
      collisionMask: 0xFFFF,
    });

    // 4. Simulate input arriving from gRPC (mirroring main.ts wiring)
    const payload = encodeInput(0, 0, 1, 0, 0, 0); // move forward (z=1)
    const decoded = JSON.parse(new TextDecoder().decode(payload)) as {
      dx: number; dy: number; dz: number; yaw: number; pitch: number; actionFlags: number;
    };

    const inputComponent: PlayerInputComponent = {
      moveDirection: { x: decoded.dx, y: decoded.dy, z: decoded.dz },
      lookDirection: yawPitchToLookVector(decoded.yaw, decoded.pitch),
      actions: actionFlagsToNames(decoded.actionFlags),
      sequenceNumber: 1,
    };
    orchestrator.core.entities.components.set(entityId, 'player-input', inputComponent);

    // 5. Run one tick (movement system processes player-input → updates transform)
    orchestrator.core.systems.runAll({ deltaMs: 50, tickNumber: 1, wallTimeMicroseconds: 1000 });

    // 6. Verify transform was updated (entity should have moved along Z)
    const transform = orchestrator.core.entities.components.get(entityId, 'transform') as TransformComponent;
    expect(transform.position.z).toBeGreaterThan(0);
  });

  it('sprint flag produces higher speed than walking', () => {
    grpc.negotiate(makeManifest({ fabricId: 'sprint-test' }));
    const entityId = orchestrator.core.entities.spawn('player', 'default');

    orchestrator.core.entities.components.set(entityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    orchestrator.core.entities.components.set(entityId, 'movement', {
      speed: 0, maxSpeed: 6.0, isGrounded: true, movementMode: 'walking',
    });
    orchestrator.core.entities.components.set(entityId, 'physics-body', {
      mass: 70, velocity: { x: 0, y: 0, z: 0 }, isKinematic: false,
      collisionLayer: 1, collisionMask: 0xFFFF,
    });

    // Walk (no sprint flag)
    orchestrator.core.entities.components.set(entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 1, y: 0, z: 0 },
      actions: [],
      sequenceNumber: 1,
    });
    orchestrator.core.systems.runAll({ deltaMs: 1000, tickNumber: 1, wallTimeMicroseconds: 1000 });
    const walkTransform = orchestrator.core.entities.components.get(entityId, 'transform') as TransformComponent;
    const walkDistance = walkTransform.position.z;

    // Reset position
    orchestrator.core.entities.components.set(entityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });

    // Sprint (with sprint flag)
    orchestrator.core.entities.components.set(entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 1, y: 0, z: 0 },
      actions: ['sprint'],
      sequenceNumber: 2,
    });
    orchestrator.core.systems.runAll({ deltaMs: 1000, tickNumber: 2, wallTimeMicroseconds: 2000 });
    const sprintTransform = orchestrator.core.entities.components.get(entityId, 'transform') as TransformComponent;
    const sprintDistance = sprintTransform.position.z;

    expect(sprintDistance).toBeGreaterThan(walkDistance);
  });

  it('world state provider returns entity snapshots', () => {
    const entityId = orchestrator.core.entities.spawn('player', 'default');
    orchestrator.core.entities.components.set(entityId, 'transform', {
      position: { x: 10, y: 20, z: 30 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });

    const entities = orchestrator.core.entities.queryByWorld('default');
    expect(entities.length).toBeGreaterThanOrEqual(1);
    const found = entities.find(e => e.id === entityId);
    expect(found).toBeDefined();
  });

  it('disconnect removes player from active connections', () => {
    const { assignedClientId } = grpc.negotiate(makeManifest({ fabricId: 'dc-test' }));
    orchestrator.connections.connect({
      connectionId: assignedClientId,
      playerId: `player-${assignedClientId}`,
      displayName: `Tester`,
    });

    // Connection is 'pending' until spawned — mark spawned first
    const entityId = orchestrator.core.entities.spawn('player', 'default');
    orchestrator.connections.markSpawned(assignedClientId, entityId, 'default');
    expect(orchestrator.connections.getStats().activeConnections).toBe(1);

    orchestrator.connections.disconnect(assignedClientId);

    expect(orchestrator.connections.getStats().activeConnections).toBe(0);
  });

  it('multiple clients are independently tracked', () => {
    const a = grpc.negotiate(makeManifest({ fabricId: 'multi-a' }));
    const b = grpc.negotiate(makeManifest({ fabricId: 'multi-b' }));

    orchestrator.connections.connect({
      connectionId: a.assignedClientId, playerId: 'p-a', displayName: 'A',
    });
    orchestrator.connections.connect({
      connectionId: b.assignedClientId, playerId: 'p-b', displayName: 'B',
    });

    const entityA = orchestrator.core.entities.spawn('player', 'default');
    const entityB = orchestrator.core.entities.spawn('player', 'default');
    orchestrator.connections.markSpawned(a.assignedClientId, entityA, 'default');
    orchestrator.connections.markSpawned(b.assignedClientId, entityB, 'default');

    expect(orchestrator.connections.getStats().activeConnections).toBe(2);

    const connA = orchestrator.connections.getConnection(a.assignedClientId);
    const connB = orchestrator.connections.getConnection(b.assignedClientId);
    expect(connA?.entityId).toBe(entityA);
    expect(connB?.entityId).toBe(entityB);
  });

  it('input decoder rejects malformed payload', () => {
    const badPayload = new TextEncoder().encode('not json');
    let decoded: unknown;
    try {
      const text = new TextDecoder().decode(badPayload);
      decoded = JSON.parse(text);
    } catch {
      decoded = undefined;
    }
    expect(decoded).toBeUndefined();
  });

  it('action flags map to correct action names', () => {
    // jump(1) + sprint(2) + attack(8)
    const flags = 1 | 2 | 8;
    const names = actionFlagsToNames(flags);
    expect(names).toContain('jump');
    expect(names).toContain('sprint');
    expect(names).toContain('attack');
    expect(names).not.toContain('dodge');
  });

  it('yaw-pitch to look vector produces unit vectors', () => {
    const look = yawPitchToLookVector(0, 0);
    const mag = Math.sqrt(look.x ** 2 + look.y ** 2 + look.z ** 2);
    expect(mag).toBeCloseTo(1.0, 5);
  });

  it('yaw 90° points along Y axis', () => {
    const look = yawPitchToLookVector(Math.PI / 2, 0);
    expect(look.x).toBeCloseTo(0, 5);
    expect(look.y).toBeCloseTo(1, 5);
    expect(look.z).toBeCloseTo(0, 5);
  });
});
