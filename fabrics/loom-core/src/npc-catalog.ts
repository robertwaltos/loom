/**
 * npc-catalog.ts — Master NPC Catalog from Bible v5.
 *
 * World-resident characters who live in specific worlds and serve
 * as guides, mentors, scholars, and companions. These differ from
 * visitor-characters.ts (which covers cross-world travelers and
 * legendary figures).
 *
 * 25 world-resident NPCs across all world domains.
 * Each NPC has a role tier: 1 = primary guide (always present),
 * 2 = secondary (appears regularly), 3 = specialist (rare/triggered).
 */

// ── Ports ────────────────────────────────────────────────────────

export interface NpcCatalogLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_RESIDENT_NPCS = 25;

// ── Types ────────────────────────────────────────────────────────

export type NpcRole =
  | 'primary-guide'     // Tier 1 — always present, greets new arrivals
  | 'scholar'           // Teaches entries, expands knowledge
  | 'scientist'         // Runs experiments, demonstrates concepts
  | 'artist'            // Creative expression, writing, music, design
  | 'merchant'          // Trade, economy, material exchange
  | 'explorer'          // Navigation, discovery, geography
  | 'storyteller'       // Narrative, oral tradition, literature
  | 'engineer'          // Design, construction, technology
  | 'healer'            // Wellness, biology, care
  | 'archivist';        // Records, data, memory

export type NpcPresenceTier = 1 | 2 | 3;

export interface NpcDefinition {
  readonly npcId: string;
  readonly name: string;
  readonly worldId: string;
  readonly role: NpcRole;
  readonly tier: NpcPresenceTier;
  readonly description: string;
  readonly signatureAction: string;
  readonly leitmotifId: string | null;  // Corresponds to leitmotif-catalog.ts characterId
}

// ── NPC Catalog ───────────────────────────────────────────────────

const NPC_CATALOG: ReadonlyArray<NpcDefinition> = [
  // STEM Worlds
  {
    npcId: 'professor-nimbus', name: 'Professor Nimbus', worldId: 'cloud-kingdom',
    role: 'primary-guide', tier: 1,
    description: 'A gentle meteorologist who moves through clouds as if they are old friends. Wears an always-slightly-damp coat.',
    signatureAction: 'Reads weather patterns in the cloud formations overhead and explains them quietly.',
    leitmotifId: 'professor-nimbus',
  },
  {
    npcId: 'baxter', name: 'Baxter', worldId: 'meadow-lab',
    role: 'scientist', tier: 1,
    description: 'A nervous, endearing researcher who is more comfortable with experiments than people, but always tries anyway.',
    signatureAction: 'Nervously checks on plant specimens and celebrates small growth milestones.',
    leitmotifId: 'baxter',
  },
  {
    npcId: 'riku-osei', name: 'Riku Osei', worldId: 'starfall-observatory',
    role: 'primary-guide', tier: 1,
    description: 'A nocturnal astronomer who has memorized every visible star by personal name rather than catalogue number.',
    signatureAction: 'Points to constellations and recounts the civilizations that named them differently.',
    leitmotifId: 'riku-osei',
  },
  {
    npcId: 'dottie-chakravarti', name: 'Dottie Chakravarti', worldId: 'number-garden',
    role: 'primary-guide', tier: 1,
    description: 'A precise, warm mathematician who believes every number has a personality. Counts everything.',
    signatureAction: 'Arranges number-flowers into patterns and asks children to guess what comes next.',
    leitmotifId: 'dottie-chakravarti',
  },
  {
    npcId: 'cal', name: 'Cal', worldId: 'calculation-caves',
    role: 'scholar', tier: 1,
    description: 'Crystalline, pure presence — sees mathematics as both structure and music. Lives in the deepest cave.',
    signatureAction: 'Traces equations on cave walls that glow when solved correctly.',
    leitmotifId: 'cal',
  },
  {
    npcId: 'pixel', name: 'Pixel', worldId: 'code-canyon',
    role: 'engineer', tier: 1,
    description: 'A flickering, hopeful character made partly of code who is figuring out what they are as they go.',
    signatureAction: 'Debugs their own form mid-conversation; reveals something new about code by doing so.',
    leitmotifId: 'pixel',
  },
  {
    npcId: 'dr-emeka-obi', name: 'Dr. Emeka Obi', worldId: 'body-atlas',
    role: 'healer', tier: 1,
    description: 'A compassionate physician who maps the human body as if it is a beloved landscape. Steady and calm.',
    signatureAction: 'Narrates body systems like a tour guide through an extraordinary country.',
    leitmotifId: 'dr-emeka-obi',
  },
  {
    npcId: 'mira-petrov', name: 'Mira Petrov', worldId: 'frost-peaks',
    role: 'scientist', tier: 1,
    description: 'A deep and patient glaciologist who reads ice cores like books of Earth\'s history.',
    signatureAction: 'Extracts thin ice cores and holds them to the light to reveal trapped ancient air.',
    leitmotifId: 'mira-petrov',
  },
  {
    npcId: 'hugo-fontaine', name: 'Hugo Fontaine', worldId: 'greenhouse-spiral',
    role: 'scientist', tier: 1,
    description: 'A growing, hopeful botanist and chemist. Optimistic about the capacity of plants to teach us everything.',
    signatureAction: 'Grafts two incompatible-looking plants together and waits, smiling, for the result.',
    leitmotifId: 'hugo-fontaine',
  },
  {
    npcId: 'yuki', name: 'Yuki', worldId: 'data-stream',
    role: 'archivist', tier: 1,
    description: 'Exact and beautiful — a data artist who believes all information wants to become a pattern, and patterns want to become meaning.',
    signatureAction: 'Visualizes live data streams as flowing sculptures and invites children to find the story inside.',
    leitmotifId: 'yuki',
  },
  {
    npcId: 'zara-ngozi', name: 'Zara Ngozi', worldId: 'savanna-workshop',
    role: 'engineer', tier: 1,
    description: 'Determined, inventive maker. Builds things from local materials. Never throws anything away.',
    signatureAction: 'Disassembles a broken tool and rebuilds it into something completely different but more useful.',
    leitmotifId: 'zara-ngozi',
  },
  {
    npcId: 'suki-tanaka-reyes', name: 'Suki Tanaka-Reyes', worldId: 'tideline-bay',
    role: 'primary-guide', tier: 1,
    description: 'A deep, flowing marine biologist with a connection to the ocean that goes beyond science into something quieter.',
    signatureAction: 'Dives slowly into dark water and resurfaces with something no one else would have noticed.',
    leitmotifId: 'suki-tanaka-reyes',
  },
  // Language Arts Worlds
  {
    npcId: 'grandmother-anaya', name: 'Grandmother Anaya', worldId: 'story-tree',
    role: 'storyteller', tier: 1,
    description: 'Timeless, warm keeper of story orbs. She has heard every story at least twice and finds new meaning both times.',
    signatureAction: 'Selects a story orb without looking and says she knew which one it would be.',
    leitmotifId: 'grandmother-anaya',
  },
  {
    npcId: 'wren-calloway', name: 'Wren Calloway', worldId: 'editing-tower',
    role: 'artist', tier: 1,
    description: 'A writer on their 47th draft of a novel that gets better every time. The tower top is unfinished.',
    signatureAction: 'Crosses out a line, replaces it, crosses that out too, and pronounces it nearly right.',
    leitmotifId: 'wren-calloway',
  },
  {
    npcId: 'lila-johansson-park', name: 'Lila Johansson-Park', worldId: 'letter-forge',
    role: 'scholar', tier: 1,
    description: 'Structural and clear — a linguist who sees grammar as architecture and spelling as history.',
    signatureAction: 'Traces the etymology of a common word back to its Proto-Indo-European root.',
    leitmotifId: 'lila-johansson-park',
  },
  {
    npcId: 'amara-diallo', name: 'Amara Diallo', worldId: 'debate-arena',
    role: 'scholar', tier: 1,
    description: 'Elegant, multilingual rhetoric teacher who believes a well-made argument is a form of kindness.',
    signatureAction: 'Takes both sides of an argument simultaneously to show how each depends on what you value.',
    leitmotifId: 'amara-diallo',
  },
  {
    npcId: 'felix-barbosa', name: 'Felix Barbosa', worldId: 'folklore-bazaar',
    role: 'storyteller', tier: 1,
    description: 'Rhythmic, spoken-word performer who collects folk tales from every culture and finds their hidden twins.',
    signatureAction: 'Tells the same story in three different cultural versions, asking where they diverge and why.',
    leitmotifId: 'felix-barbosa',
  },
  // Financial & Social Worlds
  {
    npcId: 'tia-carmen-herrera', name: 'Tía Carmen Herrera', worldId: 'market-square',
    role: 'merchant', tier: 1,
    description: 'Bustling, fair market master. Knows the price of everything and the value of most things.',
    signatureAction: 'Negotiates a trade in real time, explaining every decision as she makes it.',
    leitmotifId: 'tia-carmen-herrera',
  },
  {
    npcId: 'theo-papadopoulos', name: 'Theo Papadopoulos', worldId: 'debt-glacier',
    role: 'scholar', tier: 2,
    description: 'Measured, persuasive economist who uses the glacier metaphor: "Debt compounds like ice — slowly, then all at once."',
    signatureAction: 'Carves interest calculations into ice to show how compound debt accumulates visually.',
    leitmotifId: 'theo-papadopoulos',
  },
  // Music & Arts Worlds
  {
    npcId: 'luna-esperanza', name: 'Luna Esperanza', worldId: 'music-meadow',
    role: 'artist', tier: 1,
    description: 'Musical, connecting conductor and multi-instrumentalist. Plays everything; masters nothing — on purpose.',
    signatureAction: 'Hands a child an instrument they\'ve never touched and says "you already know some of it."',
    leitmotifId: 'luna-esperanza',
  },
  // Wellness & Archive Worlds
  {
    npcId: 'hana-bergstrom', name: 'Hana Bergstrom', worldId: 'wellness-garden',
    role: 'healer', tier: 1,
    description: 'Tender and strong. A therapist-naturalist who tends both garden and mind with equal care.',
    signatureAction: 'Tends two plants simultaneously — one for a child and one she names "the one I\'m worried about today."',
    leitmotifId: 'hana-bergstrom',
  },
  {
    npcId: 'the-librarian', name: 'The Librarian', worldId: 'great-archive',
    role: 'archivist', tier: 1,
    description: 'Infinite, quiet keeper of all knowledge in Koydo. Does not categorize by subject — by importance to the asker.',
    signatureAction: 'Retrieves a book the child didn\'t ask for but needed.',
    leitmotifId: 'the-librarian',
  },
  // Explorer Worlds
  {
    npcId: 'atlas', name: 'Atlas', worldId: 'map-room',
    role: 'explorer', tier: 1,
    description: 'Ancient, immovable cartographer who has mapped every world in Koydo and several outside it. Does not hurry.',
    signatureAction: 'Adds a new room to the map that was always there but never charted until now.',
    leitmotifId: 'atlas',
  },
  {
    npcId: 'rosie-chen', name: 'Rosie Chen', worldId: 'map-room',
    role: 'explorer', tier: 2,
    description: 'Punctual, decisive logistics expert. Runs the Threadway schedule, ensuring connections arrive precisely when needed.',
    signatureAction: 'Posts a new Threadway arrival time and explains why timing matters to exploration.',
    leitmotifId: 'rosie-chen',
  },
  {
    npcId: 'kwame-asante', name: 'Kwame Asante', worldId: 'frost-peaks',
    role: 'explorer', tier: 2,
    description: 'Hunter-tracker who reads landscape the way others read text. Does not explain what he notices — demonstrates it.',
    signatureAction: 'Crouches, studies the ice, and without speaking indicates a direction to walk.',
    leitmotifId: 'kwame-asante',
  },
  {
    npcId: 'hassan-yilmaz', name: 'Hassan Yilmaz', worldId: 'folklore-bazaar',
    role: 'merchant', tier: 2,
    description: 'Spice-scented, wise trader who deals in stories as much as goods. Every item has provenance.',
    signatureAction: 'Presents an object of uncertain origin and invites children to argue where it came from.',
    leitmotifId: 'hassan-yilmaz',
  },
];

// ── Port ─────────────────────────────────────────────────────────

export interface NpcCatalogPort {
  readonly getAllNpcs: () => ReadonlyArray<NpcDefinition>;
  readonly getNpcById: (npcId: string) => NpcDefinition | undefined;
  readonly getNpcsByWorld: (worldId: string) => ReadonlyArray<NpcDefinition>;
  readonly getNpcsByRole: (role: NpcRole) => ReadonlyArray<NpcDefinition>;
  readonly getPrimaryGuides: () => ReadonlyArray<NpcDefinition>;
  readonly getTierOneNpcs: () => ReadonlyArray<NpcDefinition>;
  readonly getTotalCount: () => number;
}

// ── Implementation ───────────────────────────────────────────────

function getNpcById(npcId: string): NpcDefinition | undefined {
  return NPC_CATALOG.find(n => n.npcId === npcId);
}

function getNpcsByWorld(worldId: string): ReadonlyArray<NpcDefinition> {
  return NPC_CATALOG.filter(n => n.worldId === worldId);
}

function getNpcsByRole(role: NpcRole): ReadonlyArray<NpcDefinition> {
  return NPC_CATALOG.filter(n => n.role === role);
}

function getPrimaryGuides(): ReadonlyArray<NpcDefinition> {
  return NPC_CATALOG.filter(n => n.role === 'primary-guide');
}

function getTierOneNpcs(): ReadonlyArray<NpcDefinition> {
  return NPC_CATALOG.filter(n => n.tier === 1);
}

// ── Factory ──────────────────────────────────────────────────────

export function createNpcCatalog(): NpcCatalogPort {
  return {
    getAllNpcs: () => NPC_CATALOG,
    getNpcById,
    getNpcsByWorld,
    getNpcsByRole,
    getPrimaryGuides,
    getTierOneNpcs,
    getTotalCount: () => NPC_CATALOG.length,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface NpcCatalogEngine {
  readonly kind: 'npc-catalog';
  readonly catalog: NpcCatalogPort;
}

export function createNpcCatalogEngine(
  deps: { readonly log: NpcCatalogLogPort },
): NpcCatalogEngine {
  const catalog = createNpcCatalog();
  deps.log.info({ npcCount: catalog.getTotalCount() }, 'NPC catalog initialized');
  return { kind: 'npc-catalog', catalog };
}
