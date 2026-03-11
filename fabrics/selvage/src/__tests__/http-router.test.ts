import { describe, it, expect, beforeEach } from 'vitest';
import type { HttpRouterState, Clock, IdGenerator, Logger } from '../http-router.js';
import {
  createHttpRouterState,
  registerHandler,
  addRoute,
  removeRoute,
  matchRoute,
  addMiddleware,
  getRoute,
  listRoutes,
  getStats,
} from '../http-router.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(): Clock {
  let t = 1_000_000n;
  return {
    now: () => {
      t += 1000n;
      return t;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return { generate: () => 'id-' + String(++n) };
}

function makeLogger(): Logger {
  return { info: () => undefined, warn: () => undefined };
}

function makeDeps() {
  return { clock: makeClock(), idGen: makeIdGen(), logger: makeLogger() };
}

function setup(): HttpRouterState {
  const state = createHttpRouterState(makeDeps());
  registerHandler(state, 'handler-users', 'Users handler');
  registerHandler(state, 'handler-items', 'Items handler');
  return state;
}

// ============================================================================
// HANDLER REGISTRATION
// ============================================================================

describe('HttpRouter — handler registration', () => {
  let state: HttpRouterState;
  beforeEach(() => {
    state = createHttpRouterState(makeDeps());
  });

  it('registers a handler', () => {
    const result = registerHandler(state, 'h1', 'Handler 1');
    expect(result).toEqual({ success: true });
  });

  it('rejects duplicate handler id', () => {
    registerHandler(state, 'h1', 'Handler 1');
    expect(registerHandler(state, 'h1', 'Dup')).toEqual({
      success: false,
      error: 'already-registered',
    });
  });
});

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

describe('HttpRouter — route registration', () => {
  let state: HttpRouterState;
  beforeEach(() => {
    state = setup();
  });

  it('adds a route', () => {
    const result = addRoute(state, 'GET', '/users', 'handler-users');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.method).toBe('GET');
      expect(result.path).toBe('/users');
    }
  });

  it('rejects path not starting with /', () => {
    const result = addRoute(state, 'GET', 'users', 'handler-users');
    expect(result).toBe('invalid-path');
  });

  it('rejects unknown handlerId', () => {
    const result = addRoute(state, 'GET', '/users', 'unknown-handler');
    expect(result).toBe('handler-not-found');
  });

  it('rejects duplicate method+path', () => {
    addRoute(state, 'GET', '/users', 'handler-users');
    const result = addRoute(state, 'GET', '/users', 'handler-users');
    expect(result).toBe('already-registered');
  });

  it('allows same path with different methods', () => {
    addRoute(state, 'GET', '/users', 'handler-users');
    const result = addRoute(state, 'POST', '/users', 'handler-users');
    expect(typeof result).toBe('object');
  });

  it('removes a route', () => {
    const route = addRoute(state, 'GET', '/items', 'handler-items');
    if (typeof route === 'object') {
      const del = removeRoute(state, route.routeId);
      expect(del).toEqual({ success: true });
      expect(getRoute(state, route.routeId)).toBeUndefined();
    }
  });

  it('returns route-not-found for unknown routeId', () => {
    expect(removeRoute(state, 'ghost')).toEqual({ success: false, error: 'route-not-found' });
  });
});

// ============================================================================
// ROUTE MATCHING
// ============================================================================

describe('HttpRouter — matchRoute', () => {
  let state: HttpRouterState;
  beforeEach(() => {
    state = setup();
    addRoute(state, 'GET', '/users', 'handler-users');
    addRoute(state, 'GET', '/users/:id', 'handler-users');
    addRoute(state, 'POST', '/items', 'handler-items');
  });

  it('matches exact path', () => {
    const result = matchRoute(state, 'GET', '/users');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.pathParams).toEqual({});
    }
  });

  it('matches path with param', () => {
    const result = matchRoute(state, 'GET', '/users/42');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.pathParams).toEqual({ id: '42' });
    }
  });

  it('returns route-not-found for unknown path', () => {
    const result = matchRoute(state, 'GET', '/nonexistent');
    expect(result).toBe('route-not-found');
  });

  it('returns method-not-allowed when path exists but wrong method', () => {
    const result = matchRoute(state, 'DELETE', '/users');
    expect(result).toBe('method-not-allowed');
  });

  it('increments hitCount on match', () => {
    const route = addRoute(state, 'GET', '/hit-test', 'handler-users');
    if (typeof route === 'object') {
      matchRoute(state, 'GET', '/hit-test');
      matchRoute(state, 'GET', '/hit-test');
      expect(getRoute(state, route.routeId)?.hitCount).toBe(2);
    }
  });
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

describe('HttpRouter — addMiddleware', () => {
  let state: HttpRouterState;
  beforeEach(() => {
    state = setup();
  });

  it('adds middleware to a route', () => {
    const route = addRoute(state, 'GET', '/mw', 'handler-users');
    if (typeof route === 'object') {
      const result = addMiddleware(state, route.routeId, 'auth-mw');
      expect(result).toEqual({ success: true });
      expect(getRoute(state, route.routeId)?.middlewareIds).toContain('auth-mw');
    }
  });

  it('returns route-not-found for unknown routeId', () => {
    expect(addMiddleware(state, 'ghost', 'mw')).toEqual({
      success: false,
      error: 'route-not-found',
    });
  });
});

// ============================================================================
// LIST & STATS
// ============================================================================

describe('HttpRouter — listRoutes and getStats', () => {
  let state: HttpRouterState;
  beforeEach(() => {
    state = setup();
  });

  it('lists all routes', () => {
    addRoute(state, 'GET', '/a', 'handler-users');
    addRoute(state, 'POST', '/b', 'handler-items');
    expect(listRoutes(state)).toHaveLength(2);
  });

  it('filters list by method', () => {
    addRoute(state, 'GET', '/a', 'handler-users');
    addRoute(state, 'POST', '/b', 'handler-items');
    expect(listRoutes(state, 'GET')).toHaveLength(1);
  });

  it('returns stats with correct totalRoutes', () => {
    addRoute(state, 'GET', '/x', 'handler-users');
    addRoute(state, 'POST', '/y', 'handler-items');
    const stats = getStats(state);
    expect(stats.totalRoutes).toBe(2);
    expect(stats.totalHits).toBe(0);
  });

  it('stats reflect hit counts', () => {
    addRoute(state, 'GET', '/z', 'handler-users');
    matchRoute(state, 'GET', '/z');
    matchRoute(state, 'GET', '/z');
    const stats = getStats(state);
    expect(stats.totalHits).toBe(2);
    expect(stats.byMethod.GET).toBe(2);
  });
});
