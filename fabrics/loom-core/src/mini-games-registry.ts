/**
 * mini-games-registry.ts — World-Specific Mini-Games from Bible v5 Part 8.
 *
 * Each world has a signature mini-game that teaches its core concept
 * through play. All 50 games are repeatable, have difficulty scaling,
 * and contribute to world luminance. Completing a mini-game grants
 * 3-8 Spark depending on performance.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface MiniGameClockPort {
  readonly nowMs: () => number;
}

export interface MiniGameLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface MiniGameEventPort {
  readonly emit: (event: MiniGameEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const SPARK_GAIN_MIN = 3;
export const SPARK_GAIN_MAX = 8;
export const DIFFICULTY_LEVELS = 5;
export const LUMINANCE_GAIN_PER_GAME = 1;
export const TOTAL_MINI_GAMES = 50;

// ── Types ────────────────────────────────────────────────────────

export type MiniGameEventKind =
  | 'game-started'
  | 'game-completed'
  | 'difficulty-increased'
  | 'high-score-achieved';

export interface MiniGameEvent {
  readonly kind: MiniGameEventKind;
  readonly gameId: string;
  readonly kindlerId: string;
  readonly timestampMs: number;
}

export type Realm = 'stem' | 'language-arts' | 'financial-literacy' | 'crossroads';

export interface MiniGameDefinition {
  readonly gameId: string;
  readonly worldId: string;
  readonly name: string;
  readonly mechanic: string;
  readonly learningObjective: string;
  readonly realm: Realm;
  readonly maxDifficulty: number;
}

export interface MiniGameSession {
  readonly sessionId: string;
  readonly gameId: string;
  readonly kindlerId: string;
  readonly difficulty: number;
  readonly score: number;
  readonly maxScore: number;
  readonly completedAt: number;
}

export interface MiniGameResult {
  readonly sparkGained: number;
  readonly luminanceGained: number;
  readonly newHighScore: boolean;
  readonly difficultyUnlocked: number | null;
}

export interface KindlerGameState {
  readonly kindlerId: string;
  readonly highScores: ReadonlyMap<string, number>;
  readonly maxDifficultyReached: ReadonlyMap<string, number>;
  readonly totalGamesPlayed: number;
}

// ── Mini-Game Definitions — All 50 Worlds ────────────────────────

const MINI_GAMES: ReadonlyArray<MiniGameDefinition> = [
  // STEM
  { gameId: 'storm-chaser', worldId: 'cloud-kingdom', name: 'Storm Chaser', mechanic: 'Predict weather patterns from observation clues', learningObjective: 'Observation, prediction, Beaufort Scale', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'bridge-builder', worldId: 'savanna-workshop', name: 'Bridge Builder', mechanic: 'Design and stress-test bridges with limited materials', learningObjective: 'Engineering constraints, load-bearing', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'reef-rescue', worldId: 'tideline-bay', name: 'Reef Rescue', mechanic: 'Identify and restore coral species', learningObjective: 'Species identification, ecosystem health', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'pollination-run', worldId: 'meadow-lab', name: 'Pollination Run', mechanic: 'Guide Baxter through flowers in correct sequence', learningObjective: 'Pollination, plant reproduction', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'star-finder', worldId: 'starfall-observatory', name: 'Star Finder', mechanic: "Identify constellations from Riku's descriptions (audio only)", learningObjective: 'Constellation knowledge, spatial reasoning', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'pattern-picker', worldId: 'number-garden', name: 'Pattern Picker', mechanic: 'Extend mathematical sequences (Fibonacci, prime, triangular)', learningObjective: 'Pattern recognition, sequences', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'crystal-math', worldId: 'calculation-caves', name: 'Crystal Math', mechanic: 'Solve arithmetic by combining colored crystals', learningObjective: 'Four operations, mental math', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'force-lab', worldId: 'magnet-hills', name: 'Force Lab', mechanic: 'Predict motion outcomes from applied forces', learningObjective: "Newton's laws, prediction", realm: 'stem', maxDifficulty: 5 },
  { gameId: 'circuit-builder', worldId: 'circuit-marsh', name: 'Circuit Builder', mechanic: 'Complete circuits to power devices', learningObjective: 'Series/parallel circuits, conductors', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'bug-hunt', worldId: 'code-canyon', name: 'Bug Hunt', mechanic: 'Find and fix logical errors in simple programs', learningObjective: 'Debugging, logical thinking', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'system-tracer', worldId: 'body-atlas', name: 'System Tracer', mechanic: "Trace a red blood cell's journey through the body", learningObjective: 'Circulatory system, organ function', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'layer-reader', worldId: 'frost-peaks', name: 'Layer Reader', mechanic: 'Identify geological eras from rock layer clues', learningObjective: 'Stratigraphy, geological time', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'mix-master', worldId: 'greenhouse-spiral', name: 'Mix Master', mechanic: 'Combine elements to create target compounds', learningObjective: 'Basic chemistry, mixtures vs compounds', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'graph-detective', worldId: 'data-stream', name: 'Graph Detective', mechanic: 'Answer questions by reading different chart types', learningObjective: 'Data literacy, graph interpretation', realm: 'stem', maxDifficulty: 5 },
  { gameId: 'navigator', worldId: 'map-room', name: 'Navigator', mechanic: 'Navigate to coordinates using only latitude/longitude', learningObjective: 'Coordinate systems, navigation', realm: 'stem', maxDifficulty: 5 },
  // Language Arts
  { gameId: 'story-bones', worldId: 'story-tree', name: 'Story Bones', mechanic: 'Arrange narrative elements into a complete story', learningObjective: 'Story structure, narrative arc', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'rhyme-catcher', worldId: 'rhyme-docks', name: 'Rhyme Catcher', mechanic: 'Match rhyming words falling from the sky', learningObjective: 'Phonemic awareness, rhyme', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'symbol-maker', worldId: 'letter-forge', name: 'Symbol Maker', mechanic: 'Create writing symbols that represent sounds', learningObjective: 'Phonics, writing systems', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'deep-read', worldId: 'reading-reef', name: 'Deep Read', mechanic: 'Answer comprehension questions about short passages', learningObjective: 'Reading comprehension, inference', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'sentence-builder', worldId: 'grammar-bridge', name: 'Sentence Builder', mechanic: 'Construct grammatically correct sentences from word blocks', learningObjective: 'Grammar, syntax', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'root-tracker', worldId: 'vocabulary-jungle', name: 'Root Tracker', mechanic: 'Trace English words back to their language of origin', learningObjective: 'Etymology, word roots', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'signal-setter', worldId: 'punctuation-station', name: 'Signal Setter', mechanic: 'Place punctuation in unpunctuated text', learningObjective: 'Punctuation rules, readability', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'argument-mapper', worldId: 'debate-arena', name: 'Argument Mapper', mechanic: 'Sort claims into evidence, opinion, and fallacy', learningObjective: 'Critical thinking, argument structure', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'free-write', worldId: 'diary-lighthouse', name: 'Free Write', mechanic: 'Timed creative writing with no wrong answers', learningObjective: 'Creative writing, self-expression', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'crystal-speller', worldId: 'spelling-mines', name: 'Crystal Speller', mechanic: 'Spell words by mining correct letter crystals', learningObjective: 'Spelling, letter patterns', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'greeting-collector', worldId: 'translation-garden', name: 'Greeting Collector', mechanic: 'Learn greetings in different languages', learningObjective: 'Multilingual awareness', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'source-checker', worldId: 'nonfiction-fleet', name: 'Source Checker', mechanic: 'Evaluate sources as reliable, unreliable, or biased', learningObjective: 'Information literacy, source evaluation', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'silent-story', worldId: 'illustration-cove', name: 'Silent Story', mechanic: 'Tell a story using only images (no text)', learningObjective: 'Visual literacy, sequential art', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'tale-trader', worldId: 'folklore-bazaar', name: 'Tale Trader', mechanic: 'Trade stories between cultural stalls, finding common themes', learningObjective: 'Comparative mythology, cultural literacy', realm: 'language-arts', maxDifficulty: 5 },
  { gameId: 'draft-polisher', worldId: 'editing-tower', name: 'Draft Polisher', mechanic: 'Improve a rough draft through revision rounds', learningObjective: 'Editing skills, revision process', realm: 'language-arts', maxDifficulty: 5 },
  // Financial Literacy
  { gameId: 'fair-trade', worldId: 'market-square', name: 'Fair Trade', mechanic: 'Negotiate prices with NPC customers', learningObjective: 'Negotiation, fair exchange', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'growth-watcher', worldId: 'savings-vault', name: 'Growth Watcher', mechanic: 'Choose saving strategies and watch compound interest over time', learningObjective: 'Compound interest, patience', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'meal-planner', worldId: 'budget-kitchen', name: 'Meal Planner', mechanic: 'Plan a week of meals within a budget', learningObjective: 'Budgeting, nutrition, math', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'prototype-sprint', worldId: 'entrepreneurs-workshop', name: 'Prototype Sprint', mechanic: 'Design, test, and iterate a product with limited resources', learningObjective: 'Design thinking, iteration', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'community-pool', worldId: 'sharing-meadow', name: 'Community Pool', mechanic: 'Allocate shared resources fairly among community members', learningObjective: 'Resource allocation, fairness', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'seed-picker', worldId: 'investment-greenhouse', name: 'Seed Picker', mechanic: 'Choose investments (seeds) and observe growth over seasons', learningObjective: 'Risk/reward, diversification', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'sort-master', worldId: 'needs-wants-bridge', name: 'Sort Master', mechanic: 'Rapidly categorize items as needs or wants', learningObjective: 'Financial decision-making', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'trade-chain', worldId: 'barter-docks', name: 'Trade Chain', mechanic: 'Complete a chain of barter exchanges to get a target item', learningObjective: 'Barter systems, value exchange', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'ice-manager', worldId: 'debt-glacier', name: 'Ice Manager', mechanic: 'Borrow and repay ice with interest, avoiding avalanche', learningObjective: 'Debt management, interest', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'skill-match', worldId: 'job-fair', name: 'Skill Match', mechanic: 'Match skills to careers through interactive booth visits', learningObjective: 'Career exploration', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'impact-calculator', worldId: 'charity-harbor', name: 'Impact Calculator', mechanic: 'Maximize impact of a charitable donation across options', learningObjective: 'Effective giving, cost-benefit', realm: 'financial-literacy', maxDifficulty: 5 },
  { gameId: 'city-builder', worldId: 'tax-office', name: 'City Builder', mechanic: 'Fund public services with tax revenue, balancing needs', learningObjective: 'Taxation, public services', realm: 'financial-literacy', maxDifficulty: 5 },
  // Crossroads / Hub / Universal
  { gameId: 'question-crafter', worldId: 'great-archive', name: 'Question Crafter', mechanic: 'Formulate research questions from curiosity prompts', learningObjective: 'Inquiry skills', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'design-challenge', worldId: 'workshop-crossroads', name: 'Design Challenge', mechanic: 'Solve cross-disciplinary problems using design thinking', learningObjective: 'Design thinking process', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'hypothesis-tester', worldId: 'discovery-trail', name: 'Hypothesis Tester', mechanic: 'Form and test hypotheses through mini-experiments', learningObjective: 'Scientific method', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'perspective-shift', worldId: 'thinking-grove', name: 'Perspective Shift', mechanic: 'See an ethical scenario from multiple viewpoints', learningObjective: 'Ethical reasoning, empathy', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'emotion-garden', worldId: 'wellness-garden', name: 'Emotion Garden', mechanic: 'Tend to emotional plants through mindfulness activities', learningObjective: 'Emotional regulation', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'timeline-builder', worldId: 'time-gallery', name: 'Timeline Builder', mechanic: 'Place events in chronological order across eras', learningObjective: 'Historical thinking, chronology', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'rhythm-maker', worldId: 'music-meadow', name: 'Rhythm Maker', mechanic: 'Create rhythmic patterns using natural percussion', learningObjective: 'Rhythm, math-music connection', realm: 'crossroads', maxDifficulty: 5 },
  { gameId: 'compass-challenge', worldId: 'everywhere', name: 'Compass Challenge', mechanic: 'Navigate between worlds using only clues about connections', learningObjective: 'Cross-disciplinary knowledge', realm: 'crossroads', maxDifficulty: 5 },
];

// ── Port ─────────────────────────────────────────────────────────

export interface MiniGamesPort {
  readonly getAllGames: () => ReadonlyArray<MiniGameDefinition>;
  readonly getGameById: (gameId: string) => MiniGameDefinition | undefined;
  readonly getGamesByWorld: (worldId: string) => ReadonlyArray<MiniGameDefinition>;
  readonly getGamesByRealm: (realm: Realm) => ReadonlyArray<MiniGameDefinition>;
  readonly computeSparkGain: (score: number, maxScore: number) => number;
  readonly computeResult: (session: MiniGameSession, state: KindlerGameState) => MiniGameResult;
  readonly getGameCount: () => number;
}

// ── Implementation ───────────────────────────────────────────────

function getGameById(gameId: string): MiniGameDefinition | undefined {
  return MINI_GAMES.find(g => g.gameId === gameId);
}

function getGamesByWorld(worldId: string): ReadonlyArray<MiniGameDefinition> {
  return MINI_GAMES.filter(g => g.worldId === worldId);
}

function getGamesByRealm(realm: Realm): ReadonlyArray<MiniGameDefinition> {
  return MINI_GAMES.filter(g => g.realm === realm);
}

function computeSparkGain(score: number, maxScore: number): number {
  if (maxScore === 0) return SPARK_GAIN_MIN;
  const ratio = score / maxScore;
  return Math.round(SPARK_GAIN_MIN + (SPARK_GAIN_MAX - SPARK_GAIN_MIN) * ratio);
}

function computeResult(session: MiniGameSession, state: KindlerGameState): MiniGameResult {
  const sparkGained = computeSparkGain(session.score, session.maxScore);
  const prevHigh = state.highScores.get(session.gameId) ?? 0;
  const newHighScore = session.score > prevHigh;

  const game = getGameById(session.gameId);
  const prevDiff = state.maxDifficultyReached.get(session.gameId) ?? 1;
  const ratio = session.maxScore > 0 ? session.score / session.maxScore : 0;
  const difficultyUnlocked = ratio >= 0.8 && prevDiff < (game?.maxDifficulty ?? DIFFICULTY_LEVELS)
    ? prevDiff + 1
    : null;

  return {
    sparkGained,
    luminanceGained: LUMINANCE_GAIN_PER_GAME,
    newHighScore,
    difficultyUnlocked,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createMiniGamesRegistry(): MiniGamesPort {
  return {
    getAllGames: () => MINI_GAMES,
    getGameById,
    getGamesByWorld,
    getGamesByRealm,
    computeSparkGain,
    computeResult,
    getGameCount: () => MINI_GAMES.length,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface MiniGamesEngine {
  readonly kind: 'mini-games';
  readonly games: MiniGamesPort;
}

export function createMiniGamesEngine(
  deps: { readonly clock: MiniGameClockPort; readonly log: MiniGameLogPort; readonly events: MiniGameEventPort },
): MiniGamesEngine {
  const games = createMiniGamesRegistry();
  deps.log.info({ gameCount: games.getGameCount() }, 'Mini-games registry initialized');
  return { kind: 'mini-games', games };
}
