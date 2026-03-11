/**
 * Temporal Workflow Adapter — Bridges the Shuttle WorkflowEngine
 * to Temporal.io for durable, distributed NPC orchestration.
 *
 * Wraps @temporalio/client and @temporalio/worker so the Loom
 * can schedule long-running NPC workflows (patrol, quest, trade)
 * with automatic retries, timeouts, and saga compensation —
 * without the Shuttle core importing Temporal directly.
 *
 * Thread: steel/shuttle/temporal-worker
 * Tier: 2
 */

import { Client, Connection } from '@temporalio/client';
import type { WorkflowHandleWithFirstExecutionRunId } from '@temporalio/client';
import { Worker, NativeConnection } from '@temporalio/worker';

// ─── Configuration ──────────────────────────────────────────────

export interface TemporalConfig {
  readonly address: string;
  readonly namespace: string;
  readonly taskQueue: string;
  readonly workerActivitiesPath?: string | undefined;
  readonly workerWorkflowsPath?: string | undefined;
  readonly maxConcurrentActivityTaskExecutions?: number | undefined;
  readonly maxConcurrentWorkflowTaskExecutions?: number | undefined;
}

// ─── Adapter Interface ──────────────────────────────────────────

export interface TemporalAdapter {
  readonly startWorkflow: (
    workflowType: string,
    workflowId: string,
    args: readonly unknown[],
  ) => Promise<TemporalWorkflowHandle>;
  readonly signalWorkflow: (
    workflowId: string,
    signalName: string,
    args: readonly unknown[],
  ) => Promise<void>;
  readonly queryWorkflow: (
    workflowId: string,
    queryName: string,
    args?: readonly unknown[],
  ) => Promise<unknown>;
  readonly cancelWorkflow: (workflowId: string) => Promise<void>;
  readonly terminateWorkflow: (workflowId: string, reason: string) => Promise<void>;
  readonly getWorkflowResult: (workflowId: string) => Promise<unknown>;
  readonly shutdown: () => Promise<void>;
}

export interface TemporalWorkflowHandle {
  readonly workflowId: string;
  readonly firstExecutionRunId: string;
}

// ─── Client-Only Factory ────────────────────────────────────────

export async function createTemporalClient(
  config: TemporalConfig,
): Promise<TemporalAdapter> {
  const connection = await Connection.connect({ address: config.address });
  const client = new Client({
    connection,
    namespace: config.namespace,
  });

  return {
    startWorkflow: async (workflowType, workflowId, args) => {
      const handle = await client.workflow.start(workflowType, {
        taskQueue: config.taskQueue,
        workflowId,
        args: [...args],
      }) as WorkflowHandleWithFirstExecutionRunId;
      return {
        workflowId: handle.workflowId,
        firstExecutionRunId: handle.firstExecutionRunId,
      };
    },

    signalWorkflow: async (workflowId, signalName, args) => {
      const handle = client.workflow.getHandle(workflowId);
      await handle.signal(signalName, ...args);
    },

    queryWorkflow: async (workflowId, queryName, args) => {
      const handle = client.workflow.getHandle(workflowId);
      return handle.query(queryName, ...(args ?? []));
    },

    cancelWorkflow: async (workflowId) => {
      const handle = client.workflow.getHandle(workflowId);
      await handle.cancel();
    },

    terminateWorkflow: async (workflowId, reason) => {
      const handle = client.workflow.getHandle(workflowId);
      await handle.terminate(reason);
    },

    getWorkflowResult: async (workflowId) => {
      const handle = client.workflow.getHandle(workflowId);
      return handle.result();
    },

    shutdown: async () => {
      connection.close();
    },
  };
}

// ─── Worker Factory ─────────────────────────────────────────────

export interface TemporalWorkerHandle {
  readonly run: () => Promise<void>;
  readonly shutdown: () => Promise<void>;
}

export async function createTemporalWorker(
  config: TemporalConfig,
): Promise<TemporalWorkerHandle> {
  const connection = await NativeConnection.connect({ address: config.address });

  const worker = await Worker.create({
    connection,
    namespace: config.namespace,
    taskQueue: config.taskQueue,
    workflowsPath: config.workerWorkflowsPath,
    activities: config.workerActivitiesPath
      ? await loadActivities(config.workerActivitiesPath)
      : undefined,
    maxConcurrentActivityTaskExecutions:
      config.maxConcurrentActivityTaskExecutions ?? 200,
    maxConcurrentWorkflowTaskExecutions:
      config.maxConcurrentWorkflowTaskExecutions ?? 200,
  });

  return {
    run: () => worker.run(),
    shutdown: async () => {
      worker.shutdown();
      await connection.close();
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────

async function loadActivities(
  activitiesPath: string,
): Promise<Record<string, (...args: unknown[]) => unknown>> {
  const mod: Record<string, unknown> = await import(activitiesPath) as Record<string, unknown>;
  const activities: Record<string, (...args: unknown[]) => unknown> = {};
  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === 'function') {
      activities[key] = value as (...args: unknown[]) => unknown;
    }
  }
  return activities;
}
