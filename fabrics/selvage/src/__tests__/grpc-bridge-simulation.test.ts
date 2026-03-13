import { describe, it, expect } from 'vitest';
import { createGrpcBridge, registerService, registerMethod, callMethod, getStats, listServices } from '../grpc-bridge.js';

let idSeq = 0;
function makeBridge() {
  idSeq = 0;
  return createGrpcBridge(
    { nowMicros: () => BigInt(Date.now()) * 1_000n },
    { generate: () => `req-${++idSeq}` },
    { info: () => {}, warn: () => {}, error: () => {} },
  );
}

describe('gRPC Bridge Simulation', () => {
  it('registers a service and calls a unary method', async () => {
    const state = makeBridge();

    const svc = registerService(state, 'GameService', 'v1.0.0');
    expect(svc).not.toBe('service-exists');

    const handler = async (req: unknown) => ({ pong: req });
    const method = registerMethod(state, 'GameService', 'Ping', 'UNARY', handler);
    expect(method).not.toBe('service-not-found');
    expect(method).not.toBe('method-exists');

    const response = await callMethod(state, 'GameService', 'Ping', { data: 'hello' });
    expect(response).toBeDefined();
  });

  it('prevents duplicate service registration', () => {
    const state = makeBridge();
    registerService(state, 'AuthService', 'v1.0.0');
    const dup = registerService(state, 'AuthService', 'v1.0.0');
    expect(dup).toBe('service-exists');
  });

  it('prevents duplicate method registration', () => {
    const state = makeBridge();
    registerService(state, 'WorldService', 'v2.0.0');
    const h = async () => ({});
    registerMethod(state, 'WorldService', 'GetWorld', 'UNARY', h);
    const dup = registerMethod(state, 'WorldService', 'GetWorld', 'UNARY', h);
    expect(dup).toBe('method-exists');
  });

  it('lists registered services', () => {
    const state = makeBridge();
    registerService(state, 'Service1', 'v1.0.0');
    registerService(state, 'Service2', 'v1.0.0');
    const services = listServices(state);
    expect(services.length).toBe(2);
  });

  it('tracks stats', () => {
    const state = makeBridge();
    registerService(state, 'StatsService', 'v1.0.0');
    const stats = getStats(state);
    expect(stats.serviceCount).toBe(1);
  });
});
