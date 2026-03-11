import { describe, it, expect } from 'vitest';
import { createUptimeMonitor } from '../uptime-monitor.js';
import type { UptimeMonitorDeps } from '../uptime-monitor.js';

function createDeps(): { deps: UptimeMonitorDeps; advance: (micro: number) => void } {
  let time = 0;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'svc-' + String(id++) },
    },
    advance: (micro: number) => {
      time += micro;
    },
  };
}

const INTERVAL = 10_000_000; // 10 seconds in microseconds

describe('UptimeMonitor — register and heartbeat', () => {
  it('registers a service in unknown state', () => {
    const { deps } = createDeps();
    const mon = createUptimeMonitor(deps);
    const id = mon.register({ name: 'api', heartbeatIntervalMicro: INTERVAL });
    const snap = mon.getSnapshot(id);
    expect(snap).toBeDefined();
    expect(snap?.state).toBe('unknown');
    expect(snap?.name).toBe('api');
  });

  it('transitions to up on heartbeat', () => {
    const { deps, advance } = createDeps();
    const mon = createUptimeMonitor(deps);
    const id = mon.register({ name: 'api', heartbeatIntervalMicro: INTERVAL });
    advance(1000);
    expect(mon.heartbeat(id)).toBe(true);
    expect(mon.getSnapshot(id)?.state).toBe('up');
  });

  it('returns false for heartbeat on unknown service', () => {
    const { deps } = createDeps();
    const mon = createUptimeMonitor(deps);
    expect(mon.heartbeat('nonexistent')).toBe(false);
  });
});

describe('UptimeMonitor — markDown', () => {
  it('marks a service as down', () => {
    const { deps, advance } = createDeps();
    const mon = createUptimeMonitor(deps);
    const id = mon.register({ name: 'db', heartbeatIntervalMicro: INTERVAL });
    advance(1000);
    mon.heartbeat(id);
    advance(5000);
    mon.markDown(id);
    expect(mon.getSnapshot(id)?.state).toBe('down');
  });

  it('returns false for unknown service', () => {
    const { deps } = createDeps();
    const mon = createUptimeMonitor(deps);
    expect(mon.markDown('nonexistent')).toBe(false);
  });
});

describe('UptimeMonitor — sweep', () => {
  it('detects stale services that missed heartbeat', () => {
    const { deps, advance } = createDeps();
    const mon = createUptimeMonitor(deps);
    const id = mon.register({ name: 'worker', heartbeatIntervalMicro: INTERVAL });
    advance(1000);
    mon.heartbeat(id);
    advance(INTERVAL + 1);
    const stale = mon.sweep();
    expect(stale).toContain(id);
    expect(mon.getSnapshot(id)?.state).toBe('down');
  });

  it('does not flag recently heartbeated services', () => {
    const { deps, advance } = createDeps();
    const mon = createUptimeMonitor(deps);
    const id = mon.register({ name: 'worker', heartbeatIntervalMicro: INTERVAL });
    advance(1000);
    mon.heartbeat(id);
    advance(INTERVAL / 2);
    const stale = mon.sweep();
    expect(stale).not.toContain(id);
  });
});

describe('UptimeMonitor — uptime percentage', () => {
  it('calculates uptime from up and down periods', () => {
    const { deps, advance } = createDeps();
    const mon = createUptimeMonitor(deps);
    const id = mon.register({ name: 'api', heartbeatIntervalMicro: INTERVAL });
    advance(1000);
    mon.heartbeat(id); // up
    advance(8000); // 8000 up
    mon.markDown(id); // down
    advance(2000); // 2000 down
    const snap = mon.getSnapshot(id);
    expect(snap).toBeDefined();
    // 8000 up, 2000 down = 80%
    expect(snap?.uptimePercent).toBeCloseTo(80, 0);
  });
});

describe('UptimeMonitor — stats', () => {
  it('reports service state counts', () => {
    const { deps, advance } = createDeps();
    const mon = createUptimeMonitor(deps);
    mon.register({ name: 'a', heartbeatIntervalMicro: INTERVAL });
    const b = mon.register({ name: 'b', heartbeatIntervalMicro: INTERVAL });
    const c = mon.register({ name: 'c', heartbeatIntervalMicro: INTERVAL });
    advance(1000);
    mon.heartbeat(b);
    mon.heartbeat(c);
    advance(5000);
    mon.markDown(c);
    const stats = mon.getStats();
    expect(stats.totalServices).toBe(3);
    expect(stats.unknownCount).toBe(1);
    expect(stats.upCount).toBe(1);
    expect(stats.downCount).toBe(1);
  });
});
