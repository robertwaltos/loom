import { describe, it, expect } from 'vitest';
import { createMatchmakingEngine } from '../matchmaking.js';
import type { MatchmakingDeps } from '../matchmaking.js';

function makeDeps(): MatchmakingDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'id-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('MatchmakingEngine — ticket submission', () => {
  it('submits a matchmaking ticket', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const ticket = engine.submit({
      dynastyId: 'd1',
      activityType: 'raid',
      skillMin: 10,
      skillMax: 50,
    });
    expect(ticket.status).toBe('waiting');
    expect(ticket.activityType).toBe('raid');
    expect(ticket.worldId).toBeNull();
  });

  it('assigns unique ticket ids', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const t1 = engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    const t2 = engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    expect(t1.ticketId).not.toBe(t2.ticketId);
  });

  it('stores world preference', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const ticket = engine.submit({
      dynastyId: 'd1', activityType: 'trade', skillMin: 0, skillMax: 50, worldId: 'earth',
    });
    expect(ticket.worldId).toBe('earth');
  });
});

describe('MatchmakingEngine — cancellation', () => {
  it('cancels a waiting ticket', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const ticket = engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    expect(engine.cancel(ticket.ticketId)).toBe(true);
    expect(engine.getTicket(ticket.ticketId)?.status).toBe('cancelled');
  });

  it('returns false for unknown ticket', () => {
    const engine = createMatchmakingEngine(makeDeps());
    expect(engine.cancel('unknown')).toBe(false);
  });
});

describe('MatchmakingEngine — matching by activity', () => {
  it('matches tickets with same activity type', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    const groups = engine.findMatches();
    expect(groups).toHaveLength(1);
    expect(groups[0]?.dynastyIds).toContain('d1');
    expect(groups[0]?.dynastyIds).toContain('d2');
  });

  it('does not match different activity types', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd2', activityType: 'trade', skillMin: 0, skillMax: 100 });
    const groups = engine.findMatches();
    expect(groups).toHaveLength(0);
  });
});

describe('MatchmakingEngine — skill range filtering', () => {
  it('matches overlapping skill ranges', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 10, skillMax: 50 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 30, skillMax: 70 });
    expect(engine.findMatches()).toHaveLength(1);
  });

  it('rejects non-overlapping skill ranges', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 10, skillMax: 20 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 50, skillMax: 80 });
    expect(engine.findMatches()).toHaveLength(0);
  });
});

describe('MatchmakingEngine — world preference', () => {
  it('matches when both have same world preference', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100, worldId: 'earth' });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100, worldId: 'earth' });
    expect(engine.findMatches()).toHaveLength(1);
  });

  it('matches when one has no world preference', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100, worldId: 'earth' });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    expect(engine.findMatches()).toHaveLength(1);
  });

  it('rejects different world preferences', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100, worldId: 'earth' });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100, worldId: 'mars' });
    expect(engine.findMatches()).toHaveLength(0);
  });
});

describe('MatchmakingEngine — group size', () => {
  it('respects minimum group size', () => {
    const engine = createMatchmakingEngine(makeDeps(), { minGroupSize: 3 });
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    expect(engine.findMatches()).toHaveLength(0);
  });

  it('respects maximum group size', () => {
    const engine = createMatchmakingEngine(makeDeps(), { maxGroupSize: 2 });
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd3', activityType: 'raid', skillMin: 0, skillMax: 100 });
    const groups = engine.findMatches();
    expect(groups).toHaveLength(1);
    expect(groups[0]?.dynastyIds).toHaveLength(2);
  });
});

describe('MatchmakingEngine — expiration', () => {
  it('sweeps expired tickets', () => {
    let time = 1_000_000;
    const deps: MatchmakingDeps = {
      idGenerator: { next: () => 'id-' + String(++time) },
      clock: { nowMicroseconds: () => time },
    };
    const engine = createMatchmakingEngine(deps, { ticketTtlUs: 10_000_000 });
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    time = 50_000_000;
    expect(engine.sweepExpired()).toBe(1);
    expect(engine.getStats().totalExpired).toBe(1);
  });
});

describe('MatchmakingEngine — queries', () => {
  it('retrieves a ticket by id', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const ticket = engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    expect(engine.getTicket(ticket.ticketId)?.dynastyId).toBe('d1');
  });

  it('returns undefined for unknown ticket', () => {
    const engine = createMatchmakingEngine(makeDeps());
    expect(engine.getTicket('unknown')).toBeUndefined();
  });

  it('gets tickets for a dynasty', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd1', activityType: 'trade', skillMin: 0, skillMax: 50 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    expect(engine.getTicketsForDynasty('d1')).toHaveLength(2);
  });
});

describe('MatchmakingEngine — stats', () => {
  it('tracks aggregate statistics', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.submit({ dynastyId: 'd1', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.submit({ dynastyId: 'd2', activityType: 'raid', skillMin: 0, skillMax: 100 });
    engine.findMatches();

    const stats = engine.getStats();
    expect(stats.totalSubmitted).toBe(2);
    expect(stats.totalMatched).toBe(2);
    expect(stats.groupsFormed).toBe(1);
    expect(stats.waitingTickets).toBe(0);
  });

  it('starts with zero stats', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.totalSubmitted).toBe(0);
    expect(stats.groupsFormed).toBe(0);
  });
});
