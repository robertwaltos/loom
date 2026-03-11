import { describe, it, expect } from 'vitest';
import {
  WeaveError,
  nodeNotFound,
  nodeAlreadyExists,
  routeNotFound,
  lockNotFound,
  lockAlreadyExists,
  lockInvalidTransition,
  coherenceOutOfRange,
  beaconInvalidStatus,
  transitFailed,
} from '../weave-errors.js';

describe('WeaveError structure', () => {
  it('carries code and context', () => {
    const err = nodeNotFound('node-1');
    expect(err).toBeInstanceOf(WeaveError);
    expect(err.code).toBe('NODE_NOT_FOUND');
    expect(err.context).toEqual({ nodeId: 'node-1' });
    expect(err.name).toBe('WeaveError');
  });

  it('is an instance of Error', () => {
    const err = lockNotFound('lock-1');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('WeaveError factories', () => {
  it('nodeAlreadyExists', () => {
    const err = nodeAlreadyExists('n-1');
    expect(err.code).toBe('NODE_ALREADY_EXISTS');
    expect(err.message).toContain('n-1');
  });

  it('routeNotFound', () => {
    const err = routeNotFound('a', 'b');
    expect(err.code).toBe('ROUTE_NOT_FOUND');
    expect(err.context).toEqual({ originId: 'a', destinationId: 'b' });
  });

  it('lockAlreadyExists', () => {
    const err = lockAlreadyExists('l-1');
    expect(err.code).toBe('LOCK_ALREADY_EXISTS');
  });

  it('lockInvalidTransition', () => {
    const err = lockInvalidTransition('l-1', 'a', 'b');
    expect(err.code).toBe('LOCK_INVALID_TRANSITION');
    expect(err.context).toEqual({ lockId: 'l-1', from: 'a', to: 'b' });
  });

  it('coherenceOutOfRange', () => {
    const err = coherenceOutOfRange('l-1', 1.5);
    expect(err.code).toBe('COHERENCE_OUT_OF_RANGE');
  });

  it('beaconInvalidStatus', () => {
    const err = beaconInvalidStatus('n-1', 'bad');
    expect(err.code).toBe('BEACON_INVALID_STATUS');
  });

  it('transitFailed', () => {
    const err = transitFailed('l-1', 'field disruption');
    expect(err.code).toBe('TRANSIT_FAILED');
    expect(err.context).toEqual({ lockId: 'l-1', reason: 'field disruption' });
  });
});
