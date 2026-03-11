import { describe, it, expect } from 'vitest';
import { createWorldEventLog, DEFAULT_EVENT_LOG_CONFIG } from '../world-event-log.js';
import type { WorldEventLogDeps } from '../world-event-log.js';

function makeDeps(): WorldEventLogDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'evt-' + String(++idCounter) },
  };
}

describe('WorldEventLog — logging', () => {
  it('logs an event', () => {
    const log = createWorldEventLog(makeDeps());
    const event = log.log({
      worldId: 'w1',
      severity: 'info',
      message: 'world loaded',
    });
    expect(event.worldId).toBe('w1');
    expect(event.severity).toBe('info');
  });

  it('retrieves event by id', () => {
    const log = createWorldEventLog(makeDeps());
    const event = log.log({
      worldId: 'w1',
      severity: 'warn',
      message: 'test',
    });
    expect(log.getEvent(event.eventId)?.message).toBe('test');
  });

  it('returns undefined for unknown event', () => {
    const log = createWorldEventLog(makeDeps());
    expect(log.getEvent('missing')).toBeUndefined();
  });
});

describe('WorldEventLog — queries', () => {
  it('lists events by world', () => {
    const log = createWorldEventLog(makeDeps());
    log.log({ worldId: 'w1', severity: 'info', message: 'a' });
    log.log({ worldId: 'w1', severity: 'warn', message: 'b' });
    log.log({ worldId: 'w2', severity: 'info', message: 'c' });
    expect(log.listByWorld('w1')).toHaveLength(2);
    expect(log.listByWorld('w2')).toHaveLength(1);
  });

  it('lists events by severity', () => {
    const log = createWorldEventLog(makeDeps());
    log.log({ worldId: 'w1', severity: 'info', message: 'a' });
    log.log({ worldId: 'w1', severity: 'error', message: 'b' });
    log.log({ worldId: 'w2', severity: 'error', message: 'c' });
    expect(log.listBySeverity('error')).toHaveLength(2);
  });

  it('gets recent events', () => {
    const log = createWorldEventLog(makeDeps());
    log.log({ worldId: 'w1', severity: 'info', message: 'a' });
    log.log({ worldId: 'w1', severity: 'info', message: 'b' });
    log.log({ worldId: 'w1', severity: 'info', message: 'c' });
    const recent = log.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.message).toBe('b');
  });

  it('returns empty for unknown world', () => {
    const log = createWorldEventLog(makeDeps());
    expect(log.listByWorld('missing')).toHaveLength(0);
  });
});

describe('WorldEventLog — clear world', () => {
  it('clears world events', () => {
    const log = createWorldEventLog(makeDeps());
    log.log({ worldId: 'w1', severity: 'info', message: 'a' });
    log.log({ worldId: 'w1', severity: 'warn', message: 'b' });
    const count = log.clearWorld('w1');
    expect(count).toBe(2);
    expect(log.listByWorld('w1')).toHaveLength(0);
  });

  it('returns zero for unknown world', () => {
    const log = createWorldEventLog(makeDeps());
    expect(log.clearWorld('missing')).toBe(0);
  });
});

describe('WorldEventLog — rotation', () => {
  it('trims entries over max per world', () => {
    const log = createWorldEventLog(makeDeps(), {
      maxEntriesPerWorld: 3,
    });
    log.log({ worldId: 'w1', severity: 'info', message: 'a' });
    log.log({ worldId: 'w1', severity: 'info', message: 'b' });
    log.log({ worldId: 'w1', severity: 'info', message: 'c' });
    log.log({ worldId: 'w1', severity: 'info', message: 'd' });
    expect(log.listByWorld('w1')).toHaveLength(3);
    const first = log.listByWorld('w1')[0];
    expect(first?.message).toBe('b');
  });

  it('uses default config', () => {
    expect(DEFAULT_EVENT_LOG_CONFIG.maxEntriesPerWorld).toBe(1000);
  });
});

describe('WorldEventLog — stats', () => {
  it('starts with zero stats', () => {
    const log = createWorldEventLog(makeDeps());
    const stats = log.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.totalWorlds).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const log = createWorldEventLog(makeDeps());
    log.log({ worldId: 'w1', severity: 'info', message: 'a' });
    log.log({ worldId: 'w1', severity: 'warn', message: 'b' });
    log.log({ worldId: 'w2', severity: 'error', message: 'c' });
    const stats = log.getStats();
    expect(stats.totalEvents).toBe(3);
    expect(stats.totalWorlds).toBe(2);
    expect(stats.infoCount).toBe(1);
    expect(stats.warnCount).toBe(1);
    expect(stats.errorCount).toBe(1);
  });
});
