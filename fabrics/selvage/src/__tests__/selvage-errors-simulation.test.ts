import { describe, it, expect } from 'vitest';
import {
  SelvageError,
  connectionNotFound,
  duplicateClientId,
  connectionNotActive,
  handshakeAlreadyComplete,
  invalidMessage,
  protocolVersionMismatch,
  messageTooLarge,
  rateLimited,
} from '../selvage-errors.js';

describe('Selvage Errors Simulation', () => {
  it('creates typed SelvageError with code and context', () => {
    const err = new SelvageError('INVALID_MESSAGE', 'bad payload', { step: 'decode' });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SelvageError');
    expect(err.code).toBe('INVALID_MESSAGE');
    expect(err.context).toEqual({ step: 'decode' });
  });

  it('builds connection-related errors with deterministic messages', () => {
    const missing = connectionNotFound('conn-1');
    const duplicate = duplicateClientId('client-7');
    const inactive = connectionNotActive('conn-2');
    const handshake = handshakeAlreadyComplete('conn-9');

    expect(missing.code).toBe('CONNECTION_NOT_FOUND');
    expect(missing.message).toContain('conn-1');
    expect(duplicate.code).toBe('DUPLICATE_CLIENT_ID');
    expect(duplicate.context).toEqual({ clientId: 'client-7' });
    expect(inactive.code).toBe('CONNECTION_NOT_ACTIVE');
    expect(handshake.code).toBe('HANDSHAKE_ALREADY_COMPLETE');
  });

  it('builds protocol and payload errors with bounds context', () => {
    const invalid = invalidMessage('missing type');
    const mismatch = protocolVersionMismatch(1, 4);
    const tooLarge = messageTooLarge(80_000, 65_536);

    expect(invalid.code).toBe('INVALID_MESSAGE');
    expect(invalid.context).toEqual({ reason: 'missing type' });

    expect(mismatch.code).toBe('PROTOCOL_VERSION_MISMATCH');
    expect(mismatch.message).toContain('expected 1');
    expect(mismatch.context).toEqual({ expected: 1, received: 4 });

    expect(tooLarge.code).toBe('MESSAGE_TOO_LARGE');
    expect(tooLarge.context).toEqual({ size: 80000, maxSize: 65536 });
  });

  it('builds rate-limited error preserving connection id', () => {
    const err = rateLimited('conn-42');

    expect(err.code).toBe('RATE_LIMITED');
    expect(err.message).toContain('conn-42');
    expect(err.context).toEqual({ connectionId: 'conn-42' });
  });
});
