/**
 * sealed-chambers.ts — The Seven Sealed Chambers narrative state machine.
 *
 * The Sealed Chambers are not a gameplay system. They are the reckoning.
 *
 * Seven chambers. Seven accounts that the Architect locked when the civilisation
 * was young, before the Chronicle had weight, before anyone had the context to
 * understand what they were reading. The locks are not arbitrary — each one
 * requires the civilisation to have done something real, at scale, that proves
 * it is ready for what the chamber contains.
 *
 * The Architect's note, appended to Chamber Seven: "I will know they are ready
 * when they have built something worth protecting."
 *
 * Sealed Chamber unlock conditions (from Agent Update v2.0):
 *
 *   Chamber One   — The Kwame Files
 *                   A player dynasty has filed a Chronicle survey of ≥50 worlds
 *                   that includes Lattice integrity data for each.
 *
 *   Chamber Two   — The Ordinance 7 Record
 *                   The Assembly has passed a declassification motion for World 247.
 *
 *   Chamber Three — The World 412 Full Account
 *                   10,000 Chronicle entries cite world_id = World-412.
 *
 *   Chamber Four  — The Ferreira-Asante Finding
 *                   World 499 quarantine has been lifted by player petition.
 *
 *   Chamber Five  — The Sundaram-Chen Logs
 *                   A player dynasty has reached the outer arc interference band
 *                   (≥280 LY from civilisation core).
 *
 *   Chamber Six   — The Dagna Reports
 *                   A player dynasty has identified a KALON audit irregularity
 *                   pattern (≥3 correlated anomalies in governance data).
 *
 *   Chamber Seven — The Architect's Statement
 *                   In-game year has reached 105, computed from civilisation data.
 *
 * Design notes:
 *   - Chamber content is server-side ONLY (like npc_characters.secret).
 *   - Players receive only: chamberId, title, isUnlocked, unlockedAtMs.
 *   - KALON values are bigint throughout (NUMERIC(20,0) invariant).
 *   - The Chronicle must receive an entry when any chamber unlocks.
 *   - All unlock triggers are evaluated lazily (pull, not push) so the
 *     engine stays stateless about the broader simulation.
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Minimum survey worlds with Lattice data required for Chamber One. */
export const CHAMBER_ONE_MIN_SURVEY_WORLDS = 50;

/** Chronicle entry count for World-412 required for Chamber Three. */
export const CHAMBER_THREE_CHRONICLE_TARGET = 10_000;

/** Outer arc minimum distance for Chamber Five (light-years). */
export const CHAMBER_FIVE_OUTER_ARC_LY = 280;

/** Minimum correlated KALON audit anomalies for Chamber Six. */
export const CHAMBER_SIX_KALON_ANOMALY_COUNT = 3;

/** In-game year at which Chamber Seven unlocks. */
export const CHAMBER_SEVEN_UNLOCK_YEAR = 105;

// ── Types ──────────────────────────────────────────────────────────────────

export type ChamberStatus = 'LOCKED' | 'CONDITION_MET' | 'UNLOCKED';

export type ChamberId =
  | 'CHAMBER_ONE_KWAME_FILES'
  | 'CHAMBER_TWO_ORDINANCE_7'
  | 'CHAMBER_THREE_WORLD_412'
  | 'CHAMBER_FOUR_FERREIRA_ASANTE'
  | 'CHAMBER_FIVE_SUNDARAM_CHEN'
  | 'CHAMBER_SIX_DAGNA_REPORTS'
  | 'CHAMBER_SEVEN_ARCHITECT';

/** Public-facing chamber record (no content included). */
export interface SealedChamber {
  readonly chamberId: ChamberId;
  readonly title: string;
  readonly characterName: string;
  status: ChamberStatus;
  /** Unix-ms timestamp when condition was first met. */
  conditionMetAtMs?: number;
  /** Unix-ms timestamp when the chamber was formally unlocked. */
  unlockedAtMs?: number;
}

/** Chronicle entry emitted on unlock. */
export interface ChamberChronicleEntry {
  readonly entryType: 'SEALED_CHAMBER_UNLOCKED';
  readonly chamberId: ChamberId;
  readonly title: string;
  readonly characterName: string;
  readonly timestampMs: number;
}

// ── Trigger Condition Inputs ───────────────────────────────────────────────

/**
 * All data the engine needs to evaluate unlock conditions.
 * Injected by the application tier — the engine is pure logic.
 */
export interface ChamberConditionEvaluator {
  /** Chamber One: How many worlds has this dynasty surveyed with Lattice integrity data? */
  readonly getDynastySurveyWorldCount: (dynastyId: string) => number;

  /** Chamber Two: Has the Assembly passed a declassification motion for World-247? */
  readonly hasAssemblyDeclassifiedWorld247: () => boolean;

  /** Chamber Three: How many Chronicle entries cite World-412? */
  readonly getWorld412ChronicleCount: () => number;

  /** Chamber Four: Has World-499 quarantine been lifted? */
  readonly isWorld499QuarantineLifted: () => boolean;

  /** Chamber Five: Has any player dynasty reached the outer arc (≥280 LY)? */
  readonly getMaxDynastyArcDistanceLY: () => number;

  /** Chamber Six: How many correlated KALON audit anomalies have been identified? */
  readonly getKalonAuditAnomalyCount: () => number;

  /** Chamber Seven: Current in-game year. */
  readonly getCurrentIngameYear: () => number;
}

// ── Port interfaces ────────────────────────────────────────────────────────

export interface SealedChambersClockPort {
  readonly nowMs: () => number;
}

export interface SealedChambersChroniclePort {
  readonly emit: (entry: ChamberChronicleEntry) => void;
}

export interface SealedChambersDeps {
  readonly clock: SealedChambersClockPort;
  readonly chronicle?: SealedChambersChroniclePort;
}

// ── Service Interface ──────────────────────────────────────────────────────

export interface SealedChambersService {
  /**
   * Get public status of all chambers (no content).
   */
  getAllChambers(): ReadonlyArray<SealedChamber>;

  /**
   * Get a single chamber by ID.
   */
  getChamber(chamberId: ChamberId): SealedChamber | undefined;

  /**
   * Evaluate all chamber unlock conditions against live data.
   * Transitions LOCKED → CONDITION_MET or CONDITION_MET → UNLOCKED.
   * Returns any newly unlocked chambers.
   *
   * Pass a dynastyId to evaluate dynasty-specific conditions (Chambers One and Five).
   */
  evaluateConditions(
    evaluator: ChamberConditionEvaluator,
    dynastyId?: string,
  ): ReadonlyArray<SealedChamber>;

  /**
   * Formally unlock a chamber (CONDITION_MET → UNLOCKED).
   * Emits a Chronicle entry.
   * Returns the updated chamber or an error string.
   */
  unlockChamber(chamberId: ChamberId): SealedChamber | string;

  /**
   * Get total unlock count.
   */
  getUnlockCount(): number;

  /**
   * The Architect's unlock summary: which chambers are open.
   */
  getUnlockSummary(): ChamberUnlockSummary;
}

export interface ChamberUnlockSummary {
  readonly totalChambers: number;
  readonly unlockedCount: number;
  readonly conditionMetCount: number;
  readonly lockedCount: number;
  readonly allUnlocked: boolean;
}

// ── Chamber Metadata ───────────────────────────────────────────────────────

const CHAMBER_DEFINITIONS: ReadonlyArray<{ id: ChamberId; title: string; character: string }> = [
  { id: 'CHAMBER_ONE_KWAME_FILES',      title: 'The Kwame Files',             character: 'Osei-Adeyemi' },
  { id: 'CHAMBER_TWO_ORDINANCE_7',      title: 'The Ordinance 7 Record',      character: 'Vael' },
  { id: 'CHAMBER_THREE_WORLD_412',      title: 'The World 412 Full Account',  character: 'Achebe' },
  { id: 'CHAMBER_FOUR_FERREIRA_ASANTE', title: 'The Ferreira-Asante Finding', character: 'Ferreira-Asante' },
  { id: 'CHAMBER_FIVE_SUNDARAM_CHEN',   title: 'The Sundaram-Chen Logs',      character: 'Sundaram-Chen' },
  { id: 'CHAMBER_SIX_DAGNA_REPORTS',   title: 'The Dagna Reports',           character: 'Thorvaldsen-Mbeki' },
  { id: 'CHAMBER_SEVEN_ARCHITECT',      title: "The Architect's Statement",   character: 'The Architect' },
];

// ── Implementation ─────────────────────────────────────────────────────────

interface ServiceState {
  readonly deps: SealedChambersDeps;
  chambers: Map<ChamberId, SealedChamber>;
}

function buildInitialChambers(): Map<ChamberId, SealedChamber> {
  const map = new Map<ChamberId, SealedChamber>();
  for (const def of CHAMBER_DEFINITIONS) {
    map.set(def.id, {
      chamberId: def.id,
      title: def.title,
      characterName: def.character,
      status: 'LOCKED',
    });
  }
  return map;
}

export function createSealedChambersService(deps: SealedChambersDeps): SealedChambersService {
  const state: ServiceState = {
    deps,
    chambers: buildInitialChambers(),
  };

  function getAllChambers(): ReadonlyArray<SealedChamber> {
    return [...state.chambers.values()];
  }

  function getChamber(chamberId: ChamberId): SealedChamber | undefined {
    return state.chambers.get(chamberId);
  }

  function evaluateConditions(evaluator: ChamberConditionEvaluator, dynastyId?: string): ReadonlyArray<SealedChamber> {
    const nowMs = deps.clock.nowMs();
    const newlyMet: SealedChamber[] = [];

    function tryMeet(id: ChamberId, conditionPasses: boolean): void {
      const chamber = state.chambers.get(id);
      if (!chamber || chamber.status !== 'LOCKED') return;
      if (conditionPasses) {
        chamber.status = 'CONDITION_MET';
        (chamber as { conditionMetAtMs?: number }).conditionMetAtMs = nowMs;
        newlyMet.push(chamber);
      }
    }

    // Chamber One — dynasty survey (dynasty-specific).
    if (dynastyId !== undefined) {
      tryMeet('CHAMBER_ONE_KWAME_FILES',
        evaluator.getDynastySurveyWorldCount(dynastyId) >= CHAMBER_ONE_MIN_SURVEY_WORLDS,
      );
    }

    // Chamber Two — Assembly vote.
    tryMeet('CHAMBER_TWO_ORDINANCE_7', evaluator.hasAssemblyDeclassifiedWorld247());

    // Chamber Three — Chronicle entry density for World-412.
    tryMeet('CHAMBER_THREE_WORLD_412',
      evaluator.getWorld412ChronicleCount() >= CHAMBER_THREE_CHRONICLE_TARGET,
    );

    // Chamber Four — World-499 quarantine.
    tryMeet('CHAMBER_FOUR_FERREIRA_ASANTE', evaluator.isWorld499QuarantineLifted());

    // Chamber Five — outer arc reach (any dynasty).
    tryMeet('CHAMBER_FIVE_SUNDARAM_CHEN',
      evaluator.getMaxDynastyArcDistanceLY() >= CHAMBER_FIVE_OUTER_ARC_LY,
    );

    // Chamber Six — KALON audit irregularity.
    tryMeet('CHAMBER_SIX_DAGNA_REPORTS',
      evaluator.getKalonAuditAnomalyCount() >= CHAMBER_SIX_KALON_ANOMALY_COUNT,
    );

    // Chamber Seven — in-game year.
    tryMeet('CHAMBER_SEVEN_ARCHITECT',
      evaluator.getCurrentIngameYear() >= CHAMBER_SEVEN_UNLOCK_YEAR,
    );

    return newlyMet;
  }

  function unlockChamber(chamberId: ChamberId): SealedChamber | string {
    const chamber = state.chambers.get(chamberId);
    if (!chamber) return `unknown chamber: ${chamberId}`;
    if (chamber.status === 'UNLOCKED') return `chamber already unlocked: ${chamberId}`;
    if (chamber.status === 'LOCKED') return `chamber condition not yet met: ${chamberId}`;

    const nowMs = deps.clock.nowMs();
    chamber.status = 'UNLOCKED';
    (chamber as { unlockedAtMs?: number }).unlockedAtMs = nowMs;

    deps.chronicle?.emit({
      entryType: 'SEALED_CHAMBER_UNLOCKED',
      chamberId,
      title: chamber.title,
      characterName: chamber.characterName,
      timestampMs: nowMs,
    });

    return chamber;
  }

  function getUnlockCount(): number {
    let count = 0;
    for (const c of state.chambers.values()) {
      if (c.status === 'UNLOCKED') count++;
    }
    return count;
  }

  function getUnlockSummary(): ChamberUnlockSummary {
    let unlocked = 0, met = 0, locked = 0;
    for (const c of state.chambers.values()) {
      if (c.status === 'UNLOCKED') unlocked++;
      else if (c.status === 'CONDITION_MET') met++;
      else locked++;
    }
    return {
      totalChambers: state.chambers.size,
      unlockedCount: unlocked,
      conditionMetCount: met,
      lockedCount: locked,
      allUnlocked: unlocked === state.chambers.size,
    };
  }

  return { getAllChambers, getChamber, evaluateConditions, unlockChamber, getUnlockCount, getUnlockSummary };
}
