/**
 * TimeService — The single source of truth for in-game time.
 *
 * Implements FIXED 3:1 time compression (Bible v1.3, LOCKED).
 * Three in-game days pass per one real day. Always. Forever.
 * COMPRESSION_RATIO lives in this file only — never hardcode elsewhere.
 *
 * Pure math — no side effects, no state mutation, fully testable.
 */

// ─── Constants (Single Source of Truth) ────────────────────────────

export const COMPRESSION_RATIO = 3;

const MS_PER_REAL_DAY = 24 * 3600 * 1000;
const MS_PER_REAL_YEAR = 365.25 * MS_PER_REAL_DAY;
const DAYS_PER_INGAME_MONTH = 30;
const MONTHS_PER_INGAME_YEAR = 12;
const DAYS_PER_INGAME_YEAR = DAYS_PER_INGAME_MONTH * MONTHS_PER_INGAME_YEAR; // 360
const MS_PER_INGAME_DAY = MS_PER_REAL_DAY / COMPRESSION_RATIO;
const MS_PER_INGAME_MONTH = MS_PER_INGAME_DAY * DAYS_PER_INGAME_MONTH;
const MS_PER_INGAME_YEAR = MS_PER_INGAME_DAY * DAYS_PER_INGAME_YEAR;

// ─── Config ────────────────────────────────────────────────────────

export interface TimeServiceConfig {
  /** Epoch milliseconds for the canonical launch date. */
  readonly launchDateMs: number;
  /** Fixed compression ratio. Bible v1.3: 3 (LOCKED). */
  readonly compressionRatio: number;
}

export const DEFAULT_TIME_CONFIG: Readonly<TimeServiceConfig> = {
  launchDateMs: Date.UTC(2027, 0, 1),
  compressionRatio: COMPRESSION_RATIO,
} as const;

// ─── Types ─────────────────────────────────────────────────────────

export interface InGameDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

// ─── Interface ─────────────────────────────────────────────────────

export interface TimeService {
  /** Fixed compression ratio (always 3). */
  getCompressionRatio(): number;

  /** In-game calendar year (1-based) at the given real time. */
  getInGameYear(realNowMs: number): number;

  /** Fractional in-game years elapsed since launch. */
  getInGameYearsElapsed(realNowMs: number): number;

  /** In-game calendar date at the given real time. */
  getInGameDate(realNowMs: number): InGameDate;

  /** Convert a real-time duration (ms) to in-game duration (ms). */
  realMsToInGameMs(realMs: number): number;

  /** Convert an in-game duration (ms) to real-time duration (ms). */
  inGameMsToRealMs(inGameMs: number): number;

  /** Convert real days to in-game days. */
  realDaysToInGame(realDays: number): number;

  /** Convert in-game days to real days. */
  inGameDaysToReal(inGameDays: number): number;
}

// ─── Pure Math ─────────────────────────────────────────────────────

function realMsFromLaunch(realNowMs: number, launchDateMs: number): number {
  return Math.max(0, realNowMs - launchDateMs);
}

function inGameDaysElapsed(realElapsedMs: number, ratio: number): number {
  return (realElapsedMs / MS_PER_REAL_DAY) * ratio;
}

function computeInGameDate(totalInGameDays: number): InGameDate {
  const totalDaysFloor = Math.floor(totalInGameDays);
  const year = 1 + Math.floor(totalDaysFloor / DAYS_PER_INGAME_YEAR);
  const dayOfYear = totalDaysFloor % DAYS_PER_INGAME_YEAR;
  const month = 1 + Math.floor(dayOfYear / DAYS_PER_INGAME_MONTH);
  const day = 1 + (dayOfYear % DAYS_PER_INGAME_MONTH);
  return { year, month, day };
}

// ─── Factory ───────────────────────────────────────────────────────

export function createTimeService(config: TimeServiceConfig = DEFAULT_TIME_CONFIG): TimeService {
  const { launchDateMs, compressionRatio } = config;

  return {
    getCompressionRatio(): number {
      return compressionRatio;
    },

    getInGameYear(realNowMs: number): number {
      const elapsed = realMsFromLaunch(realNowMs, launchDateMs);
      const days = inGameDaysElapsed(elapsed, compressionRatio);
      return 1 + Math.floor(days / DAYS_PER_INGAME_YEAR);
    },

    getInGameYearsElapsed(realNowMs: number): number {
      const elapsed = realMsFromLaunch(realNowMs, launchDateMs);
      const days = inGameDaysElapsed(elapsed, compressionRatio);
      return days / DAYS_PER_INGAME_YEAR;
    },

    getInGameDate(realNowMs: number): InGameDate {
      const elapsed = realMsFromLaunch(realNowMs, launchDateMs);
      const days = inGameDaysElapsed(elapsed, compressionRatio);
      return computeInGameDate(days);
    },

    realMsToInGameMs(realMs: number): number {
      return realMs * compressionRatio;
    },

    inGameMsToRealMs(inGameMs: number): number {
      return inGameMs / compressionRatio;
    },

    realDaysToInGame(realDays: number): number {
      return realDays * compressionRatio;
    },

    inGameDaysToReal(inGameDays: number): number {
      return inGameDays / compressionRatio;
    },
  };
}
