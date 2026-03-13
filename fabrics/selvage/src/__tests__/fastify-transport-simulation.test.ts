import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFastifyTransport } from '../fastify-transport.js';
import type { TransportHandlers } from '../network-server.js';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

interface MockSocket {
  readonly readyState: number;
  readonly sent: Array<Uint8Array | string>;
  readonly closes: Array<{ code: number | undefined; reason: string | undefined }>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  send(data: Uint8Array | string): void;
  close(code?: number, reason?: string): void;
  trigger(event: string, ...args: unknown[]): void;
}

function createSocket(readyState: number = 1): MockSocket {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const sent: Array<Uint8Array | string> = [];
  const closes: Array<{ code: number | undefined; reason: string | undefined }> = [];

  return {
    readyState,
    sent,
    closes,
    on: (event, handler) => {
      listeners.set(event, handler);
    },
    send: (data) => {
      sent.push(data);
    },
    close: (code, reason) => {
      closes.push({ code, reason });
    },
    trigger: (event, ...args) => {
      const listener = listeners.get(event);
      if (listener) listener(...args);
    },
  };
}

describe('Fastify Transport Simulation', () => {
  it('routes socket message/close/error through registered connection handlers', async () => {
    let wsHandler: ((socket: unknown) => void) | undefined;
    const listen = vi.fn(async () => 'http://127.0.0.1:3000');
    const close = vi.fn(async () => undefined);

    const app = {
      register: vi.fn(async () => undefined),
      get: vi.fn((path: string, optsOrHandler: unknown, maybeHandler?: unknown) => {
        if (path === '/ws') {
          const handler = maybeHandler as (socket: unknown) => void;
          wsHandler = handler;
        }
      }),
      listen,
      close,
    };

    vi.doMock('fastify', () => ({
      default: vi.fn(() => app),
    }));

    vi.doMock('@fastify/websocket', () => ({
      default: Symbol('ws-plugin'),
    }));

    const transport = createFastifyTransport({ host: '127.0.0.1', port: 3000 });

    let handlersRef: TransportHandlers | undefined;
    transport.onConnection((_connectionId, handlers) => {
      handlersRef = handlers;
    });

    const address = await transport.boot();
    expect(address).toBe('http://127.0.0.1:3000');
    expect(listen).toHaveBeenCalledTimes(1);
    expect(typeof wsHandler).toBe('function');

    const socket = createSocket();
    wsHandler?.(socket);

    socket.trigger('message', 'hello');
    expect(handlersRef).toBeDefined();

    const captured: Uint8Array[] = [];
    handlersRef!.onMessage = (data) => {
      captured.push(data);
    };

    socket.trigger('message', 'payload');
    expect(new TextDecoder().decode(captured[0])).toBe('payload');

    let closedReason = '';
    handlersRef!.onClose = (reason) => {
      closedReason = reason;
    };
    socket.trigger('close');
    expect(closedReason).toBe('connection closed');

    let errorMessage = '';
    handlersRef!.onError = (error) => {
      errorMessage = error.message;
    };
    socket.trigger('error', new Error('boom'));
    expect(errorMessage).toBe('boom');

    await transport.teardown();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('send only writes to open sockets and close removes them', async () => {
    let wsHandler: ((socket: unknown) => void) | undefined;

    const app = {
      register: vi.fn(async () => undefined),
      get: vi.fn((path: string, _optsOrHandler: unknown, maybeHandler?: unknown) => {
        if (path === '/ws') {
          wsHandler = maybeHandler as (socket: unknown) => void;
        }
      }),
      listen: vi.fn(async () => 'http://localhost:4444'),
      close: vi.fn(async () => undefined),
    };

    vi.doMock('fastify', () => ({
      default: vi.fn(() => app),
    }));

    vi.doMock('@fastify/websocket', () => ({
      default: Symbol('ws-plugin'),
    }));

    const transport = createFastifyTransport({ host: 'localhost', port: 4444 });
    transport.onConnection(() => {});
    await transport.boot();

    const openSocket = createSocket(1);
    const closedSocket = createSocket(3);
    wsHandler?.(openSocket);
    wsHandler?.(closedSocket);

    const payload = new TextEncoder().encode('alpha');

    transport.send('ws-1', payload);
    transport.send('ws-2', payload);

    expect(openSocket.sent).toHaveLength(1);
    expect(closedSocket.sent).toHaveLength(0);

    transport.close('ws-1', 'done');
    expect(openSocket.closes[0]).toEqual({ code: 1000, reason: 'done' });
  });

  it('shutdown closes all active sockets with server-shutdown semantics', async () => {
    let wsHandler: ((socket: unknown) => void) | undefined;

    const app = {
      register: vi.fn(async () => undefined),
      get: vi.fn((path: string, _optsOrHandler: unknown, maybeHandler?: unknown) => {
        if (path === '/ws') {
          wsHandler = maybeHandler as (socket: unknown) => void;
        }
      }),
      listen: vi.fn(async () => 'http://localhost:4545'),
      close: vi.fn(async () => undefined),
    };

    vi.doMock('fastify', () => ({
      default: vi.fn(() => app),
    }));

    vi.doMock('@fastify/websocket', () => ({
      default: Symbol('ws-plugin'),
    }));

    const transport = createFastifyTransport({ host: 'localhost', port: 4545 });
    transport.onConnection(() => {});
    await transport.boot();

    const s1 = createSocket();
    const s2 = createSocket();
    wsHandler?.(s1);
    wsHandler?.(s2);

    transport.shutdown();

    expect(s1.closes[0]).toEqual({ code: 1001, reason: 'Server shutting down' });
    expect(s2.closes[0]).toEqual({ code: 1001, reason: 'Server shutting down' });
  });
});
