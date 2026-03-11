/**
 * Koydo Universe — World Definitions
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
  'reading-reef',         // (Guide TBD) — Reading Comprehension
  'word-workshop',        // (Guide TBD) — Vocabulary Building
  'grammar-garden',       // (Guide TBD) — Grammar / Sentence Structure
  'debate-dock',          // (Guide TBD) — Argumentation / Persuasion
  'comic-corner',         // (Guide TBD) — Visual Storytelling
  'journal-island',       // (Guide TBD) — Creative Writing / Journaling
  'translation-garden',   // Farah al-Rashid — Languages / Translation
  'diary-lighthouse',     // Nadia Volkov — Diary / Personal Narrative
  'speech-stage',         // (Guide TBD) — Public Speaking
  'library-labyrinth',    // (Guide TBD) — Library Skills / Research
] as const;

export const REALM_OF_EXCHANGE_WORLDS = [
  'market-square',           // Tía Carmen Herrera — Money Basics
  'savings-vault',           // Mr. Abernathy — Saving / Compound Interest
  'entrepreneurs-workshop',  // Diego Montoya-Silva — Entrepreneurship
  'barter-docks',            // Tomás Reyes — History of Money / Barter
  'tax-office',              // Sam Worthington — Taxes / Public Services
  'budget-kitchen',          // (Guide TBD) — Budgeting
  'needs-wants-bridge',      // (Guide TBD) — Needs vs Wants
  'investment-greenhouse',   // (Guide TBD) — Investing Basics
  'sharing-meadow',          // (Guide TBD) — Sharing Economy / Charity
  'debt-glacier',            // (Guide TBD) — Debt / Borrowing
  'job-fair',                // (Guide TBD) — Jobs / Careers
  'insurance-island',        // (Guide TBD) — Risk / Insurance
] as const;

export const THE_CROSSROADS_WORLDS = [
  'music-meadow',     // Luna — Music / Sound
  'thinking-grove',   // Old Rowan — Philosophy / Ethics
  'wellness-garden',  // Hana — Mindfulness / Emotional Health
  'time-gallery',     // Rami — History / Chronology
  'art-studio',       // (Guide TBD) — Visual Art
  'invention-lab',    // (Guide TBD) — Cross-disciplinary STEM
  'culture-bridge',   // (Guide TBD) — Cross-cultural Understanding
  'great-archive',    // The Librarian — Hub / Onboarding
] as const;

export type DiscoveryWorld = typeof REALM_OF_DISCOVERY_WORLDS[number];
export type ExpressionWorld = typeof REALM_OF_EXPRESSION_WORLDS[number];
export type ExchangeWorld = typeof REALM_OF_EXCHANGE_WORLDS[number];
export type CrossroadsWorld = typeof THE_CROSSROADS_WORLDS[number];
export type WorldId = DiscoveryWorld | ExpressionWorld | ExchangeWorld | CrossroadsWorld;
