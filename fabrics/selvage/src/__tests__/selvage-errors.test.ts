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

describe('SelvageError', () => {
  it('is an instance of Error with name SelvageError', () => {
    const err = new SelvageError('INVALID_MESSAGE', 'bad msg');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SelvageError');
    expect(err.code).toBe('INVALID_MESSAGE');
    expect(err.context).toEqual({});
  });

  it('stores provided context', () => {
    const err = new SelvageError('RATE_LIMITED', 'too fast', { connectionId: 'c1' });
    expect(err.context['connectionId']).toBe('c1');
  });
});

describe('connectionNotFound', () => {
  it('has correct code and context', () => {
    const err = connectionNotFound('conn-1');
    expect(err.code).toBe('CONNECTION_NOT_FOUND');
    expect(err.context['connectionId']).toBe('conn-1');
  });
});

describe('duplicateClientId', () => {
  it('has correct code and clientId context', () => {
    const err = duplicateClientId('client-x');
    expect(err.code).toBe('DUPLICATE_CLIENT_ID');
    expect(err.context['clientId']).toBe('client-x');
  });
});

describe('connectionNotActive', () => {
  it('has correct code', () => {
    expect(connectionNotActive('c1').code).toBe('CONNECTION_NOT_ACTIVE');
  });
});

describe('handshakeAlreadyComplete', () => {
  it('includes connectionId', () => {
    const err = handshakeAlreadyComplete('c1');
    expect(err.code).toBe('HANDSHAKE_ALREADY_COMPLETE');
    expect(err.context['connectionId']).toBe('c1');
  });
});

describe('invalidMessage', () => {
  it('stores reason in context', () => {
    const err = invalidMessage('missing field');
    expect(err.code).toBe('INVALID_MESSAGE');
    expect(err.context['reason']).toBe('missing field');
  });
});

describe('protocolVersionMismatch', () => {
  it('stores expected and received versions', () => {
    const err = protocolVersionMismatch(3, 2);
    expect(err.code).toBe('PROTOCOL_VERSION_MISMATCH');
    expect(err.context['expected']).toBe(3);
    expect(err.context['received']).toBe(2);
  });
});

describe('messageTooLarge', () => {
  it('stores size and maxSize', () => {
    const err = messageTooLarge(512, 256);
    expect(err.code).toBe('MESSAGE_TOO_LARGE');
    expect(err.context['size']).toBe(512);
    expect(err.context['maxSize']).toBe(256);
  });
});

describe('rateLimited', () => {
  it('includes connectionId', () => {
    const err = rateLimited('c1');
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.context['connectionId']).toBe('c1');
  });
});
