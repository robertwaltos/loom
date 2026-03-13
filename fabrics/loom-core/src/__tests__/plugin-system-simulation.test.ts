import { describe, expect, it, vi } from 'vitest';
import {
  createPluginSystem,
  type MarketplaceEntry,
  type PluginManifest,
  type PluginRegistration,
  type PluginTelemetrySample,
} from '../plugin-system.js';

function makeManifest(overrides?: Partial<PluginManifest>): PluginManifest {
  return {
    id: 'plugin.base',
    name: 'Base Plugin',
    version: '1.0.0',
    author: 'author-key',
    description: 'baseline plugin',
    category: 'utility',
    apiVersion: 1,
    entryPoint: 'index.ts',
    dependencies: [],
    permissions: ['entity:read', 'event:emit'],
    resourceLimits: {
      memoryMb: 128,
      cpuTimeMs: 5000,
      maxFileHandles: 10,
      networkAllowed: false,
    },
    signature: 'sig-1',
    ...overrides,
  };
}

function makeDeps() {
  let seq = 0;
  const manifests = new Map<string, PluginManifest>();
  const regs = new Map<string, PluginRegistration>();
  const market = new Map<string, MarketplaceEntry>();
  const telemetry = new Map<string, PluginTelemetrySample[]>();
  const handles = new Map<string, { id: string; pluginId: string }>();

  return {
    deps: {
      clock: { now: vi.fn(() => 1000n) },
      ids: { next: vi.fn(() => `id-${++seq}`) },
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      events: { emit: vi.fn() },
      store: {
        saveManifest: vi.fn(async (m: PluginManifest) => {
          manifests.set(m.id, m);
        }),
        getManifest: vi.fn(async (pluginId: string) => manifests.get(pluginId)),
        listManifests: vi.fn(async () => Array.from(manifests.values())),
        saveRegistration: vi.fn(async (r: PluginRegistration) => {
          regs.set(r.pluginId, r);
        }),
        getRegistration: vi.fn(async (pluginId: string) => regs.get(pluginId)),
        listRegistrations: vi.fn(async (status?: PluginRegistration['status']) => {
          const all = Array.from(regs.values());
          return status ? all.filter((r) => r.status === status) : all;
        }),
        saveMarketplaceEntry: vi.fn(async (entry: MarketplaceEntry) => {
          market.set(entry.pluginId, entry);
        }),
        getMarketplaceEntry: vi.fn(async (pluginId: string) => market.get(pluginId)),
        listMarketplace: vi.fn(async (category?: PluginManifest['category']) => {
          const all = Array.from(market.values());
          return category ? all.filter((e) => e.manifest.category === category) : all;
        }),
        saveTelemetry: vi.fn(async (sample: PluginTelemetrySample) => {
          const list = telemetry.get(sample.pluginId) ?? [];
          telemetry.set(sample.pluginId, [sample, ...list]);
        }),
        getTelemetryHistory: vi.fn(async (pluginId: string, limit: number) =>
          (telemetry.get(pluginId) ?? []).slice(0, limit),
        ),
      },
      signatures: {
        verify: vi.fn(async () => true),
        sign: vi.fn(async () => 'signed-content'),
      },
      sandbox: {
        create: vi.fn(async (pluginId: string) => {
          const handle = { id: `sb-${pluginId}`, pluginId };
          handles.set(pluginId, handle);
          return handle;
        }),
        destroy: vi.fn(async () => {}),
        execute: vi.fn(async (_handle: unknown, fn: string) => ({ ok: true, fn })),
        getUsage: vi.fn(async () => ({
          memoryUsedMb: 64,
          cpuTimeUsedMs: 120,
          fileHandlesOpen: 2,
        })),
      },
    },
  };
}

describe('plugin-system simulation', () => {
  it('registers a signed compatible plugin', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    const reg = await system.registerPlugin(makeManifest({ id: 'plugin.a' }));

    expect(reg.status).toBe('registered');
    expect(reg.pluginId).toBe('plugin.a');
    expect(ctx.deps.signatures.verify).toHaveBeenCalled();
    expect(ctx.deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'plugin.registered' }),
    );
  });

  it('rejects incompatible API versions and invalid signatures', async () => {
    const ctx = makeDeps();
    ctx.deps.signatures.verify = vi.fn(async () => false);
    const system = createPluginSystem(ctx.deps);

    await expect(system.registerPlugin(makeManifest({ id: 'bad-sig' }))).rejects.toThrow(
      'Invalid signature',
    );

    await expect(
      system.registerPlugin(makeManifest({ id: 'bad-api', signature: undefined, apiVersion: 10 })),
    ).rejects.toThrow('incompatible');
  });

  it('loads plugin with dependencies and unresolved dependency failures', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    await system.registerPlugin(makeManifest({ id: 'dep.core' }));
    await system.registerPlugin(
      makeManifest({
        id: 'plugin.withdep',
        dependencies: [{ pluginId: 'dep.core', versionConstraint: '^1.0.0', optional: false }],
      }),
    );

    const loaded = await system.loadPlugin('plugin.withdep');
    expect(loaded.status).toBe('active');
    expect(loaded.sandboxHandle?.id).toBe('sb-plugin.withdep');

    await system.registerPlugin(
      makeManifest({
        id: 'plugin.broken',
        dependencies: [{ pluginId: 'missing.dep', versionConstraint: '^1.0.0', optional: false }],
      }),
    );
    await expect(system.loadPlugin('plugin.broken')).rejects.toThrow('Unresolved dependencies');
  });

  it('unloads plugin and clears sandbox handle', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    await system.registerPlugin(makeManifest({ id: 'plugin.unload' }));
    await system.loadPlugin('plugin.unload');
    const unloaded = await system.unloadPlugin('plugin.unload');

    expect(unloaded.status).toBe('unloaded');
    expect(unloaded.sandboxHandle).toBeUndefined();
    expect(ctx.deps.sandbox.destroy).toHaveBeenCalled();
  });

  it('hot-reloads plugin successfully and handles sandbox failures', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    await system.registerPlugin(makeManifest({ id: 'plugin.reload', version: '1.0.0' }));
    await system.loadPlugin('plugin.reload');

    const ok = await system.hotReload(
      'plugin.reload',
      makeManifest({ id: 'plugin.reload', version: '1.1.0' }),
    );
    expect(ok.success).toBe(true);
    expect(ok.newVersion).toBe('1.1.0');

    ctx.deps.sandbox.create = vi.fn(async () => {
      throw new Error('sandbox create failed');
    });

    const fail = await system.hotReload(
      'plugin.reload',
      makeManifest({ id: 'plugin.reload', version: '1.2.0' }),
    );
    expect(fail.success).toBe(false);
    expect(fail.error).toContain('sandbox create failed');
  });

  it('executes plugin action in sandbox and records telemetry', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    await system.registerPlugin(makeManifest({ id: 'plugin.exec' }));
    await system.loadPlugin('plugin.exec');

    const result = await system.executePluginAction<{ ok: boolean; fn: string }>(
      'plugin.exec',
      'doWork',
      [1, 'a'],
    );
    expect(result.ok).toBe(true);
    expect(result.fn).toBe('doWork');

    const sample = await system.getPluginTelemetry('plugin.exec');
    expect(sample.pluginId).toBe('plugin.exec');
    expect(sample.memoryUsedMb).toBe(64);

    await expect(system.executePluginAction('missing', 'doWork', [])).rejects.toThrow('not active');
  });

  it('publishes and searches marketplace with signature requirement', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    const entry = await system.publishToMarketplace(makeManifest({ id: 'market.a' }));
    expect(entry.pluginId).toBe('market.a');

    const all = await system.searchMarketplace();
    expect(all).toHaveLength(1);

    await expect(
      system.publishToMarketplace(makeManifest({ id: 'market.b', signature: undefined })),
    ).rejects.toThrow('must be signed');
  });

  it('generates API docs and checks API compatibility policies', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    await system.registerPlugin(
      makeManifest({
        id: 'docs.a',
        permissions: ['entity:read', 'entity:write', 'event:subscribe', 'economy:read'],
      }),
    );

    const docs = await system.generateApiDocs('docs.a');
    expect(docs.endpoints.map((e) => e.name)).toEqual(
      expect.arrayContaining(['entity:read', 'entity:write', 'economy:read']),
    );
    expect(docs.events.map((e) => e.name)).toContain('event:subscribe');

    const compatOk = system.checkApiCompatibility(makeManifest({ id: 'compat.ok', apiVersion: 1 }));
    expect(compatOk.compatible).toBe(true);

    const compatOld = system.checkApiCompatibility(makeManifest({ id: 'compat.old', apiVersion: 0 }));
    expect(compatOld.compatible).toBe(true);
    expect(compatOld.removedApis).toEqual([]);

    const compatRemoved = system.checkApiCompatibility(
      makeManifest({ id: 'compat.removed', apiVersion: -2 }),
    );
    expect(compatRemoved.compatible).toBe(false);
    expect(compatRemoved.removedApis.length).toBeGreaterThan(0);
  });

  it('tracks plugin system stats through operations', async () => {
    const ctx = makeDeps();
    const system = createPluginSystem(ctx.deps);

    await system.registerPlugin(makeManifest({ id: 'stats.a' }));
    await system.loadPlugin('stats.a');
    await system.executePluginAction('stats.a', 'ping', []);
    await system.publishToMarketplace(makeManifest({ id: 'stats.market' }));

    const stats = system.getPluginSystemStats();
    expect(stats.totalRegistered).toBe(1);
    expect(stats.activePlugins).toBe(1);
    expect(stats.totalExecutions).toBe(1);
    expect(stats.marketplaceEntries).toBe(1);
  });
});
