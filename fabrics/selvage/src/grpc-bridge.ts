/**
 * gRPC Bridge — Service routing and streaming
 * Bridges gRPC-style service calls with in-process method routing
 */

// ============================================================================
// Ports (zero external dependencies)
// ============================================================================

type ClockPort = {
  nowMicros: () => bigint;
};

type IdPort = {
  generate: () => string;
};

type LogPort = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

// ============================================================================
// Types
// ============================================================================

type ResponseType = 'UNARY' | 'SERVER_STREAM' | 'CLIENT_STREAM' | 'BIDI_STREAM';

type GrpcService = {
  readonly name: string;
  readonly version: string;
  readonly methodCount: number;
  readonly registeredAtMicros: bigint;
};

type GrpcMethod = {
  readonly serviceName: string;
  readonly methodName: string;
  readonly responseType: ResponseType;
  readonly registeredAtMicros: bigint;
};

type GrpcCall = {
  readonly id: string;
  readonly serviceName: string;
  readonly methodName: string;
  readonly request: unknown;
  readonly startMicros: bigint;
};

type GrpcResponse = {
  readonly callId: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly durationMicros: bigint;
};

type StreamHandle = {
  readonly id: string;
  readonly callId: string;
  readonly active: boolean;
  readonly messageCount: number;
  readonly startMicros: bigint;
};

type MethodHandler = (request: unknown) => unknown | string;

type BridgeStats = {
  readonly totalCalls: number;
  readonly activeCalls: number;
  readonly totalStreams: number;
  readonly activeStreams: number;
  readonly avgLatencyMicros: bigint;
  readonly serviceCount: number;
  readonly methodCount: number;
};

type MethodLatency = {
  readonly serviceName: string;
  readonly methodName: string;
  readonly callCount: number;
  readonly avgLatencyMicros: bigint;
  readonly minLatencyMicros: bigint;
  readonly maxLatencyMicros: bigint;
};

// ============================================================================
// State
// ============================================================================

type BridgeState = {
  readonly clock: ClockPort;
  readonly id: IdPort;
  readonly log: LogPort;
  readonly services: Map<string, GrpcService>;
  readonly methods: Map<string, GrpcMethod>;
  readonly handlers: Map<string, MethodHandler>;
  readonly activeCalls: Map<string, GrpcCall>;
  readonly activeStreams: Map<string, StreamHandle>;
  readonly callHistory: Array<GrpcResponse>;
  readonly latencyStats: Map<string, Array<bigint>>;
};

// ============================================================================
// Factory
// ============================================================================

export function createGrpcBridge(clock: ClockPort, id: IdPort, log: LogPort): BridgeState {
  return {
    clock,
    id,
    log,
    services: new Map(),
    methods: new Map(),
    handlers: new Map(),
    activeCalls: new Map(),
    activeStreams: new Map(),
    callHistory: [],
    latencyStats: new Map(),
  };
}

// ============================================================================
// Service Registration
// ============================================================================

export function registerService(
  state: BridgeState,
  name: string,
  version: string,
): GrpcService | 'service-exists' {
  if (state.services.has(name)) {
    return 'service-exists';
  }

  const service: GrpcService = {
    name,
    version,
    methodCount: 0,
    registeredAtMicros: state.clock.nowMicros(),
  };

  state.services.set(name, service);
  state.log.info('Service registered: ' + name + ' v' + version);
  return service;
}

export function registerMethod(
  state: BridgeState,
  serviceName: string,
  methodName: string,
  responseType: ResponseType,
  handler: MethodHandler,
): GrpcMethod | 'service-not-found' | 'method-exists' {
  if (!state.services.has(serviceName)) {
    return 'service-not-found';
  }

  const key = makeMethodKey(serviceName, methodName);
  if (state.methods.has(key)) {
    return 'method-exists';
  }

  const method: GrpcMethod = {
    serviceName,
    methodName,
    responseType,
    registeredAtMicros: state.clock.nowMicros(),
  };

  state.methods.set(key, method);
  state.handlers.set(key, handler);
  incrementMethodCount(state, serviceName);

  const msg = 'Method registered: ' + serviceName + '/' + methodName;
  state.log.info(msg);
  return method;
}

// ============================================================================
// Call Execution
// ============================================================================

export function callMethod(
  state: BridgeState,
  serviceName: string,
  methodName: string,
  request: unknown,
): GrpcResponse | 'method-not-found' {
  const key = makeMethodKey(serviceName, methodName);
  const method = state.methods.get(key);

  if (!method) {
    return 'method-not-found';
  }

  const callId = state.id.generate();
  const startMicros = state.clock.nowMicros();

  const call: GrpcCall = {
    id: callId,
    serviceName,
    methodName,
    request,
    startMicros,
  };

  state.activeCalls.set(callId, call);

  const handler = state.handlers.get(key);
  if (!handler) {
    const response = makeErrorResponse(state, callId, startMicros, 'handler-not-found');
    state.activeCalls.delete(callId);
    return response;
  }

  const result = handler(request);
  const endMicros = state.clock.nowMicros();
  const durationMicros = endMicros - startMicros;

  recordLatency(state, serviceName, methodName, durationMicros);

  let response: GrpcResponse;
  if (typeof result === 'string') {
    response = makeErrorResponse(state, callId, startMicros, result);
  } else {
    response = {
      callId,
      success: true,
      data: result,
      durationMicros,
    };
    state.callHistory.push(response);
  }

  if (method.responseType === 'UNARY') {
    state.activeCalls.delete(callId);
  }
  return response;
}

// ============================================================================
// Streaming
// ============================================================================

export function startStream(state: BridgeState, callId: string): StreamHandle | 'call-not-found' {
  const call = state.activeCalls.get(callId);
  if (!call) {
    return 'call-not-found';
  }

  const streamId = state.id.generate();
  const handle: StreamHandle = {
    id: streamId,
    callId,
    active: true,
    messageCount: 0,
    startMicros: state.clock.nowMicros(),
  };

  state.activeStreams.set(streamId, handle);
  const msg = 'Stream started: ' + streamId + ' for call ' + callId;
  state.log.info(msg);
  return handle;
}

export function endStream(state: BridgeState, streamId: string): boolean {
  const stream = state.activeStreams.get(streamId);
  if (!stream) {
    return false;
  }

  state.activeStreams.delete(streamId);
  const duration = state.clock.nowMicros() - stream.startMicros;
  const msg = 'Stream ended: ' + streamId + ' (' + String(duration) + 'μs)';
  state.log.info(msg);
  return true;
}

export function incrementStreamMessageCount(
  state: BridgeState,
  streamId: string,
): number | 'stream-not-found' {
  const stream = state.activeStreams.get(streamId);
  if (!stream) {
    return 'stream-not-found';
  }

  const updated: StreamHandle = {
    ...stream,
    messageCount: stream.messageCount + 1,
  };

  state.activeStreams.set(streamId, updated);
  return updated.messageCount;
}

// ============================================================================
// Statistics
// ============================================================================

export function getStats(state: BridgeState): BridgeStats {
  const totalCalls = state.callHistory.length;
  const activeCalls = state.activeCalls.size;
  const totalStreams = countTotalStreams(state);
  const activeStreams = state.activeStreams.size;
  const avgLatencyMicros = calculateAvgLatency(state);
  const serviceCount = state.services.size;
  const methodCount = state.methods.size;

  return {
    totalCalls,
    activeCalls,
    totalStreams,
    activeStreams,
    avgLatencyMicros,
    serviceCount,
    methodCount,
  };
}

export function getMethodLatency(
  state: BridgeState,
  serviceName: string,
  methodName: string,
): MethodLatency | 'method-not-found' {
  const key = makeMethodKey(serviceName, methodName);
  if (!state.methods.has(key)) {
    return 'method-not-found';
  }

  const latencies = state.latencyStats.get(key) || [];
  if (latencies.length === 0) {
    return {
      serviceName,
      methodName,
      callCount: 0,
      avgLatencyMicros: 0n,
      minLatencyMicros: 0n,
      maxLatencyMicros: 0n,
    };
  }

  const sum = latencies.reduce((a, b) => a + b, 0n);
  const avg = sum / BigInt(latencies.length);
  const min = latencies.reduce((a, b) => (a < b ? a : b));
  const max = latencies.reduce((a, b) => (a > b ? a : b));

  return {
    serviceName,
    methodName,
    callCount: latencies.length,
    avgLatencyMicros: avg,
    minLatencyMicros: min,
    maxLatencyMicros: max,
  };
}

export function listServices(state: BridgeState): Array<GrpcService> {
  return Array.from(state.services.values());
}

export function listMethodsForService(state: BridgeState, serviceName: string): Array<GrpcMethod> {
  const methods: Array<GrpcMethod> = [];

  for (const method of state.methods.values()) {
    if (method.serviceName === serviceName) {
      methods.push(method);
    }
  }

  return methods;
}

export function getServiceByName(state: BridgeState, name: string): GrpcService | 'not-found' {
  const service = state.services.get(name);
  return service || 'not-found';
}

export function getMethodByName(
  state: BridgeState,
  serviceName: string,
  methodName: string,
): GrpcMethod | 'not-found' {
  const key = makeMethodKey(serviceName, methodName);
  const method = state.methods.get(key);
  return method || 'not-found';
}

// ============================================================================
// Helpers
// ============================================================================

function makeMethodKey(serviceName: string, methodName: string): string {
  return serviceName + '/' + methodName;
}

function incrementMethodCount(state: BridgeState, serviceName: string): void {
  const service = state.services.get(serviceName);
  if (!service) {
    return;
  }

  const updated: GrpcService = {
    ...service,
    methodCount: service.methodCount + 1,
  };

  state.services.set(serviceName, updated);
}

function recordLatency(
  state: BridgeState,
  serviceName: string,
  methodName: string,
  durationMicros: bigint,
): void {
  const key = makeMethodKey(serviceName, methodName);
  const latencies = state.latencyStats.get(key) || [];
  latencies.push(durationMicros);
  state.latencyStats.set(key, latencies);
}

function makeErrorResponse(
  state: BridgeState,
  callId: string,
  startMicros: bigint,
  error: string,
): GrpcResponse {
  const durationMicros = state.clock.nowMicros() - startMicros;
  const response: GrpcResponse = {
    callId,
    success: false,
    error,
    durationMicros,
  };
  state.callHistory.push(response);
  return response;
}

function calculateAvgLatency(state: BridgeState): bigint {
  if (state.callHistory.length === 0) {
    return 0n;
  }

  const sum = state.callHistory.reduce((acc, resp) => acc + resp.durationMicros, 0n);

  return sum / BigInt(state.callHistory.length);
}

function countTotalStreams(state: BridgeState): number {
  let count = 0;
  for (const response of state.callHistory) {
    if (response.success) {
      count++;
    }
  }
  return count + state.activeStreams.size;
}

// ============================================================================
// Call History
// ============================================================================

export function getCallHistory(state: BridgeState, limit: number): Array<GrpcResponse> {
  const start = Math.max(0, state.callHistory.length - limit);
  return state.callHistory.slice(start);
}

export function clearCallHistory(state: BridgeState): void {
  state.callHistory.length = 0;
  state.log.info('Call history cleared');
}

export function getActiveCallCount(state: BridgeState): number {
  return state.activeCalls.size;
}

export function getActiveStreamCount(state: BridgeState): number {
  return state.activeStreams.size;
}

export function getAllLatencyStats(state: BridgeState): Map<string, Array<bigint>> {
  return new Map(state.latencyStats);
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ClockPort,
  IdPort,
  LogPort,
  ResponseType,
  GrpcService,
  GrpcMethod,
  GrpcCall,
  GrpcResponse,
  StreamHandle,
  MethodHandler,
  BridgeStats,
  MethodLatency,
  BridgeState,
};
