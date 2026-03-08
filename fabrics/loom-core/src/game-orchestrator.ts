/**
 * game-orchestrator.ts — Wires game systems into LoomCore.
 *
 * Sits above the infrastructure layer (LoomCore) and plugs in
 * game-specific systems: movement, spawning, visual state mapping,
 * bridge synchronization, and player connection management.
 *
 * This is the top of the vertical slice — the thing that makes
 * all the layers compose into a running game loop.
 */

import type { LoomCore, LoomCoreConfig } from './loom-core.js';
import type { SpawnSystemService } from './spawn-system.js';
import type { PlayerConnectionSystem } from './player-connection-system.js';
import type { BridgeService, BridgeRenderingFabric } from './bridge-service.js';
import type { VisualStateMapperService } from './visual-state-mapper.js';

import { createLoomCore } from './loom-core.js';
import { createMovementSystem, MOVEMENT_SYSTEM_PRIORITY } from './movement-system.js';
import { createSpawnSystem } from './spawn-system.js';
import { createVisualStateMapper, VISUAL_STATE_MAPPER_PRIORITY } from './visual-state-mapper.js';
import { createBridgeService, BRIDGE_SERVICE_PRIORITY } from './bridge-service.js';
import { createPlayerConnectionSystem } from './player-connection-system.js';

// ── Ports ────────────────────────────────────────────────────────

export interface GameOrchestratorConfig {
  readonly renderingFabric: BridgeRenderingFabric;
  readonly coreConfig?: LoomCoreConfig;
}

// ── Public API ──────────────────────────────────────────────────

export interface GameOrchestrator {
  readonly core: LoomCore;
  readonly spawns: SpawnSystemService;
  readonly connections: PlayerConnectionSystem;
  readonly bridge: BridgeService;
  readonly visualMapper: VisualStateMapperService;
  readonly start: () => void;
  readonly stop: () => void;
}

// ── Factory ─────────────────────────────────────────────────────

function createGameOrchestrator(config: GameOrchestratorConfig): GameOrchestrator {
  const core = createLoomCore(config.coreConfig);
  const store = core.entities.components;
  const clock = config.coreConfig?.clock ?? { nowMicroseconds: () => Date.now() * 1000 };

  const systems = buildGameSystems(core, store, clock, config);
  registerSystems(core, systems);

  return {
    core,
    spawns: systems.spawns,
    connections: systems.connections,
    bridge: systems.bridge,
    visualMapper: systems.visualMapper,
    start: () => { core.tickLoop.start(); },
    stop: () => { core.shutdown(); },
  };
}

// ── System Construction ─────────────────────────────────────────

interface GameSystems {
  readonly spawns: SpawnSystemService;
  readonly connections: PlayerConnectionSystem;
  readonly bridge: BridgeService;
  readonly visualMapper: VisualStateMapperService;
  readonly movementSystemFn: (ctx: import('./system-registry.js').SystemContext) => void;
}

function buildGameSystems(
  core: LoomCore,
  store: import('./component-store.js').ComponentStore,
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

function registerSystems(core: LoomCore, systems: GameSystems): void {
  core.systems.register('movement', systems.movementSystemFn, MOVEMENT_SYSTEM_PRIORITY);
  core.systems.register('visual-state-mapper', systems.visualMapper.system, VISUAL_STATE_MAPPER_PRIORITY);
  core.systems.register('bridge-service', systems.bridge.system, BRIDGE_SERVICE_PRIORITY);
}

// ── Exports ─────────────────────────────────────────────────────

export { createGameOrchestrator };
