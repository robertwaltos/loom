/**
 * Dynasty Regent Protocol ΓÇö NPC-administered mode for inactive player dynasties.
 *
 * Bible v1.2 Continuity Window: When a player is inactive for 6+ real months,
 * their dynasty enters NPC-administered mode. A regent NPC maintains holdings,
 * files Chronicle entries, queues pending decisions, and prepares a return summary.
 *
 * The regent preserves but does not expand. It maintains dignity without ambition.
 */

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Real months of inactivity before regent activation */
export const REGENT_ACTIVATION_REAL_MONTHS = 6;

/** Regent files a Chronicle entry every N in-game days */
export const REGENT_CHRONICLE_INTERVAL_INGAME_DAYS = 10;

/** 90 in-game days of re-acclimatisation on return ΓÇö no Extinction risk */
export const RETURN_ACCLIMATISATION_INGAME_DAYS = 90;

/** After this many in-game days, old queued items expire */
export const MAX_REGENT_QUEUE_RETENTION_INGAME_DAYS = 1000;

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type RegentStatus =
  | 'NOT_ACTIVE'
  | 'MONITORING'
  | 'REGENT_ASSIGNED'
  | 'FULL_REGENT'
  | 'RETURNING';

export type RegentActivationTrigger =
  | 'INACTIVITY_6_MONTHS'
  | 'PLAYER_REQUEST'
  | 'EMERGENCY_SUCCESSION'
  | 'REAL_WORLD_DEATH';

export interface RegentProtocolState {
  readonly dynastyId: string;
  readonly status: RegentStatus;
  readonly activatedAt: number | undefined;
  readonly realWorldActivationDate: string | undefined;
  readonly regentNpcId: string;
  readonly totalKalonPreserved: bigint;
  readonly chronicleEntriesFiledByRegent: number;
  readonly queuedMessages: number;
  readonly queuedVotes: number;
  readonly queuedTradeOffers: number;
  readonly returnAcclimatisationDaysRemaining: number;
}

export interface RegentChronicleEntry {
  readonly entryId: string;
  readonly dynastyId: string;
  readonly inGameYear: number;
  readonly entryText: string;
  readonly kalonBalance: bigint;
}

export interface ReturnSummary {
  readonly dynastyId: string;
  readonly yearsAway: number;
  readonly inGameYearsAway: number;
  readonly chronicleEntries: number;
  readonly kalonPreserved: bigint;
  readonly politicalEventsQueued: number;
  readonly summaryText: string;
}

// ΓöÇΓöÇΓöÇ Pure Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Activate the regent protocol for a dynasty.
 * Transitions from any non-RETURNING status to REGENT_ASSIGNED.
 */
export function activateRegent(
  state: RegentProtocolState,
  trigger: RegentActivationTrigger,
  inGameYear: number,
  realDate: string,
): RegentProtocolState {
  const nextStatus = resolveActivationStatus(trigger);
  return {
    ...state,
    status: nextStatus,
    activatedAt: inGameYear,
    realWorldActivationDate: realDate,
  };
}

function resolveActivationStatus(trigger: RegentActivationTrigger): RegentStatus {
  if (trigger === 'REAL_WORLD_DEATH') return 'FULL_REGENT';
  if (trigger === 'EMERGENCY_SUCCESSION') return 'FULL_REGENT';
  return 'REGENT_ASSIGNED';
}

/**
 * Generate a Chronicle entry in the regent NPC's voice.
 * Formal, maintaining, never expanding the dynasty's ambitions.
 */
export function generateRegentChronicleEntry(
  dynastyId: string,
  inGameYear: number,
  kalonBalance: bigint,
): RegentChronicleEntry {
  const entryId = buildEntryId(dynastyId, inGameYear);
  const entryText = buildRegentEntryText(dynastyId, inGameYear, kalonBalance);
  return { entryId, dynastyId, inGameYear, entryText, kalonBalance };
}

function buildEntryId(dynastyId: string, inGameYear: number): string {
  return `regent-chronicle-${dynastyId}-${String(inGameYear)}`;
}

function buildRegentEntryText(dynastyId: string, inGameYear: number, kalonBalance: bigint): string {
  const balanceKalon = kalonBalance / 1_000_000n;
  return (
    `Year ${String(inGameYear)}. On behalf of dynasty ${dynastyId}, this office records ` +
    `the continued stewardship of affairs in the dynasty's absence. ` +
    `Treasury stands at ${balanceKalon.toString()} KALON. ` +
    `No obligations have been defaulted upon. ` +
    `No expansions have been undertaken. ` +
    `The dynasty's standing is preserved in accordance with the regent mandate. ` +
    `This office awaits the dynasty's return.`
  );
}

/**
 * Process a player's return ΓÇö transitions to RETURNING, sets acclimatisation window.
 */
export function processReturn(
  state: RegentProtocolState,
  _inGameYear: number,
): RegentProtocolState {
  return {
    ...state,
    status: 'RETURNING',
    activatedAt: state.activatedAt,
    returnAcclimatisationDaysRemaining: RETURN_ACCLIMATISATION_INGAME_DAYS,
  };
}

/**
 * Build the return summary shown to a player on re-entry.
 */
export function buildReturnSummary(state: RegentProtocolState, currentYear: number): ReturnSummary {
  const inGameYearsAway = computeInGameYearsAway(state, currentYear);
  const yearsAway = computeRealYearsAway(state);
  const politicalEventsQueued = state.queuedVotes + state.queuedMessages + state.queuedTradeOffers;
  const summaryText = buildSummaryText(state, yearsAway, inGameYearsAway, politicalEventsQueued);
  return {
    dynastyId: state.dynastyId,
    yearsAway,
    inGameYearsAway,
    chronicleEntries: state.chronicleEntriesFiledByRegent,
    kalonPreserved: state.totalKalonPreserved,
    politicalEventsQueued,
    summaryText,
  };
}

function computeInGameYearsAway(state: RegentProtocolState, currentYear: number): number {
  if (state.activatedAt === undefined) return 0;
  return Math.max(0, currentYear - state.activatedAt);
}

function computeRealYearsAway(state: RegentProtocolState): number {
  if (state.realWorldActivationDate === undefined) return 0;
  const activationMs = Date.parse(state.realWorldActivationDate);
  if (isNaN(activationMs)) return 0;
  const nowMs = Date.now();
  return Math.max(0, Math.floor((nowMs - activationMs) / (365.25 * 24 * 60 * 60 * 1000)));
}

function buildSummaryText(
  state: RegentProtocolState,
  yearsAway: number,
  inGameYearsAway: number,
  politicalEventsQueued: number,
): string {
  const balanceKalon = state.totalKalonPreserved / 1_000_000n;
  const yearWord = inGameYearsAway === 1 ? 'year' : 'years';
  const realWord = yearsAway === 1 ? 'year' : 'years';
  const entries = state.chronicleEntriesFiledByRegent;
  const queued = politicalEventsQueued;
  return (
    `Dynasty ${state.dynastyId} returns after ${String(yearsAway)} real ${realWord} ` +
    `(${String(inGameYearsAway)} in-game ${yearWord}). ` +
    `The regent filed ${String(entries)} Chronicle entries on your behalf. ` +
    `Treasury preserved: ${balanceKalon.toString()} KALON. ` +
    `${String(queued)} political events await your decision. ` +
    `Re-acclimatisation window active ΓÇö no Extinction risk for ${String(RETURN_ACCLIMATISATION_INGAME_DAYS)} in-game days.`
  );
}

/**
 * Build the return Chronicle entry drafted for the player to edit.
 */
export function buildReturnChronicleEntry(
  state: RegentProtocolState,
  dynastyId: string,
  year: number,
): RegentChronicleEntry {
  const entryId = `return-chronicle-${dynastyId}-${String(year)}`;
  const entryText = buildReturnEntryText(state, dynastyId, year);
  return {
    entryId,
    dynastyId,
    inGameYear: year,
    entryText,
    kalonBalance: state.totalKalonPreserved,
  };
}

function buildReturnEntryText(state: RegentProtocolState, dynastyId: string, year: number): string {
  const inGameAway = state.activatedAt !== undefined ? year - state.activatedAt : 0;
  const balance = state.totalKalonPreserved / 1_000_000n;
  return (
    `Year ${String(year)}. I, ${dynastyId}, return to the record. ` +
    `${String(inGameAway)} in-game years have passed since the regency began. ` +
    `The regent preserved ${balance.toString()} KALON and filed ` +
    `${String(state.chronicleEntriesFiledByRegent)} Chronicle entries in this dynasty's name. ` +
    `I resume full governance with gratitude to the office of the regent. ` +
    `The re-acclimatisation period is now active. ` +
    `[Edit this entry to reflect your dynasty's voice and perspective on returning.]`
  );
}

// ΓöÇΓöÇΓöÇ State Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Create an initial RegentProtocolState for a dynasty not yet under regency */
export function createRegentProtocolState(
  dynastyId: string,
  regentNpcId: string,
): RegentProtocolState {
  return {
    dynastyId,
    status: 'NOT_ACTIVE',
    activatedAt: undefined,
    realWorldActivationDate: undefined,
    regentNpcId,
    totalKalonPreserved: 0n,
    chronicleEntriesFiledByRegent: 0,
    queuedMessages: 0,
    queuedVotes: 0,
    queuedTradeOffers: 0,
    returnAcclimatisationDaysRemaining: 0,
  };
}

/** Increment regent Chronicle entries filed ΓÇö returns new state */
export function recordRegentChronicleEntry(state: RegentProtocolState): RegentProtocolState {
  return { ...state, chronicleEntriesFiledByRegent: state.chronicleEntriesFiledByRegent + 1 };
}

/** Update the KALON balance preserved by the regent */
export function updateKalonPreserved(
  state: RegentProtocolState,
  kalonBalance: bigint,
): RegentProtocolState {
  return { ...state, totalKalonPreserved: kalonBalance };
}

/** Enqueue a message awaiting player review */
export function enqueueMessage(state: RegentProtocolState): RegentProtocolState {
  return { ...state, queuedMessages: state.queuedMessages + 1 };
}

/** Enqueue a vote awaiting player decision */
export function enqueueVote(state: RegentProtocolState): RegentProtocolState {
  return { ...state, queuedVotes: state.queuedVotes + 1 };
}

/** Enqueue a trade offer awaiting player decision */
export function enqueueTradeOffer(state: RegentProtocolState): RegentProtocolState {
  return { ...state, queuedTradeOffers: state.queuedTradeOffers + 1 };
}

/** Transition to MONITORING status ΓÇö early warning before full regent activation */
export function beginMonitoring(state: RegentProtocolState): RegentProtocolState {
  return { ...state, status: 'MONITORING' };
}

/** Check if the dynasty is currently under regency */
export function isUnderRegency(state: RegentProtocolState): boolean {
  return state.status === 'REGENT_ASSIGNED' || state.status === 'FULL_REGENT';
}

/** Check if a player is within the re-acclimatisation window */
export function isInAcclimatisationWindow(state: RegentProtocolState): boolean {
  return state.status === 'RETURNING' && state.returnAcclimatisationDaysRemaining > 0;
}

/** Advance acclimatisation window by N in-game days */
export function advanceAcclimatisation(
  state: RegentProtocolState,
  days: number,
): RegentProtocolState {
  const remaining = Math.max(0, state.returnAcclimatisationDaysRemaining - days);
  const nextStatus: RegentStatus = remaining === 0 ? 'NOT_ACTIVE' : 'RETURNING';
  return { ...state, returnAcclimatisationDaysRemaining: remaining, status: nextStatus };
}
