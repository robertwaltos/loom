/**
 * request-router.ts — Route incoming API requests to fabric handlers.
 *
 * Registers route patterns with handlers, matches incoming request
 * paths against patterns (with parameter extraction), applies
 * middleware chains, and integrates with rate limiting through a port.
 *
 * "The Selvage directs each thread to its loom."
 */

// ── Ports ────────────────────────────────────────────────────────

interface RouterClock {
  readonly nowMicroseconds: () => number;
}

interface RequestRouterIdGenerator {
  readonly generate: () => string;
}

interface RouterLogPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
}

interface RateLimitCheckPort {
  readonly isAllowed: (clientId: string) => boolean;
}

interface RequestRouterDeps {
  readonly clock: RouterClock;
  readonly idGenerator: RequestRouterIdGenerator;
  readonly log: RouterLogPort;
  readonly rateLimit: RateLimitCheckPort;
}

// ── Types ────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RouteParams {
  readonly [key: string]: string;
}

interface RequestContext {
  readonly requestId: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly params: RouteParams;
  readonly clientId: string;
  readonly receivedAt: number;
  readonly values: Map<string, unknown>;
}

type MiddlewareResult =
  | { readonly proceed: true }
  | { readonly proceed: false; readonly reason: string };

type MiddlewareHandler = (ctx: RequestContext) => MiddlewareResult;

interface MiddlewareEntry {
  readonly name: string;
  readonly handler: MiddlewareHandler;
  readonly order: number;
  enabled: boolean;
}

type RouteHandler = (ctx: RequestContext) => RouteResponse;

interface RouteResponse {
  readonly status: number;
  readonly body: unknown;
}

interface RouteDefinition {
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly handler: RouteHandler;
  readonly description: string;
}

interface RegisterRouteParams {
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly handler: RouteHandler;
  readonly description: string;
}

interface AddMiddlewareParams {
  readonly name: string;
  readonly handler: MiddlewareHandler;
  readonly order: number;
}

interface IncomingRequest {
  readonly method: HttpMethod;
  readonly path: string;
  readonly clientId: string;
}

type RouteOutcome = 'handled' | 'not_found' | 'rate_limited' | 'middleware_rejected';

interface RouteResult {
  readonly outcome: RouteOutcome;
  readonly status: number;
  readonly body: unknown;
  readonly requestId: string;
  readonly durationMicro: number;
  readonly matchedPattern: string | undefined;
}

interface RequestRouterStats {
  readonly totalRoutes: number;
  readonly totalMiddleware: number;
  readonly totalRequests: number;
  readonly handledCount: number;
  readonly notFoundCount: number;
  readonly rateLimitedCount: number;
  readonly middlewareRejectedCount: number;
}

interface RequestRouter {
  readonly registerRoute: (params: RegisterRouteParams) => boolean;
  readonly removeRoute: (method: HttpMethod, pattern: string) => boolean;
  readonly addMiddleware: (params: AddMiddlewareParams) => boolean;
  readonly removeMiddleware: (name: string) => boolean;
  readonly enableMiddleware: (name: string) => boolean;
  readonly disableMiddleware: (name: string) => boolean;
  readonly handle: (request: IncomingRequest) => RouteResult;
  readonly listRoutes: () => readonly RouteDefinition[];
  readonly getStats: () => RequestRouterStats;
}

// ── State ────────────────────────────────────────────────────────

interface ParsedSegment {
  readonly isParam: boolean;
  readonly value: string;
}

interface CompiledRoute {
  readonly method: HttpMethod;
  readonly pattern: string;
  readonly segments: readonly ParsedSegment[];
  readonly handler: RouteHandler;
  readonly description: string;
}

interface RouterState {
  readonly deps: RequestRouterDeps;
  readonly routes: Map<string, CompiledRoute>;
  readonly middleware: Map<string, MiddlewareEntry>;
  totalRequests: number;
  handledCount: number;
  notFoundCount: number;
  rateLimitedCount: number;
  middlewareRejectedCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function routeKey(method: HttpMethod, pattern: string): string {
  return method + ':' + pattern;
}

function parseSegments(pattern: string): readonly ParsedSegment[] {
  const raw = pattern.split('/').filter((s) => s.length > 0);
  return raw.map((s) => {
    if (s.startsWith(':')) {
      return { isParam: true, value: s.substring(1) };
    }
    return { isParam: false, value: s };
  });
}

function matchPath(
  segments: readonly ParsedSegment[],
  pathParts: readonly string[],
): RouteParams | undefined {
  if (segments.length !== pathParts.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const part = pathParts[i];
    if (seg === undefined || part === undefined) return undefined;
    if (seg.isParam) {
      params[seg.value] = part;
    } else if (seg.value !== part) {
      return undefined;
    }
  }
  return params;
}

function splitPath(path: string): readonly string[] {
  return path.split('/').filter((s) => s.length > 0);
}

function getSortedMiddleware(state: RouterState): readonly MiddlewareEntry[] {
  const entries = [...state.middleware.values()];
  entries.sort((a, b) => a.order - b.order);
  return entries;
}

// ── Operations ───────────────────────────────────────────────────

function registerRouteImpl(state: RouterState, params: RegisterRouteParams): boolean {
  const key = routeKey(params.method, params.pattern);
  if (state.routes.has(key)) return false;
  const segments = parseSegments(params.pattern);
  state.routes.set(key, {
    method: params.method,
    pattern: params.pattern,
    segments,
    handler: params.handler,
    description: params.description,
  });
  return true;
}

function addMiddlewareImpl(state: RouterState, params: AddMiddlewareParams): boolean {
  if (state.middleware.has(params.name)) return false;
  state.middleware.set(params.name, {
    name: params.name,
    handler: params.handler,
    order: params.order,
    enabled: true,
  });
  return true;
}

function enableMiddlewareImpl(state: RouterState, name: string): boolean {
  const entry = state.middleware.get(name);
  if (!entry) return false;
  entry.enabled = true;
  return true;
}

function disableMiddlewareImpl(state: RouterState, name: string): boolean {
  const entry = state.middleware.get(name);
  if (!entry) return false;
  entry.enabled = false;
  return true;
}

function findRoute(
  state: RouterState,
  method: HttpMethod,
  pathParts: readonly string[],
): { route: CompiledRoute; params: RouteParams } | undefined {
  for (const route of state.routes.values()) {
    if (route.method !== method) continue;
    const params = matchPath(route.segments, pathParts);
    if (params !== undefined) return { route, params };
  }
  return undefined;
}

function runMiddleware(state: RouterState, ctx: RequestContext): MiddlewareResult {
  const sorted = getSortedMiddleware(state);
  for (const mw of sorted) {
    if (!mw.enabled) continue;
    const result = mw.handler(ctx);
    if (!result.proceed) return result;
  }
  return { proceed: true };
}

function handleImpl(state: RouterState, request: IncomingRequest): RouteResult {
  const start = state.deps.clock.nowMicroseconds();
  state.totalRequests += 1;
  const requestId = state.deps.idGenerator.generate();

  if (!state.deps.rateLimit.isAllowed(request.clientId)) {
    state.rateLimitedCount += 1;
    return buildResult(
      'rate_limited',
      429,
      { error: 'Rate limited' },
      requestId,
      start,
      state,
      undefined,
    );
  }

  const pathParts = splitPath(request.path);
  const match = findRoute(state, request.method, pathParts);

  if (!match) {
    state.notFoundCount += 1;
    return buildResult(
      'not_found',
      404,
      { error: 'Not found' },
      requestId,
      start,
      state,
      undefined,
    );
  }

  const ctx = buildContext(requestId, request, match.params, start);
  const mwResult = runMiddleware(state, ctx);

  if (!mwResult.proceed) {
    state.middlewareRejectedCount += 1;
    return buildResult(
      'middleware_rejected',
      403,
      { error: mwResult.reason },
      requestId,
      start,
      state,
      match.route.pattern,
    );
  }

  const response = match.route.handler(ctx);
  state.handledCount += 1;
  return buildResult(
    'handled',
    response.status,
    response.body,
    requestId,
    start,
    state,
    match.route.pattern,
  );
}

function buildContext(
  requestId: string,
  request: IncomingRequest,
  params: RouteParams,
  receivedAt: number,
): RequestContext {
  return {
    requestId,
    method: request.method,
    path: request.path,
    params,
    clientId: request.clientId,
    receivedAt,
    values: new Map(),
  };
}

function buildResult(
  outcome: RouteOutcome,
  status: number,
  body: unknown,
  requestId: string,
  startTime: number,
  state: RouterState,
  matchedPattern: string | undefined,
): RouteResult {
  return {
    outcome,
    status,
    body,
    requestId,
    durationMicro: state.deps.clock.nowMicroseconds() - startTime,
    matchedPattern,
  };
}

function listRoutesImpl(state: RouterState): readonly RouteDefinition[] {
  return [...state.routes.values()].map((r) => ({
    method: r.method,
    pattern: r.pattern,
    handler: r.handler,
    description: r.description,
  }));
}

function getStatsImpl(state: RouterState): RequestRouterStats {
  return {
    totalRoutes: state.routes.size,
    totalMiddleware: state.middleware.size,
    totalRequests: state.totalRequests,
    handledCount: state.handledCount,
    notFoundCount: state.notFoundCount,
    rateLimitedCount: state.rateLimitedCount,
    middlewareRejectedCount: state.middlewareRejectedCount,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createRequestRouter(deps: RequestRouterDeps): RequestRouter {
  const state: RouterState = {
    deps,
    routes: new Map(),
    middleware: new Map(),
    totalRequests: 0,
    handledCount: 0,
    notFoundCount: 0,
    rateLimitedCount: 0,
    middlewareRejectedCount: 0,
  };

  return {
    registerRoute: (p) => registerRouteImpl(state, p),
    removeRoute: (m, p) => state.routes.delete(routeKey(m, p)),
    addMiddleware: (p) => addMiddlewareImpl(state, p),
    removeMiddleware: (n) => state.middleware.delete(n),
    enableMiddleware: (n) => enableMiddlewareImpl(state, n),
    disableMiddleware: (n) => disableMiddlewareImpl(state, n),
    handle: (r) => handleImpl(state, r),
    listRoutes: () => listRoutesImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createRequestRouter };
export type {
  RequestRouter,
  RequestRouterDeps,
  RouterClock,
  RequestRouterIdGenerator,
  RouterLogPort,
  RateLimitCheckPort,
  HttpMethod,
  RouteParams,
  RequestContext,
  MiddlewareResult,
  MiddlewareHandler,
  RouteHandler,
  RouteResponse,
  RouteDefinition,
  RegisterRouteParams,
  AddMiddlewareParams,
  IncomingRequest,
  RouteOutcome,
  RouteResult,
  RequestRouterStats,
};
