import { describe, it, expect, beforeEach } from 'vitest';
import { createRequestRouter } from '../request-router.js';
import type { RequestRouterDeps, HttpMethod } from '../request-router.js';

function createDeps(): RequestRouterDeps {
  let time = 0;
  let idCounter = 0;
  return {
    clock: {
      nowMicroseconds: () => {
        time += 10;
        return time;
      },
    },
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return 'req-' + String(idCounter);
      },
    },
    log: {
      info: () => {},
      warn: () => {},
    },
    rateLimit: {
      isAllowed: () => true,
    },
  };
}

function createRateLimitedDeps(): RequestRouterDeps {
  const base = createDeps();
  return { ...base, rateLimit: { isAllowed: () => false } };
}

function echoHandler() {
  return (ctx: { params: Record<string, string> }) => ({
    status: 200,
    body: { params: ctx.params },
  });
}

describe('RequestRouter — route registration', () => {
  it('registers a route successfully', () => {
    const router = createRequestRouter(createDeps());
    const ok = router.registerRoute({
      method: 'GET',
      pattern: '/users',
      handler: echoHandler(),
      description: 'List users',
    });
    expect(ok).toBe(true);
    expect(router.listRoutes()).toHaveLength(1);
  });

  it('rejects duplicate route registration', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users',
      handler: echoHandler(),
      description: 'List users',
    });
    const ok = router.registerRoute({
      method: 'GET',
      pattern: '/users',
      handler: echoHandler(),
      description: 'Duplicate',
    });
    expect(ok).toBe(false);
  });

  it('allows same pattern with different methods', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users',
      handler: echoHandler(),
      description: 'Get users',
    });
    const ok = router.registerRoute({
      method: 'POST',
      pattern: '/users',
      handler: echoHandler(),
      description: 'Create user',
    });
    expect(ok).toBe(true);
    expect(router.listRoutes()).toHaveLength(2);
  });

  it('removes a route', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users',
      handler: echoHandler(),
      description: 'List users',
    });
    expect(router.removeRoute('GET', '/users')).toBe(true);
    expect(router.listRoutes()).toHaveLength(0);
  });

  it('returns false when removing nonexistent route', () => {
    const router = createRequestRouter(createDeps());
    expect(router.removeRoute('GET', '/nope')).toBe(false);
  });
});

describe('RequestRouter — path matching', () => {
  it('matches a simple static path', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/api/health',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Health check',
    });
    const result = router.handle({ method: 'GET', path: '/api/health', clientId: 'c1' });
    expect(result.outcome).toBe('handled');
    expect(result.status).toBe(200);
  });

  it('extracts path parameters', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users/:userId/posts/:postId',
      handler: echoHandler(),
      description: 'Get post',
    });
    const result = router.handle({
      method: 'GET',
      path: '/users/42/posts/99',
      clientId: 'c1',
    });
    expect(result.outcome).toBe('handled');
    const body = result.body as { params: Record<string, string> };
    expect(body.params['userId']).toBe('42');
    expect(body.params['postId']).toBe('99');
  });

  it('returns not_found for unmatched path', () => {
    const router = createRequestRouter(createDeps());
    const result = router.handle({ method: 'GET', path: '/unknown', clientId: 'c1' });
    expect(result.outcome).toBe('not_found');
    expect(result.status).toBe(404);
  });

  it('does not match wrong method', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'POST',
      pattern: '/users',
      handler: echoHandler(),
      description: 'Create user',
    });
    const result = router.handle({ method: 'GET', path: '/users', clientId: 'c1' });
    expect(result.outcome).toBe('not_found');
  });

  it('does not match wrong segment count', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users/:id',
      handler: echoHandler(),
      description: 'Get user',
    });
    const result = router.handle({
      method: 'GET',
      path: '/users/42/extra',
      clientId: 'c1',
    });
    expect(result.outcome).toBe('not_found');
  });

  it('matches the correct route among multiple', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/alpha',
      handler: () => ({ status: 200, body: 'alpha' }),
      description: 'Alpha',
    });
    router.registerRoute({
      method: 'GET',
      pattern: '/beta',
      handler: () => ({ status: 200, body: 'beta' }),
      description: 'Beta',
    });
    const result = router.handle({ method: 'GET', path: '/beta', clientId: 'c1' });
    expect(result.body).toBe('beta');
  });
});

describe('RequestRouter — rate limiting', () => {
  it('rejects requests when rate limited', () => {
    const router = createRequestRouter(createRateLimitedDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users',
      handler: echoHandler(),
      description: 'List users',
    });
    const result = router.handle({ method: 'GET', path: '/users', clientId: 'c1' });
    expect(result.outcome).toBe('rate_limited');
    expect(result.status).toBe(429);
  });
});

describe('RequestRouter — middleware', () => {
  it('adds middleware successfully', () => {
    const router = createRequestRouter(createDeps());
    const ok = router.addMiddleware({
      name: 'auth',
      handler: () => ({ proceed: true }),
      order: 1,
    });
    expect(ok).toBe(true);
  });

  it('rejects duplicate middleware', () => {
    const router = createRequestRouter(createDeps());
    router.addMiddleware({ name: 'auth', handler: () => ({ proceed: true }), order: 1 });
    const ok = router.addMiddleware({ name: 'auth', handler: () => ({ proceed: true }), order: 2 });
    expect(ok).toBe(false);
  });

  it('middleware can reject requests', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/protected',
      handler: () => ({ status: 200, body: 'secret' }),
      description: 'Protected',
    });
    router.addMiddleware({
      name: 'auth',
      handler: () => ({ proceed: false, reason: 'Unauthorized' }),
      order: 1,
    });
    const result = router.handle({ method: 'GET', path: '/protected', clientId: 'c1' });
    expect(result.outcome).toBe('middleware_rejected');
    expect(result.status).toBe(403);
  });

  it('middleware executes in order', () => {
    const order: string[] = [];
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/test',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Test',
    });
    router.addMiddleware({
      name: 'first',
      handler: () => {
        order.push('first');
        return { proceed: true };
      },
      order: 1,
    });
    router.addMiddleware({
      name: 'second',
      handler: () => {
        order.push('second');
        return { proceed: true };
      },
      order: 2,
    });
    router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(order).toEqual(['first', 'second']);
  });

  it('disabled middleware is skipped', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/test',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Test',
    });
    router.addMiddleware({
      name: 'blocker',
      handler: () => ({ proceed: false, reason: 'blocked' }),
      order: 1,
    });
    router.disableMiddleware('blocker');
    const result = router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(result.outcome).toBe('handled');
  });

  it('enables disabled middleware', () => {
    const router = createRequestRouter(createDeps());
    router.addMiddleware({
      name: 'mw',
      handler: () => ({ proceed: false, reason: 'nope' }),
      order: 1,
    });
    router.disableMiddleware('mw');
    expect(router.enableMiddleware('mw')).toBe(true);
  });

  it('returns false when enabling nonexistent middleware', () => {
    const router = createRequestRouter(createDeps());
    expect(router.enableMiddleware('nope')).toBe(false);
  });

  it('returns false when disabling nonexistent middleware', () => {
    const router = createRequestRouter(createDeps());
    expect(router.disableMiddleware('nope')).toBe(false);
  });

  it('removes middleware', () => {
    const router = createRequestRouter(createDeps());
    router.addMiddleware({ name: 'mw', handler: () => ({ proceed: true }), order: 1 });
    expect(router.removeMiddleware('mw')).toBe(true);
    expect(router.getStats().totalMiddleware).toBe(0);
  });

  it('stops middleware chain on first rejection', () => {
    const order: string[] = [];
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/test',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Test',
    });
    router.addMiddleware({
      name: 'first',
      handler: () => {
        order.push('first');
        return { proceed: false, reason: 'no' };
      },
      order: 1,
    });
    router.addMiddleware({
      name: 'second',
      handler: () => {
        order.push('second');
        return { proceed: true };
      },
      order: 2,
    });
    router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(order).toEqual(['first']);
  });
});

describe('RequestRouter — request context', () => {
  it('provides request ID in result', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/test',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Test',
    });
    const result = router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(result.requestId).toBe('req-1');
  });

  it('provides duration in result', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/test',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Test',
    });
    const result = router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(result.durationMicro).toBeGreaterThan(0);
  });

  it('provides matched pattern in result', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/users/:id',
      handler: echoHandler(),
      description: 'Get user',
    });
    const result = router.handle({ method: 'GET', path: '/users/42', clientId: 'c1' });
    expect(result.matchedPattern).toBe('/users/:id');
  });

  it('matched pattern is undefined for not_found', () => {
    const router = createRequestRouter(createDeps());
    const result = router.handle({ method: 'GET', path: '/nope', clientId: 'c1' });
    expect(result.matchedPattern).toBeUndefined();
  });
});

describe('RequestRouter — stats', () => {
  it('tracks request counts by outcome', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/ok',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'OK',
    });
    router.handle({ method: 'GET', path: '/ok', clientId: 'c1' });
    router.handle({ method: 'GET', path: '/ok', clientId: 'c1' });
    router.handle({ method: 'GET', path: '/missing', clientId: 'c1' });

    const stats = router.getStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.handledCount).toBe(2);
    expect(stats.notFoundCount).toBe(1);
    expect(stats.totalRoutes).toBe(1);
  });

  it('tracks middleware rejected count', () => {
    const router = createRequestRouter(createDeps());
    router.registerRoute({
      method: 'GET',
      pattern: '/test',
      handler: () => ({ status: 200, body: 'ok' }),
      description: 'Test',
    });
    router.addMiddleware({
      name: 'deny',
      handler: () => ({ proceed: false, reason: 'no' }),
      order: 1,
    });
    router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(router.getStats().middlewareRejectedCount).toBe(1);
  });

  it('tracks rate limited count', () => {
    const router = createRequestRouter(createRateLimitedDeps());
    router.handle({ method: 'GET', path: '/test', clientId: 'c1' });
    expect(router.getStats().rateLimitedCount).toBe(1);
  });

  it('reports zero stats initially', () => {
    const router = createRequestRouter(createDeps());
    const stats = router.getStats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalRoutes).toBe(0);
    expect(stats.totalMiddleware).toBe(0);
  });
});
