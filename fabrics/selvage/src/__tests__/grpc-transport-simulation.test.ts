import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildJsonServiceDefinition,
  createGrpcTransport,
  registerGrpcHandler,
  type GrpcMethodDefinition,
} from '../grpc-transport.js';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('gRPC Transport Simulation', () => {
  it('builds JSON service definition with unary methods', () => {
    const service = buildJsonServiceDefinition('EchoService', ['Ping', 'Pong']);

    expect(service.name).toBe('EchoService');
    expect(service.methods).toHaveLength(2);
    expect(service.methods.map((m) => m.name)).toEqual(['Ping', 'Pong']);
    expect(service.methods.every((m) => m.streaming === 'unary')).toBe(true);
  });

  it('serializes and deserializes JSON method payloads consistently', () => {
    const service = buildJsonServiceDefinition('CodecService', ['RoundTrip']);
    const method = service.methods[0] as GrpcMethodDefinition;

    const payload = { value: 'alpha', count: 2 };
    const encoded = method.requestSerialize(payload);
    const decoded = method.requestDeserialize(encoded) as { value: string; count: number };

    expect(decoded.value).toBe('alpha');
    expect(decoded.count).toBe(2);
  });

  it('creates server transport and binds services with mocked grpc runtime', async () => {
    const addService = vi.fn();
    const bindAsync = vi.fn(
      (
        _address: string,
        _credentials: unknown,
        callback: (err: Error | null, port: number) => void,
      ) => callback(null, 7788),
    );
    const forceShutdown = vi.fn();

    const makeUnaryRequest = vi.fn(
      (
        _path: string,
        _requestSerialize: (value: unknown) => Buffer,
        _responseDeserialize: (bytes: Buffer) => unknown,
        _request: unknown,
        callback: (err: Error | null, response?: unknown) => void,
      ) => callback(null, { ok: true }),
    );
    const close = vi.fn();

    vi.doMock('@grpc/grpc-js', () => {
      class Server {
        addService = addService;
        bindAsync = bindAsync;
        forceShutdown = forceShutdown;
      }

      class Client {
        makeUnaryRequest = makeUnaryRequest;
        close = close;
      }

      return {
        Server,
        ServerCredentials: {
          createInsecure: vi.fn(() => ({ insecure: true })),
        },
        credentials: {
          createInsecure: vi.fn(() => ({ insecure: true })),
        },
        Client,
      };
    });

    const transport = await createGrpcTransport({ host: '127.0.0.1', port: 7000 });
    const service = buildJsonServiceDefinition('Echo', ['Say']);

    const address = await transport.serve([service]);
    expect(address).toBe('127.0.0.1:7788');
    expect(addService).toHaveBeenCalledTimes(1);

    const response = await transport.callUnary('Echo', 'Say', { hello: 'world' }, '127.0.0.1:7788');
    expect(response).toEqual({ ok: true });
    expect(makeUnaryRequest).toHaveBeenCalledTimes(1);

    await transport.stop();
    expect(forceShutdown).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('surfaces bind errors from grpc server startup', async () => {
    const bindAsync = vi.fn(
      (
        _address: string,
        _credentials: unknown,
        callback: (err: Error | null, port: number) => void,
      ) => callback(new Error('bind failed'), 0),
    );

    vi.doMock('@grpc/grpc-js', () => {
      class Server {
        addService = vi.fn();
        bindAsync = bindAsync;
        forceShutdown = vi.fn();
      }

      class Client {
        makeUnaryRequest = vi.fn();
        close = vi.fn();
      }

      return {
        Server,
        ServerCredentials: {
          createInsecure: vi.fn(() => ({ insecure: true })),
        },
        credentials: {
          createInsecure: vi.fn(() => ({ insecure: true })),
        },
        Client,
      };
    });

    const transport = await createGrpcTransport({ host: '0.0.0.0', port: 7777 });

    await expect(transport.serve([buildJsonServiceDefinition('FailSvc', ['Ping'])])).rejects.toThrow(
      'bind failed',
    );
  });

  it('exposes registerGrpcHandler as a no-op convenience wrapper', async () => {
    const addService = vi.fn();
    const bindAsync = vi.fn(
      (
        _address: string,
        _credentials: unknown,
        callback: (err: Error | null, port: number) => void,
      ) => callback(null, 9000),
    );
    const forceShutdown = vi.fn();

    const makeUnaryRequest = vi.fn();
    const close = vi.fn();

    vi.doMock('@grpc/grpc-js', () => {
      class Server {
        addService = addService;
        bindAsync = bindAsync;
        forceShutdown = forceShutdown;
      }

      class Client {
        makeUnaryRequest = makeUnaryRequest;
        close = close;
      }

      return {
        Server,
        ServerCredentials: {
          createInsecure: vi.fn(() => ({ insecure: true })),
        },
        credentials: {
          createInsecure: vi.fn(() => ({ insecure: true })),
        },
        Client,
      };
    });

    const transport = await createGrpcTransport({ host: 'localhost', port: 9000 });

    expect(() => {
      registerGrpcHandler(transport, 'Svc', 'Method', async (req) => req);
    }).not.toThrow();
  });
});
