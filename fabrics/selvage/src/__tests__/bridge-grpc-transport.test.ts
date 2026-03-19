/**
 * bridge-grpc-transport — Unit Tests
 *
 * Tests converter functions (toRenderingFeatures / toRenderingTier /
 * toCapabilityManifest / toClientStreamMessage), RPC handlers, the
 * tick-flush loop, and transport lifecycle. All real gRPC/proto I/O
 * is replaced with vi.fn() mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mock state (hoisted so vi.mock factories can reference it) ──

const grpcState = vi.hoisted(() => ({
  addService: vi.fn(),
  forceShutdown: vi.fn(),
  loadPackageDefinition: vi.fn(() => ({
    loom: { bridge: { BridgeLoom: { service: {} } } },
  })),
  protoLoad: vi.fn(() => Promise.resolve({})),
  serverCredentialsCreateInsecure: vi.fn(() => ({})),
  bindAsyncErr: null as Error | null,
  boundPort: 50051,
}));

// ── Mock @grpc/proto-loader ────────────────────────────────────────

vi.mock('@grpc/proto-loader', () => ({
  load: grpcState.protoLoad,
}));

// ── Mock @grpc/grpc-js ─────────────────────────────────────────────

vi.mock('@grpc/grpc-js', () => {
  class Server {
    addService = grpcState.addService;
    forceShutdown = grpcState.forceShutdown;
    bindAsync(_addr: string, _creds: unknown, cb: (err: Error | null, port: number) => void) {
      cb(grpcState.bindAsyncErr, grpcState.boundPort);
    }
  }
  return {
    Server,
    ServerCredentials: { createInsecure: grpcState.serverCredentialsCreateInsecure },
    loadPackageDefinition: grpcState.loadPackageDefinition,
  };
});

import { createBridgeGrpcTransport, DEFAULT_TRANSPORT_CONFIG } from '../bridge-grpc-transport.js';
import type { BridgeGrpcTransportDeps, BridgeTransportConfig } from '../bridge-grpc-transport.js';
import type { BridgeGrpcServer } from '../bridge-grpc-server.js';

// ── Bridge + log mocks ─────────────────────────────────────────────

function makeBridge(): BridgeGrpcServer {
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
      loadTimeMs: 600,
    }),
    healthCheck: vi.fn().mockReturnValue({
      healthy: true,
      connectedClients: 3,
      activeStreams: 1,
      pendingMessages: 0,
      uptimeMs: 5000,
    }),
    disconnect: vi.fn().mockReturnValue(true),
    tick: vi.fn(),
    flush: vi.fn().mockReturnValue(new Map()),
    sweepStale: vi.fn().mockReturnValue([]),
    getConnectedClients: vi.fn().mockReturnValue([]),
    assignClientWorld: vi.fn(),
    queueClientWorldTransition: vi.fn().mockReturnValue(false),
    registerInputHandler: vi.fn(),
    registerPhysicsHandler: vi.fn(),
    registerWorldStateProvider: vi.fn(),
    registerNegotiateHandler: vi.fn(),
    registerDisconnectHandler: vi.fn(),
  };
}

function makeLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeDeps(cfg?: Partial<BridgeTransportConfig>): BridgeGrpcTransportDeps {
  return { bridge: makeBridge(), log: makeLog(), config: cfg };
}

// Capture the handlers registered with server.addService
async function startAndGetHandlers(deps: BridgeGrpcTransportDeps) {
  grpcState.addService.mockClear();
  const transport = await createBridgeGrpcTransport(deps);
  await transport.start();
  const handlers = grpcState.addService.mock.calls[0]?.[1] as Record<
    string,
    (...args: unknown[]) => void
  >;
  return { transport, handlers };
}

// ── DEFAULT_TRANSPORT_CONFIG ───────────────────────────────────────

describe('DEFAULT_TRANSPORT_CONFIG', () => {
  it('host is 0.0.0.0', () => {
    expect(DEFAULT_TRANSPORT_CONFIG.host).toBe('0.0.0.0');
  });

  it('port is 50051', () => {
    expect(DEFAULT_TRANSPORT_CONFIG.port).toBe(50051);
  });

  it('maxConcurrentStreams is positive', () => {
    expect(DEFAULT_TRANSPORT_CONFIG.maxConcurrentStreams).toBeGreaterThan(0);
  });

  it('keepAliveMs is a positive number', () => {
    expect(DEFAULT_TRANSPORT_CONFIG.keepAliveMs).toBeGreaterThan(0);
  });

  it('tickIntervalMs is between 16 and 100 ms', () => {
    expect(DEFAULT_TRANSPORT_CONFIG.tickIntervalMs).toBeGreaterThanOrEqual(16);
    expect(DEFAULT_TRANSPORT_CONFIG.tickIntervalMs).toBeLessThanOrEqual(100);
  });
});

// ── Factory ────────────────────────────────────────────────────────

describe('createBridgeGrpcTransport()', () => {
  it('resolves to an object with start / stop / getAddress', async () => {
    const t = await createBridgeGrpcTransport(makeDeps());
    expect(typeof t.start).toBe('function');
    expect(typeof t.stop).toBe('function');
    expect(typeof t.getAddress).toBe('function');
  });

  it('getAddress() is empty string before start', async () => {
    const t = await createBridgeGrpcTransport(makeDeps());
    expect(t.getAddress()).toBe('');
  });

  it('throws when loom namespace is missing from proto descriptor', async () => {
    grpcState.loadPackageDefinition.mockReturnValueOnce({});
    await expect(createBridgeGrpcTransport(makeDeps())).rejects.toThrow(/loom/i);
  });

  it('throws when loom.bridge namespace is missing', async () => {
    grpcState.loadPackageDefinition.mockReturnValueOnce({ loom: {} });
    await expect(createBridgeGrpcTransport(makeDeps())).rejects.toThrow(/bridge/i);
  });

  it('throws when BridgeLoom service is missing', async () => {
    grpcState.loadPackageDefinition.mockReturnValueOnce({ loom: { bridge: {} } });
    await expect(createBridgeGrpcTransport(makeDeps())).rejects.toThrow(/BridgeLoom/i);
  });
});

// ── start() ───────────────────────────────────────────────────────

describe('start()', () => {
  it('resolves to a non-empty address string', async () => {
    const t = await createBridgeGrpcTransport(makeDeps());
    const addr = await t.start();
    expect(typeof addr).toBe('string');
    expect(addr.length).toBeGreaterThan(0);
  });

  it('getAddress() returns the bound address after start', async () => {
    const t = await createBridgeGrpcTransport(makeDeps());
    const addr = await t.start();
    expect(t.getAddress()).toBe(addr);
  });

  it('address includes configured host', async () => {
    const t = await createBridgeGrpcTransport(makeDeps({ host: '127.0.0.1' }));
    const addr = await t.start();
    expect(addr).toContain('127.0.0.1');
  });

  it('registers Negotiate, HealthCheck, WorldCommand, GameStream handlers', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    expect(typeof handlers['Negotiate']).toBe('function');
    expect(typeof handlers['HealthCheck']).toBe('function');
    expect(typeof handlers['WorldCommand']).toBe('function');
    expect(typeof handlers['GameStream']).toBe('function');
  });

  it('logs that the transport is listening', async () => {
    const deps = makeDeps();
    const t = await createBridgeGrpcTransport(deps);
    await t.start();
    expect(deps.log.info).toHaveBeenCalled();
  });

  it('rejects when bindAsync returns an error', async () => {
    grpcState.bindAsyncErr = new Error('port in use');
    const t = await createBridgeGrpcTransport(makeDeps());
    await expect(t.start()).rejects.toThrow('port in use');
    grpcState.bindAsyncErr = null;
  });
});

// ── stop() ────────────────────────────────────────────────────────

describe('stop()', () => {
  it('resolves without throwing after start', async () => {
    const t = await createBridgeGrpcTransport(makeDeps());
    await t.start();
    await expect(t.stop()).resolves.toBeUndefined();
  });

  it('resolves without throwing before start', async () => {
    const t = await createBridgeGrpcTransport(makeDeps());
    await expect(t.stop()).resolves.toBeUndefined();
  });

  it('calls forceShutdown on the gRPC server', async () => {
    grpcState.forceShutdown.mockClear();
    const t = await createBridgeGrpcTransport(makeDeps());
    await t.start();
    await t.stop();
    expect(grpcState.forceShutdown).toHaveBeenCalledTimes(1);
  });

  it('logs that the transport stopped', async () => {
    const deps = makeDeps();
    const t = await createBridgeGrpcTransport(deps);
    await t.start();
    await t.stop();
    const calls = (deps.log.info as ReturnType<typeof vi.fn>).mock.calls.map((c) =>
      JSON.stringify(c).toLowerCase(),
    );
    expect(calls.some((m) => m.includes('stop'))).toBe(true);
  });
});

// ── Negotiate RPC ─────────────────────────────────────────────────

describe('Negotiate RPC handler', () => {
  it('calls bridge.negotiate with the converted manifest', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['Negotiate']({ request: { fabric_id: 'ue5-1' } }, cb);
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({ fabricId: 'ue5-1' }),
    );
  });

  it('callback receives accepted=true when bridge accepts', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['Negotiate']({ request: {} }, cb);
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ accepted: true }));
  });

  it('callback receives session_id from assignedClientId', async () => {
    const deps = makeDeps();
    (deps.bridge.negotiate as ReturnType<typeof vi.fn>).mockReturnValue({
      accepted: true,
      assignedClientId: 'sess-xyz',
    });
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['Negotiate']({ request: {} }, cb);
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ session_id: 'sess-xyz' }));
  });

  it('falls back to default fabricId "unknown" when absent in request', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['Negotiate']({ request: {} }, vi.fn());
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({ fabricId: 'unknown' }),
    );
  });

  it('maps rendering_tier "cinematic" correctly', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['Negotiate']({ request: { rendering_tier: 'cinematic' } }, vi.fn());
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({ currentTier: 'cinematic' }),
    );
  });

  it('falls back rendering_tier to "high" for unknown strings', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['Negotiate']({ request: { rendering_tier: 'ultra' } }, vi.fn());
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({ currentTier: 'high' }),
    );
  });

  it('maps proto rendering features to camelCase fields', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['Negotiate'](
      {
        request: {
          features: {
            nanite_geometry: true,
            hardware_ray_tracing: true,
            chaos_physics: true,
          },
        },
      },
      vi.fn(),
    );
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.objectContaining({
          naniteGeometry: true,
          hardwareRayTracing: true,
          chaosPhysics: true,
        }),
      }),
    );
  });

  it('defaults boolean rendering features to false when absent', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['Negotiate']({ request: { features: {} } }, vi.fn());
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({
        features: expect.objectContaining({
          naniteGeometry: false,
          volumetricClouds: false,
        }),
      }),
    );
  });

  it('maps max_resolution fields', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['Negotiate'](
      { request: { max_resolution_width: 3840, max_resolution_height: 2160 } },
      vi.fn(),
    );
    expect(deps.bridge.negotiate).toHaveBeenCalledWith(
      expect.objectContaining({
        maxResolution: { width: 3840, height: 2160 },
      }),
    );
  });
});

// ── HealthCheck RPC ────────────────────────────────────────────────

describe('HealthCheck RPC handler', () => {
  it('calls bridge.healthCheck', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['HealthCheck']({ request: { request_id: 'hc-1' } }, vi.fn());
    expect(deps.bridge.healthCheck).toHaveBeenCalledTimes(1);
  });

  it('callback receives healthy=true when bridge is healthy', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['HealthCheck']({ request: {} }, cb);
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ healthy: true }));
  });

  it('maps connectedClients to visible_entities', async () => {
    const deps = makeDeps();
    (deps.bridge.healthCheck as ReturnType<typeof vi.fn>).mockReturnValue({
      healthy: true,
      connectedClients: 42,
    });
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['HealthCheck']({ request: {} }, cb);
    expect(cb).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ visible_entities: 42 }),
    );
  });

  it('echoes request_id in response', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['HealthCheck']({ request: { request_id: 'req-99' } }, cb);
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ request_id: 'req-99' }));
  });
});

// ── WorldCommand RPC ───────────────────────────────────────────────

describe('WorldCommand RPC handler', () => {
  it('calls bridge.worldCommand with mapped fields', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['WorldCommand'](
      { request: { command_type: 'preload', world_id: 'w1' } },
      vi.fn(),
    );
    expect(deps.bridge.worldCommand).toHaveBeenCalledWith(
      expect.objectContaining({ commandType: 'preload', worldId: 'w1' }),
    );
  });

  it('callback receives success=true when bridge succeeds', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['WorldCommand']({ request: {} }, cb);
    expect(cb).toHaveBeenCalledWith(null, expect.objectContaining({ success: true }));
  });

  it('converts loadTimeMs to estimated_load_time_sec', async () => {
    const deps = makeDeps();
    (deps.bridge.worldCommand as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      loadTimeMs: 3000,
    });
    const { handlers } = await startAndGetHandlers(deps);
    const cb = vi.fn();
    handlers['WorldCommand']({ request: {} }, cb);
    expect(cb).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ estimated_load_time_sec: 3 }),
    );
  });

  it('maps asset names from assets array', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['WorldCommand'](
      {
        request: {
          assets: [{ asset_name: 'level1.pak' }, { asset_name: 'chars.pak' }],
        },
      },
      vi.fn(),
    );
    expect(deps.bridge.worldCommand).toHaveBeenCalledWith(
      expect.objectContaining({ assetManifest: ['level1.pak', 'chars.pak'] }),
    );
  });

  it('defaults command_type to "preload" when absent', async () => {
    const deps = makeDeps();
    const { handlers } = await startAndGetHandlers(deps);
    handlers['WorldCommand']({ request: {} }, vi.fn());
    expect(deps.bridge.worldCommand).toHaveBeenCalledWith(
      expect.objectContaining({ commandType: 'preload' }),
    );
  });
});

// ── GameStream RPC ─────────────────────────────────────────────────

describe('GameStream RPC handler', () => {
  function makeStream() {
    const handlers: Record<string, (...args: unknown[]) => void> = {};
    return {
      on: vi.fn((event: string, h: (...args: unknown[]) => void) => {
        handlers[event] = h;
      }),
      write: vi.fn(),
      end: vi.fn(),
      emit(event: string, ...args: unknown[]) {
        handlers[event]?.(...args);
      },
    };
  }

  it('processes incoming data messages via bridge.processMessage', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-1' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', { player_input: new Uint8Array([1]), sequence: 1, timestamp_us: 0 });
    expect(deps.bridge.processMessage).toHaveBeenCalledWith('c-1', expect.objectContaining({ type: 'player-input' }));
  });

  it('associates stream with first unregistered client', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-abc' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', { sequence: 1, timestamp_us: 0 });
    expect(deps.bridge.processMessage).toHaveBeenCalledWith('c-abc', expect.any(Object));
  });

  it('warns when no unassociated client is found for a stream', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', {});
    expect(deps.log.warn).toHaveBeenCalled();
  });

  it('calls bridge.disconnect on stream end', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-2' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', {});
    stream.emit('end');
    expect(deps.bridge.disconnect).toHaveBeenCalledWith('c-2');
  });

  it('calls stream.end() on stream end event', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-3' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', {});
    stream.emit('end');
    expect(stream.end).toHaveBeenCalled();
  });

  it('calls bridge.disconnect on stream error', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-4' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', {});
    stream.emit('error', new Error('network failure'));
    expect(deps.bridge.disconnect).toHaveBeenCalledWith('c-4');
  });

  it('calls bridge.disconnect on stream cancelled', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-5' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', {});
    stream.emit('cancelled');
    expect(deps.bridge.disconnect).toHaveBeenCalledWith('c-5');
  });

  it('maps physics_event type to physics-event message type', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-6' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', { physics_event: new Uint8Array([0x01]) });
    expect(deps.bridge.processMessage).toHaveBeenCalledWith(
      'c-6',
      expect.objectContaining({ type: 'physics-event' }),
    );
  });

  it('maps telemetry type correctly', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-7' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', { telemetry: new Uint8Array([0x02]) });
    expect(deps.bridge.processMessage).toHaveBeenCalledWith(
      'c-7',
      expect.objectContaining({ type: 'telemetry' }),
    );
  });

  it('defaults to heartbeat type when no payload fields are set', async () => {
    const deps = makeDeps();
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'c-8' },
    ]);
    const { handlers } = await startAndGetHandlers(deps);
    const stream = makeStream();
    handlers['GameStream'](stream);
    stream.emit('data', {});
    expect(deps.bridge.processMessage).toHaveBeenCalledWith(
      'c-8',
      expect.objectContaining({ type: 'heartbeat' }),
    );
  });
});

// ── Tick flush ─────────────────────────────────────────────────────

describe('tick flush', () => {
  it('calls bridge.sweepStale on each tick', async () => {
    vi.useFakeTimers();
    const deps = makeDeps({ tickIntervalMs: 10 });
    const t = await createBridgeGrpcTransport(deps);
    await t.start();
    vi.advanceTimersByTime(15);
    expect(deps.bridge.sweepStale).toHaveBeenCalled();
    await t.stop();
    vi.useRealTimers();
  });

  it('calls bridge.flush on each tick', async () => {
    vi.useFakeTimers();
    const deps = makeDeps({ tickIntervalMs: 10 });
    const t = await createBridgeGrpcTransport(deps);
    await t.start();
    vi.advanceTimersByTime(15);
    expect(deps.bridge.flush).toHaveBeenCalled();
    await t.stop();
    vi.useRealTimers();
  });

  it('writes server messages to active streams', async () => {
    vi.useFakeTimers();
    const deps = makeDeps({ tickIntervalMs: 10 });
    const streamMock = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'tick-client' },
    ]);
    (deps.bridge.flush as ReturnType<typeof vi.fn>).mockReturnValue(
      new Map([
        [
          'tick-client',
          [{ type: 'entity-snapshot', sequenceNumber: 1, timestamp: 100, payload: new Uint8Array(4) }],
        ],
      ]),
    );

    const { handlers } = await startAndGetHandlers(deps);
    // Associate the stream
    const streamHandlers: Record<string, (...args: unknown[]) => void> = {};
    (streamMock.on as ReturnType<typeof vi.fn>).mockImplementation(
      (ev: string, h: (...args: unknown[]) => void) => {
        streamHandlers[ev] = h;
      },
    );
    handlers['GameStream'](streamMock);
    // Emit first data to associate client
    streamHandlers['data']?.({});

    vi.advanceTimersByTime(15);
    expect(streamMock.write).toHaveBeenCalled();
    await deps.bridge; // dummy await to settle
    vi.useRealTimers();
  });
});

// ── serverMessageToProto field mapping ────────────────────────────

describe('serverMessageToProto field mapping (via flush)', () => {
  async function flushOneMessage(type: string) {
    vi.useFakeTimers();
    const deps = makeDeps({ tickIntervalMs: 10 });
    const streamMock = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
    (deps.bridge.getConnectedClients as ReturnType<typeof vi.fn>).mockReturnValue([
      { clientId: 'map-client' },
    ]);
    (deps.bridge.flush as ReturnType<typeof vi.fn>).mockReturnValue(
      new Map([
        [
          'map-client',
          [{ type, sequenceNumber: 1, timestamp: 10, payload: new Uint8Array(2) }],
        ],
      ]),
    );
    const { handlers } = await startAndGetHandlers(deps);
    const streamHandlers: Record<string, (...args: unknown[]) => void> = {};
    (streamMock.on as ReturnType<typeof vi.fn>).mockImplementation(
      (ev: string, h: (...args: unknown[]) => void) => {
        streamHandlers[ev] = h;
      },
    );
    handlers['GameStream'](streamMock);
    streamHandlers['data']?.({});
    vi.advanceTimersByTime(15);
    const written = (streamMock.write as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    await deps.bridge; // settle
    vi.useRealTimers();
    return written;
  }

  it('entity-snapshot maps to entity_snapshot field', async () => {
    const written = await flushOneMessage('entity-snapshot');
    expect(written).toHaveProperty('entity_snapshot');
  });

  it('entity-spawn maps to entity_spawn field', async () => {
    const written = await flushOneMessage('entity-spawn');
    expect(written).toHaveProperty('entity_spawn');
  });

  it('time-weather maps to time_of_day field', async () => {
    const written = await flushOneMessage('time-weather');
    expect(written).toHaveProperty('time_of_day');
  });

  it('world-preload maps to chunk_load field', async () => {
    const written = await flushOneMessage('world-preload');
    expect(written).toHaveProperty('chunk_load');
  });

  it('world-unload maps to chunk_unload field', async () => {
    const written = await flushOneMessage('world-unload');
    expect(written).toHaveProperty('chunk_unload');
  });

  it('unknown type falls back to entity_snapshot field', async () => {
    const written = await flushOneMessage('unknown-type');
    expect(written).toHaveProperty('entity_snapshot');
  });

  it('written proto includes sequence number', async () => {
    const written = await flushOneMessage('entity-snapshot');
    expect(written).toHaveProperty('sequence', 1);
  });
});
