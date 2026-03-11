/**
 * game-orchestrator.ts — Wires game systems into LoomCore.
 *
 * Sits above the infrastructure layer (LoomCore) and plugs in
 * game-specific systems: movement, spawning, visual state mapping,
 * bridge synchronization, player connection management, and
 * optional fabric orchestrators (nakama, shuttle, weave).
 *
 * This is the top of the vertical slice — the thing that makes
 * all the layers compose into a running game loop.
 */

import type { LoomCore, LoomCoreConfig } from './loom-core.js';
import type { SpawnSystemService } from './spawn-system.js';
import type { PlayerConnectionSystem } from './player-connection-system.js';
import type { BridgeService, BridgeRenderingFabric } from './bridge-service.js';
import type { VisualStateMapperService } from './visual-state-mapper.js';
import type { SystemFn } from './system-registry.js';
import type { ComponentStore } from './component-store.js';
import type { NakamaSystemOrchestrator } from './nakama-system.js';
import type { ShuttleSystemOrchestrator, ShuttleWorldListPort } from './shuttle-system.js';
import type { WeaveSystemOrchestrator, WeaveTransitCompletionPort } from './weave-system.js';
import type { SelvaeBroadcastPort } from './selvage-adapters.js';
import type {
  PlayerConnectOrchestrator,
  ConnectTokenPort,
  ConnectIdentityPort,
  ConnectSpawnPointPort,
  ConnectLifecyclePort,
} from './player-connect-orchestrator.js';
import type { InspectorHealthPort } from './inspector-integration.js';
import { registerFabricHealthProbes } from './inspector-integration.js';

import { createLoomCore } from './loom-core.js';
import { createMovementSystem, MOVEMENT_SYSTEM_PRIORITY } from './movement-system.js';
import { createSpawnSystem } from './spawn-system.js';
import { createVisualStateMapper, VISUAL_STATE_MAPPER_PRIORITY } from './visual-state-mapper.js';
import { createBridgeService, BRIDGE_SERVICE_PRIORITY } from './bridge-service.js';
import { createPlayerConnectionSystem } from './player-connection-system.js';
import { createNakamaSystem, NAKAMA_SYSTEM_PRIORITY } from './nakama-system.js';
import { createShuttleSystem, SHUTTLE_SYSTEM_PRIORITY } from './shuttle-system.js';
import { createWeaveSystem, WEAVE_SYSTEM_PRIORITY } from './weave-system.js';
import { createSelvageBroadcastSystem, SELVAGE_BROADCAST_PRIORITY } from './selvage-adapters.js';
import { createPlayerConnectOrchestrator } from './player-connect-orchestrator.js';

// ── Fabric Ports ────────────────────────────────────────────────

export interface FabricDeps {
  readonly nakama?: NakamaSystemOrchestrator;
  readonly shuttle?: ShuttleFabricDeps;
  readonly weave?: WeaveFabricDeps;
  readonly selvage?: SelvaeBroadcastPort;
  readonly connect?: ConnectFabricDeps;
  readonly inspector?: InspectorFabricDeps;
}

export interface InspectorFabricDeps {
  readonly health: InspectorHealthPort;
  readonly nakama?: { readonly getTickCount: () => number };
  readonly shuttle?: {
    readonly getTickCount: () => number;
    readonly getStats: () => { readonly totalNpcsProcessed: number };
  };
  readonly weave?: {
    readonly getTickCount: () => number;
    readonly getStats: () => {
      readonly totalTransitsCompleted: number;
      readonly totalTransitsAborted: number;
    };
  };
}

export interface ConnectFabricDeps {
  readonly token: ConnectTokenPort;
  readonly identity: ConnectIdentityPort;
  readonly spawnPoints: ConnectSpawnPointPort;
  readonly lifecycle?: ConnectLifecyclePort;
}

export interface ShuttleFabricDeps {
  readonly orchestrator: ShuttleSystemOrchestrator;
  readonly worldList: ShuttleWorldListPort;
}

export interface WeaveFabricDeps {
  readonly orchestrator: WeaveSystemOrchestrator;
  readonly completions: WeaveTransitCompletionPort;
}

// ── Config ──────────────────────────────────────────────────────

export interface GameOrchestratorConfig {
  readonly renderingFabric: BridgeRenderingFabric;
  readonly coreConfig?: LoomCoreConfig;
  readonly fabrics?: FabricDeps;
}

// ── Public API ──────────────────────────────────────────────────

export interface GameOrchestrator {
  readonly core: LoomCore;
  readonly spawns: SpawnSystemService;
  readonly connections: PlayerConnectionSystem;
  readonly bridge: BridgeService;
  readonly visualMapper: VisualStateMapperService;
  readonly playerConnect: PlayerConnectOrchestrator | undefined;
  readonly start: () => void;
  readonly stop: () => void;
}

// ── Factory ─────────────────────────────────────────────────────

function createGameOrchestrator(config: GameOrchestratorConfig): GameOrchestrator {
  const core = createLoomCore(config.coreConfig);
  const store = core.entities.components;
  const clock = config.coreConfig?.clock ?? { nowMicroseconds: () => Date.now() * 1000 };

  const systems = buildGameSystems(core, store, clock, config);
  registerCoreSystems(core, systems);
  registerFabricSystems(core, store, clock, config.fabrics);

  const playerConnect = buildConnectOrchestrator(systems, config.fabrics);

  wireInspectorProbes(systems, clock, config.fabrics);

  return {
    core,
    spawns: systems.spawns,
    connections: systems.connections,
    bridge: systems.bridge,
    visualMapper: systems.visualMapper,
    playerConnect,
    start: () => {
      core.tickLoop.start();
    },
    stop: () => {
      core.shutdown();
    },
  };
}

// ── Core System Construction ────────────────────────────────────

interface GameSystems {
  readonly spawns: SpawnSystemService;
  readonly connections: PlayerConnectionSystem;
  readonly bridge: BridgeService;
  readonly visualMapper: VisualStateMapperService;
  readonly movementSystemFn: SystemFn;
}

function buildGameSystems(
  core: LoomCore,
  store: ComponentStore,
  clock: { readonly nowMicroseconds: () => number },
  config: GameOrchestratorConfig,
): GameSystems {
  const movementSystemFn = createMovementSystem({ componentStore: store });
  const spawns = createSpawnSystem({
    entityRegistry: core.entities,
    componentStore: store,
    clock,
  });
  const connections = createPlayerConnectionSystem({ clock });
  const visualMapper = createVisualStateMapper({ componentStore: store });
  const bridge = createBridgeService({
    visualStateMapper: visualMapper,
    renderingFabric: config.renderingFabric,
    clock,
  });
  return { spawns, connections, bridge, visualMapper, movementSystemFn };
}

function registerCoreSystems(core: LoomCore, systems: GameSystems): void {
  core.systems.register('movement', systems.movementSystemFn, MOVEMENT_SYSTEM_PRIORITY);
  core.systems.register(
    'visual-state-mapper',
    systems.visualMapper.system,
    VISUAL_STATE_MAPPER_PRIORITY,
  );
  core.systems.register('bridge-service', systems.bridge.system, BRIDGE_SERVICE_PRIORITY);
}

// ── Fabric System Registration ──────────────────────────────────

function registerFabricSystems(
  core: LoomCore,
  store: ComponentStore,
  clock: { readonly nowMicroseconds: () => number },
  fabrics?: FabricDeps,
): void {
  if (fabrics === undefined) return;
  registerNakama(core, fabrics);
  registerShuttle(core, store, fabrics);
  registerWeave(core, store, clock, fabrics);
  registerSelvage(core, fabrics);
}

function registerNakama(core: LoomCore, fabrics: FabricDeps): void {
  if (fabrics.nakama === undefined) return;
  const fn = createNakamaSystem({ orchestrator: fabrics.nakama });
  core.systems.register('nakama-fabric', fn, NAKAMA_SYSTEM_PRIORITY);
}

function registerShuttle(core: LoomCore, store: ComponentStore, fabrics: FabricDeps): void {
  if (fabrics.shuttle === undefined) return;
  const fn = createShuttleSystem({
    orchestrator: fabrics.shuttle.orchestrator,
    componentStore: store,
    worldList: fabrics.shuttle.worldList,
  });
  core.systems.register('shuttle-npc', fn, SHUTTLE_SYSTEM_PRIORITY);
}

function registerWeave(
  core: LoomCore,
  store: ComponentStore,
  clock: { readonly nowMicroseconds: () => number },
  fabrics: FabricDeps,
): void {
  if (fabrics.weave === undefined) return;
  const fn = createWeaveSystem({
    orchestrator: fabrics.weave.orchestrator,
    completions: fabrics.weave.completions,
    componentStore: store,
    clock,
  });
  core.systems.register('silfen-weave', fn, WEAVE_SYSTEM_PRIORITY);
}

function registerSelvage(core: LoomCore, fabrics: FabricDeps): void {
  if (fabrics.selvage === undefined) return;
  const fn = createSelvageBroadcastSystem(fabrics.selvage);
  core.systems.register('selvage-broadcast', fn, SELVAGE_BROADCAST_PRIORITY);
}

// ── Connect Orchestrator ────────────────────────────────────────

function buildConnectOrchestrator(
  systems: GameSystems,
  fabrics?: FabricDeps,
): PlayerConnectOrchestrator | undefined {
  if (fabrics?.connect === undefined) return undefined;
  return createPlayerConnectOrchestrator({
    token: fabrics.connect.token,
    identity: fabrics.connect.identity,
    connections: systems.connections,
    spawns: systems.spawns,
    spawnPoints: fabrics.connect.spawnPoints,
    lifecycle: fabrics.connect.lifecycle,
  });
}

// ── Inspector Health Probes ──────────────────────────────────────

function wireInspectorProbes(
  systems: GameSystems,
  clock: { readonly nowMicroseconds: () => number },
  fabrics?: FabricDeps,
): void {
  if (fabrics?.inspector === undefined) return;
  registerFabricHealthProbes({
    health: fabrics.inspector.health,
    clock,
    nakama: fabrics.inspector.nakama,
    shuttle: fabrics.inspector.shuttle,
    weave: fabrics.inspector.weave,
    connections: systems.connections,
    bridge: systems.bridge,
  });
}

// ── Exports ─────────────────────────────────────────────────────

export { createGameOrchestrator };
