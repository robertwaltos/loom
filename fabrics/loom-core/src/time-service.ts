/**
 * TimeService — The single source of truth for in-game time.
 *
 * Implements Bible v1.1 Part 9: exponential compression decay.
 * At launch, 10 in-game years pass per 1 real year. The ratio halves
 * every 12 real years, asymptotically approaching 1:1 real time.
 *
 * Pure math — no side effects, no state mutation, fully testable.
 */

// ─── Constants ─────────────────────────────────────────────────────

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

// ─── Config ────────────────────────────────────────────────────────

export interface TimeServiceConfig {
  /** Epoch milliseconds for the canonical launch date. */
  readonly launchDateMs: number;
  /** In-game years per real year at launch. Bible: 10.0 */
  readonly initialRatio: number;
  /** Minimum compression ratio (floor). Bible: 1.0 */
  readonly finalRatio: number;
  /** Real years for the ratio to halve. Bible: 12.0 */
  readonly halfLifeRealYears: number;
}

export const DEFAULT_TIME_CONFIG: Readonly<TimeServiceConfig> = {
  launchDateMs: Date.UTC(2027, 0, 1),
  initialRatio: 10.0,
  finalRatio: 1.0,
  halfLifeRealYears: 12.0,
} as const;

// ─── Interface ─────────────────────────────────────────────────────

export interface TimeService {
  /** Current compression ratio at the given real time. */
  getCompressionRatio(realNowMs: number): number;

  /** In-game calendar year (1-based) at the given real time. */
  getInGameYear(realNowMs: number): number;

  /** Fractional in-game years elapsed since launch. */
  getInGameYearsElapsed(realNowMs: number): number;

  /**
   * Convert a real-time duration to in-game duration.
   * Uses the instantaneous ratio — accurate for short durations.
   */
  realMsToInGameMs(realMs: number, realNowMs: number): number;

  /**
   * Convert an in-game duration to real-time duration.
   * Uses the instantaneous ratio — accurate for short durations.
   */
  inGameMsToRealMs(inGameMs: number, realNowMs: number): number;
}

// ─── Pure Math ─────────────────────────────────────────────────────

function realYearsFromLaunch(
  realNowMs: number,
  launchDateMs: number,
): number {
  return Math.max(0, (realNowMs - launchDateMs) / MS_PER_YEAR);
}

function computeCompressionRatio(
  realYears: number,
  initialRatio: number,
  finalRatio: number,
  halfLife: number,
): number {
  const raw = initialRatio * Math.pow(2, -realYears / halfLife);
  return Math.max(raw, finalRatio);
}

/**
 * Integral of k * 2^(-t/h) from 0 to T.
 * = (k * h / ln2) * (1 - 2^(-T/h))
 */
function computeInGameYearsElapsed(
  realYears: number,
  initialRatio: number,
  halfLife: number,
): number {
  if (realYears <= 0) return 0;
  const coefficient = (initialRatio * halfLife) / Math.LN2;
  return coefficient * (1 - Math.pow(2, -realYears / halfLife));
}

// ─── Factory ───────────────────────────────────────────────────────

export function createTimeService(
  config: TimeServiceConfig = DEFAULT_TIME_CONFIG,
): TimeService {
  const { launchDateMs, initialRatio, finalRatio, halfLifeRealYears } = config;

  return {
    getCompressionRatio(realNowMs: number): number {
      const t = realYearsFromLaunch(realNowMs, launchDateMs);
      return computeCompressionRatio(t, initialRatio, finalRatio, halfLifeRealYears);
    },

    getInGameYear(realNowMs: number): number {
      const t = realYearsFromLaunch(realNowMs, launchDateMs);
      const elapsed = computeInGameYearsElapsed(t, initialRatio, halfLifeRealYears);
      return Math.floor(1 + elapsed);
    },

    getInGameYearsElapsed(realNowMs: number): number {
      const t = realYearsFromLaunch(realNowMs, launchDateMs);
      return computeInGameYearsElapsed(t, initialRatio, halfLifeRealYears);
    },

    realMsToInGameMs(realMs: number, realNowMs: number): number {
      const t = realYearsFromLaunch(realNowMs, launchDateMs);
      const ratio = computeCompressionRatio(t, initialRatio, finalRatio, halfLifeRealYears);
      return realMs * ratio;
    },

    inGameMsToRealMs(inGameMs: number, realNowMs: number): number {
      const t = realYearsFromLaunch(realNowMs, launchDateMs);
      const ratio = computeCompressionRatio(t, initialRatio, finalRatio, halfLifeRealYears);
      return inGameMs / ratio;
    },
  };
}
