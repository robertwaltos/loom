/**
 * concord-factions.ts ΓÇö The three canonical Concord factions and their ideological platforms.
 *
 * Bible v1.2: The founding wounds produced three responses ΓÇö expansion, contraction, and
 * preservation. None of them are entirely right. None of them are entirely wrong.
 *
 * Factions:
 *   CONTINUATIONIST    ΓÇö Expansion is survival. The Assembly's 300 years of legitimacy cannot
 *                        be discarded.
 *   RETURNIST          ΓÇö 20 deeply governed worlds beats 600 worlds built on injustice.
 *   LATTICE_COVENANT   ΓÇö The Lattice is sacred. Politics can burn; the zero-point connection
 *                        between worlds cannot.
 *   ASCENDANCY         ΓÇö The 14 worlds that formed their own power bloc.
 *   ASSEMBLY_NEUTRAL   ΓÇö Dynasties that won't affiliate. Often the deciding vote.
 *   FOUNDING_FAMILIES  ΓÇö The original 6 coalitions. Structurally advantaged. Resented.
 */

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ConcordFactionId =
  | 'CONTINUATIONIST'
  | 'RETURNIST'
  | 'LATTICE_COVENANT'
  | 'ASCENDANCY'
  | 'ASSEMBLY_NEUTRAL'
  | 'FOUNDING_FAMILIES';

export const ALL_CONCORD_FACTIONS: readonly ConcordFactionId[] = [
  'CONTINUATIONIST',
  'RETURNIST',
  'LATTICE_COVENANT',
  'ASCENDANCY',
  'ASSEMBLY_NEUTRAL',
  'FOUNDING_FAMILIES',
];

export interface FactionPlatform {
  readonly factionId: ConcordFactionId;
  readonly name: string;
  readonly tagline: string;
  readonly coreBeliefs: readonly string[];
  readonly whatTheyreRightAbout: string;
  readonly whatTheyreWrongAbout: string;
  readonly internalConflicts: string;
  readonly currentAssemblySeats: number;
  readonly assemblySeatsYear105: number;
  readonly foundedInGameYear: number;
  readonly founderDynastyId?: string;
}

export interface DynastyFactionAffiliation {
  readonly dynastyId: string;
  readonly factionId: ConcordFactionId;
  readonly strength: 'SOFT' | 'AFFILIATED' | 'CORE';
  readonly affiliatedSince: string;
  readonly reasonForAffiliation: string;
  readonly hasHeldFactionOffice: boolean;
  readonly splitHistory: readonly FactionSplit[];
}

export interface FactionSplit {
  readonly fromFaction: ConcordFactionId;
  readonly toFaction: ConcordFactionId;
  readonly splitAt: string;
  readonly reason: string;
  readonly wasPublic: boolean;
}

// ΓöÇΓöÇ Platform Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const CONTINUATIONIST_PLATFORM: FactionPlatform = {
  factionId: 'CONTINUATIONIST',
  name: 'The Continuationists',
  tagline: 'The civilisation must expand. Every new world is a new future.',
  coreBeliefs: [
    'Expansion is survival ΓÇö a civilisation that stops growing begins to rot.',
    'The Assembly represents 300 years of accumulated legitimacy that cannot be discarded.',
    'Lattice maintenance must be collective, funded by all worlds, not gatekept by devotees.',
    'The Ascendancy threat requires a unified response ΓÇö fragmentation is capitulation.',
  ],
  whatTheyreRightAbout:
    "The civilisation's institutional legitimacy is genuinely valuable. The Lattice IS " +
    "humanity's greatest achievement. Unilateral contraction would not heal the founding " +
    'wounds ΓÇö it would calcify them.',
  whatTheyreWrongAbout:
    'That institutional legitimacy means the institutions are just. That expansion ' +
    "automatically means flourishing for those being expanded into. That the Ascendancy's " +
    'challenge is purely military rather than a symptom of the third founding wound.',
  internalConflicts:
    'Hawkish wing (military response to Ascendancy encroachment) vs Diplomatic wing ' +
    '(negotiated settlement, Ascendancy seats in Assembly) vs Technocratic wing ' +
    '(let the Architect manage it ΓÇö human politicians have proven insufficient).',
  currentAssemblySeats: 180,
  assemblySeatsYear105: 210,
  foundedInGameYear: 22,
};

export const RETURNIST_PLATFORM: FactionPlatform = {
  factionId: 'RETURNIST',
  name: 'The Returnists',
  tagline:
    '20 worlds, deeply governed, with founding wounds healed ΓÇö better than 600 worlds built ' +
    'on an unjust foundation.',
  coreBeliefs: [
    'Quality over quantity ΓÇö governance capacity is finite and we have exceeded it.',
    'The founding wounds must be healed before a single new world is opened.',
    "The founding families' structural advantages are illegitimacy, not merit.",
    'Lattice degradation data makes large-scale transit increasingly dangerous ΓÇö expansion is reckless.',
  ],
  whatTheyreRightAbout:
    "The founding wounds are real. The structural inequality is real. The Ascendancy's " +
    "origin in the third wound means the Assembly's current predicament is partly " +
    'self-inflicted. Governance capacity does not scale automatically with territory.',
  whatTheyreWrongAbout:
    'That withdrawal is achievable without catastrophic economic collapse. That 20 deeply ' +
    'governed worlds would produce better outcomes ΓÇö insulation from cross-world trade ' +
    'and diversity creates fragility, not strength. That contraction does not itself ' +
    'constitute a founding wound visited upon the worlds left behind.',
  internalConflicts:
    'Radical wing (immediate contraction, accept the pain) vs Reformist wing ' +
    '(reform from within the existing Assembly, patient justice) vs Purist wing ' +
    "(they've left the Assembly entirely and consider participation complicity).",
  currentAssemblySeats: 95,
  assemblySeatsYear105: 140,
  foundedInGameYear: 22,
};

export const LATTICE_COVENANT_PLATFORM: FactionPlatform = {
  factionId: 'LATTICE_COVENANT',
  name: 'The Lattice Covenant',
  tagline:
    '14 million members who believe the Lattice itself is sacred ΓÇö not the politics around it, ' +
    'but the zero-point connection between worlds.',
  coreBeliefs: [
    "The Lattice is a gift from physics that doesn't care about politics ΓÇö it belongs to everyone.",
    'The frequency lock is a natural phenomenon, not a political tool.',
    'Studying and maintaining the Lattice is not a job; it is a calling.',
    "If political structures must be sacrificed to preserve the Lattice's integrity, that is not " +
      'a tragedy ΓÇö it is the correct ordering of priorities.',
  ],
  whatTheyreRightAbout:
    "The Lattice's preservation is genuinely existential. The Kwame degradation findings, " +
    'if confirmed, make their position urgent rather than merely spiritual. Every faction ' +
    'treats the Lattice as infrastructure; the Covenant treats it as what it actually is ΓÇö ' +
    'the only reason the Concord exists at all.',
  whatTheyreWrongAbout:
    'That non-partisan means neutral. Their very existence as an organisation with 14 million ' +
    "members has political weight they keep pretending they don't possess. Their study " +
    'practices, transit prioritisation votes, and degradation disclosures are all political ' +
    'acts, regardless of framing.',
  internalConflicts:
    'Religious fringe (the Lattice is literally divine, the frequency lock a blessing) ' +
    'vs Scientific core (it is physics ΓÇö preserve it, study it, stop worshipping it) ' +
    'vs Political wing (they have started voting in Assembly and the other two wings ' +
    'are furious about it).',
  currentAssemblySeats: 45,
  assemblySeatsYear105: 85,
  foundedInGameYear: 8,
};

export const ASCENDANCY_PLATFORM: FactionPlatform = {
  factionId: 'ASCENDANCY',
  name: 'The Ascendancy',
  tagline: 'The 14 worlds that decided the Assembly no longer speaks for them.',
  coreBeliefs: [
    'The founding wounds were not accidents ΓÇö they were policy. The Assembly knew.',
    'Representation without structural remedy is theatre.',
    'Self-determination for the 14 is non-negotiable.',
    'We did not leave the civilisation. The civilisation left us, 300 years ago.',
  ],
  whatTheyreRightAbout:
    'The third founding wound is real and documented. The structural exclusions are real. ' +
    'The Assembly has had 300 years to remedy them voluntarily and has not.',
  whatTheyreWrongAbout:
    'That isolation heals the wound rather than preserving it. That 14 worlds can maintain ' +
    'the Lattice nodes their territories encompass without collective funding.',
  internalConflicts:
    'Independence faction (full separation, own governance, own currency) vs Reform faction ' +
    '(return to Assembly with enforceable structural remedy guarantees).',
  currentAssemblySeats: 28,
  assemblySeatsYear105: 15,
  foundedInGameYear: 47,
};

export const ASSEMBLY_NEUTRAL_PLATFORM: FactionPlatform = {
  factionId: 'ASSEMBLY_NEUTRAL',
  name: 'Assembly Neutral',
  tagline: 'We vote the issue, not the faction.',
  coreBeliefs: [
    'Ideological affiliation compromises judgment.',
    'Each question deserves its own answer.',
    'Coalition dependency corrupts governance.',
    'The swing vote is the most honest vote.',
  ],
  whatTheyreRightAbout:
    'Unaffiliated dynasties genuinely produce less predictable, often better-calibrated ' +
    'individual votes. They are immune to faction whipping.',
  whatTheyreWrongAbout:
    'That abstaining from faction politics is the same as not having one. Their ' +
    'collective behaviour is legible and exploitable by anyone who maps it carefully enough.',
  internalConflicts:
    'Philosophically neutral (genuinely unaffiliated) vs Strategically neutral ' +
    '(soft Continuationists who benefit from the perception of independence).',
  currentAssemblySeats: 32,
  assemblySeatsYear105: 25,
  foundedInGameYear: 1,
};

export const FOUNDING_FAMILIES_PLATFORM: FactionPlatform = {
  factionId: 'FOUNDING_FAMILIES',
  name: 'The Founding Families',
  tagline: 'We built the Concord. We will not apologise for still being here.',
  coreBeliefs: [
    'First-mover advantage is not injustice ΓÇö it is the reward for founding-era risk.',
    'Institutional memory belongs to those who built the institutions.',
    'The Concord functions because certain families have remained committed to it for 300 years.',
    'Structural remedies are radical redistribution dressed in procedural language.',
  ],
  whatTheyreRightAbout:
    'Their institutional knowledge is genuine. Their networks maintain Concord infrastructure ' +
    'that no one else has the relationships to maintain. They are not simply parasites.',
  whatTheyreWrongAbout:
    'That founding-era risk justifies compounding advantage across 300 years. That their ' +
    'commitment to the Concord and their commitment to their own position are separable things.',
  internalConflicts:
    'Conservative core (preserve all structural advantages) vs Progressive wing ' +
    '(trade some advantages for legitimacy and long-term stability).',
  currentAssemblySeats: 20,
  assemblySeatsYear105: 25,
  foundedInGameYear: 1,
};

// ΓöÇΓöÇ Registry ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const PLATFORMS_BY_ID: Readonly<Record<ConcordFactionId, FactionPlatform>> = {
  CONTINUATIONIST: CONTINUATIONIST_PLATFORM,
  RETURNIST: RETURNIST_PLATFORM,
  LATTICE_COVENANT: LATTICE_COVENANT_PLATFORM,
  ASCENDANCY: ASCENDANCY_PLATFORM,
  ASSEMBLY_NEUTRAL: ASSEMBLY_NEUTRAL_PLATFORM,
  FOUNDING_FAMILIES: FOUNDING_FAMILIES_PLATFORM,
};

export function getFactionPlatform(factionId: ConcordFactionId): FactionPlatform {
  return PLATFORMS_BY_ID[factionId];
}

export function getAllFactionPlatforms(): readonly FactionPlatform[] {
  return ALL_CONCORD_FACTIONS.map((id) => PLATFORMS_BY_ID[id]);
}

export function getTotalAssemblySeats(): number {
  return ALL_CONCORD_FACTIONS.reduce(
    (sum, id) => sum + PLATFORMS_BY_ID[id].currentAssemblySeats,
    0,
  );
}

// ΓöÇΓöÇ Affiliation State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface AffiliationRegistryState {
  readonly affiliations: Map<string, DynastyFactionAffiliation>;
  readonly factionMembers: Map<ConcordFactionId, Set<string>>;
}

export interface AffiliationRegistry {
  readonly register: (affiliation: DynastyFactionAffiliation) => void;
  readonly get: (dynastyId: string) => DynastyFactionAffiliation | undefined;
  readonly getByFaction: (factionId: ConcordFactionId) => readonly DynastyFactionAffiliation[];
  readonly countByFaction: (factionId: ConcordFactionId) => number;
  readonly getByStrength: (
    strength: DynastyFactionAffiliation['strength'],
  ) => readonly DynastyFactionAffiliation[];
  readonly update: (dynastyId: string, update: Partial<DynastyFactionAffiliation>) => void;
  readonly remove: (dynastyId: string) => void;
  readonly size: () => number;
}

export function createAffiliationRegistry(): AffiliationRegistry {
  const state: AffiliationRegistryState = {
    affiliations: new Map(),
    factionMembers: new Map(),
  };

  return {
    register: (affiliation) => registerAffiliation(state, affiliation),
    get: (dynastyId) => state.affiliations.get(dynastyId),
    getByFaction: (factionId) => getByFaction(state, factionId),
    countByFaction: (factionId) => countByFaction(state, factionId),
    getByStrength: (strength) => getByStrength(state, strength),
    update: (dynastyId, update) => updateAffiliation(state, dynastyId, update),
    remove: (dynastyId) => removeAffiliation(state, dynastyId),
    size: () => state.affiliations.size,
  };
}

function registerAffiliation(
  state: AffiliationRegistryState,
  affiliation: DynastyFactionAffiliation,
): void {
  const existing = state.affiliations.get(affiliation.dynastyId);
  if (existing !== undefined) {
    const oldSet = state.factionMembers.get(existing.factionId);
    oldSet?.delete(affiliation.dynastyId);
  }
  state.affiliations.set(affiliation.dynastyId, affiliation);
  ensureFactionSet(state, affiliation.factionId).add(affiliation.dynastyId);
}

function ensureFactionSet(
  state: AffiliationRegistryState,
  factionId: ConcordFactionId,
): Set<string> {
  let set = state.factionMembers.get(factionId);
  if (set === undefined) {
    set = new Set();
    state.factionMembers.set(factionId, set);
  }
  return set;
}

function getByFaction(
  state: AffiliationRegistryState,
  factionId: ConcordFactionId,
): readonly DynastyFactionAffiliation[] {
  const set = state.factionMembers.get(factionId);
  if (set === undefined) return [];
  return Array.from(set)
    .map((id) => state.affiliations.get(id))
    .filter((a): a is DynastyFactionAffiliation => a !== undefined);
}

function countByFaction(state: AffiliationRegistryState, factionId: ConcordFactionId): number {
  return state.factionMembers.get(factionId)?.size ?? 0;
}

function getByStrength(
  state: AffiliationRegistryState,
  strength: DynastyFactionAffiliation['strength'],
): readonly DynastyFactionAffiliation[] {
  return Array.from(state.affiliations.values()).filter((a) => a.strength === strength);
}

function updateAffiliation(
  state: AffiliationRegistryState,
  dynastyId: string,
  update: Partial<DynastyFactionAffiliation>,
): void {
  const existing = state.affiliations.get(dynastyId);
  if (existing === undefined) return;

  if (update.factionId !== undefined && update.factionId !== existing.factionId) {
    state.factionMembers.get(existing.factionId)?.delete(dynastyId);
    ensureFactionSet(state, update.factionId).add(dynastyId);
  }

  state.affiliations.set(dynastyId, { ...existing, ...update });
}

function removeAffiliation(state: AffiliationRegistryState, dynastyId: string): void {
  const existing = state.affiliations.get(dynastyId);
  if (existing === undefined) return;
  state.factionMembers.get(existing.factionId)?.delete(dynastyId);
  state.affiliations.delete(dynastyId);
}
