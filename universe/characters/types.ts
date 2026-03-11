/**
 * Koydo Universe — Character / Guide Types
 *
 * Every character is a teacher with a wound, a gift, and a reason
 * children will remember them. 50 guides across the universe.
 */

// ─── Character Classification ──────────────────────────────────────

export type CharacterGender = 'male' | 'female' | 'non-binary';

export type MetaHumanClassification =
  | 'standard_metahuman'     // Human characters — fal.ai → MetaHuman pipeline
  | 'custom_non_human';      // Baxter, Cal, Atlas, Old Rowan, Compass

export type CharacterAge =
  | 'child'       // 8-12
  | 'teen'        // 13-19
  | 'adult'       // 20-60
  | 'elder'       // 60+
  | 'ageless';    // Non-human / ancient

// ─── Disability & Neurodiversity Representation ────────────────────

export type DisabilityType =
  | 'none'
  | 'prosthetic_hand'     // Zara Ngozi
  | 'blindness'           // Riku Osei
  | 'hearing_aids'        // Mira Petrov
  | 'hand_tremor'         // Kofi Amponsah
  | 'autism'              // Yuki
  | 'wheelchair_user'     // (TBD)
  | 'dyslexia'            // (TBD)
  | 'stutter'             // (TBD)
  | 'other';

// ─── Character Profile ─────────────────────────────────────────────

export interface CharacterProfile {
  readonly id: string;
  readonly name: string;
  readonly worldId: string;
  readonly gender: CharacterGender;
  readonly culturalOrigin: string;
  readonly age: CharacterAge;
  readonly metahumanClass: MetaHumanClassification;
  readonly disability: DisabilityType;
  readonly subject: string;
  readonly wound: string;
  readonly gift: string;
  readonly personality: CharacterPersonality;
  readonly visualDescription: string;
  readonly leitmotif: string;
}

export interface CharacterPersonality {
  readonly speechStyle: string;
  readonly emotionalRange: readonly EmotionTag[];
  readonly teachingApproach: string;
  readonly catchphrase: string | null;
  readonly quirks: readonly string[];
}

// ─── AI Conversation Types ─────────────────────────────────────────

export type EmotionTag =
  | 'happy'
  | 'curious'
  | 'thoughtful'
  | 'encouraging'
  | 'surprised'
  | 'gentle_correction'
  | 'excited'
  | 'contemplative'
  | 'warm'
  | 'playful';

export interface CharacterSystemPrompt {
  readonly characterId: string;
  readonly basePersonality: string;
  readonly subjectKnowledge: readonly string[];
  readonly adaptiveLayer: AdaptivePromptLayer;
}

export interface AdaptivePromptLayer {
  readonly childAge: number;
  readonly difficultyTier: 1 | 2 | 3;
  readonly completedEntryIds: readonly string[];
  readonly vocabularyLevel: 'simple' | 'intermediate' | 'advanced';
}

export interface ConversationTurn {
  readonly role: 'character' | 'child';
  readonly text: string;
  readonly emotionTag: EmotionTag | null;
  readonly timestamp: number;
}

// ─── NVIDIA ACE Integration ────────────────────────────────────────

export interface AceFacialState {
  readonly emotionTag: EmotionTag;
  readonly intensity: number;       // 0.0 to 1.0
  readonly isSpeaking: boolean;
  readonly blendTarget: EmotionTag | null;
}

// ─── Character Roster Summary ──────────────────────────────────────

export const CHARACTER_ROSTER = {
  // Realm of Discovery (STEM)
  'professor-nimbus':     { world: 'cloud-kingdom',        subject: 'Weather' },
  'zara-ngozi':           { world: 'savanna-workshop',     subject: 'Engineering' },
  'suki-tanaka-reyes':    { world: 'tideline-bay',         subject: 'Ocean Science' },
  'baxter':               { world: 'meadow-lab',           subject: 'Plant Biology' },
  'riku-osei':            { world: 'starfall-observatory', subject: 'Astronomy' },
  'dottie-chakravarti':   { world: 'number-garden',        subject: 'Mathematics' },
  'cal':                  { world: 'calculation-caves',     subject: 'Arithmetic' },
  'lena-sundstrom':       { world: 'magnet-hills',         subject: 'Physics' },
  'kofi-amponsah':        { world: 'circuit-marsh',        subject: 'Electricity' },
  'pixel':                { world: 'code-canyon',           subject: 'Coding' },
  'dr-emeka-obi':         { world: 'body-atlas',           subject: 'Health Science' },
  'mira-petrov':          { world: 'frost-peaks',          subject: 'Geology' },
  'hugo-fontaine':        { world: 'greenhouse-spiral',    subject: 'Chemistry' },
  'yuki':                 { world: 'data-stream',          subject: 'Data Science' },
  'atlas':                { world: 'map-room',             subject: 'Geography' },

  // Realm of Expression (Language Arts)
  'grandmother-anaya':    { world: 'story-tree',           subject: 'Storytelling' },
  'felix-barbosa':        { world: 'rhyme-docks',          subject: 'Poetry' },
  'amara-diallo':         { world: 'letter-forge',         subject: 'Phonics' },
  'captain-birch':        { world: 'nonfiction-fleet',     subject: 'Research' },
  'hassan-yilmaz':        { world: 'folklore-bazaar',      subject: 'Folklore' },
  'farah-al-rashid':      { world: 'translation-garden',   subject: 'Languages' },
  'nadia-volkov':         { world: 'diary-lighthouse',     subject: 'Diary Writing' },

  // Realm of Exchange (Financial Literacy)
  'tia-carmen-herrera':   { world: 'market-square',           subject: 'Money Basics' },
  'mr-abernathy':         { world: 'savings-vault',           subject: 'Saving' },
  'diego-montoya-silva':  { world: 'entrepreneurs-workshop',  subject: 'Entrepreneurship' },
  'tomas-reyes':          { world: 'barter-docks',            subject: 'Barter Systems' },
  'sam-worthington':      { world: 'tax-office',              subject: 'Taxes' },

  // The Crossroads (Cross-Disciplinary)
  'luna':                 { world: 'music-meadow',    subject: 'Music' },
  'old-rowan':            { world: 'thinking-grove',  subject: 'Philosophy' },
  'hana':                 { world: 'wellness-garden', subject: 'Mindfulness' },
  'rami':                 { world: 'time-gallery',    subject: 'History' },
  'the-librarian':        { world: 'great-archive',   subject: 'Hub' },
  'compass':              { world: 'great-archive',   subject: 'Navigation Guide' },
} as const;

export type CharacterId = keyof typeof CHARACTER_ROSTER;
