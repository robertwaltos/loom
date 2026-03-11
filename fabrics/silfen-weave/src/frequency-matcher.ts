/**
 * Frequency Signature Matcher — Compatibility analysis for Silfen Weave transit.
 *
 * Bible v1.1 Part 8: Transit requires frequency resonance between origin and
 * destination nodes. This module provides deep comparison of frequency
 * signatures beyond simple resonance scoring: harmonic overlap, primary
 * frequency alignment, field strength delta, drift detection, and ranked
 * candidate matching.
 *
 * Match Quality Tiers:
 *   perfect       — compatibility >= 0.95
 *   strong        — compatibility >= 0.75
 *   moderate      — compatibility >= 0.50
 *   weak          — compatibility >= 0.25
 *   incompatible  — compatibility <  0.25
 */

// ─── Port Types (no direct imports from lattice-node) ─────────────────

export interface MatchableSignature {
  readonly primary: bigint;
  readonly harmonics: ReadonlyArray<number>;
  readonly fieldStrength: number;
}

export interface CandidateSignature {
  readonly id: string;
  readonly signature: MatchableSignature;
}

// ─── Result Types ────────────────────────────────────────────────────

export type MatchQuality = 'perfect' | 'strong' | 'moderate' | 'weak' | 'incompatible';

export interface SignatureMatch {
  readonly compatibility: number;
  readonly harmonicOverlap: number;
  readonly primaryAlignment: number;
  readonly fieldStrengthDelta: number;
  readonly quality: MatchQuality;
}

export interface RankedMatch {
  readonly id: string;
  readonly match: SignatureMatch;
  readonly rank: number;
}

export type DriftSeverity = 'none' | 'minor' | 'significant' | 'critical';

export interface SignatureDrift {
  readonly drifted: boolean;
  readonly primaryDrift: number;
  readonly harmonicDrift: number;
  readonly fieldStrengthDrift: number;
  readonly severity: DriftSeverity;
}

export interface DriftThreshold {
  readonly minorPrimaryDrift: number;
  readonly significantPrimaryDrift: number;
  readonly criticalPrimaryDrift: number;
  readonly harmonicDriftFloor: number;
}

export interface FrequencyBandwidth {
  readonly harmonicCount: number;
  readonly harmonicSpread: number;
  readonly harmonicMean: number;
  readonly fieldStrength: number;
  readonly densityScore: number;
}

export interface FrequencySignatureMatcher {
  compare(a: MatchableSignature, b: MatchableSignature): SignatureMatch;
  findBestMatches(
    target: MatchableSignature,
    candidates: ReadonlyArray<CandidateSignature>,
    limit: number,
  ): ReadonlyArray<RankedMatch>;
  detectDrift(
    previous: MatchableSignature,
    current: MatchableSignature,
    threshold?: Partial<DriftThreshold>,
  ): SignatureDrift;
  computeHarmonicOverlap(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number;
  computeBandwidth(signature: MatchableSignature): FrequencyBandwidth;
}

// ─── Constants ───────────────────────────────────────────────────────

const QUALITY_PERFECT = 0.95;
const QUALITY_STRONG = 0.75;
const QUALITY_MODERATE = 0.5;
const QUALITY_WEAK = 0.25;

const WEIGHT_HARMONIC = 0.45;
const WEIGHT_PRIMARY = 0.35;
const WEIGHT_FIELD = 0.2;

export const DEFAULT_DRIFT_THRESHOLD: DriftThreshold = {
  minorPrimaryDrift: 0.05,
  significantPrimaryDrift: 0.2,
  criticalPrimaryDrift: 0.5,
  harmonicDriftFloor: 0.1,
};

// ─── Factory ─────────────────────────────────────────────────────────

export function createFrequencySignatureMatcher(): FrequencySignatureMatcher {
  return {
    compare: compareSignatures,
    findBestMatches: findBestMatchesImpl,
    detectDrift: detectDriftImpl,
    computeHarmonicOverlap: harmonicOverlapRatio,
    computeBandwidth: computeBandwidthImpl,
  };
}

// ─── Compare ─────────────────────────────────────────────────────────

function compareSignatures(a: MatchableSignature, b: MatchableSignature): SignatureMatch {
  const harmonicOverlap = harmonicOverlapRatio(a.harmonics, b.harmonics);
  const primaryAlignment = computePrimaryAlignment(a.primary, b.primary);
  const fieldStrengthDelta = Math.abs(a.fieldStrength - b.fieldStrength);
  const compatibility = computeCompatibility(harmonicOverlap, primaryAlignment, fieldStrengthDelta);
  return {
    compatibility,
    harmonicOverlap,
    primaryAlignment,
    fieldStrengthDelta,
    quality: qualityFromScore(compatibility),
  };
}

function computeCompatibility(
  harmonicOverlap: number,
  primaryAlignment: number,
  fieldStrengthDelta: number,
): number {
  const fieldScore = 1 - fieldStrengthDelta;
  const raw =
    WEIGHT_HARMONIC * harmonicOverlap +
    WEIGHT_PRIMARY * primaryAlignment +
    WEIGHT_FIELD * fieldScore;
  return clampZeroOne(raw);
}

// ─── Best Matches ────────────────────────────────────────────────────

function findBestMatchesImpl(
  target: MatchableSignature,
  candidates: ReadonlyArray<CandidateSignature>,
  limit: number,
): ReadonlyArray<RankedMatch> {
  const scored = candidates.map((c) => ({
    id: c.id,
    match: compareSignatures(target, c.signature),
  }));
  scored.sort((x, y) => y.match.compatibility - x.match.compatibility);
  const capped = limit > 0 ? scored.slice(0, limit) : scored;
  return capped.map((entry, idx) => ({
    id: entry.id,
    match: entry.match,
    rank: idx + 1,
  }));
}

// ─── Drift Detection ────────────────────────────────────────────────

function detectDriftImpl(
  previous: MatchableSignature,
  current: MatchableSignature,
  thresholdOverrides?: Partial<DriftThreshold>,
): SignatureDrift {
  const threshold = mergeThresholds(thresholdOverrides);
  const primaryDrift = computePrimaryDriftNormalized(previous.primary, current.primary);
  const harmonicDrift = computeHarmonicDrift(previous.harmonics, current.harmonics);
  const fieldStrengthDrift = Math.abs(previous.fieldStrength - current.fieldStrength);
  const severity = classifyDrift(primaryDrift, harmonicDrift, threshold);
  const drifted = severity !== 'none';
  return { drifted, primaryDrift, harmonicDrift, fieldStrengthDrift, severity };
}

function mergeThresholds(overrides?: Partial<DriftThreshold>): DriftThreshold {
  if (overrides === undefined) return DEFAULT_DRIFT_THRESHOLD;
  return {
    minorPrimaryDrift: overrides.minorPrimaryDrift ?? DEFAULT_DRIFT_THRESHOLD.minorPrimaryDrift,
    significantPrimaryDrift:
      overrides.significantPrimaryDrift ?? DEFAULT_DRIFT_THRESHOLD.significantPrimaryDrift,
    criticalPrimaryDrift:
      overrides.criticalPrimaryDrift ?? DEFAULT_DRIFT_THRESHOLD.criticalPrimaryDrift,
    harmonicDriftFloor: overrides.harmonicDriftFloor ?? DEFAULT_DRIFT_THRESHOLD.harmonicDriftFloor,
  };
}

function classifyDrift(
  primaryDrift: number,
  harmonicDrift: number,
  threshold: DriftThreshold,
): DriftSeverity {
  if (primaryDrift >= threshold.criticalPrimaryDrift) return 'critical';
  if (primaryDrift >= threshold.significantPrimaryDrift) return 'significant';
  if (primaryDrift >= threshold.minorPrimaryDrift) return 'minor';
  if (harmonicDrift >= threshold.harmonicDriftFloor) return 'minor';
  return 'none';
}

// ─── Bandwidth ──────────────────────────────────────────────────────

function computeBandwidthImpl(signature: MatchableSignature): FrequencyBandwidth {
  const harmonics = signature.harmonics;
  if (harmonics.length === 0) {
    return {
      harmonicCount: 0,
      harmonicSpread: 0,
      harmonicMean: 0,
      fieldStrength: signature.fieldStrength,
      densityScore: 0,
    };
  }
  const sorted = [...harmonics].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const spread = max - min;
  const mean = harmonics.reduce((sum, h) => sum + h, 0) / harmonics.length;
  const density = spread > 0 ? harmonics.length / spread : 0;
  return {
    harmonicCount: harmonics.length,
    harmonicSpread: spread,
    harmonicMean: mean,
    fieldStrength: signature.fieldStrength,
    densityScore: clampZeroOne(density),
  };
}

// ─── Harmonic Overlap ───────────────────────────────────────────────

function harmonicOverlapRatio(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const shared = b.filter((h) => setA.has(h)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? shared / union : 0;
}

// ─── Primary Frequency Helpers ──────────────────────────────────────

function computePrimaryAlignment(a: bigint, b: bigint): number {
  if (a === 0n && b === 0n) return 1;
  const maxVal = a > b ? a : b;
  if (maxVal === 0n) return 1;
  const delta = a > b ? a - b : b - a;
  const ratio = Number(delta) / Number(maxVal);
  return clampZeroOne(1 - ratio);
}

function computePrimaryDriftNormalized(previous: bigint, current: bigint): number {
  if (previous === 0n && current === 0n) return 0;
  const maxVal = previous > current ? previous : current;
  if (maxVal === 0n) return 0;
  const delta = previous > current ? previous - current : current - previous;
  return Number(delta) / Number(maxVal);
}

// ─── Harmonic Drift ─────────────────────────────────────────────────

function computeHarmonicDrift(
  previous: ReadonlyArray<number>,
  current: ReadonlyArray<number>,
): number {
  const prevSet = new Set(previous);
  const currSet = new Set(current);
  const union = new Set([...previous, ...current]);
  if (union.size === 0) return 0;
  let changed = 0;
  for (const h of union) {
    if (!prevSet.has(h) || !currSet.has(h)) {
      changed++;
    }
  }
  return changed / union.size;
}

// ─── Utilities ──────────────────────────────────────────────────────

function qualityFromScore(score: number): MatchQuality {
  if (score >= QUALITY_PERFECT) return 'perfect';
  if (score >= QUALITY_STRONG) return 'strong';
  if (score >= QUALITY_MODERATE) return 'moderate';
  if (score >= QUALITY_WEAK) return 'weak';
  return 'incompatible';
}

function clampZeroOne(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
