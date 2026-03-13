import { describe, it, expect, vi } from 'vitest';
import {
  createModdingSdk,
  DEFAULT_SDK_CONFIG,
  type ModdingSdkDeps,
  type ModSdkLogPort,
  type ModEventBusPort,
  type WorldHookDef,
  type CustomNpcDef,
  type QuestTemplateDef,
  type WorldEvent,
} from '../index.js';

// ── Test Doubles ──────────────────────────────────────────────────

function makeClock(us = 1_000_000) {
  let now = us;
  return { nowMicroseconds: () => now, advance: (d: number) => { now += d; } };
}

function makeLog(): ModSdkLogPort {
  return { info: vi.fn(), warn: vi.fn() };
}

function makeEventBus(): ModEventBusPort & { publish: ReturnType<typeof vi.fn> } {
  const publish = vi.fn();
  return { publish } as unknown as ModEventBusPort & { publish: ReturnType<typeof vi.fn> };
}

function makeDeps(bus?: ModEventBusPort): ModdingSdkDeps & { clock: ReturnType<typeof makeClock> } {
  return {
    eventBus: bus ?? makeEventBus(),
    clock: makeClock(),
    log: makeLog(),
  };
}

function makeHook(overrides?: Partial<WorldHookDef>): WorldHookDef {
  return {
    hookId: 'hook-1',
    category: 'PLAYER_JOIN',
    handler: vi.fn(),
    description: 'Test hook',
    ...overrides,
  };
}

function makeNpc(overrides?: Partial<CustomNpcDef>): CustomNpcDef {
  return {
    npcId: 'npc-1',
    archetype: 'merchant',
    name: 'Tilda the Trader',
    worldId: 'world-A',
    dialogueLines: [{ trigger: 'greet', response: 'Hello!' }],
    ...overrides,
  };
}

function makeQuest(overrides?: Partial<QuestTemplateDef>): QuestTemplateDef {
  return {
    questId: 'q-1',
    title: 'The Lost Loom',
    description: 'Find the missing Loom fragment.',
    steps: [{ stepId: 's1', type: 'INVESTIGATE', description: 'Search the ruins.' }],
    reward: { kalon: 100 },
    worldId: 'world-A',
    ...overrides,
  };
}

function makeWorldEvent(overrides?: Partial<WorldEvent>): WorldEvent {
  return {
    category: 'PLAYER_JOIN',
    worldId: 'world-A',
    entityId: 'player-1',
    payload: {},
    occurredAt: 1_000_000,
    ...overrides,
  };
}

// ── registerMod ───────────────────────────────────────────────────

describe('registerMod', () => {
  it('registers a mod with no hooks/npcs/quests', () => {
    const sdk = createModdingSdk(makeDeps());
    const r = sdk.registerMod({ modId: 'my-mod', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    expect(r).toMatchObject({ modId: 'my-mod', version: '1.0.0' });
  });

  it('returns duplicate-mod on second registration of same modId', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'my-mod', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.registerMod({ modId: 'my-mod', version: '2.0.0', hooks: [], npcs: [], quests: [] });
    expect(r).toMatchObject({ code: 'duplicate-mod', modId: 'my-mod' });
  });

  it('registers a mod with hooks, npcs, and quests', () => {
    const sdk = createModdingSdk(makeDeps());
    const r = sdk.registerMod({
      modId: 'full-mod', version: '1.0.0',
      hooks: [makeHook()], npcs: [makeNpc()], quests: [makeQuest()],
    });
    if ('code' in r) throw new Error('unexpected error');
    expect(r.hooks).toHaveLength(1);
    expect(r.npcs).toHaveLength(1);
    expect(r.quests).toHaveLength(1);
  });

  it('returns invalid-hook when hook has empty hookId', () => {
    const sdk = createModdingSdk(makeDeps());
    const r = sdk.registerMod({
      modId: 'bad-mod', version: '1.0.0',
      hooks: [makeHook({ hookId: '' })], npcs: [], quests: [],
    });
    expect(r).toMatchObject({ code: 'invalid-hook' });
  });
});

// ── registerWorldHook ─────────────────────────────────────────────

describe('registerWorldHook', () => {
  it('returns mod-not-found for unknown modId', () => {
    const sdk = createModdingSdk(makeDeps());
    const r = sdk.registerWorldHook('nonexistent', makeHook());
    expect(r).toMatchObject({ code: 'mod-not-found' });
  });

  it('adds hook to existing mod', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.registerWorldHook('mod-1', makeHook({ hookId: 'h2' }));
    if ('code' in r) throw new Error('unexpected error');
    expect(r.hooks).toHaveLength(1);
  });

  it('returns invalid-hook when maxHooksPerMod exceeded', () => {
    const sdk = createModdingSdk(makeDeps(), { maxHooksPerMod: 1 });
    sdk.registerMod({
      modId: 'mod-2', version: '1.0.0',
      hooks: [makeHook({ hookId: 'h1' })], npcs: [], quests: [],
    });
    const r = sdk.registerWorldHook('mod-2', makeHook({ hookId: 'h2' }));
    expect(r).toMatchObject({ code: 'invalid-hook' });
  });
});

// ── registerCustomNpc ─────────────────────────────────────────────

describe('registerCustomNpc', () => {
  it('adds NPC to existing mod', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.registerCustomNpc('mod-1', makeNpc());
    if ('code' in r) throw new Error('unexpected error');
    expect(r.npcs).toHaveLength(1);
  });

  it('returns invalid-npc for empty npcId', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-x', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.registerCustomNpc('mod-x', makeNpc({ npcId: '' }));
    expect(r).toMatchObject({ code: 'invalid-npc' });
  });
});

// ── registerQuest ─────────────────────────────────────────────────

describe('registerQuest', () => {
  it('adds quest to existing mod', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.registerQuest('mod-1', makeQuest());
    if ('code' in r) throw new Error('unexpected error');
    expect(r.quests).toHaveLength(1);
  });

  it('returns invalid-quest for quest with no steps', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.registerQuest('mod-1', makeQuest({ steps: [] }));
    expect(r).toMatchObject({ code: 'invalid-quest' });
  });
});

// ── emit ──────────────────────────────────────────────────────────

describe('emit', () => {
  it('calls eventBus.publish with the event', () => {
    const bus = makeEventBus();
    const sdk = createModdingSdk(makeDeps(bus));
    const event = { eventType: 'my-mod:ritual', payload: { power: 9000 }, worldId: 'world-A' };
    sdk.emit(event);
    expect(bus.publish).toHaveBeenCalledWith(event);
  });
});

// ── getMod ────────────────────────────────────────────────────────

describe('getMod', () => {
  it('returns mod-not-found for unknown modId', () => {
    const sdk = createModdingSdk(makeDeps());
    expect(sdk.getMod('unknown')).toMatchObject({ code: 'mod-not-found' });
  });

  it('returns snapshot for existing mod', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-A', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    const r = sdk.getMod('mod-A');
    expect(r).toMatchObject({ modId: 'mod-A' });
  });
});

// ── listMods ──────────────────────────────────────────────────────

describe('listMods', () => {
  it('returns empty array initially', () => {
    expect(createModdingSdk(makeDeps()).listMods()).toHaveLength(0);
  });

  it('returns all registered mods', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    sdk.registerMod({ modId: 'mod-2', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    expect(sdk.listMods()).toHaveLength(2);
  });
});

// ── dispatchHook ──────────────────────────────────────────────────

describe('dispatchHook', () => {
  it('calls matching hook handlers', async () => {
    const handler = vi.fn();
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({
      modId: 'mod-1', version: '1.0.0',
      hooks: [makeHook({ handler })], npcs: [], quests: [],
    });
    await sdk.dispatchHook(makeWorldEvent({ category: 'PLAYER_JOIN' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call hooks for other categories', async () => {
    const handler = vi.fn();
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({
      modId: 'mod-1', version: '1.0.0',
      hooks: [makeHook({ handler, category: 'ENTITY_DEATH' })], npcs: [], quests: [],
    });
    await sdk.dispatchHook(makeWorldEvent({ category: 'PLAYER_JOIN' }));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ── unregisterMod ─────────────────────────────────────────────────

describe('unregisterMod', () => {
  it('returns mod-not-found for unknown modId', () => {
    const sdk = createModdingSdk(makeDeps());
    expect(sdk.unregisterMod('gone')).toMatchObject({ code: 'mod-not-found' });
  });

  it('removes mod from registry', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [], npcs: [], quests: [] });
    sdk.unregisterMod('mod-1');
    expect(sdk.getMod('mod-1')).toMatchObject({ code: 'mod-not-found' });
  });
});

// ── getStats ──────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at all zeros', () => {
    const sdk = createModdingSdk(makeDeps());
    expect(sdk.getStats()).toMatchObject({
      registeredMods: 0, registeredHooks: 0, registeredNpcs: 0, registeredQuests: 0,
    });
  });

  it('counts hooks, npcs, quests across all mods', () => {
    const sdk = createModdingSdk(makeDeps());
    sdk.registerMod({ modId: 'mod-1', version: '1.0.0', hooks: [makeHook()], npcs: [makeNpc()], quests: [makeQuest()] });
    sdk.registerMod({ modId: 'mod-2', version: '1.0.0', hooks: [makeHook({ hookId: 'h2' })], npcs: [], quests: [] });
    const stats = sdk.getStats();
    expect(stats.registeredMods).toBe(2);
    expect(stats.registeredHooks).toBe(2);
    expect(stats.registeredNpcs).toBe(1);
    expect(stats.registeredQuests).toBe(1);
  });
});

// ── DEFAULT_SDK_CONFIG ────────────────────────────────────────────

describe('DEFAULT_SDK_CONFIG', () => {
  it('has valid shape', () => {
    expect(DEFAULT_SDK_CONFIG.maxHooksPerMod).toBeGreaterThan(0);
    expect(DEFAULT_SDK_CONFIG.maxNpcsPerMod).toBeGreaterThan(0);
    expect(DEFAULT_SDK_CONFIG.maxQuestsPerMod).toBeGreaterThan(0);
  });
});
