/**
 * Worlds Route Tests
 *
 * Tests for /v1/worlds endpoints: listing, realm filtering,
 * world detail with luminance, and entry queries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerWorldsRoutes } from '../src/routes/worlds.js';
import type { WorldsRoutesDeps } from '../src/routes/worlds.js';
import type { WorldLuminance, WorldDefinition, Realm } from '../universe/worlds/types.js';
import type { WorldsEngine } from '../universe/worlds/engine.js';
import type { ContentEngine } from '../universe/content/engine.js';
import type { RealWorldEntry } from '../universe/content/types.js';

// ─── Test Doubles ─────────────────────────────────────────────────

const MOCK_WORLD_1: WorldDefinition = {
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

const MOCK_WORLD_2: WorldDefinition = {
  id: 'great-archive',
  name: 'The Great Archive',
  realm: 'expression',
  subject: 'Information Literacy',
  guideId: 'the-librarian',
  description: 'Where knowledge is preserved.',
  colorPalette: { primary: '#795548', secondary: '#A1887F', accent: '#FFD54F', fadedVariant: '#9E9E9E', restoredVariant: '#FFCA28' },
  lightingMood: 'candle_warm',
  biomeKit: 'library',
  entryIds: ['entry-great-library-alexandria'],
  threadwayConnections: ['number-garden'],
};

const MOCK_ENTRY: RealWorldEntry = {
  id: 'entry-fibonacci-rabbit-problem',
  type: 'discovery',
  title: 'Fibonacci Rabbit Problem',
  year: 1202,
  yearDisplay: '1202 CE',
  era: 'medieval',
  descriptionChild: 'Fibonacci counted rabbits and found a magical number pattern!',
  descriptionOlder: 'Leonardo of Pisa described the Fibonacci sequence in Liber Abaci.',
  descriptionParent: 'A foundational pattern in mathematics.',
  realPeople: ['Fibonacci'],
  quote: 'Patterns are everywhere.',
  quoteAttribution: 'Fibonacci',
  geographicLocation: { lat: 43.7, lng: 10.4, name: 'Pisa, Italy' },
  continent: 'Europe',
  subjectTags: ['mathematics', 'patterns', 'sequences'],
  worldId: 'number-garden',
  guideId: 'dottie-chakravarti',
  adventureType: 'guided_expedition',
  difficultyTier: 1,
  prerequisites: [],
  unlocks: ['entry-zero-invention'],
  funFact: 'Fibonacci numbers appear in sunflower seeds and pine cones!',
  imagePrompt: 'A spiral garden path...',
  status: 'published',
};

function makeWorldsEngine(worlds: readonly WorldDefinition[]): WorldsEngine {
  const byId = new Map(worlds.map(w => [w.id, w]));
  return {
    getWorldById: (id) => byId.get(id),
    getWorldsByRealm: (realm) => worlds.filter(w => w.realm === realm),
    getThreadwayNeighbors: (id) => {
      const w = byId.get(id);
      return w ? w.threadwayConnections.flatMap(cid => { const c = byId.get(cid); return c ? [c] : []; }) : [];
    },
    getWorldsContainingEntry: (entryId) => worlds.filter(w => w.entryIds.includes(entryId)),
    computeFadingStage: (lum) => lum >= 0.8 ? 'radiant' : lum >= 0.6 ? 'glowing' : lum >= 0.4 ? 'dimming' : lum >= 0.2 ? 'fading' : 'deep_fade',
    getWorldsNeedingRestoration: (map, threshold) => worlds.filter(w => (map.get(w.id) ?? 0) < threshold),
    getStats: () => ({ totalWorlds: worlds.length, worldsByRealm: { discovery: 1, expression: 1, exchange: 0, crossroads: 0 } }),
  };
}

function makeContentEngine(entries: readonly RealWorldEntry[]): ContentEngine {
  return {
    getEntriesForWorld: (worldId) => entries.filter(e => e.worldId === worldId && e.status === 'published'),
    getEntriesForTier: (tier) => entries.filter(e => e.difficultyTier === tier),
    getAvailableEntries: (completed) => {
      const done = new Set(completed);
      return entries.filter(e => e.status === 'published' && e.prerequisites.every(p => done.has(p)));
    },
    getEntryById: (id) => entries.find(e => e.id === id),
    getQuizzesForEntry: () => [],
    getQuizzesForEntryAndTier: () => [],
    getMapsForEntry: () => [],
    getEntriesForStandardCode: () => [],
    validatePrerequisites: () => [],
    getUnlockChain: () => [],
    getStats: () => ({
      totalEntries: entries.length,
      publishedEntries: entries.filter(e => e.status === 'published').length,
      totalQuizQuestions: 0,
      totalCurriculumMaps: 0,
      worldIds: [...new Set(entries.map(e => e.worldId))],
    }),
  };
}

function makeLuminanceStore(worlds: readonly WorldDefinition[]): Map<string, WorldLuminance> {
  return new Map(worlds.map(w => [w.id, {
    worldId: w.id,
    luminance: 0.5,
    stage: 'dimming' as const,
    lastRestoredAt: 1000000,
    totalKindlersContributed: 3,
    activeKindlerCount: 1,
  }]));
}

// ─── Minimal Fastify-like test harness ────────────────────────────

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

interface MockRequest {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface MockReply {
  statusCode: number;
  body: unknown;
  code(n: number): MockReply;
  status(n: number): MockReply;
  send(data: unknown): MockReply;
}

function makeReply(): MockReply {
  const reply: MockReply = {
    statusCode: 200,
    body: null,
    code(n) { reply.statusCode = n; return reply; },
    status(n) { reply.statusCode = n; return reply; },
    send(data) { reply.body = data; return reply; },
  };
  return reply;
}

async function invoke(
  app: MockApp,
  method: string,
  path: string,
  req: MockRequest = {},
): Promise<MockReply> {
  // Match static routes first, then parameterized
  const staticKey = `${method} ${path}`;
  let handler = app.routes.get(staticKey);
  let params: Record<string, unknown> = {};

  if (handler === undefined) {
    // Try parameterized matching
    for (const [routeKey, h] of app.routes) {
      if (!routeKey.startsWith(`${method} `)) continue;
      const routePath = routeKey.slice(method.length + 1);
      const match = matchRoute(routePath, path);
      if (match !== null) {
        handler = h;
        params = match;
        break;
      }
    }
  }

  if (handler === undefined) {
    const reply = makeReply();
    return reply.code(404).send({ ok: false, error: 'Route not found', code: 'NOT_FOUND' });
  }

  const reply = makeReply();
  const request = { params: { ...params, ...req.params }, query: req.query ?? {}, body: req.body, headers: req.headers ?? {} };
  await handler(request, reply);
  return reply;
}

function matchRoute(routePattern: string, actualPath: string): Record<string, string> | null {
  const routeParts = routePattern.split('/');
  const actualParts = actualPath.split('/');
  if (routeParts.length !== actualParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < routeParts.length; i++) {
    const rp = routeParts[i]!;
    const ap = actualParts[i]!;
    if (rp.startsWith(':')) {
      params[rp.slice(1)] = ap;
    } else if (rp !== ap) {
      return null;
    }
  }
  return params;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Worlds Routes', () => {
  let app: MockApp;
  let deps: WorldsRoutesDeps;

  beforeEach(() => {
    app = makeApp();
    const worlds = [MOCK_WORLD_1, MOCK_WORLD_2];
    deps = {
      worldsEngine: makeWorldsEngine(worlds),
      contentEngine: makeContentEngine([MOCK_ENTRY]),
      luminanceStore: makeLuminanceStore(worlds),
    };
    registerWorldsRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, deps);
  });

  describe('GET /v1/worlds', () => {
    it('returns all worlds', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; worlds: unknown[]; total: number };
      expect(body.ok).toBe(true);
      expect(body.total).toBe(2);
      expect(body.worlds).toHaveLength(2);
    });

    it('includes luminance state in each world', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds');
      const body = reply.body as { worlds: Array<{ luminance: number; stage: string }> };
      const world = body.worlds[0]!;
      expect(world.luminance).toBe(0.5);
      expect(world.stage).toBe('dimming');
    });

    it('filters by realm=discovery', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds', { query: { realm: 'discovery' } });
      const body = reply.body as { ok: boolean; worlds: Array<{ realm: string }>; total: number };
      expect(body.ok).toBe(true);
      expect(body.worlds.every(w => w.realm === 'discovery')).toBe(true);
    });

    it('rejects invalid realm', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds', { query: { realm: 'invalid-realm' } });
      expect(reply.statusCode).toBe(400);
      const body = reply.body as { ok: boolean; code: string };
      expect(body.ok).toBe(false);
      expect(body.code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /v1/worlds/realm/:realm', () => {
    it('returns worlds for a valid realm', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/realm/expression');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { worlds: Array<{ realm: Realm }>; total: number };
      expect(body.worlds.every(w => w.realm === 'expression')).toBe(true);
    });

    it('rejects invalid realm param', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/realm/bogus');
      expect(reply.statusCode).toBe(400);
    });
  });

  describe('GET /v1/worlds/:worldId', () => {
    it('returns world detail + luminance', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/number-garden');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; world: { id: string; entryCount: number; luminance: number; stage: string; threadwayConnections: string[] } };
      expect(body.ok).toBe(true);
      expect(body.world.id).toBe('number-garden');
      expect(body.world.entryCount).toBe(1);  // one published entry in mock
      expect(body.world.luminance).toBe(0.5);
      expect(body.world.stage).toBe('dimming');
      expect(body.world.threadwayConnections).toContain('great-archive');
    });

    it('returns 404 for unknown world', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/nonexistent-world');
      expect(reply.statusCode).toBe(404);
      const body = reply.body as { ok: boolean; code: string };
      expect(body.ok).toBe(false);
      expect(body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /v1/worlds/:worldId/entries', () => {
    it('returns published entries for a world', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/number-garden/entries');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { ok: boolean; worldId: string; entries: unknown[]; total: number };
      expect(body.ok).toBe(true);
      expect(body.worldId).toBe('number-garden');
      expect(body.total).toBe(1);
      expect(body.entries).toHaveLength(1);
    });

    it('returns empty entries for world with no content', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/great-archive/entries');
      expect(reply.statusCode).toBe(200);
      const body = reply.body as { total: number };
      expect(body.total).toBe(0);
    });

    it('returns 404 for unknown world', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/nonexistent/entries');
      expect(reply.statusCode).toBe(404);
    });

    it('entry summaries include expected fields', async () => {
      const reply = await invoke(app, 'GET', '/v1/worlds/number-garden/entries');
      const body = reply.body as { entries: Array<{ id: string; title: string; difficultyTier: number; adventureType: string }> };
      const entry = body.entries[0]!;
      expect(entry.id).toBe('entry-fibonacci-rabbit-problem');
      expect(entry.title).toBe('Fibonacci Rabbit Problem');
      expect(entry.difficultyTier).toBe(1);
      expect(entry.adventureType).toBe('guided_expedition');
    });
  });
});
