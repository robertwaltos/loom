/**
 * Pino Logger Adapter — Production Logger implementation.
 *
 * Wraps pino for structured JSON logging that satisfies
 * all Logger port variants across fabrics.
 *
 * Thread: bridge/loom-core/pino-logger
 * Tier: 0
 */

import { createRequire } from 'node:module';
import type { Logger as LoomLogger } from './logger.js';

const require = createRequire(import.meta.url);

interface PinoLike {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
  debug(obj: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): PinoLike;
}

export function createPinoLogger(name?: string): LoomLogger & { child(bindings: Record<string, unknown>): LoomLogger } {
  let pinoInstance: PinoLike | null = null;

  function getInstance(): PinoLike {
    if (!pinoInstance) {
// eslint-disable-next-line @typescript-eslint/no-require-imports
      const pino = require('pino') as (opts: Record<string, unknown>) => PinoLike;
      pinoInstance = pino({ name: name ?? 'loom' });
    }
    return pinoInstance;
  }

  return {
    info: (context, message) => {
      getInstance().info(context, message);
    },
    warn: (context, message) => {
      getInstance().warn(context, message);
    },
    error: (context, message) => {
      getInstance().error(context, message);
    },
    debug: (context, message) => {
      getInstance().debug(context, message);
    },
    child: (bindings) => {
      const childPino = getInstance().child(bindings);
      return {
        info: (ctx, msg) => childPino.info(ctx, msg),
        warn: (ctx, msg) => childPino.warn(ctx, msg),
        error: (ctx, msg) => childPino.error(ctx, msg),
        debug: (ctx, msg) => childPino.debug(ctx, msg),
      };
    },
  };
}
