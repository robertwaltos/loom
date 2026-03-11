import { describe, it, expect } from 'vitest';
import { createHeartbeatMonitor } from '../heartbeat-monitor.js';
import type { HeartbeatMonitorDeps } from '../heartbeat-monitor.js';

function makeDeps(): HeartbeatMonitorDeps & { advance: (us: number) => void } {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => {
      time += us;
    },
  };
}

describe('HeartbeatMonitor — registration', () => {
  it('registers a connection', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    expect(monitor.register('c1')).toBe(true);
    expect(monitor.getActiveCount()).toBe(1);
  });

  it('rejects duplicate registration', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    monitor.register('c1');
    expect(monitor.register('c1')).toBe(false);
  });

  it('unregisters a connection', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    monitor.register('c1');
    expect(monitor.unregister('c1')).toBe(true);
    expect(monitor.getActiveCount()).toBe(0);
  });

  it('returns false for unknown unregister', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    expect(monitor.unregister('unknown')).toBe(false);
  });
});

describe('HeartbeatMonitor — heartbeat', () => {
  it('records a heartbeat', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps);
    monitor.register('c1');
    deps.advance(5_000_000);
    expect(monitor.heartbeat('c1')).toBe(true);
    const record = monitor.getRecord('c1');
    expect(record?.lastHeartbeatAt).toBe(6_000_000);
  });

  it('returns false for unknown connection', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    expect(monitor.heartbeat('unknown')).toBe(false);
  });

  it('resets missed sweeps on heartbeat', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 10_000_000,
      warningThresholdUs: 5_000_000,
    });
    monitor.register('c1');
    deps.advance(15_000_000);
    monitor.sweep();
    expect(monitor.getRecord('c1')?.missedSweeps).toBe(1);
    monitor.heartbeat('c1');
    expect(monitor.getRecord('c1')?.missedSweeps).toBe(0);
  });
});

describe('HeartbeatMonitor — health check', () => {
  it('reports healthy for recent heartbeat', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 30_000_000,
      warningThresholdUs: 20_000_000,
    });
    monitor.register('c1');
    deps.advance(1_000_000);
    const health = monitor.checkHealth('c1');
    expect(health?.health).toBe('healthy');
    expect(health?.silenceUs).toBe(1_000_000);
  });

  it('reports warning near threshold', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 30_000_000,
      warningThresholdUs: 20_000_000,
    });
    monitor.register('c1');
    deps.advance(25_000_000);
    expect(monitor.checkHealth('c1')?.health).toBe('warning');
  });

  it('reports stale past timeout', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 30_000_000,
      warningThresholdUs: 20_000_000,
    });
    monitor.register('c1');
    deps.advance(35_000_000);
    expect(monitor.checkHealth('c1')?.health).toBe('stale');
  });

  it('returns undefined for unknown connection', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    expect(monitor.checkHealth('unknown')).toBeUndefined();
  });
});

describe('HeartbeatMonitor — sweep', () => {
  it('detects stale connections', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 10_000_000,
      warningThresholdUs: 5_000_000,
    });
    monitor.register('c1');
    monitor.register('c2');
    deps.advance(15_000_000);
    monitor.heartbeat('c1');
    const result = monitor.sweep();
    expect(result.staleConnections).toEqual(['c2']);
    expect(result.healthyCount).toBe(1);
  });

  it('detects warning connections', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 30_000_000,
      warningThresholdUs: 10_000_000,
    });
    monitor.register('c1');
    deps.advance(15_000_000);
    const result = monitor.sweep();
    expect(result.warningConnections).toEqual(['c1']);
    expect(result.staleConnections).toHaveLength(0);
  });

  it('increments missedSweeps for stale', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 10_000_000,
      warningThresholdUs: 5_000_000,
    });
    monitor.register('c1');
    deps.advance(15_000_000);
    monitor.sweep();
    monitor.sweep();
    expect(monitor.getRecord('c1')?.missedSweeps).toBe(2);
  });

  it('returns empty when all healthy', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps);
    monitor.register('c1');
    deps.advance(1_000);
    const result = monitor.sweep();
    expect(result.staleConnections).toHaveLength(0);
    expect(result.warningConnections).toHaveLength(0);
    expect(result.healthyCount).toBe(1);
  });
});

describe('HeartbeatMonitor — stats', () => {
  it('tracks aggregate statistics', () => {
    const deps = makeDeps();
    const monitor = createHeartbeatMonitor(deps, {
      timeoutUs: 10_000_000,
      warningThresholdUs: 5_000_000,
    });
    monitor.register('c1');
    monitor.register('c2');
    monitor.heartbeat('c1');
    monitor.unregister('c2');
    deps.advance(15_000_000);
    monitor.sweep();

    const stats = monitor.getStats();
    expect(stats.totalRegistered).toBe(2);
    expect(stats.totalUnregistered).toBe(1);
    expect(stats.totalHeartbeats).toBe(1);
    expect(stats.totalSweeps).toBe(1);
    expect(stats.totalStaleDetected).toBe(1);
    expect(stats.activeConnections).toBe(1);
  });

  it('starts with zero stats', () => {
    const monitor = createHeartbeatMonitor(makeDeps());
    const stats = monitor.getStats();
    expect(stats.totalRegistered).toBe(0);
    expect(stats.totalSweeps).toBe(0);
    expect(stats.activeConnections).toBe(0);
  });
});
