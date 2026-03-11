// npc-government.ts — NPC political systems, leadership roles, policy decisions

interface GovClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface GovIdPort {
  readonly generate: () => string;
}

interface GovLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

export interface GovDeps {
  readonly clock: GovClockPort;
  readonly idGen: GovIdPort;
  readonly logger: GovLoggerPort;
}

export type GovernmentType = 'MONARCHY' | 'COUNCIL' | 'REPUBLIC' | 'THEOCRACY' | 'OLIGARCHY';

export type OfficeType =
  | 'MONARCH'
  | 'COUNCILOR'
  | 'PRESIDENT'
  | 'MINISTER'
  | 'JUDGE'
  | 'TREASURER'
  | 'GENERAL';

export interface PoliticalOffice {
  readonly officeId: string;
  readonly title: string;
  readonly type: OfficeType;
  readonly termLengthMicros: bigint | null;
  readonly responsibilities: ReadonlyArray<string>;
  readonly corruptionRisk: number;
}

export interface Incumbent {
  readonly incumbentId: string;
  readonly officeId: string;
  readonly npcId: string;
  readonly appointedAtMicros: bigint;
  readonly termExpiresAtMicros: bigint | null;
  readonly approvalRating: number;
  readonly corruptionLevel: number;
}

export interface Policy {
  readonly policyId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly enactedAtMicros: bigint;
  readonly expiresAtMicros: bigint | null;
  readonly supportLevel: number;
  readonly effects: Record<string, number>;
}

export interface Election {
  readonly electionId: string;
  readonly officeId: string;
  readonly scheduledAtMicros: bigint;
  readonly candidates: ReadonlyArray<string>;
  readonly votes: Record<string, number>;
  readonly winnerId: string | null;
  readonly completed: boolean;
}

export interface CorruptionEvent {
  readonly eventId: string;
  readonly incumbentId: string;
  readonly npcId: string;
  readonly severity: number;
  readonly description: string;
  readonly discoveredAtMicros: bigint;
  readonly penaltyApplied: boolean;
}

export interface Government {
  readonly governmentId: string;
  readonly worldId: string;
  readonly type: GovernmentType;
  readonly establishedAtMicros: bigint;
  readonly stability: number;
  readonly legitimacy: number;
  readonly offices: ReadonlyArray<PoliticalOffice>;
}

export interface GovernmentReport {
  readonly governmentId: string;
  readonly type: GovernmentType;
  readonly stability: number;
  readonly legitimacy: number;
  readonly activeIncumbents: number;
  readonly activePolicies: number;
  readonly corruptionEvents: number;
  readonly nextElectionMicros: bigint | null;
}

export interface NpcGovernmentModule {
  readonly establishGovernment: (
    worldId: string,
    type: GovernmentType,
  ) => string | { error: string };
  readonly addOffice: (governmentId: string, office: PoliticalOffice) => string | { error: string };
  readonly appointNpc: (
    governmentId: string,
    officeId: string,
    npcId: string,
  ) => string | { error: string };
  readonly holdElection: (
    governmentId: string,
    officeId: string,
    candidates: ReadonlyArray<string>,
  ) => Election | { error: string };
  readonly castVote: (electionId: string, candidateId: string) => string | { error: string };
  readonly finalizeElection: (electionId: string) => string | { error: string };
  readonly enactPolicy: (governmentId: string, policy: Policy) => string | { error: string };
  readonly recordCorruption: (
    incumbentId: string,
    severity: number,
    description: string,
  ) => CorruptionEvent | { error: string };
  readonly removeFromOffice: (incumbentId: string, reason: string) => string | { error: string };
  readonly getGovernmentReport: (governmentId: string) => GovernmentReport | { error: string };
  readonly triggerVoteOfConfidence: (incumbentId: string) => boolean | { error: string };
  readonly getIncumbent: (incumbentId: string) => Incumbent | { error: string };
  readonly updateApprovalRating: (incumbentId: string, delta: number) => number | { error: string };
  readonly expireTerms: (governmentId: string) => number;
}

interface ModuleState {
  readonly governments: Map<string, Government>;
  readonly offices: Map<string, PoliticalOffice>;
  readonly incumbents: Map<string, Incumbent>;
  readonly policies: Map<string, Policy>;
  readonly elections: Map<string, Election>;
  readonly corruptionEvents: Map<string, CorruptionEvent>;
  readonly governmentPolicies: Map<string, Set<string>>;
  readonly governmentIncumbents: Map<string, Set<string>>;
}

export function createNpcGovernmentModule(deps: GovDeps): NpcGovernmentModule {
  const state: ModuleState = {
    governments: new Map(),
    offices: new Map(),
    incumbents: new Map(),
    policies: new Map(),
    elections: new Map(),
    corruptionEvents: new Map(),
    governmentPolicies: new Map(),
    governmentIncumbents: new Map(),
  };

  return {
    establishGovernment: (worldId, type) => establishGovernment(state, deps, worldId, type),
    addOffice: (governmentId, office) => addOffice(state, deps, governmentId, office),
    appointNpc: (governmentId, officeId, npcId) =>
      appointNpc(state, deps, governmentId, officeId, npcId),
    holdElection: (governmentId, officeId, candidates) =>
      holdElection(state, deps, governmentId, officeId, candidates),
    castVote: (electionId, candidateId) => castVote(state, deps, electionId, candidateId),
    finalizeElection: (electionId) => finalizeElection(state, deps, electionId),
    enactPolicy: (governmentId, policy) => enactPolicy(state, deps, governmentId, policy),
    recordCorruption: (incumbentId, severity, description) =>
      recordCorruption(state, deps, incumbentId, severity, description),
    removeFromOffice: (incumbentId, reason) => removeFromOffice(state, deps, incumbentId, reason),
    getGovernmentReport: (governmentId) => getGovernmentReport(state, governmentId),
    triggerVoteOfConfidence: (incumbentId) => triggerVoteOfConfidence(state, deps, incumbentId),
    getIncumbent: (incumbentId) => getIncumbent(state, incumbentId),
    updateApprovalRating: (incumbentId, delta) =>
      updateApprovalRating(state, deps, incumbentId, delta),
    expireTerms: (governmentId) => expireTerms(state, deps, governmentId),
  };
}

function establishGovernment(
  state: ModuleState,
  deps: GovDeps,
  worldId: string,
  type: GovernmentType,
): string | { error: string } {
  if (worldId.length === 0) {
    return { error: 'INVALID_WORLD_ID' };
  }

  const governmentId = deps.idGen.generate();

  const government: Government = {
    governmentId,
    worldId,
    type,
    establishedAtMicros: deps.clock.nowMicroseconds(),
    stability: 0.5,
    legitimacy: 0.5,
    offices: [],
  };

  state.governments.set(governmentId, government);
  state.governmentPolicies.set(governmentId, new Set());
  state.governmentIncumbents.set(governmentId, new Set());

  deps.logger.info('government_established', { governmentId, worldId, type });

  return governmentId;
}

function addOffice(
  state: ModuleState,
  deps: GovDeps,
  governmentId: string,
  office: PoliticalOffice,
): string | { error: string } {
  const government = state.governments.get(governmentId);

  if (government === undefined) {
    return { error: 'GOVERNMENT_NOT_FOUND' };
  }

  if (office.corruptionRisk < 0 || office.corruptionRisk > 1) {
    return { error: 'INVALID_CORRUPTION_RISK' };
  }

  const existingOffice = government.offices.find((o) => o.officeId === office.officeId);
  if (existingOffice !== undefined) {
    return { error: 'OFFICE_ALREADY_EXISTS' };
  }

  const updated: Government = {
    ...government,
    offices: [...government.offices, office],
  };

  state.governments.set(governmentId, updated);
  state.offices.set(office.officeId, office);

  deps.logger.info('office_added', { governmentId, officeId: office.officeId });

  return office.officeId;
}

function appointNpc(
  state: ModuleState,
  deps: GovDeps,
  governmentId: string,
  officeId: string,
  npcId: string,
): string | { error: string } {
  const government = state.governments.get(governmentId);

  if (government === undefined) {
    return { error: 'GOVERNMENT_NOT_FOUND' };
  }

  const office = state.offices.get(officeId);

  if (office === undefined) {
    return { error: 'OFFICE_NOT_FOUND' };
  }

  const now = deps.clock.nowMicroseconds();
  const incumbentId = deps.idGen.generate();

  const incumbent: Incumbent = {
    incumbentId,
    officeId,
    npcId,
    appointedAtMicros: now,
    termExpiresAtMicros: office.termLengthMicros !== null ? now + office.termLengthMicros : null,
    approvalRating: 0.5,
    corruptionLevel: 0.0,
  };

  state.incumbents.set(incumbentId, incumbent);

  let govIncumbents = state.governmentIncumbents.get(governmentId);
  if (govIncumbents === undefined) {
    govIncumbents = new Set();
    state.governmentIncumbents.set(governmentId, govIncumbents);
  }
  govIncumbents.add(incumbentId);

  deps.logger.info('npc_appointed', { incumbentId, officeId, npcId });

  return incumbentId;
}

function holdElection(
  state: ModuleState,
  deps: GovDeps,
  governmentId: string,
  officeId: string,
  candidates: ReadonlyArray<string>,
): Election | { error: string } {
  const government = state.governments.get(governmentId);

  if (government === undefined) {
    return { error: 'GOVERNMENT_NOT_FOUND' };
  }

  const office = state.offices.get(officeId);

  if (office === undefined) {
    return { error: 'OFFICE_NOT_FOUND' };
  }

  if (candidates.length === 0) {
    return { error: 'NO_CANDIDATES' };
  }

  const electionId = deps.idGen.generate();

  const election: Election = {
    electionId,
    officeId,
    scheduledAtMicros: deps.clock.nowMicroseconds(),
    candidates,
    votes: {},
    winnerId: null,
    completed: false,
  };

  state.elections.set(electionId, election);

  deps.logger.info('election_held', { electionId, officeId, candidateCount: candidates.length });

  return election;
}

function castVote(
  state: ModuleState,
  deps: GovDeps,
  electionId: string,
  candidateId: string,
): string | { error: string } {
  const election = state.elections.get(electionId);

  if (election === undefined) {
    return { error: 'ELECTION_NOT_FOUND' };
  }

  if (election.completed) {
    return { error: 'ELECTION_ALREADY_COMPLETED' };
  }

  if (!election.candidates.includes(candidateId)) {
    return { error: 'INVALID_CANDIDATE' };
  }

  const currentVotes = election.votes[candidateId] ?? 0;
  const updatedVotes = { ...election.votes, [candidateId]: currentVotes + 1 };

  const updated: Election = {
    ...election,
    votes: updatedVotes,
  };

  state.elections.set(electionId, updated);

  deps.logger.info('vote_cast', { electionId, candidateId });

  return candidateId;
}

function finalizeElection(
  state: ModuleState,
  deps: GovDeps,
  electionId: string,
): string | { error: string } {
  const election = state.elections.get(electionId);

  if (election === undefined) {
    return { error: 'ELECTION_NOT_FOUND' };
  }

  if (election.completed) {
    return { error: 'ELECTION_ALREADY_COMPLETED' };
  }

  const winner = determineWinner(election.votes, election.candidates);

  if (winner === null) {
    return { error: 'NO_VOTES_CAST' };
  }

  const updated: Election = {
    ...election,
    winnerId: winner,
    completed: true,
  };

  state.elections.set(electionId, updated);

  deps.logger.info('election_finalized', { electionId, winnerId: winner });

  return winner;
}

function determineWinner(
  votes: Record<string, number>,
  candidates: ReadonlyArray<string>,
): string | null {
  let maxVotes = 0;
  let winner: string | null = null;

  for (const candidate of candidates) {
    const voteCount = votes[candidate] ?? 0;
    if (voteCount > maxVotes) {
      maxVotes = voteCount;
      winner = candidate;
    }
  }

  return winner;
}

function enactPolicy(
  state: ModuleState,
  deps: GovDeps,
  governmentId: string,
  policy: Policy,
): string | { error: string } {
  const government = state.governments.get(governmentId);

  if (government === undefined) {
    return { error: 'GOVERNMENT_NOT_FOUND' };
  }

  if (policy.supportLevel < 0 || policy.supportLevel > 1) {
    return { error: 'INVALID_SUPPORT_LEVEL' };
  }

  state.policies.set(policy.policyId, policy);

  let govPolicies = state.governmentPolicies.get(governmentId);
  if (govPolicies === undefined) {
    govPolicies = new Set();
    state.governmentPolicies.set(governmentId, govPolicies);
  }
  govPolicies.add(policy.policyId);

  deps.logger.info('policy_enacted', { governmentId, policyId: policy.policyId });

  return policy.policyId;
}

function recordCorruption(
  state: ModuleState,
  deps: GovDeps,
  incumbentId: string,
  severity: number,
  description: string,
): CorruptionEvent | { error: string } {
  const incumbent = state.incumbents.get(incumbentId);

  if (incumbent === undefined) {
    return { error: 'INCUMBENT_NOT_FOUND' };
  }

  if (severity < 0 || severity > 1) {
    return { error: 'INVALID_SEVERITY' };
  }

  const eventId = deps.idGen.generate();

  const event: CorruptionEvent = {
    eventId,
    incumbentId,
    npcId: incumbent.npcId,
    severity,
    description,
    discoveredAtMicros: deps.clock.nowMicroseconds(),
    penaltyApplied: false,
  };

  state.corruptionEvents.set(eventId, event);

  const updatedIncumbent: Incumbent = {
    ...incumbent,
    corruptionLevel: Math.min(1.0, incumbent.corruptionLevel + severity),
  };

  state.incumbents.set(incumbentId, updatedIncumbent);

  deps.logger.warn('corruption_recorded', { eventId, incumbentId, severity });

  return event;
}

function removeFromOffice(
  state: ModuleState,
  deps: GovDeps,
  incumbentId: string,
  reason: string,
): string | { error: string } {
  const incumbent = state.incumbents.get(incumbentId);

  if (incumbent === undefined) {
    return { error: 'INCUMBENT_NOT_FOUND' };
  }

  state.incumbents.delete(incumbentId);

  for (const [govId, incSet] of state.governmentIncumbents.entries()) {
    if (incSet.has(incumbentId)) {
      incSet.delete(incumbentId);
    }
  }

  deps.logger.info('incumbent_removed', { incumbentId, reason });

  return incumbentId;
}

function getGovernmentReport(
  state: ModuleState,
  governmentId: string,
): GovernmentReport | { error: string } {
  const government = state.governments.get(governmentId);

  if (government === undefined) {
    return { error: 'GOVERNMENT_NOT_FOUND' };
  }

  const incumbentSet = state.governmentIncumbents.get(governmentId);
  const activeIncumbents = incumbentSet !== undefined ? incumbentSet.size : 0;

  const policySet = state.governmentPolicies.get(governmentId);
  const activePolicies = policySet !== undefined ? policySet.size : 0;

  let corruptionCount = 0;
  for (const event of state.corruptionEvents.values()) {
    const incumbent = state.incumbents.get(event.incumbentId);
    if (incumbent !== undefined && incumbentSet?.has(event.incumbentId)) {
      corruptionCount = corruptionCount + 1;
    }
  }

  let nextElectionMicros: bigint | null = null;
  for (const election of state.elections.values()) {
    if (!election.completed) {
      if (nextElectionMicros === null || election.scheduledAtMicros < nextElectionMicros) {
        nextElectionMicros = election.scheduledAtMicros;
      }
    }
  }

  return {
    governmentId,
    type: government.type,
    stability: government.stability,
    legitimacy: government.legitimacy,
    activeIncumbents,
    activePolicies,
    corruptionEvents: corruptionCount,
    nextElectionMicros,
  };
}

function triggerVoteOfConfidence(
  state: ModuleState,
  deps: GovDeps,
  incumbentId: string,
): boolean | { error: string } {
  const incumbent = state.incumbents.get(incumbentId);

  if (incumbent === undefined) {
    return { error: 'INCUMBENT_NOT_FOUND' };
  }

  const threshold = 0.3;
  const passed = incumbent.approvalRating >= threshold;

  deps.logger.info('vote_of_confidence', { incumbentId, passed, rating: incumbent.approvalRating });

  return passed;
}

function getIncumbent(state: ModuleState, incumbentId: string): Incumbent | { error: string } {
  const incumbent = state.incumbents.get(incumbentId);

  if (incumbent === undefined) {
    return { error: 'INCUMBENT_NOT_FOUND' };
  }

  return incumbent;
}

function updateApprovalRating(
  state: ModuleState,
  deps: GovDeps,
  incumbentId: string,
  delta: number,
): number | { error: string } {
  const incumbent = state.incumbents.get(incumbentId);

  if (incumbent === undefined) {
    return { error: 'INCUMBENT_NOT_FOUND' };
  }

  const newRating = Math.max(0, Math.min(1, incumbent.approvalRating + delta));

  const updated: Incumbent = {
    ...incumbent,
    approvalRating: newRating,
  };

  state.incumbents.set(incumbentId, updated);

  deps.logger.info('approval_rating_updated', { incumbentId, rating: newRating });

  return newRating;
}

function expireTerms(state: ModuleState, deps: GovDeps, governmentId: string): number {
  const incumbentSet = state.governmentIncumbents.get(governmentId);

  if (incumbentSet === undefined) {
    return 0;
  }

  const now = deps.clock.nowMicroseconds();
  let expiredCount = 0;

  for (const incumbentId of incumbentSet) {
    const incumbent = state.incumbents.get(incumbentId);

    if (incumbent === undefined) {
      continue;
    }

    if (incumbent.termExpiresAtMicros === null) {
      continue;
    }

    if (now >= incumbent.termExpiresAtMicros) {
      state.incumbents.delete(incumbentId);
      incumbentSet.delete(incumbentId);
      expiredCount = expiredCount + 1;
    }
  }

  if (expiredCount > 0) {
    deps.logger.info('terms_expired', { governmentId, count: expiredCount });
  }

  return expiredCount;
}
