/**
 * continuity-protocol.ts — Neural frequency mapping and dynasty continuity.
 *
 * The longevity cascade changes everything about how people think about
 * continuity. Before, the question was "how long can I live?" After, the
 * question is "am I still me?" The neural frequency map — a complete
 * cryptographic record of the brain's electromagnetic signature — exists
 * in theory as backup. In practice, nobody yet agrees what it means.
 *
 * Is the substrate transfer the same person? Or a perfect copy that
 * believes itself to be the same person? This question is not rhetorical.
 * It is the defining legal and philosophical challenge of the Age of Radiance.
 * The Concord has no answer. Continuity records reflect this: they are
 * honest about what they do and do not claim.
 *
 * The VIGIL Protocol activates when a dynasty's primary heir has not logged
 * activity in a defined window. It is not abandonment — it is care.
 * "Before implementing any mechanic that touches inactive dynasties, ask:
 * what does this do to the player who logged in once a month to write one
 * Chronicle entry for someone they lost?" (Bible v1.1, Part 8)
 *
 * Terminology (v1.4 renames):
 *   - EarnedLives → ContinuityBonds
 *   - Mortality → Continuity
 *   - InAbeyance → Vigil
 *   - MendingFrame → RenewalEngine
 *
 * KALON is bigint throughout (NUMERIC(20,0) invariant).
 * Time compression: never here — lives in TimeService only.
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Default Vigil window: days of real-world inactivity before VIGIL state. */
export const DEFAULT_VIGIL_THRESHOLD_DAYS = 30;

/** Milliseconds per day. */
export const MS_PER_DAY = 86_400_000;

/** Minimum fidelity score for a neural map to be considered viable. */
export const NEURAL_MAP_MIN_FIDELITY = 0.85;

/** Maximum ContinuityBonds a dynasty can hold. */
export const MAX_CONTINUITY_BONDS = 7;

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * The philosophical status of a neural substrate transfer.
 * When a dynasty heir logs a substrate transfer, the Concord records
 * the status honestly. It makes no determination. That is not done.
 */
export type ContinuityPhilosophicalStatus =
  | 'IS_ORIGINAL'            // No substrate transfer occurred; original biological substrate.
  | 'PRESUMED_CONTINUOUS'    // Transfer occurred; records indicate continuous subjective experience.
  | 'UNRESOLVED'             // Transfer occurred; continuity of experience unverifiable.
  | 'SUBSTRATE_TRANSFER';    // Transfer recorded; heir has not filed continuity claim.

/** Vigil Protocol state machine. */
export type VigilState =
  | 'ACTIVE'     // Dynasty is regularly active.
  | 'WATCH'      // Inactivity approaching Vigil threshold — monitoring.
  | 'VIGIL'      // Threshold crossed; dynasty in Vigil Protocol.
  | 'CRISIS'     // Extended Vigil; estate protections elevate.
  | 'RENEWED';   // Dynasty returned from Vigil; continuity restored.

/**
 * A neural frequency map record.
 * Represents the captured electromagnetic signature of a dynasty heir's
 * neural architecture. Only exists if voluntarily recorded.
 */
export interface NeuralMap {
  readonly mapId: string;
  readonly dynastyId: string;
  /** Unix-microseconds when the map was captured. */
  readonly capturedAtUs: number;
  /**
   * Fidelity score: completeness of the electromagnetic capture (0.0–1.0).
   * Below NEURAL_MAP_MIN_FIDELITY the map cannot ground a continuity claim.
   */
  readonly fidelityScore: number;
  /** Which substrate holds the live instance that corresponds to this map. */
  substrateStatus: ContinuityPhilosophicalStatus;
  readonly capturedByVesselId?: string;
}

/**
 * A dynasty's continuity record.
 * Tracks Vigil state, activity, ContinuityBonds, and neural mapping.
 */
export interface DynastyContinuityRecord {
  readonly dynastyId: string;
  vigilState: VigilState;
  /** Unix-ms of last login. */
  lastLoginMs: number;
  /** Unix-ms when Vigil threshold was first crossed (if in VIGIL or CRISIS). */
  vigilEnteredMs?: number;
  /** ContinuityBonds remaining (was: EarnedLives). */
  continuityBonds: number;
  /** All neural maps filed by this dynasty. */
  neuralMaps: NeuralMap[];
  /** The latest viable neural map for substrate recovery. */
  primaryMapId?: string;
  /** Chronicle entries emitted for this record. */
  chronicleEntryIds: string[];
}

/** Chronicle entry from the continuity system. */
export interface ContinuityChronicleEntry {
  readonly entryType:
    | 'CONTINUITY_VIGIL_ENTERED'
    | 'CONTINUITY_VIGIL_CRISIS'
    | 'CONTINUITY_VIGIL_RENEWED'
    | 'CONTINUITY_BOND_CONSUMED'
    | 'CONTINUITY_NEURAL_MAP_FILED'
    | 'CONTINUITY_SUBSTRATE_TRANSFER';
  readonly dynastyId: string;
  readonly detail: string;
  readonly timestampMs: number;
}

// ── Port Interfaces ────────────────────────────────────────────────────────

export interface ContinuityClockPort {
  readonly nowMs: () => number;
  readonly nowUs: () => number;
}

export interface ContinuityIdPort {
  readonly next: () => string;
}

export interface ContinuityChroniclePort {
  readonly emit: (entry: ContinuityChronicleEntry) => void;
}

export interface ContinuityProtocolDeps {
  readonly clock: ContinuityClockPort;
  readonly idGenerator: ContinuityIdPort;
  readonly vigilThresholdDays?: number;
  readonly chronicle?: ContinuityChroniclePort;
}

// ── Service Interface ──────────────────────────────────────────────────────

export interface ContinuityProtocolService {
  /**
   * Initialise a continuity record for a new dynasty.
   * Returns the record or an error string.
   */
  initDynasty(dynastyId: string, initialBonds?: number): DynastyContinuityRecord | string;

  /** Record a login event. Resets Vigil watch timers. */
  recordLogin(dynastyId: string): DynastyContinuityRecord | string;

  /**
   * Evaluate Vigil state for a dynasty given the current clock.
   * Transitions ACTIVE → WATCH → VIGIL → CRISIS as inactivity grows.
   * Returns the updated record.
   */
  evaluateVigilState(dynastyId: string): DynastyContinuityRecord | string;

  /**
   * File a neural map for a dynasty heir.
   * Requires fidelity ≥ NEURAL_MAP_MIN_FIDELITY to become primary.
   * Returns the created NeuralMap or an error string.
   */
  fileNeuralMap(params: FileNeuralMapParams): NeuralMap | string;

  /**
   * Record a substrate transfer event for a dynasty heir.
   * Updates all neural maps and emits a Chronicle entry.
   */
  recordSubstrateTransfer(params: SubstrateTransferParams): DynastyContinuityRecord | string;

  /**
   * Consume a ContinuityBond to extend Vigil protection.
   * Returns the updated record or an error string.
   */
  consumeContinuityBond(dynastyId: string): DynastyContinuityRecord | string;

  /**
   * Award ContinuityBonds to a dynasty (capped at MAX_CONTINUITY_BONDS).
   */
  awardContinuityBonds(dynastyId: string, count: number): DynastyContinuityRecord | string;

  /** Get a continuity record. */
  getDynastyRecord(dynastyId: string): DynastyContinuityRecord | undefined;

  /** Get all dynasties currently in VIGIL or CRISIS. */
  getVigilDynasties(): ReadonlyArray<DynastyContinuityRecord>;

  /** Network-wide continuity statistics. */
  getContinuityStats(): ContinuityStats;
}

export interface FileNeuralMapParams {
  readonly dynastyId: string;
  readonly fidelityScore: number;
  readonly capturedByVesselId?: string;
}

export interface SubstrateTransferParams {
  readonly dynastyId: string;
  readonly mapId: string;
  readonly continuityStatus: ContinuityPhilosophicalStatus;
}

export interface ContinuityStats {
  readonly totalDynasties: number;
  readonly activeDynasties: number;
  readonly vigilDynasties: number;
  readonly crisisDynasties: number;
  readonly renewedDynasties: number;
  readonly totalNeuralMaps: number;
  readonly substrateTransfers: number;
}

// ── Implementation ─────────────────────────────────────────────────────────

interface ServiceState {
  readonly deps: ContinuityProtocolDeps;
  readonly vigilThresholdMs: number;
  readonly crisisThresholdMs: number;
  records: Map<string, DynastyContinuityRecord>;
  substrateTransferCount: number;
}

export function createContinuityProtocolService(deps: ContinuityProtocolDeps): ContinuityProtocolService {
  const thresholdDays = deps.vigilThresholdDays ?? DEFAULT_VIGIL_THRESHOLD_DAYS;
  const state: ServiceState = {
    deps,
    vigilThresholdMs: thresholdDays * MS_PER_DAY,
    crisisThresholdMs: thresholdDays * 3 * MS_PER_DAY,  // 3× vigil threshold = crisis
    records: new Map(),
    substrateTransferCount: 0,
  };

  function initDynasty(dynastyId: string, initialBonds = 3): DynastyContinuityRecord | string {
    if (state.records.has(dynastyId)) return `dynasty already initialised: ${dynastyId}`;
    const record: DynastyContinuityRecord = {
      dynastyId,
      vigilState: 'ACTIVE',
      lastLoginMs: deps.clock.nowMs(),
      continuityBonds: Math.min(MAX_CONTINUITY_BONDS, Math.max(0, initialBonds)),
      neuralMaps: [],
      chronicleEntryIds: [],
    };
    state.records.set(dynastyId, record);
    return record;
  }

  function recordLogin(dynastyId: string): DynastyContinuityRecord | string {
    const record = state.records.get(dynastyId);
    if (!record) return `dynasty not found: ${dynastyId}`;

    const nowMs = deps.clock.nowMs();
    record.lastLoginMs = nowMs;

    // Returning from VIGIL — transition to RENEWED.
    if (record.vigilState === 'VIGIL' || record.vigilState === 'CRISIS') {
      record.vigilState = 'RENEWED';
      record.vigilEnteredMs = undefined;
      const entry: ContinuityChronicleEntry = {
        entryType: 'CONTINUITY_VIGIL_RENEWED',
        dynastyId,
        detail: 'Dynasty returned from Vigil. Continuity record restored to active status.',
        timestampMs: nowMs,
      };
      deps.chronicle?.emit(entry);
    } else if (record.vigilState === 'WATCH') {
      record.vigilState = 'ACTIVE';
    }

    return record;
  }

  function evaluateVigilState(dynastyId: string): DynastyContinuityRecord | string {
    const record = state.records.get(dynastyId);
    if (!record) return `dynasty not found: ${dynastyId}`;

    if (record.vigilState === 'RENEWED') {
      // After renewal, check if enough time has passed to go fully ACTIVE.
      record.vigilState = 'ACTIVE';
      return record;
    }

    if (record.vigilState === 'ACTIVE' || record.vigilState === 'WATCH') {
      const nowMs = deps.clock.nowMs();
      const inactiveDuration = nowMs - record.lastLoginMs;

      if (inactiveDuration >= state.crisisThresholdMs) {
        if (record.vigilState !== 'CRISIS') {
          record.vigilState = 'CRISIS';
          if (!record.vigilEnteredMs) record.vigilEnteredMs = nowMs;
          const entry: ContinuityChronicleEntry = {
            entryType: 'CONTINUITY_VIGIL_CRISIS',
            dynastyId,
            detail: `Dynasty entered Continuity Crisis. Inactive for ${Math.floor(inactiveDuration / MS_PER_DAY)} days. Estate protections elevated.`,
            timestampMs: nowMs,
          };
          deps.chronicle?.emit(entry);
        }
      } else if (inactiveDuration >= state.vigilThresholdMs) {
        if (record.vigilState !== 'VIGIL') {
          record.vigilState = 'VIGIL';
          record.vigilEnteredMs = nowMs;
          const entry: ContinuityChronicleEntry = {
            entryType: 'CONTINUITY_VIGIL_ENTERED',
            dynastyId,
            detail: `Dynasty entered Vigil Protocol. Inactive for ${Math.floor(inactiveDuration / MS_PER_DAY)} days. Continuity holding.`,
            timestampMs: nowMs,
          };
          deps.chronicle?.emit(entry);
        }
      } else if (inactiveDuration >= state.vigilThresholdMs * 0.7) {
        record.vigilState = 'WATCH';
      }
    }

    return record;
  }

  function fileNeuralMap(params: FileNeuralMapParams): NeuralMap | string {
    const record = state.records.get(params.dynastyId);
    if (!record) return `dynasty not found: ${params.dynastyId}`;

    const nowUs = deps.clock.nowUs();
    const map: NeuralMap = {
      mapId: deps.idGenerator.next(),
      dynastyId: params.dynastyId,
      capturedAtUs: nowUs,
      fidelityScore: Math.max(0, Math.min(1, params.fidelityScore)),
      substrateStatus: 'IS_ORIGINAL',
      capturedByVesselId: params.capturedByVesselId,
    };

    record.neuralMaps.push(map);

    if (map.fidelityScore >= NEURAL_MAP_MIN_FIDELITY) {
      (record as { primaryMapId?: string }).primaryMapId = map.mapId;
    }

    const nowMs = deps.clock.nowMs();
    deps.chronicle?.emit({
      entryType: 'CONTINUITY_NEURAL_MAP_FILED',
      dynastyId: params.dynastyId,
      detail: `Neural frequency map filed. Fidelity: ${(map.fidelityScore * 100).toFixed(1)}%. ${map.fidelityScore >= NEURAL_MAP_MIN_FIDELITY ? 'Viable for continuity claim.' : 'Below viability threshold.'}`,
      timestampMs: nowMs,
    });

    return map;
  }

  function recordSubstrateTransfer(params: SubstrateTransferParams): DynastyContinuityRecord | string {
    const record = state.records.get(params.dynastyId);
    if (!record) return `dynasty not found: ${params.dynastyId}`;

    const map = record.neuralMaps.find(m => m.mapId === params.mapId);
    if (!map) return `neural map not found: ${params.mapId}`;

    map.substrateStatus = params.continuityStatus;
    state.substrateTransferCount++;

    const statusDescriptions: Record<ContinuityPhilosophicalStatus, string> = {
      IS_ORIGINAL: 'No transfer; original biological substrate confirmed.',
      PRESUMED_CONTINUOUS: 'Substrate transfer completed; continuous experience claimed and filed.',
      UNRESOLVED: 'Substrate transfer completed; continuity of experience cannot be verified.',
      SUBSTRATE_TRANSFER: 'Substrate transfer recorded; continuity claim not yet filed.',
    };

    const nowMs = deps.clock.nowMs();
    deps.chronicle?.emit({
      entryType: 'CONTINUITY_SUBSTRATE_TRANSFER',
      dynastyId: params.dynastyId,
      detail: statusDescriptions[params.continuityStatus],
      timestampMs: nowMs,
    });

    return record;
  }

  function consumeContinuityBond(dynastyId: string): DynastyContinuityRecord | string {
    const record = state.records.get(dynastyId);
    if (!record) return `dynasty not found: ${dynastyId}`;
    if (record.continuityBonds <= 0) return `no continuity bonds remaining: ${dynastyId}`;

    record.continuityBonds--;
    const nowMs = deps.clock.nowMs();
    deps.chronicle?.emit({
      entryType: 'CONTINUITY_BOND_CONSUMED',
      dynastyId,
      detail: `ContinuityBond consumed. ${record.continuityBonds} remaining.`,
      timestampMs: nowMs,
    });

    return record;
  }

  function awardContinuityBonds(dynastyId: string, count: number): DynastyContinuityRecord | string {
    const record = state.records.get(dynastyId);
    if (!record) return `dynasty not found: ${dynastyId}`;
    record.continuityBonds = Math.min(MAX_CONTINUITY_BONDS, record.continuityBonds + count);
    return record;
  }

  function getDynastyRecord(dynastyId: string): DynastyContinuityRecord | undefined {
    return state.records.get(dynastyId);
  }

  function getVigilDynasties(): ReadonlyArray<DynastyContinuityRecord> {
    return [...state.records.values()].filter(
      r => r.vigilState === 'VIGIL' || r.vigilState === 'CRISIS',
    );
  }

  function getContinuityStats(): ContinuityStats {
    let active = 0, vigil = 0, crisis = 0, renewed = 0, neuralMaps = 0;
    for (const r of state.records.values()) {
      if (r.vigilState === 'ACTIVE' || r.vigilState === 'WATCH') active++;
      else if (r.vigilState === 'VIGIL') vigil++;
      else if (r.vigilState === 'CRISIS') crisis++;
      else if (r.vigilState === 'RENEWED') renewed++;
      neuralMaps += r.neuralMaps.length;
    }
    return {
      totalDynasties: state.records.size,
      activeDynasties: active,
      vigilDynasties: vigil,
      crisisDynasties: crisis,
      renewedDynasties: renewed,
      totalNeuralMaps: neuralMaps,
      substrateTransfers: state.substrateTransferCount,
    };
  }

  return {
    initDynasty,
    recordLogin,
    evaluateVigilState,
    fileNeuralMap,
    recordSubstrateTransfer,
    consumeContinuityBond,
    awardContinuityBonds,
    getDynastyRecord,
    getVigilDynasties,
    getContinuityStats,
  };
}
