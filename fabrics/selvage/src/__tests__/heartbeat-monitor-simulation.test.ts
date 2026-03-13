import { describe, it, expect } from 'vitest';
import { createHeartbeatMonitor } from '../heartbeat-monitor.js';

function makeMonitor(timeoutUs = 5_000_000, warningThresholdUs = 2_500_000) {
  let time = 0;
  return {
    monitor: createHeartbeatMonitor(
      { clock: { nowMicroseconds: () => time } },
      { timeoutUs, warningThresholdUs },
    ),
    advance: (us: number) => { time += us; },
  };
}

describe('Heartbeat Monitor Simulation', () => {
  it('registers peers and considers them healthy after initial registration', () => {
    const { monitor } = makeMonitor();
    monitor.register('peer-1');
    monitor.register('peer-2');

    expect(monitor.checkHealth('peer-1')?.health).toBe('healthy');
    expect(monitor.checkHealth('peer-2')?.health).toBe('healthy');
    expect(monitor.getActiveCount()).toBe(2);
  });

  it('keeps peers healthy when heartbeats arrive within timeout', () => {
    const { monitor, advance } = makeMonitor();
    monitor.register('peer-3');

    advance(1_000_000);
    monitor.heartbeat('peer-3');
    advance(1_000_000);
    monitor.heartbeat('peer-3');

    expect(monitor.checkHealth('peer-3')?.health).toBe('healthy');
    const record = monitor.getRecord('peer-3');
    expect(record).toBeDefined();
  });

  it('marks peers as unhealthy and sweeps them after timeout', () => {
    const { monitor, advance } = makeMonitor();
    monitor.register('peer-stale');
    monitor.register('peer-active');

    advance(1_000_000);
    monitor.heartbeat('peer-active');
    advance(6_000_000);
    monitor.heartbeat('peer-active');

    expect(monitor.checkHealth('peer-stale')?.health).toBe('stale');
    expect(monitor.checkHealth('peer-active')?.health).toBe('healthy');

    const swept = monitor.sweep();
    expect(swept.healthyCount).toBe(1);
  });

  it('unregisters peers removing them entirely', () => {
    const { monitor } = makeMonitor();
    monitor.register('peer-temp');
    monitor.unregister('peer-temp');

    expect(monitor.getRecord('peer-temp')).toBeUndefined();
    expect(monitor.getActiveCount()).toBe(0);
  });
});
