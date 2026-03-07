/**
 * Chronicle errors — structured error types for the archive.
 */

export type ChronicleErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'CHAIN_INTEGRITY_VIOLATED'
  | 'ARCHIVE_SEALED';

export class ChronicleError extends Error {
  readonly code: ChronicleErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: ChronicleErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ChronicleError';
    this.code = code;
    this.context = context;
  }
}

export function entryNotFound(entryId: string): ChronicleError {
  return new ChronicleError('ENTRY_NOT_FOUND', `Chronicle entry ${entryId} not found`, {
    entryId,
  });
}

export function chainIntegrityViolated(
  index: number,
  expected: string,
  actual: string,
): ChronicleError {
  return new ChronicleError(
    'CHAIN_INTEGRITY_VIOLATED',
    `Hash chain broken at index ${String(index)}`,
    { index, expected, actual },
  );
}

export function archiveSealed(): ChronicleError {
  return new ChronicleError(
    'ARCHIVE_SEALED',
    'The Chronicle is sealed and cannot accept new entries',
  );
}
