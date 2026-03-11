/**
 * replication-log.ts — Data replication event tracking across archive nodes.
 *
 * Tracks replication operations between archive nodes, monitors node health
 * via success/failure metrics, and provides status-based filtering for
 * operational visibility into the distributed archive fabric.
 *
 * "Every copy is a promise the Loom makes to the future."
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
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type ReplicationId = string;
export type NodeId = string;

export type ReplicationError =
  | 'node-not-found'
  | 'replication-not-found'
  | 'already-registered'
  | 'invalid-size';

export type ReplicationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export type ReplicationEntry = {
  replicationId: ReplicationId;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  dataKey: string;
  dataSizeBytes: bigint;
  status: ReplicationStatus;
  startedAt: bigint;
  completedAt: bigint | null;
  retryCount: number;
  errorMessage: string | null;
};

export type NodeHealth = {
  nodeId: NodeId;
  totalReplications: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastActivityAt: bigint | null;
};

export type ReplicationStats = {
  totalEntries: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  totalBytesReplicated: bigint;
};

// ============================================================================
// STATE
// ============================================================================

export type ReplicationLogState = {
  nodes: Map<NodeId, MutableNodeHealth>;
  entries: Map<ReplicationId, MutableEntry>;
};

type MutableNodeHealth = {
  nodeId: NodeId;
  totalReplications: number;
  successCount: number;
  failureCount: number;
  lastActivityAt: bigint | null;
};

type MutableEntry = {
  replicationId: ReplicationId;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
  dataKey: string;
  dataSizeBytes: bigint;
  status: ReplicationStatus;
  startedAt: bigint;
  completedAt: bigint | null;
  retryCount: number;
  errorMessage: string | null;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createReplicationLogState(): ReplicationLogState {
  return {
    nodes: new Map(),
    entries: new Map(),
  };
}

// ============================================================================
// NODE MANAGEMENT
// ============================================================================

export function registerNode(
  state: ReplicationLogState,
  nodeId: NodeId,
): { success: true } | { success: false; error: ReplicationError } {
  if (state.nodes.has(nodeId)) return { success: false, error: 'already-registered' };
  state.nodes.set(nodeId, {
    nodeId,
    totalReplications: 0,
    successCount: 0,
    failureCount: 0,
    lastActivityAt: null,
  });
  return { success: true };
}

export function getNodeHealth(state: ReplicationLogState, nodeId: NodeId): NodeHealth | undefined {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return undefined;
  const total = node.totalReplications;
  return {
    nodeId: node.nodeId,
    totalReplications: total,
    successCount: node.successCount,
    failureCount: node.failureCount,
    successRate: total === 0 ? 0 : node.successCount / total,
    lastActivityAt: node.lastActivityAt,
  };
}

// ============================================================================
// REPLICATION OPERATIONS
// ============================================================================

export function logReplication(
  state: ReplicationLogState,
  sourceNodeId: NodeId,
  targetNodeId: NodeId,
  dataKey: string,
  dataSizeBytes: bigint,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): ReplicationEntry | ReplicationError {
  if (dataSizeBytes < 1n) return 'invalid-size';
  if (!state.nodes.has(sourceNodeId)) return 'node-not-found';
  if (!state.nodes.has(targetNodeId)) return 'node-not-found';

  const entry: MutableEntry = {
    replicationId: idGen.generate(),
    sourceNodeId,
    targetNodeId,
    dataKey,
    dataSizeBytes,
    status: 'PENDING',
    startedAt: clock.now(),
    completedAt: null,
    retryCount: 0,
    errorMessage: null,
  };

  state.entries.set(entry.replicationId, entry);
  logger.info('Replication logged: ' + entry.replicationId + ' ' + dataKey);
  return toEntry(entry);
}

export function startReplication(
  state: ReplicationLogState,
  replicationId: ReplicationId,
  clock: Clock,
): { success: true } | { success: false; error: ReplicationError } {
  const entry = state.entries.get(replicationId);
  if (entry === undefined) return { success: false, error: 'replication-not-found' };

  const isAllowed = entry.status === 'PENDING' || entry.status === 'RETRYING';
  if (!isAllowed) return { success: false, error: 'replication-not-found' };

  entry.status = 'IN_PROGRESS';
  touchNodeActivity(state, entry.targetNodeId, clock.now());
  return { success: true };
}

export function completeReplication(
  state: ReplicationLogState,
  replicationId: ReplicationId,
  clock: Clock,
): { success: true } | { success: false; error: ReplicationError } {
  const entry = state.entries.get(replicationId);
  if (entry === undefined) return { success: false, error: 'replication-not-found' };
  if (entry.status !== 'IN_PROGRESS') return { success: false, error: 'replication-not-found' };

  const now = clock.now();
  entry.status = 'COMPLETED';
  entry.completedAt = now;
  entry.errorMessage = null;

  const node = state.nodes.get(entry.targetNodeId);
  if (node !== undefined) {
    node.successCount = node.successCount + 1;
    node.lastActivityAt = now;
  }
  return { success: true };
}

export function failReplication(
  state: ReplicationLogState,
  replicationId: ReplicationId,
  errorMessage: string,
  clock: Clock,
): { success: true } | { success: false; error: ReplicationError } {
  const entry = state.entries.get(replicationId);
  if (entry === undefined) return { success: false, error: 'replication-not-found' };
  if (entry.status !== 'IN_PROGRESS') return { success: false, error: 'replication-not-found' };

  const now = clock.now();
  entry.status = 'FAILED';
  entry.errorMessage = errorMessage;

  const node = state.nodes.get(entry.targetNodeId);
  if (node !== undefined) {
    node.failureCount = node.failureCount + 1;
    node.lastActivityAt = now;
  }
  return { success: true };
}

export function retryReplication(
  state: ReplicationLogState,
  replicationId: ReplicationId,
): { success: true } | { success: false; error: ReplicationError } {
  const entry = state.entries.get(replicationId);
  if (entry === undefined) return { success: false, error: 'replication-not-found' };

  const isRetryable = entry.status === 'FAILED' || entry.status === 'IN_PROGRESS';
  if (!isRetryable) return { success: false, error: 'replication-not-found' };

  entry.retryCount = entry.retryCount + 1;
  entry.status = 'RETRYING';
  entry.errorMessage = null;
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getEntry(
  state: ReplicationLogState,
  replicationId: ReplicationId,
): ReplicationEntry | undefined {
  const entry = state.entries.get(replicationId);
  return entry !== undefined ? toEntry(entry) : undefined;
}

export function listEntries(
  state: ReplicationLogState,
  nodeId?: NodeId,
  status?: ReplicationStatus,
): ReadonlyArray<ReplicationEntry> {
  const results: ReplicationEntry[] = [];
  for (const entry of state.entries.values()) {
    if (nodeId !== undefined && entry.sourceNodeId !== nodeId && entry.targetNodeId !== nodeId) {
      continue;
    }
    if (status !== undefined && entry.status !== status) continue;
    results.push(toEntry(entry));
  }
  return results;
}

export function getStats(state: ReplicationLogState): ReplicationStats {
  let pendingCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let totalBytesReplicated = 0n;

  for (const entry of state.entries.values()) {
    if (entry.status === 'PENDING') pendingCount = pendingCount + 1;
    if (entry.status === 'COMPLETED') {
      completedCount = completedCount + 1;
      totalBytesReplicated = totalBytesReplicated + entry.dataSizeBytes;
    }
    if (entry.status === 'FAILED') failedCount = failedCount + 1;
  }

  return {
    totalEntries: state.entries.size,
    pendingCount,
    completedCount,
    failedCount,
    totalBytesReplicated,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toEntry(entry: MutableEntry): ReplicationEntry {
  return {
    replicationId: entry.replicationId,
    sourceNodeId: entry.sourceNodeId,
    targetNodeId: entry.targetNodeId,
    dataKey: entry.dataKey,
    dataSizeBytes: entry.dataSizeBytes,
    status: entry.status,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
    retryCount: entry.retryCount,
    errorMessage: entry.errorMessage,
  };
}

function touchNodeActivity(state: ReplicationLogState, nodeId: NodeId, now: bigint): void {
  const node = state.nodes.get(nodeId);
  if (node !== undefined) {
    node.totalReplications = node.totalReplications + 1;
    node.lastActivityAt = now;
  }
}
