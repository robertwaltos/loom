import { describe, it, expect } from 'vitest';
import {
  ChronicleError,
  entryNotFound,
  chainIntegrityViolated,
  archiveSealed,
} from '../chronicle-errors.js';

describe('ChronicleError', () => {
  it('is an instance of Error with name ChronicleError', () => {
    const err = new ChronicleError('ENTRY_NOT_FOUND', 'missing');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ChronicleError');
    expect(err.code).toBe('ENTRY_NOT_FOUND');
    expect(err.context).toEqual({});
  });

  it('stores context when provided', () => {
    const err = new ChronicleError('ARCHIVE_SEALED', 'sealed', { note: 'immutable' });
    expect(err.context['note']).toBe('immutable');
  });
});

describe('entryNotFound', () => {
  it('carries entryId in context', () => {
    const err = entryNotFound('entry-99');
    expect(err.code).toBe('ENTRY_NOT_FOUND');
    expect(err.context['entryId']).toBe('entry-99');
  });
});

describe('chainIntegrityViolated', () => {
  it('stores index, expected hash, and actual hash', () => {
    const err = chainIntegrityViolated(5, 'abc123', 'def456');
    expect(err.code).toBe('CHAIN_INTEGRITY_VIOLATED');
    expect(err.context['index']).toBe(5);
    expect(err.context['expected']).toBe('abc123');
    expect(err.context['actual']).toBe('def456');
  });
});

describe('archiveSealed', () => {
  it('creates error with ARCHIVE_SEALED code', () => {
    const err = archiveSealed();
    expect(err.code).toBe('ARCHIVE_SEALED');
    expect(err.context).toEqual({});
  });
});
