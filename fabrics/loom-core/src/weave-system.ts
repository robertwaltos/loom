/**
 * Weave System — Bridges the WeaveOrchestrator into the ECS tick loop.
 *
 * Runs at priority 500 (after shuttle, before bridge) so that transit
 * completions update world-membership before the visual pipeline runs.
 *
 * The key adapter responsibility: when a transit completes, mutate the
 * entity's `world-membership` component to reflect the new world. This
 * closes the loop from queue → corridor → ECS state.
 */

import type { EntityId, WorldMembershipComponent } from '@loom/entities-contracts';
import type { ComponentStore } from './component-store.js';
import type { SystemFn, SystemContext } from './system-registry.js';

// ── Ports ──────────────────────────────────────────────────────────

/**
 * The subset of WeaveOrchestrator this adapter needs.
 * Defined here so loom-core never imports silfen-weave directly.
 */
export interface WeaveSystemOrchestrator {
  readonly tick: () => WeaveSystemTickResult;
}

export interface WeaveSystemTickResult {
  readonly corridorsOpened: number;
  readonly transitsCompleted: number;
  readonly transitsAborted: number;
  readonly activeCorridors: number;
  readonly tickNumber: number;
}

/**
 * Port for retrieving completed transit details.
 * The weave system needs to know which entity arrived where
 * so it can update the ECS world-membership component.
 */
export interface WeaveTransitCompletionPort {
  readonly drainCompleted: () => ReadonlyArray<WeaveCompletedTransit>;
}

export interface WeaveCompletedTransit {
  readonly entityId: string;
  readonly destinationNodeId: string;
}

export interface WeaveSystemDeps {
  readonly orchestrator: WeaveSystemOrchestrator;
  readonly completions: WeaveTransitCompletionPort;
  readonly componentStore: ComponentStore;
  readonly clock: { readonly nowMicroseconds: () => number };
}

// ── Priority ───────────────────────────────────────────────────────

export const WEAVE_SYSTEM_PRIORITY = 500;

// ── Factory ────────────────────────────────────────────────────────

function createWeaveSystem(deps: WeaveSystemDeps): SystemFn {
  return (_ctx: SystemContext): void => {
    deps.orchestrator.tick();
    applyCompletedTransits(deps);
  };
}

// ── Transit Application ────────────────────────────────────────────

function applyCompletedTransits(deps: WeaveSystemDeps): void {
  const completed = deps.completions.drainCompleted();

  for (const transit of completed) {
    applyTransit(deps, transit);
  }
}

function applyTransit(
  deps: WeaveSystemDeps,
  transit: WeaveCompletedTransit,
): void {
  const entityId = transit.entityId as EntityId;
  if (!deps.componentStore.has(entityId, 'world-membership')) return;

  const current = deps.componentStore.get(
    entityId,
    'world-membership',
  ) as WorldMembershipComponent;

  const updated: WorldMembershipComponent = {
    worldId: transit.destinationNodeId,
    enteredAt: deps.clock.nowMicroseconds(),
    isTransitioning: false,
    transitionTargetWorldId: null,
  };

  if (current.worldId !== transit.destinationNodeId) {
    deps.componentStore.set(entityId, 'world-membership', updated);
  }
}

// ── Exports ────────────────────────────────────────────────────────

export { createWeaveSystem };
