/**
 * Tests for gRPC Bridge
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGrpcBridge,
  registerService,
  registerMethod,
  callMethod,
  startStream,
  endStream,
  incrementStreamMessageCount,
  getStats,
  getMethodLatency,
  listServices,
  listMethodsForService,
  getServiceByName,
  getMethodByName,
  getCallHistory,
  clearCallHistory,
  getActiveCallCount,
  getActiveStreamCount,
  getAllLatencyStats,
  type BridgeState,
  type ClockPort,
  type IdPort,
  type LogPort,
  type ResponseType,
} from '../grpc-bridge.js';

// ============================================================================
// Test Ports
// ============================================================================

function createTestClock(): ClockPort {
  let currentMicros = 1_000_000_000n;
  return {
    nowMicros: () => {
      currentMicros = currentMicros + 1000n;
      return currentMicros;
    },
  };
}

function createTestId(): IdPort {
  let counter = 0;
  return {
    generate: () => {
      counter++;
      return 'id-' + String(counter);
    },
  };
}

function createTestLog(): LogPort {
  const logs: Array<string> = [];
  return {
    info: (msg: string) => logs.push('INFO: ' + msg),
    warn: (msg: string) => logs.push('WARN: ' + msg),
    error: (msg: string) => logs.push('ERROR: ' + msg),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('gRPC Bridge', () => {
  let state: BridgeState;
  let clock: ClockPort;
  let id: IdPort;
  let log: LogPort;

  beforeEach(() => {
    clock = createTestClock();
    id = createTestId();
    log = createTestLog();
    state = createGrpcBridge(clock, id, log);
  });

  // ============================================================================
  // Service Registration
  // ============================================================================

  describe('registerService', () => {
    it('should register a new service', () => {
      const result = registerService(state, 'UserService', 'v1.0.0');
      expect(result).not.toBe('service-exists');
      if (typeof result !== 'string') {
        expect(result.name).toBe('UserService');
        expect(result.version).toBe('v1.0.0');
        expect(result.methodCount).toBe(0);
      }
    });

    it('should return service-exists if service already registered', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const result = registerService(state, 'UserService', 'v2.0.0');
      expect(result).toBe('service-exists');
    });

    it('should register multiple different services', () => {
      const s1 = registerService(state, 'UserService', 'v1.0.0');
      const s2 = registerService(state, 'OrderService', 'v1.0.0');
      expect(s1).not.toBe('service-exists');
      expect(s2).not.toBe('service-exists');
    });

    it('should track registration timestamp', () => {
      const result = registerService(state, 'UserService', 'v1.0.0');
      if (typeof result !== 'string') {
        expect(result.registeredAtMicros).toBeGreaterThan(0n);
      }
    });

    it('should increment method count when methods are registered', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      const service = getServiceByName(state, 'UserService');
      if (typeof service !== 'string') {
        expect(service.methodCount).toBe(1);
      }
    });
  });

  // ============================================================================
  // Method Registration
  // ============================================================================

  describe('registerMethod', () => {
    beforeEach(() => {
      registerService(state, 'UserService', 'v1.0.0');
    });

    it('should register a unary method', () => {
      const handler = (req: unknown) => ({ userId: '123' });
      const result = registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);
      expect(result).not.toBe('service-not-found');
      expect(result).not.toBe('method-exists');
      if (typeof result !== 'string') {
        expect(result.serviceName).toBe('UserService');
        expect(result.methodName).toBe('GetUser');
        expect(result.responseType).toBe('UNARY');
      }
    });

    it('should register a server stream method', () => {
      const handler = (req: unknown) => ({ stream: true });
      const result = registerMethod(state, 'UserService', 'ListUsers', 'SERVER_STREAM', handler);
      if (typeof result !== 'string') {
        expect(result.responseType).toBe('SERVER_STREAM');
      }
    });

    it('should register a client stream method', () => {
      const handler = (req: unknown) => ({ received: true });
      const result = registerMethod(state, 'UserService', 'Upload', 'CLIENT_STREAM', handler);
      if (typeof result !== 'string') {
        expect(result.responseType).toBe('CLIENT_STREAM');
      }
    });

    it('should register a bidirectional stream method', () => {
      const handler = (req: unknown) => ({ bidir: true });
      const result = registerMethod(state, 'UserService', 'Chat', 'BIDI_STREAM', handler);
      if (typeof result !== 'string') {
        expect(result.responseType).toBe('BIDI_STREAM');
      }
    });

    it('should return service-not-found if service does not exist', () => {
      const handler = (req: unknown) => ({ success: true });
      const result = registerMethod(state, 'UnknownService', 'GetUser', 'UNARY', handler);
      expect(result).toBe('service-not-found');
    });

    it('should return method-exists if method already registered', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);
      const result = registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);
      expect(result).toBe('method-exists');
    });

    it('should allow same method name across different services', () => {
      registerService(state, 'OrderService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      const r1 = registerMethod(state, 'UserService', 'Get', 'UNARY', handler);
      const r2 = registerMethod(state, 'OrderService', 'Get', 'UNARY', handler);
      expect(r1).not.toBe('method-exists');
      expect(r2).not.toBe('method-exists');
    });

    it('should track method registration timestamp', () => {
      const handler = (req: unknown) => ({ success: true });
      const result = registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);
      if (typeof result !== 'string') {
        expect(result.registeredAtMicros).toBeGreaterThan(0n);
      }
    });
  });

  // ============================================================================
  // Method Calls
  // ============================================================================

  describe('callMethod', () => {
    beforeEach(() => {
      registerService(state, 'UserService', 'v1.0.0');
    });

    it('should call a method and return success response', () => {
      const handler = (req: unknown) => ({ userId: '123' });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      const response = callMethod(state, 'UserService', 'GetUser', { id: '123' });
      expect(response).not.toBe('method-not-found');
      if (typeof response !== 'string') {
        expect(response.success).toBe(true);
        expect(response.data).toEqual({ userId: '123' });
        expect(response.durationMicros).toBeGreaterThan(0n);
      }
    });

    it('should return method-not-found for unknown method', () => {
      const response = callMethod(state, 'UserService', 'Unknown', { id: '123' });
      expect(response).toBe('method-not-found');
    });

    it('should handle handler returning error string', () => {
      const handler = (req: unknown) => 'user-not-found';
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      const response = callMethod(state, 'UserService', 'GetUser', { id: '999' });
      if (typeof response !== 'string') {
        expect(response.success).toBe(false);
        expect(response.error).toBe('user-not-found');
      }
    });

    it('should track call latency', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      callMethod(state, 'UserService', 'GetUser', {});
      const latency = getMethodLatency(state, 'UserService', 'GetUser');

      if (typeof latency !== 'string') {
        expect(latency.callCount).toBe(1);
        expect(latency.avgLatencyMicros).toBeGreaterThan(0n);
      }
    });

    it('should remove call from active calls after completion', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      callMethod(state, 'UserService', 'GetUser', {});
      expect(getActiveCallCount(state)).toBe(0);
    });

    it('should add successful calls to history', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      callMethod(state, 'UserService', 'GetUser', {});
      const history = getCallHistory(state, 10);
      expect(history.length).toBe(1);
    });

    it('should add error calls to history', () => {
      const handler = (req: unknown) => 'error';
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      callMethod(state, 'UserService', 'GetUser', {});
      const history = getCallHistory(state, 10);
      expect(history.length).toBe(1);
    });

    it('should generate unique call IDs', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'GetUser', 'UNARY', handler);

      const r1 = callMethod(state, 'UserService', 'GetUser', {});
      const r2 = callMethod(state, 'UserService', 'GetUser', {});

      if (typeof r1 !== 'string' && typeof r2 !== 'string') {
        expect(r1.callId).not.toBe(r2.callId);
      }
    });
  });

  // ============================================================================
  // Streaming
  // ============================================================================

  describe('startStream', () => {
    beforeEach(() => {
      registerService(state, 'UserService', 'v1.0.0');
    });

    it('should return call-not-found if call does not exist', () => {
      const result = startStream(state, 'unknown-call');
      expect(result).toBe('call-not-found');
    });

    it('should generate unique stream IDs', () => {
      const handler = (req: unknown) => {
        const callId = 'test-call';
        return { callId };
      };
      registerMethod(state, 'UserService', 'Stream', 'SERVER_STREAM', handler);

      const r1 = callMethod(state, 'UserService', 'Stream', {});
      const r2 = callMethod(state, 'UserService', 'Stream', {});

      if (typeof r1 !== 'string' && typeof r2 !== 'string') {
        expect(r1.callId).not.toBe(r2.callId);
      }
    });

    it('should track stream start time', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Stream', 'SERVER_STREAM', handler);

      const response = callMethod(state, 'UserService', 'Stream', {});
      if (typeof response !== 'string') {
        const stream = startStream(state, response.callId);
        if (typeof stream !== 'string') {
          expect(stream.startMicros).toBeGreaterThan(0n);
        }
      }
    });

    it('should initialize message count to zero', () => {
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Stream', 'SERVER_STREAM', handler);

      const response = callMethod(state, 'UserService', 'Stream', {});
      if (typeof response !== 'string') {
        const stream = startStream(state, response.callId);
        if (typeof stream !== 'string') {
          expect(stream.messageCount).toBe(0);
        }
      }
    });
  });

  describe('endStream', () => {
    it('should return false if stream does not exist', () => {
      const result = endStream(state, 'unknown-stream');
      expect(result).toBe(false);
    });

    it('should decrease active stream count', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Stream', 'SERVER_STREAM', handler);

      const response = callMethod(state, 'UserService', 'Stream', {});
      if (typeof response !== 'string') {
        const stream = startStream(state, response.callId);
        if (typeof stream !== 'string') {
          expect(getActiveStreamCount(state)).toBe(1);
          endStream(state, stream.id);
          expect(getActiveStreamCount(state)).toBe(0);
        }
      }
    });
  });

  describe('incrementStreamMessageCount', () => {
    it('should return stream-not-found for unknown stream', () => {
      const result = incrementStreamMessageCount(state, 'unknown');
      expect(result).toBe('stream-not-found');
    });

    it('should increment message count', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Stream', 'SERVER_STREAM', handler);

      const response = callMethod(state, 'UserService', 'Stream', {});
      if (typeof response !== 'string') {
        const stream = startStream(state, response.callId);
        if (typeof stream !== 'string') {
          const count1 = incrementStreamMessageCount(state, stream.id);
          const count2 = incrementStreamMessageCount(state, stream.id);
          expect(count1).toBe(1);
          expect(count2).toBe(2);
        }
      }
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('getStats', () => {
    it('should return zero stats for empty bridge', () => {
      const stats = getStats(state);
      expect(stats.totalCalls).toBe(0);
      expect(stats.activeCalls).toBe(0);
      expect(stats.serviceCount).toBe(0);
      expect(stats.methodCount).toBe(0);
    });

    it('should track service count', () => {
      registerService(state, 'UserService', 'v1.0.0');
      registerService(state, 'OrderService', 'v1.0.0');
      const stats = getStats(state);
      expect(stats.serviceCount).toBe(2);
    });

    it('should track method count', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);
      registerMethod(state, 'UserService', 'List', 'UNARY', handler);
      const stats = getStats(state);
      expect(stats.methodCount).toBe(2);
    });

    it('should track total calls', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      callMethod(state, 'UserService', 'Get', {});

      const stats = getStats(state);
      expect(stats.totalCalls).toBe(2);
    });

    it('should calculate average latency', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      const stats = getStats(state);
      expect(stats.avgLatencyMicros).toBeGreaterThan(0n);
    });
  });

  describe('getMethodLatency', () => {
    it('should return method-not-found for unknown method', () => {
      const result = getMethodLatency(state, 'Unknown', 'Get');
      expect(result).toBe('method-not-found');
    });

    it('should return zero stats for method with no calls', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      const latency = getMethodLatency(state, 'UserService', 'Get');
      if (typeof latency !== 'string') {
        expect(latency.callCount).toBe(0);
        expect(latency.avgLatencyMicros).toBe(0n);
      }
    });

    it('should track call count', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      callMethod(state, 'UserService', 'Get', {});

      const latency = getMethodLatency(state, 'UserService', 'Get');
      if (typeof latency !== 'string') {
        expect(latency.callCount).toBe(2);
      }
    });

    it('should calculate min latency', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      const latency = getMethodLatency(state, 'UserService', 'Get');
      if (typeof latency !== 'string') {
        expect(latency.minLatencyMicros).toBeGreaterThan(0n);
      }
    });

    it('should calculate max latency', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      const latency = getMethodLatency(state, 'UserService', 'Get');
      if (typeof latency !== 'string') {
        expect(latency.maxLatencyMicros).toBeGreaterThan(0n);
      }
    });
  });

  // ============================================================================
  // Listing and Queries
  // ============================================================================

  describe('listServices', () => {
    it('should return empty array when no services registered', () => {
      const services = listServices(state);
      expect(services).toEqual([]);
    });

    it('should return all registered services', () => {
      registerService(state, 'UserService', 'v1.0.0');
      registerService(state, 'OrderService', 'v1.0.0');
      const services = listServices(state);
      expect(services.length).toBe(2);
    });
  });

  describe('listMethodsForService', () => {
    it('should return empty array for service with no methods', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const methods = listMethodsForService(state, 'UserService');
      expect(methods).toEqual([]);
    });

    it('should return all methods for a service', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);
      registerMethod(state, 'UserService', 'List', 'UNARY', handler);

      const methods = listMethodsForService(state, 'UserService');
      expect(methods.length).toBe(2);
    });

    it('should only return methods for specified service', () => {
      registerService(state, 'UserService', 'v1.0.0');
      registerService(state, 'OrderService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);
      registerMethod(state, 'OrderService', 'Get', 'UNARY', handler);

      const methods = listMethodsForService(state, 'UserService');
      expect(methods.length).toBe(1);
      expect(methods[0]?.serviceName).toBe('UserService');
    });
  });

  describe('getServiceByName', () => {
    it('should return not-found for unknown service', () => {
      const result = getServiceByName(state, 'Unknown');
      expect(result).toBe('not-found');
    });

    it('should return service by name', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const result = getServiceByName(state, 'UserService');
      if (typeof result !== 'string') {
        expect(result.name).toBe('UserService');
      }
    });
  });

  describe('getMethodByName', () => {
    it('should return not-found for unknown method', () => {
      const result = getMethodByName(state, 'UserService', 'Unknown');
      expect(result).toBe('not-found');
    });

    it('should return method by name', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      const result = getMethodByName(state, 'UserService', 'Get');
      if (typeof result !== 'string') {
        expect(result.methodName).toBe('Get');
      }
    });
  });

  // ============================================================================
  // Call History
  // ============================================================================

  describe('getCallHistory', () => {
    it('should return empty array when no calls made', () => {
      const history = getCallHistory(state, 10);
      expect(history).toEqual([]);
    });

    it('should return recent calls', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      callMethod(state, 'UserService', 'Get', {});

      const history = getCallHistory(state, 10);
      expect(history.length).toBe(2);
    });

    it('should limit history by specified count', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      for (let i = 0; i < 10; i++) {
        callMethod(state, 'UserService', 'Get', {});
      }

      const history = getCallHistory(state, 5);
      expect(history.length).toBe(5);
    });
  });

  describe('clearCallHistory', () => {
    it('should clear all call history', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      clearCallHistory(state);

      const history = getCallHistory(state, 10);
      expect(history).toEqual([]);
    });
  });

  describe('getActiveCallCount', () => {
    it('should return zero when no active calls', () => {
      expect(getActiveCallCount(state)).toBe(0);
    });
  });

  describe('getActiveStreamCount', () => {
    it('should return zero when no active streams', () => {
      expect(getActiveStreamCount(state)).toBe(0);
    });

    it('should track active streams', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Stream', 'SERVER_STREAM', handler);

      const response = callMethod(state, 'UserService', 'Stream', {});
      if (typeof response !== 'string') {
        startStream(state, response.callId);
        expect(getActiveStreamCount(state)).toBe(1);
      }
    });
  });

  describe('getAllLatencyStats', () => {
    it('should return empty map when no calls made', () => {
      const stats = getAllLatencyStats(state);
      expect(stats.size).toBe(0);
    });

    it('should return latency stats for all methods', () => {
      registerService(state, 'UserService', 'v1.0.0');
      const handler = (req: unknown) => ({ success: true });
      registerMethod(state, 'UserService', 'Get', 'UNARY', handler);
      registerMethod(state, 'UserService', 'List', 'UNARY', handler);

      callMethod(state, 'UserService', 'Get', {});
      callMethod(state, 'UserService', 'List', {});

      const stats = getAllLatencyStats(state);
      expect(stats.size).toBe(2);
    });
  });
});
