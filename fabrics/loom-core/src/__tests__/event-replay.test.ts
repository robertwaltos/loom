import { describe, it, expect } from 'vitest';
import { createEventReplayService } from '../event-replay.js';
import type { EventReplayDeps, ReplayEvent, ReplayFilter } from '../event-replay.js';

function makeEvent(
  id: string,
  type: string,
  ts: number,
): ReplayEvent {
  return {
    eventId: id,
    eventType: type,
    payload: '{}',
    timestamp: ts,
    correlationId: null,
  };
}

function makeDeps(events?: ReplayEvent[]): EventReplayDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    eventSource: {
      fetch: (_filter: ReplayFilter) => events ?? [],
    },
    idGenerator: { next: () => 'session-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('EventReplayService — handler registration', () => {
  it('registers a handler for an event type', () => {
    const service = createEventReplayService(makeDeps());
    expect(service.registerHandler('entity.created', () => {})).toBe(true);
  });

  it('rejects duplicate handler registration', () => {
    const service = createEventReplayService(makeDeps());
    service.registerHandler('entity.created', () => {});
    expect(service.registerHandler('entity.created', () => {})).toBe(false);
  });

  it('removes a handler', () => {
    const service = createEventReplayService(makeDeps());
    service.registerHandler('entity.created', () => {});
    expect(service.removeHandler('entity.created')).toBe(true);
    expect(service.removeHandler('entity.created')).toBe(false);
  });
});

describe('EventReplayService — replay execution', () => {
  it('replays events through registered handlers', () => {
    const events = [
      makeEvent('e1', 'entity.created', 100),
      makeEvent('e2', 'entity.created', 200),
    ];
    const service = createEventReplayService(makeDeps(events));
    const received: string[] = [];
    service.registerHandler('entity.created', (e) => received.push(e.eventId));
    const session = service.replay({});
    expect(session.eventsReplayed).toBe(2);
    expect(received).toEqual(['e1', 'e2']);
  });

  it('skips events without handlers', () => {
    const events = [
      makeEvent('e1', 'entity.created', 100),
      makeEvent('e2', 'world.loaded', 200),
    ];
    const service = createEventReplayService(makeDeps(events));
    service.registerHandler('entity.created', () => {});
    const session = service.replay({});
    expect(session.eventsReplayed).toBe(1);
    expect(session.eventsSkipped).toBe(1);
  });

  it('completes session with status', () => {
    const service = createEventReplayService(makeDeps());
    const session = service.replay({});
    expect(session.status).toBe('completed');
    expect(session.completedAt).toBeGreaterThan(0);
  });
});

describe('EventReplayService — empty replay', () => {
  it('handles empty event source', () => {
    const service = createEventReplayService(makeDeps([]));
    service.registerHandler('entity.created', () => {});
    const session = service.replay({});
    expect(session.eventsReplayed).toBe(0);
    expect(session.eventsSkipped).toBe(0);
  });

  it('handles no registered handlers', () => {
    const events = [makeEvent('e1', 'entity.created', 100)];
    const service = createEventReplayService(makeDeps(events));
    const session = service.replay({});
    expect(session.eventsSkipped).toBe(1);
  });
});

describe('EventReplayService — session tracking', () => {
  it('retrieves a session by id', () => {
    const service = createEventReplayService(makeDeps());
    const session = service.replay({});
    expect(service.getSession(session.sessionId)?.status).toBe('completed');
  });

  it('returns undefined for unknown session', () => {
    const service = createEventReplayService(makeDeps());
    expect(service.getSession('unknown')).toBeUndefined();
  });

  it('returns last session', () => {
    const service = createEventReplayService(makeDeps());
    service.replay({});
    const second = service.replay({});
    expect(service.getLastSession()?.sessionId).toBe(second.sessionId);
  });

  it('returns undefined when no sessions', () => {
    const service = createEventReplayService(makeDeps());
    expect(service.getLastSession()).toBeUndefined();
  });
});

describe('EventReplayService — filter passing', () => {
  it('passes filter to event source', () => {
    let capturedFilter: ReplayFilter | undefined;
    const deps: EventReplayDeps = {
      ...makeDeps(),
      eventSource: {
        fetch: (f) => { capturedFilter = f; return []; },
      },
    };
    const service = createEventReplayService(deps);
    service.replay({ fromTimestamp: 100, toTimestamp: 500, eventTypes: ['tick'] });
    expect(capturedFilter?.fromTimestamp).toBe(100);
    expect(capturedFilter?.toTimestamp).toBe(500);
    expect(capturedFilter?.eventTypes).toEqual(['tick']);
  });
});

describe('EventReplayService — stats', () => {
  it('tracks aggregate statistics', () => {
    const events = [makeEvent('e1', 'entity.created', 100)];
    const service = createEventReplayService(makeDeps(events));
    service.registerHandler('entity.created', () => {});
    service.replay({});
    service.replay({});

    const stats = service.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalEventsReplayed).toBe(2);
    expect(stats.activeHandlers).toBe(1);
  });

  it('starts with zero stats', () => {
    const service = createEventReplayService(makeDeps());
    const stats = service.getStats();
    expect(stats.totalSessions).toBe(0);
    expect(stats.totalEventsReplayed).toBe(0);
  });
});
