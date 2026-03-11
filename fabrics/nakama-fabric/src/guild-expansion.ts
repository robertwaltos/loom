/**
 * Guild Expansion Engine — Banks, quests, GvG, halls, progression.
 *
 * Extends the base guild-system with:
 *   - Guild bank with deposit/withdraw audit trail
 *   - Guild quests: cooperative objectives with shared rewards
 *   - Guild halls: persistent social spaces on estates
 *   - Guild vs Guild events: scheduled battles, competitions
 *   - Guild progression: XP, levels, unlocks (emblem, name color, bank slots)
 *   - Cross-dynasty guilds: organisations spanning multiple dynasties
 *   - Recruitment board: searchable listings, application workflow
 *
 * "Alone, a thread. Together, a Fabric."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface GuildExpClockPort {
  readonly now: () => bigint;
}

export interface GuildExpIdPort {
  readonly next: () => string;
}

export interface GuildExpLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface GuildExpEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface GuildBankStorePort {
  readonly getBalance: (guildId: string) => Promise<number>;
  readonly deposit: (guildId: string, amount: number, depositorId: string, reason: string) => Promise<void>;
  readonly withdraw: (guildId: string, amount: number, recipientId: string, reason: string) => Promise<void>;
  readonly getTransactions: (guildId: string, limit: number) => Promise<readonly GuildBankTransaction[]>;
}

export interface GuildProgressionStorePort {
  readonly getProgression: (guildId: string) => Promise<GuildProgression | undefined>;
  readonly saveProgression: (prog: GuildProgression) => Promise<void>;
}

export interface GuildQuestStorePort {
  readonly saveQuest: (quest: CoopGuildQuest) => Promise<void>;
  readonly getQuest: (questId: string) => Promise<CoopGuildQuest | undefined>;
  readonly getActiveQuests: (guildId: string) => Promise<readonly CoopGuildQuest[]>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type GvGEventType = 'battle' | 'trade-race' | 'crafting-contest' | 'racing' | 'territory-siege';

export type CoopQuestStatus = 'active' | 'completed' | 'failed' | 'expired';

export type RecruitmentStatus = 'open' | 'closed';

export type GuildApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface GuildBankTransaction {
  readonly transactionId: string;
  readonly guildId: string;
  readonly playerId: string;
  readonly amount: number;
  readonly type: 'deposit' | 'withdraw';
  readonly reason: string;
  readonly balanceAfter: number;
  readonly timestamp: bigint;
}

export interface CoopGuildQuest {
  readonly questId: string;
  readonly guildId: string;
  readonly title: string;
  readonly description: string;
  readonly status: CoopQuestStatus;
  readonly objectiveTarget: number;
  readonly objectiveCurrent: number;
  readonly rewardKalon: number;
  readonly rewardXp: number;
  readonly participants: readonly string[];
  readonly expiresAt: bigint;
  readonly createdAt: bigint;
}

export interface GuildHall {
  readonly hallId: string;
  readonly guildId: string;
  readonly estateId: string;
  readonly theme: string;
  readonly trophyCount: number;
  readonly bannerSlots: number;
  readonly maxOccupancy: number;
  readonly currentOccupancy: number;
}

export interface GvGMatch {
  readonly matchId: string;
  readonly type: GvGEventType;
  readonly guildAId: string;
  readonly guildBId: string;
  readonly winnerId: string | undefined;
  readonly rewardKalon: number;
  readonly scheduledAt: bigint;
  readonly startedAt: bigint | undefined;
  readonly endedAt: bigint | undefined;
}

export interface GuildProgression {
  readonly guildId: string;
  readonly level: number;
  readonly xp: number;
  readonly xpToNextLevel: number;
  readonly unlocks: readonly GuildUnlock[];
}

export interface GuildUnlock {
  readonly level: number;
  readonly unlockType: string;
  readonly description: string;
  readonly unlockedAt: bigint;
}

export interface CrossDynastyLink {
  readonly linkId: string;
  readonly guildId: string;
  readonly dynastyIds: readonly string[];
  readonly linkedAt: bigint;
}

export interface RecruitmentListing {
  readonly listingId: string;
  readonly guildId: string;
  readonly title: string;
  readonly description: string;
  readonly requirements: string;
  readonly minLevel: number;
  readonly status: RecruitmentStatus;
  readonly createdAt: bigint;
}

export interface GuildExpApplication {
  readonly applicationId: string;
  readonly listingId: string;
  readonly playerId: string;
  readonly guildId: string;
  readonly message: string;
  readonly status: GuildApplicationStatus;
  readonly appliedAt: bigint;
  readonly reviewedAt: bigint | undefined;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface GuildExpansionConfig {
  readonly xpPerLevel: number;
  readonly xpScalingFactor: number;
  readonly maxGuildLevel: number;
  readonly questExpiryMs: number;
  readonly gvgRewardKalon: number;
  readonly maxBankSlots: number;
  readonly hallMaxOccupancy: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface GuildExpansionStats {
  readonly bankDeposits: number;
  readonly bankWithdrawals: number;
  readonly questsCreated: number;
  readonly questsCompleted: number;
  readonly gvgMatchesHeld: number;
  readonly hallsCreated: number;
  readonly levelsGained: number;
  readonly crossDynastyLinks: number;
  readonly recruitmentListings: number;
  readonly applicationsProcessed: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface GuildExpansionEngine {
  // Bank
  readonly depositToBank: (guildId: string, playerId: string, amount: number, reason: string) => Promise<number>;
  readonly withdrawFromBank: (guildId: string, playerId: string, amount: number, reason: string) => Promise<number>;
  readonly getBankHistory: (guildId: string, limit: number) => Promise<readonly GuildBankTransaction[]>;

  // Quests
  readonly createCoopQuest: (guildId: string, title: string, description: string, target: number, rewardKalon: number) => Promise<CoopGuildQuest>;
  readonly advanceCoopQuest: (questId: string, playerId: string, progress: number) => Promise<CoopGuildQuest>;
  readonly getActiveQuests: (guildId: string) => Promise<readonly CoopGuildQuest[]>;

  // Halls
  readonly createHall: (guildId: string, estateId: string, theme: string) => GuildHall;
  readonly updateHallOccupancy: (hallId: string, delta: number) => GuildHall;

  // GvG
  readonly scheduleGvG: (guildAId: string, guildBId: string, type: GvGEventType, scheduledAt: bigint) => GvGMatch;
  readonly resolveGvG: (matchId: string, winnerId: string) => GvGMatch;

  // Progression
  readonly addGuildXp: (guildId: string, amount: number) => Promise<GuildProgression>;
  readonly getProgression: (guildId: string) => Promise<GuildProgression>;

  // Cross-dynasty
  readonly linkDynasty: (guildId: string, dynastyId: string) => CrossDynastyLink;
  readonly getCrossDynastyLinks: (guildId: string) => readonly CrossDynastyLink[];

  // Recruitment
  readonly postListing: (guildId: string, title: string, description: string, requirements: string, minLevel: number) => RecruitmentListing;
  readonly applyToGuild: (listingId: string, playerId: string, message: string) => GuildExpApplication;
  readonly reviewApplication: (applicationId: string, accepted: boolean) => GuildExpApplication;

  readonly getStats: () => GuildExpansionStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface GuildExpansionDeps {
  readonly clock: GuildExpClockPort;
  readonly id: GuildExpIdPort;
  readonly log: GuildExpLogPort;
  readonly events: GuildExpEventPort;
  readonly bank: GuildBankStorePort;
  readonly progression: GuildProgressionStorePort;
  readonly quests: GuildQuestStorePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: GuildExpansionConfig = {
  xpPerLevel: 1000,
  xpScalingFactor: 1.5,
  maxGuildLevel: 50,
  questExpiryMs: 7 * 24 * 60 * 60 * 1000,
  gvgRewardKalon: 25000,
  maxBankSlots: 200,
  hallMaxOccupancy: 50,
};

// ─── Factory ────────────────────────────────────────────────────────

export function createGuildExpansionEngine(
  deps: GuildExpansionDeps,
  config: Partial<GuildExpansionConfig> = {},
): GuildExpansionEngine {
  const cfg: GuildExpansionConfig = { ...DEFAULT_CONFIG, ...config };

  const halls = new Map<string, GuildHall>();
  const gvgMatches = new Map<string, GvGMatch>();
  const dynastyLinks = new Map<string, CrossDynastyLink[]>();
  const listings = new Map<string, RecruitmentListing>();
  const applicationStore = new Map<string, GuildExpApplication>();

  let bankDeposits = 0;
  let bankWithdrawals = 0;
  let questsCreated = 0;
  let questsCompleted = 0;
  let gvgMatchesHeld = 0;
  let hallsCreated = 0;
  let levelsGained = 0;
  let crossDynastyLinksCount = 0;
  let recruitmentListingCount = 0;
  let applicationsProcessed = 0;

  function xpForLevel(level: number): number {
    return Math.floor(cfg.xpPerLevel * Math.pow(cfg.xpScalingFactor, level - 1));
  }

  async function depositToBank(guildId: string, playerId: string, amount: number, reason: string): Promise<number> {
    await deps.bank.deposit(guildId, amount, playerId, reason);
    bankDeposits++;
    deps.log.info('guild-bank-deposit', { guildId, playerId, amount });
    return deps.bank.getBalance(guildId);
  }

  async function withdrawFromBank(guildId: string, playerId: string, amount: number, reason: string): Promise<number> {
    await deps.bank.withdraw(guildId, amount, playerId, reason);
    bankWithdrawals++;
    deps.log.info('guild-bank-withdraw', { guildId, playerId, amount });
    return deps.bank.getBalance(guildId);
  }

  async function getBankHistory(guildId: string, limit: number): Promise<readonly GuildBankTransaction[]> {
    return deps.bank.getTransactions(guildId, limit);
  }

  async function createCoopQuest(
    guildId: string,
    title: string,
    description: string,
    target: number,
    rewardKalon: number,
  ): Promise<CoopGuildQuest> {
    const quest: CoopGuildQuest = {
      questId: deps.id.next(),
      guildId,
      title,
      description,
      status: 'active',
      objectiveTarget: target,
      objectiveCurrent: 0,
      rewardKalon,
      rewardXp: Math.floor(rewardKalon * 0.1),
      participants: [],
      expiresAt: deps.clock.now() + BigInt(cfg.questExpiryMs),
      createdAt: deps.clock.now(),
    };

    await deps.quests.saveQuest(quest);
    questsCreated++;
    deps.log.info('coop-quest-created', { questId: quest.questId, guildId, title });
    return quest;
  }

  async function advanceCoopQuest(questId: string, playerId: string, progress: number): Promise<CoopGuildQuest> {
    const quest = await deps.quests.getQuest(questId);
    if (quest === undefined) throw new Error(`Quest ${questId} not found`);

    const newCurrent = Math.min(quest.objectiveTarget, quest.objectiveCurrent + progress);
    const completed = newCurrent >= quest.objectiveTarget;
    const participants = quest.participants.includes(playerId)
      ? quest.participants
      : [...quest.participants, playerId];

    const updated: CoopGuildQuest = {
      ...quest,
      objectiveCurrent: newCurrent,
      status: completed ? 'completed' : 'active',
      participants,
    };

    await deps.quests.saveQuest(updated);
    if (completed) questsCompleted++;
    return updated;
  }

  async function getActiveQuests(guildId: string): Promise<readonly CoopGuildQuest[]> {
    return deps.quests.getActiveQuests(guildId);
  }

  function createHall(guildId: string, estateId: string, theme: string): GuildHall {
    const hall: GuildHall = {
      hallId: deps.id.next(),
      guildId,
      estateId,
      theme,
      trophyCount: 0,
      bannerSlots: 4,
      maxOccupancy: cfg.hallMaxOccupancy,
      currentOccupancy: 0,
    };

    halls.set(hall.hallId, hall);
    hallsCreated++;
    deps.log.info('guild-hall-created', { hallId: hall.hallId, guildId, theme });
    return hall;
  }

  function updateHallOccupancy(hallId: string, delta: number): GuildHall {
    const hall = halls.get(hallId);
    if (hall === undefined) throw new Error(`Hall ${hallId} not found`);

    const updated: GuildHall = {
      ...hall,
      currentOccupancy: Math.max(0, Math.min(hall.maxOccupancy, hall.currentOccupancy + delta)),
    };

    halls.set(hallId, updated);
    return updated;
  }

  function scheduleGvG(guildAId: string, guildBId: string, type: GvGEventType, scheduledAt: bigint): GvGMatch {
    const match: GvGMatch = {
      matchId: deps.id.next(),
      type,
      guildAId,
      guildBId,
      winnerId: undefined,
      rewardKalon: cfg.gvgRewardKalon,
      scheduledAt,
      startedAt: undefined,
      endedAt: undefined,
    };

    gvgMatches.set(match.matchId, match);
    deps.log.info('gvg-scheduled', { matchId: match.matchId, guildAId, guildBId, type });
    return match;
  }

  function resolveGvG(matchId: string, winnerId: string): GvGMatch {
    const match = gvgMatches.get(matchId);
    if (match === undefined) throw new Error(`GvG match ${matchId} not found`);

    const resolved: GvGMatch = {
      ...match,
      winnerId,
      endedAt: deps.clock.now(),
    };

    gvgMatches.set(matchId, resolved);
    gvgMatchesHeld++;
    deps.log.info('gvg-resolved', { matchId, winnerId });
    return resolved;
  }

  async function addGuildXp(guildId: string, amount: number): Promise<GuildProgression> {
    let prog = await deps.progression.getProgression(guildId);
    if (prog === undefined) {
      prog = { guildId, level: 1, xp: 0, xpToNextLevel: xpForLevel(1), unlocks: [] };
    }

    let xp = prog.xp + amount;
    let level = prog.level;
    let xpToNext = prog.xpToNextLevel;
    const newUnlocks: GuildUnlock[] = [];

    while (xp >= xpToNext && level < cfg.maxGuildLevel) {
      xp -= xpToNext;
      level++;
      xpToNext = xpForLevel(level);
      levelsGained++;
      newUnlocks.push({
        level,
        unlockType: level % 10 === 0 ? 'emblem-slot' : level % 5 === 0 ? 'bank-slot' : 'xp-bonus',
        description: `Level ${level} unlock`,
        unlockedAt: deps.clock.now(),
      });
    }

    const updated: GuildProgression = {
      guildId,
      level,
      xp,
      xpToNextLevel: xpToNext,
      unlocks: [...prog.unlocks, ...newUnlocks],
    };

    await deps.progression.saveProgression(updated);
    if (newUnlocks.length > 0) {
      deps.log.info('guild-level-up', { guildId, newLevel: level });
    }
    return updated;
  }

  async function getProgression(guildId: string): Promise<GuildProgression> {
    const prog = await deps.progression.getProgression(guildId);
    if (prog === undefined) {
      return { guildId, level: 1, xp: 0, xpToNextLevel: xpForLevel(1), unlocks: [] };
    }
    return prog;
  }

  function linkDynasty(guildId: string, dynastyId: string): CrossDynastyLink {
    const existing = dynastyLinks.get(guildId) ?? [];

    const alreadyLinked = existing.find(l => l.dynastyIds.includes(dynastyId));
    if (alreadyLinked !== undefined) throw new Error('Dynasty already linked');

    const link: CrossDynastyLink = {
      linkId: deps.id.next(),
      guildId,
      dynastyIds: [...new Set([...existing.flatMap(l => [...l.dynastyIds]), dynastyId])],
      linkedAt: deps.clock.now(),
    };

    dynastyLinks.set(guildId, [...existing, link]);
    crossDynastyLinksCount++;
    deps.log.info('dynasty-linked', { guildId, dynastyId });
    return link;
  }

  function getCrossDynastyLinks(guildId: string): readonly CrossDynastyLink[] {
    return dynastyLinks.get(guildId) ?? [];
  }

  function postListing(
    guildId: string,
    title: string,
    description: string,
    requirements: string,
    minLevel: number,
  ): RecruitmentListing {
    const listing: RecruitmentListing = {
      listingId: deps.id.next(),
      guildId,
      title,
      description,
      requirements,
      minLevel,
      status: 'open',
      createdAt: deps.clock.now(),
    };

    listings.set(listing.listingId, listing);
    recruitmentListingCount++;
    deps.log.info('recruitment-listed', { listingId: listing.listingId, guildId });
    return listing;
  }

  function applyToGuild(listingId: string, playerId: string, message: string): GuildExpApplication {
    const listing = listings.get(listingId);
    if (listing === undefined) throw new Error(`Listing ${listingId} not found`);
    if (listing.status !== 'open') throw new Error('Listing closed');

    const app: GuildExpApplication = {
      applicationId: deps.id.next(),
      listingId,
      playerId,
      guildId: listing.guildId,
      message,
      status: 'pending',
      appliedAt: deps.clock.now(),
      reviewedAt: undefined,
    };

    applicationStore.set(app.applicationId, app);
    deps.log.info('guild-applied', { applicationId: app.applicationId, guildId: listing.guildId, playerId });
    return app;
  }

  function reviewApplication(applicationId: string, accepted: boolean): GuildExpApplication {
    const app = applicationStore.get(applicationId);
    if (app === undefined) throw new Error(`Application ${applicationId} not found`);

    const reviewed: GuildExpApplication = {
      ...app,
      status: accepted ? 'accepted' : 'rejected',
      reviewedAt: deps.clock.now(),
    };

    applicationStore.set(applicationId, reviewed);
    applicationsProcessed++;
    deps.log.info('application-reviewed', { applicationId, accepted });
    return reviewed;
  }

  function getStats(): GuildExpansionStats {
    return {
      bankDeposits,
      bankWithdrawals,
      questsCreated,
      questsCompleted,
      gvgMatchesHeld,
      hallsCreated,
      levelsGained,
      crossDynastyLinks: crossDynastyLinksCount,
      recruitmentListings: recruitmentListingCount,
      applicationsProcessed,
    };
  }

  deps.log.info('guild-expansion-engine-created', {
    maxLevel: cfg.maxGuildLevel,
    gvgReward: cfg.gvgRewardKalon,
  });

  return {
    depositToBank,
    withdrawFromBank,
    getBankHistory,
    createCoopQuest,
    advanceCoopQuest,
    getActiveQuests,
    createHall,
    updateHallOccupancy,
    scheduleGvG,
    resolveGvG,
    addGuildXp,
    getProgression,
    linkDynasty,
    getCrossDynastyLinks,
    postListing,
    applyToGuild,
    reviewApplication,
    getStats,
  };
}
