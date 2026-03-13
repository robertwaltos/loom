import { describe, it, expect } from 'vitest';
import {
  createBridgeGrpcServer,
  STALE_CLIENT_TIMEOUT_MS,
  type CapabilityManifest,
  type ClientStreamMessage,
} from '../bridge-grpc-server.js';

let idCounter = 0;

function makeDeps() {
  idCounter = 0;
  let time = 1_000_000;
  return createBridgeGrpcServer({
    clock: { nowMicroseconds: () => time++ },
    id: { generate: () => `id-${++idCounter}` },
    log: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

function makeManifest(overrides?: Partial<CapabilityManifest>): CapabilityManifest {
  return {
    fabricId: 'ue5-client-sim',
    fabricName: 'Simulation UE5',
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

function makeClientMessage(type: ClientStreamMessage['type'], seq: number): ClientStreamMessage {
  return {
    type,
    sequenceNumber: seq,
    timestamp: Date.now(),
    payload: new Uint8Array([1, 2, 3]),
  };
}

describe('Bridge gRPC Server Simulation', () => {
  it('negotiates with a client and tracks it as connected', () => {
    const server = makeDeps();

    const result = server.negotiate(makeManifest());
    expect(result.accepted).toBe(true);
    expect(typeof result.assignedClientId).toBe('string');

    const clients = server.getConnectedClients();
    expect(clients.length).toBe(1);
    expect(clients[0]!.fabricId).toBe('ue5-client-sim');
  });

  it('processes a heartbeat message from a connected client', () => {
    const server = makeDeps();

    const { assignedClientId } = server.negotiate(makeManifest()) as { accepted: boolean; assignedClientId: string };
    const msg = makeClientMessage('heartbeat', 1);
    server.processMessage(assignedClientId, msg);

    const clients = server.getConnectedClients();
    expect(clients.find(c => c.clientId === assignedClientId)).toBeDefined();
  });

  it('disconnects a client and removes it from connected list', () => {
    const server = makeDeps();

    const { assignedClientId } = server.negotiate(makeManifest()) as { accepted: boolean; assignedClientId: string };
    expect(server.getConnectedClients().length).toBe(1);

    server.disconnect(assignedClientId);
    expect(server.getConnectedClients().length).toBe(0);
  });

  it('healthCheck returns server health info', () => {
    const server = makeDeps();
    const health = server.healthCheck();
    expect(health).toBeDefined();
    expect(health.healthy).toBe(true);
  });

  it('sweeps stale clients after timeout', () => {
    let time = 1_000_000;
    const server = createBridgeGrpcServer({
      clock: { nowMicroseconds: () => time },
      id: { generate: () => `id-${++idCounter}` },
      log: { info: () => {}, warn: () => {}, error: () => {} },
    });

    server.negotiate(makeManifest());
    expect(server.getConnectedClients().length).toBe(1);

    // Advance clock beyond stale timeout (clock is in µs, STALE_CLIENT_TIMEOUT_MS is in ms)
    time += (STALE_CLIENT_TIMEOUT_MS + 1) * 1_000;
    server.sweepStale();

    expect(server.getConnectedClients().length).toBe(0);
  });

  it('flushes pending messages without error', () => {
    const server = makeDeps();
    server.negotiate(makeManifest());
    expect(() => server.flush()).not.toThrow();
  });
});
