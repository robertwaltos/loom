/**
 * World Soundscape Profiles
 *
 * Per-world audio identity registry for all 50 Koydo Worlds.
 * Each profile defines the complete sonic character of a world:
 * ambient layers, musical palette derived from the guide's leitmotif,
 * fading responsiveness (how music changes with luminance), the
 * restoration jingle at full radiance, and Threadway crossfade identity.
 *
 * Source: Koydo Worlds Production Bible v4 + Expansion Bible v5,
 * cross-referenced with leitmotif-catalog.ts and world-fading-profiles.ts.
 */

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_SOUNDSCAPE_PROFILES = 50;

// ── Types ────────────────────────────────────────────────────────

export interface MusicalPalette {
  /** Tonal center — from guide leitmotif */
  readonly key: string;
  /** Rhythmic feel — from guide leitmotif */
  readonly tempo: string;
  /** Primary instrument — from guide leitmotif */
  readonly leadInstrument: string;
  /** Instruments that layer in as luminance rises */
  readonly supportInstruments: ReadonlyArray<string>;
}

export interface FadingResponse {
  /** Luminance 0–0.24: what sound remains when the world has almost faded */
  readonly sparse: string;
  /** Luminance 0.25–0.74: what returns as the child brings recognition back */
  readonly partial: string;
  /** Luminance 0.75–1.0: the full sonic expression of the restored world */
  readonly full: string;
}

export interface ThreadwayCrossfade {
  /** The audio event when a child arrives from the Silfen Weave */
  readonly entering: string;
  /** The audio event when a child departs into the Silfen Weave */
  readonly departing: string;
  /** One-word sonic identity for crossfade logic */
  readonly signature: string;
}

export interface WorldSoundscapeProfile {
  readonly worldId: string;
  readonly worldName: string;
  readonly guideId: string;
  /** Base environmental sounds — non-musical, biome-specific */
  readonly ambientLayers: ReadonlyArray<string>;
  readonly musicalPalette: MusicalPalette;
  /** How sound evolves across the three luminance stages */
  readonly fadingResponse: FadingResponse;
  /** The audio event that fires exactly once at luminance 1.0 */
  readonly restorationJingle: string;
  readonly threadwayCrossfade: ThreadwayCrossfade;
}

// ── Port ─────────────────────────────────────────────────────────

export interface WorldSoundscapeProfilesPort {
  readonly totalProfiles: number;
  getProfile(worldId: string): WorldSoundscapeProfile | undefined;
  all(): ReadonlyArray<WorldSoundscapeProfile>;
  getProfilesForRealm(
    realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
  ): ReadonlyArray<WorldSoundscapeProfile>;
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

// ── All 50 Soundscape Profiles ───────────────────────────────────

const SOUNDSCAPE_PROFILES_DATA: ReadonlyArray<WorldSoundscapeProfile> = [

  // ── REALM OF DISCOVERY — 15 Worlds ──────────────────────────────

  {
    worldId: 'cloud-kingdom',
    worldName: 'Cloud Kingdom',
    guideId: 'professor-nimbus',
    ambientLayers: ['wind rush', 'distant thunder', 'gentle rain', 'cloud-mass movement', 'rainbow shimmer tones'],
    musicalPalette: {
      key: 'D major',
      tempo: 'Andante',
      leadInstrument: 'Oboe',
      supportInstruments: ['strings', 'wind chimes', 'sustained choir', 'gentle timpani'],
    },
    fadingResponse: {
      sparse: 'A single mournful oboe note sounds once and fades. Wind passes over the islands but carries nothing with it.',
      partial: 'Oboe rejoined by a lone wind chime. Distant thunder audible but unable to reach. The rain begins on one island only.',
      full: 'Full ensemble — oboe, strings, wind chimes, and a sustained choir held on the D major tonic. Every instrument audible at once. Thunder is music now.',
    },
    restorationJingle: 'A gentle thunderclap delivers a warm D major oboe fanfare. The choir swells for three bars. Golden light floods every cloud island as Nimbus whispers his thanks.',
    threadwayCrossfade: {
      entering: 'A wind swell crests and the oboe theme enters mid-phrase, as if a window into the sky has opened.',
      departing: 'Wind chimes descend in pitch. The oboe holds its last note, then the cloud layer swallows all sound.',
      signature: 'meteorological',
    },
  },

  {
    worldId: 'savanna-workshop',
    worldName: 'Savanna Workshop',
    guideId: 'zara-ngozi',
    ambientLayers: ['wind through dry grass', 'distant bird calls', 'machinery hum', 'hammer on metal', 'weaver bird chatter'],
    musicalPalette: {
      key: 'G minor',
      tempo: 'Allegro',
      leadInstrument: 'Kalimba + percussion',
      supportInstruments: ['marimba', 'djembe', 'bass kalimba', 'ambient rhythmic layers'],
    },
    fadingResponse: {
      sparse: 'Only the creak of a rusted hinge. Kalimba absent. The grass hisses but the rhythms are all wrong.',
      partial: 'Savanna ambience returns — wind through grass, distant birds. Kalimba taps one-finger fragments while djembe keeps quarter-time only.',
      full: 'Workshop sounds — hammering, machinery, wind — layer into something almost musical. Kalimba and marimba in full call-and-response.',
    },
    restorationJingle: 'Windmill blades catch the wind for the first time. A rising G-minor-to-G-major kalimba cascade sweeps through the whole workshop as Zara\'s laugh rings out.',
    threadwayCrossfade: {
      entering: 'Kalimba intro over savanna wind — the percussion enters mid-groove, already mid-construction.',
      departing: 'Djembe rhythm slows to a single tap. Grass rustle sweeps in and takes the music with it.',
      signature: 'inventive',
    },
  },

  {
    worldId: 'tideline-bay',
    worldName: 'Tideline Bay',
    guideId: 'suki-tanaka-reyes',
    ambientLayers: ['wave rhythm', 'whale song from beyond the boundary', 'seagull calls', 'bioluminescent pulse hum', 'coral structure resonance'],
    musicalPalette: {
      key: 'E♭ major',
      tempo: 'Adagio',
      leadInstrument: 'Shakuhachi flute',
      supportInstruments: ['koto', 'water percussion', 'oceanic drone', 'whale-call layers'],
    },
    fadingResponse: {
      sparse: 'Hollow silence. No waves, no gulls. A low windless hum is all that remains of the ocean.',
      partial: 'Gentle wave rhythm returns. Occasional distant gull. Shakuhachi plays a three-note fragment and stops.',
      full: 'Whale song audible from beyond the map boundary. Full oceanic design — layered, alive. Shakuhachi melody complete.',
    },
    restorationJingle: 'A whale beach creates a resonant chord on impact. The shakuhachi rises to its highest register as a mass coral spawning event begins — millions of pink packets floating upward like inverse snow.',
    threadwayCrossfade: {
      entering: 'A wave swell arrives and the shakuhachi theme enters with it, as if carried in on the tide.',
      departing: 'Tide receding. Shakuhachi holds its last note over whale song that grows distant. Silence from below.',
      signature: 'oceanic',
    },
  },

  {
    worldId: 'meadow-lab',
    worldName: 'The Meadow Lab',
    guideId: 'baxter',
    ambientLayers: ['bee buzz', 'cricket song', 'wind through tall grass', 'stream water', 'ladybird wing flutter'],
    musicalPalette: {
      key: 'B♭ major',
      tempo: 'Moderato',
      leadInstrument: 'Buzzy cello pizzicato',
      supportInstruments: ['wind chimes', 'morning birdsong layers', 'ambient insect chorus', 'light marimba'],
    },
    fadingResponse: {
      sparse: 'No insects. No rustle. Dry wind moves over dead grass. The beehives are sealed. The cello is silent.',
      partial: 'Occasional bee buzz. Wind chime from the lab tree. Morning birdsong beginning. Cello pizzicato taps shyly.',
      full: 'Full insect symphony — bees, crickets, grasshoppers competing with cello pizzicato over wind and stream. Seventeen things to hear at once.',
    },
    restorationJingle: 'A bee lands on Baxter\'s hand. A single B♭ major pizzicato chord. A second bee lands. A third. The whole meadow hum crescendos from the lowest register up.',
    threadwayCrossfade: {
      entering: 'Bee buzz fades in over tall grass. Cello pizzicato introduces itself with a single pluck, then the full insect chorus.',
      departing: 'Grass rustle sweeps through. A single wind chime rings once. Insect sounds fade into distance.',
      signature: 'pollinating',
    },
  },

  {
    worldId: 'starfall-observatory',
    worldName: 'Starfall Observatory',
    guideId: 'riku-osei',
    ambientLayers: ['cosmic hum', 'telescope mechanism clicks', 'night wind', 'starfall crackle', 'deep space resonance'],
    musicalPalette: {
      key: 'F♯ minor',
      tempo: 'Largo',
      leadInstrument: 'Kora (West African harp)',
      supportInstruments: ['strings', 'low brass', 'glass harmonica (occasional)', 'cosmic ambient layers'],
    },
    fadingResponse: {
      sparse: 'A single kora string is plucked in the void and the sound is absorbed before it echoes. The telescope makes a mechanical attempt.',
      partial: 'Kora finds a second string. Cosmic hum rises. Telescope mechanisms respond. The night is not entirely empty.',
      full: 'Full night sky sound — kora in full arpeggio, strings arcing, cosmic resonance buzzing. The starfall crackle is music.',
    },
    restorationJingle: 'A meteor shower passes overhead — crackling descent and kora arpeggios resolving to F♯ minor chord. Riku charts each one without looking away from the child.',
    threadwayCrossfade: {
      entering: 'Cosmic hum swells and the kora theme enters from the upper register, as if the stars have opened an aperture.',
      departing: 'Telescope mechanism clicks once. The kora\'s last note rings until the Threadway takes it.',
      signature: 'nocturnal',
    },
  },

  {
    worldId: 'number-garden',
    worldName: 'Number Garden',
    guideId: 'dottie-chakravarti',
    ambientLayers: ['garden ambience', 'numerical chime sequences', 'hedge-maze wind', 'mathematical rhythm clicks', 'blossom movement'],
    musicalPalette: {
      key: 'C major',
      tempo: 'Allegretto',
      leadInstrument: 'Sitar + music box',
      supportInstruments: ['marimba', 'bells', 'glass harp', 'rhythmic mathematical clicks'],
    },
    fadingResponse: {
      sparse: 'A single music box note plays and stops. Garden silence. The marimba is still.',
      partial: 'Sitar plucks a mathematical fragment. Garden chimes wake. Marimba enters on the 4-count only.',
      full: 'Marimba and music box in layered mathematical rhythms. Sitar holds the tonal center. The garden is precise and warm and completely alive.',
    },
    restorationJingle: 'A perfect mathematical sequence resolves in C major — music box plays the full melody end-to-end as every blossom in the garden opens simultaneously.',
    threadwayCrossfade: {
      entering: 'Library ambience bleeds away as marimba enters — a crossfade from amber to green, from shelf to garden.',
      departing: 'Sitar holds one note over fading music box tones. The garden settles to a hum.',
      signature: 'mathematical',
    },
  },

  {
    worldId: 'calculation-caves',
    worldName: 'Calculation Caves',
    guideId: 'cal',
    ambientLayers: ['crystal resonance', 'cave echo', 'mineral water drips', 'stalactite chime tones', 'geological breath'],
    musicalPalette: {
      key: 'A major',
      tempo: 'Rubato',
      leadInstrument: 'Glass harmonica',
      supportInstruments: ['high piano', 'celesta', 'sustained strings', 'crystal percussion'],
    },
    fadingResponse: {
      sparse: 'Drip. Silence. Drip. The glass harmonica does not sound. The crystals are opaque.',
      partial: 'Crystal resonance begins again. A glass harmonica fragment enters — pure, tentative. Cave echo doubles it.',
      full: 'Crystal choir — glass harmonica, celesta, sustained strings, cave ecology entire. Each note is both calculation and beauty.',
    },
    restorationJingle: 'A crystal formation completes its growth — glass harmonica plays a perfect A major chord that echoes in the cave geometrically, each reflection a different harmonic.',
    threadwayCrossfade: {
      entering: 'Cave echo fades in around you. Glass harmonica emerges from the resonance, already mid-arpeggio.',
      departing: 'Echo decay without a source note. Drip fades. Crystal chime trailing to nothing.',
      signature: 'crystalline',
    },
  },

  {
    worldId: 'magnet-hills',
    worldName: 'Magnet Hills',
    guideId: 'lena-sundstrom',
    ambientLayers: ['wind over hills', 'magnetic hum', 'metallic resonance', 'kinetic machinery', 'metal-object chime'],
    musicalPalette: {
      key: 'E minor',
      tempo: 'Vivace',
      leadInstrument: 'French horn',
      supportInstruments: ['brass ensemble', 'strings', 'kinetic percussion', 'resonant metal layers'],
    },
    fadingResponse: {
      sparse: 'Hollow wind over bare hills. No magnetic hum. No resonance. Just emptiness shaped like power.',
      partial: 'Magnetic hum rises from the ground. French horn calls distantly. The hills feel like they remember what they were.',
      full: 'Powerful brass ensemble over kinetic machinery and hill wind. Every metal object contributing its note. The whole world vibrates.',
    },
    restorationJingle: 'All magnets align at once — a massive resonant chord as every metal object in the world rings simultaneously. French horn fanfare in E minor answers from the highest hill.',
    threadwayCrossfade: {
      entering: 'Magnetic hum builds and French horn enters on the dominant — a fanfare announcing arrival.',
      departing: 'Brass notes Doppler-shift into wind. The resonance fades slowly, as if the hills are reluctant.',
      signature: 'magnetic',
    },
  },

  {
    worldId: 'circuit-marsh',
    worldName: 'Circuit Marsh',
    guideId: 'kofi-amponsah',
    ambientLayers: ['swamp ambience', 'electrical buzz and crackle', 'frog chorus', 'marsh wind', 'reed movement'],
    musicalPalette: {
      key: 'D minor',
      tempo: 'Moderato',
      leadInstrument: 'Highlife guitar',
      supportInstruments: ['bass guitar', 'talking drum', 'electric percussion', 'warm synth layer'],
    },
    fadingResponse: {
      sparse: 'Only swamp silence and the crackle of dead circuits. The guitar is somewhere in the marsh, waterlogged.',
      partial: 'Marsh ambience and electrical buzz return. Highlife guitar finds one chord and holds it. Frog chorus tentative.',
      full: 'Full highlife band texture — guitar, bass, talking drum, electric percussion. Swamp ecology alive. Warm electrical hum underpinning everything.',
    },
    restorationJingle: 'Circuits light up in cascade sequence — a highlife guitar riff plays in perfect D minor over the flickering grid, and the full frog chorus answers on the backbeat.',
    threadwayCrossfade: {
      entering: 'Swamp sounds and electrical buzz layer in. Highlife guitar intro enters over both.',
      departing: 'Guitar fades into marsh. Frog chorus holds a moment, then gives way to wind through reeds.',
      signature: 'electrified',
    },
  },

  {
    worldId: 'code-canyon',
    worldName: 'Code Canyon',
    guideId: 'pixel',
    ambientLayers: ['digital chirps', 'canyon echo', 'data stream sounds', 'glitch artifacts', 'binary pulse'],
    musicalPalette: {
      key: 'C minor / C major',
      tempo: 'Irregular',
      leadInstrument: '8-bit synth + piano',
      supportInstruments: ['synthesizer layers', 'acoustic piano', 'chiptune bass', 'digital percussion'],
    },
    fadingResponse: {
      sparse: 'Only glitch artifacts and silence. The 8-bit motif stutters and fails to complete.',
      partial: '8-bit fragment + canyon echo + digital chirps. Acoustic piano enters on beat two only. Signal flickering.',
      full: 'Full chiptune + acoustic piano + canyon resonance + living data streams. The glitch is now intentional and beautiful.',
    },
    restorationJingle: 'A boot sequence plays in 8-bit — glitch resolves to clean signal — acoustic piano enters with a hopeful C major chord that the canyon echoes four times.',
    threadwayCrossfade: {
      entering: 'Digital chirps lead in, then 8-bit theme arrives mid-loop, as if you\'ve loaded into a running program.',
      departing: 'Data stream fades. Echo decay. Binary pulse drops to zero.',
      signature: 'digital',
    },
  },

  {
    worldId: 'body-atlas',
    worldName: 'Body Atlas',
    guideId: 'dr-emeka-obi',
    ambientLayers: ['heartbeat rhythm', 'cellular hum', 'breath sounds', 'atlas mechanism movement', 'circulatory pulse'],
    musicalPalette: {
      key: 'B♭ major',
      tempo: 'Andante',
      leadInstrument: 'Warm brass',
      supportInstruments: ['strings', 'woodwinds', 'light percussion', 'deep resonant bass'],
    },
    fadingResponse: {
      sparse: 'A single heartbeat pulse sounds at long intervals. Brass absent. The atlas is still.',
      partial: 'Heartbeat steadies. Breath sounds return. Warm brass fragment enters — one phrase — and stops.',
      full: 'Full body symphony — heartbeat, cellular hum, breath, warm brass ensemble. Every system functioning in concert.',
    },
    restorationJingle: 'A full chord of warm brass announces complete illumination. The heartbeat locks to the tempo. Dr. Obi lays a hand on the atlas and says nothing. The body knows.',
    threadwayCrossfade: {
      entering: 'Heartbeat rhythm fades in first. Then breath. Then brass theme — as if the body atlas is recognizing your presence.',
      departing: 'Breath exhale. Brass fade. Heartbeat continues for a few more counts before the Threadway takes it.',
      signature: 'vital',
    },
  },

  {
    worldId: 'frost-peaks',
    worldName: 'Frost Peaks',
    guideId: 'mira-petrov',
    ambientLayers: ['ice wind', 'glacier creak and settlement', 'snow silence', 'distant avalanche', 'melt-water trickle'],
    musicalPalette: {
      key: 'F minor',
      tempo: 'Adagio',
      leadInstrument: 'Cello',
      supportInstruments: ['strings', 'slow horn', 'solo violin', 'glacial breath layers'],
    },
    fadingResponse: {
      sparse: 'White silence. Only the faintest wind. The cello is buried under a meter of snow.',
      partial: 'Cello finds a fragment — just two notes — over glacier creak. Sparse strings join without establishing tempo.',
      full: 'Full cello suite over responsive strings and wind. Glacier ecology alive. The peaks are a concert hall of pure cold.',
    },
    restorationJingle: 'A single cello note warms the air — F minor resolves to F major as the observation platform clears of frost. Mira stands at the edge, arms out, letting the wind carry her music.',
    threadwayCrossfade: {
      entering: 'Ice wind in from far away, then cello theme emerging from the cold — unhurried, deep.',
      departing: 'Cello holds its note as you leave. Wind fills the space. Both sounds compete until only wind remains.',
      signature: 'glacial',
    },
  },

  {
    worldId: 'greenhouse-spiral',
    worldName: 'Greenhouse Spiral',
    guideId: 'hugo-fontaine',
    ambientLayers: ['plant movement and growth sounds', 'greenhouse humidity hiss', 'spiral structure wind', 'distant birdsong', 'water cycle drips'],
    musicalPalette: {
      key: 'G major',
      tempo: 'Moderato',
      leadInstrument: 'Acoustic guitar (nylon)',
      supportInstruments: ['flute', 'light strings', 'ambient hum', 'layered birdsong'],
    },
    fadingResponse: {
      sparse: 'A single creaking vine. The guitar is silent. The spiral feels empty of everything but structure.',
      partial: 'Guitar finds a three-chord progression. Plant movement sounds return. Distant birdsong beginning. The humidity is back.',
      full: 'Living greenhouse — guitar, strings, plant sounds, abundant birdsong, water cycles. Every level of the spiral contributing something.',
    },
    restorationJingle: 'The spiral blooms — every plant at every level opens simultaneously. Guitar plays a G major resolving chord as birdsong from all five levels rings together.',
    threadwayCrossfade: {
      entering: 'Humidity hiss fades in with plant sounds, then guitar intro from the lower spiral — already mid-chord.',
      departing: 'A bird call trails off above you. Guitar fades to a single open string. The greenhouse settles.',
      signature: 'growing',
    },
  },

  {
    worldId: 'data-stream',
    worldName: 'Data Stream',
    guideId: 'yuki',
    ambientLayers: ['data flow current sounds', 'precision mechanism ticks', 'counting sequences', 'stream current', 'register pulse'],
    musicalPalette: {
      key: 'A minor',
      tempo: 'Precise',
      leadInstrument: 'Prepared piano',
      supportInstruments: ['electric piano', 'minimal percussion', 'high strings', 'metronome pulse'],
    },
    fadingResponse: {
      sparse: 'A single precise piano tap. Silence. Then the echo of the tap. Nothing else.',
      partial: 'Prepared piano fragment + data stream sounds. The meter is back. High strings enter on every fourth count.',
      full: 'Prepared piano + precision mechanisms + data stream + high strings in exact counterpoint. The stream flows at its true rate.',
    },
    restorationJingle: 'Every data point aligns — prepared piano plays an exact mathematical sequence, then Yuki turns from the console and nods once. The stream is at maximum clarity.',
    threadwayCrossfade: {
      entering: 'Data stream sounds arrive and the piano entry comes exactly on the downbeat — as if you\'ve arrived on schedule.',
      departing: 'Precision mechanism clicks once in finality. Stream sounds fade. A rest that lasts exactly one bar.',
      signature: 'precise',
    },
  },

  {
    worldId: 'map-room',
    worldName: 'Map Room',
    guideId: 'atlas',
    ambientLayers: ['cartography mechanisms', 'ancient orrery movement', 'stone resonance', 'parchment settling', 'compass needle click'],
    musicalPalette: {
      key: 'Open fifths',
      tempo: 'Very slow',
      leadInstrument: 'Low brass + stone bowls',
      supportInstruments: ['bass choir', 'low strings', 'resonant percussion', 'deep drone layers'],
    },
    fadingResponse: {
      sparse: 'Stone silence. Distant orrery creak only. The maps are blank.',
      partial: 'Stone bowl resonance rises from the floor. Orrery mechanisms find their rhythm. Low brass fragment, deep and slow.',
      full: 'Full ancient sound — low brass, stone bowls, orrery movement, bass choir on the tonic. The maps are alive with light.',
    },
    restorationJingle: 'All maps illuminate simultaneously — stone bowls ring in open fifths as the whole orrery locks to true alignment. Atlas does not speak. The room speaks for him.',
    threadwayCrossfade: {
      entering: 'Stone resonance arrives first — felt before heard. Then brass theme from somewhere deep in the room.',
      departing: 'Orrery slows. Maps rustle like pages. Brass fades to a single held fifth.',
      signature: 'cartographic',
    },
  },

  // ── REALM OF EXPRESSION — 15 Worlds ─────────────────────────────

  {
    worldId: 'story-tree',
    worldName: 'Story Tree',
    guideId: 'grandmother-anaya',
    ambientLayers: ['forest canopy', 'ancient wood creak', 'leaves rustling stories', 'birdsong layers', 'root system resonance'],
    musicalPalette: {
      key: 'D major',
      tempo: 'Free time',
      leadInstrument: 'Native American flute',
      supportInstruments: ['ambient choir', 'light frame drum', 'strings', 'wind through leaves'],
    },
    fadingResponse: {
      sparse: 'Wind through bare branches only. The flute is silent. The tree has nothing left to tell.',
      partial: 'Flute finds the first phrase of the oldest story. Forest sounds return. Birdsong tentative but present.',
      full: 'Full forest alive — flute, choir, rustling leaves, birdsong from high and low canopy. The tree is telling all its stories at once.',
    },
    restorationJingle: 'The story-tree blooms mid-sentence. Leaves burst into full color and the flute plays the oldest melody — the one Grandmother Anaya plays only when no one else is listening.',
    threadwayCrossfade: {
      entering: 'Forest sounds build and the flute enters from mid-canopy, already in the second phrase of a story.',
      departing: 'Flute note trails into birdsong. The tree is still telling, even after you leave.',
      signature: 'ancestral',
    },
  },

  {
    worldId: 'rhyme-docks',
    worldName: 'Rhyme Docks',
    guideId: 'felix-barbosa',
    ambientLayers: ['harbor water', 'rope creak', 'dock footsteps', 'city street rhythm', 'crate movement'],
    musicalPalette: {
      key: 'E♭ major',
      tempo: 'Swung',
      leadInstrument: 'Berimbau + hand drum',
      supportInstruments: ['percussion ensemble', 'bass groove', 'acoustic rhythm guitar', 'handclap circle'],
    },
    fadingResponse: {
      sparse: 'Solitary rope creak in an empty harbor. The berimbau is unstrung.',
      partial: 'Berimbau + harbor ambience + distant city rhythms. Hand drum enters on two and four only.',
      full: 'Full capoeira rhythm + harbor alive + swung ensemble. Every footstep on the dock feeds the groove.',
    },
    restorationJingle: 'A spontaneous jam breaks out on the dock — berimbau and hand drum reach perfect swung time as Felix starts rhyming before he realizes he\'s doing it.',
    threadwayCrossfade: {
      entering: 'Harbor sounds. Berimbau intro on the off-beat — already in the groove, waiting for you.',
      departing: 'Rhythmic fade. Rope creak. One more snare hit from somewhere above the waterline.',
      signature: 'rhythmic',
    },
  },

  {
    worldId: 'letter-forge',
    worldName: 'Letter Forge',
    guideId: 'amara-diallo',
    ambientLayers: ['forge heat sounds', 'metal cooling ticks', 'ink preparation', 'language chatter from far voices', 'hammer rhythm'],
    musicalPalette: {
      key: 'C minor',
      tempo: 'Flowing',
      leadInstrument: 'Balafon + voice',
      supportInstruments: ['kora', 'voice harmony layers', 'soft percussion', 'forge rhythm'],
    },
    fadingResponse: {
      sparse: 'Cold forge silence. A single distant voice attempts a word and stops.',
      partial: 'Balafon finds its scale. Soft forge sounds return. Language fragments from the distance.',
      full: 'Forge at full heat — balafon, voice, language chorus layered in three tongues simultaneously. The metalwork has a rhythm.',
    },
    restorationJingle: 'A letter forms perfectly on the first strike. Balafon and multiple voices harmonize in C minor — the sound of language finding its most beautiful shape.',
    threadwayCrossfade: {
      entering: 'Forge heat arrives, then balafon theme flows in over it — warm, multilingual, unstoppable.',
      departing: 'Voice fades first. Forge cools to ticks. Balafon holds the final note of its phrase.',
      signature: 'linguistic',
    },
  },

  {
    worldId: 'reading-reef',
    worldName: 'Reading Reef',
    guideId: 'oliver-marsh',
    ambientLayers: ['ocean current', 'reef ecology sounds', 'cetacean calls', 'page-turn underwater sounds', 'coral breathing'],
    musicalPalette: {
      key: 'E major',
      tempo: 'Moderate',
      leadInstrument: 'Harp + ocean sounds',
      supportInstruments: ['strings', 'underwater atmosphere', 'gentle percussion', 'whale-call harmonics'],
    },
    fadingResponse: {
      sparse: 'Empty ocean. Reef hollow and silent. Harp strings are all loose.',
      partial: 'Harp fragment + reef ecology returning + distant cetaceans. The pages of books float but do not rustle.',
      full: 'Complete reading-reef ecosystem — harp, ocean sounds, reef ecology flourishing. Oliver is reading aloud somewhere below.',
    },
    restorationJingle: 'The reef lights up — harp plays a full E major chord as every page in the library caverns begins to glow. Oliver marks his page and looks up, smiling.',
    threadwayCrossfade: {
      entering: 'Ocean current arrives and harp intro follows it in — gentle, deep, unhurried.',
      departing: 'Ocean fade. Reef hum settles. Harp trails off mid-arpeggio, as if the story is not finished.',
      signature: 'literary',
    },
  },

  {
    worldId: 'grammar-bridge',
    worldName: 'Grammar Bridge',
    guideId: 'lila-johansson-park',
    ambientLayers: ['bridge structure sounds', 'river current', 'precision mechanism clicks', 'footsteps on stone', 'arch resonance'],
    musicalPalette: {
      key: 'F major',
      tempo: 'Precise',
      leadInstrument: 'Piano (Bach-like)',
      supportInstruments: ['harpsichord', 'strings', 'counterpoint layers', 'bridge acoustic design'],
    },
    fadingResponse: {
      sparse: 'River current only. Bridge empty. Piano silent. The structure holds but nothing moves across it.',
      partial: 'Piano fragment + bridge mechanics + river sounds. The counterpoint has one voice instead of four.',
      full: 'Full contrapuntal texture — piano, harpsichord, strings layerd precisely. The bridge hums with crossing footsteps.',
    },
    restorationJingle: 'The bridge mechanism clicks into perfect alignment. Bach-like piano plays a full four-voice cadence and Lila says: "That is the correct sentence. Everything connects."',
    threadwayCrossfade: {
      entering: 'River current fades in, then piano theme from the far end of the bridge — already in counterpoint, requiring an answer.',
      departing: 'Piano trailing off. Bridge mechanical fade. River remains, flowing correctly.',
      signature: 'structural',
    },
  },

  {
    worldId: 'vocabulary-jungle',
    worldName: 'Vocabulary Jungle',
    guideId: 'kwame-asante',
    ambientLayers: ['dense canopy sounds', 'animal calls and responses', 'tracking movement', 'jungle floor', 'compound-word growl'],
    musicalPalette: {
      key: 'B♭ minor',
      tempo: 'Moderate',
      leadInstrument: 'Djembe + talking drum',
      supportInstruments: ['percussion ensemble', 'flute', 'jungle-rhythm bass', 'animal call layers'],
    },
    fadingResponse: {
      sparse: 'Silent jungle. No calls. Still canopy. The drums are buried under vines.',
      partial: 'Jungle ambience returns. Djembe fragment and distant tracking sounds. A bird calls out a two-syllable word and waits.',
      full: 'Full jungle alive — djembe, talking drum, animal chorus, dense canopy alive with vocabularies being collected.',
    },
    restorationJingle: 'A hunt cry echoes through the entire jungle — drums announce discovery in B♭ minor as every animal named in Kwame\'s notebooks answers with its call.',
    threadwayCrossfade: {
      entering: 'Jungle ambience arrives dense and layered. Djembe theme enters mid-rhythm already tracking.',
      departing: 'Drum signal fading into jungle layers. An animal answers from the deep canopy after you leave.',
      signature: 'tracking',
    },
  },

  {
    worldId: 'punctuation-station',
    worldName: 'Punctuation Station',
    guideId: 'rosie-chen',
    ambientLayers: ['railway sounds', 'steam release', 'whistle calls', 'platform announcement acoustics', 'clock mechanism'],
    musicalPalette: {
      key: 'G major',
      tempo: 'March tempo',
      leadInstrument: 'Train whistle + snare',
      supportInstruments: ['brass', 'march percussion', 'steam rhythm', 'timetable tick'],
    },
    fadingResponse: {
      sparse: 'Empty station. Hollow echo. No trains on schedule. A clock ticks but no one believes it.',
      partial: 'Train whistle + snare + steam ambience. The 2 o\'clock train is only slightly late.',
      full: 'Full march band texture + railway alive + platform bustle. Every train exactly on time.',
    },
    restorationJingle: 'The 2:47 arrives at 2:47 exactly —  a full-platform whistle and snare in perfect march tempo as Rosie checks her watch and nods once.',
    threadwayCrossfade: {
      entering: 'Platform sounds and march intro arrive together, as if you\'ve stepped off a train that was precisely on time.',
      departing: 'Train whistle fading into tunnel. Steam dissipating. Snare drum marking tempo until silence.',
      signature: 'punctual',
    },
  },

  {
    worldId: 'debate-arena',
    worldName: 'Debate Arena',
    guideId: 'theo-papadopoulos',
    ambientLayers: ['crowd murmur', 'footsteps on marble', 'arena acoustic design', 'rhetoric echo', 'distant city'],
    musicalPalette: {
      key: 'D minor',
      tempo: 'Deliberate',
      leadInstrument: 'Bouzouki + bass',
      supportInstruments: ['low strings', 'subtle brass', 'crowd acoustic design', 'marble echo'],
    },
    fadingResponse: {
      sparse: 'Empty arena. Only the echo of footsteps on marble. The bouzouki is untuned.',
      partial: 'Bouzouki fragment + crowd murmur + arena acoustics. One voice puts forward a thesis. Another disagrees.',
      full: 'Full debate atmosphere — bouzouki, bass, crowd sound, marble acoustics, the roar of a good argument well-made.',
    },
    restorationJingle: 'A roar of recognition from the crowd. The argument was sound. Bouzouki plays a D minor fanfare and Theo acknowledges the point against him with a respectful nod.',
    threadwayCrossfade: {
      entering: 'Arena acoustics arrive and bouzouki theme enters from the center podium — already mid-position.',
      departing: 'Crowd fading. Marble echo dissipating. Bouzouki holds the final note of its argument.',
      signature: 'rhetorical',
    },
  },

  {
    worldId: 'diary-lighthouse',
    worldName: 'Diary Lighthouse',
    guideId: 'nadia-volkov',
    ambientLayers: ['ocean wind', 'lighthouse rotation mechanism', 'isolation ambience', 'distant storm', 'paper page turns'],
    musicalPalette: {
      key: 'A minor',
      tempo: 'Free',
      leadInstrument: 'Bandura (Ukrainian)',
      supportInstruments: ['solo violin', 'strings', 'lighthouse beam rhythm', 'ocean breathing'],
    },
    fadingResponse: {
      sparse: 'Isolation silence. Ocean wind only. The bandura is closed. The lighthouse is dark.',
      partial: 'Bandura fragment + lighthouse mechanism + distant ocean. The beam turns but has nothing to say.',
      full: 'Full atmospheric texture — bandura, violin, ocean, lighthouse rhythm. Private and honest and utterly itself.',
    },
    restorationJingle: 'The lighthouse beam illuminates the horizon at maximum swing. Bandura plays in its highest register — a phrase Nadia has never played for anyone else.',
    threadwayCrossfade: {
      entering: 'Ocean wind arrives first, then bandura theme from the top of the lighthouse — private, inviting you up.',
      departing: 'Bandura trails off. Wind continues. Lighthouse beam sweeps once more as you go.',
      signature: 'introspective',
    },
  },

  {
    worldId: 'spelling-mines',
    worldName: 'Spelling Mines',
    guideId: 'benny-okafor-williams',
    ambientLayers: ['mine ambience', 'pickaxe rhythm', 'cart wheels on rails', 'gem discovery chimes', 'mine shaft echo'],
    musicalPalette: {
      key: 'C major',
      tempo: 'Upbeat',
      leadInstrument: 'Xylophone + pickaxe tap',
      supportInstruments: ['tambourine', 'light bass', 'celebratory percussion', 'gem tone layers'],
    },
    fadingResponse: {
      sparse: 'Empty mine. Only echo remains. A single pickaxe tap that answers itself.',
      partial: 'Pickaxe tap + mine echo + xylophone fragment. Benny has found one good vein and is very excited about it.',
      full: 'Mine fully alive — xylophone, pickaxe rhythm, gem chimes, cart movement. Every letter a gem to excavate.',
    },
    restorationJingle: 'A spelling vein strikes all the way through — xylophone plays a C major fanfare with pickaxe percussion counterpoint and Benny shouts a new word down the shaft.',
    threadwayCrossfade: {
      entering: 'Mine echo arrives, then xylophone intro — upbeat, already digging.',
      departing: 'Pickaxe taps fading. Mine echo answers one last time. Cart wheels rolling into the deep.',
      signature: 'excavating',
    },
  },

  {
    worldId: 'translation-garden',
    worldName: 'Translation Garden',
    guideId: 'farah-al-rashid',
    ambientLayers: ['garden water features', 'multilingual chatter from far voices', 'wind through herbs', 'lantern sway sounds', 'garden bell layers'],
    musicalPalette: {
      key: 'Modal (shifting)',
      tempo: 'Moderate',
      leadInstrument: 'Oud + garden bells',
      supportInstruments: ['ney flute', 'voice harmony layers', 'bowed strings', 'garden ambient'],
    },
    fadingResponse: {
      sparse: 'Garden silence. Bells still. The oud is unstrung. Every language has gone quiet.',
      partial: 'Oud fragment + water feature + soft bell chime. Two languages are audible now, talking carefully around each other.',
      full: 'Full garden alive — oud, bells, voice layers in three languages, water, wind through herbs. The translation is complete.',
    },
    restorationJingle: 'All garden bells ring together for the first time. Oud plays a modal resolution with voice harmony in three languages simultaneously — each saying the same true thing.',
    threadwayCrossfade: {
      entering: 'Garden sounds and oud theme — warm, multilingual, unhurried. You have arrived in time for the conversation.',
      departing: 'Bells fading one by one. Garden settling. Oud holds the question, not the answer.',
      signature: 'multilingual',
    },
  },

  {
    worldId: 'nonfiction-fleet',
    worldName: 'Nonfiction Fleet',
    guideId: 'captain-birch',
    ambientLayers: ['ship rigging', 'open ocean', 'crew voices', 'compass mechanism', 'sail wind'],
    musicalPalette: {
      key: 'E♭ major',
      tempo: 'Seafaring 6/8',
      leadInstrument: 'Fiddle + concertina',
      supportInstruments: ['sea shanty chorus', 'percussion', 'low brass', 'ocean ambient'],
    },
    fadingResponse: {
      sparse: 'Ghost ship silence. Only rigging creak. No crews. No wind in the sails.',
      partial: 'Fiddle fragment + ocean sounds + distant crew. The 6/8 meter is back. Ships move slowly but they move.',
      full: 'Full seafaring ensemble — fiddle, concertina, sea shanty chorus, ocean, rigging. The fleet is found and sailing.',
    },
    restorationJingle: 'The fleet catches wind together — a full-throated sea shanty in 6/8 rises from every deck. Captain Birch shouts the bearing. The crew answers.',
    threadwayCrossfade: {
      entering: 'Ocean sounds and fiddle intro arrive together, as if you\'ve appeared on the quarterdeck mid-voyage.',
      departing: 'Fiddle fading over ocean. Rigging creak. A distant sea shanty that keeps going without you.',
      signature: 'seafaring',
    },
  },

  {
    worldId: 'illustration-cove',
    worldName: 'Illustration Cove',
    guideId: 'ines-moreau',
    ambientLayers: ['paper texture sounds', 'charcoal drawing', 'cove water', 'creative silence', 'color-to-tone synthesis'],
    musicalPalette: {
      key: 'Silence → color',
      tempo: 'Free',
      leadInstrument: 'Drawn sounds (paper, charcoal)',
      supportInstruments: ['color-to-tone synthesis', 'soft bells', 'texture design layers', 'cove ambient'],
    },
    fadingResponse: {
      sparse: 'Near-silence. Just paper surface and a distant cove. No colors have sound yet.',
      partial: 'Charcoal sounds + cove water + first color tones emerging from the drawn world.',
      full: 'Full synesthetic texture — drawn sounds, color tones, cove ambient, a creative hum that changes with every new mark.',
    },
    restorationJingle: 'A completed illustration breathes for the first time — charcoal sounds resolve into a burst of color tones that Ines was not expecting but immediately accepts.',
    threadwayCrossfade: {
      entering: 'Paper texture arrives and drawn sound theme begins — quiet, vivid, open.',
      departing: 'Charcoal stroke fading. Cove hum settling. The drawing continues after you leave.',
      signature: 'synesthetic',
    },
  },

  {
    worldId: 'folklore-bazaar',
    worldName: 'Folklore Bazaar',
    guideId: 'hassan-yilmaz',
    ambientLayers: ['bazaar crowd sounds', 'spice-scented ambience', 'distant music from deep stalls', 'lantern sway', 'textile movement'],
    musicalPalette: {
      key: 'D major (Makam Rast)',
      tempo: 'Conversational',
      leadInstrument: 'Ney flute + frame drum',
      supportInstruments: ['oud', 'bazaar chorus', 'hand percussion', 'spatial ambient layers'],
    },
    fadingResponse: {
      sparse: 'Empty bazaar. Wind through empty stalls. The ney is silent. Every story has gone quiet.',
      partial: 'Ney flute fragment + distant crowd + lantern creak. A few voices are telling things in the deep stalls.',
      full: 'Full bazaar alive — ney flute, frame drum, oud, crowd chorus. The spice ambience underpins everything.',
    },
    restorationJingle: 'The bazaar fills completely in one breath. Ney flute plays Makam Rast over a crowd at full voice. Hassan claps once and says: "Now we can begin."',
    threadwayCrossfade: {
      entering: 'Bazaar sounds arrive mid-crowd and ney flute theme enters from somewhere deep in the stalls — conversational, warm.',
      departing: 'Ney fading into crowd noise. Crowd noise fading into wind. A distant story still finishing.',
      signature: 'spice-scented',
    },
  },

  {
    worldId: 'editing-tower',
    worldName: 'Editing Tower',
    guideId: 'wren-calloway',
    ambientLayers: ['typewriter rhythm', 'paper shuffle', 'tower wind through open windows', 'ink sounds', 'revision clock-like ticks'],
    musicalPalette: {
      key: 'C minor / C major',
      tempo: 'Moderate',
      leadInstrument: 'Typewriter + strings',
      supportInstruments: ['piano', 'light strings', 'clock-like percussion', 'drafting ambient'],
    },
    fadingResponse: {
      sparse: 'Empty tower. A single typewriter key depressed and not released. The strings are all out of tune.',
      partial: 'Typewriter + paper + string fragment. The draft exists but the revision has not begun.',
      full: 'Full tower working at pace — typewriter, strings, paper sounds, the rhythm of something becoming what it should be.',
    },
    restorationJingle: 'Final draft strikes the last key — typewriter bell chimes once, strings resolve to C major. Wren pulls the page, reads it once, and folds it into their pocket.',
    threadwayCrossfade: {
      entering: 'Typewriter rhythm from above. Strings intro enters between the keystrokes.',
      departing: 'Typewriter bell. Paper sound. Strings fade to a single sustained note that the wind takes.',
      signature: 'editorial',
    },
  },

  // ── REALM OF EXCHANGE — 12 Worlds ───────────────────────────────

  {
    worldId: 'market-square',
    worldName: 'Market Square',
    guideId: 'tia-carmen-herrera',
    ambientLayers: ['market bustle', 'vendor calls', 'steel drum ambient from street musicians', 'crowd movement', 'stall activity'],
    musicalPalette: {
      key: 'G major',
      tempo: 'Lively',
      leadInstrument: 'Marimba + handclap',
      supportInstruments: ['steel drums', 'handclap circles', 'percussion ensemble', 'vendor rhythm'],
    },
    fadingResponse: {
      sparse: 'Empty market. A single distant vendor call that no one answers.',
      partial: 'Marimba fragment + market ambience + handclap. The first stalls are opening. Tía Carmen is already here.',
      full: 'Full market alive — marimba, steel drums, handclap, crowd, vendor calls layered into something irresistible.',
    },
    restorationJingle: 'Every stall opens at once. Marimba and steel drums play in full unison as Tía Carmen dances one step with the first vendor to arrive.',
    threadwayCrossfade: {
      entering: 'Market bustle arrives and marimba theme enters mid-phrase — the market was already happening.',
      departing: 'Marimba fade. Market hum settling. Steel drum finishes its phrase.',
      signature: 'bustling',
    },
  },

  {
    worldId: 'savings-vault',
    worldName: 'Savings Vault',
    guideId: 'mr-abernathy',
    ambientLayers: ['vault mechanism sounds', 'clock ticking', 'paper counting sounds', 'safe door weight', 'ledger page turns'],
    musicalPalette: {
      key: 'B♭ major',
      tempo: 'Slow',
      leadInstrument: 'Cello + ticking clock',
      supportInstruments: ['strings', 'measured piano', 'vault ambience', 'counting rhythm'],
    },
    fadingResponse: {
      sparse: 'Single clock tick in the empty vault. Nothing being counted. Cello silent.',
      partial: 'Cello fragment + clock + vault mechanisms. The ledger is being filled at a careful pace.',
      full: 'Full vault atmosphere — cello, ticking clock, counting sounds, the patience of compound interest made audible.',
    },
    restorationJingle: 'The target balance is reached — cello plays a resolved B♭ major chord and the grandfather clock chimes the hour as Mr. Abernathy finally allows himself a quiet smile.',
    threadwayCrossfade: {
      entering: 'Clock ticking fades in, then cello theme — measured, trustworthy, patient.',
      departing: 'Clock fade to one tick. Echo in the vault. A single string sounding alone.',
      signature: 'patient',
    },
  },

  {
    worldId: 'budget-kitchen',
    worldName: 'Budget Kitchen',
    guideId: 'priya-nair',
    ambientLayers: ['cooking sounds', 'kitchen percussion', 'spice preparation rhythm', 'shared meal sounds', 'aromatic ambient'],
    musicalPalette: {
      key: 'A major',
      tempo: 'Moderate',
      leadInstrument: 'Tabla + kitchen percussion',
      supportInstruments: ['sitar', 'voice hum', 'ambient kitchen sounds', 'spice-rhythm layers'],
    },
    fadingResponse: {
      sparse: 'Cold kitchen. No sounds. The tabla is still. Nothing is being made.',
      partial: 'Tabla fragment + gentle cooking sounds + sitar. Something is on the stove and the timing is right.',
      full: 'Full kitchen alive — tabla, kitchen percussion, cooking sounds, voice hum. The shared meal is being prepared for everyone.',
    },
    restorationJingle: 'A full meal is ready. Tabla and kitchen percussion in perfect rhythm. Priya lifts the lid and the kitchen fills with everything that was missing.',
    threadwayCrossfade: {
      entering: 'Kitchen sounds arrive and tabla intro follows — moderate, capable, already mid-recipe.',
      departing: 'Kitchen settling. Tabla fade. Sitar holds the last note of the meal.',
      signature: 'nourishing',
    },
  },

  {
    worldId: 'entrepreneur-workshop',
    worldName: 'Entrepreneur Workshop',
    guideId: 'diego-montoya-silva',
    ambientLayers: ['workshop tools', 'spark sounds', 'building activity', 'prototype mechanisms', 'Andean outdoor wind'],
    musicalPalette: {
      key: 'E minor',
      tempo: 'Energetic',
      leadInstrument: 'Charango + workshop sounds',
      supportInstruments: ['Andean flute', 'percussion', 'fast strumming layers', 'tool-rhythm design'],
    },
    fadingResponse: {
      sparse: 'Empty workshop. A single tool sound — maybe the start of something — that goes no further.',
      partial: 'Charango fragment + workshop ambience + tools. The first prototype exists in two pieces.',
      full: 'Workshop at full capacity — charango, tools, building sounds, prototype hum. Diego is three ideas ahead of the current one.',
    },
    restorationJingle: 'The first prototype works on the first test. Charango plays an E minor chord with workshop sounds providing the harmony. Diego says: "Tomorrow we make it better."',
    threadwayCrossfade: {
      entering: 'Workshop sounds arrive mid-build and charango intro jumps in — energetic, already at work.',
      departing: 'Charango trailing off. Tools settling. Workshop hum fading to quiet possibility.',
      signature: 'inventive',
    },
  },

  {
    worldId: 'sharing-meadow',
    worldName: 'Sharing Meadow',
    guideId: 'auntie-bee',
    ambientLayers: ['community gathering sounds', 'meadow wind and birds', 'sharing circle voices', 'laughter layers', 'handmade object sounds'],
    musicalPalette: {
      key: 'F major',
      tempo: 'Relaxed',
      leadInstrument: 'Steel pan + humming',
      supportInstruments: ['light percussion', 'acoustic guitar', 'community hum', 'meadow ambient'],
    },
    fadingResponse: {
      sparse: 'Empty meadow. Single distant hum — Auntie Bee from somewhere in the middle distance.',
      partial: 'Steel pan fragment + meadow ambience + community sounds growing. A circle is forming.',
      full: 'Full community alive — steel pan, humming, acoustic guitar, voices, meadow. The circle is complete and everyone has enough.',
    },
    restorationJingle: 'The sharing circle closes. Steel pan plays in F major with the entire community humming together on the tonic. Auntie Bee says nothing. She does not need to.',
    threadwayCrossfade: {
      entering: 'Meadow sounds and steel pan theme — relaxed, communal, as if someone saved you a seat.',
      departing: 'Steel pan fade. Community hum trailing off. Meadow wind taking it.',
      signature: 'communal',
    },
  },

  {
    worldId: 'investment-greenhouse',
    worldName: 'Investment Greenhouse',
    guideId: 'jin-ho-park',
    ambientLayers: ['greenhouse growth sounds', 'seasonal wind', 'long-term soil activity', 'water system', 'seasonal cycle markers'],
    musicalPalette: {
      key: 'D major',
      tempo: 'Patient',
      leadInstrument: 'Gayageum + wind',
      supportInstruments: ['flute', 'gentle strings', 'seasonal cycle layers', 'growth ambient'],
    },
    fadingResponse: {
      sparse: 'Bare greenhouse. Only wind. Jin-ho checks the soil and says nothing.',
      partial: 'Gayageum fragment + greenhouse sounds + gentle wind. The first season\'s planting has taken hold.',
      full: 'Full seasonal cycle — gayageum, wind, growth sounds, blooming. Every season represented simultaneously.',
    },
    restorationJingle: 'The long-term investment matures — gayageum plays a full D major chord as the greenhouse reaches its peak bloom. Jin-ho tends something unhurriedly.',
    threadwayCrossfade: {
      entering: 'Greenhouse sounds and gayageum theme — patient, growing, already one season ahead.',
      departing: 'Gayageum trailing. Wind. A seed that has been planted will still grow after you leave.',
      signature: 'seasonal',
    },
  },

  {
    worldId: 'needs-wants-bridge',
    worldName: 'Needs Wants Bridge',
    guideId: 'nia-oduya',
    ambientLayers: ['bridge footsteps', 'decision sounds', 'minimal ambient', 'crossing sequences', 'balance mechanism'],
    musicalPalette: {
      key: 'A♭ major',
      tempo: 'Steady',
      leadInstrument: 'Thumb piano + footsteps',
      supportInstruments: ['minimal bass', 'light percussion', 'balance sound design', 'crossing rhythm'],
    },
    fadingResponse: {
      sparse: 'Empty bridge. A single footstep that goes no further. Thumb piano silent.',
      partial: 'Thumb piano fragment + bridge sounds + deliberate footsteps. The needs side has been established.',
      full: 'Full bridge active — thumb piano, footsteps, decision sounds, the quiet music of knowing what you need versus what you want.',
    },
    restorationJingle: 'The bridge balance is achieved. Thumb piano plays a simple A♭ major resolution and Nia marks something in her book that she does not show you.',
    threadwayCrossfade: {
      entering: 'Footstep rhythm fades in and thumb piano theme follows — steady, deliberate, minimal.',
      departing: 'Thumb piano fade. Footsteps receding across the bridge. Balance mechanism clicking to rest.',
      signature: 'balanced',
    },
  },

  {
    worldId: 'barter-docks',
    worldName: 'Barter Docks',
    guideId: 'tomas-reyes',
    ambientLayers: ['dock water sounds', 'sea trading ambience', 'conch shell signals', 'ancient weighing scales', 'cargo movement'],
    musicalPalette: {
      key: 'G minor',
      tempo: 'Historical',
      leadInstrument: 'Cajón + conch shell',
      supportInstruments: ['guitar', 'flamenco percussion', 'dock ambience', 'trade rhythm layers'],
    },
    fadingResponse: {
      sparse: 'Empty docks. Wind through empty stalls. The conch is silent.',
      partial: 'Cajón fragment + dock ambience + conch. Ancient trade routes are remembering themselves.',
      full: 'Full dock market — cajón, conch, trading voices, dock activity. The trade is as old as travel.',
    },
    restorationJingle: 'A fair trade is struck — conch shell sounds the agreement, cajón plays in G minor and the dock erupts in the sound of something honestly exchanged.',
    threadwayCrossfade: {
      entering: 'Dock sounds and cajón theme — ancient, trading, as if this dock has been open since before you were born.',
      departing: 'Conch fade. Dock settling. Cajón marks three final beats.',
      signature: 'ancient',
    },
  },

  {
    worldId: 'debt-glacier',
    worldName: 'Debt Glacier',
    guideId: 'elsa-lindgren',
    ambientLayers: ['glacier creak and settlement', 'ice cracking', 'cold wind', 'melt-water trickle', 'slow pressure sounds'],
    musicalPalette: {
      key: 'E minor',
      tempo: 'Glacial',
      leadInstrument: 'Nyckelharpa + ice sounds',
      supportInstruments: ['strings', 'breath sounds', 'ice percussion', 'long-tone layers'],
    },
    fadingResponse: {
      sparse: 'Deep glacier silence. Only a distant creak. The nyckelharpa is frozen solid.',
      partial: 'Nyckelharpa fragment + glacier sounds + ice crackle. The debt is moving, slowly.',
      full: 'Full glacier ecology — nyckelharpa, ice sounds, wind, melt water beginning to flow. Elsa explains the mathematics of slow movement.',
    },
    restorationJingle: 'The debt glacier thaws — nyckelharpa plays a release chord as melt water finally flows free. Elsa watches the numbers with satisfaction.',
    threadwayCrossfade: {
      entering: 'Glacier sounds arrive cold and immense. Nyckelharpa theme enters glacially — one note per measure.',
      departing: 'Nyckelharpa fading into ice wind. A crack from somewhere deep. The glacier is still moving.',
      signature: 'resolving',
    },
  },

  {
    worldId: 'job-fair',
    worldName: 'Job Fair',
    guideId: 'babatunde-afolabi',
    ambientLayers: ['fair crowd sounds', 'vendor presentations', 'walking rhythm', 'opportunity sounds', 'directional voices'],
    musicalPalette: {
      key: 'B♭ major',
      tempo: 'Walking pace',
      leadInstrument: 'Shekere + bass',
      supportInstruments: ['brass ensemble', 'ensemble percussion', 'crowd ambient', 'walking rhythm'],
    },
    fadingResponse: {
      sparse: 'Empty fairground. A single shekere rattle that answers nothing.',
      partial: 'Shekere + crowd beginning + bass walking. The first stalls are staffed. Someone is putting up a sign.',
      full: 'Full fair alive — shekere, bass, brass ensemble, crowd activity. Every path leads somewhere.',
    },
    restorationJingle: 'Every path is found. Shekere and bass play an uplifting B♭ major fanfare and Babatunde greets a crowd of new arrivals like they are people he has been waiting for.',
    threadwayCrossfade: {
      entering: 'Fair crowd and shekere intro — walking pace, optimistic, every road open.',
      departing: 'Shekere fading. Crowd receding. Bass walking into the distance.',
      signature: 'opportunistic',
    },
  },

  {
    worldId: 'charity-harbor',
    worldName: 'Charity Harbor',
    guideId: 'mei-lin-wu',
    ambientLayers: ['harbor water', 'giving sounds', 'community voices', 'water flow', 'harbor wind'],
    musicalPalette: {
      key: 'D major',
      tempo: 'Resolved',
      leadInstrument: 'Guzheng + water',
      supportInstruments: ['strings', 'gentle voice layers', 'water sound design', 'harbor ambient'],
    },
    fadingResponse: {
      sparse: 'Empty harbor. Only water lapping. The guzheng is unstrung.',
      partial: 'Guzheng fragment + harbor sounds + gentle voices. The harbor is warm but still learning to give.',
      full: 'Full harbor alive — guzheng, water, voices, community activity. Giving is running in both directions.',
    },
    restorationJingle: 'Charity flows in all directions at once. Guzheng plays a D major resolution as the harbor fills with giving and Mei-Lin helps someone without being asked.',
    threadwayCrossfade: {
      entering: 'Water sounds arrive and guzheng theme follows — generous, flowing, resolved.',
      departing: 'Guzheng trailing off. Harbor settle. Water continuing its movement.',
      signature: 'generous',
    },
  },

  {
    worldId: 'tax-office',
    worldName: 'Tax Office',
    guideId: 'sam-worthington',
    ambientLayers: ['office sounds', 'paper filing', 'rubber stamps', 'surprising comedic accents', 'bureaucracy rhythm'],
    musicalPalette: {
      key: 'C major',
      tempo: 'Bouncy',
      leadInstrument: 'Didgeridoo + comedy percussion',
      supportInstruments: ['brass comedy', 'whistles', 'bureaucracy sound design', 'surprise stings'],
    },
    fadingResponse: {
      sparse: 'Empty office. Single rubber stamp impression. Nobody\'s taxes are filed. The didgeridoo is out of breath.',
      partial: 'Didgeridoo fragment + office sounds + comedy percussion. Sam explains a tax in a way nobody expected.',
      full: 'Fully functioning office — didgeridoo, comedy percussion, filing rhythm, surprising sounds everywhere you look.',
    },
    restorationJingle: 'All taxes complete and the process was somehow enjoyable. Didgeridoo and comedy percussion in triumphant C major. Sam presents the final receipt with a bow.',
    threadwayCrossfade: {
      entering: 'Office sounds arrive and didgeridoo intro follows — bouncy, already surprising.',
      departing: 'Comedy percussion fade. Stamp imprint. A final rubber stamp sound that nobody expected.',
      signature: 'surprising',
    },
  },

  // ── CROSSROADS REALM — 8 Worlds ──────────────────────────────────

  {
    worldId: 'great-archive',
    worldName: 'Great Archive',
    guideId: 'the-librarian',
    ambientLayers: ['page turns from infinite shelves', 'murmured knowledge', 'infinite shelf hum', 'breath of someone reading', 'document settling'],
    musicalPalette: {
      key: 'Chromatic',
      tempo: 'Timeless',
      leadInstrument: 'Library sounds + breath',
      supportInstruments: ['strings (infinite)', 'ambient choir', 'document rustle', 'deep archive resonance'],
    },
    fadingResponse: {
      sparse: 'Two books closing. Near silence. The archive is still there, but it has stopped being heard.',
      partial: 'Library sounds + breath + chromatic string fragment. The knowledge is returning from wherever it went.',
      full: 'Full archive alive — library sounds, breath, strings, the infinite hum of everything stored. The Librarian is listening.',
    },
    restorationJingle: 'The catalog completes. A single breath and a page turn that somehow contains the impression of all music — brief, timeless, sufficient.',
    threadwayCrossfade: {
      entering: 'Library ambience fades in slowly. Breath theme arrives — as if the archive has been breathing all along, waiting.',
      departing: 'Page turn. Library settling to a hum. Breath fading slowly as the number-garden marimba begins replacing it.',
      signature: 'infinite',
    },
  },

  {
    worldId: 'workshop-crossroads',
    worldName: 'Workshop Crossroads',
    guideId: 'kenzo-nakamura-osei',
    ambientLayers: ['crossroads foot traffic', 'design activity sounds', 'creation ambient', 'discovery sounds', 'material texture sounds'],
    musicalPalette: {
      key: 'E♭ major',
      tempo: 'Creative',
      leadInstrument: 'Koto + hammer sounds',
      supportInstruments: ['strings', 'marimba', 'creative percussion', 'design ambient layers'],
    },
    fadingResponse: {
      sparse: 'Empty crossroads. Distant hammer. The koto is uncovered but not played.',
      partial: 'Koto fragment + hammer sounds + crossroads ambience. The designs are beginning.',
      full: 'Full workshop active — koto, hammer, creation sounds, design activity from every direction.',
    },
    restorationJingle: 'A design is realized and it is better than expected. Koto plays an E♭ major chord with hammer sounds punctuating each note. Kenzo holds the finished object up to the light.',
    threadwayCrossfade: {
      entering: 'Crossroads sounds and koto theme — creative, open, every path a possibility.',
      departing: 'Koto trailing. Hammer echo from somewhere still working. The crossroads remains active.',
      signature: 'generative',
    },
  },

  {
    worldId: 'discovery-trail',
    worldName: 'Discovery Trail',
    guideId: 'solana-bright',
    ambientLayers: ['trail sounds underfoot', 'birdsong from all elevations', 'discovery sounds', 'terrain movement', 'summit wind'],
    musicalPalette: {
      key: 'D major',
      tempo: 'Hiking pace',
      leadInstrument: 'Berimbau + birdsong',
      supportInstruments: ['flute', 'footstep percussion', 'nature sound layers', 'elevation ambient'],
    },
    fadingResponse: {
      sparse: 'Empty trail. A single bird that doesn\'t finish its call. The berimbau is silent.',
      partial: 'Berimbau fragment + trail sounds + birdsong returning. Solana is ahead of you, already noting something.',
      full: 'Full trail alive — berimbau, birdsong from every elevation, trail sounds, discovery echoes at every turn.',
    },
    restorationJingle: 'The summit discovery. Berimbau plays in D major with every bird on the trail singing. Solana marks it on her map with great care.',
    threadwayCrossfade: {
      entering: 'Trail sounds arrive and berimbau theme enters — hiking pace, curious, already mid-discovery.',
      departing: 'Berimbau trailing. Birdsong fading elevation by elevation. The trail continues without you.',
      signature: 'curious',
    },
  },

  {
    worldId: 'thinking-grove',
    worldName: 'Thinking Grove',
    guideId: 'old-rowan',
    ambientLayers: ['ancient wood creak and settlement', 'slow forest sounds', 'deep earth resonance', 'geological time signatures', 'root system breath'],
    musicalPalette: {
      key: 'Root note only',
      tempo: 'Geological',
      leadInstrument: 'Low drone + creaking wood',
      supportInstruments: ['bass choir (rare, very slow)', 'stone resonance', 'deep breathing', 'planetary layers'],
    },
    fadingResponse: {
      sparse: 'Deep earth silence. One creak that might be a thought beginning.',
      partial: 'Low drone + wood creak + geological sounds. Old Rowan is consulting something that takes years to answer.',
      full: 'Full grove resonance — low drone, creaking wood, deep earth sounds, rare bass choir on very slow half-notes. Thinking at geological pace.',
    },
    restorationJingle: 'Deep understanding achieved. A single sustained root note vibrates everything in the grove — wood, stone, and air — from the lowest register upward.',
    threadwayCrossfade: {
      entering: 'Silence building until it becomes a drone. Then wood creak — as if something ancient is acknowledging your arrival.',
      departing: 'Drone fading very slowly. Taking most of a minute. Geological patience in a transition.',
      signature: 'geological',
    },
  },

  {
    worldId: 'wellness-garden',
    worldName: 'Wellness Garden',
    guideId: 'hana-bergstrom',
    ambientLayers: ['healing garden sounds', 'breath rhythm', 'flowers opening', 'wind through leaves and grass', 'gentle water'],
    musicalPalette: {
      key: 'F major',
      tempo: 'Breathing pace',
      leadInstrument: 'Nyckelharpa + garden sounds',
      supportInstruments: ['flute', 'gentle strings', 'wellness ambient layers', 'breath rhythm design'],
    },
    fadingResponse: {
      sparse: 'Bare garden. Only wind. The nyckelharpa is somewhere but not playing.',
      partial: 'Nyckelharpa fragment + garden sounds + breath rhythm establishing. Something is growing.',
      full: 'Full wellness garden — nyckelharpa, breath rhythm, flowers, wind, gentle water. The pace of everything exactly what is needed.',
    },
    restorationJingle: 'Full wellness achieved. Nyckelharpa plays a resolving F major chord in exact time with breathing — in, held, released — as every flower in the garden opens.',
    threadwayCrossfade: {
      entering: 'Garden sounds arrive and nyckelharpa theme enters in breathing pace — tender, strong, exactly right.',
      departing: 'Nyckelharpa trailing. Garden settling. Breath rhythm continuing after the music stops.',
      signature: 'healing',
    },
  },

  {
    worldId: 'time-gallery',
    worldName: 'Time Gallery',
    guideId: 'rami-al-farsi',
    ambientLayers: ['gallery acoustic design', 'footsteps on stone', 'temporal artifact sounds', 'layered clock mechanisms', 'historical echo'],
    musicalPalette: {
      key: 'Modal',
      tempo: 'Walking',
      leadInstrument: 'Oud + footsteps on stone',
      supportInstruments: ['ney flute', 'time-layered strings', 'gallery echo design', 'historical ambient'],
    },
    fadingResponse: {
      sparse: 'Empty gallery. Only footsteps on stone. The oud is covered in dust.',
      partial: 'Oud fragment + stone footsteps + gallery echo. Two time periods are audible simultaneously.',
      full: 'Full gallery alive — oud, footsteps on stone, temporal layers, history sounds from many centuries.',
    },
    restorationJingle: 'All time periods become visible simultaneously. Oud plays in modal resolution with stone bell chime and Rami says: "This is where everything is happening at once."',
    threadwayCrossfade: {
      entering: 'Stone footsteps arrive and oud theme enters from somewhere in the gallery — walking, layered, historical.',
      departing: 'Oud trailing. Footsteps on stone fading by era, the most recent last.',
      signature: 'temporal',
    },
  },

  {
    worldId: 'music-meadow',
    worldName: 'Music Meadow',
    guideId: 'luna-esperanza',
    ambientLayers: ['full music ecology', 'instrument sounds from every other world', 'meadow ambient', 'harmony from the air', 'resonance between worlds'],
    musicalPalette: {
      key: 'All keys',
      tempo: 'Playful',
      leadInstrument: 'Rondalla + everything',
      supportInstruments: ['every instrument ever heard in every world', 'meadow ambient', 'harmonic resonance'],
    },
    fadingResponse: {
      sparse: 'A single note. Any instrument. Any key. The meadow holds it without judgment.',
      partial: 'Rondalla fragment + instruments from recently-visited worlds bleeding through. Luna is teaching someone how to listen.',
      full: 'Full musical meadow — rondalla plus any instrument ever heard, all keys in harmony, all rhythms resolved into one living thing.',
    },
    restorationJingle: 'Every instrument from every world plays simultaneously in perfect, impossible harmony. Luna conducts with both hands and laughs.',
    threadwayCrossfade: {
      entering: 'Marimba crossfade from number-garden fades into the full meadow sound — math becoming music.',
      departing: 'All music trailing into a single held note, then silence, then the arrival of wherever you go next.',
      signature: 'universal',
    },
  },

  {
    worldId: 'everywhere',
    worldName: 'Everywhere',
    guideId: 'compass',
    ambientLayers: ['soft bells from every world visited', 'reassurance sounds', 'gentle ambient from recently visited worlds', 'the child\'s own sound signature'],
    musicalPalette: {
      key: "The child's favorite key",
      tempo: 'Gentle',
      leadInstrument: 'Bells + whatever the child needs',
      supportInstruments: ['adaptive — mirrors what the child needs to feel safe', 'recent world echoes', 'personal ambient'],
    },
    fadingResponse: {
      sparse: 'Gentle bell. Near silence. Compass rings once. You know where you are.',
      partial: 'Bells + soft sounds from recently visited worlds. You are remembered. Compass is with you.',
      full: 'Gentle full expression in the child\'s favorite key. Everything in the game was pointing here.',
    },
    restorationJingle: 'Compass finds true north. Bells resolve in the child\'s favorite key — a sound unique to this child, this session, this moment of knowing where you belong.',
    threadwayCrossfade: {
      entering: 'Bells arriving wherever you go — before the next world\'s sounds, orienting you.',
      departing: 'Bells fading as the next world\'s identity takes hold. Compass always rings once more before silence.',
      signature: 'orienting',
    },
  },

] as const;

// ── Implementation ───────────────────────────────────────────────

function realmOf(worldId: string): 'discovery' | 'expression' | 'exchange' | 'crossroads' {
  if (DISCOVERY_IDS.has(worldId)) return 'discovery';
  if (EXPRESSION_IDS.has(worldId)) return 'expression';
  if (EXCHANGE_IDS.has(worldId)) return 'exchange';
  return 'crossroads';
}

function getProfile(worldId: string): WorldSoundscapeProfile | undefined {
  return SOUNDSCAPE_PROFILES_DATA.find(p => p.worldId === worldId);
}

function all(): ReadonlyArray<WorldSoundscapeProfile> {
  return SOUNDSCAPE_PROFILES_DATA;
}

function getProfilesForRealm(
  realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
): ReadonlyArray<WorldSoundscapeProfile> {
  return SOUNDSCAPE_PROFILES_DATA.filter(p => realmOf(p.worldId) === realm);
}

// ── Factory ──────────────────────────────────────────────────────

export function createWorldSoundscapeProfiles(): WorldSoundscapeProfilesPort {
  return {
    totalProfiles: SOUNDSCAPE_PROFILES_DATA.length,
    getProfile,
    all,
    getProfilesForRealm,
  };
}

// ── Direct Data Export ───────────────────────────────────────────

export { SOUNDSCAPE_PROFILES_DATA as WORLD_SOUNDSCAPE_PROFILES };
