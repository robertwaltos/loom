/**
 * mentorship-engine.ts — Mentor-protege relationship system.
 *
 * Pairs experienced dynasties with newer ones for guided development.
 * Mentors build reputation through successful pairings. Proteges
 * graduate when they meet defined criteria thresholds. Both parties
 * receive KALON rewards (bigint micro-KALON) upon graduation.
 *
 * Mentorship Lifecycle:
 *   PENDING    -> Mentor invited, awaiting protege acceptance
 *   ACTIVE     -> Both parties engaged, progress tracked
 *   GRADUATED  -> Protege met graduation criteria, rewards distributed
 *   DISSOLVED  -> Relationship ended early by either party
 */

// ── Ports ────────────────────────────────────────────────────────

export interface MentorshipClock {
  readonly nowMicroseconds: () => number;
}

export interface MentorshipIdGenerator {
  readonly generate: () => string;
}

export interface MentorshipNotificationPort {
  readonly notify: (dynastyId: string, event: MentorshipEvent) => void;
}

export interface MentorshipEngineDeps {
  readonly clock: MentorshipClock;
  readonly idGenerator: MentorshipIdGenerator;
  readonly notifications: MentorshipNotificationPort;
}

// ── Types ────────────────────────────────────────────────────────

export type MentorshipStatus = 'PENDING' | 'ACTIVE' | 'GRADUATED' | 'DISSOLVED';

export type MentorshipEventKind =
  | 'PAIRING_CREATED'
  | 'PAIRING_ACCEPTED'
  | 'PROGRESS_UPDATED'
  | 'GRADUATED'
  | 'DISSOLVED';

export interface MentorshipEvent {
  readonly kind: MentorshipEventKind;
  readonly pairingId: string;
  readonly dynastyId: string;
  readonly timestamp: number;
}

export interface GraduationCriteria {
  readonly achievementsRequired: number;
  readonly questsCompleted: number;
  readonly reputationRequired: number;
}

export interface ProtegeProgress {
  readonly achievementsEarned: number;
  readonly questsCompleted: number;
  readonly reputationEarned: number;
}

export interface MentorshipPairing {
  readonly pairingId: string;
  readonly mentorId: string;
  readonly protegeId: string;
  readonly status: MentorshipStatus;
  readonly criteria: GraduationCriteria;
  readonly progress: ProtegeProgress;
  readonly mentorRewardMicroKalon: bigint;
  readonly protegeRewardMicroKalon: bigint;
  readonly createdAt: number;
  readonly acceptedAt: number | null;
  readonly completedAt: number | null;
}

export interface MentorProfile {
  readonly dynastyId: string;
  readonly reputation: number;
  readonly totalPairings: number;
  readonly successfulGraduations: number;
  readonly totalRewardsEarned: bigint;
  readonly activePairings: number;
  readonly registeredAt: number;
}

export interface CreatePairingParams {
  readonly mentorId: string;
  readonly protegeId: string;
  readonly criteria: GraduationCriteria;
  readonly mentorRewardMicroKalon: bigint;
  readonly protegeRewardMicroKalon: bigint;
}

export interface MentorshipEngineStats {
  readonly totalMentors: number;
  readonly totalActivePairings: number;
  readonly totalGraduations: number;
  readonly totalDissolutions: number;
  readonly totalRewardsDistributed: bigint;
}

export interface MentorshipEngine {
  readonly registerMentor: (dynastyId: string) => MentorProfile;
  readonly getMentor: (dynastyId: string) => MentorProfile | undefined;
  readonly createPairing: (params: CreatePairingParams) => MentorshipPairing;
  readonly acceptPairing: (pairingId: string) => MentorshipPairing;
  readonly updateProgress: (
    pairingId: string,
    progress: Partial<ProtegeProgress>,
  ) => MentorshipPairing;
  readonly checkGraduation: (pairingId: string) => MentorshipPairing;
  readonly dissolvePairing: (pairingId: string) => MentorshipPairing;
  readonly getPairing: (pairingId: string) => MentorshipPairing | undefined;
  readonly listByMentor: (mentorId: string) => readonly MentorshipPairing[];
  readonly listByProtege: (protegeId: string) => readonly MentorshipPairing[];
  readonly getLeaderboard: (limit: number) => readonly MentorProfile[];
  readonly getStats: () => MentorshipEngineStats;
}

// ── Constants ────────────────────────────────────────────────────

export const GRADUATION_REPUTATION_BONUS = 50;
export const MAX_ACTIVE_PAIRINGS = 3;

// ── State ────────────────────────────────────────────────────────

interface MutableMentorProfile {
  readonly dynastyId: string;
  reputation: number;
  totalPairings: number;
  successfulGraduations: number;
  totalRewardsEarned: bigint;
  activePairings: number;
  readonly registeredAt: number;
}

interface MutablePairing {
  readonly pairingId: string;
  readonly mentorId: string;
  readonly protegeId: string;
  status: MentorshipStatus;
  readonly criteria: GraduationCriteria;
  readonly progress: MutableProgress;
  readonly mentorRewardMicroKalon: bigint;
  readonly protegeRewardMicroKalon: bigint;
  readonly createdAt: number;
  acceptedAt: number | null;
  completedAt: number | null;
}

interface MutableProgress {
  achievementsEarned: number;
  questsCompleted: number;
  reputationEarned: number;
}

interface EngineState {
  readonly deps: MentorshipEngineDeps;
  readonly mentors: Map<string, MutableMentorProfile>;
  readonly pairings: Map<string, MutablePairing>;
  readonly mentorPairings: Map<string, Set<string>>;
  readonly protegePairings: Map<string, Set<string>>;
  totalGraduations: number;
  totalDissolutions: number;
  totalRewardsDistributed: bigint;
}

// ── Helpers ──────────────────────────────────────────────────────

function profileToReadonly(p: MutableMentorProfile): MentorProfile {
  return {
    dynastyId: p.dynastyId,
    reputation: p.reputation,
    totalPairings: p.totalPairings,
    successfulGraduations: p.successfulGraduations,
    totalRewardsEarned: p.totalRewardsEarned,
    activePairings: p.activePairings,
    registeredAt: p.registeredAt,
  };
}

function pairingToReadonly(p: MutablePairing): MentorshipPairing {
  return {
    pairingId: p.pairingId,
    mentorId: p.mentorId,
    protegeId: p.protegeId,
    status: p.status,
    criteria: p.criteria,
    progress: { ...p.progress },
    mentorRewardMicroKalon: p.mentorRewardMicroKalon,
    protegeRewardMicroKalon: p.protegeRewardMicroKalon,
    createdAt: p.createdAt,
    acceptedAt: p.acceptedAt,
    completedAt: p.completedAt,
  };
}

function requirePairing(state: EngineState, pairingId: string): MutablePairing {
  const p = state.pairings.get(pairingId);
  if (!p) throw new Error('Pairing ' + pairingId + ' not found');
  return p;
}

function requireMentor(state: EngineState, mentorId: string): MutableMentorProfile {
  const m = state.mentors.get(mentorId);
  if (!m) throw new Error('Mentor ' + mentorId + ' not registered');
  return m;
}

function addToSet(map: Map<string, Set<string>>, key: string, value: string): void {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(value);
}

function emitEvent(
  state: EngineState,
  kind: MentorshipEventKind,
  pairingId: string,
  dynastyId: string,
): void {
  state.deps.notifications.notify(dynastyId, {
    kind,
    pairingId,
    dynastyId,
    timestamp: state.deps.clock.nowMicroseconds(),
  });
}

function emitToBoth(state: EngineState, kind: MentorshipEventKind, pairing: MutablePairing): void {
  emitEvent(state, kind, pairing.pairingId, pairing.mentorId);
  emitEvent(state, kind, pairing.pairingId, pairing.protegeId);
}

// ── Operations ───────────────────────────────────────────────────

function registerMentorImpl(state: EngineState, dynastyId: string): MentorProfile {
  if (state.mentors.has(dynastyId)) {
    throw new Error('Dynasty ' + dynastyId + ' is already a registered mentor');
  }
  const profile: MutableMentorProfile = {
    dynastyId,
    reputation: 0,
    totalPairings: 0,
    successfulGraduations: 0,
    totalRewardsEarned: 0n,
    activePairings: 0,
    registeredAt: state.deps.clock.nowMicroseconds(),
  };
  state.mentors.set(dynastyId, profile);
  return profileToReadonly(profile);
}

function createPairingImpl(state: EngineState, params: CreatePairingParams): MentorshipPairing {
  const mentor = requireMentor(state, params.mentorId);
  if (params.mentorId === params.protegeId) {
    throw new Error('A dynasty cannot mentor itself');
  }
  if (mentor.activePairings >= MAX_ACTIVE_PAIRINGS) {
    throw new Error('Mentor has reached maximum active pairings');
  }
  validateCriteria(params.criteria);
  const pairing = buildPairing(state, params);
  state.pairings.set(pairing.pairingId, pairing);
  addToSet(state.mentorPairings, params.mentorId, pairing.pairingId);
  addToSet(state.protegePairings, params.protegeId, pairing.pairingId);
  mentor.totalPairings += 1;
  emitToBoth(state, 'PAIRING_CREATED', pairing);
  return pairingToReadonly(pairing);
}

function validateCriteria(criteria: GraduationCriteria): void {
  if (criteria.achievementsRequired < 0) {
    throw new Error('Achievement requirement must be non-negative');
  }
  if (criteria.questsCompleted < 0) {
    throw new Error('Quest requirement must be non-negative');
  }
  if (criteria.reputationRequired < 0) {
    throw new Error('Reputation requirement must be non-negative');
  }
}

function buildPairing(state: EngineState, params: CreatePairingParams): MutablePairing {
  return {
    pairingId: state.deps.idGenerator.generate(),
    mentorId: params.mentorId,
    protegeId: params.protegeId,
    status: 'PENDING',
    criteria: params.criteria,
    progress: { achievementsEarned: 0, questsCompleted: 0, reputationEarned: 0 },
    mentorRewardMicroKalon: params.mentorRewardMicroKalon,
    protegeRewardMicroKalon: params.protegeRewardMicroKalon,
    createdAt: state.deps.clock.nowMicroseconds(),
    acceptedAt: null,
    completedAt: null,
  };
}

function acceptPairingImpl(state: EngineState, pairingId: string): MentorshipPairing {
  const pairing = requirePairing(state, pairingId);
  if (pairing.status !== 'PENDING') {
    throw new Error('Pairing ' + pairingId + ' is not pending');
  }
  pairing.status = 'ACTIVE';
  pairing.acceptedAt = state.deps.clock.nowMicroseconds();
  const mentor = state.mentors.get(pairing.mentorId);
  if (mentor) mentor.activePairings += 1;
  emitToBoth(state, 'PAIRING_ACCEPTED', pairing);
  return pairingToReadonly(pairing);
}

function updateProgressImpl(
  state: EngineState,
  pairingId: string,
  progress: Partial<ProtegeProgress>,
): MentorshipPairing {
  const pairing = requirePairing(state, pairingId);
  if (pairing.status !== 'ACTIVE') {
    throw new Error('Can only update progress on active pairings');
  }
  applyProgress(pairing.progress, progress);
  emitEvent(state, 'PROGRESS_UPDATED', pairingId, pairing.protegeId);
  return pairingToReadonly(pairing);
}

function applyProgress(current: MutableProgress, update: Partial<ProtegeProgress>): void {
  if (update.achievementsEarned !== undefined) {
    current.achievementsEarned = update.achievementsEarned;
  }
  if (update.questsCompleted !== undefined) {
    current.questsCompleted = update.questsCompleted;
  }
  if (update.reputationEarned !== undefined) {
    current.reputationEarned = update.reputationEarned;
  }
}

function checkGraduationImpl(state: EngineState, pairingId: string): MentorshipPairing {
  const pairing = requirePairing(state, pairingId);
  if (pairing.status !== 'ACTIVE') return pairingToReadonly(pairing);
  if (!meetsGraduationCriteria(pairing)) return pairingToReadonly(pairing);
  graduatePairing(state, pairing);
  return pairingToReadonly(pairing);
}

function meetsGraduationCriteria(pairing: MutablePairing): boolean {
  const c = pairing.criteria;
  const p = pairing.progress;
  if (p.achievementsEarned < c.achievementsRequired) return false;
  if (p.questsCompleted < c.questsCompleted) return false;
  if (p.reputationEarned < c.reputationRequired) return false;
  return true;
}

function graduatePairing(state: EngineState, pairing: MutablePairing): void {
  pairing.status = 'GRADUATED';
  pairing.completedAt = state.deps.clock.nowMicroseconds();
  state.totalGraduations += 1;
  const totalReward = pairing.mentorRewardMicroKalon + pairing.protegeRewardMicroKalon;
  state.totalRewardsDistributed += totalReward;
  updateMentorOnGraduation(state, pairing);
  emitToBoth(state, 'GRADUATED', pairing);
}

function updateMentorOnGraduation(state: EngineState, pairing: MutablePairing): void {
  const mentor = state.mentors.get(pairing.mentorId);
  if (!mentor) return;
  mentor.successfulGraduations += 1;
  mentor.activePairings = Math.max(0, mentor.activePairings - 1);
  mentor.reputation += GRADUATION_REPUTATION_BONUS;
  mentor.totalRewardsEarned += pairing.mentorRewardMicroKalon;
}

function dissolvePairingImpl(state: EngineState, pairingId: string): MentorshipPairing {
  const pairing = requirePairing(state, pairingId);
  if (pairing.status !== 'ACTIVE' && pairing.status !== 'PENDING') {
    throw new Error('Can only dissolve active or pending pairings');
  }
  const wasActive = pairing.status === 'ACTIVE';
  pairing.status = 'DISSOLVED';
  pairing.completedAt = state.deps.clock.nowMicroseconds();
  state.totalDissolutions += 1;
  if (wasActive) {
    const mentor = state.mentors.get(pairing.mentorId);
    if (mentor) mentor.activePairings = Math.max(0, mentor.activePairings - 1);
  }
  emitToBoth(state, 'DISSOLVED', pairing);
  return pairingToReadonly(pairing);
}

// ── Queries ──────────────────────────────────────────────────────

function listByMentorImpl(state: EngineState, mentorId: string): readonly MentorshipPairing[] {
  const ids = state.mentorPairings.get(mentorId);
  if (!ids) return [];
  return collectPairings(state, ids);
}

function listByProtegeImpl(state: EngineState, protegeId: string): readonly MentorshipPairing[] {
  const ids = state.protegePairings.get(protegeId);
  if (!ids) return [];
  return collectPairings(state, ids);
}

function collectPairings(state: EngineState, ids: Set<string>): MentorshipPairing[] {
  const result: MentorshipPairing[] = [];
  for (const id of ids) {
    const p = state.pairings.get(id);
    if (p) result.push(pairingToReadonly(p));
  }
  return result;
}

function getLeaderboardImpl(state: EngineState, limit: number): readonly MentorProfile[] {
  const all = Array.from(state.mentors.values());
  all.sort(compareMentors);
  return all.slice(0, limit).map(profileToReadonly);
}

function compareMentors(a: MutableMentorProfile, b: MutableMentorProfile): number {
  if (b.reputation !== a.reputation) return b.reputation - a.reputation;
  return b.successfulGraduations - a.successfulGraduations;
}

function getStatsImpl(state: EngineState): MentorshipEngineStats {
  let activePairings = 0;
  for (const p of state.pairings.values()) {
    if (p.status === 'ACTIVE') activePairings += 1;
  }
  return {
    totalMentors: state.mentors.size,
    totalActivePairings: activePairings,
    totalGraduations: state.totalGraduations,
    totalDissolutions: state.totalDissolutions,
    totalRewardsDistributed: state.totalRewardsDistributed,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function buildInitialState(deps: MentorshipEngineDeps): EngineState {
  return {
    deps,
    mentors: new Map(),
    pairings: new Map(),
    mentorPairings: new Map(),
    protegePairings: new Map(),
    totalGraduations: 0,
    totalDissolutions: 0,
    totalRewardsDistributed: 0n,
  };
}

function getMentorImpl(state: EngineState, did: string): MentorProfile | undefined {
  const m = state.mentors.get(did);
  return m ? profileToReadonly(m) : undefined;
}

function getPairingImpl(state: EngineState, pid: string): MentorshipPairing | undefined {
  const p = state.pairings.get(pid);
  return p ? pairingToReadonly(p) : undefined;
}

function createMentorshipEngine(deps: MentorshipEngineDeps): MentorshipEngine {
  const state = buildInitialState(deps);
  return {
    registerMentor: (did) => registerMentorImpl(state, did),
    getMentor: (did) => getMentorImpl(state, did),
    createPairing: (p) => createPairingImpl(state, p),
    acceptPairing: (pid) => acceptPairingImpl(state, pid),
    updateProgress: (pid, prog) => updateProgressImpl(state, pid, prog),
    checkGraduation: (pid) => checkGraduationImpl(state, pid),
    dissolvePairing: (pid) => dissolvePairingImpl(state, pid),
    getPairing: (pid) => getPairingImpl(state, pid),
    listByMentor: (mid) => listByMentorImpl(state, mid),
    listByProtege: (pid) => listByProtegeImpl(state, pid),
    getLeaderboard: (limit) => getLeaderboardImpl(state, limit),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createMentorshipEngine };
