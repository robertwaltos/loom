/**
 * npc-family.ts — NPC family unit formation and lifecycle.
 *
 * Models NPC family structures: formation, child-rearing, loyalty dynamics,
 * inheritance events, and conflict resolution. Family loyalty scores influence
 * behavior and decision-making. Child development is shaped by parental
 * involvement and family stability. Inheritance distributes assets and property
 * upon family member death. All KALON amounts in bigint micro-KALON.
 */

// -- Ports ────────────────────────────────────────────────────────

interface FamilyClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface FamilyIdGeneratorPort {
  readonly next: () => string;
}

interface FamilyLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface FamilyDeps {
  readonly clock: FamilyClockPort;
  readonly idGenerator: FamilyIdGeneratorPort;
  readonly logger: FamilyLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type FamilyRole = 'PARENT' | 'CHILD' | 'SPOUSE';

interface FamilyMember {
  readonly npcId: string;
  readonly familyId: string;
  readonly role: FamilyRole;
  readonly joinedAt: bigint;
  readonly loyaltyScore: number;
}

interface FamilyUnit {
  readonly familyId: string;
  readonly memberIds: string[];
  readonly foundedAt: bigint;
  readonly averageLoyalty: number;
  readonly conflictCount: number;
}

interface ChildhoodDevelopment {
  readonly childId: string;
  readonly familyId: string;
  readonly skillGrowthRate: number;
  readonly emotionalStability: number;
  readonly parentalInvolvement: number;
  readonly startedAt: bigint;
  readonly milestonesReached: number;
}

interface InheritanceEvent {
  readonly eventId: string;
  readonly deceasedId: string;
  readonly familyId: string;
  readonly beneficiaries: string[];
  readonly totalAmountMicroKalon: bigint;
  readonly occurredAt: bigint;
}

interface FamilyConflict {
  readonly conflictId: string;
  readonly familyId: string;
  readonly involvedMemberIds: string[];
  readonly severityLevel: number;
  readonly startedAt: bigint;
  readonly resolvedAt: bigint | undefined;
  readonly resolution: string | undefined;
}

interface FamilyReport {
  readonly totalFamilies: number;
  readonly totalMembers: number;
  readonly averageFamilySize: number;
  readonly totalConflicts: number;
  readonly totalInheritances: number;
  readonly highestLoyaltyFamily: string | undefined;
}

type FormFamilyError = 'invalid_member_ids' | 'member_already_in_family';
type AddChildError = 'family_not_found' | 'invalid_child_id';
type UpdateLoyaltyError = 'member_not_found' | 'invalid_loyalty_score';
type RecordInheritanceError = 'family_not_found' | 'invalid_amount';
type TriggerConflictError = 'family_not_found' | 'invalid_severity';
type ResolveConflictError = 'conflict_not_found' | 'already_resolved';

// -- Constants ────────────────────────────────────────────────────

const LOYALTY_MIN = 0;
const LOYALTY_MAX = 100;
const LOYALTY_CONFLICT_THRESHOLD = 40;
const LOYALTY_INHERITANCE_BONUS = 5;
const SKILL_GROWTH_BASE = 1.0;
const SKILL_GROWTH_MAX = 2.0;
const EMOTIONAL_STABILITY_MIN = 0;
const EMOTIONAL_STABILITY_MAX = 100;
const PARENTAL_INVOLVEMENT_MIN = 0;
const PARENTAL_INVOLVEMENT_MAX = 100;
const MICRO_KALON = 1_000_000n;

// -- State ────────────────────────────────────────────────────────

interface FamilySystemState {
  readonly families: Map<string, FamilyUnit>;
  readonly members: Map<string, FamilyMember>;
  readonly developments: Map<string, ChildhoodDevelopment>;
  readonly inheritances: InheritanceEvent[];
  readonly conflicts: Map<string, FamilyConflict>;
}

// -- Factory ──────────────────────────────────────────────────────

export interface FamilySystem {
  readonly formFamily: (memberIds: string[]) => FormFamilyError | string;
  readonly addChild: (
    familyId: string,
    childId: string,
    parentalInvolvement: number,
  ) => AddChildError | 'ok';
  readonly updateLoyalty: (npcId: string, loyaltyDelta: number) => UpdateLoyaltyError | number;
  readonly recordInheritance: (
    deceasedId: string,
    familyId: string,
    totalAmountMicroKalon: bigint,
  ) => RecordInheritanceError | string;
  readonly triggerConflict: (
    familyId: string,
    involvedMemberIds: string[],
    severityLevel: number,
  ) => TriggerConflictError | string;
  readonly getDevelopmentReport: (childId: string) => ChildhoodDevelopment | undefined;
  readonly getFamilyTree: (familyId: string) => FamilyUnit | undefined;
  readonly resolveConflict: (conflictId: string, resolution: string) => ResolveConflictError | 'ok';
  readonly getFamilyReport: () => FamilyReport;
}

export function createFamilySystem(deps: FamilyDeps): FamilySystem {
  const state: FamilySystemState = {
    families: new Map(),
    members: new Map(),
    developments: new Map(),
    inheritances: [],
    conflicts: new Map(),
  };
  return {
    formFamily: (memberIds) => formFamily(state, deps, memberIds),
    addChild: (familyId, childId, parentalInvolvement) =>
      addChild(state, deps, familyId, childId, parentalInvolvement),
    updateLoyalty: (npcId, loyaltyDelta) => updateLoyalty(state, deps, npcId, loyaltyDelta),
    recordInheritance: (deceasedId, familyId, totalAmountMicroKalon) =>
      recordInheritance(state, deps, deceasedId, familyId, totalAmountMicroKalon),
    triggerConflict: (familyId, involvedMemberIds, severityLevel) =>
      triggerConflict(state, deps, familyId, involvedMemberIds, severityLevel),
    getDevelopmentReport: (childId) => getDevelopmentReport(state, childId),
    getFamilyTree: (familyId) => getFamilyTree(state, familyId),
    resolveConflict: (conflictId, resolution) =>
      resolveConflict(state, deps, conflictId, resolution),
    getFamilyReport: () => getFamilyReport(state),
  };
}

// -- Module-level functions ───────────────────────────────────────

function formFamily(
  state: FamilySystemState,
  deps: FamilyDeps,
  memberIds: string[],
): FormFamilyError | string {
  if (memberIds.length === 0) {
    return 'invalid_member_ids';
  }
  for (let i = 0; i < memberIds.length; i = i + 1) {
    const memberId = memberIds[i];
    if (memberId === undefined) {
      continue;
    }
    const existing = state.members.get(memberId);
    if (existing !== undefined) {
      return 'member_already_in_family';
    }
  }
  const familyId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const family: FamilyUnit = {
    familyId,
    memberIds,
    foundedAt: now,
    averageLoyalty: LOYALTY_MAX,
    conflictCount: 0,
  };
  state.families.set(familyId, family);
  for (let i = 0; i < memberIds.length; i = i + 1) {
    const memberId = memberIds[i];
    if (memberId === undefined) {
      continue;
    }
    const role: FamilyRole = i < 2 ? 'SPOUSE' : 'CHILD';
    const member: FamilyMember = {
      npcId: memberId,
      familyId,
      role,
      joinedAt: now,
      loyaltyScore: LOYALTY_MAX,
    };
    state.members.set(memberId, member);
  }
  deps.logger.info('family_formed', { familyId, memberCount: String(memberIds.length) });
  return familyId;
}

function addChild(
  state: FamilySystemState,
  deps: FamilyDeps,
  familyId: string,
  childId: string,
  parentalInvolvement: number,
): AddChildError | 'ok' {
  const family = state.families.get(familyId);
  if (family === undefined) {
    return 'family_not_found';
  }
  const existingMember = state.members.get(childId);
  if (existingMember !== undefined) {
    return 'invalid_child_id';
  }
  const now = deps.clock.nowMicroseconds();
  const member: FamilyMember = {
    npcId: childId,
    familyId,
    role: 'CHILD',
    joinedAt: now,
    loyaltyScore: LOYALTY_MAX,
  };
  state.members.set(childId, member);
  const updatedFamily: FamilyUnit = {
    ...family,
    memberIds: [...family.memberIds, childId],
  };
  state.families.set(familyId, updatedFamily);
  const involvementClamped = Math.max(
    PARENTAL_INVOLVEMENT_MIN,
    Math.min(PARENTAL_INVOLVEMENT_MAX, parentalInvolvement),
  );
  const skillGrowthRate =
    SKILL_GROWTH_BASE + (involvementClamped / 100) * (SKILL_GROWTH_MAX - SKILL_GROWTH_BASE);
  const emotionalStability = involvementClamped;
  const development: ChildhoodDevelopment = {
    childId,
    familyId,
    skillGrowthRate,
    emotionalStability,
    parentalInvolvement: involvementClamped,
    startedAt: now,
    milestonesReached: 0,
  };
  state.developments.set(childId, development);
  deps.logger.info('child_added', { familyId, childId });
  return 'ok';
}

function updateLoyalty(
  state: FamilySystemState,
  deps: FamilyDeps,
  npcId: string,
  loyaltyDelta: number,
): UpdateLoyaltyError | number {
  const member = state.members.get(npcId);
  if (member === undefined) {
    return 'member_not_found';
  }
  const newLoyalty = Math.max(
    LOYALTY_MIN,
    Math.min(LOYALTY_MAX, member.loyaltyScore + loyaltyDelta),
  );
  if (newLoyalty < LOYALTY_MIN || newLoyalty > LOYALTY_MAX) {
    return 'invalid_loyalty_score';
  }
  const updatedMember: FamilyMember = {
    ...member,
    loyaltyScore: newLoyalty,
  };
  state.members.set(npcId, updatedMember);
  const family = state.families.get(member.familyId);
  if (family !== undefined) {
    let totalLoyalty = 0;
    let memberCount = 0;
    for (let i = 0; i < family.memberIds.length; i = i + 1) {
      const memberId = family.memberIds[i];
      if (memberId === undefined) {
        continue;
      }
      const fam = state.members.get(memberId);
      if (fam !== undefined) {
        totalLoyalty = totalLoyalty + fam.loyaltyScore;
        memberCount = memberCount + 1;
      }
    }
    const avgLoyalty = memberCount > 0 ? totalLoyalty / memberCount : LOYALTY_MAX;
    const updatedFamily: FamilyUnit = {
      ...family,
      averageLoyalty: avgLoyalty,
    };
    state.families.set(member.familyId, updatedFamily);
  }
  deps.logger.info('loyalty_updated', { npcId, newLoyalty: String(newLoyalty) });
  return newLoyalty;
}

function recordInheritance(
  state: FamilySystemState,
  deps: FamilyDeps,
  deceasedId: string,
  familyId: string,
  totalAmountMicroKalon: bigint,
): RecordInheritanceError | string {
  const family = state.families.get(familyId);
  if (family === undefined) {
    return 'family_not_found';
  }
  if (totalAmountMicroKalon < 0n) {
    return 'invalid_amount';
  }
  const eventId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const beneficiaries: string[] = [];
  for (let i = 0; i < family.memberIds.length; i = i + 1) {
    const memberId = family.memberIds[i];
    if (memberId === undefined) {
      continue;
    }
    if (memberId !== deceasedId) {
      beneficiaries.push(memberId);
    }
  }
  const inheritance: InheritanceEvent = {
    eventId,
    deceasedId,
    familyId,
    beneficiaries,
    totalAmountMicroKalon,
    occurredAt: now,
  };
  state.inheritances.push(inheritance);
  for (let i = 0; i < beneficiaries.length; i = i + 1) {
    const beneficiaryId = beneficiaries[i];
    if (beneficiaryId === undefined) {
      continue;
    }
    const member = state.members.get(beneficiaryId);
    if (member !== undefined) {
      const newLoyalty = Math.min(LOYALTY_MAX, member.loyaltyScore + LOYALTY_INHERITANCE_BONUS);
      const updatedMember: FamilyMember = {
        ...member,
        loyaltyScore: newLoyalty,
      };
      state.members.set(beneficiaryId, updatedMember);
    }
  }
  deps.logger.info('inheritance_recorded', {
    eventId,
    deceasedId,
    totalAmount: String(totalAmountMicroKalon),
  });
  return eventId;
}

function triggerConflict(
  state: FamilySystemState,
  deps: FamilyDeps,
  familyId: string,
  involvedMemberIds: string[],
  severityLevel: number,
): TriggerConflictError | string {
  const family = state.families.get(familyId);
  if (family === undefined) {
    return 'family_not_found';
  }
  if (severityLevel < 0 || severityLevel > 100) {
    return 'invalid_severity';
  }
  const conflictId = deps.idGenerator.next();
  const now = deps.clock.nowMicroseconds();
  const conflict: FamilyConflict = {
    conflictId,
    familyId,
    involvedMemberIds,
    severityLevel,
    startedAt: now,
    resolvedAt: undefined,
    resolution: undefined,
  };
  state.conflicts.set(conflictId, conflict);
  const updatedFamily: FamilyUnit = {
    ...family,
    conflictCount: family.conflictCount + 1,
  };
  state.families.set(familyId, updatedFamily);
  const loyaltyPenalty = Math.floor(severityLevel / 10);
  for (let i = 0; i < involvedMemberIds.length; i = i + 1) {
    const memberId = involvedMemberIds[i];
    if (memberId === undefined) {
      continue;
    }
    const member = state.members.get(memberId);
    if (member !== undefined) {
      const newLoyalty = Math.max(LOYALTY_MIN, member.loyaltyScore - loyaltyPenalty);
      const updatedMember: FamilyMember = {
        ...member,
        loyaltyScore: newLoyalty,
      };
      state.members.set(memberId, updatedMember);
    }
  }
  deps.logger.info('conflict_triggered', {
    conflictId,
    familyId,
    severityLevel: String(severityLevel),
  });
  return conflictId;
}

function getDevelopmentReport(
  state: FamilySystemState,
  childId: string,
): ChildhoodDevelopment | undefined {
  return state.developments.get(childId);
}

function getFamilyTree(state: FamilySystemState, familyId: string): FamilyUnit | undefined {
  return state.families.get(familyId);
}

function resolveConflict(
  state: FamilySystemState,
  deps: FamilyDeps,
  conflictId: string,
  resolution: string,
): ResolveConflictError | 'ok' {
  const conflict = state.conflicts.get(conflictId);
  if (conflict === undefined) {
    return 'conflict_not_found';
  }
  if (conflict.resolvedAt !== undefined) {
    return 'already_resolved';
  }
  const now = deps.clock.nowMicroseconds();
  const resolvedConflict: FamilyConflict = {
    ...conflict,
    resolvedAt: now,
    resolution,
  };
  state.conflicts.set(conflictId, resolvedConflict);
  const loyaltyBonus = Math.floor(conflict.severityLevel / 20);
  for (let i = 0; i < conflict.involvedMemberIds.length; i = i + 1) {
    const memberId = conflict.involvedMemberIds[i];
    if (memberId === undefined) {
      continue;
    }
    const member = state.members.get(memberId);
    if (member !== undefined) {
      const newLoyalty = Math.min(LOYALTY_MAX, member.loyaltyScore + loyaltyBonus);
      const updatedMember: FamilyMember = {
        ...member,
        loyaltyScore: newLoyalty,
      };
      state.members.set(memberId, updatedMember);
    }
  }
  deps.logger.info('conflict_resolved', { conflictId, resolution });
  return 'ok';
}

function getFamilyReport(state: FamilySystemState): FamilyReport {
  let totalMembers = 0;
  let maxAvgLoyalty = 0;
  let highestLoyaltyFamilyId: string | undefined = undefined;
  for (const family of state.families.values()) {
    totalMembers = totalMembers + family.memberIds.length;
    if (family.averageLoyalty > maxAvgLoyalty) {
      maxAvgLoyalty = family.averageLoyalty;
      highestLoyaltyFamilyId = family.familyId;
    }
  }
  const avgFamilySize = state.families.size > 0 ? totalMembers / state.families.size : 0;
  return {
    totalFamilies: state.families.size,
    totalMembers,
    averageFamilySize: avgFamilySize,
    totalConflicts: state.conflicts.size,
    totalInheritances: state.inheritances.length,
    highestLoyaltyFamily: highestLoyaltyFamilyId,
  };
}
