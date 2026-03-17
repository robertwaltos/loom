/**
 * Longevity Service ΓÇö Dynasty member age tracking with rejuvenation mechanics.
 *
 * The longevity cascade (World Bible v2) makes biological death optional
 * within one to two generations from 2031. This service models the four
 * stages: nanite maintenance, rejuvenation therapy, neural mapping, and
 * substrate transfer.
 *
 * Philosophical note: SUBSTRATE_TRANSFERRED sets isImmortal: true but
 * identityContinuityResolved: false. Whether the transferred entity is
 * the same person remains mechanically unresolved by design.
 */

import { TECHNOLOGY_TIMELINE, LONGEVITY_EXTENSION_YEARS } from './concord-technology.js';

export type RejuvenationStatus =
  | 'UNTREATED'
  | 'NANITE_MAINTAINED'
  | 'REJUVENATED_ONCE'
  | 'REJUVENATED_TWICE'
  | 'NEURAL_MAPPED'
  | 'SUBSTRATE_TRANSFERRED';

export interface LongevityProfile {
  dynastyId: string;
  biologicalBirthYear: number;
  rejuvenationStatus: RejuvenationStatus;
  effectiveBiologicalAge: number;
  canApplyRejuvenation: boolean;
  estimatedLifespan: number;
  isImmortal: boolean;
  identityContinuityResolved: boolean;
}

const NATURAL_LIFESPAN_YEARS = 85;
const MINIMUM_AGE_FOR_REJUVENATION = 40;

const LIFESPAN_BY_STATUS: Record<RejuvenationStatus, number> = {
  UNTREATED: NATURAL_LIFESPAN_YEARS,
  NANITE_MAINTAINED: NATURAL_LIFESPAN_YEARS + LONGEVITY_EXTENSION_YEARS.NANITE_BASELINE,
  REJUVENATED_ONCE: NATURAL_LIFESPAN_YEARS + LONGEVITY_EXTENSION_YEARS.REJUVENATION_SINGLE,
  REJUVENATED_TWICE: NATURAL_LIFESPAN_YEARS + LONGEVITY_EXTENSION_YEARS.REJUVENATION_FULL_PROTOCOL,
  NEURAL_MAPPED: NATURAL_LIFESPAN_YEARS + LONGEVITY_EXTENSION_YEARS.REJUVENATION_FULL_PROTOCOL + 20,
  SUBSTRATE_TRANSFERRED: Number.MAX_SAFE_INTEGER,
};

const AGE_REDUCTION_BY_STATUS: Record<RejuvenationStatus, number> = {
  UNTREATED: 0,
  NANITE_MAINTAINED: 5,
  REJUVENATED_ONCE: LONGEVITY_EXTENSION_YEARS.REJUVENATION_SINGLE,
  REJUVENATED_TWICE: LONGEVITY_EXTENSION_YEARS.REJUVENATION_FULL_PROTOCOL,
  NEURAL_MAPPED: LONGEVITY_EXTENSION_YEARS.REJUVENATION_FULL_PROTOCOL,
  SUBSTRATE_TRANSFERRED: 0,
};

export function calculateBiologicalAge(profile: LongevityProfile, currentYear: number): number {
  if (profile.rejuvenationStatus === 'SUBSTRATE_TRANSFERRED') {
    return 0;
  }
  const chronologicalAge = currentYear - profile.biologicalBirthYear;
  const reduction = AGE_REDUCTION_BY_STATUS[profile.rejuvenationStatus];
  return Math.max(0, chronologicalAge - reduction);
}

export function canApplyRejuvenation(birthYear: number, currentYear: number): boolean {
  if (currentYear < TECHNOLOGY_TIMELINE.LONGEVITY_REJECTION_THERAPIES_AVAILABLE) {
    return false;
  }
  const age = currentYear - birthYear;
  return age >= MINIMUM_AGE_FOR_REJUVENATION;
}

export function applyRejuvenation(
  profile: LongevityProfile,
  currentYear: number,
): LongevityProfile {
  if (!canApplyRejuvenation(profile.biologicalBirthYear, currentYear)) {
    throw new Error(
      `Rejuvenation not eligible: birthYear=${profile.biologicalBirthYear}, currentYear=${currentYear}`,
    );
  }

  const nextStatus = getNextRejuvenationStatus(profile.rejuvenationStatus);
  const updated: LongevityProfile = {
    ...profile,
    rejuvenationStatus: nextStatus,
    isImmortal: nextStatus === 'SUBSTRATE_TRANSFERRED',
    identityContinuityResolved: nextStatus !== 'SUBSTRATE_TRANSFERRED',
  };
  updated.effectiveBiologicalAge = calculateBiologicalAge(updated, currentYear);
  updated.canApplyRejuvenation = canApplyRejuvenation(updated.biologicalBirthYear, currentYear);
  updated.estimatedLifespan = getLifespanProjection(updated, currentYear);
  return updated;
}

export function getLifespanProjection(profile: LongevityProfile, currentYear: number): number {
  if (profile.rejuvenationStatus === 'SUBSTRATE_TRANSFERRED') {
    return Number.MAX_SAFE_INTEGER;
  }
  const biologicalAge = calculateBiologicalAge(profile, currentYear);
  const maxLifespan = LIFESPAN_BY_STATUS[profile.rejuvenationStatus];
  return Math.max(0, maxLifespan - biologicalAge);
}

export function createLongevityProfile(
  dynastyId: string,
  biologicalBirthYear: number,
  currentYear: number,
  rejuvenationStatus: RejuvenationStatus = 'UNTREATED',
): LongevityProfile {
  const profile: LongevityProfile = {
    dynastyId,
    biologicalBirthYear,
    rejuvenationStatus,
    effectiveBiologicalAge: 0,
    canApplyRejuvenation: false,
    estimatedLifespan: 0,
    isImmortal: rejuvenationStatus === 'SUBSTRATE_TRANSFERRED',
    identityContinuityResolved: rejuvenationStatus !== 'SUBSTRATE_TRANSFERRED',
  };
  profile.effectiveBiologicalAge = calculateBiologicalAge(profile, currentYear);
  profile.canApplyRejuvenation = canApplyRejuvenation(biologicalBirthYear, currentYear);
  profile.estimatedLifespan = getLifespanProjection(profile, currentYear);
  return profile;
}

function getNextRejuvenationStatus(current: RejuvenationStatus): RejuvenationStatus {
  const progression: Record<RejuvenationStatus, RejuvenationStatus> = {
    UNTREATED: 'NANITE_MAINTAINED',
    NANITE_MAINTAINED: 'REJUVENATED_ONCE',
    REJUVENATED_ONCE: 'REJUVENATED_TWICE',
    REJUVENATED_TWICE: 'NEURAL_MAPPED',
    NEURAL_MAPPED: 'SUBSTRATE_TRANSFERRED',
    SUBSTRATE_TRANSFERRED: 'SUBSTRATE_TRANSFERRED',
  };
  return progression[current];
}
