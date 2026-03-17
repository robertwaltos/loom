import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createErrorTracker,
  createHttpErrorReporter,
  type ErrorEvent,
  type ErrorTracker,
} from '../error-tracker.js';

function makeTracker(overrides?: Parameters<typeof createErrorTracker>[0]): ErrorTracker {
  return createErrorTracker({
    environment: 'test',
    release: '1.0.0',
    idGenerator: (() => { let n = 0; return () => `evt-${++n}`; })(),
    clock: { now: () => '2026-01-01T00:00:00.000Z' },
    ...overrides,
  });
}

describe('captureError', () => {
  it('returns an eventId string', () => {
    const t = makeTracker();
    const id = t.captureError(new Error('boom'));
    expect(typeof id).toBe('string');
    expect(id).not.toBeNull();
  });

  it('delivers event to reporter', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.captureError(new Error('test error'));
    expect(events).toHaveLength(1);
    expect(events[0]!.message).toBe('test error');
  });

  it('sets severity correctly', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.captureError(new Error('fatal one'), 'fatal');
    expect(events[0]!.severity).toBe('fatal');
  });

  it('attaches environment and release', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.captureError(new Error('env test'));
    expect(events[0]!.environment).toBe('test');
    expect(events[0]!.release).toBe('1.0.0');
  });
});

describe('captureMessage', () => {
  it('captures a string message without stack', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.captureMessage('something went wrong');
    expect(events[0]!.message).toBe('something went wrong');
    expect(events[0]!.stack).toBeUndefined();
  });
});

describe('breadcrumbs', () => {
  it('attaches breadcrumbs to events', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.addBreadcrumb({ category: 'navigation', message: 'user visited /home', level: 'info' });
    t.captureError(new Error('crash after nav'));
    expect(events[0]!.breadcrumbs).toHaveLength(1);
    expect(events[0]!.breadcrumbs[0]!.category).toBe('navigation');
  });

  it('rolls over at maxBreadcrumbs', () => {
    const t = makeTracker({ environment: 'test', maxBreadcrumbs: 3 });
    for (let i = 0; i < 5; i++) {
      t.addBreadcrumb({ category: 'x', message: `crumb ${i}`, level: 'debug' });
    }
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.captureError(new Error('overflow'));
    expect(events[0]!.breadcrumbs).toHaveLength(3);
  });
});

describe('rate limiting', () => {
  it('drops events after maxEventsPerFingerprint in window', () => {
    const t = makeTracker({ environment: 'test', maxEventsPerFingerprint: 2, rateLimitWindowMs: 60_000 });
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    // Same message → same fingerprint
    for (let i = 0; i < 5; i++) {
      t.captureMessage('repeated error');
    }
    expect(events.length).toBe(2);
    expect(t.getStats().totalDropped).toBe(3);
  });

  it('does not rate-limit different fingerprints', () => {
    const t = makeTracker({ environment: 'test', maxEventsPerFingerprint: 1 });
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.captureMessage('error alpha');
    t.captureMessage('error beta');
    t.captureMessage('error gamma');
    expect(events.length).toBe(3);
  });
});

describe('setContext', () => {
  it('merges persistent context into events', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.setContext({ playerId: 'p1', worldId: 'alkahest' });
    t.captureMessage('ctx test');
    expect(events[0]!.context.playerId).toBe('p1');
    expect(events[0]!.context.worldId).toBe('alkahest');
  });

  it('per-capture context overrides persistent context', () => {
    const t = makeTracker();
    const events: ErrorEvent[] = [];
    t.addReporter((e) => { events.push(e); });
    t.setContext({ playerId: 'persistent' });
    t.captureMessage('override test', 'info', { playerId: 'override' });
    expect(events[0]!.context.playerId).toBe('override');
  });
});

describe('multiple reporters', () => {
  it('fans out to all reporters', () => {
    const t = makeTracker();
    let a = 0; let b = 0;
    t.addReporter(() => { a++; });
    t.addReporter(() => { b++; });
    t.captureMessage('fanout');
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('reporter error does not prevent other reporters from running', () => {
    const t = makeTracker();
    let safe = 0;
    t.addReporter(() => { throw new Error('reporter crash'); });
    t.addReporter(() => { safe++; });
    t.captureMessage('resilience test');
    expect(safe).toBe(1);
  });
});

describe('getStats', () => {
  it('tracks totalCaptured and totalSent', () => {
    const t = makeTracker();
    t.addReporter(() => { /* noop */ });
    t.captureMessage('a');
    t.captureMessage('b');
    const stats = t.getStats();
    expect(stats.totalCaptured).toBe(2);
    expect(stats.totalSent).toBe(2);
  });
});

describe('createHttpErrorReporter', () => {
  it('returns a function', () => {
    const reporter = createHttpErrorReporter({ endpoint: 'http://localhost:9999/errors' });
    expect(typeof reporter).toBe('function');
  });

  it('falls back to console reporter when no DSN configured', () => {
    // Temporarily clear env var if set
    const saved = process.env['SENTRY_DSN'];
    delete process.env['SENTRY_DSN'];
    delete process.env['ERROR_REPORT_URL'];
    const reporter = createHttpErrorReporter();
    expect(typeof reporter).toBe('function');
    // Should not throw when called with a fatal event
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* noop */ });
    const fakeEvent: ErrorEvent = {
      eventId: 'e1', timestamp: '2026-01-01T00:00:00Z',
      severity: 'fatal', message: 'test', fingerprint: 'fp',
      context: {}, breadcrumbs: [], tags: {}, environment: 'test',
    };
    expect(() => reporter(fakeEvent)).not.toThrow();
    consoleSpy.mockRestore();
    if (saved !== undefined) process.env['SENTRY_DSN'] = saved;
  });
});
