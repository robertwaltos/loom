/**
 * Threadway Routes — Inter-world conceptual connections.
 *
 * GET /v1/threadways                  — All threadway definitions
 * GET /v1/threadways/:threadwayId     — Single threadway
 * GET /v1/threadways/world/:worldId   — Threadways for a specific world
 * GET /v1/threadways/realm/:realm     — Threadways for a realm
 * GET /v1/threadways/tier/:tier       — Threadways by discovery tier (1|2|3)
 *
 * Read-only. Definitions are in-memory (fabrics/loom-core/src/threadway-network.ts).
 * Discovery state is tracked client-side; threadways only expose the connection graph.
 *
 * Thread: silk/threadway-api
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  ThreadwayNetworkPort,
  ThreadwayDefinition,
  DiscoveryTier,
  Realm,
} from '../../fabrics/loom-core/src/threadway-network.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface ThreadwayRoutesDeps {
  readonly network: ThreadwayNetworkPort;
}

// ─── Response shapes ──────────────────────────────────────────────

interface ThreadwaySummary {
  readonly threadwayId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly conceptLink: string;
  readonly tier: DiscoveryTier;
  readonly realm: Realm;
  readonly transition: {
    readonly visualDescription: string;
    readonly audioTransition: string;
  };
}

interface ThreadwayListResponse {
  readonly ok: true;
  readonly threadways: readonly ThreadwaySummary[];
  readonly total: number;
}

interface ThreadwayDetailResponse {
  readonly ok: true;
  readonly threadway: ThreadwaySummary;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function toSummary(t: ThreadwayDefinition): ThreadwaySummary {
  return {
    threadwayId: t.threadwayId,
    fromWorldId: t.fromWorldId,
    toWorldId: t.toWorldId,
    conceptLink: t.conceptLink,
    tier: t.tier,
    realm: t.realm,
    transition: {
      visualDescription: t.transition.visualDescription,
      audioTransition: t.transition.audioTransition,
    },
  };
}

const VALID_REALMS = new Set<string>(['stem', 'language-arts', 'financial-literacy', 'crossroads', 'hub']);
const VALID_TIERS = new Set<number>([1, 2, 3]);

// ─── Route Registration ────────────────────────────────────────────

export function registerThreadwayRoutes(app: FastifyAppLike, deps: ThreadwayRoutesDeps): void {
  const { network } = deps;

  // GET /v1/threadways/world/:worldId — must register specific paths before /:threadwayId
  app.get('/v1/threadways/world/:worldId', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const all = network.getAllThreadways();
    const threadways = all.filter(t => t.fromWorldId === worldId || t.toWorldId === worldId);
    const res: ThreadwayListResponse = { ok: true, threadways: threadways.map(toSummary), total: threadways.length };
    return reply.send(res);
  });

  // GET /v1/threadways/realm/:realm
  app.get('/v1/threadways/realm/:realm', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const realm = typeof params['realm'] === 'string' ? params['realm'] : null;
    if (realm === null || !VALID_REALMS.has(realm)) {
      const err: ErrorResponse = { ok: false, error: 'Invalid realm', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const threadways = network.getThreadwaysByRealm(realm as Realm);
    const res: ThreadwayListResponse = { ok: true, threadways: threadways.map(toSummary), total: threadways.length };
    return reply.send(res);
  });

  // GET /v1/threadways/tier/:tier
  app.get('/v1/threadways/tier/:tier', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const rawTier = typeof params['tier'] === 'string' ? parseInt(params['tier'], 10) : null;
    if (rawTier === null || !VALID_TIERS.has(rawTier)) {
      const err: ErrorResponse = { ok: false, error: 'tier must be 1, 2, or 3', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const threadways = network.getThreadwaysByTier(rawTier as DiscoveryTier);
    const res: ThreadwayListResponse = { ok: true, threadways: threadways.map(toSummary), total: threadways.length };
    return reply.send(res);
  });

  // GET /v1/threadways — list all
  app.get('/v1/threadways', (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const realmFilter = typeof query['realm'] === 'string' ? query['realm'] : null;
    const rawTierFilter = typeof query['tier'] === 'string' ? parseInt(query['tier'], 10) : null;

    let threadways = network.getAllThreadways();
    if (realmFilter !== null && VALID_REALMS.has(realmFilter)) {
      threadways = network.getThreadwaysByRealm(realmFilter as Realm);
    }
    if (rawTierFilter !== null && VALID_TIERS.has(rawTierFilter)) {
      threadways = threadways.filter(t => t.tier === (rawTierFilter as DiscoveryTier));
    }

    const res: ThreadwayListResponse = { ok: true, threadways: threadways.map(toSummary), total: threadways.length };
    return reply.send(res);
  });

  // GET /v1/threadways/:threadwayId
  app.get('/v1/threadways/:threadwayId', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const threadwayId = typeof params['threadwayId'] === 'string' ? params['threadwayId'] : null;
    if (threadwayId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid threadwayId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const t = network.getThreadwayById(threadwayId);
    if (t === undefined) {
      const err: ErrorResponse = { ok: false, error: `Threadway '${threadwayId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    const res: ThreadwayDetailResponse = { ok: true, threadway: toSummary(t) };
    return reply.send(res);
  });
}
