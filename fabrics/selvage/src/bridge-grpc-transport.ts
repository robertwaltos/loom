/**
 * bridge-grpc-transport.ts — gRPC network transport for BridgeLoom protocol.
 *
 * Binds to port 50051 and exposes the four RPCs from loom-bridge.proto:
 *   - GameStream()   → bidirectional streaming (hot path)
 *   - Negotiate()    → capability handshake
 *   - HealthCheck()  → inspector polling
 *   - WorldCommand() → preload/unload directives
 *
 * Routes incoming RPCs to a BridgeGrpcServer instance (the logical
 * server that manages client state, message queuing, and ticking).
 *
 * Thread: bridge/selvage/bridge-grpc-transport
 * Tier: 1
 */

import type {
  BridgeGrpcServer,
  CapabilityManifest,
  RenderingFeatures,
  RenderingTier,
  ClientStreamMessage,
  ClientMessageType,
} from './bridge-grpc-server.js';

// ── Ports ────────────────────────────────────────────────────────

export interface BridgeTransportLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly error: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface BridgeTransportConfig {
  readonly host: string;
  readonly port: number;
  readonly maxConcurrentStreams: number;
  readonly keepAliveMs: number;
  readonly tickIntervalMs: number;
}

export interface BridgeGrpcTransport {
  readonly start: () => Promise<string>;
  readonly stop: () => Promise<void>;
  readonly getAddress: () => string;
}

export interface BridgeGrpcTransportDeps {
  readonly bridge: BridgeGrpcServer;
  readonly log: BridgeTransportLogPort;
  readonly config?: Partial<BridgeTransportConfig>;
}

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_TRANSPORT_CONFIG: BridgeTransportConfig = {
  host: '0.0.0.0',
  port: 50051,
  maxConcurrentStreams: 64,
  keepAliveMs: 30_000,
  tickIntervalMs: 33, // ~30Hz
};

// ── Proto-compatible type mapping ────────────────────────────────

interface ProtoNegotiateRequest {
  readonly fabric_id?: string;
  readonly fabric_name?: string;
  readonly max_resolution_width?: number;
  readonly max_resolution_height?: number;
  readonly max_refresh_rate?: number;
  readonly rendering_tier?: string;
  readonly features?: Partial<ProtoRenderingFeatures>;
  readonly max_visible_entities?: number;
  readonly supports_weave_zone?: boolean;
  readonly supports_pixel_streaming?: boolean;
  readonly preferred_update_rate_hz?: number;
}

interface ProtoRenderingFeatures {
  readonly nanite_geometry?: boolean;
  readonly hardware_ray_tracing?: boolean;
  readonly software_ray_tracing?: boolean;
  readonly global_illumination?: boolean;
  readonly virtual_shadow_maps?: boolean;
  readonly volumetric_clouds?: boolean;
  readonly hair_simulation?: boolean;
  readonly cloth_simulation?: boolean;
  readonly facial_animation?: boolean;
  readonly procedural_generation?: boolean;
  readonly metasound_audio?: boolean;
  readonly mass_entity?: boolean;
  readonly chaos_physics?: boolean;
}

interface ProtoClientMessage {
  readonly player_input?: Uint8Array;
  readonly physics_event?: Uint8Array;
  readonly telemetry?: Uint8Array;
  readonly sequence?: number;
  readonly timestamp_us?: bigint | number;
}

interface ProtoHealthCheckRequest {
  readonly request_id?: string;
}

interface ProtoWorldCommandRequest {
  readonly command_type?: string;
  readonly world_id?: string;
  readonly assets?: ReadonlyArray<{ content_hash?: string; asset_name?: string; size_bytes?: number }>;
  readonly priority?: number;
}

// ── Converters ───────────────────────────────────────────────────

function toRenderingFeatures(proto?: Partial<ProtoRenderingFeatures>): RenderingFeatures {
  return {
    naniteGeometry: proto?.nanite_geometry ?? false,
    hardwareRayTracing: proto?.hardware_ray_tracing ?? false,
    softwareRayTracing: proto?.software_ray_tracing ?? false,
    globalIllumination: proto?.global_illumination ?? false,
    virtualShadowMaps: proto?.virtual_shadow_maps ?? false,
    volumetricClouds: proto?.volumetric_clouds ?? false,
    hairSimulation: proto?.hair_simulation ?? false,
    clothSimulation: proto?.cloth_simulation ?? false,
    facialAnimation: proto?.facial_animation ?? false,
    proceduralGeneration: proto?.procedural_generation ?? false,
    metaHumanSupport: proto?.facial_animation ?? false,
    massEntityFramework: proto?.mass_entity ?? false,
    chaosPhysics: proto?.chaos_physics ?? false,
    metaSoundAudio: proto?.metasound_audio ?? false,
  };
}

function toRenderingTier(tier?: string): RenderingTier {
  if (tier === 'cinematic' || tier === 'high' || tier === 'performance' || tier === 'streaming') {
    return tier;
  }
  return 'high';
}

function toCapabilityManifest(req: ProtoNegotiateRequest): CapabilityManifest {
  return {
    fabricId: req.fabric_id ?? 'unknown',
    fabricName: req.fabric_name ?? 'Unknown Fabric',
    maxResolution: {
      width: req.max_resolution_width ?? 1920,
      height: req.max_resolution_height ?? 1080,
    },
    maxRefreshRate: req.max_refresh_rate ?? 60,
    currentTier: toRenderingTier(req.rendering_tier),
    features: toRenderingFeatures(req.features),
    maxVisibleEntities: req.max_visible_entities ?? 5000,
    supportsWeaveZoneOverlap: req.supports_weave_zone ?? false,
    supportsPixelStreaming: req.supports_pixel_streaming ?? false,
    preferredStateUpdateRate: req.preferred_update_rate_hz ?? 30,
  };
}

function toClientStreamMessage(proto: ProtoClientMessage): ClientStreamMessage {
  let type: ClientMessageType = 'heartbeat';
  let payload = new Uint8Array(0);

  if (proto.player_input) {
    type = 'player-input';
    payload = new Uint8Array(proto.player_input);
  } else if (proto.physics_event) {
    type = 'physics-event';
    payload = new Uint8Array(proto.physics_event);
  } else if (proto.telemetry) {
    type = 'telemetry';
    payload = new Uint8Array(proto.telemetry);
  }

  return {
    type,
    sequenceNumber: proto.sequence ?? 0,
    timestamp: Number(proto.timestamp_us ?? 0),
    payload,
  };
}

// ── gRPC call type interfaces ────────────────────────────────────

interface UnaryCall<TReq, TRes> {
  readonly request: TReq;
}

interface UnaryCallback<TRes> {
  (err: Error | null, response?: TRes): void;
}

interface ServerWritable<T> {
  write(msg: T): boolean;
  end(): void;
}

interface BidiStream<TReq, TRes> extends ServerWritable<TRes> {
  on(event: 'data', handler: (msg: TReq) => void): void;
  on(event: 'end', handler: () => void): void;
  on(event: 'error', handler: (err: Error) => void): void;
  on(event: 'cancelled', handler: () => void): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

// ── Factory ──────────────────────────────────────────────────────

async function createBridgeGrpcTransport(
  deps: BridgeGrpcTransportDeps,
): Promise<BridgeGrpcTransport> {
  const config: BridgeTransportConfig = { ...DEFAULT_TRANSPORT_CONFIG, ...deps.config };
  const bridge = deps.bridge;
  const log = deps.log;

  const grpc = await import('@grpc/grpc-js');
  const protoLoader = await import('@grpc/proto-loader');

  let server: InstanceType<typeof grpc.Server> | null = null;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let boundAddress = '';

  // Track active GameStream connections: clientId → stream
  const activeStreams = new Map<string, BidiStream<ProtoClientMessage, unknown>>();

  // ── Build service definition from .proto ─────────────────────

  const protoPath = new URL(
    '../../../contracts/protocols/src/loom-bridge.proto',
    import.meta.url,
  ).pathname;

  // On Windows, strip leading / from /C:/... paths
  const resolvedProtoPath = process.platform === 'win32' && protoPath.startsWith('/')
    ? protoPath.slice(1)
    : protoPath;

  const packageDefinition = await protoLoader.load(resolvedProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  const loomBridge = (protoDescriptor['loom'] as Record<string, unknown>)?.['bridge'] as
    | Record<string, unknown>
    | undefined;

  if (!loomBridge?.['BridgeLoom']) {
    throw new Error('Failed to load loom.bridge.BridgeLoom service from proto');
  }

  const BridgeLoomService = (loomBridge['BridgeLoom'] as { service: unknown }).service;

  // ── RPC Handlers ─────────────────────────────────────────────

  function handleNegotiateRpc(
    call: UnaryCall<ProtoNegotiateRequest, unknown>,
    callback: UnaryCallback<unknown>,
  ): void {
    const manifest = toCapabilityManifest(call.request);
    const result = bridge.negotiate(manifest);

    callback(null, {
      accepted: result.accepted,
      assigned_update_rate_hz: config.tickIntervalMs > 0
        ? Math.round(1000 / config.tickIntervalMs)
        : 30,
      max_entities_budget: manifest.maxVisibleEntities,
      session_id: result.assignedClientId,
      preload_worlds: [],
    });
  }

  function handleHealthCheckRpc(
    call: UnaryCall<ProtoHealthCheckRequest, unknown>,
    callback: UnaryCallback<unknown>,
  ): void {
    const health = bridge.healthCheck();
    callback(null, {
      request_id: call.request.request_id ?? '',
      healthy: health.healthy,
      current_fps: 0,
      frame_time_ms: 0,
      visible_entities: health.connectedClients,
      memory_usage_mb: 0,
      gpu_usage_percent: 0,
      loaded_chunks: 0,
      active_metahumans: 0,
    });
  }

  function handleWorldCommandRpc(
    call: UnaryCall<ProtoWorldCommandRequest, unknown>,
    callback: UnaryCallback<unknown>,
  ): void {
    const req = call.request;
    const result = bridge.worldCommand({
      commandType: (req.command_type ?? 'preload') as 'preload' | 'unload' | 'transition',
      worldId: req.world_id ?? '',
      assetManifest: req.assets?.map((a) => a.asset_name ?? '') ?? [],
      transitionDuration: undefined,
    });
    callback(null, {
      success: result.success,
      error_message: result.errorMessage ?? '',
      estimated_load_time_sec: (result.loadTimeMs ?? 0) / 1000,
    });
  }

  function handleGameStreamRpc(
    call: BidiStream<ProtoClientMessage, unknown>,
  ): void {
    let clientId = '';

    call.on('data', (msg: ProtoClientMessage) => {
      const clientMsg = toClientStreamMessage(msg);

      // First message from a stream that isn't associated yet:
      // we need to figure out which client this is. The C++ side
      // sends a heartbeat as the first stream message after Negotiate.
      if (clientId === '') {
        const clients = bridge.getConnectedClients();
        // Match the most recently connected client not yet in activeStreams
        for (const c of clients) {
          if (!activeStreams.has(c.clientId)) {
            clientId = c.clientId;
            activeStreams.set(clientId, call);
            log.info({ clientId }, 'GameStream associated with client');
            break;
          }
        }
        if (clientId === '') {
          log.warn({}, 'GameStream received data but no unassociated client found');
          return;
        }
      }

      bridge.processMessage(clientId, clientMsg);
    });

    call.on('end', () => {
      if (clientId !== '') {
        bridge.disconnect(clientId);
        activeStreams.delete(clientId);
        log.info({ clientId }, 'GameStream ended');
      }
      call.end();
    });

    call.on('error', (err: Error) => {
      log.error({ clientId, error: err.message }, 'GameStream error');
      if (clientId !== '') {
        bridge.disconnect(clientId);
        activeStreams.delete(clientId);
      }
    });

    call.on('cancelled', () => {
      if (clientId !== '') {
        bridge.disconnect(clientId);
        activeStreams.delete(clientId);
        log.info({ clientId }, 'GameStream cancelled');
      }
    });
  }

  // ── Tick: flush server messages to streams ───────────────────

  function serverMessageToProto(msg: { type: string; sequenceNumber: number; timestamp: number; payload: Uint8Array }): Record<string, unknown> {
    const proto: Record<string, unknown> = {
      sequence: msg.sequenceNumber,
      timestamp_us: msg.timestamp,
      correlation_id: '',
    };

    switch (msg.type) {
      case 'entity-snapshot':
        proto['entity_snapshot'] = msg.payload;
        break;
      case 'entity-spawn':
        proto['entity_spawn'] = msg.payload;
        break;
      case 'entity-despawn':
        proto['entity_despawn'] = msg.payload;
        break;
      case 'time-weather':
        proto['time_of_day'] = msg.payload;
        break;
      case 'facial-pose':
        proto['facial_pose'] = msg.payload;
        break;
      case 'world-preload':
        proto['chunk_load'] = msg.payload;
        break;
      case 'world-unload':
        proto['chunk_unload'] = msg.payload;
        break;
      default:
        proto['entity_snapshot'] = msg.payload;
    }

    return proto;
  }

  function tickFlush(): void {
    bridge.tick();
    bridge.sweepStale();

    const queues = bridge.flush();
    for (const [clientId, messages] of queues) {
      const stream = activeStreams.get(clientId);
      if (!stream) continue;

      for (const msg of messages) {
        stream.write(serverMessageToProto(msg));
      }
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────

  return {
    start: () =>
      new Promise<string>((resolve, reject) => {
        server = new grpc.Server({
          'grpc.max_concurrent_streams': config.maxConcurrentStreams,
          'grpc.keepalive_time_ms': config.keepAliveMs,
        });

        server.addService(BridgeLoomService as never, {
          Negotiate: handleNegotiateRpc,
          HealthCheck: handleHealthCheckRpc,
          WorldCommand: handleWorldCommandRpc,
          GameStream: handleGameStreamRpc,
        } as never);

        const address = `${config.host}:${config.port}`;
        server.bindAsync(
          address,
          grpc.ServerCredentials.createInsecure(),
          (err, boundPort) => {
            if (err) {
              reject(err);
              return;
            }
            boundAddress = `${config.host}:${boundPort}`;
            tickTimer = setInterval(tickFlush, config.tickIntervalMs);
            log.info({ address: boundAddress }, 'Bridge gRPC transport listening');
            resolve(boundAddress);
          },
        );
      }),

    stop: async () => {
      if (tickTimer !== null) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
      for (const [clientId, stream] of activeStreams) {
        bridge.disconnect(clientId);
        stream.end();
      }
      activeStreams.clear();
      if (server !== null) {
        server.forceShutdown();
        server = null;
      }
      log.info({}, 'Bridge gRPC transport stopped');
    },

    getAddress: () => boundAddress,
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createBridgeGrpcTransport, DEFAULT_TRANSPORT_CONFIG };
