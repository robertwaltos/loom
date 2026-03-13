/**
 * entry-types.ts — New Entry Types from Bible v5 Part 11.
 *
 * Three new entry formats expanding the original entry system:
 * - Unsolved Mysteries (genuinely open questions)
 * - Living Experiments (phenomena currently unfolding)
 * - Thought Experiments (problems requiring only a mind)
 *
 * Each type has a canonical format, sample entries,
 * and world-assignment rules.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface EntryTypeClockPort {
  readonly nowMs: () => number;
}

export interface EntryTypeLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_ENTRY_TYPE_DEFINITIONS = 3;
export const SPARK_GAIN_ENTRY_MIN = 5;
export const SPARK_GAIN_ENTRY_MAX = 15;

// ── Types ────────────────────────────────────────────────────────

export type EntryTypeName = 'unsolved_mystery' | 'living_experiment' | 'thought_experiment';

export type UnsolvedMysteryStatus = 'open' | 'partially_solved' | 'contested';
export type LivingExperimentStatus = 'ongoing' | 'concluded' | 'paused';

export interface AgeContent {
  readonly ages5to7: string;
  readonly ages8to10: string;
}

export interface UnsolvedMysteryEntry {
  readonly entryId: string;
  readonly type: 'unsolved_mystery';
  readonly title: string;
  readonly status: UnsolvedMysteryStatus;
  readonly content: AgeContent;
  readonly knownTerritory: string;
  readonly unknownTerritory: string;
  readonly explorerPrompt: string;
  readonly worldIds: ReadonlyArray<string>;
}

export interface LivingExperimentEntry {
  readonly entryId: string;
  readonly type: 'living_experiment';
  readonly title: string;
  readonly status: LivingExperimentStatus;
  readonly content: AgeContent;
  readonly theQuestion: string;
  readonly currentData: string;
  readonly whatChangesThis: string;
  readonly worldConnection: string;
  readonly worldIds: ReadonlyArray<string>;
}

export interface ThoughtExperimentEntry {
  readonly entryId: string;
  readonly type: 'thought_experiment';
  readonly title: string;
  readonly origin: string;
  readonly theSetup: string;
  readonly theQuestion: string;
  readonly content: AgeContent;
  readonly whatItTests: string;
  readonly noAnswer: string;
  readonly guideMoment: string;
  readonly worldIds: ReadonlyArray<string>;
}

export type ExpandedEntry = UnsolvedMysteryEntry | LivingExperimentEntry | ThoughtExperimentEntry;

export interface EntryTypeWorldAssignment {
  readonly entryType: EntryTypeName;
  readonly primaryWorldIds: ReadonlyArray<string>;
}

// ── World Assignment Rules ───────────────────────────────────────

const WORLD_ASSIGNMENTS: ReadonlyArray<EntryTypeWorldAssignment> = [
  {
    entryType: 'unsolved_mystery',
    primaryWorldIds: ['calculation-caves', 'code-canyon', 'starfall-observatory'],
  },
  {
    entryType: 'living_experiment',
    primaryWorldIds: ['meadow-lab', 'data-stream', 'body-atlas'],
  },
  {
    entryType: 'thought_experiment',
    primaryWorldIds: ['thinking-grove', 'story-tree', 'forgetting-well'],
  },
];

// ── Sample Entries ───────────────────────────────────────────────

const SAMPLE_ENTRIES: ReadonlyArray<ExpandedEntry> = [
  // Unsolved Mysteries
  {
    entryId: 'why-we-sleep', type: 'unsolved_mystery', title: 'Why Do We Sleep?',
    status: 'partially_solved',
    content: {
      ages5to7: 'Every animal on Earth sleeps. Humans spend about a third of their lives unconscious. Nobody fully knows why.',
      ages8to10: 'Leading hypotheses: memory consolidation, cellular repair, metabolic waste clearance (the "glymphatic" system), immune regulation. No single theory explains everything.',
    },
    knownTerritory: 'Sleep deprivation is fatal eventually. Sleep has distinct stages. Memory consolidation happens during slow-wave and REM sleep.',
    unknownTerritory: 'Why sleep instead of another mechanism. Why consciousness dims so dramatically during sleep and whether it fully does.',
    explorerPrompt: 'If sleep were only for rest, you could rest while awake. It\'s clearly doing something else. What would you design a study to find out?',
    worldIds: ['body-atlas', 'thinking-grove'],
  },
  {
    entryId: 'what-is-consciousness', type: 'unsolved_mystery', title: 'What Is Consciousness?',
    status: 'open',
    content: {
      ages5to7: 'You know you are here. You notice things. You have feelings. Where does this come from?',
      ages8to10: 'The "Hard Problem of Consciousness" (David Chalmers, 1995): explaining why there is subjective experience at all, not just how the brain processes information.',
    },
    knownTerritory: 'Brain activity correlates with conscious experience. Damage to specific brain areas predictably changes specific experiences.',
    unknownTerritory: 'Why any physical process produces experience rather than simply information processing in the dark.',
    explorerPrompt: 'A robot with all the same processes as a human brain would still have to explain why it feels anything, if it does. What would count as proof that it did?',
    worldIds: ['thinking-grove', 'code-canyon'],
  },
  {
    entryId: 'prime-numbers', type: 'unsolved_mystery', title: 'What Are Prime Numbers For?',
    status: 'open',
    content: {
      ages5to7: 'Prime numbers appear scattered through the number line with no obvious pattern. They never seem random, but no formula predicts where the next one will be.',
      ages8to10: 'The Riemann Hypothesis (1859) predicts the precise distribution of primes and has been verified for the first 10 trillion primes — but not proved. One of the Millennium Prize Problems.',
    },
    knownTerritory: 'Primes become less frequent as numbers grow, following a statistical distribution described by the Prime Number Theorem.',
    unknownTerritory: 'Whether the Riemann Hypothesis is actually true. Why primes cluster when they do.',
    explorerPrompt: 'The internet\'s security depends on prime numbers being hard to find. What would change if we found a pattern?',
    worldIds: ['calculation-caves', 'number-garden'],
  },
  // Living Experiments
  {
    entryId: 'mass-extinction', type: 'living_experiment', title: 'The Ongoing Mass Extinction',
    status: 'ongoing',
    content: {
      ages5to7: 'Scientists track how many species disappear every year. Right now, species are going extinct at a rate far faster than the normal pace.',
      ages8to10: 'The IUCN Red List monitors 150,000+ species. The current extinction rate is estimated at 1,000x the natural background rate.',
    },
    theQuestion: 'Can human activity reverse a mass extinction event, or only slow it?',
    currentData: 'Several species have recovered from near-extinction through conservation. Many flagship species are increasing. Many others continue declining despite action.',
    whatChangesThis: 'Proof that biodiversity loss is consistently reversible with sufficient intervention — or evidence that ecosystem collapse accelerates past intervention thresholds.',
    worldConnection: 'Baxter at the Meadow Lab tracks real-world threatened species data on the Lab\'s monitoring board.',
    worldIds: ['meadow-lab', 'tideline-bay'],
  },
  {
    entryId: 'global-microbiome', type: 'living_experiment', title: 'The Global Microbiome Study',
    status: 'ongoing',
    content: {
      ages5to7: 'Scientists are collecting gut microbiome samples from people in many different countries and comparing them.',
      ages8to10: 'The American Gut Project and related initiatives have collected hundreds of thousands of samples. Evidence suggests urbanisation narrows microbiome diversity, correlating with higher chronic disease.',
    },
    theQuestion: 'Does microbiome diversity directly cause health benefits, or do both result from a shared third factor?',
    currentData: 'Diversity correlates with health outcomes. Intervention studies show measurable diversity increases.',
    whatChangesThis: 'A long-term randomised trial showing microbiome intervention directly changing health outcomes — or evidence that the correlation is confounded.',
    worldConnection: 'Dr. Obi maintains a live microbiome diversity map in the Body Atlas that updates with new global data.',
    worldIds: ['body-atlas', 'data-stream'],
  },
  {
    entryId: 'ml-employment', type: 'living_experiment', title: 'Machine Learning\'s Effect on Employment',
    status: 'ongoing',
    content: {
      ages5to7: 'Computers are getting very good at doing tasks that used to require human judgment. This is changing many jobs.',
      ages8to10: 'Previous automation waves ultimately created more total employment than they displaced — but with severe disruption. Whether AI follows the same pattern is genuinely unknown.',
    },
    theQuestion: 'Will AI automation create more jobs than it eliminates, as previous automation waves did?',
    currentData: 'High displacement in routine cognitive tasks. Increase in AI oversight roles. Net employment picture unclear.',
    whatChangesThis: 'Better long-term data on which job categories are net positive versus net negative.',
    worldConnection: 'Yuki\'s Data Stream runs a quarterly survey visualisation from the employment monitoring panel.',
    worldIds: ['data-stream', 'code-canyon', 'job-fair'],
  },
  // Thought Experiments
  {
    entryId: 'ship-of-theseus', type: 'thought_experiment', title: 'The Ship of Theseus',
    origin: 'Ancient Greece / Plutarch, 1st century CE',
    theSetup: 'A famous ship is preserved in a harbour. Over the years, as planks rot, they are replaced — one by one — until every original plank has been replaced. Is it still the same ship?',
    theQuestion: 'What makes something "the same" thing over time?',
    content: {
      ages5to7: 'Imagine your favourite teddy bear got repaired so many times that eventually every piece was new. Is it still the same teddy bear?',
      ages8to10: 'The thought experiment probes identity over time. Your body replaces most of its cells over years — are you the same person?',
    },
    whatItTests: 'Whether identity is continuous substance, continuous form, or continuous history.',
    noAnswer: 'Philosophers disagree. Continuity theorists: history matters. Essentialists: something must carry forward. The tension reveals the assumptions in how you argued.',
    guideMoment: 'Anaya poses this when children return to a story orb: "Same orb, new experience. Same story, different you. Is it the same story?"',
    worldIds: ['thinking-grove', 'story-tree'],
  },
  {
    entryId: 'trolley-problem', type: 'thought_experiment', title: 'The Trolley Problem',
    origin: 'Philippa Foot, 1967 / Judith Jarvis Thomson, 1985',
    theSetup: 'A runaway trolley heads toward five people. You can pull a lever to divert it onto a side track — but one person is there. Do you pull the lever?',
    theQuestion: 'Is it worse to cause harm or to allow harm?',
    content: {
      ages5to7: 'If you had to choose between one bad thing happening and five bad things happening, and you were the only one who could decide — what would you do?',
      ages8to10: 'Most people pull the lever — but resist the variant where you must physically push someone. Why does the method matter morally if the outcome doesn\'t change?',
    },
    whatItTests: 'Whether moral intuitions are consistent, and whether "doing" versus "allowing" is a meaningful ethical distinction.',
    noAnswer: 'Utilitarians: pull the lever (five > one). Deontologists: direct killing is categorically different. Neither has defeated the other in 50 years.',
    guideMoment: 'Hugo poses a chemistry version about releasing a chemical to save the Greenhouse.',
    worldIds: ['thinking-grove', 'forgetting-well'],
  },
  {
    entryId: 'schrodingers-cat', type: 'thought_experiment', title: "Schr\u00F6dinger's Cat",
    origin: 'Erwin Schr\u00F6dinger, 1935',
    theSetup: 'A cat in a sealed box with a device that may release poison based on a quantum event. Until you open the box — is the cat both alive and dead simultaneously?',
    theQuestion: 'Does quantum mechanics describe reality or only our information about it?',
    content: {
      ages5to7: 'Imagine you hid a surprise and you don\'t know yet if it\'s the one you wanted. Before you look — is it both possibilities at once?',
      ages8to10: 'Schr\u00F6dinger invented this to show quantum superposition becomes absurd at human scales. The "measurement problem" is still debated among physicists.',
    },
    whatItTests: 'Whether quantum mechanics describes physical reality or only our information about it.',
    noAnswer: 'Copenhagen, Many-Worlds, Pilot Wave — all handle the measurement problem differently. None has been experimentally disproved.',
    guideMoment: 'Riku poses this from the Observatory\'s sealed specimen box: "Before I open this, it contains either a working telescope or a broken one."',
    worldIds: ['starfall-observatory', 'thinking-grove'],
  },
];

// ── Port ─────────────────────────────────────────────────────────

export interface EntryTypePort {
  readonly getAllEntries: () => ReadonlyArray<ExpandedEntry>;
  readonly getEntryById: (entryId: string) => ExpandedEntry | undefined;
  readonly getEntriesByType: (type: EntryTypeName) => ReadonlyArray<ExpandedEntry>;
  readonly getEntriesByWorld: (worldId: string) => ReadonlyArray<ExpandedEntry>;
  readonly getWorldAssignments: () => ReadonlyArray<EntryTypeWorldAssignment>;
  readonly isPrimaryWorld: (entryType: EntryTypeName, worldId: string) => boolean;
}

// ── Implementation ───────────────────────────────────────────────

function getAllEntries(): ReadonlyArray<ExpandedEntry> {
  return SAMPLE_ENTRIES;
}

function getEntryById(entryId: string): ExpandedEntry | undefined {
  return SAMPLE_ENTRIES.find(e => e.entryId === entryId);
}

function getEntriesByType(type: EntryTypeName): ReadonlyArray<ExpandedEntry> {
  return SAMPLE_ENTRIES.filter(e => e.type === type);
}

function getEntriesByWorld(worldId: string): ReadonlyArray<ExpandedEntry> {
  return SAMPLE_ENTRIES.filter(e => e.worldIds.includes(worldId));
}

function isPrimaryWorld(entryType: EntryTypeName, worldId: string): boolean {
  const assignment = WORLD_ASSIGNMENTS.find(a => a.entryType === entryType);
  return assignment?.primaryWorldIds.includes(worldId) ?? false;
}

// ── Factory ──────────────────────────────────────────────────────

export function createEntryTypes(): EntryTypePort {
  return {
    getAllEntries,
    getEntryById,
    getEntriesByType,
    getEntriesByWorld,
    getWorldAssignments: () => WORLD_ASSIGNMENTS,
    isPrimaryWorld,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface EntryTypeEngine {
  readonly kind: 'entry-types';
  readonly entries: EntryTypePort;
}

export function createEntryTypeEngine(
  deps: { readonly clock: EntryTypeClockPort; readonly log: EntryTypeLogPort },
): EntryTypeEngine {
  const entries = createEntryTypes();
  deps.log.info({ entryCount: entries.getAllEntries().length }, 'Entry types initialized');
  return { kind: 'entry-types', entries };
}
