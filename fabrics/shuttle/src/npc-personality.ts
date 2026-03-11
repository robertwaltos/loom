/**
 * NPC Personality System — Big Five personality model and mood system.
 *
 * Each NPC has five core traits (OCEAN model):
 *   Openness:          imagination, curiosity, willingness to explore
 *   Conscientiousness: discipline, reliability, work ethic
 *   Extraversion:      sociability, energy, assertiveness
 *   Agreeableness:     cooperation, empathy, trust
 *   Neuroticism:       anxiety, emotional volatility, stress sensitivity
 *
 * Personality drives NPC behavior through:
 *   - Mood modifiers that shift emotional state over time
 *   - Behavioral tendency predictions for given situations
 *   - Emotional response calculations for events
 *   - Compatibility scoring between NPC pairs
 *
 * "Each thread carries its own color."
 */

// ── Ports ────────────────────────────────────────────────────────

interface PersonalityClock {
  readonly nowMicroseconds: () => number;
}

interface PersonalityIdGenerator {
  readonly next: () => string;
}

export interface PersonalityDeps {
  readonly clock: PersonalityClock;
  readonly idGenerator: PersonalityIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

export type PersonalityTrait =
  | 'openness'
  | 'conscientiousness'
  | 'extraversion'
  | 'agreeableness'
  | 'neuroticism';

export interface PersonalityTraits {
  readonly openness: number;
  readonly conscientiousness: number;
  readonly extraversion: number;
  readonly agreeableness: number;
  readonly neuroticism: number;
}

export interface MoodState {
  readonly valence: number;
  readonly arousal: number;
  readonly dominantEmotion: string;
  readonly updatedAt: number;
}

export interface MoodModifier {
  readonly valenceShift: number;
  readonly arousalShift: number;
  readonly source: string;
  readonly duration?: number;
}

export interface PersonalityProfile {
  readonly profileId: string;
  readonly npcId: string;
  readonly traits: PersonalityTraits;
  readonly mood: MoodState;
  readonly createdAt: number;
}

export interface BehavioralTendency {
  readonly npcId: string;
  readonly situation: string;
  readonly approachStyle: string;
  readonly riskTolerance: number;
  readonly socialOrientation: number;
  readonly emotionalReactivity: number;
  readonly methodicalness: number;
  readonly creativity: number;
}

export interface EmotionalResponse {
  readonly npcId: string;
  readonly event: string;
  readonly primaryEmotion: string;
  readonly intensity: number;
  readonly valenceShift: number;
  readonly arousalShift: number;
  readonly copingStrategy: string;
}

export interface PersonalityStats {
  readonly totalPersonalities: number;
  readonly averageValence: number;
  readonly averageArousal: number;
  readonly traitAverages: PersonalityTraits;
}

// ── Backward-Compatible Type Aliases ─────────────────────────────
// index.ts re-exports these names; keep them available.

export type Mood = MoodState;

export interface NpcPersonality {
  readonly personalityId: string;
  readonly npcId: string;
  readonly traits: PersonalityTraits;
  readonly mood: MoodState;
  readonly createdAt: number;
}

export interface CreatePersonalityParams {
  readonly npcId: string;
  readonly traits: PersonalityTraits;
  readonly initialMood?: { readonly valence: number; readonly arousal: number };
}

export type MoodInfluence = MoodModifier;

export interface MoodUpdateResult {
  readonly npcId: string;
  readonly previousMood: MoodState;
  readonly newMood: MoodState;
}

export type PersonalityTemplateName =
  | 'farmer'
  | 'merchant'
  | 'guard'
  | 'scholar'
  | 'priest'
  | 'adventurer'
  | 'recluse'
  | 'diplomat';

export interface PersonalityCompatibility {
  readonly npcA: string;
  readonly npcB: string;
  readonly score: number;
  readonly complementary: boolean;
}

export interface BehaviorModifiers {
  readonly riskTolerance: number;
  readonly socialDrive: number;
  readonly workEthic: number;
  readonly emotionalStability: number;
  readonly curiosity: number;
}

// ── Constants ────────────────────────────────────────────────────

export const DEFAULT_MOOD_DECAY_RATE = 0.1;

export const TRAIT_INFLUENCE_WEIGHTS: Readonly<Record<PersonalityTrait, number>> = {
  openness: 0.2,
  conscientiousness: 0.2,
  extraversion: 0.2,
  agreeableness: 0.2,
  neuroticism: 0.2,
};

export const BASELINE_MOOD: Readonly<{ valence: number; arousal: number }> = {
  valence: 0.5,
  arousal: 0.3,
};

export const PERSONALITY_TEMPLATES: Readonly<Record<PersonalityTemplateName, PersonalityTraits>> = {
  farmer: {
    openness: 0.3,
    conscientiousness: 0.8,
    extraversion: 0.4,
    agreeableness: 0.7,
    neuroticism: 0.3,
  },
  merchant: {
    openness: 0.5,
    conscientiousness: 0.7,
    extraversion: 0.8,
    agreeableness: 0.5,
    neuroticism: 0.4,
  },
  guard: {
    openness: 0.3,
    conscientiousness: 0.9,
    extraversion: 0.5,
    agreeableness: 0.4,
    neuroticism: 0.3,
  },
  scholar: {
    openness: 0.9,
    conscientiousness: 0.7,
    extraversion: 0.3,
    agreeableness: 0.6,
    neuroticism: 0.5,
  },
  priest: {
    openness: 0.6,
    conscientiousness: 0.8,
    extraversion: 0.5,
    agreeableness: 0.9,
    neuroticism: 0.2,
  },
  adventurer: {
    openness: 0.9,
    conscientiousness: 0.4,
    extraversion: 0.8,
    agreeableness: 0.5,
    neuroticism: 0.5,
  },
  recluse: {
    openness: 0.4,
    conscientiousness: 0.5,
    extraversion: 0.1,
    agreeableness: 0.3,
    neuroticism: 0.7,
  },
  diplomat: {
    openness: 0.7,
    conscientiousness: 0.8,
    extraversion: 0.7,
    agreeableness: 0.9,
    neuroticism: 0.2,
  },
};

// ── Emotion Classification ───────────────────────────────────────

const POSITIVE_EMOTIONS = ['joy', 'contentment', 'excitement', 'gratitude', 'pride'] as const;
const NEGATIVE_EMOTIONS = ['anger', 'fear', 'sadness', 'disgust', 'anxiety'] as const;
const NEUTRAL_EMOTIONS = ['surprise', 'curiosity', 'contemplation'] as const;

// ── State ────────────────────────────────────────────────────────

interface MutableProfile {
  readonly profileId: string;
  readonly npcId: string;
  readonly traits: PersonalityTraits;
  valence: number;
  arousal: number;
  dominantEmotion: string;
  moodUpdatedAt: number;
  readonly createdAt: number;
}

interface PersonalityState {
  readonly deps: PersonalityDeps;
  readonly profiles: Map<string, MutableProfile>;
}

// ── Helpers ──────────────────────────────────────────────────────

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampTraits(traits: PersonalityTraits): PersonalityTraits {
  return {
    openness: clamp01(traits.openness),
    conscientiousness: clamp01(traits.conscientiousness),
    extraversion: clamp01(traits.extraversion),
    agreeableness: clamp01(traits.agreeableness),
    neuroticism: clamp01(traits.neuroticism),
  };
}

function buildMoodState(p: MutableProfile): MoodState {
  return {
    valence: p.valence,
    arousal: p.arousal,
    dominantEmotion: p.dominantEmotion,
    updatedAt: p.moodUpdatedAt,
  };
}

function toProfile(p: MutableProfile): PersonalityProfile {
  return {
    profileId: p.profileId,
    npcId: p.npcId,
    traits: p.traits,
    mood: buildMoodState(p),
    createdAt: p.createdAt,
  };
}

function computeDominantEmotion(valence: number, arousal: number): string {
  if (valence > 0.65 && arousal > 0.6) return 'excitement';
  if (valence > 0.65 && arousal <= 0.6) return 'contentment';
  if (valence < 0.35 && arousal > 0.6) return 'anger';
  if (valence < 0.35 && arousal <= 0.6) return 'sadness';
  if (arousal > 0.7) return 'surprise';
  if (valence >= 0.45 && valence <= 0.55) return 'contemplation';
  if (valence > 0.5) return 'joy';
  return 'anxiety';
}

function decayToward(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

// ── Register ─────────────────────────────────────────────────────

function registerNpcImpl(
  state: PersonalityState,
  npcId: string,
  traits: PersonalityTraits,
): PersonalityProfile {
  const now = state.deps.clock.nowMicroseconds();
  const clamped = clampTraits(traits);
  const profile: MutableProfile = {
    profileId: state.deps.idGenerator.next(),
    npcId,
    traits: clamped,
    valence: BASELINE_MOOD.valence,
    arousal: BASELINE_MOOD.arousal,
    dominantEmotion: computeDominantEmotion(BASELINE_MOOD.valence, BASELINE_MOOD.arousal),
    moodUpdatedAt: now,
    createdAt: now,
  };
  state.profiles.set(npcId, profile);
  return toProfile(profile);
}

// ── Get Profile ──────────────────────────────────────────────────

function getProfileImpl(state: PersonalityState, npcId: string): PersonalityProfile | undefined {
  const p = state.profiles.get(npcId);
  return p !== undefined ? toProfile(p) : undefined;
}

// ── Get Current Mood ─────────────────────────────────────────────

function getCurrentMoodImpl(state: PersonalityState, npcId: string): MoodState {
  const p = state.profiles.get(npcId);
  if (p === undefined) {
    return {
      valence: BASELINE_MOOD.valence,
      arousal: BASELINE_MOOD.arousal,
      dominantEmotion: 'contemplation',
      updatedAt: 0,
    };
  }
  return buildMoodState(p);
}

// ── Apply Mood Modifier ──────────────────────────────────────────

function applyMoodModifierImpl(
  state: PersonalityState,
  npcId: string,
  modifier: MoodModifier,
): MoodState | string {
  const p = state.profiles.get(npcId);
  if (p === undefined) return 'NPC_NOT_FOUND';
  const neuroFactor = 1 + (p.traits.neuroticism - 0.5);
  p.valence = clamp01(p.valence + modifier.valenceShift * neuroFactor);
  p.arousal = clamp01(p.arousal + modifier.arousalShift * neuroFactor);
  p.dominantEmotion = computeDominantEmotion(p.valence, p.arousal);
  p.moodUpdatedAt = state.deps.clock.nowMicroseconds();
  return buildMoodState(p);
}

// ── Decay Mood ───────────────────────────────────────────────────

function decayMoodImpl(state: PersonalityState, npcId: string): MoodState | string {
  const p = state.profiles.get(npcId);
  if (p === undefined) return 'NPC_NOT_FOUND';
  p.valence = decayToward(p.valence, BASELINE_MOOD.valence, DEFAULT_MOOD_DECAY_RATE);
  p.arousal = decayToward(p.arousal, BASELINE_MOOD.arousal, DEFAULT_MOOD_DECAY_RATE);
  p.dominantEmotion = computeDominantEmotion(p.valence, p.arousal);
  p.moodUpdatedAt = state.deps.clock.nowMicroseconds();
  return buildMoodState(p);
}

// ── Predict Behavior ─────────────────────────────────────────────

function predictBehaviorImpl(
  state: PersonalityState,
  npcId: string,
  situation: string,
): BehavioralTendency {
  const p = state.profiles.get(npcId);
  if (p === undefined) {
    return defaultBehavioralTendency(npcId, situation);
  }
  return computeBehavioralTendency(p, situation);
}

function computeBehavioralTendency(p: MutableProfile, situation: string): BehavioralTendency {
  const traits = p.traits;
  return {
    npcId: p.npcId,
    situation,
    approachStyle: determineApproachStyle(traits),
    riskTolerance: computeRiskTolerance(traits),
    socialOrientation: traits.extraversion,
    emotionalReactivity: traits.neuroticism,
    methodicalness: traits.conscientiousness,
    creativity: traits.openness,
  };
}

function determineApproachStyle(traits: PersonalityTraits): string {
  if (traits.openness > 0.7 && traits.extraversion > 0.6) return 'bold_explorer';
  if (traits.conscientiousness > 0.7 && traits.agreeableness > 0.6) return 'methodical_cooperator';
  if (traits.neuroticism > 0.7) return 'cautious_analyzer';
  if (traits.extraversion > 0.7) return 'social_leader';
  if (traits.openness > 0.7) return 'creative_solver';
  if (traits.conscientiousness > 0.7) return 'disciplined_executor';
  return 'balanced_pragmatist';
}

function computeRiskTolerance(traits: PersonalityTraits): number {
  return clamp01((traits.openness + traits.extraversion - traits.neuroticism) / 2);
}

function defaultBehavioralTendency(npcId: string, situation: string): BehavioralTendency {
  return {
    npcId,
    situation,
    approachStyle: 'balanced_pragmatist',
    riskTolerance: 0.5,
    socialOrientation: 0.5,
    emotionalReactivity: 0.5,
    methodicalness: 0.5,
    creativity: 0.5,
  };
}

// ── Calculate Emotional Response ─────────────────────────────────

function calculateEmotionalResponseImpl(
  state: PersonalityState,
  npcId: string,
  event: string,
): EmotionalResponse {
  const p = state.profiles.get(npcId);
  if (p === undefined) {
    return defaultEmotionalResponse(npcId, event);
  }
  return computeEmotionalResponse(p, event);
}

function computeEmotionalResponse(p: MutableProfile, event: string): EmotionalResponse {
  const traits = p.traits;
  const intensity = computeEmotionalIntensity(traits);
  const valenceShift = computeValenceShift(traits);
  const arousalShift = computeArousalShift(traits);
  const primaryEmotion = deriveEmotionFromTraits(traits, valenceShift);
  const copingStrategy = deriveCopingStrategy(traits);
  return {
    npcId: p.npcId,
    event,
    primaryEmotion,
    intensity,
    valenceShift,
    arousalShift,
    copingStrategy,
  };
}

function computeEmotionalIntensity(traits: PersonalityTraits): number {
  return clamp01(0.3 + traits.neuroticism * 0.4 + traits.extraversion * 0.3);
}

function computeValenceShift(traits: PersonalityTraits): number {
  const base = (traits.agreeableness - 0.5) * 0.3;
  const neuroEffect = (0.5 - traits.neuroticism) * 0.2;
  return clamp01(0.5 + base + neuroEffect) - 0.5;
}

function computeArousalShift(traits: PersonalityTraits): number {
  const base = (traits.extraversion - 0.5) * 0.3;
  const neuroEffect = (traits.neuroticism - 0.5) * 0.2;
  return clamp01(0.5 + base + neuroEffect) - 0.5;
}

function deriveEmotionFromTraits(traits: PersonalityTraits, valenceShift: number): string {
  if (valenceShift > 0.05 && traits.extraversion > 0.6) return 'excitement';
  if (valenceShift > 0.05) return 'joy';
  if (valenceShift < -0.05 && traits.neuroticism > 0.6) return 'anxiety';
  if (valenceShift < -0.05) return 'sadness';
  if (traits.openness > 0.7) return 'curiosity';
  return 'contemplation';
}

function deriveCopingStrategy(traits: PersonalityTraits): string {
  if (traits.conscientiousness > 0.7) return 'problem_solving';
  if (traits.agreeableness > 0.7) return 'social_support';
  if (traits.openness > 0.7) return 'creative_reframing';
  if (traits.extraversion > 0.7) return 'active_distraction';
  if (traits.neuroticism > 0.7) return 'emotional_processing';
  return 'acceptance';
}

function defaultEmotionalResponse(npcId: string, event: string): EmotionalResponse {
  return {
    npcId,
    event,
    primaryEmotion: 'contemplation',
    intensity: 0.5,
    valenceShift: 0,
    arousalShift: 0,
    copingStrategy: 'acceptance',
  };
}

// ── Compatibility ────────────────────────────────────────────────

function getCompatibilityImpl(state: PersonalityState, npcIdA: string, npcIdB: string): number {
  const pA = state.profiles.get(npcIdA);
  const pB = state.profiles.get(npcIdB);
  if (pA === undefined || pB === undefined) return 0;
  return computeCompatibilityScore(pA.traits, pB.traits);
}

function computeCompatibilityScore(a: PersonalityTraits, b: PersonalityTraits): number {
  const diffs = [
    a.openness - b.openness,
    a.conscientiousness - b.conscientiousness,
    a.extraversion - b.extraversion,
    a.agreeableness - b.agreeableness,
    a.neuroticism - b.neuroticism,
  ];
  let sumSq = 0;
  for (const d of diffs) {
    sumSq += d * d;
  }
  const distance = Math.sqrt(sumSq / 5);
  return clamp01(1 - distance);
}

// ── List By Trait ────────────────────────────────────────────────

function listByTraitImpl(
  state: PersonalityState,
  trait: PersonalityTrait,
  minValue: number,
): readonly PersonalityProfile[] {
  const results: PersonalityProfile[] = [];
  for (const p of state.profiles.values()) {
    if (p.traits[trait] >= minValue) {
      results.push(toProfile(p));
    }
  }
  results.sort((a, b) => b.traits[trait] - a.traits[trait]);
  return results;
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: PersonalityState): PersonalityStats {
  let totalValence = 0;
  let totalArousal = 0;
  let totalO = 0;
  let totalC = 0;
  let totalE = 0;
  let totalA = 0;
  let totalN = 0;
  const count = state.profiles.size;
  for (const p of state.profiles.values()) {
    totalValence += p.valence;
    totalArousal += p.arousal;
    totalO += p.traits.openness;
    totalC += p.traits.conscientiousness;
    totalE += p.traits.extraversion;
    totalA += p.traits.agreeableness;
    totalN += p.traits.neuroticism;
  }
  const divisor = count > 0 ? count : 1;
  return {
    totalPersonalities: count,
    averageValence: count > 0 ? totalValence / divisor : 0,
    averageArousal: count > 0 ? totalArousal / divisor : 0,
    traitAverages: {
      openness: count > 0 ? totalO / divisor : 0,
      conscientiousness: count > 0 ? totalC / divisor : 0,
      extraversion: count > 0 ? totalE / divisor : 0,
      agreeableness: count > 0 ? totalA / divisor : 0,
      neuroticism: count > 0 ? totalN / divisor : 0,
    },
  };
}

// ── Public Interface ─────────────────────────────────────────────

export interface PersonalitySystem {
  registerNpc(npcId: string, traits: PersonalityTraits): PersonalityProfile;
  getProfile(npcId: string): PersonalityProfile | undefined;
  getCurrentMood(npcId: string): MoodState;
  applyMoodModifier(npcId: string, modifier: MoodModifier): MoodState | string;
  decayMood(npcId: string): MoodState | string;
  predictBehavior(npcId: string, situation: string): BehavioralTendency;
  calculateEmotionalResponse(npcId: string, event: string): EmotionalResponse;
  getCompatibility(npcIdA: string, npcIdB: string): number;
  listByTrait(trait: PersonalityTrait, minValue: number): readonly PersonalityProfile[];
  getStats(): PersonalityStats;
}

// ── Factory ──────────────────────────────────────────────────────

export function createPersonalitySystem(deps: PersonalityDeps): PersonalitySystem {
  const state: PersonalityState = { deps, profiles: new Map() };

  return {
    registerNpc: (npcId, traits) => registerNpcImpl(state, npcId, traits),
    getProfile: (npcId) => getProfileImpl(state, npcId),
    getCurrentMood: (npcId) => getCurrentMoodImpl(state, npcId),
    applyMoodModifier: (npcId, modifier) => applyMoodModifierImpl(state, npcId, modifier),
    decayMood: (npcId) => decayMoodImpl(state, npcId),
    predictBehavior: (npcId, situation) => predictBehaviorImpl(state, npcId, situation),
    calculateEmotionalResponse: (npcId, event) =>
      calculateEmotionalResponseImpl(state, npcId, event),
    getCompatibility: (npcIdA, npcIdB) => getCompatibilityImpl(state, npcIdA, npcIdB),
    listByTrait: (trait, minValue) => listByTraitImpl(state, trait, minValue),
    getStats: () => getStatsImpl(state),
  };
}
