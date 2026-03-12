/**
 * Bridge gRPC Server — Production gRPC service implementing the BridgeLoom protocol.
 *
 * Exposes the four RPCs defined in loom-bridge.proto:
 *   - GameStream()   → bidirectional streaming (hot path, 30Hz)
 *   - Negotiate()    → capability handshake on connect
 *   - HealthCheck()  → inspector polling
 *   - WorldCommand() → load/unload directives
 *
 * Bridges UE5 C++ clients to the TypeScript Loom via gRPC.
 * Binary-first: MessagePack on the hot path; JSON fallback for admin.
 *
 * Thread: bridge/selvage/bridge-grpc-server
 * Tier: 1
 */

// ── Ports ────────────────────────────────────────────────────────

export interface BridgeGrpcClockPort {
  readonly nowMicroseconds: () => number;
}

export interface BridgeGrpcIdPort {
  readonly generate: () => string;
}

export interface BridgeGrpcLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly error: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Config ───────────────────────────────────────────────────────

export interface BridgeGrpcConfig {
  readonly host: string;
  readonly port: number;
  readonly maxConcurrentStreams: number;
  readonly keepAliveMs: number;
  readonly sendRateHz: number;
  readonly maxClientsPerInstance: number;
}

const DEFAULT_BRIDGE_CONFIG: BridgeGrpcConfig = {
  host: '0.0.0.0',
  port: 50051,
  maxConcurrentStreams: 64,
  keepAliveMs: 30_000,
  sendRateHz: 30,
  maxClientsPerInstance: 128,
};

// ── Capability Types ─────────────────────────────────────────────

export interface RenderingFeatures {
  readonly naniteGeometry: boolean;
  readonly hardwareRayTracing: boolean;
  readonly softwareRayTracing: boolean;
  readonly globalIllumination: boolean;
  readonly virtualShadowMaps: boolean;
  readonly volumetricClouds: boolean;
  readonly hairSimulation: boolean;
  readonly clothSimulation: boolean;
  readonly facialAnimation: boolean;
  readonly proceduralGeneration: boolean;
  readonly metaHumanSupport: boolean;
  readonly massEntityFramework: boolean;
  readonly chaosPhysics: boolean;
  readonly metaSoundAudio: boolean;
}

export type RenderingTier = 'cinematic' | 'high' | 'performance' | 'streaming';

export interface CapabilityManifest {
  readonly fabricId: string;
  readonly fabricName: string;
  readonly maxResolution: { readonly width: number; readonly height: number };
  readonly maxRefreshRate: number;
  readonly currentTier: RenderingTier;
  readonly features: RenderingFeatures;
  readonly maxVisibleEntities: number;
  readonly supportsWeaveZoneOverlap: boolean;
  readonly supportsPixelStreaming: boolean;
  readonly preferredStateUpdateRate: number;
}

// ── Stream Message Types ─────────────────────────────────────────

export type ClientMessageType =
  | 'player-input'
  | 'physics-event'
  | 'telemetry'
  | 'heartbeat';

export type ServerMessageType =
  | 'entity-snapshot'
  | 'entity-spawn'
  | 'entity-despawn'
  | 'time-weather'
  | 'facial-pose'
  | 'world-preload'
  | 'world-unload'
  | 'heartbeat-ack';

export interface ClientStreamMessage {
  readonly type: ClientMessageType;
  readonly sequenceNumber: number;
  readonly timestamp: number;
  readonly payload: Uint8Array;
}

export interface ServerStreamMessage {
  readonly type: ServerMessageType;
  readonly sequenceNumber: number;
  readonly timestamp: number;
  readonly payload: Uint8Array;
}

// ── World Command Types ──────────────────────────────────────────

export type WorldCommandType = 'preload' | 'unload' | 'transition';

export interface WorldCommandRequest {
  readonly commandType: WorldCommandType;
  readonly worldId: string;
  readonly assetManifest?: ReadonlyArray<string>;
  readonly transitionDuration?: number;
}

export interface WorldCommandResponse {
  readonly success: boolean;
  readonly commandType: WorldCommandType;
  readonly worldId: string;
  readonly errorMessage?: string;
  readonly loadTimeMs?: number;
}

// ── Health Types ─────────────────────────────────────────────────

export interface BridgeHealthStatus {
  readonly healthy: boolean;
  readonly connectedClients: number;
  readonly activeStreams: number;
  readonly uptimeMs: number;
  readonly totalMessagesIn: number;
  readonly totalMessagesOut: number;
  readonly avgRoundTripMs: number;
}

// ── Connected Client ─────────────────────────────────────────────

export interface ConnectedClient {
  readonly clientId: string;
  readonly fabricId: string;
  readonly capabilities: CapabilityManifest;
  readonly connectedAtMs: number;
  readonly lastHeartbeatMs: number;
  readonly sequenceOut: number;
  readonly sequenceIn: number;
  readonly roundTripMs: number;
}

// ── Event Handlers (injected by game systems) ────────────────────

export interface BridgeNegotiateHandler {
  readonly onNegotiate: (
    clientId: string,
    manifest: CapabilityManifest,
  ) => void;
}

export interface BridgeDisconnectHandler {
  readonly onDisconnect: (clientId: string) => void;
}

export interface BridgeInputHandler {
  readonly onPlayerInput: (
    clientId: string,
    payload: Uint8Array,
    sequenceNumber: number,
  ) => void;
}

export interface BridgePhysicsHandler {
  readonly onPhysicsEvent: (
    clientId: string,
    payload: Uint8Array,
  ) => void;
}

export interface BridgeWorldStateProvider {
  readonly getEntitySnapshots: () => ReadonlyArray<ServerStreamMessage>;
  readonly getSpawnQueue: () => ReadonlyArray<ServerStreamMessage>;
  readonly getDespawnQueue: () => ReadonlyArray<ServerStreamMessage>;
  readonly getTimeWeather: () => ServerStreamMessage | undefined;
  readonly getFacialPoseUpdates: () => ReadonlyArray<ServerStreamMessage>;
  readonly clearQueues: () => void;
}

// ── Server State ─────────────────────────────────────────────────

interface BridgeServerState {
  readonly config: BridgeGrpcConfig;
  readonly clock: BridgeGrpcClockPort;
  readonly id: BridgeGrpcIdPort;
  readonly log: BridgeGrpcLogPort;
  readonly clients: Map<string, ConnectedClient>;
  readonly clientWriteQueues: Map<string, ServerStreamMessage[]>;
  totalMessagesIn: number;
  totalMessagesOut: number;
  startedAtMs: number;
  inputHandler: BridgeInputHandler | null;
  physicsHandler: BridgePhysicsHandler | null;
  worldStateProvider: BridgeWorldStateProvider | null;
  negotiateHandler: BridgeNegotiateHandler | null;
  disconnectHandler: BridgeDisconnectHandler | null;
}

// ── Negotiate ────────────────────────────────────────────────────

function handleNegotiate(
  state: BridgeServerState,
  clientManifest: CapabilityManifest,
): { readonly accepted: boolean; readonly serverVersion: string; readonly assignedClientId: string } {
  if (state.clients.size >= state.config.maxConcurrentStreams) {
    state.log.warn(
      { fabricId: clientManifest.fabricId },
      'Negotiate rejected: max concurrent streams reached',
    );
    return { accepted: false, serverVersion: '0.1.0', assignedClientId: '' };
  }

  const clientId = state.id.generate();
  const client: ConnectedClient = {
    clientId,
    fabricId: clientManifest.fabricId,
    capabilities: clientManifest,
    connectedAtMs: state.clock.nowMicroseconds() / 1_000,
    lastHeartbeatMs: state.clock.nowMicroseconds() / 1_000,
    sequenceOut: 0,
    sequenceIn: 0,
    roundTripMs: 0,
  };

  state.clients.set(clientId, client);
  state.clientWriteQueues.set(clientId, []);

  state.log.info(
    { clientId, fabricId: clientManifest.fabricId, tier: clientManifest.currentTier },
    'Client negotiated successfully',
  );

  state.negotiateHandler?.onNegotiate(clientId, clientManifest);

  return { accepted: true, serverVersion: '0.1.0', assignedClientId: clientId };
}

// ── GameStream Message Processing ────────────────────────────────

function processClientMessage(
  state: BridgeServerState,
  clientId: string,
  message: ClientStreamMessage,
): void {
  const client = state.clients.get(clientId);
  if (!client) return;

  state.totalMessagesIn += 1;

  switch (message.type) {
    case 'player-input':
      state.inputHandler?.onPlayerInput(clientId, message.payload, message.sequenceNumber);
      break;
    case 'physics-event':
      state.physicsHandler?.onPhysicsEvent(clientId, message.payload);
      break;
    case 'heartbeat': {
      const nowMs = state.clock.nowMicroseconds() / 1_000;
      const updatedClient: ConnectedClient = {
        ...client,
        lastHeartbeatMs: nowMs,
        sequenceIn: message.sequenceNumber,
        roundTripMs: nowMs - client.lastHeartbeatMs,
      };
      state.clients.set(clientId, updatedClient);
      enqueueServerMessage(state, clientId, {
        type: 'heartbeat-ack',
        sequenceNumber: message.sequenceNumber,
        timestamp: state.clock.nowMicroseconds(),
        payload: new Uint8Array(0),
      });
      break;
    }
    case 'telemetry':
      break;
  }
}

// ── Server → Client Message Queuing ──────────────────────────────

function enqueueServerMessage(
  state: BridgeServerState,
  clientId: string,
  message: ServerStreamMessage,
): void {
  const queue = state.clientWriteQueues.get(clientId);
  if (!queue) return;
  queue.push(message);
  state.totalMessagesOut += 1;
}

function broadcastToAllClients(
  state: BridgeServerState,
  message: ServerStreamMessage,
): void {
  for (const clientId of state.clients.keys()) {
    enqueueServerMessage(state, clientId, message);
  }
}

// ── Tick: push world state to connected clients ──────────────────

function tickBroadcastWorldState(state: BridgeServerState): void {
  const provider = state.worldStateProvider;
  if (!provider) return;

  const spawns = provider.getSpawnQueue();
  for (const spawn of spawns) broadcastToAllClients(state, spawn);

  const despawns = provider.getDespawnQueue();
  for (const despawn of despawns) broadcastToAllClients(state, despawn);

  const snapshots = provider.getEntitySnapshots();
  for (const snapshot of snapshots) broadcastToAllClients(state, snapshot);

  const timeWeather = provider.getTimeWeather();
  if (timeWeather) broadcastToAllClients(state, timeWeather);

  const facialPoses = provider.getFacialPoseUpdates();
  for (const pose of facialPoses) broadcastToAllClients(state, pose);

  provider.clearQueues();
}

// ── Flush client write queues ────────────────────────────────────

function flushClientQueues(
  state: BridgeServerState,
): ReadonlyMap<string, ReadonlyArray<ServerStreamMessage>> {
  const result = new Map<string, ReadonlyArray<ServerStreamMessage>>();
  for (const [clientId, queue] of state.clientWriteQueues) {
    if (queue.length > 0) {
      result.set(clientId, [...queue]);
      queue.length = 0;
    }
  }
  return result;
}

// ── World Commands ───────────────────────────────────────────────

function handleWorldCommand(
  state: BridgeServerState,
  request: WorldCommandRequest,
): WorldCommandResponse {
  const startMs = state.clock.nowMicroseconds() / 1_000;

  state.log.info(
    { commandType: request.commandType, worldId: request.worldId },
    'Processing world command',
  );

  switch (request.commandType) {
    case 'preload':
      for (const clientId of state.clients.keys()) {
        enqueueServerMessage(state, clientId, {
          type: 'world-preload',
          sequenceNumber: 0,
          timestamp: state.clock.nowMicroseconds(),
          payload: new TextEncoder().encode(
            JSON.stringify({
              worldId: request.worldId,
              assets: request.assetManifest ?? [],
            }),
          ),
        });
      }
      break;
    case 'unload':
      for (const clientId of state.clients.keys()) {
        enqueueServerMessage(state, clientId, {
          type: 'world-unload',
          sequenceNumber: 0,
          timestamp: state.clock.nowMicroseconds(),
          payload: new TextEncoder().encode(
            JSON.stringify({ worldId: request.worldId }),
          ),
        });
      }
      break;
    case 'transition':
      break;
  }

  const endMs = state.clock.nowMicroseconds() / 1_000;
  return {
    success: true,
    commandType: request.commandType,
    worldId: request.worldId,
    loadTimeMs: endMs - startMs,
  };
}

// ── Health Check ─────────────────────────────────────────────────

function handleHealthCheck(state: BridgeServerState): BridgeHealthStatus {
  const nowMs = state.clock.nowMicroseconds() / 1_000;
  let totalRtt = 0;
  let clientCount = 0;
  for (const client of state.clients.values()) {
    totalRtt += client.roundTripMs;
    clientCount += 1;
  }

  return {
    healthy: true,
    connectedClients: state.clients.size,
    activeStreams: state.clientWriteQueues.size,
    uptimeMs: nowMs - state.startedAtMs,
    totalMessagesIn: state.totalMessagesIn,
    totalMessagesOut: state.totalMessagesOut,
    avgRoundTripMs: clientCount > 0 ? totalRtt / clientCount : 0,
  };
}

// ── Disconnect ───────────────────────────────────────────────────

function disconnectClient(state: BridgeServerState, clientId: string): boolean {
  const existed = state.clients.has(clientId);
  state.clients.delete(clientId);
  state.clientWriteQueues.delete(clientId);
  if (existed) {
    state.log.info({ clientId }, 'Client disconnected');
    state.disconnectHandler?.onDisconnect(clientId);
  }
  return existed;
}

// ── Stale Client Sweep ───────────────────────────────────────────

const STALE_CLIENT_TIMEOUT_MS = 60_000;

function sweepStaleClients(state: BridgeServerState): ReadonlyArray<string> {
  const nowMs = state.clock.nowMicroseconds() / 1_000;
  const stale: string[] = [];
  for (const [clientId, client] of state.clients) {
    if (nowMs - client.lastHeartbeatMs > STALE_CLIENT_TIMEOUT_MS) {
      stale.push(clientId);
    }
  }
  for (const clientId of stale) {
    disconnectClient(state, clientId);
  }
  return stale;
}

// ── Public Interface ─────────────────────────────────────────────

export interface BridgeGrpcServer {
  readonly negotiate: (manifest: CapabilityManifest) => {
    readonly accepted: boolean;
    readonly serverVersion: string;
    readonly assignedClientId: string;
  };
  readonly processMessage: (clientId: string, message: ClientStreamMessage) => void;
  readonly worldCommand: (request: WorldCommandRequest) => WorldCommandResponse;
  readonly healthCheck: () => BridgeHealthStatus;
  readonly disconnect: (clientId: string) => boolean;
  readonly tick: () => void;
  readonly flush: () => ReadonlyMap<string, ReadonlyArray<ServerStreamMessage>>;
  readonly sweepStale: () => ReadonlyArray<string>;
  readonly getConnectedClients: () => ReadonlyArray<ConnectedClient>;
  readonly registerInputHandler: (handler: BridgeInputHandler) => void;
  readonly registerPhysicsHandler: (handler: BridgePhysicsHandler) => void;
  readonly registerWorldStateProvider: (provider: BridgeWorldStateProvider) => void;
  readonly registerNegotiateHandler: (handler: BridgeNegotiateHandler) => void;
  readonly registerDisconnectHandler: (handler: BridgeDisconnectHandler) => void;
}

export interface BridgeGrpcServerDeps {
  readonly clock: BridgeGrpcClockPort;
  readonly id: BridgeGrpcIdPort;
  readonly log: BridgeGrpcLogPort;
  readonly config?: Partial<BridgeGrpcConfig>;
}

// ── Factory ──────────────────────────────────────────────────────

function createBridgeGrpcServer(deps: BridgeGrpcServerDeps): BridgeGrpcServer {
  const config: BridgeGrpcConfig = { ...DEFAULT_BRIDGE_CONFIG, ...deps.config };
  const state: BridgeServerState = {
    config,
    clock: deps.clock,
    id: deps.id,
    log: deps.log,
    clients: new Map(),
    clientWriteQueues: new Map(),
    totalMessagesIn: 0,
    totalMessagesOut: 0,
    startedAtMs: deps.clock.nowMicroseconds() / 1_000,
    inputHandler: null,
    physicsHandler: null,
    worldStateProvider: null,
    negotiateHandler: null,
    disconnectHandler: null,
  };

  return {
    negotiate: (manifest) => handleNegotiate(state, manifest),
    processMessage: (clientId, msg) => processClientMessage(state, clientId, msg),
    worldCommand: (req) => handleWorldCommand(state, req),
    healthCheck: () => handleHealthCheck(state),
    disconnect: (id) => disconnectClient(state, id),
    tick: () => tickBroadcastWorldState(state),
    flush: () => flushClientQueues(state),
    sweepStale: () => sweepStaleClients(state),
    getConnectedClients: () => [...state.clients.values()],
    registerInputHandler: (handler) => {
      (state as { inputHandler: BridgeInputHandler | null }).inputHandler = handler;
    },
    registerPhysicsHandler: (handler) => {
      (state as { physicsHandler: BridgePhysicsHandler | null }).physicsHandler = handler;
    },
    registerWorldStateProvider: (provider) => {
      (state as { worldStateProvider: BridgeWorldStateProvider | null }).worldStateProvider =
        provider;
    },
    registerNegotiateHandler: (handler) => {
      (state as { negotiateHandler: BridgeNegotiateHandler | null }).negotiateHandler = handler;
    },
    registerDisconnectHandler: (handler) => {
      (state as { disconnectHandler: BridgeDisconnectHandler | null }).disconnectHandler = handler;
    },
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createBridgeGrpcServer, DEFAULT_BRIDGE_CONFIG, STALE_CLIENT_TIMEOUT_MS };
