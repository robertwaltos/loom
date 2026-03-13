/**
 * World Fading Profiles
 *
 * Per-world luminance state descriptions and restoration moments for all 50
 * Koydo Worlds. The Fading is the central narrative mechanic: worlds decay
 * toward monochrome silence when forgotten, and bloom back to full life when
 * children learn and remember.
 *
 * Each profile defines three luminance stages and the singular restoration
 * moment that fires when a world reaches full radiance (luminance 1.0).
 *
 * Source: Koydo Worlds Production Bible v4 + Expansion Bible v5.
 */

// ─── Types ─────────────────────────────────────────────────────────

export type WorldId = string;

export interface LuminanceStateDescription {
  /** What the world looks like at this luminance stage */
  readonly visual: string;
  /** Soundscape at this stage */
  readonly audio: string;
  /** Guide's emotional and behavioral state */
  readonly guideState: string;
  /** Ambient creature and effect state */
  readonly ambientLife: string;
}

export interface RestorationMoment {
  /** The specific event that plays when luminance hits 1.0 */
  readonly event: string;
  /** What the guide does or says in this moment */
  readonly guideReaction: string;
  /** The core thematic truth this moment embodies */
  readonly thematicCore: string;
}

export interface WorldFadingProfile {
  readonly worldId: WorldId;
  readonly worldName: string;
  readonly guideId: string;
  /** Luminance ~0–0.24 */
  readonly low: LuminanceStateDescription;
  /** Luminance ~0.25–0.74 */
  readonly mid: LuminanceStateDescription;
  /** Luminance ~0.75–1.0 */
  readonly high: LuminanceStateDescription;
  readonly restorationMoment: RestorationMoment;
}

export interface WorldFadingProfilesPort {
  readonly totalProfiles: number;
  getProfile(worldId: WorldId): WorldFadingProfile | undefined;
  all(): ReadonlyArray<WorldFadingProfile>;
  getProfilesForRealm(realm: 'discovery' | 'expression' | 'exchange' | 'crossroads'): ReadonlyArray<WorldFadingProfile>;
}

// ─── Realm Tags (for grouping only — not stored in profile) ────────

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

// ─── All 50 Fading Profiles ────────────────────────────────────────

const FADING_PROFILES_DATA: ReadonlyArray<WorldFadingProfile> = [

  // ── REALM OF DISCOVERY — 15 Worlds ──────────────────────────────

  {
    worldId: 'cloud-kingdom',
    worldName: 'Cloud Kingdom',
    guideId: 'professor-nimbus',
    low: {
      visual: 'Clouds are gray and flat. No rain. Instruments frozen. Rainbow bridges invisible.',
      audio: 'A single mournful wooden flute note, wind that goes nowhere.',
      guideState: 'Nimbus cannot remember what sunshine looks like. He stares at frozen barometers in silence.',
      ambientLife: 'Cloud foxes dissolved into fog. Wind sprites absent. Prism beetles dull and still.',
    },
    mid: {
      visual: 'Partial color returns. Scattered sunbreaks. Some rain on one island while another stays gray.',
      audio: 'Flute rejoined by a lone wind chime. Thunder heard but distant.',
      guideState: 'Nimbus remembers most weather patterns but confuses typhoons with hurricanes. He apologizes.',
      ambientLife: 'One cloud fox visible at dawn. Prism beetles produce faint single-color glints.',
    },
    high: {
      visual: 'Towering cumulus, golden light, gentle rain coexisting with sunshine. A permanent rainbow arcs across the meadow.',
      audio: 'Full ensemble: flute, strings, chimes, and a gentle sustained choir.',
      guideState: 'Nimbus beams. He recites the Beaufort scale from memory, laughing at the easy numbers.',
      ambientLife: 'Cloud foxes everywhere. Wind sprites visible in every gust. Prism beetles create cascading rainbow effects.',
    },
    restorationMoment: {
      event: 'A massive but gentle thunderstorm rolls through — not frightening, breathtaking. Lightning illuminates every island in warm gold. Then clouds part to reveal the most vivid sunset the child has ever seen in-game.',
      guideReaction: 'Nimbus weeps quietly with joy. He whispers: "I had forgotten this. Thank you for bringing it back."',
      thematicCore: 'Weather is not chaos — it is a system, and a system understood cannot be feared.',
    },
  },

  {
    worldId: 'savanna-workshop',
    worldName: 'Savanna Workshop',
    guideId: 'zara-ngozi',
    low: {
      visual: 'Tools rusted. Workshop roof sagging. Corkboard empty. All ramps broken. Wind Tunnel silent.',
      audio: 'Only the creak of a rusted hinge. Very occasional distant bird.',
      guideState: 'Zara sits at an empty workbench. Her prosthetic hand rests, unplugged. She has forgotten the name of the lever.',
      ambientLife: 'Weaver birds gone. Dung beetles absent. Termite mounds crumbling.',
    },
    mid: {
      visual: 'Some tools work. One bridge stands on the Bridge Yard. Golden grass returned to slopes.',
      audio: 'Savanna ambience returns — wind through grass, distant birds.',
      guideState: 'Zara can build but her designs fail on the first try. She mutters "not quite" and tries again.',
      ambientLife: 'Dung beetles return. A pair of weaver birds inspect the rafters skeptically.',
    },
    high: {
      visual: 'Workshop buzzes with energy. All bridges stand. Wind Tunnel hums. New designs appear on the corkboard every visit.',
      audio: 'Rhythmic workshop sounds — hammering, machinery, wind — layer into something almost musical.',
      guideState: 'Zara builds something new every visit. She explains everything with her hands, both biological and prosthetic.',
      ambientLife: 'Weaver birds decorating the rafters. Dung beetles rolling perfect geometric spheres. Termite mounds towering.',
    },
    restorationMoment: {
      event: 'Zara\'s ultimate windmill — built piece by piece across the child\'s visits — catches the wind for the first time. Lights flicker on across the entire savanna.',
      guideReaction: 'She pumps her prosthetic fist in the air and laughs — a full, unguarded laugh — then immediately starts drafting her next design.',
      thematicCore: 'Every tool is a lever. Every invention is a solved problem. Nothing is waste if you\'re paying attention.',
    },
  },

  {
    worldId: 'tideline-bay',
    worldName: 'Tideline Bay',
    guideId: 'suki-tanaka-reyes',
    low: {
      visual: 'Coral bleached white. Water murky green-brown. Research vessel grounded on beach. Tide pools empty.',
      audio: 'Hollow silence. No waves, no gulls. Just a low windless hum.',
      guideState: 'Suki\'s sketchbook is empty. She sits by the grounded boat, not drawing. Hachi hides in a crevice and will not come out.',
      ambientLife: 'Fish gone. Dolphins absent. Bioluminescence at zero. The whale boundary is silent.',
    },
    mid: {
      visual: 'Some coral color returns — pinks and yellows among the white. Water clears to ankle-depth visibility. Suki\'s boat is afloat.',
      audio: 'Gentle wave rhythm returns. Occasional distant gull.',
      guideState: 'Suki can sketch again but her drawings are faded, half-finished. She says "it used to be more colorful, I think."',
      ambientLife: 'Schools of small fish reappear. Hachi emerges to take food but retreats immediately. Jellyfish drift at depth.',
    },
    high: {
      visual: 'Coral explosion — impossible colors at every depth. Water crystalline to the ocean floor. Hachi visible from the surface.',
      audio: 'Whale song audible from beyond the map boundary. Full oceanic sound design — layered, alive.',
      guideState: 'Suki\'s sketchbook is overflowing. She shows the child a new species she documented today.',
      ambientLife: 'Mantis shrimp showing full spectral display. Bioluminescence at every depth level. Whale breaches visible on horizon.',
    },
    restorationMoment: {
      event: 'A whale breaches the surface just as luminance hits full. The splash creates a rainbow arc. Underwater, a mass coral spawning event — millions of tiny pink packets floating upward like inverse snow.',
      guideReaction: 'Suki weeps. She says it reminds her of the typhoon but they are happy tears this time. Hachi wraps one arm around her ankle.',
      thematicCore: 'The ocean remembers everything. What seems lost is often only waiting for the right conditions to return.',
    },
  },

  {
    worldId: 'meadow-lab',
    worldName: 'The Meadow Lab',
    guideId: 'baxter',
    low: {
      visual: 'Flowers gone. Grass yellowed and still. Microscope lenses clouded. Beehives silent, sealed.',
      audio: 'No insects. No rustle. Just dry wind across dead grass.',
      guideState: 'Baxter\'s magnifying glass shows nothing interesting. He keeps looking anyway, confused. He has forgotten the word for "pollen."',
      ambientLife: 'No bees. No butterflies. UV lanterns are dark. Even the soil microbes seem absent.',
    },
    mid: {
      visual: 'Patches of colour — clover and dandelion reclaiming the lab edges. One beehive humming faintly.',
      audio: 'Occasional bee buzz. Wind chime from the lab tree. Morning birdsong beginning.',
      guideState: 'Baxter identifies most plants but forgets two or three. He marks them with question marks and promises to look them up.',
      ambientLife: 'One healthy beehive. Butterflies returning. UV lanterns show flowers beginning to glow.',
    },
    high: {
      visual: 'Lush beyond what seems reasonable. Every corner of the lab has something blooming. Gold pollen haze in afternoon light.',
      audio: 'Full insect symphony — bees, crickets, grasshoppers. Wind through tall grass. Water in the stream.',
      guideState: 'Baxter is overjoyed and slightly overwhelmed. He has seventeen things to show the child at once.',
      ambientLife: 'Bees working every hive. UV lanterns show flowers as bees see them — wild alien patterns. Millipedes, earthworms, ladybirds everywhere.',
    },
    restorationMoment: {
      event: 'A bee lands on Baxter\'s hand. He goes very still. A second bee lands. Then a third. He whispers "they trust me again" as the whole meadow buzzes alive around him.',
      guideReaction: 'He turns to the child with absolute sincerity: "This is the most important thing I know. Everything is connected."',
      thematicCore: 'Ecology is not a subject — it is a relationship. The meadow does not belong to Baxter. Baxter belongs to the meadow.',
    },
  },

  {
    worldId: 'starfall-observatory',
    worldName: 'Starfall Observatory',
    guideId: 'riku-osei',
    low: {
      visual: 'Telescope pointed at a blank gray sky. Tactile star maps smudged, unreadable. Dome sealed.',
      audio: 'No sound at all. Riku says silence here used to mean something. Now it just means silence.',
      guideState: 'Riku runs his hands over blank star maps, finding nothing. He stays calm but oriented by touch alone, which is harder now.',
      ambientLife: 'No meteors. No northern light effects. The observatory cat refuses to come in.',
    },
    mid: {
      visual: 'The dome opens partially. Three constellations visible — predictable, old, safe ones. One meteor per night.',
      audio: 'Faint celestial ambience — low resonant tones, like a singing bowl in vacuum.',
      guideState: 'Riku can navigate by stars again, mostly. He describes the shapes with his hands and smiles when he finds Orion.',
      ambientLife: 'Monthly meteor shower returns at quarter-strength. Stars pulse faintly with sound frequency.',
    },
    high: {
      visual: 'Perpetual clear midnight. Milky Way at maximum visibility. Planets visible to naked eye. Aurora on horizon.',
      audio: 'Deep, resonant music of the spheres — tones corresponding to orbital frequencies.',
      guideState: 'Riku navigates the observatory by memory and touch, describing everything with total precision. He is at home.',
      ambientLife: 'Full meteor showers. Bioluminescent observatory moss glowing. The cat sits on the telescope.',
    },
    restorationMoment: {
      event: 'The great dome fully opens for the first time. The Milky Way spreads above. Riku traces it with his fingers against the sky — a gesture he has done a thousand times, now meaningful again.',
      guideReaction: 'He names every constellation aloud, holding nothing back, his voice steady and full.',
      thematicCore: 'Knowledge does not require sight. The universe is legible to those who learn its language — in whatever form that takes.',
    },
  },

  {
    worldId: 'number-garden',
    worldName: 'The Number Garden',
    guideId: 'dottie-chakravarti',
    low: {
      visual: 'Flowers dead. Spirals broken. The maze is just empty hedges with no clear pattern.',
      audio: 'Wind only. The mathematical chimes are still.',
      guideState: 'Dottie cannot count petals — they keep changing. She stands at the center of the maze, disoriented.',
      ambientLife: 'Snails with misshapen shells. Ants in random paths. Spiderwebs torn.',
    },
    mid: {
      visual: 'Fibonacci spirals re-emerging in flower beds. Fractal ferns beginning. The maze has one correct path.',
      audio: 'Garden chimes return at half-frequency. Mathematical ratios audible but not quite right.',
      guideState: 'Dottie recites equations under her breath, rebuilding confidence. She checks her work compulsively.',
      ambientLife: 'Snail shells returning to logarithmic spirals. Ants marching in formation again, mostly.',
    },
    high: {
      visual: 'Mathematical paradise. Every angle perfect. Sunlight casts golden ratio shadows. The entire garden is clearly a Fibonacci spiral when viewed from above.',
      audio: 'Full harmonic cascade — garden chimes aligned to mathematical intervals. Perfect.',
      guideState: 'Dottie hums equations like songs. She corrects the child gently, lovingly, precisely.',
      ambientLife: 'Perfect logarithmic spiral snail shells. Ants counting in perfect columns. Spiderwebs geometrically exact.',
    },
    restorationMoment: {
      event: 'The entire garden briefly shifts to a bird\'s-eye view, revealing to the child that they have been walking inside a Fibonacci spiral the whole time.',
      guideReaction: 'Dottie gasps as though she is seeing it for the first time herself. "Of course," she whispers. "It was always the pattern."',
      thematicCore: 'Mathematics is not imposed on the world. It is discovered within it. The garden was always this way.',
    },
  },

  {
    worldId: 'calculation-caves',
    worldName: 'The Calculation Caves',
    guideId: 'cal',
    low: {
      visual: 'All crystals opaque and dark. The cave is cold, grey, featureless.',
      audio: 'Dripping water, nothing more. All mathematical resonance gone.',
      guideState: 'Cal cannot change colors. They pulse with a dull dark grey. They sit near the entrance, unable to go deeper.',
      ambientLife: 'Crystal moths are dark and still. Echo bats clustered, silent. Cave fish unresponsive.',
    },
    mid: {
      visual: 'Blue and amber crystals glowing faintly. The Addition Grotto and Subtraction Shaft functional. Deeper chambers still dark.',
      audio: 'Faint harmonic tones from blue crystals — simple, single notes.',
      guideState: 'Cal can handle addition and subtraction reliably. Multiplication makes them flicker uncertainly.',
      ambientLife: 'Crystal moths flying again at low frequency. Echo bats producing single echoes.',
    },
    high: {
      visual: 'Every crystal singing in its operation color. The Bone Crypt illuminated for the first time. The caves are warm and humming.',
      audio: 'Full mathematical symphony — every operation has its harmonic chord, layered into complex music.',
      guideState: 'Cal is radiant. They shift color smoothly between all operations, narrating the math as they move.',
      ambientLife: 'Crystal moths flying in mathematical formations. Echo bats multiplying their calls. Cave fish tracing perfect spiral paths.',
    },
    restorationMoment: {
      event: 'The deepest chamber — the Bone Crypt — illuminates for the first time. The Ishango Bone is revealed, glowing gold. Twenty thousand years of counting, fully present.',
      guideReaction: 'Cal changes to a color they have never been before — a deep warm amber-violet, new and unclassified. They name it "ancient."',
      thematicCore: 'Every calculation ever made is connected to this bone. The caves remember what humans first understood about number.',
    },
  },

  {
    worldId: 'magnet-hills',
    worldName: 'The Magnet Hills',
    guideId: 'lena-sundstrom',
    low: {
      visual: 'Force field lines gone. Hills are grey rolling plains. The Gravity Bowl empty and cold.',
      audio: 'Nothing. Magnetic silence is a specific wrongness.',
      guideState: 'Lena\'s throwing circles are overgrown. She stands in them anyway, empty-handed, running the physics in her head alone.',
      ambientLife: 'Compass deer disoriented, wandering in circles. Lodestone beetles dull. Aurora moths absent.',
    },
    mid: {
      visual: 'Magnetic field lines faint but visible near rock formations. Force demonstrations work at reduced effect.',
      audio: 'Low electromagnetic hum. Wind returns to the birch forest.',
      guideState: 'Lena demonstrates Newton\'s first law clearly but struggles with the third. She throws the hammer and watches it carefully.',
      ambientLife: 'Compass deer antlers pointing north again. Lodestone beetles re-magnetized. Aurora moths creating faint glows.',
    },
    high: {
      visual: 'Aurora-like magnetic field waves rippling across the sky and hills. Iron filings dancing in the air near boulders.',
      audio: 'Dynamic electromagnetic orchestration — field strength rendered as music.',
      guideState: 'Lena is at full physical capability. She explains every demonstration with precision and joy. She occasionally shouts with delight.',
      ambientLife: 'Compass deer grazing peacefully, antlers perfectly calibrated. Aurora moths creating full light shows. Lodestone beetles forming sculptures.',
    },
    restorationMoment: {
      event: 'The Pendulum Forest comes alive — every hanging weight swinging in synchronized resonance, a perfect demonstration of natural frequency.',
      guideReaction: 'Lena stands in the middle of the forest with arms outstretched, feeling the pendulums pass near her, laughing at the physics of it.',
      thematicCore: 'Force is invisible but real. Physics is not a human invention — it is the grammar of matter, and it has always been speaking.',
    },
  },

  {
    worldId: 'circuit-marsh',
    worldName: 'The Circuit Marsh',
    guideId: 'kofi-amponsah',
    low: {
      visual: 'Copper-veined reeds tarnished black. Water static and dark. Solar panels face-down or buried in mud.',
      audio: 'No crackling. No hum. Just marsh wind through dead reeds.',
      guideState: 'Kofi sits by his disconnected solar grid. He keeps testing connections that were fine yesterday.',
      ambientLife: 'Fireflies gone. Electric eels dormant in mud. Frogs silent.',
    },
    mid: {
      visual: 'Current Creek glowing in one stretch. Solar Clearing partially charged. One Edison prototype lighting.',
      audio: 'Faint electrical hum. Occasional spark-crack from the Tesla coil garden.',
      guideState: 'Kofi re-wires circuits from memory, teaching as he goes. He is patient. He always finds the fault.',
      ambientLife: 'Fireflies beginning — small clusters, not yet synchronized. Electric eels moving.',
    },
    high: {
      visual: 'Full circuit: reeds glowing amber, water luminescent, solar grid powering the marsh. LEDs scattered like low stars.',
      audio: 'Rich electrical orchestration — the marsh hums at grid frequency with overlaid natural soundscape.',
      guideState: 'Kofi is glowing with pride. He shows the child the full circuit map of the marsh — it matches his solar grid design from age sixteen.',
      ambientLife: 'Fireflies synchronized to alternating current. Electric eels fully active. Frogs croaking in electrical rhythm.',
    },
    restorationMoment: {
      event: 'The entire marsh circuit closes simultaneously. Every LED lights up. The fireflies synchronize to the grid frequency. The marsh breathes like one living thing.',
      guideReaction: 'Kofi pumps his fist, then immediately crouches to ground-level to look at the light from the fireflies\' perspective.',
      thematicCore: 'Electricity is not magic. It is a closed path. The marsh shows what happens when every part carries the current.',
    },
  },

  {
    worldId: 'code-canyon',
    worldName: 'Code Canyon',
    guideId: 'pixel',
    low: {
      visual: 'Landscape fully wireframe — no colors, no textures, just grey lines. The canyon looks unbuilt.',
      audio: 'Digital silence — not natural silence, but the absence of computational processes.',
      guideState: 'Pixel cannot fully materialize. They flicker as a ghost outline. They can type but the code does nothing.',
      ambientLife: 'Pixel sprites are frozen. Debug moths pinned to rocks. Cursor birds erratic, following ghost paths.',
    },
    mid: {
      visual: 'Block Yard functional with basic builds. Half the canyon in full color, half still wireframe. The sky glitches occasionally.',
      audio: 'Compile sounds — satisfying mechanical clicking. Occasional success chimes.',
      guideState: 'Pixel can teach the basics reliably. They struggle with recursion — it loops too long — but catch themselves.',
      ambientLife: 'Pixel sprites running simple programs. Debug moths flying between bugs. Cursor birds following the child.',
    },
    high: {
      visual: 'Full canyon rendered — vivid, layered, complex. The sky shows warm code-fall instead of Matrix green. Bridges, houses, instruments built from code blocks everywhere.',
      audio: 'Rich compiled-program soundscape — every structure producing its own note.',
      guideState: 'Pixel is fully materialised, flickering only when they\'re excited. They laugh a lot. Everything compiles clean.',
      ambientLife: 'Pixel sprites running complex parallel programs. Debug moths have evolved wings. Cursor birds building nests from saved code.',
    },
    restorationMoment: {
      event: 'The Apollo Chamber fully initialises. Mission control systems alive. Margaret Hamilton\'s code — the software that saved Apollo 11 — runs on every screen simultaneously.',
      guideReaction: 'Pixel stands in the middle of the chamber, surrounded by scrolling code, and says: "This is why I do this. Someone wrote this and people lived."',
      thematicCore: 'Code is not abstract. Every program runs somewhere for someone. The best software was written with stakes.',
    },
  },

  {
    worldId: 'body-atlas',
    worldName: 'The Body Atlas',
    guideId: 'dr-emeka-obi',
    low: {
      visual: 'Holographic anatomy displays dark. Heart Chamber pulse stopped. Rivers of blood cells stilled. DNA Spiral unlit.',
      audio: 'Silence where there was always a heartbeat. Wrong and disquieting.',
      guideState: 'Dr. Obi studies blank displays. He keeps reaching for his pendant — and then remembering it does not work here.',
      ambientLife: 'Blood cell rivers stilled. Immune Forest trees bare. Neural pathways in Brain Plateau unlit.',
    },
    mid: {
      visual: 'Heart Chamber pulse returned at half-rate. Blood cell rivers moving slowly. Lung Peaks rising and falling.',
      audio: 'Single heartbeat. Breathing rhythm. Faint neural pulses.',
      guideState: 'Dr. Obi works through each system methodically, narrating what he sees. He is the same as always — steady, careful, present.',
      ambientLife: 'Blood cells flowing at half volume. Antibody trees in Immune Forest have leaves. Neural paths light when walked.',
    },
    high: {
      visual: 'Full anatomical glory. Every system visible and cross-connected. DNA Spiral climbable. The body-world breathes at a child\'s resting rate.',
      audio: 'Complete physiological orchestra — heartbeat, breath, neural firing, cellular activity all layered.',
      guideState: 'Dr. Obi walks through the body explaining everything, correcting everything Galen got wrong, with love for the 1000-year mistake.',
      ambientLife: 'Full immune response visible. Billions of blood cells in the rivers. DNA Spiral lit and pulsing. Neural pathways fire when touched.',
    },
    restorationMoment: {
      event: 'The Galen Gallery transforms — ancient mistaken diagrams dissolve, replaced by correct modern imaging. A thousand years of medical improvement, visible at once.',
      guideReaction: 'Dr. Obi says quietly: "Galen was wrong, but he was trying. That is what medicine has always been — trying."',
      thematicCore: 'Medicine is humanity\'s ongoing argument with death. Every error corrected is a life eventually saved.',
    },
  },

  {
    worldId: 'frost-peaks',
    worldName: 'The Frost Peaks',
    guideId: 'mira-petrov',
    low: {
      visual: 'Rock layers indistinct — all one grey. Fossil Quarry buried under untouched rubble. Crystal Grotto dark.',
      audio: 'Wind, but purposeless. No geological memory in it.',
      guideState: 'Mira cannot read the strata. She traces her hand along the cliff and finds only grey. She sits cross-legged and waits.',
      ambientLife: 'Summit birds gone. Volcanic vents cold. Crystal formations collapsed.',
    },
    mid: {
      visual: 'Three distinct geological layers visible. Fossil Quarry accessible. Ice Core Library partially thawed.',
      audio: 'Wind with texture — different tones at different elevations.',
      guideState: 'Mira reads the lower three layers clearly, struggles with the upper ancient ones. She excavates carefully regardless.',
      ambientLife: 'Fossils visible in quarry walls. Crystal Grotto glowing faintly. Mountain goats on lower slopes.',
    },
    high: {
      visual: 'Full geological timeline visible in cliff faces. Crystal Grotto blazing. Tectonic Terrace visibly drifting.',
      audio: 'Deep geological bass — continent-scale time rendered as sound.',
      guideState: 'Mira reads the rock like a book she loves. She reads to the child from it.',
      ambientLife: 'Summit eagles circling. Volcanic vents steaming gently. Ice Core Library at full cryogenic preservation.',
    },
    restorationMoment: {
      event: 'The Tectonic Terrace shifts — the two platforms visibly separate by another centimeter, the exact distance they have moved since the child\'s first visit. A real geological event, witnessed.',
      guideReaction: 'Mira marks it on her map with absolute seriousness. "You were here when it happened," she tells the child.',
      thematicCore: 'The Earth is not still. It is the slowest movement we know, and it has been moving since before life existed.',
    },
  },

  {
    worldId: 'greenhouse-spiral',
    worldName: 'The Greenhouse Spiral',
    guideId: 'hugo-fontaine',
    low: {
      visual: 'Glass panels cracked or missing. Plants dead. Hugo\'s three seeds dormant in dry soil. Mixing Pools empty.',
      audio: 'Wind through broken glass. No chemical reactions. No growth sounds.',
      guideState: 'Hugo checks the three seeds every day. He has forgotten most chemistry but not how to water them.',
      ambientLife: 'No pollinators. Periodic Garden tiles cracked. Lavoisier Wing covered in dust.',
    },
    mid: {
      visual: 'Lower spiral levels green again. The Three Seeds are germinating. Mixing Pools refilled.',
      audio: 'Water movement, chemical bubble sounds, seedling stir.',
      guideState: 'Hugo teaches what he remembers — which is most of it. He grows more confident with each spiral level.',
      ambientLife: 'Bees at the lower levels. Phosphorus Chamber faint glow in darkness.',
    },
    high: {
      visual: 'Full spiral blazing with life. The Three Seeds are full plants, different species, each teaching a chemistry principle.',
      audio: 'Rich greenhouse symphony — growth, chemistry, water, wind through open dome at the top.',
      guideState: 'Hugo is joyful and precise in equal measure. He names every element he uses and explains why.',
      ambientLife: 'Full pollinator ecosystem. Periodic Garden stepping stones all glowing in element colors. Phosphorus Chamber brilliant.',
    },
    restorationMoment: {
      event: 'The three Haitian seeds bloom simultaneously. Hugo watches the three plants he carried through a hurricane bloom on the same morning.',
      guideReaction: 'He does not speak for a full minute. Then: "My grandmother gave me these seeds. She said: take what you love and it will grow anywhere."',
      thematicCore: 'Chemistry is transformation. Everything that was destroyed can be reconstructed from its elements, if you know the formula.',
    },
  },

  {
    worldId: 'data-stream',
    worldName: 'The Data Stream',
    guideId: 'yuki',
    low: {
      visual: 'Data streams static, colorless. Graph Garden bare — no charts growing. The Source Pool overflow without sorting.',
      audio: 'White noise static. No pattern.',
      guideState: 'Yuki\'s meticulous categories are scrambled. She stares at the Source Pool overflow and cannot begin.',
      ambientLife: 'Census Hall pipes clogged. Nightingale Ward data displays blank.',
    },
    mid: {
      visual: 'Bar charts and line graphs growing in Graph Garden at half-height. Three data streams running in color.',
      audio: 'Pattern-recognition tones returning — data finding its categories.',
      guideState: 'Yuki can sort most categories but finds new outliers she cannot place. She marks them for later.',
      ambientLife: 'Nightingale rose charts rotating again. Snow Map cholera dot pattern forming.',
    },
    high: {
      visual: 'Complete data landscape — every stream in its colour, every graph at scale. The landscape reads as stained glass made of information.',
      audio: 'Statistical music — frequency, amplitude, and phase corresponding to real data properties.',
      guideState: 'Yuki sees patterns in everything. She narrates the data landscape like reading a story she loves.',
      ambientLife: 'Census Hall fully operational. All graphs growing. The Punch Card Archive running Hollerith\'s calculations in real time.',
    },
    restorationMoment: {
      event: 'The Misinformation Epidemic exhibit activates — not to generate fear, but to show a comparison: clean data vs manipulated data, side by side. Truth made visible.',
      guideReaction: 'Yuki shows the child both versions and asks: "What is different here? Look carefully. The difference is everything."',
      thematicCore: 'Data without context is noise. Data with honesty is the most powerful thing humans have made.',
    },
  },

  {
    worldId: 'map-room',
    worldName: 'The Map Room',
    guideId: 'atlas',
    low: {
      visual: 'The interior map is white and blank. Atlas\'s cartographic body lines are nearly invisible. The dome is dark.',
      audio: 'Nothing. The silence of an empty space with no coordinates.',
      guideState: 'Atlas cannot move. He is always fixed at the centre. But now his routes are gone and he can only wait.',
      ambientLife: 'Explorer\'s Dock empty. Satellite Perch offline. Prime Meridian line invisible.',
    },
    mid: {
      visual: 'Three major continents mapped on the interior. Atlas\'s lines glowing on seven of his twelve pathways.',
      audio: 'Navigation tones — the sound of a compass needle finding north.',
      guideState: 'Atlas gives directions with authority for the mapped regions. He apologizes for the blank zones.',
      ambientLife: 'Two explorer ships at the Dock. GPS constellation at half-density.',
    },
    high: {
      visual: 'Complete spherical map, pole to pole. Atlas\'s body fully lit with all pathways. Undersea cable visualization operational.',
      audio: 'Global navigation music — layered signals, broadcasts, compass calibrations.',
      guideState: 'Atlas knows everything again. He narrates every route in the child\'s field of vision before they can ask.',
      ambientLife: 'Full Explorer\'s Dock with all 30 field trip destinations. Satellite Perch showing full GPS constellation.',
    },
    restorationMoment: {
      event: 'The Cable Trench illuminates — all 99% of undersea internet infrastructure lit up underwater. A child in this room is connected to every other person on Earth, visibly.',
      guideReaction: 'Atlas says: "Every conversation on Earth is passing beneath us right now. This is what the map of human connection looks like."',
      thematicCore: 'Geography is not just land. It is the accumulated work of every human who ever needed to know where they were.',
    },
  },

  // ── REALM OF EXPRESSION — 15 Worlds ─────────────────────────────

  {
    worldId: 'story-tree',
    worldName: 'The Story Tree',
    guideId: 'grandmother-anaya',
    low: {
      visual: 'Story-orbs dark, hanging like dead fruit. Root Library underground and inaccessible. Fireside cold.',
      audio: 'Nothing. Not even wind. Stories need air to move and there is none.',
      guideState: 'Grandmother Anaya sits at the cold fireside. She knows stories are there — she can feel them — but cannot find the words.',
      ambientLife: 'No light from Gutenberg Press. Rosetta Node stone blank.',
    },
    mid: {
      visual: 'Twelve orbs glowing — the oldest stories returning first. Fireside lit. Underground Root Library accessible but dim.',
      audio: 'Anaya\'s voice carrying — older stories in old rhythms.',
      guideState: 'Anaya tells four stories but loses the thread of two. She laughs about it and picks up elsewhere.',
      ambientLife: 'Gutenberg Press operational. Rosetta Node translating three languages.',
    },
    high: {
      visual: 'All orbs blazing. Root Library fully lit, including the almost-lost stories with warming empty orbs that fill as children engage.',
      audio: 'Living story ambience — voice, fire, rustling leaves, distant drums.',
      guideState: 'Grandmother Anaya tells stories the child has never heard and stories that feel like they have always known.',
      ambientLife: 'Rosetta Node translating all languages. Gutenberg Press printing continuously.',
    },
    restorationMoment: {
      event: 'The Root Library door opens fully. The deepest root orbs — Anaya\'s grandmother\'s stories — fill with light and play for the first time.',
      guideReaction: 'Anaya closes her eyes and listens to her grandmother\'s voice, silent tears on her face. Then she opens her eyes and tells the child every word of what she just heard.',
      thematicCore: 'Stories do not die. They wait in the deep root, patient as earth, until someone returns to listen.',
    },
  },

  {
    worldId: 'rhyme-docks',
    worldName: 'The Rhyme Docks',
    guideId: 'felix-barbosa',
    low: {
      visual: 'Ships rotting at dock. The Sound Lighthouse dark. No cargo, no rhythm, no movement.',
      audio: 'Rope creaking on silence. Not music. Not rhythm. Just friction.',
      guideState: 'Felix cannot find a rhyme. He speaks in prose and it bothers him deeply.',
      ambientLife: 'Homer\'s berth empty — the great vessel gone. Haiku Jetty planks missing.',
    },
    mid: {
      visual: 'Three ships docked and loading. Sound Lighthouse pulses at tidal rhythm.',
      audio: 'Harbor ambience — waves, gulls, creaking — resolving into simple rhythmic patterns.',
      guideState: 'Felix finds couplets easily, quatrains sometimes. He works the dock while reciting, hands busy.',
      ambientLife: 'Homer\'s berth occupied by a smaller vessel of oral poetry. Slam Stage active on evenings.',
    },
    high: {
      visual: 'Full harbor operation. Every ship loaded with its tradition. Sound Lighthouse casting full sonic beam.',
      audio: 'Rich poetry of sound — the dock\'s working noise underlies spoken verse from every tradition.',
      guideState: 'Felix recites from every tradition he knows, swapping between them mid-line, laughing when they almost rhyme across languages.',
      ambientLife: 'Homer\'s great vessel moored and illuminated. All five poetry traditions represented.',
    },
    restorationMoment: {
      event: 'Felix improvises a poem using one word from every poetry tradition in the harbor — Greek, Japanese, Yoruba, Caribbean, Elizabethan — and they rhyme.',
      guideReaction: 'He looks genuinely surprised by what came out of his mouth. Then he writes it down immediately, laughing at himself for it.',
      thematicCore: 'Poetry is humanity speaking to itself in its most compressed form. Every culture found this necessity independently.',
    },
  },

  {
    worldId: 'letter-forge',
    worldName: 'The Letter Forge',
    guideId: 'amara-diallo',
    low: {
      visual: 'Forge cold and dark. Alphabet Wall blank. Letters as chandeliers unlit.',
      audio: 'Silent forge. Without letters, silence is not communicative — it is just absence.',
      guideState: 'Amara moves around the cold forge touching letter-forms she cannot remember making. She shapes them in the air anyway.',
      ambientLife: 'Syllabary Workshop tools scattered and unused. Braille Chamber fully dark.',
    },
    mid: {
      visual: 'Five alphabet systems restored and lit on the Wall. The forge working at lower heat.',
      audio: 'Forge sounds returning — metal work, clay work, the specific sound of symbols being shaped.',
      guideState: 'Amara forges the Phoenician alphabet from memory, narrating each letter\'s origin. She does this first every time.',
      ambientLife: 'Braille Chamber tactile again. Sound Anvil producing phoneme-to-symbol connections.',
    },
    high: {
      visual: 'Every alphabet in human history on the Wall, lit and interactive. Chandeliers blazing with letter-light.',
      audio: 'Multi-script chorus — every writing system has a sound associated, layered into something polyphonic.',
      guideState: 'Amara works in four languages simultaneously, explaining the grammar of writing the way others explain cooking.',
      ambientLife: 'Syllabary Workshop creating new symbol systems. All tactile stations operational.',
    },
    restorationMoment: {
      event: 'The entire Alphabet Wall becomes interactive simultaneously — children can write in any of the 40+ scripts and see the meaning translate in real time.',
      guideReaction: 'Amara steps back and watches the child try scripts they have never seen. She says: "Every one of these was invented by someone who needed it."',
      thematicCore: 'Every letter was a decision. Writing is the technology that let humans become themselves.',
    },
  },

  {
    worldId: 'reading-reef',
    worldName: 'The Reading Reef',
    guideId: 'oliver-marsh',
    low: {
      visual: 'Coral bookshelves bare. Anemone reading lamps dark. Books dissolved into sediment.',
      audio: 'Underwater silence — wrong kind, empty rather than peaceful.',
      guideState: 'Oliver navigates by touch and sound, as always. But the books he finds are blank. He traces pages anyway.',
      ambientLife: 'No fish. Bioluminescent coral dark.',
    },
    mid: {
      visual: 'Twenty books re-embedded in living coral. Anemone lamps at reading level glowing amber.',
      audio: 'Underwater reading room ambience — slow water movement, the sound of pages turning without hands.',
      guideState: 'Oliver pulls books from coral and reads them aloud. He pauses to ask questions. He always has.',
      ambientLife: 'Reef fish returning to book-shelves. Bioluminescent schools moving in comprehension patterns.',
    },
    high: {
      visual: 'Full underwater library — every book in coral, reading paths marked by fish schools, anemone lamps at every level.',
      audio: 'Rich reading room music — soft, focused, alive with the sound of minds working.',
      guideState: 'Oliver recommends books. He knows what the child needs before they do.',
      ambientLife: 'Schools of fish re-shelving books by swimming them back. Living coral growing around new titles.',
    },
    restorationMoment: {
      event: 'The Braille Underwater Library — Oliver\'s special wing — fully illuminates. Books with raised text, read by touch through the water.',
      guideReaction: 'Oliver selects his favourite book from the section and reads the opening page from memory, running his fingers along the coral.',
      thematicCore: 'Comprehension is understanding — not seeing, not hearing — understanding. The reef does not care how you find the meaning.',
    },
  },

  {
    worldId: 'grammar-bridge',
    worldName: 'The Grammar Bridge',
    guideId: 'lila-johansson-park',
    low: {
      visual: 'Bridge structurally unsound — missing supports, wobbling, some spans collapsed. Blueprints washed away.',
      audio: 'Wind through structural gaps. The specific unease of load-bearing components missing.',
      guideState: 'Lila cannot cross her own bridge. She studies the structural failures methodically from the shore.',
      ambientLife: 'Sentence diagrams dissolved into the chasm. No pedestrians — the bridge is impassable.',
    },
    mid: {
      visual: 'Main span passable. Subject-verb structure restored as load-bearing elements.',
      audio: 'Bridge engineering sounds — settling, weight distribution, structural integrity.',
      guideState: 'Lila rebuilds the bridge while explaining why each piece goes where. She has a theory for everything.',
      ambientLife: 'Simple declarative sentences can cross. Complex sentences still cause wobble.',
    },
    high: {
      visual: 'Complete bridge — full sentence structure visible as engineering. Compound-complex sentences as hanging suspension cables.',
      audio: 'Engineered harmony — the bridge hums at its resonant frequency.',
      guideState: 'Lila walks the full span demonstrating every grammatical structure. She is satisfied in a way she can only be in a structurally perfect sentence.',
      ambientLife: 'All sentence types crossing safely. Dependent clauses as smaller spans off the main.',
    },
    restorationMoment: {
      event: 'Lila writes a sentence so long and so perfectly balanced that the bridge reaches the far side of the chasm for the first time — a grammar bridge to somewhere new.',
      guideReaction: 'She stands at the new end, looks back at the child, and says: "A good sentence takes you somewhere."',
      thematicCore: 'Grammar is not about rules. It is about structure and what structure makes possible.',
    },
  },

  {
    worldId: 'vocabulary-jungle',
    worldName: 'The Vocabulary Jungle',
    guideId: 'kwame-asante',
    low: {
      visual: 'Jungle reduced to grey undergrowth. Word-roots withered, branches bare — no derivative words growing.',
      audio: 'Canopy silence. No jungle vocabulary, just neutral sound.',
      guideState: 'Kwame moves through the jungle reading root-labels he has written on each tree himself. He will not forget.',
      ambientLife: 'No word-fruit on branches. Etymology vines dead.',
    },
    mid: {
      visual: 'Latin roots re-growing three derivative branches each. Jungle canopy partial.',
      audio: 'Jungle ambience returning — word-sounds rustling through leaves.',
      guideState: 'Kwame teaches root families confidently. He invents new words at the junction of two languages to demonstrate.',
      ambientLife: 'New loanwords growing at forest edges where different root-trees meet.',
    },
    high: {
      visual: 'Dense canopy, word-fruit on every branch, etymology vines connecting whole root families. New words growing at the tips.',
      audio: 'Polyphonic word-music — roots humming in their languages, derivatives in harmonics above.',
      guideState: 'Kwame is in full delight, tracing word-families across five languages simultaneously. He laughs at every beautiful etymology.',
      ambientLife: 'Shakespeare-invented words growing on new branches. Norman Conquest loanwords visible as grafts on older trees.',
    },
    restorationMoment: {
      event: 'A new word grows from two different root-trees simultaneously — the first word the jungle itself has invented.',
      guideReaction: 'Kwame records it carefully, pronounces it in all contributing languages, and says: "This is how language has always grown."',
      thematicCore: 'No language has ever been pure. Every word is a migration story.',
    },
  },

  {
    worldId: 'punctuation-station',
    worldName: 'The Punctuation Station',
    guideId: 'rosie-chen',
    low: {
      visual: 'All signal lights dark. Trains stopped on every track. Station clocks frozen.',
      audio: 'No train sounds. No announcements. Railway silence is a specific unease.',
      guideState: 'Rosie has every punctuation mark memorized but cannot make any of the signals work. She stands at the signal box, trying.',
      ambientLife: 'Trains stationary. No passengers on platforms.',
    },
    mid: {
      visual: 'Period and comma signals operational. Simple sentences moving through the station as trains.',
      audio: 'Train motion returning — stops, starts, the specific sound of correct punctuation.',
      guideState: 'Rosie manages basic punctuation signals reliably. Semicolons still cause delays.',
      ambientLife: 'Short declarative sentence-trains moving. Longer trains still waiting.',
    },
    high: {
      visual: 'Full station in operation — every signal lit, every train on schedule, complex-sentence expresses running smoothly.',
      audio: 'Station symphony — punctuation signals as music, trains as moving melody.',
      guideState: 'Rosie runs the station with total authority. She corrects the child\'s punctuation mid-sentence without breaking stride.',
      ambientLife: 'All sentence-trains running. The interrobang experimentation platform open for special services.',
    },
    restorationMoment: {
      event: 'The interrobang — the rarest punctuation mark, ?!, invented in 1962 — gets its own signal and its own train, running a special service.',
      guideReaction: 'Rosie stands on the platform as the interrobang train arrives for the first time. "I always believed in this one," she says.',
      thematicCore: 'Every punctuation mark was invented to solve a problem that language created. Humans write their way out of ambiguity, one mark at a time.',
    },
  },

  {
    worldId: 'debate-arena',
    worldName: 'The Debate Arena',
    guideId: 'theo-papadopoulos',
    low: {
      visual: 'Arena empty. Columns cracked where ad hominem was once attempted. Logical principles inscriptions faded.',
      audio: 'Echo of nothing. Debate spaces require two voices.',
      guideState: 'Theo stands at one podium, making arguments to an empty arena. He is thorough. He has always been thorough.',
      ambientLife: 'No audience. No evidence ships in Nonfiction Fleet threadway.',
    },
    mid: {
      visual: 'One side of the arena restored. Opening arguments possible. Key columns standing.',
      audio: 'Arena acoustics returning — sound carrying the way arguments should.',
      guideState: 'Theo teaches claim and evidence clearly. Reasoning is harder without counterarguments, but he invents them.',
      ambientLife: 'Audience of empty seats with one section occupied.',
    },
    high: {
      visual: 'Full arena — both sides operational, logical fallacy warnings on structural elements, beautiful in its geometric fairness.',
      audio: 'Debate music — structured, alternating, building.',
      guideState: 'Theo argues both sides of any question simultaneously and loves it. He never wins without evidence.',
      ambientLife: 'Full audience. Evidence archives accessible from both podiums.',
    },
    restorationMoment: {
      event: 'The Malala UN Speech plays in the arena for the first time — the architecture specifically designed to give words maximum weight, fully serving its purpose.',
      guideReaction: 'Theo is silent throughout. When it ends, he says: "That is how you use a stage. Now you know what one is for."',
      thematicCore: 'Argument is not aggression. It is the civil method for navigating disagreement without violence.',
    },
  },

  {
    worldId: 'diary-lighthouse',
    worldName: 'The Diary Lighthouse',
    guideId: 'nadia-volkov',
    low: {
      visual: 'Lighthouse dark. Journal Room empty — no pages, no ink. Anne Frank Attic sealed.',
      audio: 'Wind off a dark coast. Nothing written to power the light.',
      guideState: 'Nadia sits at the empty writing desk. She holds her locked diary and does not open it.',
      ambientLife: 'Light mechanism frozen. Coast birds absent.',
    },
    mid: {
      visual: 'Lighthouse at quarter power. Journal Room producing faint light from a few completed entries.',
      audio: 'Pen scratching. Wind. The specific sound of thought becoming word.',
      guideState: 'Nadia writes while the child writes. She does not share what she writes but her pen is always moving.',
      ambientLife: 'Light mechanism working at low RPM. Coastal birds returning.',
    },
    high: {
      visual: 'Lighthouse at full beam. Anne Frank Attic accessible. Every entry in the Journal Room producing light.',
      audio: 'Full coastal soundscape with lighthouse fog horn at intervals — steady, reliable, present.',
      guideState: 'Nadia lets the child read one page from her diary — just one. It is more than she has ever shared.',
      ambientLife: 'Light mechanism at full speed. Beam visible from ten worlds away.',
    },
    restorationMoment: {
      event: 'Nadia\'s oldest locked journal opens. The first entry she ever wrote — age seven, in Russian — lit with her own handwriting glowing gold.',
      guideReaction: 'She reads it aloud. Then she closes it. "You were the first person outside me who knows that. Keep it."',
      thematicCore: 'The diary is not private writing. It is writing where the only audience is your future self, and that is the most important audience.',
    },
  },

  {
    worldId: 'spelling-mines',
    worldName: 'The Spelling Mines',
    guideId: 'benny-okafor-williams',
    low: {
      visual: 'Mine shafts collapsed. Crystals all cloudy or cracked — misspelled forms.',
      audio: 'Mine silence. Pickaxe quiet.',
      guideState: 'Benny holds his pickaxe and finds nothing worth extracting. Unusual spellings have lost their gemstone quality.',
      ambientLife: 'Mine carts stopped. Geological word-veins gone.',
    },
    mid: {
      visual: 'Upper shafts operational. Common words crystallising correctly.',
      audio: 'Pickaxe rhythm, crystal ring when correctly spelled words are found.',
      guideState: 'Benny excavates methodically, narrating the phonetic rules of each find. He is patient with misspellings.',
      ambientLife: 'Mine carts moving in upper shafts. Common phoneme veins visible.',
    },
    high: {
      visual: 'Deep shafts accessible. Unusual spellings — "colonel," "receipt," "Wednesday" — as extraordinary gemstones.',
      audio: 'Deep mine harmonics — strange spellings produce stranger, more beautiful tones.',
      guideState: 'Benny holds up truly irregular spellings with the reverence of rare gems. He explains why each one is wrong in a way that reveals the whole history of English.',
      ambientLife: 'IPA Phonetic Alphabet mine fully operational. Etymology veins visible at depth.',
    },
    restorationMoment: {
      event: 'The deepest vein opens — the Norman Conquest layer — where French spellings grafted onto Germanic sounds are visible as literally two crystals fused together.',
      guideReaction: 'Benny holds the fused crystal up so the child can see both layers. "1066 is still in your mouth every time you say \'beef,\'" he says.',
      thematicCore: 'Every weird spelling is history. English is not inconsistent — it is perfectly consistent with everything that happened to it.',
    },
  },

  {
    worldId: 'translation-garden',
    worldName: 'The Translation Garden',
    guideId: 'farah-al-rashid',
    low: {
      visual: 'Garden flowers all the same colour — one unnamed neutral. Translation paths invisible.',
      audio: 'One language only. The fountain is silent.',
      guideState: 'Farah knows 40 languages and can only use one here. She speaks it slowly, listening for the others beneath it.',
      ambientLife: 'Central fountain drained. Cross-language paths overgrown.',
    },
    mid: {
      visual: 'Flowers in twelve colours, each labelled in its language. Paths between related language families open.',
      audio: 'Language family music — Romance, Slavic, Semitic, Sino-Tibetan each with their tonal signature.',
      guideState: 'Farah translates across language families fluidly. She pauses at particularly beautiful translation problems.',
      ambientLife: 'Fountain running with three languages. Path bridges between families appearing.',
    },
    high: {
      visual: 'Every flower in its colour, every language represented, paths between all of them visible and walkable.',
      audio: 'Polylingual music — all language families simultaneously, harmonising rather than clashing.',
      guideState: 'Farah speaks to the child in whatever their dominant language is and switches to others to demonstrate. She never loses the thread.',
      ambientLife: 'Fountain pooling all languages simultaneously. Garden always smells of the current language being spoken.',
    },
    restorationMoment: {
      event: 'The center fountain runs with all 40 languages simultaneously — Farah\'s complete linguistic range pooled into one place.',
      guideReaction: 'She cups the water in both hands and says a word in all 40 languages — the one word that exists in every human language, "mama."',
      thematicCore: 'Languages are not barriers. They are 40 different ways of being human, and every one of them contains the same essential words.',
    },
  },

  {
    worldId: 'nonfiction-fleet',
    worldName: 'The Nonfiction Fleet',
    guideId: 'captain-birch',
    low: {
      visual: 'Most ships wrecked or gone. The warning wreck from bad information more prominent than ever. Harbor empty.',
      audio: 'Harbor silence. Absent rigging. Sea without purpose.',
      guideState: 'Captain Birch stands at the ruined harbor. He has memorized the lessons of the wreck. He repeats them to the child quietly.',
      ambientLife: 'No ships in harbor. Tide tables blank.',
    },
    mid: {
      visual: 'Three ships docked — primary source, secondary source, reference text. The wreck still visible as warning.',
      audio: 'Ship rigging in wind. Research sounds — pages, instruments, measurement.',
      guideState: 'Birch teaches source hierarchy with full authority. He keeps one eye on the wreck.',
      ambientLife: 'Ships loading cargo (information) at docks. Navigation charts being updated.',
    },
    high: {
      visual: 'Full fleet at harbour and at sea. The wreck preserved as visible warning. All source types represented.',
      audio: 'Full harbor and sea symphony — research music with depth.',
      guideState: 'Captain Birch evaluates sources out loud, discarding bad ones with zero ceremony. He trusts the child to do the same.',
      ambientLife: 'Full fleet operating. Primary source ships fastest. Atlas galleons slowest but most reliable.',
    },
    restorationMoment: {
      event: 'Rachel Carson\'s Silent Spring ship docks — the book that changed environmental law. A nonfiction text that literally changed the world, arriving for the first time.',
      guideReaction: 'Birch reads the opening paragraph aloud from the dock. "This," he says, "is what nonfiction is actually for."',
      thematicCore: 'Research is not passive. It is the preparation for action. Every good nonfiction text eventually becomes a reason to do something.',
    },
  },

  {
    worldId: 'illustration-cove',
    worldName: 'The Illustration Cove',
    guideId: 'ines-moreau',
    low: {
      visual: 'Cave Gallery bare. Tapestry Cliff plain rock. Silent Beach sand unmarked.',
      audio: 'Absolute silence. Ines does not speak. Without images, there is nothing.',
      guideState: 'Ines moves through the bare cove with her eyes tracking the walls where images should be. She draws in the air with one finger.',
      ambientLife: 'Graphic Tide Pools empty. No visual narratives anywhere.',
    },
    mid: {
      visual: 'Cave Gallery showing Lascaux paintings. Tapestry Cliff showing first 20 meters of Bayeux Tapestry.',
      audio: 'Paint sounds. Stone on stone. The specific acoustic warmth of cave spaces.',
      guideState: 'Ines draws on the Silent Beach constantly. She shows the child sequences of images and traces the narrative arc with her hands.',
      ambientLife: 'Tide pools showing sequential art panels. Ines\'s drawings accumulating and not washing away.',
    },
    high: {
      visual: 'Full cove in image — cave paintings, tapestry cliff, Hokusai ocean on the waves themselves, Beatrix Potter illustrated tide pools.',
      audio: 'Visual storytelling has its own sound — the sound of attention, of reading images.',
      guideState: 'Ines communicates entirely in images with the child. Occasionally the child understands something before she can draw it.',
      ambientLife: 'Cave Gallery full with 17,000-year history of visual narrative. All silent story surfaces active.',
    },
    restorationMoment: {
      event: 'The full 70-meter Bayeux Tapestry unfolds along the Tapestry Cliff — a complete visual narrative of the Norman Conquest, unbroken, told entirely without text.',
      guideReaction: 'Ines walks the full length twice, pointing at details. Then she draws herself into the tapestry, in the same style, at the end.',
      thematicCore: 'Humans told stories in images before they had alphabets, and they never stopped. Visual language is older than writing.',
    },
  },

  {
    worldId: 'folklore-bazaar',
    worldName: 'The Folklore Bazaar',
    guideId: 'hassan-yilmaz',
    low: {
      visual: 'Market empty. Lanterns dark. Every stall shuttered. Stories without an audience cannot sustain themselves.',
      audio: 'Wind through empty awnings. No voices.',
      guideState: 'Hassan keeps one stall open — his own tradition, the one he knows deepest. He tells stories to the empty market.',
      ambientLife: 'No market sounds. Cultural items packed away.',
    },
    mid: {
      visual: 'Twelve stalls open — the oldest traditions returning first. Lanterns showing cultural colors.',
      audio: 'Market coming alive — competing story sounds, different languages, overlapping traditions.',
      guideState: 'Hassan moves between open stalls commentating on the connections between stories across cultures.',
      ambientLife: 'Market atmosphere building — food smells, craft demonstrations, story circles forming.',
    },
    high: {
      visual: 'Full bazaar. Every stall from every tradition. Anansi booth beside Baba Yaga booth, getting along.',
      audio: 'Complete world-market of folklore — all traditions present and audible as harmony.',
      guideState: 'Hassan is at full joy, tracing the same story as it appears in 14 different cultures simultaneously.',
      ambientLife: 'All cultural traditions active. Night market lanterns showing story scene projections overhead.',
    },
    restorationMoment: {
      event: 'A story told in the market spawns a new stall spontaneously — a tradition the child brought to the bazaar that has never been here before.',
      guideReaction: 'Hassan immediately stocks it, placing it between two neighbouring traditions, pointing out three things it has in common with each.',
      thematicCore: 'No story is original. Every story is in conversation with every other story. The bazaar makes this visible.',
    },
  },

  {
    worldId: 'editing-tower',
    worldName: 'The Editing Tower',
    guideId: 'wren-calloway',
    low: {
      visual: 'Tower of pages collapsed into a heap at ground level. All floors indistinguishable — draft from final.',
      audio: 'Paper drift, no wind direction. Revision without direction sounds like this.',
      guideState: 'Wren sits in the heap, sorting draft from final. They are on draft 47. They know which is which by touch.',
      ambientLife: 'Markup raven Markup grounded, unable to fly in collapsed tower conditions.',
    },
    mid: {
      visual: 'First three floors restored. Ground floor raw drafts, second floor revised, third approaching final quality.',
      audio: 'Revision sounds — strike-throughs, inserts, the musical quality of a sentence improving.',
      guideState: 'Wren edits with full attention, explaining every decision. They are meticulous but not cruel.',
      ambientLife: 'Markup raven circling the first three floors, spotting errors from above.',
    },
    high: {
      visual: 'Full tower. Ground floor raw, top floor polished prose. The quality of the light changes floor by floor.',
      audio: 'Perfect prose has a specific sound — a rhythm Wren can hear from outside the manuscript.',
      guideState: 'Wren is on draft 47, making final corrections. They show the child draft one alongside draft 47 and explain every change.',
      ambientLife: 'Markup raven circling the full tower, calling out corrections like a lighthouse keeper.',
    },
    restorationMoment: {
      event: 'Wren completes draft 47 and declares it finished. The tower briefly emits a tone — the resonant frequency of a text that is done.',
      guideReaction: 'Immediately begins draft 48. "Finished is just the start of the next one," they say.',
      thematicCore: 'Revision is not failure. Every draft is a better understanding of what you meant to say.',
    },
  },

  // ── REALM OF EXCHANGE — 12 Worlds ────────────────────────────────

  {
    worldId: 'market-square',
    worldName: 'The Market Square',
    guideId: 'tia-carmen-herrera',
    low: {
      visual: 'Market empty. Stalls shuttered. Terracotta tiles cracked. The smell of nothing.',
      audio: 'Silence where there should be trade noise. More wrong than any single sound could be.',
      guideState: 'Carmen sits at the Generational Ledger, reading old entries. She knows the trades. She just needs a market again.',
      ambientLife: 'Coins inert. Price Stalls closed. No supply or demand to demonstrate.',
    },
    mid: {
      visual: 'Eight stalls open. Fruit, fabric, ceramic. Lydian Coin Museum displaying coins.',
      audio: 'Market sounds returning — steel drums, vendor calls, transaction sounds.',
      guideState: 'Carmen haggles, demonstrates fair price, explains supply chains from memory. She is energised by any commerce.',
      ambientLife: 'Coins moving again. Fair Price Court hearing simple disputes.',
    },
    high: {
      visual: 'Full market. All stalls from the Silk Road Caravan. Three generations of family trade visible.',
      audio: 'Complete market symphony — steel drums, multiple languages, trade in progress.',
      guideState: 'Carmen moves through the market greeting everyone, settling disputes, explaining everything, tasting everything.',
      ambientLife: 'Silk Road Caravan in full operation. Coin Museum showing complete monetary history.',
    },
    restorationMoment: {
      event: 'Carmen\'s family\'s full Generational Ledger illuminates — three generations of survival through trade, visible as one story.',
      guideReaction: 'She traces her finger along her grandmother\'s entries, then her mother\'s, then her own. "Money is just a way of keeping score on fairness," she says.',
      thematicCore: 'Trade is not exploitation by default. At its best, it is two people agreeing that something is worth something. The market enforces that agreement.',
    },
  },

  {
    worldId: 'savings-vault',
    worldName: 'The Savings Vault',
    guideId: 'mr-abernathy',
    low: {
      visual: 'Vault trees bare. Coin towers empty. Compound interest chamber cold. Polished brass tarnished.',
      audio: 'Vault silence — the specific emptiness of a place built for abundance.',
      guideState: 'Mr. Abernathy checks every safety mechanism in the empty vault. He built it to be indestructible. He is testing that claim.',
      ambientLife: 'No growth anywhere. Interest rates zero. Time has stopped mattering here.',
    },
    mid: {
      visual: 'Three vault trees growing slowly. First compound interest demonstration running on small piles.',
      audio: 'Vault sounds — subtle mechanical timepieces, growth tones.',
      guideState: 'Abernathy explains compound interest with absolute clarity. His patience with number is infinite.',
      ambientLife: 'Savings growth visible over demonstration periods. Freedom\'s Bank section accessible.',
    },
    high: {
      visual: 'Vault trees fully grown, some decades old. Compound interest towers glowing with accumulated growth.',
      audio: 'Vault prosperity music — rich, warm, patient tones of long-term thinking.',
      guideState: 'Abernathy shows the child a coin added on day one, and what it is worth now. He weeps slightly at the math.',
      ambientLife: 'Long-term compound interest visible as forest canopy. Bank of Amsterdam historical section fully operational.',
    },
    restorationMoment: {
      event: 'The first coin Abernathy ever saved — through the bank collapse and back — is displayed at the vault entrance. Its story made into the cornerstone.',
      guideReaction: 'He shows the child exactly what he lost and exactly how he rebuilt from one coin. "The system failed me. I did not fail the system."',
      thematicCore: 'Saving is not about distrust in spending. It is about building agency — the ability to make choices later that you cannot make now.',
    },
  },

  {
    worldId: 'budget-kitchen',
    worldName: 'The Budget Kitchen',
    guideId: 'priya-nair',
    low: {
      visual: 'Kitchen shelves bare. Chalkboard budgets erased. Stove cold. Ingredients absent.',
      audio: 'Empty kitchen silence. No cooking sounds.',
      guideState: 'Priya checks the empty shelves and does math in her head for what she could make with nothing. She finds solutions anyway.',
      ambientLife: 'No meal smells. Budget calculations blank.',
    },
    mid: {
      visual: 'Basic pantry stocked. Two-ingredient budget recipes possible. Chalkboard showing weekly budget.',
      audio: 'Kitchen ambience — chopping, simmering, the math of meal planning out loud.',
      guideState: 'Priya cooks while explaining opportunity cost. Everything is a trade-off in her kitchen.',
      ambientLife: 'Meal demonstrations running. Budget calculations updating in real time.',
    },
    high: {
      visual: 'Full kitchen in operation. Every recipe possible within constraints. Shortcut knowledge written on every surface.',
      audio: 'Full kitchen symphony — nine-person meal being prepared with one income, efficiently and lovingly.',
      guideState: 'Priya feeds the child first, explains the budget second. Her hospitality is the math made visible.',
      ambientLife: 'Spice trade history visible in pantry provenance labels. Full budget planning wall operational.',
    },
    restorationMoment: {
      event: 'Priya cooks the meal she grew up eating — the one her family survived on when there was almost nothing — and it is extraordinary.',
      guideReaction: 'She serves it and says: "Constraint does not diminish creativity. It defines its shape."',
      thematicCore: 'Budget is not about having less. It is about understanding that resources are real and choices have consequences, and making peace with that.',
    },
  },

  {
    worldId: 'entrepreneur-workshop',
    worldName: "The Entrepreneur's Workshop",
    guideId: 'diego-montoya-silva',
    low: {
      visual: 'Workshop floor empty. Every prototype gone. Bankruptcy letters taken down from the wall. Just bare boards.',
      audio: 'Silent workspace. The opposite of invention.',
      guideState: 'Diego stands in his empty workshop. He immediately starts sketching something on bare wood with a nail.',
      ambientLife: 'Patent shelf empty. Failure Wall blank.',
    },
    mid: {
      visual: 'First cart prototype on the floor. Three bankruptcy letters re-mounted, framed.',
      audio: 'Workshop sounds returning — sketching, construction, prototype testing.',
      guideState: 'Diego shows the child the cart that started everything. He explains every decision, including the ones that failed.',
      ambientLife: 'Pivot documentation beginning to appear. Patent applications being drafted.',
    },
    high: {
      visual: 'Workshop full of prototypes at every stage. Failure Wall covered in beautiful framed failures. New ideas sketched on every surface.',
      audio: 'Entrepreneurial energy — testing, iteration, laughter at failure, excitement at small progress.',
      guideState: 'Diego smiles when things break. He always has. He is most alive in the breaking.',
      ambientLife: 'Patent Wall showing full history including failed applications. Business genealogy traceable from first cart.',
    },
    restorationMoment: {
      event: 'Diego\'s original cart rolls across the workshop floor on its own, perfectly balanced — the first design, finally working as he always imagined it.',
      guideReaction: 'He chases it, laughing. "Fifteen years," he says. "Fifteen years to fix that wheel."',
      thematicCore: 'Entrepreneurship is not about being right. It is about being willing to be wrong enough times that you eventually arrive at right.',
    },
  },

  {
    worldId: 'sharing-meadow',
    worldName: 'The Sharing Meadow',
    guideId: 'auntie-bee',
    low: {
      visual: 'Meadow bare. Commons land empty. The more-you-give phenomenon reversed: nothing to give means nothing grows.',
      audio: 'Meadow silence. No community sounds.',
      guideState: 'Auntie Bee tends the empty meadow with the same care as the full one. She is preparing, not waiting.',
      ambientLife: 'Gift economy infrastructure idle. Cooperative movement history boards weathered.',
    },
    mid: {
      visual: 'Meadow partial — enough to share. Small gifts changing hands at the meadow center.',
      audio: 'Community sounds returning — laughter, cooperation, shared meal sounds.',
      guideState: 'Auntie Bee gives away everything she has at the start of each day and has more by evening. She shows the child how.',
      ambientLife: 'Open-source contribution visible as physical metaphor — tools appearing as people add them.',
    },
    high: {
      visual: 'Full meadow abundance — more than anyone brought. The more-you-give effect fully operational.',
      audio: 'Community feast sound — voices, music, the specific warmth of shared resources freely given.',
      guideState: 'Auntie Bee is in the center of it all, making sure everyone has something.',
      ambientLife: 'Gift economy fully operational. Cooperative movement documented in full. Commons land productive.',
    },
    restorationMoment: {
      event: 'The meadow center produces something no one brought — the emergent resource that only exists because of collective sharing.',
      guideReaction: 'Auntie Bee holds it up and says: "This is why we share. You cannot make this alone."',
      thematicCore: 'Generosity is not altruism. It is the recognition that abundance is collective, not individual.',
    },
  },

  {
    worldId: 'investment-greenhouse',
    worldName: 'The Investment Greenhouse',
    guideId: 'jin-ho-park',
    low: {
      visual: 'Greenhouse bare. All investment-seeds unplanted. Time scale stopped. Risk assessment dormant.',
      audio: 'Greenhouse silence — glass walls with nothing to contain.',
      guideState: 'Jin-ho studies the empty planting beds. He knows what should go where. He will start when conditions allow.',
      ambientLife: 'No growth. No compound returns. Diversification impossible with no species.',
    },
    mid: {
      visual: 'Short-term speculative plants growing fast, some dying. Long-term perennials establishing slowly.',
      audio: 'Growth sounds — patient, layered, time-based.',
      guideState: 'Jin-ho tends every investment class with equal attention. He explains risk not as danger but as vocabulary.',
      ambientLife: 'Bond perennials established. Index fund ground cover spreading.',
    },
    high: {
      visual: 'Greenhouse at full diversity — fast-growth and slow-growth plants coexisting. The portfolio visible as landscape.',
      audio: 'Long-term investment music — decades-long chord progressions finally resolving.',
      guideState: 'Jin-ho shows the child a plant first seeded before they were born, now producing.',
      ambientLife: 'Full portfolio ecosystem. Zimbabwe hyperinflation exhibit as cautionary preserved specimen.',
    },
    restorationMoment: {
      event: 'The oldest plant in the greenhouse flowers for the first time — a fifty-year investment completing its cycle.',
      guideReaction: 'Jin-ho harvests it carefully and says: "My grandfather planted this. I have been waiting my whole career to see this happen."',
      thematicCore: 'Investing is the practice of trust — trust that the future exists, trust that work compounds, trust that patience pays.',
    },
  },

  {
    worldId: 'needs-wants-bridge',
    worldName: 'The Needs & Wants Bridge',
    guideId: 'nia-oduya',
    low: {
      visual: 'Bridge gone — both sides present but no span between them. Needs on left, wants on right, nothing connecting them.',
      audio: 'The gap hums with the anxiety of undecided choices.',
      guideState: 'Nia stands at the edge of the needs side with 42 possessions exactly. She reviews them aloud.',
      ambientLife: 'No decision-making framework visible. Diderot Effect exhibit sealed.',
    },
    mid: {
      visual: 'Basic bridge span — essentials with confidence. Mid-range decisions requiring more thought.',
      audio: 'Decision sounds — weighing, considering, the specific quality of considered choice.',
      guideState: 'Nia walks children through needs vs wants in real time, asking questions rather than giving answers.',
      ambientLife: 'Maslow\'s hierarchy visible as landscape elevation on the needs side.',
    },
    high: {
      visual: 'Full bridge with nuanced gradients — necessities, dignified wants, aspirational wants, luxuries, all clearly mapped.',
      audio: 'Clear decision music — clean, honest, not preachy.',
      guideState: 'Nia crosses the bridge with ease, naming exactly what she owns and why each item is there.',
      ambientLife: 'Planned obsolescence exhibit fully operational as warning. Hedonic treadmill visible as literal infinite treadmill.',
    },
    restorationMoment: {
      event: 'A new classification appears between needs and wants — "dignified choice" — a category Nia creates on the bridge in real time.',
      guideReaction: 'She says: "I have been thinking about this for years. You helped me find the right name for it."',
      thematicCore: 'The distinction between needs and wants is not simple. It is a practice, revised over a lifetime.',
    },
  },

  {
    worldId: 'barter-docks',
    worldName: 'The Barter Docks',
    guideId: 'tomas-reyes',
    low: {
      visual: 'Docks empty — no trade eras moored. Ancient trade objects absent. The double-coincidence problem presented without its solution.',
      audio: 'Harbor silence before trade existed. Pre-money silence.',
      guideState: 'Tomás inventories what he remembers about trade. He keeps notebooks. He always has.',
      ambientLife: 'Rai stones absent. Silk Road stall empty.',
    },
    mid: {
      visual: 'The oldest trade era docked — barter crates, shell currency. Three ships from different eras present.',
      audio: 'Ancient market sounds — barter negotiation without shared language.',
      guideState: 'Tomás facilitates barter exchanges and finds the double-coincidence problem hilarious every time.',
      ambientLife: 'Yapese Rai stone section accessible. Trans-Saharan salt trade routes visible.',
    },
    high: {
      visual: 'All trade eras docked — barter, shell, metal, paper, digital. The full history of money\'s invention and reinvention.',
      audio: 'Economic evolution music — each era has its trading sound, layered historically.',
      guideState: 'Tomás moves between era ships explaining how each solved the last era\'s problem.',
      ambientLife: 'All trade era ships operational. Modern barter-during-crisis exhibit as contemporary relevance.',
    },
    restorationMoment: {
      event: 'Children in the Barter Dock independently re-invent currency — the same way humans have always done — and Tomás records the specific form they invented.',
      guideReaction: 'He laughs, lovingly. "You did it again. Everyone does. You invented cowrie shells this time. Last group invented wool. Humans always find the same solutions."',
      thematicCore: 'Money is not invented by economists. It is invented by people with things to trade and a problem to solve.',
    },
  },

  {
    worldId: 'debt-glacier',
    worldName: 'The Debt Glacier',
    guideId: 'elsa-lindgren',
    low: {
      visual: 'Glacier collapsed — no visible structure. Debt and ice indistinguishable. No clear path forward.',
      audio: 'Ice sounds without direction — cracking, shifting, without the productive tension of navigable terrain.',
      guideState: 'Elsa marks the glacier with colored flags showing safe paths. She has been here before.',
      ambientLife: 'Credit score landscape blank. 2008 financial crisis exhibit inaccessible.',
    },
    mid: {
      visual: 'Glacier navigable with marked paths. Interest growth mechanism visible. Safe route exists but requires attention.',
      audio: 'Glacier navigation sounds — careful footing, productive tension of controlled risk.',
      guideState: 'Elsa teaches debt as vocabulary not judgment. She is calm, precise, non-catastrophising.',
      ambientLife: 'Historical debt examples visible as ice formations. Safe navigation markers clear.',
    },
    high: {
      visual: 'Glacier with full educational terrain — interest rates visible as ice growth, debt payoff path navigable, rescue routes marked.',
      audio: 'Arctic landscape music — vast, considered, honest.',
      guideState: 'Elsa walks the full glacier explaining every formation. She has made this beautiful by understanding it.',
      ambientLife: 'Student debt exhibit accessible as contemporary example. Credit score system displayed as weather pattern.',
    },
    restorationMoment: {
      event: 'The glacier reveals its oldest ice — 10,000-year history of lending between humans, visible as layers. Debt is as old as grain storage.',
      guideReaction: 'Elsa traces the oldest layers. "We have always borrowed against tomorrow," she says. "The question is whether tomorrow can pay."',
      thematicCore: 'Debt is not shameful. It is a tool with real physics: it compounds in both directions, and understanding the physics is freedom.',
    },
  },

  {
    worldId: 'job-fair',
    worldName: 'The Job Fair',
    guideId: 'babatunde-afolabi',
    low: {
      visual: 'Exhibition hall empty. Every booth closed. Skills untested, careers unexplored.',
      audio: 'Empty convention hall — distant AC units, nothing else.',
      guideState: 'Babatunde sets up his own booth and begins explaining his seven careers to the empty hall. He does this every time.',
      ambientLife: 'Equal pay exhibit sealed. Child labour law history board covered.',
    },
    mid: {
      visual: 'Half the fair open. Twelve career booths active with interactive demonstrations.',
      audio: 'Fair ambience returning — crowds, demonstrations, enthusiasm.',
      guideState: 'Babatunde moves between booths narrating his own career transitions. He is proud of every one, including the failures.',
      ambientLife: 'Career genealogy traceable across seven paths Babatunde has walked.',
    },
    high: {
      visual: 'Full fair. Every career represented. Adam Smith\'s pin factory at one end, gig economy at the other.',
      audio: 'Full fair energy — every booth demonstrating simultaneously.',
      guideState: 'Babatunde is at full force — challenging, encouraging, expanding. He directs the child toward the career that surprises them.',
      ambientLife: 'Equal pay exhibit fully operational. Full labour rights history visible.',
    },
    restorationMoment: {
      event: 'A new booth appears at the job fair — a career that did not exist when the fair was built, created by the child\'s generation.',
      guideReaction: 'Babatunde immediately stocks it. "There it is," he says. "I have been waiting for this one."',
      thematicCore: 'Work is not about filling an existing role. The most important careers are ones we have not invented the name for yet.',
    },
  },

  {
    worldId: 'charity-harbor',
    worldName: 'The Charity Harbor',
    guideId: 'mei-lin-wu',
    low: {
      visual: 'Harbor empty. No ships with aid. Impact measurement boards dark. No addresses on any giving.',
      audio: 'Harbor silence — a place of receiving with nothing to give.',
      guideState: 'Mei-Lin inventories what the harbor has given before. She reads the records carefully. She continues to note impact.',
      ambientLife: 'Effective altruism calculation system offline. Red Cross history exhibit closed.',
    },
    mid: {
      visual: 'Three ships docked with specific community addresses. Impact metrics showing results.',
      audio: 'Harbor giving sounds — loading, departure, the specific sound of purposeful shipment.',
      guideState: 'Mei-Lin teaches impact measurement alongside empathy. Both matter, she insists.',
      ambientLife: 'Zakat exhibit accessible. Carnegie\'s gospel of wealth as context.',
    },
    high: {
      visual: 'Full harbor operation. Ships arriving from communities and departing with specific resources. Impact visible on return voyages.',
      audio: 'Giving harbor music — purposeful, warm, results-oriented.',
      guideState: 'Mei-Lin shows the impact of giving she did thirty years ago — still compounding today.',
      ambientLife: 'Red Cross Geneva exhibit operational. Full effective altruism calculation available.',
    },
    restorationMoment: {
      event: 'A ship returns from a community that the harbor helped twenty years ago — bringing back documentation of the effect, completing the loop.',
      guideReaction: 'Mei-Lin reads the return documentation slowly. Then: "Giving has a memory. It comes back to you, but as what it became — not what it was."',
      thematicCore: 'Generosity is not sacrifice. At its best, it is investment in a world you want to live in.',
    },
  },

  {
    worldId: 'tax-office',
    worldName: 'The Tax Office',
    guideId: 'sam-worthington',
    low: {
      visual: 'Office empty. Public services missing — road cracked, school closed, fire station unmanned.',
      audio: 'The specific silence of services that no longer arrive.',
      guideState: 'Sam points at the missing services without drama. He explains what each cost and what its absence costs.',
      ambientLife: 'Tax flow visualisation stopped. Public purpose invisible.',
    },
    mid: {
      visual: 'Three public services operational. Tax flow showing where coins go.',
      audio: 'Civic building sounds returning — purposeful, functional, unglamorous.',
      guideState: 'Sam makes taxes visible as choices, not obligations. He explains progressive vs flat with genuine neutrality.',
      ambientLife: 'Boston Tea Party exhibit accessible as historical grievance example.',
    },
    high: {
      visual: 'Full office operation — transparent, every coin traceable to a public outcome. Schools, roads, fire stations all funded and visible.',
      audio: 'Civic machine music — the sound of collective infrastructure working.',
      guideState: 'Sam walks the child through the full tax loop: coin in, service out, visible all the way.',
      ambientLife: 'Full public infrastructure visible and funded. How Countries Spend exhibit operational.',
    },
    restorationMoment: {
      event: 'The child traces one coin from their own pocket through the full tax cycle — into the system, into a school, into a teacher\'s salary, into a lesson that changes someone\'s life.',
      guideReaction: 'Sam watches the trace complete. "There it is. Your coin is in someone\'s future right now."',
      thematicCore: 'Taxes are not taken. They are pooled. The difference is ownership — every citizen owns the road, the school, the hospital.',
    },
  },

  // ── THE CROSSROADS — 8 Worlds ─────────────────────────────────────

  {
    worldId: 'great-archive',
    worldName: 'The Great Archive',
    guideId: 'the-librarian',
    low: {
      visual: 'Archive dark except for the Librarian\'s lamp. Dust heavier than books. Portal doors invisible.',
      audio: 'Near silence. One clock ticking. The archive breathes but barely.',
      guideState: 'The Librarian maintains every catalogue exactly, working by lamplight. They have always done this. They will continue.',
      ambientLife: 'Portal doors barely visible — faint outlines. Forgetting Well entrance barely perceptible.',
    },
    mid: {
      visual: 'Main reading hall lit. Three portals clearly visible — green door, amber gate, copper arch.',
      audio: 'Library ambience returning — pages, quiet steps, the sound of thought.',
      guideState: 'The Librarian guides the child with purpose. They know which question the child is really asking.',
      ambientLife: 'Dust motes in shaft of light — beautiful. Portals glowing warmly.',
    },
    high: {
      visual: 'Archive in full operation — all five portals blazing, shelves full, shaft of light from the skylight.',
      audio: 'Library at full resonance — the sound of accumulated knowledge.',
      guideState: 'The Librarian moves through the archive with total authority and genuine care.',
      ambientLife: 'All portals blazing. Compass Rose mosaic glowing. Forgetting Well entrance clearly marked.',
    },
    restorationMoment: {
      event: 'The seventh portal — the one that has never been named — appears for the first time. The Archive discovers it does not know where this one leads.',
      guideReaction: 'The Librarian examines the new door for a long moment. Then turns to the child: "I have catalogued every door in this building for three hundred years. This one is new. That means something."',
      thematicCore: 'Knowledge is not finite. The archive that stops growing has stopped living. Every door to somewhere new is evidence that knowing more is always possible.',
    },
  },

  {
    worldId: 'workshop-crossroads',
    worldName: 'The Workshop Crossroads',
    guideId: 'kenzo-nakamura-osei',
    low: {
      visual: 'Crossroads workshop empty of problems. Design thinking tools dusty. No world has sent work here.',
      audio: 'Silence between disciplines — the gap where connection should be.',
      guideState: 'Kenzo works on a design problem he brought himself — a bridge between two concepts that do not yet share vocabulary.',
      ambientLife: 'No cross-world problem submissions. Design thinking boards blank.',
    },
    mid: {
      visual: 'Three world-problems docked at the workshop. Design thinking process visible as physical material.',
      audio: 'Workshop sounds — interdisciplinary collision, which sounds like creative friction.',
      guideState: 'Kenzo facilitates problem decomposition across disciplines. He is happiest when two things that should not connect do.',
      ambientLife: 'Biomimicry exhibit active. Da Vinci crossroads archive accessible.',
    },
    high: {
      visual: 'Workshop full of cross-world problems being solved simultaneously. Bauhaus principle of art and industry unified visible everywhere.',
      audio: 'Design thinking music — structured creativity.',
      guideState: 'Kenzo holds seven design problems in working memory simultaneously, connecting them.',
      ambientLife: 'All world-problem submissions active. Design thinking process flow fully visible.',
    },
    restorationMoment: {
      event: 'A solution developed in the workshop solves problems in three different worlds simultaneously — the first true proof of cross-disciplinary thinking as infrastructure.',
      guideReaction: 'Kenzo documents all three solutions carefully and sends them to the correct worlds. He does not take credit for any.',
      thematicCore: 'Disciplines are not walls. They are different tools for the same workshop. The best work uses all of them.',
    },
  },

  {
    worldId: 'discovery-trail',
    worldName: 'The Discovery Trail',
    guideId: 'solana-bright',
    low: {
      visual: 'Trail indistinct — terrain unmarked, experiment sites empty, conclusion boards blank.',
      audio: 'Wilderness silence with no hypothesis to investigate.',
      guideState: 'Solana walks the invisible trail anyway, noting observations. She cannot stop the process.',
      ambientLife: 'No citizen science projects active. Replication crisis exhibit covered.',
    },
    mid: {
      visual: 'Trail marked through three biomes. Three experiment stations active.',
      audio: 'Field expedition sounds — measurement, observation, the sound of careful attention.',
      guideState: 'Solana demonstrates the scientific method as physical movement — walking the steps as you take them.',
      ambientLife: 'Citizen science project boards beginning to populate.',
    },
    high: {
      visual: 'Full trail through all terrain types. Every experiment station active. Conclusion boards showing real findings.',
      audio: 'Discovery music — the specific sound of evidence accumulating.',
      guideState: 'Solana finds something new on every trip through the trail. The trail is not static.',
      ambientLife: 'Failure in Science exhibit fully operational — famous failures displayed with reverence as progress.',
    },
    restorationMoment: {
      event: 'A citizen science result from this trail contributes to a real-world scientific database — the first in-game action with external real-world consequence.',
      guideReaction: 'Solana frames the contribution certificate and hangs it at the trailhead. "You contributed to an actual study," she tells the child.',
      thematicCore: 'Science is not done by scientists. It is done by anyone willing to observe carefully and report honestly.',
    },
  },

  {
    worldId: 'thinking-grove',
    worldName: 'The Thinking Grove',
    guideId: 'old-rowan',
    low: {
      visual: 'Grove leafless in morning light. Hard questions not growing — only silence where questions should be.',
      audio: 'Forest silence — not peaceful, empty.',
      guideState: 'Old Rowan stands in the empty grove. He has been standing here longer than any other guide has existed. He waits.',
      ambientLife: 'No philosophical questions rooted. Golden rule exhibit bare.',
    },
    mid: {
      visual: 'Some trees leafed. Three ancient philosophical questions growing as deep root formations.',
      audio: 'Grove ambience — wind through leaves, the sound of consideration.',
      guideState: 'Old Rowan asks the child a question and genuinely waits for the answer. This is the one thing he always does at full capacity.',
      ambientLife: 'Hammurabi\'s Code exhibited. Ship of Theseus visible as literal growing/decaying vessel.',
    },
    high: {
      visual: 'Grove in full leaf — deep dusk light. Every hard question rooted deep. New questions growing at the tips.',
      audio: 'Philosophical grove music — ancient, patient, deeply resonant.',
      guideState: 'Old Rowan never gives answers. But the questions he asks at full capacity are the most important ones.',
      ambientLife: 'Prisoner\'s dilemma game accessible. All ethics exhibits fully operational.',
    },
    restorationMoment: {
      event: 'A question the child asks is one that Old Rowan has never heard before. He goes very still. "I don\'t know the answer to that," he says.',
      guideReaction: 'He immediately plants it as a seed. "Neither does anyone else. Yet. Thank you for bringing it to the grove."',
      thematicCore: 'Philosophy is not the collection of answers. It is the care of questions. Some questions deserve to grow for centuries.',
    },
  },

  {
    worldId: 'wellness-garden',
    worldName: 'The Wellness Garden',
    guideId: 'hana-bergstrom',
    low: {
      visual: 'Emotion plants wilted. Garden flat and uniform — no differentiation, no colour range.',
      audio: 'Garden silence — which means emotional vocabulary has gone quiet.',
      guideState: 'Hana tends the wilted plants gently. She names each emotion as she finds it, even in its diminished state.',
      ambientLife: 'No emotional ecosystem. Growth mindset exhibit absent.',
    },
    mid: {
      visual: 'Common emotions growing — joy, sadness, anger, fear — in full colour.',
      audio: 'Garden sounds — gentle rain, tender growth, the specific sound of something understood.',
      guideState: 'Hana helps name emotions as they grow, teaching vocabulary for inner states.',
      ambientLife: 'Science of sleep exhibit operational. Power of play visible.',
    },
    high: {
      visual: 'Full garden — complex emotions including nuanced ones (wistful, determined, conflicted) growing as distinct plants.',
      audio: 'Full garden wellness music — layered, warm, emotionally textured.',
      guideState: 'Hana moves through the garden identifying every plant by its emotional signature. She teaches no judgment.',
      ambientLife: 'History of empathy exhibit full. Growth mindset interactive active.',
    },
    restorationMoment: {
      event: 'A plant grows in the garden that the child brought — an emotion they felt that Hana did not have a name for. She grows it carefully.',
      guideReaction: 'Hana studies it for a long time. "I have been waiting for someone to bring this one," she says. "Thank you for knowing this was a real thing."',
      thematicCore: 'Emotional experience outruns emotional vocabulary. The act of naming what you feel is the act of becoming more yourself.',
    },
  },

  {
    worldId: 'time-gallery',
    worldName: 'The Time Gallery',
    guideId: 'rami-al-farsi',
    low: {
      visual: 'Gallery dark. Every display showing "before" and nothing after. Cause visible, consequence invisible.',
      audio: 'Museum silence — which means history has become inert.',
      guideState: 'Rami moves through the dark gallery describing the displays from memory. He has memorised all of them.',
      ambientLife: 'No period-accurate lighting. Oral history archive silent.',
    },
    mid: {
      visual: 'Period lighting returning. Three exhibits showing before/during/after. Causation becoming visible.',
      audio: 'Gallery sounds — different eras producing their own acoustic signature.',
      guideState: 'Rami teaches history as story rather than dates. He builds toward consequence in every exhibit.',
      ambientLife: 'Calendar invention exhibit running. Howard Zinn people\'s history section accessible.',
    },
    high: {
      visual: 'Full gallery — every period at its correct lighting, every exhibit showing the full before/after/reason sequence.',
      audio: 'Historical music — each era\'s proper soundscape, transitions marked by acoustic shift.',
      guideState: 'Rami finds connections between exhibits that no one has made before. He leaves them as questions for the child.',
      ambientLife: 'Long Now Foundation exhibit fully operational — Thinking in millennia demonstrated.',
    },
    restorationMoment: {
      event: 'A new exhibit appears in the gallery — from an era that is happening right now. The gallery becomes present-tense for the first time.',
      guideReaction: 'Rami studies it carefully. "History is not past. It is what becomes past. This is still becoming."',
      thematicCore: 'Every historical moment was someone\'s present. The people inside it did not know what would happen next. Neither do we.',
    },
  },

  {
    worldId: 'music-meadow',
    worldName: 'The Music Meadow',
    guideId: 'luna-esperanza',
    low: {
      visual: 'Meadow quiet. Outdoor amphitheater empty. Sound waves invisible. Mathematical connections between music and physics absent.',
      audio: 'Near silence — just enough ambient sound to feel the absence of music.',
      guideState: 'Luna hums to herself, very quietly, alone. She has always made sound even when there was nowhere for it to go.',
      ambientLife: 'No music. No rhythm. No mathematical patterns audible.',
    },
    mid: {
      visual: 'Amphitheater partly populated. Three musical traditions playing. Sound waves beginning to be visible.',
      audio: 'Music returning — layered, specific, culturally distinct.',
      guideState: 'Luna begins showing the child how rhythm is math, using her own body as instrument.',
      ambientLife: 'Physics of sound exhibit operational. Musical notation visible as landscape.',
    },
    high: {
      visual: 'Sunset concert — golden and purple light, music made visible as colour waves over the entire meadow.',
      audio: 'Full musical synthesis — every tradition in the meadow playing simultaneously in harmony.',
      guideState: 'Luna conducts the meadow like an orchestra. She does not distinguish between the music and the mathematics.',
      ambientLife: 'Beethoven\'s deafness exhibit showing composition as pure thought. The Blues section fully alive.',
    },
    restorationMoment: {
      event: 'The meadow produces the first composition that incorporates music from every tradition it contains simultaneously. Luna hears it fully for the first time.',
      guideReaction: 'She stands in the center of the meadow, eyes closed, swaying. Then she says: "When I was four, I thought this was what music always sounded like. I was right."',
      thematicCore: 'Music is the universal language — not because all music sounds the same, but because all music does the same thing: it makes time feel real.',
    },
  },

  {
    worldId: 'everywhere',
    worldName: 'Everywhere',
    guideId: 'compass',
    low: {
      visual: 'Compass is barely visible — a faint warm glow where they should be. The sense of their presence reduced but not gone.',
      audio: 'Near-silence with a faint bell tone. The orientation sound is always present.',
      guideState: 'Compass is present for every Kindler, always. They are dimmer but never absent. They never leave.',
      ambientLife: 'No colour in the wayfinding fog. Directions still audible but barely.',
    },
    mid: {
      visual: 'Compass as warm glow clearly visible. Wayfinding paths lit. Overview Effect exhibit shimmering.',
      audio: 'Compass\'s theme — gentle bells — at half strength.',
      guideState: 'Compass appears when needed, guides without directing. They ask questions like "what do you want to find next?"',
      ambientLife: 'Being Lost exhibit accessible. Liminal Spaces section visible.',
    },
    high: {
      visual: 'Compass at full warm radiance. Every path illuminated. Overview Effect in full glory — the whole worlds visible from above.',
      audio: 'Compass\'s full theme — layered bells, warmth, the feeling of not being lost.',
      guideState: 'Compass is everywhere, genuinely. Every Kindler who needs guidance feels them.',
      ambientLife: 'Wayfinding across all traditions active. Overview Effect visible from any world.',
    },
    restorationMoment: {
      event: 'Compass returns to the Compass Rose mosaic in the Great Archive. For a moment they are fully materialised — not a glow but a presence. The child sees them whole.',
      guideReaction: 'Compass smiles — which they cannot always do. They say: "You found your way to me. That was always the point."',
      thematicCore: 'The guide who helps you find your way must themselves know they are found. Compass was lost too, in the Fading. Being remembered restores the one who does the remembering.',
    },
  },
] as const;

// ─── Registry ──────────────────────────────────────────────────────

function realmForId(worldId: string): 'discovery' | 'expression' | 'exchange' | 'crossroads' {
  if (DISCOVERY_IDS.has(worldId)) return 'discovery';
  if (EXPRESSION_IDS.has(worldId)) return 'expression';
  if (EXCHANGE_IDS.has(worldId)) return 'exchange';
  return 'crossroads';
}

class WorldFadingProfilesRegistry implements WorldFadingProfilesPort {
  private readonly byId: ReadonlyMap<WorldId, WorldFadingProfile>;

  constructor(profiles: ReadonlyArray<WorldFadingProfile>) {
    this.byId = new Map(profiles.map((p) => [p.worldId, p]));
  }

  get totalProfiles(): number {
    return this.byId.size;
  }

  getProfile(worldId: WorldId): WorldFadingProfile | undefined {
    return this.byId.get(worldId);
  }

  all(): ReadonlyArray<WorldFadingProfile> {
    return FADING_PROFILES_DATA;
  }

  getProfilesForRealm(realm: 'discovery' | 'expression' | 'exchange' | 'crossroads'): ReadonlyArray<WorldFadingProfile> {
    return FADING_PROFILES_DATA.filter((p) => realmForId(p.worldId) === realm);
  }
}

// ─── Factory ───────────────────────────────────────────────────────

export function createWorldFadingProfiles(): WorldFadingProfilesPort {
  return new WorldFadingProfilesRegistry(FADING_PROFILES_DATA);
}

export { FADING_PROFILES_DATA as WORLD_FADING_PROFILES };
