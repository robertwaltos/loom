/**
 * Plugin Architecture — modular, hot-reloadable Game Feature Plugin system.
 *
 *   - Game Feature Plugin system: modular feature packs
 *   - Plugin dependency resolution: load order, conflict detection, version constraints
 *   - Hot-reload for plugins: update game logic without server restart
 *   - Plugin marketplace: community-created plugins (audited, signed)
 *   - Plugin sandboxing: isolated execution, resource limits
 *   - API versioning: stable plugin API with backward compatibility
 *   - Plugin telemetry: per-plugin performance metrics, error rates
 *   - Documentation generator: auto-generate API docs from plugin interfaces
 *
 * "The Loom is extensible; its fabric is woven by many hands."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface PluginClockPort {
  readonly now: () => bigint;
}

export interface PluginIdPort {
  readonly next: () => string;
}

export interface PluginLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface PluginEventPort {
  readonly emit: (event: LoomEvent) => void;
}

// ─── Event Helper ───────────────────────────────────────────────

function makeEvent(
  type: string,
  payload: unknown,
  ids: PluginIdPort,
  clock: PluginClockPort,
): LoomEvent {
  return {
    type,
    payload,
    metadata: {
      eventId: ids.next(),
      correlationId: ids.next(),
      causationId: null,
      timestamp: Number(clock.now()),
      sequenceNumber: 0,
      sourceWorldId: '',
      sourceFabricId: 'plugin-system',
      schemaVersion: 1,
    },
  };
}

export interface PluginStorePort {
  readonly saveManifest: (manifest: PluginManifest) => Promise<void>;
  readonly getManifest: (pluginId: string) => Promise<PluginManifest | undefined>;
  readonly listManifests: () => Promise<readonly PluginManifest[]>;
  readonly saveRegistration: (reg: PluginRegistration) => Promise<void>;
  readonly getRegistration: (pluginId: string) => Promise<PluginRegistration | undefined>;
  readonly listRegistrations: (status?: PluginStatus) => Promise<readonly PluginRegistration[]>;
  readonly saveMarketplaceEntry: (entry: MarketplaceEntry) => Promise<void>;
  readonly getMarketplaceEntry: (pluginId: string) => Promise<MarketplaceEntry | undefined>;
  readonly listMarketplace: (category?: PluginCategory) => Promise<readonly MarketplaceEntry[]>;
  readonly saveTelemetry: (telemetry: PluginTelemetrySample) => Promise<void>;
  readonly getTelemetryHistory: (pluginId: string, limit: number) => Promise<readonly PluginTelemetrySample[]>;
}

export interface PluginSignaturePort {
  readonly verify: (pluginId: string, signature: string, publicKey: string) => Promise<boolean>;
  readonly sign: (pluginId: string, content: string) => Promise<string>;
}

export interface PluginSandboxPort {
  readonly create: (pluginId: string, limits: ResourceLimits) => Promise<SandboxHandle>;
  readonly destroy: (handle: SandboxHandle) => Promise<void>;
  readonly execute: <T>(handle: SandboxHandle, fn: string, args: readonly unknown[]) => Promise<T>;
  readonly getUsage: (handle: SandboxHandle) => Promise<SandboxUsage>;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_PLUGINS = 200;
const DEFAULT_MEMORY_LIMIT_MB = 128;
const DEFAULT_CPU_TIME_MS = 5000;
const DEFAULT_API_VERSION = 1;
const MAX_DEPENDENCY_DEPTH = 20;
const HOT_RELOAD_GRACE_PERIOD_MS = 5000;

// ─── Types ──────────────────────────────────────────────────────────

export type PluginStatus = 'registered' | 'loading' | 'active' | 'suspended' | 'failed' | 'unloaded';
export type PluginCategory = 'combat' | 'crafting' | 'governance' | 'economy' | 'social' | 'exploration' | 'utility';

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly author: string;
  readonly description: string;
  readonly category: PluginCategory;
  readonly apiVersion: number;
  readonly entryPoint: string;
  readonly dependencies: readonly PluginDependency[];
  readonly permissions: readonly PluginPermission[];
  readonly resourceLimits: ResourceLimits;
  readonly signature: string | undefined;
}

export interface PluginDependency {
  readonly pluginId: string;
  readonly versionConstraint: string;
  readonly optional: boolean;
}

export type PluginPermission =
  | 'entity:read'
  | 'entity:write'
  | 'event:emit'
  | 'event:subscribe'
  | 'economy:read'
  | 'economy:write'
  | 'npc:control'
  | 'world:modify'
  | 'network:outbound';

export interface ResourceLimits {
  readonly memoryMb: number;
  readonly cpuTimeMs: number;
  readonly maxFileHandles: number;
  readonly networkAllowed: boolean;
}

export interface PluginRegistration {
  readonly pluginId: string;
  readonly manifest: PluginManifest;
  readonly status: PluginStatus;
  readonly loadOrder: number;
  readonly sandboxHandle: SandboxHandle | undefined;
  readonly loadedAt: bigint | undefined;
  readonly lastError: string | undefined;
  readonly version: number;
}

export interface SandboxHandle {
  readonly id: string;
  readonly pluginId: string;
}

export interface SandboxUsage {
  readonly memoryUsedMb: number;
  readonly cpuTimeUsedMs: number;
  readonly fileHandlesOpen: number;
}

export interface MarketplaceEntry {
  readonly pluginId: string;
  readonly manifest: PluginManifest;
  readonly downloads: number;
  readonly rating: number;
  readonly ratingCount: number;
  readonly approved: boolean;
  readonly auditedAt: bigint | undefined;
  readonly publishedAt: bigint;
}

export interface PluginTelemetrySample {
  readonly pluginId: string;
  readonly requestCount: number;
  readonly errorCount: number;
  readonly avgLatencyMs: number;
  readonly p99LatencyMs: number;
  readonly memoryUsedMb: number;
  readonly cpuTimeMs: number;
  readonly capturedAt: bigint;
}

export interface PluginApiDoc {
  readonly pluginId: string;
  readonly name: string;
  readonly version: string;
  readonly endpoints: readonly ApiEndpointDoc[];
  readonly events: readonly ApiEventDoc[];
  readonly generatedAt: bigint;
}

export interface ApiEndpointDoc {
  readonly name: string;
  readonly description: string;
  readonly parameters: readonly ParameterDoc[];
  readonly returnType: string;
}

export interface ApiEventDoc {
  readonly name: string;
  readonly description: string;
  readonly payloadType: string;
}

export interface ParameterDoc {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
}

export interface HotReloadResult {
  readonly pluginId: string;
  readonly previousVersion: string;
  readonly newVersion: string;
  readonly success: boolean;
  readonly downtime: number;
  readonly error: string | undefined;
}

export interface DependencyResolution {
  readonly loadOrder: readonly string[];
  readonly conflicts: readonly DependencyConflict[];
  readonly unresolved: readonly string[];
}

export interface DependencyConflict {
  readonly pluginId: string;
  readonly requiredBy: string;
  readonly constraint: string;
  readonly availableVersion: string;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface PluginSystemDeps {
  readonly clock: PluginClockPort;
  readonly ids: PluginIdPort;
  readonly log: PluginLogPort;
  readonly events: PluginEventPort;
  readonly store: PluginStorePort;
  readonly signatures: PluginSignaturePort;
  readonly sandbox: PluginSandboxPort;
}

export interface PluginSystemConfig {
  readonly maxPlugins: number;
  readonly defaultMemoryLimitMb: number;
  readonly defaultCpuTimeMs: number;
  readonly currentApiVersion: number;
  readonly hotReloadGracePeriodMs: number;
  readonly requireSignature: boolean;
}

const DEFAULT_CONFIG: PluginSystemConfig = {
  maxPlugins: MAX_PLUGINS,
  defaultMemoryLimitMb: DEFAULT_MEMORY_LIMIT_MB,
  defaultCpuTimeMs: DEFAULT_CPU_TIME_MS,
  currentApiVersion: DEFAULT_API_VERSION,
  hotReloadGracePeriodMs: HOT_RELOAD_GRACE_PERIOD_MS,
  requireSignature: true,
};

// ─── Service Interface ──────────────────────────────────────────────

export interface PluginSystem {
  readonly registerPlugin: (manifest: PluginManifest) => Promise<PluginRegistration>;
  readonly loadPlugin: (pluginId: string) => Promise<PluginRegistration>;
  readonly unloadPlugin: (pluginId: string) => Promise<PluginRegistration>;
  readonly hotReload: (pluginId: string, updatedManifest: PluginManifest) => Promise<HotReloadResult>;
  readonly resolveDependencies: (pluginIds: readonly string[]) => Promise<DependencyResolution>;
  readonly executePluginAction: <T>(pluginId: string, action: string, args: readonly unknown[]) => Promise<T>;
  readonly getPluginTelemetry: (pluginId: string) => Promise<PluginTelemetrySample>;
  readonly publishToMarketplace: (manifest: PluginManifest) => Promise<MarketplaceEntry>;
  readonly searchMarketplace: (category?: PluginCategory) => Promise<readonly MarketplaceEntry[]>;
  readonly generateApiDocs: (pluginId: string) => Promise<PluginApiDoc>;
  readonly checkApiCompatibility: (manifest: PluginManifest) => ApiCompatibilityResult;
  readonly getPluginSystemStats: () => PluginSystemStats;
}

export interface ApiCompatibilityResult {
  readonly compatible: boolean;
  readonly pluginApiVersion: number;
  readonly currentApiVersion: number;
  readonly deprecatedApis: readonly string[];
  readonly removedApis: readonly string[];
}

export interface PluginSystemStats {
  readonly totalRegistered: number;
  readonly activePlugins: number;
  readonly failedPlugins: number;
  readonly hotReloads: number;
  readonly totalExecutions: number;
  readonly marketplaceEntries: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPluginSystem(
  deps: PluginSystemDeps,
  config?: Partial<PluginSystemConfig>,
): PluginSystem {
  const cfg: PluginSystemConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store, signatures, sandbox } = deps;

  let totalRegistered = 0;
  let activePlugins = 0;
  let failedPlugins = 0;
  let hotReloads = 0;
  let totalExecutions = 0;
  let marketplaceEntries = 0;

  // ── Registration ────────────────────────────────────────────────

  async function registerPlugin(manifest: PluginManifest): Promise<PluginRegistration> {
    const existing = await store.getRegistration(manifest.id);
    if (existing && existing.status === 'active') {
      throw new Error(`Plugin already active: ${manifest.id}`);
    }

    const allRegs = await store.listRegistrations();
    if (allRegs.length >= cfg.maxPlugins) {
      throw new Error(`Maximum plugin limit reached: ${cfg.maxPlugins}`);
    }

    if (cfg.requireSignature && manifest.signature) {
      const valid = await signatures.verify(manifest.id, manifest.signature, manifest.author);
      if (!valid) {
        throw new Error(`Invalid signature for plugin: ${manifest.id}`);
      }
    }

    const compat = checkApiCompatibility(manifest);
    if (!compat.compatible) {
      throw new Error(`Plugin API version ${manifest.apiVersion} is incompatible with current ${cfg.currentApiVersion}`);
    }

    const reg: PluginRegistration = {
      pluginId: manifest.id,
      manifest,
      status: 'registered',
      loadOrder: allRegs.length,
      sandboxHandle: undefined,
      loadedAt: undefined,
      lastError: undefined,
      version: 1,
    };

    await store.saveRegistration(reg);
    await store.saveManifest(manifest);
    totalRegistered++;

    events.emit(makeEvent(
      'plugin.registered',
      { pluginId: manifest.id, name: manifest.name, version: manifest.version },
      ids, clock,
    ));

    log.info('plugin registered', { pluginId: manifest.id, name: manifest.name });
    return reg;
  }

  // ── Loading ─────────────────────────────────────────────────────

  async function loadPlugin(pluginId: string): Promise<PluginRegistration> {
    const reg = await store.getRegistration(pluginId);
    if (!reg) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (reg.status === 'active') {
      return reg;
    }

    const resolution = await resolveDependencies([pluginId]);
    if (resolution.unresolved.length > 0) {
      throw new Error(`Unresolved dependencies: ${resolution.unresolved.join(', ')}`);
    }

    if (resolution.conflicts.length > 0) {
      const conflictDesc = resolution.conflicts
        .map(c => `${c.pluginId} requires ${c.constraint} but ${c.availableVersion} available`)
        .join('; ');
      throw new Error(`Dependency conflicts: ${conflictDesc}`);
    }

    const limits: ResourceLimits = {
      memoryMb: reg.manifest.resourceLimits.memoryMb || cfg.defaultMemoryLimitMb,
      cpuTimeMs: reg.manifest.resourceLimits.cpuTimeMs || cfg.defaultCpuTimeMs,
      maxFileHandles: reg.manifest.resourceLimits.maxFileHandles || 10,
      networkAllowed: reg.manifest.resourceLimits.networkAllowed,
    };

    let handle: SandboxHandle;
    try {
      handle = await sandbox.create(pluginId, limits);
    } catch (err) {
      const updated: PluginRegistration = {
        ...reg,
        status: 'failed',
        lastError: err instanceof Error ? err.message : String(err),
      };
      await store.saveRegistration(updated);
      failedPlugins++;
      throw err;
    }

    const updated: PluginRegistration = {
      ...reg,
      status: 'active',
      sandboxHandle: handle,
      loadedAt: clock.now(),
      lastError: undefined,
    };

    await store.saveRegistration(updated);
    activePlugins++;

    events.emit(makeEvent(
      'plugin.loaded',
      { pluginId, name: reg.manifest.name },
      ids, clock,
    ));

    log.info('plugin loaded', { pluginId });
    return updated;
  }

  // ── Unloading ───────────────────────────────────────────────────

  async function unloadPlugin(pluginId: string): Promise<PluginRegistration> {
    const reg = await store.getRegistration(pluginId);
    if (!reg) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (reg.sandboxHandle) {
      await sandbox.destroy(reg.sandboxHandle);
    }

    const updated: PluginRegistration = {
      ...reg,
      status: 'unloaded',
      sandboxHandle: undefined,
    };

    await store.saveRegistration(updated);
    if (reg.status === 'active') {
      activePlugins = Math.max(0, activePlugins - 1);
    }

    events.emit(makeEvent(
      'plugin.unloaded',
      { pluginId },
      ids, clock,
    ));

    log.info('plugin unloaded', { pluginId });
    return updated;
  }

  // ── Hot reload ──────────────────────────────────────────────────

  async function hotReload(
    pluginId: string,
    updatedManifest: PluginManifest,
  ): Promise<HotReloadResult> {
    const reg = await store.getRegistration(pluginId);
    if (!reg) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const previousVersion = reg.manifest.version;
    const startTime = clock.now();

    try {
      if (reg.sandboxHandle) {
        await sandbox.destroy(reg.sandboxHandle);
      }

      const limits: ResourceLimits = {
        memoryMb: updatedManifest.resourceLimits.memoryMb || cfg.defaultMemoryLimitMb,
        cpuTimeMs: updatedManifest.resourceLimits.cpuTimeMs || cfg.defaultCpuTimeMs,
        maxFileHandles: updatedManifest.resourceLimits.maxFileHandles || 10,
        networkAllowed: updatedManifest.resourceLimits.networkAllowed,
      };

      const newHandle = await sandbox.create(pluginId, limits);

      const updated: PluginRegistration = {
        ...reg,
        manifest: updatedManifest,
        status: 'active',
        sandboxHandle: newHandle,
        loadedAt: clock.now(),
        lastError: undefined,
        version: reg.version + 1,
      };

      await store.saveRegistration(updated);
      await store.saveManifest(updatedManifest);
      hotReloads++;

      const downtime = Number(clock.now() - startTime);

      events.emit(makeEvent(
        'plugin.hot-reloaded',
        { pluginId, previousVersion, newVersion: updatedManifest.version, downtime },
        ids, clock,
      ));

      log.info('plugin hot-reloaded', { pluginId, previousVersion, newVersion: updatedManifest.version });

      return {
        pluginId,
        previousVersion,
        newVersion: updatedManifest.version,
        success: true,
        downtime,
        error: undefined,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failedPlugins++;

      log.error('plugin hot-reload failed', { pluginId, error });

      return {
        pluginId,
        previousVersion,
        newVersion: updatedManifest.version,
        success: false,
        downtime: Number(clock.now() - startTime),
        error,
      };
    }
  }

  // ── Dependency resolution ───────────────────────────────────────

  async function resolveDependencies(
    pluginIds: readonly string[],
  ): Promise<DependencyResolution> {
    const visited = new Set<string>();
    const loadOrder: string[] = [];
    const conflicts: DependencyConflict[] = [];
    const unresolved: string[] = [];

    async function visit(pluginId: string, depth: number): Promise<void> {
      if (depth > MAX_DEPENDENCY_DEPTH) {
        unresolved.push(`${pluginId} (circular or too deep)`);
        return;
      }

      if (visited.has(pluginId)) return;
      visited.add(pluginId);

      const manifest = await store.getManifest(pluginId);
      if (!manifest) {
        unresolved.push(pluginId);
        return;
      }

      for (const dep of manifest.dependencies) {
        const depManifest = await store.getManifest(dep.pluginId);
        if (!depManifest) {
          if (!dep.optional) {
            unresolved.push(dep.pluginId);
          }
          continue;
        }

        if (!satisfiesConstraint(depManifest.version, dep.versionConstraint)) {
          conflicts.push({
            pluginId: dep.pluginId,
            requiredBy: pluginId,
            constraint: dep.versionConstraint,
            availableVersion: depManifest.version,
          });
        }

        await visit(dep.pluginId, depth + 1);
      }

      loadOrder.push(pluginId);
    }

    for (const id of pluginIds) {
      await visit(id, 0);
    }

    return { loadOrder, conflicts, unresolved };
  }

  function satisfiesConstraint(version: string, constraint: string): boolean {
    if (constraint === '*') return true;

    const parts = version.split('.').map(Number);
    const major = parts[0] ?? 0;

    if (constraint.startsWith('^')) {
      const constraintMajor = Number(constraint.slice(1).split('.')[0]);
      return major === constraintMajor;
    }

    if (constraint.startsWith('>=')) {
      return version >= constraint.slice(2);
    }

    return version === constraint;
  }

  // ── Sandboxed execution ─────────────────────────────────────────

  async function executePluginAction<T>(
    pluginId: string,
    action: string,
    args: readonly unknown[],
  ): Promise<T> {
    const reg = await store.getRegistration(pluginId);
    if (!reg || reg.status !== 'active' || !reg.sandboxHandle) {
      throw new Error(`Plugin not active: ${pluginId}`);
    }

    const startTime = clock.now();
    try {
      const result = await sandbox.execute<T>(reg.sandboxHandle, action, args);
      totalExecutions++;

      const elapsed = Number(clock.now() - startTime);
      if (elapsed > reg.manifest.resourceLimits.cpuTimeMs) {
        log.warn('plugin execution exceeded time limit', { pluginId, action, elapsed });
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('plugin execution failed', { pluginId, action, error });
      throw err;
    }
  }

  // ── Telemetry ───────────────────────────────────────────────────

  async function getPluginTelemetry(pluginId: string): Promise<PluginTelemetrySample> {
    const reg = await store.getRegistration(pluginId);
    if (!reg || !reg.sandboxHandle) {
      throw new Error(`Plugin not active: ${pluginId}`);
    }

    const usage = await sandbox.getUsage(reg.sandboxHandle);
    const history = await store.getTelemetryHistory(pluginId, 1);
    const prev = history[0];

    const sample: PluginTelemetrySample = {
      pluginId,
      requestCount: (prev?.requestCount ?? 0) + 1,
      errorCount: prev?.errorCount ?? 0,
      avgLatencyMs: prev?.avgLatencyMs ?? 0,
      p99LatencyMs: prev?.p99LatencyMs ?? 0,
      memoryUsedMb: usage.memoryUsedMb,
      cpuTimeMs: usage.cpuTimeUsedMs,
      capturedAt: clock.now(),
    };

    await store.saveTelemetry(sample);
    return sample;
  }

  // ── Marketplace ─────────────────────────────────────────────────

  async function publishToMarketplace(manifest: PluginManifest): Promise<MarketplaceEntry> {
    if (cfg.requireSignature && !manifest.signature) {
      throw new Error('Plugin must be signed for marketplace publication');
    }

    const entry: MarketplaceEntry = {
      pluginId: manifest.id,
      manifest,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      approved: false,
      auditedAt: undefined,
      publishedAt: clock.now(),
    };

    await store.saveMarketplaceEntry(entry);
    marketplaceEntries++;

    events.emit(makeEvent(
      'plugin.marketplace.published',
      { pluginId: manifest.id, name: manifest.name },
      ids, clock,
    ));

    log.info('plugin published to marketplace', { pluginId: manifest.id });
    return entry;
  }

  async function searchMarketplace(category?: PluginCategory): Promise<readonly MarketplaceEntry[]> {
    return store.listMarketplace(category);
  }

  // ── API documentation ───────────────────────────────────────────

  async function generateApiDocs(pluginId: string): Promise<PluginApiDoc> {
    const manifest = await store.getManifest(pluginId);
    if (!manifest) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const endpoints: ApiEndpointDoc[] = manifest.permissions
      .filter(p => p.endsWith(':read') || p.endsWith(':write'))
      .map(p => ({
        name: p,
        description: `Permission-based endpoint for ${p}`,
        parameters: [],
        returnType: 'unknown',
      }));

    const eventsDoc: ApiEventDoc[] = manifest.permissions
      .filter(p => p.startsWith('event:'))
      .map(p => ({
        name: p,
        description: `Event capability: ${p}`,
        payloadType: 'LoomEvent',
      }));

    return {
      pluginId,
      name: manifest.name,
      version: manifest.version,
      endpoints,
      events: eventsDoc,
      generatedAt: clock.now(),
    };
  }

  // ── API compatibility ───────────────────────────────────────────

  function checkApiCompatibility(manifest: PluginManifest): ApiCompatibilityResult {
    const compatible = manifest.apiVersion <= cfg.currentApiVersion;

    const deprecatedApis: string[] = [];
    const removedApis: string[] = [];

    if (manifest.apiVersion < cfg.currentApiVersion - 1) {
      deprecatedApis.push(`API v${manifest.apiVersion} is deprecated`);
    }

    if (manifest.apiVersion < cfg.currentApiVersion - 2) {
      removedApis.push(`API v${manifest.apiVersion} support has been removed`);
    }

    return {
      compatible: compatible && removedApis.length === 0,
      pluginApiVersion: manifest.apiVersion,
      currentApiVersion: cfg.currentApiVersion,
      deprecatedApis,
      removedApis,
    };
  }

  // ── Stats ───────────────────────────────────────────────────────

  function getPluginSystemStats(): PluginSystemStats {
    return {
      totalRegistered,
      activePlugins,
      failedPlugins,
      hotReloads,
      totalExecutions,
      marketplaceEntries,
    };
  }

  return {
    registerPlugin,
    loadPlugin,
    unloadPlugin,
    hotReload,
    resolveDependencies,
    executePluginAction,
    getPluginTelemetry,
    publishToMarketplace,
    searchMarketplace,
    generateApiDocs,
    checkApiCompatibility,
    getPluginSystemStats,
  };
}
