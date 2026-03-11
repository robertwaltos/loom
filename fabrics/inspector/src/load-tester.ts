/**
 * Load Tester — Simulate load scenarios and measure system performance.
 *
 * Defines virtual user scenarios, tracks latency distributions, computes
 * percentiles, measures throughput. All latencies in bigint microseconds.
 */

export type ResourceType = 'CPU' | 'MEMORY' | 'NETWORK' | 'STORAGE' | 'API_CALLS';

export type OperationType = 'READ' | 'WRITE' | 'DELETE' | 'QUERY' | 'COMPUTE' | 'NETWORK';

export interface Operation {
  readonly type: OperationType;
  readonly weight: number;
  readonly minLatencyUs: bigint;
  readonly maxLatencyUs: bigint;
}

export interface OperationMix {
  readonly operations: ReadonlyArray<Operation>;
  readonly totalWeight: number;
}

export interface VirtualUser {
  readonly userId: string;
  readonly startedAt: bigint;
  readonly completedOps: number;
  readonly errorCount: number;
}

export interface LoadScenario {
  readonly scenarioId: string;
  readonly virtualUserCount: number;
  readonly rampUpDurationUs: bigint;
  readonly testDurationUs: bigint;
  readonly operationMix: OperationMix;
  readonly createdAt: bigint;
}

export interface LatencyBucket {
  readonly minUs: bigint;
  readonly maxUs: bigint;
  readonly count: number;
}

export interface ThroughputResult {
  readonly totalOps: number;
  readonly successfulOps: number;
  readonly failedOps: number;
  readonly durationUs: bigint;
  readonly opsPerSecond: number;
  readonly errorRate: number;
}

export interface PercentileData {
  readonly p50: bigint;
  readonly p95: bigint;
  readonly p99: bigint;
  readonly min: bigint;
  readonly max: bigint;
  readonly mean: bigint;
}

export interface LoadTestReport {
  readonly scenarioId: string;
  readonly virtualUsers: number;
  readonly latencies: PercentileData;
  readonly throughput: ThroughputResult;
  readonly buckets: ReadonlyArray<LatencyBucket>;
  readonly generatedAt: bigint;
}

export interface ScenarioComparison {
  readonly scenarioA: string;
  readonly scenarioB: string;
  readonly p50Diff: bigint;
  readonly p95Diff: bigint;
  readonly p99Diff: bigint;
  readonly throughputDiff: number;
  readonly errorRateDiff: number;
}

export type LoadTesterError =
  | 'scenario-not-found'
  | 'invalid-user-count'
  | 'invalid-duration'
  | 'invalid-operation-mix'
  | 'empty-latencies'
  | 'comparison-missing-scenario';

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

interface LoadTesterState {
  scenarios: Map<string, LoadScenario>;
  activeUsers: Map<string, ReadonlyArray<VirtualUser>>;
  latencies: Map<string, Array<bigint>>;
  throughputData: Map<string, ThroughputResult>;
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

interface LoadTesterDeps {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}

export function createLoadTester(deps: LoadTesterDeps): LoadTesterState {
  return {
    scenarios: new Map(),
    activeUsers: new Map(),
    latencies: new Map(),
    throughputData: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
}

export function defineScenario(
  state: LoadTesterState,
  userCount: number,
  rampUpUs: bigint,
  durationUs: bigint,
  mix: OperationMix,
): LoadScenario | LoadTesterError {
  if (userCount <= 0) {
    return 'invalid-user-count';
  }
  if (durationUs <= 0n) {
    return 'invalid-duration';
  }
  if (mix.operations.length === 0) {
    return 'invalid-operation-mix';
  }
  const scenarioId = state.idGen.generate();
  const scenario: LoadScenario = {
    scenarioId,
    virtualUserCount: userCount,
    rampUpDurationUs: rampUpUs,
    testDurationUs: durationUs,
    operationMix: mix,
    createdAt: state.clock.nowUs(),
  };
  state.scenarios.set(scenarioId, scenario);
  state.logger.info('scenario-defined id=' + scenarioId);
  return scenario;
}

export function addOperation(mix: OperationMix, op: Operation): OperationMix {
  const newOps = [...mix.operations, op];
  const newWeight = mix.totalWeight + op.weight;
  return { operations: newOps, totalWeight: newWeight };
}

export function createOperationMix(): OperationMix {
  return { operations: [], totalWeight: 0 };
}

function selectOperation(mix: OperationMix, rand: number): Operation {
  const target = rand * mix.totalWeight;
  let acc = 0;
  for (const op of mix.operations) {
    acc = acc + op.weight;
    if (target < acc) {
      return op;
    }
  }
  const last = mix.operations[mix.operations.length - 1];
  if (last === undefined) {
    const fallback: Operation = {
      type: 'READ',
      weight: 1,
      minLatencyUs: 100n,
      maxLatencyUs: 1000n,
    };
    return fallback;
  }
  return last;
}

function simulateOpLatency(op: Operation, rand: number): bigint {
  const range = op.maxLatencyUs - op.minLatencyUs;
  const randBigInt = BigInt(Math.floor(Number(range) * rand));
  return op.minLatencyUs + randBigInt;
}

export function runScenario(state: LoadTesterState, scenarioId: string): LoadTesterError | 'ok' {
  const scenario = state.scenarios.get(scenarioId);
  if (scenario === undefined) {
    return 'scenario-not-found';
  }
  const users: VirtualUser[] = [];
  const latencies: bigint[] = [];
  let totalOps = 0;
  let errorCount = 0;
  const startUs = state.clock.nowUs();
  for (let i = 0; i < scenario.virtualUserCount; i = i + 1) {
    const userId = state.idGen.generate();
    const userStartUs =
      startUs + (scenario.rampUpDurationUs * BigInt(i)) / BigInt(scenario.virtualUserCount);
    let opsCompleted = 0;
    let userErrors = 0;
    const opsPerUser = 10;
    for (let j = 0; j < opsPerUser; j = j + 1) {
      const op = selectOperation(scenario.operationMix, Math.random());
      const latency = simulateOpLatency(op, Math.random());
      latencies.push(latency);
      opsCompleted = opsCompleted + 1;
      totalOps = totalOps + 1;
      if (Math.random() < 0.02) {
        userErrors = userErrors + 1;
        errorCount = errorCount + 1;
      }
    }
    const user: VirtualUser = {
      userId,
      startedAt: userStartUs,
      completedOps: opsCompleted,
      errorCount: userErrors,
    };
    users.push(user);
  }
  const endUs = state.clock.nowUs();
  const durationUs = endUs - startUs;
  const successOps = totalOps - errorCount;
  const effectiveDurationUs = durationUs > 0n ? durationUs : scenario.testDurationUs;
  const durationSec = Number(effectiveDurationUs) / 1_000_000;
  const opsPerSec = durationSec > 0 ? totalOps / durationSec : 0;
  const errRate = totalOps > 0 ? errorCount / totalOps : 0;
  const throughput: ThroughputResult = {
    totalOps,
    successfulOps: successOps,
    failedOps: errorCount,
    durationUs,
    opsPerSecond: opsPerSec,
    errorRate: errRate,
  };
  state.activeUsers.set(scenarioId, users);
  state.latencies.set(scenarioId, latencies);
  state.throughputData.set(scenarioId, throughput);
  state.logger.info('scenario-run id=' + scenarioId + ' ops=' + String(totalOps));
  return 'ok';
}

export function recordLatency(
  state: LoadTesterState,
  scenarioId: string,
  latencyUs: bigint,
): 'ok' | LoadTesterError {
  const scenario = state.scenarios.get(scenarioId);
  if (scenario === undefined) {
    return 'scenario-not-found';
  }
  const arr = state.latencies.get(scenarioId);
  if (arr === undefined) {
    state.latencies.set(scenarioId, [latencyUs]);
  } else {
    arr.push(latencyUs);
  }
  return 'ok';
}

function sortBigIntArray(arr: bigint[]): bigint[] {
  return arr.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

export function computePercentiles(
  state: LoadTesterState,
  scenarioId: string,
): PercentileData | LoadTesterError {
  const latencies = state.latencies.get(scenarioId);
  if (latencies === undefined || latencies.length === 0) {
    return 'empty-latencies';
  }
  const sorted = sortBigIntArray([...latencies]);
  const len = sorted.length;
  const p50Idx = Math.floor(len * 0.5);
  const p95Idx = Math.floor(len * 0.95);
  const p99Idx = Math.floor(len * 0.99);
  const p50Val = sorted[p50Idx];
  const p95Val = sorted[p95Idx];
  const p99Val = sorted[p99Idx];
  const minVal = sorted[0];
  const maxVal = sorted[len - 1];
  if (
    p50Val === undefined ||
    p95Val === undefined ||
    p99Val === undefined ||
    minVal === undefined ||
    maxVal === undefined
  ) {
    return 'empty-latencies';
  }
  let sum = 0n;
  for (const val of sorted) {
    sum = sum + val;
  }
  const mean = sum / BigInt(len);
  return { p50: p50Val, p95: p95Val, p99: p99Val, min: minVal, max: maxVal, mean };
}

function createLatencyBuckets(latencies: bigint[]): LatencyBucket[] {
  const bucketRanges: Array<[bigint, bigint]> = [
    [0n, 1000n],
    [1000n, 10000n],
    [10000n, 100000n],
    [100000n, 1000000n],
    [1000000n, 10000000n],
  ];
  const buckets: LatencyBucket[] = [];
  for (const range of bucketRanges) {
    const minUs = range[0];
    const maxUs = range[1];
    if (minUs === undefined || maxUs === undefined) continue;
    let count = 0;
    for (const lat of latencies) {
      if (lat >= minUs && lat < maxUs) {
        count = count + 1;
      }
    }
    buckets.push({ minUs, maxUs, count });
  }
  return buckets;
}

export function getReport(
  state: LoadTesterState,
  scenarioId: string,
): LoadTestReport | LoadTesterError {
  const scenario = state.scenarios.get(scenarioId);
  if (scenario === undefined) {
    return 'scenario-not-found';
  }
  const percResult = computePercentiles(state, scenarioId);
  if (typeof percResult === 'string') {
    return percResult;
  }
  const throughput = state.throughputData.get(scenarioId);
  if (throughput === undefined) {
    return 'scenario-not-found';
  }
  const latencies = state.latencies.get(scenarioId);
  if (latencies === undefined) {
    return 'empty-latencies';
  }
  const buckets = createLatencyBuckets(latencies);
  return {
    scenarioId,
    virtualUsers: scenario.virtualUserCount,
    latencies: percResult,
    throughput,
    buckets,
    generatedAt: state.clock.nowUs(),
  };
}

export function compareScenarios(
  state: LoadTesterState,
  scenarioIdA: string,
  scenarioIdB: string,
): ScenarioComparison | LoadTesterError {
  const reportA = getReport(state, scenarioIdA);
  if (typeof reportA === 'string') {
    return 'comparison-missing-scenario';
  }
  const reportB = getReport(state, scenarioIdB);
  if (typeof reportB === 'string') {
    return 'comparison-missing-scenario';
  }
  const p50Diff = reportB.latencies.p50 - reportA.latencies.p50;
  const p95Diff = reportB.latencies.p95 - reportA.latencies.p95;
  const p99Diff = reportB.latencies.p99 - reportA.latencies.p99;
  const tpDiff = reportB.throughput.opsPerSecond - reportA.throughput.opsPerSecond;
  const errDiff = reportB.throughput.errorRate - reportA.throughput.errorRate;
  return {
    scenarioA: scenarioIdA,
    scenarioB: scenarioIdB,
    p50Diff,
    p95Diff,
    p99Diff,
    throughputDiff: tpDiff,
    errorRateDiff: errDiff,
  };
}

export function getScenario(
  state: LoadTesterState,
  scenarioId: string,
): LoadScenario | LoadTesterError {
  const scenario = state.scenarios.get(scenarioId);
  if (scenario === undefined) {
    return 'scenario-not-found';
  }
  return scenario;
}

export function listScenarios(state: LoadTesterState): ReadonlyArray<LoadScenario> {
  return Array.from(state.scenarios.values());
}

export function getVirtualUsers(
  state: LoadTesterState,
  scenarioId: string,
): ReadonlyArray<VirtualUser> | LoadTesterError {
  const users = state.activeUsers.get(scenarioId);
  if (users === undefined) {
    return 'scenario-not-found';
  }
  return users;
}

export function clearScenario(state: LoadTesterState, scenarioId: string): 'ok' | LoadTesterError {
  const scenario = state.scenarios.get(scenarioId);
  if (scenario === undefined) {
    return 'scenario-not-found';
  }
  state.scenarios.delete(scenarioId);
  state.activeUsers.delete(scenarioId);
  state.latencies.delete(scenarioId);
  state.throughputData.delete(scenarioId);
  state.logger.info('scenario-cleared id=' + scenarioId);
  return 'ok';
}
