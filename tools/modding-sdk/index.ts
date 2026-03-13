/**
 * Modding SDK — TypeScript API for world event hooks, custom NPCs, and quests.
 *
 * NEXT-STEPS Phase 16.4: "Modding SDK: TypeScript API for world event hooks,
 * custom NPCs, quests."
 *
 * The Modding SDK is the community-facing API surface that community modders
 * use to extend Project Loom without touching core Fabric code. It wraps
 * the underlying Fabric ports behind a stable, versioned interface.
 *
 * Capabilities:
 *   WORLD HOOKS  — observe and react to world lifecycle events
 *   CUSTOM NPCS  — register NPCs with archetype profiles and dialogue handlers
 *   QUESTS       — define quest templates that integrate with the quest engine
 *   EVENT EMIT   — publish custom events into the Loom event bus
 *
 * API Contract: once released, v1 methods are never removed — only deprecated.
 *
 * Thread: cotton/tools/modding-sdk
 * Tier: 1
 */

// ── Event Hook Types ──────────────────────────────────────────────

export type WorldEventCategory =
  | 'PLAYER_JOIN'
  | 'PLAYER_LEAVE'
  | 'ENTITY_SPAWN'
  | 'ENTITY_DEATH'
  | 'TRADE_COMPLETED'
  | 'QUEST_STARTED'
  | 'QUEST_COMPLETED'
  | 'SEASON_CHANGE'
  | 'WORLD_TICK';

export interface WorldEvent {
  readonly category: WorldEventCategory;
  readonly worldId: string;
  readonly entityId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly occurredAt: number;
}

export type WorldHookHandler = (event: WorldEvent) => void | Promise<void>;

export interface WorldHookDef {
  readonly hookId: string;
  readonly category: WorldEventCategory;
  readonly handler: WorldHookHandler;
  readonly description: string;
}

// ── Custom NPC Types ──────────────────────────────────────────────

export type ModArchetype =
  | 'merchant' | 'scholar' | 'warrior' | 'noble'
  | 'mystic' | 'artisan' | 'outlaw' | 'elder';

export interface DialogueLine {
  readonly trigger: string;
  readonly response: string;
  readonly emotionHint?: string;
}

export interface CustomNpcDef {
  readonly npcId: string;
  readonly archetype: ModArchetype;
  readonly name: string;
  readonly worldId: string;
  readonly dialogueLines: readonly DialogueLine[];
  readonly traitOverrides?: Readonly<Partial<Record<string, number>>>;
}

// ── Quest Types ───────────────────────────────────────────────────

export type QuestStepType = 'FETCH' | 'ESCORT' | 'INVESTIGATE' | 'DEFEND' | 'CRAFT' | 'DELIVER';

export interface QuestStep {
  readonly stepId: string;
  readonly type: QuestStepType;
  readonly description: string;
  readonly targetEntityId?: string;
  readonly quantity?: number;
}

export interface QuestReward {
  readonly kalon?: number;
  readonly items?: readonly string[];
  readonly reputationGain?: number;
}

export interface QuestTemplateDef {
  readonly questId: string;
  readonly title: string;
  readonly description: string;
  readonly steps: readonly QuestStep[];
  readonly reward: QuestReward;
  readonly worldId: string;
  readonly minPlayerLevel?: number;
}

// ── Custom Event Types ────────────────────────────────────────────

export interface CustomEventDef {
  readonly eventType: string;  // mod-scoped, e.g. 'my-mod:custom-ritual'
  readonly payload: Readonly<Record<string, unknown>>;
  readonly worldId: string;
}

// ── SDK Registration Record ───────────────────────────────────────

export interface ModRegistration {
  readonly modId: string;
  readonly version: string;
  readonly hooks: readonly WorldHookDef[];
  readonly npcs: readonly CustomNpcDef[];
  readonly quests: readonly QuestTemplateDef[];
  readonly registeredAt: number;
}

// ── Stats ─────────────────────────────────────────────────────────

export interface ModdingSdkStats {
  readonly registeredMods: number;
  readonly registeredHooks: number;
  readonly registeredNpcs: number;
  readonly registeredQuests: number;
}

// ── Errors ────────────────────────────────────────────────────────

export type ModdingSdkError =
  | { readonly code: 'mod-not-found'; readonly modId: string }
  | { readonly code: 'duplicate-mod'; readonly modId: string }
  | { readonly code: 'invalid-hook'; readonly reason: string }
  | { readonly code: 'invalid-npc'; readonly reason: string }
  | { readonly code: 'invalid-quest'; readonly reason: string };

// ── Ports ─────────────────────────────────────────────────────────

export interface ModEventBusPort {
  readonly publish: (event: CustomEventDef) => void;
}

export interface ModSdkLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Public Interface ──────────────────────────────────────────────

export interface ModdingSdk {
  /** Register a mod with hooks, custom NPCs, and quests in one call. */
  readonly registerMod: (reg: Omit<ModRegistration, 'registeredAt'>) => ModRegistration | ModdingSdkError;
  /** Add a world event hook (must already have a registered mod). */
  readonly registerWorldHook: (modId: string, hook: WorldHookDef) => ModRegistration | ModdingSdkError;
  /** Register a custom NPC into an existing mod. */
  readonly registerCustomNpc: (modId: string, npc: CustomNpcDef) => ModRegistration | ModdingSdkError;
  /** Register a quest template into an existing mod. */
  readonly registerQuest: (modId: string, quest: QuestTemplateDef) => ModRegistration | ModdingSdkError;
  /** Emit a custom event into the world event bus. */
  readonly emit: (event: CustomEventDef) => void;
  /** Get a specific mod's registration. */
  readonly getMod: (modId: string) => ModRegistration | ModdingSdkError;
  /** List all registered mods. */
  readonly listMods: () => readonly ModRegistration[];
  /** Dispatch a world event to all matching hooks. */
  readonly dispatchHook: (event: WorldEvent) => Promise<void>;
  /** Remove all registrations for a mod. */
  readonly unregisterMod: (modId: string) => ModRegistration | ModdingSdkError;
  /** Current SDK statistics. */
  readonly getStats: () => ModdingSdkStats;
}

// ── Deps / Config ─────────────────────────────────────────────────

export interface ModdingSdkDeps {
  readonly eventBus: ModEventBusPort;
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly log: ModSdkLogPort;
}

export interface ModdingSdkConfig {
  readonly maxHooksPerMod: number;
  readonly maxNpcsPerMod: number;
  readonly maxQuestsPerMod: number;
}

export const DEFAULT_SDK_CONFIG: ModdingSdkConfig = {
  maxHooksPerMod: 50,
  maxNpcsPerMod: 100,
  maxQuestsPerMod: 200,
};

// ── Validation ────────────────────────────────────────────────────

function validateHook(hook: WorldHookDef): string | null {
  if (hook.hookId.length === 0) return 'hookId must not be empty';
  if (hook.description.length === 0) return 'description must not be empty';
  return null;
}

function validateNpc(npc: CustomNpcDef): string | null {
  if (npc.npcId.length === 0) return 'npcId must not be empty';
  if (npc.name.length === 0) return 'name must not be empty';
  return null;
}

function validateQuest(quest: QuestTemplateDef): string | null {
  if (quest.questId.length === 0) return 'questId must not be empty';
  if (quest.steps.length === 0) return 'quest must have at least one step';
  return null;
}

// ── Mutable State ─────────────────────────────────────────────────

interface MutableMod {
  readonly modId: string;
  readonly version: string;
  hooks: WorldHookDef[];
  npcs: CustomNpcDef[];
  quests: QuestTemplateDef[];
  readonly registeredAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────

function snapshotMod(m: MutableMod): ModRegistration {
  return Object.freeze({
    modId: m.modId,
    version: m.version,
    hooks: Object.freeze([...m.hooks]),
    npcs: Object.freeze([...m.npcs]),
    quests: Object.freeze([...m.quests]),
    registeredAt: m.registeredAt,
  });
}

function addHook(
  cfg: ModdingSdkConfig,
  mod: MutableMod,
  hook: WorldHookDef,
): ModdingSdkError | null {
  const err = validateHook(hook);
  if (err !== null) return { code: 'invalid-hook', reason: err };
  if (mod.hooks.length >= cfg.maxHooksPerMod) {
    return { code: 'invalid-hook', reason: 'maxHooksPerMod exceeded' };
  }
  mod.hooks.push(hook);
  return null;
}

function addNpc(
  cfg: ModdingSdkConfig,
  mod: MutableMod,
  npc: CustomNpcDef,
): ModdingSdkError | null {
  const err = validateNpc(npc);
  if (err !== null) return { code: 'invalid-npc', reason: err };
  if (mod.npcs.length >= cfg.maxNpcsPerMod) {
    return { code: 'invalid-npc', reason: 'maxNpcsPerMod exceeded' };
  }
  mod.npcs.push(npc);
  return null;
}

function addQuest(
  cfg: ModdingSdkConfig,
  mod: MutableMod,
  quest: QuestTemplateDef,
): ModdingSdkError | null {
  const err = validateQuest(quest);
  if (err !== null) return { code: 'invalid-quest', reason: err };
  if (mod.quests.length >= cfg.maxQuestsPerMod) {
    return { code: 'invalid-quest', reason: 'maxQuestsPerMod exceeded' };
  }
  mod.quests.push(quest);
  return null;
}

// ── registerMod ───────────────────────────────────────────────────

function registerMod(
  cfg: ModdingSdkConfig,
  mods: Map<string, MutableMod>,
  clock: { nowMicroseconds: () => number },
  log: ModSdkLogPort,
  reg: Omit<ModRegistration, 'registeredAt'>,
): ModRegistration | ModdingSdkError {
  if (mods.has(reg.modId)) return { code: 'duplicate-mod', modId: reg.modId };
  const mod: MutableMod = {
    modId: reg.modId, version: reg.version,
    hooks: [], npcs: [], quests: [],
    registeredAt: clock.nowMicroseconds(),
  };
  for (const h of reg.hooks) {
    const err = addHook(cfg, mod, h);
    if (err !== null) return err;
  }
  for (const n of reg.npcs) {
    const err = addNpc(cfg, mod, n);
    if (err !== null) return err;
  }
  for (const q of reg.quests) {
    const err = addQuest(cfg, mod, q);
    if (err !== null) return err;
  }
  mods.set(reg.modId, mod);
  log.info({ modId: reg.modId, version: reg.version }, 'Mod registered');
  return snapshotMod(mod);
}

// ── dispatchHook ──────────────────────────────────────────────────

async function dispatchHook(
  mods: Map<string, MutableMod>,
  event: WorldEvent,
): Promise<void> {
  for (const mod of mods.values()) {
    const matching = mod.hooks.filter((h) => h.category === event.category);
    for (const hook of matching) {
      await hook.handler(event);
    }
  }
}

// ── computeStats ──────────────────────────────────────────────────

function computeStats(mods: Map<string, MutableMod>): ModdingSdkStats {
  let hooks = 0, npcs = 0, quests = 0;
  for (const m of mods.values()) {
    hooks += m.hooks.length;
    npcs += m.npcs.length;
    quests += m.quests.length;
  }
  return { registeredMods: mods.size, registeredHooks: hooks, registeredNpcs: npcs, registeredQuests: quests };
}

// ── Internal Helpers ─────────────────────────────────────────────

function getMod(mods: Map<string, MutableMod>, modId: string): MutableMod | ModdingSdkError {
  const m = mods.get(modId);
  return m ?? { code: 'mod-not-found', modId };
}

function withMod(
  mods: Map<string, MutableMod>,
  modId: string,
  fn: (mod: MutableMod) => ModRegistration | ModdingSdkError,
): ModRegistration | ModdingSdkError {
  const m = getMod(mods, modId);
  return 'code' in m ? m : fn(m);
}

// ── SDK Methods Builder ───────────────────────────────────────────

function buildSdkMethods(
  cfg: ModdingSdkConfig,
  mods: Map<string, MutableMod>,
  deps: ModdingSdkDeps,
): ModdingSdk {
  return {
    registerMod: (reg) => registerMod(cfg, mods, deps.clock, deps.log, reg),
    registerWorldHook: (modId, hook) =>
      withMod(mods, modId, (m) => { const e = addHook(cfg, m, hook); return e ?? snapshotMod(m); }),
    registerCustomNpc: (modId, npc) =>
      withMod(mods, modId, (m) => { const e = addNpc(cfg, m, npc); return e ?? snapshotMod(m); }),
    registerQuest: (modId, quest) =>
      withMod(mods, modId, (m) => { const e = addQuest(cfg, m, quest); return e ?? snapshotMod(m); }),
    emit: (event) => { deps.eventBus.publish(event); },
    getMod: (modId) => {
      const m = getMod(mods, modId);
      return 'code' in m ? m : snapshotMod(m);
    },
    listMods: () => [...mods.values()].map(snapshotMod),
    dispatchHook: (event) => dispatchHook(mods, event),
    unregisterMod: (modId) => {
      const m = getMod(mods, modId);
      if ('code' in m) return m;
      const snapshot = snapshotMod(m);
      mods.delete(modId);
      return snapshot;
    },
    getStats: () => computeStats(mods),
  };
}

// ── Factory ───────────────────────────────────────────────────────

export function createModdingSdk(
  deps: ModdingSdkDeps,
  config?: Partial<ModdingSdkConfig>,
): ModdingSdk {
  const cfg: ModdingSdkConfig = { ...DEFAULT_SDK_CONFIG, ...config };
  const mods = new Map<string, MutableMod>();
  return buildSdkMethods(cfg, mods, deps);
}

