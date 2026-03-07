/**
 * System Registry — ECS system lifecycle management.
 *
 * Systems are functions that run each tick in priority order.
 * Lower priority numbers run first. Systems can be enabled/disabled.
 * The registry is the "S" in ECS.
 */

import type { Logger } from './logger.js';

export interface SystemContext {
  readonly deltaMs: number;
  readonly tickNumber: number;
  readonly wallTimeMicroseconds: number;
}

export type SystemFn = (context: SystemContext) => void;

export interface SystemRegistration {
  readonly name: string;
  readonly priority: number;
  readonly enabled: boolean;
}

export interface SystemRegistry {
  register(name: string, fn: SystemFn, priority?: number): void;
  unregister(name: string): boolean;
  enable(name: string): void;
  disable(name: string): void;
  isRegistered(name: string): boolean;
  listSystems(): ReadonlyArray<SystemRegistration>;
  runAll(context: SystemContext): void;
}

interface RegisteredSystem {
  readonly name: string;
  readonly fn: SystemFn;
  readonly priority: number;
  enabled: boolean;
}

interface RegistryState {
  readonly systems: Map<string, RegisteredSystem>;
  readonly logger: Logger;
  sorted: ReadonlyArray<RegisteredSystem>;
  dirty: boolean;
}

export function createSystemRegistry(deps: { readonly logger: Logger }): SystemRegistry {
  const state: RegistryState = {
    systems: new Map(),
    logger: deps.logger,
    sorted: [],
    dirty: false,
  };

  return {
    register: (name, fn, priority) => {
      registerSystem(state, name, fn, priority);
    },
    unregister: (name) => unregisterSystem(state, name),
    enable: (name) => {
      setEnabled(state, name, true);
    },
    disable: (name) => {
      setEnabled(state, name, false);
    },
    isRegistered: (name) => state.systems.has(name),
    listSystems: () => getSorted(state).map(toRegistration),
    runAll: (ctx) => {
      runAllSystems(state, ctx);
    },
  };
}

function registerSystem(state: RegistryState, name: string, fn: SystemFn, priority = 100): void {
  if (state.systems.has(name)) {
    throw new Error(`System "${name}" is already registered`);
  }
  state.systems.set(name, { name, fn, priority, enabled: true });
  state.dirty = true;
}

function unregisterSystem(state: RegistryState, name: string): boolean {
  const removed = state.systems.delete(name);
  if (removed) state.dirty = true;
  return removed;
}

function setEnabled(state: RegistryState, name: string, enabled: boolean): void {
  const system = state.systems.get(name);
  if (system === undefined) {
    throw new Error(`System "${name}" is not registered`);
  }
  system.enabled = enabled;
}

function getSorted(state: RegistryState): ReadonlyArray<RegisteredSystem> {
  if (state.dirty) {
    state.sorted = [...state.systems.values()].sort((a, b) => a.priority - b.priority);
    state.dirty = false;
  }
  return state.sorted;
}

function runAllSystems(state: RegistryState, context: SystemContext): void {
  for (const system of getSorted(state)) {
    if (!system.enabled) continue;
    try {
      system.fn(context);
    } catch (err: unknown) {
      state.logger.error({ system: system.name, error: String(err) }, 'System threw during tick');
    }
  }
}

function toRegistration(system: RegisteredSystem): SystemRegistration {
  return { name: system.name, priority: system.priority, enabled: system.enabled };
}
