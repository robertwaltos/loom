/**
 * http-router.ts — Route incoming API requests to handler functions.
 *
 * Registers handlers and route patterns (with path param extraction),
 * matches requests using exact-first then param-segment logic,
 * tracks hit counts and method-level statistics.
 *
 * "Every request finds its thread; every thread finds its weave."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type RouteId = string;
export type HandlerId = string;

export type RouterError =
  | 'route-not-found'
  | 'handler-not-found'
  | 'already-registered'
  | 'invalid-path'
  | 'method-not-allowed';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Route = {
  readonly routeId: RouteId;
  readonly method: HttpMethod;
  readonly path: string;
  readonly handlerId: HandlerId;
  readonly middlewareIds: ReadonlyArray<string>;
  readonly createdAt: bigint;
  hitCount: number;
};

export type RouteMatch = {
  readonly route: Route;
  readonly pathParams: Record<string, string>;
};

export type RouterStats = {
  readonly totalRoutes: number;
  readonly totalHits: number;
  readonly byMethod: Record<HttpMethod, number>;
};

// ============================================================================
// STATE
// ============================================================================

type ParsedSegment = { isParam: boolean; value: string };

type MutableRoute = {
  routeId: RouteId;
  method: HttpMethod;
  path: string;
  handlerId: HandlerId;
  middlewareIds: ReadonlyArray<string>;
  createdAt: bigint;
  hitCount: number;
  segments: ParsedSegment[];
};

export type HttpRouterState = {
  readonly deps: { clock: Clock; idGen: IdGenerator; logger: Logger };
  readonly handlers: Map<HandlerId, string>;
  readonly routes: Map<RouteId, MutableRoute>;
  readonly routeKeyIndex: Map<string, RouteId>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createHttpRouterState(deps: {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}): HttpRouterState {
  return { deps, handlers: new Map(), routes: new Map(), routeKeyIndex: new Map() };
}

// ============================================================================
// HANDLER MANAGEMENT
// ============================================================================

export function registerHandler(
  state: HttpRouterState,
  handlerId: HandlerId,
  description: string,
): { success: true } | { success: false; error: RouterError } {
  if (state.handlers.has(handlerId)) return { success: false, error: 'already-registered' };
  state.handlers.set(handlerId, description);
  return { success: true };
}

// ============================================================================
// ROUTE MANAGEMENT
// ============================================================================

export function addRoute(
  state: HttpRouterState,
  method: HttpMethod,
  path: string,
  handlerId: HandlerId,
  middlewareIds: ReadonlyArray<string> = [],
): Route | RouterError {
  if (!path.startsWith('/')) return 'invalid-path';
  if (!state.handlers.has(handlerId)) return 'handler-not-found';
  const key = method + ':' + path;
  if (state.routeKeyIndex.has(key)) return 'already-registered';
  const routeId = state.deps.idGen.generate();
  const route: MutableRoute = {
    routeId,
    method,
    path,
    handlerId,
    middlewareIds,
    createdAt: state.deps.clock.now(),
    hitCount: 0,
    segments: parseSegments(path),
  };
  state.routes.set(routeId, route);
  state.routeKeyIndex.set(key, routeId);
  state.deps.logger.info('Route added: ' + method + ' ' + path);
  return toRoute(route);
}

export function removeRoute(
  state: HttpRouterState,
  routeId: RouteId,
): { success: true } | { success: false; error: RouterError } {
  const route = state.routes.get(routeId);
  if (route === undefined) return { success: false, error: 'route-not-found' };
  state.routes.delete(routeId);
  state.routeKeyIndex.delete(route.method + ':' + route.path);
  return { success: true };
}

export function addMiddleware(
  state: HttpRouterState,
  routeId: RouteId,
  middlewareId: string,
): { success: true } | { success: false; error: RouterError } {
  const route = state.routes.get(routeId);
  if (route === undefined) return { success: false, error: 'route-not-found' };
  route.middlewareIds = [...route.middlewareIds, middlewareId];
  return { success: true };
}

export function getRoute(state: HttpRouterState, routeId: RouteId): Route | undefined {
  const r = state.routes.get(routeId);
  return r === undefined ? undefined : toRoute(r);
}

export function listRoutes(state: HttpRouterState, method?: HttpMethod): ReadonlyArray<Route> {
  const all = [...state.routes.values()];
  const filtered = method === undefined ? all : all.filter((r) => r.method === method);
  return filtered.map(toRoute);
}

// ============================================================================
// ROUTE MATCHING
// ============================================================================

export function matchRoute(
  state: HttpRouterState,
  method: HttpMethod,
  requestPath: string,
): RouteMatch | RouterError {
  const pathParts = splitPath(requestPath);

  const exactKey = method + ':' + requestPath;
  const exactId = state.routeKeyIndex.get(exactKey);
  if (exactId !== undefined) {
    const route = state.routes.get(exactId);
    if (route !== undefined) {
      route.hitCount++;
      return { route: toRoute(route), pathParams: {} };
    }
  }

  let methodExists = false;
  for (const route of state.routes.values()) {
    if (route.method === method) methodExists = true;
    if (route.method !== method) continue;
    const params = matchSegments(route.segments, pathParts);
    if (params !== undefined) {
      route.hitCount++;
      return { route: toRoute(route), pathParams: params };
    }
  }

  if (hasMatchingPath(state, requestPath)) return 'method-not-allowed';
  if (methodExists || !hasAnyRoutes(state)) return 'route-not-found';
  return 'route-not-found';
}

function hasMatchingPath(state: HttpRouterState, requestPath: string): boolean {
  const pathParts = splitPath(requestPath);
  for (const route of state.routes.values()) {
    const params = matchSegments(route.segments, pathParts);
    if (params !== undefined) return true;
  }
  return false;
}

function hasAnyRoutes(state: HttpRouterState): boolean {
  return state.routes.size > 0;
}

// ============================================================================
// STATS
// ============================================================================

export function getStats(state: HttpRouterState): RouterStats {
  const byMethod: Record<HttpMethod, number> = {
    GET: 0,
    POST: 0,
    PUT: 0,
    DELETE: 0,
    PATCH: 0,
  };
  let totalHits = 0;
  for (const route of state.routes.values()) {
    byMethod[route.method] += route.hitCount;
    totalHits += route.hitCount;
  }
  return { totalRoutes: state.routes.size, totalHits, byMethod };
}

// ============================================================================
// HELPERS
// ============================================================================

function parseSegments(path: string): ParsedSegment[] {
  return path
    .split('/')
    .filter((s) => s.length > 0)
    .map((s) => ({
      isParam: s.startsWith(':'),
      value: s.startsWith(':') ? s.slice(1) : s,
    }));
}

function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

function matchSegments(
  segments: ParsedSegment[],
  parts: string[],
): Record<string, string> | undefined {
  if (segments.length !== parts.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const part = parts[i];
    if (seg === undefined || part === undefined) return undefined;
    if (seg.isParam) {
      params[seg.value] = part;
    } else if (seg.value !== part) {
      return undefined;
    }
  }
  return params;
}

function toRoute(r: MutableRoute): Route {
  return {
    routeId: r.routeId,
    method: r.method,
    path: r.path,
    handlerId: r.handlerId,
    middlewareIds: r.middlewareIds,
    createdAt: r.createdAt,
    hitCount: r.hitCount,
  };
}
