/**
 * World Design Atlas
 *
 * Canonical spatial registry for the 50 Koydo Worlds from Expansion Bible v5.
 * Each profile captures the world's core biome description and any explicit
 * zone list that appears in Part 2 of the bible. Worlds without an explicit
 * zone block remain biome-only until the source canon expands.
 */

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_DESIGN_PROFILES = 50;

// ── Types ────────────────────────────────────────────────────────

export interface WorldZone {
  readonly zoneId: string;
  readonly name: string;
}

export interface WorldDesignProfile {
  readonly worldId: string;
  readonly worldName: string;
  readonly guideId: string;
  readonly biome: string;
  readonly zones: ReadonlyArray<WorldZone>;
}

export interface WorldDesignAtlasPort {
  readonly totalProfiles: number;
  getProfile(worldId: string): WorldDesignProfile | undefined;
  all(): ReadonlyArray<WorldDesignProfile>;
  getProfilesForRealm(
    realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
  ): ReadonlyArray<WorldDesignProfile>;
  getProfilesWithExplicitZones(): ReadonlyArray<WorldDesignProfile>;
}

// ── Realm Tags ───────────────────────────────────────────────────

const DISCOVERY_IDS = new Set([
  'cloud-kingdom', 'savanna-workshop', 'tideline-bay', 'meadow-lab',
  'starfall-observatory', 'number-garden', 'calculation-caves', 'magnet-hills',
  'circuit-marsh', 'code-canyon', 'body-atlas', 'frost-peaks',
  'greenhouse-spiral', 'data-stream', 'map-room',
]);

const EXPRESSION_IDS = new Set([
  'story-tree', 'rhyme-docks', 'letter-forge', 'reading-reef',
  'grammar-bridge', 'vocabulary-jungle', 'punctuation-station', 'debate-arena',
  'diary-lighthouse', 'spelling-mines', 'translation-garden', 'nonfiction-fleet',
  'illustration-cove', 'folklore-bazaar', 'editing-tower',
]);

const EXCHANGE_IDS = new Set([
  'market-square', 'savings-vault', 'budget-kitchen', 'entrepreneur-workshop',
  'sharing-meadow', 'investment-greenhouse', 'needs-wants-bridge', 'barter-docks',
  'debt-glacier', 'job-fair', 'charity-harbor', 'tax-office',
]);

const CROSSROADS_IDS = new Set([
  'great-archive', 'workshop-crossroads', 'discovery-trail', 'thinking-grove',
  'wellness-garden', 'time-gallery', 'music-meadow', 'everywhere',
]);

// ── Helpers ──────────────────────────────────────────────────────

function zone(name: string): WorldZone {
  return {
    zoneId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
  };
}

// ── Canon Profiles ───────────────────────────────────────────────

const WORLD_DESIGN_DATA: ReadonlyArray<WorldDesignProfile> = [

  // ── REALM OF DISCOVERY — 15 Worlds ────────────────────────────

  {
    worldId: 'cloud-kingdom',
    worldName: 'Cloud Kingdom',
    guideId: 'professor-nimbus',
    biome: 'Floating archipelago of cloud-islands at varying altitudes with rainbow bridges and visible sky beneath.',
    zones: [
      zone('Weather Deck'),
      zone('Cumulus Meadow'),
      zone('Storm Gallery'),
      zone('Stratosphere Spire'),
      zone('Rain Room'),
    ],
  },
  {
    worldId: 'savanna-workshop',
    worldName: 'Savanna Workshop',
    guideId: 'zara-ngozi',
    biome: 'Open African savanna with a central workshop built from reclaimed materials, golden grass, and red earth.',
    zones: [
      zone('Workshop Floor'),
      zone('Ramp Fields'),
      zone('Wind Tunnel'),
      zone('Bridge Yard'),
      zone('Scrap Garden'),
    ],
  },
  {
    worldId: 'tideline-bay',
    worldName: 'Tideline Bay',
    guideId: 'suki-tanaka-reyes',
    biome: 'Coastal bay transitioning from sandy beach to coral reef to deep ocean trench across surface and underwater layers.',
    zones: [
      zone('Tide Pools'),
      zone('Coral Cathedral'),
      zone('Kelp Forest'),
      zone('Abyssal Plain'),
      zone('Research Vessel'),
    ],
  },
  {
    worldId: 'meadow-lab',
    worldName: 'Meadow Lab',
    guideId: 'baxter',
    biome: 'Impossibly lush meadow with a research lab woven into the landscape like a botanical garden fused with a biology lab.',
    zones: [
      zone('Pollination Path'),
      zone('Growth Chamber'),
      zone('Canopy Walk'),
      zone('Root Lab'),
      zone('Seed Vault'),
    ],
  },
  {
    worldId: 'starfall-observatory',
    worldName: 'Starfall Observatory',
    guideId: 'riku-osei',
    biome: 'Mountain peak above the cloud line with a perpetual night sky and an open-air observatory.',
    zones: [
      zone('Observation Platform'),
      zone('Planetarium Dome'),
      zone('Launch Terrace'),
      zone('Dark Room'),
      zone('Meteor Garden'),
    ],
  },
  {
    worldId: 'number-garden',
    worldName: 'Number Garden',
    guideId: 'dottie-chakravarti',
    biome: 'Formal garden where mathematics literally grows through Fibonacci spirals, fractal ferns, and tessellated pathways.',
    zones: [
      zone('Spiral Beds'),
      zone('Zero Pool'),
      zone('Pattern Maze'),
      zone('Hypatia Terrace'),
      zone('Lovelace Pavilion'),
      zone('Infinity Bridge'),
    ],
  },
  {
    worldId: 'calculation-caves',
    worldName: 'Calculation Caves',
    guideId: 'cal',
    biome: 'Crystalline cave system deep underground where mineral veins glow in colors corresponding to math operations.',
    zones: [
      zone('Addition Grotto'),
      zone('Subtraction Shaft'),
      zone('Multiplication Chamber'),
      zone('Division Depths'),
      zone('Abacus Hall'),
      zone('Bone Crypt'),
    ],
  },
  {
    worldId: 'magnet-hills',
    worldName: 'Magnet Hills',
    guideId: 'lena-sundstrom',
    biome: 'Rolling hills with visible force fields and magnetic illusions in a Scandinavian-inspired landscape.',
    zones: [
      zone('Gravity Bowl'),
      zone('Force Field'),
      zone('Curie Lab'),
      zone('Speed Track'),
      zone('Pendulum Forest'),
    ],
  },
  {
    worldId: 'circuit-marsh',
    worldName: 'Circuit Marsh',
    guideId: 'kofi-amponsah',
    biome: 'Wetland where electricity flows through everything, with copper-veined reeds and phosphorescent water.',
    zones: [
      zone('Current Creek'),
      zone('Solar Clearing'),
      zone('Edison/Latimer Workshop'),
      zone('Lightning Rod'),
      zone('Tesla Coil Garden'),
    ],
  },
  {
    worldId: 'code-canyon',
    worldName: 'Code Canyon',
    guideId: 'pixel',
    biome: 'Desert canyon where reality glitches between wireframe and full-color render states.',
    zones: [
      zone('Block Yard'),
      zone('Debug Valley'),
      zone('Turing Tunnel'),
      zone("Web Weaver's Nest"),
      zone('Apollo Chamber'),
    ],
  },
  {
    worldId: 'body-atlas',
    worldName: 'Body Atlas',
    guideId: 'dr-emeka-obi',
    biome: 'An anatomical landscape where hills are lungs, rivers are blood vessels, and cave systems are digestive tracts.',
    zones: [
      zone('Heart Chamber'),
      zone('Lung Peaks'),
      zone('Brain Plateau'),
      zone('Immune Forest'),
      zone('DNA Spiral'),
      zone('Galen Gallery'),
    ],
  },
  {
    worldId: 'frost-peaks',
    worldName: 'Frost Peaks',
    guideId: 'mira-petrov',
    biome: 'Towering mountain range with exposed geological layers where each elevation reveals a different era of Earth history.',
    zones: [
      zone('Stratigraphy Wall'),
      zone('Fossil Quarry'),
      zone('Volcano Heart'),
      zone('Ice Core Library'),
      zone('Crystal Grotto'),
      zone('Tectonic Terrace'),
    ],
  },
  {
    worldId: 'greenhouse-spiral',
    worldName: 'Greenhouse Spiral',
    guideId: 'hugo-fontaine',
    biome: 'A greenhouse spiraling upward like a nautilus shell, with each level representing a branch of chemistry.',
    zones: [
      zone('Periodic Garden'),
      zone('Mixing Pools'),
      zone('Three Seeds'),
      zone('Lavoisier Wing'),
      zone('Phosphorus Chamber'),
    ],
  },
  {
    worldId: 'data-stream',
    worldName: 'Data Stream',
    guideId: 'yuki',
    biome: 'River system where data flows as visible colored streams through a clean, organized, and precise landscape.',
    zones: [
      zone('Source Pool'),
      zone('Graph Garden'),
      zone('Nightingale Ward'),
      zone('Snow Map'),
      zone('Punch Card Archive'),
      zone('Census Hall'),
    ],
  },
  {
    worldId: 'map-room',
    worldName: 'Map Room',
    guideId: 'atlas',
    biome: 'Massive spherical chamber whose entire interior surface is a map, with Atlas standing at the center.',
    zones: [
      zone('Mercator Wing'),
      zone('Polynesian Pavilion'),
      zone('Cable Trench'),
      zone('Prime Meridian'),
      zone("Explorer's Dock"),
      zone('Satellite Perch'),
    ],
  },

  // ── REALM OF EXPRESSION — 15 Worlds ───────────────────────────

  {
    worldId: 'story-tree',
    worldName: 'Story Tree',
    guideId: 'grandmother-anaya',
    biome: 'Single colossal tree in a warm firelit clearing whose branches hold glowing story-orbs.',
    zones: [
      zone('Fireside Ring'),
      zone('Orb Branches'),
      zone('Root Library'),
      zone('Gutenberg Press'),
      zone('Rosetta Node'),
    ],
  },
  {
    worldId: 'rhyme-docks',
    worldName: 'Rhyme Docks',
    guideId: 'felix-barbosa',
    biome: 'Working harbor where poems are cargo and the sea itself supplies the rhythm.',
    zones: [
      zone('Loading Bay'),
      zone("Homer's Berth"),
      zone('Slam Stage'),
      zone('Haiku Jetty'),
      zone('Sound Lighthouse'),
    ],
  },
  {
    worldId: 'letter-forge',
    worldName: 'Letter Forge',
    guideId: 'amara-diallo',
    biome: 'Vast forge where letters are made from metal, clay, light, and crystal and hang like chandeliers.',
    zones: [
      zone('Alphabet Wall'),
      zone('Syllabary Workshop'),
      zone('Braille Chamber'),
      zone('Calligraphy Garden'),
      zone('Sound Anvil'),
    ],
  },
  {
    worldId: 'reading-reef',
    worldName: 'Reading Reef',
    guideId: 'oliver-marsh',
    biome: 'Underwater library with books embedded in living coral and reading architecture fused into reef structures.',
    zones: [],
  },
  {
    worldId: 'grammar-bridge',
    worldName: 'Grammar Bridge',
    guideId: 'lila-johansson-park',
    biome: 'Massive bridge spanning a chasm where load-bearing nouns and verb girders turn grammar into architecture.',
    zones: [],
  },
  {
    worldId: 'vocabulary-jungle',
    worldName: 'Vocabulary Jungle',
    guideId: 'kwame-asante',
    biome: 'Dense tropical jungle where words grow on trees and roots feed entire families of related meanings.',
    zones: [],
  },
  {
    worldId: 'punctuation-station',
    worldName: 'Punctuation Station',
    guideId: 'rosie-chen',
    biome: 'Railway station where punctuation marks serve as signal lights that control sentence-trains.',
    zones: [],
  },
  {
    worldId: 'debate-arena',
    worldName: 'Debate Arena',
    guideId: 'theo-papadopoulos',
    biome: 'Greek-style amphitheater with two speaking platforms and columns inscribed with logical principles.',
    zones: [],
  },
  {
    worldId: 'diary-lighthouse',
    worldName: 'Diary Lighthouse',
    guideId: 'nadia-volkov',
    biome: 'Lighthouse on a rocky coast where the light is powered by stories written in the journal room.',
    zones: [
      zone('Journal Room'),
      zone('Letter Desk'),
      zone('Anne Frank Attic'),
      zone('Pepys Chamber'),
      zone('Light Mechanism'),
    ],
  },
  {
    worldId: 'spelling-mines',
    worldName: 'Spelling Mines',
    guideId: 'benny-okafor-williams',
    biome: 'Crystalline mine where correctly spelled words form clear mineral deposits and errors crack the seams.',
    zones: [],
  },
  {
    worldId: 'translation-garden',
    worldName: 'Translation Garden',
    guideId: 'farah-al-rashid',
    biome: 'Garden where each flower speaks a different language and the paths between them are translation routes.',
    zones: [],
  },
  {
    worldId: 'nonfiction-fleet',
    worldName: 'Nonfiction Fleet',
    guideId: 'captain-birch',
    biome: 'Harbor of ships carrying every major type of nonfiction, from research vessels to atlas galleons.',
    zones: [],
  },
  {
    worldId: 'illustration-cove',
    worldName: 'Illustration Cove',
    guideId: 'ines-moreau',
    biome: 'Painted coastal cove where rocks, sand, and walls become surfaces for purely visual storytelling.',
    zones: [
      zone('Cave Gallery'),
      zone('Tapestry Cliff'),
      zone('Silent Beach'),
      zone('Graphic Tide Pools'),
    ],
  },
  {
    worldId: 'folklore-bazaar',
    worldName: 'Folklore Bazaar',
    guideId: 'hassan-yilmaz',
    biome: 'Covered market where stories are currency and lanterns shift color with each storytelling tradition.',
    zones: [],
  },
  {
    worldId: 'editing-tower',
    worldName: 'Editing Tower',
    guideId: 'wren-calloway',
    biome: 'Tall tower made of manuscript pages where each floor represents a different draft state.',
    zones: [],
  },

  // ── REALM OF EXCHANGE — 12 Worlds ─────────────────────────────

  {
    worldId: 'market-square',
    worldName: 'Market Square',
    guideId: 'tia-carmen-herrera',
    biome: 'Bustling outdoor market in a warm Latin American town square with terracotta tiles and copper-roofed stalls.',
    zones: [
      zone('Price Stalls'),
      zone('Coin Museum'),
      zone('Silk Road Caravan'),
      zone('Fair Price Court'),
      zone('Generational Ledger'),
    ],
  },
  {
    worldId: 'savings-vault',
    worldName: 'Savings Vault',
    guideId: 'mr-abernathy',
    biome: 'Vault that is part bank and part forest where savings grow as literal trees.',
    zones: [],
  },
  {
    worldId: 'budget-kitchen',
    worldName: 'Budget Kitchen',
    guideId: 'priya-nair',
    biome: 'Warm busy kitchen where every recipe has a budget and every ingredient carries a cost.',
    zones: [],
  },
  {
    worldId: 'entrepreneur-workshop',
    worldName: "Entrepreneur's Workshop",
    guideId: 'diego-montoya-silva',
    biome: 'Workshop full of broken prototypes and framed bankruptcy letters where failure is displayed with pride.',
    zones: [],
  },
  {
    worldId: 'sharing-meadow',
    worldName: 'Sharing Meadow',
    guideId: 'auntie-bee',
    biome: 'Communal meadow where resources pool in the center and circulate outward with no private ownership.',
    zones: [],
  },
  {
    worldId: 'investment-greenhouse',
    worldName: 'Investment Greenhouse',
    guideId: 'jin-ho-park',
    biome: 'Greenhouse where stocks are seeds, bonds are perennials, and diversification is literal species variety.',
    zones: [],
  },
  {
    worldId: 'needs-wants-bridge',
    worldName: 'Needs & Wants Bridge',
    guideId: 'nia-oduya',
    biome: 'Bridge split between solid stone needs and colorful optional wants, with decisions made in the center span.',
    zones: [],
  },
  {
    worldId: 'barter-docks',
    worldName: 'Barter Docks',
    guideId: 'tomas-reyes',
    biome: 'Historical port where money has not been invented and children repeatedly reinvent currency through barter.',
    zones: [],
  },
  {
    worldId: 'debt-glacier',
    worldName: 'Debt Glacier',
    guideId: 'elsa-lindgren',
    biome: 'Icy landscape where borrowing is easy but interest causes the glacier to grow back larger.',
    zones: [],
  },
  {
    worldId: 'job-fair',
    worldName: 'Job Fair',
    guideId: 'babatunde-afolabi',
    biome: 'Career expo of interactive profession booths spanning every imaginable line of work.',
    zones: [],
  },
  {
    worldId: 'charity-harbor',
    worldName: 'Charity Harbor',
    guideId: 'mei-lin-wu',
    biome: 'Harbor where ships carry aid, education, and resources while impact is measured per dollar, not per feeling.',
    zones: [],
  },
  {
    worldId: 'tax-office',
    worldName: 'Tax Office',
    guideId: 'sam-worthington',
    biome: 'Miniature city where roads, schools, parks, and fire stations all visibly run on taxes.',
    zones: [],
  },

  // ── THE CROSSROADS — 8 Worlds ─────────────────────────────────

  {
    worldId: 'great-archive',
    worldName: 'Great Archive',
    guideId: 'the-librarian',
    biome: 'Hub of all hubs, a vast library whose architecture shifts based on where the child is headed.',
    zones: [],
  },
  {
    worldId: 'workshop-crossroads',
    worldName: 'Workshop Crossroads',
    guideId: 'kenzo-nakamura-osei',
    biome: 'Intersection of workshops from every discipline where the design-thinking process is made physical.',
    zones: [],
  },
  {
    worldId: 'discovery-trail',
    worldName: 'Discovery Trail',
    guideId: 'solana-bright',
    biome: 'Wilderness trail where the compass points toward questions and the scientific method is laid out as a hike.',
    zones: [],
  },
  {
    worldId: 'thinking-grove',
    worldName: 'Thinking Grove',
    guideId: 'old-rowan',
    biome: 'Ancient forest centered on one immense sentient tree whose roots connect to every world.',
    zones: [],
  },
  {
    worldId: 'wellness-garden',
    worldName: 'Wellness Garden',
    guideId: 'hana-bergstrom',
    biome: 'Garden where emotions grow as flowers and every feeling is given a living visual form.',
    zones: [],
  },
  {
    worldId: 'time-gallery',
    worldName: 'Time Gallery',
    guideId: 'rami-al-farsi',
    biome: 'Gallery where you walk through time and see both the official story and what was left out.',
    zones: [],
  },
  {
    worldId: 'music-meadow',
    worldName: 'Music Meadow',
    guideId: 'luna-esperanza',
    biome: 'Meadow where wind, rain, grass, leaves, and stones all generate music as part of the environment.',
    zones: [
      zone('Harmony Pools'),
      zone('Pythagoras Stones'),
      zone('Bach Labyrinth'),
      zone('Instrument Forest'),
      zone('Rhythm Clearing'),
    ],
  },
  {
    worldId: 'everywhere',
    worldName: 'Everywhere',
    guideId: 'compass',
    biome: 'No fixed form; Everywhere becomes whatever the child needs in the moment while Compass provides orientation.',
    zones: [],
  },
];

// ── Implementation ───────────────────────────────────────────────

function getProfile(worldId: string): WorldDesignProfile | undefined {
  return WORLD_DESIGN_DATA.find((profile) => profile.worldId === worldId);
}

function all(): ReadonlyArray<WorldDesignProfile> {
  return WORLD_DESIGN_DATA;
}

function getProfilesForRealm(
  realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
): ReadonlyArray<WorldDesignProfile> {
  const ids = realm === 'discovery'
    ? DISCOVERY_IDS
    : realm === 'expression'
      ? EXPRESSION_IDS
      : realm === 'exchange'
        ? EXCHANGE_IDS
        : CROSSROADS_IDS;

  return WORLD_DESIGN_DATA.filter((profile) => ids.has(profile.worldId));
}

function getProfilesWithExplicitZones(): ReadonlyArray<WorldDesignProfile> {
  return WORLD_DESIGN_DATA.filter((profile) => profile.zones.length > 0);
}

export function createWorldDesignAtlas(): WorldDesignAtlasPort {
  return {
    totalProfiles: TOTAL_WORLD_DESIGN_PROFILES,
    getProfile,
    all,
    getProfilesForRealm,
    getProfilesWithExplicitZones,
  };
}

export { WORLD_DESIGN_DATA as WORLD_DESIGN_ATLAS };