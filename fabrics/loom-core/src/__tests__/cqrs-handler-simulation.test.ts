import { describe, expect, it } from 'vitest';
import { createCqrsHandler } from '../cqrs-handler.js';

describe('cqrs-handler simulation', () => {
  it('simulates command+query flow with execution logging', () => {
    let now = 1_000_000;
    let id = 0;
    const cqrs = createCqrsHandler({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `cqrs-${id++}` },
    });

    cqrs.registerCommandHandler('entity.spawn', (payload) => ({ entityId: payload['entityId'] }));
    cqrs.registerQueryHandler('entity.get', (payload) => ({ entityId: payload['entityId'], found: true }));

    const cmd = cqrs.executeCommand({
      commandType: 'entity.spawn',
      payload: { entityId: 'e-1' },
      issuedBy: 'player-1',
      correlationId: 'corr-1',
    });
    const qry = cqrs.executeQuery({
      queryType: 'entity.get',
      payload: { entityId: 'e-1' },
      issuedBy: 'player-1',
      correlationId: 'corr-2',
    });

    expect(cmd.success).toBe(true);
    expect(qry.success).toBe(true);
    expect(cqrs.getExecutionLog(10).length).toBeGreaterThanOrEqual(2);
  });
});
