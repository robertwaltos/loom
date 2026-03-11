/**
 * Time Compression Engine — configurable time flow, seasons, eras.
 *
 *   - Time acceleration: configurable compression ratio
 *   - Season system: 4 seasons × 7 days = 28 IRL hours per game year
 *   - Historical era tracking: world ages, epochs, cultural periods
 *   - Future projection: AI "what if nobody logs in" simulation
 *   - Time-lapse replay: watch world history in accelerated playback
 *   - Calendar system: holidays, harvest dates, political terms
 *   - Aging NPCs: career progression, retirement, death
 *   - Environmental change over time: urbanization, deforestation, restoration
 *
 * "Time is the Loom's most fundamental thread."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface TimeClockPort {
  readonly now: () => bigint;
}

export interface TimeIdPort {
  readonly next: () => string;
}

export interface TimeLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface TimeEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface TimeStorePort {
  readonly saveWorldClock: (worldClock: WorldClock) => Promise<void>;
  readonly getWorldClock: (worldId: string) => Promise<WorldClock | undefined>;
  readonly saveCalendarEvent: (event: CalendarEvent) => Promise<void>;
  readonly getCalendarEvents: (worldId: string, year: number) => Promise<readonly CalendarEvent[]>;
  readonly saveEra: (era: HistoricalEra) => Promise<void>;
  readonly getEras: (worldId: string) => Promise<readonly HistoricalEra[]>;
  readonly saveProjection: (projection: FutureProjection) => Promise<void>;
  readonly getProjection: (worldId: string) => Promise<FutureProjection | undefined>;
  readonly saveTimelapse: (timelapse: TimelapseRecording) => Promise<void>;
}

export interface FutureSimulatorPort {
  readonly project: (worldState: WorldClockSnapshot, daysToSimulate: number) => Promise<ProjectionResult>;
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_COMPRESSION_RATIO = 24;
const DAYS_PER_SEASON = 7;
const SEASONS_PER_YEAR = 4;
const DAYS_PER_GAME_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;
const MS_PER_REAL_HOUR = 3_600_000;
const MAX_PROJECTION_DAYS = 365;
const MAX_ERA_HISTORY = 100;

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = typeof SEASONS[number];

export const ERA_TYPES = [
  'stone', 'bronze', 'iron', 'classical', 'medieval',
  'renaissance', 'industrial', 'modern', 'golden', 'dark',
  'war', 'peace', 'plague', 'expansion',
] as const;
export type EraType = typeof ERA_TYPES[number];

// ─── Types ──────────────────────────────────────────────────────────

export interface WorldClock {
  readonly worldId: string;
  readonly gameDay: number;
  readonly gameYear: number;
  readonly season: Season;
  readonly dayInSeason: number;
  readonly compressionRatio: number;
  readonly realStartTime: bigint;
  readonly currentEra: string;
  readonly isPaused: boolean;
  readonly lastTickAt: bigint;
}

export interface WorldClockSnapshot {
  readonly worldId: string;
  readonly gameDay: number;
  readonly gameYear: number;
  readonly season: Season;
  readonly population: number;
  readonly activeSettlements: number;
  readonly resourceLevel: number;
  readonly conflictLevel: number;
  readonly prosperityIndex: number;
}

export interface CalendarEvent {
  readonly id: string;
  readonly worldId: string;
  readonly name: string;
  readonly description: string;
  readonly gameDay: number;
  readonly gameYear: number;
  readonly season: Season;
  readonly eventType: CalendarEventType;
  readonly recurring: boolean;
  readonly recurrencePattern?: RecurrencePattern;
}

export type CalendarEventType =
  | 'holiday'
  | 'harvest'
  | 'market-day'
  | 'election'
  | 'festival'
  | 'memorial'
  | 'tax-day'
  | 'coronation'
  | 'equinox'
  | 'solstice';

export interface RecurrencePattern {
  readonly intervalDays?: number;
  readonly season?: Season;
  readonly dayInSeason?: number;
  readonly yearly: boolean;
}

export interface HistoricalEra {
  readonly id: string;
  readonly worldId: string;
  readonly name: string;
  readonly eraType: EraType;
  readonly startYear: number;
  readonly endYear?: number;
  readonly description: string;
  readonly dominantFaction?: string;
  readonly keyEvent: string;
  readonly prosperityRating: number;
}

export interface FutureProjection {
  readonly worldId: string;
  readonly projectedFrom: number;
  readonly projectedTo: number;
  readonly result: ProjectionResult;
  readonly generatedAt: bigint;
}

export interface ProjectionResult {
  readonly populationChange: number;
  readonly settlementsChange: number;
  readonly resourceDepletion: number;
  readonly conflictProbability: number;
  readonly environmentalShift: EnvironmentalChange;
  readonly predictedEvents: readonly PredictedEvent[];
}

export interface PredictedEvent {
  readonly gameDay: number;
  readonly title: string;
  readonly description: string;
  readonly probability: number;
  readonly impact: 'low' | 'medium' | 'high' | 'catastrophic';
}

export interface EnvironmentalChange {
  readonly deforestation: number;
  readonly urbanization: number;
  readonly pollution: number;
  readonly restoration: number;
  readonly overallHealth: number;
}

export interface NpcAging {
  readonly npcId: string;
  readonly currentAge: number;
  readonly lifeStage: LifeStage;
  readonly retirementAge: number;
  readonly expectedLifespan: number;
  readonly careerPhase: CareerPhase;
  readonly visualAgeGroup: VisualAgeGroup;
}

export type LifeStage = 'child' | 'adolescent' | 'young-adult' | 'adult' | 'middle-aged' | 'elder' | 'ancient';
export type CareerPhase = 'apprentice' | 'journeyman' | 'master' | 'retired' | 'deceased';
export type VisualAgeGroup = 'youth' | 'prime' | 'mature' | 'aged' | 'venerable';

export interface TimelapseRecording {
  readonly id: string;
  readonly worldId: string;
  readonly startYear: number;
  readonly endYear: number;
  readonly snapshots: readonly TimelapseSnapshot[];
  readonly compressionFactor: number;
  readonly recordedAt: bigint;
}

export interface TimelapseSnapshot {
  readonly gameYear: number;
  readonly season: Season;
  readonly population: number;
  readonly settlements: number;
  readonly eraName: string;
  readonly keyEvent?: string;
}

export interface TimeCompressionStats {
  readonly totalWorlds: number;
  readonly oldestWorldYears: number;
  readonly newestWorldYears: number;
  readonly averageCompressionRatio: number;
  readonly totalEras: number;
  readonly totalCalendarEvents: number;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface TimeCompressionDeps {
  readonly clock: TimeClockPort;
  readonly ids: TimeIdPort;
  readonly log: TimeLogPort;
  readonly events: TimeEventPort;
  readonly store: TimeStorePort;
  readonly simulator: FutureSimulatorPort;
}

export interface TimeCompressionConfig {
  readonly defaultCompressionRatio: number;
  readonly daysPerSeason: number;
  readonly seasonsPerYear: number;
  readonly maxProjectionDays: number;
  readonly maxEraHistory: number;
  readonly npcBaseLifespan: number;
  readonly npcRetirementAge: number;
}

const DEFAULT_CONFIG: TimeCompressionConfig = {
  defaultCompressionRatio: DEFAULT_COMPRESSION_RATIO,
  daysPerSeason: DAYS_PER_SEASON,
  seasonsPerYear: SEASONS_PER_YEAR,
  maxProjectionDays: MAX_PROJECTION_DAYS,
  maxEraHistory: MAX_ERA_HISTORY,
  npcBaseLifespan: 70,
  npcRetirementAge: 55,
};

// ─── Engine ─────────────────────────────────────────────────────────

export interface TimeCompressionEngine {
  /** Initialize a world clock with default settings. */
  readonly initWorldClock: (worldId: string, compressionRatio?: number) => Promise<WorldClock>;

  /** Advance the world clock by a number of real milliseconds. */
  readonly tick: (worldId: string, realMs: number) => Promise<WorldClock>;

  /** Get current world clock state. */
  readonly getWorldClock: (worldId: string) => Promise<WorldClock | undefined>;

  /** Pause or resume world time. */
  readonly setPaused: (worldId: string, paused: boolean) => Promise<void>;

  /** Change time compression ratio. */
  readonly setCompressionRatio: (worldId: string, ratio: number) => Promise<void>;

  /** Get the current season for a world. */
  readonly getCurrentSeason: (worldId: string) => Promise<Season>;

  /** Register a calendar event. */
  readonly addCalendarEvent: (
    worldId: string,
    name: string,
    description: string,
    gameDay: number,
    gameYear: number,
    eventType: CalendarEventType,
    recurring: boolean,
    recurrencePattern?: RecurrencePattern,
  ) => Promise<CalendarEvent>;

  /** Get calendar events for a world/year. */
  readonly getCalendarEvents: (worldId: string, year: number) => Promise<readonly CalendarEvent[]>;

  /** Declare a new historical era. */
  readonly declareEra: (
    worldId: string,
    name: string,
    eraType: EraType,
    startYear: number,
    description: string,
    keyEvent: string,
    prosperityRating: number,
    dominantFaction?: string,
  ) => Promise<HistoricalEra>;

  /** End the current era. */
  readonly endEra: (worldId: string, eraId: string, endYear: number) => Promise<void>;

  /** Get all eras for a world. */
  readonly getEras: (worldId: string) => Promise<readonly HistoricalEra[]>;

  /** Project what happens if no players log in for N game days. */
  readonly projectFuture: (worldId: string, snapshot: WorldClockSnapshot, daysToSimulate: number) => Promise<FutureProjection>;

  /** Compute NPC aging state. */
  readonly computeNpcAge: (birthYear: number, currentYear: number) => NpcAging;

  /** Record a timelapse of world history. */
  readonly recordTimelapse: (
    worldId: string,
    startYear: number,
    endYear: number,
    snapshots: readonly TimelapseSnapshot[],
  ) => Promise<TimelapseRecording>;

  /** Get time compression stats. */
  readonly getStats: () => Promise<TimeCompressionStats>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createTimeCompressionEngine(
  deps: TimeCompressionDeps,
  config?: Partial<TimeCompressionConfig>,
): TimeCompressionEngine {
  const cfg: TimeCompressionConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store, simulator } = deps;

  const daysPerYear = cfg.daysPerSeason * cfg.seasonsPerYear;

  function computeSeason(gameDay: number): Season {
    const dayInYear = gameDay % daysPerYear;
    const seasonIndex = Math.floor(dayInYear / cfg.daysPerSeason);
    return SEASONS[seasonIndex % SEASONS.length]!;
  }

  function computeYear(gameDay: number): number {
    return Math.floor(gameDay / daysPerYear) + 1;
  }

  function computeDayInSeason(gameDay: number): number {
    const dayInYear = gameDay % daysPerYear;
    return (dayInYear % cfg.daysPerSeason) + 1;
  }

  function realMsToGameDays(realMs: number, compressionRatio: number): number {
    const realHours = realMs / MS_PER_REAL_HOUR;
    return realHours * compressionRatio / 24;
  }

  function computeLifeStage(age: number): LifeStage {
    if (age < 13) return 'child';
    if (age < 18) return 'adolescent';
    if (age < 30) return 'young-adult';
    if (age < 45) return 'adult';
    if (age < 60) return 'middle-aged';
    if (age < 80) return 'elder';
    return 'ancient';
  }

  function computeCareerPhase(age: number): CareerPhase {
    if (age < 16) return 'apprentice';
    if (age < cfg.npcRetirementAge) {
      return age < 35 ? 'journeyman' : 'master';
    }
    if (age < cfg.npcBaseLifespan) return 'retired';
    return 'deceased';
  }

  function computeVisualAge(age: number): VisualAgeGroup {
    if (age < 25) return 'youth';
    if (age < 40) return 'prime';
    if (age < 60) return 'mature';
    if (age < 80) return 'aged';
    return 'venerable';
  }

  const engine: TimeCompressionEngine = {
    async initWorldClock(worldId, compressionRatio) {
      const ratio = compressionRatio ?? cfg.defaultCompressionRatio;
      const worldClock: WorldClock = {
        worldId,
        gameDay: 1,
        gameYear: 1,
        season: 'spring',
        dayInSeason: 1,
        compressionRatio: ratio,
        realStartTime: clock.now(),
        currentEra: 'dawn',
        isPaused: false,
        lastTickAt: clock.now(),
      };

      await store.saveWorldClock(worldClock);

      log.info('World clock initialized', {
        worldId,
        compressionRatio: ratio,
        daysPerYear,
      });

      events.emit({
        type: 'time.clock-initialized',
        payload: { worldId, compressionRatio: ratio },
      } as LoomEvent);

      return worldClock;
    },

    async tick(worldId, realMs) {
      const worldClock = await store.getWorldClock(worldId);
      if (!worldClock) {
        throw new Error(`World clock for ${worldId} not found`);
      }
      if (worldClock.isPaused) {
        return worldClock;
      }

      const gameDaysElapsed = realMsToGameDays(realMs, worldClock.compressionRatio);
      const newGameDay = worldClock.gameDay + gameDaysElapsed;
      const newGameDayInt = Math.floor(newGameDay);
      const oldYear = worldClock.gameYear;
      const newYear = computeYear(newGameDayInt);
      const newSeason = computeSeason(newGameDayInt);
      const oldSeason = worldClock.season;

      const updated: WorldClock = {
        ...worldClock,
        gameDay: newGameDayInt,
        gameYear: newYear,
        season: newSeason,
        dayInSeason: computeDayInSeason(newGameDayInt),
        lastTickAt: clock.now(),
      };

      await store.saveWorldClock(updated);

      if (newSeason !== oldSeason) {
        events.emit({
          type: 'time.season-changed',
          payload: { worldId, season: newSeason, year: newYear },
        } as LoomEvent);
      }

      if (newYear !== oldYear) {
        events.emit({
          type: 'time.year-changed',
          payload: { worldId, year: newYear },
        } as LoomEvent);
      }

      return updated;
    },

    async getWorldClock(worldId) {
      return store.getWorldClock(worldId);
    },

    async setPaused(worldId, paused) {
      const worldClock = await store.getWorldClock(worldId);
      if (!worldClock) {
        throw new Error(`World clock for ${worldId} not found`);
      }
      await store.saveWorldClock({ ...worldClock, isPaused: paused });

      log.info('World clock paused state changed', { worldId, paused });
      events.emit({
        type: paused ? 'time.paused' : 'time.resumed',
        payload: { worldId },
      } as LoomEvent);
    },

    async setCompressionRatio(worldId, ratio) {
      if (ratio < 1 || ratio > 1000) {
        throw new Error('Compression ratio must be between 1 and 1000');
      }
      const worldClock = await store.getWorldClock(worldId);
      if (!worldClock) {
        throw new Error(`World clock for ${worldId} not found`);
      }
      await store.saveWorldClock({ ...worldClock, compressionRatio: ratio });

      log.info('Compression ratio changed', { worldId, ratio });
    },

    async getCurrentSeason(worldId) {
      const worldClock = await store.getWorldClock(worldId);
      if (!worldClock) {
        throw new Error(`World clock for ${worldId} not found`);
      }
      return worldClock.season;
    },

    async addCalendarEvent(worldId, name, description, gameDay, gameYear, eventType, recurring, recurrencePattern) {
      const calEvent: CalendarEvent = {
        id: ids.next(),
        worldId,
        name,
        description,
        gameDay,
        gameYear,
        season: computeSeason(gameDay),
        eventType,
        recurring,
        recurrencePattern,
      };

      await store.saveCalendarEvent(calEvent);

      log.info('Calendar event added', {
        worldId, name, eventType, gameDay, recurring,
      });

      events.emit({
        type: 'time.calendar-event-added',
        payload: { worldId, name, eventType },
      } as LoomEvent);

      return calEvent;
    },

    async getCalendarEvents(worldId, year) {
      return store.getCalendarEvents(worldId, year);
    },

    async declareEra(worldId, name, eraType, startYear, description, keyEvent, prosperityRating, dominantFaction) {
      const era: HistoricalEra = {
        id: ids.next(),
        worldId,
        name,
        eraType,
        startYear,
        description,
        dominantFaction,
        keyEvent,
        prosperityRating: Math.max(0, Math.min(10, prosperityRating)),
      };

      await store.saveEra(era);

      const worldClock = await store.getWorldClock(worldId);
      if (worldClock) {
        await store.saveWorldClock({ ...worldClock, currentEra: name });
      }

      log.info('Era declared', {
        worldId,
        name,
        eraType,
        startYear,
      });

      events.emit({
        type: 'time.era-declared',
        payload: { worldId, eraName: name, eraType, startYear },
      } as LoomEvent);

      return era;
    },

    async endEra(worldId, eraId, endYear) {
      const eras = await store.getEras(worldId);
      const era = eras.find((e) => e.id === eraId);
      if (!era) {
        throw new Error(`Era ${eraId} not found in world ${worldId}`);
      }

      const ended: HistoricalEra = { ...era, endYear };
      await store.saveEra(ended);

      log.info('Era ended', { worldId, eraId, endYear });

      events.emit({
        type: 'time.era-ended',
        payload: { worldId, eraName: era.name, endYear },
      } as LoomEvent);
    },

    async getEras(worldId) {
      return store.getEras(worldId);
    },

    async projectFuture(worldId, snapshot, daysToSimulate) {
      const clamped = Math.min(daysToSimulate, cfg.maxProjectionDays);
      const result = await simulator.project(snapshot, clamped);

      const projection: FutureProjection = {
        worldId,
        projectedFrom: snapshot.gameDay,
        projectedTo: snapshot.gameDay + clamped,
        result,
        generatedAt: clock.now(),
      };

      await store.saveProjection(projection);

      log.info('Future projected', {
        worldId,
        daysSimulated: clamped,
        predictedEvents: result.predictedEvents.length,
      });

      events.emit({
        type: 'time.future-projected',
        payload: { worldId, daysSimulated: clamped },
      } as LoomEvent);

      return projection;
    },

    computeNpcAge(birthYear, currentYear) {
      const age = Math.max(0, currentYear - birthYear);
      return {
        npcId: '',
        currentAge: age,
        lifeStage: computeLifeStage(age),
        retirementAge: cfg.npcRetirementAge,
        expectedLifespan: cfg.npcBaseLifespan,
        careerPhase: computeCareerPhase(age),
        visualAgeGroup: computeVisualAge(age),
      };
    },

    async recordTimelapse(worldId, startYear, endYear, snapshots) {
      const timelapse: TimelapseRecording = {
        id: ids.next(),
        worldId,
        startYear,
        endYear,
        snapshots,
        compressionFactor: endYear - startYear,
        recordedAt: clock.now(),
      };

      await store.saveTimelapse(timelapse);

      log.info('Timelapse recorded', {
        worldId,
        startYear,
        endYear,
        snapshots: snapshots.length,
      });

      return timelapse;
    },

    async getStats() {
      return {
        totalWorlds: 0,
        oldestWorldYears: 0,
        newestWorldYears: 0,
        averageCompressionRatio: cfg.defaultCompressionRatio,
        totalEras: 0,
        totalCalendarEvents: 0,
      };
    },
  };

  log.info('Time Compression engine initialized', {
    defaultRatio: cfg.defaultCompressionRatio,
    daysPerYear,
    maxProjectionDays: cfg.maxProjectionDays,
  });

  return engine;
}
