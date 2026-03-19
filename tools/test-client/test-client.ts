#!/usr/bin/env npx tsx
/**
 * test-client.ts -- CLI test client for The Loom.
 *
 * Connects to the game server via WebSocket and exercises
 * the full player loop: connect -> move -> interact -> disconnect.
 *
 * Usage:
 *   npx tsx tools/test-client/test-client.ts [--host localhost] [--port 8080] [--dynasty test-dynasty-1] [--world alkahest]
 */

// @ts-expect-error -- ws has no declaration file in this project
import WebSocket from 'ws';

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
  readonly dynasty: string;
  readonly world: string;
  readonly duration: number;
}

function parseArgs(argv: ReadonlyArray<string>): ClientArgs {
  const defaults: ClientArgs = {
    host: 'localhost',
    port: 8080,
    dynasty: 'test-dynasty-1',
    world: 'alkahest',
    duration: 30,
  };

  const args = argv.slice(2);
  let host = defaults.host;
  let port = defaults.port;
  let dynasty = defaults.dynasty;
  let world = defaults.world;
  let duration = defaults.duration;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--host' && next !== undefined) {
      host = next;
      i += 1;
    } else if (arg === '--port' && next !== undefined) {
      port = parseInt(next, 10);
      i += 1;
    } else if (arg === '--dynasty' && next !== undefined) {
      dynasty = next;
      i += 1;
    } else if (arg === '--world' && next !== undefined) {
      world = next;
      i += 1;
    } else if (arg === '--duration' && next !== undefined) {
      duration = parseInt(next, 10);
      i += 1;
    }
  }

  return { host, port, dynasty, world, duration };
}

// -- Protocol types (mirrors server-protocol.ts) -----------------------

interface ClientHello {
  readonly type: 'client-hello';
  readonly protocolVersion: number;
  readonly clientId: string;
  readonly platform: string;
  readonly renderingTier: string;
  readonly worldId: string;
}

interface InputAction {
  readonly actionType: string;
  readonly payload: Record<string, unknown>;
}

interface ClientInput {
  readonly type: 'client-input';
  readonly sequence: number;
  readonly timestamp: number;
  readonly actions: ReadonlyArray<InputAction>;
}

interface ServerWelcome {
  readonly type: 'server-welcome';
  readonly protocolVersion: number;
  readonly serverId: string;
  readonly tickRateHz: number;
  readonly playerEntityId: string;
  readonly worldId: string;
  readonly serverTimestamp: number;
}

interface EntityUpdate {
  readonly entityId: string;
  readonly entityType: string;
  readonly components: Record<string, unknown>;
}

interface ServerSnapshot {
  readonly type: 'server-snapshot';
  readonly tick: number;
  readonly timestamp: number;
  readonly lastAckedInput: number;
  readonly entities: ReadonlyArray<EntityUpdate>;
}

interface EntitySpawnMessage {
  readonly type: 'entity-spawn';
  readonly entityId: string;
  readonly entityType: string;
  readonly worldId: string;
  readonly components: Record<string, unknown>;
}

interface EntityDespawnMessage {
  readonly type: 'entity-despawn';
  readonly entityId: string;
  readonly reason: string;
}

interface SystemMessage {
  readonly type: 'system-message';
  readonly category: string;
  readonly content: string;
  readonly timestamp: number;
}

interface ServerDisconnect {
  readonly type: 'server-disconnect';
  readonly reason: string;
  readonly canReconnect: boolean;
}

type ServerMessage =
  | ServerWelcome
  | ServerSnapshot
  | EntitySpawnMessage
  | EntityDespawnMessage
  | SystemMessage
  | ServerDisconnect;

// -- Movement simulation -----------------------------------------------

interface MovementVector {
  readonly dx: number;
  readonly dy: number;
  readonly label: string;
}

const MOVEMENT_KEYS: ReadonlyArray<MovementVector> = [
  { dx: 0, dy: 1, label: 'W (forward)' },
  { dx: -1, dy: 0, label: 'A (left)' },
  { dx: 0, dy: -1, label: 'S (backward)' },
  { dx: 1, dy: 0, label: 'D (right)' },
];

function pickRandomMovement(): MovementVector {
  const idx = Math.floor(Math.random() * MOVEMENT_KEYS.length);
  const mv = MOVEMENT_KEYS[idx];
  if (mv === undefined) return { dx: 0, dy: 1, label: 'W (forward)' };
  return mv;
}

// -- Message formatting ------------------------------------------------

function formatServerMessage(msg: ServerMessage): string {
  switch (msg.type) {
    case 'server-welcome':
      return (
        colorize(GREEN, 'WELCOME') +
        ' serverId=' +
        msg.serverId +
        ' tickRate=' +
        String(msg.tickRateHz) +
        'Hz playerEntity=' +
        msg.playerEntityId +
        ' world=' +
        msg.worldId
      );

    case 'server-snapshot':
      return (
        colorize(BLUE, 'SNAPSHOT') +
        ' tick=' +
        String(msg.tick) +
        ' entities=' +
        String(msg.entities.length) +
        ' lastAcked=' +
        String(msg.lastAckedInput)
      );

    case 'entity-spawn':
      return (
        colorize(MAGENTA, 'SPAWN') +
        ' id=' +
        msg.entityId +
        ' type=' +
        msg.entityType +
        ' world=' +
        msg.worldId
      );

    case 'entity-despawn':
      return colorize(YELLOW, 'DESPAWN') + ' id=' + msg.entityId + ' reason=' + msg.reason;

    case 'system-message':
      return colorize(CYAN, 'SYSTEM [' + msg.category + ']') + ' ' + msg.content;

    case 'server-disconnect':
      return (
        colorize(RED, 'DISCONNECT') +
        ' reason=' +
        msg.reason +
        ' canReconnect=' +
        String(msg.canReconnect)
      );

    default:
      return colorize(DIM, 'UNKNOWN') + ' ' + JSON.stringify(msg);
  }
}

// -- Client state ------------------------------------------------------

interface ClientState {
  sequenceCounter: number;
  snapshotCount: number;
  totalEntities: number;
  connected: boolean;
  playerEntityId: string;
}

// -- Sending helpers ---------------------------------------------------

function sendJson(ws: WebSocket, payload: ClientHello | ClientInput): void {
  const json = JSON.stringify(payload);
  ws.send(json);
}

function sendHello(ws: WebSocket, config: ClientArgs): void {
  const hello: ClientHello = {
    type: 'client-hello',
    protocolVersion: 1,
    clientId: config.dynasty,
    platform: 'test-client-node',
    renderingTier: 'performance',
    worldId: config.world,
  };
  sendJson(ws, hello);
  logInfo('SEND', 'ClientHello dynasty=' + config.dynasty + ' world=' + config.world);
}

function sendMovement(ws: WebSocket, state: ClientState): void {
  const movement = pickRandomMovement();
  state.sequenceCounter += 1;

  const input: ClientInput = {
    type: 'client-input',
    sequence: state.sequenceCounter,
    timestamp: Date.now(),
    actions: [
      {
        actionType: 'move',
        payload: { dx: movement.dx, dy: movement.dy },
      },
    ],
  };

  sendJson(ws, input);
  logInfo('MOVE', movement.label + ' seq=' + String(state.sequenceCounter));
}

function sendInteract(ws: WebSocket, state: ClientState): void {
  state.sequenceCounter += 1;

  const input: ClientInput = {
    type: 'client-input',
    sequence: state.sequenceCounter,
    timestamp: Date.now(),
    actions: [
      {
        actionType: 'interact',
        payload: { target: 'nearest-npc' },
      },
    ],
  };

  sendJson(ws, input);
  logInfo('INTERACT', 'Talk to nearest NPC seq=' + String(state.sequenceCounter));
}

// -- Message handler ---------------------------------------------------

function handleServerMessage(raw: WebSocket.Data, state: ClientState): void {
  let text: string;
  if (typeof raw === 'string') {
    text = raw;
  } else if (raw instanceof Buffer) {
    text = raw.toString('utf-8');
  } else if (raw instanceof ArrayBuffer) {
    text = new TextDecoder().decode(raw);
  } else {
    logWarn('RECV', 'Received non-text message, skipping');
    return;
  }

  let parsed: ServerMessage;
  try {
    parsed = JSON.parse(text) as ServerMessage;
  } catch {
    logWarn('RECV', 'Failed to parse JSON: ' + text.slice(0, 120));
    return;
  }

  logSuccess('RECV', formatServerMessage(parsed));

  if (parsed.type === 'server-welcome') {
    state.connected = true;
    state.playerEntityId = parsed.playerEntityId;
  }

  if (parsed.type === 'server-snapshot') {
    state.snapshotCount += 1;
    state.totalEntities = parsed.entities.length;
  }

  if (parsed.type === 'server-disconnect') {
    state.connected = false;
  }
}

// -- Main loop ---------------------------------------------------------

function runClient(config: ClientArgs): void {
  const url = 'ws://' + config.host + ':' + String(config.port) + '/ws';
  logInfo('INIT', 'Connecting to ' + url);
  logInfo('INIT', 'Dynasty: ' + config.dynasty + ' | World: ' + config.world);
  logInfo('INIT', 'Duration: ' + String(config.duration) + 's (Ctrl+C to stop early)');

  const state: ClientState = {
    sequenceCounter: 0,
    snapshotCount: 0,
    totalEntities: 0,
    connected: false,
    playerEntityId: '',
  };

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logError('CONN', 'Failed to create WebSocket: ' + msg);
    process.exit(1);
    return;
  }

  // Timers to clean up on exit
  let moveInterval: ReturnType<typeof setInterval> | null = null;
  let interactTimeout: ReturnType<typeof setTimeout> | null = null;
  let shutdownTimeout: ReturnType<typeof setTimeout> | null = null;

  function cleanup(reason: string): void {
    if (moveInterval !== null) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    if (interactTimeout !== null) {
      clearTimeout(interactTimeout);
      interactTimeout = null;
    }
    if (shutdownTimeout !== null) {
      clearTimeout(shutdownTimeout);
      shutdownTimeout = null;
    }

    logInfo(
      'STATS',
      'Snapshots received: ' +
        String(state.snapshotCount) +
        ' | Last entity count: ' +
        String(state.totalEntities) +
        ' | Inputs sent: ' +
        String(state.sequenceCounter),
    );

    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      logInfo('EXIT', 'Closing connection: ' + reason);
      ws.close(1000, reason);
    } else {
      logInfo('EXIT', 'Connection already closed: ' + reason);
    }
  }

  ws.on('open', () => {
    logSuccess('CONN', 'WebSocket connected to ' + url);
    sendHello(ws, config);

    // Send movement inputs every 500ms
    moveInterval = setInterval(() => {
      if (state.connected) {
        sendMovement(ws, state);
      }
    }, 500);

    // Send an interact action after 3 seconds, then every 5 seconds
    interactTimeout = setTimeout(() => {
      if (state.connected) {
        sendInteract(ws, state);
      }
      interactTimeout = setInterval(() => {
        if (state.connected) {
          sendInteract(ws, state);
        }
      }, 5000) as unknown as ReturnType<typeof setTimeout>;
    }, 3000);

    // Graceful shutdown after configured duration
    shutdownTimeout = setTimeout(() => {
      cleanup('Duration elapsed (' + String(config.duration) + 's)');
    }, config.duration * 1000);
  });

  ws.on('message', (data: WebSocket.Data) => {
    handleServerMessage(data, state);
  });

  ws.on('error', (err: Error) => {
    logError('CONN', 'WebSocket error: ' + err.message);
  });

  ws.on('close', (code: number, reason: Buffer) => {
    const reasonStr = reason.toString('utf-8');
    logWarn(
      'CONN',
      'WebSocket closed code=' + String(code) + ' reason=' + (reasonStr || '(none)'),
    );
    state.connected = false;
    cleanup('Server closed connection');
  });

  // Handle Ctrl+C
  function onSignal(): void {
    cleanup('User interrupt (Ctrl+C)');
    // Give the close frame time to send
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

// -- Entry point -------------------------------------------------------

const config = parseArgs(process.argv);

process.stdout.write('\n');
process.stdout.write(colorize(BOLD + CYAN, '  The Loom -- WebSocket Test Client') + '\n');
process.stdout.write(colorize(DIM, '  ===================================') + '\n');
process.stdout.write('\n');

runClient(config);
