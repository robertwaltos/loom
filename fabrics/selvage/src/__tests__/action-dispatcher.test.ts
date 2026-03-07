import { describe, it, expect } from 'vitest';
import { createActionDispatcher } from '../action-dispatcher.js';
import type {
  ActionDispatcher,
  ActionDispatcherDeps,
  ActionHandler,
  ActionRequest,
} from '../action-dispatcher.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createTestDispatcher(): ActionDispatcher {
  let time = 1_000_000;
  const deps: ActionDispatcherDeps = {
    clock: { nowMicroseconds: () => time++ },
  };
  return createActionDispatcher(deps);
}

function handler(
  actionType: string,
  outcome: 'success' | 'rejected' | 'error' = 'success',
  message = 'OK',
): ActionHandler {
  return {
    actionType,
    description: 'Test handler for ' + actionType,
    execute: () => ({ outcome, message }),
  };
}

function request(overrides?: Partial<ActionRequest>): ActionRequest {
  return {
    actionType: 'trade_kalon',
    dynastyId: 'dyn-1',
    worldId: 'world-1',
    payload: {},
    ...overrides,
  };
}

// ─── Registration ───────────────────────────────────────────────────

describe('Action dispatcher registration', () => {
  it('starts with zero handlers', () => {
    const d = createTestDispatcher();
    expect(d.handlerCount()).toBe(0);
    expect(d.listActionTypes()).toHaveLength(0);
  });

  it('registers a handler', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon'));
    expect(d.handlerCount()).toBe(1);
    expect(d.hasHandler('trade_kalon')).toBe(true);
  });

  it('lists registered action types', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon'));
    d.registerHandler(handler('found_dynasty'));
    expect(d.listActionTypes()).toContain('trade_kalon');
    expect(d.listActionTypes()).toContain('found_dynasty');
  });

  it('overwrites handler with same type', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon', 'success'));
    d.registerHandler(handler('trade_kalon', 'rejected'));
    expect(d.handlerCount()).toBe(1);
    const result = d.dispatch(request());
    expect(result.outcome).toBe('rejected');
  });

  it('removes a handler', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon'));
    expect(d.removeHandler('trade_kalon')).toBe(true);
    expect(d.handlerCount()).toBe(0);
  });

  it('returns false when removing nonexistent handler', () => {
    const d = createTestDispatcher();
    expect(d.removeHandler('nope')).toBe(false);
  });
});

// ─── Dispatch ───────────────────────────────────────────────────────

describe('Action dispatcher dispatch', () => {
  it('dispatches to registered handler', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon', 'success', 'Trade complete'));
    const result = d.dispatch(request());
    expect(result.outcome).toBe('success');
    expect(result.message).toBe('Trade complete');
    expect(result.actionType).toBe('trade_kalon');
  });

  it('returns error for unknown action', () => {
    const d = createTestDispatcher();
    const result = d.dispatch(request({ actionType: 'unknown' }));
    expect(result.outcome).toBe('error');
    expect(result.message).toContain('No handler');
  });

  it('includes duration in result', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon'));
    const result = d.dispatch(request());
    expect(result.durationMicroseconds).toBeGreaterThanOrEqual(0);
  });

  it('passes request to handler', () => {
    const d = createTestDispatcher();
    const captured: ActionRequest[] = [];
    d.registerHandler({
      actionType: 'trade_kalon',
      description: 'Capture handler',
      execute: (req) => {
        captured.push(req);
        return { outcome: 'success', message: 'OK' };
      },
    });
    d.dispatch(request({ dynastyId: 'dyn-99', worldId: 'world-7' }));
    expect(captured).toHaveLength(1);
    expect(captured[0]?.dynastyId).toBe('dyn-99');
    expect(captured[0]?.worldId).toBe('world-7');
  });
});

// ─── Batch Dispatch ─────────────────────────────────────────────────

describe('Action dispatcher batch', () => {
  it('dispatches multiple actions', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon', 'success'));
    d.registerHandler(handler('found_dynasty', 'rejected', 'Not allowed'));
    const results = d.dispatchBatch([
      request({ actionType: 'trade_kalon' }),
      request({ actionType: 'found_dynasty' }),
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]?.outcome).toBe('success');
    expect(results[1]?.outcome).toBe('rejected');
  });

  it('returns empty for empty batch', () => {
    const d = createTestDispatcher();
    expect(d.dispatchBatch([])).toHaveLength(0);
  });

  it('handles mix of known and unknown actions', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon'));
    const results = d.dispatchBatch([
      request({ actionType: 'trade_kalon' }),
      request({ actionType: 'unknown' }),
    ]);
    expect(results[0]?.outcome).toBe('success');
    expect(results[1]?.outcome).toBe('error');
  });
});

// ─── Stats ──────────────────────────────────────────────────────────

describe('Action dispatcher stats', () => {
  it('starts with zero stats', () => {
    const d = createTestDispatcher();
    const stats = d.getStats();
    expect(stats.totalDispatched).toBe(0);
    expect(stats.successCount).toBe(0);
    expect(stats.rejectedCount).toBe(0);
    expect(stats.errorCount).toBe(0);
    expect(stats.unknownActionCount).toBe(0);
  });

  it('tracks successful dispatches', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon', 'success'));
    d.dispatch(request());
    d.dispatch(request());
    const stats = d.getStats();
    expect(stats.totalDispatched).toBe(2);
    expect(stats.successCount).toBe(2);
  });

  it('tracks rejected dispatches', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon', 'rejected'));
    d.dispatch(request());
    const stats = d.getStats();
    expect(stats.rejectedCount).toBe(1);
  });

  it('tracks error dispatches', () => {
    const d = createTestDispatcher();
    d.registerHandler(handler('trade_kalon', 'error'));
    d.dispatch(request());
    const stats = d.getStats();
    expect(stats.errorCount).toBe(1);
  });

  it('tracks unknown action count separately', () => {
    const d = createTestDispatcher();
    d.dispatch(request({ actionType: 'unknown' }));
    const stats = d.getStats();
    expect(stats.unknownActionCount).toBe(1);
    expect(stats.errorCount).toBe(0);
  });
});
