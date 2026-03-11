/**
 * Logger Port — Structured logging interface.
 *
 * Commandment 7: Log with purpose — structured JSON, never console.log.
 * Commandment 9: Dependencies explicit — inject, don't import.
 *
 * Users inject Pino, Winston, or any logger that satisfies this interface.
 */

export interface Logger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
  debug(context: Record<string, unknown>, message: string): void;
}

/**
 * No-op logger for testing or when logging is not needed.
 */
export function createSilentLogger(): Logger {
  const noop = (): void => {};
  return { info: noop, warn: noop, error: noop, debug: noop };
}
