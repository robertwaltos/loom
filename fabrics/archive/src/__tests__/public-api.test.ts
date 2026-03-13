import { describe, it, expect, vi } from 'vitest';
import {
  createPublicApiRouter,
  DEFAULT_PUBLIC_API_CONFIG,
  ALL_SCOPES,
} from '../public-api.js';
import type {
  ArchiveReadPort,
  ApiKeyStorePort,
  RateLimitPort,
  RateLimitResult,
  PublicApiLogger,
  PublicApiDeps,
  ApiKey,
  ApiRequest,
} from '../public-api.js';
import type {
  RemembranceEntry,
  SearchResult,
} from '../remembrance-system.js';

// ─── Fixtures ────────────────────────────────────────────────────────

const ALLOWED_RL = Object.freeze({ allowed: true, remaining: 99, resetAt: 9999 });
const BLOCKED_RL = Object.freeze({ allowed: false, remaining: 0, resetAt: 9999 });

const FULL_KEY: ApiKey = Object.freeze({
  keyId: 'k-full',
  scopes: [...ALL_SCOPES],
  rateLimit: 100,
  enabled: true,
});

const DISABLED_KEY: ApiKey = Object.freeze({
  keyId: 'k-disabled',
  scopes: [...ALL_SCOPES],
  rateLimit: 100,
  enabled: false,
});

const SAMPLE_ENTRY: RemembranceEntry = Object.freeze({
  id: 'entry-1',
  category: 'dynasty',
  title: 'The Founding',
  narrative: 'A new dynasty rose.',
  gameYear: 100,
  realTimestamp: 1000n,
  tags: ['founding'],
  significance: 9,
  compressed: false,
  schemaVersion: 1,
});

const SAMPLE_SEARCH: SearchResult = Object.freeze({
  entries: [SAMPLE_ENTRY],
  totalCount: 1,
  query: { text: 'founding' },
  durationMs: 2,
});

function makeArchive(overrides: Partial<ArchiveReadPort> = {}): ArchiveReadPort {
  return {
    getEntry: vi.fn().mockResolvedValue(SAMPLE_ENTRY),
    searchEntries: vi.fn().mockResolvedValue(SAMPLE_SEARCH),
    getGenealogy: vi.fn().mockResolvedValue(undefined),
    getTimeline: vi.fn().mockResolvedValue(undefined),
    getBiography: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeKeys(key?: ApiKey): ApiKeyStorePort {
  // Preserve explicit undefined to simulate missing/invalid bearer tokens.
  const resolved: ApiKey | undefined = arguments.length === 0 ? FULL_KEY : key;
  return { lookup: vi.fn().mockResolvedValue(resolved) };
}

function makeRl(result: RateLimitResult = ALLOWED_RL): RateLimitPort {
  return { check: vi.fn().mockReturnValue(result), consume: vi.fn() };
}

function makeLog(): PublicApiLogger {
  return { info: vi.fn(), warn: vi.fn() };
}

function makeDeps(overrides: Partial<PublicApiDeps> = {}): PublicApiDeps {
  return {
    archive: makeArchive(),
    keys: makeKeys(),
    rateLimit: makeRl(),
    log: makeLog(),
    ...overrides,
  };
}

function req(path: string, authHeader = 'Bearer test-key', queryParams: Record<string, string> = {}): ApiRequest {
  return { method: 'GET', path, pathParams: {}, queryParams, authHeader };
}

// ─── Authentication ──────────────────────────────────────────────────

describe('Authentication', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const router = createPublicApiRouter(makeDeps());
    const res = await router.handle({ ...req('/v1/entries'), authHeader: undefined });
    expect(res.status).toBe(401);
  });

  it('returns 401 when bearer token resolves to undefined', async () => {
    const deps = makeDeps({ keys: makeKeys(undefined) });
    const res = await router(deps).handle(req('/v1/entries'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when key is disabled', async () => {
    const deps = makeDeps({ keys: makeKeys(DISABLED_KEY) });
    const res = await router(deps).handle(req('/v1/entries'));
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed Bearer header', async () => {
    const deps = makeDeps({ keys: makeKeys(undefined) });
    const res = await router(deps).handle({ ...req('/v1/entries'), authHeader: 'NotBearer xyz' });
    expect(res.status).toBe(401);
  });
});

// ─── Rate limiting ───────────────────────────────────────────────────

describe('Rate limiting', () => {
  it('returns 429 when rate limit is exceeded', async () => {
    const deps = makeDeps({ rateLimit: makeRl(BLOCKED_RL) });
    const res = await router(deps).handle(req('/v1/entries'));
    expect(res.status).toBe(429);
  });

  it('consumes quota on successful request', async () => {
    const rl = makeRl();
    const deps = makeDeps({ rateLimit: rl });
    await router(deps).handle(req('/v1/entries'));
    expect(rl.consume).toHaveBeenCalledWith('k-full');
  });
});

// ─── Entry lookup ────────────────────────────────────────────────────

describe('GET /v1/entries/:id', () => {
  it('returns entry when found', async () => {
    const res = await router(makeDeps()).handle(req('/v1/entries/entry-1'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(SAMPLE_ENTRY);
  });

  it('returns 404 when entry not found', async () => {
    const deps = makeDeps({ archive: makeArchive({ getEntry: vi.fn().mockResolvedValue(undefined) }) });
    const res = await router(deps).handle(req('/v1/entries/missing'));
    expect(res.status).toBe(404);
  });

  it('returns 403 without entries:read scope', async () => {
    const deps = makeDeps({ keys: makeKeys({ ...FULL_KEY, scopes: ['dynasties:read'] }) });
    const res = await router(deps).handle(req('/v1/entries/entry-1'));
    expect(res.status).toBe(403);
  });
});

// ─── Search ───────────────────────────────────────────────────────────

describe('GET /v1/entries', () => {
  it('returns search results', async () => {
    const res = await router(makeDeps()).handle(req('/v1/entries', 'Bearer key', { q: 'founding' }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(SAMPLE_SEARCH);
  });

  it('clamps limit to maxSearchLimit', async () => {
    const archive = makeArchive();
    const deps = makeDeps({ archive });
    await router(deps).handle(req('/v1/entries', 'Bearer key', { limit: '9999' }));
    const spy = archive.searchEntries as ReturnType<typeof vi.fn>;
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: DEFAULT_PUBLIC_API_CONFIG.maxSearchLimit }),
    );
  });

  it('returns 403 without entries:read scope', async () => {
    const deps = makeDeps({ keys: makeKeys({ ...FULL_KEY, scopes: ['dynasties:read'] }) });
    const res = await router(deps).handle(req('/v1/entries'));
    expect(res.status).toBe(403);
  });
});

// ─── Genealogy ───────────────────────────────────────────────────────

describe('GET /v1/dynasties/:dynastyId/genealogy', () => {
  it('returns 404 when dynasty not found', async () => {
    const res = await router(makeDeps()).handle(req('/v1/dynasties/d-1/genealogy'));
    expect(res.status).toBe(404);
  });

  it('returns body when found', async () => {
    const tree = { dynastyId: 'd-1', dynastyName: 'House Vorn' };
    const archive = makeArchive({ getGenealogy: vi.fn().mockResolvedValue(tree) });
    const res = await router(makeDeps({ archive })).handle(req('/v1/dynasties/d-1/genealogy'));
    expect(res.status).toBe(200);
  });

  it('returns 403 without dynasties:read scope', async () => {
    const deps = makeDeps({ keys: makeKeys({ ...FULL_KEY, scopes: ['entries:read'] }) });
    const res = await router(deps).handle(req('/v1/dynasties/d-1/genealogy'));
    expect(res.status).toBe(403);
  });
});

// ─── Timeline ────────────────────────────────────────────────────────

describe('GET /v1/worlds/:worldId/timeline', () => {
  it('returns 404 when timeline not found', async () => {
    const res = await router(makeDeps()).handle(req('/v1/worlds/w-1/timeline'));
    expect(res.status).toBe(404);
  });

  it('returns body when found', async () => {
    const tl = { worldId: 'w-1', worldName: 'Ashenveil' };
    const archive = makeArchive({ getTimeline: vi.fn().mockResolvedValue(tl) });
    const res = await router(makeDeps({ archive })).handle(req('/v1/worlds/w-1/timeline'));
    expect(res.status).toBe(200);
  });

  it('returns 403 without timelines:read scope', async () => {
    const deps = makeDeps({ keys: makeKeys({ ...FULL_KEY, scopes: ['entries:read'] }) });
    const res = await router(deps).handle(req('/v1/worlds/w-1/timeline'));
    expect(res.status).toBe(403);
  });
});

// ─── Biography ───────────────────────────────────────────────────────

describe('GET /v1/npcs/:npcId/biography', () => {
  it('returns 404 when biography not found', async () => {
    const res = await router(makeDeps()).handle(req('/v1/npcs/npc-1/biography'));
    expect(res.status).toBe(404);
  });

  it('returns body when found', async () => {
    const bio = { npcId: 'npc-1', npcName: 'Serina' };
    const archive = makeArchive({ getBiography: vi.fn().mockResolvedValue(bio) });
    const res = await router(makeDeps({ archive })).handle(req('/v1/npcs/npc-1/biography'));
    expect(res.status).toBe(200);
  });

  it('returns 403 without biographies:read scope', async () => {
    const deps = makeDeps({ keys: makeKeys({ ...FULL_KEY, scopes: ['entries:read'] }) });
    const res = await router(deps).handle(req('/v1/npcs/npc-1/biography'));
    expect(res.status).toBe(403);
  });
});

// ─── Unknown routes ───────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 for unrecognised path', async () => {
    const res = await router(makeDeps()).handle(req('/v1/unknown-resource'));
    expect(res.status).toBe(404);
  });
});

// ─── Stats ────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('increments totalRequests', async () => {
    const r = router(makeDeps());
    await r.handle(req('/v1/entries'));
    await r.handle(req('/v1/entries'));
    expect(r.getStats().totalRequests).toBe(2);
  });

  it('counts authFailures', async () => {
    const deps = makeDeps({ keys: makeKeys(undefined) });
    const r = router(deps);
    await r.handle(req('/v1/entries'));
    expect(r.getStats().authFailures).toBe(1);
  });

  it('counts rateLimitHits', async () => {
    const deps = makeDeps({ rateLimit: makeRl(BLOCKED_RL) });
    const r = router(deps);
    await r.handle(req('/v1/entries'));
    expect(r.getStats().rateLimitHits).toBe(1);
  });

  it('counts notFoundCount', async () => {
    const r = router(makeDeps());
    await r.handle(req('/v1/nonexistent'));
    expect(r.getStats().notFoundCount).toBe(1);
  });
});

// ─── DEFAULT_PUBLIC_API_CONFIG ────────────────────────────────────────

describe('DEFAULT_PUBLIC_API_CONFIG', () => {
  it('has maxSearchLimit of 50', () => {
    expect(DEFAULT_PUBLIC_API_CONFIG.maxSearchLimit).toBe(50);
  });
});

// ─── Helper ───────────────────────────────────────────────────────────

function router(deps: PublicApiDeps) {
  return createPublicApiRouter(deps);
}
