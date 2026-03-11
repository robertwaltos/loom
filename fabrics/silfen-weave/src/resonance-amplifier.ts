/**
 * resonance-amplifier.ts — Frequency resonance management for transit corridors.
 *
 * Amplifiers boost the frequency resonance field strength along transit
 * corridors to maintain coherence over long distances. Tracks amplification
 * levels, power consumption, resonance decay, harmonic interference,
 * and provides placement strategy recommendations.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AmplifierClock {
  readonly nowMicroseconds: () => number;
}

interface AmplifierIdGenerator {
  readonly generate: () => string;
}

// ── Deps ─────────────────────────────────────────────────────────

interface ResonanceAmplifierDeps {
  readonly clock: AmplifierClock;
  readonly idGenerator: AmplifierIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type AmplifierStatus = 'offline' | 'warming' | 'active' | 'overloaded' | 'failed';

interface Amplifier {
  readonly amplifierId: string;
  readonly corridorId: string;
  readonly nodeId: string;
  readonly amplificationLevel: number;
  readonly maxAmplification: number;
  readonly powerConsumed: number;
  readonly powerCapacity: number;
  readonly status: AmplifierStatus;
  readonly placedAt: number;
  readonly lastActiveAt: number;
}

interface PlaceAmplifierParams {
  readonly corridorId: string;
  readonly nodeId: string;
  readonly maxAmplification: number;
  readonly powerCapacity: number;
}

interface ResonanceField {
  readonly corridorId: string;
  readonly fieldStrength: number;
  readonly amplifierCount: number;
  readonly totalAmplification: number;
  readonly interference: number;
  readonly effectiveStrength: number;
}

interface HarmonicInterference {
  readonly interferenceId: string;
  readonly corridorId: string;
  readonly sourceAmplifierId: string;
  readonly targetAmplifierId: string;
  readonly severity: InterferenceSeverity;
  readonly magnitudeLoss: number;
  readonly detectedAt: number;
}

type InterferenceSeverity = 'negligible' | 'minor' | 'moderate' | 'severe' | 'destructive';

interface DecayEvent {
  readonly amplifierId: string;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly decayAmount: number;
  readonly timestamp: number;
}

interface PlacementRecommendation {
  readonly corridorId: string;
  readonly suggestedNodeId: string;
  readonly reason: PlacementReason;
  readonly expectedGain: number;
}

type PlacementReason =
  | 'coverage_gap'
  | 'boost_weak_segment'
  | 'replace_failed'
  | 'reduce_interference';

interface AmplifierConfig {
  readonly decayRatePerHour: number;
  readonly powerPerAmplificationUnit: number;
  readonly warmupDurationUs: number;
  readonly overloadThreshold: number;
  readonly interferenceDistanceThreshold: number;
}

interface AmplifierStats {
  readonly totalAmplifiers: number;
  readonly activeCount: number;
  readonly failedCount: number;
  readonly overloadedCount: number;
  readonly totalPowerConsumed: number;
  readonly averageAmplification: number;
  readonly totalInterferences: number;
}

// ── Constants ────────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;

const DEFAULT_AMPLIFIER_CONFIG: AmplifierConfig = {
  decayRatePerHour: 2.0,
  powerPerAmplificationUnit: 10.0,
  warmupDurationUs: 5_000_000,
  overloadThreshold: 0.9,
  interferenceDistanceThreshold: 3,
};

// ── State ────────────────────────────────────────────────────────

interface MutableAmplifier {
  readonly amplifierId: string;
  readonly corridorId: string;
  readonly nodeId: string;
  amplificationLevel: number;
  readonly maxAmplification: number;
  powerConsumed: number;
  readonly powerCapacity: number;
  status: AmplifierStatus;
  readonly placedAt: number;
  lastActiveAt: number;
}

interface AmplifierState {
  readonly deps: ResonanceAmplifierDeps;
  readonly config: AmplifierConfig;
  readonly amplifiers: Map<string, MutableAmplifier>;
  readonly interferences: HarmonicInterference[];
}

// ── Helpers ──────────────────────────────────────────────────────

function amplifierToReadonly(a: MutableAmplifier): Amplifier {
  return { ...a };
}

function classifyInterference(magnitudeLoss: number): InterferenceSeverity {
  if (magnitudeLoss >= 0.5) return 'destructive';
  if (magnitudeLoss >= 0.3) return 'severe';
  if (magnitudeLoss >= 0.15) return 'moderate';
  if (magnitudeLoss >= 0.05) return 'minor';
  return 'negligible';
}

// ── Placement Operations ─────────────────────────────────────────

function placeAmplifierImpl(state: AmplifierState, params: PlaceAmplifierParams): Amplifier {
  const amplifierId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  const amp: MutableAmplifier = {
    amplifierId,
    corridorId: params.corridorId,
    nodeId: params.nodeId,
    amplificationLevel: 0,
    maxAmplification: params.maxAmplification,
    powerConsumed: 0,
    powerCapacity: params.powerCapacity,
    status: 'warming',
    placedAt: now,
    lastActiveAt: now,
  };
  state.amplifiers.set(amplifierId, amp);
  return amplifierToReadonly(amp);
}

function removeAmplifierImpl(state: AmplifierState, amplifierId: string): boolean {
  return state.amplifiers.delete(amplifierId);
}

// ── Activation ───────────────────────────────────────────────────

function activateImpl(
  state: AmplifierState,
  amplifierId: string,
  level: number,
): Amplifier | string {
  const amp = state.amplifiers.get(amplifierId);
  if (amp === undefined) return 'amplifier_not_found';
  if (amp.status === 'failed') return 'amplifier_failed';
  return applyActivation(state, amp, level);
}

function applyActivation(
  state: AmplifierState,
  amp: MutableAmplifier,
  level: number,
): Amplifier | string {
  const clamped = Math.min(level, amp.maxAmplification);
  const powerNeeded = clamped * state.config.powerPerAmplificationUnit;
  if (powerNeeded > amp.powerCapacity) return 'insufficient_power';
  amp.amplificationLevel = clamped;
  amp.powerConsumed = powerNeeded;
  amp.status = 'active';
  amp.lastActiveAt = state.deps.clock.nowMicroseconds();
  checkOverload(state, amp);
  return amplifierToReadonly(amp);
}

function checkOverload(state: AmplifierState, amp: MutableAmplifier): void {
  const utilization = amp.powerConsumed / amp.powerCapacity;
  if (utilization >= state.config.overloadThreshold) {
    amp.status = 'overloaded';
  }
}

function deactivateImpl(state: AmplifierState, amplifierId: string): boolean {
  const amp = state.amplifiers.get(amplifierId);
  if (amp === undefined) return false;
  amp.amplificationLevel = 0;
  amp.powerConsumed = 0;
  amp.status = 'offline';
  return true;
}

// ── Resonance Decay ──────────────────────────────────────────────

function applyDecayImpl(state: AmplifierState): readonly DecayEvent[] {
  const now = state.deps.clock.nowMicroseconds();
  const events: DecayEvent[] = [];
  for (const amp of state.amplifiers.values()) {
    if (amp.status !== 'active' && amp.status !== 'overloaded') continue;
    const event = decayAmplifier(state, amp, now);
    if (event !== null) events.push(event);
  }
  return events;
}

function decayAmplifier(
  state: AmplifierState,
  amp: MutableAmplifier,
  now: number,
): DecayEvent | null {
  const elapsed = now - amp.lastActiveAt;
  const hours = elapsed / US_PER_HOUR;
  if (hours < 0.1) return null;
  const decay = hours * state.config.decayRatePerHour;
  const previous = amp.amplificationLevel;
  amp.amplificationLevel = Math.max(0, amp.amplificationLevel - decay);
  amp.powerConsumed = amp.amplificationLevel * state.config.powerPerAmplificationUnit;
  amp.lastActiveAt = now;
  if (amp.amplificationLevel <= 0) amp.status = 'offline';
  return {
    amplifierId: amp.amplifierId,
    previousLevel: previous,
    newLevel: amp.amplificationLevel,
    decayAmount: decay,
    timestamp: now,
  };
}

// ── Harmonic Interference ────────────────────────────────────────

function detectInterferenceImpl(
  state: AmplifierState,
  corridorId: string,
): readonly HarmonicInterference[] {
  const amps = getCorridorAmplifiers(state, corridorId);
  const detected: HarmonicInterference[] = [];
  for (let i = 0; i < amps.length; i++) {
    detectPairInterference(state, amps, i, detected);
  }
  return detected;
}

function detectPairInterference(
  state: AmplifierState,
  amps: readonly MutableAmplifier[],
  sourceIdx: number,
  detected: HarmonicInterference[],
): void {
  const source = amps[sourceIdx];
  if (source === undefined) return;
  if (source.status !== 'active' && source.status !== 'overloaded') return;
  for (let j = sourceIdx + 1; j < amps.length; j++) {
    const target = amps[j];
    if (target === undefined) continue;
    if (target.status !== 'active' && target.status !== 'overloaded') continue;
    evaluateInterference(state, source, target, detected);
  }
}

function evaluateInterference(
  state: AmplifierState,
  source: MutableAmplifier,
  target: MutableAmplifier,
  detected: HarmonicInterference[],
): void {
  const combined = source.amplificationLevel + target.amplificationLevel;
  const maxCombined = source.maxAmplification + target.maxAmplification;
  if (maxCombined === 0) return;
  const overlap = combined / maxCombined;
  if (overlap <= 0.5) return;
  const magnitudeLoss = (overlap - 0.5) * 0.6;
  const interference: HarmonicInterference = {
    interferenceId: state.deps.idGenerator.generate(),
    corridorId: source.corridorId,
    sourceAmplifierId: source.amplifierId,
    targetAmplifierId: target.amplifierId,
    severity: classifyInterference(magnitudeLoss),
    magnitudeLoss,
    detectedAt: state.deps.clock.nowMicroseconds(),
  };
  detected.push(interference);
  state.interferences.push(interference);
}

function getCorridorAmplifiers(
  state: AmplifierState,
  corridorId: string,
): readonly MutableAmplifier[] {
  const result: MutableAmplifier[] = [];
  for (const amp of state.amplifiers.values()) {
    if (amp.corridorId === corridorId) result.push(amp);
  }
  return result;
}

// ── Field Strength ───────────────────────────────────────────────

function getFieldStrengthImpl(state: AmplifierState, corridorId: string): ResonanceField {
  const amps = getCorridorAmplifiers(state, corridorId);
  let totalAmp = 0;
  let activeCount = 0;
  for (const a of amps) {
    if (a.status === 'active' || a.status === 'overloaded') {
      totalAmp += a.amplificationLevel;
      activeCount += 1;
    }
  }
  const interference = calculateTotalInterference(state, corridorId);
  const effective = Math.max(0, totalAmp - interference);
  return {
    corridorId,
    fieldStrength: totalAmp,
    amplifierCount: activeCount,
    totalAmplification: totalAmp,
    interference,
    effectiveStrength: effective,
  };
}

function calculateTotalInterference(state: AmplifierState, corridorId: string): number {
  let total = 0;
  for (const i of state.interferences) {
    if (i.corridorId === corridorId) total += i.magnitudeLoss;
  }
  return total;
}

// ── Placement Strategy ───────────────────────────────────────────

function getPlacementRecommendationsImpl(
  state: AmplifierState,
  corridorId: string,
  candidateNodeIds: readonly string[],
): readonly PlacementRecommendation[] {
  const existing = getCorridorAmplifiers(state, corridorId);
  const recommendations: PlacementRecommendation[] = [];
  recommendForFailedReplacements(state, corridorId, existing, recommendations);
  recommendForCoverageGaps(state, corridorId, candidateNodeIds, existing, recommendations);
  return recommendations;
}

function recommendForFailedReplacements(
  _state: AmplifierState,
  corridorId: string,
  existing: readonly MutableAmplifier[],
  recommendations: PlacementRecommendation[],
): void {
  for (const amp of existing) {
    if (amp.status !== 'failed') continue;
    recommendations.push({
      corridorId,
      suggestedNodeId: amp.nodeId,
      reason: 'replace_failed',
      expectedGain: amp.maxAmplification * 0.8,
    });
  }
}

function recommendForCoverageGaps(
  _state: AmplifierState,
  corridorId: string,
  candidateNodeIds: readonly string[],
  existing: readonly MutableAmplifier[],
  recommendations: PlacementRecommendation[],
): void {
  const coveredNodes = new Set<string>();
  for (const amp of existing) {
    coveredNodes.add(amp.nodeId);
  }
  for (const nodeId of candidateNodeIds) {
    if (coveredNodes.has(nodeId)) continue;
    recommendations.push({
      corridorId,
      suggestedNodeId: nodeId,
      reason: 'coverage_gap',
      expectedGain: 10.0,
    });
  }
}

// ── Queries ──────────────────────────────────────────────────────

function getAmplifierImpl(state: AmplifierState, amplifierId: string): Amplifier | undefined {
  const amp = state.amplifiers.get(amplifierId);
  return amp !== undefined ? amplifierToReadonly(amp) : undefined;
}

function listByCorridorImpl(state: AmplifierState, corridorId: string): readonly Amplifier[] {
  const result: Amplifier[] = [];
  for (const amp of state.amplifiers.values()) {
    if (amp.corridorId === corridorId) result.push(amplifierToReadonly(amp));
  }
  return result;
}

function markFailedImpl(state: AmplifierState, amplifierId: string): boolean {
  const amp = state.amplifiers.get(amplifierId);
  if (amp === undefined) return false;
  amp.status = 'failed';
  amp.amplificationLevel = 0;
  amp.powerConsumed = 0;
  return true;
}

function getStatsImpl(state: AmplifierState): AmplifierStats {
  let active = 0;
  let failed = 0;
  let overloaded = 0;
  let totalPower = 0;
  let totalAmp = 0;
  for (const amp of state.amplifiers.values()) {
    totalPower += amp.powerConsumed;
    totalAmp += amp.amplificationLevel;
    if (amp.status === 'active') active += 1;
    if (amp.status === 'failed') failed += 1;
    if (amp.status === 'overloaded') overloaded += 1;
  }
  const total = state.amplifiers.size;
  return {
    totalAmplifiers: total,
    activeCount: active,
    failedCount: failed,
    overloadedCount: overloaded,
    totalPowerConsumed: totalPower,
    averageAmplification: total > 0 ? totalAmp / total : 0,
    totalInterferences: state.interferences.length,
  };
}

// ── Public API ───────────────────────────────────────────────────

interface ResonanceAmplifier {
  readonly placeAmplifier: (params: PlaceAmplifierParams) => Amplifier;
  readonly removeAmplifier: (amplifierId: string) => boolean;
  readonly activate: (amplifierId: string, level: number) => Amplifier | string;
  readonly deactivate: (amplifierId: string) => boolean;
  readonly markFailed: (amplifierId: string) => boolean;
  readonly applyDecay: () => readonly DecayEvent[];
  readonly detectInterference: (corridorId: string) => readonly HarmonicInterference[];
  readonly getFieldStrength: (corridorId: string) => ResonanceField;
  readonly getPlacementRecommendations: (
    corridorId: string,
    candidateNodeIds: readonly string[],
  ) => readonly PlacementRecommendation[];
  readonly getAmplifier: (amplifierId: string) => Amplifier | undefined;
  readonly listByCorridor: (corridorId: string) => readonly Amplifier[];
  readonly getStats: () => AmplifierStats;
}

// ── Factory ──────────────────────────────────────────────────────

function createResonanceAmplifier(
  deps: ResonanceAmplifierDeps,
  config?: Partial<AmplifierConfig>,
): ResonanceAmplifier {
  const state: AmplifierState = {
    deps,
    config: { ...DEFAULT_AMPLIFIER_CONFIG, ...config },
    amplifiers: new Map(),
    interferences: [],
  };
  return {
    placeAmplifier: (p) => placeAmplifierImpl(state, p),
    removeAmplifier: (id) => removeAmplifierImpl(state, id),
    activate: (id, level) => activateImpl(state, id, level),
    deactivate: (id) => deactivateImpl(state, id),
    markFailed: (id) => markFailedImpl(state, id),
    applyDecay: () => applyDecayImpl(state),
    detectInterference: (cId) => detectInterferenceImpl(state, cId),
    getFieldStrength: (cId) => getFieldStrengthImpl(state, cId),
    getPlacementRecommendations: (cId, nodes) => getPlacementRecommendationsImpl(state, cId, nodes),
    getAmplifier: (id) => getAmplifierImpl(state, id),
    listByCorridor: (cId) => listByCorridorImpl(state, cId),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createResonanceAmplifier, DEFAULT_AMPLIFIER_CONFIG };
export type {
  ResonanceAmplifier,
  ResonanceAmplifierDeps,
  AmplifierClock,
  AmplifierIdGenerator,
  Amplifier,
  PlaceAmplifierParams,
  AmplifierStatus,
  ResonanceField,
  HarmonicInterference,
  InterferenceSeverity,
  DecayEvent,
  PlacementRecommendation,
  PlacementReason,
  AmplifierConfig,
  AmplifierStats,
};
