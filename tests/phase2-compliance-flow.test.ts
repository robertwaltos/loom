/**
 * Phase 2 Compliance Flow — Integration tests for GDPR/COPPA endpoints.
 *
 * Covers:
 *   GET    /v1/account/export       — COPPA-safe data export (no PII)
 *   DELETE /v1/account              — Account anonymisation with Chronicle preservation
 *   POST   /v1/auth/register        — Age gate: under-13 requires parental consent
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerAccountRoutes } from '../src/routes/account.js';
import { createAuthRoutes } from '../src/routes/auth.js';
import type { KindlerRepository } from '../universe/kindler/repository.js';
import type { KindlerProfile, KindlerProgress, SparkLogEntry, KindlerSession, SessionReport } from '../universe/kindler/types.js';

// ─── Fixtures ─────────────────────────────────────────────────────

const BASE_PROFILE: KindlerProfile = {
  id: 'kindler-abc',
  parentAccountId: 'parent-xyz',
  displayName: 'Ember',
  ageTier: 2,
  avatarId: 'lantern',
  sparkLevel: 0.65,
  currentChapter: 'threadways_open',
  worldsVisited: ['cloud-kingdom', 'number-garden', 'story-tree'],
  worldsRestored: ['cloud-kingdom'],
  guidesMetCount: 5,
  createdAt: 1_700_000_000,
};

const PROGRESS_ENTRIES: KindlerProgress[] = [
  { id: 'p1', kindlerId: 'kindler-abc', entryId: 'entry-1', completedAt: 1_700_001_000, adventureType: 'quiz', score: 0.9 },
  { id: 'p2', kindlerId: 'kindler-abc', entryId: 'entry-2', completedAt: 1_700_002_000, adventureType: 'story', score: null },
];

const SPARK_LOG: SparkLogEntry[] = [
  { id: 's1', kindlerId: 'kindler-abc', sparkLevel: 0.6, delta: 0.05, cause: 'lesson_completed', timestamp: 1_700_001_000 },
];

// ─── Mock repository ──────────────────────────────────────────────

function makeRepo(overrides?: { profile?: KindlerProfile | null }): KindlerRepository & { _profiles: Map<string, KindlerProfile> } {
  const _profiles = new Map<string, KindlerProfile>();
  if (overrides?.profile !== null) {
    const p = overrides?.profile ?? BASE_PROFILE;
    _profiles.set(p.id, p);
  }

  return {
    _profiles,
    findById: async (id) => _profiles.get(id) ?? null,
    findByParentId: async () => [],
    save: async (profile) => { _profiles.set(profile.id, profile); },
    loadProgress: async () => PROGRESS_ENTRIES,
    saveProgress: async () => undefined,
    loadSparkLog: async () => SPARK_LOG,
    appendSparkEntry: async () => undefined,
    saveSession: async () => undefined,
    loadSession: async (): Promise<KindlerSession | null> => null,
    saveSessionReport: async (_r: SessionReport) => undefined,
  };
}

// ─── Mock app harness (matches kindler-chapter-route.test.ts pattern) ──

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

async function invokeRoute(
  app: MockApp,
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<MockReply> {
  const key = `${method} ${path}`;
  const handler = app.routes.get(key);
  const reply = makeReply();
  if (handler === undefined) return reply.code(404).send({ ok: false, error: 'No route', code: 'NOT_FOUND' });

  const req = {
    params: {},
    query: {},
    headers: { authorization: opts.token ? `Bearer ${opts.token}` : undefined },
    body: opts.body ?? {},
  };
  await handler(req, reply);
  return reply;
}

// ─── Tests: GET /v1/account/export ───────────────────────────────

describe('GET /v1/account/export', () => {
  let app: MockApp;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    app = makeApp();
    repo = makeRepo();
    registerAccountRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      repo,
      log: () => undefined,
    });
  });

  it('returns 401 when no Authorization header is present', async () => {
    const res = await invokeRoute(app, 'GET', '/v1/account/export');
    expect(res.statusCode).toBe(401);
    const body = res.body as { code: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when kindlerId is not found', async () => {
    const res = await invokeRoute(app, 'GET', '/v1/account/export', { token: 'no-such-kindler' });
    expect(res.statusCode).toBe(404);
    const body = res.body as { code: string };
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns a COPPA-safe export with correct shape', async () => {
    const res = await invokeRoute(app, 'GET', '/v1/account/export', { token: 'kindler-abc' });
    expect(res.statusCode).toBe(200);
    const body = res.body as {
      exportedAt: string;
      kindler: Record<string, unknown>;
      progress: unknown[];
      worldsVisited: string[];
      guidesMetCount: number;
    };
    expect(typeof body.exportedAt).toBe('string');
    expect(new Date(body.exportedAt).getTime()).not.toBeNaN();
    expect(body.kindler['id']).toBe('kindler-abc');
    expect(body.kindler['displayName']).toBe('Ember');
    expect(body.kindler['ageTier']).toBe(2);
    expect(body.kindler['sparkLevel']).toBe(0.65);
    expect(body.kindler['currentChapter']).toBe('threadways_open');
    expect(body.kindler['guidesMetCount']).toBe(5);
  });

  it('export does NOT include email, real name, or parentAccountId', async () => {
    const res = await invokeRoute(app, 'GET', '/v1/account/export', { token: 'kindler-abc' });
    const body = res.body as Record<string, unknown>;
    const kindlerData = body['kindler'] as Record<string, unknown>;
    expect(kindlerData['email']).toBeUndefined();
    expect(kindlerData['parentAccountId']).toBeUndefined();
    expect(body['email']).toBeUndefined();
  });

  it('export includes worldsVisited and progress entries', async () => {
    const res = await invokeRoute(app, 'GET', '/v1/account/export', { token: 'kindler-abc' });
    const body = res.body as { worldsVisited: string[]; progress: unknown[] };
    expect(body.worldsVisited).toContain('cloud-kingdom');
    expect(body.worldsVisited).toContain('number-garden');
    expect(body.progress).toHaveLength(2);
  });

  it('export progress entries have correct fields', async () => {
    const res = await invokeRoute(app, 'GET', '/v1/account/export', { token: 'kindler-abc' });
    const body = res.body as { progress: Array<Record<string, unknown>> };
    const first = body.progress[0]!;
    expect(first['entryId']).toBe('entry-1');
    expect(first['adventureType']).toBe('quiz');
    expect(first['score']).toBe(0.9);
  });
});

// ─── Tests: DELETE /v1/account ───────────────────────────────────

describe('DELETE /v1/account', () => {
  let app: MockApp;
  let repo: ReturnType<typeof makeRepo>;
  const deletedSparkLogs: string[] = [];
  const deletedSessions: string[] = [];

  beforeEach(() => {
    app = makeApp();
    repo = makeRepo();
    deletedSparkLogs.length = 0;
    deletedSessions.length = 0;
    registerAccountRoutes(app as unknown as import('@loom/selvage').FastifyAppLike, {
      repo,
      log: () => undefined,
      deleteSparkLogs: async (id) => { deletedSparkLogs.push(id); },
      deleteSessions: async (id) => { deletedSessions.push(id); },
    });
  });

  it('returns 401 when no Authorization header', async () => {
    const res = await invokeRoute(app, 'DELETE', '/v1/account', { body: { confirm: true } });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when confirm is missing', async () => {
    const res = await invokeRoute(app, 'DELETE', '/v1/account', { token: 'kindler-abc' });
    expect(res.statusCode).toBe(400);
    const body = res.body as { code: string };
    expect(body.code).toBe('CONFIRMATION_REQUIRED');
  });

  it('returns 400 when confirm is false', async () => {
    const res = await invokeRoute(app, 'DELETE', '/v1/account', { token: 'kindler-abc', body: { confirm: false } });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when kindler does not exist', async () => {
    const res = await invokeRoute(app, 'DELETE', '/v1/account', { token: 'ghost', body: { confirm: true } });
    expect(res.statusCode).toBe(404);
  });

  it('anonymises the kindler profile after deletion', async () => {
    const res = await invokeRoute(app, 'DELETE', '/v1/account', { token: 'kindler-abc', body: { confirm: true } });
    expect(res.statusCode).toBe(200);
    const body = res.body as { deleted: boolean; message: string };
    expect(body.deleted).toBe(true);
    expect(body.message).toContain('Chronicle entries retained');

    const updated = await repo.findById('kindler-abc');
    expect(updated).not.toBeNull();
    expect(updated!.displayName).toBe('Former Kindler');
    expect(updated!.avatarId).toBe('');
    expect(updated!.sparkLevel).toBe(0);
    expect(updated!.worldsVisited).toHaveLength(0);
    expect(updated!.guidesMetCount).toBe(0);
  });

  it('preserves id, parentAccountId, and createdAt on anonymisation', async () => {
    await invokeRoute(app, 'DELETE', '/v1/account', { token: 'kindler-abc', body: { confirm: true } });
    const updated = await repo.findById('kindler-abc');
    expect(updated!.id).toBe('kindler-abc');
    expect(updated!.parentAccountId).toBe('parent-xyz');
    expect(updated!.createdAt).toBe(1_700_000_000);
  });

  it('calls deleteSparkLogs and deleteSessions hooks', async () => {
    await invokeRoute(app, 'DELETE', '/v1/account', { token: 'kindler-abc', body: { confirm: true } });
    expect(deletedSparkLogs).toContain('kindler-abc');
    expect(deletedSessions).toContain('kindler-abc');
  });
});

// ─── Tests: POST /v1/auth/register — Age gate ────────────────────

describe('POST /v1/auth/register — age gate', () => {
  let app: MockApp;

  beforeEach(async () => {
    app = makeApp();
    const authPlugin = createAuthRoutes({
      nakamaHost: '127.0.0.1',
      nakamaPort: 7350,
      serverKey: 'testkey',
    });
    await authPlugin(app as unknown as import('@loom/selvage').FastifyAppLike);
  });

  it('rejects under-13 signup (ageTier 1) without parental consent token', async () => {
    const res = await invokeRoute(app, 'POST', '/v1/auth/register', {
      body: {
        username: 'littlekindler',
        email: 'test@example.com',
        password: 'password123',
        ageTier: 1,
      },
    });
    expect(res.statusCode).toBe(403);
    const body = res.body as { code: string; error: string };
    expect(body.code).toBe('parental_consent_required');
    expect(body.error).toContain('parental consent');
    expect(body.error).toContain('/v1/auth/parental-consent');
  });

  it('rejects under-13 signup (ageTier 2) without parental consent token', async () => {
    const res = await invokeRoute(app, 'POST', '/v1/auth/register', {
      body: {
        username: 'youngkindler',
        email: 'young@example.com',
        password: 'securepass',
        ageTier: 2,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects under-13 signup (ageTier 3) without parental consent token', async () => {
    const res = await invokeRoute(app, 'POST', '/v1/auth/register', {
      body: {
        username: 'kidkindler',
        email: 'kid@example.com',
        password: 'mypassword',
        ageTier: 3,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows under-13 signup when parentalConsentToken is provided', async () => {
    // This will attempt to contact Nakama which will fail in tests — we only care
    // that the age gate is NOT triggered (status should not be 403)
    const res = await invokeRoute(app, 'POST', '/v1/auth/register', {
      body: {
        username: 'consentedkindler',
        email: 'consented@example.com',
        password: 'password123',
        ageTier: 1,
        parentalConsentToken: 'valid-consent-token-xyz',
      },
    });
    // Not 403 — age gate passes; Nakama call will fail with 502 in test isolation
    expect(res.statusCode).not.toBe(403);
  });

  it('allows adult signup (no ageTier) to proceed past age gate', async () => {
    const res = await invokeRoute(app, 'POST', '/v1/auth/register', {
      body: {
        username: 'parentuser',
        email: 'parent@example.com',
        password: 'strongpassword',
        // no ageTier
      },
    });
    // Not 403 — age gate not triggered; Nakama call will fail with 502 in test isolation
    expect(res.statusCode).not.toBe(403);
  });

  it('returns 400 for invalid registration body (age gate not reached)', async () => {
    const res = await invokeRoute(app, 'POST', '/v1/auth/register', {
      body: { username: 'ab', email: 'bad', password: 'short', ageTier: 1 },
    });
    // Invalid input is caught before age gate — returns 400
    expect(res.statusCode).toBe(400);
  });
});
