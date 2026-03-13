/**
 * player-event-engine.test.ts — Unit tests for PlayerEventEngine.
 *
 * Thread: silk/loom-core/player-event-engine
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import { createPlayerEventEngine } from '../player-event-engine.js';
import type {
  PlayerEventEngine,
  PlayerEventEngineDeps,
  ProposeEventParams,
} from '../player-event-engine.js';

// ── Helpers ────────────────────────────────────────────────────────

type DepsWithSpies = PlayerEventEngineDeps & {
  boosts: Array<{ worldId: string; boosts: Readonly<Record<string, number>>; durationMs: number }>;
  worldNotifications: Array<{ worldId: string; type: string }>;
  playerNotifications: Array<{ playerId: string; type: string }>;
  records: Array<{ eventId: string }>;
};

function makeDeps(startUs = 1_000_000n): DepsWithSpies {
  const now = Number(startUs);
  let idSeq = 0;
  const boosts: Array<{ worldId: string; boosts: Readonly<Record<string, number>>; durationMs: number }> = [];
  const worldNotifications: Array<{ worldId: string; type: string }> = [];
  const playerNotifications: Array<{ playerId: string; type: string }> = [];
  const records: Array<{ eventId: string }> = [];

  return {
    boosts,
    worldNotifications,
    playerNotifications,
    records,
    clock: { nowMicroseconds: () => now },
    idGenerator: { generate: () => `evt-${String(++idSeq)}` },
    logger: {
      info: () => undefined,
      warn: () => undefined,
    },
    world: {
      applyTemporaryBoost: (worldId, b, durationMs) => {
        boosts.push({ worldId, boosts: b, durationMs });
      },
    },
    notifications: {
      notifyWorld: (worldId, n) => { worldNotifications.push({ worldId, type: n.type }); },
      notifyPlayer: (playerId, n) => { playerNotifications.push({ playerId, type: n.type }); },
    },
    remembrance: {
      recordEvent: (r) => { records.push({ eventId: r.eventId }); },
      recordTournamentResult: () => undefined,
    },
  };
}

const BASE_PARAMS: ProposeEventParams = {
  worldId: 'world-1',
  proposerId: 'player-1',
  eventType: 'festival',
  title: 'Harvest Festival',
  description: 'Annual celebration',
  scheduledStartAt: 2_000_000,
  scheduledEndAt: 6_000_000,
  maxParticipants: 50,
};

function makeEngine(overrides?: Partial<Parameters<typeof createPlayerEventEngine>[1]>): {
  engine: PlayerEventEngine;
  deps: DepsWithSpies;
} {
  const deps = makeDeps();
  const engine = createPlayerEventEngine(deps, { approvalRequired: true, ...overrides });
  return { engine, deps };
}

// ── proposeEvent ────────────────────────────────────────────────

describe('proposeEvent', () => {
  it('creates event with PROPOSED phase when approval required', () => {
    const { engine } = makeEngine();
    const evt = engine.proposeEvent(BASE_PARAMS);
    expect(evt.phase).toBe('PROPOSED');
    expect(evt.worldId).toBe('world-1');
    expect(evt.proposerId).toBe('player-1');
    expect(evt.eventType).toBe('festival');
    expect(evt.title).toBe('Harvest Festival');
    expect(evt.participants).toHaveLength(0);
  });

  it('skips PROPOSED when approvalRequired is false', () => {
    const { engine } = makeEngine({ approvalRequired: false });
    const evt = engine.proposeEvent(BASE_PARAMS);
    expect(evt.phase).toBe('SCHEDULED');
  });

  it('throws when economy boost exceeds max multiplier', () => {
    const { engine } = makeEngine({ maxEconomyBoostMultiplier: 1.5 });
    expect(() =>
      engine.proposeEvent({ ...BASE_PARAMS, economyBoosts: { trade: 2.0 } }),
    ).toThrow('exceeds max');
  });

  it('persists event accessible via getEvent', () => {
    const { engine } = makeEngine();
    const evt = engine.proposeEvent(BASE_PARAMS);
    const fetched = engine.getEvent(evt.eventId);
    expect(fetched).toBeDefined();
    expect(fetched?.eventId).toBe(evt.eventId);
  });
});

// ── approveEvent ────────────────────────────────────────────────

describe('approveEvent', () => {
  it('transitions event from PROPOSED to SCHEDULED', () => {
    const { engine } = makeEngine();
    const proposed = engine.proposeEvent(BASE_PARAMS);
    const approved = engine.approveEvent(proposed.eventId);
    expect(approved.phase).toBe('SCHEDULED');
  });

  it('throws when event is not in PROPOSED phase', () => {
    const { engine } = makeEngine();
    const evt = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(evt.eventId);
    expect(() => engine.approveEvent(evt.eventId)).toThrow();
  });
});

// ── rejectEvent ─────────────────────────────────────────────────

describe('rejectEvent', () => {
  it('transitions PROPOSED event to REJECTED', () => {
    const { engine } = makeEngine();
    const evt = engine.proposeEvent(BASE_PARAMS);
    const rejected = engine.rejectEvent(evt.eventId);
    expect(rejected.phase).toBe('REJECTED');
  });
});

// ── startEvent ──────────────────────────────────────────────────

describe('startEvent', () => {
  function scheduledEngine(): { engine: PlayerEventEngine; deps: DepsWithSpies; eventId: string } {
    const { engine, deps } = makeEngine();
    const evt = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(evt.eventId);
    return { engine, deps, eventId: evt.eventId };
  }

  it('transitions SCHEDULED event to ACTIVE', () => {
    const { engine, eventId } = scheduledEngine();
    const started = engine.startEvent(eventId);
    expect(started.phase).toBe('ACTIVE');
  });

  it('applies economy boosts for festival events', () => {
    const { engine, deps } = scheduledEngine();
    const evt = engine.proposeEvent({ ...BASE_PARAMS, economyBoosts: { trade: 1.2 } });
    engine.approveEvent(evt.eventId);
    engine.startEvent(evt.eventId);
    expect(deps.boosts.find((b) => b.worldId === 'world-1')).toBeDefined();
  });

  it('issues world notification on start', () => {
    const { engine, deps, eventId } = scheduledEngine();
    engine.startEvent(eventId);
    expect(deps.worldNotifications.some((n) => n.type === 'event.started')).toBe(true);
  });

  it('throws when world has too many active events', () => {
    const { engine } = makeEngine({ maxActiveEventsPerWorld: 1 });
    const makeEvt = () => {
      const e = engine.proposeEvent(BASE_PARAMS);
      engine.approveEvent(e.eventId);
      return e.eventId;
    };
    engine.startEvent(makeEvt());
    expect(() => engine.startEvent(makeEvt())).toThrow('too many active events');
  });
});

// ── joinEvent / leaveEvent ──────────────────────────────────────

describe('joinEvent / leaveEvent', () => {
  it('adds participant to an active event', () => {
    const { engine } = makeEngine();
    const proposed = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(proposed.eventId);
    engine.startEvent(proposed.eventId);
    const updated = engine.joinEvent(proposed.eventId, 'player-2', 'participant');
    expect(updated.participants.find((p) => p.playerId === 'player-2')).toBeDefined();
  });

  it('removes participant on leaveEvent', () => {
    const { engine } = makeEngine();
    const proposed = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(proposed.eventId);
    engine.startEvent(proposed.eventId);
    engine.joinEvent(proposed.eventId, 'player-2', 'participant');
    const after = engine.leaveEvent(proposed.eventId, 'player-2');
    expect(after.participants.find((p) => p.playerId === 'player-2')).toBeUndefined();
  });
});

// ── concludeEvent ───────────────────────────────────────────────

describe('concludeEvent', () => {
  it('transitions ACTIVE event to CONCLUDED', () => {
    const { engine } = makeEngine();
    const proposed = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(proposed.eventId);
    engine.startEvent(proposed.eventId);
    const concluded = engine.concludeEvent(proposed.eventId);
    expect(concluded.phase).toBe('CONCLUDED');
  });

  it('records concluded event in remembrance', () => {
    const { engine, deps } = makeEngine();
    const proposed = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(proposed.eventId);
    engine.startEvent(proposed.eventId);
    engine.concludeEvent(proposed.eventId);
    expect(deps.records.some((r) => r.eventId === proposed.eventId)).toBe(true);
  });
});

// ── getActiveEvents ─────────────────────────────────────────────

describe('getActiveEvents', () => {
  it('returns only ACTIVE events for the given world', () => {
    const { engine } = makeEngine();
    const evt = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(evt.eventId);
    expect(engine.getActiveEvents('world-1')).toHaveLength(0);
    engine.startEvent(evt.eventId);
    expect(engine.getActiveEvents('world-1')).toHaveLength(1);
  });

  it('isolates events by worldId', () => {
    const { engine } = makeEngine({ approvalRequired: false });
    const e1 = engine.proposeEvent({ ...BASE_PARAMS, worldId: 'world-1' });
    const e2 = engine.proposeEvent({ ...BASE_PARAMS, worldId: 'world-2' });
    engine.startEvent(e1.eventId);
    engine.startEvent(e2.eventId);
    expect(engine.getActiveEvents('world-1')).toHaveLength(1);
    expect(engine.getActiveEvents('world-2')).toHaveLength(1);
  });
});

// ── createTournament ────────────────────────────────────────────

describe('createTournament', () => {
  it('creates a single-elimination bracket', () => {
    const { engine } = makeEngine();
    const evt = engine.proposeEvent({ ...BASE_PARAMS, eventType: 'tournament' });
    engine.approveEvent(evt.eventId);
    engine.startEvent(evt.eventId);
    const bracket = engine.createTournament(
      evt.eventId,
      'single-elimination',
      ['p1', 'p2', 'p3', 'p4'],
    );
    expect(bracket.eventId).toBe(evt.eventId);
    expect(bracket.bracketType).toBe('single-elimination');
    expect(bracket.completed).toBe(false);
    expect(bracket.winnerId).toBeNull();
  });
});

// ── getStats ────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.activeEvents).toBe(0);
    expect(stats.totalTournaments).toBe(0);
  });

  it('increments totalEvents after propose', () => {
    const { engine } = makeEngine();
    engine.proposeEvent(BASE_PARAMS);
    engine.proposeEvent(BASE_PARAMS);
    expect(engine.getStats().totalEvents).toBe(2);
  });

  it('tracks active events correctly', () => {
    const { engine } = makeEngine();
    const e1 = engine.proposeEvent(BASE_PARAMS);
    engine.approveEvent(e1.eventId);
    engine.startEvent(e1.eventId);
    expect(engine.getStats().activeEvents).toBe(1);
    engine.concludeEvent(e1.eventId);
    expect(engine.getStats().activeEvents).toBe(0);
  });
});
