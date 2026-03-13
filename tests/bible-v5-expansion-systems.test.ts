/**
 * Bible v5 Expansion Systems — Unit Tests.
 *
 * Covers all 10 new systems built from the Expansion Bible v5:
 *   1. threadway-network
 *   2. kindler-progression
 *   3. seasonal-content
 *   4. hidden-zones
 *   5. mini-games-registry
 *   6. quest-chains
 *   7. entry-types
 *   8. visitor-characters
 *   9. leitmotif-catalog
 *  10. curriculum-map
 */

import { describe, it, expect } from 'vitest';

import {
  createThreadwayNetwork,
  LINGER_DISCOVERY_MS,
  type KindlerThreadwayState,
  type InBetweenSpace,
} from '../fabrics/loom-core/src/threadway-network';

import {
  createKindlerProgression,
  MAX_SPARK_LEVEL,
  LUMINANCE_DECAY_PER_DAY,
  LUMINANCE_DECAY_CAP,
  ABSENCE_THRESHOLD_DAYS,
  WELCOME_BACK_SPARK,
  MS_PER_DAY,
  type KindlerProfile,
  type WorldLuminanceState,
} from '../fabrics/loom-core/src/kindler-progression';

import {
  createSeasonalContent,
  type Month,
} from '../fabrics/loom-core/src/seasonal-content';

import {
  createHiddenZones,
  SPARK_REWARD_HIDDEN_ZONE,
  type KindlerZoneState,
} from '../fabrics/loom-core/src/hidden-zones';

import {
  createMiniGamesRegistry,
  SPARK_GAIN_MIN,
  SPARK_GAIN_MAX,
  type MiniGameSession,
  type KindlerGameState,
} from '../fabrics/loom-core/src/mini-games-registry';

import {
  createQuestChains,
  TOTAL_QUEST_CHAINS,
  type KindlerQuestState,
} from '../fabrics/loom-core/src/quest-chains';

import {
  createEntryTypes,
} from '../fabrics/loom-core/src/entry-types';

import {
  createVisitorCharacters,
  TOTAL_RECURRING_VISITORS,
  TOTAL_LEGENDARY_FIGURES,
  type KindlerVisitorState,
} from '../fabrics/loom-core/src/visitor-characters';

import {
  createLeitmotifCatalog,
  TOTAL_LEITMOTIFS,
} from '../fabrics/loom-core/src/leitmotif-catalog';

import {
  createCurriculumMap,
  TOTAL_STEM_WORLDS,
  TOTAL_LANGUAGE_ARTS_WORLDS,
  TOTAL_FINANCIAL_WORLDS,
  TOTAL_CROSS_CURRICULAR_HIGHLIGHTS,
} from '../fabrics/loom-core/src/curriculum-map';

// ── Helpers ──────────────────────────────────────────────────────

function emptyThreadwayState(): KindlerThreadwayState {
  return {
    kindlerId: 'k1',
    discoveredThreadwayIds: new Set(),
    traversedThreadwayIds: new Set(),
    completedWorldIds: new Set(),
    completedEntryIds: new Set(),
  };
}

function baseKindlerProfile(overrides: Partial<KindlerProfile> = {}): KindlerProfile {
  return {
    kindlerId: 'k1',
    totalSpark: 0,
    level: 0,
    levelName: 'new-kindler',
    visual: 'tiny-flicker',
    worldLuminance: new Map(),
    lastVisitMs: Date.now(),
    visitedWorldIds: new Set(),
    completedEntryCount: 0,
    ...overrides,
  };
}

// ── 1. Threadway Network ─────────────────────────────────────────

describe('ThreadwayNetwork', () => {
  const net = createThreadwayNetwork();

  it('returns all threadway definitions', () => {
    const all = net.getAllThreadways();
    expect(all.length).toBeGreaterThanOrEqual(39);
  });

  it('returns all hub portals', () => {
    const hubs = net.getHubPortals();
    expect(hubs.length).toBe(5);
    expect(hubs.map(h => h.portalId)).toContain('green-door');
    expect(hubs.map(h => h.portalId)).toContain('compass-rose');
  });

  it('filters threadways by realm', () => {
    const stem = net.getThreadwaysByRealm('stem');
    expect(stem.length).toBeGreaterThanOrEqual(12);
    stem.forEach(t => expect(t.realm).toBe('stem'));
  });

  it('computes tier-2 status as hidden when worlds incomplete', () => {
    const state = emptyThreadwayState();
    const tier2 = net.getAllThreadways().find(t => t.tier === 2);
    expect(tier2).toBeDefined();
    const status = net.computeStatus(tier2!, state);
    expect(status).toBe('hidden');
  });

  it('computes tier-2 status as visible when both worlds completed', () => {
    const tier2 = net.getAllThreadways().find(t => t.tier === 2);
    expect(tier2).toBeDefined();
    const state: KindlerThreadwayState = {
      ...emptyThreadwayState(),
      completedWorldIds: new Set([tier2!.fromWorldId, tier2!.toWorldId]),
    };
    const status = net.computeStatus(tier2!, state);
    expect(status).toBe('visible');
  });

  it('evaluates discovery and returns results for all threadways', () => {
    const state = emptyThreadwayState();
    const results = net.evaluateDiscovery(state);
    expect(results.length).toBe(net.getAllThreadways().length);
    for (const r of results) {
      expect(r.threadwayId).toBeDefined();
      expect(typeof r.sparkGained).toBe('number');
    }
  });

  it('detects In-Between space with sufficient linger time', () => {
    const now = 100_000;
    const enoughLinger: InBetweenSpace = {
      activeWorldIds: ['cloud-kingdom', 'meadow-lab'],
      lingerStartMs: now - LINGER_DISCOVERY_MS - 1,
      discovered: false,
    };
    expect(net.checkInBetween(enoughLinger, now)).toBe(true);

    const tooShort: InBetweenSpace = {
      activeWorldIds: ['cloud-kingdom', 'meadow-lab'],
      lingerStartMs: now - 1000,
      discovered: false,
    };
    expect(net.checkInBetween(tooShort, now)).toBe(false);
  });

  it('computes network stats', () => {
    const state = emptyThreadwayState();
    const stats = net.getNetworkStats(state);
    expect(stats.totalThreadways).toBeGreaterThanOrEqual(39);
    expect(stats.tier1Count).toBeGreaterThanOrEqual(0);
    expect(stats.tier2Count).toBeGreaterThan(0);
    expect(stats.tier3Count).toBeGreaterThan(0);
    expect(stats.discoveredCount).toBe(0);
    expect(stats.traversedCount).toBe(0);
  });

  it('finds connected worlds', () => {
    const connected = net.getConnectedWorlds('cloud-kingdom');
    expect(connected.length).toBeGreaterThanOrEqual(1);
  });
});

// ── 2. Kindler Progression ───────────────────────────────────────

describe('KindlerProgression', () => {
  const prog = createKindlerProgression();

  it('computes level for spark values', () => {
    expect(prog.computeLevel(0).level).toBe(0);
    expect(prog.computeLevel(0).name).toBe('new-kindler');
    expect(prog.computeLevel(1).level).toBe(1);
    expect(prog.computeLevel(50).level).toBe(1);
    expect(prog.computeLevel(51).level).toBe(2);
    expect(prog.computeLevel(1201).level).toBe(MAX_SPARK_LEVEL);
    expect(prog.computeLevel(9999).level).toBe(MAX_SPARK_LEVEL);
  });

  it('computes spark gain for various actions', () => {
    expect(prog.computeSparkGain('complete-entry', 1)).toBeGreaterThanOrEqual(5);
    expect(prog.computeSparkGain('complete-entry', 1)).toBeLessThanOrEqual(15);
    expect(prog.computeSparkGain('discover-threadway', 1)).toBe(10);
    expect(prog.computeSparkGain('find-hidden-zone', 1)).toBe(15);
    expect(prog.computeSparkGain('complete-cross-world-quest', 1)).toBeGreaterThanOrEqual(25);
    expect(prog.computeSparkGain('return-after-absence', 1)).toBe(WELCOME_BACK_SPARK);
    expect(prog.computeSparkGain('first-world-visit', 1)).toBe(10);
  });

  it('applies spark gain and returns result', () => {
    const profile = baseKindlerProfile({ totalSpark: 0 });
    const result = prog.applySparkGain(profile, 10);
    expect(result.newSpark).toBe(10);
    expect(result.sparkGained).toBe(10);
    expect(result.previousSpark).toBe(0);
  });

  it('detects level-up on spark gain', () => {
    const profile = baseKindlerProfile({ totalSpark: 0, level: 0 });
    const result = prog.applySparkGain(profile, 1);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(1);
  });

  it('computes luminance decay after absence', () => {
    const now = Date.now();
    const noAbsence: WorldLuminanceState = { worldId: 'w1', luminance: 100, lastVisitMs: now, maxLuminance: 100 };
    expect(prog.computeLuminanceDecay(noAbsence, now).decayAmount).toBe(0);

    const fiveDays: WorldLuminanceState = { worldId: 'w1', luminance: 100, lastVisitMs: now - 5 * MS_PER_DAY, maxLuminance: 100 };
    expect(prog.computeLuminanceDecay(fiveDays, now).decayAmount).toBe(0);

    const eightDays: WorldLuminanceState = { worldId: 'w1', luminance: 100, lastVisitMs: now - 8 * MS_PER_DAY, maxLuminance: 100 };
    expect(prog.computeLuminanceDecay(eightDays, now).decayAmount).toBe(LUMINANCE_DECAY_PER_DAY);

    const thirtyDays: WorldLuminanceState = { worldId: 'w1', luminance: 100, lastVisitMs: now - 30 * MS_PER_DAY, maxLuminance: 100 };
    expect(prog.computeLuminanceDecay(thirtyDays, now).decayAmount).toBe(LUMINANCE_DECAY_CAP);
  });

  it('computes welcome-back spark after threshold', () => {
    const now = Date.now();
    const recent = baseKindlerProfile({ lastVisitMs: now - 5 * MS_PER_DAY });
    expect(prog.computeWelcomeBack(recent, now)).toBeNull();

    const absent = baseKindlerProfile({ lastVisitMs: now - (ABSENCE_THRESHOLD_DAYS + 1) * MS_PER_DAY });
    const result = prog.computeWelcomeBack(absent, now);
    expect(result).not.toBeNull();
    expect(result!.sparkGained).toBe(WELCOME_BACK_SPARK);
  });

  it('checks world accessibility by level', () => {
    expect(prog.isWorldAccessible(1, 0)).toBe(true);
    expect(prog.isWorldAccessible(5, 0)).toBe(false);
    expect(prog.isWorldAccessible(5, 5)).toBe(true);
  });
});

// ── 3. Seasonal Content ──────────────────────────────────────────

describe('SeasonalContent', () => {
  const seasonal = createSeasonalContent();

  it('computes time of day from hour', () => {
    expect(seasonal.computeTimeOfDay(3)).toBe('night');
    expect(seasonal.computeTimeOfDay(6)).toBe('dawn');
    expect(seasonal.computeTimeOfDay(10)).toBe('morning');
    expect(seasonal.computeTimeOfDay(14)).toBe('afternoon');
    expect(seasonal.computeTimeOfDay(18)).toBe('golden-hour');
    expect(seasonal.computeTimeOfDay(20)).toBe('evening');
    expect(seasonal.computeTimeOfDay(23)).toBe('night');
  });

  it('returns active event for January', () => {
    const event = seasonal.getActiveEvent(1 as Month);
    expect(event).toBeDefined();
    expect(event.name).toBe("New Year's Reset");
  });

  it('returns active event for December', () => {
    const event = seasonal.getActiveEvent(12 as Month);
    expect(event).toBeDefined();
    expect(event.name).toBe('The Great Restoration');
  });

  it('computes calendar state from timestamp', () => {
    // UTC January 15, 2025 at 10:00
    const jan15 = Date.UTC(2025, 0, 15, 10, 0, 0);
    const state = seasonal.computeCalendarState(jan15);
    expect(state.currentMonth).toBe(1);
    expect(state.timeOfDay).toBe('morning');
  });

  it('checks world affected by monthly event', () => {
    expect(seasonal.isWorldAffected('cloud-kingdom', 4 as Month)).toBe(true); // Earth Month
    expect(seasonal.isWorldAffected('nonexistent-world', 4 as Month)).toBe(false);
  });

  it('provides Great Restoration target', () => {
    const worldLuminances = new Map([
      ['cloud-kingdom', 50],
      ['meadow-lab', 20],
      ['code-canyon', 80],
    ]);
    const target = seasonal.getGreatRestorationTarget(worldLuminances);
    expect(target).toBe('meadow-lab');
  });
});

// ── 4. Hidden Zones ──────────────────────────────────────────────

describe('HiddenZones', () => {
  const zones = createHiddenZones();

  it('returns 5 hidden zone definitions', () => {
    expect(zones.getAllZones().length).toBe(5);
  });

  it('each zone grants correct spark reward', () => {
    for (const z of zones.getAllZones()) {
      expect(z.sparkReward).toBe(SPARK_REWARD_HIDDEN_ZONE);
    }
  });

  it('rejects discovery when already discovered', () => {
    const state: KindlerZoneState = {
      kindlerId: 'k1',
      discoveredZoneIds: new Set(['the-in-between']),
      completedWorldIds: new Set(),
      completedEntryCount: 0,
      totalDistinctWorldsVisited: 0,
    };
    const result = zones.checkDiscoveryEligibility('the-in-between', state);
    expect(result).toBe(false);
  });

  it('allows In-Between discovery when not discovered', () => {
    const state: KindlerZoneState = {
      kindlerId: 'k1',
      discoveredZoneIds: new Set(),
      completedWorldIds: new Set(),
      completedEntryCount: 0,
      totalDistinctWorldsVisited: 0,
    };
    const result = zones.checkDiscoveryEligibility('the-in-between', state);
    expect(result).toBe(true);
  });

  it('evaluates discovery across all zones', () => {
    const state: KindlerZoneState = {
      kindlerId: 'k1',
      discoveredZoneIds: new Set(),
      completedWorldIds: new Set(['number-garden']),
      completedEntryCount: 0,
      totalDistinctWorldsVisited: 1,
    };
    const results = zones.evaluateDiscovery(state);
    expect(results.length).toBe(5);
    const inBetween = results.find(r => r.zoneId === 'the-in-between');
    expect(inBetween).toBeDefined();
    expect(inBetween!.discovered).toBe(true);
    expect(inBetween!.sparkGained).toBe(SPARK_REWARD_HIDDEN_ZONE);
  });

  it('calculates total spark available from all zones', () => {
    expect(zones.getTotalSparkAvailable()).toBe(5 * SPARK_REWARD_HIDDEN_ZONE);
  });
});

// ── 5. Mini-Games Registry ───────────────────────────────────────

describe('MiniGamesRegistry', () => {
  const games = createMiniGamesRegistry();

  it('returns all 50 mini-game definitions', () => {
    expect(games.getAllGames().length).toBe(50);
  });

  it('computes spark gain proportional to score', () => {
    const low = games.computeSparkGain(0, 100);
    const high = games.computeSparkGain(100, 100);
    expect(low).toBe(SPARK_GAIN_MIN);
    expect(high).toBe(SPARK_GAIN_MAX);
  });

  it('gets games by world', () => {
    const cloudGames = games.getGamesByWorld('cloud-kingdom');
    expect(cloudGames.length).toBeGreaterThanOrEqual(1);
    cloudGames.forEach(g => expect(g.worldId).toBe('cloud-kingdom'));
  });

  it('gets games by realm', () => {
    const stemGames = games.getGamesByRealm('stem');
    expect(stemGames.length).toBe(15);
  });

  it('computes result with session and state', () => {
    const game = games.getAllGames()[0];
    const session: MiniGameSession = {
      sessionId: 's1',
      gameId: game.gameId,
      kindlerId: 'k1',
      difficulty: 1,
      score: 90,
      maxScore: 100,
      completedAt: Date.now(),
    };
    const state: KindlerGameState = {
      kindlerId: 'k1',
      highScores: new Map(),
      maxDifficultyReached: new Map(),
      totalGamesPlayed: 0,
    };
    const result = games.computeResult(session, state);
    expect(result.sparkGained).toBeGreaterThanOrEqual(SPARK_GAIN_MIN);
    expect(result.sparkGained).toBeLessThanOrEqual(SPARK_GAIN_MAX);
    expect(result.newHighScore).toBe(true);
  });
});

// ── 6. Quest Chains ──────────────────────────────────────────────

describe('QuestChains', () => {
  const quests = createQuestChains();

  it('returns all 20 quest chains', () => {
    expect(quests.getAllQuests().length).toBe(TOTAL_QUEST_CHAINS);
  });

  it('finds quest by ID', () => {
    const q = quests.getQuestById('climate-detective');
    expect(q).toBeDefined();
    expect(q!.name).toBe('The Climate Detective');
    expect(q!.category).toBe('stem');
    expect(q!.steps.length).toBe(4);
  });

  it('filters quests by category', () => {
    const stem = quests.getQuestsByCategory('stem');
    expect(stem.length).toBe(4);

    const langArts = quests.getQuestsByCategory('language-arts');
    expect(langArts.length).toBe(3);

    const financial = quests.getQuestsByCategory('financial-literacy');
    expect(financial.length).toBe(2);

    const crossRealm = quests.getQuestsByCategory('cross-realm');
    expect(crossRealm.length).toBe(11);
  });

  it('quest is locked when world entries are incomplete', () => {
    const state: KindlerQuestState = {
      kindlerId: 'k1',
      completedQuestIds: new Set(),
      activeQuestIds: new Set(),
      completedEntryWorldIds: new Set(['cloud-kingdom']),
      completedSteps: new Map(),
    };
    const result = quests.checkAvailability('climate-detective', state);
    expect(result.status).toBe('locked');
    expect(result.missingWorldIds.length).toBe(3);
  });

  it('quest is available when all worlds have entries', () => {
    const state: KindlerQuestState = {
      kindlerId: 'k1',
      completedQuestIds: new Set(),
      activeQuestIds: new Set(),
      completedEntryWorldIds: new Set(['cloud-kingdom', 'meadow-lab', 'frost-peaks', 'data-stream']),
      completedSteps: new Map(),
    };
    const result = quests.checkAvailability('climate-detective', state);
    expect(result.status).toBe('available');
    expect(result.missingWorldIds.length).toBe(0);
  });

  it('evaluates completion when all steps done', () => {
    const state: KindlerQuestState = {
      kindlerId: 'k1',
      completedQuestIds: new Set(),
      activeQuestIds: new Set(['climate-detective']),
      completedEntryWorldIds: new Set(['cloud-kingdom', 'meadow-lab', 'frost-peaks', 'data-stream']),
      completedSteps: new Map([['climate-detective', new Set([0, 1, 2, 3])]]),
    };
    const result = quests.evaluateCompletion('climate-detective', state);
    expect(result.allStepsComplete).toBe(true);
    expect(result.sparkGained).toBe(50);
    expect(result.stepsRemaining).toBe(0);
  });

  it('evaluates partial completion', () => {
    const state: KindlerQuestState = {
      kindlerId: 'k1',
      completedQuestIds: new Set(),
      activeQuestIds: new Set(['climate-detective']),
      completedEntryWorldIds: new Set(['cloud-kingdom', 'meadow-lab', 'frost-peaks', 'data-stream']),
      completedSteps: new Map([['climate-detective', new Set([0, 1])]]),
    };
    const result = quests.evaluateCompletion('climate-detective', state);
    expect(result.allStepsComplete).toBe(false);
    expect(result.sparkGained).toBe(0);
    expect(result.stepsRemaining).toBe(2);
  });

  it('returns total spark available across all quests', () => {
    const total = quests.getTotalSparkAvailable();
    expect(total).toBeGreaterThanOrEqual(20 * 25);
  });
});

// ── 7. Entry Types ───────────────────────────────────────────────

describe('EntryTypes', () => {
  const entries = createEntryTypes();

  it('returns all sample entries', () => {
    expect(entries.getAllEntries().length).toBe(9);
  });

  it('filters by unsolved_mystery type', () => {
    const mysteries = entries.getEntriesByType('unsolved_mystery');
    expect(mysteries.length).toBe(3);
    mysteries.forEach(m => expect(m.type).toBe('unsolved_mystery'));
  });

  it('filters by living_experiment type', () => {
    const experiments = entries.getEntriesByType('living_experiment');
    expect(experiments.length).toBe(3);
  });

  it('filters by thought_experiment type', () => {
    const thoughts = entries.getEntriesByType('thought_experiment');
    expect(thoughts.length).toBe(3);
  });

  it('finds entry by ID', () => {
    const entry = entries.getEntryById('ship-of-theseus');
    expect(entry).toBeDefined();
    expect(entry!.type).toBe('thought_experiment');
    expect(entry!.title).toBe('The Ship of Theseus');
  });

  it('filters entries by world', () => {
    const thinkingGrove = entries.getEntriesByWorld('thinking-grove');
    expect(thinkingGrove.length).toBeGreaterThanOrEqual(3);
  });

  it('checks primary world assignments', () => {
    expect(entries.isPrimaryWorld('unsolved_mystery', 'calculation-caves')).toBe(true);
    expect(entries.isPrimaryWorld('living_experiment', 'meadow-lab')).toBe(true);
    expect(entries.isPrimaryWorld('thought_experiment', 'thinking-grove')).toBe(true);
    expect(entries.isPrimaryWorld('unsolved_mystery', 'thinking-grove')).toBe(false);
  });
});

// ── 8. Visitor Characters ────────────────────────────────────────

describe('VisitorCharacters', () => {
  const visitors = createVisitorCharacters();

  it('returns Compass definition', () => {
    const compass = visitors.getCompass();
    expect(compass.characterId).toBe('compass');
    expect(compass.modes.length).toBe(4);
    expect(compass.secret).toContain('hundreds of times');
  });

  it('returns all recurring visitors', () => {
    const recurring = visitors.getRecurringVisitors();
    expect(recurring.length).toBe(TOTAL_RECURRING_VISITORS);
  });

  it('returns all legendary figures', () => {
    const legendary = visitors.getLegendaryFigures();
    expect(legendary.length).toBe(TOTAL_LEGENDARY_FIGURES);
  });

  it('finds visitor by ID', () => {
    const idris = visitors.getVisitorById('idris-al-rashid');
    expect(idris).toBeDefined();
    expect(idris!.name).toBe('Idris al-Rashid');
  });

  it('gets visitors for a specific world', () => {
    const codeCanyon = visitors.getVisitorsForWorld('code-canyon');
    expect(codeCanyon.length).toBeGreaterThanOrEqual(2);
  });

  it('resolves Compass mode to challenge in Forgetting Well', () => {
    const state: KindlerVisitorState = {
      kindlerId: 'k1',
      seenLegendaryIds: new Set(),
      metRecurringIds: new Set(),
      lastVisitMs: Date.now(),
      currentWorldId: 'forgetting-well',
      isLost: false,
      recentDiscovery: false,
      isInForgettingWell: true,
      sparkLevel: 100,
    };
    const result = visitors.resolveCompassMode(state);
    expect(result.mode).toBe('challenge');
  });

  it('resolves Compass mode to celebrating on discovery', () => {
    const state: KindlerVisitorState = {
      kindlerId: 'k1',
      seenLegendaryIds: new Set(),
      metRecurringIds: new Set(),
      lastVisitMs: Date.now(),
      currentWorldId: 'cloud-kingdom',
      isLost: false,
      recentDiscovery: true,
      isInForgettingWell: false,
      sparkLevel: 100,
    };
    const result = visitors.resolveCompassMode(state);
    expect(result.mode).toBe('celebrating');
  });

  it('resolves Compass mode to orienting when lost', () => {
    const state: KindlerVisitorState = {
      kindlerId: 'k1',
      seenLegendaryIds: new Set(),
      metRecurringIds: new Set(),
      lastVisitMs: Date.now(),
      currentWorldId: 'cloud-kingdom',
      isLost: true,
      recentDiscovery: false,
      isInForgettingWell: false,
      sparkLevel: 100,
    };
    const result = visitors.resolveCompassMode(state);
    expect(result.mode).toBe('orienting');
  });

  it('resolves Compass mode to quiet by default', () => {
    const state: KindlerVisitorState = {
      kindlerId: 'k1',
      seenLegendaryIds: new Set(),
      metRecurringIds: new Set(),
      lastVisitMs: Date.now(),
      currentWorldId: 'cloud-kingdom',
      isLost: false,
      recentDiscovery: false,
      isInForgettingWell: false,
      sparkLevel: 100,
    };
    const result = visitors.resolveCompassMode(state);
    expect(result.mode).toBe('quiet');
  });

  it('detects legendary first visit', () => {
    const state: KindlerVisitorState = {
      kindlerId: 'k1',
      seenLegendaryIds: new Set(),
      metRecurringIds: new Set(),
      lastVisitMs: Date.now(),
      currentWorldId: 'meadow-lab',
      isLost: false,
      recentDiscovery: false,
      isInForgettingWell: false,
      sparkLevel: 100,
    };
    expect(visitors.isLegendaryFirstVisit('gregor-mendel', state)).toBe(true);

    const seenState: KindlerVisitorState = {
      ...state,
      seenLegendaryIds: new Set(['gregor-mendel']),
    };
    expect(visitors.isLegendaryFirstVisit('gregor-mendel', seenState)).toBe(false);
  });
});

// ── 9. Leitmotif Catalog ─────────────────────────────────────────

describe('LeitmotifCatalog', () => {
  const catalog = createLeitmotifCatalog();

  it('returns all leitmotifs matching TOTAL_LEITMOTIFS constant', () => {
    expect(catalog.getTotalCount()).toBe(TOTAL_LEITMOTIFS);
  });

  it('finds motif by character ID', () => {
    const nimbus = catalog.getMotifByCharacter('professor-nimbus');
    expect(nimbus).toBeDefined();
    expect(nimbus!.key).toBe('D major');
    expect(nimbus!.tempo).toBe('Andante');
    expect(nimbus!.leadInstrument).toBe('Oboe');
  });

  it('finds Compass motif', () => {
    const compass = catalog.getMotifByCharacter('compass');
    expect(compass).toBeDefined();
    expect(compass!.key).toBe("The child's favorite key");
    expect(compass!.mood).toBe('Orienting, safe');
  });

  it('filters motifs by key', () => {
    const dMajor = catalog.getMotifsByKey('D major');
    expect(dMajor.length).toBeGreaterThanOrEqual(4);
  });

  it('filters motifs by mood fragment', () => {
    const warm = catalog.getMotifsByMood('warm');
    expect(warm.length).toBeGreaterThanOrEqual(3);
  });

  it('returns undefined for unknown character', () => {
    expect(catalog.getMotifByCharacter('nonexistent')).toBeUndefined();
  });
});

// ── 10. Curriculum Map ───────────────────────────────────────────

describe('CurriculumMap', () => {
  const curriculum = createCurriculumMap();

  it('returns 15 STEM alignments', () => {
    expect(curriculum.getSTEMAlignments().length).toBe(TOTAL_STEM_WORLDS);
  });

  it('returns 10 Language Arts alignments', () => {
    expect(curriculum.getLanguageArtsAlignments().length).toBe(TOTAL_LANGUAGE_ARTS_WORLDS);
  });

  it('returns 10 Financial Literacy alignments', () => {
    expect(curriculum.getFinancialAlignments().length).toBe(TOTAL_FINANCIAL_WORLDS);
  });

  it('returns 8 cross-curricular highlights', () => {
    expect(curriculum.getCrossCurricularHighlights().length).toBe(TOTAL_CROSS_CURRICULAR_HIGHLIGHTS);
  });

  it('returns 3 grade mappings', () => {
    const grades = curriculum.getGradeMappings();
    expect(grades.length).toBe(3);
    expect(grades[0].ageLabel).toBe('ages-5-7');
    expect(grades[2].ageLabel).toBe('ages-11-13');
  });

  it('finds alignment by world ID', () => {
    const cloud = curriculum.getAlignmentByWorld('cloud-kingdom');
    expect(cloud).toBeDefined();
    expect('primaryNGSS' in cloud!).toBe(true);

    const storyTree = curriculum.getAlignmentByWorld('story-tree');
    expect(storyTree).toBeDefined();
    expect('primaryCCSS' in storyTree!).toBe(true);

    const market = curriculum.getAlignmentByWorld('market-square');
    expect(market).toBeDefined();
    expect('primaryStandards' in market!).toBe(true);
  });

  it('finds worlds by standard fragment', () => {
    const ngss = curriculum.getWorldsByStandard('ESS2');
    expect(ngss.length).toBeGreaterThanOrEqual(2);

    const jumpstart = curriculum.getWorldsByStandard('Jump$tart');
    expect(jumpstart.length).toBeGreaterThanOrEqual(5);
  });

  it('resolves domain for world', () => {
    expect(curriculum.getDomain('cloud-kingdom')).toBe('stem');
    expect(curriculum.getDomain('story-tree')).toBe('language-arts');
    expect(curriculum.getDomain('market-square')).toBe('financial-literacy');
    expect(curriculum.getDomain('nonexistent')).toBeUndefined();
  });
});
