/**
 * Load Balancer — Request distribution across service instances
 * Fabric: selvage
 * Thread tier: M (Multi-agent orchestration)
 */

// ============================================================================
// Port Definitions (duplicated per fabric isolation)
// ============================================================================

interface LoadBalancerClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface LoadBalancerLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type LoadStrategy = 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'RANDOM';

export type InstanceHealthStatus = 'HEALTHY' | 'UNHEALTHY' | 'DRAINING';

export interface ServiceInstance {
  readonly id: string;
  readonly host: string;
  readonly port: number;
  readonly weight: number;
}

export interface InstanceHealth {
  readonly instanceId: string;
  readonly health: InstanceHealthStatus;
  readonly lastCheckMicros: bigint;
  readonly activeConnections: number;
}

export interface RoutingResult {
  readonly instance: ServiceInstance;
  readonly strategy: LoadStrategy;
  readonly selectedAtMicros: bigint;
}

export interface LoadStats {
  readonly totalInstances: number;
  readonly healthyInstances: number;
  readonly totalRequests: bigint;
  readonly strategy: LoadStrategy;
  readonly averageConnections: number;
}

export type RegisterResult = 'OK' | 'INSTANCE_ALREADY_REGISTERED';
export type DeregisterResult = 'OK' | 'INSTANCE_NOT_FOUND';
export type SelectResult = RoutingResult | 'NO_HEALTHY_INSTANCES';
export type HealthResult = 'OK' | 'INSTANCE_NOT_FOUND';

// ============================================================================
// State
// ============================================================================

interface LoadBalancerState {
  readonly instances: Map<string, ServiceInstance>;
  readonly health: Map<string, InstanceHealth>;
  readonly connections: Map<string, number>;
  roundRobinIndex: number;
  totalRequests: bigint;
  strategy: LoadStrategy;
}

export interface LoadBalancerDeps {
  readonly clock: LoadBalancerClockPort;
  readonly logger: LoadBalancerLoggerPort;
}

export interface LoadBalancer {
  readonly registerInstance: (instance: ServiceInstance) => RegisterResult;
  readonly deregisterInstance: (instanceId: string) => DeregisterResult;
  readonly selectInstance: () => SelectResult;
  readonly markUnhealthy: (instanceId: string) => HealthResult;
  readonly markHealthy: (instanceId: string) => HealthResult;
  readonly incrementConnections: (instanceId: string) => HealthResult;
  readonly decrementConnections: (instanceId: string) => HealthResult;
  readonly setStrategy: (strategy: LoadStrategy) => void;
  readonly getStats: () => LoadStats;
}

// ============================================================================
// Factory
// ============================================================================

export function createLoadBalancer(deps: LoadBalancerDeps): LoadBalancer {
  const state: LoadBalancerState = {
    instances: new Map(),
    health: new Map(),
    connections: new Map(),
    roundRobinIndex: 0,
    totalRequests: 0n,
    strategy: 'ROUND_ROBIN',
  };

  return {
    registerInstance: (instance) => registerInstance(state, deps, instance),
    deregisterInstance: (id) => deregisterInstance(state, deps, id),
    selectInstance: () => selectInstance(state, deps),
    markUnhealthy: (id) => markUnhealthy(state, deps, id),
    markHealthy: (id) => markHealthy(state, deps, id),
    incrementConnections: (id) => incrementConnections(state, id),
    decrementConnections: (id) => decrementConnections(state, id),
    setStrategy: (strategy) => setStrategy(state, strategy),
    getStats: () => getStats(state),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

function registerInstance(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  instance: ServiceInstance,
): RegisterResult {
  if (state.instances.has(instance.id)) {
    return 'INSTANCE_ALREADY_REGISTERED';
  }

  state.instances.set(instance.id, instance);
  state.connections.set(instance.id, 0);

  const nowMicros = deps.clock.nowMicroseconds();
  state.health.set(instance.id, {
    instanceId: instance.id,
    health: 'HEALTHY',
    lastCheckMicros: nowMicros,
    activeConnections: 0,
  });

  deps.logger.info('Instance registered', {
    instanceId: instance.id,
    host: instance.host,
    port: instance.port,
  });

  return 'OK';
}

function deregisterInstance(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  instanceId: string,
): DeregisterResult {
  if (!state.instances.has(instanceId)) {
    return 'INSTANCE_NOT_FOUND';
  }

  state.instances.delete(instanceId);
  state.health.delete(instanceId);
  state.connections.delete(instanceId);

  deps.logger.info('Instance deregistered', { instanceId });
  return 'OK';
}

function selectInstance(state: LoadBalancerState, deps: LoadBalancerDeps): SelectResult {
  const healthy = getHealthyInstances(state);
  if (healthy.length === 0) {
    deps.logger.warn('No healthy instances available', {});
    return 'NO_HEALTHY_INSTANCES';
  }

  state.totalRequests = state.totalRequests + 1n;

  if (state.strategy === 'ROUND_ROBIN') {
    return selectRoundRobin(state, deps, healthy);
  }
  if (state.strategy === 'LEAST_CONNECTIONS') {
    return selectLeastConnections(state, deps, healthy);
  }
  return selectRandom(state, deps, healthy);
}

function selectRoundRobin(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  healthy: ServiceInstance[],
): RoutingResult {
  const index = state.roundRobinIndex % healthy.length;
  state.roundRobinIndex = state.roundRobinIndex + 1;

  const instance = healthy[index];
  if (instance === undefined) {
    throw new Error('Unreachable');
  }

  return {
    instance,
    strategy: 'ROUND_ROBIN',
    selectedAtMicros: deps.clock.nowMicroseconds(),
  };
}

function selectLeastConnections(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  healthy: ServiceInstance[],
): RoutingResult {
  let minConnections = Number.MAX_SAFE_INTEGER;
  let selected = healthy[0];

  for (const instance of healthy) {
    const conns = state.connections.get(instance.id) || 0;
    if (conns < minConnections) {
      minConnections = conns;
      selected = instance;
    }
  }

  if (selected === undefined) {
    throw new Error('Unreachable');
  }

  return {
    instance: selected,
    strategy: 'LEAST_CONNECTIONS',
    selectedAtMicros: deps.clock.nowMicroseconds(),
  };
}

function selectRandom(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  healthy: ServiceInstance[],
): RoutingResult {
  const index = Math.floor(Math.random() * healthy.length);
  const instance = healthy[index];

  if (instance === undefined) {
    throw new Error('Unreachable');
  }

  return {
    instance,
    strategy: 'RANDOM',
    selectedAtMicros: deps.clock.nowMicroseconds(),
  };
}

function markUnhealthy(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  instanceId: string,
): HealthResult {
  const health = state.health.get(instanceId);
  if (health === undefined) {
    return 'INSTANCE_NOT_FOUND';
  }

  state.health.set(instanceId, {
    ...health,
    health: 'UNHEALTHY',
    lastCheckMicros: deps.clock.nowMicroseconds(),
  });

  deps.logger.warn('Instance marked unhealthy', { instanceId });
  return 'OK';
}

function markHealthy(
  state: LoadBalancerState,
  deps: LoadBalancerDeps,
  instanceId: string,
): HealthResult {
  const health = state.health.get(instanceId);
  if (health === undefined) {
    return 'INSTANCE_NOT_FOUND';
  }

  state.health.set(instanceId, {
    ...health,
    health: 'HEALTHY',
    lastCheckMicros: deps.clock.nowMicroseconds(),
  });

  deps.logger.info('Instance marked healthy', { instanceId });
  return 'OK';
}

function incrementConnections(state: LoadBalancerState, instanceId: string): HealthResult {
  const current = state.connections.get(instanceId);
  if (current === undefined) {
    return 'INSTANCE_NOT_FOUND';
  }

  state.connections.set(instanceId, current + 1);
  return 'OK';
}

function decrementConnections(state: LoadBalancerState, instanceId: string): HealthResult {
  const current = state.connections.get(instanceId);
  if (current === undefined) {
    return 'INSTANCE_NOT_FOUND';
  }

  const newValue = Math.max(0, current - 1);
  state.connections.set(instanceId, newValue);
  return 'OK';
}

function setStrategy(state: LoadBalancerState, strategy: LoadStrategy): void {
  state.strategy = strategy;
  state.roundRobinIndex = 0;
}

function getStats(state: LoadBalancerState): LoadStats {
  const healthy = getHealthyInstances(state);
  const totalConns = Array.from(state.connections.values()).reduce((sum, c) => sum + c, 0);

  const avgConns = state.instances.size > 0 ? totalConns / state.instances.size : 0;

  return {
    totalInstances: state.instances.size,
    healthyInstances: healthy.length,
    totalRequests: state.totalRequests,
    strategy: state.strategy,
    averageConnections: avgConns,
  };
}

function getHealthyInstances(state: LoadBalancerState): ServiceInstance[] {
  const result: ServiceInstance[] = [];

  for (const instance of state.instances.values()) {
    const health = state.health.get(instance.id);
    if (health !== undefined && health.health === 'HEALTHY') {
      result.push(instance);
    }
  }

  return result;
}
