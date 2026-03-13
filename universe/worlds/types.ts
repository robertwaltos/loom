/**
 * Koydo Worlds — World Definitions
 *
 * Each world is a self-contained Fabric (plugin) in The Loom architecture.
 * 50 worlds organized into 3 Realms + 1 Cross-Disciplinary Hub.
 */

// ─── Realms ────────────────────────────────────────────────────────

export type Realm =
  | 'discovery'     // STEM — 15 worlds
  | 'expression'    // Language Arts — 15 worlds
  | 'exchange'      // Financial Literacy — 12 worlds
  | 'crossroads';   // Cross-Disciplinary Hub — 8 worlds

// ─── World Definition ──────────────────────────────────────────────

export interface WorldDefinition {
  readonly id: string;
  readonly name: string;
  readonly realm: Realm;
  readonly subject: string;
  readonly guideId: string;
  readonly description: string;
  readonly colorPalette: WorldColorPalette;
  readonly lightingMood: string;
  readonly biomeKit: string;
  readonly entryIds: readonly string[];
  readonly threadwayConnections: readonly string[];
}

export interface WorldColorPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly fadedVariant: string;
  readonly restoredVariant: string;
}

// ─── The Fading — World Luminance State ────────────────────────────

export type FadingStage =
  | 'radiant'       // Fully restored — vibrant colors, rich orchestration
  | 'glowing'       // Mostly restored — warm tones
  | 'dimming'       // Starting to fade — muted colors
  | 'fading'        // Significantly faded — sparse music, desaturated
  | 'deep_fade';    // Nearly forgotten — monochrome, ambient drone

export interface WorldLuminance {
  readonly worldId: string;
  readonly luminance: number;           // 0.0 (deep fade) to 1.0 (radiant)
  readonly stage: FadingStage;
  readonly lastRestoredAt: number;
  readonly totalKindlersContributed: number;
  readonly activeKindlerCount: number;
}

export interface WorldLuminanceLogEntry {
  readonly id: string;
  readonly worldId: string;
  readonly luminance: number;
  readonly stage: FadingStage;
  readonly delta: number;
  readonly cause: 'kindler_progress' | 'natural_decay' | 'collaborative_quest' | 'deep_fade_event';
  readonly timestamp: number;
}

// ─── World Registry (All 50 Worlds) ───────────────────────────────

export const REALM_OF_DISCOVERY_WORLDS = [
  'cloud-kingdom',        // Professor Nimbus — Earth Science / Weather
  'savanna-workshop',     // Zara Ngozi — Engineering / Simple Machines
  'tideline-bay',         // Suki Tanaka-Reyes — Ocean Science / Biology
  'meadow-lab',           // Baxter — Plant Biology / Ecology
  'starfall-observatory', // Riku Osei — Space Science / Astronomy
  'number-garden',        // Dottie Chakravarti — Mathematics / Patterns
  'calculation-caves',    // Cal — Arithmetic / Mental Math
  'magnet-hills',         // Lena Sundstrom — Physics / Forces & Motion
  'circuit-marsh',        // Kofi Amponsah — Electricity / Circuits
  'code-canyon',          // Pixel — Coding / Logic
  'body-atlas',           // Dr. Emeka Obi — Human Body / Health Science
  'frost-peaks',          // Mira Petrov — Geology / Rocks & Minerals
  'greenhouse-spiral',    // Hugo Fontaine — Chemistry / Mixtures & Materials
  'data-stream',          // Yuki — Data Science / Sorting & Graphing
  'map-room',             // Atlas — Geography / Maps & Navigation
] as const;

export const REALM_OF_EXPRESSION_WORLDS = [
  'story-tree',           // Grandmother Anaya — Storytelling / Narrative
  'rhyme-docks',          // Felix Barbosa — Poetry / Rhyme & Rhythm
  'letter-forge',         // Amara Diallo — Phonics / Letter Recognition
  'nonfiction-fleet',     // Captain Birch — Research / Nonfiction Reading
  'folklore-bazaar',      // Hassan Yilmaz — Folklore / Cultural Stories
  'reading-reef',         // Oliver Marsh — Reading Comprehension
  'vocabulary-jungle',    // Kwame Asante — Vocabulary / Word Roots
  'grammar-bridge',       // Lila Johansson-Park — Grammar / Sentence Structure
  'debate-arena',         // Theo Papadopoulos — Persuasive Writing
  'illustration-cove',    // Ines Moreau — Visual Literacy
  'editing-tower',        // Wren Calloway — Editing / Revision
  'translation-garden',   // Farah al-Rashid — Languages / Translation
  'diary-lighthouse',     // Nadia Volkov — Diary / Personal Narrative
  'spelling-mines',       // Benny Okafor-Williams — Spelling / Word Patterns
  'punctuation-station',  // Rosie Chen — Punctuation / Writing Mechanics
] as const;

export const REALM_OF_EXCHANGE_WORLDS = [
  'market-square',           // Tía Carmen Herrera — Money Basics
  'savings-vault',           // Mr. Abernathy — Saving / Compound Interest
  'entrepreneur-workshop',   // Diego Montoya-Silva — Entrepreneurship
  'barter-docks',            // Tomás Reyes — History of Money / Barter
  'tax-office',              // Sam Worthington — Taxes / Public Services
  'budget-kitchen',          // Priya Nair — Budgeting
  'needs-wants-bridge',      // Nia Oduya — Needs vs Wants
  'investment-greenhouse',   // Jin-ho Park — Investing Basics
  'sharing-meadow',          // Auntie Bee — Sharing Economy / Charity
  'debt-glacier',            // Elsa Lindgren — Debt / Borrowing
  'job-fair',                // Babatunde Afolabi — Jobs / Careers
  'charity-harbor',          // Mei-Lin Wu — Charitable Giving
] as const;

export const THE_CROSSROADS_WORLDS = [
  'music-meadow',         // Luna Esperanza — Music & Math Patterns
  'thinking-grove',       // Old Rowan — Ethics / Critical Thinking
  'wellness-garden',      // Hana Bergstrom — Social-Emotional Learning
  'time-gallery',         // Rami al-Farsi — Historical Thinking
  'workshop-crossroads',  // Kenzo Nakamura-Osei — Design Thinking
  'discovery-trail',      // Solana Bright — Scientific Method
  'everywhere',           // Compass — Navigation / Tutorial
  'great-archive',        // The Librarian — Hub / Onboarding
] as const;

export type DiscoveryWorld = typeof REALM_OF_DISCOVERY_WORLDS[number];
export type ExpressionWorld = typeof REALM_OF_EXPRESSION_WORLDS[number];
export type ExchangeWorld = typeof REALM_OF_EXCHANGE_WORLDS[number];
export type CrossroadsWorld = typeof THE_CROSSROADS_WORLDS[number];
export type WorldId = DiscoveryWorld | ExpressionWorld | ExchangeWorld | CrossroadsWorld;
