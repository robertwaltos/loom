import { describe, it, expect } from 'vitest';
import { createActionDispatcher } from '../action-dispatcher.js';
import type {
  ActionDispatcherDeps,
  ActionHandler,
  ActionRequest,
} from '../action-dispatcher.js';

function makeDeps(): ActionDispatcherDeps {
  let time = 1_000_000;
  return { clock: { nowMicroseconds: () => time++ } };
}

function makeHandler(
  actionType: string,
  outcome: 'success' | 'rejected' | 'error' = 'success',
): ActionHandler {
  return {
    actionType,
    description: `Handler for ${actionType}`,
    execute: () => ({ outcome, message: `${actionType} result` }),
  };
}

function makeRequest(actionType: string): ActionRequest {
  return {
    actionType,
    dynastyId: 'dynasty-1',
    worldId: 'world-aethel',
    payload: { amount: 42 },
  };
}

describe('Action Dispatcher Simulation', () => {
  it('routes requests to registered handlers and tracks stats', () => {
    const dispatcher = createActionDispatcher(makeDeps());

    dispatcher.registerHandler(makeHandler('trade_kalon'));
    dispatcher.registerHandler(makeHandler('found_dynasty'));
    dispatcher.registerHandler(makeHandler('bad_action', 'rejected'));

    expect(dispatcher.handlerCount()).toBe(3);
    expect(dispatcher.hasHandler('trade_kalon')).toBe(true);

    const r1 = dispatcher.dispatch(makeRequest('trade_kalon'));
    expect(r1.outcome).toBe('success');
    expect(r1.durationMicroseconds).toBeGreaterThanOrEqual(0);

    const r2 = dispatcher.dispatch(makeRequest('bad_action'));
    expect(r2.outcome).toBe('rejected');

    const r3 = dispatcher.dispatch(makeRequest('unknown_action'));
    expect(r3.outcome).toBe('error');

    const stats = dispatcher.getStats();
    expect(stats.totalDispatched).toBe(3);
    expect(stats.successCount).toBe(1);
    expect(stats.rejectedCount).toBe(1);
    expect(stats.unknownActionCount).toBe(1);
  });

  it('processes a batch of requests atomically', () => {
    const dispatcher = createActionDispatcher(makeDeps());
    dispatcher.registerHandler(makeHandler('move', 'success'));
    dispatcher.registerHandler(makeHandler('attack', 'success'));

    const batch: ActionRequest[] = [
      makeRequest('move'),
      makeRequest('attack'),
      makeRequest('unknown'),
    ];

    const results = dispatcher.dispatchBatch(batch);
    expect(results).toHaveLength(3);
    expect(results[0]?.outcome).toBe('success');
    expect(results[1]?.outcome).toBe('success');
    expect(results[2]?.outcome).toBe('error');
  });

  it('overwrites handlers and respects removal', () => {
    const dispatcher = createActionDispatcher(makeDeps());
    dispatcher.registerHandler(makeHandler('cast_spell', 'error'));
    dispatcher.registerHandler(makeHandler('cast_spell', 'success'));

    expect(dispatcher.handlerCount()).toBe(1);
    expect(dispatcher.dispatch(makeRequest('cast_spell')).outcome).toBe('success');

    expect(dispatcher.removeHandler('cast_spell')).toBe(true);
    expect(dispatcher.hasHandler('cast_spell')).toBe(false);

    const after = dispatcher.dispatch(makeRequest('cast_spell'));
    const stats = dispatcher.getStats();
    expect(stats.unknownActionCount).toBe(1);
    expect(after.outcome).toBe('error');
  });
});
