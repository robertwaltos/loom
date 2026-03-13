import { describe, it, expect, vi } from 'vitest';

// ── Shared mock state (hoisted above vi.mock factories) ───────────
const grpcState = vi.hoisted(() => ({
  addService: vi.fn(),
  forceShutdown: vi.fn(),
  loadPackageDefinition: vi.fn(() => ({
    loom: { bridge: { BridgeLoom: { service: {} } } },
  })),
  protoLoad: vi.fn(() => Promise.resolve({})),
  serverCredentialsCreateInsecure: vi.fn(() => ({})),
}));

// ── Mock @grpc/proto-loader ───────────────────────────────────────
vi.mock('@grpc/proto-loader', () => ({
  load: grpcState.protoLoad,
}));

// ── Mock @grpc/grpc-js ────────────────────────────────────────────
vi.mock('@grpc/grpc-js', () => {
  class Server {
    addService = grpcState.addService;
    forceShutdown = grpcState.forceShutdown;
    bindAsync(
      _addr: string,
      _creds: unknown,
      cb: (err: Error | null, port: number) => void,
    ) {
      cb(null, 50051);
    }
  }

  return {
    Server,
    ServerCredentials: {
      createInsecure: grpcState.serverCredentialsCreateInsecure,
    },
    loadPackageDefinition: grpcState.loadPackageDefinition,
  };
});

import {
  createBridgeGrpcTransport,
  DEFAULT_TRANSPORT_CONFIG,
} from '../bridge-grpc-transport.js';
import type {
  BridgeGrpcTransportDeps,
  BridgeTransportConfig,
} from '../bridge-grpc-transport.js';
import type { BridgeGrpcServer } from '../bridge-grpc-server.js';

// ── Helpers ───────────────────────────────────────────────────────

function makeBridgeMock(): BridgeGrpcServer {
  return {
    negotiate: vi.fn().mockReturnValue({
      accepted: true,
      serverVersion: '1.0.0',
      assignedClientId: 'client-001',
    }),
    processMessage: vi.fn(),
    worldCommand: vi.fn().mockReturnValue({
      success: true,
      errorMessage: undefined,
      loadTimeMs: 500,
    }),
    healthCheck: vi.fn().mockReturnValue({
      healthy: true,
      connectedClients: 0,
      activeStreams: 0,
      pendingMessages: 0,
      uptimeMs: 1000,
    }),
    disconnect: vi.fn().mockReturnValue(true),
    tick: vi.fn(),
    flush: vi.fn().mockReturnValue(new Map()),
    sweepStale: vi.fn().mockReturnValue([]),
    getConnectedClients: vi.fn().mockReturnValue([]),
    registerInputHandler: vi.fn(),
    registerPhysicsHandler: vi.fn(),
    registerWorldStateProvider: vi.fn(),
    registerNegotiateHandler: vi.fn(),
    registerDisconnectHandler: vi.fn(),
  };
}

function makeLog() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeDeps(overrides?: Partial<BridgeTransportConfig>): BridgeGrpcTransportDeps {
  return {
    bridge: makeBridgeMock(),
    log: makeLog(),
    config: overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('bridge-grpc-transport simulation', () => {
  // ── DEFAULT_TRANSPORT_CONFIG ──────────────────────────────────

  describe('DEFAULT_TRANSPORT_CONFIG', () => {
    it('has expected default host and port', () => {
      expect(DEFAULT_TRANSPORT_CONFIG.host).toBe('0.0.0.0');
      expect(DEFAULT_TRANSPORT_CONFIG.port).toBe(50051);
    });

    it('has sensible maxConcurrentStreams', () => {
      expect(DEFAULT_TRANSPORT_CONFIG.maxConcurrentStreams).toBeGreaterThan(0);
    });

    it('has tickIntervalMs roughly 30Hz (≈33ms)', () => {
      expect(DEFAULT_TRANSPORT_CONFIG.tickIntervalMs).toBeGreaterThanOrEqual(16);
      expect(DEFAULT_TRANSPORT_CONFIG.tickIntervalMs).toBeLessThanOrEqual(67);
    });
  });

  // ── Factory: createBridgeGrpcTransport ────────────────────────

  describe('createBridgeGrpcTransport()', () => {
    it('resolves to a transport object without throwing', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      expect(transport).toBeDefined();
    });

    it('returns an object with start, stop, getAddress methods', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      expect(typeof transport.start).toBe('function');
      expect(typeof transport.stop).toBe('function');
      expect(typeof transport.getAddress).toBe('function');
    });

    it('getAddress returns empty string before start()', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      expect(transport.getAddress()).toBe('');
    });
  });

  // ── start() ──────────────────────────────────────────────────

  describe('start()', () => {
    it('resolves to an address string', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      const address = await transport.start();
      expect(typeof address).toBe('string');
      expect(address.length).toBeGreaterThan(0);
    });

    it('address includes the configured host', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps({ host: '127.0.0.1' }));
      const address = await transport.start();
      expect(address).toContain('127.0.0.1');
    });

    it('getAddress returns the bound address after start()', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      const addr = await transport.start();
      expect(transport.getAddress()).toBe(addr);
    });

    it('logs that the transport is listening', async () => {
      const deps = makeDeps();
      const transport = await createBridgeGrpcTransport(deps);
      await transport.start();
      expect(deps.log.info).toHaveBeenCalled();
    });
  });

  // ── stop() ───────────────────────────────────────────────────

  describe('stop()', () => {
    it('resolves without throwing when called after start', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      await transport.start();
      await expect(transport.stop()).resolves.toBeUndefined();
    });

    it('resolves without throwing when called before start', async () => {
      const transport = await createBridgeGrpcTransport(makeDeps());
      await expect(transport.stop()).resolves.toBeUndefined();
    });

    it('logs that the transport stopped', async () => {
      const deps = makeDeps();
      const transport = await createBridgeGrpcTransport(deps);
      await transport.start();
      await transport.stop();
      const infoCallMsgs = (deps.log.info as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => JSON.stringify(c),
      );
      expect(infoCallMsgs.some((msg) => msg.toLowerCase().includes('stop'))).toBe(true);
    });
  });

  // ── gRPC module interactions ──────────────────────────────────

  describe('gRPC module usage', () => {
    it('calls grpc.loadPackageDefinition after proto load', async () => {
      const grpc = await import('@grpc/grpc-js');
      await createBridgeGrpcTransport(makeDeps());
      expect(grpc.loadPackageDefinition).toHaveBeenCalled();
    });

    it('calls protoLoader.load once per transport creation', async () => {
      const protoLoader = await import('@grpc/proto-loader');
      await createBridgeGrpcTransport(makeDeps());
      expect(protoLoader.load).toHaveBeenCalled();
    });
  });
});
