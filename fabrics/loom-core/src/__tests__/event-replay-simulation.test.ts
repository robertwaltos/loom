import { describe, expect, it } from 'vitest';
import { createEventReplayService } from '../event-replay.js';

describe('event-replay simulation', () => {
  it('simulates historical replay through registered handlers and session tracking', () => {
    const sourceEvents = [
      {
        eventId: 'evt-1',
        eventType: 'entity.spawned',
        payload: '{}',
        timestamp: 100,
        correlationId: null,
      },
      {
        eventId: 'evt-2',
        eventType: 'entity.spawned',
        payload: '{}',
        timestamp: 200,
        correlationId: null,
      },
      {
        eventId: 'evt-3',
        eventType: 'tick',
        payload: '{}',
        timestamp: 300,
        correlationId: null,
      },
    ];

    let id = 0;
    let now = 1_000_000;
    const service = createEventReplayService({
      eventSource: {
        fetch: () => sourceEvents,
      },
      idGenerator: { next: () => `session-${++id}` },
      clock: { nowMicroseconds: () => (now += 1_000) },
    });

    const handled: string[] = [];
    service.registerHandler('entity.spawned', (event) => {
      handled.push(event.eventId);
    });
    const session = service.replay({ fromTimestamp: 0, toTimestamp: 400 });

    expect(handled).toEqual(['evt-1', 'evt-2']);
    expect(session.eventsReplayed).toBe(2);
    expect(session.eventsSkipped).toBe(1);
    expect(service.getLastSession()?.sessionId).toBe(session.sessionId);
  });
});
