/**
 * load-balancer-system.ts — Weighted load balancing across service instances.
 *
 * Distributes requests using least-load-by-weight strategy: the instance with
 * the lowest (totalRequests / weight) ratio is selected, giving higher-weight
 * instances proportionally more traffic. Only HEALTHY and DEGRADED instances
 * receive traffic.
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type InstanceId = string;
export type ServiceName = string;

export type BalancerError =
  | 'service-not-found'
  | 'instance-not-found'
  | 'already-registered'
  | 'no-healthy-instances'
  | 'invalid-weight';

export type InstanceStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'DRAINING';

export type ServiceInstance = {
  instanceId: InstanceId;
  serviceName: ServiceName;
  endpoint: string;
  status: InstanceStatus;
  weight: number;
  currentConnections: number;
  totalRequests: number;
  registeredAt: bigint;
};

export type RoutingDecision = {
  decisionId: string;
  instanceId: InstanceId;
  serviceName: ServiceName;
  requestId: string;
  routedAt: bigint;
};

export type BalancerStats = {
  serviceName: ServiceName;
  totalInstances: number;
  healthyInstances: number;
  totalRequests: number;
  avgConnectionsPerInstance: number;
};

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type LoadBalancerSystem = {
  registerInstance(
    serviceName: ServiceName,
    endpoint: string,
    weight: number,
  ): ServiceInstance | BalancerError;
  deregisterInstance(
    instanceId: InstanceId,
  ): { success: true } | { success: false; error: BalancerError };
  updateStatus(
    instanceId: InstanceId,
    status: InstanceStatus,
  ): { success: true } | { success: false; error: BalancerError };
  routeRequest(serviceName: ServiceName, requestId: string): RoutingDecision | BalancerError;
  releaseConnection(
    instanceId: InstanceId,
  ): { success: true } | { success: false; error: BalancerError };
  getStats(serviceName: ServiceName): BalancerStats | undefined;
  listInstances(serviceName: ServiceName): ReadonlyArray<ServiceInstance>;
};

// ============================================================================
// STATE
// ============================================================================

type LoadBalancerState = {
  instances: Map<InstanceId, ServiceInstance>;
};

// ============================================================================
// HELPERS
// ============================================================================

function isRoutable(status: InstanceStatus): boolean {
  return status === 'HEALTHY' || status === 'DEGRADED';
}

function selectByLeastLoadedWeight(candidates: ServiceInstance[]): ServiceInstance {
  let best = candidates[0] as ServiceInstance;
  let bestRatio = best.totalRequests / best.weight;

  for (let i = 1; i < candidates.length; i++) {
    const inst = candidates[i] as ServiceInstance;
    const sortKey = inst.instanceId;
    const ratio = inst.totalRequests / inst.weight;

    if (ratio < bestRatio || (ratio === bestRatio && sortKey < best.instanceId)) {
      best = inst;
      bestRatio = ratio;
    }
  }

  return best;
}

// ============================================================================
// OPERATIONS
// ============================================================================

function registerInstance(
  state: LoadBalancerState,
  serviceName: ServiceName,
  endpoint: string,
  weight: number,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): ServiceInstance | BalancerError {
  if (weight < 1 || weight > 100) return 'invalid-weight';

  const instanceId = idGen.generate();
  const instance: ServiceInstance = {
    instanceId,
    serviceName,
    endpoint,
    status: 'HEALTHY',
    weight,
    currentConnections: 0,
    totalRequests: 0,
    registeredAt: clock.now(),
  };

  state.instances.set(instanceId, instance);
  logger.info('Instance registered: ' + instanceId + ' for ' + serviceName);
  return instance;
}

function deregisterInstance(
  state: LoadBalancerState,
  instanceId: InstanceId,
  logger: Logger,
): { success: true } | { success: false; error: BalancerError } {
  if (!state.instances.has(instanceId)) return { success: false, error: 'instance-not-found' };

  state.instances.delete(instanceId);
  logger.info('Instance deregistered: ' + instanceId);
  return { success: true };
}

function updateStatus(
  state: LoadBalancerState,
  instanceId: InstanceId,
  status: InstanceStatus,
): { success: true } | { success: false; error: BalancerError } {
  const instance = state.instances.get(instanceId);
  if (!instance) return { success: false, error: 'instance-not-found' };

  (instance as { status: InstanceStatus }).status = status;
  return { success: true };
}

function routeRequest(
  state: LoadBalancerState,
  serviceName: ServiceName,
  requestId: string,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): RoutingDecision | BalancerError {
  const candidates: ServiceInstance[] = [];
  for (const inst of state.instances.values()) {
    if (inst.serviceName === serviceName && isRoutable(inst.status)) {
      candidates.push(inst);
    }
  }

  if (candidates.length === 0) {
    logger.warn('No healthy instances for service: ' + serviceName);
    return 'no-healthy-instances';
  }

  candidates.sort((a, b) => (a.instanceId < b.instanceId ? -1 : 1));
  const selected = selectByLeastLoadedWeight(candidates);

  (selected as { currentConnections: number }).currentConnections += 1;
  (selected as { totalRequests: number }).totalRequests += 1;

  const decision: RoutingDecision = {
    decisionId: idGen.generate(),
    instanceId: selected.instanceId,
    serviceName,
    requestId,
    routedAt: clock.now(),
  };

  return decision;
}

function releaseConnection(
  state: LoadBalancerState,
  instanceId: InstanceId,
): { success: true } | { success: false; error: BalancerError } {
  const instance = state.instances.get(instanceId);
  if (!instance) return { success: false, error: 'instance-not-found' };

  const current = instance.currentConnections;
  (instance as { currentConnections: number }).currentConnections = Math.max(0, current - 1);
  return { success: true };
}

function getStats(state: LoadBalancerState, serviceName: ServiceName): BalancerStats | undefined {
  const serviceInstances: ServiceInstance[] = [];
  for (const inst of state.instances.values()) {
    if (inst.serviceName === serviceName) serviceInstances.push(inst);
  }

  if (serviceInstances.length === 0) return undefined;

  const healthyInstances = serviceInstances.filter((i) => isRoutable(i.status)).length;
  const totalRequests = serviceInstances.reduce((sum, i) => sum + i.totalRequests, 0);
  const totalConnections = serviceInstances.reduce((sum, i) => sum + i.currentConnections, 0);
  const avgConnectionsPerInstance = totalConnections / serviceInstances.length;

  return {
    serviceName,
    totalInstances: serviceInstances.length,
    healthyInstances,
    totalRequests,
    avgConnectionsPerInstance,
  };
}

function listInstances(
  state: LoadBalancerState,
  serviceName: ServiceName,
): ReadonlyArray<ServiceInstance> {
  const results: ServiceInstance[] = [];
  for (const inst of state.instances.values()) {
    if (inst.serviceName === serviceName) results.push(inst);
  }
  return results;
}

// ============================================================================
// FACTORY
// ============================================================================

export type LoadBalancerSystemDeps = {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
};

export function createLoadBalancerSystem(deps: LoadBalancerSystemDeps): LoadBalancerSystem {
  const state: LoadBalancerState = { instances: new Map() };

  return {
    registerInstance: (serviceName, endpoint, weight) =>
      registerInstance(state, serviceName, endpoint, weight, deps.clock, deps.idGen, deps.logger),
    deregisterInstance: (instanceId) => deregisterInstance(state, instanceId, deps.logger),
    updateStatus: (instanceId, status) => updateStatus(state, instanceId, status),
    routeRequest: (serviceName, requestId) =>
      routeRequest(state, serviceName, requestId, deps.clock, deps.idGen, deps.logger),
    releaseConnection: (instanceId) => releaseConnection(state, instanceId),
    getStats: (serviceName) => getStats(state, serviceName),
    listInstances: (serviceName) => listInstances(state, serviceName),
  };
}
