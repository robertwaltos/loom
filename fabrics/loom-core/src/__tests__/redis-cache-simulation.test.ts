import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── ioredis mock ─────────────────────────────────────────────────────────
// vi.hoisted ensures mock objects exist before the vi.mock factory runs.
// MockRedis must be a regular `function` (not arrow) so `new MockRedis()` works.

const { mockPipeline, mockRedisInstance, MockRedis } = vi.hoisted(() => {
  const pipeline = {
    set: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
  const instance = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    incr: vi.fn().mockResolvedValue(1),
    mget: vi.fn().mockResolvedValue([null]),
    pipeline: vi.fn().mockReturnValue(pipeline),
    flushdb: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue('OK'),
  };
  // Regular function (not arrow) so `new MockRedis()` is valid. Returning an
  // object from a constructor causes JS to use that object as the result.
  function MockRedisFn(this: unknown) { return instance; }
  return { mockPipeline: pipeline, mockRedisInstance: instance, MockRedis: MockRedisFn };
});

vi.mock('ioredis', () => ({ default: MockRedis }));

// ─── module under test ────────────────────────────────────────────────────

import { createRedisCache } from '../redis-cache.js';

beforeEach(() => { vi.clearAllMocks(); });

// ─── factory ──────────────────────────────────────────────────────────────

describe('RedisCache — factory', () => {
  it('createRedisCache returns a CachePort', async () => {
    const cache = await createRedisCache({});
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
    expect(typeof cache.del).toBe('function');
    expect(typeof cache.exists).toBe('function');
    expect(typeof cache.increment).toBe('function');
    expect(typeof cache.getMany).toBe('function');
    expect(typeof cache.setMany).toBe('function');
    expect(typeof cache.flush).toBe('function');
    expect(typeof cache.close).toBe('function');
  });
});

// ─── get / set / del / exists / increment ─────────────────────────────────

describe('RedisCache — basic operations', () => {
  it('get delegates to client.get', async () => {
    mockRedisInstance.get.mockResolvedValueOnce('cached-value');
    const cache = await createRedisCache({});
    const result = await cache.get('my-key');
    expect(result).toBe('cached-value');
    expect(mockRedisInstance.get).toHaveBeenCalledWith('my-key');
  });

  it('get returns null when key not found', async () => {
    mockRedisInstance.get.mockResolvedValueOnce(null);
    const cache = await createRedisCache({});
    const result = await cache.get('missing');
    expect(result).toBeNull();
  });

  it('set delegates to client.set without TTL', async () => {
    const cache = await createRedisCache({});
    await cache.set('k', 'v');
    expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v');
  });

  it('set with TTL calls client.set with EX', async () => {
    const cache = await createRedisCache({});
    await cache.set('k', 'v', 60);
    expect(mockRedisInstance.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
  });

  it('del delegates to client.del', async () => {
    const cache = await createRedisCache({});
    await cache.del('remove-me');
    expect(mockRedisInstance.del).toHaveBeenCalledWith('remove-me');
  });

  it('exists returns false when client.exists returns 0', async () => {
    mockRedisInstance.exists.mockResolvedValueOnce(0);
    const cache = await createRedisCache({});
    const result = await cache.exists('absent-key');
    expect(result).toBe(false);
  });

  it('exists returns true when client.exists returns 1', async () => {
    mockRedisInstance.exists.mockResolvedValueOnce(1);
    const cache = await createRedisCache({});
    const result = await cache.exists('present-key');
    expect(result).toBe(true);
  });

  it('increment delegates to client.incr', async () => {
    mockRedisInstance.incr.mockResolvedValueOnce(5);
    const cache = await createRedisCache({});
    const result = await cache.increment('counter');
    expect(result).toBe(5);
    expect(mockRedisInstance.incr).toHaveBeenCalledWith('counter');
  });
});

// ─── getMany / setMany ────────────────────────────────────────────────────

describe('RedisCache — bulk operations', () => {
  it('getMany delegates to client.mget', async () => {
    mockRedisInstance.mget.mockResolvedValueOnce(['a', null]);
    const cache = await createRedisCache({});
    const result = await cache.getMany(['key1', 'key2']);
    expect(result).toEqual(['a', null]);
    expect(mockRedisInstance.mget).toHaveBeenCalledWith('key1', 'key2');
  });

  it('getMany returns empty array for empty input', async () => {
    const cache = await createRedisCache({});
    const result = await cache.getMany([]);
    expect(result).toEqual([]);
    expect(mockRedisInstance.mget).not.toHaveBeenCalled();
  });

  it('setMany uses pipeline.exec', async () => {
    const cache = await createRedisCache({});
    await cache.setMany([{ key: 'a', value: '1' }, { key: 'b', value: '2' }]);
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('setMany skips pipeline for empty input', async () => {
    mockPipeline.exec.mockClear();
    const cache = await createRedisCache({});
    await cache.setMany([]);
    expect(mockPipeline.exec).not.toHaveBeenCalled();
  });
});

// ─── flush / close ────────────────────────────────────────────────────────

describe('RedisCache — flush / close', () => {
  it('flush delegates to client.flushdb', async () => {
    const cache = await createRedisCache({});
    await cache.flush();
    expect(mockRedisInstance.flushdb).toHaveBeenCalled();
  });

  it('close delegates to client.quit', async () => {
    const cache = await createRedisCache({});
    await cache.close();
    expect(mockRedisInstance.quit).toHaveBeenCalled();
  });
});
