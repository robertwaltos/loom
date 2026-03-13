import { describe, expect, it } from 'vitest';
import { createWorldEventLog } from '../world-event-log.js';

function makeLog() {
  let now = 1_000;
  let id = 0;
  return createWorldEventLog({
    clock: { nowMicroseconds: () => now++ },
    idGenerator: { next: () => `log-${++id}` },
  });
}

describe('world-event-log simulation', () => {
  it('captures incidents, supports queries, and clears retired worlds', () => {
    const log = makeLog();
    log.log({ worldId: 'w1', severity: 'info', message: 'startup' });
    log.log({ worldId: 'w1', severity: 'warn', message: 'weather warning' });
    log.log({ worldId: 'w2', severity: 'error', message: 'portal failure' });

    expect(log.listBySeverity('error')).toHaveLength(1);
    expect(log.getRecent(2)).toHaveLength(2);
    expect(log.clearWorld('w1')).toBe(2);
    expect(log.getStats().totalWorlds).toBe(1);
  });
});
