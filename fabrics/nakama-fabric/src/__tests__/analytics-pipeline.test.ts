import { describe, it, expect } from 'vitest';
import {
  createAnalyticsPipeline,
  type AnalyticsEvent,
  type AnalyticsEventType,
} from '../analytics-pipeline.js';

describe('AnalyticsPipeline', () => {
  it('track() adds to pending buffer', () => {
    const pipeline = createAnalyticsPipeline();
    pipeline.track('game_start', 'player-1');
    expect(pipeline.pendingCount()).toBe(1);
  });

  it('auto-flush triggers at batchSize', () => {
    const batches: ReadonlyArray<AnalyticsEvent>[] = [];
    const pipeline = createAnalyticsPipeline({ batchSize: 3 });
    pipeline.addSink((events) => {
      batches.push(events);
    });

    pipeline.track('game_start', 'p1');
    pipeline.track('game_start', 'p2');
    expect(batches.length).toBe(0);
    pipeline.track('game_start', 'p3');
    expect(batches.length).toBe(1);
    expect(batches.at(0)).toHaveLength(3);
    expect(pipeline.pendingCount()).toBe(0);
  });

  it('flush() delivers all buffered events to sinks and clears buffer', async () => {
    const batches: ReadonlyArray<AnalyticsEvent>[] = [];
    const pipeline = createAnalyticsPipeline();
    pipeline.addSink((events) => {
      batches.push(events);
    });

    pipeline.track('game_end', 'p1');
    pipeline.track('world_enter', 'p2');
    expect(pipeline.pendingCount()).toBe(2);

    await pipeline.flush();
    expect(batches.length).toBe(1);
    expect(batches.at(0)).toHaveLength(2);
    expect(pipeline.pendingCount()).toBe(0);
  });

  it('multiple sinks receive the same batch', async () => {
    const received1: ReadonlyArray<AnalyticsEvent>[] = [];
    const received2: ReadonlyArray<AnalyticsEvent>[] = [];
    const pipeline = createAnalyticsPipeline();
    pipeline.addSink((events) => {
      received1.push(events);
    });
    pipeline.addSink((events) => {
      received2.push(events);
    });

    pipeline.track('player_death', 'p1');
    await pipeline.flush();

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
    expect(received1.at(0)).toEqual(received2.at(0));
  });

  it('sink error does not break other sinks', async () => {
    const goodSinkBatches: ReadonlyArray<AnalyticsEvent>[] = [];
    const pipeline = createAnalyticsPipeline();
    pipeline.addSink(() => {
      throw new Error('bad sink');
    });
    pipeline.addSink((events) => {
      goodSinkBatches.push(events);
    });

    pipeline.track('game_start', 'p1');
    await pipeline.flush();

    expect(goodSinkBatches).toHaveLength(1);
  });

  it('worldId and sessionId are propagated from context', async () => {
    const events: AnalyticsEvent[] = [];
    const pipeline = createAnalyticsPipeline();
    pipeline.addSink((batch) => {
      batch.forEach((e) => events.push(e));
    });

    pipeline.track('world_enter', 'p1', {}, { worldId: 'world-alpha', sessionId: 'sess-42' });
    await pipeline.flush();

    const event = events.at(0);
    expect(event?.worldId).toBe('world-alpha');
    expect(event?.sessionId).toBe('sess-42');
  });

  it('null playerId is preserved in the event', async () => {
    const events: AnalyticsEvent[] = [];
    const pipeline = createAnalyticsPipeline();
    pipeline.addSink((batch) => {
      batch.forEach((e) => events.push(e));
    });

    pipeline.track('auth_register', null);
    await pipeline.flush();

    expect(events.at(0)?.playerId).toBeNull();
  });

  it('totalTracked() counts all events including auto-flushed ones', async () => {
    const pipeline = createAnalyticsPipeline({ batchSize: 2 });

    pipeline.track('game_start', 'p1');
    pipeline.track('game_end', 'p1'); // triggers auto-flush
    pipeline.track('world_enter', 'p1');

    expect(pipeline.totalTracked()).toBe(3);

    await pipeline.flush();
    expect(pipeline.totalTracked()).toBe(3);
  });

  it('pendingCount() resets to zero after flush', async () => {
    const pipeline = createAnalyticsPipeline();
    pipeline.track('game_start', 'p1');
    pipeline.track('game_end', 'p1');

    expect(pipeline.pendingCount()).toBe(2);
    await pipeline.flush();
    expect(pipeline.pendingCount()).toBe(0);
  });

  it('properties are passed through to the event unchanged', async () => {
    const events: AnalyticsEvent[] = [];
    const pipeline = createAnalyticsPipeline();
    pipeline.addSink((batch) => {
      batch.forEach((e) => events.push(e));
    });

    const props = { damage: 42, weapon: 'sword', critical: true };
    pipeline.track('player_death', 'p1', props);
    await pipeline.flush();

    expect(events.at(0)?.properties).toEqual(props);
  });

  it('all 14 event types are accepted without error', () => {
    const pipeline = createAnalyticsPipeline();
    const eventTypes: AnalyticsEventType[] = [
      'game_start',
      'game_end',
      'world_enter',
      'world_exit',
      'player_death',
      'economy_tx',
      'achievement_unlock',
      'chronicle_submit',
      'support_report',
      'auth_register',
      'auth_login',
      'matchmaking_join',
      'matchmaking_match',
      'error_occurred',
    ];

    expect(() => {
      for (const type of eventTypes) {
        pipeline.track(type, 'p1');
      }
    }).not.toThrow();

    expect(pipeline.pendingCount()).toBe(14);
  });

  it('idGenerator is used to generate eventId', async () => {
    const events: AnalyticsEvent[] = [];
    let counter = 0;
    const idGenerator = (): string => `custom-${(counter += 1)}`;
    const pipeline = createAnalyticsPipeline({ idGenerator });
    pipeline.addSink((batch) => {
      batch.forEach((e) => events.push(e));
    });

    pipeline.track('game_start', 'p1');
    pipeline.track('game_end', 'p1');
    await pipeline.flush();

    expect(events.at(0)?.eventId).toBe('custom-1');
    expect(events.at(1)?.eventId).toBe('custom-2');
  });
});
