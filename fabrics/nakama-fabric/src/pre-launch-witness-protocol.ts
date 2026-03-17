/**
 * Pre-Launch Witness Protocol ΓÇö Community registration before The Loom opens.
 *
 * This is not the Vigil Protocol (which handles real-world death cases).
 * This is the pre-launch registration mechanic that builds community before
 * launch and designates Founding Dynasties eligible for Founding MARKS.
 *
 * Bible v1.2 ┬º2: The first 18 in-game days belong to those who were
 * present from the beginning. The Witness Protocol is how we know who
 * that is.
 *
 * Registration opens 7 months before launch (2026-06-01).
 * Hard cap: 100,000 founding-eligible registrations.
 * Founding Mark eligibility: confirmed + active in first 6 real days after launch.
 */

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const LAUNCH_DATE = '2027-01-01T00:00:00Z';
export const WITNESS_PROTOCOL_OPEN_DATE = '2026-06-01T00:00:00Z';
export const MAX_FOUNDING_REGISTRATIONS = 100_000;
export const WITNESS_CONFIRMATION_WINDOW_DAYS = 7;
export const TOTAL_WITNESS_REGISTRATIONS_ESTIMATE = 500_000;
export const FOUNDING_ELIGIBILITY_REAL_DAYS = 6;

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type WitnessStatus =
  | 'REGISTERED' // Email registered, awaiting confirmation
  | 'CONFIRMED' // Email confirmed within window
  | 'FOUNDING_DYNASTY_DESIGNATED' // Confirmed + assigned founding slot
  | 'EXPIRED' // Confirmation window elapsed without confirming
  | 'LAUNCHED'; // Launch has occurred, all eligible witnesses transitioned

export interface WitnessRegistration {
  readonly witnessId: string;
  readonly registeredAt: string; // Real-world ISO date
  readonly emailHash: string; // SHA-256 of real email ΓÇö never store actual email
  readonly dynastyNameIntent?: string; // Intended dynasty name
  readonly referralSource?: string;
  readonly status: WitnessStatus;
  readonly isFoundingMarkEligible: boolean;
  readonly confirmationToken: string;
  readonly launchNotificationSent: boolean;
  readonly invitationSentAt?: string;
}

export interface WitnessRegistryState {
  readonly registrations: Record<string, WitnessRegistration>;
  readonly totalConfirmed: number;
  readonly foundingEligibleCount: number;
  readonly launchInvitationsSent: number;
}

export interface WitnessChronicleEntry {
  readonly category: 'WITNESS_PROTOCOL';
  readonly worldId: string;
  readonly subject: string;
  readonly content: string;
  readonly witnessId: string;
  readonly dynastyId: string;
  readonly inGameYear: number;
}

// ΓöÇΓöÇ Errors ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export class WitnessError extends Error {
  constructor(
    readonly code: WitnessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WitnessError';
  }
}

export type WitnessErrorCode =
  | 'REGISTRATION_CLOSED' // Before open date or after launch
  | 'EMAIL_ALREADY_REGISTERED' // emailHash already in registry
  | 'FOUNDING_CAP_REACHED' // MAX_FOUNDING_REGISTRATIONS hit
  | 'INVALID_TOKEN' // Token mismatch on confirm
  | 'ALREADY_CONFIRMED' // Already in CONFIRMED or beyond
  | 'CONFIRMATION_WINDOW_EXPIRED'; // 7-day window elapsed

// ΓöÇΓöÇ Pure: Register ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function registerWitness(
  dynastyNameIntent: string | undefined,
  emailHash: string,
  referralSource: string | undefined,
  currentDate: string,
  witnessId: string,
  confirmationToken: string,
): WitnessRegistration {
  assertRegistrationOpen(currentDate);

  return {
    witnessId,
    registeredAt: currentDate,
    emailHash,
    dynastyNameIntent,
    referralSource,
    status: 'REGISTERED',
    isFoundingMarkEligible: false,
    confirmationToken,
    launchNotificationSent: false,
  };
}

// ΓöÇΓöÇ Pure: Confirm ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function confirmWitness(
  registration: WitnessRegistration,
  token: string,
  currentDate: string,
): WitnessRegistration {
  if (
    registration.status === 'CONFIRMED' ||
    registration.status === 'FOUNDING_DYNASTY_DESIGNATED'
  ) {
    throw new WitnessError(
      'ALREADY_CONFIRMED',
      `Witness ${registration.witnessId} already confirmed`,
    );
  }
  if (registration.status === 'EXPIRED') {
    throw new WitnessError(
      'CONFIRMATION_WINDOW_EXPIRED',
      `Witness ${registration.witnessId} confirmation window has expired`,
    );
  }
  if (isConfirmationWindowExpired(registration.registeredAt, currentDate)) {
    throw new WitnessError(
      'CONFIRMATION_WINDOW_EXPIRED',
      `Witness ${registration.witnessId}: ${WITNESS_CONFIRMATION_WINDOW_DAYS}-day confirmation window elapsed`,
    );
  }
  if (registration.confirmationToken !== token) {
    throw new WitnessError(
      'INVALID_TOKEN',
      `Invalid confirmation token for witness ${registration.witnessId}`,
    );
  }

  return { ...registration, status: 'CONFIRMED' };
}

// ΓöÇΓöÇ Pure: Founding Eligibility ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function isFoundingMarkEligible(
  registration: WitnessRegistration,
  launchDate: string,
): boolean {
  if (
    registration.status !== 'CONFIRMED' &&
    registration.status !== 'FOUNDING_DYNASTY_DESIGNATED'
  ) {
    return false;
  }
  const launchMs = new Date(launchDate).getTime();
  const eligibilityWindowMs = FOUNDING_ELIGIBILITY_REAL_DAYS * 24 * 60 * 60 * 1_000;
  const windowEnd = new Date(launchMs + eligibilityWindowMs).toISOString();
  return registration.registeredAt <= windowEnd;
}

// ΓöÇΓöÇ Pure: Compute Founding Eligibles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function computeFoundingEligibles(state: WitnessRegistryState): WitnessRegistration[] {
  const confirmed = Object.values(state.registrations).filter(
    (r) => r.status === 'CONFIRMED' || r.status === 'FOUNDING_DYNASTY_DESIGNATED',
  );

  confirmed.sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));

  return confirmed.slice(0, MAX_FOUNDING_REGISTRATIONS);
}

// ΓöÇΓöÇ Pure: Build Chronicle Entry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function buildWitnessChronicleEntry(
  registration: WitnessRegistration,
  dynastyId: string,
  inGameYear: number,
): WitnessChronicleEntry {
  const nameClause = registration.dynastyNameIntent
    ? `, who intended to found the ${registration.dynastyNameIntent} dynasty,`
    : '';

  return {
    category: 'WITNESS_PROTOCOL',
    worldId: 'world-01',
    subject: `Witness ${registration.witnessId} becomes Founding Dynasty member`,
    content:
      `Witness ${registration.witnessId}${nameClause} registered their intent before the Loom opened` +
      ` and was present at the beginning. Their dynasty was among the first ${String(MAX_FOUNDING_REGISTRATIONS)}` +
      ` to take root in the new civilisation. This chronicle entry marks their transition from Witness to` +
      ` Founding Dynasty, recorded in Year ${String(inGameYear)} of the Loom's history.`,
    witnessId: registration.witnessId,
    dynastyId,
    inGameYear,
  };
}

// ΓöÇΓöÇ Registry Mutators ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function addRegistrationToState(
  state: WitnessRegistryState,
  registration: WitnessRegistration,
): WitnessRegistryState {
  return {
    ...state,
    registrations: { ...state.registrations, [registration.witnessId]: registration },
  };
}

export function updateRegistrationInState(
  state: WitnessRegistryState,
  registration: WitnessRegistration,
): WitnessRegistryState {
  const wasConfirmed =
    state.registrations[registration.witnessId]?.status !== 'CONFIRMED' &&
    state.registrations[registration.witnessId]?.status !== 'FOUNDING_DYNASTY_DESIGNATED';
  const isNowConfirmed =
    registration.status === 'CONFIRMED' || registration.status === 'FOUNDING_DYNASTY_DESIGNATED';

  const totalConfirmed =
    wasConfirmed && isNowConfirmed ? state.totalConfirmed + 1 : state.totalConfirmed;

  return {
    ...state,
    registrations: { ...state.registrations, [registration.witnessId]: registration },
    totalConfirmed,
  };
}

export function markLaunchNotificationSent(
  state: WitnessRegistryState,
  witnessId: string,
  sentAt: string,
): WitnessRegistryState {
  const registration = state.registrations[witnessId];
  if (!registration) return state;

  const updated: WitnessRegistration = {
    ...registration,
    launchNotificationSent: true,
    invitationSentAt: sentAt,
  };

  return {
    ...state,
    registrations: { ...state.registrations, [witnessId]: updated },
    launchInvitationsSent: state.launchInvitationsSent + 1,
  };
}

export function designateFoundingDynasty(
  state: WitnessRegistryState,
  witnessId: string,
): WitnessRegistryState {
  const registration = state.registrations[witnessId];
  if (!registration) {
    throw new WitnessError('INVALID_TOKEN', `Witness ${witnessId} not found`);
  }
  if (registration.status !== 'CONFIRMED') {
    throw new WitnessError(
      'INVALID_TOKEN',
      `Witness ${witnessId} must be CONFIRMED to be designated; current: ${registration.status}`,
    );
  }
  if (state.foundingEligibleCount >= MAX_FOUNDING_REGISTRATIONS) {
    throw new WitnessError(
      'FOUNDING_CAP_REACHED',
      `Founding registration cap of ${String(MAX_FOUNDING_REGISTRATIONS)} reached`,
    );
  }

  const updated: WitnessRegistration = {
    ...registration,
    status: 'FOUNDING_DYNASTY_DESIGNATED',
    isFoundingMarkEligible: true,
  };

  return {
    ...state,
    registrations: { ...state.registrations, [witnessId]: updated },
    foundingEligibleCount: state.foundingEligibleCount + 1,
  };
}

export function createEmptyWitnessRegistryState(): WitnessRegistryState {
  return {
    registrations: {},
    totalConfirmed: 0,
    foundingEligibleCount: 0,
    launchInvitationsSent: 0,
  };
}

// ΓöÇΓöÇ Internal Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function assertRegistrationOpen(currentDate: string): void {
  if (currentDate < WITNESS_PROTOCOL_OPEN_DATE) {
    throw new WitnessError(
      'REGISTRATION_CLOSED',
      `Witness registration opens ${WITNESS_PROTOCOL_OPEN_DATE}; current date: ${currentDate}`,
    );
  }
  if (currentDate >= LAUNCH_DATE) {
    throw new WitnessError(
      'REGISTRATION_CLOSED',
      `Witness registration closed at launch (${LAUNCH_DATE})`,
    );
  }
}

function isConfirmationWindowExpired(registeredAt: string, currentDate: string): boolean {
  const registeredMs = new Date(registeredAt).getTime();
  const currentMs = new Date(currentDate).getTime();
  const windowMs = WITNESS_CONFIRMATION_WINDOW_DAYS * 24 * 60 * 60 * 1_000;
  return currentMs - registeredMs > windowMs;
}
