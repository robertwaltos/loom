/**
 * godot-adapter.test.ts — tests for the Godot rendering-fabric adapter PoC.
 *
 * Thread: bridge/bridge-loom-ue5/godot-adapter
 * Tier: 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createGodotAdapter } from '../godot-adapter.js';
import type { GodotTransportPort } from '../godot-adapter.js';

// ── Mock transport ─────────────────────────────────────────────────────

interface TransportCall {
  readonly command: string;
  readonly payload: unknown;
}

function makeTransport(connected = true): GodotTransportPort & { calls: TransportCall[]; lastResponse: Record<string, unknown>; dispatch: (event: string, payload: unknown) => void } {
  const calls: TransportCall[] = [];
  let lastResponse: Record<string, unknown> = {};
  let messageHandler: ((event: string, payload: unknown) => void) | null = null;

  return {
    calls,
    get lastResponse() { return lastResponse; },
    set lastResponse(v: Record<string, unknown>) { lastResponse = v; },
    send: (command, payload) => {
      calls.push({ command, payload });
      return Promise.resolve(lastResponse);
    },
    onMessage: (handler) => { messageHandler = handler; },
    isConnected: () => connected,
    dispatch: (event, payload) => { messageHandler?.(event, payload); },
  };
}

// ── negotiate ─────────────────────────────────────────────────────────

describe('negotiate', () => {
  it('sends negotiate command to transport', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    await adapter.negotiate();
    expect(t.calls[0]?.command).toBe('negotiate');
  });

  it('returns hardcoded Godot capabilities', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    const caps = await adapter.negotiate();
    expect(caps.fabricName).toBe('Godot 4 (PoC)');
    expect(caps.currentTier).toBe('performance');
    expect(caps.maxVisibleEntities).toBe(2_000);
    expect(caps.supportsPixelStreaming).toBe(false);
  });

  it('capabilities are not influenced by transport response', async () => {
    const t = makeTransport();
    t.lastResponse = { maxVisibleEntities: 999_999 };
    const adapter = createGodotAdapter({ transport: t });
    const caps = await adapter.negotiate();
    expect(caps.maxVisibleEntities).toBe(2_000);
  });

  it('reports Godot-specific feature flags', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    const caps = await adapter.negotiate();
    expect(caps.features.naniteGeometry).toBe(false);
    expect(caps.features.proceduralGeneration).toBe(true);
    expect(caps.features.softwareRayTracing).toBe(true);
  });
});

// ── pushStateSnapshot ─────────────────────────────────────────────────

describe('pushStateSnapshot', () => {
  it('sends pushStateSnapshot command', () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    adapter.pushStateSnapshot([]);
    expect(t.calls[0]?.command).toBe('pushStateSnapshot');
  });

  it('is a no-op when transport is disconnected', () => {
    const t = makeTransport(false);
    const adapter = createGodotAdapter({ transport: t });
    adapter.pushStateSnapshot([]);
    expect(t.calls).toHaveLength(0);
  });
});

// ── spawnVisual / despawnVisual ───────────────────────────────────────

describe('spawnVisual', () => {
  it('sends spawnVisual command', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    await adapter.spawnVisual('e1' as never, {} as never);
    expect(t.calls[0]?.command).toBe('spawnVisual');
  });

  it('throws when transport is disconnected', async () => {
    const t = makeTransport(false);
    const adapter = createGodotAdapter({ transport: t });
    await expect(adapter.spawnVisual('e1' as never, {} as never)).rejects.toThrow('Godot transport is not connected');
  });
});

describe('despawnVisual', () => {
  it('sends despawnVisual command', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    await adapter.despawnVisual('e1' as never);
    expect(t.calls[0]?.command).toBe('despawnVisual');
  });

  it('throws when transport is disconnected', async () => {
    const t = makeTransport(false);
    const adapter = createGodotAdapter({ transport: t });
    await expect(adapter.despawnVisual('e1' as never)).rejects.toThrow();
  });
});

// ── preloadWorld / unloadWorld ────────────────────────────────────────

describe('preloadWorld', () => {
  it('sends preloadWorld command', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    await adapter.preloadWorld('w1' as never, ['scene.tscn']);
    expect(t.calls[0]?.command).toBe('preloadWorld');
  });

  it('throws when transport is disconnected', async () => {
    const t = makeTransport(false);
    const adapter = createGodotAdapter({ transport: t });
    await expect(adapter.preloadWorld('w1' as never, [])).rejects.toThrow();
  });
});

describe('unloadWorld', () => {
  it('sends unloadWorld command', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    await adapter.unloadWorld('w1' as never);
    expect(t.calls[0]?.command).toBe('unloadWorld');
  });
});

// ── getWeaveZoneRenderer ──────────────────────────────────────────────

describe('getWeaveZoneRenderer', () => {
  it('returns null (not supported in PoC)', () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    expect(adapter.getWeaveZoneRenderer()).toBeNull();
  });
});

// ── event handlers ────────────────────────────────────────────────────

describe('onPlayerInput', () => {
  it('dispatches playerInput events to registered handlers', () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    const received: unknown[] = [];
    adapter.onPlayerInput((input) => { received.push(input); });
    t.dispatch('playerInput', { action: 'move' });
    expect(received).toHaveLength(1);
  });

  it('ignores unrelated events', () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    const received: unknown[] = [];
    adapter.onPlayerInput((input) => { received.push(input); });
    t.dispatch('unknownEvent', {});
    expect(received).toHaveLength(0);
  });
});

describe('onPhysicsEvent', () => {
  it('dispatches physicsEvent events to registered handlers', () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    const received: unknown[] = [];
    adapter.onPhysicsEvent((ev) => { received.push(ev); });
    t.dispatch('physicsEvent', { type: 'collision' });
    expect(received).toHaveLength(1);
  });
});

// ── healthCheck ───────────────────────────────────────────────────────

describe('healthCheck', () => {
  let t: ReturnType<typeof makeTransport>;
  beforeEach(() => { t = makeTransport(); });

  it('sends healthCheck command', async () => {
    const adapter = createGodotAdapter({ transport: t });
    await adapter.healthCheck();
    expect(t.calls[0]?.command).toBe('healthCheck');
  });

  it('maps raw response to FabricHealthStatus', async () => {
    t.lastResponse = { healthy: true, currentFps: 60, frameTimeMs: 16.7, visibleEntities: 300, memoryUsageMb: 1024, gpuUsagePercent: 55 };
    const adapter = createGodotAdapter({ transport: t });
    const status = await adapter.healthCheck();
    expect(status.healthy).toBe(true);
    expect(status.currentFps).toBe(60);
    expect(status.gpuUsagePercent).toBe(55);
  });

  it('returns unhealthy defaults when transport is disconnected', async () => {
    const t2 = makeTransport(false);
    const adapter = createGodotAdapter({ transport: t2 });
    const status = await adapter.healthCheck();
    expect(status.healthy).toBe(false);
    expect(status.currentFps).toBe(0);
  });

  it('defaults absent numeric fields to 0', async () => {
    t.lastResponse = { healthy: false };
    const adapter = createGodotAdapter({ transport: t });
    const status = await adapter.healthCheck();
    expect(status.frameTimeMs).toBe(0);
    expect(status.visibleEntities).toBe(0);
    expect(status.memoryUsageMb).toBe(0);
  });
});

// ── disconnect ────────────────────────────────────────────────────────

describe('disconnect', () => {
  it('sends disconnect command', async () => {
    const t = makeTransport();
    const adapter = createGodotAdapter({ transport: t });
    await adapter.disconnect();
    expect(t.calls[0]?.command).toBe('disconnect');
  });
});
