/**
 * Fastify WebSocket Transport — Production TransportPort implementation.
 *
 * Bridges the abstract TransportPort interface to real WebSocket
 * connections over Fastify + @fastify/websocket.
 *
 * Thread: bridge/selvage/fastify-transport
 * Tier: 0
 */

import type {
  TransportPort,
  ConnectionHandler,
  TransportHandlers,
} from './network-server.js';

// Minimal Fastify app interface exposed to route registrars
export interface FastifyAppLike {
  get(path: string, handler: (req: unknown, reply: unknown) => Promise<unknown> | unknown): void;
  post(path: string, handler: (req: unknown, reply: unknown) => Promise<unknown> | unknown): void;
  delete(path: string, handler: (req: unknown, reply: unknown) => Promise<unknown> | unknown): void;
}

export type RouteRegistrar = (app: FastifyAppLike) => void | Promise<void>;

interface FastifyTransportConfig {
  readonly host: string;
  readonly port: number;
  readonly routeRegistrars?: readonly RouteRegistrar[];
}

interface FastifyTransportState {
  readonly config: FastifyTransportConfig;
  connectionHandler: ConnectionHandler | null;
  sockets: Map<string, WebSocketLike>;
  connectionCounter: number;
  server: FastifyLike | null;
}

// Minimal interface shapes to avoid direct dependency on Fastify types
// in this file — keeps it testable without full Fastify import at type level.
interface WebSocketLike {
  send(data: Uint8Array | string): void;
  close(code?: number, reason?: string): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  readyState: number;
}

interface FastifyLike {
  listen(opts: { host: string; port: number }): Promise<string>;
  close(): Promise<void>;
}

export function createFastifyTransport(
  config: FastifyTransportConfig,
): TransportPort & { boot(): Promise<string>; teardown(): Promise<void> } {
  const state: FastifyTransportState = {
    config,
    connectionHandler: null,
    sockets: new Map(),
    connectionCounter: 0,
    server: null,
  };

  return {
    onConnection: (handler) => {
      state.connectionHandler = handler;
    },
    send: (connectionId, data) => {
      const ws = state.sockets.get(connectionId);
      if (ws && ws.readyState === 1) {
        ws.send(data);
      }
    },
    close: (connectionId, reason) => {
      const ws = state.sockets.get(connectionId);
      if (ws) {
        ws.close(1000, reason);
        state.sockets.delete(connectionId);
      }
    },
    shutdown: () => {
      for (const [id, ws] of state.sockets) {
        ws.close(1001, 'Server shutting down');
        state.sockets.delete(id);
      }
    },
    boot: () => bootServer(state),
    teardown: () => teardownServer(state),
  };
}

async function bootServer(state: FastifyTransportState): Promise<string> {
  // Dynamic import keeps Fastify out of the module graph for tests
  const { default: Fastify } = await import('fastify');
  const fastifyWs = await import('@fastify/websocket');

  const app = Fastify();
  await app.register(fastifyWs.default);

  app.get('/ws', { websocket: true }, (socket) => {
    handleSocket(state, socket as unknown as WebSocketLike);
  });

  app.get('/health', async () => ({ status: 'ok' }));

  if (state.config.routeRegistrars) {
    for (const registrar of state.config.routeRegistrars) {
      await registrar(app as unknown as FastifyAppLike);
    }
  }

  const address = await app.listen({
    host: state.config.host,
    port: state.config.port,
  });

  state.server = app as unknown as FastifyLike;
  return address;
}

function handleSocket(state: FastifyTransportState, ws: WebSocketLike): void {
  state.connectionCounter += 1;
  const connectionId = 'ws-' + String(state.connectionCounter);
  state.sockets.set(connectionId, ws);

  const handlers: TransportHandlers = {
    onMessage: () => {},
    onClose: () => {},
    onError: () => {},
  };

  ws.on('message', (raw: unknown) => {
    const data =
      raw instanceof Uint8Array
        ? raw
        : new TextEncoder().encode(String(raw));
    handlers.onMessage(data);
  });

  ws.on('close', () => {
    state.sockets.delete(connectionId);
    handlers.onClose('connection closed');
  });

  ws.on('error', (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    handlers.onError(error);
  });

  if (state.connectionHandler) {
    state.connectionHandler(connectionId, handlers);
  }
}

async function teardownServer(state: FastifyTransportState): Promise<void> {
  if (state.server) {
    await state.server.close();
    state.server = null;
  }
}
