/**
 * ascendancy-engine.ts — The Ascendancy threat-detection and disruption system.
 *
 * The Ascendancy is not a faction with a name, a manifesto, or a face.
 * They are a pattern in the interference data — a recurring signature in
 * the outer arc that the Survey Corps documented and then stopped discussing.
 * Miriam and Nnamdi have been eating lunch together for forty years preserving
 * oral testimony. Neither of them has realised it forms a complete account.
 *
 * This engine models the Ascendancy's five known attack vectors against
 * Lattice infrastructure and provides detection scoring, chronicle emission,
 * and beacon integrity degradation modelling.
 *
 * Design notes:
 *   - No direct manipulation of LatticeNode — takes a port so the two systems
 *     can run independently or be composed at the application layer.
 *   - All KALON values are bigint (NUMERIC(20,0)); none appear here directly
 *     but the engine emits threat events that feed into the governance layer.
 *   - The outer arc interference band starts at 280 light-years from the
 *     civilisation core. Yara's last 50 survey vessels all transited it.
 *     Her fleet does not know this.
 */

import type { CompromiseType, LatticeChronicleEntry } from './lattice-node.js';

// ── Constants ──────────────────────────────────────────────────────────────

/** Light-years from civilisation core where Ascendancy interference begins. */
export const OUTER_ARC_THRESHOLD_LY = 280;

/**
 * Detection confidence above which an anomaly is escalated to a ThreatEvent.
 * Below this value the anomaly is logged but not acted upon.
 */
export const DETECTION_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Ferreira-Asante correlation: 94% overlap between Survey-499 outer-arc
 * frequency data and the interference band. This constant is used when
 * computing the anomaly correlation score for worlds in the outer arc.
 */
export const FERREIRA_ASANTE_CORRELATION = 0.94;

// ── Types ──────────────────────────────────────────────────────────────────

/** A single observed anomaly in a beacon's frequency signature data. */
export interface FrequencyAnomaly {
  readonly anomalyId: string;
  readonly nodeId: string;
  readonly worldId: string;
  /** The CompromiseType this anomaly pattern resembles. */
  readonly suspectedVector: CompromiseType;
  /** 0.0–1.0 confidence that this is an Ascendancy attack. */
  readonly detectionConfidence: number;
  /** Harmonic channel index where the anomaly was detected (0-6). */
  readonly affectedHarmonicIndex: number;
  /** Measured deviation from expected harmonic value (–1.0 to 1.0). */
  readonly harmonicDeviation: number;
  readonly observedAtMs: number;
}

/** Escalated event when detection confidence exceeds threshold. */
export interface ThreatEvent {
  readonly threatId: string;
  readonly nodeId: string;
  readonly worldId: string;
  readonly vector: CompromiseType;
  readonly confidence: number;
  /** Anomaly IDs that contributed to this threat determination. */
  readonly sourceAnomalyIds: ReadonlyArray<string>;
  readonly detectedAtMs: number;
  /** Whether this node is within the outer arc interference band. */
  readonly isOuterArcNode: boolean;
  /** Correlation with Ferreira-Asante outer-arc data, if applicable. */
  readonly outerArcCorrelation?: number;
}

/** Beacon integrity score computed from anomaly history. */
export interface BeaconIntegrityScore {
  readonly nodeId: string;
  readonly score: number;        // 0.0–1.0, 1.0 = perfectly clean
  readonly anomalyCount: number;
  readonly latestAnomalyMs?: number;
  readonly dominantVector?: CompromiseType;
}

/** Chronicle-ready entry format emitted on escalated threats. */
export interface AscendancyChronicleEntry extends LatticeChronicleEntry {
  readonly entryType: 'LATTICE_BEACON_COMPROMISE';
  readonly threatId: string;
  readonly outerArcThreat: boolean;
}

// ── Port interfaces ────────────────────────────────────────────────────────

export interface AscendancyClockPort {
  readonly nowMs: () => number;
}

export interface AscendancyIdPort {
  readonly next: () => string;
}

export interface AscendancyChroniclePort {
  readonly emit: (entry: AscendancyChronicleEntry) => void;
}

/**
 * Port for querying node distance from civilisation core.
 * Injected so the engine is not coupled to the Lattice network state.
 */
export interface NodeDistancePort {
  readonly getDistanceLY: (nodeId: string) => number | undefined;
}

export interface AscendancyEngineDeps {
  readonly clock: AscendancyClockPort;
  readonly idGenerator: AscendancyIdPort;
  readonly chronicle?: AscendancyChroniclePort;
  readonly nodeDistance?: NodeDistancePort;
}

// ── Service Interface ──────────────────────────────────────────────────────

export interface AscendancyEngine {
  /**
   * Record an observed frequency anomaly for a node.
   * If confidence exceeds DETECTION_CONFIDENCE_THRESHOLD, escalates to ThreatEvent.
   * Returns the anomaly and any generated ThreatEvent.
   */
  observeAnomaly(params: ObserveAnomalyParams): ObserveAnomalyResult;

  /**
   * Compute a composite integrity score for a beacon from all
   * recorded anomalies for that node.
   */
  computeIntegrityScore(nodeId: string): BeaconIntegrityScore;

  /**
   * Get all anomalies for a node.
   */
  getNodeAnomalies(nodeId: string): ReadonlyArray<FrequencyAnomaly>;

  /**
   * Get all escalated ThreatEvents.
   */
  getThreats(): ReadonlyArray<ThreatEvent>;

  /**
   * Get ThreatEvents for a specific node.
   */
  getNodeThreats(nodeId: string): ReadonlyArray<ThreatEvent>;

  /**
   * Determine if a node's outer-arc correlation score meets the
   * Ferreira-Asante threshold (≥ FERREIRA_ASANTE_CORRELATION).
   * Returns the correlation score or undefined if node has no outer-arc data.
   */
  computeOuterArcCorrelation(nodeId: string): number | undefined;

  /**
   * Get the total count of Ascendancy-attributed incidents across the network.
   */
  getIncidentCount(): AscendancyIncidentCount;
}

export interface ObserveAnomalyParams {
  readonly nodeId: string;
  readonly worldId: string;
  readonly suspectedVector: CompromiseType;
  readonly detectionConfidence: number;
  readonly affectedHarmonicIndex: number;
  readonly harmonicDeviation: number;
}

export interface ObserveAnomalyResult {
  readonly anomaly: FrequencyAnomaly;
  readonly threat?: ThreatEvent;
  readonly chronicleEntry?: AscendancyChronicleEntry;
}

export interface AscendancyIncidentCount {
  readonly totalAnomalies: number;
  readonly totalThreats: number;
  readonly outerArcThreats: number;
  readonly byVector: Readonly<Record<CompromiseType, number>>;
}

// ── Implementation ─────────────────────────────────────────────────────────

/** Decay rate per hour for old anomalies in integrity scoring. */
const ANOMALY_DECAY_RATE = 0.05;
const ONE_HOUR_MS = 3_600_000;

/** Weights for each compromise vector's severity in integrity scoring. */
const VECTOR_SEVERITY: Readonly<Record<CompromiseType, number>> = {
  FREQUENCY_SPOOFING: 0.30,
  SIGNAL_DEGRADATION: 0.12,
  GEODETIC_CORRUPTION: 0.20,
  POWER_SABOTAGE: 0.45,
  HARMONIC_INJECTION: 0.18,
};

interface EngineState {
  readonly deps: AscendancyEngineDeps;
  anomalies: Map<string, FrequencyAnomaly[]>;  // nodeId → anomalies
  threats: ThreatEvent[];
}

export function createAscendancyEngine(deps: AscendancyEngineDeps): AscendancyEngine {
  const state: EngineState = {
    deps,
    anomalies: new Map(),
    threats: [],
  };

  function observeAnomaly(params: ObserveAnomalyParams): ObserveAnomalyResult {
    const nowMs = deps.clock.nowMs();
    const anomaly: FrequencyAnomaly = {
      anomalyId: deps.idGenerator.next(),
      nodeId: params.nodeId,
      worldId: params.worldId,
      suspectedVector: params.suspectedVector,
      detectionConfidence: Math.max(0, Math.min(1, params.detectionConfidence)),
      affectedHarmonicIndex: Math.max(0, Math.min(6, params.affectedHarmonicIndex)),
      harmonicDeviation: Math.max(-1, Math.min(1, params.harmonicDeviation)),
      observedAtMs: nowMs,
    };

    if (!state.anomalies.has(params.nodeId)) {
      state.anomalies.set(params.nodeId, []);
    }
    state.anomalies.get(params.nodeId)!.push(anomaly);

    if (anomaly.detectionConfidence < DETECTION_CONFIDENCE_THRESHOLD) {
      return { anomaly };
    }

    // Escalate to ThreatEvent.
    const distanceLY = deps.nodeDistance?.getDistanceLY(params.nodeId);
    const isOuterArc = distanceLY !== undefined && distanceLY >= OUTER_ARC_THRESHOLD_LY;
    const outerArcCorrelation = isOuterArc ? FERREIRA_ASANTE_CORRELATION : undefined;

    const nodeAnomalies = state.anomalies.get(params.nodeId) ?? [];
    const sourceIds = nodeAnomalies
      .filter(a => a.suspectedVector === params.suspectedVector)
      .map(a => a.anomalyId);

    const threat: ThreatEvent = {
      threatId: deps.idGenerator.next(),
      nodeId: params.nodeId,
      worldId: params.worldId,
      vector: params.suspectedVector,
      confidence: anomaly.detectionConfidence,
      sourceAnomalyIds: sourceIds,
      detectedAtMs: nowMs,
      isOuterArcNode: isOuterArc,
      outerArcCorrelation,
    };
    state.threats.push(threat);

    const entry: AscendancyChronicleEntry = {
      entryType: 'LATTICE_BEACON_COMPROMISE',
      nodeId: params.nodeId,
      worldId: params.worldId,
      detail: buildThreatNarrative(threat),
      timestampMs: nowMs,
      threatId: threat.threatId,
      outerArcThreat: isOuterArc,
    };
    deps.chronicle?.emit(entry);

    return { anomaly, threat, chronicleEntry: entry };
  }

  function computeIntegrityScore(nodeId: string): BeaconIntegrityScore {
    const nodeAnomalies = state.anomalies.get(nodeId) ?? [];
    if (nodeAnomalies.length === 0) {
      return { nodeId, score: 1.0, anomalyCount: 0 };
    }

    const nowMs = deps.clock.nowMs();
    let totalPenalty = 0;
    const vectorCounts = new Map<CompromiseType, number>();
    let latestMs: number | undefined;

    for (const anomaly of nodeAnomalies) {
      // Anomalies decay over time — older threats matter less.
      const ageHours = (nowMs - anomaly.observedAtMs) / ONE_HOUR_MS;
      const decayFactor = Math.max(0, 1 - ageHours * ANOMALY_DECAY_RATE);
      const penalty = VECTOR_SEVERITY[anomaly.suspectedVector] * anomaly.detectionConfidence * decayFactor;
      totalPenalty += penalty;

      vectorCounts.set(anomaly.suspectedVector, (vectorCounts.get(anomaly.suspectedVector) ?? 0) + 1);
      if (latestMs === undefined || anomaly.observedAtMs > latestMs) {
        latestMs = anomaly.observedAtMs;
      }
    }

    // Find dominant vector.
    let dominantVector: CompromiseType | undefined;
    let maxCount = 0;
    for (const [vec, count] of vectorCounts.entries()) {
      if (count > maxCount) { maxCount = count; dominantVector = vec; }
    }

    const score = Math.max(0, 1 - totalPenalty);
    return {
      nodeId,
      score,
      anomalyCount: nodeAnomalies.length,
      latestAnomalyMs: latestMs,
      dominantVector,
    };
  }

  function getNodeAnomalies(nodeId: string): ReadonlyArray<FrequencyAnomaly> {
    return state.anomalies.get(nodeId) ?? [];
  }

  function getThreats(): ReadonlyArray<ThreatEvent> {
    return state.threats;
  }

  function getNodeThreats(nodeId: string): ReadonlyArray<ThreatEvent> {
    return state.threats.filter(t => t.nodeId === nodeId);
  }

  function computeOuterArcCorrelation(nodeId: string): number | undefined {
    const distanceLY = deps.nodeDistance?.getDistanceLY(nodeId);
    if (distanceLY === undefined || distanceLY < OUTER_ARC_THRESHOLD_LY) return undefined;

    const nodeAnomalies = state.anomalies.get(nodeId) ?? [];
    if (nodeAnomalies.length === 0) return 0;

    // Correlation is weighted by the proportion of high-confidence anomalies
    // on harmonic channels 0-2 (the outer-arc interference signature pattern).
    const outerArcAnoms = nodeAnomalies.filter(a => a.affectedHarmonicIndex <= 2 && a.detectionConfidence > 0.5);
    const base = FERREIRA_ASANTE_CORRELATION * (outerArcAnoms.length / Math.max(1, nodeAnomalies.length));
    return Math.min(1, base);
  }

  function getIncidentCount(): AscendancyIncidentCount {
    const outerArcThreats = state.threats.filter(t => t.isOuterArcNode).length;
    const all: Record<CompromiseType, number> = {
      FREQUENCY_SPOOFING: 0,
      SIGNAL_DEGRADATION: 0,
      GEODETIC_CORRUPTION: 0,
      POWER_SABOTAGE: 0,
      HARMONIC_INJECTION: 0,
    };
    for (const t of state.threats) all[t.vector]++;
    return {
      totalAnomalies: [...state.anomalies.values()].reduce((s, arr) => s + arr.length, 0),
      totalThreats: state.threats.length,
      outerArcThreats,
      byVector: all,
    };
  }

  return {
    observeAnomaly,
    computeIntegrityScore,
    getNodeAnomalies,
    getThreats,
    getNodeThreats,
    computeOuterArcCorrelation,
    getIncidentCount,
  };
}

// ── Narrative Generator ────────────────────────────────────────────────────

/** Generate a Chronicle-appropriate narrative description of a detected threat. */
function buildThreatNarrative(threat: ThreatEvent): string {
  const vectorDescriptions: Record<CompromiseType, string> = {
    FREQUENCY_SPOOFING: 'Frequency spoofing detected — transit signature redirected to unknown destination.',
    SIGNAL_DEGRADATION: 'Progressive signal degradation logged. Coherence loss at measured rate.',
    GEODETIC_CORRUPTION: 'Geodetic anchor point corrupted. Spatial reference integrity compromised.',
    POWER_SABOTAGE: 'Zero-point energy feed interrupted. Beacon operating on emergency reserves.',
    HARMONIC_INJECTION: 'Harmonic injection pattern identified. Overtone series contains foreign signature.',
  };

  const outerArcNote = threat.isOuterArcNode
    ? ` Node position ${OUTER_ARC_THRESHOLD_LY}+ LY from core. Correlation with outer-arc interference data: ${((threat.outerArcCorrelation ?? 0) * 100).toFixed(1)}%.`
    : '';

  return `${vectorDescriptions[threat.vector]} Confidence: ${(threat.confidence * 100).toFixed(1)}%.${outerArcNote}`;
}
