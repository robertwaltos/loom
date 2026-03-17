/**
 * historian-api.ts ΓÇö Public read-only REST API for community historians.
 *
 * Provides authenticated, rate-limited, paginated access to the Concord
 * Archive for external researchers, historians, and community tools.
 *
 * Endpoints (all read-only, GET only):
 *   GET /v1/historian/chronicle          ΓÇö paginated chronicle search
 *   GET /v1/historian/chronicle/:id      ΓÇö single entry
 *   GET /v1/historian/worlds/:worldId    ΓÇö world timeline
 *   GET /v1/historian/dynasties/:id      ΓÇö dynasty chronicle history
 *   GET /v1/historian/timeline           ΓÇö Concord master timeline slice
 *   GET /v1/historian/lexicon            ΓÇö canonized terms & definitions
 *   GET /v1/historian/founding-wounds    ΓÇö founding wound hearings
 *
 * Authentication: API key in X-Historian-Key header.
 * Rate limit: 60 requests / minute per key (burst up to 10).
 * Pagination: cursor-based via `cursor` + `limit` (max 50) params.
 *
 * Thread: silk
 * Tier: 1
 */

// ΓöÇΓöÇΓöÇ API Key Tiers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type HistorianKeyTier = 'COMMUNITY' | 'SCHOLAR' | 'INSTITUTION' | 'INTERNAL';

export interface HistorianApiKey {
  readonly keyId: string;
  readonly hashedKey: string;
  readonly tier: HistorianKeyTier;
  readonly ownerName: string;
  readonly isRevoked: boolean;
  readonly requestsThisMinute: number;
  readonly lastResetAt: number;
}

// ΓöÇΓöÇΓöÇ Rate Limits per Tier ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const HISTORIAN_RATE_LIMITS: Record<HistorianKeyTier, number> = {
  COMMUNITY: 30,
  SCHOLAR: 60,
  INSTITUTION: 200,
  INTERNAL: 10000,
};

export const HISTORIAN_MAX_PAGE_SIZE = 50;
export const HISTORIAN_DEFAULT_PAGE_SIZE = 20;
export const HISTORIAN_FOUNDING_WOUNDS_REDACTION_YEAR = 40;

// ΓöÇΓöÇΓöÇ Shared Response Envelope ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HistorianPage<T> {
  readonly data: readonly T[];
  readonly cursor: string | null;
  readonly total: number;
  readonly limit: number;
  readonly apiVersion: 1;
}

export interface HistorianError {
  readonly code: HistorianErrorCode;
  readonly message: string;
  readonly requestId: string;
}

export type HistorianErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'REDACTED';

// ΓöÇΓöÇΓöÇ Chronicle Query ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ChronicleQueryParams {
  readonly keywords?: string;
  readonly worldId?: string;
  readonly dynastyId?: string;
  readonly inGameYearFrom?: number;
  readonly inGameYearTo?: number;
  readonly includeContested: boolean;
  readonly cursor?: string;
  readonly limit: number;
}

export interface ChroniclePublicEntry {
  readonly entryId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly fullText: string;
  readonly dynastyId: string | null;
  readonly worldIds: string[];
  readonly inGameYear: number;
  readonly isContested: boolean;
  readonly contestsEntryId: string | null;
  readonly wordCount: number;
  readonly createdAt: string;
}

// ΓöÇΓöÇΓöÇ World Timeline ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface WorldTimelineEntry {
  readonly entryId: string;
  readonly inGameYear: number;
  readonly eventType: 'SETTLEMENT' | 'ASSEMBLY' | 'WOUND' | 'CHRONICLE' | 'SURVEY' | 'CATASTROPHE';
  readonly title: string;
  readonly summary: string;
  readonly dynastyId: string | null;
}

export interface WorldTimelineResponse {
  readonly worldId: string;
  readonly worldName: string;
  readonly foundedInGameYear: number | null;
  readonly currentPopulationEstimate: number | null;
  readonly entries: readonly WorldTimelineEntry[];
  readonly totalEntries: number;
}

// ΓöÇΓöÇΓöÇ Dynasty Chronicle History ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DynastyChronicleEntry {
  readonly entryId: string;
  readonly title: string;
  readonly excerpt: string;
  readonly inGameYear: number;
  readonly worldIds: string[];
  readonly wordCount: number;
  readonly isContested: boolean;
}

export interface DynastyChronicleResponse {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly foundingYear: number;
  readonly homeWorldId: string;
  readonly chronicleDepthPercentile: number;
  readonly totalEntries: number;
  readonly entries: readonly DynastyChronicleEntry[];
}

// ΓöÇΓöÇΓöÇ Concord Master Timeline ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ConcordTimelineEvent {
  readonly eventId: string;
  readonly inGameYear: number;
  readonly category: 'FOUNDING' | 'EXPANSION' | 'WOUND' | 'GOVERNANCE' | 'SURVEY' | 'ASCENDANCY';
  readonly title: string;
  readonly summary: string;
  readonly affectedWorldIds: string[];
  readonly isFoundingWound: boolean;
}

// ΓöÇΓöÇΓöÇ Lexicon ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface LexiconEntry {
  readonly term: string;
  readonly definition: string;
  readonly category: 'GOVERNANCE' | 'ECONOMY' | 'LATTICE' | 'CHRONICLE' | 'FOUNDING' | 'GENERAL';
  readonly inUseFromYear: number;
  readonly relatedTerms: string[];
}

// ΓöÇΓöÇΓöÇ Founding Wound Summaries ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface FoundingWoundSummary {
  readonly woundId: string;
  readonly title: string;
  readonly summary: string;
  readonly worldId: string;
  readonly inGameYear: number;
  readonly resolutionStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'UNRESOLVABLE';
  readonly isRedacted: boolean;
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HistorianKeyStorePort {
  readonly findByHash: (hashedKey: string) => HistorianApiKey | undefined;
}

export interface HistorianChroniclePort {
  readonly search: (params: ChronicleQueryParams) => readonly ChroniclePublicEntry[];
  readonly getById: (entryId: string) => ChroniclePublicEntry | undefined;
}

export interface HistorianWorldPort {
  readonly getTimeline: (worldId: string) => WorldTimelineResponse | undefined;
}

export interface HistorianDynastyPort {
  readonly getChronicleHistory: (dynastyId: string) => DynastyChronicleResponse | undefined;
}

export interface HistorianTimelinePort {
  readonly getSlice: (from: number, to: number) => readonly ConcordTimelineEvent[];
}

export interface HistorianLexiconPort {
  readonly getAll: () => readonly LexiconEntry[];
}

export interface HistorianWoundsPort {
  readonly getSummaries: () => readonly FoundingWoundSummary[];
}

export interface HistorianIdPort {
  readonly next: () => string;
}

export interface HistorianClockPort {
  readonly nowMs: () => number;
}

// ΓöÇΓöÇΓöÇ Auth Helper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function hashApiKey(raw: string): string {
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) + h) ^ raw.charCodeAt(i);
    h = h >>> 0;
  }
  return `sha-${h.toString(16).padStart(8, '0')}`;
}

export function authenticateHistorianRequest(
  rawKey: string,
  store: HistorianKeyStorePort,
): HistorianApiKey | undefined {
  if (!rawKey || rawKey.trim().length === 0) return undefined;
  const hashed = hashApiKey(rawKey.trim());
  const record = store.findByHash(hashed);
  if (!record || record.isRevoked) return undefined;
  return record;
}

// ΓöÇΓöÇΓöÇ Rate Limiter ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
}

export function checkRateLimit(
  key: HistorianApiKey,
  clock: HistorianClockPort,
): RateLimitResult {
  const windowMs = 60_000;
  const nowMs = clock.nowMs();
  const windowExpired = nowMs - key.lastResetAt >= windowMs;
  const currentCount = windowExpired ? 0 : key.requestsThisMinute;
  const limit = HISTORIAN_RATE_LIMITS[key.tier];
  const allowed = currentCount < limit;
  return {
    allowed,
    remaining: Math.max(0, limit - currentCount - 1),
    resetAt: windowExpired ? nowMs + windowMs : key.lastResetAt + windowMs,
  };
}

// ΓöÇΓöÇΓöÇ Pagination ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString('base64');
}

export function decodeCursor(cursor: string): number {
  try {
    const val = parseInt(Buffer.from(cursor, 'base64').toString('utf-8'), 10);
    return isNaN(val) || val < 0 ? 0 : val;
  } catch {
    return 0;
  }
}

export function clampPageSize(limit: number): number {
  if (limit <= 0) return HISTORIAN_DEFAULT_PAGE_SIZE;
  return Math.min(limit, HISTORIAN_MAX_PAGE_SIZE);
}

// ΓöÇΓöÇΓöÇ Request Handlers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HistorianDeps {
  readonly keyStore: HistorianKeyStorePort;
  readonly chronicle: HistorianChroniclePort;
  readonly worlds: HistorianWorldPort;
  readonly dynasties: HistorianDynastyPort;
  readonly timeline: HistorianTimelinePort;
  readonly lexicon: HistorianLexiconPort;
  readonly wounds: HistorianWoundsPort;
  readonly ids: HistorianIdPort;
  readonly clock: HistorianClockPort;
}

export type HistorianResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: HistorianError };

function makeError(
  code: HistorianErrorCode,
  message: string,
  requestId: string,
): HistorianResult<never> {
  return { ok: false, error: { code, message, requestId } };
}

function authGuard(
  rawKey: string | undefined,
  deps: HistorianDeps,
  requestId: string,
): HistorianApiKey | HistorianResult<never> {
  if (!rawKey) return makeError('UNAUTHORIZED', 'X-Historian-Key header required.', requestId);
  const key = authenticateHistorianRequest(rawKey, deps.keyStore);
  if (!key) return makeError('UNAUTHORIZED', 'Invalid or revoked API key.', requestId);
  const rate = checkRateLimit(key, deps.clock);
  if (!rate.allowed) return makeError('RATE_LIMITED', 'Rate limit exceeded. Try again shortly.', requestId);
  return key;
}

function isApiKey(v: HistorianApiKey | HistorianResult<never>): v is HistorianApiKey {
  return !('ok' in v);
}

export function handleChronicleSearch(
  rawKey: string | undefined,
  params: ChronicleQueryParams,
  deps: HistorianDeps,
): HistorianResult<HistorianPage<ChroniclePublicEntry>> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  if (params.limit <= 0 || params.limit > HISTORIAN_MAX_PAGE_SIZE) {
    return makeError('BAD_REQUEST', `limit must be 1ΓÇô${HISTORIAN_MAX_PAGE_SIZE}.`, requestId);
  }

  const all = deps.chronicle.search(params);
  const offset = params.cursor ? decodeCursor(params.cursor) : 0;
  const page = all.slice(offset, offset + params.limit);
  const nextOffset = offset + params.limit;

  return {
    ok: true,
    value: {
      data: page,
      cursor: nextOffset < all.length ? encodeCursor(nextOffset) : null,
      total: all.length,
      limit: params.limit,
      apiVersion: 1,
    },
  };
}

export function handleGetChronicleEntry(
  rawKey: string | undefined,
  entryId: string,
  deps: HistorianDeps,
): HistorianResult<ChroniclePublicEntry> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  if (!entryId.trim()) {
    return makeError('BAD_REQUEST', 'entryId must not be empty.', requestId);
  }
  const entry = deps.chronicle.getById(entryId);
  if (!entry) return makeError('NOT_FOUND', `Chronicle entry ${entryId} not found.`, requestId);
  return { ok: true, value: entry };
}

export function handleWorldTimeline(
  rawKey: string | undefined,
  worldId: string,
  deps: HistorianDeps,
): HistorianResult<WorldTimelineResponse> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  if (!worldId.trim()) {
    return makeError('BAD_REQUEST', 'worldId must not be empty.', requestId);
  }
  const timeline = deps.worlds.getTimeline(worldId);
  if (!timeline) return makeError('NOT_FOUND', `World ${worldId} not found.`, requestId);
  return { ok: true, value: timeline };
}

export function handleDynastyChronicle(
  rawKey: string | undefined,
  dynastyId: string,
  deps: HistorianDeps,
): HistorianResult<DynastyChronicleResponse> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  if (!dynastyId.trim()) {
    return makeError('BAD_REQUEST', 'dynastyId must not be empty.', requestId);
  }
  const history = deps.dynasties.getChronicleHistory(dynastyId);
  if (!history) return makeError('NOT_FOUND', `Dynasty ${dynastyId} not found.`, requestId);
  return { ok: true, value: history };
}

export function handleMasterTimeline(
  rawKey: string | undefined,
  fromYear: number,
  toYear: number,
  deps: HistorianDeps,
): HistorianResult<HistorianPage<ConcordTimelineEvent>> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  if (fromYear > toYear) {
    return makeError('BAD_REQUEST', 'fromYear must be <= toYear.', requestId);
  }
  const events = deps.timeline.getSlice(fromYear, toYear);
  return {
    ok: true,
    value: {
      data: events,
      cursor: null,
      total: events.length,
      limit: events.length,
      apiVersion: 1,
    },
  };
}

export function handleLexicon(
  rawKey: string | undefined,
  deps: HistorianDeps,
): HistorianResult<HistorianPage<LexiconEntry>> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  const entries = deps.lexicon.getAll();
  return {
    ok: true,
    value: { data: entries, cursor: null, total: entries.length, limit: entries.length, apiVersion: 1 },
  };
}

export function handleFoundingWounds(
  rawKey: string | undefined,
  deps: HistorianDeps,
): HistorianResult<HistorianPage<FoundingWoundSummary>> {
  const requestId = deps.ids.next();
  const authResult = authGuard(rawKey, deps, requestId);
  if (!isApiKey(authResult)) return authResult as HistorianResult<never>;

  const summaries = deps.wounds.getSummaries();
  return {
    ok: true,
    value: { data: summaries, cursor: null, total: summaries.length, limit: summaries.length, apiVersion: 1 },
  };
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface HistorianApi {
  readonly searchChronicle: (key: string | undefined, params: ChronicleQueryParams) => HistorianResult<HistorianPage<ChroniclePublicEntry>>;
  readonly getChronicleEntry: (key: string | undefined, entryId: string) => HistorianResult<ChroniclePublicEntry>;
  readonly getWorldTimeline: (key: string | undefined, worldId: string) => HistorianResult<WorldTimelineResponse>;
  readonly getDynastyChronicle: (key: string | undefined, dynastyId: string) => HistorianResult<DynastyChronicleResponse>;
  readonly getMasterTimeline: (key: string | undefined, from: number, to: number) => HistorianResult<HistorianPage<ConcordTimelineEvent>>;
  readonly getLexicon: (key: string | undefined) => HistorianResult<HistorianPage<LexiconEntry>>;
  readonly getFoundingWounds: (key: string | undefined) => HistorianResult<HistorianPage<FoundingWoundSummary>>;
}

export function createHistorianApi(deps: HistorianDeps): HistorianApi {
  return {
    searchChronicle: (key, params) => handleChronicleSearch(key, params, deps),
    getChronicleEntry: (key, entryId) => handleGetChronicleEntry(key, entryId, deps),
    getWorldTimeline: (key, worldId) => handleWorldTimeline(key, worldId, deps),
    getDynastyChronicle: (key, dynastyId) => handleDynastyChronicle(key, dynastyId, deps),
    getMasterTimeline: (key, from, to) => handleMasterTimeline(key, from, to, deps),
    getLexicon: (key) => handleLexicon(key, deps),
    getFoundingWounds: (key) => handleFoundingWounds(key, deps),
  };
}
