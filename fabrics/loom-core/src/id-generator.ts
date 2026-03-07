/**
 * ID Generator Port — Unique identifier creation.
 *
 * Abstracted for testing (inject sequential IDs)
 * and for future distributed ID generation (Snowflake, ULID, etc.).
 */

import { randomUUID } from 'node:crypto';

export interface IdGenerator {
  /** Generate a globally unique ID */
  generate(): string;
}

export function createUuidGenerator(): IdGenerator {
  return {
    generate(): string {
      return randomUUID();
    },
  };
}

/**
 * Sequential ID generator for deterministic testing.
 */
export function createSequentialIdGenerator(prefix = 'test'): IdGenerator {
  let counter = 0;

  return {
    generate(): string {
      counter += 1;
      return `${prefix}-${String(counter).padStart(6, '0')}`;
    },
  };
}
