import { describe, it, expect } from 'vitest';
import {
  createHttpRouterState,
  registerHandler,
  addRoute,
  matchRoute,
  getStats,
  type RouteMatch,
} from '../http-router.js';

let idSeq = 0;
function makeRouter() {
  idSeq = 0;
  return createHttpRouterState({
    clock: { now: () => BigInt(Date.now()) * 1_000n },
    idGen: { generate: () => `rid-${++idSeq}` },
    logger: { info: () => {}, warn: () => {} },
  });
}

describe('HTTP Router Simulation', () => {
  it('registers handlers and adds routes, then matches incoming requests', () => {
    const state = makeRouter();

    const hr = registerHandler(state, 'handler-get-players', 'Returns all players');
    expect(hr.success).toBe(true);

    const ar = addRoute(state, 'GET', '/players', 'handler-get-players');
    expect(typeof ar).not.toBe('string');

    const match = matchRoute(state, 'GET', '/players');
    expect(match).toBeDefined();
    expect((match as RouteMatch).route.handlerId).toBe('handler-get-players');
  });

  it('matches parameterised route patterns', () => {
    const state = makeRouter();

    registerHandler(state, 'handler-player-by-id', 'Returns a player by ID');
    addRoute(state, 'GET', '/players/:id', 'handler-player-by-id');

    const match = matchRoute(state, 'GET', '/players/42');
    expect(match).toBeDefined();
    expect((match as RouteMatch).pathParams.id).toBe('42');
  });

  it('returns undefined for unregistered routes', () => {
    const state = makeRouter();
    const result = matchRoute(state, 'DELETE', '/nonexistent');
    expect(result).toBe('route-not-found');
  });

  it('rejects adding a route for an unknown handler', () => {
    const state = makeRouter();
    const result = addRoute(state, 'POST', '/ghost', 'ghost-handler');
    expect(result).toBe('handler-not-found');
  });

  it('tracks stats', () => {
    const state = makeRouter();
    registerHandler(state, 'h1', 'handler 1');
    addRoute(state, 'GET', '/test', 'h1');
    matchRoute(state, 'GET', '/test');
    const stats = getStats(state);
    expect(stats.totalRoutes).toBeGreaterThanOrEqual(1);
  });
});
