/**
 * error-tracker.ts — Structured error capture with deduplication,
 * rate limiting, and pluggable reporting sinks (Sentry-compatible envelope,
 * OpenTelemetry error events, or custom webhook).
 *
 * Provides a single entry point for all unhandled + caught errors across
 * loom-core, selvage, and main.ts without importing OTel or Sentry directly.
 *
 * Features:
 *   - Structured ErrorEvent with breadcrumbs, context, severity
 *   - Deduplication by fingerprint (prevents error storms)
 *   - Per-fingerprint rate limiting (max N events per window)
 *   - Fan-out to multiple reporter sinks
 *   - Global process error handlers (uncaughtException, unhandledRejection)
 *   - Performance-safe: never throws to caller
 *
 * Thread: silk/launch-readiness
 * Tier: 1
 */

// ─── Types ────────────────────────────────────────────────────────

export type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export interface Breadcrumb {
  readonly timestamp: string;
  readonly category: string;
  readonly message: string;
  readonly level: ErrorSeverity;
  readonly data?: Readonly<Record<string, string | number | boolean>>;
}

export interface ErrorContext {
  readonly playerId?: string;
  readonly worldId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly extra?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface ErrorEvent {
  readonly eventId: string;
  readonly timestamp: string;
  readonly severity: ErrorSeverity;
  readonly message: string;
  readonly stack?: string;
  readonly fingerprint: string;
  readonly context: ErrorContext;
  readonly breadcrumbs: ReadonlyArray<Breadcrumb>;
  readonly tags: Readonly<Record<string, string>>;
  readonly environment: string;
  readonly release?: string;
}

export type ErrorReporter = (event: ErrorEvent) => void | Promise<void>;

export interface ErrorTrackerConfig {
  readonly environment: string;
  readonly release?: string;
  readonly maxBreadcrumbs?: number;
  /** Max events per fingerprint per windowMs before rate-limiting. Default: 10. */
  readonly maxEventsPerFingerprint?: number;
  /** Window in ms for per-fingerprint rate limit. Default: 60_000. */
  readonly rateLimitWindowMs?: number;
  /** Tags attached to every event (e.g. { service: 'loom-core', region: 'eu-west-1' }). */
  readonly defaultTags?: Readonly<Record<string, string>>;
  readonly idGenerator?: () => string;
  readonly clock?: { now(): string };
}

export interface ErrorTracker {
  /** Capture an Error object. */
  captureError(
    err: Error,
    severity?: ErrorSeverity,
    context?: ErrorContext,
  ): string | null;

  /** Capture a message (non-Error). */
  captureMessage(
    message: string,
    severity?: ErrorSeverity,
    context?: ErrorContext,
  ): string | null;

  /** Add a breadcrumb to the rolling buffer. */
  addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void;

  /** Add a reporter sink (fan-out). */
  addReporter(reporter: ErrorReporter): void;

  /** Attach persistent context merged into all future events. */
  setContext(context: ErrorContext): void;

  /** Register global uncaughtException + unhandledRejection handlers. */
  attachGlobalHandlers(): void;

  /** Stats for health check endpoint. */
  getStats(): ErrorTrackerStats;

  /** Flush any pending async reporter calls. */
  flush(): Promise<void>;
}

export interface ErrorTrackerStats {
  readonly totalCaptured: number;
  readonly totalDropped: number;
  readonly totalSent: number;
  readonly uniqueFingerprints: number;
  readonly rateLimitedFingerprints: number;
}

// ─── Constants ────────────────────────────────────────────────────

const DEFAULT_MAX_BREADCRUMBS = 100;
const DEFAULT_MAX_EVENTS = 10;
const DEFAULT_RATE_WINDOW_MS = 60_000;

// ─── Fingerprinting ───────────────────────────────────────────────

function computeFingerprint(message: string, stack?: string): string {
  // Use first non-node_modules stack frame as fingerprint, falling back to message
  if (stack) {
    const lines = stack.split('\n');
    for (const line of lines) {
      const m = line.match(/at .+\((.+):(\d+):(\d+)\)/);
      if (m && m[1] && !m[1].includes('node_modules')) {
        return `${message.slice(0, 80)}|${m[1].split('/').slice(-2).join('/')}:${m[2] ?? '?'}`;
      }
    }
  }
  // djb2 hash of message
  let h = 5381;
  for (let i = 0; i < message.length; i++) {
    h = ((h << 5) + h + message.charCodeAt(i)) >>> 0;
  }
  return `${message.slice(0, 80)}|hash:${h.toString(16)}`;
}

// ─── Counter ID generator ─────────────────────────────────────────

let _idCounter = 0;
function defaultIdGenerator(): string {
  return `err-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

// ─── Factory ─────────────────────────────────────────────────────

export function createErrorTracker(config: ErrorTrackerConfig): ErrorTracker {
  const {
    environment,
    release,
    maxBreadcrumbs = DEFAULT_MAX_BREADCRUMBS,
    maxEventsPerFingerprint = DEFAULT_MAX_EVENTS,
    rateLimitWindowMs = DEFAULT_RATE_WINDOW_MS,
    defaultTags = {},
    idGenerator = defaultIdGenerator,
    clock = { now: () => new Date().toISOString() },
  } = config;

  const breadcrumbs: Breadcrumb[] = [];
  const reporters: ErrorReporter[] = [];
  let persistentContext: ErrorContext = {};
  const pendingFlushes: Promise<void>[] = [];

  // Per-fingerprint rate limiting: windowStart + count
  const fingerprintCounters = new Map<string, { windowStart: number; count: number }>();

  let totalCaptured = 0;
  let totalDropped = 0;
  let totalSent = 0;

  function isRateLimited(fingerprint: string): boolean {
    const now = Date.now();
    let entry = fingerprintCounters.get(fingerprint);
    if (!entry) {
      entry = { windowStart: now, count: 0 };
      fingerprintCounters.set(fingerprint, entry);
    }
    // Reset window if expired
    if (now - entry.windowStart > rateLimitWindowMs) {
      entry.windowStart = now;
      entry.count = 0;
    }
    if (entry.count >= maxEventsPerFingerprint) {
      return true;
    }
    entry.count++;
    return false;
  }

  function dispatch(event: ErrorEvent): void {
    totalSent++;
    for (const reporter of reporters) {
      try {
        const result = reporter(event);
        if (result instanceof Promise) {
          pendingFlushes.push(result.catch((e: unknown) => {
            // eslint-disable-next-line no-console
            console.error('[ErrorTracker] reporter threw:', e);
          }));
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[ErrorTracker] reporter threw synchronously:', e);
      }
    }
  }

  function capture(
    message: string,
    stack: string | undefined,
    severity: ErrorSeverity,
    context: ErrorContext,
  ): string | null {
    totalCaptured++;
    const fingerprint = computeFingerprint(message, stack);
    if (isRateLimited(fingerprint)) {
      totalDropped++;
      return null;
    }

    const eventId = idGenerator();
    const event: ErrorEvent = {
      eventId,
      timestamp: clock.now(),
      severity,
      message,
      ...(stack !== undefined ? { stack } : {}),
      fingerprint,
      context: { ...persistentContext, ...context },
      breadcrumbs: [...breadcrumbs],
      tags: { ...defaultTags },
      environment,
      ...(release !== undefined ? { release } : {}),
    };

    dispatch(event);
    return eventId;
  }

  return {
    captureError(err, severity = 'error', context = {}) {
      try {
        return capture(err.message, err.stack, severity, context);
      } catch {
        return null;
      }
    },

    captureMessage(message, severity = 'warning', context = {}) {
      try {
        return capture(message, undefined, severity, context);
      } catch {
        return null;
      }
    },

    addBreadcrumb(crumb) {
      breadcrumbs.push({ ...crumb, timestamp: clock.now() });
      if (breadcrumbs.length > maxBreadcrumbs) {
        breadcrumbs.splice(0, breadcrumbs.length - maxBreadcrumbs);
      }
    },

    addReporter(reporter) {
      reporters.push(reporter);
    },

    setContext(ctx) {
      persistentContext = { ...persistentContext, ...ctx };
    },

    attachGlobalHandlers() {
      if (typeof process === 'undefined') return;
      process.on('uncaughtException', (err: Error) => {
        this.captureError(err, 'fatal');
      });
      process.on('unhandledRejection', (reason: unknown) => {
        const err = reason instanceof Error
          ? reason
          : new Error(String(reason));
        this.captureError(err, 'error');
      });
    },

    async flush() {
      if (pendingFlushes.length > 0) {
        await Promise.allSettled(pendingFlushes.splice(0));
      }
    },

    getStats() {
      const rateLimitedFingerprints = [...fingerprintCounters.values()].filter(
        (v) => v.count >= maxEventsPerFingerprint,
      ).length;
      return {
        totalCaptured,
        totalDropped,
        totalSent,
        uniqueFingerprints: fingerprintCounters.size,
        rateLimitedFingerprints,
      };
    },
  };
}

// ─── Sentry-compatible HTTP reporter factory ──────────────────────

/**
 * Creates a reporter that POSTs ErrorEvents to a Sentry DSN or any
 * compatible endpoint (e.g. GlitchTip, self-hosted Sentry).
 *
 * Requires `SENTRY_DSN` env var or explicit `dsn` config.
 * Falls back to console.error if no DSN is configured.
 */
export function createHttpErrorReporter(opts?: {
  readonly dsn?: string;
  readonly endpoint?: string;
  readonly headers?: Readonly<Record<string, string>>;
}): ErrorReporter {
  const target = opts?.endpoint
    ?? opts?.dsn
    ?? process.env['SENTRY_DSN']
    ?? process.env['ERROR_REPORT_URL'];

  if (!target) {
    return (event) => {
      if (event.severity === 'fatal' || event.severity === 'error') {
        // eslint-disable-next-line no-console
        console.error(`[ErrorTracker][${event.severity.toUpperCase()}] ${event.message}`, {
          eventId: event.eventId,
          fingerprint: event.fingerprint,
          context: event.context,
        });
      }
    };
  }

  return async (event) => {
    try {
      await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...opts?.headers,
        },
        body: JSON.stringify(event),
      });
    } catch {
      // Best-effort — never throw from a reporter
    }
  };
}
