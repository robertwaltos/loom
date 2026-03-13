import { describe, expect, it } from 'vitest';
import { createSilentLogger } from '../logger.js';

describe('logger simulation', () => {
  it('simulates structured logging calls across all levels as no-op instrumentation', () => {
    const logger = createSilentLogger();

    expect(() => {
      logger.info({ subsystem: 'spawn' }, 'spawn started');
      logger.warn({ subsystem: 'spawn' }, 'spawn delayed');
      logger.error({ subsystem: 'spawn' }, 'spawn failed');
      logger.debug({ subsystem: 'spawn' }, 'spawn retry');
    }).not.toThrow();
  });
});
