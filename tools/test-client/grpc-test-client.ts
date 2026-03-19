#!/usr/bin/env npx tsx
/**
 * grpc-test-client.ts -- CLI gRPC test client for The Loom Bridge protocol.
 *
 * Connects to the gRPC BridgeLoom service and exercises:
 *   1. Negotiate RPC (capability handshake)
 *   2. GameStream (bidirectional streaming)
 *   3. HealthCheck RPC
 *   4. WorldCommand RPC
 *
 * Usage:
 *   npx tsx tools/test-client/grpc-test-client.ts [--host localhost] [--port 50051] [--duration 30]
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// -- ANSI color helpers ------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

function colorize(color: string, text: string): string {
  return color + text + RESET;
}

function logInfo(label: string, message: string): void {
  const timestamp = new Date().toISOString();
  process.stdout.write(
    colorize(DIM, '[' + timestamp + '] ') +
      colorize(CYAN + BOLD, '[' + label + '] ') +
      message +
      '\n',
  );
}

function logSuccess(label: string, message: string): void {
  const timestamp = new Date().toISOString();
  process.stdout.write(
    colorize(DIM, '[' + timestamp + '] ') +
      colorize(GREEN + BOLD, '[' + label + '] ') +
      message +
      '\n',
  );
}

function logWarn(label: string, message: string): void {
  const timestamp = new Date().toISOString();
  process.stdout.write(
    colorize(DIM, '[' + timestamp + '] ') +
      colorize(YELLOW + BOLD, '[' + label + '] ') +
      message +
      '\n',
  );
}

function logError(label: string, message: string): void {
  const timestamp = new Date().toISOString();
  process.stdout.write(
    colorize(DIM, '[' + timestamp + '] ') +
      colorize(RED + BOLD, '[' + label + '] ') +
      message +
      '\n',
  );
}

// -- Arg parsing -------------------------------------------------------

interface ClientArgs {
  readonly host: string;
  readonly port: number;
  readonly duration: number;
  readonly fabricId: string;
}

function parseArgs(argv: ReadonlyArray<string>): ClientArgs {
  const args = argv.slice(2);
  let host = 'localhost';
  let port = 50051;
  let duration = 30;
  let fabricId = 'test-fabric-1';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--host' && next !== undefined) {
      host = next;
      i += 1;
    } else if (arg === '--port' && next !== undefined) {
      port = parseInt(next, 10);
      i += 1;
    } else if (arg === '--duration' && next !== undefined) {
      duration = parseInt(next, 10);
      i += 1;
    } else if (arg === '--fabric-id' && next !== undefined) {
      fabricId = next;
      i += 1;
    }
  }

  return { host, port, duration, fabricId };
}

// -- Proto response types (match loom-bridge.proto) --------------------

interface NegotiateResponse {
  readonly accepted: boolean;
  readonly assigned_update_rate_hz: number;
  readonly max_entities_budget: number;
  readonly session_id: string;
  readonly preload_worlds: ReadonlyArray<string>;
}

interface HealthCheckResponse {
  readonly request_id: string;
  readonly healthy: boolean;
  readonly current_fps: number;
  readonly frame_time_ms: number;
  readonly visible_entities: number;
  readonly memory_usage_mb: number;
  readonly gpu_usage_percent: number;
  readonly loaded_chunks: number;
  readonly active_metahumans: number;
}

interface WorldCommandResponse {
  readonly success: boolean;
  readonly error_message: string;
  readonly estimated_load_time_sec: number;
}

interface ProtoServerMessage {
  readonly entity_snapshot?: Uint8Array;
  readonly entity_spawn?: Uint8Array;
  readonly entity_despawn?: Uint8Array;
  readonly time_of_day?: Uint8Array;
  readonly weather?: Uint8Array;
  readonly chunk_load?: Uint8Array;
  readonly chunk_unload?: Uint8Array;
  readonly facial_pose?: Uint8Array;
  readonly sequence: number;
  readonly timestamp_us: number | string;
  readonly correlation_id: string;
  readonly payload: string;
}

// -- gRPC client types -------------------------------------------------

interface GrpcCallback<T> {
  (err: grpc.ServiceError | null, response?: T): void;
}

interface NegotiateRequest {
  fabric_id: string;
  fabric_name: string;
  max_resolution_width: number;
  max_resolution_height: number;
  max_refresh_rate: number;
  rendering_tier: string;
  features: Record<string, boolean>;
  max_visible_entities: number;
  supports_weave_zone: boolean;
  supports_pixel_streaming: boolean;
  preferred_update_rate_hz: number;
}

interface BridgeLoomClient {
  Negotiate(
    request: NegotiateRequest,
    callback: GrpcCallback<NegotiateResponse>,
  ): void;
  HealthCheck(
    request: { request_id: string },
    callback: GrpcCallback<HealthCheckResponse>,
  ): void;
  WorldCommand(
    request: { command_type: string; world_id: string; assets: ReadonlyArray<unknown>; priority: number },
    callback: GrpcCallback<WorldCommandResponse>,
  ): void;
  GameStream(): grpc.ClientDuplexStream<Record<string, unknown>, ProtoServerMessage>;
}

// -- Server message formatting -----------------------------------------

function formatServerStreamMessage(msg: ProtoServerMessage): string {
  const seq = String(msg.sequence ?? 0);
  const payloadField = msg.payload || 'unknown';

  if (msg.entity_snapshot) {
    const decoded = tryDecodePayload(msg.entity_snapshot);
    return colorize(BLUE, 'ENTITY_SNAPSHOT') + ' seq=' + seq + ' ' + decoded;
  }
  if (msg.entity_spawn) {
    const decoded = tryDecodePayload(msg.entity_spawn);
    return colorize(MAGENTA, 'ENTITY_SPAWN') + ' seq=' + seq + ' ' + decoded;
  }
  if (msg.entity_despawn) {
    const decoded = tryDecodePayload(msg.entity_despawn);
    return colorize(YELLOW, 'ENTITY_DESPAWN') + ' seq=' + seq + ' ' + decoded;
  }
  if (msg.time_of_day) {
    const decoded = tryDecodePayload(msg.time_of_day);
    return colorize(CYAN, 'TIME_OF_DAY') + ' seq=' + seq + ' ' + decoded;
  }
  if (msg.chunk_load) {
    const decoded = tryDecodePayload(msg.chunk_load);
    return colorize(GREEN, 'CHUNK_LOAD') + ' seq=' + seq + ' ' + decoded;
  }
  if (msg.chunk_unload) {
    const decoded = tryDecodePayload(msg.chunk_unload);
    return colorize(RED, 'CHUNK_UNLOAD') + ' seq=' + seq + ' ' + decoded;
  }
  if (msg.facial_pose) {
    return colorize(DIM, 'FACIAL_POSE') + ' seq=' + seq + ' (binary)';
  }

  return colorize(DIM, 'STREAM [' + payloadField + ']') + ' seq=' + seq;
}

function tryDecodePayload(data: Uint8Array | undefined): string {
  if (!data || data.length === 0) return '(empty)';
  try {
    const text = new TextDecoder().decode(data);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return JSON.stringify(parsed);
  } catch {
    return '(' + String(data.length) + ' bytes binary)';
  }
}

// -- Proto loading -----------------------------------------------------

async function loadProto(): Promise<Record<string, unknown>> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const protoPath = path.resolve(
    currentDir,
    '../../contracts/protocols/src/loom-bridge.proto',
  );

  const packageDefinition = await protoLoader.load(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  return grpc.loadPackageDefinition(packageDefinition) as Record<string, unknown>;
}

// -- RPC helpers -------------------------------------------------------

function callNegotiate(
  client: BridgeLoomClient,
  fabricId: string,
): Promise<NegotiateResponse> {
  return new Promise((resolve, reject) => {
    const request: NegotiateRequest = {
      fabric_id: fabricId,
      fabric_name: 'Test Client (Node.js)',
      max_resolution_width: 1920,
      max_resolution_height: 1080,
      max_refresh_rate: 60,
      rendering_tier: 'performance',
      features: {
        nanite_geometry: false,
        hardware_ray_tracing: false,
        software_ray_tracing: false,
        global_illumination: false,
        virtual_shadow_maps: false,
        volumetric_clouds: false,
        hair_simulation: false,
        cloth_simulation: false,
        facial_animation: false,
        procedural_generation: false,
        metasound_audio: false,
        mass_entity: false,
        chaos_physics: false,
      },
      max_visible_entities: 1000,
      supports_weave_zone: false,
      supports_pixel_streaming: false,
      preferred_update_rate_hz: 30,
    };

    logInfo('RPC', 'Calling Negotiate with fabricId=' + fabricId);

    client.Negotiate(request, (err: grpc.ServiceError | null, response?: NegotiateResponse) => {
      if (err) {
        reject(err);
        return;
      }
      if (response === undefined) {
        reject(new Error('No response from Negotiate'));
        return;
      }
      resolve(response);
    });
  });
}

function callHealthCheck(client: BridgeLoomClient): Promise<HealthCheckResponse> {
  return new Promise((resolve, reject) => {
    const requestId = 'health-' + String(Date.now());
    logInfo('RPC', 'Calling HealthCheck requestId=' + requestId);

    client.HealthCheck(
      { request_id: requestId },
      (err: grpc.ServiceError | null, response?: HealthCheckResponse) => {
        if (err) {
          reject(err);
          return;
        }
        if (response === undefined) {
          reject(new Error('No response from HealthCheck'));
          return;
        }
        resolve(response);
      },
    );
  });
}

function callWorldCommand(
  client: BridgeLoomClient,
  worldId: string,
): Promise<WorldCommandResponse> {
  return new Promise((resolve, reject) => {
    logInfo('RPC', 'Calling WorldCommand preload world=' + worldId);

    client.WorldCommand(
      {
        command_type: 'preload',
        world_id: worldId,
        assets: [],
        priority: 1.0,
      },
      (err: grpc.ServiceError | null, response?: WorldCommandResponse) => {
        if (err) {
          reject(err);
          return;
        }
        if (response === undefined) {
          reject(new Error('No response from WorldCommand'));
          return;
        }
        resolve(response);
      },
    );
  });
}

// -- GameStream --------------------------------------------------------

interface StreamState {
  messagesReceived: number;
  messagesSent: number;
  sequenceCounter: number;
  active: boolean;
}

function startGameStream(
  client: BridgeLoomClient,
  streamState: StreamState,
  duration: number,
): grpc.ClientDuplexStream<Record<string, unknown>, ProtoServerMessage> {
  logInfo('STREAM', 'Opening GameStream (bidirectional)');

  const stream = client.GameStream();

  stream.on('data', (msg: ProtoServerMessage) => {
    streamState.messagesReceived += 1;
    logSuccess('STREAM', formatServerStreamMessage(msg));
  });

  stream.on('error', (err: Error) => {
    // gRPC CANCELLED is expected on shutdown
    if (err.message.includes('CANCELLED')) {
      logInfo('STREAM', 'GameStream cancelled (expected on shutdown)');
    } else {
      logError('STREAM', 'GameStream error: ' + err.message);
    }
    streamState.active = false;
  });

  stream.on('end', () => {
    logWarn('STREAM', 'GameStream ended by server');
    streamState.active = false;
  });

  // Send initial heartbeat to associate with the negotiated client
  sendHeartbeat(stream, streamState);

  // Send player input every 500ms
  const inputInterval = setInterval(() => {
    if (!streamState.active) {
      clearInterval(inputInterval);
      return;
    }
    sendPlayerInput(stream, streamState);
  }, 500);

  // Send heartbeats every 5 seconds
  const heartbeatInterval = setInterval(() => {
    if (!streamState.active) {
      clearInterval(heartbeatInterval);
      return;
    }
    sendHeartbeat(stream, streamState);
  }, 5000);

  // Shutdown after duration
  const shutdownTimer = setTimeout(() => {
    clearInterval(inputInterval);
    clearInterval(heartbeatInterval);
    streamState.active = false;

    logInfo(
      'STATS',
      'Stream messages sent: ' +
        String(streamState.messagesSent) +
        ' | received: ' +
        String(streamState.messagesReceived),
    );

    logInfo('STREAM', 'Ending GameStream');
    stream.end();
  }, duration * 1000);

  // Handle Ctrl+C
  function onSignal(): void {
    clearInterval(inputInterval);
    clearInterval(heartbeatInterval);
    clearTimeout(shutdownTimer);
    streamState.active = false;

    logInfo(
      'STATS',
      'Stream messages sent: ' +
        String(streamState.messagesSent) +
        ' | received: ' +
        String(streamState.messagesReceived),
    );

    logInfo('EXIT', 'User interrupt, ending stream');
    stream.end();

    setTimeout(() => {
      process.exit(0);
    }, 500);
  }

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  streamState.active = true;

  return stream;
}

function sendHeartbeat(
  stream: grpc.ClientDuplexStream<Record<string, unknown>, ProtoServerMessage>,
  state: StreamState,
): void {
  state.sequenceCounter += 1;
  const msg: Record<string, unknown> = {
    sequence: state.sequenceCounter,
    timestamp_us: Date.now() * 1000,
  };
  stream.write(msg);
  state.messagesSent += 1;
  logInfo('SEND', 'Heartbeat seq=' + String(state.sequenceCounter));
}

function sendPlayerInput(
  stream: grpc.ClientDuplexStream<Record<string, unknown>, ProtoServerMessage>,
  state: StreamState,
): void {
  state.sequenceCounter += 1;

  // Simulate WASD movement as a simple binary payload
  const directions = ['forward', 'left', 'backward', 'right'];
  const dir = directions[Math.floor(Math.random() * directions.length)];
  const inputPayload = new TextEncoder().encode(
    JSON.stringify({ direction: dir, speed: 1.0 }),
  );

  const msg: Record<string, unknown> = {
    player_input: inputPayload,
    sequence: state.sequenceCounter,
    timestamp_us: Date.now() * 1000,
  };

  stream.write(msg);
  state.messagesSent += 1;
  logInfo('SEND', 'PlayerInput dir=' + dir + ' seq=' + String(state.sequenceCounter));
}

// -- Main --------------------------------------------------------------

async function main(): Promise<void> {
  const config = parseArgs(process.argv);
  const address = config.host + ':' + String(config.port);

  process.stdout.write('\n');
  process.stdout.write(colorize(BOLD + CYAN, '  The Loom -- gRPC Test Client') + '\n');
  process.stdout.write(colorize(DIM, '  ==============================') + '\n');
  process.stdout.write('\n');

  logInfo('INIT', 'Target: ' + address);
  logInfo('INIT', 'Fabric: ' + config.fabricId);
  logInfo('INIT', 'Duration: ' + String(config.duration) + 's');

  // Load proto and create client
  let protoDescriptor: Record<string, unknown>;
  try {
    protoDescriptor = await loadProto();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logError('INIT', 'Failed to load proto: ' + msg);
    process.exit(1);
    return;
  }

  const loomNamespace = protoDescriptor['loom'] as Record<string, unknown> | undefined;
  if (!loomNamespace) {
    logError('INIT', 'Could not find loom namespace in proto');
    process.exit(1);
    return;
  }

  const bridgeNamespace = loomNamespace['bridge'] as Record<string, unknown> | undefined;
  if (!bridgeNamespace) {
    logError('INIT', 'Could not find loom.bridge namespace in proto');
    process.exit(1);
    return;
  }

  const BridgeLoomConstructor = bridgeNamespace['BridgeLoom'] as {
    new (address: string, credentials: grpc.ChannelCredentials): BridgeLoomClient;
  } | undefined;

  if (!BridgeLoomConstructor) {
    logError('INIT', 'Could not find BridgeLoom service constructor');
    process.exit(1);
    return;
  }

  const client = new BridgeLoomConstructor(
    address,
    grpc.credentials.createInsecure(),
  );

  logSuccess('CONN', 'gRPC client created for ' + address);

  // Step 1: Negotiate
  try {
    const negotiateResult = await callNegotiate(client, config.fabricId);
    if (negotiateResult.accepted) {
      logSuccess(
        'RPC',
        'Negotiate accepted! sessionId=' +
          negotiateResult.session_id +
          ' updateRate=' +
          String(negotiateResult.assigned_update_rate_hz) +
          'Hz maxEntities=' +
          String(negotiateResult.max_entities_budget),
      );
    } else {
      logError('RPC', 'Negotiate rejected by server');
      process.exit(1);
      return;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logError('RPC', 'Negotiate failed: ' + msg);
    process.exit(1);
    return;
  }

  // Step 2: HealthCheck
  try {
    const health = await callHealthCheck(client);
    logSuccess(
      'RPC',
      'HealthCheck: healthy=' +
        String(health.healthy) +
        ' clients=' +
        String(health.visible_entities) +
        ' fps=' +
        String(health.current_fps),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn('RPC', 'HealthCheck failed (non-fatal): ' + msg);
  }

  // Step 3: WorldCommand (preload)
  try {
    const worldResult = await callWorldCommand(client, 'alkahest');
    logSuccess(
      'RPC',
      'WorldCommand: success=' +
        String(worldResult.success) +
        ' loadTime=' +
        String(worldResult.estimated_load_time_sec) +
        's',
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logWarn('RPC', 'WorldCommand failed (non-fatal): ' + msg);
  }

  // Step 4: GameStream (bidirectional)
  const streamState: StreamState = {
    messagesReceived: 0,
    messagesSent: 0,
    sequenceCounter: 0,
    active: false,
  };

  startGameStream(client, streamState, config.duration);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  logError('FATAL', msg);
  process.exit(1);
});
