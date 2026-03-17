/**
 * First Contact Protocol ΓÇö Rarest mark in The Concord.
 *
 * Bible v1.2: When a dynasty is first to establish verifiable contact
 * with an indigenous intelligent species on a newly surveyed world,
 * they may claim the FIRST_CONTACT mark. Only one mark can exist per
 * world. The dynasty must file a 500-word Chronicle entry documenting
 * what they found and how contact was made.
 *
 * Non-transferable. Survey Corps has 30 in-game days to verify.
 */

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Minimum words (characters as proxy) required in a Chronicle entry. */
export const FIRST_CONTACT_CHRONICLE_MIN_LENGTH = 500;

/** Survey Corps review window in in-game days. */
export const CONTACT_VERIFICATION_WINDOW_DAYS = 30;

/** Minimum characters allowed in a contact description field. */
const CONTACT_DESCRIPTION_MIN_CHARS = 10;

/** Maximum characters allowed in a contact description field. */
const CONTACT_DESCRIPTION_MAX_CHARS = 2000;

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ContactVerificationStatus =
  | 'UNVERIFIED'
  | 'SURVEY_CORPS_REVIEW'
  | 'VERIFIED'
  | 'CONTESTED'
  | 'REJECTED';

export interface FirstContactClaim {
  readonly claimId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly claimedAtMs: number;
  readonly contactDescription: string;
  readonly chronicleEntryId: string | null;
  readonly status: ContactVerificationStatus;
  readonly markAwardedAtMs: number | null;
  readonly verificationNotes: string | null;
}

// ΓöÇΓöÇΓöÇ Errors ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type FirstContactErrorCode =
  | 'DESCRIPTION_TOO_SHORT'
  | 'DESCRIPTION_TOO_LONG'
  | 'CHRONICLE_ENTRY_TOO_SHORT'
  | 'INVALID_STATUS_TRANSITION';

export class FirstContactError extends Error {
  constructor(
    readonly code: FirstContactErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FirstContactError';
  }
}

// ΓöÇΓöÇΓöÇ Indigenous Species Register ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Canonical register of worlds with documented indigenous species.
 * Maintained by the Survey Corps ΓÇö additions require Assembly vote.
 */
export const INDIGENOUS_SPECIES_REGISTER: ReadonlyMap<string, string> = new Map([
  ['world-014', 'The Bone Chorus ΓÇö Indigenous Acoustic Intelligences (Frequency: 3.14 kHz)'],
  ['world-019', 'The Watcher ΓÇö Deep Space Monitoring Array (status: artificial origin disputed)'],
  [
    'world-088',
    'World 88 ΓÇö Subterranean Network Intelligence (status: contested, Survey Corps ongoing)',
  ],
  ['world-247', 'World 247 ΓÇö Classified (Vael Annexe pending declassification)'],
  ['world-412', 'World 412 ΓÇö Historical Account (see Chronicle Entry 10,000)'],
]);

export function getSpeciesInfoForWorld(worldId: string): string | null {
  return INDIGENOUS_SPECIES_REGISTER.get(worldId) ?? null;
}

// ΓöÇΓöÇΓöÇ Claim Lifecycle ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function generateClaimId(dynastyId: string, worldId: string, nowMs: number): string {
  return `fc-${dynastyId}-${worldId}-${nowMs}`;
}

function validateDescriptionLength(description: string): void {
  if (description.length < CONTACT_DESCRIPTION_MIN_CHARS) {
    throw new FirstContactError(
      'DESCRIPTION_TOO_SHORT',
      `Contact description must be at least ${CONTACT_DESCRIPTION_MIN_CHARS} characters.`,
    );
  }
  if (description.length > CONTACT_DESCRIPTION_MAX_CHARS) {
    throw new FirstContactError(
      'DESCRIPTION_TOO_LONG',
      `Contact description must not exceed ${CONTACT_DESCRIPTION_MAX_CHARS} characters.`,
    );
  }
}

export function createFirstContactClaim(
  dynastyId: string,
  worldId: string,
  contactDescription: string,
  nowMs: number,
): FirstContactClaim {
  validateDescriptionLength(contactDescription);

  return {
    claimId: generateClaimId(dynastyId, worldId, nowMs),
    dynastyId,
    worldId,
    claimedAtMs: nowMs,
    contactDescription,
    chronicleEntryId: null,
    status: 'UNVERIFIED',
    markAwardedAtMs: null,
    verificationNotes: null,
  };
}

export function linkChronicleEntry(
  claim: FirstContactClaim,
  chronicleEntryId: string,
  entryWordCount: number,
): FirstContactClaim {
  if (entryWordCount < FIRST_CONTACT_CHRONICLE_MIN_LENGTH) {
    throw new FirstContactError(
      'CHRONICLE_ENTRY_TOO_SHORT',
      `Chronicle entry must be at least ${FIRST_CONTACT_CHRONICLE_MIN_LENGTH} words. Got ${entryWordCount}.`,
    );
  }

  return {
    ...claim,
    chronicleEntryId,
    status: 'SURVEY_CORPS_REVIEW',
  };
}

export function verifyClaim(
  claim: FirstContactClaim,
  notes: string,
  nowMs: number,
): FirstContactClaim {
  if (claim.status !== 'SURVEY_CORPS_REVIEW') {
    throw new FirstContactError(
      'INVALID_STATUS_TRANSITION',
      `Cannot verify claim in status '${claim.status}'. Must be SURVEY_CORPS_REVIEW.`,
    );
  }

  return {
    ...claim,
    status: 'VERIFIED',
    verificationNotes: notes,
    markAwardedAtMs: nowMs,
  };
}

export function contestClaim(
  claim: FirstContactClaim,
  contestingDynastyId: string,
  notes: string,
): FirstContactClaim {
  if (claim.status !== 'SURVEY_CORPS_REVIEW') {
    throw new FirstContactError(
      'INVALID_STATUS_TRANSITION',
      `Cannot contest claim in status '${claim.status}'. Must be SURVEY_CORPS_REVIEW.`,
    );
  }

  return {
    ...claim,
    status: 'CONTESTED',
    verificationNotes: `Contested by dynasty ${contestingDynastyId}: ${notes}`,
  };
}

const TERMINAL_STATUSES: ReadonlySet<ContactVerificationStatus> = new Set(['VERIFIED', 'REJECTED']);

export function rejectClaim(claim: FirstContactClaim, reason: string): FirstContactClaim {
  if (TERMINAL_STATUSES.has(claim.status)) {
    throw new FirstContactError(
      'INVALID_STATUS_TRANSITION',
      `Cannot reject claim in terminal status '${claim.status}'.`,
    );
  }

  return {
    ...claim,
    status: 'REJECTED',
    verificationNotes: reason,
  };
}

// ΓöÇΓöÇΓöÇ Chronicle Entry Generation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function buildFirstContactChronicleEntry(
  claim: FirstContactClaim,
  dynastyName: string,
): { title: string; body: string; isPublic: true } {
  const speciesInfo = getSpeciesInfoForWorld(claim.worldId);
  const speciesLine =
    speciesInfo !== null
      ? `Species on record: ${speciesInfo}.`
      : 'Species classification: pending Survey Corps cataloguing.';

  const awardDate =
    claim.markAwardedAtMs !== null ? new Date(claim.markAwardedAtMs).toISOString() : 'date pending';

  const title = `FIRST CONTACT ΓÇö World ${claim.worldId} ΓÇö Dynasty ${dynastyName}`;

  const body = [
    `SURVEY CORPS OFFICIAL RECORD`,
    `Claim Reference: ${claim.claimId}`,
    `World: ${claim.worldId}`,
    `Claimant Dynasty: ${dynastyName} (ID: ${claim.dynastyId})`,
    `Date of Mark Award: ${awardDate}`,
    ``,
    `CONTACT SUMMARY`,
    `The dynasty designated "${dynastyName}" has been formally recognised as the first to`,
    `establish verifiable contact with an indigenous intelligent species on world ${claim.worldId}.`,
    ``,
    speciesLine,
    ``,
    `DYNASTY ACCOUNT (Filed by ${dynastyName})`,
    claim.contactDescription,
    ``,
    `SURVEY CORPS NOTES`,
    claim.verificationNotes ?? 'No additional notes filed.',
    ``,
    `Chronicle entry obligation: fulfilled. Mark awarded and recorded in the Remembrance.`,
    `This record is permanent and unalterable.`,
  ].join('\n');

  return { title, body, isPublic: true };
}
