/**
 * System Scheduler — DAG-based system execution scheduling.
 *
 * Resolves system dependencies into a valid execution order using
 * topological sort. Detects parallel execution groups (systems with
 * no mutual dependencies), organizes into execution phases (pre-update,
 * update, post-update, render), tracks per-system execution timing,
 * and supports enable/disable at runtime.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ExecutionPhase = 'pre-update' | 'update' | 'post-update' | 'render';

export interface SystemDefinition {
  readonly systemId: string;
  readonly phase: ExecutionPhase;
  readonly dependsOn: ReadonlyArray<string>;
  readonly enabled: boolean;
  readonly registeredAt: number;
}

export interface ParallelGroup {
  readonly systems: ReadonlyArray<string>;
  readonly phase: ExecutionPhase;
}

export interface ExecutionPlan {
  readonly phases: ReadonlyArray<PhasePlan>;
  readonly totalSystems: number;
  readonly valid: boolean;
}

export interface PhasePlan {
  readonly phase: ExecutionPhase;
  readonly groups: ReadonlyArray<ParallelGroup>;
  readonly systemCount: number;
}

export interface ExecutionTiming {
  readonly systemId: string;
  readonly lastDurationMicros: number;
  readonly totalDurationMicros: number;
  readonly executionCount: number;
  readonly averageDurationMicros: number;
}

export interface SystemSchedulerStats {
  readonly totalSystems: number;
  readonly enabledSystems: number;
  readonly disabledSystems: number;
  readonly totalEdges: number;
  readonly hasCycle: boolean;
  readonly phaseDistribution: Readonly<Record<ExecutionPhase, number>>;
}

export interface SystemSchedulerDeps {
  readonly clock: { nowMicroseconds(): number };
}

export interface SystemScheduler {
  register(systemId: string, phase: ExecutionPhase, dependsOn?: ReadonlyArray<string>): boolean;
  unregister(systemId: string): boolean;
  enable(systemId: string): boolean;
  disable(systemId: string): boolean;
  isEnabled(systemId: string): boolean;
  getDefinition(systemId: string): SystemDefinition | undefined;
  buildPlan(): ExecutionPlan;
  recordExecution(systemId: string, durationMicros: number): boolean;
  getTiming(systemId: string): ExecutionTiming | undefined;
  getAllTimings(): ReadonlyArray<ExecutionTiming>;
  getStats(): SystemSchedulerStats;
}

// ─── Constants ──────────────────────────────────────────────────────

const PHASE_ORDER: ReadonlyArray<ExecutionPhase> = [
  'pre-update',
  'update',
  'post-update',
  'render',
];

// ─── State ──────────────────────────────────────────────────────────

interface MutableDefinition {
  readonly systemId: string;
  readonly phase: ExecutionPhase;
  readonly dependsOn: string[];
  enabled: boolean;
  readonly registeredAt: number;
}

interface TimingRecord {
  lastDurationMicros: number;
  totalDurationMicros: number;
  executionCount: number;
}

interface SchedulerState {
  readonly systems: Map<string, MutableDefinition>;
  readonly edges: Map<string, string[]>;
  readonly reverseEdges: Map<string, string[]>;
  readonly timings: Map<string, TimingRecord>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ────────────────────────────────────────────────────────

export function createSystemScheduler(deps: SystemSchedulerDeps): SystemScheduler {
  const state: SchedulerState = {
    systems: new Map(),
    edges: new Map(),
    reverseEdges: new Map(),
    timings: new Map(),
    clock: deps.clock,
  };

  return {
    register: (id, phase, deps2) => registerImpl(state, id, phase, deps2),
    unregister: (id) => unregisterImpl(state, id),
    enable: (id) => setEnabledImpl(state, id, true),
    disable: (id) => setEnabledImpl(state, id, false),
    isEnabled: (id) => isEnabledImpl(state, id),
    getDefinition: (id) => getDefinitionImpl(state, id),
    buildPlan: () => buildPlanImpl(state),
    recordExecution: (id, dur) => recordExecutionImpl(state, id, dur),
    getTiming: (id) => getTimingImpl(state, id),
    getAllTimings: () => getAllTimingsImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Register / Unregister ──────────────────────────────────────────

function registerImpl(
  state: SchedulerState,
  systemId: string,
  phase: ExecutionPhase,
  dependsOn?: ReadonlyArray<string>,
): boolean {
  if (state.systems.has(systemId)) return false;
  const deps = dependsOn ? [...dependsOn] : [];
  const def: MutableDefinition = {
    systemId,
    phase,
    dependsOn: deps,
    enabled: true,
    registeredAt: state.clock.nowMicroseconds(),
  };
  state.systems.set(systemId, def);
  state.edges.set(systemId, [...deps]);
  for (const dep of deps) {
    addReverseEdge(state, dep, systemId);
  }
  return true;
}

function addReverseEdge(state: SchedulerState, from: string, to: string): void {
  const list = state.reverseEdges.get(from);
  if (list !== undefined) {
    list.push(to);
  } else {
    state.reverseEdges.set(from, [to]);
  }
}

function unregisterImpl(state: SchedulerState, systemId: string): boolean {
  if (!state.systems.has(systemId)) return false;
  state.systems.delete(systemId);
  state.edges.delete(systemId);
  state.timings.delete(systemId);
  removeAllEdgesFor(state.reverseEdges, systemId);
  removeAllEdgesFor(state.edges, systemId);
  return true;
}

function removeAllEdgesFor(edgeMap: Map<string, string[]>, id: string): void {
  edgeMap.delete(id);
  for (const list of edgeMap.values()) {
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
  }
}

// ─── Enable / Disable ───────────────────────────────────────────────

function setEnabledImpl(state: SchedulerState, systemId: string, enabled: boolean): boolean {
  const def = state.systems.get(systemId);
  if (def === undefined) return false;
  def.enabled = enabled;
  return true;
}

function isEnabledImpl(state: SchedulerState, systemId: string): boolean {
  const def = state.systems.get(systemId);
  return def !== undefined && def.enabled;
}

// ─── Get Definition ─────────────────────────────────────────────────

function getDefinitionImpl(state: SchedulerState, systemId: string): SystemDefinition | undefined {
  const def = state.systems.get(systemId);
  if (def === undefined) return undefined;
  return {
    systemId: def.systemId,
    phase: def.phase,
    dependsOn: [...def.dependsOn],
    enabled: def.enabled,
    registeredAt: def.registeredAt,
  };
}

// ─── Build Execution Plan ───────────────────────────────────────────

function buildPlanImpl(state: SchedulerState): ExecutionPlan {
  const sorted = topologicalSort(state);
  if (sorted === undefined) {
    return { phases: [], totalSystems: 0, valid: false };
  }
  const enabledOrder = sorted.filter((id) => {
    const def = state.systems.get(id);
    return def !== undefined && def.enabled;
  });
  const phases = buildPhases(state, enabledOrder);
  return { phases, totalSystems: enabledOrder.length, valid: true };
}

function buildPhases(state: SchedulerState, orderedSystems: string[]): ReadonlyArray<PhasePlan> {
  const plans: PhasePlan[] = [];
  for (const phase of PHASE_ORDER) {
    const systemsInPhase = filterByPhase(state, orderedSystems, phase);
    if (systemsInPhase.length === 0) continue;
    const groups = detectParallelGroups(state, systemsInPhase);
    plans.push({ phase, groups, systemCount: systemsInPhase.length });
  }
  return plans;
}

function filterByPhase(state: SchedulerState, systems: string[], phase: ExecutionPhase): string[] {
  const result: string[] = [];
  for (const id of systems) {
    const def = state.systems.get(id);
    if (def !== undefined && def.phase === phase) result.push(id);
  }
  return result;
}

function detectParallelGroups(
  state: SchedulerState,
  systems: string[],
): ReadonlyArray<ParallelGroup> {
  if (systems.length === 0) return [];
  const groups: ParallelGroup[] = [];
  const assigned = new Set<string>();
  const phase = state.systems.get(systems[0] as string)?.phase ?? 'update';

  for (const id of systems) {
    if (assigned.has(id)) continue;
    const group = buildGroup(state, id, systems, assigned);
    groups.push({ systems: group, phase });
  }
  return groups;
}

function buildGroup(
  state: SchedulerState,
  startId: string,
  allSystems: string[],
  assigned: Set<string>,
): string[] {
  const group: string[] = [startId];
  assigned.add(startId);
  for (const candidate of allSystems) {
    if (assigned.has(candidate)) continue;
    if (canRunParallel(state, group, candidate)) {
      group.push(candidate);
      assigned.add(candidate);
    }
  }
  return group;
}

function canRunParallel(state: SchedulerState, group: string[], candidate: string): boolean {
  const candidateDeps = state.edges.get(candidate) ?? [];
  const candidateRev = state.reverseEdges.get(candidate) ?? [];
  for (const member of group) {
    if (candidateDeps.includes(member)) return false;
    if (candidateRev.includes(member)) return false;
  }
  return true;
}

// ─── Topological Sort ───────────────────────────────────────────────

function topologicalSort(state: SchedulerState): string[] | undefined {
  const inDegree = new Map<string, number>();
  for (const id of state.systems.keys()) {
    const deps = state.edges.get(id) ?? [];
    const validDeps = deps.filter((d) => state.systems.has(d));
    inDegree.set(id, validDeps.length);
  }
  const queue: string[] = [];
  for (const [id, count] of inDegree) {
    if (count === 0) queue.push(id);
  }
  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    result.push(current);
    const dependents = state.reverseEdges.get(current) ?? [];
    for (const dep of dependents) {
      if (!state.systems.has(dep)) continue;
      const newCount = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newCount);
      if (newCount === 0) queue.push(dep);
    }
  }
  if (result.length !== state.systems.size) return undefined;
  return result;
}

// ─── Execution Timing ───────────────────────────────────────────────

function recordExecutionImpl(
  state: SchedulerState,
  systemId: string,
  durationMicros: number,
): boolean {
  if (!state.systems.has(systemId)) return false;
  const existing = state.timings.get(systemId);
  if (existing !== undefined) {
    existing.lastDurationMicros = durationMicros;
    existing.totalDurationMicros += durationMicros;
    existing.executionCount++;
    return true;
  }
  state.timings.set(systemId, {
    lastDurationMicros: durationMicros,
    totalDurationMicros: durationMicros,
    executionCount: 1,
  });
  return true;
}

function getTimingImpl(state: SchedulerState, systemId: string): ExecutionTiming | undefined {
  const record = state.timings.get(systemId);
  if (record === undefined) return undefined;
  return {
    systemId,
    lastDurationMicros: record.lastDurationMicros,
    totalDurationMicros: record.totalDurationMicros,
    executionCount: record.executionCount,
    averageDurationMicros: record.totalDurationMicros / record.executionCount,
  };
}

function getAllTimingsImpl(state: SchedulerState): ReadonlyArray<ExecutionTiming> {
  const results: ExecutionTiming[] = [];
  for (const [systemId, record] of state.timings) {
    results.push({
      systemId,
      lastDurationMicros: record.lastDurationMicros,
      totalDurationMicros: record.totalDurationMicros,
      executionCount: record.executionCount,
      averageDurationMicros: record.totalDurationMicros / record.executionCount,
    });
  }
  return results;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: SchedulerState): SystemSchedulerStats {
  let enabledCount = 0;
  let disabledCount = 0;
  const distribution: Record<ExecutionPhase, number> = {
    'pre-update': 0,
    update: 0,
    'post-update': 0,
    render: 0,
  };

  for (const def of state.systems.values()) {
    if (def.enabled) {
      enabledCount++;
    } else {
      disabledCount++;
    }
    distribution[def.phase]++;
  }

  return {
    totalSystems: state.systems.size,
    enabledSystems: enabledCount,
    disabledSystems: disabledCount,
    totalEdges: countEdges(state),
    hasCycle: topologicalSort(state) === undefined,
    phaseDistribution: distribution,
  };
}

function countEdges(state: SchedulerState): number {
  let total = 0;
  for (const list of state.edges.values()) {
    total += list.length;
  }
  return total;
}
