/**
 * Bridge gRPC Server — Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBridgeGrpcServer,
  STALE_CLIENT_TIMEOUT_MS,
  type BridgeGrpcServer,
  type BridgeGrpcServerDeps,
  type CapabilityManifest,
  type ClientStreamMessage,
  type ServerStreamMessage,
  type BridgeWorldStateProvider,
} from '../bridge-grpc-server.js';

// ── Test Helpers ─────────────────────────────────────────────────

function createDeps(overrides?: Partial<BridgeGrpcServerDeps>): BridgeGrpcServerDeps {
  let counter = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time++ },
    id: { generate: () => `id-${++counter}` },
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    ...overrides,
  };
}

function makeManifest(overrides?: Partial<CapabilityManifest>): CapabilityManifest {
  return {
    fabricId: 'ue5-client-1',
    fabricName: 'BridgeLoom UE5',
    maxResolution: { width: 1920, height: 1080 },
    maxRefreshRate: 60,
    currentTier: 'high',
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
    ...overrides,
  };
}

function makeClientMessage(
  type: ClientStreamMessage['type'],
  seq: number,
): ClientStreamMessage {
  return {
    type,
    sequenceNumber: seq,
    timestamp: Date.now(),
    payload: new Uint8Array([1, 2, 3]),
  };
}

function makeWorldStateProvider(
  snapshots: ServerStreamMessage[] = [],
): BridgeWorldStateProvider {
  const spawns: ServerStreamMessage[] = [];
  const despawns: ServerStreamMessage[] = [];
  const poses: ServerStreamMessage[] = [];
  let timeWeather: ServerStreamMessage | undefined;

  return {
    getEntitySnapshots: () => snapshots,
    getSpawnQueue: () => spawns,
    getDespawnQueue: () => despawns,
    getTimeWeather: () => timeWeather,
    getFacialPoseUpdates: () => poses,
    clearQueues: () => {
      snapshots.length = 0;
      spawns.length = 0;
      despawns.length = 0;
      poses.length = 0;
      timeWeather = undefined;
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('BridgeGrpcServer', () => {
  let server: BridgeGrpcServer;

  beforeEach(() => {
    server = createBridgeGrpcServer(createDeps());
  });

  describe('negotiate', () => {
    it('accepts a valid client', () => {
      const result = server.negotiate(makeManifest());
      expect(result.accepted).toBe(true);
      expect(result.serverVersion).toBe('0.1.0');
      expect(result.assignedClientId).toBe('id-1');
    });

    it('assigns unique client IDs', () => {
      const r1 = server.negotiate(makeManifest());
      const r2 = server.negotiate(makeManifest({ fabricId: 'ue5-client-2' }));
      expect(r1.assignedClientId).not.toBe(r2.assignedClientId);
    });

    it('rejects when max concurrent streams reached', () => {
      const deps = createDeps({ config: { maxConcurrentStreams: 1 } });
      const s = createBridgeGrpcServer(deps);
      s.negotiate(makeManifest());
      const r2 = s.negotiate(makeManifest({ fabricId: 'ue5-2' }));
      expect(r2.accepted).toBe(false);
    });

    it('tracks connected clients', () => {
      server.negotiate(makeManifest());
      server.negotiate(makeManifest({ fabricId: 'ue5-2' }));
      expect(server.getConnectedClients()).toHaveLength(2);
    });

    it('stores capability manifest on client', () => {
      server.negotiate(makeManifest({ currentTier: 'cinematic' }));
      const clients = server.getConnectedClients();
      expect(clients[0].capabilities.currentTier).toBe('cinematic');
    });
  });

  describe('processMessage', () => {
    it('routes player-input to input handler', () => {
      const captured: { clientId: string; seq: number }[] = [];
      server.registerInputHandler({
        onPlayerInput: (cid, _payload, seq) => captured.push({ clientId: cid, seq }),
      });
      const { assignedClientId } = server.negotiate(makeManifest());
      server.processMessage(assignedClientId, makeClientMessage('player-input', 42));
      expect(captured).toHaveLength(1);
      expect(captured[0].seq).toBe(42);
    });

    it('routes physics-event to physics handler', () => {
      let captured = false;
      server.registerPhysicsHandler({
        onPhysicsEvent: () => { captured = true; },
      });
      const { assignedClientId } = server.negotiate(makeManifest());
      server.processMessage(assignedClientId, makeClientMessage('physics-event', 1));
      expect(captured).toBe(true);
    });

    it('responds to heartbeat with heartbeat-ack', () => {
      const { assignedClientId } = server.negotiate(makeManifest());
      server.processMessage(assignedClientId, makeClientMessage('heartbeat', 99));
      const queues = server.flush();
      const messages = queues.get(assignedClientId);
      expect(messages).toBeDefined();
      expect(messages![0].type).toBe('heartbeat-ack');
      expect(messages![0].sequenceNumber).toBe(99);
    });

    it('ignores messages from unknown clients', () => {
      server.processMessage('nonexistent', makeClientMessage('heartbeat', 1));
      const queues = server.flush();
      expect(queues.size).toBe(0);
    });

    it('handles telemetry without error', () => {
      const { assignedClientId } = server.negotiate(makeManifest());
      expect(() =>
        server.processMessage(assignedClientId, makeClientMessage('telemetry', 1)),
      ).not.toThrow();
    });
  });

  describe('worldCommand', () => {
    it('handles preload command', () => {
      const { assignedClientId } = server.negotiate(makeManifest());
      const result = server.worldCommand({
        commandType: 'preload',
        worldId: 'world-alpha',
        assetManifest: ['mesh-01', 'tex-01'],
      });
      expect(result.success).toBe(true);
      expect(result.commandType).toBe('preload');
      expect(result.worldId).toBe('world-alpha');

      const queues = server.flush();
      const messages = queues.get(assignedClientId);
      expect(messages).toBeDefined();
      expect(messages![0].type).toBe('world-preload');
    });

    it('handles unload command', () => {
      server.negotiate(makeManifest());
      const result = server.worldCommand({
        commandType: 'unload',
        worldId: 'world-beta',
      });
      expect(result.success).toBe(true);
      expect(result.commandType).toBe('unload');
    });

    it('handles transition command', () => {
      const result = server.worldCommand({
        commandType: 'transition',
        worldId: 'world-gamma',
        transitionDuration: 3000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('returns healthy status', () => {
      const health = server.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.connectedClients).toBe(0);
    });

    it('reflects connected client count', () => {
      server.negotiate(makeManifest());
      server.negotiate(makeManifest({ fabricId: 'ue5-2' }));
      const health = server.healthCheck();
      expect(health.connectedClients).toBe(2);
    });

    it('tracks message counts', () => {
      const { assignedClientId } = server.negotiate(makeManifest());
      server.processMessage(assignedClientId, makeClientMessage('heartbeat', 1));
      const health = server.healthCheck();
      expect(health.totalMessagesIn).toBe(1);
      expect(health.totalMessagesOut).toBeGreaterThanOrEqual(1);
    });
  });

  describe('disconnect', () => {
    it('removes a connected client', () => {
      const { assignedClientId } = server.negotiate(makeManifest());
      expect(server.disconnect(assignedClientId)).toBe(true);
      expect(server.getConnectedClients()).toHaveLength(0);
    });

    it('returns false for unknown client', () => {
      expect(server.disconnect('no-such')).toBe(false);
    });
  });

  describe('tick + flush', () => {
    it('broadcasts entity snapshots to all clients', () => {
      const snapshot: ServerStreamMessage = {
        type: 'entity-snapshot',
        sequenceNumber: 1,
        timestamp: 1000,
        payload: new Uint8Array([10, 20]),
      };
      const provider = makeWorldStateProvider([snapshot]);
      server.registerWorldStateProvider(provider);

      server.negotiate(makeManifest());
      server.negotiate(makeManifest({ fabricId: 'ue5-2' }));

      server.tick();
      const queues = server.flush();
      expect(queues.size).toBe(2);
      for (const [, messages] of queues) {
        expect(messages.some((m) => m.type === 'entity-snapshot')).toBe(true);
      }
    });

    it('clears queues after flush', () => {
      server.negotiate(makeManifest());
      server.processMessage('id-1', makeClientMessage('heartbeat', 1));
      server.flush();
      const second = server.flush();
      expect(second.size).toBe(0);
    });

    it('does nothing when no world state provider', () => {
      server.negotiate(makeManifest());
      expect(() => server.tick()).not.toThrow();
    });
  });

  describe('sweepStale', () => {
    it('removes clients past heartbeat timeout', () => {
      let time = 1_000_000;
      const deps = createDeps({
        clock: { nowMicroseconds: () => time },
      });
      const s = createBridgeGrpcServer(deps);
      s.negotiate(makeManifest());
      expect(s.getConnectedClients()).toHaveLength(1);

      time += (STALE_CLIENT_TIMEOUT_MS + 1) * 1_000;
      const swept = s.sweepStale();
      expect(swept).toHaveLength(1);
      expect(s.getConnectedClients()).toHaveLength(0);
    });

    it('keeps active clients', () => {
      let time = 1_000_000;
      const deps = createDeps({
        clock: { nowMicroseconds: () => time },
      });
      const s = createBridgeGrpcServer(deps);
      const { assignedClientId } = s.negotiate(makeManifest());

      time += 10_000_000;
      s.processMessage(assignedClientId, makeClientMessage('heartbeat', 1));

      time += 10_000_000;
      const swept = s.sweepStale();
      expect(swept).toHaveLength(0);
    });
  });

  describe('handler registration', () => {
    it('accepts null handlers gracefully', () => {
      const { assignedClientId } = server.negotiate(makeManifest());
      expect(() =>
        server.processMessage(assignedClientId, makeClientMessage('player-input', 1)),
      ).not.toThrow();
    });

    it('replaces input handler', () => {
      const calls: number[] = [];
      server.registerInputHandler({
        onPlayerInput: (_c, _p, seq) => calls.push(seq),
      });
      server.registerInputHandler({
        onPlayerInput: (_c, _p, seq) => calls.push(seq * 10),
      });
      const { assignedClientId } = server.negotiate(makeManifest());
      server.processMessage(assignedClientId, makeClientMessage('player-input', 5));
      expect(calls).toEqual([50]);
    });
  });
});
