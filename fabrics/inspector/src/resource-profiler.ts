/**
 * Resource Profiler — CPU, memory, and I/O usage profiling per service.
 *
 * Accumulates resource samples, computes statistical profiles, and identifies
 * bottlenecks by severity tier (LOW/MEDIUM/HIGH) based on average usage.
 *
 * "The Inspector watches every thread, tracking where the weave strains."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ──────────────────────────────────────────────────────────

interface ResourceProfilerClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface ResourceProfilerIdGenPort {
  readonly next: () => string;
}

interface ResourceProfilerLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServiceName = string;
export type ProfileId = string;

export type ProfilerError =
  | 'service-not-found'
  | 'profile-not-found'
  | 'already-registered'
  | 'invalid-sample';

export type ResourceType = 'CPU' | 'MEMORY' | 'DISK_IO' | 'NETWORK_IO' | 'GPU';

export interface ResourceSample {
  readonly sampleId: string;
  readonly serviceName: ServiceName;
  readonly resourceType: ResourceType;
  readonly usagePercent: number;
  readonly timestamp: bigint;
}

export interface ResourceProfile {
  readonly serviceName: ServiceName;
  readonly resourceType: ResourceType;
  readonly sampleCount: number;
  readonly avgUsage: number;
  readonly peakUsage: number;
  readonly minUsage: number;
  readonly p95Usage: number;
  readonly lastSampledAt: bigint;
}

export interface BottleneckReport {
  readonly serviceName: ServiceName;
  readonly bottlenecks: ReadonlyArray<{
    readonly resourceType: ResourceType;
    readonly avgUsage: number;
    readonly severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface ResourceProfilerSystem {
  registerService(
    serviceName: ServiceName,
  ): { success: true } | { success: false; error: ProfilerError };
  recordSample(
    serviceName: ServiceName,
    resourceType: ResourceType,
    usagePercent: number,
  ): ResourceSample | ProfilerError;
  getProfile(serviceName: ServiceName, resourceType: ResourceType): ResourceProfile | undefined;
  getBottleneckReport(serviceName: ServiceName): BottleneckReport | undefined;
  listSamples(
    serviceName: ServiceName,
    resourceType: ResourceType,
    limit: number,
  ): ReadonlyArray<ResourceSample>;
  purgeSamples(
    serviceName: ServiceName,
    resourceType: ResourceType,
    keepLast: number,
  ): { success: true; purged: number } | { success: false; error: ProfilerError };
}

// ─── Deps ─────────────────────────────────────────────────────────────────────

export interface ResourceProfilerSystemDeps {
  readonly clock: ResourceProfilerClockPort;
  readonly idGen: ResourceProfilerIdGenPort;
  readonly logger: ResourceProfilerLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

type SampleKey = string;

interface ProfilerState {
  readonly services: Set<ServiceName>;
  readonly samples: Map<SampleKey, ResourceSample[]>;
  readonly deps: ResourceProfilerSystemDeps;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createResourceProfilerSystem(
  deps: ResourceProfilerSystemDeps,
): ResourceProfilerSystem {
  const state: ProfilerState = {
    services: new Set(),
    samples: new Map(),
    deps,
  };

  return {
    registerService: (serviceName) => registerServiceImpl(state, serviceName),
    recordSample: (serviceName, resourceType, usagePercent) =>
      recordSampleImpl(state, serviceName, resourceType, usagePercent),
    getProfile: (serviceName, resourceType) => getProfileImpl(state, serviceName, resourceType),
    getBottleneckReport: (serviceName) => getBottleneckReportImpl(state, serviceName),
    listSamples: (serviceName, resourceType, limit) =>
      listSamplesImpl(state, serviceName, resourceType, limit),
    purgeSamples: (serviceName, resourceType, keepLast) =>
      purgeSamplesImpl(state, serviceName, resourceType, keepLast),
  };
}

// ─── Register Service ─────────────────────────────────────────────────────────

function registerServiceImpl(
  state: ProfilerState,
  serviceName: ServiceName,
): { success: true } | { success: false; error: ProfilerError } {
  if (state.services.has(serviceName)) return { success: false, error: 'already-registered' };
  state.services.add(serviceName);
  state.deps.logger.info('profiler-service-registered', { serviceName });
  return { success: true };
}

// ─── Record Sample ────────────────────────────────────────────────────────────

function recordSampleImpl(
  state: ProfilerState,
  serviceName: ServiceName,
  resourceType: ResourceType,
  usagePercent: number,
): ResourceSample | ProfilerError {
  if (!state.services.has(serviceName)) return 'service-not-found';
  if (usagePercent < 0 || usagePercent > 100) return 'invalid-sample';

  const sample: ResourceSample = {
    sampleId: state.deps.idGen.next(),
    serviceName,
    resourceType,
    usagePercent,
    timestamp: state.deps.clock.nowMicroseconds(),
  };

  const key = sampleKey(serviceName, resourceType);
  const existing = state.samples.get(key) ?? [];
  existing.push(sample);
  state.samples.set(key, existing);

  return sample;
}

// ─── Get Profile ──────────────────────────────────────────────────────────────

function getProfileImpl(
  state: ProfilerState,
  serviceName: ServiceName,
  resourceType: ResourceType,
): ResourceProfile | undefined {
  if (!state.services.has(serviceName)) return undefined;

  const key = sampleKey(serviceName, resourceType);
  const list = state.samples.get(key);
  if (list === undefined || list.length === 0) return undefined;

  const values = list.map((s) => s.usagePercent);
  const sorted = [...values].sort((a, b) => a - b);
  const p95Index = Math.floor(list.length * 0.95);
  const lastSample = list[list.length - 1];

  return {
    serviceName,
    resourceType,
    sampleCount: list.length,
    avgUsage: values.reduce((a, b) => a + b, 0) / values.length,
    peakUsage: Math.max(...values),
    minUsage: Math.min(...values),
    p95Usage: sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0,
    lastSampledAt: lastSample?.timestamp ?? 0n,
  };
}

// ─── Bottleneck Report ────────────────────────────────────────────────────────

function getBottleneckReportImpl(
  state: ProfilerState,
  serviceName: ServiceName,
): BottleneckReport | undefined {
  if (!state.services.has(serviceName)) return undefined;

  const resourceTypes: ResourceType[] = ['CPU', 'MEMORY', 'DISK_IO', 'NETWORK_IO', 'GPU'];
  const bottlenecks: BottleneckReport['bottlenecks'][number][] = [];

  for (const resourceType of resourceTypes) {
    const profile = getProfileImpl(state, serviceName, resourceType);
    if (profile === undefined) continue;

    const severity = computeSeverity(profile.avgUsage);
    if (severity === null) continue;

    bottlenecks.push({ resourceType, avgUsage: profile.avgUsage, severity });
  }

  return { serviceName, bottlenecks };
}

function computeSeverity(avgUsage: number): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (avgUsage >= 90) return 'HIGH';
  if (avgUsage >= 70) return 'MEDIUM';
  if (avgUsage >= 50) return 'LOW';
  return null;
}

// ─── List Samples ─────────────────────────────────────────────────────────────

function listSamplesImpl(
  state: ProfilerState,
  serviceName: ServiceName,
  resourceType: ResourceType,
  limit: number,
): ReadonlyArray<ResourceSample> {
  const key = sampleKey(serviceName, resourceType);
  const list = state.samples.get(key) ?? [];
  return list.slice(-limit);
}

// ─── Purge Samples ────────────────────────────────────────────────────────────

function purgeSamplesImpl(
  state: ProfilerState,
  serviceName: ServiceName,
  resourceType: ResourceType,
  keepLast: number,
): { success: true; purged: number } | { success: false; error: ProfilerError } {
  if (!state.services.has(serviceName)) return { success: false, error: 'service-not-found' };

  const key = sampleKey(serviceName, resourceType);
  const list = state.samples.get(key) ?? [];
  const originalLength = list.length;
  const kept = list.slice(-keepLast);
  state.samples.set(key, kept);

  const purged = originalLength - kept.length;
  if (purged > 0) {
    state.deps.logger.info('profiler-samples-purged', { serviceName, resourceType, purged });
  }

  return { success: true, purged };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sampleKey(serviceName: ServiceName, resourceType: ResourceType): SampleKey {
  return serviceName + '::' + resourceType;
}
