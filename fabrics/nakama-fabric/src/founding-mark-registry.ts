/**
 * Founding Mark Registry ΓÇö Special MARK for dynasties present in the first 6 real days.
 *
 * Bible v1.3: The Founding Mark is awarded to dynasties active in the first 18 in-game
 * days (6 real days) of the Concord. These players were there before the first Assembly
 * vote. Before the first month. The Chronicle was new and so were they.
 *
 * MARKS are permanently non-transferable. This registry decides eligibility and records
 * awards before the on-chain transaction.
 */

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Number of L2 blocks in the founding window (~6 real days on most L2s) */
export const FOUNDING_MARK_WINDOW_BLOCKS = 43_200;

/** Approximate real days of the founding window */
export const FOUNDING_MARK_REAL_DAYS = 6;

/** Founding window in in-game days (6 real ├ù 3 compression ratio) */
export const FOUNDING_MARK_INGAME_DAYS = 18;

/** Estimated number of dynasties eligible in the founding window */
export const ESTIMATED_FOUNDING_MARK_HOLDERS = 10_000;

/** Narrative significance of the Founding Mark */
export const FOUNDING_MARK_NARRATIVE =
  'Present at the first 18 in-game days of civilisation. Before the first month. ' +
  'Before the first Assembly vote. The Chronicle was new and so were they.';

/** Launch date of the Concord (ISO 8601) */
export const LAUNCH_DATE = '2027-01-01T00:00:00Z';

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type FoundingMarkStatus = 'WINDOW_OPEN' | 'WINDOW_CLOSED' | 'AWARDED' | 'NOT_ELIGIBLE';

export interface FoundingMarkRecord {
  readonly dynastyId: string;
  readonly status: FoundingMarkStatus;
  readonly awardedAt: string | undefined;
  readonly inGameDayAtAward: number | undefined;
  readonly blockHeightAtAward: number | undefined;
  readonly isTransferable: false;
  readonly narrativeSignificance: string;
}

export interface FoundingMarkChronicleEntry {
  readonly entryId: string;
  readonly dynastyId: string;
  readonly inGameDay: number;
  readonly chronicleText: string;
}

// ΓöÇΓöÇΓöÇ Window Check ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns true if the current block height is within the founding mark window.
 */
export function isFoundingMarkWindowOpen(
  currentBlockHeight: number,
  launchBlockHeight: number,
): boolean {
  const elapsed = currentBlockHeight - launchBlockHeight;
  return elapsed >= 0 && elapsed < FOUNDING_MARK_WINDOW_BLOCKS;
}

// ΓöÇΓöÇΓöÇ Eligibility Validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Validates whether a dynasty joined within the founding window.
 * Compares joinedAt timestamp to the launch date, allowing up to 6 real days.
 */
export function validateFoundingMarkEligibility(
  dynastyId: string,
  joinedAt: string,
  launchDate: string,
): boolean {
  if (dynastyId.trim().length === 0) return false;
  const joinMs = Date.parse(joinedAt);
  const launchMs = Date.parse(launchDate);
  if (isNaN(joinMs) || isNaN(launchMs)) return false;
  const windowMs = FOUNDING_MARK_REAL_DAYS * 24 * 60 * 60 * 1000;
  const elapsed = joinMs - launchMs;
  return elapsed >= 0 && elapsed < windowMs;
}

// ΓöÇΓöÇΓöÇ Award ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Award the Founding Mark to a dynasty.
 * Caller must have validated eligibility before calling this function.
 */
export function awardFoundingMark(
  dynastyId: string,
  blockHeight: number,
  launchBlockHeight: number,
  currentRealDate: string,
): FoundingMarkRecord {
  const blocksElapsed = blockHeight - launchBlockHeight;
  const inGameDay = computeInGameDay(blocksElapsed);
  return {
    dynastyId,
    status: 'AWARDED',
    awardedAt: currentRealDate,
    inGameDayAtAward: inGameDay,
    blockHeightAtAward: blockHeight,
    isTransferable: false,
    narrativeSignificance: FOUNDING_MARK_NARRATIVE,
  };
}

function computeInGameDay(blocksElapsed: number): number {
  const blocksPerDay = FOUNDING_MARK_WINDOW_BLOCKS / FOUNDING_MARK_INGAME_DAYS;
  return Math.floor(blocksElapsed / blocksPerDay) + 1;
}

// ΓöÇΓöÇΓöÇ Not-Eligible Record ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Create a record for a dynasty that missed the founding window */
export function buildNotEligibleRecord(dynastyId: string): FoundingMarkRecord {
  return {
    dynastyId,
    status: 'NOT_ELIGIBLE',
    awardedAt: undefined,
    inGameDayAtAward: undefined,
    blockHeightAtAward: undefined,
    isTransferable: false,
    narrativeSignificance: FOUNDING_MARK_NARRATIVE,
  };
}

/** Create a record indicating the window is still open */
export function buildWindowOpenRecord(dynastyId: string): FoundingMarkRecord {
  return {
    dynastyId,
    status: 'WINDOW_OPEN',
    awardedAt: undefined,
    inGameDayAtAward: undefined,
    blockHeightAtAward: undefined,
    isTransferable: false,
    narrativeSignificance: FOUNDING_MARK_NARRATIVE,
  };
}

/** Create a record indicating the window has closed without award */
export function buildWindowClosedRecord(dynastyId: string): FoundingMarkRecord {
  return {
    dynastyId,
    status: 'WINDOW_CLOSED',
    awardedAt: undefined,
    inGameDayAtAward: undefined,
    blockHeightAtAward: undefined,
    isTransferable: false,
    narrativeSignificance: FOUNDING_MARK_NARRATIVE,
  };
}

// ΓöÇΓöÇΓöÇ Chronicle Entry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Build a Chronicle entry recording the founding mark award.
 * The entry is 200+ words ΓÇö a formal account of being present at the founding.
 */
export function buildFoundingMarkChronicleEntry(
  record: FoundingMarkRecord,
): FoundingMarkChronicleEntry {
  if (record.status !== 'AWARDED' || record.inGameDayAtAward === undefined) {
    return buildIneligibleChronicleEntry(record);
  }
  const entryId = `founding-mark-${record.dynastyId}-day-${String(record.inGameDayAtAward)}`;
  const chronicleText = buildFoundingChronicleText(record);
  return {
    entryId,
    dynastyId: record.dynastyId,
    inGameDay: record.inGameDayAtAward,
    chronicleText,
  };
}

function buildIneligibleChronicleEntry(record: FoundingMarkRecord): FoundingMarkChronicleEntry {
  return {
    entryId: `founding-mark-ineligible-${record.dynastyId}`,
    dynastyId: record.dynastyId,
    inGameDay: 0,
    chronicleText: `Dynasty ${record.dynastyId} was not present at the founding of the Concord.`,
  };
}

function buildFoundingChronicleText(record: FoundingMarkRecord): string {
  const day = record.inGameDayAtAward ?? 1;
  const block = record.blockHeightAtAward ?? 0;
  const awardedAt = record.awardedAt ?? LAUNCH_DATE;
  return buildChronicleNarrative(record.dynastyId, day, block, awardedAt);
}

function buildChronicleNarrative(
  dynastyId: string,
  day: number,
  block: number,
  awardedAt: string,
): string {
  return (
    `Year One, Day ${String(day)}. This is the founding record of dynasty ${dynastyId}, ` +
    `inscribed in the Chronicle at block ${String(block)} of the Concord. ` +
    `We were here. We arrived before the first month had turned, before the first Assembly ` +
    `convened to cast a vote on behalf of the civilisation, before any faction had yet risen ` +
    `to contest the shape of what the Concord would become. ` +
    `\n\n` +
    `On this day ΓÇö Day ${String(day)} of the first 18 in-game days ΓÇö the Founding Mark was ` +
    `awarded to this dynasty. It is permanent and non-transferable. No other dynasty can hold ` +
    `this mark on our behalf, and we cannot pass it to another. It is ours, and it is the record ` +
    `of our presence at the beginning. ` +
    `\n\n` +
    `The Chronicle was new. The KALON economy had just awakened. The first worlds were being ` +
    `surveyed. The Ascendancy had not yet made its first interference. The Survey Corps had not ` +
    `yet filed their first report. Governance existed in its most nascent form ΓÇö a set of ` +
    `principles waiting to be tested by the weight of real decisions. ` +
    `\n\n` +
    `We were there at ${awardedAt}. Let the record show it. ` +
    `Let future generations who read these entries know that this dynasty stood at the beginning, ` +
    `and that the Founding Mark on our record is not merely a badge ΓÇö it is a timestamp, ` +
    `a Chronicle entry that pre-dates most of what the Concord has become. ` +
    `We carry the weight of that presence. We honour it by continuing.`
  );
}

// ΓöÇΓöÇΓöÇ Registry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface FoundingMarkRegistry {
  /** Award or look up the founding mark for a dynasty */
  awardIfEligible(
    dynastyId: string,
    joinedAt: string,
    blockHeight: number,
    launchBlockHeight: number,
    currentRealDate: string,
  ): FoundingMarkRecord;
  /** Get a dynasty's current founding mark record, if any */
  getRecord(dynastyId: string): FoundingMarkRecord | undefined;
  /** Count total awarded marks */
  totalAwarded(): number;
  /** List all awarded records */
  listAwarded(): ReadonlyArray<FoundingMarkRecord>;
  /** Check if the founding window is still open */
  isWindowOpen(currentBlockHeight: number, launchBlockHeight: number): boolean;
}

interface RegistryState {
  readonly records: Map<string, FoundingMarkRecord>;
}

export function createFoundingMarkRegistry(): FoundingMarkRegistry {
  const state: RegistryState = { records: new Map() };

  return {
    awardIfEligible: (dynastyId, joinedAt, blockHeight, launchBlockHeight, currentRealDate) =>
      awardIfEligibleImpl(
        state,
        dynastyId,
        joinedAt,
        blockHeight,
        launchBlockHeight,
        currentRealDate,
      ),
    getRecord: (dynastyId) => state.records.get(dynastyId),
    totalAwarded: () => countAwarded(state),
    listAwarded: () => listAwardedImpl(state),
    isWindowOpen: (current, launch) => isFoundingMarkWindowOpen(current, launch),
  };
}

function awardIfEligibleImpl(
  state: RegistryState,
  dynastyId: string,
  joinedAt: string,
  blockHeight: number,
  launchBlockHeight: number,
  currentRealDate: string,
): FoundingMarkRecord {
  const existing = state.records.get(dynastyId);
  if (existing !== undefined) return existing;

  const eligible = validateFoundingMarkEligibility(dynastyId, joinedAt, LAUNCH_DATE);
  const windowOpen = isFoundingMarkWindowOpen(blockHeight, launchBlockHeight);

  const record = resolveRecord(
    dynastyId,
    eligible,
    windowOpen,
    blockHeight,
    launchBlockHeight,
    currentRealDate,
  );
  state.records.set(dynastyId, record);
  return record;
}

function resolveRecord(
  dynastyId: string,
  eligible: boolean,
  windowOpen: boolean,
  blockHeight: number,
  launchBlockHeight: number,
  currentRealDate: string,
): FoundingMarkRecord {
  if (!eligible) return buildNotEligibleRecord(dynastyId);
  if (!windowOpen) return buildWindowClosedRecord(dynastyId);
  return awardFoundingMark(dynastyId, blockHeight, launchBlockHeight, currentRealDate);
}

function countAwarded(state: RegistryState): number {
  let count = 0;
  for (const record of state.records.values()) {
    if (record.status === 'AWARDED') count++;
  }
  return count;
}

function listAwardedImpl(state: RegistryState): ReadonlyArray<FoundingMarkRecord> {
  const result: FoundingMarkRecord[] = [];
  for (const record of state.records.values()) {
    if (record.status === 'AWARDED') result.push(record);
  }
  return result;
}
