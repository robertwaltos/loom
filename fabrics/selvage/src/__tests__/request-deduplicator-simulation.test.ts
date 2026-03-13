import { describe, it, expect } from 'vitest';
import { createRequestDeduplicator } from '../request-deduplicator.js';

function makeDedup(start = 1_000_000n) {
  let time = start;
  return {
    dedup: createRequestDeduplicator({
      clock: { nowMicroseconds: () => time },
      logger: { info: () => {}, warn: () => {} },
    }),
    advance: (us: bigint) => { time += us; },
  };
}

describe('Request Deduplicator Simulation', () => {
  it('records requests and detects duplicates in-flight', () => {
    const { dedup } = makeDedup();

    const key = 'idempotency-key-abc123';
    const r1 = dedup.checkDuplicate(key);
    expect(r1.status).toBe('NEW');

    dedup.recordRequest({ key, method: 'POST', path: '/items', body: '{"name":"sword"}', timestampMicros: 1_000_000n });

    const r2 = dedup.checkDuplicate(key);
    expect(r2.status).toBe('IN_PROGRESS');
  });

  it('returns the original response once completed', () => {
    const { dedup } = makeDedup();

    const key = 'idempotency-key-xyz987';
    dedup.recordRequest({ key, method: 'PUT', path: '/player/1', body: '{}', timestampMicros: 1_000_000n });

    const response = { status: 200, body: { updated: true } };
    dedup.recordResult(key, JSON.stringify(response));

    const check = dedup.checkDuplicate(key);
    expect(check.status).toBe('COMPLETED');
    expect((check as { status: 'COMPLETED'; result: string }).result).toBe(JSON.stringify(response));
  });

  it('tracks stats', () => {
    const { dedup } = makeDedup();
    const key = 'k1';
    dedup.checkDuplicate(key); // increments totalRequests
    dedup.recordRequest({ key, method: 'POST', path: '/x', body: 'data', timestampMicros: 1_000_000n });
    dedup.recordResult(key, JSON.stringify({ status: 201 }));
    const stats = dedup.getStats();
    expect(Number(stats.totalRequests)).toBeGreaterThanOrEqual(1);
    expect(stats.cacheSize).toBeGreaterThanOrEqual(1);
  });
});
