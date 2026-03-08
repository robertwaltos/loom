/**
 * priority-queue.ts — Priority-ordered task scheduling.
 *
 * A bounded priority queue for deferred tasks. Lower numeric priority
 * values execute first. Tasks carry an opaque payload and optional
 * scheduling metadata. Supports peek, dequeue, re-prioritise, and
 * cancellation.
 */

// ── Ports ────────────────────────────────────────────────────────

interface PriorityQueueClock {
  readonly nowMicroseconds: () => number;
}

interface PriorityQueueIdGenerator {
  readonly next: () => string;
}

interface PriorityQueueDeps {
  readonly clock: PriorityQueueClock;
  readonly idGenerator: PriorityQueueIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface QueuedTask {
  readonly taskId: string;
  readonly label: string;
  readonly priority: number;
  readonly enqueuedAt: number;
  readonly payload: unknown;
}

interface EnqueueParams {
  readonly label: string;
  readonly priority: number;
  readonly payload: unknown;
}

interface PriorityQueueConfig {
  readonly maxSize: number;
}

interface PriorityQueueStats {
  readonly size: number;
  readonly highestPriority: number | undefined;
  readonly lowestPriority: number | undefined;
}

interface PriorityQueue {
  readonly enqueue: (params: EnqueueParams) => QueuedTask | undefined;
  readonly dequeue: () => QueuedTask | undefined;
  readonly peek: () => QueuedTask | undefined;
  readonly cancel: (taskId: string) => boolean;
  readonly reprioritise: (taskId: string, newPriority: number) => boolean;
  readonly size: () => number;
  readonly getStats: () => PriorityQueueStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_PRIORITY_QUEUE_CONFIG: PriorityQueueConfig = {
  maxSize: 1000,
};

// ── State ────────────────────────────────────────────────────────

interface PriorityQueueState {
  readonly deps: PriorityQueueDeps;
  readonly config: PriorityQueueConfig;
  readonly tasks: QueuedTask[];
  readonly taskIndex: Map<string, number>;
}

// ── Helpers ──────────────────────────────────────────────────────

function rebuildIndex(state: PriorityQueueState): void {
  state.taskIndex.clear();
  for (let i = 0; i < state.tasks.length; i++) {
    const t = state.tasks[i];
    if (t !== undefined) state.taskIndex.set(t.taskId, i);
  }
}

function insertSorted(state: PriorityQueueState, task: QueuedTask): void {
  let lo = 0;
  let hi = state.tasks.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const midTask = state.tasks[mid];
    if (midTask !== undefined && midTask.priority <= task.priority) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  state.tasks.splice(lo, 0, task);
  rebuildIndex(state);
}

// ── Operations ───────────────────────────────────────────────────

function enqueueImpl(state: PriorityQueueState, params: EnqueueParams): QueuedTask | undefined {
  if (state.tasks.length >= state.config.maxSize) return undefined;
  const task: QueuedTask = {
    taskId: state.deps.idGenerator.next(),
    label: params.label,
    priority: params.priority,
    enqueuedAt: state.deps.clock.nowMicroseconds(),
    payload: params.payload,
  };
  insertSorted(state, task);
  return task;
}

function dequeueImpl(state: PriorityQueueState): QueuedTask | undefined {
  const task = state.tasks.shift();
  if (task !== undefined) {
    rebuildIndex(state);
  }
  return task;
}

function cancelImpl(state: PriorityQueueState, taskId: string): boolean {
  const idx = state.taskIndex.get(taskId);
  if (idx === undefined) return false;
  state.tasks.splice(idx, 1);
  rebuildIndex(state);
  return true;
}

function reprioritiseImpl(state: PriorityQueueState, taskId: string, newPriority: number): boolean {
  const idx = state.taskIndex.get(taskId);
  if (idx === undefined) return false;
  const existing = state.tasks[idx];
  if (existing === undefined) return false;
  state.tasks.splice(idx, 1);
  const updated: QueuedTask = { ...existing, priority: newPriority };
  insertSorted(state, updated);
  return true;
}

function getStatsImpl(state: PriorityQueueState): PriorityQueueStats {
  if (state.tasks.length === 0) {
    return { size: 0, highestPriority: undefined, lowestPriority: undefined };
  }
  const first = state.tasks[0];
  const last = state.tasks[state.tasks.length - 1];
  return {
    size: state.tasks.length,
    highestPriority: first?.priority,
    lowestPriority: last?.priority,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createPriorityQueue(
  deps: PriorityQueueDeps,
  config?: Partial<PriorityQueueConfig>,
): PriorityQueue {
  const state: PriorityQueueState = {
    deps,
    config: { ...DEFAULT_PRIORITY_QUEUE_CONFIG, ...config },
    tasks: [],
    taskIndex: new Map(),
  };
  return {
    enqueue: (p) => enqueueImpl(state, p),
    dequeue: () => dequeueImpl(state),
    peek: () => state.tasks[0],
    cancel: (id) => cancelImpl(state, id),
    reprioritise: (id, p) => reprioritiseImpl(state, id, p),
    size: () => state.tasks.length,
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createPriorityQueue, DEFAULT_PRIORITY_QUEUE_CONFIG };
export type {
  PriorityQueue,
  PriorityQueueDeps,
  PriorityQueueConfig,
  QueuedTask,
  EnqueueParams,
  PriorityQueueStats,
};
