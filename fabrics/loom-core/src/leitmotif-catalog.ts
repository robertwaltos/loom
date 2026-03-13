/**
 * leitmotif-catalog.ts — Character Leitmotif Catalog from Bible v5 Part 15.
 *
 * Every character has a musical identity: a 4-8 bar motif that plays
 * when the character first appears in a session. 50 character motifs
 * plus Compass's adaptive motif.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface LeitmotifLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const MOTIF_BAR_MIN = 4;
export const MOTIF_BAR_MAX = 8;
export const TOTAL_LEITMOTIFS = 50;

// ── Types ────────────────────────────────────────────────────────

export type MusicalKey =
  | 'C major' | 'C minor' | 'C minor / C major'
  | 'D major' | 'D major (Makam Rast)' | 'D minor'
  | 'E major' | 'E minor' | 'E♭ major'
  | 'F major' | 'F minor' | 'F♯ minor'
  | 'G major' | 'G minor'
  | 'A major' | 'A minor' | 'A♭ major'
  | 'B♭ major' | 'B♭ minor'
  | 'Open fifths' | 'Root note only' | 'Chromatic' | 'Modal' | 'Modal (shifting)'
  | 'Silence → color' | 'All keys'
  | "The child's favorite key";

export type Tempo =
  | 'Largo' | 'Adagio' | 'Andante' | 'Moderato' | 'Allegretto' | 'Allegro' | 'Vivace'
  | 'Rubato' | 'Irregular' | 'Precise' | 'Free' | 'Free time'
  | 'Very slow' | 'Geological' | 'Timeless'
  | 'Swung' | 'Flowing' | 'Deliberate' | 'Walking' | 'Walking pace'
  | 'March tempo' | 'Conversational' | 'Moderate' | 'Slow'
  | 'Seafaring 6/8' | 'Upbeat' | 'Energetic' | 'Lively'
  | 'Relaxed' | 'Patient' | 'Steady' | 'Resolved' | 'Bouncy'
  | 'Creative' | 'Hiking pace' | 'Breathing pace' | 'Glacial'
  | 'Historical' | 'Playful' | 'Gentle';

export interface LeitmotifDefinition {
  readonly characterId: string;
  readonly characterName: string;
  readonly key: MusicalKey;
  readonly tempo: Tempo;
  readonly leadInstrument: string;
  readonly mood: string;
}

// ── Leitmotif Data ───────────────────────────────────────────────

const LEITMOTIFS: ReadonlyArray<LeitmotifDefinition> = [
  { characterId: 'professor-nimbus', characterName: 'Professor Nimbus', key: 'D major', tempo: 'Andante', leadInstrument: 'Oboe', mood: 'Wistful, wondering' },
  { characterId: 'zara-ngozi', characterName: 'Zara Ngozi', key: 'G minor', tempo: 'Allegro', leadInstrument: 'Kalimba + percussion', mood: 'Determined, inventive' },
  { characterId: 'suki-tanaka-reyes', characterName: 'Suki Tanaka-Reyes', key: 'E♭ major', tempo: 'Adagio', leadInstrument: 'Shakuhachi flute', mood: 'Deep, flowing' },
  { characterId: 'baxter', characterName: 'Baxter', key: 'B♭ major', tempo: 'Moderato', leadInstrument: 'Buzzy cello pizzicato', mood: 'Nervous, endearing' },
  { characterId: 'riku-osei', characterName: 'Riku Osei', key: 'F♯ minor', tempo: 'Largo', leadInstrument: 'Kora (West African harp)', mood: 'Vast, nocturnal' },
  { characterId: 'dottie-chakravarti', characterName: 'Dottie Chakravarti', key: 'C major', tempo: 'Allegretto', leadInstrument: 'Sitar + music box', mood: 'Precise, warm' },
  { characterId: 'cal', characterName: 'Cal', key: 'A major', tempo: 'Rubato', leadInstrument: 'Glass harmonica', mood: 'Crystalline, pure' },
  { characterId: 'lena-sundstrom', characterName: 'Lena Sundstrom', key: 'E minor', tempo: 'Vivace', leadInstrument: 'French horn', mood: 'Powerful, athletic' },
  { characterId: 'kofi-amponsah', characterName: 'Kofi Amponsah', key: 'D minor', tempo: 'Moderato', leadInstrument: 'Highlife guitar', mood: 'Crackling, warm' },
  { characterId: 'pixel', characterName: 'Pixel', key: 'C minor / C major', tempo: 'Irregular', leadInstrument: '8-bit synth + piano', mood: 'Flickering, hopeful' },
  { characterId: 'dr-emeka-obi', characterName: 'Dr. Emeka Obi', key: 'B♭ major', tempo: 'Andante', leadInstrument: 'Warm brass', mood: 'Steady, compassionate' },
  { characterId: 'mira-petrov', characterName: 'Mira Petrov', key: 'F minor', tempo: 'Adagio', leadInstrument: 'Cello', mood: 'Deep, patient' },
  { characterId: 'hugo-fontaine', characterName: 'Hugo Fontaine', key: 'G major', tempo: 'Moderato', leadInstrument: 'Acoustic guitar (nylon)', mood: 'Growing, hopeful' },
  { characterId: 'yuki', characterName: 'Yuki', key: 'A minor', tempo: 'Precise', leadInstrument: 'Prepared piano', mood: 'Exact, beautiful' },
  { characterId: 'atlas', characterName: 'Atlas', key: 'Open fifths', tempo: 'Very slow', leadInstrument: 'Low brass + stone bowls', mood: 'Ancient, immovable' },
  { characterId: 'grandmother-anaya', characterName: 'Grandmother Anaya', key: 'D major', tempo: 'Free time', leadInstrument: 'Native American flute', mood: 'Timeless, warm' },
  { characterId: 'felix-barbosa', characterName: 'Felix Barbosa', key: 'E♭ major', tempo: 'Swung', leadInstrument: 'Berimbau + hand drum', mood: 'Rhythmic, spoken-word' },
  { characterId: 'amara-diallo', characterName: 'Amara Diallo', key: 'C minor', tempo: 'Flowing', leadInstrument: 'Balafon + voice', mood: 'Elegant, multilingual' },
  { characterId: 'oliver-marsh', characterName: 'Oliver Marsh', key: 'E major', tempo: 'Moderate', leadInstrument: 'Harp + ocean sounds', mood: 'Gentle, deep' },
  { characterId: 'lila-johansson-park', characterName: 'Lila Johansson-Park', key: 'F major', tempo: 'Precise', leadInstrument: 'Piano (Bach-like)', mood: 'Structural, clear' },
  { characterId: 'kwame-asante', characterName: 'Kwame Asante', key: 'B♭ minor', tempo: 'Moderate', leadInstrument: 'Djembe + talking drum', mood: 'Hunting, tracking' },
  { characterId: 'rosie-chen', characterName: 'Rosie Chen', key: 'G major', tempo: 'March tempo', leadInstrument: 'Train whistle + snare', mood: 'Punctual, decisive' },
  { characterId: 'theo-papadopoulos', characterName: 'Theo Papadopoulos', key: 'D minor', tempo: 'Deliberate', leadInstrument: 'Bouzouki + bass', mood: 'Measured, persuasive' },
  { characterId: 'nadia-volkov', characterName: 'Nadia Volkov', key: 'A minor', tempo: 'Free', leadInstrument: 'Bandura (Ukrainian)', mood: 'Haunting, private' },
  { characterId: 'benny-okafor-williams', characterName: 'Benny Okafor-Williams', key: 'C major', tempo: 'Upbeat', leadInstrument: 'Xylophone + pickaxe tap', mood: 'Young, eager' },
  { characterId: 'farah-al-rashid', characterName: 'Farah al-Rashid', key: 'Modal (shifting)', tempo: 'Moderate', leadInstrument: 'Oud + garden bells', mood: 'Multilayered, fragrant' },
  { characterId: 'captain-birch', characterName: 'Captain Birch', key: 'E♭ major', tempo: 'Seafaring 6/8', leadInstrument: 'Fiddle + concertina', mood: 'Adventurous, cautious' },
  { characterId: 'ines-moreau', characterName: 'Ines Moreau', key: 'Silence → color', tempo: 'Free', leadInstrument: 'Drawn sounds (paper, charcoal)', mood: 'Quiet, vivid' },
  { characterId: 'hassan-yilmaz', characterName: 'Hassan Yilmaz', key: 'D major (Makam Rast)', tempo: 'Conversational', leadInstrument: 'Ney flute + frame drum', mood: 'Spice-scented, wise' },
  { characterId: 'wren-calloway', characterName: 'Wren Calloway', key: 'C minor / C major', tempo: 'Moderate', leadInstrument: 'Typewriter + strings', mood: 'Draft-to-polish arc' },
  { characterId: 'tia-carmen-herrera', characterName: 'T\u00EDa Carmen Herrera', key: 'G major', tempo: 'Lively', leadInstrument: 'Marimba + handclap', mood: 'Bustling, fair' },
  { characterId: 'mr-abernathy', characterName: 'Mr. Abernathy', key: 'B♭ major', tempo: 'Slow', leadInstrument: 'Cello + ticking clock', mood: 'Patient, cautious' },
  { characterId: 'priya-nair', characterName: 'Priya Nair', key: 'A major', tempo: 'Moderate', leadInstrument: 'Tabla + kitchen percussion', mood: 'Nourishing, capable' },
  { characterId: 'diego-montoya-silva', characterName: 'Diego Montoya-Silva', key: 'E minor', tempo: 'Energetic', leadInstrument: 'Charango + workshop sounds', mood: 'Restless, creative' },
  { characterId: 'auntie-bee', characterName: 'Auntie Bee', key: 'F major', tempo: 'Relaxed', leadInstrument: 'Steel pan + humming', mood: 'Communal, generous' },
  { characterId: 'jin-ho-park', characterName: 'Jin-ho Park', key: 'D major', tempo: 'Patient', leadInstrument: 'Gayageum + wind', mood: 'Growing, seasonal' },
  { characterId: 'nia-oduya', characterName: 'Nia Oduya', key: 'A♭ major', tempo: 'Steady', leadInstrument: 'Thumb piano + footsteps', mood: 'Deliberate, minimal' },
  { characterId: 'tomas-reyes', characterName: 'Tom\u00E1s Reyes', key: 'G minor', tempo: 'Historical', leadInstrument: 'Caj\u00F3n + conch shell', mood: 'Ancient, trading' },
  { characterId: 'elsa-lindgren', characterName: 'Elsa Lindgren', key: 'E minor', tempo: 'Glacial', leadInstrument: 'Nyckelharpa + ice sounds', mood: 'Calm, precise' },
  { characterId: 'babatunde-afolabi', characterName: 'Babatunde Afolabi', key: 'B♭ major', tempo: 'Walking pace', leadInstrument: 'Shekere + bass', mood: 'Varied, optimistic' },
  { characterId: 'mei-lin-wu', characterName: 'Mei-Lin Wu', key: 'D major', tempo: 'Resolved', leadInstrument: 'Guzheng + water', mood: 'Generous, flowing' },
  { characterId: 'sam-worthington', characterName: 'Sam Worthington', key: 'C major', tempo: 'Bouncy', leadInstrument: 'Didgeridoo + comedy percussion', mood: 'Surprising, fun' },
  { characterId: 'the-librarian', characterName: 'The Librarian', key: 'Chromatic', tempo: 'Timeless', leadInstrument: 'Library sounds + breath', mood: 'Infinite, quiet' },
  { characterId: 'kenzo-nakamura-osei', characterName: 'Kenzo Nakamura-Osei', key: 'E♭ major', tempo: 'Creative', leadInstrument: 'Koto + hammer sounds', mood: 'Design, possibility' },
  { characterId: 'solana-bright', characterName: 'Solana Bright', key: 'D major', tempo: 'Hiking pace', leadInstrument: 'Berimbau + birdsong', mood: 'Curious, moving' },
  { characterId: 'old-rowan', characterName: 'Old Rowan', key: 'Root note only', tempo: 'Geological', leadInstrument: 'Low drone + creaking wood', mood: 'Ancient, slow' },
  { characterId: 'hana-bergstrom', characterName: 'Hana Bergstrom', key: 'F major', tempo: 'Breathing pace', leadInstrument: 'Nyckelharpa + garden sounds', mood: 'Tender, strong' },
  { characterId: 'rami-al-farsi', characterName: 'Rami al-Farsi', key: 'Modal', tempo: 'Walking', leadInstrument: 'Oud + footsteps on stone', mood: 'Layered, historical' },
  { characterId: 'luna-esperanza', characterName: 'Luna Esperanza', key: 'All keys', tempo: 'Playful', leadInstrument: 'Rondalla + everything', mood: 'Musical, connecting' },
  { characterId: 'compass', characterName: 'Compass', key: "The child's favorite key", tempo: 'Gentle', leadInstrument: 'Bells + whatever the child needs', mood: 'Orienting, safe' },
];

// ── Port ─────────────────────────────────────────────────────────

export interface LeitmotifCatalogPort {
  readonly getAllMotifs: () => ReadonlyArray<LeitmotifDefinition>;
  readonly getMotifByCharacter: (characterId: string) => LeitmotifDefinition | undefined;
  readonly getMotifsByKey: (key: MusicalKey) => ReadonlyArray<LeitmotifDefinition>;
  readonly getMotifsByMood: (moodFragment: string) => ReadonlyArray<LeitmotifDefinition>;
  readonly getTotalCount: () => number;
}

// ── Implementation ───────────────────────────────────────────────

function getMotifByCharacter(characterId: string): LeitmotifDefinition | undefined {
  return LEITMOTIFS.find(m => m.characterId === characterId);
}

function getMotifsByKey(key: MusicalKey): ReadonlyArray<LeitmotifDefinition> {
  return LEITMOTIFS.filter(m => m.key === key);
}

function getMotifsByMood(moodFragment: string): ReadonlyArray<LeitmotifDefinition> {
  const lower = moodFragment.toLowerCase();
  return LEITMOTIFS.filter(m => m.mood.toLowerCase().includes(lower));
}

// ── Factory ──────────────────────────────────────────────────────

export function createLeitmotifCatalog(): LeitmotifCatalogPort {
  return {
    getAllMotifs: () => LEITMOTIFS,
    getMotifByCharacter,
    getMotifsByKey,
    getMotifsByMood,
    getTotalCount: () => LEITMOTIFS.length,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface LeitmotifEngine {
  readonly kind: 'leitmotif-catalog';
  readonly catalog: LeitmotifCatalogPort;
}

export function createLeitmotifEngine(
  deps: { readonly log: LeitmotifLogPort },
): LeitmotifEngine {
  const catalog = createLeitmotifCatalog();
  deps.log.info({ motifCount: catalog.getTotalCount() }, 'Leitmotif catalog initialized');
  return { kind: 'leitmotif-catalog', catalog };
}
