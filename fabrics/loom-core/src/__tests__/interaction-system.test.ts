import { describe, it, expect } from 'vitest';
import {
  createInteractionSystem,
  INTERACTION_SYSTEM_PRIORITY,
} from '../interaction-system.js';
import { createComponentStore } from '../component-store.js';
import type { ComponentStore } from '../component-store.js';
import type { SystemContext } from '../system-registry.js';
import type { InteractionEvent, InteractionEventSink } from '../interaction-system.js';

// ── Helpers ────────────────────────────────────────────────────────

const CTX: SystemContext = { deltaMs: 16, tickNumber: 1, wallTimeMicroseconds: 0 };

const ORIGIN_TRANSFORM = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

const NEARBY_TRANSFORM = {
  position: { x: 2, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

const FAR_TRANSFORM = {
  position: { x: 100, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

const INTERACTION_COMP = {
  availableInteractions: ['talk', 'inspect'] as const,
  interactionRadius: 5,
  requiresLineOfSight: false,
  promptText: 'Press E to interact',
};

interface TestCtx {
  store: ComponentStore;
  events: InteractionEvent[];
  tick: () => void;
  tickTwice: () => void;
}

function makeCtx(worldId = 'world-1'): TestCtx {
  const store = createComponentStore();
  const events: InteractionEvent[] = [];
  const sink: InteractionEventSink = { onInteraction: (e) => { events.push(e); } };
  const system = createInteractionSystem({
    componentStore: store,
    clock: { nowMicroseconds: () => 0 },
    worldId,
    eventSink: sink,
  });

  return {
    store,
    events,
    tick: () => { system(CTX); },
    tickTwice: () => { system(CTX); system(CTX); },
  };
}

function addPlayer(store: ComponentStore, id: string, transform = ORIGIN_TRANSFORM): void {
  store.set(id as never, 'player-input', {
    moveDirection: { x: 0, y: 0, z: 0 },
    lookDirection: { x: 0, y: 0, z: 1 },
    actions: [],
    sequenceNumber: 0,
  });
  store.set(id as never, 'transform', transform);
  store.set(id as never, 'health', {
    current: 100, maximum: 100, regenerationRate: 1, isAlive: true,
  });
  store.set(id as never, 'identity', { displayName: 'Player', playerId: id, faction: null, reputation: 0 });
}

function addNpc(store: ComponentStore, id: string, transform = NEARBY_TRANSFORM): void {
  store.set(id as never, 'interaction', INTERACTION_COMP);
  store.set(id as never, 'transform', transform);
  store.set(id as never, 'ai-brain', {
    behaviorTreeId: 'merchant', currentGoal: null,
    awarenessRadius: 10, hostility: 'friendly', knownEntities: [],
  });
  store.set(id as never, 'health', {
    current: 100, maximum: 100, regenerationRate: 1, isAlive: true,
  });
  store.set(id as never, 'identity', { displayName: 'Merchant', playerId: null, faction: null, reputation: 0 });
}

// ── Tests ──────────────────────────────────────────────────────────

describe('INTERACTION_SYSTEM_PRIORITY', () => {
  it('is 180', () => {
    expect(INTERACTION_SYSTEM_PRIORITY).toBe(180);
  });
});

describe('createInteractionSystem', () => {
  it('returns a function', () => {
    const store = createComponentStore();
    const system = createInteractionSystem({
      componentStore: store,
      clock: { nowMicroseconds: () => 0 },
      worldId: 'world-1',
    });
    expect(typeof system).toBe('function');
  });
});

describe('proximity scan interval', () => {
  it('does not scan on first tick (interval not reached)', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tick();
    expect(ctx.events).toHaveLength(0);
  });

  it('emits available event on second tick when in range', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice();
    const available = ctx.events.filter((e) => e.type === 'available');
    expect(available).toHaveLength(1);
    expect(available[0]?.playerEntityId).toBe('player-1');
    expect(available[0]?.targetEntityId).toBe('npc-1');
  });
});

describe('player in range', () => {
  it('emits available event with correct fields', () => {
    const ctx = makeCtx('world-a');
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice();
    const evt = ctx.events.find((e) => e.type === 'available');
    expect(evt).toBeDefined();
    expect(evt?.worldId).toBe('world-a');
    expect(evt?.targetDisplayName).toBe('Merchant');
    expect(evt?.availableInteractions).toEqual(['talk', 'inspect']);
  });

  it('does not re-emit available if already in range', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice(); // first scan — emits
    ctx.tickTwice(); // second scan — already in range
    const available = ctx.events.filter((e) => e.type === 'available');
    expect(available).toHaveLength(1);
  });
});

describe('player out of range', () => {
  it('skips entity farther than interaction radius', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-far', FAR_TRANSFORM);
    ctx.tickTwice();
    expect(ctx.events.filter((e) => e.type === 'available')).toHaveLength(0);
  });

  it('emits unavailable when player moves away', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice(); // enters range

    // Move player far away
    ctx.store.set('player-1' as never, 'transform', FAR_TRANSFORM);
    ctx.tickTwice(); // leaves range

    const unavail = ctx.events.filter((e) => e.type === 'unavailable');
    expect(unavail).toHaveLength(1);
    expect(unavail[0]?.playerEntityId).toBe('player-1');
    expect(unavail[0]?.targetEntityId).toBe('npc-1');
  });
});

describe('dead entity skipping', () => {
  it('skips dead interactable target', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.store.set('npc-1' as never, 'health', {
      current: 0, maximum: 100, regenerationRate: 1, isAlive: false,
    });
    ctx.tickTwice();
    expect(ctx.events.filter((e) => e.type === 'available')).toHaveLength(0);
  });
});

describe('processInteractionRequests — talk action', () => {
  it('emits started when player presses talk within range', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice(); // enter range

    ctx.store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['talk'],
      sequenceNumber: 1,
    });
    ctx.tickTwice();

    const started = ctx.events.filter((e) => e.type === 'started');
    expect(started).toHaveLength(1);
    expect(started[0]?.interactionKind).toBe('talk');
  });

  it('does not auto-complete talk (requires server confirmation)', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice();

    ctx.store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['talk'],
      sequenceNumber: 1,
    });
    ctx.tickTwice();

    expect(ctx.events.filter((e) => e.type === 'completed')).toHaveLength(0);
  });
});

describe('processInteractionRequests — auto-complete', () => {
  it('emits completed immediately for inspect action', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.tickTwice();

    ctx.store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['inspect'],
      sequenceNumber: 1,
    });
    ctx.tick();

    expect(ctx.events.filter((e) => e.type === 'started')).toHaveLength(1);
    expect(ctx.events.filter((e) => e.type === 'completed')).toHaveLength(1);
  });

  it('emits completed immediately for pickup action', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.store.set('npc-1' as never, 'interaction', {
      ...INTERACTION_COMP,
      availableInteractions: ['pickup'],
    });
    ctx.tickTwice();

    ctx.store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['pickup'],
      sequenceNumber: 1,
    });
    ctx.tick();

    expect(ctx.events.filter((e) => e.type === 'completed')).toHaveLength(1);
  });
});

describe('interaction not available', () => {
  it('does not emit started if action not in availableInteractions', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-1');
    ctx.store.set('npc-1' as never, 'interaction', {
      ...INTERACTION_COMP,
      availableInteractions: ['talk'],
    });
    ctx.tickTwice();

    ctx.store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['trade'],
      sequenceNumber: 1,
    });
    ctx.tick();

    expect(ctx.events.filter((e) => e.type === 'started')).toHaveLength(0);
  });

  it('does not emit started when player is out of range', () => {
    const ctx = makeCtx();
    addPlayer(ctx.store, 'player-1');
    addNpc(ctx.store, 'npc-far', FAR_TRANSFORM);
    ctx.tickTwice();

    ctx.store.set('player-1' as never, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      actions: ['inspect'],
      sequenceNumber: 1,
    });
    ctx.tick();

    expect(ctx.events.filter((e) => e.type === 'started')).toHaveLength(0);
  });
});

describe('no eventSink', () => {
  it('ticks without throwing when eventSink is undefined', () => {
    const store = createComponentStore();
    const system = createInteractionSystem({
      componentStore: store,
      clock: { nowMicroseconds: () => 0 },
      worldId: 'world-1',
    });
    addPlayer(store, 'player-1');
    addNpc(store, 'npc-1');
    expect(() => { system(CTX); system(CTX); }).not.toThrow();
  });
});
