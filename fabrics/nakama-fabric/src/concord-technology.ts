/**
 * Concord Technology Constants ΓÇö Age of Radiance milestones and availability.
 *
 * Derived from World Bible v2: ZPE commercialised 2019, city-scale 2024,
 * global free energy 2031. Matterwave synthesis 2027. Longevity cascade
 * through four stages 2029ΓÇô2041.
 */

export const TECHNOLOGY_TIMELINE = {
  ZPE_COMMERCIAL: 2019,
  ZPE_CITY_SCALE: 2024,
  ZPE_GLOBAL: 2031,
  MATTERWAVE_VIABLE: 2027,
  FOUNDING_EVENT: 2027,
  LONGEVITY_REJECTION_THERAPIES_AVAILABLE: 2029,
  NANITE_MAINTENANCE_AVAILABLE: 2032,
  NEURAL_FREQUENCY_MAPPING_VIABLE: 2035,
  SUBSTRATE_TRANSFER_VIABLE: 2041,
} as const;

export const LONGEVITY_EXTENSION_YEARS = {
  NANITE_BASELINE: 20,
  REJUVENATION_SINGLE: 40,
  REJUVENATION_FULL_PROTOCOL: 60,
} as const;

export type ConcordTechnology =
  | 'ZPE_COMMERCIAL'
  | 'ZPE_GLOBAL'
  | 'MATTERWAVE_SYNTHESIS'
  | 'REJUVENATION_THERAPY'
  | 'NANITE_MAINTENANCE'
  | 'NEURAL_FREQUENCY_MAPPING'
  | 'SUBSTRATE_TRANSFER'
  | 'LATTICE_NAVIGATION'
  | 'SURVEY_PROBE_TECH';

export type AccessCost = 'free' | 'standard' | 'premium' | 'rare';

export interface TechnologyStatus {
  technology: ConcordTechnology;
  yearAvailable: number;
  isAvailableInGame: boolean;
  accessCost: AccessCost;
  notes: string;
}

const TECHNOLOGY_DEFINITIONS: Record<
  ConcordTechnology,
  { yearAvailable: number; accessCost: AccessCost; notes: string }
> = {
  ZPE_COMMERCIAL: {
    yearAvailable: TECHNOLOGY_TIMELINE.ZPE_COMMERCIAL,
    accessCost: 'standard',
    notes: 'Zero-point energy reaches commercial viability. Industrial access only.',
  },
  ZPE_GLOBAL: {
    yearAvailable: TECHNOLOGY_TIMELINE.ZPE_GLOBAL,
    accessCost: 'free',
    notes: 'Energy effectively free everywhere on Earth and settled colonies.',
  },
  MATTERWAVE_SYNTHESIS: {
    yearAvailable: TECHNOLOGY_TIMELINE.MATTERWAVE_VIABLE,
    accessCost: 'standard',
    notes: 'Transmute elements by tuning energy to quantum configurations.',
  },
  REJUVENATION_THERAPY: {
    yearAvailable: TECHNOLOGY_TIMELINE.LONGEVITY_REJECTION_THERAPIES_AVAILABLE,
    accessCost: 'premium',
    notes: 'Cellular reset protocols. 40ΓÇô60 year extension. Expensive, becoming cheaper.',
  },
  NANITE_MAINTENANCE: {
    yearAvailable: TECHNOLOGY_TIMELINE.NANITE_MAINTENANCE_AVAILABLE,
    accessCost: 'standard',
    notes: 'Continuous cellular repair nanites. Widely available in developed regions.',
  },
  NEURAL_FREQUENCY_MAPPING: {
    yearAvailable: TECHNOLOGY_TIMELINE.NEURAL_FREQUENCY_MAPPING_VIABLE,
    accessCost: 'premium',
    notes: 'Complete fidelity electromagnetic brain signature recording.',
  },
  SUBSTRATE_TRANSFER: {
    yearAvailable: TECHNOLOGY_TIMELINE.SUBSTRATE_TRANSFER_VIABLE,
    accessCost: 'rare',
    notes: 'Run neural map on non-biological substrate. Identity continuity unresolved.',
  },
  LATTICE_NAVIGATION: {
    yearAvailable: TECHNOLOGY_TIMELINE.FOUNDING_EVENT,
    accessCost: 'rare',
    notes: 'Spatial topology traversal. Concord-administered. Not commercially available.',
  },
  SURVEY_PROBE_TECH: {
    yearAvailable: TECHNOLOGY_TIMELINE.FOUNDING_EVENT,
    accessCost: 'rare',
    notes: 'Automated probe systems for Lattice world reconnaissance.',
  },
};

export function getTechnologyStatus(
  technology: ConcordTechnology,
  currentRealYear: number,
): TechnologyStatus {
  const def = TECHNOLOGY_DEFINITIONS[technology];
  return {
    technology,
    yearAvailable: def.yearAvailable,
    isAvailableInGame: currentRealYear >= def.yearAvailable,
    accessCost: def.accessCost,
    notes: def.notes,
  };
}

export function getAvailableTechnologies(currentRealYear: number): TechnologyStatus[] {
  const all = Object.keys(TECHNOLOGY_DEFINITIONS) as ConcordTechnology[];
  return all
    .map((tech) => getTechnologyStatus(tech, currentRealYear))
    .filter((status) => status.isAvailableInGame);
}
