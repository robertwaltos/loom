/**
 * quest-chains.ts — Cross-World Quest Chains from Bible v5 Part 9.
 *
 * 20 quest chains spanning 2-4 worlds each, teaching deep connections
 * between subjects. Unlocked after completing at least one entry in
 * each participating world. Completing a chain grants 25-50 Spark.
 *
 * Categories: STEM (4), Language Arts (3), Financial Literacy (2),
 * Cross-Realm (11).
 */

// ── Ports ────────────────────────────────────────────────────────

export interface QuestChainClockPort {
  readonly nowMs: () => number;
}

export interface QuestChainLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface QuestChainEventPort {
  readonly emit: (event: QuestChainEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const SPARK_GAIN_QUEST_MIN = 25;
export const SPARK_GAIN_QUEST_MAX = 50;
export const TOTAL_QUEST_CHAINS = 20;

// ── Types ────────────────────────────────────────────────────────

export type QuestCategory = 'stem' | 'language-arts' | 'financial-literacy' | 'cross-realm';

export type QuestChainStatus = 'locked' | 'available' | 'in-progress' | 'completed';

export type QuestChainEventKind =
  | 'quest-unlocked'
  | 'quest-started'
  | 'quest-step-completed'
  | 'quest-completed';

export interface QuestChainEvent {
  readonly kind: QuestChainEventKind;
  readonly questId: string;
  readonly kindlerId: string;
  readonly timestampMs: number;
}

export interface QuestStep {
  readonly stepIndex: number;
  readonly worldId: string;
  readonly description: string;
}

export interface QuestChainDefinition {
  readonly questId: string;
  readonly name: string;
  readonly category: QuestCategory;
  readonly description: string;
  readonly worldIds: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<QuestStep>;
  readonly sparkReward: number;
}

export interface KindlerQuestState {
  readonly kindlerId: string;
  readonly completedQuestIds: ReadonlySet<string>;
  readonly activeQuestIds: ReadonlySet<string>;
  readonly completedEntryWorldIds: ReadonlySet<string>;
  readonly completedSteps: ReadonlyMap<string, ReadonlySet<number>>;
}

export interface QuestAvailabilityResult {
  readonly questId: string;
  readonly status: QuestChainStatus;
  readonly missingWorldIds: ReadonlyArray<string>;
}

export interface QuestCompletionResult {
  readonly questId: string;
  readonly sparkGained: number;
  readonly allStepsComplete: boolean;
  readonly stepsRemaining: number;
}

// ── Quest Chain Definitions ──────────────────────────────────────

const QUEST_CHAINS: ReadonlyArray<QuestChainDefinition> = [
  // STEM
  {
    questId: 'climate-detective', name: 'The Climate Detective', category: 'stem',
    description: 'Follow the climate mystery from weather data to plant die-offs to ice core evidence to data analysis',
    worldIds: ['cloud-kingdom', 'meadow-lab', 'frost-peaks', 'data-stream'],
    steps: [
      { stepIndex: 0, worldId: 'cloud-kingdom', description: 'Investigate the anomalous cold zone' },
      { stepIndex: 1, worldId: 'meadow-lab', description: 'Examine plant die-off patterns' },
      { stepIndex: 2, worldId: 'frost-peaks', description: 'Analyze ice core evidence' },
      { stepIndex: 3, worldId: 'data-stream', description: 'Complete the final data analysis' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'energy-chain', name: 'The Energy Chain', category: 'stem',
    description: 'Trace energy from generation through mechanical transmission to digital control',
    worldIds: ['circuit-marsh', 'savanna-workshop', 'magnet-hills', 'code-canyon'],
    steps: [
      { stepIndex: 0, worldId: 'circuit-marsh', description: 'Study energy generation from solar panels' },
      { stepIndex: 1, worldId: 'savanna-workshop', description: 'Follow mechanical energy transmission' },
      { stepIndex: 2, worldId: 'magnet-hills', description: 'Observe force application' },
      { stepIndex: 3, worldId: 'code-canyon', description: 'Program digital control systems' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'water-trail', name: 'The Water Trail', category: 'stem',
    description: 'Follow a water molecule from evaporation to ocean to ice to the human body',
    worldIds: ['cloud-kingdom', 'tideline-bay', 'frost-peaks', 'body-atlas'],
    steps: [
      { stepIndex: 0, worldId: 'cloud-kingdom', description: 'Track evaporation processes' },
      { stepIndex: 1, worldId: 'tideline-bay', description: 'Follow the ocean cycle' },
      { stepIndex: 2, worldId: 'frost-peaks', description: 'Study water as ice' },
      { stepIndex: 3, worldId: 'body-atlas', description: 'Find water in the human body' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'space-mission', name: 'The Space Mission', category: 'stem',
    description: 'Design, program, build, and analyze a space mission across four worlds',
    worldIds: ['starfall-observatory', 'code-canyon', 'savanna-workshop', 'data-stream'],
    steps: [
      { stepIndex: 0, worldId: 'starfall-observatory', description: 'Plan the astronomy with Riku' },
      { stepIndex: 1, worldId: 'code-canyon', description: 'Write guidance software with Pixel' },
      { stepIndex: 2, worldId: 'savanna-workshop', description: 'Engineer the vehicle with Zara' },
      { stepIndex: 3, worldId: 'data-stream', description: 'Process mission data with Yuki' },
    ],
    sparkReward: 50,
  },
  // Language Arts
  {
    questId: 'lost-story', name: 'The Lost Story', category: 'language-arts',
    description: 'A story exists in fragments across four worlds, each in a different language and cultural tradition',
    worldIds: ['story-tree', 'translation-garden', 'folklore-bazaar', 'nonfiction-fleet'],
    steps: [
      { stepIndex: 0, worldId: 'story-tree', description: 'Find the first narrative fragment' },
      { stepIndex: 1, worldId: 'translation-garden', description: 'Translate the second fragment' },
      { stepIndex: 2, worldId: 'folklore-bazaar', description: 'Discover the cultural fragment' },
      { stepIndex: 3, worldId: 'nonfiction-fleet', description: 'Research the final piece' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'message-bottle', name: 'The Message in a Bottle', category: 'language-arts',
    description: 'Piece together a multi-format message across four worlds',
    worldIds: ['diary-lighthouse', 'reading-reef', 'illustration-cove', 'editing-tower'],
    steps: [
      { stepIndex: 0, worldId: 'reading-reef', description: 'Find the washed-up message' },
      { stepIndex: 1, worldId: 'diary-lighthouse', description: 'Match the diary entry' },
      { stepIndex: 2, worldId: 'illustration-cove', description: 'Decode the illustrations' },
      { stepIndex: 3, worldId: 'editing-tower', description: 'Assemble and edit the full message' },
    ],
    sparkReward: 40,
  },
  {
    questId: 'great-debate', name: 'The Great Debate', category: 'language-arts',
    description: 'Prepare for and execute a debate: research, structure, deliver',
    worldIds: ['debate-arena', 'nonfiction-fleet', 'grammar-bridge', 'punctuation-station'],
    steps: [
      { stepIndex: 0, worldId: 'nonfiction-fleet', description: 'Research evidence for both sides' },
      { stepIndex: 1, worldId: 'grammar-bridge', description: 'Structure the argument' },
      { stepIndex: 2, worldId: 'punctuation-station', description: 'Perfect the delivery' },
      { stepIndex: 3, worldId: 'debate-arena', description: 'Present the debate' },
    ],
    sparkReward: 40,
  },
  // Financial Literacy
  {
    questId: 'the-startup', name: 'The Startup', category: 'financial-literacy',
    description: 'Start a virtual business from idea through budgeting to market day to paying taxes',
    worldIds: ['entrepreneurs-workshop', 'budget-kitchen', 'market-square', 'tax-office'],
    steps: [
      { stepIndex: 0, worldId: 'entrepreneurs-workshop', description: 'Develop the business idea' },
      { stepIndex: 1, worldId: 'budget-kitchen', description: 'Create the budget' },
      { stepIndex: 2, worldId: 'market-square', description: 'Launch on market day' },
      { stepIndex: 3, worldId: 'tax-office', description: 'File taxes on earnings' },
    ],
    sparkReward: 40,
  },
  {
    questId: 'community-fund', name: 'The Community Fund', category: 'financial-literacy',
    description: 'Fund a new school through sharing, giving, saving, and smart spending',
    worldIds: ['sharing-meadow', 'charity-harbor', 'savings-vault', 'needs-wants-bridge'],
    steps: [
      { stepIndex: 0, worldId: 'sharing-meadow', description: 'Pool community resources' },
      { stepIndex: 1, worldId: 'charity-harbor', description: 'Organize charitable giving' },
      { stepIndex: 2, worldId: 'savings-vault', description: 'Set up a savings plan' },
      { stepIndex: 3, worldId: 'needs-wants-bridge', description: 'Prioritize spending decisions' },
    ],
    sparkReward: 40,
  },
  // Cross-Realm
  {
    questId: 'time-capsule', name: 'The Time Capsule', category: 'cross-realm',
    description: 'Create a time capsule that spans history, science, story, and value',
    worldIds: ['time-gallery', 'frost-peaks', 'story-tree', 'savings-vault'],
    steps: [
      { stepIndex: 0, worldId: 'time-gallery', description: 'Choose items representing the present' },
      { stepIndex: 1, worldId: 'frost-peaks', description: 'Select materials that will survive' },
      { stepIndex: 2, worldId: 'story-tree', description: 'Tell the story of the capsule' },
      { stepIndex: 3, worldId: 'savings-vault', description: 'Ensure it retains value' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'language-numbers', name: 'The Language of Numbers', category: 'cross-realm',
    description: 'Explore what language really means across math, music, code, and words',
    worldIds: ['number-garden', 'translation-garden', 'music-meadow', 'code-canyon'],
    steps: [
      { stepIndex: 0, worldId: 'number-garden', description: 'Discover math as a language' },
      { stepIndex: 1, worldId: 'translation-garden', description: 'Compare human languages' },
      { stepIndex: 2, worldId: 'music-meadow', description: 'Hear music as a language' },
      { stepIndex: 3, worldId: 'code-canyon', description: 'Write code as a language' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'body-budget', name: 'The Body Budget', category: 'cross-realm',
    description: 'Create a body budget: calories, energy, sleep, and emotional health',
    worldIds: ['body-atlas', 'budget-kitchen', 'wellness-garden', 'data-stream'],
    steps: [
      { stepIndex: 0, worldId: 'body-atlas', description: 'Study calorie inputs and outputs' },
      { stepIndex: 1, worldId: 'budget-kitchen', description: 'Plan nutritional budgets' },
      { stepIndex: 2, worldId: 'wellness-garden', description: 'Balance emotional resources' },
      { stepIndex: 3, worldId: 'data-stream', description: 'Track the body budget data' },
    ],
    sparkReward: 40,
  },
  {
    questId: 'story-money', name: 'The Story of Money', category: 'cross-realm',
    description: 'From barter to digital currency to philosophical questions about value',
    worldIds: ['barter-docks', 'market-square', 'code-canyon', 'thinking-grove'],
    steps: [
      { stepIndex: 0, worldId: 'barter-docks', description: 'Experience barter exchange' },
      { stepIndex: 1, worldId: 'market-square', description: 'Discover coins and currency' },
      { stepIndex: 2, worldId: 'code-canyon', description: 'Understand digital currency' },
      { stepIndex: 3, worldId: 'thinking-grove', description: 'Reflect on what value means' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'invention-school', name: 'The Invention of School', category: 'cross-realm',
    description: 'Trace why schools exist from labor to stories to funding to learning',
    worldIds: ['job-fair', 'story-tree', 'tax-office', 'wellness-garden'],
    steps: [
      { stepIndex: 0, worldId: 'job-fair', description: 'Discover child labor history' },
      { stepIndex: 1, worldId: 'story-tree', description: 'Explore education as narrative' },
      { stepIndex: 2, worldId: 'tax-office', description: 'Understand public school funding' },
      { stepIndex: 3, worldId: 'wellness-garden', description: 'Reflect on the experience of learning' },
    ],
    sparkReward: 40,
  },
  {
    questId: 'ecosystem-economy', name: 'The Ecosystem Economy', category: 'cross-realm',
    description: 'Compare natural ecosystems to human economics',
    worldIds: ['meadow-lab', 'sharing-meadow', 'tideline-bay', 'investment-greenhouse'],
    steps: [
      { stepIndex: 0, worldId: 'meadow-lab', description: 'Study energy flows in nature' },
      { stepIndex: 1, worldId: 'sharing-meadow', description: 'Compare to resource sharing' },
      { stepIndex: 2, worldId: 'tideline-bay', description: 'Observe ocean resource cycles' },
      { stepIndex: 3, worldId: 'investment-greenhouse', description: 'Map natural diversification' },
    ],
    sparkReward: 40,
  },
  {
    questId: 'bridge-between', name: 'The Bridge Between Worlds', category: 'cross-realm',
    description: 'Three bridges, three domains — what is a bridge, really?',
    worldIds: ['grammar-bridge', 'savanna-workshop', 'needs-wants-bridge', 'thinking-grove'],
    steps: [
      { stepIndex: 0, worldId: 'grammar-bridge', description: 'Use grammar bridges to connect ideas' },
      { stepIndex: 1, worldId: 'savanna-workshop', description: 'Build physical bridges' },
      { stepIndex: 2, worldId: 'needs-wants-bridge', description: 'Bridge needs and wants' },
      { stepIndex: 3, worldId: 'thinking-grove', description: 'Reflect with Old Rowan on what bridges mean' },
    ],
    sparkReward: 40,
  },
  {
    questId: 'archive-expedition', name: 'The Archive Expedition', category: 'cross-realm',
    description: 'The Librarian sends you to visit every world and bring one thing back',
    worldIds: ['great-archive'],
    steps: [
      { stepIndex: 0, worldId: 'great-archive', description: 'Receive the mission from The Librarian' },
      { stepIndex: 1, worldId: 'great-archive', description: 'Visit all 50 worlds and collect one memory from each' },
      { stepIndex: 2, worldId: 'great-archive', description: 'Display all 50 contributions in the Archive' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'fading-investigation', name: 'The Fading Investigation', category: 'cross-realm',
    description: 'Use the scientific method to investigate why the Fading happens',
    worldIds: ['great-archive', 'forgetting-well', 'thinking-grove', 'discovery-trail'],
    steps: [
      { stepIndex: 0, worldId: 'great-archive', description: 'Research the Fading phenomenon' },
      { stepIndex: 1, worldId: 'discovery-trail', description: 'Form and test hypotheses' },
      { stepIndex: 2, worldId: 'thinking-grove', description: 'Discuss with Old Rowan' },
      { stepIndex: 3, worldId: 'forgetting-well', description: 'Accept entropy, then fight it' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'universal-declaration', name: 'The Universal Declaration', category: 'cross-realm',
    description: "Create a Universal Declaration of What Children Deserve to Know",
    worldIds: ['thinking-grove', 'debate-arena', 'translation-garden', 'time-gallery'],
    steps: [
      { stepIndex: 0, worldId: 'debate-arena', description: 'Draft the declaration' },
      { stepIndex: 1, worldId: 'translation-garden', description: 'Translate into many languages' },
      { stepIndex: 2, worldId: 'time-gallery', description: 'Place it in historical context' },
      { stepIndex: 3, worldId: 'thinking-grove', description: 'Reflect on its meaning' },
    ],
    sparkReward: 50,
  },
  {
    questId: 'compass-origin', name: "Compass's Origin", category: 'cross-realm',
    description: "Discover who Compass is — the first Kindler, the first child who ever visited these worlds",
    worldIds: ['great-archive', 'forgetting-well'],
    steps: [
      { stepIndex: 0, worldId: 'great-archive', description: "Begin investigating Compass's past" },
      { stepIndex: 1, worldId: 'forgetting-well', description: "Descend through Compass's memories" },
      { stepIndex: 2, worldId: 'great-archive', description: "Understand Compass's choice to stay" },
    ],
    sparkReward: 50,
  },
];

// ── Port ─────────────────────────────────────────────────────────

export interface QuestChainPort {
  readonly getAllQuests: () => ReadonlyArray<QuestChainDefinition>;
  readonly getQuestById: (questId: string) => QuestChainDefinition | undefined;
  readonly getQuestsByCategory: (category: QuestCategory) => ReadonlyArray<QuestChainDefinition>;
  readonly checkAvailability: (questId: string, state: KindlerQuestState) => QuestAvailabilityResult;
  readonly evaluateCompletion: (questId: string, state: KindlerQuestState) => QuestCompletionResult;
  readonly getAvailableQuests: (state: KindlerQuestState) => ReadonlyArray<QuestAvailabilityResult>;
  readonly getTotalSparkAvailable: () => number;
}

// ── Implementation ───────────────────────────────────────────────

function getQuestById(questId: string): QuestChainDefinition | undefined {
  return QUEST_CHAINS.find(q => q.questId === questId);
}

function getQuestsByCategory(category: QuestCategory): ReadonlyArray<QuestChainDefinition> {
  return QUEST_CHAINS.filter(q => q.category === category);
}

function checkAvailability(questId: string, state: KindlerQuestState): QuestAvailabilityResult {
  const quest = getQuestById(questId);
  if (!quest) return { questId, status: 'locked', missingWorldIds: [] };

  if (state.completedQuestIds.has(questId)) {
    return { questId, status: 'completed', missingWorldIds: [] };
  }

  if (state.activeQuestIds.has(questId)) {
    return { questId, status: 'in-progress', missingWorldIds: [] };
  }

  const missingWorldIds = quest.worldIds.filter(id => !state.completedEntryWorldIds.has(id));
  return {
    questId,
    status: missingWorldIds.length === 0 ? 'available' : 'locked',
    missingWorldIds,
  };
}

function evaluateCompletion(questId: string, state: KindlerQuestState): QuestCompletionResult {
  const quest = getQuestById(questId);
  if (!quest) return { questId, sparkGained: 0, allStepsComplete: false, stepsRemaining: 0 };

  const completedSteps = state.completedSteps.get(questId) ?? new Set();
  const stepsRemaining = quest.steps.length - completedSteps.size;
  const allStepsComplete = stepsRemaining === 0;

  return {
    questId,
    sparkGained: allStepsComplete ? quest.sparkReward : 0,
    allStepsComplete,
    stepsRemaining,
  };
}

function getAvailableQuests(state: KindlerQuestState): ReadonlyArray<QuestAvailabilityResult> {
  return QUEST_CHAINS.map(q => checkAvailability(q.questId, state));
}

function getTotalSparkAvailable(): number {
  return QUEST_CHAINS.reduce((sum, q) => sum + q.sparkReward, 0);
}

// ── Factory ──────────────────────────────────────────────────────

export function createQuestChains(): QuestChainPort {
  return {
    getAllQuests: () => QUEST_CHAINS,
    getQuestById,
    getQuestsByCategory,
    checkAvailability,
    evaluateCompletion,
    getAvailableQuests,
    getTotalSparkAvailable,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface QuestChainEngine {
  readonly kind: 'quest-chains';
  readonly quests: QuestChainPort;
}

export function createQuestChainEngine(
  deps: { readonly clock: QuestChainClockPort; readonly log: QuestChainLogPort; readonly events: QuestChainEventPort },
): QuestChainEngine {
  const quests = createQuestChains();
  deps.log.info({ questCount: quests.getAllQuests().length }, 'Quest chains initialized');
  return { kind: 'quest-chains', quests };
}
