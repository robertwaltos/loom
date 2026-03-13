/**
 * visitor-characters.ts — Visitor Characters & Legendary Figures from Bible v5 Part 13.
 *
 * Three categories of cross-world characters:
 * - The Compass: universal guide with 4 modes + a secret
 * - 9 Recurring Visitors: themed travelers with appearance triggers
 * - 12 Legendary Figures: historical people who appear once per entry
 *
 * Visitor characters are NOT bound to one world — they travel.
 * Legendary figures appear briefly at their defining entry, then
 * become ambient background figures.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface VisitorClockPort {
  readonly nowMs: () => number;
}

export interface VisitorLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface VisitorEventPort {
  readonly emit: (event: VisitorEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_RECURRING_VISITORS = 9;
export const TOTAL_LEGENDARY_FIGURES = 12;
export const COMPASS_MODE_COUNT = 4;

// ── Types ────────────────────────────────────────────────────────

export type CompassMode = 'orienting' | 'celebrating' | 'challenge' | 'quiet';
export type VisitorCategory = 'compass' | 'recurring' | 'legendary';
export type LegendaryVisibility = 'first-visit' | 'ambient';

export type VisitorEventKind =
  | 'compass-mode-changed'
  | 'visitor-appeared'
  | 'visitor-departed'
  | 'legendary-first-seen';

export interface VisitorEvent {
  readonly kind: VisitorEventKind;
  readonly characterId: string;
  readonly worldId: string;
  readonly timestampMs: number;
}

export interface CompassDefinition {
  readonly characterId: 'compass';
  readonly category: 'compass';
  readonly name: 'The Compass';
  readonly description: string;
  readonly modes: ReadonlyArray<CompassModeDefinition>;
  readonly secret: string;
}

export interface CompassModeDefinition {
  readonly mode: CompassMode;
  readonly trigger: string;
  readonly behavior: string;
}

export interface RecurringVisitorDefinition {
  readonly characterId: string;
  readonly category: 'recurring';
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly appearsTrigger: string;
  readonly signatureLine: string;
  readonly worldIds: ReadonlyArray<string>;
}

export interface LegendaryFigureDefinition {
  readonly characterId: string;
  readonly category: 'legendary';
  readonly name: string;
  readonly worldId: string;
  readonly behavior: string;
}

export type VisitorDefinition = CompassDefinition | RecurringVisitorDefinition | LegendaryFigureDefinition;

export interface KindlerVisitorState {
  readonly kindlerId: string;
  readonly seenLegendaryIds: ReadonlySet<string>;
  readonly metRecurringIds: ReadonlySet<string>;
  readonly lastVisitMs: number;
  readonly currentWorldId: string;
  readonly isLost: boolean;
  readonly recentDiscovery: boolean;
  readonly isInForgettingWell: boolean;
  readonly sparkLevel: number;
}

export interface CompassModeResult {
  readonly mode: CompassMode;
  readonly reason: string;
}

// ── Compass ──────────────────────────────────────────────────────

const COMPASS: CompassDefinition = {
  characterId: 'compass',
  category: 'compass',
  name: 'The Compass',
  description: 'The universal guide — belongs to no world and all worlds. Changes form slightly per realm. Her voice is the same everywhere.',
  modes: [
    {
      mode: 'orienting',
      trigger: 'Child is lost, stuck, or absent for a long time',
      behavior: 'Does not pull toward a specific world — asks where the child wants to go',
    },
    {
      mode: 'celebrating',
      trigger: 'New Threadway discovered or significant entry completed',
      behavior: 'Brief, warm, never over-long',
    },
    {
      mode: 'challenge',
      trigger: 'Inside the Forgetting Well',
      behavior: 'More serious. Asks questions rather than offering help. She trusts the child.',
    },
    {
      mode: 'quiet',
      trigger: 'No specific trigger — ambient presence',
      behavior: 'Walks alongside. No dialogue. Available.',
    },
  ],
  secret: 'She has visited every world hundreds of times. She knows each guide personally. Children who spend enough time begin to suspect this. This is intended.',
};

// ── Recurring Visitors ───────────────────────────────────────────

const RECURRING_VISITORS: ReadonlyArray<RecurringVisitorDefinition> = [
  {
    characterId: 'idris-al-rashid', category: 'recurring',
    name: 'Idris al-Rashid', title: 'The Wandering Scholar',
    description: 'A traveller carrying a book that seems too large for its cover. Speaks five languages and prefers to answer questions with better questions. Origin: Baghdad, 9th century.',
    appearsTrigger: 'Children begin connecting mathematical and geographic entries across realms',
    signatureLine: 'Knowledge moved in all directions along the Silk Road. The question was never who invented what. The question was who taught it next.',
    worldIds: ['calculation-caves', 'map-room', 'folklore-bazaar'],
  },
  {
    characterId: 'valentina-da-silva', category: 'recurring',
    name: 'Valentina da Silva', title: 'The Correspondent',
    description: 'A journalist with a notebook and the specific posture of someone deciding whether to believe what she has been told.',
    appearsTrigger: 'Children engage with source evaluation entries',
    signatureLine: "The story I'm most suspicious of is the one I already agree with. That's the one I fact-check twice.",
    worldIds: ['nonfiction-fleet', 'data-stream', 'debate-arena'],
  },
  {
    characterId: 'elias-osei', category: 'recurring',
    name: 'Elias Osei', title: 'The Restorer',
    description: 'A conservator carrying restoration tools. His specialty is recovering what was nearly lost.',
    appearsTrigger: 'Children encounter entries about suppressed or overlooked figures',
    signatureLine: "The record isn't broken. It's incomplete. There's a difference. Incomplete can be worked on.",
    worldIds: ['story-tree', 'great-archive', 'forgetting-well'],
  },
  {
    characterId: 'ada-lovelace', category: 'recurring',
    name: 'Ada Lovelace', title: "The Engineer's Ghost",
    description: 'A spectral figure who will only speak in complete logical statements. She does not explain herself.',
    appearsTrigger: 'Children complete the first sequence of programming logic entries',
    signatureLine: 'The Analytical Engine has no power of originating anything. It can only do what we know how to order it to perform. So far. For now.',
    worldIds: ['code-canyon', 'circuit-marsh'],
  },
  {
    characterId: 'harriet-tubman', category: 'recurring',
    name: 'Harriet Tubman', title: 'The Challenger',
    description: 'Does not give advice. Asks questions about what the child intends to do with what they have learned.',
    appearsTrigger: 'Children complete entries about resistance, civil rights, or justice',
    signatureLine: 'I never ran my train off the track, and I never lost a passenger. I\'m watching your route.',
    worldIds: ['forgetting-well', 'debate-arena'],
  },
  {
    characterId: 'charles-darwin', category: 'recurring',
    name: 'Charles Darwin', title: 'The Dreaming Naturalist',
    description: 'Always outdoors, always looking at something small. Asks children to look carefully and describe before explaining.',
    appearsTrigger: 'Children engage with entries about species, adaptation, or geological time',
    signatureLine: 'It is not the strongest of the species that survives, nor the most intelligent — it is the one most responsive to change. I notice you noticed that before I said it.',
    worldIds: ['meadow-lab', 'frost-peaks'],
  },
  {
    characterId: 'maryam-mirzakhani', category: 'recurring',
    name: 'Maryam Mirzakhani', title: 'The Numbers Keeper',
    description: 'The first woman to win the Fields Medal. Always drawing mathematical structures the way other people doodle.',
    appearsTrigger: 'Children reach the more abstract mathematical entries',
    signatureLine: 'The beauty of mathematics only shows itself to more patient followers. I promise you it is there.',
    worldIds: ['calculation-caves', 'data-stream', 'number-garden'],
  },
  {
    characterId: 'james-baldwin', category: 'recurring',
    name: 'James Baldwin', title: 'The Witness',
    description: 'Reading from a book that seems to generate its own light. Says very little and notices everything.',
    appearsTrigger: 'Children engage with entries about language, identity, or social history',
    signatureLine: 'Not everything that is faced can be changed. But nothing can be changed until it is faced.',
    worldIds: ['story-tree', 'rhyme-docks'],
  },
  {
    characterId: 'marie-tharp', category: 'recurring',
    name: 'Marie Tharp', title: 'The Observer',
    description: 'Carries bathymetric charts of the ocean floor. Her maps confirmed continental drift but were initially rejected.',
    appearsTrigger: 'Children reach entries about unseen places',
    signatureLine: "The structure was always there. I drew what the data showed. No one could argue with the data. They tried.",
    worldIds: ['map-room', 'frost-peaks'],
  },
];

// ── Legendary Figures ────────────────────────────────────────────

const LEGENDARY_FIGURES: ReadonlyArray<LegendaryFigureDefinition> = [
  { characterId: 'gregor-mendel', category: 'legendary', name: 'Gregor Mendel', worldId: 'meadow-lab', behavior: 'Tends pea plants in silence, counts on a small chalkboard' },
  { characterId: 'al-khwarizmi', category: 'legendary', name: 'Al-Khwarizmi', worldId: 'calculation-caves', behavior: 'Writes equations in a leather-bound manuscript, pauses to read aloud' },
  { characterId: 'marie-curie', category: 'legendary', name: 'Marie Curie', worldId: 'magnet-hills', behavior: 'Works at a glowing worktable, looks up once, nods' },
  { characterId: 'nikola-tesla', category: 'legendary', name: 'Nikola Tesla', worldId: 'circuit-marsh', behavior: 'Watches electricity arc in the Coil Garden with unconcealed satisfaction' },
  { characterId: 'rosalind-franklin', category: 'legendary', name: 'Rosalind Franklin', worldId: 'body-atlas', behavior: 'Photographs a specimen, checks the exposure, photographs again' },
  { characterId: 'johannes-kepler', category: 'legendary', name: 'Johannes Kepler', worldId: 'starfall-observatory', behavior: 'Traces orbital paths in sand with a stick by moonlight' },
  { characterId: 'florence-nightingale', category: 'legendary', name: 'Florence Nightingale', worldId: 'data-stream', behavior: 'Works late by lamplight constructing her coxcomb chart' },
  { characterId: 'mary-anning', category: 'legendary', name: 'Mary Anning', worldId: 'frost-peaks', behavior: 'Excavates slowly and carefully, brush in hand, unhurried' },
  { characterId: 'wangari-maathai', category: 'legendary', name: 'Wangari Maathai', worldId: 'meadow-lab', behavior: 'Plants a tree in the Canopy Walk, pats the earth flat, stands' },
  { characterId: 'langston-hughes', category: 'legendary', name: 'Langston Hughes', worldId: 'rhyme-docks', behavior: 'Reads from a notebook at the Slam Stage, not performing — working' },
  { characterId: 'william-harvey', category: 'legendary', name: 'William Harvey', worldId: 'body-atlas', behavior: 'Conducts his circulation demonstration, noting measurements onto paper' },
  { characterId: 'homer', category: 'legendary', name: 'Homer', worldId: 'rhyme-docks', behavior: 'Recites, eyes closed, in front of the Haiku Jetty, to nobody and everybody' },
];

// ── Port ─────────────────────────────────────────────────────────

export interface VisitorCharacterPort {
  readonly getCompass: () => CompassDefinition;
  readonly getRecurringVisitors: () => ReadonlyArray<RecurringVisitorDefinition>;
  readonly getLegendaryFigures: () => ReadonlyArray<LegendaryFigureDefinition>;
  readonly getVisitorById: (characterId: string) => VisitorDefinition | undefined;
  readonly getVisitorsForWorld: (worldId: string) => ReadonlyArray<VisitorDefinition>;
  readonly resolveCompassMode: (state: KindlerVisitorState) => CompassModeResult;
  readonly isLegendaryFirstVisit: (characterId: string, state: KindlerVisitorState) => boolean;
}

// ── Implementation ───────────────────────────────────────────────

function getVisitorById(characterId: string): VisitorDefinition | undefined {
  if (characterId === 'compass') return COMPASS;
  const recurring = RECURRING_VISITORS.find(v => v.characterId === characterId);
  if (recurring) return recurring;
  return LEGENDARY_FIGURES.find(f => f.characterId === characterId);
}

function getVisitorsForWorld(worldId: string): ReadonlyArray<VisitorDefinition> {
  const results: VisitorDefinition[] = [];
  results.push(COMPASS);

  for (const v of RECURRING_VISITORS) {
    if (v.worldIds.includes(worldId)) results.push(v);
  }

  for (const f of LEGENDARY_FIGURES) {
    if (f.worldId === worldId) results.push(f);
  }

  return results;
}

function resolveCompassMode(state: KindlerVisitorState): CompassModeResult {
  if (state.isInForgettingWell) {
    return { mode: 'challenge', reason: 'Child is in the Forgetting Well' };
  }

  if (state.recentDiscovery) {
    return { mode: 'celebrating', reason: 'Recent discovery or significant completion' };
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1_000;
  if (state.isLost || (Date.now() - state.lastVisitMs > sevenDaysMs)) {
    return { mode: 'orienting', reason: 'Child is lost or returning after absence' };
  }

  return { mode: 'quiet', reason: 'Ambient presence — walking alongside' };
}

function isLegendaryFirstVisit(characterId: string, state: KindlerVisitorState): boolean {
  const figure = LEGENDARY_FIGURES.find(f => f.characterId === characterId);
  if (!figure) return false;
  return !state.seenLegendaryIds.has(characterId);
}

// ── Factory ──────────────────────────────────────────────────────

export function createVisitorCharacters(): VisitorCharacterPort {
  return {
    getCompass: () => COMPASS,
    getRecurringVisitors: () => RECURRING_VISITORS,
    getLegendaryFigures: () => LEGENDARY_FIGURES,
    getVisitorById,
    getVisitorsForWorld,
    resolveCompassMode,
    isLegendaryFirstVisit,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface VisitorCharacterEngine {
  readonly kind: 'visitor-characters';
  readonly visitors: VisitorCharacterPort;
}

export function createVisitorCharacterEngine(
  deps: { readonly clock: VisitorClockPort; readonly log: VisitorLogPort; readonly events: VisitorEventPort },
): VisitorCharacterEngine {
  const visitors = createVisitorCharacters();
  deps.log.info(
    { recurring: RECURRING_VISITORS.length, legendary: LEGENDARY_FIGURES.length },
    'Visitor characters initialized',
  );
  return { kind: 'visitor-characters', visitors };
}
