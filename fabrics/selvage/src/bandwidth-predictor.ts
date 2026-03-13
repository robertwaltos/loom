/**
 * bandwidth-predictor.ts — ML-driven bandwidth prediction.
 *
 * NEXT-STEPS Phase 17.3: "Bandwidth optimization: ML-driven prediction
 * of needed state updates."
 *
 * Per-client bandwidth need prediction using:
 *   1. EWMA of recent observed usage (short-term trend).
 *   2. A sliding window for peak / variance tracking.
 *   3. A "spike guard" multiplier applied when variance is high.
 *   4. An activity-bucket model: each client is classified into a
 *      movement tier (IDLE / WALKING / COMBAT / TRANSIT) and each tier
 *      carries a different baseline and growth rate.
 *
 * Output: `predictedBytesNextTick` for each registered client.
 * The BandwidthOptimizer uses this to pre-allocate tick budgets before
 * the actual candidates arrive, reducing first-tick starvation.
 *
 * Thread: steel/selvage/bandwidth-predictor
 * Tier: 1
 */

// ── Constants ─────────────────────────────────────────────────────

export const BANDWIDTH_PREDICTOR_PRIORITY = 29; // Before optimizer (30)

const EWMA_FAST_ALPHA  = 0.30;  // reacts quickly
const EWMA_SLOW_ALPHA  = 0.05;  // long-term baseline
const WINDOW_SIZE      = 32;    // samples for variance / peak
const SPIKE_MULTIPLIER = 1.50;  // headroom when variance is high
const VARIANCE_THRESHOLD = 0.25; // relative variance to trigger spike guard

// ── Types ─────────────────────────────────────────────────────────

/** Player activity tier — drives baseline prediction. */
export type ActivityTier = 'idle' | 'walking' | 'combat' | 'transit';

/** Per-tier bytes/tick baseline multipliers relative to the client's budget. */
const ACTIVITY_BASELINE: Record<ActivityTier, number> = {
  idle:    0.10,
  walking: 0.35,
  combat:  0.85,
  transit: 0.60,
};

export interface BandwidthPredictorDeps {
  readonly clock: { readonly nowMs: () => number };
}

export interface BandwidthPredictorConfig {
  readonly ewmaFastAlpha?: number;
  readonly ewmaSlowAlpha?: number;
  readonly windowSize?: number;
  readonly spikeMultiplier?: number;
}

export interface PredictionResult {
  readonly clientId: string;
  readonly predictedBytesNextTick: number;
  readonly confidenceLevel: number;   // 0.0–1.0 (higher = more stable)
  readonly activityTier: ActivityTier;
  readonly fastEwma: number;
  readonly slowEwma: number;
}

export interface ClientPredictorStats {
  readonly clientId: string;
  readonly observedSamples: number;
  readonly fastEwma: number;
  readonly slowEwma: number;
  readonly peakObserved: number;
  readonly varianceEstimate: number;
  readonly activityTier: ActivityTier;
  readonly lastPrediction: number;
}

export interface BandwidthPredictorService {
  /** Register a client. Returns false if already registered. */
  registerClient(clientId: string, initialBudgetBytes?: number): boolean;
  /** Unregister a client. */
  unregisterClient(clientId: string): boolean;
  /**
   * Record actual bytes sent for a client this tick.
   * Call after each server tick to feed the predictor.
   */
  recordObservation(clientId: string, bytesActuallySent: number): void;
  /**
   * Update the activity tier for a client (e.g. from entity movement state).
   */
  setActivityTier(clientId: string, tier: ActivityTier): void;
  /** Predict bytes needed for the NEXT tick for a client. */
  predict(clientId: string): PredictionResult | undefined;
  /** Bulk predict for all registered clients. */
  predictAll(): readonly PredictionResult[];
  /** Per-client predictor stats. */
  getStats(clientId: string): ClientPredictorStats | undefined;
  /** Number of registered clients. */
  clientCount(): number;
}

// ── Internal state ────────────────────────────────────────────────

interface SlidingWindow {
  readonly samples: Float64Array;
  head: number;
  count: number;
}

function makeWindow(size: number): SlidingWindow {
  return { samples: new Float64Array(size), head: 0, count: 0 };
}

function windowPush(w: SlidingWindow, value: number): void {
  w.samples[w.head] = value;
  w.head = (w.head + 1) % w.samples.length;
  if (w.count < w.samples.length) w.count++;
}

function windowMean(w: SlidingWindow): number {
  if (w.count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < w.count; i++) sum += w.samples[i] ?? 0;
  return sum / w.count;
}

function windowVariance(w: SlidingWindow, mean: number): number {
  if (w.count < 2) return 0;
  let sumSq = 0;
  for (let i = 0; i < w.count; i++) {
    const diff = (w.samples[i] ?? 0) - mean;
    sumSq += diff * diff;
  }
  return sumSq / (w.count - 1);
}

function windowMax(w: SlidingWindow): number {
  if (w.count === 0) return 0;
  let max = -Infinity;
  for (let i = 0; i < w.count; i++) {
    const v = w.samples[i] ?? 0;
    if (v > max) max = v;
  }
  return max;
}

interface ClientPredictorState {
  readonly clientId: string;
  fastEwma: number;
  slowEwma: number;
  readonly window: SlidingWindow;
  activityTier: ActivityTier;
  initialBudgetBytes: number;
  observedSamples: number;
  lastPrediction: number;
}

// ── Factory ───────────────────────────────────────────────────────

export function createBandwidthPredictor(
  deps: BandwidthPredictorDeps,
  config: BandwidthPredictorConfig = {},
): BandwidthPredictorService {
  const fastAlpha      = config.ewmaFastAlpha  ?? EWMA_FAST_ALPHA;
  const slowAlpha      = config.ewmaSlowAlpha  ?? EWMA_SLOW_ALPHA;
  const windowSize     = config.windowSize     ?? WINDOW_SIZE;
  const spikeMulti     = config.spikeMultiplier ?? SPIKE_MULTIPLIER;

  const clients = new Map<string, ClientPredictorState>();

  function registerClient(clientId: string, initialBudgetBytes?: number): boolean {
    if (clients.has(clientId)) return false;
    const budget = initialBudgetBytes ?? 2083; // ~500kbps @ 30Hz
    clients.set(clientId, {
      clientId,
      fastEwma: budget * ACTIVITY_BASELINE.idle,
      slowEwma: budget * ACTIVITY_BASELINE.idle,
      window: makeWindow(windowSize),
      activityTier: 'idle',
      initialBudgetBytes: budget,
      observedSamples: 0,
      lastPrediction: 0,
    });
    return true;
  }

  function unregisterClient(clientId: string): boolean {
    return clients.delete(clientId);
  }

  function recordObservation(clientId: string, bytesActuallySent: number): void {
    const c = clients.get(clientId);
    if (!c) return;
    c.fastEwma = c.fastEwma * (1 - fastAlpha) + bytesActuallySent * fastAlpha;
    c.slowEwma = c.slowEwma * (1 - slowAlpha) + bytesActuallySent * slowAlpha;
    windowPush(c.window, bytesActuallySent);
    c.observedSamples++;
  }

  function setActivityTier(clientId: string, tier: ActivityTier): void {
    const c = clients.get(clientId);
    if (c) c.activityTier = tier;
  }

  function buildPrediction(c: ClientPredictorState): PredictionResult {
    const windowMeanVal = windowMean(c.window);
    const variance      = windowVariance(c.window, windowMeanVal);
    const relVariance   = windowMeanVal > 0 ? Math.sqrt(variance) / windowMeanVal : 0;

    // Spike guard: if variance is high, add headroom
    const spikeFactor = relVariance > VARIANCE_THRESHOLD ? spikeMulti : 1.0;

    // Blend fast EWMA with activity-tier baseline
    const activityBaseline = c.initialBudgetBytes * ACTIVITY_BASELINE[c.activityTier];
    const blendWeight      = Math.min(c.observedSamples / windowSize, 1.0);
    const blended          = c.fastEwma * blendWeight + activityBaseline * (1 - blendWeight);

    const predicted = Math.ceil(blended * spikeFactor);

    // Confidence: 1.0 when we have full window with low variance
    const confidenceLevel = Math.max(0, 1 - relVariance) * Math.min(c.observedSamples / windowSize, 1.0);

    c.lastPrediction = predicted;

    return {
      clientId:                c.clientId,
      predictedBytesNextTick:  predicted,
      confidenceLevel,
      activityTier:            c.activityTier,
      fastEwma:                c.fastEwma,
      slowEwma:                c.slowEwma,
    };
  }

  function predict(clientId: string): PredictionResult | undefined {
    const c = clients.get(clientId);
    if (!c) return undefined;
    return buildPrediction(c);
  }

  function predictAll(): readonly PredictionResult[] {
    const results: PredictionResult[] = [];
    for (const c of clients.values()) {
      results.push(buildPrediction(c));
    }
    return results;
  }

  function getStats(clientId: string): ClientPredictorStats | undefined {
    const c = clients.get(clientId);
    if (!c) return undefined;
    const mean     = windowMean(c.window);
    const variance = windowVariance(c.window, mean);
    return {
      clientId:          c.clientId,
      observedSamples:   c.observedSamples,
      fastEwma:          c.fastEwma,
      slowEwma:          c.slowEwma,
      peakObserved:      windowMax(c.window),
      varianceEstimate:  variance,
      activityTier:      c.activityTier,
      lastPrediction:    c.lastPrediction,
    };
  }

  function clientCount(): number {
    return clients.size;
  }

  return {
    registerClient,
    unregisterClient,
    recordObservation,
    setActivityTier,
    predict,
    predictAll,
    getStats,
    clientCount,
  };
}
