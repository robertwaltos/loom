/**
 * modding-sdk.ts — Modding SDK TypeScript API (Phase 16.4)
 *
 * Provides a structured hook-based API for community mods to extend
 * The Concord game without modifying core engine code.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const CURRENT_API_VERSION = '1.0';

// ── Hook Enum ─────────────────────────────────────────────────────────────────

export const ModHook = {
  WORLD_TICK: 'WORLD_TICK',
  ENTITY_SPAWN: 'ENTITY_SPAWN',
  ENTITY_DESPAWN: 'ENTITY_DESPAWN',
  NPC_DIALOGUE: 'NPC_DIALOGUE',
  TRADE_EXECUTE: 'TRADE_EXECUTE',
  QUEST_COMPLETE: 'QUEST_COMPLETE',
  ASSEMBLY_VOTE: 'ASSEMBLY_VOTE',
  TRANSIT_START: 'TRANSIT_START',
  TRANSIT_END: 'TRANSIT_END',
  ECONOMY_TICK: 'ECONOMY_TICK',
} as const;

export type ModHook = (typeof ModHook)[keyof typeof ModHook];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModContext = {
  modId: string;
  worldId: string;
  tick: bigint;
  clock: () => bigint;
  log: (msg: string) => void;
  emit: (eventType: string, payload: unknown) => void;
};

export type HookHandler<T> = (ctx: ModContext, payload: T) => void | T;

export type ModManifest = {
  modId: string;
  name: string;
  version: string;
  author: string;
  hooks: ModHook[];
  description: string;
  apiVersion: string;
};

export type ModRegistry = {
  registerMod(manifest: ModManifest): void;
  on<T>(modId: string, hook: ModHook, handler: HookHandler<T>): void;
  off(modId: string, hook: ModHook): void;
  fire<T>(hook: ModHook, ctx: ModContext, payload: T): T;
  getRegisteredMods(): ModManifest[];
  isRegistered(modId: string): boolean;
  unregisterMod(modId: string): void;
  getHandlerCount(hook: ModHook): number;
};

// ── Internal State ────────────────────────────────────────────────────────────

interface HandlerEntry {
  modId: string;
  hook: ModHook;
  handler: HookHandler<unknown>;
  order: number;
}

interface RegistryState {
  mods: Map<string, ModManifest>;
  handlers: HandlerEntry[];
  orderCounter: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMajorVersion(apiVersion: string): number {
  const major = parseInt(apiVersion.split('.')[0] ?? '', 10);
  return isNaN(major) ? -1 : major;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createModRegistry(opts?: { apiVersion?: string }): ModRegistry {
  const effectiveApiVersion = opts?.apiVersion ?? CURRENT_API_VERSION;

  const state: RegistryState = {
    mods: new Map(),
    handlers: [],
    orderCounter: 0,
  };

  return {
    registerMod(manifest: ModManifest): void {
      if (
        parseMajorVersion(manifest.apiVersion) !==
        parseMajorVersion(effectiveApiVersion)
      ) {
        throw new Error(
          `Mod "${manifest.modId}" requires apiVersion "${manifest.apiVersion}" but registry is "${effectiveApiVersion}"`,
        );
      }
      if (state.mods.has(manifest.modId)) {
        throw new Error(`Mod "${manifest.modId}" is already registered`);
      }
      state.mods.set(manifest.modId, manifest);
    },

    on<T>(modId: string, hook: ModHook, handler: HookHandler<T>): void {
      if (!state.mods.has(modId)) {
        throw new Error(`Mod "${modId}" is not registered`);
      }
      state.handlers.push({
        modId,
        hook,
        handler: handler as HookHandler<unknown>,
        order: state.orderCounter++,
      });
    },

    off(modId: string, hook: ModHook): void {
      state.handlers = state.handlers.filter(
        (e) => !(e.modId === modId && e.hook === hook),
      );
    },

    fire<T>(hook: ModHook, ctx: ModContext, payload: T): T {
      const relevant = state.handlers
        .filter((e) => e.hook === hook)
        .sort((a, b) => a.order - b.order);

      let current: unknown = payload;
      for (const entry of relevant) {
        const result = entry.handler(ctx, current);
        if (result !== undefined && result !== null) {
          current = result;
        }
      }
      return current as T;
    },

    getRegisteredMods(): ModManifest[] {
      return [...state.mods.values()];
    },

    isRegistered(modId: string): boolean {
      return state.mods.has(modId);
    },

    unregisterMod(modId: string): void {
      state.mods.delete(modId);
      state.handlers = state.handlers.filter((e) => e.modId !== modId);
    },

    getHandlerCount(hook: ModHook): number {
      return state.handlers.filter((e) => e.hook === hook).length;
    },
  };
}
