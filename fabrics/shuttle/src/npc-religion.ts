// npc-religion.ts — NPC belief systems, religious factions, ritual behavior

interface RelClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface RelIdPort {
  readonly generate: () => string;
}

interface RelLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

export interface RelDeps {
  readonly clock: RelClockPort;
  readonly idGen: RelIdPort;
  readonly logger: RelLoggerPort;
}

export interface Belief {
  readonly beliefId: string;
  readonly name: string;
  readonly description: string;
  readonly strength: number;
  readonly category: string;
}

export interface Ritual {
  readonly ritualId: string;
  readonly name: string;
  readonly description: string;
  readonly frequencyMicros: bigint;
  readonly lastPerformedAtMicros: bigint | null;
  readonly participantCount: number;
  readonly effects: Record<string, number>;
}

export interface HolyDay {
  readonly holyDayId: string;
  readonly name: string;
  readonly description: string;
  readonly dateOffsetMicros: bigint;
  readonly durationMicros: bigint;
  readonly significance: number;
}

export interface Religion {
  readonly religionId: string;
  readonly name: string;
  readonly foundedAtMicros: bigint;
  readonly founderNpcId: string | null;
  readonly beliefs: ReadonlyArray<Belief>;
  readonly rituals: ReadonlyArray<Ritual>;
  readonly holyDays: ReadonlyArray<HolyDay>;
  readonly followerCount: number;
}

export interface ReligiousFaction {
  readonly factionId: string;
  readonly religionId: string;
  readonly name: string;
  readonly leaderNpcId: string | null;
  readonly memberCount: number;
  readonly influence: number;
  readonly orthodoxy: number;
}

export interface ConversionEvent {
  readonly eventId: string;
  readonly npcId: string;
  readonly fromReligionId: string | null;
  readonly toReligionId: string;
  readonly convertedAtMicros: bigint;
  readonly reason: string;
}

export interface ReligiousTension {
  readonly tensionId: string;
  readonly religionId1: string;
  readonly religionId2: string;
  readonly level: number;
  readonly lastIncidentMicros: bigint | null;
  readonly conflicts: number;
}

export interface ReligionReport {
  readonly religionId: string;
  readonly name: string;
  readonly followerCount: number;
  readonly factionCount: number;
  readonly activeRituals: number;
  readonly upcomingHolyDays: number;
  readonly conversionRate: number;
  readonly totalTension: number;
}

export interface NpcReligionModule {
  readonly foundReligion: (name: string, founderNpcId: string | null) => string | { error: string };
  readonly addBelief: (religionId: string, belief: Belief) => string | { error: string };
  readonly addRitual: (religionId: string, ritual: Ritual) => string | { error: string };
  readonly addHolyDay: (religionId: string, holyDay: HolyDay) => string | { error: string };
  readonly createFaction: (
    religionId: string,
    name: string,
    leaderNpcId: string | null,
  ) => string | { error: string };
  readonly convertNpc: (
    npcId: string,
    toReligionId: string,
    fromReligionId: string | null,
    reason: string,
  ) => ConversionEvent | { error: string };
  readonly scheduleRitual: (religionId: string, ritualId: string) => string | { error: string };
  readonly performRitual: (
    ritualId: string,
    participantCount: number,
  ) => string | { error: string };
  readonly measureTension: (religionId1: string, religionId2: string) => number | { error: string };
  readonly recordConflict: (
    religionId1: string,
    religionId2: string,
    severity: number,
  ) => string | { error: string };
  readonly getReligionReport: (religionId: string) => ReligionReport | { error: string };
  readonly declareHolyDay: (religionId: string, holyDayId: string) => HolyDay | { error: string };
  readonly getReligion: (religionId: string) => Religion | { error: string };
  readonly getFaction: (factionId: string) => ReligiousFaction | { error: string };
  readonly updateFollowerCount: (religionId: string, delta: number) => number | { error: string };
}

interface ModuleState {
  readonly religions: Map<string, Religion>;
  readonly factions: Map<string, ReligiousFaction>;
  readonly conversions: Map<string, ConversionEvent>;
  readonly tensions: Map<string, ReligiousTension>;
  readonly npcReligions: Map<string, string>;
  readonly religionFactions: Map<string, Set<string>>;
}

export function createNpcReligionModule(deps: RelDeps): NpcReligionModule {
  const state: ModuleState = {
    religions: new Map(),
    factions: new Map(),
    conversions: new Map(),
    tensions: new Map(),
    npcReligions: new Map(),
    religionFactions: new Map(),
  };

  return {
    foundReligion: (name, founderNpcId) => foundReligion(state, deps, name, founderNpcId),
    addBelief: (religionId, belief) => addBelief(state, deps, religionId, belief),
    addRitual: (religionId, ritual) => addRitual(state, deps, religionId, ritual),
    addHolyDay: (religionId, holyDay) => addHolyDay(state, deps, religionId, holyDay),
    createFaction: (religionId, name, leaderNpcId) =>
      createFaction(state, deps, religionId, name, leaderNpcId),
    convertNpc: (npcId, toReligionId, fromReligionId, reason) =>
      convertNpc(state, deps, npcId, toReligionId, fromReligionId, reason),
    scheduleRitual: (religionId, ritualId) => scheduleRitual(state, deps, religionId, ritualId),
    performRitual: (ritualId, participantCount) =>
      performRitual(state, deps, ritualId, participantCount),
    measureTension: (religionId1, religionId2) => measureTension(state, religionId1, religionId2),
    recordConflict: (religionId1, religionId2, severity) =>
      recordConflict(state, deps, religionId1, religionId2, severity),
    getReligionReport: (religionId) => getReligionReport(state, deps, religionId),
    declareHolyDay: (religionId, holyDayId) => declareHolyDay(state, religionId, holyDayId),
    getReligion: (religionId) => getReligion(state, religionId),
    getFaction: (factionId) => getFaction(state, factionId),
    updateFollowerCount: (religionId, delta) => updateFollowerCount(state, deps, religionId, delta),
  };
}

function foundReligion(
  state: ModuleState,
  deps: RelDeps,
  name: string,
  founderNpcId: string | null,
): string | { error: string } {
  if (name.length === 0) {
    return { error: 'INVALID_NAME' };
  }

  const religionId = deps.idGen.generate();

  const religion: Religion = {
    religionId,
    name,
    foundedAtMicros: deps.clock.nowMicroseconds(),
    founderNpcId,
    beliefs: [],
    rituals: [],
    holyDays: [],
    followerCount: 0,
  };

  state.religions.set(religionId, religion);
  state.religionFactions.set(religionId, new Set());

  deps.logger.info('religion_founded', { religionId, name, founderNpcId });

  return religionId;
}

function addBelief(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
  belief: Belief,
): string | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  if (belief.strength < 0 || belief.strength > 1) {
    return { error: 'INVALID_BELIEF_STRENGTH' };
  }

  const existingBelief = religion.beliefs.find((b) => b.beliefId === belief.beliefId);
  if (existingBelief !== undefined) {
    return { error: 'BELIEF_ALREADY_EXISTS' };
  }

  const updated: Religion = {
    ...religion,
    beliefs: [...religion.beliefs, belief],
  };

  state.religions.set(religionId, updated);

  deps.logger.info('belief_added', { religionId, beliefId: belief.beliefId });

  return belief.beliefId;
}

function addRitual(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
  ritual: Ritual,
): string | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  if (ritual.frequencyMicros <= 0n) {
    return { error: 'INVALID_FREQUENCY' };
  }

  const existingRitual = religion.rituals.find((r) => r.ritualId === ritual.ritualId);
  if (existingRitual !== undefined) {
    return { error: 'RITUAL_ALREADY_EXISTS' };
  }

  const updated: Religion = {
    ...religion,
    rituals: [...religion.rituals, ritual],
  };

  state.religions.set(religionId, updated);

  deps.logger.info('ritual_added', { religionId, ritualId: ritual.ritualId });

  return ritual.ritualId;
}

function addHolyDay(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
  holyDay: HolyDay,
): string | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  if (holyDay.significance < 0 || holyDay.significance > 1) {
    return { error: 'INVALID_SIGNIFICANCE' };
  }

  const existingHolyDay = religion.holyDays.find((h) => h.holyDayId === holyDay.holyDayId);
  if (existingHolyDay !== undefined) {
    return { error: 'HOLY_DAY_ALREADY_EXISTS' };
  }

  const updated: Religion = {
    ...religion,
    holyDays: [...religion.holyDays, holyDay],
  };

  state.religions.set(religionId, updated);

  deps.logger.info('holy_day_added', { religionId, holyDayId: holyDay.holyDayId });

  return holyDay.holyDayId;
}

function createFaction(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
  name: string,
  leaderNpcId: string | null,
): string | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  if (name.length === 0) {
    return { error: 'INVALID_NAME' };
  }

  const factionId = deps.idGen.generate();

  const faction: ReligiousFaction = {
    factionId,
    religionId,
    name,
    leaderNpcId,
    memberCount: 0,
    influence: 0.0,
    orthodoxy: 0.5,
  };

  state.factions.set(factionId, faction);

  let factions = state.religionFactions.get(religionId);
  if (factions === undefined) {
    factions = new Set();
    state.religionFactions.set(religionId, factions);
  }
  factions.add(factionId);

  deps.logger.info('faction_created', { factionId, religionId, name });

  return factionId;
}

function convertNpc(
  state: ModuleState,
  deps: RelDeps,
  npcId: string,
  toReligionId: string,
  fromReligionId: string | null,
  reason: string,
): ConversionEvent | { error: string } {
  const toReligion = state.religions.get(toReligionId);

  if (toReligion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  if (fromReligionId !== null) {
    const fromReligion = state.religions.get(fromReligionId);
    if (fromReligion === undefined) {
      return { error: 'FROM_RELIGION_NOT_FOUND' };
    }
  }

  const eventId = deps.idGen.generate();

  const event: ConversionEvent = {
    eventId,
    npcId,
    fromReligionId,
    toReligionId,
    convertedAtMicros: deps.clock.nowMicroseconds(),
    reason,
  };

  state.conversions.set(eventId, event);
  state.npcReligions.set(npcId, toReligionId);

  const updatedToReligion: Religion = {
    ...toReligion,
    followerCount: toReligion.followerCount + 1,
  };

  state.religions.set(toReligionId, updatedToReligion);

  if (fromReligionId !== null) {
    const fromReligion = state.religions.get(fromReligionId);
    if (fromReligion !== undefined) {
      const updatedFromReligion: Religion = {
        ...fromReligion,
        followerCount: Math.max(0, fromReligion.followerCount - 1),
      };
      state.religions.set(fromReligionId, updatedFromReligion);
    }
  }

  deps.logger.info('npc_converted', { eventId, npcId, toReligionId });

  return event;
}

function scheduleRitual(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
  ritualId: string,
): string | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  const ritual = religion.rituals.find((r) => r.ritualId === ritualId);

  if (ritual === undefined) {
    return { error: 'RITUAL_NOT_FOUND' };
  }

  deps.logger.info('ritual_scheduled', { religionId, ritualId });

  return ritualId;
}

function performRitual(
  state: ModuleState,
  deps: RelDeps,
  ritualId: string,
  participantCount: number,
): string | { error: string } {
  let foundReligion: Religion | undefined = undefined;
  let foundRitual: Ritual | undefined = undefined;

  for (const religion of state.religions.values()) {
    const ritual = religion.rituals.find((r) => r.ritualId === ritualId);
    if (ritual !== undefined) {
      foundReligion = religion;
      foundRitual = ritual;
      break;
    }
  }

  if (foundReligion === undefined || foundRitual === undefined) {
    return { error: 'RITUAL_NOT_FOUND' };
  }

  if (participantCount < 0) {
    return { error: 'INVALID_PARTICIPANT_COUNT' };
  }

  const now = deps.clock.nowMicroseconds();

  const updatedRitual: Ritual = {
    ...foundRitual,
    lastPerformedAtMicros: now,
    participantCount,
  };

  const updatedRituals = foundReligion.rituals.map((r) =>
    r.ritualId === ritualId ? updatedRitual : r,
  );

  const updatedReligion: Religion = {
    ...foundReligion,
    rituals: updatedRituals,
  };

  state.religions.set(foundReligion.religionId, updatedReligion);

  deps.logger.info('ritual_performed', { ritualId, participantCount });

  return ritualId;
}

function measureTension(
  state: ModuleState,
  religionId1: string,
  religionId2: string,
): number | { error: string } {
  const r1 = state.religions.get(religionId1);
  const r2 = state.religions.get(religionId2);

  if (r1 === undefined || r2 === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  const tensionKey = createTensionKey(religionId1, religionId2);
  const tension = state.tensions.get(tensionKey);

  if (tension === undefined) {
    return 0.0;
  }

  return tension.level;
}

function createTensionKey(religionId1: string, religionId2: string): string {
  const sorted = [religionId1, religionId2].sort();
  const first = sorted[0];
  const second = sorted[1];

  if (first === undefined || second === undefined) {
    return religionId1 + '_' + religionId2;
  }

  return first + '_' + second;
}

function recordConflict(
  state: ModuleState,
  deps: RelDeps,
  religionId1: string,
  religionId2: string,
  severity: number,
): string | { error: string } {
  const r1 = state.religions.get(religionId1);
  const r2 = state.religions.get(religionId2);

  if (r1 === undefined || r2 === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  if (severity < 0 || severity > 1) {
    return { error: 'INVALID_SEVERITY' };
  }

  const tensionKey = createTensionKey(religionId1, religionId2);
  const existingTension = state.tensions.get(tensionKey);

  const now = deps.clock.nowMicroseconds();
  const tensionId = deps.idGen.generate();

  if (existingTension === undefined) {
    const newTension: ReligiousTension = {
      tensionId,
      religionId1,
      religionId2,
      level: severity,
      lastIncidentMicros: now,
      conflicts: 1,
    };

    state.tensions.set(tensionKey, newTension);
  } else {
    const updatedTension: ReligiousTension = {
      ...existingTension,
      level: Math.min(1.0, existingTension.level + severity),
      lastIncidentMicros: now,
      conflicts: existingTension.conflicts + 1,
    };

    state.tensions.set(tensionKey, updatedTension);
  }

  deps.logger.warn('religious_conflict', { religionId1, religionId2, severity });

  return tensionKey;
}

function getReligionReport(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
): ReligionReport | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  const factionSet = state.religionFactions.get(religionId);
  const factionCount = factionSet !== undefined ? factionSet.size : 0;

  const activeRituals = religion.rituals.filter((r) => r.lastPerformedAtMicros !== null).length;

  const now = deps.clock.nowMicroseconds();
  const upcomingWindow = 30n * 24n * 3600n * 1000000n;
  const upcomingHolyDays = religion.holyDays.filter((h) => {
    const nextOccurrence = religion.foundedAtMicros + h.dateOffsetMicros;
    return nextOccurrence > now && nextOccurrence < now + upcomingWindow;
  }).length;

  let conversionCount = 0;
  const recentWindow = 365n * 24n * 3600n * 1000000n;
  for (const conversion of state.conversions.values()) {
    if (
      conversion.toReligionId === religionId &&
      now - conversion.convertedAtMicros < recentWindow
    ) {
      conversionCount = conversionCount + 1;
    }
  }

  const conversionRate = religion.followerCount > 0 ? conversionCount / religion.followerCount : 0;

  let totalTension = 0;
  for (const tension of state.tensions.values()) {
    if (tension.religionId1 === religionId || tension.religionId2 === religionId) {
      totalTension = totalTension + tension.level;
    }
  }

  return {
    religionId,
    name: religion.name,
    followerCount: religion.followerCount,
    factionCount,
    activeRituals,
    upcomingHolyDays,
    conversionRate,
    totalTension,
  };
}

function declareHolyDay(
  state: ModuleState,
  religionId: string,
  holyDayId: string,
): HolyDay | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  const holyDay = religion.holyDays.find((h) => h.holyDayId === holyDayId);

  if (holyDay === undefined) {
    return { error: 'HOLY_DAY_NOT_FOUND' };
  }

  return holyDay;
}

function getReligion(state: ModuleState, religionId: string): Religion | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  return religion;
}

function getFaction(state: ModuleState, factionId: string): ReligiousFaction | { error: string } {
  const faction = state.factions.get(factionId);

  if (faction === undefined) {
    return { error: 'FACTION_NOT_FOUND' };
  }

  return faction;
}

function updateFollowerCount(
  state: ModuleState,
  deps: RelDeps,
  religionId: string,
  delta: number,
): number | { error: string } {
  const religion = state.religions.get(religionId);

  if (religion === undefined) {
    return { error: 'RELIGION_NOT_FOUND' };
  }

  const newCount = Math.max(0, religion.followerCount + delta);

  const updated: Religion = {
    ...religion,
    followerCount: newCount,
  };

  state.religions.set(religionId, updated);

  deps.logger.info('follower_count_updated', { religionId, count: newCount });

  return newCount;
}
