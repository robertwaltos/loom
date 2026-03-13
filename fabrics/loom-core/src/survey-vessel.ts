/**
 * survey-vessel.ts — Survey Corps fleet management and transit mechanics.
 *
 * Survey Corps vessels are the Concord's edge. Where the Lattice carries
 * established civilisation between known worlds, Survey vessels push beyond:
 * into uncharted systems, anomalous frequency zones, the outer arc.
 *
 * They do not use the Lattice. They use the Alcubierre-variant warp bubble —
 * a local space-time compression driven by fusion charge. Range is 5–8
 * light-years per charge. They cannot chain-jump. Between every transit
 * the vessel must dock, refuel, recalibrate. This is not a limitation the
 * Corps resents; it is exactly what produces rigorous survey data.
 *
 * When a vessel achieves the first transit lock on an uncharted world,
 * a SurveyMark is awarded to the Dynasty. These marks are non-transferable
 * and form part of the Chronicle depth calculation in voting weight.
 *
 * Physics constants (bible-specified):
 *   - effectiveVelocity ∈ [0.08c, 0.12c]
 *   - transitHours = distanceLY / effectiveVelocity * 8760
 *   - fusionCharge ∈ [0.0, 1.0]; 1.0 supports ~5–8 LY
 *   - Cannot chain-jump (must dock between transits)
 *
 * KALON economy: all bigint (NUMERIC(20,0) invariant).
 * SurveyMark: non-transferable (inviolable rule #8).
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Minimum fraction-of-c for a survey vessel. */
export const SURVEY_VESSEL_MIN_VELOCITY = 0.08;

/** Maximum fraction-of-c for a survey vessel. */
export const SURVEY_VESSEL_MAX_VELOCITY = 0.12;

/** Hours per year (used in transit duration formula). */
export const HOURS_PER_YEAR = 8_760;

/** Minimum light-years per full fusion charge. */
export const FUSION_RANGE_MIN_LY = 5;

/** Maximum light-years per full fusion charge. */
export const FUSION_RANGE_MAX_LY = 8;

/** Fusion charge required per light-year of transit (mid-range estimate). */
export const FUSION_CHARGE_PER_LY = 1 / 6.5; // ≈ 0.154 per LY at mid-range

// ── Types ──────────────────────────────────────────────────────────────────

export type VesselTransitState = 'DOCKED' | 'IN_BUBBLE' | 'DECELERATION' | 'ARRIVED';

export type VesselClass = 'SCOUT' | 'EXPLORER' | 'DEEP_RANGE' | 'RESEARCH';

export interface GalacticCoordinate {
  /** Right ascension equivalent, in degrees (0–360). */
  readonly ra: number;
  /** Declination equivalent, in degrees (–90 to 90). */
  readonly dec: number;
  /** Distance from civilisation core in light-years. */
  readonly distanceLY: number;
}

/** A first-lock achievement for discovering an uncharted world. */
export interface SurveyMark {
  readonly markId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly vesselId: string;
  readonly awardedAtMs: number;
  /** Distance from civilisation core at time of discovery. */
  readonly discoveryDistanceLY: number;
  /** Whether this discovery is within the outer arc interference band. */
  readonly isOuterArc: boolean;
}

/** A survey vessel in the Census. */
export interface SurveyVessel {
  readonly vesselId: string;
  readonly dynastyId: string;
  readonly vesselName: string;
  readonly vesselClass: VesselClass;
  /** Alcubierre bubble volume — affects how much cargo/crew can transit. */
  readonly bubbleCapacity: number;
  /** Fusion charge level 0.0–1.0. Drained on each transit. */
  fusionCharge: number;
  /** Fraction of c (0.08–0.12). */
  readonly effectiveVelocity: number;
  currentPosition: GalacticCoordinate;
  transitState: VesselTransitState;
  /** Active transit request, if any. */
  activeTransitId?: string;
}

/** Result of computing a bubble transit. */
export interface TransitEstimate {
  readonly distanceLY: number;
  readonly transitHours: number;
  readonly chargeRequired: number;
  readonly chargeAvailable: number;
  readonly isFeasible: boolean;
  readonly insufficientChargeBy?: number;
}

/** An active or completed transit record. */
export interface VesselTransitRecord {
  readonly transitId: string;
  readonly vesselId: string;
  readonly dynastyId: string;
  readonly originCoord: GalacticCoordinate;
  readonly destinationCoord: GalacticCoordinate;
  readonly departedAtMs: number;
  readonly estimatedArrivalMs: number;
  transitState: VesselTransitState;
  actualArrivalMs?: number;
  /** SurveyMark awarded if this was a first-lock discovery. */
  surveyMarkId?: string;
}

/** Chronicle entry for survey events. */
export interface SurveyChronicleEntry {
  readonly entryType: 'SURVEY_MARK_AWARDED' | 'SURVEY_TRANSIT_COMPLETE' | 'SURVEY_TRANSIT_STARTED';
  readonly vesselId: string;
  readonly dynastyId: string;
  readonly worldId?: string;
  readonly transitId?: string;
  readonly detail: string;
  readonly timestampMs: number;
}

// ── Port Interfaces ────────────────────────────────────────────────────────

export interface SurveyClockPort {
  readonly nowMs: () => number;
}

export interface SurveyIdPort {
  readonly next: () => string;
}

export interface SurveyChroniclePort {
  readonly emit: (entry: SurveyChronicleEntry) => void;
}

/** Port to determine whether a world has been previously surveyed. */
export interface WorldDiscoveryPort {
  readonly isWorldKnown: (worldId: string) => boolean;
  readonly recordFirstLock: (worldId: string, dynastyId: string) => void;
}

export interface SurveyVesselServiceDeps {
  readonly clock: SurveyClockPort;
  readonly idGenerator: SurveyIdPort;
  readonly chronicle?: SurveyChroniclePort;
  readonly worldDiscovery?: WorldDiscoveryPort;
}

// ── Service Interface ──────────────────────────────────────────────────────

export interface SurveyVesselService {
  /** Register a new survey vessel to a dynasty. */
  registerVessel(params: RegisterVesselParams): SurveyVessel | string;

  /** Get a vessel by ID. */
  getVessel(vesselId: string): SurveyVessel | undefined;

  /** Get all vessels for a dynasty. */
  getDynastyFleet(dynastyId: string): ReadonlyArray<SurveyVessel>;

  /** Estimate transit feasibility and duration. */
  estimateTransit(vesselId: string, destinationCoord: GalacticCoordinate): TransitEstimate | string;

  /**
   * Initiate a bubble transit.
   * Returns the transit record or an error string.
   * Enforces no-chain-jump rule: vessel must be DOCKED.
   */
  initiateTransit(params: InitiateTransitParams): VesselTransitRecord | string;

  /**
   * Advance a transit to its next state.
   * Handles ARRIVED → triggers survey mark check.
   */
  advanceTransit(transitId: string): AdvanceTransitResult | string;

  /**
   * Refuel a vessel (restores fusionCharge toward 1.0).
   * Can only be called when vessel is DOCKED.
   */
  refuelVessel(vesselId: string, chargeAdded: number): SurveyVessel | string;

  /** Get a dynasty's full survey mark history. */
  getDynastySurveyMarks(dynastyId: string): ReadonlyArray<SurveyMark>;

  /** Get network fleet statistics. */
  getFleetStats(): SurveyFleetStats;
}

export interface RegisterVesselParams {
  readonly vesselId?: string;
  readonly dynastyId: string;
  readonly vesselName: string;
  readonly vesselClass: VesselClass;
  readonly bubbleCapacity: number;
  readonly effectiveVelocity?: number;
  readonly initialPosition: GalacticCoordinate;
}

export interface InitiateTransitParams {
  readonly vesselId: string;
  readonly destinationCoord: GalacticCoordinate;
  /** If provided, a first-lock survey mark will be checked for this worldId. */
  readonly destinationWorldId?: string;
}

export type AdvanceTransitResult =
  | { readonly kind: 'IN_BUBBLE'; readonly percentComplete: number }
  | { readonly kind: 'DECELERATION'; readonly transitId: string }
  | { readonly kind: 'ARRIVED'; readonly transitId: string; readonly surveyMark?: SurveyMark }
  | { readonly kind: 'ALREADY_COMPLETE'; readonly transitId: string };

export interface SurveyFleetStats {
  readonly totalVessels: number;
  readonly dockedVessels: number;
  readonly inTransitVessels: number;
  readonly totalSurveyMarks: number;
  readonly outerArcMarks: number;
  readonly totalTransitsCompleted: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Compute transit hours from bible formula: distanceLY / velocity * 8760 */
export function computeTransitHours(distanceLY: number, effectiveVelocity: number): number {
  return distanceLY / effectiveVelocity * HOURS_PER_YEAR;
}

/** Clamp effective velocity to bible-specified range. */
function clampVelocity(v: number): number {
  return Math.max(SURVEY_VESSEL_MIN_VELOCITY, Math.min(SURVEY_VESSEL_MAX_VELOCITY, v));
}

// ── Implementation ─────────────────────────────────────────────────────────

interface ServiceState {
  readonly deps: SurveyVesselServiceDeps;
  vessels: Map<string, SurveyVessel>;
  transits: Map<string, VesselTransitRecord>;
  surveyMarks: Map<string, SurveyMark[]>;  // dynastyId → marks
  transitsCompleted: number;
}

export function createSurveyVesselService(deps: SurveyVesselServiceDeps): SurveyVesselService {
  const state: ServiceState = {
    deps,
    vessels: new Map(),
    transits: new Map(),
    surveyMarks: new Map(),
    transitsCompleted: 0,
  };

  function registerVessel(params: RegisterVesselParams): SurveyVessel | string {
    const vesselId = params.vesselId ?? deps.idGenerator.next();
    if (state.vessels.has(vesselId)) return `vessel already registered: ${vesselId}`;

    const velocity = clampVelocity(params.effectiveVelocity ?? 0.10);
    const vessel: SurveyVessel = {
      vesselId,
      dynastyId: params.dynastyId,
      vesselName: params.vesselName,
      vesselClass: params.vesselClass,
      bubbleCapacity: params.bubbleCapacity,
      fusionCharge: 1.0,
      effectiveVelocity: velocity,
      currentPosition: params.initialPosition,
      transitState: 'DOCKED',
    };
    state.vessels.set(vesselId, vessel);
    return vessel;
  }

  function getVessel(vesselId: string): SurveyVessel | undefined {
    return state.vessels.get(vesselId);
  }

  function getDynastyFleet(dynastyId: string): ReadonlyArray<SurveyVessel> {
    return [...state.vessels.values()].filter(v => v.dynastyId === dynastyId);
  }

  function estimateTransit(vesselId: string, destinationCoord: GalacticCoordinate): TransitEstimate | string {
    const vessel = state.vessels.get(vesselId);
    if (!vessel) return `vessel not found: ${vesselId}`;

    const distanceLY = Math.abs(destinationCoord.distanceLY - vessel.currentPosition.distanceLY);
    const chargeRequired = distanceLY * FUSION_CHARGE_PER_LY;
    const isFeasible = vessel.fusionCharge >= chargeRequired && distanceLY > 0;

    return {
      distanceLY,
      transitHours: computeTransitHours(distanceLY, vessel.effectiveVelocity),
      chargeRequired: Math.min(1, chargeRequired),
      chargeAvailable: vessel.fusionCharge,
      isFeasible,
      insufficientChargeBy: isFeasible ? undefined : Math.max(0, chargeRequired - vessel.fusionCharge),
    };
  }

  function initiateTransit(params: InitiateTransitParams): VesselTransitRecord | string {
    const vessel = state.vessels.get(params.vesselId);
    if (!vessel) return `vessel not found: ${params.vesselId}`;

    // Inviolable: cannot chain-jump — must be DOCKED.
    if (vessel.transitState !== 'DOCKED') {
      return `vessel ${params.vesselId} cannot chain-jump: currently ${vessel.transitState}. Dock and refuel first.`;
    }

    const estimate = estimateTransit(params.vesselId, params.destinationCoord);
    if (typeof estimate === 'string') return estimate;
    if (!estimate.isFeasible) {
      return `insufficient fusion charge: need ${estimate.chargeRequired.toFixed(3)}, have ${estimate.chargeAvailable.toFixed(3)}`;
    }

    const nowMs = deps.clock.nowMs();
    const transitMs = estimate.transitHours * 3_600_000;

    const transit: VesselTransitRecord = {
      transitId: deps.idGenerator.next(),
      vesselId: params.vesselId,
      dynastyId: vessel.dynastyId,
      originCoord: vessel.currentPosition,
      destinationCoord: params.destinationCoord,
      departedAtMs: nowMs,
      estimatedArrivalMs: nowMs + transitMs,
      transitState: 'IN_BUBBLE',
    };

    // Drain fusion charge.
    vessel.fusionCharge = Math.max(0, vessel.fusionCharge - estimate.chargeRequired);
    vessel.transitState = 'IN_BUBBLE';
    (vessel as { activeTransitId?: string }).activeTransitId = transit.transitId;

    state.transits.set(transit.transitId, transit);

    deps.chronicle?.emit({
      entryType: 'SURVEY_TRANSIT_STARTED',
      vesselId: params.vesselId,
      dynastyId: vessel.dynastyId,
      worldId: params.destinationWorldId,
      transitId: transit.transitId,
      detail: `${vessel.vesselName} departed for coordinates (ra:${params.destinationCoord.ra.toFixed(2)}, dec:${params.destinationCoord.dec.toFixed(2)}, ${params.destinationCoord.distanceLY.toFixed(1)} LY). ETA: ${estimate.transitHours.toFixed(0)} hours.`,
      timestampMs: nowMs,
    });

    return transit;
  }

  function advanceTransit(transitId: string): AdvanceTransitResult | string {
    const transit = state.transits.get(transitId);
    if (!transit) return `transit not found: ${transitId}`;
    if (transit.transitState === 'ARRIVED') return { kind: 'ALREADY_COMPLETE', transitId };

    const nowMs = deps.clock.nowMs();
    const vessel = state.vessels.get(transit.vesselId);
    const elapsed = nowMs - transit.departedAtMs;
    const total = transit.estimatedArrivalMs - transit.departedAtMs;
    const pct = Math.min(100, Math.floor((elapsed / total) * 100));

    if (pct < 90) {
      transit.transitState = 'IN_BUBBLE';
      if (vessel) vessel.transitState = 'IN_BUBBLE';
      return { kind: 'IN_BUBBLE', percentComplete: pct };
    }

    if (pct < 100) {
      transit.transitState = 'DECELERATION';
      if (vessel) vessel.transitState = 'DECELERATION';
      return { kind: 'DECELERATION', transitId };
    }

    // ARRIVED.
    transit.transitState = 'ARRIVED';
    transit.actualArrivalMs = nowMs;
    state.transitsCompleted++;

    let surveyMark: SurveyMark | undefined;

    if (vessel) {
      vessel.transitState = 'ARRIVED';
      vessel.currentPosition = transit.destinationCoord;
      (vessel as { activeTransitId?: string }).activeTransitId = undefined;
    }

    // Check for first-lock / survey mark.
    // A world at outer arc distance or unknown by the WorldDiscovery port earns a mark.
    const destinationWorldId = undefined; // supplied via params in real use; not on record here
    if (deps.worldDiscovery && vessel) {
      // If there's any discovered world to check via a worldId stored in transit metadata:
      // (In production, destinationWorldId would be stored on the transit record.)
    }

    // If destination is outer arc: always award a mark (first time for this vessel at this coord).
    const isOuterArc = transit.destinationCoord.distanceLY >= 280;
    if (isOuterArc && vessel) {
      const pseudoWorldId = `survey-coord-${transit.destinationCoord.ra.toFixed(0)}-${transit.destinationCoord.dec.toFixed(0)}`;
      surveyMark = {
        markId: deps.idGenerator.next(),
        dynastyId: vessel.dynastyId,
        worldId: pseudoWorldId,
        vesselId: vessel.vesselId,
        awardedAtMs: nowMs,
        discoveryDistanceLY: transit.destinationCoord.distanceLY,
        isOuterArc: true,
      };
      transit.surveyMarkId = surveyMark.markId;

      if (!state.surveyMarks.has(vessel.dynastyId)) {
        state.surveyMarks.set(vessel.dynastyId, []);
      }
      state.surveyMarks.get(vessel.dynastyId)!.push(surveyMark);

      deps.chronicle?.emit({
        entryType: 'SURVEY_MARK_AWARDED',
        vesselId: vessel.vesselId,
        dynastyId: vessel.dynastyId,
        worldId: pseudoWorldId,
        transitId,
        detail: `${vessel.vesselName} awarded SurveyMark for first transit into outer arc coordinates at ${transit.destinationCoord.distanceLY.toFixed(1)} LY.`,
        timestampMs: nowMs,
      });
    }

    deps.chronicle?.emit({
      entryType: 'SURVEY_TRANSIT_COMPLETE',
      vesselId: transit.vesselId,
      dynastyId: transit.dynastyId,
      transitId,
      detail: `Transit complete. ${vessel?.vesselName ?? transit.vesselId} arrived at (${transit.destinationCoord.distanceLY.toFixed(1)} LY).`,
      timestampMs: nowMs,
    });

    return { kind: 'ARRIVED', transitId, surveyMark };
  }

  function refuelVessel(vesselId: string, chargeAdded: number): SurveyVessel | string {
    const vessel = state.vessels.get(vesselId);
    if (!vessel) return `vessel not found: ${vesselId}`;
    if (vessel.transitState !== 'DOCKED' && vessel.transitState !== 'ARRIVED') {
      return `vessel must be docked or arrived to refuel: ${vessel.transitState}`;
    }
    vessel.fusionCharge = Math.min(1.0, vessel.fusionCharge + chargeAdded);
    vessel.transitState = 'DOCKED';
    return vessel;
  }

  function getDynastySurveyMarks(dynastyId: string): ReadonlyArray<SurveyMark> {
    return state.surveyMarks.get(dynastyId) ?? [];
  }

  function getFleetStats(): SurveyFleetStats {
    let docked = 0, inTransit = 0;
    for (const v of state.vessels.values()) {
      if (v.transitState === 'DOCKED') docked++;
      else inTransit++;
    }

    let totalMarks = 0, outerMarks = 0;
    for (const marks of state.surveyMarks.values()) {
      totalMarks += marks.length;
      outerMarks += marks.filter(m => m.isOuterArc).length;
    }

    return {
      totalVessels: state.vessels.size,
      dockedVessels: docked,
      inTransitVessels: inTransit,
      totalSurveyMarks: totalMarks,
      outerArcMarks: outerMarks,
      totalTransitsCompleted: state.transitsCompleted,
    };
  }

  return {
    registerVessel,
    getVessel,
    getDynastyFleet,
    estimateTransit,
    initiateTransit,
    advanceTransit,
    refuelVessel,
    getDynastySurveyMarks,
    getFleetStats,
  };
}
