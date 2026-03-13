import { describe, expect, it, vi } from 'vitest';
import {
  createTimeCompressionEngine,
  type CalendarEvent,
  type FutureProjection,
  type HistoricalEra,
  type ProjectionResult,
  type TimelapseRecording,
  type WorldClock,
} from '../time-compression.js';

function makeProjectionResult(): ProjectionResult {
  return {
    populationChange: 0.1,
    settlementsChange: 0.05,
    resourceDepletion: 0.2,
    conflictProbability: 0.3,
    environmentalShift: {
      deforestation: 0.1,
      urbanization: 0.2,
      pollution: 0.15,
      restoration: 0.05,
      overallHealth: 0.7,
    },
    predictedEvents: [
      {
        gameDay: 120,
        title: 'Harvest Boom',
        description: 'A favorable season boosts yields',
        probability: 0.8,
        impact: 'medium',
      },
    ],
  };
}

function makeDeps() {
  let seq = 0;
  const clocks = new Map<string, WorldClock>();
  const erasByWorld = new Map<string, HistoricalEra[]>();
  const calendarByWorld = new Map<string, CalendarEvent[]>();
  const projections = new Map<string, FutureProjection>();
  const timelapses = new Map<string, TimelapseRecording>();

  return {
    deps: {
      clock: { now: vi.fn(() => 1000n) },
      ids: { next: vi.fn(() => `id-${++seq}`) },
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      events: {
        emit: vi.fn(),
      },
      store: {
        saveWorldClock: vi.fn(async (wc: WorldClock) => {
          clocks.set(wc.worldId, wc);
        }),
        getWorldClock: vi.fn(async (worldId: string) => clocks.get(worldId)),
        saveCalendarEvent: vi.fn(async (evt: CalendarEvent) => {
          const list = calendarByWorld.get(evt.worldId) ?? [];
          list.push(evt);
          calendarByWorld.set(evt.worldId, list);
        }),
        getCalendarEvents: vi.fn(async (worldId: string, year: number) =>
          (calendarByWorld.get(worldId) ?? []).filter((e) => e.gameYear === year),
        ),
        saveEra: vi.fn(async (era: HistoricalEra) => {
          const list = erasByWorld.get(era.worldId) ?? [];
          const i = list.findIndex((x) => x.id === era.id);
          if (i >= 0) list[i] = era;
          else list.push(era);
          erasByWorld.set(era.worldId, list);
        }),
        getEras: vi.fn(async (worldId: string) => erasByWorld.get(worldId) ?? []),
        saveProjection: vi.fn(async (p: FutureProjection) => {
          projections.set(p.worldId, p);
        }),
        getProjection: vi.fn(async (worldId: string) => projections.get(worldId)),
        saveTimelapse: vi.fn(async (t: TimelapseRecording) => {
          timelapses.set(t.worldId, t);
        }),
      },
      simulator: {
        project: vi.fn(async () => makeProjectionResult()),
      },
    },
  };
}

describe('time-compression simulation', () => {
  it('initializes world clock with defaults and emits initialization', async () => {
    const ctx = makeDeps();
    const engine = createTimeCompressionEngine(ctx.deps);

    const clock = await engine.initWorldClock('world-a');

    expect(clock.gameDay).toBe(1);
    expect(clock.gameYear).toBe(1);
    expect(clock.season).toBe('spring');
    expect(clock.compressionRatio).toBe(24);
    expect(ctx.deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'time.clock-initialized' }),
    );
  });

  it('ticks world clock and emits season/year changes', async () => {
    const ctx = makeDeps();
    const engine = createTimeCompressionEngine(ctx.deps);

    await engine.initWorldClock('world-a');
    const updated = await engine.tick('world-a', 8 * 3_600_000);

    expect(updated.gameDay).toBe(9);
    expect(updated.season).toBe('summer');
    expect(updated.dayInSeason).toBe(3);
    expect(ctx.deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'time.season-changed' }),
    );
  });

  it('does not advance while paused and can resume', async () => {
    const ctx = makeDeps();
    const engine = createTimeCompressionEngine(ctx.deps);

    await engine.initWorldClock('world-a');
    await engine.setPaused('world-a', true);

    const paused = await engine.tick('world-a', 24 * 3_600_000);
    expect(paused.gameDay).toBe(1);

    await engine.setPaused('world-a', false);
    const resumed = await engine.tick('world-a', 1 * 3_600_000);
    expect(resumed.gameDay).toBe(2);
  });

  it('sets compression ratio with bounds checking', async () => {
    const ctx = makeDeps();
    const engine = createTimeCompressionEngine(ctx.deps);

    await engine.initWorldClock('world-a');
    await engine.setCompressionRatio('world-a', 120);

    expect((await engine.getWorldClock('world-a'))?.compressionRatio).toBe(120);
    await expect(engine.setCompressionRatio('world-a', 0)).rejects.toThrow(
      'Compression ratio must be between 1 and 1000',
    );
  });

  it('adds calendar events and computes season from game day', async () => {
    const engine = createTimeCompressionEngine(makeDeps().deps);

    const evt = await engine.addCalendarEvent(
      'world-a',
      'Market Fair',
      'Seasonal exchange event',
      15,
      2,
      'festival',
      true,
      { yearly: true, season: 'autumn' },
    );

    expect(evt.season).toBe('autumn');
    const events = await engine.getCalendarEvents('world-a', 2);
    expect(events).toHaveLength(1);
  });

  it('declares and ends eras while updating current world era', async () => {
    const ctx = makeDeps();
    const engine = createTimeCompressionEngine(ctx.deps);

    await engine.initWorldClock('world-a');
    const era = await engine.declareEra(
      'world-a',
      'Iron Ascendancy',
      'iron',
      42,
      'Forging and expansion era',
      'First steel keep founded',
      99,
      'House Ferrum',
    );

    expect(era.prosperityRating).toBe(10);
    expect((await engine.getWorldClock('world-a'))?.currentEra).toBe('Iron Ascendancy');

    await engine.endEra('world-a', era.id, 50);
    const eras = await engine.getEras('world-a');
    expect(eras[0]?.endYear).toBe(50);

    await expect(engine.endEra('world-a', 'unknown-era', 60)).rejects.toThrow('not found');
  });

  it('projects future with max day clamp and stores projection', async () => {
    const ctx = makeDeps();
    const engine = createTimeCompressionEngine(ctx.deps);

    const projection = await engine.projectFuture(
      'world-a',
      {
        worldId: 'world-a',
        gameDay: 100,
        gameYear: 4,
        season: 'winter',
        population: 10000,
        activeSettlements: 12,
        resourceLevel: 0.6,
        conflictLevel: 0.3,
        prosperityIndex: 0.7,
      },
      999,
    );

    expect(projection.projectedTo).toBe(465);
    expect(ctx.deps.simulator.project).toHaveBeenCalledWith(expect.anything(), 365);
    expect(ctx.deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'time.future-projected' }),
    );
  });

  it('computes NPC aging stages across life progression', () => {
    const engine = createTimeCompressionEngine(makeDeps().deps);

    const youth = engine.computeNpcAge(990, 1000);
    const retired = engine.computeNpcAge(930, 1000);
    const deceased = engine.computeNpcAge(920, 1000);

    expect(youth.currentAge).toBe(10);
    expect(youth.lifeStage).toBe('child');
    expect(youth.careerPhase).toBe('apprentice');

    expect(retired.currentAge).toBe(70);
    expect(retired.lifeStage).toBe('elder');
    expect(retired.careerPhase).toBe('deceased');

    expect(deceased.currentAge).toBe(80);
    expect(deceased.visualAgeGroup).toBe('venerable');
  });

  it('records timelapse with compression factor from year range', async () => {
    const engine = createTimeCompressionEngine(makeDeps().deps);

    const timelapse = await engine.recordTimelapse('world-a', 10, 25, [
      { gameYear: 10, season: 'spring', population: 500, settlements: 2, eraName: 'Dawn' },
      { gameYear: 25, season: 'winter', population: 5000, settlements: 12, eraName: 'Expansion' },
    ]);

    expect(timelapse.compressionFactor).toBe(15);
    expect(timelapse.snapshots).toHaveLength(2);
  });

  it('returns default aggregate stats shape', async () => {
    const engine = createTimeCompressionEngine(makeDeps().deps);
    const stats = await engine.getStats();

    expect(stats.totalWorlds).toBe(0);
    expect(stats.averageCompressionRatio).toBe(24);
    expect(stats.totalEras).toBe(0);
    expect(stats.totalCalendarEvents).toBe(0);
  });
});
