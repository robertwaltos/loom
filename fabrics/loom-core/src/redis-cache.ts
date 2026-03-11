/**
 * Redis Cache Adapter — Hot-path caching for The Loom.
 *
 * Provides sub-5ms reads for balance checks, presence lookups,
 * session data, and entity state on the critical path.
 *
 * Uses ioredis for connection pooling and pipelining.
 *
 * Thread: carbon/loom-core/redis-cache
 * Tier: 0
 */

// ─── Cache Port ─────────────────────────────────────────────────

export interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string): Promise<number>;
  getMany(keys: ReadonlyArray<string>): Promise<ReadonlyArray<string | null>>;
  setMany(entries: ReadonlyArray<{ key: string; value: string; ttlSeconds?: number }>): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}

// ─── Redis Configuration ────────────────────────────────────────

export interface RedisConfig {
  readonly host?: string;
  readonly port?: number;
  readonly password?: string | undefined;
  readonly db?: number;
  readonly keyPrefix?: string;
  readonly connectTimeoutMs?: number;
  readonly maxRetriesPerRequest?: number;
}

// ─── Redis Cache Implementation ─────────────────────────────────

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  mget(...keys: string[]): Promise<Array<string | null>>;
  pipeline(): PipelineLike;
  flushdb(): Promise<string>;
  quit(): Promise<string>;
}

interface PipelineLike {
  set(key: string, value: string, ...args: unknown[]): PipelineLike;
  exec(): Promise<unknown>;
}

export async function createRedisCache(config: RedisConfig): Promise<CachePort> {
  const ioredis = await import('ioredis');
  const Redis = ioredis.default ?? ioredis;

  const client: RedisLike = new (Redis as unknown as new (opts: Record<string, unknown>) => RedisLike)({
    host: config.host ?? '127.0.0.1',
    port: config.port ?? 6379,
    password: config.password,
    db: config.db ?? 0,
    keyPrefix: config.keyPrefix ?? 'loom:',
    connectTimeout: config.connectTimeoutMs ?? 5000,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    lazyConnect: true,
  });

  return {
    get: (key) => client.get(key),

    set: async (key, value, ttlSeconds) => {
      if (ttlSeconds !== undefined && ttlSeconds > 0) {
        await client.set(key, value, 'EX', ttlSeconds);
      } else {
        await client.set(key, value);
      }
    },

    del: async (key) => {
      await client.del(key);
    },

    exists: async (key) => {
      const result = await client.exists(key);
      return result === 1;
    },

    increment: (key) => client.incr(key),

    getMany: async (keys) => {
      if (keys.length === 0) return [];
      return client.mget(...keys);
    },

    setMany: async (entries) => {
      if (entries.length === 0) return;
      const pipeline = client.pipeline();
      for (const entry of entries) {
        if (entry.ttlSeconds !== undefined && entry.ttlSeconds > 0) {
          pipeline.set(entry.key, entry.value, 'EX', entry.ttlSeconds);
        } else {
          pipeline.set(entry.key, entry.value);
        }
      }
      await pipeline.exec();
    },

    flush: async () => {
      await client.flushdb();
    },

    close: async () => {
      await client.quit();
    },
  };
}

// ─── In-Memory Cache (for tests) ────────────────────────────────

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

export function createInMemoryCache(): CachePort {
  const store = new Map<string, CacheEntry>();

  function isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  return {
    get: async (key) => {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },

    set: async (key, value, ttlSeconds) => {
      const expiresAt = ttlSeconds !== undefined && ttlSeconds > 0
        ? Date.now() + ttlSeconds * 1000
        : null;
      store.set(key, { value, expiresAt });
    },

    del: async (key) => {
      store.delete(key);
    },

    exists: async (key) => {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        store.delete(key);
        return false;
      }
      return true;
    },

    increment: async (key) => {
      const entry = store.get(key);
      const current = entry && !isExpired(entry) ? Number(entry.value) : 0;
      const next = current + 1;
      store.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? null });
      return next;
    },

    getMany: async (keys) => {
      const results: Array<string | null> = [];
      for (const key of keys) {
        const entry = store.get(key);
        if (!entry || isExpired(entry)) {
          store.delete(key);
          results.push(null);
        } else {
          results.push(entry.value);
        }
      }
      return results;
    },

    setMany: async (entries) => {
      for (const entry of entries) {
        const expiresAt = entry.ttlSeconds !== undefined && entry.ttlSeconds > 0
          ? Date.now() + entry.ttlSeconds * 1000
          : null;
        store.set(entry.key, { value: entry.value, expiresAt });
      }
    },

    flush: async () => {
      store.clear();
    },

    close: async () => {
      store.clear();
    },
  };
}
