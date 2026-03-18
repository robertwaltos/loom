/**
 * Parent Dashboard — HTTP Routes
 *
 * Wraps universe/parent-dashboard/engine.ts behind Fastify HTTP endpoints.
 *
 * COPPA INVARIANTS enforced here:
 * - Parent identity comes from auth token (X-Parent-Id header in dev; JWT in prod)
 * - No child PII is logged (only kindlerId, never displayName in logs)
 * - All AI transcript content is blocked at the engine layer
 *
 * TODO (production): Replace X-Parent-Id header with verified JWT sub claim.
 */

import type { FastifyAppLike } from '@loom/selvage';
import {
  createDashboardEngine,
  type DashboardDeps,
  type DashboardQueries,
  type ChildDetailData,
} from '../../universe/parent-dashboard/engine.js';
import type {
  AddChildRequest,
  ApiErrorCode,
  ChildSummary,
  ConsentMethod,
  SessionSummaryPublic,
  SubscriptionStatus,
  TimeControlsUpdateRequest,
  WorldMapEntry,
} from '../../universe/parent-dashboard/api.js';
import type { PgParentRepository } from '../../universe/parent-dashboard/pg-parent-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface ParentDashboardRoutesDeps {
  readonly generateId: () => string;
  readonly now: () => number;
  readonly log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  /** Optional real queries adapter. Falls back to mock (no-op) if omitted. */
  readonly queries?: DashboardQueries;
  /** Optional parent account write repo. Parent CRUD routes return 503 if omitted. */
  readonly pgParentRepo?: PgParentRepository;
}

// ─── Mock Queries (dev / no-DB fallback) ──────────────────────────

function createMockDashboardQueries(): DashboardQueries {
  return {
    getParentSubscription: async (_parentId) =>
      ({ status: 'trial' }),
    getChildrenForParent: async (_parentId): Promise<readonly ChildSummary[]> =>
      [],
    getChildDetail: async (_parentId, _kindlerId): Promise<ChildDetailData | null> =>
      null,
    getSessionHistory: async (_kindlerId, _pageSize, _cursor) =>
      ({ sessions: [] as readonly SessionSummaryPublic[], total: 0 }),
    getWorldsMap: async (_kindlerId): Promise<readonly WorldMapEntry[]> =>
      [],
    getProgressReport: async (_kindlerId, _fromEpoch, _toEpoch) =>
      null,
    updateTimeControls: async (_parentId, _kindlerId, _controls) =>
      false,
    createChild: async (_parentId, _req, _kindlerId, _createdAt) =>
      true,
    deleteChild: async (_parentId, _kindlerId) =>
      false,
    isChildOwnedByParent: async (_parentId, _kindlerId) =>
      false,
  };
}

// ─── Parent ID extraction ──────────────────────────────────────────

function extractParentId(req: unknown): string | null {
  const r = req as { headers?: Record<string, string | string[] | undefined> };
  const raw = r.headers?.['x-parent-id'];
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return null;
}

// ─── HTTP Status from error code ──────────────────────────────────

function statusFromCode(code: ApiErrorCode): number {
  switch (code) {
    case 'UNAUTHORIZED': return 401;
    case 'FORBIDDEN':    return 403;
    case 'NOT_FOUND':    return 404;
    case 'VALIDATION_ERROR': return 422;
    case 'RATE_LIMITED': return 429;
    case 'INTERNAL_ERROR': return 500;
  }
}

// ─── Route Registration ────────────────────────────────────────────

export function registerParentDashboardRoutes(
  app: FastifyAppLike,
  deps: ParentDashboardRoutesDeps,
): void {
  const engineDeps: DashboardDeps = {
    generateId: deps.generateId,
    now: deps.now,
    log: deps.log,
  };

  const queries = deps.queries ?? createMockDashboardQueries();
  const engine = createDashboardEngine(engineDeps, queries);
  const pgParentRepo = deps.pgParentRepo;

  // ─── Parent Account Routes ──────────────────────────────────────

  // POST /v1/dashboard/parent — register / create parent account
  app.post('/v1/dashboard/parent', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });
    if (pgParentRepo === undefined) return reply.status(503).send({ ok: false, error: 'Parent accounts unavailable' });

    try {
      const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
      const rawTc = typeof body['timeControls'] === 'object' && body['timeControls'] !== null
        ? (body['timeControls'] as Record<string, unknown>)
        : {};
      const tc = {
        ...(typeof rawTc['maxDailyMinutes'] === 'number' ? { maxDailyMinutes: rawTc['maxDailyMinutes'] } : {}),
        ...(typeof rawTc['bedtimeCutoff'] === 'string' ? { bedtimeCutoff: rawTc['bedtimeCutoff'] } : {}),
        ...(typeof rawTc['notificationsEnabled'] === 'boolean' ? { notificationsEnabled: rawTc['notificationsEnabled'] } : {}),
      };
      const account = await pgParentRepo.create(parentId, tc);
      return reply.status(201).send({ ok: true, account });
    } catch (err) {
      deps.log('error', 'parent:create_failed', { parentId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to create parent account' });
    }
  });

  // GET /v1/dashboard/parent — get own parent account
  app.get('/v1/dashboard/parent', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });
    if (pgParentRepo === undefined) return reply.status(503).send({ ok: false, error: 'Parent accounts unavailable' });

    try {
      const account = await pgParentRepo.findById(parentId);
      if (account === null) return reply.status(404).send({ ok: false, error: 'Account not found' });
      return reply.send({ ok: true, account });
    } catch (err) {
      deps.log('error', 'parent:get_failed', { parentId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to load parent account' });
    }
  });

  // PATCH /v1/dashboard/parent/consent — verify COPPA consent
  // Body: { method: ConsentMethod }
  app.patch('/v1/dashboard/parent/consent', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });
    if (pgParentRepo === undefined) return reply.status(503).send({ ok: false, error: 'Parent accounts unavailable' });

    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
    const method = typeof body['method'] === 'string' ? (body['method'] as ConsentMethod) : null;
    const VALID_METHODS: ConsentMethod[] = [
      'credit_card_micro', 'email_plus1', 'phone_verification', 'manual_review',
    ];
    if (method === null || !VALID_METHODS.includes(method)) {
      return reply.status(422).send({ ok: false, error: 'Invalid consent method' });
    }

    try {
      const updated = await pgParentRepo.updateConsent(parentId, method, deps.now());
      if (!updated) return reply.status(404).send({ ok: false, error: 'Account not found' });
      deps.log('info', 'parent:consent_verified', { parentId, method });
      return reply.send({ ok: true });
    } catch (err) {
      deps.log('error', 'parent:consent_failed', { parentId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to update consent' });
    }
  });

  // PATCH /v1/dashboard/parent/subscription — update subscription status
  // Body: { status: SubscriptionStatus }
  app.patch('/v1/dashboard/parent/subscription', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });
    if (pgParentRepo === undefined) return reply.status(503).send({ ok: false, error: 'Parent accounts unavailable' });

    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
    const status = typeof body['status'] === 'string' ? (body['status'] as SubscriptionStatus) : null;
    const VALID_STATUSES: SubscriptionStatus[] = ['trial', 'active', 'cancelled', 'expired'];
    if (status === null || !VALID_STATUSES.includes(status)) {
      return reply.status(422).send({ ok: false, error: 'Invalid subscription status' });
    }

    try {
      const updated = await pgParentRepo.updateSubscriptionStatus(parentId, status);
      if (!updated) return reply.status(404).send({ ok: false, error: 'Account not found' });
      return reply.send({ ok: true, status });
    } catch (err) {
      deps.log('error', 'parent:subscription_failed', { parentId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to update subscription' });
    }
  });

  // ─── Dashboard Routes ───────────────────────────────────────────

  // GET /v1/dashboard — parent overview
  app.get('/v1/dashboard', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const result = await engine.getOverview(parentId);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });

  // GET /v1/dashboard/child/:kindlerId — child detail
  app.get('/v1/dashboard/child/:kindlerId', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) return reply.status(422).send({ ok: false, error: 'Invalid kindlerId' });

    const result = await engine.getChildDetail(parentId, kindlerId);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });

  // GET /v1/dashboard/child/:kindlerId/sessions — session history
  app.get('/v1/dashboard/child/:kindlerId/sessions', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) return reply.status(422).send({ ok: false, error: 'Invalid kindlerId' });

    const rawPageSize = query['pageSize'];
    const pageSize = typeof rawPageSize === 'string' ? parseInt(rawPageSize, 10) : 20;
    const cursor = typeof query['cursor'] === 'string' ? query['cursor'] : null;

    const result = await engine.getSessionHistory(parentId, { kindlerId, pageSize, cursor });
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });

  // GET /v1/dashboard/child/:kindlerId/worlds-map
  app.get('/v1/dashboard/child/:kindlerId/worlds-map', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) return reply.status(422).send({ ok: false, error: 'Invalid kindlerId' });

    const result = await engine.getWorldsMap(parentId, kindlerId);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });

  // GET /v1/dashboard/child/:kindlerId/report?from=<epoch>&to=<epoch>
  app.get('/v1/dashboard/child/:kindlerId/report', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) return reply.status(422).send({ ok: false, error: 'Invalid kindlerId' });

    const fromEpoch = typeof query['from'] === 'string' ? parseInt(query['from'], 10) : NaN;
    const toEpoch = typeof query['to'] === 'string' ? parseInt(query['to'], 10) : NaN;
    if (isNaN(fromEpoch) || isNaN(toEpoch)) {
      return reply.status(422).send({ ok: false, error: '?from and ?to epoch ms are required' });
    }

    const result = await engine.getProgressReport(parentId, kindlerId, fromEpoch, toEpoch);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });

  // PATCH /v1/dashboard/child/:kindlerId/time-controls
  app.patch('/v1/dashboard/child/:kindlerId/time-controls', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) return reply.status(422).send({ ok: false, error: 'Invalid kindlerId' });

    const body = (req as unknown as { body: unknown }).body as TimeControlsUpdateRequest;
    if (!body || typeof body !== 'object') {
      return reply.status(422).send({ ok: false, error: 'Request body required' });
    }

    const result = await engine.updateTimeControls(parentId, kindlerId, body);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });

  // POST /v1/dashboard/child — add child profile
  app.post('/v1/dashboard/child', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const body = (req as unknown as { body: unknown }).body as AddChildRequest;
    if (!body || typeof body !== 'object') {
      return reply.status(422).send({ ok: false, error: 'Request body required' });
    }

    const result = await engine.addChild(parentId, body);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.status(201).send(result);
  });

  // DELETE /v1/dashboard/child/:kindlerId
  app.delete('/v1/dashboard/child/:kindlerId', async (req, reply) => {
    const parentId = extractParentId(req);
    if (parentId === null) return reply.status(401).send({ ok: false, error: 'Missing X-Parent-Id' });

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) return reply.status(422).send({ ok: false, error: 'Invalid kindlerId' });

    const result = await engine.removeChild(parentId, kindlerId);
    if (!result.ok) return reply.status(statusFromCode(result.code)).send(result);
    return reply.send(result);
  });
}
