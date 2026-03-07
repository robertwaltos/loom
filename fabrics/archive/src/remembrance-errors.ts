/**
 * Remembrance errors — structured error types for the archive.
 */

export type RemembranceErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'CHAIN_INTEGRITY_VIOLATED'
  | 'ARCHIVE_SEALED';

export class RemembranceError extends Error {
  readonly code: RemembranceErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: RemembranceErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'RemembranceError';
    this.code = code;
    this.context = context;
  }
}

export function entryNotFound(entryId: string): RemembranceError {
  return new RemembranceError('ENTRY_NOT_FOUND', `Remembrance entry ${entryId} not found`, {
    entryId,
  });
}

export function chainIntegrityViolated(
  index: number,
  expected: string,
  actual: string,
): RemembranceError {
  return new RemembranceError(
    'CHAIN_INTEGRITY_VIOLATED',
    `Hash chain broken at index ${String(index)}`,
    { index, expected, actual },
  );
}

export function archiveSealed(): RemembranceError {
  return new RemembranceError(
    'ARCHIVE_SEALED',
    'The Remembrance is sealed and cannot accept new entries',
  );
}
