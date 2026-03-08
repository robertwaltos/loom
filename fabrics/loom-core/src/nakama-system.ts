/**
 * Nakama System — Bridges the NakamaFabricOrchestrator into the ECS tick loop.
 *
 * Runs at priority 100 (early in the tick) so that lattice integrity
 * adjustments and continuity transitions are visible to later systems.
 *
 * This is a thin adapter — it delegates all logic to the orchestrator
 * and merely provides the SystemFn contract that SystemRegistry expects.
 */

import type { SystemFn, SystemContext } from './system-registry.js';

// ── Ports ──────────────────────────────────────────────────────────

/**
 * The subset of NakamaFabricOrchestrator that the system adapter needs.
 * Defined here so loom-core never imports nakama-fabric directly.
 */
export interface NakamaSystemOrchestrator {
  readonly tick: () => NakamaSystemTickResult;
}

export interface NakamaSystemTickResult {
  readonly idleSwept: number;
  readonly continuityTransitions: number;
  readonly integrityChanges: number;
  readonly tickNumber: number;
}

export interface NakamaSystemDeps {
  readonly orchestrator: NakamaSystemOrchestrator;
}

// ── Priority ───────────────────────────────────────────────────────

export const NAKAMA_SYSTEM_PRIORITY = 100;

// ── Factory ────────────────────────────────────────────────────────

function createNakamaSystem(deps: NakamaSystemDeps): SystemFn {
  return (_ctx: SystemContext): void => {
    deps.orchestrator.tick();
  };
}

// ── Exports ────────────────────────────────────────────────────────

export { createNakamaSystem };
