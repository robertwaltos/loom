/**
 * Tests for /v1/kindler/:id/chapter and /v1/kindler/:id/dashboard routes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerKindlerRoutes } from '../src/routes/kindler.js';
import type { KindlerRepository } from '../universe/kindler/repository.js';
import type { KindlerEngine } from '../universe/kindler/engine.js';
import type { KindlerProfile, KindlerProgress, SparkState } from '../universe/kindler/types.js';

// ─── Minimal test doubles ─────────────────────────────────────────

const BASE_PROFILE: KindlerProfile = {
  id: 'k1',
  parentAccountId: 'p1',
  displayName: 'Lyra',
  ageTier: 2,
  avatarId: 'compass',
  sparkLevel: 0.3,
  currentChapter: 'first_light',
  worldsVisited: ['cloud-kingdom', 'number-garden'],
  worldsRestored: [],
  guidesMetCount: 3,
  createdAt: 1_000_000,
};

const RESTORED_PROFILE: KindlerProfile = {
  ...BASE_PROFILE,
  id: 'k2',
  currentChapter: 'threadways_open',
  worldsRestored: ['cloud-kingdom', 'number-garden', 'story-tree'],
};

const MAX_CHAPTER_PROFILE: KindlerProfile = {
  ...BASE_PROFILE,
  id: 'k3',
  currentChapter: 'kindlers_legacy',
  worldsRestored: Array.from({ length: 40 }, (_, i) => `world-${i}`),
};

function makeRepo(profiles: Record<string, KindlerProfile>): KindlerRepository {
  return {
    findById: async (id) => profiles[id] ?? null,
    findByParentId: async () => [],
    save: async () => undefined,
    loadProgress: async (): Promise<readonly KindlerProgress[]> => [],
    saveProgress: async () => undefined,
    loadSparkLog: async () => [],
    appendSparkEntry: async () => undefined,
    saveSession: async () => undefined,
    loadSession: async () => null,
    saveSessionReport: async () => undefined,
  };
}

function makeEngine(profile: KindlerProfile): KindlerEngine {
  const spark: SparkState = {
    kindlerId: profile.id,
    level: profile.sparkLevel,
    trend: 'growing',
    lastActivityAt: profile.createdAt,
    streakDays: 2,
  };
  return {
    registerKindler: () => undefined,
    applySpark: () => { throw new Error('not used'); },
    applyNaturalDecay: () => null,
    recordProgress: () => { throw new Error('not used'); },
    markWorldRestored: () => undefined,
    startSession: () => { throw new Error('not used'); },
    endSession: () => { throw new Error('not used'); },
    getSparkState: (_id: string) => spark,
    getKindlerCount: () => 1,
    getStats: () => ({ kindlerCount: 1, totalSparksApplied: 0, totalProgressRecorded: 0, totalSessionsEnded: 0 }),
  } as unknown as KindlerEngine;
}

// ─── Mock harness (matches quiz-route pattern) ────────────────────

type Handler = (req: unknown, reply: unknown) => Promise<unknown>;

interface MockApp {
  routes: Map<string, Handler>;
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  delete(path: string, handler: Handler): void;
  patch(path: string, handler: Handler): void;
}

function makeApp(): MockApp {
  const routes = new Map<string, Handler>();
  return {
    routes,
    get(path, handler) { routes.set(`GET ${path}`, handler); },
    post(path, handler) { routes.set(`POST ${path}`, handler); },
    delete(path, handler) { routes.set(`DELETE ${path}`, handler); },
    patch(path, handler) { routes.set(`PATCH ${path}`, handler); },
  };
}

interface MockReply {
  statusCode: number;
  body: unknown;
  code(n: number): MockReply;
  status(n: number): MockReply;
  send(data: unknown): MockReply;
}

function makeReply(): MockReply {
  const r: MockReply = {
    statusCode: 200,
    body: null,
    code(n) { r.statusCode = n; return r; },
    status(n) { r.statusCode = n; return r; },
    send(data) { r.body = data; return r; },
  };
  return r;
}

function matchRoute(pattern: string, actual: string): Record<string, string> | null {
  const rp = pattern.split('/');
  const ap = actual.split('/');
  if (rp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < rp.length; i++) {
    const seg = rp[i]!;
    const act = ap[i]!;
    if (seg.startsWith(':')) params[seg.slice(1)] = act;
    else if (seg !== act) return null;
  }
  return params;
}

async function invoke(
  app: MockApp,
  method: string,
  path: string,
  query: Record<string, unknown> = {},
): Promise<MockReply> {
  let handler: Handler | undefined;
  let params: Record<string, unknown> = {};

  const staticKey = `${method} ${path}`;
  if (app.routes.has(staticKey)) {
    handler = app.routes.get(staticKey);
  } else {
    const candidates: Array<{ key: string; h: Handler; params: Record<string, string> }> = [];
    for (const [key, h] of app.routes) {
      if (!key.startsWith(`${method} `)) continue;
      const m = matchRoute(key.slice(method.length + 1), path);
      if (m !== null) candidates.push({ key, h, params: m });
    }
    candidates.sort((a, b) => {
      const aStatic = a.key.split('/').filter(s => !s.startsWith(':')).length;
      const bStatic = b.key.split('/').filter(s => !s.startsWith(':')).length;
      return bStatic - aStatic;
    });
    if (candidates.length > 0) {
      const best = candidates[0]!;
      handler = best.h;
      params = best.params;
    }
  }

  const reply = makeReply();
  if (handler === undefined) return reply.code(404).send({ ok: false, error: 'Not found', code: 'NOT_FOUND' });
  await handler({ params, query, headers: { authorization: 'Bearer parent-token' }, body: {} }, reply);
  return reply;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('GET /v1/kindler/:id/chapter', () => {
  let app: MockApp;

  beforeEach(() => {
    app = makeApp();
    registerKindlerRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      repo: makeRepo({ k1: BASE_PROFILE, k2: RESTORED_PROFILE, k3: MAX_CHAPTER_PROFILE }),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
  });

  it('returns chapter state with thresholdForNext for first_light', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/k1/chapter');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; chapter: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.chapter['current']).toBe('first_light');
    expect(body.chapter['nextChapter']).toBe('threadways_open');
    expect(body.chapter['thresholdForNext']).toBe(3);
    expect(body.chapter['worldsRestored']).toBe(0);
    expect(body.chapter['worldsNeeded']).toBe(3);
    expect(body.chapter['isMaxChapter']).toBe(false);
  });

  it('returns isMaxChapter=true for kindlers_legacy', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/k3/chapter');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; chapter: Record<string, unknown> };
    expect(body.chapter['current']).toBe('kindlers_legacy');
    expect(body.chapter['nextChapter']).toBeNull();
    expect(body.chapter['thresholdForNext']).toBeNull();
    expect(body.chapter['worldsNeeded']).toBe(0);
    expect(body.chapter['isMaxChapter']).toBe(true);
  });

  it('computes worldsNeeded correctly for threadways_open', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/k2/chapter');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; chapter: Record<string, unknown> };
    expect(body.chapter['current']).toBe('threadways_open');
    expect(body.chapter['worldsRestored']).toBe(3);
    expect(body.chapter['thresholdForNext']).toBe(10);
    expect(body.chapter['worldsNeeded']).toBe(7);
  });

  it('returns 404 for unknown kindler', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/unknown/chapter');
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /v1/kindler/:id/dashboard', () => {
  let app: MockApp;

  beforeEach(() => {
    app = makeApp();
    registerKindlerRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      repo: makeRepo({ k1: BASE_PROFILE }),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
  });

  it('returns full game progress snapshot', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/k1/dashboard');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; dashboard: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.dashboard['kindlerId']).toBe('k1');
    expect(body.dashboard['displayName']).toBe('Lyra');
    expect(body.dashboard['ageTier']).toBe(2);
    expect(body.dashboard['entriesCompleted']).toBe(0);
  });

  it('dashboard includes spark state', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/k1/dashboard');
    const body = res.body as { dashboard: { spark: Record<string, unknown> } };
    expect(body.dashboard.spark['level']).toBe(0.3);
    expect(body.dashboard.spark['trend']).toBe('growing');
    expect(body.dashboard.spark['streakDays']).toBe(2);
  });

  it('dashboard includes chapter info', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/k1/dashboard');
    const body = res.body as {
      dashboard: {
        chapter: Record<string, unknown>;
        worlds: Record<string, unknown>;
      };
    };
    expect(body.dashboard.chapter['current']).toBe('first_light');
    expect(body.dashboard.chapter['nextChapter']).toBe('threadways_open');
    expect(body.dashboard.chapter['worldsNeeded']).toBe(3);
    expect(body.dashboard.worlds['visited']).toBe(2);
    expect(body.dashboard.worlds['restored']).toBe(0);
  });

  it('returns 404 for unknown kindler', async () => {
    const res = await invoke(app, 'GET', '/v1/kindler/ghost/dashboard');
    expect(res.statusCode).toBe(404);
  });
});

// ─── Inline Fastify mock ──────────────────────────────────────────

interface InjectResult {
  status: number;
  body: unknown;
}

function makeMockApp() {
  const routes: Map<string, (req: unknown) => unknown> = new Map();

  return {
    get: (path: string, handler: (req: unknown, reply: unknown) => unknown) => {
      routes.set(`GET:${path}`, handler);
    },
    post: (_path: string, _handler: unknown) => undefined,
    async inject(method: string, path: string, params?: Record<string, string>): Promise<InjectResult> {
      const routeKey = `${method}:${path}`;
      const handler = routes.get(routeKey);
      if (!handler) return { status: 404, body: { ok: false, error: 'No route', code: 'NOT_FOUND' } };

      let resolvedStatus = 200;
      let resolvedBody: unknown = null;
      const reply = {
        code: (s: number) => { resolvedStatus = s; return reply; },
        status: (s: number) => { resolvedStatus = s; return reply; },
        send: (b: unknown) => { resolvedBody = b; return reply; },
      };
      const req = {
        headers: { authorization: 'Bearer parent-token' },
        params: params ?? {},
        query: {},
        body: {},
      };
      await Promise.resolve(handler(req, reply));
      return { status: resolvedStatus, body: resolvedBody };
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('GET /v1/kindler/:id/chapter', () => {
  it('returns chapter state with thresholdForNext for first_light', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({ k1: BASE_PROFILE }),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/chapter', { id: 'k1' });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; chapter: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.chapter.current).toBe('first_light');
    expect(body.chapter.nextChapter).toBe('threadways_open');
    expect(body.chapter.thresholdForNext).toBe(3);
    expect(body.chapter.worldsRestored).toBe(0);
    expect(body.chapter.worldsNeeded).toBe(3);
    expect(body.chapter.isMaxChapter).toBe(false);
  });

  it('returns isMaxChapter=true for kindlers_legacy', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({ k3: MAX_CHAPTER_PROFILE }),
      engine: makeEngine(MAX_CHAPTER_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/chapter', { id: 'k3' });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; chapter: Record<string, unknown> };
    expect(body.chapter.current).toBe('kindlers_legacy');
    expect(body.chapter.nextChapter).toBeNull();
    expect(body.chapter.thresholdForNext).toBeNull();
    expect(body.chapter.worldsNeeded).toBe(0);
    expect(body.chapter.isMaxChapter).toBe(true);
  });

  it('returns worldsNeeded=0 when threshold already met', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({ k2: RESTORED_PROFILE }),
      engine: makeEngine(RESTORED_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/chapter', { id: 'k2' });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; chapter: Record<string, unknown> };
    expect(body.chapter.current).toBe('threadways_open');
    expect(body.chapter.worldsRestored).toBe(3);
    expect(body.chapter.thresholdForNext).toBe(10);
    expect(body.chapter.worldsNeeded).toBe(7);
  });

  it('returns 404 for unknown kindler', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({}),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/chapter', { id: 'unknown' });
    expect(res.status).toBe(404);
  });
});

describe('GET /v1/kindler/:id/dashboard', () => {
  it('returns full game progress snapshot', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({ k1: BASE_PROFILE }),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/dashboard', { id: 'k1' });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; dashboard: Record<string, unknown> };
    expect(body.ok).toBe(true);
    expect(body.dashboard['kindlerId']).toBe('k1');
    expect(body.dashboard['displayName']).toBe('Lyra');
    expect(body.dashboard['ageTier']).toBe(2);
    expect(body.dashboard['entriesCompleted']).toBe(0);
  });

  it('dashboard includes spark state', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({ k1: BASE_PROFILE }),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/dashboard', { id: 'k1' });
    const body = res.body as { dashboard: { spark: Record<string, unknown> } };
    expect(body.dashboard.spark['level']).toBe(0.3);
    expect(body.dashboard.spark['trend']).toBe('growing');
    expect(body.dashboard.spark['streakDays']).toBe(2);
  });

  it('dashboard includes chapter info', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({ k1: BASE_PROFILE }),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/dashboard', { id: 'k1' });
    const body = res.body as { dashboard: { chapter: Record<string, unknown>; worlds: Record<string, unknown> } };
    expect(body.dashboard.chapter['current']).toBe('first_light');
    expect(body.dashboard.chapter['nextChapter']).toBe('threadways_open');
    expect(body.dashboard.chapter['worldsNeeded']).toBe(3);
    expect(body.dashboard.worlds['visited']).toBe(2);
    expect(body.dashboard.worlds['restored']).toBe(0);
  });

  it('returns 404 for unknown kindler', async () => {
    const app = makeMockApp();
    registerKindlerRoutes(app as never, {
      repo: makeRepo({}),
      engine: makeEngine(BASE_PROFILE),
      idGenerator: { generate: () => 'new-id' },
    });
    const res = await app.inject('GET', '/v1/kindler/:id/dashboard', { id: 'ghost' });
    expect(res.status).toBe(404);
  });
});
