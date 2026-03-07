/**
 * Selvage Errors — Structured error types for the network gateway.
 *
 * Every error carries a code and context for diagnostics.
 */

export type SelvageErrorCode =
  | 'CONNECTION_NOT_FOUND'
  | 'DUPLICATE_CLIENT_ID'
  | 'CONNECTION_NOT_ACTIVE'
  | 'HANDSHAKE_ALREADY_COMPLETE'
  | 'INVALID_MESSAGE'
  | 'PROTOCOL_VERSION_MISMATCH'
  | 'MESSAGE_TOO_LARGE'
  | 'RATE_LIMITED';

export class SelvageError extends Error {
  readonly code: SelvageErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: SelvageErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'SelvageError';
    this.code = code;
    this.context = context;
  }
}

export function connectionNotFound(connectionId: string): SelvageError {
  return new SelvageError('CONNECTION_NOT_FOUND', `Connection ${connectionId} not found`, {
    connectionId,
  });
}

export function duplicateClientId(clientId: string): SelvageError {
  return new SelvageError('DUPLICATE_CLIENT_ID', `Client ${clientId} already connected`, {
    clientId,
  });
}

export function connectionNotActive(connectionId: string): SelvageError {
  return new SelvageError('CONNECTION_NOT_ACTIVE', `Connection ${connectionId} not active`, {
    connectionId,
  });
}

export function handshakeAlreadyComplete(connectionId: string): SelvageError {
  return new SelvageError(
    'HANDSHAKE_ALREADY_COMPLETE',
    `Handshake already completed for ${connectionId}`,
    { connectionId },
  );
}

export function invalidMessage(reason: string): SelvageError {
  return new SelvageError('INVALID_MESSAGE', `Invalid message: ${reason}`, { reason });
}

export function protocolVersionMismatch(expected: number, received: number): SelvageError {
  return new SelvageError(
    'PROTOCOL_VERSION_MISMATCH',
    `Protocol version mismatch: expected ${String(expected)}, got ${String(received)}`,
    { expected, received },
  );
}

export function messageTooLarge(size: number, maxSize: number): SelvageError {
  return new SelvageError(
    'MESSAGE_TOO_LARGE',
    `Message size ${String(size)} exceeds limit ${String(maxSize)}`,
    { size, maxSize },
  );
}

export function rateLimited(connectionId: string): SelvageError {
  return new SelvageError('RATE_LIMITED', `Connection ${connectionId} rate limited`, {
    connectionId,
  });
}
