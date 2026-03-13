import { describe, it, expect, vi } from 'vitest';
import { createSilentLogger } from '../logger.js';

describe('createSilentLogger', () => {
  it('returns an object with info, warn, error and debug methods', () => {
    const logger = createSilentLogger();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('info does not throw', () => {
    const logger = createSilentLogger();
    expect(() => { logger.info({ requestId: '1' }, 'hello'); }).not.toThrow();
  });

  it('warn does not throw', () => {
    const logger = createSilentLogger();
    expect(() => { logger.warn({ code: 500 }, 'warning'); }).not.toThrow();
  });

  it('error does not throw', () => {
    const logger = createSilentLogger();
    expect(() => { logger.error({ error: 'boom' }, 'error'); }).not.toThrow();
  });

  it('debug does not throw', () => {
    const logger = createSilentLogger();
    expect(() => { logger.debug({ detail: 'x' }, 'debug'); }).not.toThrow();
  });

  it('all methods are no-ops (no side effects observable)', () => {
    const logger = createSilentLogger();
    const spy = vi.spyOn(console, 'log');
    logger.info({}, 'msg');
    logger.warn({}, 'msg');
    logger.error({}, 'msg');
    logger.debug({}, 'msg');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
