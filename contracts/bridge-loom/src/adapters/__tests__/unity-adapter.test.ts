/**
 * unity-adapter.test.ts — tests for the Unity rendering-fabric adapter PoC.
 *
 * Thread: bridge/bridge-loom-ue5/unity-adapter
 * Tier: 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createUnityAdapter } from '../unity-adapter.js';
import type { UnityTransportPort } from '../unity-adapter.js';

// ── Mock transport ─────────────────────────────────────────────────────

interface TransportCall {
  readonly command: string;
  readonly payload: unknown;
}

function makeTransport(connected = true): UnityTransportPort & { calls: TransportCall[]; lastResponse: Record<string, unknown> } {
  const calls: TransportCall[] = [];
  let lastResponse: Record<string, unknown> = {};
  let messageHandler: ((event: string, payload: unknown) => void) | null = null;

  const t: UnityTransportPort & { calls: TransportCall[]; lastResponse: Record<string, unknown> } = {
    calls,
    get lastResponse() { return lastResponse; },
    set lastResponse(v: Record<string, unknown>) { lastResponse = v; },
    send: (command, payload) => {
      calls.push({ command, payload });
      return Promise.resolve(lastResponse);
    },
    onMessage: (handler) => { messageHandler = handler; },
    isConnected: () => connected,
    dispatch: (event: string, payload: unknown) => { messageHandler?.(event, payload); },
  } as UnityTransportPort & { calls: TransportCall[]; lastResponse: Record<string, unknown>; dispatch: (e: string, p: unknown) => void };

  return t;
}

// ── negotiate ─────────────────────────────────────────────────────────

describe('negotiate', () => {
  it('sends negotiate command to transport', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    await adapter.negotiate();
    expect(t.calls[0]?.command).toBe('negotiate');
  });

  it('returns hardcoded Unity capabilities without parsing transport response', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    const caps = await adapter.negotiate();
    expect(caps.fabricName).toBe('Unity (PoC)');
    expect(caps.currentTier).toBe('high');
    expect(caps.maxVisibleEntities).toBe(5_000);
    expect(caps.supportsPixelStreaming).toBe(false);
  });

  it('returns capability fields regardless of what transport sends back', async () => {
    const t = makeTransport();
    t.lastResponse = { fabricName: 'Ignored', maxVisibleEntities: 999_999 };
    const adapter = createUnityAdapter({ transport: t });
    const caps = await adapter.negotiate();
    // hardcoded — transport response is irrelevant
    expect(caps.maxVisibleEntities).toBe(5_000);
  });
});

// ── pushStateSnapshot ─────────────────────────────────────────────────

describe('pushStateSnapshot', () => {
  it('sends pushStateSnapshot command with updates', () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    adapter.pushStateSnapshot([]);
    expect(t.calls[0]?.command).toBe('pushStateSnapshot');
  });

  it('is a no-op when transport is disconnected', () => {
    const t = makeTransport(false);
    const adapter = createUnityAdapter({ transport: t });
    adapter.pushStateSnapshot([]);
    expect(t.calls).toHaveLength(0);
  });
});

// ── spawnVisual / despawnVisual ───────────────────────────────────────

describe('spawnVisual', () => {
  it('sends spawnVisual command', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    await adapter.spawnVisual('e1' as never, {} as never);
    expect(t.calls[0]?.command).toBe('spawnVisual');
  });

  it('throws when transport is disconnected', async () => {
    const t = makeTransport(false);
    const adapter = createUnityAdapter({ transport: t });
    await expect(adapter.spawnVisual('e1' as never, {} as never)).rejects.toThrow('Unity transport is not connected');
  });
});

describe('despawnVisual', () => {
  it('sends despawnVisual command', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    await adapter.despawnVisual('e1' as never);
    expect(t.calls[0]?.command).toBe('despawnVisual');
  });

  it('throws when transport is disconnected', async () => {
    const t = makeTransport(false);
    const adapter = createUnityAdapter({ transport: t });
    await expect(adapter.despawnVisual('e1' as never)).rejects.toThrow();
  });
});

// ── preloadWorld / unloadWorld ────────────────────────────────────────

describe('preloadWorld', () => {
  it('sends preloadWorld command', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    await adapter.preloadWorld('w1' as never, ['asset1']);
    expect(t.calls[0]?.command).toBe('preloadWorld');
  });
});

describe('unloadWorld', () => {
  it('sends unloadWorld command', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    await adapter.unloadWorld('w1' as never);
    expect(t.calls[0]?.command).toBe('unloadWorld');
  });
});

// ── getWeaveZoneRenderer ──────────────────────────────────────────────

describe('getWeaveZoneRenderer', () => {
  it('returns null (not supported in PoC)', () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    expect(adapter.getWeaveZoneRenderer()).toBeNull();
  });
});

// ── event handlers ────────────────────────────────────────────────────

describe('onPlayerInput', () => {
  it('dispatches playerInput events to registered handlers', () => {
    const t = makeTransport() as ReturnType<typeof makeTransport> & { dispatch: (e: string, p: unknown) => void };
    const adapter = createUnityAdapter({ transport: t });
    const received: unknown[] = [];
    adapter.onPlayerInput((input) => { received.push(input); });
    (t as unknown as { dispatch: (e: string, p: unknown) => void }).dispatch('playerInput', { action: 'jump' });
    expect(received).toHaveLength(1);
  });

  it('supports multiple handlers', () => {
    const t = makeTransport() as ReturnType<typeof makeTransport> & { dispatch: (e: string, p: unknown) => void };
    const adapter = createUnityAdapter({ transport: t });
    let count = 0;
    adapter.onPlayerInput(() => { count += 1; });
    adapter.onPlayerInput(() => { count += 1; });
    (t as unknown as { dispatch: (e: string, p: unknown) => void }).dispatch('playerInput', {});
    expect(count).toBe(2);
  });
});

describe('onPhysicsEvent', () => {
  it('dispatches physicsEvent events to registered handlers', () => {
    const t = makeTransport() as ReturnType<typeof makeTransport> & { dispatch: (e: string, p: unknown) => void };
    const adapter = createUnityAdapter({ transport: t });
    const received: unknown[] = [];
    adapter.onPhysicsEvent((ev) => { received.push(ev); });
    (t as unknown as { dispatch: (e: string, p: unknown) => void }).dispatch('physicsEvent', { collision: true });
    expect(received).toHaveLength(1);
  });
});

// ── healthCheck ───────────────────────────────────────────────────────

describe('healthCheck', () => {
  let t: ReturnType<typeof makeTransport>;
  beforeEach(() => { t = makeTransport(); });

  it('sends healthCheck command', async () => {
    const adapter = createUnityAdapter({ transport: t });
    await adapter.healthCheck();
    expect(t.calls[0]?.command).toBe('healthCheck');
  });

  it('maps raw response to FabricHealthStatus', async () => {
    t.lastResponse = { healthy: true, currentFps: 90, frameTimeMs: 11.1, visibleEntities: 500, memoryUsageMb: 2048, gpuUsagePercent: 42 };
    const adapter = createUnityAdapter({ transport: t });
    const status = await adapter.healthCheck();
    expect(status.healthy).toBe(true);
    expect(status.currentFps).toBe(90);
    expect(status.gpuUsagePercent).toBe(42);
  });

  it('returns unhealthy defaults when transport is disconnected', async () => {
    const t2 = makeTransport(false);
    const adapter = createUnityAdapter({ transport: t2 });
    const status = await adapter.healthCheck();
    expect(status.healthy).toBe(false);
    expect(status.currentFps).toBe(0);
  });

  it('defaults numeric fields to 0 when raw values are absent', async () => {
    t.lastResponse = { healthy: true };
    const adapter = createUnityAdapter({ transport: t });
    const status = await adapter.healthCheck();
    expect(status.frameTimeMs).toBe(0);
    expect(status.visibleEntities).toBe(0);
  });
});

// ── disconnect ────────────────────────────────────────────────────────

describe('disconnect', () => {
  it('sends disconnect command', async () => {
    const t = makeTransport();
    const adapter = createUnityAdapter({ transport: t });
    await adapter.disconnect();
    expect(t.calls[0]?.command).toBe('disconnect');
  });
});
