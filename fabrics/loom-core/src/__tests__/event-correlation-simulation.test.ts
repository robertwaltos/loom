import { describe, expect, it } from 'vitest';
import { createEventCorrelationEngine } from '../event-correlation.js';

describe('event-correlation simulation', () => {
  it('simulates causation trees and correlation-group analytics', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createEventCorrelationEngine({
      clock: { nowMicroseconds: () => (now += 50_000) },
      idGenerator: { next: () => `corr-${++id}` },
    });

    engine.addEvent({ eventId: 'e1', eventType: 'quest.started', correlationId: 'session-1' });
    engine.addEvent({
      eventId: 'e2',
      eventType: 'npc.alerted',
      correlationId: 'session-1',
      causationId: 'e1',
    });
    engine.addEvent({
      eventId: 'e3',
      eventType: 'combat.started',
      correlationId: 'session-1',
      causationId: 'e2',
    });

    const chain = engine.getChain('e3');
    const group = engine.getGroup('session-1');

    expect(chain.map((event) => event.eventId)).toEqual(['e1', 'e2', 'e3']);
    expect(group?.events).toHaveLength(3);
    expect(group?.depth).toBe(2);
    expect(engine.getStats().maxChainDepth).toBe(2);
  });
});
