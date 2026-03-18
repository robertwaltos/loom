/**
 * Tests for mini-games routes.
 *
 * GET /v1/mini-games              — all 50 games
 * GET /v1/mini-games?realm=stem   — stem games only
 * GET /v1/mini-games/realm/:realm — realm filter
 * GET /v1/mini-games/:worldId     — world filter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerMiniGamesRoutes } from '../src/routes/mini-games.js';
import { createMiniGamesRegistry } from '../fabrics/loom-core/src/mini-games-registry.js';

// ─── Mock harness ─────────────────────────────────────────────────

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
  await handler({ params, query }, reply);
  return reply;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('GET /v1/mini-games', () => {
  let app: MockApp;

  beforeEach(() => {
    app = makeApp();
    registerMiniGamesRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      registry: createMiniGamesRegistry(),
    });
  });

  it('returns all 50 mini-games', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; total: number; games: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(50);
    expect(body.games).toHaveLength(50);
  });

  it('filters by realm=stem', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games', { realm: 'stem' });
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; games: Array<{ realm: string }> };
    expect(body.ok).toBe(true);
    expect(body.games.every(g => g.realm === 'stem')).toBe(true);
    expect(body.games.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid realm filter', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games', { realm: 'badRealm' });
    expect(res.statusCode).toBe(400);
    const body = res.body as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('INVALID_INPUT');
  });

  it('each game summary has required fields', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games');
    const body = res.body as { games: Array<Record<string, unknown>> };
    const first = body.games[0]!;
    expect(typeof first['gameId']).toBe('string');
    expect(typeof first['worldId']).toBe('string');
    expect(typeof first['name']).toBe('string');
    expect(typeof first['mechanic']).toBe('string');
    expect(typeof first['learningObjective']).toBe('string');
    expect(typeof first['realm']).toBe('string');
    expect(typeof first['maxDifficulty']).toBe('number');
  });
});

describe('GET /v1/mini-games/realm/:realm', () => {
  let app: MockApp;

  beforeEach(() => {
    app = makeApp();
    registerMiniGamesRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      registry: createMiniGamesRegistry(),
    });
  });

  it('returns language-arts games', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games/realm/language-arts');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; games: Array<{ realm: string }> };
    expect(body.ok).toBe(true);
    expect(body.games.every(g => g.realm === 'language-arts')).toBe(true);
    expect(body.games.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid realm', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games/realm/invalid');
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /v1/mini-games/:worldId', () => {
  let app: MockApp;

  beforeEach(() => {
    app = makeApp();
    registerMiniGamesRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      registry: createMiniGamesRegistry(),
    });
  });

  it('returns storm-chaser for cloud-kingdom', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games/cloud-kingdom');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; games: Array<Record<string, unknown>> };
    expect(body.ok).toBe(true);
    expect(body.games).toHaveLength(1);
    expect(body.games[0]!['gameId']).toBe('storm-chaser');
    expect(body.games[0]!['worldId']).toBe('cloud-kingdom');
  });

  it('returns empty array for unknown worldId', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games/unknown-world');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ok: boolean; total: number };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
  });

  it('returns fair-trade for market-square with financial-literacy realm', async () => {
    const res = await invoke(app, 'GET', '/v1/mini-games/market-square');
    expect(res.statusCode).toBe(200);
    const body = res.body as { games: Array<Record<string, unknown>> };
    expect(body.games[0]!['gameId']).toBe('fair-trade');
    expect(body.games[0]!['realm']).toBe('financial-literacy');
  });
});


// ─── Inline Fastify mock ──────────────────────────────────────────

interface InjectResult {
  status: number;
  body: unknown;
}

function makeMockApp() {
  const routes: Map<string, (req: unknown, reply: unknown) => unknown> = new Map();

  return {
    get: (path: string, handler: (req: unknown, reply: unknown) => unknown) => {
      routes.set(`GET:${path}`, handler);
    },
    async inject(method: string, path: string, opts?: {
      params?: Record<string, string>;
      query?: Record<string, string>;
    }): Promise<InjectResult> {
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
        params: opts?.params ?? {},
        query: opts?.query ?? {},
      };
      await Promise.resolve(handler(req, reply));
      return { status: resolvedStatus, body: resolvedBody };
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('GET /v1/mini-games — all games', () => {
  it('returns all 50 mini-games', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games');
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; total: number; games: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(50);
    expect(body.games).toHaveLength(50);
  });

  it('filters by realm=stem', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games', { query: { realm: 'stem' } });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; games: Array<{ realm: string }> };
    expect(body.ok).toBe(true);
    expect(body.games.every(g => g.realm === 'stem')).toBe(true);
    expect(body.games.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid realm filter', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games', { query: { realm: 'badRealm' } });
    expect(res.status).toBe(400);
    const body = res.body as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('INVALID_INPUT');
  });

  it('each game summary has required fields', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games');
    const body = res.body as { games: Array<Record<string, unknown>> };
    const first = body.games[0]!;
    expect(typeof first['gameId']).toBe('string');
    expect(typeof first['worldId']).toBe('string');
    expect(typeof first['name']).toBe('string');
    expect(typeof first['mechanic']).toBe('string');
    expect(typeof first['learningObjective']).toBe('string');
    expect(typeof first['realm']).toBe('string');
    expect(typeof first['maxDifficulty']).toBe('number');
  });
});

describe('GET /v1/mini-games/realm/:realm', () => {
  it('returns language-arts games', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games/realm/:realm', { params: { realm: 'language-arts' } });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; games: Array<{ realm: string }> };
    expect(body.ok).toBe(true);
    expect(body.games.every(g => g.realm === 'language-arts')).toBe(true);
    expect(body.games.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid realm', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games/realm/:realm', { params: { realm: 'invalid' } });
    expect(res.status).toBe(400);
  });
});

describe('GET /v1/mini-games/:worldId', () => {
  it('returns storm-chaser for cloud-kingdom', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games/:worldId', { params: { worldId: 'cloud-kingdom' } });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; games: Array<{ gameId: string; worldId: string }> };
    expect(body.ok).toBe(true);
    expect(body.games.length).toBe(1);
    expect(body.games[0]!.gameId).toBe('storm-chaser');
    expect(body.games[0]!.worldId).toBe('cloud-kingdom');
  });

  it('returns empty array for unknown worldId', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games/:worldId', { params: { worldId: 'unknown-world' } });
    expect(res.status).toBe(200);
    const body = res.body as { ok: boolean; total: number };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
  });

  it('returns financial-literacy games for market-square', async () => {
    const app = makeMockApp();
    registerMiniGamesRoutes(app as never, { registry: createMiniGamesRegistry() });
    const res = await app.inject('GET', '/v1/mini-games/:worldId', { params: { worldId: 'market-square' } });
    expect(res.status).toBe(200);
    const body = res.body as { games: Array<{ gameId: string; realm: string }> };
    expect(body.games[0]!.gameId).toBe('fair-trade');
    expect(body.games[0]!.realm).toBe('financial-literacy');
  });
});
