import { describe, it, expect } from 'vitest';
import { createRequestRouter } from '../request-router.js';

let idSeq = 0;
function makeRouter(allowRate = true) {
  idSeq = 0;
  return createRequestRouter({
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { generate: () => `req-${++idSeq}` },
    log: { info: () => {}, warn: () => {} },
    rateLimit: { isAllowed: () => allowRate },
  });
}

describe('Request Router Simulation', () => {
  it('registers routes and dispatches requests to handlers', () => {
    const router = makeRouter();

    let called = false;
    router.registerRoute({
      method: 'GET',
      pattern: '/health',
      handler: (_req) => { called = true; return { status: 200, body: 'ok' }; },
      description: 'Health check',
    });

    const result = router.handle({ method: 'GET', path: '/health', clientId: 'c1' });
    expect(result.outcome).toBe('handled');
    expect(called).toBe(true);
    expect(result.status).toBe(200);
  });

  it('extracts path parameters and passes them to handlers', () => {
    const router = makeRouter();

    router.registerRoute({
      method: 'GET',
      pattern: '/players/:id',
      handler: (req) => ({ status: 200, body: { id: req.params?.id } }),
      description: 'Get player',
    });

    const result = router.handle({ method: 'GET', path: '/players/42', clientId: 'c2' });
    expect(result.outcome).toBe('handled');
    expect((result.body as { id: string }).id).toBe('42');
  });

  it('returns unmatched for unknown routes', () => {
    const router = makeRouter();
    const result = router.handle({ method: 'DELETE', path: '/nonexistent', clientId: 'c3' });
    expect(result.outcome).toBe('not_found');
  });

  it('enforces rate limiting', () => {
    const router = makeRouter(false);
    router.registerRoute({
      method: 'POST',
      pattern: '/submit',
      handler: () => ({ status: 201, body: {} }),
      description: 'Submit form',
    });

    const result = router.handle({ method: 'POST', path: '/submit', clientId: 'throttled-client' });
    expect(result.outcome).toBe('rate_limited');
  });

  it('unregisters routes and stops routing to them', () => {
    const router = makeRouter();
    router.registerRoute({ method: 'GET', pattern: '/temp', handler: () => ({ status: 200 }), description: 'Temp' });
    router.removeRoute('GET', '/temp');

    const result = router.handle({ method: 'GET', path: '/temp', clientId: 'c4' });
    expect(result.outcome).toBe('not_found');
  });
});
