/**
 * Mini-Games Routes — World-specific educational mini-game registry.
 *
 * GET /v1/mini-games              — List all 50 mini-games (optional ?realm= filter)
 * GET /v1/mini-games/realm/:realm — Mini-games for a specific realm
 * GET /v1/mini-games/:worldId     — Mini-games for a specific world
 *
 * All 50 worlds have exactly one signature mini-game.
 * Games contribute to world luminance and Spark on completion.
 *
 * Thread: silk/mini-games
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  MiniGameDefinition,
  MiniGamesPort,
  Realm,
} from '../../fabrics/loom-core/src/mini-games-registry.js';

// ─── Response shapes ───────────────────────────────────────────────

interface MiniGameSummary {
  readonly gameId: string;
  readonly worldId: string;
  readonly name: string;
  readonly mechanic: string;
  readonly learningObjective: string;
  readonly realm: Realm;
  readonly maxDifficulty: number;
}

interface MiniGamesListResponse {
  readonly ok: true;
  readonly games: readonly MiniGameSummary[];
  readonly total: number;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

const VALID_REALMS: ReadonlySet<string> = new Set<Realm>([
  'stem', 'language-arts', 'financial-literacy', 'crossroads',
]);

function toSummary(g: MiniGameDefinition): MiniGameSummary {
  return {
    gameId: g.gameId,
    worldId: g.worldId,
    name: g.name,
    mechanic: g.mechanic,
    learningObjective: g.learningObjective,
    realm: g.realm,
    maxDifficulty: g.maxDifficulty,
  };
}

// ─── Deps ─────────────────────────────────────────────────────────

export interface MiniGamesRoutesDeps {
  readonly registry: MiniGamesPort;
}

// ─── Route Registration ───────────────────────────────────────────

export function registerMiniGamesRoutes(app: FastifyAppLike, deps: MiniGamesRoutesDeps): void {
  const { registry } = deps;

  // Register /realm/:realm BEFORE /:worldId to avoid route conflict
  // GET /v1/mini-games/realm/:realm — mini-games for a realm
  app.get('/v1/mini-games/realm/:realm', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const realm = typeof params['realm'] === 'string' ? params['realm'] : null;
    if (realm === null || !VALID_REALMS.has(realm)) {
      const err: ErrorResponse = { ok: false, error: 'Invalid realm', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const games = registry.getGamesByRealm(realm as Realm);
    const res: MiniGamesListResponse = { ok: true, games: games.map(toSummary), total: games.length };
    return reply.send(res);
  });

  // GET /v1/mini-games — list all (optional ?realm= filter)
  app.get('/v1/mini-games', (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const realmFilter = typeof query['realm'] === 'string' ? query['realm'] : null;

    let games: ReadonlyArray<MiniGameDefinition>;
    if (realmFilter !== null) {
      if (!VALID_REALMS.has(realmFilter)) {
        const err: ErrorResponse = { ok: false, error: 'Invalid realm filter', code: 'INVALID_INPUT' };
        return reply.code(400).send(err);
      }
      games = registry.getGamesByRealm(realmFilter as Realm);
    } else {
      games = registry.getAllGames();
    }

    const res: MiniGamesListResponse = { ok: true, games: games.map(toSummary), total: games.length };
    return reply.send(res);
  });

  // GET /v1/mini-games/:worldId — mini-games for a world
  app.get('/v1/mini-games/:worldId', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null || worldId.length === 0) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const games = registry.getGamesByWorld(worldId);
    const res: MiniGamesListResponse = { ok: true, games: games.map(toSummary), total: games.length };
    return reply.send(res);
  });
}
