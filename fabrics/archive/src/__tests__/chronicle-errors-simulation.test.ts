import { describe, expect, it } from 'vitest';
import {
  ChronicleError,
  archiveSealed,
  chainIntegrityViolated,
  entryNotFound,
} from '../chronicle-errors.js';

describe('chronicle-errors simulation', () => {
  it('constructs ChronicleError with code, message, and context', () => {
    const err = new ChronicleError('ENTRY_NOT_FOUND', 'missing', { entryId: 'x-1' });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ChronicleError');
    expect(err.code).toBe('ENTRY_NOT_FOUND');
    expect(err.message).toBe('missing');
    expect(err.context).toEqual({ entryId: 'x-1' });
  });

  it('entryNotFound returns structured not-found error', () => {
    const err = entryNotFound('entry-9');

    expect(err).toBeInstanceOf(ChronicleError);
    expect(err.code).toBe('ENTRY_NOT_FOUND');
    expect(err.message).toContain('entry-9');
    expect(err.context).toEqual({ entryId: 'entry-9' });
  });

  it('chainIntegrityViolated returns expected chain context payload', () => {
    const err = chainIntegrityViolated(42, 'expected-hash', 'actual-hash');

    expect(err.code).toBe('CHAIN_INTEGRITY_VIOLATED');
    expect(err.message).toContain('42');
    expect(err.context).toEqual({
      index: 42,
      expected: 'expected-hash',
      actual: 'actual-hash',
    });
  });

  it('archiveSealed returns sealed archive error without extra context', () => {
    const err = archiveSealed();

    expect(err.code).toBe('ARCHIVE_SEALED');
    expect(err.message).toContain('sealed');
    expect(err.context).toEqual({});
  });
});
