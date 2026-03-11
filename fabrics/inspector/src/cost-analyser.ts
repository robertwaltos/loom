/**
 * Cost Analyser — Track resource costs, detect waste, measure efficiency.
 *
 * Per-service and per-operation cost breakdown. Waste detection
 * (allocated but unused). Efficiency scores. Cost trends over time.
 */

export type ResourceType = 'CPU' | 'MEMORY' | 'NETWORK' | 'STORAGE' | 'API_CALLS';

export interface ResourceCost {
  readonly resourceType: ResourceType;
  readonly amount: bigint;
  readonly unit: string;
  readonly recordedAt: bigint;
}

export interface ServiceCosts {
  readonly serviceId: string;
  readonly costs: ReadonlyMap<ResourceType, bigint>;
  readonly totalCost: bigint;
}

export interface OperationCost {
  readonly operationId: string;
  readonly serviceId: string;
  readonly resourceType: ResourceType;
  readonly allocated: bigint;
  readonly used: bigint;
  readonly wasted: bigint;
  readonly recordedAt: bigint;
}

export interface WasteReport {
  readonly serviceId: string;
  readonly resourceType: ResourceType;
  readonly totalAllocated: bigint;
  readonly totalUsed: bigint;
  readonly totalWasted: bigint;
  readonly wastePercentage: number;
  readonly generatedAt: bigint;
}

export interface EfficiencyScore {
  readonly serviceId: string;
  readonly score: number;
  readonly cpuEfficiency: number;
  readonly memoryEfficiency: number;
  readonly networkEfficiency: number;
  readonly storageEfficiency: number;
  readonly computedAt: bigint;
}

export interface CostTrend {
  readonly serviceId: string;
  readonly resourceType: ResourceType;
  readonly windowStartUs: bigint;
  readonly windowEndUs: bigint;
  readonly dataPoints: ReadonlyArray<CostDataPoint>;
  readonly averageCost: bigint;
  readonly peakCost: bigint;
}

export interface CostDataPoint {
  readonly timestampUs: bigint;
  readonly cost: bigint;
}

export interface CostReport {
  readonly generatedAt: bigint;
  readonly services: ReadonlyArray<ServiceCosts>;
  readonly totalCost: bigint;
  readonly topWasters: ReadonlyArray<WasteReport>;
  readonly efficiencyScores: ReadonlyArray<EfficiencyScore>;
}

export type CostAnalyserError =
  | 'service-not-found'
  | 'invalid-amount'
  | 'empty-cost-data'
  | 'invalid-time-window';

interface Clock {
  nowUs(): bigint;
}

interface IdGenerator {
  generate(): string;
}

interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

interface CostAnalyserState {
  serviceCosts: Map<string, Map<ResourceType, bigint>>;
  operationCosts: Map<string, Array<OperationCost>>;
  costHistory: Map<string, Array<CostDataPoint>>;
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

interface CostAnalyserDeps {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

export function createCostAnalyser(deps: CostAnalyserDeps): CostAnalyserState {
  return {
    serviceCosts: new Map(),
    operationCosts: new Map(),
    costHistory: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
}

function ensureServiceCostMap(
  state: CostAnalyserState,
  serviceId: string,
): Map<ResourceType, bigint> {
  const existing = state.serviceCosts.get(serviceId);
  if (existing !== undefined) {
    return existing;
  }
  const newMap = new Map<ResourceType, bigint>();
  state.serviceCosts.set(serviceId, newMap);
  return newMap;
}

export function recordCost(
  state: CostAnalyserState,
  serviceId: string,
  resourceType: ResourceType,
  amount: bigint,
): 'ok' | CostAnalyserError {
  if (amount < 0n) {
    return 'invalid-amount';
  }
  const costMap = ensureServiceCostMap(state, serviceId);
  const current = costMap.get(resourceType);
  const newAmount = current === undefined ? amount : current + amount;
  costMap.set(resourceType, newAmount);
  const historyKey = serviceId + ':' + resourceType;
  const history = state.costHistory.get(historyKey);
  const dataPoint: CostDataPoint = {
    timestampUs: state.clock.nowUs(),
    cost: amount,
  };
  if (history === undefined) {
    state.costHistory.set(historyKey, [dataPoint]);
  } else {
    history.push(dataPoint);
  }
  state.logger.debug('cost-recorded svc=' + serviceId + ' res=' + resourceType);
  return 'ok';
}

export function recordOperationCost(
  state: CostAnalyserState,
  serviceId: string,
  operationId: string,
  resourceType: ResourceType,
  allocated: bigint,
  used: bigint,
): 'ok' | CostAnalyserError {
  if (allocated < 0n || used < 0n) {
    return 'invalid-amount';
  }
  const wasted = allocated - used;
  const opCost: OperationCost = {
    operationId,
    serviceId,
    resourceType,
    allocated,
    used,
    wasted,
    recordedAt: state.clock.nowUs(),
  };
  const arr = state.operationCosts.get(serviceId);
  if (arr === undefined) {
    state.operationCosts.set(serviceId, [opCost]);
  } else {
    arr.push(opCost);
  }
  return 'ok';
}

export function getServiceCosts(
  state: CostAnalyserState,
  serviceId: string,
): ServiceCosts | CostAnalyserError {
  const costMap = state.serviceCosts.get(serviceId);
  if (costMap === undefined) {
    return 'service-not-found';
  }
  let total = 0n;
  for (const val of costMap.values()) {
    total = total + val;
  }
  return {
    serviceId,
    costs: new Map(costMap),
    totalCost: total,
  };
}

export function detectWaste(
  state: CostAnalyserState,
  serviceId: string,
  resourceType: ResourceType,
): WasteReport | CostAnalyserError {
  const ops = state.operationCosts.get(serviceId);
  if (ops === undefined) {
    return 'service-not-found';
  }
  let totalAllocated = 0n;
  let totalUsed = 0n;
  let totalWasted = 0n;
  for (const op of ops) {
    if (op.resourceType === resourceType) {
      totalAllocated = totalAllocated + op.allocated;
      totalUsed = totalUsed + op.used;
      totalWasted = totalWasted + op.wasted;
    }
  }
  const wastePercent =
    totalAllocated > 0n ? Number((totalWasted * 10000n) / totalAllocated) / 100 : 0;
  return {
    serviceId,
    resourceType,
    totalAllocated,
    totalUsed,
    totalWasted,
    wastePercentage: wastePercent,
    generatedAt: state.clock.nowUs(),
  };
}

function computeResourceEfficiency(
  state: CostAnalyserState,
  serviceId: string,
  resourceType: ResourceType,
): number {
  const ops = state.operationCosts.get(serviceId);
  if (ops === undefined) {
    return 1.0;
  }
  let totalAllocated = 0n;
  let totalUsed = 0n;
  for (const op of ops) {
    if (op.resourceType === resourceType) {
      totalAllocated = totalAllocated + op.allocated;
      totalUsed = totalUsed + op.used;
    }
  }
  if (totalAllocated === 0n) {
    return 1.0;
  }
  const efficiency = Number((totalUsed * 10000n) / totalAllocated) / 10000;
  return efficiency;
}

export function computeEfficiency(
  state: CostAnalyserState,
  serviceId: string,
): EfficiencyScore | CostAnalyserError {
  const ops = state.operationCosts.get(serviceId);
  if (ops === undefined) {
    return 'service-not-found';
  }
  const cpuEff = computeResourceEfficiency(state, serviceId, 'CPU');
  const memEff = computeResourceEfficiency(state, serviceId, 'MEMORY');
  const netEff = computeResourceEfficiency(state, serviceId, 'NETWORK');
  const storEff = computeResourceEfficiency(state, serviceId, 'STORAGE');
  const overallScore = (cpuEff + memEff + netEff + storEff) / 4;
  return {
    serviceId,
    score: overallScore,
    cpuEfficiency: cpuEff,
    memoryEfficiency: memEff,
    networkEfficiency: netEff,
    storageEfficiency: storEff,
    computedAt: state.clock.nowUs(),
  };
}

export function getCostTrend(
  state: CostAnalyserState,
  serviceId: string,
  resourceType: ResourceType,
  windowStartUs: bigint,
  windowEndUs: bigint,
): CostTrend | CostAnalyserError {
  if (windowStartUs >= windowEndUs) {
    return 'invalid-time-window';
  }
  const historyKey = serviceId + ':' + resourceType;
  const history = state.costHistory.get(historyKey);
  if (history === undefined) {
    return 'service-not-found';
  }
  const filtered: CostDataPoint[] = [];
  for (const dp of history) {
    if (dp.timestampUs >= windowStartUs && dp.timestampUs <= windowEndUs) {
      filtered.push(dp);
    }
  }
  let sum = 0n;
  let peak = 0n;
  for (const dp of filtered) {
    sum = sum + dp.cost;
    if (dp.cost > peak) {
      peak = dp.cost;
    }
  }
  const avg = filtered.length > 0 ? sum / BigInt(filtered.length) : 0n;
  return {
    serviceId,
    resourceType,
    windowStartUs,
    windowEndUs,
    dataPoints: filtered,
    averageCost: avg,
    peakCost: peak,
  };
}

export function getCostReport(state: CostAnalyserState): CostReport | CostAnalyserError {
  const services: ServiceCosts[] = [];
  let totalCost = 0n;
  for (const serviceId of state.serviceCosts.keys()) {
    const svcCosts = getServiceCosts(state, serviceId);
    if (typeof svcCosts !== 'string') {
      services.push(svcCosts);
      totalCost = totalCost + svcCosts.totalCost;
    }
  }
  const wastReports: WasteReport[] = [];
  for (const serviceId of state.operationCosts.keys()) {
    const resourceTypes: ResourceType[] = ['CPU', 'MEMORY', 'NETWORK', 'STORAGE', 'API_CALLS'];
    for (const resType of resourceTypes) {
      const wasteResult = detectWaste(state, serviceId, resType);
      if (typeof wasteResult !== 'string') {
        if (wasteResult.totalWasted > 0n) {
          wastReports.push(wasteResult);
        }
      }
    }
  }
  wastReports.sort((a, b) => {
    if (a.totalWasted > b.totalWasted) return -1;
    if (a.totalWasted < b.totalWasted) return 1;
    return 0;
  });
  const topWasters = wastReports.slice(0, 10);
  const effScores: EfficiencyScore[] = [];
  for (const serviceId of state.operationCosts.keys()) {
    const effResult = computeEfficiency(state, serviceId);
    if (typeof effResult !== 'string') {
      effScores.push(effResult);
    }
  }
  return {
    generatedAt: state.clock.nowUs(),
    services,
    totalCost,
    topWasters,
    efficiencyScores: effScores,
  };
}

export function compareServices(
  state: CostAnalyserState,
  serviceIdA: string,
  serviceIdB: string,
):
  | {
      serviceA: ServiceCosts;
      serviceB: ServiceCosts;
      costDiff: bigint;
      efficiencyA: EfficiencyScore;
      efficiencyB: EfficiencyScore;
      efficiencyDiff: number;
    }
  | CostAnalyserError {
  const costsA = getServiceCosts(state, serviceIdA);
  if (typeof costsA === 'string') {
    return costsA;
  }
  const costsB = getServiceCosts(state, serviceIdB);
  if (typeof costsB === 'string') {
    return costsB;
  }
  const effA = computeEfficiency(state, serviceIdA);
  const effB = computeEfficiency(state, serviceIdB);
  if (typeof effA === 'string') {
    return effA;
  }
  if (typeof effB === 'string') {
    return effB;
  }
  const costDiff = costsB.totalCost - costsA.totalCost;
  const effDiff = effB.score - effA.score;
  return {
    serviceA: costsA,
    serviceB: costsB,
    costDiff,
    efficiencyA: effA,
    efficiencyB: effB,
    efficiencyDiff: effDiff,
  };
}

export function listServices(state: CostAnalyserState): string[] {
  return Array.from(state.serviceCosts.keys());
}

export function clearService(
  state: CostAnalyserState,
  serviceId: string,
): 'ok' | CostAnalyserError {
  const exists = state.serviceCosts.get(serviceId);
  if (exists === undefined) {
    return 'service-not-found';
  }
  state.serviceCosts.delete(serviceId);
  state.operationCosts.delete(serviceId);
  const resourceTypes: ResourceType[] = ['CPU', 'MEMORY', 'NETWORK', 'STORAGE', 'API_CALLS'];
  for (const resType of resourceTypes) {
    const historyKey = serviceId + ':' + resType;
    state.costHistory.delete(historyKey);
  }
  state.logger.info('service-cleared id=' + serviceId);
  return 'ok';
}
