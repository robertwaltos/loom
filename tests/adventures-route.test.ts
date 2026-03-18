/**
 * Adventures Route Tests
 *
 * Tests for /v1/adventures endpoints: world configs listing
 * and entry-specific config lookup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerAdventuresRoutes } from '../src/routes/adventures.js';
import type { AdventuresRoutesDeps } from '../src/routes/adventures.js';
import type { AdventuresEngine } from '../universe/adventures/engine.js';
import type { WorldsEngine } from '../universe/worlds/engine.js';
import type { AdventureConfig } from '../universe/adventures/types.js';
import type { WorldDefinition } from '../universe/worlds/types.js';

// ─── Test Doubles ─────────────────────────────────────────────────

const MOCK_CONFIG_1: AdventureConfig = {
  type: 'guided_expedition',
  entryId: 'entry-fibonacci-rabbit-problem',
  worldId: 'number-garden',
  guideId: 'dottie-chakravarti',
  difficultyTier: 1,
  estimatedMinutes: 20,
  interactionMode: 'guided_walk',
};

const MOCK_CONFIG_2: AdventureConfig = {
  type: 'artifact_hunt',
  entryId: 'entry-zero-invention',
  worldId: 'number-garden',
  guideId: 'dottie-chakravarti',
  difficultyTier: 1,
  estimatedMinutes: 20,
  interactionMode: 'search_collect',
};

const MOCK_WORLD: WorldDefinition = {
  id: 'number-garden',
  name: 'Number Garden',
  realm: 'discovery',
  subject: 'Mathematics',
  guideId: 'dottie-chakravarti',
  description: 'Where patterns bloom.',
  colorPalette: { primary: '#4CAF50', secondary: '#8BC34A', accent: '#FFEB3B', fadedVariant: '#9E9E9E', restoredVariant: '#76FF03' },
  lightingMood: 'warm_morning',
  biomeKit: 'garden',
  entryIds: ['entry-fibonacci-rabbit-problem', 'entry-zero-invention'],
  threadwayConnections: ['great-archive'],
};

function makeAdventuresEngine(configs: readonly AdventureConfig[]): AdventuresEngine {
  return {
    getConfigForEntry: (id) => configs.find(c => c.entryId === id),
    getConfigsForWorld: (worldId) => configs.filter(c => c.worldId === worldId),
    getConfigsForGuide: (guideId) => configs.filter(c => c.guideId === guideId),
    computeAdventureState: () => 'available',
    getTotalEstimatedMinutes: (worldId) => configs
      .filter(c => c.worldId === worldId)
      .reduce((sum, c) => sum + c.estimatedMinutes, 0),
    getStats: () => ({
      totalConfigs: configs.length,
      totalEstimatedMinutes: configs.reduce((s, c) => s + c.estimatedMinutes, 0),
      configsByWorld: new Map([['number-garden', configs.length]]),
      configsByType: new Map(),
    }),
  };
}

function makeWorldsEngine(worlds: readonly WorldDefinition[]): WorldsEngine {
  const byId = new Map(worlds.map(w => [w.id, w]));
  return {
    getWorldById: (id) => byId.get(id),
    getWorldsByRealm: (realm) => worlds.filter(w => w.realm === realm),
    getThreadwayNeighbors: () => [],
    getWorldsContainingEntry: () => [],
    computeFadingStage: () => 'dimming',
    getWorldsNeedingRestoration: () => [],
    getStats: () => ({ totalWorlds: worlds.length, worldsByRealm: { discovery: 1, expression: 0, exchange: 0, crossroads: 0 } }),
  };
}

// ─── Minimal test harness ─────────────────────────────────────────

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
    for (const [key, h] of app.routes) {
      if (!key.startsWith(`${method} `)) continue;
      const m = matchRoute(key.slice(method.length + 1), path);
      if (m !== null) { handler = h; params = m; break; }
    }
  }

  const reply = makeReply();
  if (handler === undefined) return reply.code(404).send({ ok: false, error: 'Route not found', code: 'NOT_FOUND' });
  await handler({ params, query }, reply);
  return reply;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Adventures Routes', () => {
  let app: MockApp;
  let deps: AdventuresRoutesDeps;

  beforeEach(() => {
    app = makeApp();
    deps = {
      adventuresEngine: makeAdventuresEngine([MOCK_CONFIG_1, MOCK_CONFIG_2]),
      worldsEngine: makeWorldsEngine([MOCK_WORLD]),
    };
    registerAdventuresRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, deps);
  });

  describe('GET /v1/adventures/:worldId', () => {
    it('returns adventure configs for a known world', async () => {
      const reply = await invoke(app, 'GET', '/v1/adventures/number-garden');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; worldId: string; adventures: unknown[]; total: number; totalEstimatedMinutes: number };
      expect(body.ok).toBe(true);
      expect(body.worldId).toBe('number-garden');
      expect(body.total).toBe(2);
      expect(body.totalEstimatedMinutes).toBe(40);
    });

    it('returns 404 for unknown world', async () => {
      const reply = await invoke(app, 'GET', '/v1/adventures/nonexistent');
      expect(reply.statusCode).toBe(404);
      const body = reply.body as { ok: boolean; code: string };
      expect(body.ok).toBe(false);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('adventure summaries include interaction mode and tier', async () => {
      const reply = await invoke(app, 'GET', '/v1/adventures/number-garden');
      const body = reply.body as { adventures: Array<{ interactionMode: string; difficultyTier: number; type: string }> };
      const first = body.adventures[0]!;
      expect(first.interactionMode).toBe('guided_walk');
      expect(first.difficultyTier).toBe(1);
      expect(first.type).toBe('guided_expedition');
    });
  });

  describe('GET /v1/adventures/entry/:entryId', () => {
    it('returns config for a known entry', async () => {
      const reply = await invoke(app, 'GET', '/v1/adventures/entry/entry-fibonacci-rabbit-problem');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; adventure: { entryId: string; type: string } };
      expect(body.ok).toBe(true);
      expect(body.adventure.entryId).toBe('entry-fibonacci-rabbit-problem');
      expect(body.adventure.type).toBe('guided_expedition');
    });

    it('returns 404 for unknown entry', async () => {
      const reply = await invoke(app, 'GET', '/v1/adventures/entry/nonexistent-entry');
      expect(reply.statusCode).toBe(404);
    });
  });
});
