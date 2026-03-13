import { describe, it, expect, beforeEach } from 'vitest';
import { createRespawnSystem, RESPAWN_SYSTEM_PRIORITY } from '../respawn-system.js';
import { createComponentStore } from '../component-store.js';
import type { ComponentStore } from '../component-store.js';
import type { SystemContext } from '../system-registry.js';
import type { RespawnEvent, RespawnEventSink } from '../respawn-system.js';

// ── Helpers ────────────────────────────────────────────────────────

const DELAY_US = 3_000_000;

const CTX: SystemContext = {
  deltaMs: 16,
  tickNumber: 1,
  wallTimeMicroseconds: 0,
};

const SPAWN_TRANSFORM = {
  position: { x: 10, y: 0, z: 10 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

const PLAYER_TRANSFORM = {
  position: { x: 5, y: 0, z: 5 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
};

interface TestCtx {
  store: ComponentStore;
  events: RespawnEvent[];
  nowUs: number;
  advance: (us: number) => void;
  tick: () => void;
}

function makeCtx(startUs = 0): TestCtx {
  let nowUs = startUs;
  const store = createComponentStore();
  const events: RespawnEvent[] = [];

  const eventSink: RespawnEventSink = { onRespawn: (e) => { events.push(e); } };
  const system = createRespawnSystem({
    componentStore: store,
    clock: { nowMicroseconds: () => nowUs },
    respawnDelayUs: DELAY_US,
    eventSink,
  });

  return {
    store,
    events,
    get nowUs() { return nowUs; },
    advance: (us) => { nowUs += us; },
    tick: () => { system(CTX); },
  };
}

function addDeadPlayer(store: ComponentStore, entityId: string): void {
  store.set(entityId as never, 'health', {
    current: 0,
    maximum: 100,
    regenerationRate: 1,
    isAlive: false,
  });
  store.set(entityId as never, 'transform', PLAYER_TRANSFORM);
}

function addAlivePlayer(store: ComponentStore, entityId: string): void {
  store.set(entityId as never, 'health', {
    current: 80,
    maximum: 100,
    regenerationRate: 1,
    isAlive: true,
  });
  store.set(entityId as never, 'transform', PLAYER_TRANSFORM);
}

function addSpawnPoint(store: ComponentStore, spawnId: string): void {
  store.set(spawnId as never, 'spawn-point', {
    spawnType: 'player',
    capacity: 10,
    activeSpawns: 0,
    cooldownMicroseconds: 0,
  });
  store.set(spawnId as never, 'transform', SPAWN_TRANSFORM);
}

// ── Tests ──────────────────────────────────────────────────────────

describe('RESPAWN_SYSTEM_PRIORITY', () => {
  it('is 175', () => {
    expect(RESPAWN_SYSTEM_PRIORITY).toBe(175);
  });
});

describe('createRespawnSystem', () => {
  it('returns a function', () => {
    const ctx = makeCtx();
    const system = createRespawnSystem({
      componentStore: ctx.store,
      clock: { nowMicroseconds: () => 0 },
    });
    expect(typeof system).toBe('function');
  });
});

describe('dead entity timer', () => {
  let ctx: TestCtx;

  beforeEach(() => {
    ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    addSpawnPoint(ctx.store, 'spawn-1');
  });

  it('does not respawn on first tick (timer just started)', () => {
    ctx.tick();
    const health = ctx.store.tryGet('player-1' as never, 'health') as { isAlive: boolean };
    expect(health.isAlive).toBe(false);
    expect(ctx.events).toHaveLength(0);
  });

  it('does not respawn before delay expires', () => {
    ctx.tick();
    ctx.advance(DELAY_US - 1);
    ctx.tick();
    const health = ctx.store.tryGet('player-1' as never, 'health') as { isAlive: boolean };
    expect(health.isAlive).toBe(false);
    expect(ctx.events).toHaveLength(0);
  });

  it('respawns when delay expires', () => {
    ctx.tick();
    ctx.advance(DELAY_US);
    ctx.tick();
    const health = ctx.store.tryGet('player-1' as never, 'health') as { isAlive: boolean };
    expect(health.isAlive).toBe(true);
  });
});

describe('respawn restores health', () => {
  it('sets current to maximum and marks alive', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    addSpawnPoint(ctx.store, 'spawn-1');

    ctx.tick();
    ctx.advance(DELAY_US);
    ctx.tick();

    const health = ctx.store.tryGet('player-1' as never, 'health') as {
      current: number;
      maximum: number;
      isAlive: boolean;
    };
    expect(health.isAlive).toBe(true);
    expect(health.current).toBe(health.maximum);
  });
});

describe('respawn event', () => {
  it('fires onRespawn with correct data', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    addSpawnPoint(ctx.store, 'spawn-1');

    ctx.tick();
    ctx.advance(DELAY_US);
    ctx.tick();

    expect(ctx.events).toHaveLength(1);
    const evt = ctx.events[0];
    expect(evt.entityId).toBe('player-1');
    expect(evt.spawnPointEntityId).toBe('spawn-1');
    expect(evt.previousPosition).toEqual(PLAYER_TRANSFORM.position);
    expect(evt.respawnPosition).toEqual(SPAWN_TRANSFORM.position);
    expect(evt.timestamp).toBe(DELAY_US);
  });

  it('does not fire when no spawn point found', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    // no spawn point added

    ctx.tick();
    ctx.advance(DELAY_US);
    ctx.tick();

    expect(ctx.events).toHaveLength(0);
  });
});

describe('alive entity', () => {
  it('does not start a timer', () => {
    const ctx = makeCtx();
    addAlivePlayer(ctx.store, 'player-1');
    addSpawnPoint(ctx.store, 'spawn-1');

    ctx.tick();
    ctx.advance(DELAY_US);
    ctx.tick();

    const health = ctx.store.tryGet('player-1' as never, 'health') as { isAlive: boolean };
    expect(health.isAlive).toBe(true);
    expect(ctx.events).toHaveLength(0);
  });
});

function tickAfterDelay(ctx: TestCtx): void {
  ctx.tick();
  ctx.advance(DELAY_US);
  ctx.tick();
}

describe('spawn point — npc type', () => {
  it('skips npc spawn-point for player respawn', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    ctx.store.set('npc-spawn' as never, 'spawn-point', {
      spawnType: 'npc',
      capacity: 10,
      activeSpawns: 0,
      cooldownMicroseconds: 0,
    });
    ctx.store.set('npc-spawn' as never, 'transform', SPAWN_TRANSFORM);
    tickAfterDelay(ctx);
    expect(ctx.events).toHaveLength(0);
  });
});

describe('spawn point — capacity priority', () => {
  it('picks spawn point with highest remaining capacity', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    ctx.store.set('spawn-low' as never, 'spawn-point', {
      spawnType: 'player', capacity: 5, activeSpawns: 4, cooldownMicroseconds: 0,
    });
    ctx.store.set('spawn-low' as never, 'transform', SPAWN_TRANSFORM);
    const highTransform = {
      position: { x: 20, y: 0, z: 20 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };
    ctx.store.set('spawn-high' as never, 'spawn-point', {
      spawnType: 'player', capacity: 10, activeSpawns: 0, cooldownMicroseconds: 0,
    });
    ctx.store.set('spawn-high' as never, 'transform', highTransform);
    tickAfterDelay(ctx);
    expect(ctx.events[0]?.spawnPointEntityId).toBe('spawn-high');
  });
});

describe('spawn point — world membership', () => {
  it('skips spawn point in a different world', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    ctx.store.set('player-1' as never, 'world-membership', {
      worldId: 'world-a', enteredAt: 0, isTransitioning: false, transitionTargetWorldId: null,
    });
    ctx.store.set('spawn-b' as never, 'spawn-point', {
      spawnType: 'player', capacity: 10, activeSpawns: 0, cooldownMicroseconds: 0,
    });
    ctx.store.set('spawn-b' as never, 'transform', SPAWN_TRANSFORM);
    ctx.store.set('spawn-b' as never, 'world-membership', {
      worldId: 'world-b', enteredAt: 0, isTransitioning: false, transitionTargetWorldId: null,
    });
    tickAfterDelay(ctx);
    expect(ctx.events).toHaveLength(0);
  });
});

describe('timer cleared after respawn', () => {
  it('does not re-fire event on subsequent ticks after respawn', () => {
    const ctx = makeCtx();
    addDeadPlayer(ctx.store, 'player-1');
    addSpawnPoint(ctx.store, 'spawn-1');

    ctx.tick();
    ctx.advance(DELAY_US);
    ctx.tick(); // respawns here

    ctx.advance(DELAY_US);
    ctx.tick(); // alive — no second event

    expect(ctx.events).toHaveLength(1);
  });
});

describe('no eventSink', () => {
  it('respawns without throwing when eventSink is undefined', () => {
    const store = createComponentStore();
    addDeadPlayer(store, 'player-1');
    addSpawnPoint(store, 'spawn-1');

    let nowUs = 0;
    const system = createRespawnSystem({
      componentStore: store,
      clock: { nowMicroseconds: () => nowUs },
      respawnDelayUs: DELAY_US,
    });

    system(CTX);
    nowUs += DELAY_US;
    system(CTX);

    const health = store.tryGet('player-1' as never, 'health') as { isAlive: boolean };
    expect(health.isAlive).toBe(true);
  });
});
