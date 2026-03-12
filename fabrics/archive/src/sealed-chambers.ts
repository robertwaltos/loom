/**
 * Sealed Chambers Engine — Seven narrative locks containing civilization secrets.
 *
 * Bible v2.0: Each Sealed Chamber opens when players independently discover
 * what one of the canonical NPC characters already knows. Opening conditions
 * are evaluated against Chronicle data, Assembly motions, and in-game state.
 *
 * Chambers are append-only state machines: SEALED → TRIGGERED → OPENED.
 * Once opened, the chamber's contents become Chronicle-permanent.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ChamberId =
  | 'KWAME_FILES'
  | 'ORDINANCE_7_RECORD'
  | 'WORLD_412_ACCOUNT'
  | 'FERREIRA_ASANTE_FINDING'
  | 'SUNDARAM_CHEN_LOGS'
  | 'DAGNA_THREE_REPORTS'
  | 'ARCHITECT_STATEMENT';

export type ChamberState = 'SEALED' | 'TRIGGERED' | 'OPENED';

export interface ChamberDefinition {
  readonly chamberId: ChamberId;
  readonly name: string;
  readonly linkedCharacterId: string;
  readonly triggerDescription: string;
}

export interface ChamberRecord {
  readonly chamberId: ChamberId;
  readonly state: ChamberState;
  readonly triggeredAt: number | null;
  readonly openedAt: number | null;
  readonly triggerDynastyId: string | null;
  readonly triggerChronicleRef: string | null;
}

export interface ChamberTransition {
  readonly transitionId: string;
  readonly chamberId: ChamberId;
  readonly from: ChamberState;
  readonly to: ChamberState;
  readonly at: number;
  readonly dynastyId: string | null;
  readonly reason: string;
}

// ─── Trigger Conditions ──────────────────────────────────────────────

export interface TriggerConditions {
  /** Chamber One: dynasty files Chronicle survey of 50 worlds with Lattice integrity data */
  readonly dynastySurveyWorldCount: (dynastyId: string) => number;

  /** Chamber Two: Assembly passes declassification motion for World 247 */
  readonly hasPassedDeclassificationMotion: (worldId: string) => boolean;

  /** Chamber Three: 10,000 Chronicle entries citing world 412 */
  readonly chronicleEntryCountForWorld: (worldId: string) => number;

  /** Chamber Four: World 499 quarantine lifted by player petition */
  readonly isQuarantineLifted: (worldId: string) => boolean;

  /** Chamber Five: Player dynasty reaches outer arc interference band */
  readonly hasReachedOuterArc: (dynastyId: string) => boolean;

  /** Chamber Six: Player identifies KALON audit irregularity and files Chronicle */
  readonly hasFiledAuditIrregularity: (dynastyId: string) => boolean;

  /** Chamber Seven: Year 105 in-game */
  readonly getCurrentInGameYear: () => number;
}

// ─── Chamber Definitions ─────────────────────────────────────────────

const CHAMBER_DEFINITIONS: ReadonlyArray<ChamberDefinition> = [
  {
    chamberId: 'KWAME_FILES',
    name: 'Chamber One — Kwame Files',
    linkedCharacterId: '002',
    triggerDescription: 'Player dynasty files Chronicle survey of 50 worlds with Lattice integrity data',
  },
  {
    chamberId: 'ORDINANCE_7_RECORD',
    name: 'Chamber Two — Ordinance 7 Record',
    linkedCharacterId: '003',
    triggerDescription: 'Assembly passes declassification motion for World 247',
  },
  {
    chamberId: 'WORLD_412_ACCOUNT',
    name: 'Chamber Three — World 412 Full Account',
    linkedCharacterId: '004',
    triggerDescription: '10,000 Chronicle entries citing world_id = World 412',
  },
  {
    chamberId: 'FERREIRA_ASANTE_FINDING',
    name: 'Chamber Four — Ferreira-Asante Finding',
    linkedCharacterId: '011',
    triggerDescription: 'World 499 quarantine lifted by player petition',
  },
  {
    chamberId: 'SUNDARAM_CHEN_LOGS',
    name: 'Chamber Five — Sundaram-Chen Logs',
    linkedCharacterId: '010',
    triggerDescription: 'Player dynasty reaches outer arc interference band',
  },
  {
    chamberId: 'DAGNA_THREE_REPORTS',
    name: 'Chamber Six — Dagna\'s Three Reports',
    linkedCharacterId: '012',
    triggerDescription: 'Player identifies KALON audit irregularity pattern and files Chronicle entry',
  },
  {
    chamberId: 'ARCHITECT_STATEMENT',
    name: 'Chamber Seven — Architect\'s Statement',
    linkedCharacterId: '001',
    triggerDescription: 'Year 105 in-game — computed from actual civilisation data',
  },
] as const;

// ─── Constants ───────────────────────────────────────────────────────

const KWAME_SURVEY_THRESHOLD = 50;
const WORLD_412_CHRONICLE_THRESHOLD = 10_000;
const ARCHITECT_STATEMENT_YEAR = 105;
const WORLD_247_ID = 'world-247';
const WORLD_412_ID = 'world-412';
const WORLD_499_ID = 'world-499';

export const SEALED_CHAMBER_CONSTANTS = {
  KWAME_SURVEY_THRESHOLD,
  WORLD_412_CHRONICLE_THRESHOLD,
  ARCHITECT_STATEMENT_YEAR,
  WORLD_247_ID,
  WORLD_412_ID,
  WORLD_499_ID,
} as const;

// ─── Deps ────────────────────────────────────────────────────────────

export interface SealedChamberDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly next: () => string };
  readonly conditions: TriggerConditions;
}

// ─── Stats ───────────────────────────────────────────────────────────

export interface SealedChamberStats {
  readonly sealed: number;
  readonly triggered: number;
  readonly opened: number;
  readonly total: number;
}

// ─── Public Interface ────────────────────────────────────────────────

export interface SealedChamberEngine {
  readonly getDefinitions: () => ReadonlyArray<ChamberDefinition>;
  readonly getRecord: (chamberId: ChamberId) => ChamberRecord;
  readonly getAllRecords: () => ReadonlyArray<ChamberRecord>;
  readonly evaluate: (chamberId: ChamberId, dynastyId: string | null) => ChamberTransition | null;
  readonly evaluateAll: (dynastyId: string | null) => ReadonlyArray<ChamberTransition>;
  readonly openTriggered: (chamberId: ChamberId, chronicleRef: string) => ChamberTransition | null;
  readonly getStats: () => SealedChamberStats;
  readonly getTransitionHistory: (chamberId: ChamberId) => ReadonlyArray<ChamberTransition>;
}

// ─── State ───────────────────────────────────────────────────────────

interface MutableChamberRecord {
  readonly chamberId: ChamberId;
  state: ChamberState;
  triggeredAt: number | null;
  openedAt: number | null;
  triggerDynastyId: string | null;
  triggerChronicleRef: string | null;
}

interface EngineState {
  readonly deps: SealedChamberDeps;
  readonly records: Map<ChamberId, MutableChamberRecord>;
  readonly transitions: Map<ChamberId, ChamberTransition[]>;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createSealedChamberEngine(deps: SealedChamberDeps): SealedChamberEngine {
  const state = initState(deps);

  return {
    getDefinitions: () => CHAMBER_DEFINITIONS,
    getRecord: (id) => freezeRecord(getOrThrow(state, id)),
    getAllRecords: () => [...state.records.values()].map(freezeRecord),
    evaluate: (id, dynastyId) => evaluateChamber(state, id, dynastyId),
    evaluateAll: (dynastyId) => evaluateAllChambers(state, dynastyId),
    openTriggered: (id, ref) => openTriggeredChamber(state, id, ref),
    getStats: () => computeStats(state),
    getTransitionHistory: (id) => state.transitions.get(id) ?? [],
  };
}

// ─── Init ────────────────────────────────────────────────────────────

function initState(deps: SealedChamberDeps): EngineState {
  const records = new Map<ChamberId, MutableChamberRecord>();
  const transitions = new Map<ChamberId, ChamberTransition[]>();

  for (const def of CHAMBER_DEFINITIONS) {
    records.set(def.chamberId, {
      chamberId: def.chamberId,
      state: 'SEALED',
      triggeredAt: null,
      openedAt: null,
      triggerDynastyId: null,
      triggerChronicleRef: null,
    });
    transitions.set(def.chamberId, []);
  }

  return { deps, records, transitions };
}

// ─── Evaluate ────────────────────────────────────────────────────────

function evaluateChamber(
  state: EngineState,
  chamberId: ChamberId,
  dynastyId: string | null,
): ChamberTransition | null {
  const record = getOrThrow(state, chamberId);
  if (record.state !== 'SEALED') return null;

  const conditions = state.deps.conditions;
  const met = checkTriggerCondition(chamberId, dynastyId, conditions);
  if (!met) return null;

  return triggerChamber(state, record, dynastyId);
}

function evaluateAllChambers(
  state: EngineState,
  dynastyId: string | null,
): ReadonlyArray<ChamberTransition> {
  const results: ChamberTransition[] = [];

  for (const def of CHAMBER_DEFINITIONS) {
    const transition = evaluateChamber(state, def.chamberId, dynastyId);
    if (transition !== null) results.push(transition);
  }

  return results;
}

function checkTriggerCondition(
  chamberId: ChamberId,
  dynastyId: string | null,
  conditions: TriggerConditions,
): boolean {
  switch (chamberId) {
    case 'KWAME_FILES':
      return dynastyId !== null &&
        conditions.dynastySurveyWorldCount(dynastyId) >= KWAME_SURVEY_THRESHOLD;

    case 'ORDINANCE_7_RECORD':
      return conditions.hasPassedDeclassificationMotion(WORLD_247_ID);

    case 'WORLD_412_ACCOUNT':
      return conditions.chronicleEntryCountForWorld(WORLD_412_ID) >= WORLD_412_CHRONICLE_THRESHOLD;

    case 'FERREIRA_ASANTE_FINDING':
      return conditions.isQuarantineLifted(WORLD_499_ID);

    case 'SUNDARAM_CHEN_LOGS':
      return dynastyId !== null && conditions.hasReachedOuterArc(dynastyId);

    case 'DAGNA_THREE_REPORTS':
      return dynastyId !== null && conditions.hasFiledAuditIrregularity(dynastyId);

    case 'ARCHITECT_STATEMENT':
      return conditions.getCurrentInGameYear() >= ARCHITECT_STATEMENT_YEAR;
  }
}

// ─── State Transitions ───────────────────────────────────────────────

function triggerChamber(
  state: EngineState,
  record: MutableChamberRecord,
  dynastyId: string | null,
): ChamberTransition {
  const now = state.deps.clock.nowMicroseconds();
  record.state = 'TRIGGERED';
  record.triggeredAt = now;
  record.triggerDynastyId = dynastyId;

  const transition = buildTransition(
    state,
    record.chamberId,
    'SEALED',
    'TRIGGERED',
    now,
    dynastyId,
    `Trigger condition met for ${record.chamberId}`,
  );

  return transition;
}

function openTriggeredChamber(
  state: EngineState,
  chamberId: ChamberId,
  chronicleRef: string,
): ChamberTransition | null {
  const record = getOrThrow(state, chamberId);
  if (record.state !== 'TRIGGERED') return null;

  const now = state.deps.clock.nowMicroseconds();
  record.state = 'OPENED';
  record.openedAt = now;
  record.triggerChronicleRef = chronicleRef;

  return buildTransition(
    state,
    chamberId,
    'TRIGGERED',
    'OPENED',
    now,
    record.triggerDynastyId,
    `Chamber opened — Chronicle ref: ${chronicleRef}`,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildTransition(
  state: EngineState,
  chamberId: ChamberId,
  from: ChamberState,
  to: ChamberState,
  at: number,
  dynastyId: string | null,
  reason: string,
): ChamberTransition {
  const transition: ChamberTransition = {
    transitionId: state.deps.idGenerator.next(),
    chamberId,
    from,
    to,
    at,
    dynastyId,
    reason,
  };

  const list = state.transitions.get(chamberId);
  if (list !== undefined) list.push(transition);

  return transition;
}

function getOrThrow(state: EngineState, chamberId: ChamberId): MutableChamberRecord {
  const record = state.records.get(chamberId);
  if (record === undefined) throw new Error(`Unknown chamber: ${chamberId}`);
  return record;
}

function freezeRecord(record: MutableChamberRecord): ChamberRecord {
  return {
    chamberId: record.chamberId,
    state: record.state,
    triggeredAt: record.triggeredAt,
    openedAt: record.openedAt,
    triggerDynastyId: record.triggerDynastyId,
    triggerChronicleRef: record.triggerChronicleRef,
  };
}

function computeStats(state: EngineState): SealedChamberStats {
  let sealed = 0;
  let triggered = 0;
  let opened = 0;

  for (const record of state.records.values()) {
    switch (record.state) {
      case 'SEALED': sealed += 1; break;
      case 'TRIGGERED': triggered += 1; break;
      case 'OPENED': opened += 1; break;
    }
  }

  return { sealed, triggered, opened, total: CHAMBER_DEFINITIONS.length };
}
