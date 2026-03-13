/**
 * public-api.ts — Read-only REST API for community historians / researchers.
 *
 * NEXT-STEPS Phase 15.2: "Public API: read-only REST API for community
 * historians/researchers."
 *
 * Provides authenticated, rate-limited read-only access to:
 *   - Remembrance entries (search + single-entry lookup)
 *   - Dynasty genealogy trees
 *   - World history timelines
 *   - NPC biographies
 *
 * Authentication: bearer API key scoped to resource groups.
 * Rate limiting: enforced per key via `RateLimitPort`.
 *
 * Thread: cotton/archive/public-api
 * Tier: 2
 */

import type {
  RemembranceEntry,
  DynastyGenealogy,
  WorldTimeline,
  NpcBiography,
  SearchQuery,
  SearchResult,
} from './remembrance-system.js';

// ── Ports ────────────────────────────────────────────────────────────

export interface ArchiveReadPort {
  readonly getEntry: (id: string) => Promise<RemembranceEntry | undefined>;
  readonly searchEntries: (q: SearchQuery) => Promise<SearchResult>;
  readonly getGenealogy: (dynastyId: string) => Promise<DynastyGenealogy | undefined>;
  readonly getTimeline: (worldId: string) => Promise<WorldTimeline | undefined>;
  readonly getBiography: (npcId: string) => Promise<NpcBiography | undefined>;
}

export interface ApiKeyStorePort {
  readonly lookup: (rawKey: string) => Promise<ApiKey | undefined>;
}

export interface RateLimitPort {
  readonly check: (keyId: string) => RateLimitResult;
  readonly consume: (keyId: string) => void;
}

export interface PublicApiLogger {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ── Types ────────────────────────────────────────────────────────────

export type ApiKeyId = string;

export type ApiKeyScope =
  | 'entries:read'
  | 'dynasties:read'
  | 'timelines:read'
  | 'biographies:read';

export const ALL_SCOPES: readonly ApiKeyScope[] = [
  'entries:read',
  'dynasties:read',
  'timelines:read',
  'biographies:read',
];

export interface ApiKey {
  readonly keyId: ApiKeyId;
  readonly scopes: readonly ApiKeyScope[];
  readonly rateLimit: number;
  readonly enabled: boolean;
}

export type RateLimitResult = {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
};

export type ApiRequest = {
  readonly method: 'GET';
  readonly path: string;
  readonly pathParams: Record<string, string>;
  readonly queryParams: Record<string, string>;
  readonly authHeader: string | undefined;
};

export type ApiResponse<T> = {
  readonly status: number;
  readonly body: T;
};

export type ApiError = {
  readonly error: string;
  readonly code: string;
};

export interface PublicApiRouter {
  readonly handle: (req: ApiRequest) => Promise<ApiResponse<unknown>>;
  readonly getStats: () => PublicApiStats;
}

export type PublicApiStats = {
  readonly totalRequests: number;
  readonly authFailures: number;
  readonly rateLimitHits: number;
  readonly notFoundCount: number;
};

export type PublicApiDeps = {
  readonly archive: ArchiveReadPort;
  readonly keys: ApiKeyStorePort;
  readonly rateLimit: RateLimitPort;
  readonly log: PublicApiLogger;
};

export type PublicApiConfig = {
  readonly maxSearchLimit: number;
};

export const DEFAULT_PUBLIC_API_CONFIG: PublicApiConfig = Object.freeze({
  maxSearchLimit: 50,
});

// ── Auth helpers ─────────────────────────────────────────────────────

async function resolveKey(
  deps: PublicApiDeps,
  authHeader: string | undefined,
): Promise<ApiKey | undefined> {
  if (authHeader === undefined) return undefined;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (token === undefined || token.length === 0) return undefined;
  return deps.keys.lookup(token);
}

function hasScope(key: ApiKey, scope: ApiKeyScope): boolean {
  return key.scopes.includes(scope);
}

function errorResp(status: number, code: string, message: string): ApiResponse<ApiError> {
  return { status, body: { error: message, code } };
}

// ── Route handlers ───────────────────────────────────────────────────

async function handleGetEntry(
  deps: PublicApiDeps,
  key: ApiKey,
  params: Record<string, string>,
): Promise<ApiResponse<unknown>> {
  if (!hasScope(key, 'entries:read')) return errorResp(403, 'forbidden', 'Missing scope entries:read');
  const entry = await deps.archive.getEntry(params['id'] ?? '');
  if (entry === undefined) return errorResp(404, 'not-found', 'Entry not found');
  return { status: 200, body: entry };
}

async function handleSearch(
  cfg: PublicApiConfig,
  deps: PublicApiDeps,
  key: ApiKey,
  query: Record<string, string>,
): Promise<ApiResponse<unknown>> {
  if (!hasScope(key, 'entries:read')) return errorResp(403, 'forbidden', 'Missing scope entries:read');
  const rawLimit = Number(query['limit'] ?? cfg.maxSearchLimit);
  const limit = Math.min(rawLimit > 0 ? rawLimit : cfg.maxSearchLimit, cfg.maxSearchLimit);
  const sq: SearchQuery = {
    text: query['q'],
    category: query['category'] as SearchQuery['category'],
    dynastyId: query['dynastyId'],
    worldId: query['worldId'],
    limit,
  };
  return { status: 200, body: await deps.archive.searchEntries(sq) };
}

async function handleGetGenealogy(
  deps: PublicApiDeps,
  key: ApiKey,
  params: Record<string, string>,
): Promise<ApiResponse<unknown>> {
  if (!hasScope(key, 'dynasties:read')) return errorResp(403, 'forbidden', 'Missing scope dynasties:read');
  const genealogy = await deps.archive.getGenealogy(params['dynastyId'] ?? '');
  if (genealogy === undefined) return errorResp(404, 'not-found', 'Dynasty not found');
  return { status: 200, body: genealogy };
}

async function handleGetTimeline(
  deps: PublicApiDeps,
  key: ApiKey,
  params: Record<string, string>,
): Promise<ApiResponse<unknown>> {
  if (!hasScope(key, 'timelines:read')) return errorResp(403, 'forbidden', 'Missing scope timelines:read');
  const timeline = await deps.archive.getTimeline(params['worldId'] ?? '');
  if (timeline === undefined) return errorResp(404, 'not-found', 'Timeline not found');
  return { status: 200, body: timeline };
}

async function handleGetBiography(
  deps: PublicApiDeps,
  key: ApiKey,
  params: Record<string, string>,
): Promise<ApiResponse<unknown>> {
  if (!hasScope(key, 'biographies:read')) return errorResp(403, 'forbidden', 'Missing scope biographies:read');
  const bio = await deps.archive.getBiography(params['npcId'] ?? '');
  if (bio === undefined) return errorResp(404, 'not-found', 'Biography not found');
  return { status: 200, body: bio };
}

// ── Path matching ────────────────────────────────────────────────────

type RoutePattern = {
  readonly segments: readonly string[];
  readonly handler: (
    cfg: PublicApiConfig,
    deps: PublicApiDeps,
    key: ApiKey,
    params: Record<string, string>,
    query: Record<string, string>,
  ) => Promise<ApiResponse<unknown>>;
};

function matchRoute(
  patterns: readonly RoutePattern[],
  path: string,
): { pattern: RoutePattern; params: Record<string, string> } | undefined {
  const incoming = path.split('/').filter(Boolean);
  for (const pattern of patterns) {
    if (pattern.segments.length !== incoming.length) continue;
    const params: Record<string, string> = {};
    let match = true;
    for (let i = 0; i < pattern.segments.length; i++) {
      const seg = pattern.segments[i] ?? '';
      const inc = incoming[i] ?? '';
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = inc;
      } else if (seg !== inc) {
        match = false;
        break;
      }
    }
    if (match) return { pattern, params };
  }
  return undefined;
}

// ── Factory ──────────────────────────────────────────────────────────

const ROUTES: readonly RoutePattern[] = [
  {
    segments: ['v1', 'entries', ':id'],
    handler: (cfg, deps, key, params) => handleGetEntry(deps, key, params),
  },
  {
    segments: ['v1', 'entries'],
    handler: (cfg, deps, key, _params, query) => handleSearch(cfg, deps, key, query),
  },
  {
    segments: ['v1', 'dynasties', ':dynastyId', 'genealogy'],
    handler: (cfg, deps, key, params) => handleGetGenealogy(deps, key, params),
  },
  {
    segments: ['v1', 'worlds', ':worldId', 'timeline'],
    handler: (cfg, deps, key, params) => handleGetTimeline(deps, key, params),
  },
  {
    segments: ['v1', 'npcs', ':npcId', 'biography'],
    handler: (cfg, deps, key, params) => handleGetBiography(deps, key, params),
  },
];

type RouterState = {
  totalRequests: number;
  authFailures: number;
  rateLimitHits: number;
  notFoundCount: number;
};

async function dispatchRequest(
  state: RouterState,
  deps: PublicApiDeps,
  cfg: PublicApiConfig,
  req: ApiRequest,
): Promise<ApiResponse<unknown>> {
  state.totalRequests++;
  const key = await resolveKey(deps, req.authHeader);
  if (key === undefined || !key.enabled) {
    state.authFailures++;
    return errorResp(401, 'unauthorized', 'Invalid or missing API key');
  }
  const rl = deps.rateLimit.check(key.keyId);
  if (!rl.allowed) {
    state.rateLimitHits++;
    deps.log.warn('rate-limited', { keyId: key.keyId });
    return errorResp(429, 'rate-limited', 'Rate limit exceeded');
  }
  deps.rateLimit.consume(key.keyId);
  const match = matchRoute(ROUTES, req.path);
  if (match === undefined) {
    state.notFoundCount++;
    return errorResp(404, 'not-found', 'Unknown route');
  }
  return match.pattern.handler(cfg, deps, key, match.params, req.queryParams);
}

export function createPublicApiRouter(
  deps: PublicApiDeps,
  cfg: PublicApiConfig = DEFAULT_PUBLIC_API_CONFIG,
): PublicApiRouter {
  const state: RouterState = { totalRequests: 0, authFailures: 0, rateLimitHits: 0, notFoundCount: 0 };
  return {
    handle: (req) => dispatchRequest(state, deps, cfg, req),
    getStats: () => Object.freeze({ ...state }),
  };
}
