/**
 * Assembly Committee System ΓÇö Formal committee structures of the Concord Assembly.
 *
 * Bible v1.2: The Assembly's 340+ world delegations work through formal committees
 * before motions reach the chamber floor. Committees are established by Assembly
 * motion and can be dissolved the same way. The FOUNDING_WOUNDS committee (Year 31)
 * was the most contested to establish. The ASCENDANCY_INQUIRY committee (Year 75)
 * was established after Ascendancy territorial expansion.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CommitteeId =
  | 'FOUNDING_WOUNDS'
  | 'ECONOMIC_OVERSIGHT'
  | 'SURVEY_MANDATE'
  | 'LATTICE_INTEGRITY'
  | 'EXTERNAL_RELATIONS'
  | 'DYNASTIC_WELFARE'
  | 'CHRONICLE_STANDARDS'
  | 'WORLD_GOVERNANCE'
  | 'ASCENDANCY_INQUIRY';

export type CommitteePower = 'ADVISORY' | 'INVESTIGATIVE' | 'EXECUTIVE' | 'CONSTITUTIONAL';

export interface CommitteeRecord {
  readonly committeeId: CommitteeId;
  readonly name: string;
  readonly establishedYear: number;
  readonly power: CommitteePower;
  readonly mandateText: string;
  readonly currentChairDynastyId: string | null;
  readonly memberCount: number;
  readonly isActive: boolean;
  readonly quorumRequired: number;
}

// ΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/** Year the Founding Wounds Committee was established after the Year 31 motion passed. */
export const FOUNDING_WOUNDS_COMMITTEE_YEAR = 31;

/** Year the Ascendancy Inquiry Committee was established after territorial expansion. */
export const ASCENDANCY_INQUIRY_COMMITTEE_YEAR = 75;

// ΓöÇΓöÇ Canonical Committees ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const CANONICAL_COMMITTEES: Readonly<Record<CommitteeId, CommitteeRecord>> = {
  FOUNDING_WOUNDS: {
    committeeId: 'FOUNDING_WOUNDS',
    name: 'Committee on Founding Wounds and Historical Record',
    establishedYear: FOUNDING_WOUNDS_COMMITTEE_YEAR,
    power: 'INVESTIGATIVE',
    mandateText:
      'Mandate: Conduct formal investigation into the suppression of the Okafor Survey, ' +
      'the Chosen Worlds selection criteria, and the origins of the Ascendancy. ' +
      'Findings to be published in the Chronicle.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 7,
  },

  ECONOMIC_OVERSIGHT: {
    committeeId: 'ECONOMIC_OVERSIGHT',
    name: 'Committee on Economic Oversight',
    establishedYear: 5,
    power: 'EXECUTIVE',
    mandateText:
      'Mandate: Oversee KALON issuance rates, wealth zone enforcement, levy collection, ' +
      'and commons fund distribution.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 7,
  },

  SURVEY_MANDATE: {
    committeeId: 'SURVEY_MANDATE',
    name: 'Committee on Survey Corps Mandate',
    establishedYear: 12,
    power: 'ADVISORY',
    mandateText:
      'Mandate: Advise on Survey Corps mission priorities, world-readiness assessment, ' +
      'and arc progression.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 5,
  },

  LATTICE_INTEGRITY: {
    committeeId: 'LATTICE_INTEGRITY',
    name: 'Committee on Lattice Integrity',
    establishedYear: 8,
    power: 'EXECUTIVE',
    mandateText:
      'Mandate: Monitor lattice stability across all inhabited worlds. Emergency powers ' +
      'to halt issuance on compromised worlds.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 7,
  },

  EXTERNAL_RELATIONS: {
    committeeId: 'EXTERNAL_RELATIONS',
    name: 'Committee on External Relations',
    establishedYear: 45,
    power: 'ADVISORY',
    mandateText:
      'Mandate: Manage contact protocols for void-touched world phenomena and any future ' +
      'non-human contact scenarios.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 5,
  },

  DYNASTIC_WELFARE: {
    committeeId: 'DYNASTIC_WELFARE',
    name: 'Committee on Dynastic Welfare',
    establishedYear: 3,
    power: 'EXECUTIVE',
    mandateText:
      'Mandate: Administer UBK distribution, Genesis Vault access, and founding dynasty ' +
      'support systems.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 7,
  },

  CHRONICLE_STANDARDS: {
    committeeId: 'CHRONICLE_STANDARDS',
    name: 'Committee on Chronicle Standards',
    establishedYear: 7,
    power: 'CONSTITUTIONAL',
    mandateText:
      'Mandate: Establish and enforce standards for Chronicle entry validity, hash chain ' +
      'integrity, and access tier classifications.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 9,
  },

  WORLD_GOVERNANCE: {
    committeeId: 'WORLD_GOVERNANCE',
    name: 'Committee on World Governance',
    establishedYear: 18,
    power: 'ADVISORY',
    mandateText:
      'Mandate: Guide world-level governance structure selection and resolve inter-world ' +
      'governance disputes.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 5,
  },

  ASCENDANCY_INQUIRY: {
    committeeId: 'ASCENDANCY_INQUIRY',
    name: 'Committee on Ascendancy Inquiry',
    establishedYear: ASCENDANCY_INQUIRY_COMMITTEE_YEAR,
    power: 'INVESTIGATIVE',
    mandateText:
      'Mandate: Investigate Ascendancy territorial expansion patterns, resource extraction ' +
      'practices, and lattice impact on controlled worlds.',
    currentChairDynastyId: null,
    memberCount: 0,
    isActive: true,
    quorumRequired: 7,
  },
};

// ΓöÇΓöÇ Pure Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns the CommitteeRecord for the given CommitteeId, or undefined if not found.
 */
export function getCommitteeRecord(id: CommitteeId): CommitteeRecord | undefined {
  return CANONICAL_COMMITTEES[id];
}

/**
 * Returns whether a committee was established by the given year and remains active.
 */
export function isCommitteeActive(committee: CommitteeRecord, year: number): boolean {
  return committee.isActive && committee.establishedYear <= year;
}

/**
 * Returns all canonical committees that were active at (or before) the given year.
 */
export function getActiveCommitteesAtYear(year: number): CommitteeRecord[] {
  return Object.values(CANONICAL_COMMITTEES).filter((c) => isCommitteeActive(c, year));
}

/**
 * Returns all canonical committees with the given CommitteePower.
 */
export function getCommitteesByPower(power: CommitteePower): CommitteeRecord[] {
  return Object.values(CANONICAL_COMMITTEES).filter((c) => c.power === power);
}

/**
 * Returns the total number of canonical committees active at the given year.
 */
export function computeAssemblyCommitteeCount(year: number): number {
  return getActiveCommitteesAtYear(year).length;
}
