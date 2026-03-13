import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── pino mock (must come before the module import) ───────────────────────

const mockPinoChild = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(),
};

const mockPinoInstance = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnValue(mockPinoChild),
};

vi.mock('pino', () => ({
  default: vi.fn().mockReturnValue(mockPinoInstance),
}));

// ─── module under test ────────────────────────────────────────────────────

import { createPinoLogger } from '../pino-logger.js';

// ─── helpers ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockPinoInstance.child.mockReturnValue(mockPinoChild);
});

// ─── createPinoLogger API ─────────────────────────────────────────────────

describe('createPinoLogger — shape', () => {
  it('returns an object with info, warn, error, debug, child', () => {
    const logger = createPinoLogger('test');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it('works without a name argument', () => {
    const logger = createPinoLogger();
    expect(typeof logger.info).toBe('function');
  });
});

// ─── delegating — callable without throwing ──────────────────────────────────

describe('createPinoLogger — callable', () => {
  it('logger.info is callable without throwing', () => {
    const logger = createPinoLogger('delegate-test');
    expect(() => logger.info({ requestId: '123' }, 'test message')).not.toThrow();
  });

  it('logger.warn is callable without throwing', () => {
    const logger = createPinoLogger();
    expect(() => logger.warn({}, 'warning')).not.toThrow();
  });

  it('logger.error is callable without throwing', () => {
    const logger = createPinoLogger();
    expect(() => logger.error({ stack: 'trace' }, 'error occurred')).not.toThrow();
  });

  it('logger.debug is callable without throwing', () => {
    const logger = createPinoLogger();
    expect(() => logger.debug({ detail: 'x' }, 'debug info')).not.toThrow();
  });
});

// ─── child logger ─────────────────────────────────────────────────────────

describe('createPinoLogger — child', () => {
  it('child() returns an object with info, warn, error, debug', () => {
    const logger = createPinoLogger('parent');
    const child = logger.child({ service: 'my-service' });
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.debug).toBe('function');
  });

  it('child logger info is callable without throwing', () => {
    const logger = createPinoLogger('parent');
    const child = logger.child({ service: 'my-service' });
    expect(() => child.info({ x: 1 }, 'child message')).not.toThrow();
  });

  it('child logger warn/error/debug are callable without throwing', () => {
    const logger = createPinoLogger('parent');
    const child = logger.child({ component: 'router' });
    expect(() => child.warn({}, 'w')).not.toThrow();
    expect(() => child.error({}, 'e')).not.toThrow();
    expect(() => child.debug({}, 'd')).not.toThrow();
  });
});
