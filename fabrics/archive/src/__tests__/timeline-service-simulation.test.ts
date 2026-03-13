import { describe, expect, it } from 'vitest';
import {
  createTimelineService,
  DEFAULT_ZOOM_LEVEL,
  MAX_ANNOTATIONS,
  MAX_EVENTS_PER_TIMELINE,
  type TimelineDeps,
  type TimelineError,
  type TimelineInfo,
} from '../timeline-service.js';

function createDeps(): TimelineDeps {
  let id = 0;
  let now = 1_000;
  return {
    idGenerator: {
      generate: () => `tl-${++id}`,
    },
    clock: {
      nowMicroseconds: () => ++now,
    },
  };
}

function isTimelineInfo(value: TimelineInfo | TimelineError): value is TimelineInfo {
  return typeof value !== 'string';
}

describe('TimelineService simulation', () => {
  it('creates timeline and rejects duplicate scope+scopeId', () => {
    const service = createTimelineService(createDeps());

    const created = service.createTimeline('world', 'world-1');
    const duplicate = service.createTimeline('world', 'world-1');

    expect(isTimelineInfo(created)).toBe(true);
    expect(duplicate).toBe('TIMELINE_ALREADY_EXISTS');
  });

  it('adds events with default description/metadata and builds view totals', () => {
    const service = createTimelineService(createDeps());
    const created = service.createTimeline('dynasty', 'dyn-1');
    if (!isTimelineInfo(created)) throw new Error('expected timeline');

    const event = service.addEvent(created.timelineId, {
      timestamp: 500,
      category: 'combat',
      title: 'Siege',
    });
    if (typeof event === 'string') throw new Error('expected event');

    const view = service.getView(created.timelineId);
    if (typeof view === 'string') throw new Error('expected view');

    expect(event.description).toBe('');
    expect(event.metadata).toBe('');
    expect(view.totalEvents).toBe(1);
    expect(view.events[0]?.title).toBe('Siege');
  });

  it('returns TIMELINE_NOT_FOUND for timeline-scoped operations on unknown ids', () => {
    const service = createTimelineService(createDeps());

    expect(service.addEvent('missing', { timestamp: 1, category: 'a', title: 'b' })).toBe('TIMELINE_NOT_FOUND');
    expect(service.addPeriod('missing', { startTime: 1, endTime: 2, label: 'x' })).toBe('TIMELINE_NOT_FOUND');
    expect(service.getView('missing')).toBe('TIMELINE_NOT_FOUND');
    expect(service.zoomToRange('missing', 1, 2)).toBe('TIMELINE_NOT_FOUND');
    expect(service.filterByCategory('missing', 'combat')).toBe('TIMELINE_NOT_FOUND');
  });

  it('enforces valid period and zoom ranges', () => {
    const service = createTimelineService(createDeps());
    const created = service.createTimeline('world', 'w-1');
    if (!isTimelineInfo(created)) throw new Error('expected timeline');

    const badPeriod = service.addPeriod(created.timelineId, {
      startTime: 10,
      endTime: 10,
      label: 'bad',
    });
    const badZoom = service.zoomToRange(created.timelineId, 20, 10);

    expect(badPeriod).toBe('INVALID_TIME_RANGE');
    expect(badZoom).toBe('INVALID_TIME_RANGE');
  });

  it('supports category filter and zoom range filtering', () => {
    const service = createTimelineService(createDeps());
    const created = service.createTimeline('global', 'all');
    if (!isTimelineInfo(created)) throw new Error('expected timeline');

    service.addEvent(created.timelineId, { timestamp: 100, category: 'combat', title: 'A' });
    service.addEvent(created.timelineId, { timestamp: 200, category: 'politics', title: 'B' });
    service.addEvent(created.timelineId, { timestamp: 300, category: 'combat', title: 'C' });
    service.addPeriod(created.timelineId, { startTime: 80, endTime: 250, label: 'Era A', category: 'combat' });
    service.addPeriod(created.timelineId, { startTime: 260, endTime: 500, label: 'Era B', category: 'politics' });

    const filtered = service.filterByCategory(created.timelineId, 'combat');
    if (typeof filtered === 'string') throw new Error('expected filtered view');
    expect(filtered.events).toHaveLength(2);
    expect(filtered.periods).toHaveLength(1);

    const zoomed = service.zoomToRange(created.timelineId, 150, 350);
    if (typeof zoomed === 'string') throw new Error('expected zoomed view');
    expect(zoomed.events).toHaveLength(2);
    expect(zoomed.periods).toHaveLength(2);
  });

  it('stores annotations and enforces annotation cap', () => {
    const service = createTimelineService(createDeps());
    const created = service.createTimeline('world', 'w-2');
    if (!isTimelineInfo(created)) throw new Error('expected timeline');
    const event = service.addEvent(created.timelineId, { timestamp: 1, category: 'x', title: 'evt' });
    if (typeof event === 'string') throw new Error('expected event');

    for (let i = 0; i < MAX_ANNOTATIONS; i++) {
      const result = service.annotateEvent(event.eventId, { text: `note-${i}`, author: 'mod' });
      expect(typeof result).toBe('object');
    }

    const capped = service.annotateEvent(event.eventId, { text: 'overflow', author: 'mod' });
    expect(capped).toBe('MAX_ANNOTATIONS_REACHED');
    expect(service.getAnnotations(event.eventId)).toHaveLength(MAX_ANNOTATIONS);
    expect(service.annotateEvent('missing', { text: 'x', author: 'y' })).toBe('EVENT_NOT_FOUND');
  });

  it('enforces max events per timeline', () => {
    const service = createTimelineService(createDeps());
    const created = service.createTimeline('world', 'w-max');
    if (!isTimelineInfo(created)) throw new Error('expected timeline');

    for (let i = 0; i < MAX_EVENTS_PER_TIMELINE; i++) {
      const result = service.addEvent(created.timelineId, {
        timestamp: i,
        category: 'load',
        title: `event-${i}`,
      });
      if (typeof result === 'string') throw new Error('expected event insertion before cap');
    }

    const overflow = service.addEvent(created.timelineId, {
      timestamp: 999_999,
      category: 'load',
      title: 'overflow',
    });
    expect(overflow).toBe('MAX_EVENTS_REACHED');
  });

  it('merges timelines into new target and copies events+periods', () => {
    const service = createTimelineService(createDeps());
    const t1 = service.createTimeline('world', 'w-a');
    const t2 = service.createTimeline('world', 'w-b');
    if (!isTimelineInfo(t1) || !isTimelineInfo(t2)) throw new Error('expected timelines');

    service.addEvent(t1.timelineId, { timestamp: 100, category: 'economy', title: 'tax' });
    service.addPeriod(t1.timelineId, { startTime: 90, endTime: 200, label: 'P1', category: 'economy' });
    service.addEvent(t2.timelineId, { timestamp: 300, category: 'combat', title: 'raid' });

    const merged = service.mergeTimelines([t1.timelineId, t2.timelineId], 'global', 'merge-1');
    if (typeof merged === 'string') throw new Error('expected merged timeline');

    const view = service.getView(merged.timelineId);
    if (typeof view === 'string') throw new Error('expected merged view');
    expect(view.totalEvents).toBe(2);
    expect(view.totalPeriods).toBe(1);

    expect(service.mergeTimelines(['missing'], 'global', 'x')).toBe('TIMELINE_NOT_FOUND');
  });

  it('reports aggregate statistics by category and exposes exported constants', () => {
    const service = createTimelineService(createDeps());
    const created = service.createTimeline('dynasty', 'd-1');
    if (!isTimelineInfo(created)) throw new Error('expected timeline');
    service.addEvent(created.timelineId, { timestamp: 1, category: 'trade', title: 'a' });
    service.addEvent(created.timelineId, { timestamp: 2, category: 'trade', title: 'b' });
    service.addPeriod(created.timelineId, { startTime: 1, endTime: 3, label: 'p' });

    const stats = service.getStats();
    const trade = stats.eventsByCategory.find((c) => c.category === 'trade');

    expect(stats.totalTimelines).toBe(1);
    expect(stats.totalEvents).toBe(2);
    expect(stats.totalPeriods).toBe(1);
    expect(trade?.count).toBe(2);
    expect(DEFAULT_ZOOM_LEVEL).toBe(1);
  });
});
