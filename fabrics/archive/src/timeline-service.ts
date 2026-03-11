/**
 * timeline-service.ts — Timeline visualization data service.
 *
 * Provides timeline construction, event and period tracking,
 * annotations, zoom/filter/merge operations, and statistical
 * summaries for dynasty, world, and global scopes.
 *
 * "The threads of time are laid bare for those who seek to see."
 */

// ── Ports ────────────────────────────────────────────────────────

interface TimelineClock {
  readonly nowMicroseconds: () => number;
}

interface TimelineIdGenerator {
  readonly generate: () => string;
}

interface TimelineDeps {
  readonly clock: TimelineClock;
  readonly idGenerator: TimelineIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type TimelineScope = 'dynasty' | 'world' | 'global';

interface TimelineEvent {
  readonly eventId: string;
  readonly timelineId: string;
  readonly timestamp: number;
  readonly category: string;
  readonly title: string;
  readonly description: string;
  readonly metadata: string;
  readonly addedAt: number;
}

interface AddTimelineEventParams {
  readonly timestamp: number;
  readonly category: string;
  readonly title: string;
  readonly description?: string;
  readonly metadata?: string;
}

interface TimelinePeriod {
  readonly periodId: string;
  readonly timelineId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly label: string;
  readonly category: string;
  readonly addedAt: number;
}

interface AddTimelinePeriodParams {
  readonly startTime: number;
  readonly endTime: number;
  readonly label: string;
  readonly category?: string;
}

interface TimelineAnnotation {
  readonly annotationId: string;
  readonly eventId: string;
  readonly text: string;
  readonly author: string;
  readonly createdAt: number;
}

interface AddAnnotationParams {
  readonly text: string;
  readonly author: string;
}

interface TimelineView {
  readonly timelineId: string;
  readonly scope: TimelineScope;
  readonly scopeId: string;
  readonly events: ReadonlyArray<TimelineEvent>;
  readonly periods: ReadonlyArray<TimelinePeriod>;
  readonly zoomStart: number;
  readonly zoomEnd: number;
  readonly totalEvents: number;
  readonly totalPeriods: number;
}

interface TimelineInfo {
  readonly timelineId: string;
  readonly scope: TimelineScope;
  readonly scopeId: string;
  readonly createdAt: number;
}

interface TimelineStats {
  readonly totalTimelines: number;
  readonly totalEvents: number;
  readonly totalPeriods: number;
  readonly totalAnnotations: number;
  readonly eventsByCategory: ReadonlyArray<CategoryCount>;
}

interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

type TimelineError =
  | 'TIMELINE_NOT_FOUND'
  | 'EVENT_NOT_FOUND'
  | 'MAX_EVENTS_REACHED'
  | 'MAX_ANNOTATIONS_REACHED'
  | 'INVALID_TIME_RANGE'
  | 'TIMELINE_ALREADY_EXISTS';

// ── Public Interface ─────────────────────────────────────────────

interface TimelineService {
  readonly createTimeline: (scope: TimelineScope, scopeId: string) => TimelineInfo | TimelineError;
  readonly addEvent: (
    timelineId: string,
    params: AddTimelineEventParams,
  ) => TimelineEvent | TimelineError;
  readonly addPeriod: (
    timelineId: string,
    params: AddTimelinePeriodParams,
  ) => TimelinePeriod | TimelineError;
  readonly annotateEvent: (
    eventId: string,
    params: AddAnnotationParams,
  ) => TimelineAnnotation | TimelineError;
  readonly getView: (timelineId: string) => TimelineView | TimelineError;
  readonly zoomToRange: (
    timelineId: string,
    startTime: number,
    endTime: number,
  ) => TimelineView | TimelineError;
  readonly filterByCategory: (timelineId: string, category: string) => TimelineView | TimelineError;
  readonly mergeTimelines: (
    timelineIds: ReadonlyArray<string>,
    targetScope: TimelineScope,
    targetScopeId: string,
  ) => TimelineInfo | TimelineError;
  readonly getTimeline: (timelineId: string) => TimelineInfo | undefined;
  readonly getAnnotations: (eventId: string) => ReadonlyArray<TimelineAnnotation>;
  readonly getStats: () => TimelineStats;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_EVENTS_PER_TIMELINE = 10_000;
const DEFAULT_ZOOM_LEVEL = 1;
const MAX_ANNOTATIONS = 50;

// ── State ────────────────────────────────────────────────────────

interface MutableTimeline {
  readonly timelineId: string;
  readonly scope: TimelineScope;
  readonly scopeId: string;
  readonly createdAt: number;
  zoomStart: number;
  zoomEnd: number;
}

interface TimelineState {
  readonly deps: TimelineDeps;
  readonly timelines: Map<string, MutableTimeline>;
  readonly events: Map<string, TimelineEvent>;
  readonly timelineEvents: Map<string, string[]>;
  readonly periods: Map<string, TimelinePeriod>;
  readonly timelinePeriods: Map<string, string[]>;
  readonly annotations: Map<string, TimelineAnnotation>;
  readonly eventAnnotations: Map<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toTimelineInfo(tl: MutableTimeline): TimelineInfo {
  return {
    timelineId: tl.timelineId,
    scope: tl.scope,
    scopeId: tl.scopeId,
    createdAt: tl.createdAt,
  };
}

function appendToList(map: Map<string, string[]>, key: string, value: string): void {
  const existing = map.get(key);
  if (existing !== undefined) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

function getEventsForTimeline(state: TimelineState, timelineId: string): TimelineEvent[] {
  const eventIds = state.timelineEvents.get(timelineId) ?? [];
  const result: TimelineEvent[] = [];
  for (const id of eventIds) {
    const event = state.events.get(id);
    if (event !== undefined) {
      result.push(event);
    }
  }
  return result;
}

function getPeriodsForTimeline(state: TimelineState, timelineId: string): TimelinePeriod[] {
  const periodIds = state.timelinePeriods.get(timelineId) ?? [];
  const result: TimelinePeriod[] = [];
  for (const id of periodIds) {
    const period = state.periods.get(id);
    if (period !== undefined) {
      result.push(period);
    }
  }
  return result;
}

function filterEventsByRange(
  events: ReadonlyArray<TimelineEvent>,
  start: number,
  end: number,
): TimelineEvent[] {
  const result: TimelineEvent[] = [];
  for (const event of events) {
    if (event.timestamp >= start && event.timestamp <= end) {
      result.push(event);
    }
  }
  return result;
}

function filterPeriodsByRange(
  periods: ReadonlyArray<TimelinePeriod>,
  start: number,
  end: number,
): TimelinePeriod[] {
  const result: TimelinePeriod[] = [];
  for (const period of periods) {
    if (period.endTime >= start && period.startTime <= end) {
      result.push(period);
    }
  }
  return result;
}

function filterEventsByCategory(
  events: ReadonlyArray<TimelineEvent>,
  category: string,
): TimelineEvent[] {
  const result: TimelineEvent[] = [];
  for (const event of events) {
    if (event.category === category) {
      result.push(event);
    }
  }
  return result;
}

function filterPeriodsByCategory(
  periods: ReadonlyArray<TimelinePeriod>,
  category: string,
): TimelinePeriod[] {
  const result: TimelinePeriod[] = [];
  for (const period of periods) {
    if (period.category === category) {
      result.push(period);
    }
  }
  return result;
}

function buildView(
  tl: MutableTimeline,
  events: ReadonlyArray<TimelineEvent>,
  periods: ReadonlyArray<TimelinePeriod>,
  state: TimelineState,
): TimelineView {
  const allEventIds = state.timelineEvents.get(tl.timelineId) ?? [];
  const allPeriodIds = state.timelinePeriods.get(tl.timelineId) ?? [];
  return {
    timelineId: tl.timelineId,
    scope: tl.scope,
    scopeId: tl.scopeId,
    events,
    periods,
    zoomStart: tl.zoomStart,
    zoomEnd: tl.zoomEnd,
    totalEvents: allEventIds.length,
    totalPeriods: allPeriodIds.length,
  };
}

function countAnnotationsForEvent(state: TimelineState, eventId: string): number {
  return (state.eventAnnotations.get(eventId) ?? []).length;
}

function countEventsByCategory(state: TimelineState): ReadonlyArray<CategoryCount> {
  const counts = new Map<string, number>();
  for (const event of state.events.values()) {
    const current = counts.get(event.category) ?? 0;
    counts.set(event.category, current + 1);
  }
  const result: CategoryCount[] = [];
  for (const [category, count] of counts) {
    result.push({ category, count });
  }
  return result;
}

// ── Operations ───────────────────────────────────────────────────

function createTimelineImpl(
  state: TimelineState,
  scope: TimelineScope,
  scopeId: string,
): TimelineInfo | TimelineError {
  for (const tl of state.timelines.values()) {
    if (tl.scope === scope && tl.scopeId === scopeId) {
      return 'TIMELINE_ALREADY_EXISTS';
    }
  }
  const timelineId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  const timeline: MutableTimeline = {
    timelineId,
    scope,
    scopeId,
    createdAt: now,
    zoomStart: 0,
    zoomEnd: Number.MAX_SAFE_INTEGER,
  };
  state.timelines.set(timelineId, timeline);
  return toTimelineInfo(timeline);
}

function addEventImpl(
  state: TimelineState,
  timelineId: string,
  params: AddTimelineEventParams,
): TimelineEvent | TimelineError {
  const tl = state.timelines.get(timelineId);
  if (tl === undefined) return 'TIMELINE_NOT_FOUND';
  const currentCount = (state.timelineEvents.get(timelineId) ?? []).length;
  if (currentCount >= MAX_EVENTS_PER_TIMELINE) return 'MAX_EVENTS_REACHED';

  const eventId = state.deps.idGenerator.generate();
  const event: TimelineEvent = {
    eventId,
    timelineId,
    timestamp: params.timestamp,
    category: params.category,
    title: params.title,
    description: params.description ?? '',
    metadata: params.metadata ?? '',
    addedAt: state.deps.clock.nowMicroseconds(),
  };
  state.events.set(eventId, event);
  appendToList(state.timelineEvents, timelineId, eventId);
  return event;
}

function addPeriodImpl(
  state: TimelineState,
  timelineId: string,
  params: AddTimelinePeriodParams,
): TimelinePeriod | TimelineError {
  const tl = state.timelines.get(timelineId);
  if (tl === undefined) return 'TIMELINE_NOT_FOUND';
  if (params.startTime >= params.endTime) return 'INVALID_TIME_RANGE';

  const periodId = state.deps.idGenerator.generate();
  const period: TimelinePeriod = {
    periodId,
    timelineId,
    startTime: params.startTime,
    endTime: params.endTime,
    label: params.label,
    category: params.category ?? 'default',
    addedAt: state.deps.clock.nowMicroseconds(),
  };
  state.periods.set(periodId, period);
  appendToList(state.timelinePeriods, timelineId, periodId);
  return period;
}

function annotateEventImpl(
  state: TimelineState,
  eventId: string,
  params: AddAnnotationParams,
): TimelineAnnotation | TimelineError {
  const event = state.events.get(eventId);
  if (event === undefined) return 'EVENT_NOT_FOUND';
  if (countAnnotationsForEvent(state, eventId) >= MAX_ANNOTATIONS) {
    return 'MAX_ANNOTATIONS_REACHED';
  }

  const annotationId = state.deps.idGenerator.generate();
  const annotation: TimelineAnnotation = {
    annotationId,
    eventId,
    text: params.text,
    author: params.author,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.annotations.set(annotationId, annotation);
  appendToList(state.eventAnnotations, eventId, annotationId);
  return annotation;
}

function getViewImpl(state: TimelineState, timelineId: string): TimelineView | TimelineError {
  const tl = state.timelines.get(timelineId);
  if (tl === undefined) return 'TIMELINE_NOT_FOUND';
  const events = getEventsForTimeline(state, timelineId);
  const periods = getPeriodsForTimeline(state, timelineId);
  const filtered = filterEventsByRange(events, tl.zoomStart, tl.zoomEnd);
  const filteredPeriods = filterPeriodsByRange(periods, tl.zoomStart, tl.zoomEnd);
  return buildView(tl, filtered, filteredPeriods, state);
}

function zoomToRangeImpl(
  state: TimelineState,
  timelineId: string,
  startTime: number,
  endTime: number,
): TimelineView | TimelineError {
  const tl = state.timelines.get(timelineId);
  if (tl === undefined) return 'TIMELINE_NOT_FOUND';
  if (startTime >= endTime) return 'INVALID_TIME_RANGE';
  tl.zoomStart = startTime;
  tl.zoomEnd = endTime;
  return getViewImpl(state, timelineId);
}

function filterByCategoryImpl(
  state: TimelineState,
  timelineId: string,
  category: string,
): TimelineView | TimelineError {
  const tl = state.timelines.get(timelineId);
  if (tl === undefined) return 'TIMELINE_NOT_FOUND';
  const events = getEventsForTimeline(state, timelineId);
  const periods = getPeriodsForTimeline(state, timelineId);
  const filteredEvents = filterEventsByCategory(events, category);
  const filteredPeriods = filterPeriodsByCategory(periods, category);
  return buildView(tl, filteredEvents, filteredPeriods, state);
}

function mergeTimelinesImpl(
  state: TimelineState,
  timelineIds: ReadonlyArray<string>,
  targetScope: TimelineScope,
  targetScopeId: string,
): TimelineInfo | TimelineError {
  for (const id of timelineIds) {
    if (state.timelines.get(id) === undefined) return 'TIMELINE_NOT_FOUND';
  }
  const createResult = createTimelineImpl(state, targetScope, targetScopeId);
  if (typeof createResult === 'string') return createResult;

  for (const sourceId of timelineIds) {
    copyEventsToTimeline(state, sourceId, createResult.timelineId);
    copyPeriodsToTimeline(state, sourceId, createResult.timelineId);
  }
  return createResult;
}

function copyEventsToTimeline(state: TimelineState, sourceId: string, targetId: string): void {
  const eventIds = state.timelineEvents.get(sourceId) ?? [];
  for (const eventId of eventIds) {
    const original = state.events.get(eventId);
    if (original === undefined) continue;
    const newId = state.deps.idGenerator.generate();
    const copied: TimelineEvent = {
      eventId: newId,
      timelineId: targetId,
      timestamp: original.timestamp,
      category: original.category,
      title: original.title,
      description: original.description,
      metadata: original.metadata,
      addedAt: state.deps.clock.nowMicroseconds(),
    };
    state.events.set(newId, copied);
    appendToList(state.timelineEvents, targetId, newId);
  }
}

function copyPeriodsToTimeline(state: TimelineState, sourceId: string, targetId: string): void {
  const periodIds = state.timelinePeriods.get(sourceId) ?? [];
  for (const periodId of periodIds) {
    const original = state.periods.get(periodId);
    if (original === undefined) continue;
    const newId = state.deps.idGenerator.generate();
    const copied: TimelinePeriod = {
      periodId: newId,
      timelineId: targetId,
      startTime: original.startTime,
      endTime: original.endTime,
      label: original.label,
      category: original.category,
      addedAt: state.deps.clock.nowMicroseconds(),
    };
    state.periods.set(newId, copied);
    appendToList(state.timelinePeriods, targetId, newId);
  }
}

function getAnnotationsImpl(
  state: TimelineState,
  eventId: string,
): ReadonlyArray<TimelineAnnotation> {
  const annotationIds = state.eventAnnotations.get(eventId) ?? [];
  const result: TimelineAnnotation[] = [];
  for (const id of annotationIds) {
    const annotation = state.annotations.get(id);
    if (annotation !== undefined) {
      result.push(annotation);
    }
  }
  return result;
}

function getStatsImpl(state: TimelineState): TimelineStats {
  return {
    totalTimelines: state.timelines.size,
    totalEvents: state.events.size,
    totalPeriods: state.periods.size,
    totalAnnotations: state.annotations.size,
    eventsByCategory: countEventsByCategory(state),
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTimelineService(deps: TimelineDeps): TimelineService {
  const state: TimelineState = {
    deps,
    timelines: new Map(),
    events: new Map(),
    timelineEvents: new Map(),
    periods: new Map(),
    timelinePeriods: new Map(),
    annotations: new Map(),
    eventAnnotations: new Map(),
  };

  return {
    createTimeline: (scope, scopeId) => createTimelineImpl(state, scope, scopeId),
    addEvent: (tlId, params) => addEventImpl(state, tlId, params),
    addPeriod: (tlId, params) => addPeriodImpl(state, tlId, params),
    annotateEvent: (evtId, params) => annotateEventImpl(state, evtId, params),
    getView: (tlId) => getViewImpl(state, tlId),
    zoomToRange: (tlId, s, e) => zoomToRangeImpl(state, tlId, s, e),
    filterByCategory: (tlId, cat) => filterByCategoryImpl(state, tlId, cat),
    mergeTimelines: (ids, scope, scopeId) => mergeTimelinesImpl(state, ids, scope, scopeId),
    getTimeline: (tlId) => {
      const tl = state.timelines.get(tlId);
      return tl !== undefined ? toTimelineInfo(tl) : undefined;
    },
    getAnnotations: (evtId) => getAnnotationsImpl(state, evtId),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTimelineService, MAX_EVENTS_PER_TIMELINE, DEFAULT_ZOOM_LEVEL, MAX_ANNOTATIONS };

export type {
  TimelineService,
  TimelineDeps,
  TimelineClock,
  TimelineIdGenerator,
  TimelineScope,
  TimelineEvent,
  AddTimelineEventParams,
  TimelinePeriod,
  AddTimelinePeriodParams,
  TimelineAnnotation,
  AddAnnotationParams,
  TimelineView,
  TimelineInfo,
  TimelineStats,
  CategoryCount,
  TimelineError,
};
