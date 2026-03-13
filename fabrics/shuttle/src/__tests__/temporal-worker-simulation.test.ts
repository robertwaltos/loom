import { describe, it, expect, vi } from 'vitest';

// ── Shared mock state (hoisted above vi.mock factories) ──────────
const temporalState = vi.hoisted(() => {
  const mockHandle = {
    workflowId: 'wf-1',
    firstExecutionRunId: 'run-1',
    signal: vi.fn(() => Promise.resolve(undefined)),
    query: vi.fn(() => Promise.resolve('query-result')),
    cancel: vi.fn(() => Promise.resolve(undefined)),
    terminate: vi.fn(() => Promise.resolve(undefined)),
    result: vi.fn(() => Promise.resolve('workflow-result')),
  };
  return {
    mockHandle,
    connectionConnect: vi.fn((_opts: unknown) =>
      Promise.resolve({ close: vi.fn() }),
    ),
    nativeConnectionConnect: vi.fn((_opts: unknown) =>
      Promise.resolve({ close: vi.fn() }),
    ),
    workerCreate: vi.fn((_opts: unknown) =>
      Promise.resolve({
        run: vi.fn(() => Promise.resolve()),
        shutdown: vi.fn(() => Promise.resolve()),
      }),
    ),
    workflowStart: vi.fn(
      (_type: unknown, opts: Record<string, unknown>) =>
        Promise.resolve({ ...mockHandle, workflowId: opts['workflowId'] ?? 'wf-1' }),
    ),
    workflowGetHandle: vi.fn((_id: string) => mockHandle),
  };
});

vi.mock('@temporalio/client', () => {
  class Connection {
    static connect = temporalState.connectionConnect;
  }
  class Client {
    workflow = {
      start: temporalState.workflowStart,
      getHandle: temporalState.workflowGetHandle,
    };
  }
  return { Connection, Client };
});

vi.mock('@temporalio/worker', () => {
  class NativeConnection {
    static connect = temporalState.nativeConnectionConnect;
  }
  class Worker {
    static create = temporalState.workerCreate;
  }
  return { NativeConnection, Worker };
});

import { createTemporalClient, createTemporalWorker } from '../temporal-worker.js';
import type { TemporalConfig } from '../temporal-worker.js';

const CLIENT_CONFIG: TemporalConfig = {
  address: 'localhost:7233',
  namespace: 'loom-test',
  taskQueue: 'test-queue',
};

const WORKER_CONFIG: TemporalConfig = {
  address: 'localhost:7233',
  namespace: 'loom-test',
  taskQueue: 'test-queue',
  workerWorkflowsPath: './workflows',
};

describe('temporal-worker simulation', () => {
  // ── createTemporalClient ──────────────────────────────────────────

  describe('createTemporalClient', () => {
    it('resolves to a TemporalAdapter without throwing', async () => {
      await expect(createTemporalClient(CLIENT_CONFIG)).resolves.toBeDefined();
    });

    it('returns an object with all TemporalAdapter methods', async () => {
      const adapter = await createTemporalClient(CLIENT_CONFIG);
      expect(typeof adapter.startWorkflow).toBe('function');
      expect(typeof adapter.signalWorkflow).toBe('function');
      expect(typeof adapter.queryWorkflow).toBe('function');
      expect(typeof adapter.cancelWorkflow).toBe('function');
      expect(typeof adapter.terminateWorkflow).toBe('function');
      expect(typeof adapter.getWorkflowResult).toBe('function');
      expect(typeof adapter.shutdown).toBe('function');
    });

    it('startWorkflow returns a handle with the given workflowId', async () => {
      const adapter = await createTemporalClient(CLIENT_CONFIG);
      const handle = await adapter.startWorkflow('npc-patrol', 'npc-patrol-001', ['arg1']);
      expect(handle.workflowId).toBe('npc-patrol-001');
      expect(typeof handle.firstExecutionRunId).toBe('string');
    });

    it('queryWorkflow delegates to client.workflow.getHandle', async () => {
      const adapter = await createTemporalClient(CLIENT_CONFIG);
      const result = await adapter.queryWorkflow('wf-1', 'getState');
      expect(result).toBe('query-result');
    });

    it('shutdown calls connection.close', async () => {
      const { Connection } = await import('@temporalio/client');
      const closeSpy = vi.fn();
      (Connection.connect as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ close: closeSpy });
      const adapter = await createTemporalClient(CLIENT_CONFIG);
      await adapter.shutdown();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  // ── createTemporalWorker ──────────────────────────────────────────

  describe('createTemporalWorker', () => {
    it('resolves to a TemporalWorkerHandle without throwing', async () => {
      await expect(createTemporalWorker(WORKER_CONFIG)).resolves.toBeDefined();
    });

    it('returns run and shutdown methods', async () => {
      const handle = await createTemporalWorker(WORKER_CONFIG);
      expect(typeof handle.run).toBe('function');
      expect(typeof handle.shutdown).toBe('function');
    });

    it('Worker.create is called with namespace and taskQueue from config', async () => {
      const { Worker } = await import('@temporalio/worker');
      await createTemporalWorker(WORKER_CONFIG);
      const createSpy = Worker.create as ReturnType<typeof vi.fn>;
      expect(createSpy).toHaveBeenCalled();
      const args = createSpy.mock.calls.at(-1)![0];
      expect(args.namespace).toBe('loom-test');
      expect(args.taskQueue).toBe('test-queue');
    });

    it('NativeConnection.connect uses the configured address', async () => {
      const { NativeConnection } = await import('@temporalio/worker');
      await createTemporalWorker(WORKER_CONFIG);
      const connectSpy = NativeConnection.connect as ReturnType<typeof vi.fn>;
      const args = connectSpy.mock.calls.at(-1)![0];
      expect(args.address).toBe('localhost:7233');
    });
  });
});
