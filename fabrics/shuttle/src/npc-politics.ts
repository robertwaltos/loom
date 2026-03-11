/**
 * NPC Politics System — Political affiliation and faction influence tracking.
 *
 * NPCs hold political stances and may join factions. They contribute influence
 * to factions, cast votes on policy topics, and build political activity scores.
 * Factions track member count and aggregate influence.
 *
 * "Every dynasty's survival depends on who controls the Assembly."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcPoliticsClock = {
  now(): bigint;
};

export type NpcPoliticsIdGen = {
  generate(): string;
};

export type NpcPoliticsLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcPoliticsDeps = {
  readonly clock: NpcPoliticsClock;
  readonly idGen: NpcPoliticsIdGen;
  readonly logger: NpcPoliticsLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type FactionId = string;

export type PoliticsError =
  | 'npc-not-found'
  | 'faction-not-found'
  | 'already-registered'
  | 'already-affiliated'
  | 'not-affiliated'
  | 'invalid-influence';

export type PoliticalStance =
  | 'FAR_LEFT'
  | 'LEFT'
  | 'CENTER_LEFT'
  | 'CENTER'
  | 'CENTER_RIGHT'
  | 'RIGHT'
  | 'FAR_RIGHT';

export type PoliticalFaction = {
  readonly factionId: FactionId;
  readonly name: string;
  readonly stance: PoliticalStance;
  memberCount: number;
  influenceScore: number;
  readonly worldId: string;
};

export type NpcPoliticalProfile = {
  readonly npcId: NpcId;
  readonly stance: PoliticalStance;
  affiliatedFactionId: FactionId | null;
  influenceContributed: number;
  readonly politicalActivity: number;
};

export type PolicyVote = {
  readonly voteId: string;
  readonly npcId: NpcId;
  readonly factionId: FactionId | null;
  readonly topic: string;
  readonly support: boolean;
  readonly castAt: bigint;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcPoliticsState = {
  readonly deps: NpcPoliticsDeps;
  readonly profiles: Map<NpcId, NpcPoliticalProfile>;
  readonly factions: Map<FactionId, PoliticalFaction>;
  readonly votes: Map<NpcId, PolicyVote[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcPoliticsState(deps: NpcPoliticsDeps): NpcPoliticsState {
  return {
    deps,
    profiles: new Map(),
    factions: new Map(),
    votes: new Map(),
  };
}

// ============================================================================
// REGISTER NPC
// ============================================================================

export function registerNpc(
  state: NpcPoliticsState,
  npcId: NpcId,
  stance: PoliticalStance,
): { success: true } | { success: false; error: PoliticsError } {
  if (state.profiles.has(npcId)) return { success: false, error: 'already-registered' };
  const profile: NpcPoliticalProfile = {
    npcId,
    stance,
    affiliatedFactionId: null,
    influenceContributed: 0,
    politicalActivity: 0,
  };
  state.profiles.set(npcId, profile);
  state.votes.set(npcId, []);
  state.deps.logger.info('npc-politics: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// CREATE FACTION
// ============================================================================

export function createFaction(
  state: NpcPoliticsState,
  factionId: FactionId,
  name: string,
  stance: PoliticalStance,
  worldId: string,
): PoliticalFaction | PoliticsError {
  if (state.factions.has(factionId)) return 'already-registered';
  const faction: PoliticalFaction = {
    factionId,
    name,
    stance,
    memberCount: 0,
    influenceScore: 0,
    worldId,
  };
  state.factions.set(factionId, faction);
  state.deps.logger.info('npc-politics: created faction ' + factionId);
  return faction;
}

// ============================================================================
// JOIN FACTION
// ============================================================================

export function joinFaction(
  state: NpcPoliticsState,
  npcId: NpcId,
  factionId: FactionId,
): { success: true } | { success: false; error: PoliticsError } {
  const profile = state.profiles.get(npcId);
  if (profile === undefined) return { success: false, error: 'npc-not-found' };
  if (profile.affiliatedFactionId !== null) {
    return { success: false, error: 'already-affiliated' };
  }
  const faction = state.factions.get(factionId);
  if (faction === undefined) return { success: false, error: 'faction-not-found' };
  profile.affiliatedFactionId = factionId;
  faction.memberCount += 1;
  state.deps.logger.info('npc-politics: npc ' + npcId + ' joined faction ' + factionId);
  return { success: true };
}

// ============================================================================
// LEAVE FACTION
// ============================================================================

export function leaveFaction(
  state: NpcPoliticsState,
  npcId: NpcId,
): { success: true } | { success: false; error: PoliticsError } {
  const profile = state.profiles.get(npcId);
  if (profile === undefined) return { success: false, error: 'npc-not-found' };
  if (profile.affiliatedFactionId === null) return { success: false, error: 'not-affiliated' };
  const faction = state.factions.get(profile.affiliatedFactionId);
  if (faction !== undefined) faction.memberCount -= 1;
  profile.affiliatedFactionId = null;
  state.deps.logger.info('npc-politics: npc ' + npcId + ' left faction');
  return { success: true };
}

// ============================================================================
// CONTRIBUTE INFLUENCE
// ============================================================================

export function contributeInfluence(
  state: NpcPoliticsState,
  npcId: NpcId,
  amount: number,
): { success: true } | { success: false; error: PoliticsError } {
  const profile = state.profiles.get(npcId);
  if (profile === undefined) return { success: false, error: 'npc-not-found' };
  if (amount <= 0) return { success: false, error: 'invalid-influence' };
  if (profile.affiliatedFactionId === null) return { success: false, error: 'not-affiliated' };
  const faction = state.factions.get(profile.affiliatedFactionId);
  if (faction === undefined) return { success: false, error: 'faction-not-found' };
  profile.influenceContributed += amount;
  faction.influenceScore = Math.min(100, faction.influenceScore + amount);
  refreshPoliticalActivity(state, npcId, profile);
  return { success: true };
}

// ============================================================================
// CAST VOTE
// ============================================================================

export function castVote(
  state: NpcPoliticsState,
  npcId: NpcId,
  topic: string,
  support: boolean,
): PolicyVote {
  const profile = state.profiles.get(npcId);
  const vote: PolicyVote = {
    voteId: state.deps.idGen.generate(),
    npcId,
    factionId: profile?.affiliatedFactionId ?? null,
    topic,
    support,
    castAt: state.deps.clock.now(),
  };
  const npcVotes = state.votes.get(npcId) ?? [];
  npcVotes.push(vote);
  state.votes.set(npcId, npcVotes);
  if (profile !== undefined) refreshPoliticalActivity(state, npcId, profile);
  state.deps.logger.info('npc-politics: npc ' + npcId + ' voted on ' + topic);
  return vote;
}

// ============================================================================
// QUERIES
// ============================================================================

export function getNpcProfile(
  state: NpcPoliticsState,
  npcId: NpcId,
): NpcPoliticalProfile | undefined {
  return state.profiles.get(npcId);
}

export function getFaction(
  state: NpcPoliticsState,
  factionId: FactionId,
): PoliticalFaction | undefined {
  return state.factions.get(factionId);
}

export function listFactions(
  state: NpcPoliticsState,
  worldId?: string,
): ReadonlyArray<PoliticalFaction> {
  const all = Array.from(state.factions.values());
  if (worldId === undefined) return all;
  return all.filter((f) => f.worldId === worldId);
}

export function getVoteHistory(
  state: NpcPoliticsState,
  npcId: NpcId,
  limit: number,
): ReadonlyArray<PolicyVote> {
  const npcVotes = state.votes.get(npcId) ?? [];
  return npcVotes.slice(-limit);
}

// ============================================================================
// HELPERS
// ============================================================================

function refreshPoliticalActivity(
  state: NpcPoliticsState,
  npcId: NpcId,
  profile: NpcPoliticalProfile,
): void {
  const voteCount = state.votes.get(npcId)?.length ?? 0;
  const activity = Math.min(1, voteCount * 0.1 + profile.influenceContributed * 0.01);
  (profile as { politicalActivity: number }).politicalActivity = activity;
}

// ============================================================================
// SYSTEM INTERFACE
// ============================================================================

export type NpcPoliticsSystem = {
  registerNpc(
    npcId: NpcId,
    stance: PoliticalStance,
  ): { success: true } | { success: false; error: PoliticsError };
  createFaction(
    factionId: FactionId,
    name: string,
    stance: PoliticalStance,
    worldId: string,
  ): PoliticalFaction | PoliticsError;
  joinFaction(
    npcId: NpcId,
    factionId: FactionId,
  ): { success: true } | { success: false; error: PoliticsError };
  leaveFaction(npcId: NpcId): { success: true } | { success: false; error: PoliticsError };
  contributeInfluence(
    npcId: NpcId,
    amount: number,
  ): { success: true } | { success: false; error: PoliticsError };
  castVote(npcId: NpcId, topic: string, support: boolean): PolicyVote;
  getNpcProfile(npcId: NpcId): NpcPoliticalProfile | undefined;
  getFaction(factionId: FactionId): PoliticalFaction | undefined;
  listFactions(worldId?: string): ReadonlyArray<PoliticalFaction>;
  getVoteHistory(npcId: NpcId, limit: number): ReadonlyArray<PolicyVote>;
};

export function createNpcPoliticsSystem(deps: NpcPoliticsDeps): NpcPoliticsSystem {
  const state = createNpcPoliticsState(deps);
  return {
    registerNpc: (npcId, stance) => registerNpc(state, npcId, stance),
    createFaction: (factionId, name, stance, worldId) =>
      createFaction(state, factionId, name, stance, worldId),
    joinFaction: (npcId, factionId) => joinFaction(state, npcId, factionId),
    leaveFaction: (npcId) => leaveFaction(state, npcId),
    contributeInfluence: (npcId, amount) => contributeInfluence(state, npcId, amount),
    castVote: (npcId, topic, support) => castVote(state, npcId, topic, support),
    getNpcProfile: (npcId) => getNpcProfile(state, npcId),
    getFaction: (factionId) => getFaction(state, factionId),
    listFactions: (worldId) => listFactions(state, worldId),
    getVoteHistory: (npcId, limit) => getVoteHistory(state, npcId, limit),
  };
}
