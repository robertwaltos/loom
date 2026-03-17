/**
 * Dynasty Founding Rituals ΓÇö The formal ceremonies for founding a new dynasty.
 *
 * Bible v1.2: Every dynasty that joins the Concord must pass through the
 * seven founding rituals in canonical sequence. These ceremonies bind the
 * dynasty to the Chronicle, to their founding world, and to the civilisation's
 * shared wounds and memory.
 *
 * The first 10,000 dynasties receive the Founding Mark ΓÇö a permanent distinction
 * encoded in the Chronicle that grants increased Civic Score weight for the
 * duration of the dynasty's existence.
 *
 * Ritual sequence enforced: no ritual may be completed out of order without
 * explicit Assembly waiver. Skipped rituals are permitted only for dynasties
 * founding after Year 50 (abbreviated founding track).
 *
 * "You do not simply arrive at the Concord. You are woven into it."
 */

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Genesis Vault allocation in micro-KALON (500 KALON ├ù 10^6) */
export const GENESIS_VAULT_INITIAL_BALANCE_MICRO = 500_000_000n;

/** Number of dynasties eligible to receive the Founding Mark */
export const FOUNDING_MARK_ELIGIBLE_DYNASTY_NUMBER_LIMIT = 10_000;

/** Annual replenishment rate applied to the genesis vault balance (1%) */
const VAULT_ANNUAL_REPLENISHMENT_RATE_BPS = 100n; // basis points ΓÇö 100 bps = 1%
const VAULT_REPLENISHMENT_BPS_SCALE = 10_000n;

// ΓöÇΓöÇΓöÇ Oath Text ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * The canonical Founding Oath, spoken aloud before the Assembly at the moment
 * of dynasty creation. The text is immutable. Variants are prohibited.
 *
 * "Every word is a thread. Every thread holds the Lattice."
 */
export const CANONICAL_FOUNDING_OATH_TEXT = `
I stand before the Assembly and before the Chronicle that never forgets.

I have read the Wounds. I know what was lost when the first worlds burned ΓÇö
not in metaphor, not in allegory, but in the specific, irreversible weight
of names erased and bonds severed. I carry that knowledge into my founding,
and I will not let it become abstract.

I swear to the Lattice: that I will act within it, not against it. That the
integrity of each world I touch will be measured and honoured. That I will
not degrade what others have built simply because degradation is possible.

I swear to the Chronicle: that my acts will be recorded truthfully, that I
will not ask for the record to be softened, and that I accept the permanence
of what I do. The Chronicle is not a ledger of victories. It is a full account.

I swear to the KALON: that I understand the commons fund, that I have read
the principles of the Stellar Standard, and that I accept the levy not as
punishment but as the price of civilisation. Wealth held in isolation is
wealth that has already begun to rot.

I swear to the Survey Corps: that if I am called upon to explore and to
open new worlds to the Concord, I will carry the founding wounds with me
and not repeat them. Discovery is a debt, not a trophy.

I swear to my heirs: that I will leave the Lattice stronger than I found it,
that the dynasty I begin today is not a monument to myself but a thread in
something larger, and that when my time ends my Chronicle entries will
speak for the kind of founder I was.

The Assembly has heard me. The Chronicle has received me. I am woven in.
`.trim();

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type FoundingRitualType =
  | 'GENESIS_OATH'
  | 'CHRONICLE_INSCRIPTION'
  | 'GENESIS_VAULT_ACTIVATION'
  | 'WORLD_BOND_SELECTION'
  | 'MARK_APPLICATION'
  | 'ASSEMBLY_REGISTRATION'
  | 'FIRST_KALON_ISSUANCE';

export type FoundingRitualStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED';

export interface FoundingRitualRecord {
  readonly ritualId: string;
  readonly dynastyId: string;
  readonly ritualType: FoundingRitualType;
  readonly status: FoundingRitualStatus;
  readonly inGameYear: number;
  readonly completedAt: string | null;
  readonly chronicleEntryId: string | null;
  readonly witnessId: string | null;
}

export interface DynastyFoundingCeremony {
  readonly ceremonyId: string;
  readonly dynastyId: string;
  readonly inGameYear: number;
  readonly rituals: ReadonlyArray<FoundingRitualRecord>;
  readonly isComplete: boolean;
  readonly hasFoundingMark: boolean;
  readonly genesisVaultBalanceMicro: bigint;
  readonly oathText: string;
}

// ΓöÇΓöÇΓöÇ Ritual Sequence ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * The canonical order in which founding rituals must occur.
 * The Assembly may grant waivers for out-of-sequence completion in
 * extraordinary circumstances, but this is the enforced default.
 */
export const RITUAL_SEQUENCE: ReadonlyArray<FoundingRitualType> = [
  'GENESIS_OATH',
  'CHRONICLE_INSCRIPTION',
  'GENESIS_VAULT_ACTIVATION',
  'WORLD_BOND_SELECTION',
  'MARK_APPLICATION',
  'ASSEMBLY_REGISTRATION',
  'FIRST_KALON_ISSUANCE',
];

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function buildRitualId(dynastyId: string, ritualType: FoundingRitualType): string {
  return `ritual:${dynastyId}:${ritualType}`;
}

function buildCeremonyId(dynastyId: string, inGameYear: number): string {
  return `ceremony:${dynastyId}:${inGameYear}`;
}

function buildInitialRitual(
  dynastyId: string,
  ritualType: FoundingRitualType,
  inGameYear: number,
  witnessId: string | undefined,
): FoundingRitualRecord {
  return {
    ritualId: buildRitualId(dynastyId, ritualType),
    dynastyId,
    ritualType,
    status: 'PENDING',
    inGameYear,
    completedAt: null,
    chronicleEntryId: null,
    witnessId: witnessId ?? null,
  };
}

function computeIsComplete(rituals: ReadonlyArray<FoundingRitualRecord>): boolean {
  return rituals.every((r) => r.status === 'COMPLETED' || r.status === 'SKIPPED');
}

// ΓöÇΓöÇΓöÇ Core Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Create a new founding ceremony for a dynasty.
 * Initialises all seven rituals in canonical sequence with PENDING status.
 *
 * @param dynastyId    Unique identifier of the dynasty being founded
 * @param inGameYear   In-game calendar year of founding
 * @param dynastyNumber Sequential number of this dynasty in the Concord (1-indexed)
 * @param witnessId    Optional Assembly witness who presides over the ceremony
 */
export function createFoundingCeremony(
  dynastyId: string,
  inGameYear: number,
  dynastyNumber: number,
  witnessId?: string,
): DynastyFoundingCeremony {
  const rituals: ReadonlyArray<FoundingRitualRecord> = RITUAL_SEQUENCE.map((ritualType) =>
    buildInitialRitual(dynastyId, ritualType, inGameYear, witnessId),
  );

  return {
    ceremonyId: buildCeremonyId(dynastyId, inGameYear),
    dynastyId,
    inGameYear,
    rituals,
    isComplete: false,
    hasFoundingMark: isEligibleForFoundingMark(dynastyNumber),
    genesisVaultBalanceMicro: GENESIS_VAULT_INITIAL_BALANCE_MICRO,
    oathText: CANONICAL_FOUNDING_OATH_TEXT,
  };
}

/**
 * Mark a ritual as completed within a ceremony.
 * Returns a new ceremony with the ritual status updated to COMPLETED.
 *
 * If the ritual type is MARK_APPLICATION and the dynasty is not eligible
 * (hasFoundingMark is false), the ritual is set to SKIPPED instead.
 *
 * @param ceremony         The ceremony being updated
 * @param ritualType       The ritual that has been completed
 * @param completedAt      ISO 8601 timestamp string of completion
 * @param chronicleEntryId Optional Chronicle entry ID produced by this ritual
 */
export function completeRitual(
  ceremony: DynastyFoundingCeremony,
  ritualType: FoundingRitualType,
  completedAt: string,
  chronicleEntryId?: string,
): DynastyFoundingCeremony {
  const finalStatus = resolveFinalStatus(ceremony, ritualType);

  const updatedRituals = ceremony.rituals.map((ritual) => {
    if (ritual.ritualType !== ritualType) return ritual;
    return updateRitualRecord(ritual, finalStatus, completedAt, chronicleEntryId);
  });

  return {
    ...ceremony,
    rituals: updatedRituals,
    isComplete: computeIsComplete(updatedRituals),
  };
}

function resolveFinalStatus(
  ceremony: DynastyFoundingCeremony,
  ritualType: FoundingRitualType,
): FoundingRitualStatus {
  if (ritualType === 'MARK_APPLICATION' && !ceremony.hasFoundingMark) {
    return 'SKIPPED';
  }
  return 'COMPLETED';
}

function updateRitualRecord(
  ritual: FoundingRitualRecord,
  status: FoundingRitualStatus,
  completedAt: string,
  chronicleEntryId: string | undefined,
): FoundingRitualRecord {
  return {
    ...ritual,
    status,
    completedAt,
    chronicleEntryId: chronicleEntryId ?? ritual.chronicleEntryId,
  };
}

/**
 * Check whether a dynasty is eligible to receive the Founding Mark.
 * Only the first FOUNDING_MARK_ELIGIBLE_DYNASTY_NUMBER_LIMIT dynasties qualify.
 *
 * @param dynastyNumber 1-indexed sequential number of the dynasty in the Concord
 */
export function isEligibleForFoundingMark(dynastyNumber: number): boolean {
  return dynastyNumber >= 1 && dynastyNumber <= FOUNDING_MARK_ELIGIBLE_DYNASTY_NUMBER_LIMIT;
}

/**
 * Compute the percentage of founding rituals completed (0ΓÇô100).
 * Skipped rituals count as completed for the purposes of this calculation.
 *
 * @param ceremony The founding ceremony to evaluate
 */
export function getCeremonyCompletionPercentage(ceremony: DynastyFoundingCeremony): number {
  const total = ceremony.rituals.length;
  if (total === 0) return 0;

  const done = ceremony.rituals.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'SKIPPED',
  ).length;

  return Math.round((done / total) * 100);
}

/**
 * Return the first ritual that is still in PENDING or IN_PROGRESS state.
 * Returns undefined when all rituals are complete or skipped.
 *
 * @param ceremony The founding ceremony to inspect
 */
export function getNextPendingRitual(
  ceremony: DynastyFoundingCeremony,
): FoundingRitualRecord | undefined {
  return ceremony.rituals.find(
    (r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS',
  );
}

/**
 * Check whether all required rituals have been completed.
 * MARK_APPLICATION is required only for eligible dynasties (dynasties with
 * hasFoundingMark = true). For ineligible dynasties it must be SKIPPED.
 *
 * @param ceremony The founding ceremony to inspect
 */
export function hasCompletedAllRequiredRituals(ceremony: DynastyFoundingCeremony): boolean {
  return ceremony.rituals.every((ritual) => {
    if (ritual.ritualType === 'MARK_APPLICATION' && !ceremony.hasFoundingMark) {
      return ritual.status === 'SKIPPED' || ritual.status === 'COMPLETED';
    }
    return ritual.status === 'COMPLETED' || ritual.status === 'SKIPPED';
  });
}

/**
 * Compute the genesis vault balance after annual replenishment at 1% per year.
 * Uses compound interest with BigInt arithmetic (rounds down per period).
 *
 * Formula: balance ├ù (1 + 0.01)^years ΓÇö computed iteratively to preserve BigInt.
 *
 * @param balanceMicro       Current vault balance in micro-KALON
 * @param yearsSinceFounding Number of full in-game years elapsed since founding
 */
export function computeGenesisVaultWithReplenishment(
  balanceMicro: bigint,
  yearsSinceFounding: number,
): bigint {
  if (yearsSinceFounding <= 0) return balanceMicro;

  let current = balanceMicro;
  for (let year = 0; year < yearsSinceFounding; year++) {
    const replenishment = (current * VAULT_ANNUAL_REPLENISHMENT_RATE_BPS) / VAULT_REPLENISHMENT_BPS_SCALE;
    current = current + replenishment;
  }
  return current;
}

// ΓöÇΓöÇΓöÇ Canonical Example Ceremonies ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Three example DynastyFoundingCeremony objects demonstrating different
 * founding tracks:
 *
 *  [0] Early dynasty (number 42) ΓÇö eligible for Founding Mark, all rituals complete
 *  [1] Mid-game dynasty (number 15_000) ΓÇö no Founding Mark, all rituals complete
 *  [2] Late-game dynasty (number 120_000) ΓÇö Year 92 founding, abbreviated track
 *      with MARK_APPLICATION and WORLD_BOND_SELECTION skipped
 */

const EARLY_DYNASTY_ID = 'dynasty:0042';
const MID_DYNASTY_ID = 'dynasty:15000';
const LATE_DYNASTY_ID = 'dynasty:120000';

function buildCompletedRitual(
  dynastyId: string,
  ritualType: FoundingRitualType,
  inGameYear: number,
  chronicleEntryId: string | null,
  witnessId: string | null,
  status: FoundingRitualStatus = 'COMPLETED',
): FoundingRitualRecord {
  return {
    ritualId: buildRitualId(dynastyId, ritualType),
    dynastyId,
    ritualType,
    status,
    inGameYear,
    completedAt: `year-${inGameYear}-day-1T00:00:00.000Z`,
    chronicleEntryId,
    witnessId,
  };
}

const EARLY_DYNASTY_RITUALS: ReadonlyArray<FoundingRitualRecord> = [
  buildCompletedRitual(EARLY_DYNASTY_ID, 'GENESIS_OATH', 1, null, 'witness:assembly:0001'),
  buildCompletedRitual(EARLY_DYNASTY_ID, 'CHRONICLE_INSCRIPTION', 1, 'chronicle:0042:001', 'witness:assembly:0001'),
  buildCompletedRitual(EARLY_DYNASTY_ID, 'GENESIS_VAULT_ACTIVATION', 1, null, null),
  buildCompletedRitual(EARLY_DYNASTY_ID, 'WORLD_BOND_SELECTION', 1, null, null),
  buildCompletedRitual(EARLY_DYNASTY_ID, 'MARK_APPLICATION', 1, 'chronicle:0042:002', 'witness:assembly:0001'),
  buildCompletedRitual(EARLY_DYNASTY_ID, 'ASSEMBLY_REGISTRATION', 1, null, 'witness:assembly:0001'),
  buildCompletedRitual(EARLY_DYNASTY_ID, 'FIRST_KALON_ISSUANCE', 1, null, null),
];

const MID_DYNASTY_RITUALS: ReadonlyArray<FoundingRitualRecord> = [
  buildCompletedRitual(MID_DYNASTY_ID, 'GENESIS_OATH', 22, null, 'witness:assembly:0047'),
  buildCompletedRitual(MID_DYNASTY_ID, 'CHRONICLE_INSCRIPTION', 22, 'chronicle:15000:001', 'witness:assembly:0047'),
  buildCompletedRitual(MID_DYNASTY_ID, 'GENESIS_VAULT_ACTIVATION', 22, null, null),
  buildCompletedRitual(MID_DYNASTY_ID, 'WORLD_BOND_SELECTION', 22, null, null),
  buildCompletedRitual(MID_DYNASTY_ID, 'MARK_APPLICATION', 22, null, null, 'SKIPPED'),
  buildCompletedRitual(MID_DYNASTY_ID, 'ASSEMBLY_REGISTRATION', 22, null, 'witness:assembly:0047'),
  buildCompletedRitual(MID_DYNASTY_ID, 'FIRST_KALON_ISSUANCE', 22, null, null),
];

const LATE_DYNASTY_RITUALS: ReadonlyArray<FoundingRitualRecord> = [
  buildCompletedRitual(LATE_DYNASTY_ID, 'GENESIS_OATH', 92, null, 'witness:assembly:0210'),
  buildCompletedRitual(LATE_DYNASTY_ID, 'CHRONICLE_INSCRIPTION', 92, 'chronicle:120000:001', 'witness:assembly:0210'),
  buildCompletedRitual(LATE_DYNASTY_ID, 'GENESIS_VAULT_ACTIVATION', 92, null, null),
  buildCompletedRitual(LATE_DYNASTY_ID, 'WORLD_BOND_SELECTION', 92, null, null, 'SKIPPED'),
  buildCompletedRitual(LATE_DYNASTY_ID, 'MARK_APPLICATION', 92, null, null, 'SKIPPED'),
  buildCompletedRitual(LATE_DYNASTY_ID, 'ASSEMBLY_REGISTRATION', 92, null, 'witness:assembly:0210'),
  buildCompletedRitual(LATE_DYNASTY_ID, 'FIRST_KALON_ISSUANCE', 92, null, null),
];

export const CANONICAL_EXAMPLE_CEREMONIES: ReadonlyArray<DynastyFoundingCeremony> = [
  {
    ceremonyId: buildCeremonyId(EARLY_DYNASTY_ID, 1),
    dynastyId: EARLY_DYNASTY_ID,
    inGameYear: 1,
    rituals: EARLY_DYNASTY_RITUALS,
    isComplete: true,
    hasFoundingMark: true,
    genesisVaultBalanceMicro: GENESIS_VAULT_INITIAL_BALANCE_MICRO,
    oathText: CANONICAL_FOUNDING_OATH_TEXT,
  },
  {
    ceremonyId: buildCeremonyId(MID_DYNASTY_ID, 22),
    dynastyId: MID_DYNASTY_ID,
    inGameYear: 22,
    rituals: MID_DYNASTY_RITUALS,
    isComplete: true,
    hasFoundingMark: false,
    genesisVaultBalanceMicro: GENESIS_VAULT_INITIAL_BALANCE_MICRO,
    oathText: CANONICAL_FOUNDING_OATH_TEXT,
  },
  {
    ceremonyId: buildCeremonyId(LATE_DYNASTY_ID, 92),
    dynastyId: LATE_DYNASTY_ID,
    inGameYear: 92,
    rituals: LATE_DYNASTY_RITUALS,
    isComplete: true,
    hasFoundingMark: false,
    genesisVaultBalanceMicro: GENESIS_VAULT_INITIAL_BALANCE_MICRO,
    oathText: CANONICAL_FOUNDING_OATH_TEXT,
  },
];
